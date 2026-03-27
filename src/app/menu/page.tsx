import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateEN, formatPrice, getSpotsLeft } from '@/lib/utils'
import { Calendar, ChevronRight, Filter } from 'lucide-react'
import type { MenuItem } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '本周菜单',
  description: '查看林记手工近期出品安排，提前预订。',
}

async function getAllItems(): Promise<MenuItem[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('menu_items_with_counts')
    .select(`
      *,
      option_groups:item_option_groups(
        id, label_zh, label_en, is_required, display_order,
        choices:item_option_choices(id, value_zh, value_en, price_modifier, display_order)
      )
    `)
    .gte('available_date', today)
    .eq('is_active', true)
    .order('available_date', { ascending: true })
  return (data as MenuItem[]) || []
}

export default async function MenuPage() {
  const items = await getAllItems()

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const d = item.available_date
    if (!acc[d]) acc[d] = []
    acc[d].push(item)
    return acc
  }, {})

  const dates = Object.keys(grouped)

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div className="bg-brown-900 relative overflow-hidden py-14 sm:py-20">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/braised-tray.jpg" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="relative container-wide text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Calendar size={16} className="text-gold-400" />
            <span className="text-gold-400 text-sm font-medium tracking-widest uppercase">Schedule</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-cream-100 mb-3">本周菜单</h1>
          <p className="text-cream-300 opacity-70">近期出品安排 · 限量手作 · 提前预订</p>
        </div>
      </div>

      <div className="container-wide section">
        {dates.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-brown-400" />
            </div>
            <h2 className="font-serif text-2xl text-brown-700 mb-2">近期菜单暂未发布</h2>
            <p className="text-brown-400 text-sm mb-6">Menu coming soon — check back soon!</p>
            <Link href="/poll" className="btn-gold btn">
              参与投票，告诉我你想吃什么 →
            </Link>
          </div>
        ) : (
          <div className="space-y-14">
            {dates.map((date) => {
              const dateItems = grouped[date]
              return (
                <div key={date}>
                  {/* Date label */}
                  <div className="flex items-center gap-4 mb-7">
                    <div className="bg-brown-900 text-cream-100 rounded-2xl px-6 py-3 text-center shrink-0">
                      <p className="font-serif text-xl font-semibold leading-tight">
                        {formatDate(date)}
                      </p>
                      <p className="text-[11px] text-cream-300 opacity-60 mt-0.5">
                        {formatDateEN(date)}
                      </p>
                    </div>
                    <div className="flex-1 h-px bg-cream-300" />
                    <span className="text-brown-400 text-sm shrink-0">{dateItems.length} 款</span>
                  </div>

                  {/* Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {dateItems.map((item) => (
                      <MenuCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* How to order box */}
        <div className="mt-20 bg-cream-200 rounded-3xl p-8 sm:p-10">
          <h3 className="font-serif text-2xl text-brown-900 mb-6">如何预订？</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', zh: '登录账号', en: 'Sign in', desc: '用邮箱获取登录链接，无需设置密码' },
              { step: '02', zh: '选择下单', en: 'Place Order', desc: '选择想要的商品和口味，填写联系方式' },
              { step: '03', zh: 'Zelle付款', en: 'Pay via Zelle', desc: '下单后通过Zelle转账并上传截图确认' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brown-900 text-cream-100 flex items-center justify-center
                                font-mono text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-serif text-brown-900 font-semibold">{s.zh}</p>
                  <p className="text-xs text-brown-400 mb-1">{s.en}</p>
                  <p className="text-sm text-brown-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuCard({ item }: { item: MenuItem }) {
  const spotsLeft = getSpotsLeft(item.capacity, item.orders_count)
  const isSoldOut = spotsLeft === 0
  const hasOptions = (item.option_groups?.length ?? 0) > 0

  return (
    <Link
      href={isSoldOut ? '#' : `/order/${item.id}`}
      className="card-hover group flex flex-col"
      onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-cream-200">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name_zh}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04]
                       ${isSoldOut ? 'grayscale opacity-50' : ''}`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-cream-300">🍱</div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-brown-900/40 flex items-center justify-center">
            <span className="bg-terra-500 text-white text-sm font-semibold px-3 py-1 rounded-full">已售完</span>
          </div>
        )}

        {!isSoldOut && spotsLeft !== null && spotsLeft <= 5 && (
          <div className="absolute top-2.5 right-2.5">
            <span className="badge bg-terra-500 text-white text-[11px]">剩 {spotsLeft} 份</span>
          </div>
        )}

        {item.capacity && !isSoldOut && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-gold-400 transition-all"
              style={{ width: `${Math.min(100, ((item.orders_count ?? 0) / item.capacity) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-serif text-base text-brown-900 leading-snug">{item.name_zh}</h3>
          <span className="text-gold-600 font-semibold text-sm shrink-0">{formatPrice(item.price)}</span>
        </div>
        {item.name_en && <p className="text-xs text-brown-400 mb-2">{item.name_en}</p>}
        {item.description_zh && (
          <p className="text-brown-500 text-xs leading-relaxed line-clamp-2 flex-1">{item.description_zh}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-cream-200">
          {item.pickup_time && (
            <span className="text-[11px] text-brown-400">🕐 {item.pickup_time}</span>
          )}
          {hasOptions && (
            <span className="badge bg-gold-300/25 text-gold-700 text-[10px]">可选口味</span>
          )}
        </div>
      </div>
    </Link>
  )
}
