import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { plaidClient } from '@/lib/plaid'
import { extractOrderCode, namesMatch } from '@/lib/plaid'
import { isAdmin } from '@/lib/utils'

// Admin-triggered manual sync — same logic as webhook handler
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    const { data: configs } = await service.from('plaid_config').select('*')
    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: 'No bank connected' }, { status: 400 })
    }

    const end   = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 7)

    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 48)

    const { data: pendingOrders } = await service
      .from('orders')
      .select('id, customer_name, total_amount, order_code, created_at, plaid_transaction_id')
      .eq('status', 'pending_payment')
      .gte('created_at', cutoff.toISOString())

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ matched: 0, message: '无待付款订单' })
    }

    let matchCount = 0

    for (const config of configs) {
      const txRes = await plaidClient.transactionsGet({
        access_token: config.access_token,
        start_date:   start.toISOString().split('T')[0],
        end_date:     end.toISOString().split('T')[0],
      })

      for (const tx of txRes.data.transactions) {
        if (tx.amount >= 0) continue
        const incoming = Math.abs(tx.amount)
        const txName   = tx.name || ''
        const txDate   = new Date(tx.date)

        const code = extractOrderCode(txName)
        if (code) {
          const order = pendingOrders.find(o => o.order_code === code && !o.plaid_transaction_id)
          if (order) {
            await service.from('orders').update({
              status: 'confirmed',
              plaid_matched: true,
              plaid_transaction_id: tx.transaction_id,
            }).eq('id', order.id)
            matchCount++
            continue
          }
        }

        const candidates = pendingOrders.filter(o => {
          const orderDate = new Date(o.created_at)
          const hoursDiff = (txDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
          return Math.abs(o.total_amount - incoming) < 0.02 && hoursDiff >= -1 && hoursDiff <= 48
        })

        for (const candidate of candidates) {
          if (!candidate.plaid_transaction_id && namesMatch(candidate.customer_name, txName)) {
            await service.from('orders').update({
              status: 'confirmed',
              plaid_matched: true,
              plaid_transaction_id: tx.transaction_id,
            }).eq('id', candidate.id)
            matchCount++
            break
          }
        }
      }
    }

    return NextResponse.json({ matched: matchCount, message: `匹配到 ${matchCount} 笔付款` })
  } catch (err) {
    console.error('Plaid sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
