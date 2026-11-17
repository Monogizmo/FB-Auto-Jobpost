import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/auth/register
 *   - First user ever: becomes admin (no auth required) — bootstrap flow
 *   - Subsequent users: requires admin session
 *
 * Body: { username, name, password, role? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, name, password, role } = body as {
      username?: string
      name?: string
      password?: string
      role?: string
    }

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: 'username, name, password are required' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const uname = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      return NextResponse.json(
        { error: 'username must be 3-30 chars, lowercase letters/numbers/underscore' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { username: uname } })
    if (existing) {
      return NextResponse.json(
        { error: 'username already taken' },
        { status: 409 }
      )
    }

    const userCount = await db.user.count()
    const isFirstUser = userCount === 0

    // If not first user, require admin session
    if (!isFirstUser) {
      const session = await getServerSession(authOptions)
      if (!session || session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can create new accounts' },
          { status: 403 }
        )
      }
    }

    const finalRole = isFirstUser
      ? 'admin'
      : role === 'admin'
        ? 'admin'
        : 'recruiter'

    // Only existing admins can grant admin role to others
    if (!isFirstUser && finalRole === 'admin') {
      const session = await getServerSession(authOptions)
      if (session?.user?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can grant admin role' },
          { status: 403 }
        )
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: {
        username: uname,
        name: name.trim(),
        passwordHash,
        role: finalRole,
      },
    })

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'user_create',
        status: 'success',
        message: `Created ${finalRole} account "${uname}" (${name})${
          isFirstUser ? ' [bootstrap]' : ''
        }`,
      },
    })

    return NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      isFirstUser,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
