import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getWorkerState, runWorkerTick } from '@/lib/worker'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** ตรวจว่าคำขอมาพร้อม "Authorization: Bearer <CRON_SECRET>" (จาก cron-job.org หรือ Vercel Cron) */
function hasValidCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// GET /api/worker
//   - มี CRON_SECRET ที่ถูกต้อง -> รัน worker (สำหรับ Vercel Cron)
//   - ผู้ใช้ที่ login -> ดูสถานะ worker
export async function GET(req: NextRequest) {
  if (hasValidCronSecret(req)) {
    const result = await runWorkerTick()
    return NextResponse.json({ ok: true, ...result })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getWorkerState())
}

// POST /api/worker
//   - มี CRON_SECRET ที่ถูกต้อง -> รัน worker (สำหรับ cron-job.org)
//   - admin ที่ login -> กดรันเอง
export async function POST(req: NextRequest) {
  if (hasValidCronSecret(req)) {
    const result = await runWorkerTick()
    return NextResponse.json({ ok: true, ...result })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can trigger the worker' },
      { status: 403 }
    )
  }

  const result = await runWorkerTick({ manual: true })
  const log = await db.activityLog.findFirst({
    where: { action: 'worker_tick' },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ ...result, state: await getWorkerState(), lastLog: log })
}
