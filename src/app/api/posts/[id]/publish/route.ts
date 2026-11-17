import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { publishToPage } from '@/lib/facebook'
import { decryptToken } from '@/lib/crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/posts/[id]/publish — publish right now via Graph API
// Any authenticated user (creator or anyone in the team) can publish
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const post = await db.post.findUnique({
      where: { id },
      include: { page: true },
    })

    if (!post) {
      return NextResponse.json({ error: 'post not found' }, { status: 404 })
    }
    if (!post.page.isActive) {
      return NextResponse.json(
        { error: 'target page is disabled' },
        { status: 400 }
      )
    }
    if (post.status === 'posted') {
      return NextResponse.json(
        { error: 'post already published' },
        { status: 400 }
      )
    }

    await db.post.update({ where: { id }, data: { status: 'posting' } })

    try {
      const accessToken = await decryptToken(post.page.encryptedToken)
      const result = await publishToPage({
        pageId: post.page.pageId,
        accessToken,
        message: post.message,
        linkUrl: post.linkUrl,
        imageUrl: post.imageUrl,
      })

      const updated = await db.post.update({
        where: { id },
        data: {
          status: 'posted',
          postedAt: new Date(),
          fbPostId: result.id,
          errorMessage: null,
        },
      })

      await db.activityLog.create({
        data: {
          postId: id,
          userId: session.user.id,
          action: 'publish',
          status: 'success',
          message: `${session.user.name} manually published to "${post.page.name}" — FB id ${result.id}`,
        },
      })

      return NextResponse.json({ post: updated })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db.post.update({
        where: { id },
        data: { status: 'failed', errorMessage: message },
      })
      await db.activityLog.create({
        data: {
          postId: id,
          userId: session.user.id,
          action: 'publish',
          status: 'error',
          message,
        },
      })
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
