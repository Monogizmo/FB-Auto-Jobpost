'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User as UserIcon, ChevronDown, Shield } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function UserMenu() {
  const { data: session } = useSession()
  const { setSection } = useAppStore()
  const [open, setOpen] = useState(false)

  if (!session?.user) return null

  const initials = session.user.name
    ?.split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
            {session.user.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium truncate">
              {session.user.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              @{session.user.username}
            </span>
            <span className="text-xs flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3" />
              {session.user.role === 'admin' ? 'Admin' : 'Recruiter'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session.user.role === 'admin' && (
          <DropdownMenuItem onClick={() => setSection('users')}>
            <UserIcon className="h-4 w-4" />
            จัดการผู้ใช้
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-red-600 hover:text-red-700 focus:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
