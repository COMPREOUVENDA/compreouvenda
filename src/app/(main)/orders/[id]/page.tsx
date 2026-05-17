'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Package, User, MapPin, CreditCard,
  Truck, CheckCircle2, AlertTriangle, Loader2,
  ReceiptText, ShieldCheck,
} from 'lucide-react';
import EscrowStatusTracker from '@/components/escrow/EscrowStatusTracker';
import QRScanner from '@/components/escrow/QRScanner';
import DisputeForm from '@/components/escrow/DisputeForm';
import EscrowQRDisplay from '@/components/escrow/EscrowQRDisplay';
import type { EscrowStatus } from '@/lib/escrow';

interface OrderDetail {
  id: string;
  buyer_id: string;
  seller_id: string;
  gross_value: number;
  payment_status: string;
  escrow_status: EscrowStatus;
  tracking_code: string | null;
  carrier: string | null;
  created_at: string;
  product: {
    id: string;
    title: string;
    price: number;
    city: string | null;
    state: string | null;
    product_images: { url: string }[];
  };
  buyer: { id: string; name: string; avatar_url: string | null };
  seller: { id: string; name: string; avatar_url: string | null };
}

interface EscrowData {
  id: string;
  amount: number;
  status: EscrowStatus;
  held_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  auto_release_at: string | null;
  qr_payload_encrypted: string | null;
  qr_expires_at: string | null;
  qr_used: boolean;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [carrier, setCarrier] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
    if (profile) setCurrentUserId(profile.id);

    const { data: orderData } = await supabase
      .from('orders')
      .select(`
        id, buyer_id, seller_id, gross_value, payment_status, escrow_status,
        tracking_code, carrier, created_at,
        product:products(id, title, price, city, state, product_images(url)),
        buyer:users!orders_buyer_id_fkey(id, name, avatar_url),
        seller:users!orders_seller_id_fkey(id, name, avatar_url)
      `)
      .eq('id', orderId)
      .single();

    if (orderData) {
      setOrder(orderData as unknown as OrderDetail);
      if (profile) {
        setRole(orderData.buyer_id === profile.id ? 'buyer' : orderData.seller_id === profile.id ? 'seller' : null);
      }
    }

    const { data: escrowData } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (escrowData) setEscrow(escrowData as EscrowData);

