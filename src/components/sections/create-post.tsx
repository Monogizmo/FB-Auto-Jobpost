'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@/lib/query'
import {
  PenSquare,
  Send,
  CalendarClock,
  Loader2,
  ImageIcon,
  Link2,
  FileText,
  X,
  Save,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

type Page = {
  id: string
  pageId: string
  name: string
  avatar: string | null
  isActive: boolean
}

type Mode = 'draft' | 'scheduled'

export function CreatePostSection() {
  const queryClient = useQueryClient()
  const { editingTargetId, clearEdit, setSection } = useAppStore()

  const { data: pagesData } = useQuery<{ pages: Page[] }>({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await fetch('/api/pages')
      return res.json()
    },
  })

  // Load the post being edited (if any)
  const { data: editingData } = useQuery<{ post: any }>({
    queryKey: ['post', editingTargetId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?status=all`)
      const body = await res.json()
      const found = body.posts.find((p: any) => p.id === editingTargetId)
      return { post: found }
    },
    enabled: !!editingTargetId,
  })

  const activePages = pagesData?.pages.filter((p) => p.isActive) ?? []

  const [form, setForm] = useState({
    pageId: '',
    message: '',
    linkUrl: '',
    imageUrl: '',
    scheduledAt: '',
  })
  const [mode, setMode] = useState<Mode>('draft')
  const [busy, setBusy] = useState(false)

  // Initialize / sync form when editing target changes
  useEffect(() => {
    if (editingData?.post) {
      const p = editingData.post
      setForm({
        pageId: p.pageId,
        message: p.message || '',
        linkUrl: p.linkUrl || '',
        imageUrl: p.imageUrl || '',
        scheduledAt: p.scheduledAt
          ? new Date(p.scheduledAt).toISOString().slice(0, 16)
          : '',
      })
      setMode(p.status === 'scheduled' ? 'scheduled' : 'draft')
    } else if (activePages.length && !form.pageId) {
      setForm((f) => ({ ...f, pageId: activePages[0].id }))
    }
  }, [editingData, activePages, form.pageId])

  // Default-select first page
  useEffect(() => {
    if (!form.pageId && activePages.length) {
      setForm((f) => ({ ...f, pageId: activePages[0].id }))
    }
  }, [activePages, form.pageId])

  function reset() {
    setForm({
      pageId: activePages[0]?.id ?? '',
      message: '',
      linkUrl: '',
      imageUrl: '',
      scheduledAt: '',
    })
    setMode('draft')
    clearEdit()
  }

  async function submit() {
    if (!form.pageId) {
      toast.error('เลือกเพจก่อน')
      return
    }
    if (!form.message.trim()) {
      toast.error('พิมพ์ข้อความก่อน')
      return
    }
    if (mode === 'scheduled' && !form.scheduledAt) {
      toast.error('ระบุเวลาที่จะโพสต์')
      return
    }

    setBusy(true)
    try {
      const payload: Record<string, unknown> = {
        pageId: form.pageId,
        message: form.message.trim(),
        linkUrl: form.linkUrl.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        status: mode,
      }
      if (mode === 'scheduled') {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString()
      }

      let res: Response
      if (editingTargetId) {
        res = await fetch(`/api/posts/${editingTargetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'บันทึกไม่สำเร็จ')

      toast.success(
        editingTargetId
          ? 'อัปเดตโพสต์แล้ว'
          : mode === 'scheduled'
            ? 'ตั้งเวลาโพสต์แล้ว — Worker จะโพสต์ให้อัตโนมัติ'
            : 'บันทึกฉบับร่างแล้ว'
      )
      reset()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['logs'] }),
      ])
      setSection(mode === 'scheduled' ? 'schedule' : 'history')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const charCount = form.message.length
  const maxChars = 63206
  const overLimit = charCount > maxChars

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-5 gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <PenSquare className="h-4 w-4" />
                {editingTargetId ? 'แก้ไขโพสต์' : 'เขียนโพสต์ใหม่'}
              </h2>
              <p className="text-xs text-muted-foreground">
                กรอกข้อความ เลือกเพจ แล้วบันทึกหรือตั้งเวลา
              </p>
            </div>
            {editingTargetId && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-3.5 w-3.5" />
                ยกเลิกการแก้ไข
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>โพสต์ไปยังเพจ</Label>
            {activePages.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/40 border rounded-md p-3">
                ยังไม่มีเพจที่ใช้งานได้ — ไปเพิ่มเพจที่เมนู "เพจ Facebook" ก่อน
              </div>
            ) : (
              <Select
                value={form.pageId}
                onValueChange={(v) => setForm({ ...form, pageId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเพจ" />
                </SelectTrigger>
                <SelectContent>
                  {activePages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 rounded">
                          <AvatarImage src={p.avatar ?? undefined} />
                          <AvatarFallback className="rounded text-[10px]">
                            {p.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>ข้อความ</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="พิมพ์ข้อความที่จะโพสต์..."
              rows={8}
              className="resize-y min-h-[160px]"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {charCount.toLocaleString()} / {maxChars.toLocaleString()} ตัวอักษร
              </span>
              {overLimit && (
                <span className="text-red-600">เกินจำนวนที่ Facebook อนุญาต</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                ลิงก์ (ไม่บังคับ)
              </Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                URL รูป (ไม่บังคับ)
              </Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://.../image.jpg"
                type="url"
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-sm">โหมดการบันทึก</h3>
              <p className="text-xs text-muted-foreground">
                เลือก "ตั้งเวลา" เพื่อให้ Worker โพสต์อัตโนมัติเมื่อถึงเวลา
              </p>
            </div>
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
            >
              <TabsList>
                <TabsTrigger value="draft">
                  <Save className="h-3.5 w-3.5" />
                  ฉบับร่าง
                </TabsTrigger>
                <TabsTrigger value="scheduled">
                  <CalendarClock className="h-3.5 w-3.5" />
                  ตั้งเวลา
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {mode === 'scheduled' && (
            <div className="space-y-1.5">
              <Label>เวลาที่จะโพสต์</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Worker จะตรวจทุก 1 นาที — โพสต์จะถูกส่งเมื่อถึงเวลาที่กำหนด
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} disabled={busy || overLimit || activePages.length === 0}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'scheduled' ? (
                <CalendarClock className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingTargetId
                ? 'อัปเดตโพสต์'
                : mode === 'scheduled'
                  ? 'ตั้งเวลาโพสต์'
                  : 'บันทึกฉบับร่าง'}
            </Button>
            {editingTargetId && (
              <Button variant="outline" onClick={reset}>
                ยกเลิก
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">ตัวอย่างโพสต์</h3>
        <Card className="p-4 gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 rounded-md">
              <AvatarImage
                src={
                  activePages.find((p) => p.id === form.pageId)?.avatar ?? undefined
                }
              />
              <AvatarFallback className="rounded-md text-xs">
                {activePages.find((p) => p.id === form.pageId)?.name.slice(0, 2) ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {activePages.find((p) => p.id === form.pageId)?.name ?? '— เลือกเพจ —'}
              </div>
              <div className="text-xs text-muted-foreground">
                Facebook Page
              </div>
            </div>
          </div>

          {form.message ? (
            <p className="text-sm whitespace-pre-wrap">{form.message}</p>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/40 rounded-md p-3 text-center">
              พิมพ์ข้อความเพื่อดูตัวอย่าง
            </div>
          )}

          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt="preview"
              className="w-full rounded-md border object-cover max-h-64"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          )}

          {form.linkUrl && (
            <a
              href={form.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline truncate block"
            >
              {form.linkUrl}
            </a>
          )}
        </Card>

        <Card className="p-4 bg-muted/40">
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">คำแนะนำ</p>
            <p>• โพสต์แบบข้อความ+ลิงก์ Facebook จะสร้างลิงก์พรีวิวให้อัตโนมัติ</p>
            <p>• ถ้าใส่ URL รูปด้วย ระบบจะส่งเป็นพารามิเตอร์ picture เพื่อเปลี่ยนภาพพรีวิวของลิงก์</p>
            <p>• โพสต์ที่ตั้งเวลาไว้จะถูกส่งอัตโนมัติโดย Worker (ทุก 1 นาที)</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
