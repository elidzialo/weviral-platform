import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AmazonAdsClient, exchangeCode, isRegion } from '@/lib/amazon-ads/client'
import { errorMessage, requireMarketer } from '@/lib/amazon-ads/server'

// GET /api/amazon-ads/callback — Login with Amazon redirect target
export async function GET(request: NextRequest) {
  const page = new URL('/marketer/amazon-ads', process.env.NEXT_PUBLIC_APP_URL ?? request.url)
  const fail = (message: string) => {
    page.searchParams.set('error', message)
    const res = NextResponse.redirect(page)
    res.cookies.delete({ name: 'amazon_ads_oauth', path: '/api/amazon-ads/callback' })
    return res
  }

  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  const params = request.nextUrl.searchParams
  if (params.get('error')) return fail(params.get('error_description') ?? params.get('error')!)

  let saved: { state?: string; region?: string } = {}
  try {
    saved = JSON.parse(request.cookies.get('amazon_ads_oauth')?.value ?? '{}')
  } catch {
    // treated as a missing cookie below
  }
  const code = params.get('code')
  if (!code || !saved.state || saved.state !== params.get('state') || !isRegion(saved.region)) {
    return fail('Amazon sign-in expired or was tampered with. Please try again.')
  }

  try {
    const tokens = await exchangeCode(saved.region, code)
    const profiles = await new AmazonAdsClient(saved.region, tokens.refresh_token).listProfiles()
    const summary = profiles.map((p) => ({
      profileId: String(p.profileId),
      countryCode: p.countryCode,
      currencyCode: p.currencyCode,
      name: p.accountInfo?.name ?? p.accountInfo?.id ?? String(p.profileId),
      type: p.accountInfo?.type,
    }))
    // Agency profiles can't run Sponsored Products directly, so prefer a seller/vendor one.
    const preferred = summary.find((p) => p.type === 'seller' || p.type === 'vendor') ?? summary[0]

    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('amazon_ads_connections')
      .select('profile_id')
      .eq('marketer_id', auth.userId)
      .maybeSingle()
    const keepProfile = existing?.profile_id && summary.some((p) => p.profileId === existing.profile_id)

    const { error } = await admin.from('amazon_ads_connections').upsert(
      {
        marketer_id: auth.userId,
        region: saved.region,
        refresh_token: tokens.refresh_token,
        profiles: summary,
        profile_id: keepProfile ? existing!.profile_id : preferred?.profileId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'marketer_id' }
    )
    if (error) throw new Error(error.message)

    page.searchParams.set('connected', '1')
    const res = NextResponse.redirect(page)
    res.cookies.delete({ name: 'amazon_ads_oauth', path: '/api/amazon-ads/callback' })
    return res
  } catch (err) {
    console.error('amazon ads callback error:', err)
    return fail(errorMessage(err))
  }
}
