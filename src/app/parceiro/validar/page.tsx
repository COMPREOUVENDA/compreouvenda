'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode, CheckCircle, XCircle, Loader2, RefreshCw, Sparkles, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson, adminFetch } from '@/lib/admin-fetch';

interface Redemption {
  id: string; code: string; status: string; method: string;
  purchase_value: number | null; discount_applied: number | null;
  is_new_customer: boolean; validated_at: string | null; created_at: string;
  has_user: boolean;
  benefit: { id: string; title: string } | null;
  unit: { id: string; name: string } | null;
}

interface ListData {
  redemptions: Redemption[];
  counts: { total: number; validated: number; pending: number; expired: number };
  scopedToUnit: string | null;
}

interface SuccessResult {
  benefit: { title: string };
  customerFirstName: string | null;
  message: string;
  redemption: { discount_applied: number | null; is_new_customer: boolean };
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ValidarPage() {
  const [code, setCode] = useState('');
  const [purchase, setPurchase] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [failure, setFailure] = useState('');
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminFetchJson<ListData>('/api/partner/redemptions?limit=30'));
    } catch { /* a lista é secundária; o balcão continua operando */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function validate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || validating) return;

    setValidating(true);
    setResult(null);
    setFailure('');

    try {
      const res = await adminFetch('/api/partner/redemptions', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim(),
          purchase_value: purchase ? Number(purchase.replace(',', '.')) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFailure(json.error || 'Não foi possível validar este código');
      } else {
        setResult(json as SuccessResult);
        setCode('');
        setPurchase('');
        load();
      }
    } catch {
      setFailure('Falha de conexão. Verifique a internet e tente novamente.');
    } finally {
      setValidating(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balcão */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="font-display font-semibold text-white flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-brand-purple" /> Validar benefício
          </h3>
          <p className="text-[11px] text-gray-600 mb-5">
            Digite ou escaneie o código apresentado pelo cliente. O desconto é calculado
            automaticamente pelas regras do benefício.
          </p>

          <form onSubmit={validate} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Código do cliente</label>
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex.: COV-A1B2C3"
                autoComplete="off"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono tracking-wider text-lg placeholder:text-gray-600 focus:border-brand-purple outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">
                Valor da compra <span className="text-gray-600">(opcional)</span>
              </label>
              <input
                value={purchase}
                onChange={(e) => setPurchase(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-brand-purple outline-none"
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Informar o valor permite calcular o desconto e medir o resultado gerado.
              </p>
            </div>
            <button
              type="submit"
              disabled={validating || !code.trim()}
              className="w-full bg-brand-purple text-white font-medium py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {validating ? 'Validando...' : 'Validar'}
            </button>
          </form>

          {result && (
            <div className="mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-emerald-300 font-medium">{result.message}</p>
                  <p className="text-sm text-white mt-1">{result.benefit.title}</p>
                  {result.customerFirstName && (
                    <p className="text-xs text-gray-400 mt-0.5">Cliente: {result.customerFirstName}</p>
                  )}
                  {result.redemption.discount_applied != null && (
                    <p className="text-lg font-display font-bold text-emerald-400 mt-2">
                      Desconto: {brl(result.redemption.discount_applied)}
                    </p>
                  )}
                  {result.redemption.is_new_customer && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple mt-2">
                      <Sparkles className="w-3 h-3" /> CLIENTE NOVO
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {failure && (
            <div className="mt-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{failure}</p>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-white">Últimas validações</h3>
              {data && (
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {data.counts.validated} confirmadas · {data.counts.pending} aguardando
                </p>
              )}
            </div>
            <button onClick={load} disabled={loading} className="text-gray-500 hover:text-white p-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>

          <div className="divide-y divide-gray-700/50 max-h-[520px] overflow-y-auto">
            {!data?.redemptions.length ? (
              <div className="px-6 py-12 text-center">
                <QrCode className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma validação registrada ainda.</p>
                <p className="text-xs text-gray-600 mt-1">
                  As utilizações aparecem aqui assim que os clientes resgatarem seus benefícios.
                </p>
              </div>
            ) : data.redemptions.map((r) => (
              <div key={r.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{r.benefit?.title ?? 'Benefício removido'}</p>
                  <p className="text-[11px] text-gray-600 font-mono">{r.code}</p>
                  {r.unit && <p className="text-[11px] text-gray-600">{r.unit.name}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    r.status === 'validated' ? 'bg-emerald-500/15 text-emerald-400'
                      : r.status === 'pending' ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-gray-700 text-gray-500'
                  )}>
                    {r.status === 'validated' ? 'validado' : r.status === 'pending' ? 'aguardando' : r.status}
                  </span>
                  {r.discount_applied != null && (
                    <p className="text-xs text-gray-400 mt-1">{brl(r.discount_applied)}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(r.validated_at ?? r.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-600 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        Em respeito à LGPD, o histórico não exibe dados pessoais dos clientes. No momento da
        validação mostramos apenas o primeiro nome, o suficiente para conferir o atendimento.
      </p>
    </div>
  );
}
