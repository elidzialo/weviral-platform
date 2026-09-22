import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { advanceRun, startRun, type Connection, type Run } from '@/lib/amazon-ads/runner'
import { errorMessage } from '@/lib/amazon-ads/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Don't start a scheduled run if the account had any run within this window.
const MIN_HOURS_BETWEEN_RUNS = 20

// GET /api/amazon-ads/cron — invoked by Vercel Cron (see vercel.json).
// 1. Advances runs whose Amazon reports were pending.
// 2. Starts a daily run for every connection with scheduling enabled.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connections } = await admin.from('amazon_ads_connections').select('*')
  const byMarketer = new Map(((connections ?? []) as Connection[]).map((c) => [c.marketer_id, c]))
  const summary = { advanced: 0, started: 0, errors: [] as string[] }

  const { data: pending } = await admin.from('amazon_ads_runs').select('*').eq('status', 'reports_pending')
  for (const run of (pending ?? []) as Run[]) {
    const conn = byMarketer.get(run.marketer_id)
    if (!conn) continue
    const status = await advanceRun(admin, run, conn)
    if (status !== 'reports_pending') summary.advanced++
  }

  const since = new Date(Date.now() - MIN_HOURS_BETWEEN_RUNS * 3600 * 1000).toISOString()
  for (const conn of Array.from(byMarketer.values())) {
    if (!conn.schedule_enabled || !conn.profile_id) continue
    const { count } = await admin
      .from('amazon_ads_runs')
      .select('id', { count: 'exact', head: true })
      .eq('marketer_id', conn.marketer_id)
      .gte('created_at', since)
    if (count) continue
    try {
      await startRun(admin, conn, 'scheduled')
      summary.started++
    } catch (err) {
      summary.errors.push(`${conn.marketer_id}: ${errorMessage(err)}`)
    }
  }

  return NextResponse.json(summary)
}
