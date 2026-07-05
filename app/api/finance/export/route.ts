import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()

  const [{ data: invoices }, { data: payments }] = await Promise.all([
    db.from('cf_invoices')
      .select('*, cf_projects(name, client_name)')
      .order('issue_date', { ascending: true }),
    db.from('cf_subcontractor_payments')
      .select('*, cf_projects(name, client_name)')
      .order('payment_date', { ascending: true }),
  ])

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const rows: string[] = [
    ['Date', 'Type', 'Project', 'Party', 'Description', 'Net (£)', 'VAT (£)', 'Gross (£)', 'Status'].map(esc).join(','),
  ]

  for (const inv of (invoices || [])) {
    const p = inv.cf_projects as { name: string; client_name: string } | null
    const net = Number(inv.amount)
    const vat = Number(inv.vat_amount)
    rows.push([
      inv.issue_date,
      `Invoice – ${inv.type}`,
      p?.name ?? '',
      p?.client_name ?? '',
      inv.description,
      net.toFixed(2),
      vat.toFixed(2),
      (net + vat).toFixed(2),
      inv.status,
    ].map(esc).join(','))
  }

  for (const pay of (payments || [])) {
    const p = pay.cf_projects as { name: string; client_name: string } | null
    const amount = Number(pay.amount)
    rows.push([
      pay.payment_date,
      'Subcontractor Payment',
      p?.name ?? '',
      pay.subcontractor_name,
      pay.description,
      (-amount).toFixed(2),
      '0.00',
      (-amount).toFixed(2),
      pay.status,
    ].map(esc).join(','))
  }

  const filename = `construction-finance-${new Date().toISOString().split('T')[0]}.csv`
  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
