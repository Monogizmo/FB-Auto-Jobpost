'use client'

import { useQuery } from '@/lib/query'
import { ScrollText, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { format, formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

const ACTION_LABELS: Record<string, string> = {
  create: 'สร้าง',
  update: 'แก้ไข',
  delete: 'ลบ',
  publish: 'โพสต์',
  schedule: 'ตั้งเวลา',
  worker_tick: 'Worker ตรวจ',
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-slate-400',
}

export function LogsSection() {
  const [take, setTake] = useState(50)
  const { data, isLoading, refetch, isFetching } = useQuery<{ logs: any[] }>({
    queryKey: ['logs', take],
    queryFn: async () => {
      const res = await fetch(`/api/logs?take=${take}`)
      return res.json()
    },
  })

  async function refresh() {
    try {
      await refetch()
      toast.success('รีเฟรชบันทึกแล้ว')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            บันทึกกิจกรรม
          </h2>
          <p className="text-xs text-muted-foreground">
            แสดง {data?.logs.length ?? 0} รายการล่าสุด
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ScrollText className="h-3.5 w-3.5" />
          )}
          รีเฟรช
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y">
          {isLoading ? (
            [0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-full mt-2" />
              </div>
            ))
          ) : data?.logs.length ? (
            data.logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3">
                <span
                  className={`h-2 w-2 rounded-full mt-2 shrink-0 ${
                    STATUS_COLORS[log.status] ?? 'bg-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        log.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : log.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {log.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(log.createdAt), 'PPP p', { locale: th })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-muted-foreground">
              ยังไม่มีบันทึกกิจกรรม
            </div>
          )}
        </div>
      </Card>

      {data?.logs.length === take && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setTake((t) => t + 50)}>
            โหลดเพิ่ม
          </Button>
        </div>
      )}
    </div>
  )
}
