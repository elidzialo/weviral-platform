'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card, CardBody } from '@/components/ui/Card';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tier {
  id: string;
  name: string;
  views_target: number;
  influencer_payout: number;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  creative_url: string | null;
  tiers: Tier | null;
  profiles: { full_name: string | null } | null;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  campaign_id: string;
  campaigns: Campaign | null;
}

type TabStatus = 'all' | 'active' | 'proof_submitted' | 'paid' | 'applied' | 'rejected';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge variant="green">Active</Badge>;
    case 'proof_submitted':
      return <Badge variant="amber">Awaiting Admin Review</Badge>;
    case 'paid':
      return <Badge variant="green">Paid</Badge>;
    case 'applied':
      return <Badge variant="purple">Applied</Badge>;
    case 'rejected':
      return <Badge variant="red">Rejected</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Proof Upload Modal
// ---------------------------------------------------------------------------

interface ProofModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (applicationId: string) => void;
}

const ProofModal: React.FC<ProofModalProps> = ({ application, isOpen, onClose, onSuccess }) => {
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'uploading' | 'verifying' | 'success'>('upload');
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setScreenshotFile(null);
      setVideoFile(null);
      setScreenshotPreview(null);
      setError(null);
      setStep('upload');
    }
  }, [isOpen]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setScreenshotFile(file);
    setError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    } else {
      setScreenshotPreview(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoFile(e.target.files?.[0] ?? null);
    setError(null);
  };

  const uploadFile = async (file: File, applicationId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('application_id', applicationId);

    const res = await fetch('/api/proof/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data.url as string;
  };

  const handleSubmit = async () => {
    if (!screenshotFile) {
      setError('A screenshot of your WhatsApp Status is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      setStep('uploading');

      // Upload screenshot
      const screenshotUrl = await uploadFile(screenshotFile, application.id);

      // Upload video if provided
      let videoUrl: string | undefined;
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, application.id);
      }

      setStep('verifying');

      // Submit for AI verification
      const verifyRes = await fetch('/api/proof/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          application_id: application.id,
          screenshot_url: screenshotUrl,
          video_url: videoUrl ?? null,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Verification failed');

      setStep('success');
      setTimeout(() => {
        onSuccess(application.id);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setStep('upload');
    } finally {
      setSubmitting(false);
    }
  };

  const campaign = application.campaigns;
  const payout = campaign?.tiers?.influencer_payout ?? 0;
  const viewsTarget = campaign?.tiers?.views_target ?? 0;

  const footer = step !== 'success' ? (
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        loading={submitting}
        disabled={!screenshotFile || submitting}
      >
        {step === 'uploading' ? 'Uploading...' : step === 'verifying' ? 'Verifying...' : 'Submit Proof'}
      </Button>
    </>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Proof of Post"
      footer={footer}
    >
      {step === 'success' ? (
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Proof Submitted!</h3>
          <p className="text-sm text-gray-500">
            Your proof is being reviewed by our AI and admin team. You will be notified once approved.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Campaign info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Campaign</p>
            <p className="text-sm font-semibold text-gray-900">{campaign?.title ?? 'Campaign'}</p>
            <div className="flex gap-3 mt-1.5 text-xs text-gray-600">
              {viewsTarget > 0 && <span>Target: {viewsTarget.toLocaleString()} views</span>}
              {payout > 0 && (
                <span className="text-emerald-700 font-medium">Payout: {formatCurrency(payout)}</span>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-violet-800 mb-1">How to submit</p>
            <ol className="text-xs text-violet-700 space-y-1 list-decimal list-inside">
              <li>Post the campaign creative to your WhatsApp Status</li>
              <li>After 24h, take a screenshot of your Status view count</li>
              <li>Upload the screenshot below (video optional but recommended)</li>
            </ol>
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Screenshot <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(JPG, PNG, WebP — max 50 MB)</span>
            </label>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleScreenshotChange}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="w-full h-48 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-full shadow text-gray-500 hover:text-gray-700"
                  aria-label="Remove screenshot"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 text-center hover:border-violet-400 hover:bg-violet-50 transition-colors group"
              >
                <svg className="w-8 h-8 text-gray-400 group-hover:text-violet-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600 group-hover:text-violet-700">Click to upload screenshot</p>
                <p className="text-xs text-gray-400 mt-1">Must show WhatsApp Status with view count</p>
              </button>
            )}
          </div>

          {/* Video upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Video <span className="text-gray-400 font-normal">(optional — MP4, MOV, WebM — max 50 MB)</span>
            </label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoChange}
              className="hidden"
            />
            {videoFile ? (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <span className="text-sm text-gray-700 flex-1 truncate">{videoFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoFile(null);
                    if (videoInputRef.current) videoInputRef.current.value = '';
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Remove video"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-5 text-center hover:border-violet-400 hover:bg-violet-50 transition-colors group"
              >
                <p className="text-sm text-gray-600 group-hover:text-violet-700">Click to upload video (optional)</p>
              </button>
            )}
          </div>

          {/* Uploading/Verifying progress */}
          {(step === 'uploading' || step === 'verifying') && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <svg className="animate-spin w-5 h-5 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-violet-700 font-medium">
                {step === 'uploading' ? 'Uploading your files...' : 'AI is verifying your proof...'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Application Row
// ---------------------------------------------------------------------------

interface ApplicationRowProps {
  application: Application;
  onOpenProofModal: (app: Application) => void;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ application, onOpenProofModal }) => {
  const campaign = application.campaigns;
  const payout = campaign?.tiers?.influencer_payout ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{campaign?.title ?? 'Campaign'}</h3>
            {campaign?.tiers?.name && (
              <Badge variant="purple">{campaign.tiers.name}</Badge>
            )}
          </div>
          {campaign?.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{campaign.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Applied {format(new Date(application.applied_at), 'dd MMM yyyy')}</span>
            {campaign?.deadline && (
              <span>Deadline {format(new Date(campaign.deadline), 'dd MMM yyyy')}</span>
            )}
            {payout > 0 && (
              <span className="text-emerald-700 font-semibold">{formatCurrency(payout)} payout</span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
          <StatusBadge status={application.status} />

          {application.status === 'active' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenProofModal(application)}
            >
              Submit Proof
            </Button>
          )}

          {application.status === 'paid' && (
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {formatCurrency(payout)} paid
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS: { label: string; value: TabStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Proof Submitted', value: 'proof_submitted' },
  { label: 'Paid', value: 'paid' },
  { label: 'Applied', value: 'applied' },
  { label: 'Rejected', value: 'rejected' },
];

export default function MyCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [proofModalApp, setProofModalApp] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/applications', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load campaigns');
      const data: Application[] = await res.json();
      setApplications(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleProofSuccess = useCallback((applicationId: string) => {
    // Optimistically update status to proof_submitted
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: 'proof_submitted' } : app
      )
    );
    setProofModalApp(null);
    // Then refetch to get latest state
    setTimeout(fetchApplications, 500);
  }, [fetchApplications]);

  const filtered = activeTab === 'all'
    ? applications
    : applications.filter((a) => a.status === activeTab);

  // Tab counts
  const counts: Record<TabStatus, number> = {
    all: applications.length,
    active: applications.filter((a) => a.status === 'active').length,
    proof_submitted: applications.filter((a) => a.status === 'proof_submitted').length,
    paid: applications.filter((a) => a.status === 'paid').length,
    applied: applications.filter((a) => a.status === 'applied').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Proof Modal */}
      {proofModalApp && (
        <ProofModal
          application={proofModalApp}
          isOpen={true}
          onClose={() => setProofModalApp(null)}
          onSuccess={handleProofSuccess}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">Track all your campaign applications and submit proof when ready.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 bg-gray-100 p-1 rounded-xl w-fit max-w-full">
        {TABS.map((tab) => {
          const count = counts[tab.value];
          if (tab.value !== 'all' && count === 0) return null;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold',
                    activeTab === tab.value
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-gray-200 text-gray-600',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <div className="text-center py-4">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={fetchApplications} className="mt-2 text-sm text-violet-700 underline">
                Try again
              </button>
            </div>
          </CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-600 font-medium">No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} campaigns</p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'all'
              ? 'Browse available campaigns and apply to get started.'
              : `You have no campaigns with this status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationRow
              key={app.id}
              application={app}
              onOpenProofModal={setProofModalApp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
