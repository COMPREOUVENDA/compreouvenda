'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle, X, Save,
  DollarSign, FileText, Tag, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';
import { useProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types';

const supabase = createClient();

function Toast({ msg, type = 'info', onClose }: { msg: string; type?: 'info' | 'success' | 'error'; onClose: () => void }) {
  const colors = {
    info: 'bg-brand-purple',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${colors[type]} text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg animate-slide-up flex items-center gap-2 max-w-xs`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-1 p-0.5 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateProduct } = useProducts();

  // Estado do produto
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Campos editáveis
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<Product['condition']>('new');
  const [flashOffer, setFlashOffer] = useState(false);
  const [flashPrice, setFlashPrice] = useState('');
  const [flashEnd, setFlashEnd] = useState('');
  const [donationEnabled, setDonationEnabled] = useState(false);
  const [donationValue, setDonationValue] = useState('');
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [auctionEnd, setAuctionEnd] = useState('');

  // IA
  const [aiTitleLoading, setAiTitleLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);

  // ── Carrega produto ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push('/dashboard'); return; }

        // Verifica ownership
        if (user && data.user_id !== user.id) { router.push('/dashboard'); return; }

        setProduct(data as unknown as Product);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setCategoryId(data.category_id || '');
        setPrice(data.price?.toString() || '');
        setCondition((data.condition as Product['condition']) || 'new');
        setFlashOffer(data.flash_offer_enabled || false);
        setFlashPrice(data.flash_offer_price?.toString() || '');
        setFlashEnd(data.flash_offer_end_at ? data.flash_offer_end_at.slice(0, 16) : '');
        setDonationEnabled(data.donation_enabled || false);
        setDonationValue(data.donation_value?.toString() || '');
        setAuctionEnabled(data.auction_enabled || false);
        setAuctionStartPrice(data.auction_start_price?.toString() || '');
        setAuctionEnd(data.auction_end_at ? data.auction_end_at.slice(0, 16) : '');
        setLoadingProduct(false);
      });
  }, [id, user, router]);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── IA: gerar título ───────────────────────────────────────────────────────
  const generateTitle = useCallback(async () => {
    if (!categoryId) { showToast('Selecione uma categoria primeiro', 'error'); return; }
    setAiTitleLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'title', hint: title, category: categoryId, condition }),
      });
      const json = await res.json();
      if (json.result) { setTitle(json.result); showToast('Título gerado pela IA', 'success'); }
    } catch { showToast('Erro ao gerar título', 'error'); }
    finally { setAiTitleLoading(false); }
  }, [title, categoryId, condition]);

  // ── IA: gerar descrição ────────────────────────────────────────────────────
  const generateDescription = useCallback(async () => {
    if (!title) { showToast('Adicione um título primeiro', 'error'); return; }
    setAiDescLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'description', hint: title, category: categoryId, condition }),
      });
      const json = await res.json();
      if (json.result) { setDescription(json.result); showToast('Descrição gerada pela IA', 'success'); }
    } catch { showToast('Erro ao gerar descrição', 'error'); }
    finally { setAiDescLoading(false); }
  }, [title, categoryId, condition]);

  // ── Salvar alterações ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { showToast('O título é obrigatório', 'error'); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      showToast('Informe um preço válido', 'error'); return;
    }

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        price: Number(price),
        condition,
        flash_offer_enabled: flashOffer,
        flash_offer_price: flashOffer && flashPrice ? Number(flashPrice) : null,
        flash_offer_end_at: flashOffer && flashEnd ? new Date(flashEnd).toISOString() : null,
        donation_enabled: donationEnabled,
        donation_value: donationEnabled && donationValue ? Number(donationValue) : null,
        auction_enabled: auctionEnabled,
        auction_start_price: auctionEnabled && auctionStartPrice ? Number(auctionStartPrice) : null,
        auction_end_at: auctionEnabled && auctionEnd ? new Date(auctionEnd).toISOString() : null,
      };

      const ok = await updateProduct(id, updates as Parameters<typeof updateProduct>[1]);
      if (ok) {
        showToast('Produto atualizado com sucesso!', 'success');
        setTimeout(() => router.push(`/product/${id}`), 1500);
      } else {
        showToast('Erro ao salvar. Tente novamente.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render: carregando ─────────────────────────────────────────────────────
  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (!product) return null;

  const conditionOptions: { value: Product['condition']; label: string }[] = [
    { value: 'new', label: 'Novo' },
    { value: 'like_new', label: 'Seminovo' },
    { value: 'good', label: 'Bom estado' },
    { value: 'fair', label: 'Estado regular' },
    { value: 'used', label: 'Usado' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/product/${id}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-gray-900">Editar anúncio</h1>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.title}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Imagem de capa (read-only preview) */}
        {product.thumbnail_url && (
          <div className="rounded-2xl overflow-hidden h-48 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* ── Título ── */}
        <section className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-brand-purple" />
            <h2 className="font-semibold text-gray-900">Título</h2>
          </div>
          <div className="relative">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Título do produto..."
              className="input-field w-full pr-24"
            />
            <button
              onClick={generateTitle}
              disabled={aiTitleLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-brand-purple hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {aiTitleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              IA
            </button>
          </div>
          <p className="text-xs text-gray-400 text-right">{title.length}/80</p>
        </section>

        {/* ── Categoria e condição ── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-brand-purple" />
            <h2 className="font-semibold text-gray-900">Categoria e condição</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field w-full">
              <option value="">Selecionar categoria</option>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condição</label>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCondition(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    condition === opt.value
                      ? 'bg-brand-purple text-white border-brand-purple'
                      : 'border-gray-200 text-gray-600 hover:border-brand-purple/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Descrição ── */}
        <section className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-brand-purple" />
            <h2 className="font-semibold text-gray-900">Descrição</h2>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Descreva o produto, estado de conservação, acessórios incluídos..."
            className="input-field w-full resize-none"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={generateDescription}
              disabled={aiDescLoading}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-purple hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {aiDescLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar com IA
            </button>
            <p className="text-xs text-gray-400">{description.length}/2000</p>
          </div>
        </section>

        {/* ── Preço ── */}
        <section className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-brand-purple" />
            <h2 className="font-semibold text-gray-900">Preço</h2>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0,00"
              className="input-field w-full pl-10"
            />
          </div>
        </section>

        {/* ── Oferta Flash ── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <h2 className="font-semibold text-gray-900">Oferta Flash</h2>
                <p className="text-xs text-gray-500">Preço especial por tempo limitado</p>
              </div>
            </div>
            <button onClick={() => setFlashOffer(!flashOffer)}>
              {flashOffer
                ? <ToggleRight className="w-7 h-7 text-brand-orange" />
                : <ToggleLeft className="w-7 h-7 text-gray-300" />}
            </button>
          </div>
          {flashOffer && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preço Flash (R$)</label>
                <input
                  type="number"
                  value={flashPrice}
                  onChange={(e) => setFlashPrice(e.target.value)}
                  placeholder="0,00"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Válido até</label>
                <input
                  type="datetime-local"
                  value={flashEnd}
                  onChange={(e) => setFlashEnd(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Doação ── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <div>
                <h2 className="font-semibold text-gray-900">Doação Solidária</h2>
                <p className="text-xs text-gray-500">Percentual da venda para instituição</p>
              </div>
            </div>
            <button onClick={() => setDonationEnabled(!donationEnabled)}>
              {donationEnabled
                ? <ToggleRight className="w-7 h-7 text-green-500" />
                : <ToggleLeft className="w-7 h-7 text-gray-300" />}
            </button>
          </div>
          {donationEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">% de doação</label>
              <input
                type="number"
                value={donationValue}
                onChange={(e) => setDonationValue(e.target.value)}
                min="1" max="100"
                placeholder="Ex: 10"
                className="input-field w-full"
              />
            </div>
          )}
        </section>

        {/* ── Leilão ── */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔨</span>
              <div>
                <h2 className="font-semibold text-gray-900">Leilão</h2>
                <p className="text-xs text-gray-500">Receba lances dos compradores</p>
              </div>
            </div>
            <button onClick={() => setAuctionEnabled(!auctionEnabled)}>
              {auctionEnabled
                ? <ToggleRight className="w-7 h-7 text-brand-purple" />
                : <ToggleLeft className="w-7 h-7 text-gray-300" />}
            </button>
          </div>
          {auctionEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lance mínimo (R$)</label>
                <input
                  type="number"
                  value={auctionStartPrice}
                  onChange={(e) => setAuctionStartPrice(e.target.value)}
                  placeholder="0,00"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Encerra em</label>
                <input
                  type="datetime-local"
                  value={auctionEnd}
                  onChange={(e) => setAuctionEnd(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Botão salvar ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Salvando alterações...' : 'Salvar alterações'}
        </button>

        {/* Link para o produto */}
        <Link
          href={`/product/${id}`}
          className="block text-center text-sm text-gray-500 hover:text-brand-purple transition-colors"
        >
          Ver anúncio publicado →
        </Link>

      </div>
    </div>
  );
}
