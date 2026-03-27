import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateEN, formatPrice, getSpotsLeft } from '@/lib/utils'
import { ChevronRight, Calendar, Vote, Sparkles } from 'lucide-react'
import type { MenuItem, Poll } from '@/lib/types'

async function getUpcomingItems(): Promise<MenuItem[]> {
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
    .limit(6)
  return (data as MenuItem[]) || []
}

async function getActivePoll(): Promise<Poll | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('polls')
    .select(`*, options:poll_options(*)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Poll | null
}

export default async function HomePage() {
  const [items, poll] = await Promise.all([getUpcomingItems(), getActivePoll()])

  // Group items by date
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const d = item.available_date
    if (!acc[d]) acc[d] = []
    acc[d].push(item)
    return acc
  }, {})

  return (
    <div className="page-wrapper">
      {/* ── HERO ── */}
      <section className="relative h-[88vh] min-h-[560px] max-h-[800px] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/layered-cake.jpg"
            alt="Lin Dough Handmade artisan cake"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Warm overlay: dark at bottom, semi-transparent at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-brown-900 via-brown-900/50 to-brown-900/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-brown-900/40 to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative h-full flex flex-col justify-end container-wide pb-16 sm:pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4 animate-fade-up opacity-0 stagger-1">
            <div className="w-6 h-0.5 bg-gold-400" />
            <span className="text-gold-300 text-sm font-medium tracking-widest uppercase">
              Chicago Area · Illinois
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-cream-100 text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-4
                          animate-fade-up opacity-0 stagger-2 max-w-2xl">
            林记
            <br />
            <span className="text-gold-400">手工烘焙</span>
          </h1>
          <p className="text-cream-200 text-lg sm:text-xl mb-2 font-light opacity-90
                         animate-fade-up opacity-0 stagger-3">
            Lin Dough Handmade
          </p>
          <p className="text-cream-300 text-base sm:text-lg mb-10 opacity-70 max-w-md
                         animate-fade-up opacity-0 stagger-3">
            每周新鲜手作，限量出品 · Fresh weekly, limited batches
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 animate-fade-up opacity-0 stagger-4">
            <Link href="/menu" className="btn-gold btn btn-lg">
              查看本周菜单
              <ChevronRight size={18} />
            </Link>
            {poll && (
              <Link href="/poll" className="btn btn-lg border-2 border-cream-300/40 text-cream-100
                                             hover:border-cream-100 hover:bg-white/10 transition-all">
                <Vote size={18} />
                参与投票
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1
                        text-cream-300 opacity-40 animate-bounce hidden sm:flex">
          <div className="w-px h-8 bg-cream-300/50" />
        </div>
      </section>


      {/* ── THIS WEEK'S SCHEDULE ── */}
      <section className="section">
        <div className="container-wide">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-gold-500" />
                <span className="text-gold-600 text-sm font-medium tracking-wide uppercase">Schedule</span>
              </div>
              <h2 className="heading-lg">近期出品</h2>
              <p className="body-md mt-1 max-w-md">
                每批限量制作，售完即止。提前预订，不留遗憾。
              </p>
            </div>
            <Link href="/menu" className="hidden sm:flex btn-outline btn gap-1.5 shrink-0">
              查看全部 <ChevronRight size={16} />
            </Link>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-brown-400">
              <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-serif">近期菜单即将公布</p>
              <p className="text-sm mt-1 opacity-60">Stay tuned for the upcoming schedule</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(grouped).map(([date, dateItems]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-brown-900 text-cream-100 rounded-2xl px-5 py-2.5 text-center">
                      <p className="font-serif text-lg font-semibold leading-tight">
                        {formatDate(date)}
                      </p>
                      <p className="text-xs text-cream-300 opacity-70 mt-0.5">
                        {formatDateEN(date)}
                      </p>
                    </div>
                    <div className="flex-1 h-px bg-cream-300" />
                  </div>

                  {/* Items grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {dateItems.map((item, i) => (
                      <MenuItemCard key={item.id} item={item} delay={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center sm:hidden">
            <Link href="/menu" className="btn-outline btn">
              查看全部菜单 <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── POLL TEASER ── */}
      {poll && (
        <section className="bg-brown-900 relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-5">
            <Image src="/images/matcha-bread.jpg" alt="" fill sizes="100vw" className="object-cover" />
          </div>
          <div className="relative container-wide py-16 sm:py-20">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Vote size={16} className="text-gold-400" />
                <span className="text-gold-400 text-sm font-medium tracking-widest uppercase">Weekly Poll</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-cream-100 mb-4 leading-snug">
                下周你想吃什么？
              </h2>
              <p className="text-cream-300 opacity-70 mb-8">
                {poll.question_zh}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {poll.options?.slice(0, 4).map(opt => (
                  <span key={opt.id}
                    className="bg-white/10 text-cream-200 rounded-full px-4 py-1.5 text-sm border border-white/10">
                    {opt.label_zh}
                  </span>
                ))}
                {(poll.options?.length ?? 0) > 4 && (
                  <span className="bg-white/10 text-cream-300 rounded-full px-4 py-1.5 text-sm border border-white/10">
                    +{(poll.options?.length ?? 0) - 4} more
                  </span>
                )}
              </div>
              <Link href="/poll" className="btn-gold btn btn-lg">
                参与投票
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── ABOUT ── */}
      <section className="section">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Images collage */}
            <div className="relative h-[480px] lg:h-[560px]">
              <div className="absolute top-0 left-0 w-[58%] h-[60%] rounded-2xl overflow-hidden shadow-xl">
                <Image src="/images/taro-tiramisu.jpg" alt="Taro tiramisu" fill sizes="100vw" className="object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-[58%] h-[60%] rounded-2xl overflow-hidden shadow-xl">
                <Image src="/images/osmanthus-cups.jpg" alt="Osmanthus cups" fill sizes="100vw" className="object-cover" />
              </div>
              <div className="absolute top-[30%] left-[30%] w-[42%] h-[44%] rounded-2xl overflow-hidden shadow-2xl
                              border-4 border-cream-100">
                <Image src="/images/matcha-bread.jpg" alt="Matcha bread" fill sizes="100vw" className="object-cover" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gold-500" />
                <span className="text-gold-600 text-sm font-medium tracking-widest uppercase">About</span>
              </div>
              <h2 className="heading-lg">用心做的每一口</h2>
              <div className="space-y-4 body-lg">
                <p>
                  每一样东西都是我亲手做的——从蛋糕的每一层，到卤肉的每一道工序。
                  没有批量生产，没有流水线，只有花时间做出来的用心食物。
                </p>
                <p>
                  作为伊利诺伊州合法注册的家庭食品工坊（Cottage Food），
                  我每周根据大家的需求和时令食材来安排出品，限量手作，新鲜到位。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { num: '100%', label: '手工制作', sub: 'Handmade' },
                  { num: '新鲜', label: '当天出品', sub: 'Same-day Fresh' },
                  { num: '限量', label: '每批出品', sub: 'Limited Batches' },
                ].map(stat => (
                  <div key={stat.label} className="text-center bg-cream-200 rounded-2xl py-4">
                    <p className="font-serif text-2xl font-bold text-brown-900">{stat.num}</p>
                    <p className="text-xs text-brown-600 mt-0.5">{stat.label}</p>
                    <p className="text-[10px] text-brown-400 opacity-70">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <Link href="/menu" className="btn-primary btn">
                查看本周菜单 <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY STRIP ── */}
      <section className="pb-16 overflow-hidden">
        <div className="container-wide mb-6">
          <p className="text-center text-brown-400 text-sm tracking-widest uppercase font-medium">Gallery</p>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {[
            { src: '/images/sponge-cake.jpg',         alt: '招牌蛋糕' },
            { src: '/images/chocolate-bundt.jpg',     alt: '巧克力磅蛋糕' },
            { src: '/images/custard-bun.jpg',         alt: '流心包' },
            { src: '/images/braised-pork.jpg',        alt: '红烧肉' },
            { src: '/images/matcha-strawberry-cake.jpg', alt: '抹茶草莓蛋糕' },
            { src: '/images/taro-bun.jpg',            alt: '芋泥包' },
            { src: '/images/black-sesame-cake.jpg',   alt: '黑芝麻蛋糕' },
            { src: '/images/braised-tray.jpg',        alt: '卤肉拼盘' },
          ].map(img => (
            <div key={img.src}
              className="flex-none w-52 h-52 sm:w-64 sm:h-64 rounded-2xl overflow-hidden snap-start">
              <Image src={img.src} alt={img.alt} width={256} height={256}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── Menu Item Card Component ── */
function MenuItemCard({ item, delay }: { item: MenuItem; delay: number }) {
  const spotsLeft = getSpotsLeft(item.capacity, item.orders_count)
  const isSoldOut = spotsLeft === 0
  const hasOptions = (item.option_groups?.length ?? 0) > 0

  return (
    <Link
      href={isSoldOut ? '#' : `/order/${item.id}`}
      className={`card-hover group flex flex-col animate-fade-up opacity-0 stagger-${Math.min(delay + 1, 5)}`}
      onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
    >
      {/* Image */}
      <div className="relative h-52 bg-cream-200 overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name_zh}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-105
                       ${isSoldOut ? 'grayscale opacity-60' : ''}`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-cream-300 flex items-center justify-center">
            <span className="text-4xl">🍱</span>
          </div>
        )}

        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-brown-900/50 flex items-center justify-center">
            <span className="bg-terra-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
              已售完 Sold Out
            </span>
          </div>
        )}

        {/* Spots badge */}
        {!isSoldOut && spotsLeft !== null && spotsLeft <= 5 && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-terra-500/90 text-white backdrop-blur-sm">
              仅剩 {spotsLeft} 份
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-serif text-lg text-brown-900 leading-snug">{item.name_zh}</h3>
          <span className="font-sans font-semibold text-gold-600 shrink-0">{formatPrice(item.price)}</span>
        </div>
        {item.name_en && (
          <p className="text-brown-400 text-xs mb-2">{item.name_en}</p>
        )}
        {item.description_zh && (
          <p className="text-brown-500 text-sm leading-relaxed flex-1 line-clamp-2">{item.description_zh}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200">
          <div className="flex items-center gap-1.5">
            {item.pickup_time && (
              <span className="text-xs text-brown-400">🕐 {item.pickup_time}</span>
            )}
          </div>
          {hasOptions && (
            <span className="badge bg-gold-300/30 text-gold-700 text-[11px]">可选口味</span>
          )}
          {!isSoldOut && (
            <span className="text-gold-600 text-xs font-medium group-hover:underline">
              立即预订 →
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
