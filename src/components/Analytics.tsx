'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function AnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_ID) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    window.gtag('config', GA_ID, { page_path: url })
  }, [pathname, searchParams])

  return null
}

export function Analytics() {
  if (!GA_ID) return null

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`
        }}
      />
      <Suspense fallback={null}>
        <AnalyticsInner />
      </Suspense>
    </>
  )
}

// Event tracking helper
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value
    })
  }
}

// Predefined events
export const events = {
  viewProduct: (id: string, name: string) => trackEvent('view_item', 'product', name),
  addToCart: (id: string, price: number) => trackEvent('add_to_cart', 'ecommerce', id, price),
  purchase: (orderId: string, total: number) => trackEvent('purchase', 'ecommerce', orderId, total),
  search: (query: string) => trackEvent('search', 'engagement', query),
  signup: (method: string) => trackEvent('sign_up', 'auth', method),
  login: (method: string) => trackEvent('login', 'auth', method),
  startChat: (sellerId: string) => trackEvent('start_chat', 'engagement', sellerId),
  createListing: (category: string) => trackEvent('create_listing', 'seller', category),
  shareProduct: (id: string) => trackEvent('share', 'engagement', id),
}
