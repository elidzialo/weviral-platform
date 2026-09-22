import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { advanceRun, type Run } from '@/lib/amazon-ads/runner'
import { errorMessage, loadConnection, requireMarketer } from '@/lib/amazon-ads/server'

export const dynamic = 'force-dynamic'
// Analysis (report download + AI review) can take a while.
export const maxDuration = 300

// GET /api/amazon-ads/runs/:id — run detail; advances the run if reports are pending
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireMarketer()
  if ('response' in auth) return auth.response

  try {
    const admin = createAdminClient()
    const load = () =>
      admin.from('amazon_ads_runs').select('*').eq('id', params.id).eq('marketer_id', auth.userId).maybeSingle()

    let { data: run } = await load()
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

    if (run.status === 'reports_pending') {
      const conn = await loadConnection(admin, auth.userId)
      if (conn) {
        await advanceRun(admin, run as Run, conn)
        run = (await load()).data
      }
    }

    const { data: actions } = await admin
      .from('amazon_ads_actions')
      .select('*')
      .eq('run_id', params.id)
      .order('created_at', { ascending: true })

    const { report_ids: _ids, locked_until: _lock, ...publicRun } = run
    return NextResponse.json({ run: publicRun, actions: actions ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
