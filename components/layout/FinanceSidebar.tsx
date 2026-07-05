'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface FinanceSidebarProps {
  userName: string
  userInitials: string
}

const Icons = {
  grid: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  download: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  back: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
}

const NAV = [
  { label: 'Dashboard', href: '/finance/projects', icon: Icons.grid },
  { label: 'Projects', href: '/finance/projects', icon: Icons.folder },
  { label: 'AI Assistant', href: '/finance/chat', icon: Icons.chat },
]

export const FinanceSidebar: React.FC<FinanceSidebarProps> = ({ userName, userInitials }) => {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      style={{ width: '252px', minWidth: '252px' }}
      className="flex flex-col min-h-screen bg-white border-r border-[#ECECE8] flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#ECECE8]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
            <path d="M7 1L2 4v8h3.5V8.5h3V12H12V4L7 1z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <span className="text-[15px] font-bold tracking-tight text-[#0B0B0C]">
            Construction
          </span>
          <span className="block text-[10px] text-[#8C8C88] font-medium uppercase tracking-wider leading-none">
            Finance
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label + item.href}
              href={item.href}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                active
                  ? 'text-[#f59e0b]'
                  : 'text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C]',
              ].join(' ')}
              style={active ? { background: 'rgba(245,158,11,0.08)' } : {}}
            >
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #f59e0b, #ef4444)' }}
                />
              )}
              <span className={active ? 'text-[#f59e0b]' : 'text-[#8C8C88] group-hover:text-[#0B0B0C] transition-colors'}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Export CSV */}
        <a
          href="/api/finance/export"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C] transition-all"
        >
          <span>{Icons.download}</span>
          <span>Export CSV</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#ECECE8] space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#8C8C88] hover:bg-[#F6F6F3] hover:text-[#0B0B0C] transition-colors"
        >
          {Icons.back}
          <span>Back to WeViral</span>
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0B0B0C] truncate">{userName}</p>
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
  )
}

export default FinanceSidebar
