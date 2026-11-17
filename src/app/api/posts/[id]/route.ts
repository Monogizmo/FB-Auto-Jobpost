import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH /api/posts/[id] — update draft/scheduled post fields
// Creator or admin can edit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const existing = await db.post.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'post not found' }, { status: 404 })
    }
    const isOwner = existing.createdById === session.user.id
    const isAdmin = session.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'only the creator or admin can edit this post' },
        { status: 403 }
      )
    }
    if (existing.status === 'posted' || existing.status === 'posting') {
      return NextResponse.json(
        { error: 'cannot edit a post that is already posted/posting' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { message, linkUrl, imageUrl, scheduledAt, status } = body as {
      message?: string
      linkUrl?: string | null
      imageUrl?: string | null
      scheduledAt?: string | null
      status?: 'draft' | 'scheduled'
    }

    const data: Record<string, unknown> = {}
    if (typeof message === 'string') data.message = message.trim()
    if (linkUrl !== undefined) data.linkUrl = linkUrl?.trim() || null
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null
    if (scheduledAt !== undefined) {
      data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    }
    if (status === 'scheduled' || status === 'draft') {
      data.status = status
    }

    const post = await db.post.update({ where: { id }, data })

    await db.activityLog.create({
      data: {
        postId: post.id,
        userId: session.user.id,
        action: 'update',
        status: 'info',
        message: `${session.user.name} updated post ${post.id}`,
      },
    })

    return NextResponse.json({ post })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// DELETE /api/posts/[id] — creator or admin
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.post.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'post not found' }, { status: 404 })
  }
  const isOwner = existing.createdById === session.user.id
  const isAdmin = session.user.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: 'only the creator or admin can delete this post' },
      { status: 403 }
    )
  }

  const post = await db.post.delete({ where: { id } })
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'delete',
      status: 'info',
      message: `${session.user.name} deleted post ${post.id}`,
    },
  })
  return NextResponse.json({ ok: true })
}
