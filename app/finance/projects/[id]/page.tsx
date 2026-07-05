'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Invoice = {
  id: string
  invoice_number: string | null
  type: string
  description: string
  amount: number
  vat_amount: number
  issue_date: string
  due_date: string | null
  paid_date: string | null
  status: string
  notes: string
}

type SubPay = {
  id: string
  subcontractor_name: string
  description: string
  amount: number
  payment_date: string
  status: string
  notes: string
}

type Project = {
  id: string
  name: string
  client_name: string
  client_contact: string | null
  contract_value: number
  start_date: string | null
  end_date: string | null
  status: string
  notes: string
  cf_invoices: Invoice[]
  cf_subcontractor_payments: SubPay[]
}

const INV_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const INV_TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit', monthly: 'Monthly', milestone: 'Milestone', final: 'Final', variation: 'Variation',
}

const fmt = (n: number) =>
  '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

type InvForm = {
  type: string; description: string; amount: string; vat_amount: string
  invoice_number: string; issue_date: string; due_date: string; status: string; paid_date: string
}
type SubForm = {
  subcontractor_name: string; description: string; amount: string; payment_date: string; status: string
}

const EMPTY_INV: InvForm = { type: 'monthly', description: '', amount: '', vat_amount: '', invoice_number: '', issue_date: '', due_date: '', status: 'sent', paid_date: '' }
const EMPTY_SUB: SubForm = { subcontractor_name: '', description: '', amount: '', payment_date: '', status: 'paid' }

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvModal, setShowInvModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [invForm, setInvForm] = useState<InvForm>(EMPTY_INV)
  const [subForm, setSubForm] = useState<SubForm>(EMPTY_SUB)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/finance/projects/${params.id}`)
    if (!res.ok) { router.push('/finance/projects'); return }
    const data = await res.json()
    setProject(data)
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { load() }, [load])

  const markPaid = async (invId: string) => {
    await fetch(`/api/finance/invoices/${invId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }),
    })
    load()
  }

  const deleteInvoice = async (invId: string) => {
    if (!confirm('Delete this invoice?')) return
    await fetch(`/api/finance/invoices/${invId}`, { method: 'DELETE' })
    load()
  }

  const deleteSub = async (subId: string) => {
    if (!confirm('Delete this payment?')) return
    await fetch(`/api/finance/subcontractors/${subId}`, { method: 'DELETE' })
    load()
  }

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const net = parseFloat(invForm.amount) || 0
    const vat = invForm.vat_amount !== '' ? parseFloat(invForm.vat_amount) : Math.round(net * 0.2 * 100) / 100
    const res = await fetch('/api/finance/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: params.id,
        type: invForm.type,
        description: invForm.description,
        amount: net,
        vat_amount: vat,
        invoice_number: invForm.invoice_number || null,
        issue_date: invForm.issue_date || undefined,
        due_date: invForm.due_date || null,
        status: invForm.status,
        paid_date: invForm.paid_date || null,
      }),
    })
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'Error'); setSaving(false); return }
    setShowInvModal(false); setInvForm(EMPTY_INV); load()
    setSaving(false)
  }

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setErr('')
    const res = await fetch('/api/finance/subcontractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: params.id,
        subcontractor_name: subForm.subcontractor_name,
        description: subForm.description,
        amount: parseFloat(subForm.amount) || 0,
        payment_date: subForm.payment_date || undefined,
        status: subForm.status,
      }),
    })
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'Error'); setSaving(false); return }
    setShowSubModal(false); setSubForm(EMPTY_SUB); load()
    setSaving(false)
  }

  if (loading || !project) {
    return <div className="p-8 text-[#8C8C88]">Loading…</div>
  }

  const invoiced = project.cf_invoices.reduce((s, i) => s + Number(i.amount), 0)
  const received = project.cf_invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) + Number(i.vat_amount), 0)
  const outstanding = project.cf_invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount) + Number(i.vat_amount), 0)
  const costs = project.cf_subcontractor_payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const grossProfit = received - costs

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#8C8C88] mb-6">
        <Link href="/finance/projects" className="hover:text-[#0B0B0C] transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-[#0B0B0C] font-medium">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-2xl border border-[#ECECE8] p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B0B0C] mb-1">{project.name}</h1>
            <p className="text-sm text-[#8C8C88]">
              {project.client_name}
              {project.client_contact && ` · ${project.client_contact}`}
            </p>
            {project.start_date && (
              <p className="text-xs text-[#8C8C88] mt-1">
                Started {fmtDate(project.start_date)}
                {project.end_date && ` · Ends ${fmtDate(project.end_date)}`}
              </p>
            )}
            {project.notes && <p className="text-sm text-[#8C8C88] mt-2 italic">{project.notes}</p>}
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 capitalize flex-shrink-0">
            {project.status.replace('_', ' ')}
          </span>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-5 border-t border-[#ECECE8]">
          {[
            { label: 'Contract', value: fmt(Number(project.contract_value)), color: 'text-[#0B0B0C]' },
            { label: 'Invoiced', value: fmt(invoiced), color: 'text-[#0B0B0C]' },
            { label: 'Received', value: fmt(received), color: 'text-emerald-600' },
            { label: 'Outstanding', value: fmt(outstanding), color: outstanding > 0 ? 'text-amber-600' : 'text-[#8C8C88]' },
            { label: 'Gross Profit', value: fmt(grossProfit), color: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-[#8C8C88] font-medium mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-[#ECECE8] mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECE8]">
          <h2 className="font-semibold text-[#0B0B0C]">Client Invoices</h2>
          <button
            onClick={() => { setErr(''); setShowInvModal(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Invoice
          </button>
        </div>

        {project.cf_invoices.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[#8C8C88] text-center">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ECECE8]">
                  {['#', 'Type', 'Description', 'Net', 'VAT', 'Gross', 'Issued', 'Due', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#8C8C88] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECE8]">
                {project.cf_invoices
                  .slice()
                  .sort((a, b) => a.issue_date.localeCompare(b.issue_date))
                  .map(inv => (
                  <tr key={inv.id} className="hover:bg-[#F6F6F3]">
                    <td className="px-4 py-3 text-[#8C8C88] whitespace-nowrap">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                        {INV_TYPE_LABELS[inv.type] || inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#0B0B0C] max-w-[180px] truncate">{inv.description || '—'}</td>
                    <td className="px-4 py-3 font-medium text-[#0B0B0C] whitespace-nowrap">{fmt(Number(inv.amount))}</td>
                    <td className="px-4 py-3 text-[#8C8C88] whitespace-nowrap">{fmt(Number(inv.vat_amount))}</td>
                    <td className="px-4 py-3 font-semibold text-[#0B0B0C] whitespace-nowrap">{fmt(Number(inv.amount) + Number(inv.vat_amount))}</td>
                    <td className="px-4 py-3 text-[#8C8C88] whitespace-nowrap">{fmtDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-[#8C8C88] whitespace-nowrap">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INV_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                      {inv.paid_date && <span className="block text-xs text-[#8C8C88] mt-0.5">{fmtDate(inv.paid_date)}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        {inv.status === 'sent' && (
                          <button onClick={() => markPaid(inv.id)} className="text-xs text-emerald-600 hover:underline font-medium">
                            Mark paid
                          </button>
                        )}
                        <button onClick={() => deleteInvoice(inv.id)} className="text-xs text-red-400 hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subcontractor payments */}
      <div className="bg-white rounded-2xl border border-[#ECECE8]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECE8]">
          <h2 className="font-semibold text-[#0B0B0C]">Subcontractor Payments</h2>
          <button
            onClick={() => { setErr(''); setShowSubModal(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Payment
          </button>
        </div>

        {project.cf_subcontractor_payments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[#8C8C88] text-center">No subcontractor payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ECECE8]">
                  {['Subcontractor', 'Description', 'Amount', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#8C8C88] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECE8]">
                {project.cf_subcontractor_payments
                  .slice()
                  .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
                  .map(pay => (
                  <tr key={pay.id} className="hover:bg-[#F6F6F3]">
                    <td className="px-4 py-3 font-medium text-[#0B0B0C]">{pay.subcontractor_name}</td>
                    <td className="px-4 py-3 text-[#8C8C88] max-w-[200px] truncate">{pay.description || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{fmt(Number(pay.amount))}</td>
                    <td className="px-4 py-3 text-[#8C8C88]">{fmtDate(pay.payment_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pay.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteSub(pay.id)} className="text-xs text-red-400 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#ECECE8] bg-[#F6F6F3]">
                  <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-[#8C8C88] uppercase tracking-wider">Total Paid Out</td>
                  <td className="px-4 py-3 font-bold text-red-600">{fmt(costs)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Invoice Modal */}
      {showInvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#0B0B0C]">Add Invoice</h2>
              <button onClick={() => setShowInvModal(false)} className="text-[#8C8C88] hover:text-[#0B0B0C]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Type *</label>
                  <select
                    value={invForm.type}
                    onChange={e => setInvForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="deposit">Deposit (30%)</option>
                    <option value="monthly">Monthly Progress</option>
                    <option value="milestone">Milestone</option>
                    <option value="final">Final</option>
                    <option value="variation">Variation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Invoice #</label>
                  <input
                    value={invForm.invoice_number}
                    onChange={e => setInvForm(f => ({ ...f, invoice_number: e.target.value }))}
                    placeholder="INV-001"
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Description</label>
                <input
                  value={invForm.description}
                  onChange={e => setInvForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. 30% deposit on contract"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Net Amount (£) *</label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={invForm.amount}
                    onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="15000"
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">VAT (£) — leave blank for 20%</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={invForm.vat_amount}
                    onChange={e => setInvForm(f => ({ ...f, vat_amount: e.target.value }))}
                    placeholder="auto"
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Issue Date</label>
                  <input
                    type="date"
                    value={invForm.issue_date}
                    onChange={e => setInvForm(f => ({ ...f, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={invForm.due_date}
                    onChange={e => setInvForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={invForm.status}
                    onChange={e => setInvForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {invForm.status === 'paid' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Paid Date</label>
                    <input
                      type="date"
                      value={invForm.paid_date}
                      onChange={e => setInvForm(f => ({ ...f, paid_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowInvModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-[#ECECE8] text-sm font-medium text-[#8C8C88] hover:bg-[#F6F6F3] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}>
                  {saving ? 'Saving…' : 'Add Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subcontractor Payment Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#0B0B0C]">Add Subcontractor Payment</h2>
              <button onClick={() => setShowSubModal(false)} className="text-[#8C8C88] hover:text-[#0B0B0C]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddSub} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Subcontractor *</label>
                <input
                  required
                  value={subForm.subcontractor_name}
                  onChange={e => setSubForm(f => ({ ...f, subcontractor_name: e.target.value }))}
                  placeholder="e.g. ABC Plumbing Ltd"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Description</label>
                <input
                  value={subForm.description}
                  onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. January plumbing works"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Amount (£) *</label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={subForm.amount}
                    onChange={e => setSubForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="3000"
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={subForm.payment_date}
                    onChange={e => setSubForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={subForm.status}
                  onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowSubModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-[#ECECE8] text-sm font-medium text-[#8C8C88] hover:bg-[#F6F6F3] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}>
                  {saving ? 'Saving…' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
