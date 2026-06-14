'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tier {
  id: string;
  name: string;
  views_target: number;
  influencer_payout: number;
  platform_fee: number;
  total_charge: number;
}

interface MarketerProfile {
  id: string;
  full_name: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  created_at: string;
  tiers: Tier | null;
  profiles: MarketerProfile | null;
}

interface Application {
  id: string;
  campaign_id: string;
  status: string;
}

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

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}k`;
  return String(views);
}

// ---------------------------------------------------------------------------
// Campaign Card
// ---------------------------------------------------------------------------

interface CampaignCardProps {
  campaign: Campaign;
  applicationStatus: string | null;
  onApply: (campaignId: string) => Promise<void>;
  applying: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  applicationStatus,
  onApply,
  applying,
}) => {
  const payout = campaign.tiers?.influencer_payout ?? 0;
  const viewsTarget = campaign.tiers?.views_target ?? 0;
  const tierName = campaign.tiers?.name;
  const marketerName = campaign.profiles?.full_name;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardBody className="flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{campaign.title}</h3>
            {marketerName && (
              <p className="text-xs text-gray-500 mt-0.5">by {marketerName}</p>
            )}
          </div>
          {tierName && (
            <Badge variant="purple" className="flex-shrink-0">{tierName}</Badge>
          )}
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {campaign.description}
          </p>
        )}

        {/* Metrics row */}
        <div className="flex flex-wrap gap-3 mt-auto">
          {/* Payout — highlighted green */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Your Payout</p>
              <p className="text-sm font-bold text-emerald-800">{formatCurrency(payout)}</p>
            </div>
          </div>

          {viewsTarget > 0 && (
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <p className="text-xs text-violet-700 font-medium">Views Target</p>
                <p className="text-sm font-bold text-violet-800">{formatViews(viewsTarget)}</p>
              </div>
            </div>
          )}

          {campaign.deadline && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-600 font-medium">Deadline</p>
                <p className="text-sm font-bold text-gray-700">
                  {format(parseISO(campaign.deadline), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="pt-2 border-t border-gray-100">
          {applicationStatus === null ? (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              loading={applying}
              onClick={() => onApply(campaign.id)}
            >
              Apply Now
            </Button>
          ) : (
            <div className="flex items-center justify-center py-2">
              {applicationStatus === 'applied' && <Badge variant="purple">Applied — Awaiting Approval</Badge>}
              {applicationStatus === 'active' && <Badge variant="green">Active — Submit Proof</Badge>}
              {applicationStatus === 'proof_submitted' && <Badge variant="amber">Proof Under Review</Badge>}
              {applicationStatus === 'paid' && <Badge variant="green">Paid</Badge>}
              {applicationStatus === 'rejected' && <Badge variant="red">Rejected</Badge>}
              {!['applied','active','proof_submitted','paid','rejected'].includes(applicationStatus) && (
                <Badge variant="gray">{applicationStatus}</Badge>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BrowseCampaignsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applicationMap, setApplicationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch campaigns + own applications
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Fetch active campaigns
        const res = await fetch('/api/campaigns?status=active', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load campaigns');
        const data: Campaign[] = await res.json();

        // Fetch own applications
        const appsRes = await fetch('/api/applications', { credentials: 'include' });
        if (!appsRes.ok) throw new Error('Failed to load your applications');
        const appsData: Application[] = await appsRes.json();

        const map: Record<string, string> = {};
        for (const app of appsData) {
          map[app.campaign_id] = app.status;
        }

        if (!cancelled) {
          setCampaigns(data);
          setApplicationMap(map);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleApply = useCallback(async (campaignId: string) => {
    setApplyingId(campaignId);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Already applied — update local state
        setApplicationMap((prev) => ({ ...prev, [campaignId]: data.existing_application_id ? 'applied' : 'applied' }));
        showToast('error', 'You have already applied to this campaign.');
        return;
      }

      if (!res.ok) {
        showToast('error', data.error ?? 'Failed to apply. Please try again.');
        return;
      }

      setApplicationMap((prev) => ({ ...prev, [campaignId]: 'applied' }));
      showToast('success', 'Application submitted! Head to My Campaigns to track progress.');

      // Redirect to campaigns after brief delay
      setTimeout(() => router.push('/influencer/campaigns'), 1500);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setApplyingId(null);
    }
  }, [router, showToast]);

  // Filter by search
  const filtered = campaigns.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      (c.profiles?.full_name ?? '').toLowerCase().includes(q) ||
      (c.tiers?.name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div
          className={[
            'fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium border',
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200',
          ].join(' ')}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find campaigns that match your audience and earn by posting to your WhatsApp Status.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-8 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-gray-600 font-medium">No campaigns found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Try adjusting your search.' : 'Check back soon for new opportunities.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} {filtered.length === 1 ? 'campaign' : 'campaigns'} available
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                applicationStatus={applicationMap[campaign.id] ?? null}
                onApply={handleApply}
                applying={applyingId === campaign.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
