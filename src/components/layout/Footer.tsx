import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-brown-900 text-cream-200">
      <div className="container-wide py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-lg leading-none">林</span>
              </div>
              <div>
                <p className="font-serif text-cream-100 font-semibold text-lg leading-tight">Lin Dough</p>
                <p className="text-cream-300 text-xs tracking-widest opacity-70">HANDMADE</p>
              </div>
            </div>
            <p className="text-cream-300 text-sm leading-relaxed opacity-80 max-w-xs">
              芝加哥地区手工烘焙与家常美食，每周新鲜制作，满怀对食物的热爱。
            </p>
            <p className="text-cream-300 text-sm opacity-70">
              Artisan baked goods & home-style dishes, made fresh each week with love.
            </p>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h4 className="font-serif text-cream-100 text-lg">取餐信息</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-cream-300 opacity-80">
                <MapPin size={15} className="mt-0.5 text-gold-400 shrink-0" />
                <span>Tech楼对面 / 网球场旁边的停车场<br />每周三、四、五 · 11:50–12:00</span>
              </div>
            </div>
          </div>

          {/* Links & Contact */}
          <div className="space-y-4">
            <h4 className="font-serif text-cream-100 text-lg">联系方式</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-cream-300 opacity-80">
                <MessageCircle size={15} className="text-gold-400" />
                微信：Sixiangdepaomachang
              </div>
              <div className="flex items-center gap-2.5 text-sm text-cream-300 opacity-80">
                <span className="text-gold-400 text-xs font-bold">Z</span>
                Zelle / Venmo：3093711006 · Lin Zhou
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-cream-300 opacity-50 leading-relaxed">
                Licensed IL Cottage Food Operation.<br />
                All items made in a home kitchen.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-brown-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cream-300 opacity-40">
            © {new Date().getFullYear()} Lin Dough Handmade. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/menu"  className="text-xs text-cream-300 opacity-40 hover:opacity-80 transition-opacity">菜单</Link>
            <Link href="/poll"  className="text-xs text-cream-300 opacity-40 hover:opacity-80 transition-opacity">投票</Link>
            <Link href="/auth/login" className="text-xs text-cream-300 opacity-40 hover:opacity-80 transition-opacity">登录</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
