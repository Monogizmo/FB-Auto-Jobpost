import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard — overview stats
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [
    totalPages,
    activePages,
    scheduledCount,
    postedCount,
    failedCount,
    draftCount,
    recentPosts,
    recentLogs,
    totalUsers,
  ] = await Promise.all([
    db.facebookPage.count(),
    db.facebookPage.count({ where: { isActive: true } }),
    db.post.count({ where: { status: 'scheduled' } }),
    db.post.count({ where: { status: 'posted' } }),
    db.post.count({ where: { status: 'failed' } }),
    db.post.count({ where: { status: 'draft' } }),
    db.post.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        page: true,
        createdBy: { select: { id: true, name: true, username: true } },
      },
    }),
    db.activityLog.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        post: { select: { message: true } },
        user: { select: { name: true } },
      },
    }),
    db.user.count(),
  ])

  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const recentPosted = await db.post.findMany({
    where: { postedAt: { gte: since } },
    select: { postedAt: true, status: true },
  })

  const perDay: { date: string; posted: number; failed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const dayPosted = recentPosted.filter(
      (p) => p.postedAt && p.postedAt >= d && p.postedAt < next
    ).length
    perDay.push({
      date: d.toISOString().slice(0, 10),
      posted: dayPosted,
      failed: 0,
    })
  }

  return NextResponse.json({
    stats: {
      totalPages,
      activePages,
      scheduled: scheduledCount,
      posted: postedCount,
      failed: failedCount,
      draft: draftCount,
      totalUsers,
    },
    perDay,
    recentPosts,
    recentLogs,
  })
}
