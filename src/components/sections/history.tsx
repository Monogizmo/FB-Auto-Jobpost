'use client'

import { useState } from 'react'
import { useQuery } from '@/lib/query'
import { History, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PostCard } from '@/components/post-card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'

type FilterKey = 'all' | 'posted' | 'failed' | 'draft'

export function HistorySection() {
  const { setSection } = useAppStore()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ posts: any[] }>({
    queryKey: ['posts', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/posts')
      return res.json()
    },
  })

  const filtered = (data?.posts ?? []).filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.message.toLowerCase().includes(q) ||
        p.page?.name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            ประวัติโพสต์ทั้งหมด
          </h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} จาก {data?.posts.length ?? 0} โพสต์
          </p>
        </div>
        <Button size="sm" onClick={() => setSection('create')}>
          โพสต์ใหม่
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList>
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="posted">โพสต์แล้ว</TabsTrigger>
            <TabsTrigger value="failed">ล้มเหลว</TabsTrigger>
            <TabsTrigger value="draft">ฉบับร่าง</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาข้อความหรือชื่อเพจ..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          ไม่พบโพสต์ที่ตรงเงื่อนไข
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  )
}
