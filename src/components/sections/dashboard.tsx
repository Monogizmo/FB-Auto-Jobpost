'use client'

import { useQuery, useMutation, useQueryClient } from '@/lib/query'
import {
  Users,
  Send,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Activity,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PostCard } from '@/components/post-card'
import { useAppStore } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type DashboardData = {
  stats: {
    totalPages: number
    activePages: number
    scheduled: number
    posted: number
    failed: number
    draft: number
  }
  perDay: { date: string; posted: number; failed: number }[]
  recentPosts: any[]
  recentLogs: any[]
}

const STAT_CARDS: {
  key: keyof DashboardData['stats']
  label: string
  icon: typeof Users
  color: string
}[] = [
  {
    key: 'totalPages',
    label: 'เพจทั้งหมด',
    icon: Users,
    color: 'text-emerald-600',
  },
  {
    key: 'scheduled',
    label: 'รอโพสต์ตามเวลา',
    icon: CalendarClock,
    color: 'text-amber-600',
  },
  {
    key: 'posted',
    label: 'โพสต์สำเร็จ',
    icon: CheckCircle2,
    color: 'text-emerald-600',
  },
  {
    key: 'failed',
    label: 'โพสต์ล้มเหลว',
    icon: AlertTriangle,
    color: 'text-red-600',
  },
  {
    key: 'draft',
    label: 'ฉบับร่าง',
    icon: FileEdit,
    color: 'text-slate-600',
  },
]

export function DashboardSection() {
  const { setSection } = useAppStore()
  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon
          const value = data?.stats[s.key] ?? 0
          return (
            <Card key={s.key} className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  value
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Per-day chart */}
      <Card className="p-5 gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">โพสต์ 7 วันล่าสุด</h3>
            <p className="text-xs text-muted-foreground">
              จำนวนโพสต์ที่สำเร็จในแต่ละวัน
            </p>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-end gap-2 h-32 mt-2">
          {data?.perDay.map((d) => {
            const max = Math.max(...(data.perDay.map((p) => p.posted) || [1]), 1)
            const h = (d.posted / max) * 100
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="text-xs font-medium tabular-nums">
                  {d.posted}
                </div>
                <div
                  className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-all"
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`${d.date}: ${d.posted} โพสต์`}
                />
                <div className="text-[10px] text-muted-foreground">
                  {d.date.slice(5)}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              กำลังโหลด...
            </div>
          )}
        </div>
      </Card>

      {/* Worker status */}
      <WorkerStatusCard onTicked={() => refetch()} />

      {/* Quick actions */}
      <Card className="p-5 gap-3">
        <h3 className="font-semibold text-sm">เริ่มต้นใช้งาน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={() => setSection('pages')}
          >
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-medium">1. เพิ่มเพจ</div>
              <div className="text-xs text-muted-foreground">
                เชื่อม Page Access Token
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={() => setSection('create')}
          >
            <FileEdit className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-medium">2. เขียนโพสต์</div>
              <div className="text-xs text-muted-foreground">
                ข้อความ รูป ลิงก์
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={() => setSection('schedule')}
          >
            <CalendarClock className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-medium">3. ตั้งเวลา</div>
              <div className="text-xs text-muted-foreground">
                Worker โพสต์ให้อัตโนมัติ
              </div>
            </div>
          </Button>
        </div>
      </Card>

      {/* Recent posts + logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">โพสต์ล่าสุด</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSection('history')}
            >
              ดูทั้งหมด
            </Button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)
            ) : data?.recentPosts.length ? (
              data.recentPosts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                ยังไม่มีโพสต์ — เริ่มสร้างโพสต์แรกได้เลย
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">บันทึกล่าสุด</h3>
            <Button variant="ghost" size="sm" onClick={() => setSection('logs')}>
              ดูทั้งหมด
            </Button>
          </div>
          <Card className="p-3 gap-2">
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))
              ) : data?.recentLogs.length ? (
                data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="text-xs border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-emerald-500'
                            : log.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-medium">{log.action}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                          locale: th,
                        })}
                      </span>
                    </div>
                    <div className="text-muted-foreground pl-3.5 mt-1 break-words">
                      {log.message}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4 text-xs">
                  ยังไม่มีบันทึก
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function WorkerStatusCard({ onTicked }: { onTicked: () => void }) {
  const { data, refetch } = useQuery<{
    running: boolean
    lastTickAt: string | null
    lastProcessedCount: number
    lastError: string | null
  }>({
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
      onTicked()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5 gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">สถานะ Worker</h3>
            <p className="text-xs text-muted-foreground">
              {data?.running ? 'กำลังทำงาน...' : 'พร้อมทำงาน'} —
              {data?.lastTickAt
                ? ` ตรวจล่าสุด ${formatDistanceToNow(new Date(data.lastTickAt), { addSuffix: true, locale: th })}`
                : ' ยังไม่เคยตรวจ'}
              {' '}
              (ประมวลผล {data?.lastProcessedCount ?? 0} ครั้งล่าสุด)
            </p>
            {data?.lastError && (
              <p className="text-xs text-red-600 mt-1">{data.lastError}</p>
            )}
          </div>
        </div>
        <Button size="sm" onClick={tick} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          ตรวจทันที
        </Button>
      </div>
    </Card>
  )
}
