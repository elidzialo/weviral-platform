'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Role = 'admin' | 'influencer' | 'marketer';

interface NavItem {
  label: string;
  href: string;
  badge?: number;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: Role;
  userName: string;
  userRole: string;
  userInitials: string;
  pendingCount?: number;
}

const Icons = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
    </svg>
  ),
  grid: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  wallet: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18v11H3zM16 13h3M3 8l2.5-3h13L21 8" />
    </svg>
  ),
  coin: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.5h4.5a1.6 1.6 0 010 3.2H9m0-3.2v6.5m0-6.5V8" />
    </svg>
  ),
  gear: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="3.5" />
      <path strokeLinecap="round" d="M12 2v3M12 19v3M4.2 6.2l2 2M17.8 17.8l2 2M2 12h3M19 12h3M4.2 17.8l2-2M17.8 6.2l2-2" />
    </svg>
  ),
  campaign: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

function getNavItems(role: Role, pendingCount?: number): NavItem[] {
  switch (role) {
    case 'admin':
      return [
        { label: 'Overview', href: '/admin', icon: Icons.home },
        {
          label: 'Approvals',
          href: '/admin/approvals',
          icon: Icons.check,
          badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
        },
        { label: 'Campaigns', href: '/admin/campaigns', icon: Icons.campaign },
        { label: 'Users', href: '/admin/influencers', icon: Icons.users },
        { label: 'Financials', href: '/admin/dashboard', icon: Icons.coin },
        { label: 'Settings', href: '/admin/settings', icon: Icons.gear },
      ];
    case 'influencer':
      return [
        { label: 'Home', href: '/influencer', icon: Icons.home },
        { label: 'Browse Ads', href: '/influencer/browse', icon: Icons.search },
        { label: 'My Campaigns', href: '/influencer/campaigns', icon: Icons.campaign },
        { label: 'Wallet', href: '/influencer/earnings', icon: Icons.wallet },
      ];
    case 'marketer':
      return [
        { label: 'Overview', href: '/marketer', icon: Icons.home },
        { label: 'Campaigns', href: '/marketer/campaigns', icon: Icons.campaign },
        { label: 'Create Ad', href: '/marketer/create', icon: Icons.grid },
        { label: 'Billing', href: '/marketer/billing', icon: Icons.wallet },
      ];
  }
}

const roleLabels: Record<Role, string> = {
  admin: 'Super Admin',
  influencer: 'Influencer',
  marketer: 'Marketer',
};

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  userName,
  userRole,
  userInitials,
  pendingCount,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const navItems = getNavItems(role, pendingCount);

  const isActive = (href: string): boolean => {
    if (href === '/admin' || href === '/influencer' || href === '/marketer') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      style={{ width: '252px', minWidth: '252px' }}
      className="flex flex-col min-h-screen bg-white border-r border-[#ECECE8] flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#ECECE8]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6E5BFF, #1FD3A3)' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
            <path
              d="M1 7h2.5l2-5 3 10 2-5H13"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-[#0B0B0C]">
          We<span style={{ color: '#6E5BFF' }}>Viral</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                active
                  ? 'text-[#6E5BFF]'
                  : 'text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C]',
              ].join(' ')}
              style={active ? { background: 'rgba(110,91,255,0.08)' } : {}}
            >
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #6E5BFF, #1FD3A3)' }}
                />
              )}
              <span
                className={
                  active
                    ? 'text-[#6E5BFF]'
                    : 'text-[#8C8C88] group-hover:text-[#0B0B0C] transition-colors'
                }
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-white text-xs font-semibold leading-none"
                  style={{ background: '#6E5BFF' }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#ECECE8]">
        {/* Viewing as */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-xl bg-[#F6F6F3]">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6E5BFF, #1FD3A3)' }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-[#8C8C88] uppercase tracking-wider leading-none mb-1">
              Viewing as
            </p>
            <p className="text-sm font-semibold text-[#0B0B0C] truncate">{roleLabels[role]}</p>
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold select-none"
            style={{ background: 'linear-gradient(135deg, #6E5BFF, #4D7CFF)' }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0B0B0C] truncate">{userName}</p>
            <p className="text-xs text-[#8C8C88] truncate">{userRole}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C] transition-colors"
        >
          {Icons.logout}
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
