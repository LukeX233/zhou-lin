import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { plaidClient } from '@/lib/plaid'
import { isAdmin } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { public_token, institution, account_id, account_name } = await req.json()

    // Exchange public token for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    // Store in plaid_config via service role (bypasses RLS)
    const service = createServiceClient()
    const { error } = await service
      .from('plaid_config')
      .upsert({
        access_token,
        item_id,
        institution: institution || null,
        account_id:  account_id || null,
        account_name: account_name || null,
      }, { onConflict: 'item_id' })

    if (error) throw error

    return NextResponse.json({ success: true, institution })
  } catch (err) {
    console.error('Plaid exchange-token error:', err)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
