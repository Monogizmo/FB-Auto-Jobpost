'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@/lib/query'
import { formatDistanceToNow, format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Clock,
  Send,
  Trash2,
  Edit3,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  User as UserIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/status-badge'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

type Page = {
  id: string
  pageId: string
  name: string
  avatar: string | null
}

type Creator = {
  id: string
  name: string
  username: string
}

type Post = {
  id: string
  message: string
  linkUrl: string | null
  imageUrl: string | null
  status: string
  scheduledAt: string | null
  postedAt: string | null
  fbPostId: string | null
  errorMessage: string | null
  page: Page
  createdBy?: Creator
  createdAt: string
}

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient()
  const { startEdit, refresh } = useAppStore()
  const [busy, setBusy] = useState(false)

  async function refetchAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['posts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['logs'] }),
      queryClient.invalidateQueries({ queryKey: ['pages'] }),
    ])
    refresh()
  }

  async function handlePublish() {
    setBusy(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/publish`, {
        method: 'POST',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'โพสต์ไม่สำเร็จ')
      toast.success('โพสต์ไปยัง Facebook แล้ว')
      await refetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm('ต้องการลบโพสต์นี้ใช่ไหม?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'ลบไม่สำเร็จ')
      }
      toast.success('ลบโพสต์แล้ว')
      await refetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const canEdit = post.status === 'draft' || post.status === 'scheduled'
  const canPublish = post.status !== 'posted' && post.status !== 'posting'
  const fbLink =
    post.fbPostId && post.page
      ? `https://www.facebook.com/${post.page.pageId}/posts/${
          post.fbPostId.split('_')[1] ?? post.fbPostId
        }`
      : null

  return (
    <Card className="p-4 gap-3 break-inside-avoid">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 rounded-md">
          <AvatarImage src={post.page.avatar ?? undefined} />
          <AvatarFallback className="rounded-md text-xs">
            {post.page.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {post.page.name}
            </span>
            <StatusBadge status={post.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            <Clock className="h-3 w-3" />
            {post.scheduledAt
              ? `เวลาโพสต์: ${format(new Date(post.scheduledAt), 'PPP p', { locale: th })}`
              : post.postedAt
                ? `โพสต์เมื่อ ${formatDistanceToNow(new Date(post.postedAt), { addSuffix: true, locale: th })}`
                : `สร้างเมื่อ ${formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: th })}`}
          </div>
          {post.createdBy && (
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              โดย {post.createdBy.name}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm whitespace-pre-wrap line-clamp-6">{post.message}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="preview"
          className="w-full rounded-md border object-cover max-h-60"
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          {post.linkUrl}
        </a>
      )}

      {post.status === 'failed' && post.errorMessage && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="break-words">{post.errorMessage}</span>
        </div>
      )}

      {post.status === 'posted' && post.fbPostId && fbLink && (
        <a
          href={fbLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          ดูบน Facebook
        </a>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {canPublish && (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={busy}
            className="h-8"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            โพสต์เลย
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => startEdit(post.id)}
            disabled={busy}
            className="h-8"
          >
            <Edit3 className="h-3.5 w-3.5" />
            แก้ไข
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          ลบ
        </Button>
      </div>
    </Card>
  )
}
