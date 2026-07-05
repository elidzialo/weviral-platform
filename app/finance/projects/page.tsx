'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type InvoiceRow = { id: string; amount: number; vat_amount: number; status: string; type: string }
type SubPayRow = { id: string; amount: number; status: string }

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
  created_at: string
  cf_invoices: InvoiceRow[]
  cf_subcontractor_payments: SubPayRow[]
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  completed: { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  on_hold:   { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  cancelled: { bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500' },
}

function fmt(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function projectStats(p: Project) {
  const invoiced = p.cf_invoices.reduce((s, i) => s + Number(i.amount), 0)
  const received = p.cf_invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount) + Number(i.vat_amount), 0)
  const costs = p.cf_subcontractor_payments
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)
  const outstanding = p.cf_invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount) + Number(i.vat_amount), 0)
  return { invoiced, received, costs, outstanding }
}

type ModalState = { name: string; client_name: string; client_contact: string; contract_value: string; start_date: string; notes: string }

const EMPTY_MODAL: ModalState = { name: '', client_name: '', client_contact: '', contract_value: '', start_date: '', notes: '' }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ModalState>(EMPTY_MODAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/finance/projects')
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totals = projects.reduce(
    (acc, p) => {
      const s = projectStats(p)
      return {
        contract: acc.contract + Number(p.contract_value),
        invoiced: acc.invoiced + s.invoiced,
        received: acc.received + s.received,
        costs: acc.costs + s.costs,
        outstanding: acc.outstanding + s.outstanding,
      }
    },
    { contract: 0, invoiced: 0, received: 0, costs: 0, outstanding: 0 }
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/finance/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        contract_value: parseFloat(form.contract_value) || 0,
        start_date: form.start_date || null,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Failed to create project')
    } else {
      setShowModal(false)
      setForm(EMPTY_MODAL)
      load()
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B0C]">Projects</h1>
          <p className="text-sm text-[#8C8C88] mt-0.5">{projects.length} job{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/finance/export"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#ECECE8] bg-white text-sm font-medium text-[#8C8C88] hover:text-[#0B0B0C] hover:border-[#0B0B0C] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" />
            </svg>
            Export CSV
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)', boxShadow: '0 4px 14px rgba(245,158,11,.35)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contract', value: fmt(totals.contract), sub: `${projects.length} projects` },
          { label: 'Total Invoiced', value: fmt(totals.invoiced), sub: 'excl. VAT' },
          { label: 'Received', value: fmt(totals.received), sub: 'incl. VAT paid' },
          { label: 'Outstanding', value: fmt(totals.outstanding), sub: 'awaiting payment', warn: totals.outstanding > 0 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#ECECE8] p-5">
            <p className="text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-bold ${s.warn ? 'text-amber-600' : 'text-[#0B0B0C]'}`}>{s.value}</p>
            <p className="text-xs text-[#8C8C88] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Subcontractor costs card */}
      <div className="bg-white rounded-2xl border border-[#ECECE8] p-5 mb-8 inline-flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,.1)' }}>
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#8C8C88] uppercase tracking-wider">Subcontractor Costs Paid</p>
          <p className="text-xl font-bold text-[#0B0B0C]">{fmt(totals.costs)}</p>
        </div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="text-center py-16 text-[#8C8C88]">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ECECE8] p-12 text-center">
          <p className="text-[#8C8C88] mb-4">No projects yet. Create your first one above or use the AI Assistant.</p>
          <Link href="/finance/chat" className="text-sm font-semibold text-amber-600 hover:underline">
            Try the AI Assistant →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const s = projectStats(p)
            const col = STATUS_COLORS[p.status] || STATUS_COLORS.active
            const pct = p.contract_value > 0 ? Math.min(100, Math.round((s.received / Number(p.contract_value)) * 100)) : 0
            return (
              <Link
                key={p.id}
                href={`/finance/projects/${p.id}`}
                className="block bg-white rounded-2xl border border-[#ECECE8] p-5 hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-base font-semibold text-[#0B0B0C] truncate">{p.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${col.bg} ${col.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-[#8C8C88]">{p.client_name}{p.client_contact ? ` · ${p.client_contact}` : ''}</p>
                    {p.start_date && (
                      <p className="text-xs text-[#8C8C88] mt-0.5">Started {new Date(p.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-8 text-right flex-shrink-0">
                    <div>
                      <p className="text-xs text-[#8C8C88] font-medium">Contract</p>
                      <p className="text-sm font-bold text-[#0B0B0C]">{fmt(Number(p.contract_value))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8C8C88] font-medium">Invoiced</p>
                      <p className="text-sm font-bold text-[#0B0B0C]">{fmt(s.invoiced)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8C8C88] font-medium">Received</p>
                      <p className="text-sm font-bold text-emerald-600">{fmt(s.received)}</p>
                    </div>
                    {s.outstanding > 0 && (
                      <div>
                        <p className="text-xs text-[#8C8C88] font-medium">Outstanding</p>
                        <p className="text-sm font-bold text-amber-600">{fmt(s.outstanding)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[#8C8C88] font-medium">Costs</p>
                      <p className="text-sm font-bold text-red-500">{fmt(s.costs)}</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#8C8C88] mb-1">
                    <span>Collected</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F6F6F3] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#0B0B0C]">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-[#8C8C88] hover:text-[#0B0B0C]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Project Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Smith Kitchen Extension"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Client Name *</label>
                <input
                  required
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Client Contact</label>
                <input
                  value={form.client_contact}
                  onChange={e => setForm(f => ({ ...f, client_contact: e.target.value }))}
                  placeholder="Phone or email"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Contract Value (£) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.contract_value}
                    onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))}
                    placeholder="50000"
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes…"
                  className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-[#ECECE8] text-sm font-medium text-[#8C8C88] hover:bg-[#F6F6F3] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(120deg,#f59e0b,#ef4444)' }}
                >
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
