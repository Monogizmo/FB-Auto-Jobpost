'use client'

import {
  Settings as SettingsIcon,
  Info,
  Database,
  Zap,
  ShieldAlert,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery } from '@/lib/query'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function SettingsSection() {
  const { data, refetch } = useQuery<any>({
    queryKey: ['worker'],
    queryFn: async () => {
      const res = await fetch('/api/worker')
      return res.json()
    },
    refetchInterval: 30_000,
  })
  const [busy, setBusy] = useState(false)

  async function tick() {
    setBusy(true)
    try {
      const res = await fetch('/api/worker', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'tick failed')
      toast.success(
        `ประมวลผล ${body.processed} โพสต์ — สำเร็จ ${body.succeeded} / ล้มเหลว ${body.failed}`
      )
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="font-semibold text-base flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          ตั้งค่าระบบ
        </h2>
        <p className="text-xs text-muted-foreground">
          ข้อมูลและสถานะของระบบ FB Auto Poster
        </p>
      </div>

      <Card className="p-5 gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Worker อัตโนมัติ</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Worker ทำงานใน background ของ Next.js dev server
              ตรวจหาโพสต์ที่ถึงเวลาทุก 1 นาที และส่งไปยัง Graph API โดยอัตโนมัติ
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div>
                <div className="text-muted-foreground">สถานะ</div>
                <div className="font-medium">
                  {data?.running ? 'กำลังทำงาน' : 'พร้อมทำงาน'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">ตรวจล่าสุด</div>
                <div className="font-medium">
                  {data?.lastTickAt
                    ? formatDistanceToNow(new Date(data.lastTickAt), {
                        addSuffix: true,
                        locale: th,
                      })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">ประมวลผลล่าสุด</div>
                <div className="font-medium">
                  {data?.lastProcessedCount ?? 0} โพสต์
                </div>
              </div>
            </div>
            {data?.lastError && (
              <div className="text-xs text-red-600 mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded p-2">
                {data.lastError}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={tick} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            ตรวจโพสต์ที่ถึงเวลาทันที
          </Button>
        </div>
      </Card>

      <Card className="p-5 gap-3">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">ฐานข้อมูล</h3>
            <p className="text-xs text-muted-foreground mt-1">
              ใช้ SQLite ผ่าน Prisma ORM — ข้อมูลทั้งหมด (เพจ, โพสต์, บันทึก)
              เก็บใน <code className="bg-muted px-1 rounded">db/custom.db</code>
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 gap-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">เกี่ยวกับแอป</h3>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              <p>
                <span className="font-medium text-foreground">FB Auto Poster</span>{' '}
                เป็นเครื่องมือจัดการโพสต์ Facebook อัตโนมัติ
              </p>
              <p>• ใช้ Facebook Graph API v19.0</p>
              <p>• โพสต์ได้ทั้งแบบทันทีและแบบตั้งเวลา</p>
              <p>• รองรับข้อความ ลิงก์ และ URL รูปภาพ</p>
              <p>• มีบันทึกกิจกรรมทุกการกระทำ</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 gap-3 border-red-200 dark:border-red-900/50">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">
              ข้อควรระวัง
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 mt-1 list-disc list-inside">
              <li>
                แอป Facebook ของคุณต้องผ่านการตรวจสอบ App Review
                สำหรับสิทธิ์ <code>pages_manage_posts</code> ถ้าจะใช้กับเพจจริง
              </li>
              <li>
                Access Token มีอายุการใช้งาน — ถ้าโพสต์ล้มเหลวด้วยข้อความ "token expired"
                ให้ออก token ใหม่และเพิ่มเพจใหม่อีกครั้ง
              </li>
              <li>
                หลีกเลี่ยงการโพสต์ซ้ำเนื้อหาเดียวกันในเวลาใกล้กัน
                เพราะ Facebook อาจตีกลับเป็น spam
              </li>
              <li>
                อย่าโพสต์เนื้อหาที่ละเมิดนโยบาย Facebook Community Standards
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
