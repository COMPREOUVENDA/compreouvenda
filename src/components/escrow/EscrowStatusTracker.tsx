'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Clock,
  CreditCard,
  Truck,
  Package,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

type EscrowStatus =
  | 'pending_payment'
  | 'payment_held'
  | 'shipped'
  | 'delivered_pending_confirmation'
  | 'confirmed'
  | 'payment_released'
  | 'disputed'
  | 'cancelled';

interface Step {
  key: EscrowStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { key: 'pending_payment', label: 'Aguardando Pagamento', description: 'Pagamento ainda não confirmado', icon: CreditCard },
  { key: 'payment_held', label: 'Pagamento Retido', description: 'Valor protegido no escrow', icon: Clock },
  { key: 'shipped', label: 'Enviado', description: 'Produto a caminho', icon: Truck },
  { key: 'delivered_pending_confirmation', label: 'Aguardando Confirmação', description: 'Confirme o recebimento', icon: QrCode },
  { key: 'confirmed', label: 'Confirmado', description: 'Recebimento confirmado', icon: CheckCircle2 },
  { key: 'payment_released', label: 'Pagamento Liberado', description: 'Transação concluída', icon: CheckCircle2 },
];

function getStepIndex(status: EscrowStatus): number {
  const normalFlow: EscrowStatus[] = [
    'pending_payment', 'payment_held', 'shipped',
    'delivered_pending_confirmation', 'confirmed', 'payment_released',
  ];
  return normalFlow.indexOf(status);
}

interface Props {
  orderId: string;
  initialStatus?: EscrowStatus;
  autoReleaseAt?: string | null;
  onStatusChange?: (status: EscrowStatus) => void;
}

export default function EscrowStatusTracker({ orderId, initialStatus = 'pending_payment', autoReleaseAt, onStatusChange }: Props) {
  const [status, setStatus] = useState<EscrowStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to realtime changes on escrow_transactions
    const channel = supabase
      .channel(`escrow:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'escrow_transactions',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status as EscrowStatus;
          if (newStatus) {
            setStatus(newStatus);
            onStatusChange?.(newStatus);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, onStatusChange]);

  const currentIndex = getStepIndex(status);
  const isDisputed = status === 'disputed';
  const isCancelled = status === 'cancelled';

  if (isDisputed) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-400">Disputa Aberta</p>
          <p className="text-sm text-gray-400 mt-1">Nossa equipe está analisando o caso. Você será notificado em breve.</p>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="bg-gray-700/50 border border-gray-600 rounded-2xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
        <p className="font-semibold text-gray-400">Pedido cancelado</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Atualizando status...</span>
        </div>
      )}

      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isPending = idx > currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Line connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#5B2D8E]'
                    : isActive
                    ? 'bg-[#F5921E] ring-2 ring-[#F5921E]/40'
                    : 'bg-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCompleted || isActive ? 'text-white' : 'text-gray-500'}`} />
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 transition-all duration-300 ${isCompleted ? 'bg-[#5B2D8E]' : 'bg-gray-700'}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isPending ? 'opacity-40' : ''}`}>
              <p className={`text-sm font-semibold ${isActive ? 'text-[#F5921E]' : isCompleted ? 'text-white' : 'text-gray-400'}`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>

              {/* Auto-release countdown for delivered_pending_confirmation */}
              {isActive && step.key === 'delivered_pending_confirmation' && autoReleaseAt && (
                <AutoReleaseCountdown autoReleaseAt={autoReleaseAt} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AutoReleaseCountdown({ autoReleaseAt }: { autoReleaseAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(autoReleaseAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Liberação automática em breve'); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setTimeLeft(`Liberação automática em ${days}d ${hours}h`);
    }
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [autoReleaseAt]);

  return (
    <p className="text-xs text-amber-400 mt-1">{timeLeft}</p>
  );
}
