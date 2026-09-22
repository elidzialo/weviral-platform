import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyActions, closeRunIfDone, type ActionRow } from '@/lib/amazon-ads/runner'
import { errorMessage, loadConnection, requireMarketer } from '@/lib/amazon-ads/server'

export const maxDuration = 120

// POST /api/amazon-ads/runs/:id/actions — { approve: string[], reject: string[] }
// Approved actions are pushed to Amazon immediately; rejected ones are recorded.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  try {
    const body = await request.json()
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const approve = ids(body.approve)
    const reject = ids(body.reject)
    if (!approve.length && !reject.length) {
      return NextResponse.json({ error: 'approve or reject is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: run } = await admin
      .from('amazon_ads_runs')
      .select('id, profile_id, status')
      .eq('id', params.id)
      .eq('marketer_id', auth.userId)
      .maybeSingle()
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    if (run.status !== 'awaiting_approval') {
      return NextResponse.json({ error: 'This run has no actions awaiting approval' }, { status: 400 })
    }

    if (reject.length) {
      await admin
        .from('amazon_ads_actions')
        .update({ status: 'rejected' })
        .eq('run_id', run.id)
        .eq('status', 'proposed')
        .in('id', reject)
    }

    let result = { applied: 0, failed: 0 }
    if (approve.length) {
      const conn = await loadConnection(admin, auth.userId)
      if (!conn) return NextResponse.json({ error: 'Amazon Ads is not connected' }, { status: 404 })

      const { data: actions } = await admin
        .from('amazon_ads_actions')
        .select('*')
        .eq('run_id', run.id)
        .eq('status', 'proposed')
        .in('id', approve)
      result = await applyActions(admin, conn, run, (actions ?? []) as ActionRow[])
    } else {
      await closeRunIfDone(admin, run.id)
    }

    return NextResponse.json({ success: true, ...result, rejected: reject.length })
  } catch (err) {
    console.error('amazon ads apply error:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
