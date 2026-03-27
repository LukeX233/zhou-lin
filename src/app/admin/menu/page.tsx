'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isAdmin, formatDate, formatPrice } from '@/lib/utils'
import { Plus, Edit2, Eye, EyeOff, Loader2, Trash2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { MenuItem } from '@/lib/types'

export default function AdminMenuPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [items,     setItems]   = useState<MenuItem[]>([])
  const [loading,   setLoading] = useState(true)
  const [toggling,  setToggling] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) { router.push('/'); return }
    const { data } = await supabase
      .from('menu_items_with_counts')
      .select('*')
      .order('available_date', { ascending: false })
    setItems((data as MenuItem[]) || [])
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { loadItems() }, [loadItems])

  async function toggleActive(item: MenuItem) {
    setToggling(item.id)
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    if (error) toast.error('操作失败')
    else toast.success(item.is_active ? '已下架' : '已上架')
    await loadItems()
    setToggling(null)
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`确定要删除"${item.name_zh}"吗？此操作不可恢复。`)) return
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (error) toast.error('删除失败')
    else { toast.success('已删除'); await loadItems() }
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="bg-brown-900 py-10">
        <div className="container-wide flex items-center justify-between">
          <div>
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-1">Admin</p>
            <h1 className="font-serif text-3xl text-cream-100">菜单管理</h1>
          </div>
          <Link href="/admin/menu/new" className="btn-gold btn">
            <Plus size={16} /> 新建商品
          </Link>
        </div>
      </div>

      <div className="container-wide py-8">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-serif text-xl text-brown-500 mb-4">暂无菜单商品</p>
            <Link href="/admin/menu/new" className="btn-primary btn">
              <Plus size={16} /> 创建第一个商品
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className={cn('card group', !item.is_active && 'opacity-60')}>
                <div className="relative h-40 bg-cream-200 overflow-hidden">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name_zh} fill sizes="100vw" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍱</div>
                  )}
                  {!item.is_active && (
                    <div className="absolute inset-0 bg-brown-900/40 flex items-center justify-center">
                      <span className="bg-brown-700 text-cream-300 text-xs px-3 py-1 rounded-full">已下架</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-serif text-brown-900 font-semibold leading-snug">{item.name_zh}</p>
                  {item.name_en && <p className="text-xs text-brown-400 mb-2">{item.name_en}</p>}
                  <div className="flex items-center justify-between text-xs text-brown-500 mb-3">
                    <span className="font-semibold text-gold-600">{formatPrice(item.price)}</span>
                    <span>{formatDate(item.available_date)}</span>
                  </div>
                  {item.capacity && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-brown-400 mb-1">
                        <span>已订 {item.orders_count} / {item.capacity}</span>
                        <span>{Math.round((item.orders_count / item.capacity) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-400 rounded-full"
                          style={{ width: `${Math.min(100, (item.orders_count / item.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link href={`/admin/menu/${item.id}/edit`}
                      className="flex-1 btn-sm btn-outline btn flex items-center justify-center gap-1">
                      <Edit2 size={12} /> 编辑
                    </Link>
                    <button
                      onClick={() => toggleActive(item)}
                      disabled={toggling === item.id}
                      title={item.is_active ? '下架' : '上架'}
                      className="btn-sm btn border-2 border-cream-300 text-brown-500 hover:border-brown-400 flex items-center justify-center w-9"
                    >
                      {toggling === item.id ? <Loader2 size={12} className="animate-spin" />
                        : item.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="btn-sm btn border-2 border-terra-400/40 text-terra-500 hover:bg-terra-400/10 flex items-center justify-center w-9"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
