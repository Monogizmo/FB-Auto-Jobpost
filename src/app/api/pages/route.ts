import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPageAccessToken } from '@/lib/facebook'
import { encryptToken } from '@/lib/crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return session
}

// GET /api/pages — list all FB pages (any authenticated user)
export async function GET() {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const pages = await db.facebookPage.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { posts: true } },
      createdBy: { select: { id: true, name: true, username: true } },
    },
  })
  // Never expose the encrypted token to the client
  const safe = pages.map((p) => ({
    ...p,
    encryptedToken: undefined,
    hasToken: Boolean(p.encryptedToken),
  }))
  return NextResponse.json({ pages: safe })
}

// POST /api/pages — add a new FB page (admin only, verifies token against Graph API)
export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can add Facebook pages' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { pageId, accessToken } = body as {
      pageId?: string
      accessToken?: string
    }

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: 'pageId and accessToken are required' },
        { status: 400 }
      )
    }

    const info = await verifyPageAccessToken(pageId, accessToken)

    const encryptedToken = await encryptToken(accessToken)

    const page = await db.facebookPage.upsert({
      where: { pageId },
      update: {
        name: info.name,
        encryptedToken,
        avatar: info.picture?.data?.url ?? null,
        category: info.category ?? null,
        isActive: true,
        managedById: session.user.id,
      },
      create: {
        pageId,
        name: info.name,
        encryptedToken,
        avatar: info.picture?.data?.url ?? null,
        category: info.category ?? null,
        isActive: true,
        createdById: session.user.id,
        managedById: session.user.id,
      },
    })

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        status: 'success',
        message: `Added Facebook page "${info.name}" (${pageId})`,
      },
    })

    return NextResponse.json({
      page: { ...page, encryptedToken: undefined, hasToken: true },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
