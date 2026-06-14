'use client';

import React from 'react';

interface TopbarProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  children,
  className = '',
}) => (
  <header
    className={[
      'sticky top-0 z-30 flex items-center justify-between',
      'bg-white border-b border-gray-200',
      'px-6 py-4 h-16',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
    {children && (
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">{children}</div>
    )}
  </header>
);

export default Topbar;
