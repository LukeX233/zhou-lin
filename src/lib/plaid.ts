import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

const env = (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || 'sandbox'

const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET':    process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

/** Generate a short unique order code for Zelle memo matching */
export function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars (0/O, 1/I)
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code // e.g. K7M2 — displayed to customer as #K7M2
}

/** Extract order code from a Zelle transaction name/memo string */
export function extractOrderCode(text: string): string | null {
  const match = text.match(/#([A-Z2-9]{4})/i)
  return match ? match[1].toUpperCase() : null
}

/** Fuzzy name matching: normalize and check if names overlap */
export function namesMatch(orderName: string, txName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z]/g, ' ').trim().split(/\s+/).filter(Boolean)

  const orderParts = normalize(orderName)
  const txParts    = normalize(txName)

  // At least one word must match
  return orderParts.some(part => txParts.some(tp => tp.includes(part) || part.includes(tp)))
}
