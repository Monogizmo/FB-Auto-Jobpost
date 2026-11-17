/**
 * NextAuth config — credentials provider with Prisma + bcryptjs.
 * Roles: admin (manage pages + users) | recruiter (create posts only)
 */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

type ExtendedUser = {
  id: string
  name: string
  email: string
  role: string
  username: string
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const username = creds?.username?.toString().trim().toLowerCase()
        const password = creds?.password?.toString()
        if (!username || !password) return null

        const user = await db.user.findUnique({ where: { username } })
        if (!user || !user.isActive) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        const extended: ExtendedUser = {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
          username: user.username,
        }
        return extended as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as ExtendedUser
        token.id = u.id
        token.role = u.role
        token.username = u.username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as ExtendedUser).id = token.id as string
        ;(session.user as ExtendedUser).role = token.role as string
        ;(session.user as ExtendedUser).username = token.username as string
      }
      return session
    },
  },
  secret: (() => {
    const s = process.env.NEXTAUTH_SECRET
    if (s) return s
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET is not set')
    }
    return 'dev-only-secret-not-for-production'
  })(),
  pages: {
    // We render login UI inline on the main page (only / route is allowed)
  },
}

export type { ExtendedUser }
