'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Heart, TrendingUp, Award, Users, HandHeart, CheckCircle,
  ArrowRight, BarChart3, Globe, Leaf, BookOpen, Baby, Dog,
  Loader2, ChevronDown, ChevronUp, Share2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const supabase = createClient();

interface Charity {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  category: string;
  total_received: number;
  supporters: number;
  mission?: string;
  website?: string;
}

interface ImpactItem {
  icon: typeof Heart;
  color: string;
  label: string;
  value: string;
}

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  saude: Heart,
  educacao: BookOpen,
  criancas: Baby,
  meio_ambiente: Leaf,
  animais: Dog,
  social: Users,
  default: HandHeart,
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SolidarioPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [stats, setStats] = useState({ totalDonated: 0, totalCharities: 0, totalDonors: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from('charities')
      .select('*')
      .eq('active', true)
      .order('total_received', { ascending: false });

    if (data) {
      setCharities(data);
      setStats({
        totalDonated: data.reduce((sum, c) => sum + (c.total_received || 0), 0),
        totalCharities: data.length,
        totalDonors: data.reduce((sum, c) => sum + (c.supporters || 0), 0),
        totalTransactions: data.reduce((sum, c) => sum + (c.supporters || 0), 0),
      });
    }
    setLoading(false);
  }

  // Impacto traduzido em ações concretas
  const impactItems: ImpactItem[] = [
    {
      icon: BookOpen,
      color: 'text-blue-600',
      label: 'Livros doados (estimativa)',
      value: `${Math.floor(stats.totalDonated / 25)}`,
    },
    {
      icon: Baby,
      color: 'text-pink-600',
      label: 'Crianças beneficiadas',
      value: `${Math.floor(stats.totalDonors * 2.3)}`,
    },
    {
      icon: Leaf,
      color: 'text-green-600',
      label: 'Árvores plantadas (equiv.)',
      value: `${Math.floor(stats.totalDonated / 12)}`,
    },
    {
      icon: Globe,
      color: 'text-indigo-600',
      label: 'Comunidades impactadas',
      value: `${Math.max(1, stats.totalCharities)}`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 px-6 pt-12 pb-16 text-white text-center">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Heart className="w-8 h-8 fill-white" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Módulo Solidário</h1>
          <p className="text-white/90 max-w-sm mx-auto leading-relaxed">
            Cada venda na COMPREOUVENDA pode gerar impacto real. Você vende, o mundo melhora.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 space-y-5">

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalDonated)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total doado</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-purple-600">{stats.totalCharities}</p>
            <p className="text-xs text-gray-500 mt-0.5">Instituições parceiras</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.totalDonors.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Apoiadores</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <HandHeart className="w-5 h-5 text-pink-600" />
            </div>
            <p className="text-xl font-bold text-pink-600">{stats.totalTransactions.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Vendas solidárias</p>
          </div>
        </div>

        {/* Impacto concreto */}
        {stats.totalDonated > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-800">Impacto gerado</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {impactItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{item.value}</div>
                      <div className="text-xs text-gray-500 leading-tight">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">* Valores estimados com base nas doações realizadas</p>
          </div>
        )}

        {/* Como funciona */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Como funciona</h2>
          <div className="space-y-4">
            {[
              {
                step: '1',
                icon: CheckCircle,
                color: 'text-purple-600',
                bg: 'bg-purple-100',
                title: 'Ative ao criar o anúncio',
                desc: 'Ao publicar um produto, ative a opção solidária e escolha uma instituição parceira.',
              },
              {
                step: '2',
                icon: Heart,
                color: 'text-pink-600',
                bg: 'bg-pink-100',
                title: 'Você escolhe o percentual',
                desc: 'Defina quanto do valor da venda você quer destinar — de 1% até 100%.',
              },
              {
                step: '3',
                icon: TrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-100',
                title: 'A doação é automática',
                desc: 'Quando o produto é vendido e o escrow liberado, a doação é processada automaticamente.',
              },
              {
                step: '4',
                icon: Globe,
                color: 'text-blue-600',
                bg: 'bg-blue-100',
                title: 'Transparência total',
                desc: 'Todas as doações são públicas e rastreáveis. Você pode acompanhar o impacto gerado.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    <Icon className={`w-4.5 h-4.5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de instituições */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Instituições parceiras</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : charities.length > 0 ? (
            <div className="space-y-3">
              {charities.map((charity, index) => {
                const CategoryIcon = CATEGORY_ICONS[charity.category?.toLowerCase()] || CATEGORY_ICONS.default;
                const isExpanded = expandedId === charity.id;
                const isTop = index === 0;

                return (
                  <div
                    key={charity.id}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isTop ? 'ring-2 ring-pink-200' : ''}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Logo ou ícone */}
                        <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {charity.logo_url ? (
                            <Image
                              src={charity.logo_url}
                              alt={charity.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 object-cover"
                            />
                          ) : (
                            <CategoryIcon className="w-6 h-6 text-pink-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">{charity.name}</h3>
                            {isTop && (
                              <span className="px-1.5 py-0.5 bg-pink-100 text-pink-600 text-xs rounded-full font-medium flex-shrink-0">
                                Top
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{charity.category || 'Social'}</p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(charity.total_received || 0)}
                          </p>
                          <p className="text-xs text-gray-400">{charity.supporters || 0} apoiadores</p>
                        </div>
                      </div>

                      {/* Barra de progresso (visual) */}
                      {stats.totalDonated > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, ((charity.total_received || 0) / stats.totalDonated) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{(((charity.total_received || 0) / Math.max(1, stats.totalDonated)) * 100).toFixed(0)}% do total</span>
                          </div>
                        </div>
                      )}

                      {/* Expandir descrição */}
                      {charity.description && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : charity.id)}
                          className="flex items-center gap-1 text-xs text-purple-600 mt-2 hover:text-purple-700 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Menos detalhes' : 'Ver mais'}
                        </button>
                      )}
                    </div>

                    {/* Detalhes expandidos */}
                    {isExpanded && charity.description && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed mt-3">{charity.description}</p>
                        {charity.mission && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-xl">
                            <p className="text-xs font-medium text-purple-700 mb-1">Missão</p>
                            <p className="text-xs text-purple-600">{charity.mission}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Instituições em breve!</p>
              <p className="text-sm text-gray-400 mt-1">
                Queremos ser sua ONG parceira?{' '}
                <a href="mailto:solidario@compreouvenda.com" className="text-purple-600 underline">
                  Entre em contato
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Compartilhe o movimento */}
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white text-center">
          <Share2 className="w-8 h-8 mx-auto mb-3 opacity-80" />
          <h3 className="font-bold text-lg mb-1">Compartilhe o movimento</h3>
          <p className="text-sm text-white/80 mb-4">
            Cada pessoa que você convida pode gerar mais doações para quem precisa.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/product/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 font-semibold rounded-full hover:shadow-lg transition text-sm"
            >
              <Heart className="w-4 h-4" />
              Anunciar com propósito
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              Ver o marketplace
            </Link>
          </div>
        </div>

        {/* Certificado / Transparência */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-800 text-sm">Transparência garantida</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Todas as doações são processadas automaticamente após a confirmação de cada entrega. Os relatórios de impacto são atualizados em tempo real. A COMPREOUVENDA não retém nenhum percentual destinado às instituições.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
