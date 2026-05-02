import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { plaidClient } from '@/lib/plaid'
import { extractOrderCode, namesMatch } from '@/lib/plaid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { webhook_type, webhook_code, item_id } = body

    // Only handle transaction webhooks
    if (webhook_type !== 'TRANSACTIONS') {
      return NextResponse.json({ received: true })
    }

    if (webhook_code !== 'SYNC_UPDATES_AVAILABLE' && webhook_code !== 'DEFAULT_UPDATE') {
      return NextResponse.json({ received: true })
    }

    const service = createServiceClient()

    // Get access token for this item
    const { data: config } = await service
      .from('plaid_config')
      .select('access_token, account_id')
      .eq('item_id', item_id)
      .maybeSingle()

    if (!config) {
      return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    }

    // Fetch recent transactions (last 7 days)
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 7)

    const txRes = await plaidClient.transactionsGet({
      access_token: config.access_token,
      start_date:  start.toISOString().split('T')[0],
      end_date:    end.toISOString().split('T')[0],
    })

    const transactions = txRes.data.transactions

    // Get all pending orders from the last 48 hours
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 48)

    const { data: pendingOrders } = await service
      .from('orders')
      .select('id, customer_name, total_amount, order_code, created_at, plaid_transaction_id')
      .eq('status', 'pending_payment')
      .gte('created_at', cutoff.toISOString())

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ received: true, matched: 0 })
    }

    let matchCount = 0

    for (const tx of transactions) {
      // Only look at incoming Zelle / P2P transfers (negative amount = money out, positive = money in)
      if (tx.amount >= 0) continue // Plaid: positive = debit (money leaving account), negative = credit
      const incoming = Math.abs(tx.amount)
      const txName   = tx.name || ''
      const txDate   = new Date(tx.date)

      // Strategy 1: match by order code in transaction name/memo
      const code = extractOrderCode(txName)
      if (code) {
        const order = pendingOrders.find(o => o.order_code === code)
        if (order && !order.plaid_transaction_id) {
          await service.from('orders').update({
            status: 'confirmed',
            plaid_matched: true,
            plaid_transaction_id: tx.transaction_id,
          }).eq('id', order.id)
          matchCount++
          continue
        }
      }

      // Strategy 2: match by amount + customer name + time window
      const candidates = pendingOrders.filter(o => {
        const orderDate = new Date(o.created_at)
        const hoursDiff = (txDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
        const amountMatch = Math.abs(o.total_amount - incoming) < 0.02
        const timeMatch   = hoursDiff >= -1 && hoursDiff <= 48
        return amountMatch && timeMatch
      })

      for (const candidate of candidates) {
        if (namesMatch(candidate.customer_name, txName)) {
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

    return NextResponse.json({ received: true, matched: matchCount })
  } catch (err) {
    console.error('Plaid webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
