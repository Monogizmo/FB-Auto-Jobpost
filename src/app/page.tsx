'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar, MobileNav } from '@/components/sidebar'
import { Header } from '@/components/header'
import { UserMenu } from '@/components/user-menu'
import { LoginScreen } from '@/components/login-screen'
import { DashboardSection } from '@/components/sections/dashboard'
import { PagesSection } from '@/components/sections/pages'
import { CreatePostSection } from '@/components/sections/create-post'
import { ScheduleSection } from '@/components/sections/schedule'
import { HistorySection } from '@/components/sections/history'
import { LogsSection } from '@/components/sections/logs'
import { SettingsSection } from '@/components/sections/settings'
import { UsersSection } from '@/components/sections/users'
import { useAppStore } from '@/lib/store'
import { useQueryClient } from '@/lib/query'

const SECTION_META: Record<
  string,
  { title: string; subtitle: string; adminOnly?: boolean }
> = {
  dashboard: {
    title: 'แดชบอร์ด',
    subtitle: 'ภาพรวมโพสต์และสถานะ Worker',
  },
  pages: {
    title: 'เพจ Facebook',
    subtitle: 'จัดการเพจที่เชื่อมต่อกับระบบ (Admin)',
    adminOnly: true,
  },
  create: {
    title: 'เขียนโพสต์',
    subtitle: 'เขียนข้อความ เลือกเพจ และบันทึกหรือตั้งเวลา',
  },
  schedule: {
    title: 'คิวโพสต์',
    subtitle: 'โพสต์ที่ตั้งเวลาไว้ เรียงตามเวลาที่จะโพสต์',
  },
  history: {
    title: 'ประวัติโพสต์',
    subtitle: 'โพสต์ทั้งหมดในระบบ พร้อมตัวกรอง',
  },
  logs: {
    title: 'บันทึกกิจกรรม',
    subtitle: 'ทุกการกระทำในระบบ พร้อมชื่อผู้ทำ',
  },
  users: {
    title: 'จัดการผู้ใช้',
    subtitle: 'สร้าง/แก้ไข/ลบบัญชี Recruiter และ Admin',
    adminOnly: true,
  },
  settings: {
    title: 'ตั้งค่า',
    subtitle: 'ข้อมูลระบบและสถานะ Worker',
  },
}

export default function Home() {
  const { data: session, status } = useSession()
  const { section, refreshKey } = useAppStore()
  const queryClient = useQueryClient()

  // When the user hits the global "รีเฟรช" button, invalidate everything.
  useEffect(() => {
    if (refreshKey > 0) {
      queryClient.invalidateQueries()
    }
  }, [refreshKey, queryClient])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="font-bold">FB</span>
          </div>
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  // Not authenticated → show login screen
  if (!session) {
    return <LoginScreen />
  }

  // Redirect non-admin users away from admin-only sections
  const meta = SECTION_META[section] ?? SECTION_META.dashboard
  const isAdmin = session.user.role === 'admin'
  const effectiveSection =
    meta.adminOnly && !isAdmin ? 'dashboard' : section
  const effectiveMeta = SECTION_META[effectiveSection] ?? SECTION_META.dashboard

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar />
      <MobileNav />

      <div className="md:pl-64 flex flex-col flex-1">
        <Header
          title={effectiveMeta.title}
          subtitle={effectiveMeta.subtitle}
          rightSlot={<UserMenu />}
        />
        <main className="flex-1 px-4 md:px-8 py-6">
          {effectiveSection === 'dashboard' && <DashboardSection />}
          {effectiveSection === 'pages' && isAdmin && <PagesSection />}
          {effectiveSection === 'create' && <CreatePostSection />}
          {effectiveSection === 'schedule' && <ScheduleSection />}
          {effectiveSection === 'history' && <HistorySection />}
          {effectiveSection === 'logs' && <LogsSection />}
          {effectiveSection === 'users' && isAdmin && <UsersSection />}
          {effectiveSection === 'settings' && <SettingsSection />}
        </main>

        <footer className="mt-auto border-t bg-background/95 backdrop-blur px-4 md:px-8 py-3 text-xs text-muted-foreground">
          FB Auto Poster • เข้าสู่ระบบในชื่อ {session.user.name} (
          {session.user.role}) • Token เข้ารหัส AES-256 • มี audit log
        </footer>
      </div>
    </div>
  )
}
