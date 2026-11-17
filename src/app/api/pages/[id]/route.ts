import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (session.user.role !== 'admin') return null
  return session
}

// PATCH /api/pages/[id] — toggle active (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isActive } = body as { isActive?: boolean }

  if (typeof isActive !== 'boolean') {
    return NextResponse.json(
      { error: 'isActive boolean required' },
      { status: 400 }
    )
  }

  const page = await db.facebookPage.update({
    where: { id },
    data: { isActive },
  })

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'update',
      status: 'info',
      message: `Page "${page.name}" ${isActive ? 'enabled' : 'disabled'}`,
    },
  })

  return NextResponse.json({ page: { ...page, encryptedToken: undefined } })
}

// DELETE /api/pages/[id] (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const { id } = await params
  const page = await db.facebookPage.delete({ where: { id } })
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'delete',
      status: 'info',
      message: `Removed Facebook page "${page.name}"`,
    },
  })
  return NextResponse.json({ ok: true })
}
