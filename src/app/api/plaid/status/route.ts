import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdmin } from '@/lib/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data } = await service
      .from('plaid_config')
      .select('institution, account_name, created_at')
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      connected: !!data,
      config: data || null,
    })
  } catch (err) {
    console.error('Plaid status error:', err)
    return NextResponse.json({ connected: false, config: null })
  }
}
