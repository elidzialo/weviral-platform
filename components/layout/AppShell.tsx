'use client';

import React from 'react';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from './Sidebar';

type Role = 'admin' | 'influencer' | 'marketer';

interface AppShellProps {
  role: Role;
  userName: string;
  userRole: string;
  userInitials: string;
  pendingCount?: number;
  children: React.ReactNode;
}

function ShellInner({
  role,
  userName,
  userRole,
  userInitials,
  pendingCount,
  children,
}: AppShellProps) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex min-h-screen bg-[#F6F6F3]">
      {/* Mobile backdrop */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={close}
        aria-hidden="true"
      />

      <Sidebar
        role={role}
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        pendingCount={pendingCount}
      />

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <ShellInner {...props} />
    </SidebarProvider>
  );
}
