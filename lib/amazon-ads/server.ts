import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Connection } from './runner'

// Resolves the signed-in marketer for Amazon Ads routes, or an error response.
export async function requireMarketer(): Promise<{ userId: string } | { response: NextResponse }> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'marketer') {
    return { response: NextResponse.json({ error: 'Forbidden: marketer role required' }, { status: 403 }) }
  }
  return { userId: user.id }
}

export async function loadConnection(admin: SupabaseClient, marketerId: string): Promise<Connection | null> {
  const { data } = await admin
    .from('amazon_ads_connections')
    .select('*')
    .eq('marketer_id', marketerId)
    .maybeSingle()
  return (data as Connection | null) ?? null
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal server error'
}
