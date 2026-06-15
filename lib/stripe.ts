import Stripe from 'stripe'

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
    typescript: true,
  })
}

// Lazy proxy so importing this file at module level doesn't throw without STRIPE_SECRET_KEY
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string) {
    return (getStripe() as any)[prop]
  },
})
