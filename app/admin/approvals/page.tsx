'use client'

import React, { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProofSubmission {
  id: string
  submitted_at: string
  screenshot_url: string
  video_url: string | null
  ai_view_count: number
  ai_confidence: number
  ai_is_whatsapp: boolean
  ai_has_creative: boolean
  ai_raw_response: Record<string, unknown> | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  application_id: string
  campaign_title: string
  campaign_marketer: string
  tier_name: string
  tier_views_target: number
  influencer_name: string
  influencer_handle: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 0.5) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) return 'High confidence'
  if (score >= 0.5) return 'Medium confidence'
  return 'Low confidence'
}

// ---------------------------------------------------------------------------
// WhatsApp Phone Frame Mock
// ---------------------------------------------------------------------------

function WhatsAppStatusFrame({
  screenshotUrl,
  viewCount,
}: {
  screenshotUrl: string
  viewCount: number
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div className="relative w-40 rounded-3xl border-4 border-gray-800 bg-gray-800 shadow-xl overflow-hidden">
        {/* Status bar mock */}
        <div className="bg-black px-3 py-1 flex justify-between items-center">
          <span className="text-white text-[9px] font-medium">9:41</span>
          <span className="text-white text-[9px]">●●●</span>
        </div>

        {/* Screen */}
        <div className="relative bg-black aspect-[9/16]">
          {screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={screenshotUrl}
              alt="WhatsApp Status screenshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <span className="text-gray-500 text-xs text-center px-2">No screenshot</span>
            </div>
          )}

          {/* View count overlay at the bottom (mirrors WhatsApp UI) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-white text-[10px] font-semibold">{viewCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="bg-black py-1.5 flex justify-center">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {viewCount.toLocaleString()} views detected
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Proof Review Card (client component with approve/reject actions)
// ---------------------------------------------------------------------------

function ProofReviewCard({
  submission,
  onAction,
}: {
  submission: ProofSubmission
  onAction: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actionError, setActionError] = useState('')

  const confidencePct = Math.round(submission.ai_confidence * 100)
  const viewProgress = Math.min(
    100,
    Math.round((submission.ai_view_count / submission.tier_views_target) * 100),
  )

  const handleApprove = () => {
    setActionError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proof_submission_id: submission.id }),
        })
        if (!res.ok) {
          const data = await res.json()
          setActionError(data.error ?? 'Approval failed.')
          return
        }
        onAction()
      } catch {
        setActionError('Network error. Please try again.')
      }
    })
  }

  const handleRejectSubmit = () => {
    if (!rejectNote.trim()) {
      setRejectError('Please provide a rejection reason.')
      return
    }
    setRejectError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof_submission_id: submission.id,
            admin_note: rejectNote.trim(),
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setRejectError(data.error ?? 'Rejection failed.')
          return
        }
        setRejectModalOpen(false)
        setRejectNote('')
        onAction()
      } catch {
        setRejectError('Network error. Please try again.')
      }
    })
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {submission.campaign_title}
              </h3>
              <Badge variant="purple">{submission.tier_name}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              by{' '}
              <span className="font-medium text-gray-700">{submission.campaign_marketer}</span>
            </p>
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400">
            {formatDate(submission.submitted_at)}
          </span>
        </div>

        {/* Card Body */}
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
          {/* Left: Phone frame */}
          <WhatsAppStatusFrame
            screenshotUrl={submission.screenshot_url}
            viewCount={submission.ai_view_count}
          />

          {/* Right: Details */}
          <div className="space-y-5">
            {/* Influencer */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Influencer</p>
              <p className="text-sm font-semibold text-gray-900">{submission.influencer_name}</p>
              {submission.influencer_handle && (
                <p className="text-xs text-gray-400">@{submission.influencer_handle}</p>
              )}
            </div>

            {/* View count progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Views</p>
                <span className="text-xs text-gray-500">
                  {submission.ai_view_count.toLocaleString()} /{' '}
                  {submission.tier_views_target.toLocaleString()} target
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={[
                    'h-2 rounded-full transition-all',
                    viewProgress >= 100 ? 'bg-emerald-500' : viewProgress >= 50 ? 'bg-amber-400' : 'bg-red-400',
                  ].join(' ')}
                  style={{ width: `${viewProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{viewProgress}% of target</p>
            </div>

            {/* AI Confidence Score */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                AI Confidence Score
              </p>
              <span
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold',
                  confidenceColor(submission.ai_confidence),
                ].join(' ')}
              >
                <span>{confidencePct}%</span>
                <span className="font-normal text-xs">— {confidenceLabel(submission.ai_confidence)}</span>
              </span>
            </div>

            {/* AI Checks */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                AI Verification Checks
              </p>
              <ul className="space-y-1.5">
                <AiCheck
                  label="WhatsApp Status confirmed"
                  passed={submission.ai_is_whatsapp}
                />
                <AiCheck
                  label="Campaign creative present"
                  passed={submission.ai_has_creative}
                />
                <AiCheck
                  label="View count extracted"
                  passed={submission.ai_view_count > 0}
                />
                <AiCheck
                  label="Meets tier target"
                  passed={submission.ai_view_count >= submission.tier_views_target}
                />
              </ul>
            </div>

            {/* Error */}
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {actionError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="green"
                onClick={handleApprove}
                loading={isPending}
                disabled={isPending}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Approve & Pay
              </Button>
              <Button
                variant="red"
                onClick={() => {
                  setRejectNote('')
                  setRejectError('')
                  setRejectModalOpen(true)
                }}
                disabled={isPending}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Submission"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setRejectModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="red"
              onClick={handleRejectSubmit}
              loading={isPending}
              disabled={isPending}
            >
              Reject Submission
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejection. The influencer will be notified.
          </p>
          <Textarea
            label="Rejection reason"
            placeholder="e.g. View count does not meet the tier target of 1,000 views. Screenshot appears edited."
            value={rejectNote}
            onChange={(e) => {
              setRejectNote(e.target.value)
              if (rejectError) setRejectError('')
            }}
            error={rejectError}
          />
        </div>
      </Modal>
    </>
  )
}

function AiCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {passed ? (
        <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={passed ? 'text-gray-700' : 'text-gray-400 line-through'}>{label}</span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main page — client component that fetches data via server action
// ---------------------------------------------------------------------------

// We expose this as a client-side page that receives pre-fetched data via
// a server-fetcher wrapper component below.

function ApprovalsClient({ initialSubmissions }: { initialSubmissions: ProofSubmission[] }) {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<ProofSubmission[]>(initialSubmissions)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/approvals-list', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions ?? [])
      } else {
        // fallback: just router.refresh to re-run server component
        router.refresh()
      }
    } catch {
      router.refresh()
    } finally {
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm">Refreshing…</p>
        </div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">All caught up!</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          There are no pending proof submissions to review right now. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submissions.map((submission) => (
        <ProofReviewCard
          key={submission.id}
          submission={submission}
          onAction={refresh}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Server-side data fetching wrapper — Next.js 13+ pattern
// We inline the server data fetch in a separate async component and pass data
// as props to the client component. Because this file is 'use client' we use
// the pattern of a thin server wrapper in a sibling file to supply the data.
//
// Since we are told this file should contain both the client ProofReviewCard
// AND must be a page that can be Server component for data fetching, we
// export a default that is the combined page. We fetch data using a
// client-side effect on first mount from the API route.
// ---------------------------------------------------------------------------

export default function AdminApprovalsPage() {
  return <ApprovalsPageLoader />
}

function ApprovalsPageLoader() {
  // This component uses a data-loading pattern compatible with 'use client':
  // We rely on a Suspense-compatible approach via useEffect initial fetch.
  return <ApprovalsPageContent />
}

function ApprovalsPageContent() {
  const [submissions, setSubmissions] = useState<ProofSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch('/api/admin/approvals-list', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setSubmissions(data.submissions ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load approvals. Please refresh.')
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Proof Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review AI-verified WhatsApp Status proof submissions and approve or reject payouts.
        </p>
      </div>

      {submissions === null && !error && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm">Loading submissions…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {submissions !== null && (
        <ApprovalsClient initialSubmissions={submissions} />
      )}
    </div>
  )
}
