import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('en-GB').format(n)
}

export type UserRole = 'admin' | 'influencer' | 'marketer'

export type Profile = {
  id: string
  email: string
  role: UserRole
  full_name: string
  country: string
  whatsapp_handle: string | null
  stripe_account_id: string | null
  stripe_onboarded: boolean
  avatar_url: string | null
  created_at: string
}

export type Tier = {
  id: string
  name: string
  views_target: number
  influencer_payout: number
  platform_fee: number
  total_charge: number
  active: boolean
}

export type Campaign = {
  id: string
  marketer_id: string
  title: string
  description: string
  tier_id: string
  creative_url: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  created_at: string
  tiers?: Tier
  profiles?: Profile
}

export type Application = {
  id: string
  campaign_id: string
  influencer_id: string
  status: 'applied' | 'active' | 'proof_submitted' | 'approved' | 'rejected' | 'paid'
  applied_at: string
  campaigns?: Campaign
  profiles?: Profile
}

export type ProofSubmission = {
  id: string
  application_id: string
  screenshot_url: string
  video_url: string | null
  ai_view_count: number
  ai_confidence: number
  ai_is_whatsapp: boolean
  ai_has_creative: boolean
  ai_raw_response: any
  admin_note: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  applications?: Application
}
