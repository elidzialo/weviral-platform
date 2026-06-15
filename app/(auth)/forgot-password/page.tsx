'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to send reset email. Please try again.')
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
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
          <p className="text-[14px] text-[#8C8C88] font-medium">Reset your password</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-8 py-9"
          style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.06)' }}
        >
          {sent ? (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(31,211,163,.1)' }}
              >
                <svg className="w-7 h-7" style={{ color: '#1FD3A3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold text-[#0B0B0C] mb-2">Check your email</h2>
              <p className="text-[14px] text-[#8C8C88] leading-relaxed">
                We sent a password reset link to <span className="font-semibold text-[#0B0B0C]">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-[13px] text-[#8C8C88] mt-4">
                Didn&apos;t get it?{' '}
                <button
                  onClick={() => { setSent(false); setError(null) }}
                  className="font-semibold text-[#6E5BFF] hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <p className="text-[14px] text-[#8C8C88] mb-5 leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-red-600 text-[13px]">{error}</p>
                  </div>
                )}

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

                <button
                  type="submit"
                  disabled={loading || !email}
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
                      Sending…
                    </span>
                  ) : (
                    'Send reset link →'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-[#8C8C88]">
          Remember your password?{' '}
          <Link href="/login" className="font-semibold text-[#6E5BFF] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
