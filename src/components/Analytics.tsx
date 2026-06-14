'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    va?: (event: string, properties?: Record<string, unknown>) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function AnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    // GA4 page_view
    if (GA_ID && typeof window.gtag === 'function') {
      window.gtag('config', GA_ID, { page_path: url })
    }
    // Vercel Analytics page_view
    if (typeof window.va === 'function') {
      window.va('pageview', { path: url })
    }
  }, [pathname, searchParams])

  return null
}

export function Analytics() {
  return (
    <>
      {/* Google Analytics 4 — ativo somente se GA_ID estiver configurado */}
      {GA_ID && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`
            }}
          />
        </>
      )}
      {/* Vercel Analytics — carregado automaticamente pelo runtime Vercel */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              if(typeof window==='undefined')return;
              var s=document.createElement('script');
              s.defer=true;
              s.src='/_vercel/insights/script.js';
              s.onerror=function(){};
              document.head.appendChild(s);
            })();
          `
        }}
      />
      <Suspense fallback={null}>
        <AnalyticsInner />
      </Suspense>
    </>
  )
}

// Helpers compatíveis com a lib analytics.ts
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, { event_category: category, event_label: label, value })
  }
  if (typeof window.va === 'function') {
    window.va('event', { name: action, category: category, label, value })
  }
}

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

