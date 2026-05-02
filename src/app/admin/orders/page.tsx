'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2, Zap, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Order, OrderStatus } from '@/lib/types'

const STATUS_FILTERS = [
  { value: 'all',             label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'confirmed',       label: '已确认' },
  { value: 'completed',       label: '已完成' },
  { value: 'cancelled',       label: '已取消' },
]

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="page-wrapper flex items-center justify-center min-h-[60vh]"><Loader2 size={28} className="animate-spin text-gold-500" /></div>}>
      <AdminOrdersContent />
    </Suspense>
  )
}

function AdminOrdersContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [updating,     setUpdating]     = useState<string | null>(null)
  const [syncing,      setSyncing]      = useState(false)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')

  const loadOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) { router.push('/'); return }

    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id, quantity, unit_price,
          menu_item:menu_items(id, name_zh, image_url, available_date),
          selections:order_item_selections(id, value_zh)
        )
      `)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data } = await query
    setOrders((data as Order[]) || [])
    setLoading(false)
  }, [router, statusFilter, supabase])

  useEffect(() => {
    setLoading(true)
    loadOrders()
  }, [loadOrders])

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    setUpdating(orderId)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) {
      toast.error('更新失败')
    } else {
      toast.success(`状态已更新为：${ORDER_STATUS_LABELS[newStatus]?.zh}`)
      await loadOrders()
    }
    setUpdating(null)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `匹配到 ${data.matched} 笔付款`)
        await loadOrders()
      } else {
        toast.error(data.error || '同步失败')
      }
    } catch {
      toast.error('同步失败，请重试')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  const pendingCount = orders.filter(o => o.status === 'pending_payment').length

  return (
    <div className="page-wrapper">
      <div className="bg-brown-900 py-10">
        <div className="container-wide flex items-end justify-between">
          <div>
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-1">Admin</p>
            <h1 className="font-serif text-3xl text-cream-100">订单管理</h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-white
                       text-sm font-medium hover:bg-gold-600 transition-all disabled:opacity-60"
          >
            {syncing
              ? <><Loader2 size={14} className="animate-spin" /> 同步中...</>
              : <><RefreshCw size={14} /> Plaid 同步付款</>
            }
          </button>
        </div>
      </div>

      <div className="container-wide py-8 space-y-6">

        {/* Pending alert */}
        {pendingCount > 0 && statusFilter === 'all' && (
          <div className="bg-amber-50 border border-gold-300 rounded-2xl p-4 flex items-center gap-3">
            <Zap size={18} className="text-gold-500 shrink-0" />
            <p className="text-sm text-brown-700">
              <strong>{pendingCount} 笔</strong>待确认付款 · 点击&ldquo;Plaid 同步付款&rdquo;自动匹配，或手动确认
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border-2',
                statusFilter === f.value
                  ? 'bg-brown-900 text-cream-100 border-brown-900'
                  : 'border-cream-300 text-brown-600 hover:border-brown-400'
              )}>
              {f.label}
            </button>
          ))}
          <span className="text-xs text-brown-400 self-center ml-2">{orders.length} 条</span>
        </div>

        {/* Orders */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-brown-400">
              <p>该状态下暂无订单</p>
            </div>
          ) : orders.map(order => {
            const statusInfo = ORDER_STATUS_LABELS[order.status]
            const isUpdating = updating === order.id
            return (
              <div key={order.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-brown-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                      {order.order_code && (
                        <span className="font-mono text-xs bg-gold-300/30 text-gold-700 px-2 py-0.5 rounded-lg">
                          Zelle: #{order.order_code}
                        </span>
                      )}
                      <span className={cn('badge text-xs', statusInfo?.color)}>{statusInfo?.zh}</span>
                      {order.plaid_matched && (
                        <span className="badge bg-matcha-400/20 text-matcha-600 text-xs flex items-center gap-1">
                          <Zap size={10} /> 自动匹配
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-lg text-brown-900">{order.customer_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-brown-400">
                      {order.customer_phone  && <span>📞 {order.customer_phone}</span>}
                      {order.customer_wechat && <span>💬 {order.customer_wechat}</span>}
                    </div>
                    <p className="text-xs text-brown-400">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-bold text-brown-900">{formatPrice(order.total_amount)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-cream-100 rounded-xl p-3 mb-4 space-y-2">
                  {order.items?.map(oi => (
                    <div key={oi.id} className="flex items-center gap-3">
                      {oi.menu_item?.image_url && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={oi.menu_item.image_url} alt="" fill sizes="40px" className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-brown-800">{oi.menu_item?.name_zh}</span>
                        {oi.selections && oi.selections.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {oi.selections.map((sel, i) => (
                              <span key={i} className="badge bg-cream-300 text-brown-500 text-[10px]">{sel.value_zh}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-brown-600">
                        ×{oi.quantity} · {formatPrice(oi.unit_price)}
                      </div>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-brown-500 border-t border-cream-200 pt-2 mt-2">
                      📝 {order.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending_payment' && (
                    <button onClick={() => updateStatus(order.id, 'confirmed')} disabled={isUpdating}
                      className="btn-sm btn bg-matcha-500 text-white hover:bg-matcha-600 flex items-center gap-1.5">
                      {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      手动确认收款
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => updateStatus(order.id, 'completed')} disabled={isUpdating}
                      className="btn-sm btn bg-brown-700 text-white hover:bg-brown-900 flex items-center gap-1.5">
                      {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      标记已完成
                    </button>
                  )}
                  {['pending_payment', 'confirmed'].includes(order.status) && (
                    <button onClick={() => updateStatus(order.id, 'cancelled')} disabled={isUpdating}
                      className="btn-sm btn border-2 border-terra-400 text-terra-600 hover:bg-terra-400/10 flex items-center gap-1.5">
                      <XCircle size={12} /> 取消订单
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
