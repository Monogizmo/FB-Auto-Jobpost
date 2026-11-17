import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return session
}

// GET /api/posts?status=scheduled
export async function GET(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const status = req.nextUrl.searchParams.get('status')
  // "all" is the sentinel for "no filter"
  const where = status && status !== 'all' ? { status } : undefined
  const posts = await db.post.findMany({
    where,
    include: {
      page: true,
      createdBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ posts })
}

// POST /api/posts — create draft or scheduled post
export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message, linkUrl, imageUrl, pageId, scheduledAt, status } = body as {
      message?: string
      linkUrl?: string | null
      imageUrl?: string | null
      pageId?: string
      scheduledAt?: string | null
      status?: 'draft' | 'scheduled'
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
    }

    const page = await db.facebookPage.findUnique({ where: { id: pageId } })
    if (!page) {
      return NextResponse.json({ error: 'page not found' }, { status: 404 })
    }
    if (!page.isActive) {
      return NextResponse.json(
        { error: 'page is disabled — cannot post' },
        { status: 400 }
      )
    }

    const finalStatus = status === 'scheduled' ? 'scheduled' : 'draft'
    const scheduled =
      finalStatus === 'scheduled' && scheduledAt
        ? new Date(scheduledAt)
        : null

    if (finalStatus === 'scheduled' && (!scheduled || isNaN(scheduled.getTime()))) {
      return NextResponse.json(
        { error: 'scheduledAt is required when status=scheduled' },
        { status: 400 }
      )
    }

    const post = await db.post.create({
      data: {
        message: message.trim(),
        linkUrl: linkUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        pageId,
        createdById: session.user.id,
        status: finalStatus,
        scheduledAt: scheduled,
      },
    })

    await db.activityLog.create({
      data: {
        postId: post.id,
        userId: session.user.id,
        action: finalStatus === 'scheduled' ? 'schedule' : 'create',
        status: 'success',
        message:
          finalStatus === 'scheduled'
            ? `${session.user.name} scheduled post for ${page.name} at ${scheduled?.toISOString()}`
            : `${session.user.name} saved draft post for ${page.name}`,
      },
    })

    return NextResponse.json({ post })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
