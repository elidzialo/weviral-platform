'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
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
          <p className="text-[14px] text-[#8C8C88] font-medium">Set a new password</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-8 py-9"
          style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.06)' }}
        >
          {done ? (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(31,211,163,.1)' }}
              >
                <svg className="w-7 h-7" style={{ color: '#1FD3A3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold text-[#0B0B0C] mb-2">Password updated!</h2>
              <p className="text-[14px] text-[#8C8C88]">Redirecting you to sign in…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-2 border-[#ECECE8] border-t-[#6E5BFF] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[14px] text-[#8C8C88]">Verifying your reset link…</p>
              <p className="text-[12px] text-[#C4C4C0] mt-2">
                If this takes too long,{' '}
                <Link href="/forgot-password" className="text-[#6E5BFF] hover:underline">
                  request a new link
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-[13px]">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
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
                    Updating…
                  </span>
                ) : (
                  'Update password →'
                )}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <p className="mt-6 text-center text-[13px] text-[#8C8C88]">
            Back to{' '}
            <Link href="/login" className="font-semibold text-[#6E5BFF] hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
