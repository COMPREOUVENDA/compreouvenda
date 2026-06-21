'use client';

import { useState } from 'react';
import { Zap, Star, Crown, Check, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface FeaturedPlan {
  id: 'basic' | 'premium' | 'ultra';
  name: string;
  price: number;
  days: number;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  features: string[];
}

const PLANS: FeaturedPlan[] = [
  {
    id: 'basic',
    name: 'Destaque',
    price: 4.90,
    days: 7,
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    features: [
      'Aparece primeiro na busca',
      'Selo "Em destaque"',
      '7 dias de exposição',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.90,
    days: 15,
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    features: [
      'Tudo do Destaque',
      'Banner no feed principal',
      '15 dias de exposição',
      'Métricas de visibilidade',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 19.90,
    days: 30,
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    features: [
      'Tudo do Premium',
      'Topo da categoria',
      '30 dias de exposição',
      'Notificação para interessados',
      'Relatório completo de alcance',
    ],
  },
];

interface BoostProductModalProps {
  productId: string;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BoostProductModal({
  productId,
  productTitle,
  onClose,
  onSuccess,
}: BoostProductModalProps) {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<FeaturedPlan['id']>('basic');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleBoost() {
    if (!user) return;
    setLoading(true);

    const plan = PLANS.find((p) => p.id === selectedPlan)!;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + plan.days);

    const { error } = await supabase.from('featured_products').insert({
      product_id: productId,
      user_id: user.id,
      plan: selectedPlan,
      ends_at: endsAt.toISOString(),
      price_paid: plan.price,
      status: 'active',
    });

    if (!error) {
      // Marcar produto como em destaque
      await supabase
        .from('products')
        .update({ is_featured: true, featured_until: endsAt.toISOString() })
        .eq('id', productId);

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-bold text-xl text-gray-900 mb-2">Destaque ativado!</h3>
          <p className="text-gray-500 text-sm">Seu anúncio já está aparecendo com destaque para mais compradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Impulsionar anúncio</h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Planos */}
        <div className="p-4 space-y-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? `${plan.bgColor} border-current ${plan.color}`
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${isSelected ? plan.color : 'text-gray-400'}`} />
                    <span className={`font-bold ${isSelected ? plan.color : 'text-gray-800'}`}>
                      {plan.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${isSelected ? plan.color : 'text-gray-800'}`}>
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-xs text-gray-400">{plan.days} dias</div>
                  </div>
                </div>
                <ul className="space-y-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className={`w-3 h-3 flex-shrink-0 ${isSelected ? plan.color : 'text-gray-400'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 pt-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm text-gray-500">Total a pagar:</span>
            <span className="font-bold text-lg text-gray-900">
              R$ {PLANS.find((p) => p.id === selectedPlan)!.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <button
            onClick={handleBoost}
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3.5"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Ativar destaque agora
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            O valor será debitado da sua carteira COMPREOUVENDA
          </p>
        </div>
      </div>
    </div>
  );
}
