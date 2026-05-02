'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/utils'
import { Loader2, CheckCircle2, Link2, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Script from 'next/script'

declare global {
  interface Window {
    Plaid: {
      create: (config: {
        token: string
        onSuccess: (public_token: string, metadata: PlaidMetadata) => void
        onExit: (err: unknown) => void
      }) => { open: () => void }
    }
  }
}

interface PlaidMetadata {
  institution?: { name: string }
  accounts?: Array<{ id: string; name: string; type: string }>
}

interface PlaidConfig {
  institution: string | null
  account_name: string | null
  created_at: string
}

export default function AdminPlaidPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [checking,    setChecking]    = useState(true)
  const [connected,   setConnected]   = useState(false)
  const [config,      setConfig]      = useState<PlaidConfig | null>(null)
  const [connecting,  setConnecting]  = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [plaidLoaded, setPlaidLoaded] = useState(false)

  const loadStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) { router.push('/'); return }

    // Check if bank is connected by calling our API
    const res = await fetch('/api/plaid/status')
    if (res.ok) {
      const data = await res.json()
      setConnected(data.connected)
      setConfig(data.config || null)
    }
    setChecking(false)
  }, [router, supabase])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function handleConnect() {
    if (!plaidLoaded) { toast.error('Plaid 正在加载，请稍候'); return }
    setConnecting(true)
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const { link_token, error } = await res.json()
      if (error || !link_token) throw new Error(error || 'No link token')

      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string, metadata: PlaidMetadata) => {
          const account = metadata.accounts?.[0]
          const exchangeRes = await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_token,
              institution:  metadata.institution?.name,
              account_id:   account?.id,
              account_name: account?.name,
            }),
          })
          const result = await exchangeRes.json()
          if (exchangeRes.ok) {
            toast.success(`已连接 ${result.institution || '银行账户'}`)
            await loadStatus()
          } else {
            toast.error(result.error || '连接失败')
          }
          setConnecting(false)
        },
        onExit: () => setConnecting(false),
      })
      handler.open()
    } catch (err) {
      console.error(err)
      toast.error('无法启动银行连接')
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res  = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) toast.success(data.message || `匹配到 ${data.matched} 笔付款`)
      else        toast.error(data.error || '同步失败')
    } catch {
      toast.error('同步失败')
    } finally {
      setSyncing(false)
    }
  }

  if (checking) return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-gold-500" />
    </div>
  )

  return (
    <>
      <Script
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        onLoad={() => setPlaidLoaded(true)}
      />

      <div className="page-wrapper">
        <div className="bg-brown-900 py-10">
          <div className="container-wide">
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-1">Admin</p>
            <h1 className="font-serif text-3xl text-cream-100">Plaid 银行连接</h1>
            <p className="text-cream-300 text-sm mt-1 opacity-70">连接您的银行账户以自动匹配 Zelle 付款</p>
          </div>
        </div>

        <div className="container-narrow py-10 space-y-6">

          {/* Status card */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                ${connected ? 'bg-matcha-400/20' : 'bg-cream-200'}`}>
                {connected
                  ? <CheckCircle2 size={24} className="text-matcha-500" />
                  : <Link2 size={24} className="text-brown-400" />
                }
              </div>
              <div>
                <h2 className="font-serif text-xl text-brown-900">
                  {connected ? '银行已连接' : '未连接银行账户'}
                </h2>
                {config && (
                  <p className="text-sm text-brown-500">
                    {config.institution} · {config.account_name}
                    <span className="text-brown-300 ml-2">
                      · 连接于 {new Date(config.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {connected ? (
              <div className="space-y-3">
                <button onClick={handleSync} disabled={syncing}
                  className="btn-primary btn flex items-center gap-2">
                  {syncing
                    ? <><Loader2 size={16} className="animate-spin" /> 同步中...</>
                    : <><RefreshCw size={16} /> 立即同步 Zelle 付款</>
                  }
                </button>
                <p className="text-xs text-brown-400">
                  Plaid 会通过 webhook 自动同步新交易，也可手动触发同步
                </p>
                <button onClick={handleConnect} disabled={connecting || !plaidLoaded}
                  className="btn-outline btn btn-sm text-xs">
                  重新连接 / 更换账户
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-gold-200 rounded-xl p-4">
                  <div className="flex gap-2">
                    <AlertCircle size={16} className="text-gold-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-brown-700 space-y-1">
                      <p>连接后，Plaid 将自动检测您银行账户中的 Zelle 转账，并匹配到对应订单。</p>
                      <p className="text-xs text-brown-500">支持 Chase、Bank of America、US Bank 等主流银行。</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleConnect} disabled={connecting || !plaidLoaded}
                  className="btn-gold btn flex items-center gap-2">
                  {connecting
                    ? <><Loader2 size={16} className="animate-spin" /> 连接中...</>
                    : <><Link2 size={16} /> 连接银行账户</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-brown-900 mb-4">工作原理</h3>
            <ol className="space-y-3 text-sm text-brown-600">
              {[
                '客户下单后，系统生成唯一订单号（如 #K7M2）',
                '客户 Zelle 转账时，在备注填写订单号',
                'Plaid 检测到入账转账，读取备注中的订单号',
                '系统自动将订单状态更新为"已确认"',
                '备注不清晰时，系统回退到姓名+金额匹配',
                '无法匹配时，订单保持"待付款"，您可手动确认',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-brown-900 text-cream-100 text-xs
                                   flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}
