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
    .from('cf_subcontractor_payments')
    .select('*, cf_projects(name, client_name)')
    .order('payment_date', { ascending: false })

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
    .from('cf_subcontractor_payments')
    .insert({
      project_id: body.project_id,
      subcontractor_name: body.subcontractor_name,
      description: body.description || '',
      amount: body.amount,
      payment_date: body.payment_date || today,
      status: body.status || 'paid',
      notes: body.notes || '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
