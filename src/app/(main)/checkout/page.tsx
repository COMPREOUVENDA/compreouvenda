'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, QrCode, Shield, MapPin, Truck, Package, ChevronRight, Lock, CheckCircle, Users, HandHeart, Loader2, Copy, AlertCircle, Tag, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { createPayment, calculateSplit } from '@/lib/payments';
import { track, trackPurchase } from '@/lib/analytics';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixResult, setPixResult] = useState<{ qrCode: string; copyPaste: string; expiresAt: string } | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [cardData, setCardData] = useState({ number: '', expMonth: '', expYear: '', cvv: '', holderName: '', cpf: '' });
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState<{ id: string; title: string; price: number; sellerId: string; seller: string; image: string } | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  // Cupom
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount?: number; description?: string; error?: string } | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load product from searchParams productId
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId) {
      router.replace('/');
      setProductLoading(false);
      return;
    }
    const supabase = createClient();
    const load = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, title, price, user_id, user:users!products_user_id_fkey(name), images:product_images(url)')
          .eq('id', productId)
          .single();
        if (data) {
          setProduct({
            id: data.id,
            title: data.title,
            price: data.price,
            sellerId: data.user_id,
            seller: (data.user as any)?.name || 'Vendedor',
            image: (data.images as any[])?.[0]?.url || '',
          });
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      } finally {
        setProductLoading(false);
      }
    };
    load();
  }, [searchParams, router]);

  if (productLoading || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  const gatewayFeePercent = paymentMethod === 'pix' ? 1.5 : 3.5;
  const split = calculateSplit(product.price, {
    platformFeePercent: 10,
    gatewayFeePercent,
    commissionPercent: 5,
    donationPercent: 2,
  });

  const pixDiscount = paymentMethod === 'pix' ? product.price * 0.05 : 0;
  const couponDiscount = couponResult?.valid ? (couponResult.discount || 0) : 0;
  const finalPrice = product.price - pixDiscount - couponDiscount;

  const validateCoupon = async () => {
    if (!couponCode.trim() || !user) return;
    setCouponLoading(true);
    setCouponResult(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponCode.toUpperCase(),
      p_user_id: user.id,
      p_amount: product.price,
    });
    if (error || !data) {
      setCouponResult({ valid: false, error: 'Não foi possível validar o cupom.' });
    } else {
      setCouponResult({ valid: data.valid, discount: data.discount, description: data.description, error: data.error });
    }
    setCouponLoading(false);
  };

  const handlePayment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    track('checkout_start', {
      product_id: product.id,
      product_title: product.title,
      price: finalPrice,
      payment_method: paymentMethod,
    });

    setError('');
    setLoading(true);

    try {
      const result = await createPayment({
        orderId: '',
        productId: product.id,
        buyerId: user.id,
        sellerId: product.sellerId,
        method: paymentMethod,
        totalAmount: finalPrice,
        installments: paymentMethod === 'credit' ? installments : undefined,
        split: { ...split, sellerId: product.sellerId, totalAmount: finalPrice },
        card: paymentMethod === 'credit' ? cardData : undefined,
      });

      if (result.success) {
        // Criar pedido no banco e notificar vendedor
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            seller_id: product.sellerId,
            buyer_id: user.id,
            amount: finalPrice,
            delivery_type: deliveryType,
            payment_method: paymentMethod,
            installments: paymentMethod === 'credit' ? installments : 1,
            payment_id: (result as any).transactionId || null,
            coupon_code: couponResult?.valid ? couponCode : null,
            coupon_discount: couponDiscount,
          }),
        });
        if (!orderRes.ok) {
          console.warn('[checkout] order creation failed:', await orderRes.text());
        }

        if (result.status === 'pending' && result.pixQrCode) {
          setPixResult({
            qrCode: result.pixQrCode,
            copyPaste: result.pixCopyPaste || '',
            expiresAt: result.pixExpiresAt || '',
          });
        } else if (result.status === 'approved') {
          trackPurchase({
            transactionId: (result as { transactionId?: string }).transactionId || product.id + '-' + Date.now(),
            productId: product.id,
            productTitle: product.title,
            value: finalPrice,
          });
          setPaymentSuccess(true);
        }
      } else {
        setError(result.errorMessage || 'Erro ao processar pagamento');
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixResult?.copyPaste || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==================== SUCCESS SCREEN ====================
  if (paymentSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-scale-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Pagamento Aprovado!</h2>
        <p className="text-gray-500 mb-8">Seu pedido foi confirmado. O vendedor será notificado.</p>
        <div className="card-elevated p-4 mb-6 text-left">
          <div className="text-sm space-y-1">
            <p className="text-gray-500">Produto: <span className="text-gray-900 font-medium">{product.title}</span></p>
            <p className="text-gray-500">Valor: <span className="text-brand-purple font-bold">{formatPrice(finalPrice)}</span></p>
            <p className="text-gray-500">Método: <span className="text-gray-900">{paymentMethod === 'pix' ? 'PIX' : `Cartão ${installments}x`}</span></p>
          </div>
        </div>
        <Link href="/dashboard" className="btn-primary inline-block">Ver meus pedidos</Link>
      </div>
    );
  }

  // ==================== PIX QR CODE SCREEN ====================
  if (pixResult) {
    const expiresIn = Math.max(0, Math.floor((new Date(pixResult.expiresAt).getTime() - Date.now()) / 60000));
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center animate-slide-up">
        <div className="card-elevated p-6">
          <QrCode className="w-8 h-8 text-brand-purple mx-auto mb-2" />
          <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Pague via PIX</h2>
          <p className="text-sm text-gray-400 mb-4">Escaneie o QR Code ou copie o código</p>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-4 inline-block">
            <img src={pixResult.qrCode} alt="PIX QR Code" className="w-48 h-48 mx-auto" />
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
              <input type="text" value={pixResult.copyPaste} readOnly className="flex-1 text-[10px] text-gray-600 bg-transparent truncate" />
              <button onClick={copyPix} className="flex items-center gap-1 bg-brand-purple text-white text-xs px-3 py-1.5 rounded-lg hover:bg-brand-purple/90">
                <Copy className="w-3 h-3" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            <p>Valor: <span className="font-bold text-brand-purple">{formatPrice(finalPrice)}</span></p>
            <p className="text-xs text-gray-400 mt-1">Expira em {expiresIn} minutos</p>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 text-left">Após o pagamento, a confirmação é automática em poucos segundos.</p>
          </div>

          <button onClick={() => { setPixResult(null); setPaymentSuccess(true); }} className="btn-primary w-full">
            Já paguei
          </button>
        </div>
      </div>
    );
  }

  // ==================== CHECKOUT FORM ====================
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <h1 className="font-display font-bold text-xl text-gray-900">Checkout</h1>
        <Lock className="w-4 h-4 text-emerald-500 ml-auto" />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Product Summary */}
        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${product.image})` }} />
          <div className="flex-1">
            <h3 className="font-display font-semibold text-sm">{product.title}</h3>
            <p className="text-xs text-gray-400">Vendedor: {product.seller}</p>
          </div>
          <span className="font-display font-bold text-lg text-brand-purple">{formatPrice(product.price)}</span>
        </div>

        {/* Delivery */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-3">Entrega</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'pickup' as const, icon: Package, label: 'Retirada Local', desc: 'Combinar com vendedor' },
              { type: 'delivery' as const, icon: Truck, label: 'Entrega', desc: 'Via parceiro logístico' },
            ].map((d) => (
              <button
                key={d.type}
                onClick={() => setDeliveryType(d.type)}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${deliveryType === d.type ? 'border-brand-purple bg-brand-purple/5' : 'border-gray-200'}`}
              >
                <d.icon className={`w-5 h-5 mb-1 ${deliveryType === d.type ? 'text-brand-purple' : 'text-gray-400'}`} />
                <span className="text-sm font-semibold block">{d.label}</span>
                <span className="text-[10px] text-gray-400">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-3">Pagamento</h3>
          <div className="space-y-2">
            {[
              { type: 'pix' as const, icon: QrCode, label: 'PIX', desc: 'Aprovação instantânea', badge: '-5%' },
              { type: 'credit' as const, icon: CreditCard, label: 'Cartão de Crédito', desc: 'Até 12x sem juros', badge: null },
            ].map((m) => (
              <button
                key={m.type}
                onClick={() => setPaymentMethod(m.type)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${paymentMethod === m.type ? 'border-brand-purple bg-brand-purple/5' : 'border-gray-200'}`}
              >
                <m.icon className={`w-5 h-5 ${paymentMethod === m.type ? 'text-brand-purple' : 'text-gray-400'}`} />
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="block text-[10px] text-gray-400">{m.desc}</span>
                </div>
                {m.badge && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">{m.badge}</span>}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>

          {/* Credit Card Form */}
          {paymentMethod === 'credit' && (
            <div className="mt-4 space-y-3 animate-slide-up">
              <input type="text" placeholder="Número do cartão" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} className="input-field" maxLength={19} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="MM" value={cardData.expMonth} onChange={e => setCardData({...cardData, expMonth: e.target.value})} className="input-field" maxLength={2} />
                <input type="text" placeholder="AA" value={cardData.expYear} onChange={e => setCardData({...cardData, expYear: e.target.value})} className="input-field" maxLength={2} />
                <input type="text" placeholder="CVV" value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} className="input-field" maxLength={4} />
              </div>
              <input type="text" placeholder="Nome no cartão" value={cardData.holderName} onChange={e => setCardData({...cardData, holderName: e.target.value})} className="input-field" />
              <input type="text" placeholder="CPF do titular" value={cardData.cpf} onChange={e => setCardData({...cardData, cpf: e.target.value})} className="input-field" maxLength={14} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Parcelas</label>
                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="input-field">
                  {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}x de {formatPrice(finalPrice / n)} {n === 1 ? '(à vista)' : 'sem juros'}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Cupom de desconto */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-purple" /> Cupom de desconto
          </h3>
          {couponResult?.valid ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-emerald-700">{couponCode.toUpperCase()}</p>
                <p className="text-xs text-emerald-600">{couponResult.description || `Desconto de ${formatPrice(couponDiscount)}`}</p>
              </div>
              <button onClick={() => { setCouponResult(null); setCouponCode(''); }} className="p-1.5 hover:bg-emerald-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                  placeholder="CÓDIGO DO CUPOM"
                  className="input-field flex-1 uppercase tracking-widest"
                  maxLength={30}
                />
                <button
                  onClick={validateCoupon}
                  disabled={!couponCode.trim() || couponLoading}
                  className="btn-secondary px-4 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </button>
              </div>
              {couponResult?.error && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {couponResult.error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Split Breakdown */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-3">Detalhamento</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Valor do produto</span><span className="font-semibold">{formatPrice(product.price)}</span></div>
            {pixDiscount > 0 && <div className="flex justify-between text-emerald-600 text-xs"><span>Desconto PIX (5%)</span><span>-{formatPrice(pixDiscount)}</span></div>}
            {couponDiscount > 0 && <div className="flex justify-between text-emerald-600 text-xs"><span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Cupom ({couponCode})</span><span>-{formatPrice(couponDiscount)}</span></div>}
            <div className="flex justify-between text-gray-400 text-xs"><span>Taxa da plataforma (10%)</span><span>-{formatPrice(split.platformFee)}</span></div>
            <div className="flex justify-between text-gray-400 text-xs"><span>Taxa do gateway ({gatewayFeePercent}%)</span><span>-{formatPrice(split.gatewayFee)}</span></div>
            <div className="flex justify-between text-brand-blue text-xs"><span className="flex items-center gap-1"><Users className="w-3 h-3" /> Comissão revendedor (5%)</span><span>-{formatPrice(split.commissionAmount)}</span></div>
            <div className="flex justify-between text-emerald-600 text-xs"><span className="flex items-center gap-1"><HandHeart className="w-3 h-3" /> Doação (2% do líquido)</span><span>-{formatPrice(split.donationAmount)}</span></div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold"><span>Vendedor recebe</span><span className="text-brand-purple">{formatPrice(split.sellerAmount)}</span></div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-emerald-700">Compra Protegida</span>
            <p className="text-xs text-emerald-600/70">Pagamento retido até confirmação da entrega. Você pode contestar se houver problema.</p>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="btn-gradient w-full text-lg py-4 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
          {loading ? 'Processando...' : `Pagar ${formatPrice(finalPrice)}`}
        </button>
      </div>
    </div>
  );
}
