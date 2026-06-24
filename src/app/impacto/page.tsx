import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Users, TrendingUp, Globe, Award, CheckCircle, Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Impacto Social | COMPREOUVENDA.COM',
  description: 'Veja como cada compra no COMPREOUVENDA gera impacto real. Transparência total sobre doações e beneficiários.',
};

export const revalidate = 3600; // Revalida a cada 1 hora

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getImpactData() {
  const [donationsRes, charitiesRes, statsRes] = await Promise.all([
    supabase
      .from('donations')
      .select('amount, created_at, charity:charities(name, category, logo_url)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('charities')
      .select('id, name, category, logo_url, description, city, state')
      .eq('active', true)
      .order('name'),
    supabase
      .from('donations')
      .select('amount')
      .eq('status', 'completed'),
  ]);

  const donations = donationsRes.data || [];
  const charities = charitiesRes.data || [];
  const allDonations = statsRes.data || [];

  const totalDonated = allDonations.reduce((s: number, d: any) => s + (d.amount || 0), 0);

  return { donations, charities, totalDonated, totalTransactions: allDonations.length };
}

const CATEGORY_ICONS: Record<string, string> = {
  education: '🎓',
  environment: '🌱',
  health: '❤️',
  animals: '🐾',
  children: '👶',
  elderly: '👴',
  food: '🍽️',
  culture: '🎭',
  default: '🤝',
};

export default async function ImpactPage() {
  const { donations, charities, totalDonated, totalTransactions } = await getImpactData();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3">
          <Leaf className="w-3.5 h-3.5" />
          TRANSPARÊNCIA TOTAL
        </div>
        <h1 className="font-display font-bold text-3xl text-gray-900 mb-3">
          Cada compra gera impacto real
        </h1>
        <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
          Parte de cada venda solidária vai direto para instituições verificadas.
          Sem intermediários, com total rastreabilidade.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          {
            icon: Heart,
            label: 'Total doado',
            value: `R$ ${totalDonated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            color: 'text-brand-pink',
            bg: 'bg-brand-pink/10',
          },
          {
            icon: TrendingUp,
            label: 'Transações',
            value: totalTransactions.toLocaleString('pt-BR'),
            color: 'text-brand-purple',
            bg: 'bg-brand-purple/10',
          },
          {
            icon: Users,
            label: 'Instituições',
            value: charities.length.toString(),
            color: 'text-brand-blue',
            bg: 'bg-brand-blue/10',
          },
          {
            icon: Globe,
            label: 'Cidades',
            value: `${new Set(charities.map((c: any) => c.city).filter(Boolean)).size}`,
            color: 'text-brand-orange',
            bg: 'bg-brand-orange/10',
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`font-bold text-lg ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      <div className="card p-6 mb-8">
        <h2 className="font-display font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-purple" />
          Como funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Vendedor ativa', desc: 'Ao criar um anúncio, o vendedor ativa o modo solidário e escolhe a porcentagem e a instituição.' },
            { step: '2', title: 'Compra realizada', desc: 'Quando a venda é confirmada, o valor destinado à doação é separado automaticamente.' },
            { step: '3', title: 'Repasse garantido', desc: 'A doação é transferida mensalmente para a conta da instituição. Tudo auditado.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instituições parceiras */}
      {charities.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-4">
            Instituições parceiras verificadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {charities.map((charity: any) => (
              <div key={charity.id} className="card p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl overflow-hidden">
                  {charity.logo_url ? (
                    <Image src={charity.logo_url} alt={charity.name} width={48} height={48} className="object-cover" />
                  ) : (
                    CATEGORY_ICONS[charity.category] || CATEGORY_ICONS.default
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{charity.name}</p>
                    <CheckCircle className="w-4 h-4 text-brand-blue flex-shrink-0" />
                  </div>
                  {charity.description && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{charity.description}</p>
                  )}
                  {(charity.city || charity.state) && (
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {[charity.city, charity.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas doações */}
      {donations.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-4">
            Doações recentes
          </h2>
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50">
              {donations.map((d: any, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-sm">
                      {CATEGORY_ICONS[(d.charity as any)?.category] || '🤝'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {(d.charity as any)?.name || 'Instituição parceira'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(d.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    +R$ {(d.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-br from-brand-purple/10 via-emerald-50 to-brand-orange/10 rounded-3xl p-6 text-center border border-brand-purple/10">
        <Heart className="w-10 h-10 text-brand-pink mx-auto mb-3" />
        <h3 className="font-display font-bold text-xl text-gray-900 mb-2">
          Faça parte desse movimento
        </h3>
        <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
          Ative o modo solidário no seu próximo anúncio e ajude uma instituição da sua escolha.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/product/new" className="btn-primary flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" /> Criar anúncio solidário
          </Link>
          <Link href="/solidario" className="btn-secondary flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> Ver instituições
          </Link>
        </div>
      </div>
    </main>
  );
}
