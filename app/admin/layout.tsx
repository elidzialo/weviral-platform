import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/layout/AppShell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  if (profile.role !== 'admin') {
    if (profile.role === 'marketer') redirect('/marketer')
    if (profile.role === 'influencer') redirect('/influencer')
    redirect('/login')
  }

  const adminClient = createAdminClient()
  const { count: pendingCount } = await adminClient
    .from('proof_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const fullName = profile.full_name?.trim() || profile.email || 'Admin'
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <AppShell
      role="admin"
      userName={fullName}
      userRole="Admin"
      userInitials={initials || 'A'}
      pendingCount={pendingCount ?? 0}
    >
      {children}
    </AppShell>
  )
}
