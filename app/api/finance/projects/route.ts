import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('cf_projects')
    .select(`
      *,
      cf_invoices(id, amount, vat_amount, status, type),
      cf_subcontractor_payments(id, amount, status)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()
  const { data, error } = await db
    .from('cf_projects')
    .insert({
      name: body.name,
      client_name: body.client_name,
      client_contact: body.client_contact || null,
      contract_value: body.contract_value || 0,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      status: body.status || 'active',
      notes: body.notes || '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
