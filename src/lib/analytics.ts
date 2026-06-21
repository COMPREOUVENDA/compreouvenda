'use client';

/**
 * src/lib/analytics.ts
 * Rastreamento de eventos de conversão — compatível com Vercel Analytics
 * e Google Analytics 4 (via gtag). Usa apenas APIs do navegador, sem dependências extras.
 *
 * Eventos rastreados:
 *   product_view       — usuário visualizou um produto
 *   product_favorite   — usuário favoritou um produto
 *   listing_created    — vendedor publicou um anúncio
 *   checkout_start     — usuário iniciou o checkout
 *   purchase_complete  — pagamento confirmado
 *   search             — usuário realizou uma busca
 *   chat_start         — usuário abriu o chat com vendedor
 *   push_subscribed    — usuário ativou notificações push
 *   share_product      — usuário compartilhou um produto
 */

export type AnalyticsEvent =
  | 'product_view'
  | 'product_favorite'
  | 'listing_created'
  | 'checkout_start'
  | 'purchase_complete'
  | 'search'
  | 'chat_start'
  | 'push_subscribed'
  | 'share_product'
  | string;

export interface EventProperties {
  product_id?: string;
  product_title?: string;
  category?: string;
  price?: number;
  query?: string;
  payment_method?: string;
  value?: number;
  currency?: string;
  [key: string]: string | number | boolean | undefined;
}

declare global {
  interface Window {
    va?: (event: string, properties?: Record<string, unknown>) => void;
  }
}

/**
 * Registra um evento de analytics.
 * Envia para Vercel Analytics (va) e/ou Google Analytics 4 (gtag) se disponíveis.
 */
export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;

  // Vercel Analytics
  if (typeof window.va === 'function') {
    window.va('event', { name: event, ...properties });
  }

  // Google Analytics 4
  if (typeof (window as Window & { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
    (window as Window & { gtag: (...args: unknown[]) => void }).gtag('event', event, {
      event_category: 'engajamento',
      currency: 'BRL',
      ...properties,
    });
  }

  // Ambiente de desenvolvimento: exibe no console
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, properties);
  }
}

/** Registra uma visualização de página manualmente (útil em navegações SPA) */
export function pageView(path: string): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === 'function') {
    w.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '', {
      page_path: path,
    });
  }
}

/** Registra evento de compra no e-commerce (schema GA4) */
export function trackPurchase(params: {
  transactionId: string;
  productId: string;
  productTitle: string;
  value: number;
  category?: string;
}): void {
  track('purchase_complete', {
    product_id: params.productId,
    product_title: params.productTitle,
    value: params.value,
    currency: 'BRL',
    category: params.category,
  });

  if (typeof (window as Window & { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
    (window as Window & { gtag: (...args: unknown[]) => void }).gtag('event', 'purchase', {
      transaction_id: params.transactionId,
      value: params.value,
      currency: 'BRL',
      items: [
        {
          item_id: params.productId,
          item_name: params.productTitle,
          item_category: params.category ?? 'marketplace',
          price: params.value,
          quantity: 1,
        },
      ],
    });
  }
}
