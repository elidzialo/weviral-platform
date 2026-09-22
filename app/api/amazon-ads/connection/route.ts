import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSettings } from '@/lib/amazon-ads/optimizer'
import { errorMessage, loadConnection, requireMarketer } from '@/lib/amazon-ads/server'

export const dynamic = 'force-dynamic'

// GET /api/amazon-ads/connection — connection status and settings (never the token)
export async function GET() {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { data } = await admin
    .from('amazon_ads_connections')
    .select('region, profile_id, profiles, settings, auto_apply, schedule_enabled, updated_at')
    .eq('marketer_id', auth.userId)
    .maybeSingle()

  return NextResponse.json({
    configured: Boolean(process.env.AMAZON_ADS_CLIENT_ID && process.env.AMAZON_ADS_CLIENT_SECRET),
    connection: data ? { ...data, settings: resolveSettings(data.settings) } : null,
  })
}

// PATCH /api/amazon-ads/connection — update profile, guardrails and automation
export async function PATCH(request: NextRequest) {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  try {
    const admin = createAdminClient()
    const conn = await loadConnection(admin, auth.userId)
    if (!conn) return NextResponse.json({ error: 'Amazon Ads is not connected' }, { status: 404 })

    const body = await request.json()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.profile_id !== undefined) {
      const { data } = await admin
        .from('amazon_ads_connections')
        .select('profiles')
        .eq('id', conn.id)
        .single()
      const profiles = (data?.profiles ?? []) as { profileId: string }[]
      if (!profiles.some((p) => p.profileId === String(body.profile_id))) {
        return NextResponse.json({ error: 'Unknown profile' }, { status: 400 })
      }
      update.profile_id = String(body.profile_id)
    }
    if (body.settings !== undefined) update.settings = resolveSettings({ ...conn.settings, ...body.settings })
    if (typeof body.auto_apply === 'boolean') update.auto_apply = body.auto_apply
    if (typeof body.schedule_enabled === 'boolean') update.schedule_enabled = body.schedule_enabled

    const { error } = await admin.from('amazon_ads_connections').update(update).eq('id', conn.id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// DELETE /api/amazon-ads/connection — disconnect (run history is kept)
export async function DELETE() {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { error } = await admin.from('amazon_ads_connections').delete().eq('marketer_id', auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
