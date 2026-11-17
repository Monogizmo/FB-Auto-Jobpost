/**
 * Token encryption utility — AES-256-GCM.
 *
 * Key resolution order:
 *   1. TOKEN_ENCRYPTION_KEY env var (hex 64 chars OR base64 44 chars) — for production
 *   2. Setting row in DB (auto-generated on first run) — for local dev only
 *
 * Output format: base64(iv(12) + authTag(16) + ciphertext)
 */

import crypto from 'crypto'
import { db } from '@/lib/db'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const AUTH_TAG_LEN = 16

let cachedKey: Buffer | null = null
let cachePromise: Promise<Buffer> | null = null

async function getKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey
  if (cachePromise) return cachePromise

  cachePromise = (async () => {
    const envKey = process.env.TOKEN_ENCRYPTION_KEY
    if (envKey) {
      if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
        cachedKey = Buffer.from(envKey, 'hex')
        return cachedKey
      }
      // Try base64 (must decode to 32 bytes)
      const buf = Buffer.from(envKey, 'base64')
      if (buf.length === 32) {
        cachedKey = buf
        return cachedKey
      }
      throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (hex 64 chars or base64 44 chars)')
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_KEY is not set')
    }

    // Fallback: get or create key in DB Setting table (DEV ONLY)
    const setting = await db.setting.findUnique({
      where: { key: 'token_encryption_key' },
    })
    if (setting) {
      cachedKey = Buffer.from(setting.value, 'hex')
      return cachedKey
    }
    const newKey = crypto.randomBytes(32).toString('hex')
    await db.setting.create({
      data: { key: 'token_encryption_key', value: newKey },
    })
    cachedKey = Buffer.from(newKey, 'hex')
    return cachedKey
  })()

  return cachePromise
}

export async function encryptToken(plain: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export async function decryptToken(encStr: string): Promise<string> {
  const key = await getKey()
  const buf = Buffer.from(encStr, 'base64')
  if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) {
    throw new Error('invalid encrypted token payload')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN)
  const enc = buf.subarray(IV_LEN + AUTH_TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}
