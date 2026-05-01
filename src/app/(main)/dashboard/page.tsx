'use client';

import { useState } from 'react';
import { Package, ShoppingBag, Heart, Video, Users, HandHeart, Gavel, FileText, Settings, Bell, Star, TrendingUp, Store, UserCheck, Percent } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

const TABS = [
  { id: 'listings', label: 'Anúncios', icon: Package },
  { id: 'sold', label: 'Vendidos', icon: TrendingUp },
  { id: 'purchases', label: 'Compras', icon: ShoppingBag },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'commissions', label: 'Comissões', icon: Users },
  { id: 'donations', label: 'Doações', icon: HandHeart },
  { id: 'settings', label: 'Config', icon: Settings },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('listings');
  const [sellerMode, setSellerMode] = useState<'owner' | 'commissioned' | null>(null);
  const [donationPercent, setDonationPercent] = useState(2);
  const [showSellerSetup, setShowSellerSetup] = useState(true);
  const products = MOCK_PRODUCTS as Product[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Seller Profile Setup */}
      {showSellerSetup && (
        <div className="card-elevated p-6 mb-6 border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900">Como você deseja vender?</h2>
            {sellerMode && (
              <button onClick={() => setShowSellerSetup(false)} className="text-xs text-brand-purple font-semibold hover:underline">
                Salvar e fechar
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">Escolha seu perfil de vendas na plataforma</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setSellerMode('owner')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'owner' ? 'border-brand-purple bg-brand-purple/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Store className={`w-6 h-6 mb-2 ${sellerMode === 'owner' ? 'text-brand-purple' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Proprietário</span>
              <span className="text-xs text-gray-400 mt-1 block">Venda seus próprios produtos diretamente na plataforma</span>
            </button>

            <button
              onClick={() => setSellerMode('commissioned')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'commissioned' ? 'border-brand-orange bg-brand-orange/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <UserCheck className={`w-6 h-6 mb-2 ${sellerMode === 'commissioned' ? 'text-brand-orange' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Comissionado</span>
              <span className="text-xs text-gray-400 mt-1 block">Revenda produtos de terceiros e ganhe comissão sobre cada venda</span>
            </button>
          </div>

          {/* Donation Percentage */}
          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <HandHeart className="w-5 h-5 text-emerald-600" />
              <span className="font-display font-semibold text-sm text-emerald-800">Ofertar percentual a instituições</span>
            </div>
            <p className="text-xs text-emerald-600/70 mb-3">Defina o percentual do valor líquido (após taxas, comissões e split) que será doado a instituições beneficentes</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={donationPercent}
                onChange={(e) => setDonationPercent(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-2"
              />
              <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-1.5 border border-emerald-200 min-w-[70px] justify-center">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-display font-bold text-emerald-700">{donationPercent}</span>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-emerald-500/70 px-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <p className="text-[10px] text-emerald-500/60 mt-2 italic">* O percentual incide sobre o valor líquido que você receberia após todas as taxas da plataforma, gateway e comissões do split.</p>
          </div>

          {sellerMode && (
            <div className="mt-4 p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-brand-purple">
                  {sellerMode === 'owner' ? '🏪 Proprietário' : '🤝 Comissionado'}
                </span>
                {' · '}Doação de <span className="font-bold text-emerald-600">{donationPercent}%</span> por venda para instituições
              </p>
            </div>
          )}
        </div>
      )}

      {/* Profile header */}
      <div className="card-elevated p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white font-display font-bold text-2xl">
            T
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-gray-900">Thaís Azevedo</h1>
              <span className="bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded">PRO</span>
            </div>
            <p className="text-sm text-gray-400">São Paulo, SP · Membro desde Jan 2024</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-brand-gold text-brand-gold" />
              <span className="text-sm font-semibold">4.9</span>
              <span className="text-xs text-gray-400">(47 avaliações)</span>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-xl relative">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Anúncios', value: '12', color: 'bg-brand-purple/10 text-brand-purple' },
            { label: 'Vendas', value: '8', color: 'bg-brand-orange/10 text-brand-orange' },
            { label: 'Comissões', value: 'R$ 340', color: 'bg-brand-blue/10 text-brand-blue' },
            { label: 'Doações', value: 'R$ 120', color: 'bg-emerald-50 text-emerald-600' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-3 text-center ${stat.color}`}>
              <span className="block font-display font-bold text-lg">{stat.value}</span>
              <span className="text-[10px] font-medium opacity-70">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'listings' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} style="card" />
          ))}
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-3">
          <div className="card-elevated p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Comissões</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <span className="text-xs text-amber-600">Pendente</span>
                <span className="block font-display font-bold text-amber-600">R$ 140</span>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-600">Aprovado</span>
                <span className="block font-display font-bold text-emerald-600">R$ 200</span>
              </div>
              <div className="bg-brand-blue/10 rounded-xl p-3 text-center">
                <span className="text-xs text-brand-blue">Total Pago</span>
                <span className="block font-display font-bold text-brand-blue">R$ 340</span>
              </div>
            </div>
            {[
              { product: 'iPhone 14 Pro', value: 'R$ 260', status: 'Pago', statusColor: 'text-emerald-600 bg-emerald-50' },
              { product: 'MacBook Air', value: 'R$ 225', status: 'Pendente', statusColor: 'text-amber-600 bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <span className="font-medium text-sm text-gray-900">{item.product}</span>
                  <span className="block text-xs text-gray-400">Comissão: {item.value}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.statusColor}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'donations' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Doações</h3>
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
            <HandHeart className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-display font-bold text-2xl text-emerald-600">R$ 120,00</span>
            <p className="text-xs text-emerald-600/70 mt-1">Total doado através das suas vendas</p>
          </div>
          {[
            { charity: 'AACD', product: 'iPhone 14', value: 'R$ 80', date: '15/04/2024' },
            { charity: 'Cruz Vermelha', product: 'Vestido Azul', value: 'R$ 40', date: '10/04/2024' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <span className="font-medium text-sm text-gray-900">{item.charity}</span>
                <span className="block text-xs text-gray-400">Venda: {item.product} · {item.date}</span>
              </div>
              <span className="font-display font-bold text-emerald-600">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Meus Vídeos</h3>
          <div className="grid grid-cols-2 gap-3">
            {products.filter(p => p.video_status === 'ready').slice(0, 4).map((p) => (
              <div key={p.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-200">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${p.video_thumbnail || p.images?.[0]?.url})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                  <span className="text-white/60 text-[10px]">20s · Modelo</span>
                </div>
                <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Pronto</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'sold' || activeTab === 'purchases' || activeTab === 'favorites' || activeTab === 'settings') && (
        <div className="text-center py-12">
          <p className="text-gray-300 font-display text-lg">Em breve</p>
        </div>
      )}
    </div>
  );
}
