'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { X, Shield, BarChart2, Megaphone, Lock } from 'lucide-react';
import type { CookieConsent } from '@/hooks/useCookieConsent';

interface CookieModalProps {
  currentConsent: CookieConsent | null;
  onSave: (prefs: { analytics: boolean; marketing: boolean }) => Promise<void>;
  onClose: () => void;
}

interface Category {
  id: 'essential' | 'analytics' | 'marketing';
  icon: ReactNode;
  title: string;
  description: string;
  required: boolean;
}

const categories: Category[] = [
  {
    id: 'essential',
    icon: <Shield className="w-5 h-5 text-brand-purple" />,
    title: 'Essenciais',
    description:
      'Necessários para o funcionamento do site. Incluem autenticação Supabase, segurança da sessão e preferências básicas. Não podem ser desativados.',
    required: true,
  },
  {
    id: 'analytics',
    icon: <BarChart2 className="w-5 h-5 text-brand-blue" />,
    title: 'Analytics',
    description:
      'Nos ajudam a entender como você usa o aplicativo para melhorar a experiência. Os dados são agregados e anônimos.',
    required: false,
  },
  {
    id: 'marketing',
    icon: <Megaphone className="w-5 h-5 text-brand-orange" />,
    title: 'Marketing',
    description:
      'Permitem exibir anúncios personalizados com base nos seus interesses e medir a eficácia de campanhas.',
    required: false,
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2',
        disabled
          ? 'bg-brand-purple opacity-70 cursor-not-allowed'
          : checked
          ? 'bg-brand-purple cursor-pointer'
          : 'bg-gray-600 cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

export default function CookieModal({ currentConsent, onSave, onClose }: CookieModalProps) {
  const [analytics, setAnalytics] = useState(currentConsent?.analytics ?? false);
  const [marketing, setMarketing] = useState(currentConsent?.marketing ?? false);
  const [saving, setSaving] = useState(false);

  // Sync if consent changes externally
  useEffect(() => {
    setAnalytics(currentConsent?.analytics ?? false);
    setMarketing(currentConsent?.marketing ?? false);
  }, [currentConsent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ analytics, marketing });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getToggleState = (id: Category['id']) => {
    if (id === 'essential') return true;
    if (id === 'analytics') return analytics;
    return marketing;
  };

  const handleToggle = (id: Category['id'], val: boolean) => {
    if (id === 'analytics') setAnalytics(val);
    if (id === 'marketing') setMarketing(val);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-purple" />
            <h2 id="cookie-modal-title" className="text-white font-semibold text-lg">
              Gerenciar Cookies
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-400 text-sm leading-relaxed">
            Escolha quais categorias de cookies você deseja permitir. Os cookies essenciais são
            sempre ativos pois são necessários para o funcionamento básico do aplicativo.
          </p>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/8"
            >
              <div className="mt-0.5 flex-shrink-0">{cat.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{cat.title}</span>
                    {cat.required && (
                      <span className="text-xs bg-brand-purple/20 text-brand-purple-light border border-brand-purple/30 rounded-full px-2 py-0.5">
                        Sempre ativo
                      </span>
                    )}
                  </div>
                  <Toggle
                    checked={getToggleState(cat.id)}
                    disabled={cat.required}
                    onChange={(val) => handleToggle(cat.id, val)}
                    label={`Ativar ${cat.title}`}
                  />
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-brand-purple hover:bg-brand-purple-light disabled:opacity-60 text-white rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </button>
        </div>
      </div>
    </div>
  );
}
