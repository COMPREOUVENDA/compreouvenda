'use client';

import { useState } from 'react';
import { Bell, BellOff, Moon, Save, Check, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { NotificationPreferences } from '@/lib/push-notifications';

const NOTIFICATION_TYPES: Array<{
  key: keyof Omit<NotificationPreferences, 'quiet_hours_start' | 'quiet_hours_end'>;
  label: string;
  description: string;
  emoji: string;
}> = [
  { key: 'new_order',        label: 'Novo Pedido',        description: 'Quando alguém compra seu produto',        emoji: '🛍️' },
  { key: 'new_message',      label: 'Nova Mensagem',      description: 'Mensagens de compradores e vendedores',   emoji: '💬' },
  { key: 'product_sold',     label: 'Produto Vendido',    description: 'Confirmação de venda concluída',          emoji: '🎉' },
  { key: 'payment_received', label: 'Pagamento Recebido', description: 'Quando seu pagamento é liberado',         emoji: '💰' },
  { key: 'review_received',  label: 'Nova Avaliação',     description: 'Avaliações dos seus produtos',            emoji: '⭐' },
  { key: 'price_alert',      label: 'Alerta de Preço',    description: 'Variações de preço nos produtos salvos',  emoji: '📊' },
  { key: 'promotion',        label: 'Promoções',          description: 'Ofertas especiais e campanhas',           emoji: '🏷️' },
  { key: 'system',           label: 'Sistema',            description: 'Atualizações e avisos importantes',       emoji: '🔔' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                  transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  ${checked ? 'bg-purple-600' : 'bg-gray-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                    ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function NotificationPreferencesPanel() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe, preferences, updatePreferences } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState<NotificationPreferences>(preferences);

  // Sync when preferences load
  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updatePreferences(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Push toggle */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-purple-400" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              Notificações Push
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {isSubscribed
                ? 'Ativas — você receberá alertas em tempo real'
                : permission === 'denied'
                ? 'Bloqueadas pelo navegador — altere nas configurações'
                : 'Desativadas — ative para receber alertas'}
            </p>
          </div>
          {isSupported && permission !== 'denied' && (
            <Toggle
              checked={isSubscribed}
              onChange={isSubscribed ? unsubscribe : subscribe}
            />
          )}
        </div>

        {!isSupported && (
          <p className="mt-3 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
            Seu navegador não suporta notificações push.
          </p>
        )}
      </div>

      {/* Type toggles */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 space-y-1">
        <h3 className="font-semibold text-white mb-4">Tipos de Notificação</h3>

        {NOTIFICATION_TYPES.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" role="img" aria-label={item.label}>{item.emoji}</span>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
            </div>
            <Toggle
              checked={Boolean(local[item.key])}
              onChange={(v) => handleToggle(item.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-1">
          <Moon className="w-4 h-4 text-blue-400" /> Horário Silencioso
        </h3>
        <p className="text-xs text-gray-400 mb-4">Não receber notificações neste período</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Início</label>
            <input
              type="time"
              value={local.quiet_hours_start || ''}
              onChange={(e) => setLocal((p) => ({ ...p, quiet_hours_start: e.target.value || null }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fim</label>
            <input
              type="time"
              value={local.quiet_hours_end || ''}
              onChange={(e) => setLocal((p) => ({ ...p, quiet_hours_end: e.target.value || null }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold
                   py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saved ? 'Salvo!' : 'Salvar Preferências'}
      </button>
    </div>
  );
}
