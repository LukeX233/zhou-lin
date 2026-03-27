'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Phone, MessageCircle, Save, Loader2, ShoppingBag, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function AccountPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [user,    setUser]    = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [wechat,  setWechat]  = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth/login?redirect=/account'); return }
      setUser(u)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, wechat')
        .eq('id', u.id)
        .maybeSingle()

      if (profile) {
        setName(profile.name ?? '')
        setPhone(profile.phone ?? '')
        setWechat(profile.wechat ?? '')
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim() || null,
          phone: phone.trim() || null,
          wechat: wechat.trim() || null,
        })
      if (error) throw error
      toast.success('信息已更新！')
    } catch {
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container-narrow py-10 sm:py-14">
        <h1 className="heading-lg mb-8">个人设置</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            <div className="card p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-brown-900 flex items-center justify-center mx-auto mb-3">
                <span className="text-cream-100 font-serif text-2xl font-bold">
                  {name ? name[0] : user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <p className="font-serif text-brown-900 font-semibold">{name || '未设置姓名'}</p>
              <p className="text-xs text-brown-400 mt-0.5">{user?.email}</p>
            </div>

            <Link href="/account/orders"
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-brown-700
                         hover:bg-cream-200 transition-colors">
              <ShoppingBag size={15} /> 我的订单
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-brown-400
                         hover:bg-cream-200 transition-colors w-full text-left">
              <LogOut size={15} /> 退出登录
            </button>
          </div>

          {/* Form */}
          <div className="sm:col-span-2">
            <div className="card p-6 sm:p-8">
              <h2 className="font-serif text-xl text-brown-900 mb-6">基本信息</h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="label">
                    <span className="flex items-center gap-1.5">
                      <User size={13} /> 姓名 · Name
                    </span>
                  </label>
                  <input
                    className="input"
                    placeholder="您的姓名（下单时会自动填入）"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} /> 手机号码 · Phone
                    </span>
                  </label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="(xxx) xxx-xxxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={13} /> 微信号 · WeChat ID
                    </span>
                  </label>
                  <input
                    className="input"
                    placeholder="您的微信号"
                    value={wechat}
                    onChange={e => setWechat(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={saving} className="btn-primary btn">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> 保存中...</> : <><Save size={14} /> 保存更改</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
