'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, X, Sparkles, ChevronDown, ToggleLeft, ToggleRight, MapPin, Upload, Loader2, CheckCircle } from 'lucide-react';
import { CATEGORIES, PHOTO_LABELS } from '@/lib/constants';
import { useProducts } from '@/hooks/useProducts';

export default function NewProductPage() {
  const [photos, setPhotos] = useState<(File | null)[]>(Array(8).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(Array(8).fill(null));
  const [autoVideo, setAutoVideo] = useState(true);
  const [allowCommission, setAllowCommission] = useState(false);
  const [donationEnabled, setDonationEnabled] = useState(false);
  const [flashOffer, setFlashOffer] = useState(false);
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'used'>('new');
  const [usageTime, setUsageTime] = useState('');
  const [radius, setRadius] = useState(30);
  const [commissionValue, setCommissionValue] = useState('');
  const [donationValue, setDonationValue] = useState('');
  const [flashPrice, setFlashPrice] = useState('');
  const [flashEnd, setFlashEnd] = useState('');
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [auctionEnd, setAuctionEnd] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createProduct } = useProducts();
  const router = useRouter();

  const handlePhotoSelect = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const newPhotos = [...photos];
        newPhotos[index] = file;
        setPhotos(newPhotos);

        const newPreviews = [...previews];
        newPreviews[index] = URL.createObjectURL(file);
        setPreviews(newPreviews);
      }
    };
    input.click();
  };

  const handleBulkUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const newPhotos = [...photos];
      const newPreviews = [...previews];
      let slot = newPhotos.findIndex(p => p === null);

      for (const file of files) {
        if (slot === -1 || slot >= 8) break;
        newPhotos[slot] = file;
        newPreviews[slot] = URL.createObjectURL(file);
        slot = newPhotos.findIndex((p, i) => i > slot && p === null);
        if (slot === -1) slot = newPhotos.findIndex(p => p === null);
      }
      setPhotos(newPhotos);
      setPreviews(newPreviews);
    };
    input.click();
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPreviews = [...previews];
    if (newPreviews[index]) URL.revokeObjectURL(newPreviews[index]!);
    newPhotos[index] = null;
    newPreviews[index] = null;
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) { setError('Informe o título do produto'); return; }
    if (!categoryId) { setError('Selecione uma categoria'); return; }
    if (!price || parseFloat(price) <= 0) { setError('Informe o preço'); return; }

    const imageFiles = photos.filter((p): p is File => p !== null);
    if (imageFiles.length === 0) { setError('Adicione pelo menos 1 foto'); return; }

    setError('');
    setLoading(true);

    try {
      const product = await createProduct({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        price: parseFloat(price),
        condition,
        city: 'São Paulo', // TODO: get from geolocation
        state: 'SP',
        negotiation_radius_km: radius,
        allow_resale_by_others: allowCommission,
        reseller_commission_type: allowCommission ? 'percentage' : undefined,
        reseller_commission_value: allowCommission ? parseFloat(commissionValue) || 5 : undefined,
        donation_enabled: donationEnabled,
        donation_type: donationEnabled ? 'percentage' : undefined,
        donation_value: donationEnabled ? parseFloat(donationValue) || 2 : undefined,
        auction_enabled: auctionEnabled,
        auction_start_price: auctionEnabled ? parseFloat(auctionStartPrice) || undefined : undefined,
        auction_end_at: auctionEnabled && auctionEnd ? new Date(auctionEnd).toISOString() : undefined,
        flash_offer_enabled: flashOffer,
        flash_offer_price: flashOffer ? parseFloat(flashPrice) || undefined : undefined,
        flash_offer_end_at: flashOffer && flashEnd ? new Date(flashEnd).toISOString() : undefined,
      }, imageFiles);

      if (product) {
        setSuccess(true);
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao publicar produto');
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {value ? <ToggleRight className="w-8 h-8 text-brand-purple" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
    </button>
  );

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Anúncio Publicado!</h2>
          <p className="text-gray-500">Seu produto já está visível no feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="font-display font-bold text-xl text-gray-900">Criar Anúncio</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Photos */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-1">Fotos do produto</h3>
          <p className="text-sm text-gray-400 mb-4">Envie até 8 fotos seguindo a orientação</p>
          <div className="grid grid-cols-4 gap-2">
            {PHOTO_LABELS.map((label, i) => (
              <div key={i} className="relative">
                <div
                  onClick={() => handlePhotoSelect(i)}
                  className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    previews[i] ? 'border-brand-purple bg-brand-purple/5' : 'border-gray-200 hover:border-brand-purple/40 bg-gray-50'
                  }`}
                >
                  {previews[i] ? (
                    <>
                      <div className="absolute inset-0 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${previews[i]})` }} />
                      <button
                        className="absolute -top-1 -right-1 bg-brand-pink text-white rounded-full p-0.5 z-10"
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-gray-300 mb-1" />
                      <span className="text-[9px] text-gray-400 font-medium text-center px-1 leading-tight">{label}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleBulkUpload}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-brand-purple/30 hover:text-brand-purple transition-colors"
          >
            <Upload className="w-4 h-4" /> Selecionar fotos
          </button>
          <p className="mt-2 text-[10px] text-gray-400 text-center">
            {photos.filter(p => p !== null).length}/8 fotos selecionadas • JPEG, PNG ou WebP • Max 5MB cada
          </p>
        </div>

        {/* AI Video */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-900">Vídeo automático com IA</h3>
              <p className="text-xs text-gray-400">Gera um vídeo de 20s a partir das fotos</p>
            </div>
          </div>
          <Toggle value={autoVideo} onChange={setAutoVideo} label="Gerar vídeo automaticamente" />
          {autoVideo && (
            <div className="bg-brand-purple/5 rounded-xl p-3 mt-2">
              <p className="text-xs text-brand-purple">🎬 O vídeo será gerado após o envio das fotos com zoom suave, transições e textos automáticos.</p>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="card-elevated p-5 space-y-4">
          <h3 className="font-display font-semibold text-gray-900">Informações do produto</h3>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Título *</label>
            <input type="text" placeholder="Ex: iPhone 14 Pro Max 256GB" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" maxLength={120} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Descrição</label>
            <textarea placeholder="Descreva seu produto com detalhes..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" maxLength={2000} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Categoria *</label>
              <div className="relative">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field appearance-none pr-10">
                  <option value="">Selecione</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Preço *</label>
              <input type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Condição</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="input-field appearance-none">
                <option value="new">Novo</option>
                <option value="like_new">Seminovo</option>
                <option value="good">Bom estado</option>
                <option value="fair">Razoável</option>
                <option value="used">Usado</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Tempo de uso</label>
              <input type="text" placeholder="Ex: 6 meses" value={usageTime} onChange={(e) => setUsageTime(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card-elevated p-5 space-y-4">
          <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-blue" /> Localização
          </h3>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-blue/10 rounded-2xl text-brand-blue text-sm font-medium hover:bg-brand-blue/20 transition-colors"
          >
            <MapPin className="w-4 h-4" /> Usar minha localização atual
          </button>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Raio de negociação: {radius}km</label>
            <input type="range" min="1" max="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-brand-blue" />
            <div className="flex justify-between text-xs text-gray-400"><span>1km</span><span>100km</span></div>
          </div>
        </div>

        {/* Toggles */}
        <div className="card-elevated p-5 space-y-1 divide-y divide-gray-100">
          <Toggle value={flashOffer} onChange={setFlashOffer} label="⚡ Oferta Imperdível" />
          {flashOffer && (
            <div className="pb-3 space-y-3 pt-2">
              <input type="number" step="0.01" placeholder="Preço promocional" value={flashPrice} onChange={(e) => setFlashPrice(e.target.value)} className="input-field" />
              <input type="datetime-local" value={flashEnd} onChange={(e) => setFlashEnd(e.target.value)} className="input-field" />
            </div>
          )}
          <Toggle value={auctionEnabled} onChange={setAuctionEnabled} label="🔨 Ativar Leilão Rápido" />
          {auctionEnabled && (
            <div className="pb-3 space-y-3 pt-2">
              <input type="number" step="0.01" placeholder="Preço inicial do leilão" value={auctionStartPrice} onChange={(e) => setAuctionStartPrice(e.target.value)} className="input-field" />
              <input type="datetime-local" value={auctionEnd} onChange={(e) => setAuctionEnd(e.target.value)} className="input-field" />
            </div>
          )}
          <Toggle value={allowCommission} onChange={setAllowCommission} label="👥 Permitir venda por comissão" />
          {allowCommission && (
            <div className="pb-3 pt-2">
              <input type="number" min="1" max="30" placeholder="Comissão % (1-30)" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} className="input-field" />
            </div>
          )}
          <Toggle value={donationEnabled} onChange={setDonationEnabled} label="💚 Doar parte da venda" />
          {donationEnabled && (
            <div className="pb-3 space-y-3 pt-2">
              <select className="input-field">
                <option value="">Selecione a instituição</option>
                <option value="c1">AACD</option>
                <option value="c2">Cruz Vermelha</option>
                <option value="c3">UNICEF</option>
              </select>
              <input type="number" min="1" max="100" placeholder="Percentual da doação %" value={donationValue} onChange={(e) => setDonationValue(e.target.value)} className="input-field" />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-gradient w-full text-lg py-4 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Publicando...' : 'Publicar Anúncio'}
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}
