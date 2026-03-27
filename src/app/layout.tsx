import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: {
    default: 'Lin Dough Handmade · 林记手工',
    template: '%s · Lin Dough Handmade',
  },
  description: '芝加哥手工烘焙与家常美食 · Artisan baked goods & home-style dishes in the Chicago area.',
  keywords: ['home bakery', 'handmade', 'Chinese bakery', 'Chicago', '手工烘焙', '家常菜'],
  openGraph: {
    siteName: 'Lin Dough Handmade',
    locale: 'zh_CN',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <div className="flex flex-col min-h-screen bg-cream-100">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#2C1507',
              color: '#FAF7F0',
              borderRadius: '12px',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#C17F24', secondary: '#FAF7F0' } },
            error:   { iconTheme: { primary: '#A84832', secondary: '#FAF7F0' } },
          }}
        />
      </body>
    </html>
  )
}
