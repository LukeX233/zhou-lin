'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatPrice, getSpotsLeft } from '@/lib/utils'
import { generateOrderCode } from '@/lib/plaid'
import {
  ChevronLeft, Minus, Plus, CheckCircle2,
  AlertCircle, Loader2, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { MenuItem } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export default function OrderPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const supabase = createClient()

  const [item,      setItem]      = useState<MenuItem | null>(null)
  const [user,      setUser]      = useState<User | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [step,      setStep]      = useState<'configure' | 'contact' | 'done'>('configure')

  // Configure step
  const [quantity,   setQuantity]   = useState(1)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [choiceIds,  setChoiceIds]  = useState<Record<string, string>>({})

  // Contact step
  const [name,   setName]   = useState('')
  const [phone,  setPhone]  = useState('')
  const [wechat, setWechat] = useState('')
  const [notes,  setNotes]  = useState('')

  // Done step
  const [submitting,  setSubmitting]  = useState(false)
  const [orderCode,   setOrderCode]   = useState<string | null>(null)
  const [copiedCode,  setCopiedCode]  = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: userData }, { data: itemData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('menu_items_with_counts')
          .select(`*, option_groups:item_option_groups(
            id, label_zh, label_en, is_required, display_order,
            choices:item_option_choices(id, value_zh, value_en, price_modifier, display_order)
          )`)
          .eq('id', itemId)
          .eq('is_active', true)
          .maybeSingle()
      ])
      setUser(userData.user)
      setItem(itemData as MenuItem)

      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, phone, wechat')
          .eq('id', userData.user.id)
          .maybeSingle()
        if (profile?.name)   setName(profile.name)
        if (profile?.phone)  setPhone(profile.phone)
        if (profile?.wechat) setWechat(profile.wechat)
      }
      setLoading(false)
    }
    load()
  }, [itemId, supabase])

  const spotsLeft = item ? getSpotsLeft(item.capacity, item.orders_count) : null

  function computeTotal(): number {
    if (!item) return 0
    let base = item.price
    for (const groupId in choiceIds) {
      const choiceId = choiceIds[groupId]
      for (const group of item.option_groups ?? []) {
        const choice = group.choices?.find(c => c.id === choiceId)
        if (choice) base += choice.price_modifier
      }
    }
    return base * quantity
  }

  function canProceedToContact(): boolean {
    if (!item) return false
    for (const group of item.option_groups ?? []) {
      if (group.is_required && !selections[group.id]) return false
    }
    return true
  }

  async function handleSubmitOrder() {
    if (!item || !name.trim()) return
    setSubmitting(true)
    try {
      const total = computeTotal()
      const code  = generateOrderCode()

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id:         user?.id ?? null,
          customer_name:   name.trim(),
          customer_phone:  phone.trim() || null,
          customer_wechat: wechat.trim() || null,
          status:          'pending_payment',
          total_amount:    total,
          order_code:      code,
          notes:           notes.trim() || null,
        })
        .select('id')
        .single()
      if (orderError) throw orderError

      const { data: orderItemData, error: orderItemError } = await supabase
        .from('order_items')
        .insert({ order_id: orderData.id, menu_item_id: item.id, quantity, unit_price: item.price })
        .select('id')
        .single()
      if (orderItemError) throw orderItemError

      const selectionInserts = Object.entries(choiceIds).map(([groupId, choiceId]) => ({
        order_item_id: orderItemData.id,
        group_id: groupId,
        choice_id: choiceId,
        value_zh: selections[groupId],
      }))
      if (selectionInserts.length > 0) {
        await supabase.from('order_item_selections').insert(selectionInserts)
      }

      // Save name/phone/wechat to profile for next time
      if (user) {
        await supabase.from('profiles').update({
          name:   name.trim(),
          phone:  phone.trim() || null,
          wechat: wechat.trim() || null,
        }).eq('id', user.id)
      }

      setOrderCode(code)
      setStep('done')
    } catch (err) {
      console.error(err)
      toast.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  function copyCode() {
    if (!orderCode) return
    navigator.clipboard.writeText(`#${orderCode}`)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    toast.success('已复制订单号')
  }

  function copyPhone() {
    navigator.clipboard.writeText('3093711006')
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
    toast.success('已复制手机号')
  }

  if (loading) return <OrderSkeleton />
  if (!item) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <AlertCircle size={40} className="text-terra-400 mx-auto mb-3" />
        <p className="font-serif text-xl text-brown-700">商品不存在或已下架</p>
        <Link href="/menu" className="btn-outline btn mt-4">← 返回菜单</Link>
      </div>
    </div>
  )

  const total = computeTotal()

  return (
    <div className="page-wrapper">
      <div className="container-narrow py-8 sm:py-12">

        <Link href="/menu" className="inline-flex items-center gap-1 text-brown-500 hover:text-brown-900
                                       text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> 返回菜单
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(['configure', 'contact', 'done'] as const).map((s, i) => {
            const labels = ['选择规格', '联系方式', '付款']
            const current = ['configure', 'contact', 'done'].indexOf(step)
            const active = i === current
            const done   = i < current
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all ${done ? 'bg-matcha-500 text-white' : active ? 'bg-brown-900 text-cream-100' : 'bg-cream-300 text-brown-400'}`}>
                  {done ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-brown-900 font-medium' : 'text-brown-400'}`}>
                  {labels[i]}
                </span>
                {i < 2 && <div className={`w-6 h-px ${done ? 'bg-matcha-500' : 'bg-cream-300'}`} />}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">

            {/* ── STEP: Configure ── */}
            {step === 'configure' && (
              <div className="card p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="heading-sm mb-1">选择规格</h2>
                  <p className="text-xs text-brown-400">Choose your preferences</p>
                </div>

                <div className="flex gap-4 bg-cream-100 rounded-xl p-3">
                  {item.image_url && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                      <Image src={item.image_url} alt={item.name_zh} fill sizes="80px" className="object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="font-serif text-brown-900 font-semibold">{item.name_zh}</p>
                    {item.name_en && <p className="text-xs text-brown-400">{item.name_en}</p>}
                    <p className="text-gold-600 font-semibold mt-1">{formatPrice(item.price)}</p>
                  </div>
                </div>

                {(item.option_groups ?? []).length > 0 && (
                  <div className="space-y-5">
                    {(item.option_groups ?? [])
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(group => (
                      <div key={group.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <label className="label !mb-0">{group.label_zh}</label>
                          {group.label_en && <span className="text-xs text-brown-400">({group.label_en})</span>}
                          {group.is_required && <span className="text-terra-500 text-xs">*必选</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(group.choices ?? [])
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(choice => (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() => {
                                setSelections(s => ({ ...s, [group.id]: choice.value_zh }))
                                setChoiceIds(c => ({ ...c, [group.id]: choice.id }))
                              }}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
                                ${selections[group.id] === choice.value_zh
                                  ? 'border-brown-900 bg-brown-900 text-cream-100'
                                  : 'border-cream-300 text-brown-600 hover:border-brown-400'
                                }`}
                            >
                              {choice.value_zh}
                              {choice.price_modifier !== 0 && (
                                <span className="ml-1 text-[11px] opacity-70">
                                  ({choice.price_modifier > 0 ? '+' : ''}{formatPrice(choice.price_modifier)})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="label">数量 · Quantity</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl border-2 border-cream-300 flex items-center justify-center
                                 text-brown-600 hover:border-brown-700 hover:bg-cream-200 transition-all">
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-serif text-xl font-semibold text-brown-900">{quantity}</span>
                    <button onClick={() => {
                        if (spotsLeft !== null && quantity >= spotsLeft) {
                          toast.error(`最多剩余 ${spotsLeft} 份`); return
                        }
                        setQuantity(q => q + 1)
                      }}
                      className="w-10 h-10 rounded-xl border-2 border-cream-300 flex items-center justify-center
                                 text-brown-600 hover:border-brown-700 hover:bg-cream-200 transition-all">
                      <Plus size={16} />
                    </button>
                    {spotsLeft !== null && (
                      <span className="text-xs text-brown-400 ml-1">（剩余 {spotsLeft} 份）</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">备注（可选） · Special Notes</label>
                  <textarea className="input resize-none h-20"
                    placeholder="如有特殊需求请在此说明..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <button
                  onClick={() => canProceedToContact() ? setStep('contact') : toast.error('请先选择必选项')}
                  className="btn-primary btn w-full">
                  下一步：填写联系方式
                </button>
              </div>
            )}

            {/* ── STEP: Contact ── */}
            {step === 'contact' && (
              <div className="card p-6 sm:p-8 space-y-5">
                <div>
                  <h2 className="heading-sm mb-1">联系方式</h2>
                  <p className="text-xs text-brown-400">Contact information for your order</p>
                </div>

                {!user && (
                  <div className="bg-gold-300/20 border border-gold-400/30 rounded-xl p-4">
                    <p className="text-sm text-gold-700">
                      💡 <Link href="/auth/login" className="font-semibold underline">登录后下单</Link>
                      可以随时查看您的历史订单
                    </p>
                  </div>
                )}

                <div>
                  <label className="label">姓名 · Name <span className="text-terra-500">*</span></label>
                  <input className="input" placeholder="您的姓名（请与Zelle账户姓名一致）"
                    value={name} onChange={e => setName(e.target.value)} />
                  <p className="text-xs text-brown-400 mt-1">⚠️ 请填写与您Zelle账户一致的姓名，用于自动匹配付款</p>
                </div>
                <div>
                  <label className="label">手机号码 · Phone</label>
                  <input className="input" type="tel" placeholder="(xxx) xxx-xxxx"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">微信号 · WeChat ID</label>
                  <input className="input" placeholder="微信号（可选）"
                    value={wechat} onChange={e => setWechat(e.target.value)} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep('configure')} className="btn-outline btn flex-1">
                    ← 上一步
                  </button>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting || !name.trim()}
                    className="btn-gold btn flex-1">
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> 提交中...</>
                      : '确认下单'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: Done — show payment instructions ── */}
            {step === 'done' && orderCode && (
              <div className="space-y-4">
                <div className="card p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-matcha-400/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} className="text-matcha-500" />
                  </div>
                  <h2 className="heading-md">订单已提交！</h2>
                  <p className="text-brown-500 text-sm">请按以下步骤完成付款，系统将自动确认您的订单</p>
                </div>

                {/* Order code — prominently shown */}
                <div className="card p-6 border-2 border-gold-400 bg-amber-50 space-y-4">
                  <p className="font-serif text-brown-900 font-semibold text-lg">💳 Zelle 付款步骤</p>

                  <div className="bg-white rounded-2xl p-4 text-center border border-gold-300">
                    <p className="text-xs text-brown-400 mb-1">您的订单号（备注必填）</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono text-4xl font-bold text-brown-900 tracking-widest">
                        #{orderCode}
                      </span>
                      <button onClick={copyCode}
                        className="p-2 rounded-xl bg-cream-200 hover:bg-cream-300 text-brown-600 transition-colors">
                        {copiedCode ? <Check size={16} className="text-matcha-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <ol className="space-y-3 text-sm text-brown-700">
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>打开银行 App 或 Zelle</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div className="flex-1">
                        <span>向以下手机号转 </span>
                        <strong className="text-brown-900">{formatPrice(total)}</strong>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="bg-cream-200 px-3 py-1.5 rounded-lg text-brown-900 font-mono text-sm">
                            3093711006 · Lin Zhou
                          </code>
                          <button onClick={copyPhone}
                            className="p-1.5 rounded-lg bg-cream-200 hover:bg-cream-300 text-brown-600 transition-colors">
                            {copiedPhone ? <Check size={14} className="text-matcha-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <div>
                        <strong>备注（memo/note）填写：</strong>
                        <span className="ml-1 font-mono bg-cream-200 px-2 py-0.5 rounded-lg text-brown-900">#{orderCode}</span>
                        <p className="text-xs text-terra-600 mt-1">⚠️ 备注不填写可能导致订单无法自动确认</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>付款完成后系统将自动确认，通常在30分钟内</span>
                    </li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/account/orders" className="btn-primary btn flex-1 justify-center">查看我的订单</Link>
                  <Link href="/menu" className="btn-outline btn flex-1 justify-center">继续浏览菜单</Link>
                </div>
              </div>
            )}
          </div>

          {/* Right: order summary */}
          {step !== 'done' && (
            <div className="lg:col-span-2">
              <div className="card p-5 sticky top-24">
                <h3 className="font-serif text-lg text-brown-900 mb-4 pb-3 border-b border-cream-200">订单摘要</h3>

                {item.image_url && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4">
                    <Image src={item.image_url} alt={item.name_zh} fill sizes="300px" className="object-cover" />
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-brown-600">{item.name_zh}</span>
                    <span className="text-brown-900 font-medium">{formatPrice(item.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-brown-500">
                    <span>数量</span><span>×{quantity}</span>
                  </div>
                  {Object.entries(selections).map(([groupId, value]) => {
                    const group = item.option_groups?.find(g => g.id === groupId)
                    return group ? (
                      <div key={groupId} className="flex justify-between text-xs text-brown-400">
                        <span>{group.label_zh}</span><span>{value}</span>
                      </div>
                    ) : null
                  })}
                </div>

                {item.available_date && (
                  <div className="text-xs text-brown-400 bg-cream-100 rounded-lg p-2.5 mb-4">
                    📅 {formatDate(item.available_date)} · 出餐当日 11:50–13:00
                    <br />📍 Tech楼对面 / 网球场旁停车场
                  </div>
                )}

                <div className="border-t border-cream-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-brown-800">总计</span>
                    <span className="font-serif text-2xl font-bold text-brown-900">{formatPrice(total)}</span>
                  </div>
                  <p className="text-[11px] text-brown-400 mt-1">付款方式：Zelle（下单后付款）</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderSkeleton() {
  return (
    <div className="page-wrapper">
      <div className="container-narrow py-12 space-y-4">
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-64 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    </div>
  )
}
