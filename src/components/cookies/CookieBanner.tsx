'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Cookie, ChevronRight } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const CookieModal = dynamic(() => import('./CookieModal'), { ssr: false });

export default function CookieBanner() {
  const { consent, isLoaded, acceptAll, rejectNonEssential, savePreferences } =
    useCookieConsent();

  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Show banner only after hydration and when no consent stored
  useEffect(() => {
    if (isLoaded && !consent) {
      // Slight delay so page renders first
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [isLoaded, consent]);

  // Hide immediately after any consent action
  const handleAcceptAll = async () => {
    setAccepting(true);
    await acceptAll();
    setVisible(false);
    setAccepting(false);
  };

  const handleReject = async () => {
    setRejecting(true);
    await rejectNonEssential();
    setVisible(false);
    setRejecting(false);
  };

  const handleSavePreferences = async (prefs: { analytics: boolean; marketing: boolean }) => {
    await savePreferences(prefs);
    setVisible(false);
    setModalOpen(false);
  };

  if (!visible && !modalOpen) return null;

  return (
    <>
      {/* Banner */}
      {visible && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Aviso de cookies"
          className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4 sm:pb-6 animate-slide-up"
        >
          {/* Safe area for mobile nav */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-purple/20 flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-brand-purple-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-base mb-1">Usamos cookies</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Utilizamos cookies{' '}
                    <span className="text-white font-medium">essenciais</span> para autenticação
                    e segurança da sua conta (sempre ativos). Opcionalmente, podemos usar cookies
                    de <span className="text-white font-medium">analytics</span> e{' '}
                    <span className="text-white font-medium">marketing</span> para melhorar sua
                    experiência e personalizar conteúdo.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {/* Accept All */}
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  disabled={accepting || rejecting}
                  className="flex-1 sm:flex-none order-1 sm:order-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-light disabled:opacity-60 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  {accepting ? 'Aceitando...' : 'Aceitar Todos'}
                </button>

                {/* Reject Non-Essential */}
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={accepting || rejecting}
                  className="flex-1 sm:flex-none order-2 sm:order-1 px-5 py-2.5 rounded-xl border border-white/20 hover:border-white/40 disabled:opacity-60 text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  {rejecting ? 'Aplicando...' : 'Rejeitar Não-Essenciais'}
                </button>

                {/* Manage */}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  disabled={accepting || rejecting}
                  className="order-3 flex items-center justify-center gap-1 px-4 py-2.5 text-sm text-brand-orange hover:text-brand-orange-light disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-xl"
                >
                  Gerenciar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CookieModal
          currentConsent={consent}
          onSave={handleSavePreferences}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
