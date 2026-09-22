import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { authorizeUrl, isRegion } from '@/lib/amazon-ads/client'
import { errorMessage, requireMarketer } from '@/lib/amazon-ads/server'

// GET /api/amazon-ads/connect?region=EU — start Login with Amazon for Amazon Ads
export async function GET(request: NextRequest) {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  const region = request.nextUrl.searchParams.get('region') ?? 'EU'
  if (!isRegion(region)) {
    return NextResponse.json({ error: 'region must be NA, EU or FE' }, { status: 400 })
  }

  try {
    const state = randomBytes(24).toString('hex')
    const response = NextResponse.redirect(authorizeUrl(region, state))
    // The callback checks this cookie to reject forged OAuth responses.
    response.cookies.set('amazon_ads_oauth', JSON.stringify({ state, region }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/amazon-ads/callback',
      maxAge: 600,
    })
    return response
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
