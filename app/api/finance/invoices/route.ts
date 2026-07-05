import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')

  const db = createAdminClient()
  let query = db
    .from('cf_invoices')
    .select('*, cf_projects(name, client_name)')
    .order('issue_date', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const today = new Date().toISOString().split('T')[0]
  const db = createAdminClient()
  const { data, error } = await db
    .from('cf_invoices')
    .insert({
      project_id: body.project_id,
      invoice_number: body.invoice_number || null,
      type: body.type || 'monthly',
      description: body.description || '',
      amount: body.amount,
      vat_amount: body.vat_amount ?? Math.round(Number(body.amount) * 0.2 * 100) / 100,
      issue_date: body.issue_date || today,
      due_date: body.due_date || null,
      paid_date: body.paid_date || null,
      status: body.status || 'sent',
      notes: body.notes || '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
