import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export const dynamic = 'force-dynamic'

export default async function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  if (profile.role !== 'marketer') {
    const portalMap: Record<string, string> = {
      admin: '/admin',
      influencer: '/influencer',
    };
    redirect(portalMap[profile.role] ?? '/login');
  }

  const displayName = profile.full_name?.trim() || profile.email || 'Marketer';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="marketer"
        userName={displayName}
        userRole="Marketer"
        userInitials={initials || 'M'}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
