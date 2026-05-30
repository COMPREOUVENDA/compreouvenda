'use client';

import { useState } from 'react';
import { CreditCard, QrCode, Loader2, CheckCircle, Clock } from 'lucide-react';

interface CheckoutFormProps {
  productId: string;
  productTitle: string;
  price: number;
  sellerId: string;
  onSuccess?: (paymentId: string) => void;
}

export default function CheckoutForm({ productId, productTitle, price, sellerId, onSuccess }: CheckoutFormProps) {
  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrBase64: string; expiration: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [error, setError] = useState('');

  const platformFee = Math.round(price * 0.10 * 100) / 100;
  const sellerAmount = Math.round((price - platformFee) * 100) / 100;

  const handlePixPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, amount: price, description: productTitle, method: 'pix' }),
      });
      const data = await res.json();
      if (data.success) {
        setPixData({
          qrCode: data.data.pixQrCode,
          qrBase64: data.data.pixQrBase64,
          expiration: data.data.pixExpiration,
        });
        setPaymentStatus('waiting_payment');
        // Poll for payment status
        pollPaymentStatus(data.data.id);
      } else {
        setError(data.error || 'Erro ao gerar PIX');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const pollPaymentStatus = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${paymentId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          clearInterval(interval);
          setPaymentStatus('approved');
          onSuccess?.(paymentId);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          clearInterval(interval);
          setPaymentStatus('failed');
        }
      } catch { /* continue polling */ }
    }, 5000); // Check every 5 seconds

    // Stop after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  if (paymentStatus === 'approved') {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Pagamento aprovado! ✅</h2>
        <p className="text-gray-400">O vendedor será notificado para enviar o produto.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">Finalizar compra</h2>
      
      {/* Product summary */}
      <div className="bg-gray-700 rounded-xl p-4 mb-4">
        <p className="text-white font-medium">{productTitle}</p>
        <p className="text-2xl font-bold text-white mt-1">R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-gray-400 mt-1">Taxa plataforma: R$ {platformFee.toFixed(2)} | Vendedor recebe: R$ {sellerAmount.toFixed(2)}</p>
      </div>

      {/* Payment method selector */}
      {!pixData && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setMethod('pix')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                method === 'pix' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
              <QrCode className="w-6 h-6 text-green-400" />
              <span className="text-white text-sm font-medium">PIX</span>
              <span className="text-[10px] text-gray-400">Instantâneo</span>
            </button>
            <button onClick={() => setMethod('credit_card')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                method === 'credit_card' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
              <CreditCard className="w-6 h-6 text-blue-400" />
              <span className="text-white text-sm font-medium">Cartão</span>
              <span className="text-[10px] text-gray-400">Até 12x</span>
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{error}</p>}

          <button onClick={handlePixPayment} disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Processando...</> : 
              method === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão'}
          </button>
        </>
      )}

      {/* PIX QR Code */}
      {pixData && paymentStatus === 'waiting_payment' && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-yellow-400 text-sm">Aguardando pagamento...</span>
          </div>
          {pixData.qrBase64 && (
            <img src={`data:image/png;base64,${pixData.qrBase64}`} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-xl bg-white p-2" />
          )}
          {pixData.qrCode && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Ou copie o código PIX:</p>
              <button onClick={() => navigator.clipboard.writeText(pixData.qrCode)}
                className="w-full bg-gray-700 p-3 rounded-lg text-xs text-gray-300 break-all hover:bg-gray-600 transition-colors">
                {pixData.qrCode.substring(0, 50)}... (clique para copiar)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
