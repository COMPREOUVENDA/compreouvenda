'use client';

import { useEffect, useState } from 'react';
import { MapPin, Loader2, Info } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface Cidade {
  city: string;
  state: string | null;
  users: number;
  products: number;
  partner_units: number;
}

interface Estado {
  state: string;
  users: number;
  products: number;
}

interface Resposta {
  kpis: {
    cities: number;
    states: number;
    users_total: number;
    products_total: number;
    partner_units: number;
  };
  coverage: {
    users_with_city: number;
    users_total: number;
    products_with_city: number;
    products_total: number;
  };
  cities: Cidade[];
  states: Estado[];
}

const num = (n: number) => n.toLocaleString('pt-BR');

export default function AdminGeoPage() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    adminFetch('/api/admin/geo')
      .then((r) => r.json())
      .then((j) => {
        if (!ativo) return;
        if (j.error) setErro(j.error);
        else setDados(j);
      })
      .catch(() => ativo && setErro('Não foi possível carregar a distribuição geográfica'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 p-10">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-5 text-sm text-red-300">
        {erro ?? 'Sem dados'}
      </div>
    );
  }

  const { kpis, coverage, cities, states } = dados;

  const pctUsuarios = coverage.users_total
    ? Math.round((coverage.users_with_city / coverage.users_total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
        <h3 className="font-display mb-4 flex items-center gap-2 font-semibold text-white">
          <MapPin className="h-5 w-5 text-brand-purple" /> Distribuição geográfica
        </h3>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: 'Cidades com atividade', value: num(kpis.cities), color: 'text-brand-purple' },
            { label: 'Estados', value: num(kpis.states), color: 'text-brand-blue' },
            { label: 'Usuários com cidade', value: num(coverage.users_with_city), color: 'text-emerald-400' },
            { label: 'Unidades de parceiros', value: num(kpis.partner_units), color: 'text-brand-gold' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-700/50 p-4 text-center">
              <span className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="mt-1 block text-xs text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Cobertura: sem isso, um ranking curto seria lido como pouca gente. */}
        <p className="flex items-start gap-2 rounded-xl border border-gray-700 bg-gray-700/30 p-3 text-xs text-gray-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {coverage.users_total === 0 ? (
            <>Ainda não há usuários cadastrados na plataforma.</>
          ) : (
            <>
              {num(coverage.users_with_city)} de {num(coverage.users_total)} usuários
              ({pctUsuarios}%) têm cidade preenchida no perfil. O ranking abaixo
              considera apenas esses registros — quanto menor a cobertura, menos
              representativo é o recorte.
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-5 py-4">
          <h3 className="font-display font-semibold text-white">Cidades</h3>
        </div>

        {cities.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            Nenhuma cidade com atividade registrada até o momento.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Cidade / Estado</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Usuários</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">Anúncios ativos</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">Unidades parceiras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {cities.map((c) => (
                <tr key={`${c.city}-${c.state}`} className="transition-colors hover:bg-gray-700/30">
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-white">{c.city}</span>
                    {c.state && <span className="ml-2 text-xs text-gray-500">{c.state}</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300">{num(c.users)}</td>
                  <td className="hidden px-5 py-3 text-sm text-gray-300 md:table-cell">{num(c.products)}</td>
                  <td className="hidden px-5 py-3 text-sm text-gray-300 md:table-cell">{num(c.partner_units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {states.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-5 py-4">
            <h3 className="font-display font-semibold text-white">Estados</h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {states.map((s) => (
              <div key={s.state} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-white">{s.state}</span>
                <span className="text-sm text-gray-400">
                  {num(s.users)} {s.users === 1 ? 'usuário' : 'usuários'} ·{' '}
                  {num(s.products)} {s.products === 1 ? 'anúncio' : 'anúncios'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
