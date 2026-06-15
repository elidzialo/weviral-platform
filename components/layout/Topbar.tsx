'use client';

import React from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, children, className = '' }) => (
  <header
    className={['sticky top-0 z-30 flex items-center justify-between px-8 py-4 border-b border-[#ECECE8]', className].filter(Boolean).join(' ')}
    style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
  >
    <div>
      <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">{title}</h1>
      {subtitle && <p className="text-[13px] text-[#8C8C88]">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-3 flex-shrink-0 ml-4">{children}</div>}
  </header>
);

export default Topbar;
