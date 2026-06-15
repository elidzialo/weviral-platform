'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'payment';
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Proof Approved',
    description: 'Your proof for "Nike Summer Campaign" was approved.',
    time: '2m ago',
    unread: true,
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Sent',
    description: 'You received £80.00 for your verified WhatsApp post.',
    time: '1h ago',
    unread: true,
  },
  {
    id: '3',
    type: 'info',
    title: 'New Application',
    description: 'Sarah K. applied to your "Adidas Spring" campaign.',
    time: '3h ago',
    unread: false,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Proof Needs Review',
    description: '2 proofs are awaiting your approval.',
    time: '5h ago',
    unread: false,
  },
];

const typeConfig = {
  success: {
    bg: 'rgba(31,211,163,0.12)',
    color: '#0ea875',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  payment: {
    bg: 'rgba(110,91,255,0.12)',
    color: '#6E5BFF',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'rgba(77,124,255,0.12)',
    color: '#4D7CFF',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    color: '#d97706',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

function getNotificationsHref(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin/notifications';
  if (pathname.startsWith('/influencer')) return '/influencer/notifications';
  if (pathname.startsWith('/marketer')) return '/marketer/notifications';
  return '/notifications';
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const unreadCount = notifications.filter((n) => n.unread).length;
  const notificationsHref = getNotificationsHref(pathname);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C] transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-white text-[10px] font-bold leading-none flex items-center justify-center"
            style={{ background: '#6E5BFF' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#ECECE8] overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', zIndex: 60 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ECECE8]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0B0B0C]">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ background: '#6E5BFF' }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium transition-colors"
                style={{ color: '#6E5BFF' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-[#ECECE8] max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-[#F6F6F3] flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#8C8C88]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#0B0B0C]">All caught up</p>
                <p className="text-xs text-[#8C8C88] mt-0.5">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = typeConfig[n.type];
                return (
                  <div
                    key={n.id}
                    className={[
                      'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
                      n.unread ? 'bg-[#FAFAF9]' : 'bg-white hover:bg-[#F6F6F3]',
                    ].join(' ')}
                    onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, unread: false } : x))}
                  >
                    <div
                      className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={['text-sm truncate', n.unread ? 'font-semibold text-[#0B0B0C]' : 'font-medium text-[#0B0B0C]'].join(' ')}>
                          {n.title}
                        </p>
                        <span className="text-[11px] text-[#8C8C88] whitespace-nowrap flex-shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-[#8C8C88] mt-0.5 line-clamp-2">{n.description}</p>
                    </div>
                    {n.unread && (
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#6E5BFF' }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#ECECE8] bg-[#FAFAF9]">
            <Link
              href={notificationsHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#6E5BFF' }}
            >
              View all notifications
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
