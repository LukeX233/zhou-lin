import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, Calendar, Vote, DollarSign, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) redirect('/')

  // Fetch stats
  const [ordersRes, itemsRes, pollRes] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, status, total_amount, customer_name, created_at,
        items:order_items(
          id, quantity,
          menu_item:menu_items(name_zh, available_date)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('menu_items').select('id, is_active').eq('is_active', true),
    supabase.from('polls').select('id').eq('is_active', true),
  ])

  const orders = (ordersRes.data as unknown as Order[]) || []
  const activeItems = itemsRes.data?.length ?? 0
  const hasActivePoll = (pollRes.data?.length ?? 0) > 0

  const pending    = orders.filter(o => o.status === 'pending_payment').length
  const confirmed  = orders.filter(o => o.status === 'confirmed').length
  const totalRev   = orders
    .filter(o => ['confirmed', 'completed', 'ready'].includes(o.status))
    .reduce((s, o) => s + o.total_amount, 0)

  const stats = [
    { icon: ShoppingBag,  label: '待确认订单', sub: 'Pending',    value: pending,    color: 'text-gold-600',    bg: 'bg-gold-300/20',   href: '/admin/orders?status=pending_payment' },
    { icon: CheckCircle2, label: '已确认订单', sub: 'Confirmed',  value: confirmed,  color: 'text-matcha-600',  bg: 'bg-matcha-400/20', href: '/admin/orders?status=confirmed' },
    { icon: Calendar,     label: '在售商品',   sub: 'Active Items', value: activeItems, color: 'text-brown-600', bg: 'bg-brown-100',     href: '/admin/menu' },
    { icon: DollarSign,   label: '已收入',     sub: 'Revenue',    value: formatPrice(totalRev), color: 'text-terra-600', bg: 'bg-terra-400/15', href: '/admin/orders' },
  ]

  return (
    <div className="page-wrapper">
      {/* Admin header */}
      <div className="bg-brown-900 py-10">
        <div className="container-wide">
          <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-1">Admin</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-cream-100">后台管理</h1>
        </div>
      </div>

      <div className="container-wide py-10 space-y-10">

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/admin/orders', label: '订单管理', icon: ShoppingBag },
            { href: '/admin/menu',   label: '菜单管理', icon: Calendar },
            { href: '/admin/poll',   label: '投票管理', icon: Vote },
          ].map(nav => (
            <Link key={nav.href} href={nav.href}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-cream-300
                         text-sm font-medium text-brown-700 hover:border-brown-400 hover:bg-cream-100 transition-all">
              <nav.icon size={15} className="text-gold-500" />
              {nav.label}
              <ChevronRight size={12} className="text-brown-400" />
            </Link>
          ))}
          <Link href="/admin/menu/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brown-900 text-cream-100
                       text-sm font-medium hover:bg-brown-700 transition-all">
            + 新建菜单商品
          </Link>
          {!hasActivePoll && (
            <Link href="/admin/poll/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 text-white
                         text-sm font-medium hover:bg-gold-600 transition-all">
              + 发布投票
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Link key={stat.label} href={stat.href}
              className="card p-5 hover:shadow-md transition-all group">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-serif font-bold text-brown-900 group-hover:text-gold-600 transition-colors">
                {stat.value}
              </p>
              <p className="text-sm text-brown-600 mt-0.5">{stat.label}</p>
              <p className="text-xs text-brown-400">{stat.sub}</p>
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-brown-900">最近订单</h2>
            <Link href="/admin/orders" className="text-sm text-gold-600 hover:underline flex items-center gap-1">
              查看全部 <ChevronRight size={14} />
            </Link>
          </div>

          <div className="card overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-brown-400">
                <ShoppingBag size={32} className="mx-auto mb-3 opacity-30" />
                <p>暂无订单</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 bg-cream-100">
                      <th className="text-left px-5 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide">订单</th>
                      <th className="text-left px-4 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide">客户</th>
                      <th className="text-left px-4 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide hidden md:table-cell">商品</th>
                      <th className="text-left px-4 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide">金额</th>
                      <th className="text-left px-4 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide">状态</th>
                      <th className="text-left px-4 py-3 text-brown-500 font-medium text-xs uppercase tracking-wide hidden sm:table-cell">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map(order => {
                      const statusInfo = ORDER_STATUS_LABELS[order.status]
                      const itemName = order.items?.[0]?.menu_item?.name_zh
                      return (
                        <tr key={order.id} className="border-b border-cream-100 hover:bg-cream-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-brown-500">
                              #{order.id.slice(0, 6).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-brown-800 font-medium">{order.customer_name}</td>
                          <td className="px-4 py-3.5 text-brown-500 hidden md:table-cell text-xs">{itemName}</td>
                          <td className="px-4 py-3.5 font-semibold text-brown-900">{formatPrice(order.total_amount)}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn('badge text-xs', statusInfo?.color)}>{statusInfo?.zh}</span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-brown-400 hidden sm:table-cell">
                            {new Date(order.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
