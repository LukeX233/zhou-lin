import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'M月d日 EEEE', { locale: zhCN })
}

export function formatDateEN(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d')
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function getSpotsLeft(capacity: number | null, ordersCount: number): number | null {
  if (capacity === null) return null
  return Math.max(0, capacity - ordersCount)
}

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim())
  return adminEmails.includes(email)
}

export const ORDER_STATUS_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  pending_payment: { zh: '待付款',  en: 'Pending Payment', color: 'text-gold-600 bg-gold-300/20' },
  confirmed:       { zh: '已确认',  en: 'Confirmed',       color: 'text-matcha-600 bg-matcha-400/20' },
  ready:           { zh: '可取餐',  en: 'Ready',           color: 'text-matcha-500 bg-matcha-400/30' },
  completed:       { zh: '已完成',  en: 'Completed',       color: 'text-brown-400 bg-brown-100' },
  cancelled:       { zh: '已取消',  en: 'Cancelled',       color: 'text-terra-500 bg-terra-400/20' },
}
