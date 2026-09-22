import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startRun } from '@/lib/amazon-ads/runner'
import { errorMessage, loadConnection, requireMarketer } from '@/lib/amazon-ads/server'

export const dynamic = 'force-dynamic'

// GET /api/amazon-ads/runs — recent optimisation runs
export async function GET() {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('amazon_ads_runs')
    .select('id, status, trigger, date_start, date_end, totals, summary, error, created_at, completed_at')
    .eq('marketer_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data })
}

// POST /api/amazon-ads/runs — start a manual optimisation run
export async function POST() {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  try {
    const admin = createAdminClient()
    const conn = await loadConnection(admin, auth.userId)
    if (!conn) return NextResponse.json({ error: 'Amazon Ads is not connected' }, { status: 404 })

    const { count } = await admin
      .from('amazon_ads_runs')
      .select('id', { count: 'exact', head: true })
      .eq('marketer_id', auth.userId)
      .eq('status', 'reports_pending')
    if (count) {
      return NextResponse.json({ error: 'A run is already waiting on Amazon reports' }, { status: 409 })
    }

    const run = await startRun(admin, conn, 'manual')
    return NextResponse.json({ run })
  } catch (err) {
    console.error('amazon ads start run error:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 })
  }
}
