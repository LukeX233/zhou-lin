'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/'
  const supabase     = createClient()
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=${redirectTo}`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      toast.error((err as Error).message || '登录失败，请重试')
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
          sizes="50vw"
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
                <span className="text-cream-100 font-serif font-bold text-lg">琳</span>
              </div>
              <div>
                <p className="font-serif text-brown-900 font-semibold leading-tight">Lin Dough Handmade</p>
                <p className="text-brown-400 text-xs">琳记手工</p>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="font-serif text-3xl text-brown-900 mb-1">登录 / 注册</h1>
            <p className="text-brown-500 text-sm">Sign in or create an account</p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl
                       border-2 border-cream-300 bg-white hover:border-brown-300 hover:shadow-md
                       transition-all text-brown-800 font-medium text-sm"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-brown-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.3-10.5 7.3-17.5z" fill="#4285F4"/>
                <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.2 1.5-5 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z" fill="#34A853"/>
                <path d="M10.8 28.8A14.8 14.8 0 0 1 10 24c0-1.7.3-3.3.8-4.8v-6.2H2.7A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.8l8.1-6z" fill="#FBBC05"/>
                <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.7 5.2 2.7 13.2l8.1 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? '跳转中...' : '使用 Google 账号登录'}
          </button>

          <p className="text-center text-xs text-brown-400 leading-relaxed">
            点击后将跳转至 Google 完成登录。<br />
            <span className="opacity-70">You&apos;ll be redirected to Google to sign in.</span>
          </p>

        </div>
      </div>
    </div>
  )
}
