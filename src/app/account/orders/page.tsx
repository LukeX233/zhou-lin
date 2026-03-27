'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils'
import { ShoppingBag, Loader2, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default function OrdersPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/account/orders'); return }

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id, quantity, unit_price,
            menu_item:menu_items(id, name_zh, name_en, image_url, available_date, pickup_time),
            selections:order_item_selections(id, value_zh, group_id)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setOrders((data as Order[]) || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container-narrow py-10 sm:py-14">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/account" className="text-brown-400 hover:text-brown-700 transition-colors">
            个人设置
          </Link>
          <ChevronRight size={14} className="text-brown-300" />
          <h1 className="font-serif text-2xl text-brown-900">我的订单</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-brown-400" />
            </div>
            <p className="font-serif text-xl text-brown-700 mb-2">暂无订单</p>
            <p className="text-sm text-brown-400 mb-6">No orders yet — go browse the menu!</p>
            <Link href="/menu" className="btn-primary btn">浏览菜单 →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const statusInfo = ORDER_STATUS_LABELS[order.status]
              return (
                <div key={order.id} className="card p-5 sm:p-6">
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-brown-400 font-mono mb-1">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-brown-400">
                        {new Date(order.created_at).toLocaleDateString('zh-CN', {
                          month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={cn('badge text-xs', statusInfo?.color)}>
                      {statusInfo?.zh}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-3 mb-4">
                    {order.items?.map(oi => (
                      <div key={oi.id} className="flex items-center gap-3">
                        {oi.menu_item?.image_url && (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                            <Image src={oi.menu_item.image_url} alt={oi.menu_item.name_zh} fill className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brown-900 text-sm">{oi.menu_item?.name_zh}</p>
                          <p className="text-xs text-brown-400">
                            {oi.menu_item?.available_date && formatDate(oi.menu_item.available_date)}
                            {oi.menu_item?.pickup_time && ` · ${oi.menu_item.pickup_time}`}
                          </p>
                          {oi.selections && oi.selections.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {oi.selections.map(sel => (
                                <span key={sel.id} className="badge bg-cream-200 text-brown-500 text-[10px]">
                                  {sel.value_zh}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-brown-900">{formatPrice(oi.unit_price)}</p>
                          <p className="text-xs text-brown-400">×{oi.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-cream-200">
                    <div>
                      {order.notes && (
                        <p className="text-xs text-brown-400">备注：{order.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-brown-400 mb-0.5">总计</p>
                      <p className="font-serif text-lg font-bold text-brown-900">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
