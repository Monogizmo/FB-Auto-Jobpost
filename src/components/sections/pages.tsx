'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@/lib/query'
import {
  Facebook,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Power,
  Info,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Page = {
  id: string
  pageId: string
  name: string
  accessToken: string
  avatar: string | null
  category: string | null
  isActive: boolean
  createdAt: string
  _count?: { posts: number }
}

export function PagesSection() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<{ pages: Page[] }>({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await fetch('/api/pages')
      return res.json()
    },
  })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ pageId: '', accessToken: '' })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.pageId.trim() || !form.accessToken.trim()) {
      toast.error('กรอก Page ID และ Access Token ให้ครบ')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: form.pageId.trim(),
          accessToken: form.accessToken.trim(),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'เพิ่มเพจไม่สำเร็จ')
      toast.success(`เพิ่มเพจ "${body.page.name}" แล้ว`)
      setForm({ pageId: '', accessToken: '' })
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['pages'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'อัปเดตไม่สำเร็จ')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'ลบไม่สำเร็จ')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('ลบเพจแล้ว')
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      {/* Help banner */}
      <Card className="p-4 gap-2 bg-muted/40">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1.5">
            <p className="font-medium">วิธีหา Page ID และ Page Access Token</p>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
              <li>
                เปิด{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Graph API Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>เลือกแอป Facebook และกด "Get Token" → "Get User Access Token"</li>
              <li>
                ขอสิทธิ์ <code className="bg-background px-1 rounded">pages_show_list</code>,{' '}
                <code className="bg-background px-1 rounded">pages_read_engagement</code>,{' '}
                <code className="bg-background px-1 rounded">pages_manage_posts</code>
              </li>
              <li>
                เรียก <code className="bg-background px-1 rounded">GET /me/accounts</code> จะได้
                Page ID และ Page Access Token ของแต่ละเพจ
              </li>
              <li>คัดลอก Page ID และ Access Token มากรอกในฟอร์มด้านล่าง</li>
            </ol>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">เพจทั้งหมด</h2>
          <p className="text-xs text-muted-foreground">
            เพจที่เชื่อมต่อแล้ว {data?.pages.length ?? 0} เพจ
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              เพิ่มเพจ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มเพจ Facebook</DialogTitle>
              <DialogDescription>
                ระบบจะตรวจสอบ Page ID และ Access Token กับ Facebook Graph API ก่อนบันทึก
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="pageId">Page ID</Label>
                <Input
                  id="pageId"
                  placeholder="เช่น 1234567890"
                  value={form.pageId}
                  onChange={(e) =>
                    setForm({ ...form, pageId: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  เลข ID ของเพจ (ไม่ใช่ชื่อ)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="token">Page Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="EAAB..."
                  value={form.accessToken}
                  onChange={(e) =>
                    setForm({ ...form, accessToken: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Token ที่มีสิทธิ์ <code>pages_manage_posts</code>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                บันทึกเพจ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="p-4 h-24">
              <div className="animate-pulse bg-muted h-full rounded" />
            </Card>
          ))}
        </div>
      ) : data?.pages.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.pages.map((page) => (
            <Card key={page.id} className="p-4 gap-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 rounded-md">
                  <AvatarImage src={page.avatar ?? undefined} />
                  <AvatarFallback className="rounded-md">
                    <Facebook className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {page.name}
                    </span>
                    {page.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge variant="secondary">ปิดใช้งาน</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>ID: {page.pageId}</div>
                    {page.category && <div>หมวด: {page.category}</div>}
                    <div>โพสต์ทั้งหมด: {page._count?.posts ?? 0}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={page.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: page.id, isActive: checked })
                    }
                    disabled={toggleMutation.isPending}
                  />
                  <Power className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8"
                  onClick={() => {
                    if (confirm(`ลบเพจ "${page.name}"?`)) {
                      deleteMutation.mutate(page.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Facebook className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium text-sm">ยังไม่มีเพจ</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            เพิ่มเพจ Facebook แรกของคุณเพื่อเริ่มโพสต์อัตโนมัติ
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มเพจ
          </Button>
        </Card>
      )}
    </div>
  )
}
