'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/'
  const supabase     = createClient()

  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=${redirectTo}`,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      toast.error((err as Error).message || '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper min-h-[calc(100vh-64px)] flex">
      {/* Left: image (desktop only) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <Image
          src="/images/sponge-cake.jpg"
          alt="Lin Dough Handmade"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brown-900/60 to-transparent" />
        <div className="absolute bottom-12 left-10 text-cream-100 max-w-xs">
          <p className="font-serif text-3xl font-medium leading-snug mb-2">
            &ldquo;每一口都是用心做的&rdquo;
          </p>
          <p className="text-cream-300 text-sm opacity-80">
            — Lin Dough Handmade
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo + back */}
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-brown-500 hover:text-brown-900 text-sm mb-6 transition-colors">
              <ChevronLeft size={16} /> 返回首页
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-brown-900 flex items-center justify-center">
                <span className="text-cream-100 font-serif font-bold text-lg">林</span>
              </div>
              <div>
                <p className="font-serif text-brown-900 font-semibold leading-tight">Lin Dough Handmade</p>
                <p className="text-brown-400 text-xs">林记手工</p>
              </div>
            </div>
          </div>

          {!sent ? (
            <>
              <div>
                <h1 className="font-serif text-3xl text-brown-900 mb-1">登录 / 注册</h1>
                <p className="text-brown-500 text-sm">Sign in or create an account</p>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="label">邮箱地址 · Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400" />
                    <input
                      type="email"
                      required
                      className="input pl-10"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary btn w-full"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> 发送中...</>
                  ) : '发送登录链接'}
                </button>
              </form>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-cream-300" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-cream-100 px-3 text-xs text-brown-400">无需设置密码</span>
                  </div>
                </div>
                <p className="text-center text-xs text-brown-400 leading-relaxed">
                  我们会向您的邮箱发送一个登录链接。<br />
                  点击链接即可完成登录，无需记忆密码。<br />
                  <span className="opacity-70">A magic link will be sent to your email.</span>
                </p>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-matcha-400/20 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-matcha-500" />
              </div>
              <h2 className="font-serif text-2xl text-brown-900">邮件已发送！</h2>
              <p className="text-brown-500 text-sm leading-relaxed">
                请检查您的邮箱 <strong className="text-brown-800">{email}</strong><br />
                点击邮件中的链接完成登录。
              </p>
              <p className="text-xs text-brown-400">
                Check your inbox for the magic link.<br />
                If you don&apos;t see it, check your spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="btn-ghost btn text-sm"
              >
                重新发送 / Try different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
