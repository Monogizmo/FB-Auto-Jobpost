'use client'

import { useQuery } from '@/lib/query'
import { CalendarClock, Loader2, Send } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PostCard } from '@/components/post-card'
import { useAppStore } from '@/lib/store'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export function ScheduleSection() {
  const { setSection } = useAppStore()
  const { data, isLoading, refetch } = useQuery<{ posts: any[] }>({
    queryKey: ['posts', 'scheduled'],
    queryFn: async () => {
      const res = await fetch('/api/posts?status=scheduled')
      return res.json()
    },
  })

  const sorted = (data?.posts ?? []).slice().sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )

  // Group by day
  const groups: Record<string, any[]> = {}
  for (const p of sorted) {
    const key = format(new Date(p.scheduledAt), 'PPP', { locale: th })
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            คิวโพสต์ที่ตั้งเวลาไว้
          </h2>
          <p className="text-xs text-muted-foreground">
            {sorted.length} โพสต์ — เรียงตามเวลาที่จะโพสต์
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <Loader2 className="h-3.5 w-3.5" />
            รีเฟรช
          </Button>
          <Button size="sm" onClick={() => setSection('create')}>
            <Send className="h-3.5 w-3.5" />
            ตั้งเวลาโพสต์ใหม่
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium text-sm">ยังไม่มีโพสต์ในคิว</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            ตั้งเวลาโพสต์แรกของคุณ — Worker จะโพสต์ให้อัตโนมัติเมื่อถึงเวลา
          </p>
          <Button onClick={() => setSection('create')}>
            <Send className="h-4 w-4" />
            ตั้งเวลาโพสต์ใหม่
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([day, posts]) => (
            <div key={day} className="space-y-3">
              <div className="flex items-center gap-2 sticky top-14 bg-background/95 backdrop-blur py-1 z-10">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="font-semibold text-sm">{day}</h3>
                <span className="text-xs text-muted-foreground">
                  {posts.length} โพสต์
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
