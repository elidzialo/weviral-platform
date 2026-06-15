'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';

interface EmailPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'activity' | 'payments' | 'marketing';
}

const DEFAULT_PREFS_ADMIN: EmailPref[] = [
  { id: 'proof_submitted', label: 'New Proof Submitted', description: 'Email when an influencer uploads a proof for review.', enabled: true, category: 'activity' },
  { id: 'campaign_created', label: 'Campaign Created', description: 'Email when a marketer creates a new campaign.', enabled: true, category: 'activity' },
  { id: 'user_signup', label: 'New User Signup', description: 'Email when a new influencer or marketer registers.', enabled: false, category: 'activity' },
  { id: 'payout_sent', label: 'Payout Initiated', description: 'Email when a Stripe transfer is sent to an influencer.', enabled: true, category: 'payments' },
  { id: 'payment_received', label: 'Payment Received', description: 'Email when a marketer completes a campaign payment.', enabled: true, category: 'payments' },
  { id: 'weekly_digest', label: 'Weekly Platform Summary', description: 'Weekly digest of key platform metrics and activity.', enabled: true, category: 'marketing' },
];

const DEFAULT_PREFS_INFLUENCER: EmailPref[] = [
  { id: 'proof_approved', label: 'Proof Approved', description: 'Email when your proof submission is approved.', enabled: true, category: 'activity' },
  { id: 'proof_rejected', label: 'Proof Rejected', description: 'Email when your proof needs to be resubmitted.', enabled: true, category: 'activity' },
  { id: 'application_accepted', label: 'Application Accepted', description: 'Email when your campaign application is accepted.', enabled: true, category: 'activity' },
  { id: 'new_campaign', label: 'New Campaigns Available', description: 'Email when new campaigns matching your profile are posted.', enabled: false, category: 'activity' },
  { id: 'payout_received', label: 'Payout Received', description: 'Email when a payment is transferred to your bank account.', enabled: true, category: 'payments' },
  { id: 'weekly_earnings', label: 'Weekly Earnings Summary', description: 'A weekly summary of your earnings and campaign activity.', enabled: false, category: 'marketing' },
];

const DEFAULT_PREFS_MARKETER: EmailPref[] = [
  { id: 'proof_submitted', label: 'Proof Submitted', description: 'Email when an influencer uploads proof for your campaign.', enabled: true, category: 'activity' },
  { id: 'proof_approved', label: 'Proof Approved', description: 'Email when admin approves a proof for your campaign.', enabled: true, category: 'activity' },
  { id: 'campaign_completed', label: 'Campaign Completed', description: 'Email when all slots in your campaign are filled and approved.', enabled: true, category: 'activity' },
  { id: 'payment_receipt', label: 'Payment Receipts', description: 'Email receipts for all campaign payments.', enabled: true, category: 'payments' },
  { id: 'billing_summary', label: 'Monthly Billing Summary', description: 'Monthly summary of your spend and campaign ROI.', enabled: false, category: 'payments' },
  { id: 'tips_offers', label: 'Platform Tips & Offers', description: 'Occasional tips for improving campaign performance.', enabled: false, category: 'marketing' },
];

interface EmailSettingsCardProps {
  role: 'admin' | 'influencer' | 'marketer';
}

const categoryLabels: Record<string, string> = {
  activity: 'Activity',
  payments: 'Payments',
  marketing: 'Marketing',
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2',
        enabled ? '' : 'bg-[#ECECE8]',
      ].join(' ')}
      style={enabled ? { background: '#6E5BFF' } : {}}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

export function EmailSettingsCard({ role }: EmailSettingsCardProps) {
  const defaultPrefs =
    role === 'admin'
      ? DEFAULT_PREFS_ADMIN
      : role === 'influencer'
      ? DEFAULT_PREFS_INFLUENCER
      : DEFAULT_PREFS_MARKETER;

  const [prefs, setPrefs] = useState<EmailPref[]>(defaultPrefs);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const categories = ['activity', 'payments', 'marketing'] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(110,91,255,0.1)' }}
          >
            <svg className="w-4 h-4" style={{ color: '#6E5BFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <CardTitle>Email Notifications</CardTitle>
            <p className="text-xs text-[#8C8C88] mt-0.5">Choose which emails you receive from WeViral.</p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-6">
        {categories.map((cat) => {
          const items = prefs.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-3">
                {categoryLabels[cat]}
              </p>
              <div className="space-y-3">
                {items.map((pref) => (
                  <div key={pref.id} className="flex items-start justify-between gap-4 py-3 border-b border-[#ECECE8] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0B0B0C]">{pref.label}</p>
                      <p className="text-xs text-[#8C8C88] mt-0.5">{pref.description}</p>
                    </div>
                    <Toggle enabled={pref.enabled} onChange={() => toggle(pref.id)} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Save */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6E5BFF, #4D7CFF)' }}
          >
            Save preferences
          </button>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-[#0ea875]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
