/**
 * Facebook Graph API client - server side only
 */

export const FB_GRAPH_API = 'https://graph.facebook.com/v19.0'

export type FacebookPageInfo = {
  id: string
  name: string
  category?: string
  picture?: {
    data: {
      url: string
    }
  }
}

export type FacebookPostResult = {
  id: string
}

/**
 * Verify a Page Access Token and fetch page info.
 * GET /{page-id}?fields=id,name,category,picture&access_token=...
 */
export async function verifyPageAccessToken(
  pageId: string,
  accessToken: string
): Promise<FacebookPageInfo> {
  const url = new URL(`${FB_GRAPH_API}/${pageId}`)
  url.searchParams.set('fields', 'id,name,category,picture{url}')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message || `Facebook API error ${res.status}`
    throw new Error(msg)
  }

  return (await res.json()) as FacebookPageInfo
}

/**
 * Publish a post to a Facebook Page.
 * POST /{page-id}/feed with message, link, picture (optional) and access_token.
 */
export async function publishToPage(params: {
  pageId: string
  accessToken: string
  message: string
  linkUrl?: string | null
  imageUrl?: string | null
}): Promise<FacebookPostResult> {
  const { pageId, accessToken, message, linkUrl, imageUrl } = params
  const url = new URL(`${FB_GRAPH_API}/${pageId}/feed`)

  const body = new URLSearchParams()
  body.set('message', message)
  body.set('access_token', accessToken)
  if (linkUrl) body.set('link', linkUrl)
  // "picture" param sets the preview image for a link post on the feed
  if (imageUrl) body.set('picture', imageUrl)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  const json = (await res.json().catch(() => ({}))) as
    | FacebookPostResult
    | { error?: { message?: string } }

  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } })?.error?.message ||
      `Facebook API error ${res.status}`
    // Redact any token-looking strings from error messages
    const safe = msg.replace(/EAAB[\w-]+/g, '[REDACTED_TOKEN]')
    throw new Error(safe)
  }

  return json as FacebookPostResult
}
