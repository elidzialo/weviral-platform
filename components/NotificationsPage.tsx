'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';

type FilterTab = 'all' | 'unread' | 'payments' | 'campaigns' | 'system';
type NotifType = 'success' | 'payment' | 'info' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotifType;
  category: 'payment' | 'campaign' | 'system';
  title: string;
  description: string;
  time: string;
  date: string;
  unread: boolean;
}

const ALL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'success',
    category: 'campaign',
    title: 'Proof Approved',
    description: 'Your proof submission for "Nike Summer Vibes" campaign has been approved by the admin.',
    time: '2 minutes ago',
    date: 'Today',
    unread: true,
  },
  {
    id: '2',
    type: 'payment',
    category: 'payment',
    title: 'Payment of £80.00 Received',
    description: 'Stripe has transferred £80.00 to your connected bank account for your verified WhatsApp post.',
    time: '1 hour ago',
    date: 'Today',
    unread: true,
  },
  {
    id: '3',
    type: 'info',
    category: 'campaign',
    title: 'New Campaign Available',
    description: 'A new "Adidas Spring Collection" campaign is now available. 500 views target — £45 payout.',
    time: '3 hours ago',
    date: 'Today',
    unread: false,
  },
  {
    id: '4',
    type: 'warning',
    category: 'campaign',
    title: 'Proof Rejected',
    description: 'Your proof for "Zara Autumn" was rejected. Reason: Screenshot does not clearly show the WeViral watermark.',
    time: '6 hours ago',
    date: 'Today',
    unread: false,
  },
  {
    id: '5',
    type: 'info',
    category: 'campaign',
    title: 'Application Accepted',
    description: 'Congratulations! Your application for "H&M Winter Campaign" has been accepted. Upload your proof within 48 hours.',
    time: 'Yesterday at 4:30 PM',
    date: 'Yesterday',
    unread: false,
  },
  {
    id: '6',
    type: 'payment',
    category: 'payment',
    title: 'Payment of £45.00 Received',
    description: 'Stripe has transferred £45.00 to your connected bank account for the Growth tier campaign.',
    time: 'Yesterday at 2:15 PM',
    date: 'Yesterday',
    unread: false,
  },
  {
    id: '7',
    type: 'success',
    category: 'campaign',
    title: 'Campaign Completed',
    description: '"Spotify Wrapped Promo" campaign has been successfully completed. Final stats: 1,240 views verified.',
    time: '2 days ago',
    date: '13 Jun',
    unread: false,
  },
  {
    id: '8',
    type: 'info',
    category: 'system',
    title: 'Stripe Account Connected',
    description: 'Your Stripe Connect account has been successfully set up. You can now receive payouts directly.',
    time: '3 days ago',
    date: '12 Jun',
    unread: false,
  },
  {
    id: '9',
    type: 'warning',
    category: 'system',
    title: 'Action Required: Stripe Verification',
    description: 'Stripe requires additional identity verification to continue processing payouts. Please update your account.',
    time: '5 days ago',
    date: '10 Jun',
    unread: false,
  },
];

const typeConfig: Record<NotifType, { bg: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: 'rgba(31,211,163,0.12)',
    color: '#0ea875',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  payment: {
    bg: 'rgba(110,91,255,0.12)',
    color: '#6E5BFF',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'rgba(77,124,255,0.12)',
    color: '#4D7CFF',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    color: '#d97706',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    bg: 'rgba(239,68,68,0.1)',
    color: '#dc2626',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Payments' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'system', label: 'System' },
];

export function NotificationsPage() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);

  const filtered = notifications.filter((n) => {
    if (tab === 'all') return true;
    if (tab === 'unread') return n.unread;
    if (tab === 'payments') return n.category === 'payment';
    if (tab === 'campaigns') return n.category === 'campaign';
    if (tab === 'system') return n.category === 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  // Group by date
  const groups: { date: string; items: Notification[] }[] = [];
  for (const n of filtered) {
    const existing = groups.find((g) => g.date === n.date);
    if (existing) {
      existing.items.push(n);
    } else {
      groups.push({ date: n.date, items: [n] });
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Notifications" />

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0B0B0C]">Notifications</h1>
            <p className="mt-1 text-sm text-[#8C8C88]">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#6E5BFF', background: 'rgba(110,91,255,0.08)' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {TABS.map((t) => {
            const count =
              t.key === 'unread'
                ? notifications.filter((n) => n.unread).length
                : t.key === 'all'
                ? notifications.length
                : notifications.filter((n) => n.category === t.key.replace('payments', 'payment').replace('campaigns', 'campaign') || (t.key === 'campaigns' && n.category === 'campaign')).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'text-[#6E5BFF]'
                    : 'text-[#8C8C88] hover:text-[#0B0B0C] hover:bg-[#F6F6F3]',
                ].join(' ')}
                style={tab === t.key ? { background: 'rgba(110,91,255,0.08)' } : {}}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={[
                      'inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-[10px] font-bold',
                      tab === t.key ? 'text-white' : 'text-[#8C8C88] bg-[#ECECE8]',
                    ].join(' ')}
                    style={tab === t.key ? { background: '#6E5BFF' } : {}}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification groups */}
        {groups.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <div
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(110,91,255,0.08)' }}
              >
                <svg className="w-7 h-7" style={{ color: '#6E5BFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#0B0B0C]">No notifications</p>
              <p className="text-xs text-[#8C8C88] mt-1">Nothing here yet for this filter.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-semibold text-[#8C8C88] uppercase tracking-wider mb-3">
                  {group.date}
                </p>
                <Card>
                  <CardBody className="p-0">
                    <div className="divide-y divide-[#ECECE8]">
                      {group.items.map((n) => {
                        const cfg = typeConfig[n.type];
                        return (
                          <div
                            key={n.id}
                            className={[
                              'flex items-start gap-4 px-4 py-4 transition-colors cursor-pointer group',
                              n.unread
                                ? 'bg-[rgba(110,91,255,0.03)] hover:bg-[rgba(110,91,255,0.05)]'
                                : 'hover:bg-[#F6F6F3]',
                            ].join(' ')}
                            onClick={() => markRead(n.id)}
                          >
                            <div
                              className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <p
                                  className={[
                                    'text-sm',
                                    n.unread ? 'font-semibold text-[#0B0B0C]' : 'font-medium text-[#0B0B0C]',
                                  ].join(' ')}
                                >
                                  {n.title}
                                </p>
                                <span className="text-xs text-[#8C8C88] whitespace-nowrap flex-shrink-0 mt-0.5">
                                  {n.time}
                                </span>
                              </div>
                              <p className="text-sm text-[#8C8C88] mt-0.5 leading-relaxed">{n.description}</p>
                            </div>
                            {n.unread && (
                              <div className="mt-1.5 flex-shrink-0">
                                <span
                                  className="block w-2 h-2 rounded-full"
                                  style={{ background: '#6E5BFF' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
