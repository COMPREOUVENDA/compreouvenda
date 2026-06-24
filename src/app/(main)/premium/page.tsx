'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, Zap, Crown, Building2, Sparkles, Star,
  Shield, BarChart3, MessageCircle, Video, Infinity,
  ChevronDown, ArrowRight, BadgeCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';

const supabase = createClient();

const PLAN_ICONS: Record<string, any> = {
  free: Star,
  basic: Zap,
  pro: Crown,
  business: Building2,
};

const PLAN_GRADIENTS: Record<string, string> = {
  free:     'from-gray-400 to-gray-500',
  basic:    'from-brand-blue to-blue-600',
  pro:      'from-brand-purple to-[#7B2FBE]',
  business: 'from-brand-orange to-orange-600',
};

const FAQ_ITEMS = [
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Você pode cancelar sua assinatura a qualquer momento. Você continua com os benefícios até o fim do período pago.' },
  { q: 'O que são créditos de destaque?', a: 'São impulsos que colocam seus anúncios em posições de maior visibilidade no feed e nos resultados de busca.' },
  { q: 'O que são créditos de IA?', a: 'São gerações automáticas de título, descrição, precificação e vídeo. No plano Pro e Business são ilimitados.' },
  { q: 'Existe período de teste gratuito?', a: 'Sim! Novos assinantes dos planos Básico e Pro ganham 7 dias de trial gratuito.' },
  { q: 'Como funciona o plano anual?', a: 'O plano anual equivale a 2 meses grátis comparado ao plano mensal. O valor é cobrado de uma vez.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left gap-3">
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-gray-500 leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

export default function PremiumPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price_monthly');
      if (data) setPlans(data);

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('subscription_plan')
          .eq('auth_id', user.id)
          .single();
        if (profile) setCurrentPlan(profile.subscription_plan || 'free');
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const getPrice = (plan: any) =>
    billing === 'monthly' ? plan.price_monthly : plan.price_yearly / 12;

  const yearSaving = (plan: any) =>
    Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-brand-purple/10 text-brand-purple text-xs font-bold px-4 py-1.5 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          PLANOS & ASSINATURAS
        </div>
        <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
          Venda mais com o plano certo
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          Destaques, IA ilimitada e relatórios avançados para turbinar suas vendas.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Mensal</span>
          <button
            onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-12 h-6 rounded-full transition-all relative ${billing === 'yearly' ? 'bg-brand-purple' : 'bg-gray-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Anual
            <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">-17%</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || Star;
            const gradient = PLAN_GRADIENTS[plan.id] || 'from-gray-400 to-gray-500';
            const isCurrent = currentPlan === plan.id;
            const isPro = plan.highlight;
            const price = getPrice(plan);
            const saving = yearSaving(plan);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border-2 transition-all flex flex-col ${
                  isPro
                    ? 'border-brand-purple shadow-xl shadow-brand-purple/20 scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-purple to-brand-orange text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    Mais popular
                  </div>
                )}

                <div className={`bg-gradient-to-br ${gradient} rounded-t-[22px] p-5 text-white`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-display font-bold text-lg">{plan.name}</span>
                  </div>
                  <div>
                    {price === 0 ? (
                      <span className="text-3xl font-bold">Grátis</span>
                    ) : (
                      <>
                        <span className="text-xs font-medium opacity-80">R$</span>
                        <span className="text-3xl font-bold mx-1">{price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-xs opacity-80">/mês</span>
                      </>
                    )}
                  </div>
                  {billing === 'yearly' && plan.price_yearly > 0 && (
                    <p className="text-xs opacity-80 mt-0.5">
                      R$ {plan.price_yearly.toFixed(2).replace('.', ',')} por ano · {saving}% de economia
                    </p>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">
                        {plan.max_listings === -1 ? '∞' : plan.max_listings}
                      </p>
                      <p className="text-xs text-gray-400">Anúncios</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">
                        {plan.boost_credits === -1 ? '∞' : plan.boost_credits}
                      </p>
                      <p className="text-xs text-gray-400">Destaques</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm text-gray-900">
                        {plan.ai_credits === -1 ? '∞' : plan.ai_credits}
                      </p>
                      <p className="text-xs text-gray-400">IA</p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 flex-1 mb-5">
                    {(plan.features as string[]).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold">
                      <BadgeCheck className="w-4 h-4" />
                      Plano atual
                    </div>
                  ) : (
                    <Link
                      href={user ? `/checkout?plan=${plan.id}&billing=${billing}` : '/login?next=/premium'}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                        isPro
                          ? 'bg-brand-purple text-white hover:bg-brand-purple/90'
                          : plan.id === 'free'
                          ? 'border-2 border-gray-200 text-gray-600 hover:border-gray-300'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {plan.id === 'free' ? 'Plano atual' : `Assinar ${plan.name}`}
                      {plan.id !== 'free' && <ArrowRight className="w-4 h-4" />}
                    </Link>
                  )}

                  {plan.id !== 'free' && (
                    <p className="text-center text-xs text-gray-400 mt-2">7 dias grátis · Cancele quando quiser</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-6 mt-10">
        {[
          { icon: Shield, text: 'Pagamento seguro' },
          { icon: BadgeCheck, text: 'Cancele quando quiser' },
          { icon: MessageCircle, text: 'Suporte em português' },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
            <b.icon className="w-4 h-4 text-brand-purple" />
            {b.text}
          </div>
        ))}
      </div>

      {/* Comparison table — mobile friendly */}
      <div className="mt-10">
        <h2 className="font-display font-bold text-xl text-gray-900 mb-4 text-center">
          Comparativo completo
        </h2>
        <div className="card overflow-hidden">
          {[
            { feature: 'Anúncios ativos', values: ['5', '20', 'Ilimitado', 'Ilimitado'] },
            { feature: 'Destaques/mês', values: ['0', '5', '20', '50'] },
            { feature: 'Geração IA', values: ['5/mês', '20/mês', 'Ilimitado', 'Ilimitado'] },
            { feature: 'Vídeo IA de produto', values: ['✗', '✗', '✓', '✓'] },
            { feature: 'Badge no perfil', values: ['✗', '✗', 'PRO', 'BUSINESS'] },
            { feature: 'Relatórios', values: ['—', 'Básico', 'Avançado', 'Personalizado'] },
            { feature: 'Suporte', values: ['Email', 'Prioritário', 'WhatsApp', 'Gerente dedicado'] },
          ].map((row, i) => (
            <div key={i} className={`grid grid-cols-5 text-sm ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
              <div className="col-span-1 px-4 py-3 font-medium text-gray-700 text-xs">{row.feature}</div>
              {row.values.map((v, j) => (
                <div key={j} className={`px-2 py-3 text-center text-xs ${j === 2 ? 'text-brand-purple font-semibold' : 'text-gray-600'}`}>
                  {v === '✓' ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : v === '✗' ? <span className="text-gray-300">—</span> : v}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="font-display font-bold text-xl text-gray-900 mb-4 text-center">
          Perguntas frequentes
        </h2>
        <div className="card px-5">
          {FAQ_ITEMS.map((item, i) => <FAQItem key={i} {...item} />)}
        </div>
      </div>
    </div>
  );
}
