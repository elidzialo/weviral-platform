import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function InfluencerLayout({
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
    .select('id, full_name, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  if (profile.role !== 'influencer') {
    // Redirect to appropriate portal based on role
    if (profile.role === 'admin') redirect('/admin');
    if (profile.role === 'marketer') redirect('/marketer');
    redirect('/login');
  }

  const fullName: string = profile.full_name ?? user.email ?? 'Influencer';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="influencer"
        userName={fullName}
        userRole="Influencer"
        userInitials={initials}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
