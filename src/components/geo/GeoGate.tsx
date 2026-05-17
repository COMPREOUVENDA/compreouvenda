'use client';

import { useState } from 'react';
import { MapPin, Shield, Users, Heart, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

// ─── Reasons to share location ──────────────────────────────────────────────

const REASONS = [
  {
    icon: Shield,
    title: 'Segurança nas transações',
    desc: 'Conectamos apenas usuários da mesma região, reduzindo fraudes e garantindo negociações confiáveis.',
    color: 'text-[#5B2D8E]',
    bg: 'bg-[#5B2D8E]/10',
  },
  {
    icon: Users,
    title: 'Compradores e vendedores próximos',
    desc: 'Exibimos produtos realmente perto de você para facilitar a entrega e o contato entre as partes.',
    color: 'text-[#F5921E]',
    bg: 'bg-[#F5921E]/10',
  },
  {
    icon: Heart,
    title: 'Doações para sua cidade',
    desc: 'Parte de cada venda é doada automaticamente a instituições beneficentes da sua cidade.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
];

// ─── Platform instructions (iOS / Android / Desktop) ─────────────────────────

const PLATFORM_INSTRUCTIONS = [
  {
    label: 'iPhone / Safari',
    steps: [
      'Abra Ajustes do iPhone',
      'Toque em Safari → Localização',
      'Selecione "Perguntar" ou "Permitir"',
      'Volte ao navegador e toque em Tentar Novamente',
    ],
  },
  {
    label: 'Android / Chrome',
    steps: [
      'Toque no cadeado ao lado da URL',
      'Toque em Permissões → Localização',
      'Selecione "Permitir"',
      'Recarregue a página ou toque em Tentar Novamente',
    ],
  },
  {
    label: 'Chrome Desktop',
    steps: [
      'Clique no cadeado (🔒) ao lado da URL',
      'Clique em Permissões do site',
      'Em Localização, escolha "Permitir"',
      'Toque em Tentar Novamente abaixo',
    ],
  },
  {
    label: 'Firefox',
    steps: [
      'Clique no cadeado ao lado da URL',
      'Clique em "Permissões"',
      'Em "Acessar sua localização", clique em "Permitir"',
      'Toque em Tentar Novamente abaixo',
    ],
  },
];

// ─── GeoGate Component ────────────────────────────────────────────────────────

export default function GeoGate() {
  const { status, loading, error, requestLocation } = useGeolocation();
  const [showInstructions, setShowInstructions] = useState(false);

  // Only render the gate if permission is not yet granted
  if (status === 'granted') return null;

  const isDenied = status === 'denied';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#5B2D8E] via-[#3d1d62] to-[#1a0a2e] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Ativação de localização obrigatória"
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#F5921E]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#5B2D8E]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-4 py-10 animate-slide-up">

        {/* Logo / Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-4 ring-2 ring-white/20 shadow-2xl">
            <MapPin className="w-10 h-10 text-[#F5921E]" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white mb-1">
            Ative sua Localização
          </h1>
          <p className="text-white/60 text-sm">COMPREOUVENDA.COM</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl p-7 mb-6">

          {/* Denied state — show error + instructions */}
          {isDenied && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Permissão negada</p>
                {error && (
                  <p className="text-xs text-amber-700 mt-0.5">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* Heading */}
          {!isDenied && (
            <>
              <h2 className="font-display font-bold text-xl text-gray-900 text-center mb-1">
                Por que precisamos da sua localização?
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                A localização é <strong className="text-[#5B2D8E]">obrigatória</strong> para usar o CompreOuVenda.
                Coletamos apenas sua <strong>cidade e estado</strong> — nunca coordenadas exatas.
              </p>
            </>
          )}

          {isDenied && (
            <p className="text-sm text-gray-600 text-center mb-5">
              Siga as instruções abaixo para permitir a localização nas configurações do seu
              dispositivo, depois toque em <strong>Tentar Novamente</strong>.
            </p>
          )}

          {/* Reasons list */}
          <div className="space-y-4 mb-6">
            {REASONS.map((r) => (
              <div key={r.title} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center shrink-0`}>
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* LGPD note */}
          <div className="bg-[#5B2D8E]/5 rounded-xl p-3 mb-6 text-xs text-[#5B2D8E]/80 text-center leading-relaxed">
            <Shield className="w-3.5 h-3.5 inline mr-1" />
            Em conformidade com a <strong>LGPD</strong>: armazenamos apenas cidade e estado.
            Nenhuma coordenada GPS é salva.
          </div>

          {/* CTA button */}
          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-display font-bold text-base text-white bg-gradient-to-r from-[#5B2D8E] to-[#F5921E] shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Obtendo localização...
              </>
            ) : isDenied ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Tentar Novamente
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Ativar Localização
              </>
            )}
          </button>

          {/* Show instructions toggle */}
          {isDenied && (
            <button
              onClick={() => setShowInstructions((v) => !v)}
              className="w-full mt-3 text-sm text-[#5B2D8E] font-semibold hover:underline transition-colors"
            >
              {showInstructions ? 'Ocultar instruções' : 'Como ativar nas configurações do dispositivo?'}
            </button>
          )}
        </div>

        {/* Platform-specific instructions (expanded) */}
        {isDenied && showInstructions && (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 space-y-5 animate-fade-in">
            <h3 className="font-display font-bold text-white text-center mb-1">
              Instruções por dispositivo
            </h3>
            {PLATFORM_INSTRUCTIONS.map((platform) => (
              <div key={platform.label} className="bg-white/10 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm mb-2">{platform.label}</p>
                <ol className="space-y-1">
                  {platform.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/80">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F5921E] text-white font-bold text-[10px] shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-white/40 text-xs mt-6">
          Sem localização não é possível usar a plataforma.
        </p>
      </div>
    </div>
  );
}
