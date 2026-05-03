'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Store, Package, Truck, CheckCircle, Clock, Loader2, Star } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useReviews } from '@/hooks/useReviews';
import { MOCK_PRODUCTS } from '@/lib/constants';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import type { Order, Product } from '@/types';

const deliveryStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Aguardando', color: 'bg-amber-50 text-amber-600', icon: Clock },
  in_transit: { label: 'Em trânsito', color: 'bg-brand-blue/10 text-brand-blue', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-emerald-50 text-emerald-600', icon: Package },
  confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pagamento pendente', color: 'text-amber-500' },
  paid: { label: 'Pago', color: 'text-emerald-600' },
  held: { label: 'Retido', color: 'text-brand-blue' },
  released: { label: 'Liberado', color: 'text-emerald-600' },
  refunded: { label: 'Reembolsado', color: 'text-gray-500' },
  failed: { label: 'Falhou', color: 'text-red-500' },
};

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

function ReviewModal({ order, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg mb-4">Avaliar compra</h3>
        <div className="flex justify-center mb-4">
          <StarRating rating={rating} size="lg" interactive onChange={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte sua experiência..."
          className="input-field w-full h-24 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { onSubmit(rating, comment); onClose(); }}
            className="btn-primary flex-1"
          >
            Enviar avaliação
          </button>
        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  type: 'purchase' | 'sale';
  onConfirmDelivery: (orderId: string) => void;
  onReview: (order: Order) => void;
}

function OrderCard({ order, type, onConfirmDelivery, onReview }: OrderCardProps) {
  const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
  const image = product?.images?.[0]?.url || product?.video_thumbnail || '';
  const title = product?.title || 'Produto';
  const deliveryStatus = deliveryStatusConfig[order.delivery_status] || deliveryStatusConfig.pending;
  const paymentStatus = paymentStatusConfig[order.payment_status] || paymentStatusConfig.pending;
  const DeliveryIcon = deliveryStatus.icon;

  return (
    <div className="card-elevated p-4 animate-slide-up">
      <div className="flex gap-3">
        {/* Product image */}
        <div
          className="w-16 h-16 rounded-2xl bg-cover bg-center flex-shrink-0 bg-gray-100"
          style={image ? { backgroundImage: `url(${image})` } : {}}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-gray-900 truncate">{title}</p>
          <p className={`text-xs font-medium mt-0.5 ${paymentStatus.color}`}>
            {paymentStatus.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(order.created_at)}</p>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <span className="font-display font-bold text-brand-purple">
            {formatPrice(order.gross_value)}
          </span>
          {order.donation_value > 0 && (
            <span className="text-[10px] text-emerald-600 block">
              +{formatPrice(order.donation_value)} doado
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mt-3">
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${deliveryStatus.color}`}>
          <DeliveryIcon className="w-3.5 h-3.5" />
          {deliveryStatus.label}
        </span>
        <span className="text-xs text-gray-400">
          {order.delivery_type === 'local_pickup' ? 'Retirada local' : 'Entrega parceiro'}
        </span>
      </div>

      {/* Actions */}
      {type === 'purchase' && (
        <div className="flex gap-2 mt-3">
          {order.delivery_status === 'delivered' && !order.buyer_confirmed && (
            <button
              onClick={() => onConfirmDelivery(order.id)}
              className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Confirmar entrega
            </button>
          )}
          {order.delivery_status === 'confirmed' && (
            <button
              onClick={() => onReview(order)}
              className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1.5"
            >
              <Star className="w-4 h-4" /> Avaliar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [tab, setTab] = useState<'purchases' | 'sales'>('purchases');
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const { orders, sales, loading, getMyOrders, getMySales, confirmDelivery } = useOrders();
  const { createReview } = useReviews();

  useEffect(() => {
    getMyOrders();
    getMySales();
  }, [getMyOrders, getMySales]);

  const handleConfirmDelivery = async (orderId: string) => {
    await confirmDelivery(orderId);
  };

  const handleReview = async (rating: number, comment: string) => {
    if (!reviewOrder) return;
    const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === reviewOrder.product_id);
    await createReview({
      orderId: reviewOrder.id,
      reviewedId: reviewOrder.seller_id,
      productId: reviewOrder.product_id,
      rating,
      comment,
    });
  };

  const currentList = tab === 'purchases' ? orders : sales;

  return (
    <>
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmit={handleReview}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display font-bold text-xl text-gray-900 mb-5">Meus Pedidos</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'purchases' as const, label: 'Compras', icon: ShoppingBag },
            { id: 'sales' as const, label: 'Vendas', icon: Store },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-display">
              {tab === 'purchases' ? 'Nenhuma compra ainda' : 'Nenhuma venda ainda'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                type={tab === 'purchases' ? 'purchase' : 'sale'}
                onConfirmDelivery={handleConfirmDelivery}
                onReview={setReviewOrder}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
