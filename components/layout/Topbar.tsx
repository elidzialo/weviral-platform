'use client';

import React from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationBell } from '@/components/ui/NotificationBell';

interface TopbarProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, children, className = '' }) => {
  const { toggle } = useSidebar();

  return (
    <header
      className={[
        'sticky top-0 z-30 flex items-center justify-between',
        'border-b border-[#ECECE8]',
        'px-4 md:px-6 py-0 h-16',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: 'rgba(246,246,243,0.92)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={toggle}
          className="flex-shrink-0 md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#8C8C88] hover:bg-white hover:text-[#0B0B0C] transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* WeViral logo — mobile only (sidebar is hidden) */}
        <div className="md:hidden flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6E5BFF, #1FD3A3)' }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 14 14">
              <path d="M1 7h2.5l2-5 3 10 2-5H13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[13px] font-bold tracking-tight text-[#0B0B0C]">
            We<span style={{ color: '#6E5BFF' }}>Viral</span>
          </span>
        </div>

        {/* Page title — desktop only */}
        <h1 className="hidden md:block text-[15px] font-semibold text-[#0B0B0C] truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
        <NotificationBell />
        {children && (
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-[#ECECE8]">
            {children}
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
