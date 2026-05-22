'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, MessageSquare,
  Printer, AlertTriangle, ChevronDown, ChevronUp, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Order, OrderStatus } from '@/lib/types'

interface ProfileMap {
  [userId: string]: { zelle_name: string | null; phone: string | null }
}

const STATUS_FILTERS = [
  { value: 'all',             label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'confirmed',       label: '已确认' },
  { value: 'completed',       label: '已完成' },
  { value: 'cancelled',       label: '已取消' },
]

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-gold-500" />
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  )
}

function AdminOrdersContent() {
  const router   = useRouter()
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)

  const [orders,       setOrders]       = useState<Order[]>([])
  const [profiles,     setProfiles]     = useState<ProfileMap>({})
  const [loading,      setLoading]      = useState(true)
  const [updating,     setUpdating]     = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())

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

    const { data: orderData } = await query
    const fetchedOrders = (orderData as Order[]) || []
    setOrders(fetchedOrders)

    // Fetch profiles for all user_ids
    const userIds = [...new Set(fetchedOrders.map(o => o.user_id).filter(Boolean))] as string[]
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, zelle_name, phone')
        .in('id', userIds)
      const map: ProfileMap = {}
      for (const p of (profileData || [])) {
        map[p.id] = { zelle_name: p.zelle_name, phone: p.phone }
      }
      setProfiles(map)
    }

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
      toast.success(`已更新为：${ORDER_STATUS_LABELS[newStatus]?.zh}`)
      await loadOrders()
    }
    setUpdating(null)
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  const pendingOrders    = orders.filter(o => o.status === 'pending_payment')
  const pendingCount     = pendingOrders.length
  const confirmedOrders  = orders.filter(o => o.status === 'confirmed')
  const totalRevenue     = confirmedOrders.reduce((s, o) => s + Number(o.total_amount), 0)

  // Group by available date (from the first item's menu_item)
  function getOrderDate(order: Order): string {
    return order.items?.[0]?.menu_item?.available_date ?? order.created_at.split('T')[0]
  }

  const grouped = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const d = getOrderDate(o)
    if (!acc[d]) acc[d] = []
    acc[d].push(o)
    return acc
  }, {})

  return (
    <>
      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div className="page-wrapper">
        {/* ── HEADER ── */}
        <div className="bg-brown-900 py-8 no-print">
          <div className="container-wide flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-gold-400 text-xs font-medium tracking-widest uppercase mb-1">Admin</p>
              <h1 className="font-serif text-3xl text-cream-100">订单管理</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLoading(true); loadOrders() }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-cream-100
                           text-sm font-medium hover:bg-white/20 transition-all"
              >
                <RefreshCw size={14} /> 刷新
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-white
                           text-sm font-medium hover:bg-gold-600 transition-all"
              >
                <Printer size={14} /> 打印清单
              </button>
            </div>
          </div>
        </div>

        <div className="container-wide py-6 space-y-5 no-print">

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '全部订单', value: orders.length, color: 'text-brown-900' },
              { label: '待付款', value: pendingCount, color: pendingCount > 0 ? 'text-amber-600' : 'text-brown-900' },
              { label: '已确认', value: confirmedOrders.length, color: 'text-matcha-600' },
              { label: '已确认收入', value: formatPrice(totalRevenue), color: 'text-gold-600' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className={cn('font-serif text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-brown-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── PENDING ALERT ── */}
          {pendingCount > 0 && (statusFilter === 'all' || statusFilter === 'pending_payment') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-brown-700">
                <strong>{pendingCount} 笔</strong>待付款订单。请核对 Zelle 转账后手动确认，
                或点击&ldquo;短信提醒&rdquo;催客户付款。
              </div>
            </div>
          )}

          {/* ── FILTERS ── */}
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all border-2',
                  statusFilter === f.value
                    ? 'bg-brown-900 text-cream-100 border-brown-900'
                    : 'border-cream-300 text-brown-600 hover:border-brown-400'
                )}>
                {f.label}
                {f.value === 'pending_payment' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
            <span className="text-xs text-brown-400 ml-1">{orders.length} 条</span>
          </div>

          {/* ── ORDERS ── */}
          {orders.length === 0 ? (
            <div className="text-center py-16 text-brown-400">
              <p>该状态下暂无订单</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped)
                .sort(([a], [b]) => a < b ? -1 : 1)
                .map(([date, dateOrders]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-brown-800 text-cream-100 rounded-xl px-4 py-1.5 text-sm font-medium">
                        {date}
                      </div>
                      <div className="flex-1 h-px bg-cream-300" />
                      <span className="text-xs text-brown-400">{dateOrders.length} 单</span>
                    </div>

                    <div className="space-y-3">
                      {dateOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          profile={order.user_id ? profiles[order.user_id] : undefined}
                          isUpdating={updating === order.id}
                          isExpanded={expandedIds.has(order.id)}
                          onToggle={() => toggleExpand(order.id)}
                          onUpdateStatus={updateStatus}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── PRINT AREA ── */}
        <div id="print-area" ref={printRef} className="hidden print:block p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">琳记手工 · 订单清单</h1>
            <p className="text-sm text-gray-500 mt-1">打印时间：{new Date().toLocaleString('zh-CN')}</p>
          </div>

          {Object.entries(grouped)
            .sort(([a], [b]) => a < b ? -1 : 1)
            .map(([date, dateOrders]) => {
              const activeOrders = dateOrders.filter(o => o.status !== 'cancelled')
              if (activeOrders.length === 0) return null
              return (
                <div key={date} className="mb-8">
                  <h2 className="text-lg font-bold border-b-2 border-black pb-1 mb-3">{date}</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 w-6">#</th>
                        <th className="text-left py-2">姓名</th>
                        <th className="text-left py-2">商品</th>
                        <th className="text-right py-2">金额</th>
                        <th className="text-center py-2 w-12">取餐</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrders.map((order, idx) => (
                        <tr key={order.id} className="border-b border-gray-100">
                          <td className="py-2 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="py-2">
                            <div className="font-medium">{order.customer_name}</div>
                            {order.customer_phone && (
                              <div className="text-xs text-gray-400">{order.customer_phone}</div>
                            )}
                          </td>
                          <td className="py-2">
                            {order.items?.map(oi => (
                              <div key={oi.id} className="text-xs">
                                {oi.menu_item?.name_zh} ×{oi.quantity}
                                {oi.selections && oi.selections.length > 0 && (
                                  <span className="text-gray-400"> ({oi.selections.map(s => s.value_zh).join('/')})</span>
                                )}
                              </div>
                            ))}
                            {order.notes && (
                              <div className="text-xs text-gray-400 mt-0.5">备注: {order.notes}</div>
                            )}
                          </td>
                          <td className="py-2 text-right font-medium">{formatPrice(order.total_amount)}</td>
                          <td className="py-2 text-center">
                            <div className="w-5 h-5 border-2 border-gray-400 rounded mx-auto" />
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-black">
                        <td colSpan={3} className="py-2 text-right font-bold text-sm">合计</td>
                        <td className="py-2 text-right font-bold">
                          {formatPrice(activeOrders.reduce((s, o) => s + Number(o.total_amount), 0))}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })}
        </div>
      </div>
    </>
  )
}

/* ── Order Card ── */
function OrderCard({
  order,
  profile,
  isUpdating,
  isExpanded,
  onToggle,
  onUpdateStatus,
}: {
  order: Order
  profile?: { zelle_name: string | null; phone: string | null }
  isUpdating: boolean
  isExpanded: boolean
  onToggle: () => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
}) {
  const statusInfo = ORDER_STATUS_LABELS[order.status]
  const phone = profile?.phone ?? order.customer_phone
  const smsPhone = formatPhoneForSms(phone)
  const smsHref = smsPhone
    ? `sms:${smsPhone}?body=${buildSmsBody(order)}`
    : null

  return (
    <div className={cn(
      'card overflow-hidden transition-all',
      order.status === 'pending_payment' && 'border-l-4 border-amber-400',
      order.status === 'confirmed' && 'border-l-4 border-matcha-500',
      order.status === 'cancelled' && 'opacity-60',
    )}>
      {/* ── Card Header (always visible) ── */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-cream-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn('badge text-xs', statusInfo?.color)}>{statusInfo?.zh}</span>
            <span className="font-mono text-xs text-brown-400">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="font-serif text-lg text-brown-900 font-semibold">{order.customer_name}</p>
            {profile?.zelle_name && (
              <span className="text-xs text-gold-600 font-medium">
                Zelle: {profile.zelle_name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-brown-400">
            {phone && <span className="flex items-center gap-1"><Phone size={11} /> {phone}</span>}
            {order.customer_wechat && <span>微信: {order.customer_wechat}</span>}
            <span>{new Date(order.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-serif text-xl font-bold text-brown-900">{formatPrice(order.total_amount)}</p>
          {isExpanded ? <ChevronUp size={16} className="text-brown-400" /> : <ChevronDown size={16} className="text-brown-400" />}
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div className="border-t border-cream-200 p-4 sm:p-5 space-y-4">
          {/* Items */}
          <div className="bg-cream-100 rounded-xl p-3 space-y-2">
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
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {oi.selections.map((sel, i) => (
                        <span key={i} className="badge bg-cream-300 text-brown-500 text-[10px]">{sel.value_zh}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-brown-600 shrink-0">
                  ×{oi.quantity} · {formatPrice(oi.unit_price)}
                </div>
              </div>
            ))}
            {order.notes && (
              <p className="text-xs text-brown-500 border-t border-cream-200 pt-2 mt-2">
                备注: {order.notes}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {order.status === 'pending_payment' && (
              <button
                onClick={() => onUpdateStatus(order.id, 'confirmed')}
                disabled={isUpdating}
                className="btn-sm btn bg-matcha-500 text-white hover:bg-matcha-600 flex items-center gap-1.5"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                确认收款
              </button>
            )}
            {order.status === 'confirmed' && (
              <button
                onClick={() => onUpdateStatus(order.id, 'completed')}
                disabled={isUpdating}
                className="btn-sm btn bg-brown-700 text-white hover:bg-brown-900 flex items-center gap-1.5"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                标记已完成
              </button>
            )}
            {order.status === 'pending_payment' && smsHref && (
              <a
                href={smsHref}
                className="btn-sm btn border-2 border-blue-400 text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
              >
                <MessageSquare size={12} /> 短信提醒付款
              </a>
            )}
            {order.status === 'pending_payment' && !smsHref && (
              <button
                disabled
                className="btn-sm btn border-2 border-cream-300 text-brown-300 flex items-center gap-1.5 cursor-not-allowed"
                title="客户未留手机号"
              >
                <MessageSquare size={12} /> 短信提醒（无手机号）
              </button>
            )}
            {['pending_payment', 'confirmed'].includes(order.status) && (
              <button
                onClick={() => {
                  if (confirm(`确定取消 ${order.customer_name} 的订单吗？`)) {
                    onUpdateStatus(order.id, 'cancelled')
                  }
                }}
                disabled={isUpdating}
                className="btn-sm btn border-2 border-terra-400 text-terra-600 hover:bg-terra-400/10 flex items-center gap-1.5"
              >
                <XCircle size={12} /> 取消订单
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatPhoneForSms(raw: string | null): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits
}

function buildSmsBody(order: Order): string {
  const amount = formatPrice(order.total_amount)
  return encodeURIComponent(
    `您好 ${order.customer_name}！您在琳记手工的订单（共 ${amount}）尚未收到付款，请通过 Zelle 转账至 3093711006 Lin Zhou 完成支付。逾期未付款订单将被取消，谢谢！`
  )
}
