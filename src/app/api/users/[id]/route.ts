import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH /api/users/[id] — toggle active or change role (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { isActive, role } = body as {
    isActive?: boolean
    role?: 'admin' | 'recruiter'
  }

  // Don't let admin deactivate/demote themselves
  if (id === session.user.id) {
    return NextResponse.json(
      { error: 'cannot modify your own account' },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}
  if (typeof isActive === 'boolean') data.isActive = isActive
  if (role === 'admin' || role === 'recruiter') data.role = role

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const user = await db.user.update({ where: { id }, data })

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'update',
      status: 'info',
      message: `Updated user "${user.username}" — ${JSON.stringify(data)}`,
    },
  })

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
  })
}

// DELETE /api/users/[id] — delete user (admin only, not self)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }
  if (id === session.user.id) {
    return NextResponse.json(
      { error: 'cannot delete your own account' },
      { status: 400 }
    )
  }

  const user = await db.user.delete({ where: { id } })
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'delete',
      status: 'info',
      message: `Deleted user "${user.username}"`,
    },
  })
  return NextResponse.json({ ok: true })
}
