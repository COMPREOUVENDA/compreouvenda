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

function AnalyticsInterno() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Registra visualização de página no GA4
    if (GA_ID && typeof window.gtag === 'function') {
      window.gtag('config', GA_ID, { page_path: url })
    }

    // Registra visualização de página no Vercel Analytics
    if (typeof window.va === 'function') {
      window.va('pageview', { path: url })
    }
  }, [pathname, searchParams])

  return null
}

export function Analytics() {
  return (
    <>
      {/* Google Analytics 4 — ativo somente se NEXT_PUBLIC_GA_ID estiver configurado */}
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
      {/* Vercel Analytics — carregado automaticamente pelo runtime da Vercel */}
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
        <AnalyticsInterno />
      </Suspense>
    </>
  )
}

// Função auxiliar para rastreamento de eventos
export function trackEvent(acao: string, categoria: string, rotulo?: string, valor?: number) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') {
    window.gtag('event', acao, { event_category: categoria, event_label: rotulo, value: valor })
  }
  if (typeof window.va === 'function') {
    window.va('event', { name: acao, category: categoria, label: rotulo, value: valor })
  }
}

// Eventos predefinidos do marketplace
export const eventos = {
  verProduto:         (id: string, nome: string)        => trackEvent('view_item',      'produto',      nome),
  adicionarCarrinho:  (id: string, preco: number)       => trackEvent('add_to_cart',    'ecommerce',    id, preco),
  compra:             (pedidoId: string, total: number)  => trackEvent('purchase',       'ecommerce',    pedidoId, total),
  busca:              (termo: string)                    => trackEvent('search',          'engajamento',  termo),
  cadastro:           (metodo: string)                   => trackEvent('sign_up',         'autenticacao', metodo),
  login:              (metodo: string)                   => trackEvent('login',           'autenticacao', metodo),
  iniciarChat:        (vendedorId: string)               => trackEvent('start_chat',      'engajamento',  vendedorId),
  criarAnuncio:       (categoria: string)                => trackEvent('create_listing',  'vendedor',     categoria),
  compartilharProduto:(id: string)                       => trackEvent('share',           'engajamento',  id),
}
