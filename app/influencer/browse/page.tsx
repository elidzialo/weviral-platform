'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount);
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}k`;
  return String(views);
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ---------------------------------------------------------------------------
// Campaign Card — Airbnb-inspired
// ---------------------------------------------------------------------------

interface CampaignCardProps {
  campaign: Campaign;
  applicationStatus: string | null;
  onApply: (campaignId: string) => Promise<void>;
  applying: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, applicationStatus, onApply, applying }) => {
  const payout = campaign.tiers?.influencer_payout ?? 0;
  const viewsTarget = campaign.tiers?.views_target ?? 0;
  const tierName = campaign.tiers?.name;
  const marketerName = campaign.profiles?.full_name;
  const applied = applicationStatus !== null;

  const days = campaign.deadline ? daysUntil(campaign.deadline) : null;
  const urgentDeadline = days !== null && days <= 3 && days >= 0;

  const tierColors: Record<string, { bg: string; text: string; border: string }> = {
    Starter: { bg: 'rgba(140,140,136,.1)', text: '#8C8C88', border: 'rgba(140,140,136,.3)' },
    Growth:  { bg: 'rgba(245,158,11,.1)', text: '#B45309', border: 'rgba(245,158,11,.3)' },
    Viral:   { bg: 'rgba(110,91,255,.1)', text: '#6E5BFF', border: 'rgba(110,91,255,.3)' },
    Elite:   { bg: 'rgba(31,211,163,.1)', text: '#0F7A5A', border: 'rgba(31,211,163,.3)' },
  };
  const tc = tierColors[tierName ?? ''] ?? tierColors.Starter;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)' }}
    >
      {/* Color band header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: `linear-gradient(135deg, ${tc.bg} 0%, rgba(246,246,243,.4) 100%)` }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          {tierName && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
              style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}
            >
              {tierName}
            </span>
          )}
          {urgentDeadline && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
              {days === 0 ? 'Last day' : `${days}d left`}
            </span>
          )}
        </div>

        {/* Payout — hero number */}
        <div className="mb-1">
          <p className="text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider mb-0.5">Your payout</p>
          <p className="text-[32px] font-black text-[#0B0B0C] leading-none tracking-tight">
            {formatCurrency(payout)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[#0B0B0C] leading-snug mb-0.5">{campaign.title}</h3>
          {marketerName && <p className="text-[12px] text-[#8C8C88]">by {marketerName}</p>}
        </div>

        {campaign.description && (
          <p className="text-[13px] text-[#8C8C88] leading-relaxed line-clamp-2">{campaign.description}</p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {viewsTarget > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(110,91,255,.06)] text-[#6E5BFF] text-[12px] font-semibold border border-[#6E5BFF]/15">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {formatViews(viewsTarget)} views
            </span>
          )}
          {campaign.deadline && !urgentDeadline && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F6F6F3] text-[#8C8C88] text-[12px] font-medium border border-[#ECECE8]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(parseISO(campaign.deadline), 'dd MMM')}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-3 border-t border-[#ECECE8]">
          {applicationStatus === null ? (
            <Button variant="primary" size="md" className="w-full" loading={applying} onClick={() => onApply(campaign.id)}>
              Apply Now
            </Button>
          ) : (
            <div className="flex items-center justify-center py-1.5">
              {applicationStatus === 'applied' && (
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#6E5BFF]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Applied — Awaiting Approval
                </span>
              )}
              {applicationStatus === 'active' && (
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1FD3A3]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Active — Submit Proof
                </span>
              )}
              {applicationStatus === 'proof_submitted' && <Badge variant="amber">Proof Under Review</Badge>}
              {applicationStatus === 'paid' && <Badge variant="green">Paid ✓</Badge>}
              {applicationStatus === 'rejected' && <Badge variant="red">Rejected</Badge>}
              {!['applied','active','proof_submitted','paid','rejected'].includes(applicationStatus) && (
                <Badge variant="gray">{applicationStatus}</Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#ECECE8] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-28 bg-[#F6F6F3]" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[#ECECE8] rounded-lg w-3/4" />
        <div className="h-3 bg-[#ECECE8] rounded-lg w-1/2" />
        <div className="h-3 bg-[#ECECE8] rounded-lg w-full" />
        <div className="h-10 bg-[#ECECE8] rounded-xl mt-4" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TIER_FILTERS = ['All', 'Starter', 'Growth', 'Viral', 'Elite'] as const;
type TierFilter = typeof TIER_FILTERS[number];

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Highest payout', value: 'payout_desc' },
  { label: 'Most views', value: 'views_desc' },
] as const;
type SortOption = typeof SORT_OPTIONS[number]['value'];

export default function BrowseCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applicationMap, setApplicationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('All');
  const [sort, setSort] = useState<SortOption>('newest');

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [campaignsRes, appsRes] = await Promise.all([
          fetch('/api/campaigns?status=active', { credentials: 'include' }),
          fetch('/api/applications', { credentials: 'include' }),
        ]);
        if (!campaignsRes.ok) throw new Error('Failed to load campaigns');
        if (!appsRes.ok) throw new Error('Failed to load your applications');
        const [data, appsData]: [Campaign[], Application[]] = await Promise.all([
          campaignsRes.json(),
          appsRes.json(),
        ]);
        if (!cancelled) {
          setCampaigns(data);
          const map: Record<string, string> = {};
          for (const app of appsData) map[app.campaign_id] = app.status;
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
        setApplicationMap((prev) => ({ ...prev, [campaignId]: 'applied' }));
        showToast('error', 'You have already applied to this campaign.');
        return;
      }
      if (!res.ok) { showToast('error', data.error ?? 'Failed to apply. Please try again.'); return; }
      setApplicationMap((prev) => ({ ...prev, [campaignId]: 'applied' }));
      showToast('success', 'Application submitted! Head to My Campaigns to track progress.');
      setTimeout(() => router.push('/influencer/campaigns'), 1500);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setApplyingId(null);
    }
  }, [router, showToast]);

  // Filter + sort
  const filtered = campaigns
    .filter((c) => {
      const q = search.toLowerCase().trim();
      if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? '').toLowerCase().includes(q) && !(c.profiles?.full_name ?? '').toLowerCase().includes(q)) return false;
      if (tierFilter !== 'All' && c.tiers?.name !== tierFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'payout_desc') return (b.tiers?.influencer_payout ?? 0) - (a.tiers?.influencer_payout ?? 0);
      if (sort === 'views_desc') return (b.tiers?.views_target ?? 0) - (a.tiers?.views_target ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const unappliedCount = filtered.filter((c) => applicationMap[c.id] === undefined).length;

  return (
    <div className="min-h-screen" style={{ background: '#F6F6F3' }}>
      {/* Toast */}
      {toast && (
        <div className={['fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium border', toast.type === 'success' ? 'bg-[rgba(31,211,163,.1)] text-[#0F7A5A] border-[rgba(31,211,163,.3)]' : 'bg-red-50 text-red-800 border-red-200'].join(' ')}>
          {toast.text}
        </div>
      )}

      {/* Sticky search + filters header */}
      <div
        className="sticky top-0 z-20 px-6 lg:px-8 pt-6 pb-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.92)', backdropFilter: 'blur(16px)' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-[#0B0B0C] tracking-tight">Browse Campaigns</h1>
            {!loading && (
              <p className="text-[13px] text-[#8C8C88] mt-0.5">
                {unappliedCount} campaign{unappliedCount !== 1 ? 's' : ''} available to apply
              </p>
            )}
          </div>
          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none pl-3 pr-8 py-2 border border-[#ECECE8] rounded-xl text-[13px] font-medium text-[#0B0B0C] bg-white focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/25 focus:border-[#6E5BFF] cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8C88] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Search bar — full width, Airbnb style */}
        <div className="relative mb-4">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#8C8C88]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns, brands, descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 border border-[#ECECE8] rounded-2xl text-[14px] text-[#0B0B0C] placeholder-[#C4C4C0] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/25 focus:border-[#6E5BFF] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#8C8C88] hover:text-[#0B0B0C] hover:bg-[#F6F6F3]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Tier filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TIER_FILTERS.map((tier) => {
            const active = tierFilter === tier;
            const tierBgMap: Record<string, string> = { Starter: '#8C8C88', Growth: '#B45309', Viral: '#6E5BFF', Elite: '#1FD3A3' };
            const accent = tier === 'All' ? '#6E5BFF' : (tierBgMap[tier] ?? '#6E5BFF');
            return (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap"
                style={active ? { background: accent, color: '#fff', border: `1.5px solid ${accent}` } : { background: 'white', color: '#8C8C88', border: '1.5px solid #ECECE8' }}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="px-6 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-10 text-center">
            <p className="text-red-700 font-semibold mb-2">{error}</p>
            <button onClick={() => window.location.reload()} className="text-sm text-red-600 underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#ECECE8] rounded-2xl px-6 py-20 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(110,91,255,.08)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#6E5BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[#0B0B0C] font-bold text-[16px] mb-1">No campaigns found</p>
            <p className="text-[#8C8C88] text-sm">
              {search || tierFilter !== 'All' ? 'Try clearing your filters.' : 'Check back soon for new opportunities.'}
            </p>
            {(search || tierFilter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setTierFilter('All'); }}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold border border-[#ECECE8] text-[#6E5BFF] hover:bg-[rgba(110,91,255,.06)] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
        )}
      </div>
    </div>
  );
}
