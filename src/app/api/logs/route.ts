import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/logs?take=50
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const takeParam = req.nextUrl.searchParams.get('take')
  const take = Math.min(parseInt(takeParam || '50', 10) || 50, 200)

  const logs = await db.activityLog.findMany({
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      post: { select: { id: true, message: true } },
      user: { select: { id: true, name: true, username: true } },
    },
  })
  return NextResponse.json({ logs })
}
