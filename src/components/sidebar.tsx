'use client'

import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Facebook,
  PenSquare,
  CalendarClock,
  History,
  ScrollText,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type Section } from '@/lib/store'
import { Button } from '@/components/ui/button'

const NAV: {
  id: Section
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'pages', label: 'เพจ Facebook', icon: Facebook, adminOnly: true },
  { id: 'create', label: 'เขียนโพสต์', icon: PenSquare },
  { id: 'schedule', label: 'คิวโพสต์', icon: CalendarClock },
  { id: 'history', label: 'ประวัติ', icon: History },
  { id: 'logs', label: 'บันทึกกิจกรรม', icon: ScrollText },
  { id: 'users', label: 'จัดการผู้ใช้', icon: Users, adminOnly: true },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
]

export function Sidebar() {
  const { section, setSection } = useAppStore()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const items = NAV.filter((i) => !i.adminOnly || isAdmin)

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-sidebar">
      <div className="flex items-center gap-2 px-5 h-16 border-b">
        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">
            FB Auto Poster
          </div>
          <div className="text-xs text-muted-foreground">ทีม Recruiter</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 scrollbar-thin overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <Button
              key={item.id}
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 h-10 font-normal',
                active &&
                  'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              )}
              onClick={() => setSection(item.id)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.adminOnly && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  Admin
                </span>
              )}
            </Button>
          )
        })}
      </nav>

      {session?.user && (
        <div className="px-4 py-3 border-t">
          <div className="text-xs text-muted-foreground mb-1">
            เข้าสู่ระบบในชื่อ
          </div>
          <div className="text-sm font-medium truncate">{session.user.name}</div>
          <div className="text-xs text-muted-foreground">
            {session.user.role === 'admin' ? 'Admin' : 'Recruiter'} • @
            {session.user.username}
          </div>
        </div>
      )}
    </aside>
  )
}

export function MobileNav() {
  const { section, setSection } = useAppStore()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const items = NAV.filter((i) => !i.adminOnly || isAdmin)

  return (
    <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-2 px-4 h-14">
        <div className="h-7 w-7 rounded bg-primary text-primary-foreground flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">FB Auto Poster</span>
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin px-2 pb-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <Button
              key={item.id}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className="shrink-0 h-8 gap-1.5"
              onClick={() => setSection(item.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
