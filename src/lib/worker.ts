/**
 * Scheduled-post worker (serverless-friendly).
 *
 * บน Vercel ไม่มีเซิร์ฟเวอร์รันค้างตลอด จึงไม่ใช้ setInterval อีกต่อไป
 * แต่ให้ตัวตั้งเวลาภายนอก (เช่น cron-job.org) เรียก /api/worker ทุก 1 นาที
 * แต่ละครั้งจะหาโพสต์ที่ถึงเวลา (status = 'scheduled' และ scheduledAt <= ตอนนี้)
 * แล้วโพสต์ผ่าน Facebook Graph API
 *
 * - ใช้การ "จอง" โพสต์แบบ atomic (updateMany) กันโพสต์ซ้ำ ถ้ามีหลายคำขอพร้อมกัน
 * - เก็บสถานะล่าสุดไว้ในตาราง Setting เพื่อให้หน้าเว็บแสดงผลได้ถูกต้อง
 * - Access token ถอดรหัสตอนโพสต์เท่านั้น ไม่เก็บ plaintext ใน DB
 */

import { db } from '@/lib/db'
import { publishToPage } from '@/lib/facebook'
import { decryptToken } from '@/lib/crypto'

const STATE_KEY = 'worker_state'
const STUCK_AFTER_MS = 10 * 60 * 1000 // โพสต์ที่ค้างสถานะ "posting" เกิน 10 นาที

type WorkerState = {
  running: boolean
  lastTickAt: string | null
  lastProcessedCount: number
  lastError: string | null
}

const EMPTY_STATE: WorkerState = {
  running: false,
  lastTickAt: null,
  lastProcessedCount: 0,
  lastError: null,
}

export async function getWorkerState(): Promise<WorkerState> {
  try {
    const row = await db.setting.findUnique({ where: { key: STATE_KEY } })
    if (!row) return EMPTY_STATE
    return { ...EMPTY_STATE, ...(JSON.parse(row.value) as Partial<WorkerState>) }
  } catch {
    return EMPTY_STATE
  }
}

async function saveWorkerState(next: WorkerState): Promise<void> {
  const value = JSON.stringify(next)
  await db.setting.upsert({
    where: { key: STATE_KEY },
    update: { value },
    create: { key: STATE_KEY, value },
  })
}

export async function runWorkerTick(opts?: { manual?: boolean }): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  let processed = 0
  let succeeded = 0
  let failed = 0
  let lastError: string | null = null

  try {
    // โพสต์ที่ค้างอยู่ในสถานะ posting นานเกินไป -> ตีเป็น failed ให้ผู้ใช้กดลองใหม่
    await db.post.updateMany({
      where: {
        status: 'posting',
        updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
      },
      data: {
        status: 'failed',
        errorMessage: 'การโพสต์ค้างเกินเวลา กรุณาตรวจสอบบน Facebook แล้วลองใหม่',
      },
    })

    const duePosts = await db.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: new Date() },
      },
      include: { page: true },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    })

    for (const post of duePosts) {
      // จองโพสต์ก่อน: ถ้ามีอีกคำขอจองไปแล้ว count จะเป็น 0 -> ข้าม (กันโพสต์ซ้ำ)
      const claim = await db.post.updateMany({
        where: { id: post.id, status: 'scheduled' },
        data: { status: 'posting' },
      })
      if (claim.count === 0) continue

      processed += 1
      try {
        if (!post.page.isActive) {
          throw new Error('Page is not active')
        }

        const accessToken = await decryptToken(post.page.encryptedToken)

        const result = await publishToPage({
          pageId: post.page.pageId,
          accessToken,
          message: post.message,
          linkUrl: post.linkUrl,
          imageUrl: post.imageUrl,
        })

        await db.post.update({
          where: { id: post.id },
          data: {
            status: 'posted',
            postedAt: new Date(),
            fbPostId: result.id,
          },
        })

        await db.activityLog.create({
          data: {
            postId: post.id,
            userId: post.createdById,
            action: 'publish',
            status: 'success',
            message: `Worker posted to "${post.page.name}" (FB id: ${result.id})`,
          },
        })

        succeeded += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failed += 1
        lastError = message

        await db.post.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            errorMessage: message,
          },
        })

        await db.activityLog.create({
          data: {
            postId: post.id,
            userId: post.createdById,
            action: 'publish',
            status: 'error',
            message,
          },
        })
      }
    }

    // บันทึก log สรุปเฉพาะตอนมีงานทำ หรือกดรันเอง (กันตาราง log โตวันละ 1,440 แถว)
    if (processed > 0 || opts?.manual) {
      await db.activityLog.create({
        data: {
          action: 'worker_tick',
          status: processed === 0 ? 'info' : 'success',
          message: `Worker tick processed ${processed} post(s) — ${succeeded} ok, ${failed} failed`,
        },
      })
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err)
  }

  try {
    const prev = await getWorkerState()
    await saveWorkerState({
      running: false,
      lastTickAt: new Date().toISOString(),
      lastProcessedCount: processed > 0 ? processed : prev.lastProcessedCount,
      lastError: lastError ?? (processed > 0 ? null : prev.lastError),
    })
  } catch {
    // ไม่ให้การบันทึกสถานะทำให้ worker ล้ม
  }

  return { processed, succeeded, failed }
}
