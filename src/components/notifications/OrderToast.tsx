'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, X, ExternalLink, Package } from 'lucide-react';
import Link from 'next/link';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useAuthStore } from '@/stores/authStore';

function formatPrice(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function OrderToast() {
  const { user } = useAuthStore();
  const { newOrderAlert, dismissAlert } = useRealtimeOrders('seller');
  const [visible, setVisible] = useState(false);

  // Só mostra para vendedores (quem tem produtos)
  useEffect(() => {
    if (newOrderAlert) setVisible(true);
  }, [newOrderAlert]);

  if (!user || !newOrderAlert || !visible) return null;

  const { order } = newOrderAlert;
  const productTitle = order.product?.title || 'Produto';
  const buyerName = (order.buyer as any)?.name || 'Comprador';
  const imageUrl = order.product?.images?.[0]?.url;

  function handleDismiss() {
    setVisible(false);
    setTimeout(dismissAlert, 300);
  }

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] w-80 transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-1 bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white/60 origin-left"
            style={{ animation: 'shrink-x-order 8s linear forwards' }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">🎉 Nova venda!</p>
                <p className="text-emerald-100 text-xs">{buyerName} acabou de comprar</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Produto */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-2.5 mb-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={productTitle}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-white/70" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm line-clamp-2 leading-tight">{productTitle}</p>
              <p className="text-emerald-200 text-sm font-bold mt-0.5">{formatPrice(order.amount)}</p>
            </div>
          </div>

          {/* Ação */}
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard?tab=orders`}
              onClick={handleDismiss}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white text-emerald-700
                         font-semibold text-xs py-2 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver pedido
            </Link>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 bg-white/20 text-white font-medium text-xs rounded-xl
                         hover:bg-white/30 transition-colors"
            >
              Dispensar
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink-x-order {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
