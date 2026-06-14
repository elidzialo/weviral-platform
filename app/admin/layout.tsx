import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Verify authenticated session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user profile and verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  if (profile.role !== 'admin') {
    // Non-admin: redirect to their own dashboard
    if (profile.role === 'marketer') redirect('/marketer')
    if (profile.role === 'influencer') redirect('/influencer')
    redirect('/login')
  }

  // Fetch pending approvals count for sidebar badge (using admin client to bypass RLS)
  const adminClient = createAdminClient()
  const { count: pendingCount } = await adminClient
    .from('proof_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Build display name and initials for sidebar user footer
  const fullName = profile.full_name?.trim() || profile.email || 'Admin'
  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="admin"
        userName={fullName}
        userRole="Admin"
        userInitials={initials || 'A'}
        pendingCount={pendingCount ?? 0}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
