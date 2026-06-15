'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Role = 'influencer' | 'marketer'

const COUNTRIES = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IL', label: 'Israel' },
  { value: 'BE', label: 'Belgium' },
  { value: 'US', label: 'United States' },
]

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('influencer')
  const [country, setCountry] = useState('GB')
  const [whatsappHandle, setWhatsappHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (role === 'influencer' && !whatsappHandle.trim()) { setError('Please enter your WhatsApp number.'); return }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })

      if (authError) { setError(authError.message); setLoading(false); return }
      if (!authData.user) { setError('Sign up failed. Please try again.'); setLoading(false); return }

      const profilePayload: Record<string, unknown> = {
        id: authData.user.id,
        full_name: fullName,
        email,
        role,
        country,
      }
      if (role === 'influencer') profilePayload.whatsapp_handle = whatsappHandle.trim()

      const { error: profileError } = await supabase.from('profiles').insert(profilePayload)

      if (profileError) { setError('Account created but profile setup failed: ' + profileError.message); setLoading(false); return }

      router.push(role === 'influencer' ? '/influencer' : '/marketer')
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
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="relative w-8 h-8">
              <div
                className="absolute inset-0 rounded-full border border-[#6E5BFF]/40"
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{ background: 'linear-gradient(120deg,#6E5BFF,#1FD3A3)', boxShadow: '0 0 10px rgba(110,91,255,.5)' }}
              />
            </div>
            <span className="text-[22px] font-black tracking-[-0.8px] text-[#0B0B0C]">WViral</span>
          </Link>
          <p className="text-[14px] text-[#8C8C88] font-medium">Create your account</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-8 py-9"
          style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.06)' }}
        >
          {/* Role picker */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            <button
              type="button"
              onClick={() => setRole('influencer')}
              className="relative flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-2 transition focus:outline-none text-left"
              style={{
                borderColor: role === 'influencer' ? '#6E5BFF' : '#ECECE8',
                background: role === 'influencer' ? 'rgba(110,91,255,.06)' : '#fff',
              }}
            >
              <span className="text-[22px]">📱</span>
              <span className="text-[14px] font-bold text-[#0B0B0C]">Poster</span>
              <span className="text-[12px] text-[#8C8C88] text-center leading-tight">
                Post ads on your Status and earn
              </span>
              {role === 'influencer' && (
                <span
                  className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#6E5BFF' }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setRole('marketer')}
              className="relative flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-2 transition focus:outline-none"
              style={{
                borderColor: role === 'marketer' ? '#1FD3A3' : '#ECECE8',
                background: role === 'marketer' ? 'rgba(31,211,163,.06)' : '#fff',
              }}
            >
              <span className="text-[22px]">📣</span>
              <span className="text-[14px] font-bold text-[#0B0B0C]">Advertiser</span>
              <span className="text-[12px] text-[#8C8C88] text-center leading-tight">
                Run campaigns &amp; reach thousands
              </span>
              {role === 'marketer' && (
                <span
                  className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#1FD3A3' }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-[13px]">{error}</p>
              </div>
            )}

            {/* Full name */}
            <div>
              <label htmlFor="fullName" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>

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
              <label htmlFor="password" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={inputClass}
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* WhatsApp — influencer only */}
            {role === 'influencer' && (
              <div>
                <label htmlFor="whatsapp" className="block text-[13px] font-semibold text-[#0B0B0C] mb-1.5">
                  WhatsApp number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-4 flex items-center text-[#8C8C88] text-[15px] select-none pointer-events-none">
                    +
                  </span>
                  <input
                    id="whatsapp"
                    type="tel"
                    value={whatsappHandle}
                    onChange={(e) => setWhatsappHandle(e.target.value)}
                    placeholder="447911123456"
                    className={inputClass + ' pl-8'}
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-[#8C8C88]">
                  International format without spaces — e.g. 447911123456
                </p>
              </div>
            )}

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
                  Creating account…
                </span>
              ) : (
                'Create account →'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-[#8C8C88]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#6E5BFF] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#C4C4C0]">
          By signing up you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  )
}
