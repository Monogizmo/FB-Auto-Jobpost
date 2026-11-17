'use client'

import { useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export function Header({
  title,
  subtitle,
  rightSlot,
}: {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
}) {
  const { setTheme } = useTheme()
  const { refresh } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)

  return (
    <header className="flex items-center justify-between gap-3 px-4 md:px-8 py-5 border-b bg-background/95 backdrop-blur sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => {
            setRefreshing(true)
            refresh()
            setTimeout(() => setRefreshing(false), 600)
          }}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">รีเฟรช</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            const isDark = document.documentElement.classList.contains('dark')
            setTheme(isDark ? 'light' : 'dark')
          }}
          aria-label="toggle theme"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </Button>
        {rightSlot}
      </div>
    </header>
  )
}
