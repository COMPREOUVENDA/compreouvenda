'use client';

import { useState } from 'react';
import { CreditCard, QrCode, Loader2, CheckCircle, Clock, Copy, Check } from 'lucide-react';

interface CheckoutFormProps {
  productId: string;
  productTitle: string;
  price: number;
  sellerId: string;
  sellerPagBankId?: string;
  enableCharity?: boolean;
  charityPagBankId?: string;
  onSuccess?: (orderId: string) => void;
}

export default function CheckoutForm({ 
  productId, productTitle, price, sellerId, 
  sellerPagBankId, enableCharity, charityPagBankId, onSuccess 
}: CheckoutFormProps) {
  const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeText: string; qrCodeImage: string; expiresAt: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: '', expMonth: '', expYear: '', securityCode: '', holderName: '', installments: 1
  });

  const platformFee = Math.round(price * 0.10 * 100) / 100;
  const charityFee = enableCharity ? Math.round(price * 0.02 * 100) / 100 : 0;
  const sellerAmount = Math.round((price - platformFee - charityFee) * 100) / 100;

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          amount: price,
          paymentMethod: method,
          sellerId,
          sellerPagBankId,
          enableCharity,
          charityPagBankId,
          description: productTitle,
          cardData: method === 'CREDIT_CARD' ? cardForm : undefined
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (method === 'PIX' && data.pixData) {
          setPixData(data.pixData);
          setPaymentStatus('waiting');
          pollPaymentStatus(data.orderId);
        } else if (data.status === 'PAID' || data.status === 'AUTHORIZED') {
          setPaymentStatus('approved');
          onSuccess?.(data.orderId);
        } else {
          setPaymentStatus('waiting');
          pollPaymentStatus(data.orderId);
        }
      } else {
        setError(data.error || 'Erro ao processar pagamento');
      }
    } catch (e: any) {
      setError(e.message || 'Erro de conexão');
    }
    setLoading(false);
  };

  const pollPaymentStatus = (orderId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        const data = await res.json();
        if (data.status === 'paid') {
          clearInterval(interval);
          setPaymentStatus('approved');
          onSuccess?.(orderId);
        } else if (data.status === 'cancelled' || data.status === 'refunded') {
          clearInterval(interval);
          setPaymentStatus('failed');
          setError('Pagamento não aprovado');
        }
      } catch {}
    }, 5000);
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const copyPixCode = () => {
    if (pixData?.qrCodeText) {
      navigator.clipboard.writeText(pixData.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (paymentStatus === 'approved') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Pagamento aprovado! ✅</h2>
        <p className="text-gray-500">O vendedor será notificado para enviar o produto.</p>
        <p className="text-sm text-gray-400 mt-2">Seu pagamento está protegido pelo nosso sistema de escrow.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Finalizar compra</h2>
      
      {/* Product summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-gray-800 font-medium">{productTitle}</p>
        <p className="text-2xl font-bold text-purple-700 mt-1">
          R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <div className="text-xs text-gray-500 mt-2 space-y-0.5">
          <p>Vendedor recebe: R$ {sellerAmount.toFixed(2)} (90%)</p>
          <p>Taxa plataforma: R$ {platformFee.toFixed(2)} (10%)</p>
          {enableCharity && <p className="text-pink-600">💜 Doação solidária: R$ {charityFee.toFixed(2)} (2%)</p>}
        </div>
      </div>

      {/* Payment method selector */}
      {!pixData && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setMethod('PIX')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                method === 'PIX' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <QrCode className="w-6 h-6 text-green-500" />
              <span className="text-gray-800 text-sm font-medium">PIX</span>
              <span className="text-[10px] text-gray-400">Instantâneo</span>
            </button>
            <button onClick={() => setMethod('CREDIT_CARD')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                method === 'CREDIT_CARD' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <CreditCard className="w-6 h-6 text-blue-500" />
              <span className="text-gray-800 text-sm font-medium">Cartão</span>
              <span className="text-[10px] text-gray-400">Até 12x</span>
            </button>
          </div>

          {/* Card form */}
          {method === 'CREDIT_CARD' && (
            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Número do cartão" maxLength={19}
                value={cardForm.number} onChange={e => setCardForm(p => ({...p, number: e.target.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim()}))}
                className="w-full p-3 border rounded-lg text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="MM" maxLength={2}
                  value={cardForm.expMonth} onChange={e => setCardForm(p => ({...p, expMonth: e.target.value.replace(/\D/g,'')}))}
                  className="p-3 border rounded-lg text-sm" />
                <input type="text" placeholder="AAAA" maxLength={4}
                  value={cardForm.expYear} onChange={e => setCardForm(p => ({...p, expYear: e.target.value.replace(/\D/g,'')}))}
                  className="p-3 border rounded-lg text-sm" />
                <input type="text" placeholder="CVV" maxLength={4}
                  value={cardForm.securityCode} onChange={e => setCardForm(p => ({...p, securityCode: e.target.value.replace(/\D/g,'')}))}
                  className="p-3 border rounded-lg text-sm" />
              </div>
              <input type="text" placeholder="Nome no cartão"
                value={cardForm.holderName} onChange={e => setCardForm(p => ({...p, holderName: e.target.value.toUpperCase()}))}
                className="w-full p-3 border rounded-lg text-sm" />
              <select value={cardForm.installments} onChange={e => setCardForm(p => ({...p, installments: +e.target.value}))}
                className="w-full p-3 border rounded-lg text-sm">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n} value={n}>
                    {n}x de R$ {(price / n).toFixed(2)}{n === 1 ? ' (à vista)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

          <button onClick={handlePayment} disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Processando...</> : 
              method === 'PIX' ? '💚 Pagar com PIX' : '💳 Pagar com Cartão'}
          </button>
          
          <p className="text-xs text-gray-400 text-center mt-3">
            🔒 Pagamento seguro via PagBank. Protegido por escrow.
          </p>
        </>
      )}

      {/* PIX QR Code */}
      {pixData && paymentStatus === 'waiting' && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-amber-600 text-sm font-medium">Aguardando pagamento...</span>
          </div>
          
          {pixData.qrCodeImage && (
            <img src={pixData.qrCodeImage} alt="QR Code PIX" className="w-52 h-52 mx-auto rounded-xl bg-white p-2 border" />
          )}
          
          {pixData.qrCodeText && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Ou copie o código PIX Copia e Cola:</p>
              <button onClick={copyPixCode}
                className="w-full bg-gray-50 p-3 rounded-lg text-xs text-gray-600 break-all hover:bg-gray-100 transition border flex items-center gap-2">
                <span className="flex-1 text-left">{pixData.qrCodeText.substring(0, 60)}...</span>
                {copied ? <Check size={16} className="text-green-500 flex-shrink-0" /> : <Copy size={16} className="text-gray-400 flex-shrink-0" />}
              </button>
              {copied && <p className="text-green-500 text-xs mt-1">✓ Código copiado!</p>}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Expira em 30 minutos. O pagamento será confirmado automaticamente.
          </p>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="text-center p-4">
          <p className="text-red-500 font-medium">Pagamento não aprovado</p>
          <button onClick={() => { setPaymentStatus(''); setPixData(null); setError(''); }}
            className="mt-3 text-purple-600 text-sm underline">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