    setLoading(false);
  }, [orderId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkShipped = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/escrow/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingCode: trackingCode || undefined, carrier: carrier || undefined }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) showToast(json.error ?? 'Erro', 'error');
      else { showToast('Envio registrado!', 'success'); await fetchData(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setActionLoading(false);
  };

  const handleMarkDelivered = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/escrow/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) showToast(json.error ?? 'Erro', 'error');
      else { showToast('Entrega marcada! QR Code gerado.', 'success'); await fetchData(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#5B2D8E] animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-gray-500" />
        <p className="text-gray-400">Pedido não encontrado</p>
        <button onClick={() => router.back()} className="text-[#5B2D8E] underline text-sm">Voltar</button>
      </div>
    );
  }

  const escrowStatus = (escrow?.status ?? order.escrow_status) as EscrowStatus;
  const productImage = order.product?.product_images?.[0]?.url;

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-xl">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="font-display font-bold text-white text-base">Pedido #{order.id.slice(-8).toUpperCase()}</h1>
          <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Product Card */}
        <div className="bg-gray-800 rounded-2xl p-4 flex gap-4">
          {productImage ? (
            <img src={productImage} alt={order.product?.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-700 flex items-center justify-center shrink-0">
              <Package className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm line-clamp-2">{order.product?.title}</p>
            <p className="text-[#F5921E] font-bold mt-1">{formatPrice(order.gross_value)}</p>
            {order.product?.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">{order.product.city}, {order.product.state}</span>
              </div>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Partes</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">Comprador</span>
            </div>
            <span className="text-sm text-white font-medium">{order.buyer?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">Vendedor</span>
            </div>
            <span className="text-sm text-white font-medium">{order.seller?.name}</span>
          </div>
          {order.tracking_code && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400">Rastreio</span>
              </div>
              <span className="text-sm text-white font-mono">{order.tracking_code}</span>
            </div>
          )}
        </div>

        {/* Escrow Status Tracker */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-[#5B2D8E]" />
            <h2 className="font-display font-semibold text-white">Status do Escrow</h2>
          </div>
          <EscrowStatusTracker
            orderId={orderId}
            initialStatus={escrowStatus}
            autoReleaseAt={escrow?.auto_release_at}
            onStatusChange={async () => { await fetchData(); }}
          />
        </div>

        {/* Action Panel — role & status dependent */}
        {role === 'seller' && escrowStatus === 'payment_held' && (
          <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-white">Registrar Envio</h3>
            <input
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Código de rastreio (opcional)"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E]"
            />
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Transportadora (ex: Correios)"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E]"
            />
            <button
              onClick={handleMarkShipped}
              disabled={actionLoading}
              className="w-full py-3 bg-[#5B2D8E] hover:bg-[#4a2470] disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Confirmar Envio
            </button>
          </div>
        )}

        {role === 'seller' && escrowStatus === 'shipped' && (
          <div className="bg-gray-800 rounded-2xl p-4">
            <h3 className="font-semibold text-white mb-3">Confirmar Entrega</h3>
            <p className="text-sm text-gray-400 mb-4">
              O produto foi entregue ao comprador? Marque como entregue para gerar o QR Code de confirmação.
            </p>
            <button
              onClick={handleMarkDelivered}
              disabled={actionLoading}
              className="w-full py-3 bg-[#F5921E] hover:bg-[#d97d1a] disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Marcar como Entregue
            </button>
          </div>
        )}

        {/* QR Display for seller / Scanner for buyer */}
        {escrowStatus === 'delivered_pending_confirmation' && (
          <div className="bg-gray-800 rounded-2xl p-4">
            {role === 'seller' ? (
              <EscrowQRDisplay
                orderId={orderId}
                initialQRImageURL={
                  escrow?.qr_payload_encrypted
                    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(escrow.qr_payload_encrypted)}&format=png&margin=10`
                    : undefined
                }
                initialQRExpiresAt={escrow?.qr_expires_at ?? undefined}
                role="seller"
              />
            ) : (
              <>
                <h3 className="font-semibold text-white mb-4">Confirmar Recebimento</h3>
                <QRScanner
                  orderId={orderId}
                  onSuccess={() => { showToast('Entrega confirmada! Pagamento liberado.', 'success'); fetchData(); }}
                  onError={(e) => showToast(e, 'error')}
                />
                {!showDisputeForm && (
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    className="w-full mt-4 py-2.5 border border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Há um problema — Abrir Disputa
                  </button>
                )}
                {showDisputeForm && (
                  <div className="mt-4">
                    <DisputeForm
                      orderId={orderId}
                      onSuccess={() => { showToast('Disputa aberta!', 'success'); setShowDisputeForm(false); fetchData(); }}
                      onCancel={() => setShowDisputeForm(false)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Payment released */}
        {escrowStatus === 'payment_released' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-400">Pagamento Liberado</p>
              <p className="text-sm text-gray-400 mt-1">
                {role === 'seller'
                  ? `${formatPrice(escrow?.amount ?? order.gross_value)} transferidos para você.`
                  : 'Transação concluída. Obrigado pela compra!'}
              </p>
            </div>
          </div>
        )}

        {/* Payment summary */}
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo Financeiro</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Valor total</span>
            <span className="text-white font-bold">{formatPrice(order.gross_value)}</span>
          </div>
          {escrow && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Valor em escrow</span>
              <span className="text-[#F5921E] font-semibold">{formatPrice(escrow.amount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
