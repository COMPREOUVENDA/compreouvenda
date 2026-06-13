'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, X, Sparkles, ChevronDown, ToggleLeft, ToggleRight,
  MapPin, Upload, Loader2, CheckCircle, Video, Wand2, Tag, FileText,
  DollarSign,
} from 'lucide-react';
import { CATEGORIES, PHOTO_LABELS } from '@/lib/constants';
import { useProducts } from '@/hooks/useProducts';
import type { PriceSuggestion } from '@/lib/ai-pricing';
import { getMarketPosition } from '@/lib/ai-pricing';
import PriceSuggestionCard from '@/components/ai/PriceSuggestionCard';
import MarketInsights from '@/components/ai/MarketInsights';
import PriceCompetitivenessBar from '@/components/ai/PriceCompetitivenessBar';

// Steps: 0 = Fotos, 1 = Informações, 2 = Detalhes, 3 = Publicar
const STEPS = ['Fotos', 'Info', 'Detalhes', 'Publicar'];

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-brand-purple text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg animate-slide-up flex items-center gap-2 max-w-xs">
      <Sparkles className="w-4 h-4 flex-shrink-0" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-1 p-0.5 hover:opacity-70">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < currentStep
                  ? 'bg-brand-purple text-white'
                  : i === currentStep
                  ? 'bg-gradient-to-br from-brand-purple to-brand-orange text-white shadow-md shadow-brand-purple/30'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${i === currentStep ? 'text-brand-purple' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 rounded-full mb-4 transition-all duration-300 ${i < currentStep ? 'bg-brand-purple' : 'bg-gray-100'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

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
  const [currentStep, setCurrentStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // AI Pricing state
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [marketData, setMarketData] = useState<{
    avg_price: number;
    min_price: number;
    max_price: number;
    listings: number;
    sold_30d: number;
    avg_days_to_sell: number;
    demand_level: import('@/lib/ai-pricing').DemandLevel;
    trend: 'alta' | 'estável' | 'baixa';
  } | null>(null);
  const aiDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const marketDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationCity, setLocationCity] = useState('');

  const { createProduct } = useProducts();
  const router = useRouter();

  // Try to get geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          if (res.ok) {
            const geo = await res.json();
            const city = geo.address?.city || geo.address?.town || geo.address?.village || '';
            setLocationCity(city);
          }
        } catch { /* ignore */ }
        setLocationLoading(false);
      },
      () => { setLocationError('Localização não disponível'); setLocationLoading(false); }
    );
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch market data when category changes
  useEffect(() => {
    if (!categoryId) { setMarketData(null); return; }
    if (marketDebounceRef.current) clearTimeout(marketDebounceRef.current);
    marketDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ai/pricing/market?category=${categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setMarketData(data);
        }
      } catch { /* ignore */ }
    }, 400);
  }, [categoryId]);

  // Trigger AI pricing analysis when title + category are filled
  useEffect(() => {
    if (!title.trim() || !categoryId) { setPriceSuggestion(null); return; }
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await fetch('/api/ai/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, category: categoryId, condition }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) setPriceSuggestion(json.data);
        }
      } catch { /* ignore */ }
      finally { setAiLoading(false); }
    }, 1200);
  }, [title, categoryId, condition]);

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
      addFiles(files);
    };
    input.click();
  };

  const MAX_IMAGE_SIZE_MB = 10;

  const addFiles = useCallback((rawFiles: File[]) => {
    const oversized = rawFiles.filter((f) => f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      showToast(`Arquivo muito grande. Máximo ${MAX_IMAGE_SIZE_MB}MB por imagem.`);
    }
    const validFiles = rawFiles.filter((f) => f.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024);
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const newPreviews = [...previews];
      for (const file of validFiles) {
        const slot = newPhotos.findIndex((p) => p === null);
        if (slot === -1) break;
        newPhotos[slot] = file;
        newPreviews[slot] = URL.createObjectURL(file);
      }
      setPreviews(newPreviews);
      return newPhotos;
    });
  }, [previews]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (files.length) addFiles(files);
  }, [addFiles]);

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPreviews = [...previews];
    if (newPreviews[index]) URL.revokeObjectURL(newPreviews[index]!);
    newPhotos[index] = null;
    newPreviews[index] = null;
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const filledCount = photos.filter((p) => p !== null).length;

  const canProceedStep0 = filledCount >= 1;
  const canProceedStep1 = title.trim() !== '' && categoryId !== '' && price !== '' && parseFloat(price) > 0;

  const handleNext = () => {
    if (currentStep === 0 && !canProceedStep0) {
      setError('Adicione pelo menos 1 foto');
      return;
    }
    if (currentStep === 1 && !canProceedStep1) {
      setError('Preencha título, categoria e preço');
      return;
    }
    setError('');
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
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
        city: 'São Paulo',
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao publicar produto');
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

  // Competitiveness for entered price
  const currentPriceNum = parseFloat(price) || 0;
  const hasCompetitivenessData = currentPriceNum > 0 && marketData && priceSuggestion;
  const pricePosition = hasCompetitivenessData
    ? getMarketPosition(currentPriceNum, marketData.avg_price)
    : null;

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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="font-display font-bold text-xl text-gray-900">Criar Anúncio</h1>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ---- STEP 0: Fotos ---- */}
      {currentStep === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-elevated p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-1">Fotos do produto</h3>
            <p className="text-sm text-gray-400 mb-4">Envie até 8 fotos. Arraste ou clique para adicionar.</p>

            {/* Drag & Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`rounded-2xl border-2 border-dashed transition-all duration-200 mb-4 ${
                isDragOver ? 'border-brand-purple bg-brand-purple/5 scale-[1.01]' : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className="grid grid-cols-4 gap-2 p-3">
                {PHOTO_LABELS.map((label, i) => (
                  <div key={i} className="relative">
                    <div
                      onClick={() => handlePhotoSelect(i)}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        previews[i]
                          ? 'border-brand-purple bg-brand-purple/5'
                          : 'border-gray-200 hover:border-brand-purple/40 bg-white'
                      }`}
                    >
                      {previews[i] ? (
                        <>
                          <div className="absolute inset-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${previews[i]})` }} />
                          <button
                            className="absolute -top-1 -right-1 bg-brand-pink text-white rounded-full p-0.5 z-10"
                            onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                            aria-label={`Remover foto ${i + 1}`}
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

              {isDragOver && (
                <div className="text-center py-2 text-brand-purple text-xs font-semibold">
                  Solte as fotos aqui
                </div>
              )}
            </div>

            <button
              onClick={handleBulkUpload}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand-purple/20 rounded-2xl text-sm text-brand-purple hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-colors font-medium"
            >
              <Upload className="w-4 h-4" /> Selecionar fotos ({filledCount}/8)
            </button>
            <p className="mt-2 text-[10px] text-gray-400 text-center">
              JPEG, PNG ou WebP · Max 5MB cada
            </p>
          </div>

          {/* Video Placeholder */}
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-gray-900 text-sm">Gerar Vídeo Automático</h3>
                  <span className="bg-brand-orange/10 text-brand-orange text-[10px] font-bold px-2 py-0.5 rounded-full">Em breve</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Vídeo de 20s gerado por IA a partir das suas fotos</p>
              </div>
              <ToggleRight className="w-8 h-8 text-gray-200" />
            </div>
          </div>
        </div>
      )}

      {/* ---- STEP 1: Informações ---- */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-elevated p-5 space-y-4">
            <h3 className="font-display font-semibold text-gray-900">Informações essenciais</h3>

            {/* Title + AI */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Título *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: iPhone 14 Pro Max 256GB"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field pr-28"
                  maxLength={120}
                />
                <button
                  onClick={() => showToast('Em breve: IA gerará o título automaticamente')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                  aria-label="Gerar título com IA"
                >
                  <Wand2 className="w-3 h-3" />
                  IA
                </button>
              </div>
            </div>

            {/* Category + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Categoria *</label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">Selecione</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Preço *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input-field pr-14"
                  />
                  {aiLoading ? (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-brand-orange animate-spin" />
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (priceSuggestion) {
                          setPrice(priceSuggestion.suggested_price.toString());
                          showToast(`Preço sugerido: R$ ${priceSuggestion.suggested_price}`);
                        } else if (!title || !categoryId) {
                          showToast('Preencha título e categoria primeiro');
                        } else {
                          showToast('Aguarde a análise de IA...');
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-[10px] font-bold px-2 py-1.5 rounded-xl transition-colors"
                      aria-label="Sugerir preço com IA"
                    >
                      <Tag className="w-3 h-3" />
                      IA
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Price competitiveness bar when user typed a price */}
            {hasCompetitivenessData && pricePosition && (
              <PriceCompetitivenessBar
                currentPrice={currentPriceNum}
                minMarket={marketData.min_price}
                avgMarket={marketData.avg_price}
                maxMarket={marketData.max_price}
                position={pricePosition}
              />
            )}

            {/* Description + AI */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Descrição</label>
              <div className="relative">
                <textarea
                  placeholder="Descreva seu produto com detalhes..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field resize-none pb-10"
                  maxLength={2000}
                />
                <button
                  onClick={() => showToast('Em breve: descrição automática gerada por IA')}
                  className="absolute bottom-3 right-3 flex items-center gap-1 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                  aria-label="Gerar descrição com IA"
                >
                  <FileText className="w-3 h-3" />
                  Gerar com IA
                </button>
              </div>
            </div>
          </div>

          {/* AI Pricing suggestion card */}
          {(aiLoading || priceSuggestion) && (
            <PriceSuggestionCard
              suggestion={priceSuggestion}
              loading={aiLoading}
              onUsePrice={(p) => {
                setPrice(p.toString());
                showToast(`Preço aplicado: R$ ${p.toFixed(2)}`);
              }}
            />
          )}

          {/* Market Insights */}
          {(marketData || (!categoryId && false)) && (
            <MarketInsights data={marketData} loading={false} />
          )}

          {/* AI Assistant Card (only when no suggestion yet) */}
          {!priceSuggestion && !aiLoading && (
            <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Assistente IA de Preços</h4>
                  <p className="text-[10px] text-gray-500">Preencha título e categoria para ativar</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Gerar título', icon: Wand2, toast: 'Em breve: IA gerará o título automaticamente' },
                  { label: 'Sugerir preço', icon: DollarSign, toast: title && categoryId ? '' : 'Preencha título e categoria primeiro' },
                  { label: 'Gerar descrição', icon: FileText, toast: 'Em breve: descrição automática por IA' },
                ].map(({ label, icon: Icon, toast: t }) => (
                  <button
                    key={label}
                    onClick={() => t && showToast(t)}
                    className="flex flex-col items-center gap-1.5 p-2.5 bg-white rounded-xl border border-brand-purple/10 hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all text-center"
                  >
                    <Icon className="w-4 h-4 text-brand-purple" />
                    <span className="text-[10px] text-gray-600 font-medium leading-tight">{label}</span>
                    <span className="text-[9px] text-brand-orange font-bold">
                      {label === 'Sugerir preço' ? 'Automático' : 'Em breve'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- STEP 2: Detalhes ---- */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-elevated p-5 space-y-4">
            <h3 className="font-display font-semibold text-gray-900">Condição e localização</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Condição</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className="input-field appearance-none">
                  <option value="new">Novo</option>
                  <option value="like_new">Seminovo</option>
                  <option value="good">Bom estado</option>
                  <option value="fair">Razoável</option>
                  <option value="used">Usado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Tempo de uso</label>
                <input
                  type="text"
                  placeholder="Ex: 6 meses"
                  value={usageTime}
                  onChange={(e) => setUsageTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5 block">
                <MapPin className="w-4 h-4 text-brand-blue" /> Localização
              </label>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-blue/10 rounded-2xl text-brand-blue text-sm font-medium hover:bg-brand-blue/20 transition-colors"
              >
                <MapPin className="w-4 h-4" /> Usar minha localização atual
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Raio de negociação: {radius}km</label>
              <input type="range" min="1" max="100" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-brand-blue" />
              <div className="flex justify-between text-xs text-gray-400"><span>1km</span><span>100km</span></div>
            </div>
          </div>

          {/* Optional toggles */}
          <div className="card-elevated p-5 space-y-1 divide-y divide-gray-100">
            <h3 className="font-display font-semibold text-gray-900 pb-3">Opções extras (opcional)</h3>
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
        </div>
      )}

      {/* ---- STEP 3: Publicar ---- */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-lg text-gray-900 mb-4">Revisar e Publicar</h3>

            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl">
                {previews[0] && (
                  <div className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${previews[0]})` }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{title || 'Sem título'}</p>
                  <p className="text-brand-purple font-bold text-lg">R$ {price || '0,00'}</p>
                  <p className="text-xs text-gray-400">{filledCount} foto{filledCount !== 1 ? 's' : ''} · {CATEGORIES.find(c => c.id === categoryId)?.name || 'Sem categoria'}</p>
                </div>
              </div>

              {priceSuggestion && (
                <div className="flex items-center gap-3 p-3 bg-brand-purple/5 rounded-2xl">
                  <Sparkles className="w-5 h-5 text-brand-purple flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-brand-purple">
                      Preço analisado por IA · {priceSuggestion.confidence_score}% de confiança
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {priceSuggestion.market_position === 'excellent' && 'Excelente posição no mercado'}
                      {priceSuggestion.market_position === 'competitive' && 'Preço competitivo'}
                      {priceSuggestion.market_position === 'high' && 'Preço acima da média'}
                      {priceSuggestion.market_position === 'very_high' && 'Preço muito acima da média'}
                    </p>
                  </div>
                </div>
              )}

              {autoVideo && (
                <div className="flex items-center gap-3 p-3 bg-brand-purple/5 rounded-2xl">
                  <Video className="w-5 h-5 text-brand-purple flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-brand-purple">Vídeo IA será gerado automaticamente</p>
                    <p className="text-[10px] text-gray-400">Disponível após publicação</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-gradient w-full text-lg py-4 flex items-center justify-center gap-2 rounded-2xl"
            aria-label="Publicar anúncio"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {loading ? 'Publicando...' : 'Publicar Anúncio'}
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 md:static md:bg-transparent md:border-none md:mt-6 md:px-0">
        {currentStep > 0 && (
          <button
            onClick={() => { setError(''); setCurrentStep((s) => s - 1); }}
            className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Voltar
          </button>
        )}
        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 btn-gradient py-3.5 text-sm rounded-2xl"
          >
            Continuar
          </button>
        ) : null}
      </div>
    </div>
  );
}
