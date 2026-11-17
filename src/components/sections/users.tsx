'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@/lib/query'
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  Power,
  Shield,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'

type User = {
  id: string
  username: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  _count: { posts: number }
}

export function UsersSection() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<{ users: User[]; currentUser: any }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('ไม่สามารถโหลดรายชื่อผู้ใช้')
      return res.json()
    },
  })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    username: '',
    name: '',
    password: '',
    role: 'recruiter' as 'admin' | 'recruiter',
  })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.username.trim() || !form.name.trim() || !form.password) {
      toast.error('กรอกข้อมูลให้ครบ')
      return
    }
    if (form.password.length < 8) {
      toast.error('รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim().toLowerCase(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'สร้างบัญชีไม่สำเร็จ')
      toast.success(`สร้างบัญชี "${body.user.username}" แล้ว`)
      setForm({ username: '', name: '', password: '', role: 'recruiter' })
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
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
      toast.success('อัปเดตสถานะแล้ว')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'recruiter' }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'อัปเดตไม่สำเร็จ')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('อัปเดตบทบาทแล้ว')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'ลบไม่สำเร็จ')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('ลบบัญชีแล้ว')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            จัดการผู้ใช้
          </h2>
          <p className="text-xs text-muted-foreground">
            {data?.users.length ?? 0} บัญชี — เฉพาะ Admin เท่านั้น
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              เพิ่มผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มบัญชีใหม่</DialogTitle>
              <DialogDescription>
                สร้างบัญชี Recruiter หรือ Admin ใหม่ในทีม
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">ชื่อ-นามสกุล</Label>
                <Input
                  id="u-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น สมหญิง รักงาน"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-username">ชื่อผู้ใช้</Label>
                <Input
                  id="u-username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="3-30 ตัว พิมพ์เล็ก/ตัวเลข/_"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-password">รหัสผ่านชั่วคราว (8+ ตัว)</Label>
                <Input
                  id="u-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="แจ้งให้ผู้ใช้เปลี่ยนภายหลัง"
                />
              </div>
              <div className="space-y-1.5">
                <Label>บทบาท</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({ ...form, role: v as 'admin' | 'recruiter' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">
                      <span className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        Recruiter — เขียน/ตั้งเวลาโพสต์
                      </span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin — จัดการเพจ + ผู้ใช้ + Worker
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                สร้างบัญชี
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="p-4 h-24 animate-pulse bg-muted" />
      ) : data?.users.length ? (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y">
            {data.users.map((u) => {
              const isSelf = u.id === data.currentUser?.id
              return (
                <div
                  key={u.id}
                  className="p-4 flex items-center gap-3 flex-wrap"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {u.name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {u.name}
                      </span>
                      {isSelf && (
                        <Badge variant="outline" className="text-xs">
                          คุณ
                        </Badge>
                      )}
                      <Badge
                        className={
                          u.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {u.role === 'admin' ? 'Admin' : 'Recruiter'}
                      </Badge>
                      {!u.isActive && (
                        <Badge variant="secondary">ปิดใช้งาน</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      @{u.username} • {u._count.posts} โพสต์ • เข้าร่วม{' '}
                      {formatDistanceToNow(new Date(u.createdAt), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() =>
                          roleMutation.mutate({ id: u.id, role: 'admin' })
                        }
                        disabled={roleMutation.isPending}
                        title="เลื่อนเป็น Admin"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        เลื่อน Admin
                      </Button>
                    )}
                    {u.role === 'admin' && !isSelf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() =>
                          roleMutation.mutate({ id: u.id, role: 'recruiter' })
                        }
                        disabled={roleMutation.isPending}
                        title="ลดเป็น Recruiter"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        ลดเป็น Recruiter
                      </Button>
                    )}
                    {!isSelf && (
                      <>
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: u.id,
                              isActive: checked,
                            })
                          }
                          disabled={toggleMutation.isPending}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            if (confirm(`ลบบัญชี "${u.name}"?`)) {
                              deleteMutation.mutate(u.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          ยังไม่มีผู้ใช้ในระบบ
        </Card>
      )}
    </div>
  )
}
