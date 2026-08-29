'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, RefreshCw, Download, TrendingUp } from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Redemption {
  id: string; code: string; status: string;
  purchase_value: number | null; discount_applied: number | null;
  is_new_customer: boolean; validated_at: string | null; created_at: string;
  benefit: { title: string } | null;
  unit: { name: string } | null;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ParceiroRelatorios() {
  const [rows, setRows] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminFetchJson<{ redemptions: Redemption[] }>('/api/partner/redemptions?status=validated&limit=200');
      setRows(d.redemptions);
    } catch { /* estado vazio */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const volume = rows.reduce((a, r) => a + Number(r.purchase_value ?? 0), 0);
  const discount = rows.reduce((a, r) => a + Number(r.discount_applied ?? 0), 0);
  const ticket = rows.length ? volume / rows.length : 0;

  // Agrupamento por benefício, para mostrar o que realmente puxa movimento.
  const byBenefit = Object.values(
    rows.reduce((acc, r) => {
      const key = r.benefit?.title ?? 'Benefício removido';
      acc[key] = acc[key] ?? { title: key, count: 0, volume: 0 };
      acc[key].count++;
      acc[key].volume += Number(r.purchase_value ?? 0);
      return acc;
    }, {} as Record<string, { title: string; count: number; volume: number }>)
  ).sort((a, b) => b.count - a.count);

  function exportCsv() {
    // Exportação sem dados pessoais — apenas a operação comercial.
    const header = 'data;codigo;beneficio;unidade;valor_compra;desconto;cliente_novo';
    const lines = rows.map((r) => [
      new Date(r.validated_at ?? r.created_at).toLocaleString('pt-BR'),
      r.code,
      (r.benefit?.title ?? '').replace(/;/g, ','),
      (r.unit?.name ?? '').replace(/;/g, ','),
      (r.purchase_value ?? 0).toFixed(2).replace('.', ','),
      (r.discount_applied ?? 0).toFixed(2).replace('.', ','),
      r.is_new_customer ? 'sim' : 'nao',
    ].join(';'));

    const blob = new Blob(['\uFEFF' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-beneficios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {rows.length} validações confirmadas (últimas 200)
        </p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
          {rows.length > 0 && (
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
      ) : !rows.length ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 py-16 text-center">
          <BarChart3 className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Ainda não há validações para relatar.</p>
          <p className="text-xs text-gray-600 mt-1">
            Os relatórios são gerados a partir dos benefícios efetivamente utilizados no seu balcão.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: 'Volume em compras', v: brl(volume) },
              { l: 'Ticket médio', v: brl(ticket) },
              { l: 'Desconto concedido', v: brl(discount) },
              { l: 'Clientes novos', v: rows.filter((r) => r.is_new_customer).length },
            ].map((m) => (
              <div key={m.l} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                <span className="text-xs text-gray-400">{m.l}</span>
                <p className="text-xl font-display font-bold text-white mt-1">{m.v}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Benefícios que mais geraram movimento
              </h3>
            </div>
            <div className="divide-y divide-gray-700/50">
              {byBenefit.map((b) => (
                <div key={b.title} className="px-6 py-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-white truncate">{b.title}</span>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-white font-medium">{b.count} utilizações</p>
                    <p className="text-xs text-gray-500">{brl(b.volume)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-600">
            O relatório exportado não contém dados pessoais dos clientes, apenas a
            operação comercial da sua empresa.
          </p>
        </>
      )}
    </div>
  );
}
