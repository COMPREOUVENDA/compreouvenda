'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ClubCampaign {
  id: string;
  title: string;
  description: string | null;
  campaign_type: string;
  image_url: string | null;
  target_url: string | null;
  benefit_id: string | null;
  partner: { id: string; name: string; logo_url: string | null } | null;
}

/**
 * Banner rotativo das campanhas do clube.
 *
 * É aqui que a instrumentação acontece: a impressão é registrada uma única vez
 * por campanha por sessão (guardada em `sessionStorage`), e o clique sempre.
 * Sem isso, `campaign_metrics` nunca receberia uma linha e todo o painel de
 * publicidade continuaria mostrando `null`.
 */
export default function CampaignBanner({ campaigns }: { campaigns: ClubCampaign[] }) {
  const [indice, setIndice] = useState(0);
  const jaRegistrado = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (campaigns.length === 0) return;

    const naoVistas = campaigns
      .map((c) => c.id)
      .filter((id) => {
        if (jaRegistrado.current.has(id)) return false;
        const chave = `cov_camp_imp_${id}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(chave)) return false;
        return true;
      });

    if (naoVistas.length === 0) return;

    for (const id of naoVistas) {
      jaRegistrado.current.add(id);
      try {
        sessionStorage.setItem(`cov_camp_imp_${id}`, '1');
      } catch {
        // modo privado sem storage: a impressão é contada mesmo assim
      }
    }

    // Falha de métrica nunca pode quebrar a vitrine.
    fetch('/api/club/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'impression', campaign_ids: naoVistas }),
    }).catch(() => undefined);
  }, [campaigns]);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % campaigns.length), 6000);
    return () => clearInterval(t);
  }, [campaigns.length]);

  if (campaigns.length === 0) return null;

  const atual = campaigns[indice];
  const destino = atual.benefit_id
    ? `/clube/${atual.benefit_id}`
    : atual.target_url || '/clube';

  const registrarClique = () => {
    fetch('/api/club/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click', campaign_id: atual.id }),
    }).catch(() => undefined);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-purple to-brand-orange text-white">
      <Link href={destino} onClick={registrarClique} className="block p-5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
          <Megaphone className="h-3 w-3" />
          {atual.partner?.name ?? 'Parceiro'}
        </span>
        <h3 className="font-display mt-2 text-xl font-bold leading-tight sm:text-2xl">
          {atual.title}
        </h3>
        {atual.description && (
          <p className="mt-1 max-w-2xl text-sm opacity-90 line-clamp-2">{atual.description}</p>
        )}
      </Link>

      {campaigns.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1">
          <button
            type="button"
            aria-label="Campanha anterior"
            onClick={() => setIndice((i) => (i - 1 + campaigns.length) % campaigns.length)}
            className="rounded-full bg-white/20 p-1.5 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-xs font-medium tabular-nums">
            {indice + 1}/{campaigns.length}
          </span>
          <button
            type="button"
            aria-label="Próxima campanha"
            onClick={() => setIndice((i) => (i + 1) % campaigns.length)}
            className="rounded-full bg-white/20 p-1.5 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
