import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FinanceSidebar } from '@/components/layout/FinanceSidebar'

export const dynamic = 'force-dynamic'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name?.trim() || profile?.email || 'User'
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex min-h-screen bg-[#F6F6F3]">
      <FinanceSidebar userName={fullName} userInitials={initials || 'U'} />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  )
}
