'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Menu, X, ShoppingBag, User, LogOut, ChefHat } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { href: '/menu',    label: '本周菜单',  en: 'Menu'    },
  { href: '/poll',    label: '投票点餐',  en: 'Poll'    },
]

export function Header() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  const [user,      setUser]      = useState<SupabaseUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled,  setScrolled]  = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const admin = isAdmin(user?.email)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-cream-200'
          : 'bg-cream-100/80 backdrop-blur-sm'
      )}
    >
      <div className="container-wide">
        <div className="flex items-center justify-between h-16 sm:h-18">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-brown-900 flex items-center justify-center
                            group-hover:bg-gold-500 transition-colors duration-300 shadow-sm">
              <span className="text-cream-100 font-serif font-bold text-base leading-none">林</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-serif text-brown-900 font-semibold text-base leading-tight
                             group-hover:text-gold-600 transition-colors">
                Lin Dough
              </p>
              <p className="text-brown-400 text-xs leading-tight tracking-wider">HANDMADE</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname === link.href
                    ? 'bg-brown-900 text-cream-100'
                    : 'text-brown-600 hover:text-brown-900 hover:bg-cream-200'
                )}
              >
                <span>{link.label}</span>
                <span className="text-[10px] opacity-60">{link.en}</span>
              </Link>
            ))}

            {admin && (
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname.startsWith('/admin')
                    ? 'bg-gold-500 text-white'
                    : 'text-gold-600 hover:bg-gold-300/20'
                )}
              >
                <ChefHat size={14} />
                后台管理
              </Link>
            )}
          </nav>

          {/* Right: auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link href="/account/orders" className="btn-ghost btn flex items-center gap-2">
                  <ShoppingBag size={16} />
                  <span className="text-sm">我的订单</span>
                </Link>
                <Link href="/account" className="btn-ghost btn flex items-center gap-2">
                  <User size={16} />
                  <span className="text-sm max-w-[80px] truncate">
                    {user.user_metadata?.name || user.email?.split('@')[0]}
                  </span>
                </Link>
                <button onClick={handleSignOut} className="btn-ghost btn p-2" title="退出">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="btn-primary btn btn-sm">
                登录 / 注册
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-brown-700 hover:bg-cream-200 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-cream-200 bg-white/98 backdrop-blur-sm pb-4 animate-fade-in">
          <nav className="container-wide pt-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors',
                  pathname === link.href
                    ? 'bg-brown-900 text-cream-100'
                    : 'text-brown-700 hover:bg-cream-200'
                )}
              >
                <span className="font-medium">{link.label}</span>
                <span className="text-xs opacity-60">{link.en}</span>
              </Link>
            ))}

            {admin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-gold-600 hover:bg-gold-300/10"
              >
                <ChefHat size={14} />
                后台管理
              </Link>
            )}

            <div className="divider !my-3" />

            {user ? (
              <>
                <Link href="/account/orders" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-brown-700 hover:bg-cream-200">
                  <ShoppingBag size={15} /> 我的订单
                </Link>
                <Link href="/account" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-brown-700 hover:bg-cream-200">
                  <User size={15} /> 个人设置
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-brown-500 hover:bg-cream-200 w-full text-left">
                  <LogOut size={15} /> 退出登录
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="btn-primary btn w-full justify-center mt-2">
                登录 / 注册
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
