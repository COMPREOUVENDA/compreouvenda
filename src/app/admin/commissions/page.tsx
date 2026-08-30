'use client';

import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface Comissao {
  id: string;
  status: string;
  commission_type: string;
  commission_value: number | null;
  calculated_amount: number | null;
  created_at: string;
  product_title: string | null;
  reseller_name: string | null;
  reseller_email: string | null;
}

interface Kpis {
  total: number;
  paid: number;
  pending: number;
  available: number;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  paid: { texto: 'Pago', classe: 'bg-emerald-500/10 text-emerald-500' },
  approved: { texto: 'Aprovado', classe: 'bg-brand-blue/10 text-brand-blue' },
  available: { texto: 'Disponível', classe: 'bg-brand-blue/10 text-brand-blue' },
  pending: { texto: 'Pendente', classe: 'bg-amber-500/10 text-amber-500' },
  cancelled: { texto: 'Cancelado', classe: 'bg-gray-600/50 text-gray-400' },
};

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<Comissao[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    adminFetch('/api/admin/commissions')
      .then((r) => r.json())
      .then((j) => {
        if (!ativo) return;
        if (j.error) {
          setErro(j.error);
          return;
        }
        setCommissions(j.commissions ?? []);
        setKpis(j.kpis ?? null);
      })
      .catch(() => ativo && setErro('Não foi possível carregar as comissões'))
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

  if (erro) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-5 text-sm text-red-300">
        {erro}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pagas', value: brl(kpis?.paid ?? 0), color: 'text-emerald-400' },
          { label: 'Pendentes', value: brl(kpis?.pending ?? 0), color: 'text-amber-400' },
          { label: 'A liberar', value: brl(kpis?.available ?? 0), color: 'text-brand-blue' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
            <span className={`font-display text-xl font-bold ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <h3 className="font-display font-semibold text-white">Comissões</h3>
          <span className="text-xs text-gray-500">
            {kpis?.total ?? 0} {kpis?.total === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {commissions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">
              Nenhuma comissão registrada até o momento.
            </p>
            <p className="mx-auto mt-2 flex max-w-md items-start gap-2 rounded-xl border border-amber-900/40 bg-amber-950/30 p-3 text-left text-xs text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              O programa de vendedores comissionados ainda não teve movimento.
              Os valores acima são apurados diretamente da tabela de comissões e
              passarão a refletir a operação assim que a primeira venda por
              indicação for concluída.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-5 py-3 text-left text-xs text-gray-500">Revendedor</th>
                <th className="hidden px-5 py-3 text-left text-xs text-gray-500 md:table-cell">Produto</th>
                <th className="px-5 py-3 text-left text-xs text-gray-500">Comissão</th>
                <th className="hidden px-5 py-3 text-left text-xs text-gray-500 md:table-cell">Data</th>
                <th className="px-5 py-3 text-left text-xs text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {commissions.map((c) => {
                const rotulo = ROTULO_STATUS[c.status] ?? {
                  texto: c.status,
                  classe: 'bg-gray-600/50 text-gray-400',
                };
                return (
                  <tr key={c.id} className="hover:bg-gray-700/30">
                    <td className="px-5 py-3 text-sm text-white">
                      {c.reseller_name ?? '—'}
                      {c.reseller_email && (
                        <span className="block text-xs text-gray-500">{c.reseller_email}</span>
                      )}
                    </td>
                    <td className="hidden px-5 py-3 text-sm text-gray-400 md:table-cell">
                      {c.product_title ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-white">
                      {brl(Number(c.calculated_amount ?? 0))}
                      <span className="ml-1 text-xs text-gray-500">
                        ({c.commission_type === 'percent' ? `${c.commission_value}%` : 'fixo'})
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 text-sm text-gray-400 md:table-cell">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rotulo.classe}`}>
                        {rotulo.texto}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
