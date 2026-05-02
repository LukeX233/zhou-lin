import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid'
import { isAdmin } from '@/lib/utils'
import { Products, CountryCode } from 'plaid'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Lin Dough 琳记',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.NEXT_PUBLIC_SITE_URL}/api/plaid/webhook`,
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('Plaid create-link-token error:', err)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
