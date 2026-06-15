'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Topbar } from '@/components/layout/Topbar'
import { EmailSettingsCard } from '@/components/EmailSettingsCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tier {
  id: string
  name: string
  views_target: number
  influencer_payout: number
  platform_fee: number
  total_charge: number
  active: boolean
  created_at: string
}

interface NewTierForm {
  name: string
  views_target: string
  influencer_payout: string
  platform_fee: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [form, setForm] = useState<NewTierForm>({
    name: '',
    views_target: '',
    influencer_payout: '',
    platform_fee: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<NewTierForm>>({})
  const [isPending, startTransition] = useTransition()
  const [togglePending, setTogglePending] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch tiers
  // ---------------------------------------------------------------------------

  const fetchTiers = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('tiers')
      .select('*')
      .order('views_target', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setTiers(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTiers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const computedTotal =
    parseFloat(form.influencer_payout || '0') + parseFloat(form.platform_fee || '0')

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validateForm(): boolean {
    const errors: Partial<NewTierForm> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.views_target || isNaN(Number(form.views_target)) || Number(form.views_target) <= 0)
      errors.views_target = 'Enter a valid view count'
    if (!form.influencer_payout || isNaN(Number(form.influencer_payout)) || Number(form.influencer_payout) < 0)
      errors.influencer_payout = 'Enter a valid payout amount'
    if (!form.platform_fee || isNaN(Number(form.platform_fee)) || Number(form.platform_fee) < 0)
      errors.platform_fee = 'Enter a valid fee amount'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---------------------------------------------------------------------------
  // Add tier
  // ---------------------------------------------------------------------------

  const handleAddTier = () => {
    if (!validateForm()) return
    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const payout = parseFloat(form.influencer_payout)
      const fee = parseFloat(form.platform_fee)
      const total = parseFloat((payout + fee).toFixed(2))

      const { error: insertError } = await supabase.from('tiers').insert({
        name: form.name.trim(),
        views_target: parseInt(form.views_target, 10),
        influencer_payout: payout,
        platform_fee: fee,
        total_charge: total,
        active: true,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setForm({ name: '', views_target: '', influencer_payout: '', platform_fee: '' })
      setFormErrors({})
      setSuccessMsg(`Tier "${form.name.trim()}" created successfully.`)
      await fetchTiers()
    })
  }

  // ---------------------------------------------------------------------------
  // Toggle active
  // ---------------------------------------------------------------------------

  const handleToggleActive = async (tier: Tier) => {
    setTogglePending(tier.id)
    setError(null)
    setSuccessMsg(null)

    const { error: updateError } = await supabase
      .from('tiers')
      .update({ active: !tier.active })
      .eq('id', tier.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccessMsg(
        `Tier "${tier.name}" ${!tier.active ? 'activated' : 'deactivated'}.`,
      )
      setTiers((prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, active: !t.active } : t)),
      )
    }
    setTogglePending(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen">
      <Topbar title="Settings" />
      <div className="px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-[#0B0B0C]">Platform Settings</h1>
        <p className="mt-1 text-sm text-[#8C8C88]">
          Manage campaign tiers, payouts, platform fees, and notifications.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      <div className="space-y-8">
        {/* Tiers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Tiers</CardTitle>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {tiers.length} tiers
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : tiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <span className="text-4xl mb-3 select-none">📊</span>
                <p className="text-sm font-medium text-gray-700">No tiers defined yet</p>
                <p className="text-xs text-gray-400 mt-1">Add your first tier using the form below.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Views Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Influencer Payout
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Platform Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total Charge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {tiers.map((tier) => (
                      <tr
                        key={tier.id}
                        className={[
                          'hover:bg-gray-50 transition-colors',
                          !tier.active ? 'opacity-50' : '',
                        ].join(' ')}
                      >
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{tier.name}</span>
                            {!tier.active && (
                              <Badge variant="gray">Inactive</Badge>
                            )}
                          </div>
                        </td>

                        {/* Views target */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 font-medium">
                            {tier.views_target.toLocaleString()}
                          </span>
                        </td>

                        {/* Influencer payout */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-emerald-700">
                            {formatCurrency(Number(tier.influencer_payout))}
                          </span>
                        </td>

                        {/* Platform fee */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-violet-700">
                            {formatCurrency(Number(tier.platform_fee))}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(Number(tier.total_charge))}
                          </span>
                        </td>

                        {/* Active toggle */}
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(tier)}
                            disabled={togglePending === tier.id}
                            className={[
                              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                              tier.active ? 'bg-violet-600' : 'bg-gray-200',
                              togglePending === tier.id ? 'opacity-50 cursor-not-allowed' : '',
                            ].join(' ')}
                            role="switch"
                            aria-checked={tier.active}
                            aria-label={`Toggle ${tier.name} tier`}
                          >
                            <span
                              className={[
                                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                tier.active ? 'translate-x-5' : 'translate-x-0',
                              ].join(' ')}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Add New Tier Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Tier</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Input
                label="Tier Name"
                placeholder="e.g. Premium"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                error={formErrors.name}
              />
              <Input
                label="Views Target"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 2000"
                value={form.views_target}
                onChange={(e) => setForm((prev) => ({ ...prev, views_target: e.target.value }))}
                error={formErrors.views_target}
              />
              <Input
                label="Influencer Payout (£)"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 150.00"
                value={form.influencer_payout}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, influencer_payout: e.target.value }))
                }
                error={formErrors.influencer_payout}
              />
              <Input
                label="Platform Fee (£)"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 30.00"
                value={form.platform_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, platform_fee: e.target.value }))}
                error={formErrors.platform_fee}
              />
            </div>

            {/* Computed total preview */}
            {(form.influencer_payout || form.platform_fee) && (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                <span className="text-gray-500">Total charge to marketer:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(isNaN(computedTotal) ? 0 : computedTotal)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleAddTier}
                loading={isPending}
                disabled={isPending}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Tier
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setForm({ name: '', views_target: '', influencer_payout: '', platform_fee: '' })
                  setFormErrors({})
                }}
                disabled={isPending}
              >
                Clear
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Fee structure info */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Structure</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-5 py-4">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
                  Influencer Payout
                </p>
                <p className="text-sm text-emerald-800">
                  Amount paid to the influencer on approval via Stripe Connect transfer.
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-5 py-4">
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-1">
                  Platform Fee
                </p>
                <p className="text-sm text-violet-800">
                  WeViral revenue retained from each completed campaign.
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Total Charge
                </p>
                <p className="text-sm text-gray-700">
                  Total amount charged to the marketer at campaign creation. Auto-calculated.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Email Notifications */}
        <EmailSettingsCard role="admin" />
      </div>
      </div>
    </div>
  )
}
