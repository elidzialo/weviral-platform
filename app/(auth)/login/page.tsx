'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) { setError(authError.message); setLoading(false); return }
      if (!authData.user) { setError('Login failed. Please try again.'); setLoading(false); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) { setError('Could not load your profile. Please contact support.'); setLoading(false); return }

      switch (profile.role) {
        case 'admin':      router.push('/admin'); break
        case 'influencer': router.push('/influencer'); break
        case 'marketer':   router.push('/marketer'); break
        default: setError('Unknown account role. Please contact support.'); setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#ECECE8] rounded-xl text-[#0B0B0C] placeholder-[#C4C4C0] bg-white text-[15px] transition focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/30 focus:border-[#6E5BFF]'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: '#F6F6F3' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-[#6E5BFF]/40" />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{ background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)', boxShadow: '0 0 10px rgba(110,91,255,.5)' }}
              />
            </div>
            <span className="text-[22px] font-black tracking-[-0.8px] text-[#0B0B0C]">WViral</span>
          </Link>
          <p className="text-[14px] text-[#8C8C88] font-medium">Welcome back</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-8 py-9"
          style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.06)' }}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-[13px]">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold text-[#0B0B0C]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[12px] font-medium text-[#6E5BFF] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-[15px] transition mt-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)',
                boxShadow: '0 6px 22px rgba(98,92,255,.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in →'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-[#8C8C88]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#6E5BFF] hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#C4C4C0]">
          Having trouble?{' '}
          <span className="text-[#8C8C88] cursor-pointer hover:underline">Contact support</span>
        </p>
      </div>
    </div>
  )
}
