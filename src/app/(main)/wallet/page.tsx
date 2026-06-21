'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, DollarSign,
  TrendingUp, CheckCircle, X, ChevronDown, Loader2, Banknote,
  ShieldCheck, Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';

interface WalletData {
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const PIX_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

const TX_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sale: { label: 'Venda', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  withdrawal: { label: 'Saque', color: 'text-red-500', bg: 'bg-red-50' },
  commission: { label: 'Comissão', color: 'text-brand-orange', bg: 'bg-orange-50' },
  refund: { label: 'Reembolso', color: 'text-brand-blue', bg: 'bg-blue-50' },
  bonus: { label: 'Bônus', color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
};

const supabase = createClient();

export default function SellerWalletPage() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    let { data } = await supabase.from('seller_wallet').select('*').eq('user_id', user.id).single();
    if (!data) {
      const { data: newWallet } = await supabase.from('seller_wallet').insert({ user_id: user.id }).select().single();
      data = newWallet;
    }
    if (data) setWallet(data);

    const { data: txs } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (txs) setTransactions(txs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadWallet();
  }, [user, loadWallet]);

  const handleWithdraw = async () => {
    if (!user || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > wallet.balance) {
      setFeedback({ type: 'error', text: 'Valor inválido para saque.' });
      return;
    }
    if (!pixKey.trim()) {
      setFeedback({ type: 'error', text: 'Informe sua chave PIX.' });
      return;
    }

    setWithdrawing(true);
    setFeedback(null);
    try {
      await Promise.all([
        supabase.from('withdrawal_requests').insert({ user_id: user.id, amount, pix_key: pixKey, pix_key_type: pixKeyType }),
        supabase.from('seller_wallet').update({
          balance: wallet.balance - amount,
          pending_balance: (wallet.pending_balance || 0) + amount,
        }).eq('user_id', user.id),
        supabase.from('wallet_transactions').insert({
          user_id: user.id, type: 'withdrawal', amount: -amount,
          description: `Saque via PIX (${pixKeyType})`, status: 'pending',
        }),
      ]);
      setFeedback({ type: 'success', text: 'Saque solicitado! Processamento em até 24h.' });
      setShowWithdraw(false);
      setWithdrawAmount('');
      setPixKey('');
      await loadWallet();
    } catch {
      setFeedback({ type: 'error', text: 'Erro ao processar o saque. Tente novamente.' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;
  const pending = wallet?.pending_balance || 0;
  const earned = wallet?.total_earned || 0;
  const withdrawn = wallet?.total_withdrawn || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-brand-purple" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-gray-900">Minha Carteira</h1>
          <p className="text-xs text-gray-400">Gerencie seus ganhos e saques</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Saldo principal */}
      <div className="bg-gradient-to-br from-brand-purple via-[#7B2FBE] to-brand-orange rounded-3xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" aria-hidden="true" />
        <p className="text-white/70 text-sm font-medium">Saldo disponível</p>
        <p className="text-white font-bold text-4xl mt-1 font-display">
          {formatPrice(balance)}
        </p>
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          disabled={balance <= 0}
          className="mt-4 flex items-center gap-2 bg-white text-brand-purple font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Banknote className="w-4 h-4" />
          Sacar via PIX
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500 mb-0.5">Pendente</p>
          <p className="font-bold text-gray-900 text-sm">{formatPrice(pending)}</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500 mb-0.5">Total ganho</p>
          <p className="font-bold text-emerald-600 text-sm">{formatPrice(earned)}</p>
        </div>
        <div className="card p-4 text-center">
          <ArrowUpRight className="w-4 h-4 text-brand-blue mx-auto mb-1" />
          <p className="text-xs text-gray-500 mb-0.5">Sacado</p>
          <p className="font-bold text-gray-900 text-sm">{formatPrice(withdrawn)}</p>
        </div>
      </div>

      {/* Formulário de saque */}
      {showWithdraw && (
        <div className="card p-5 mb-6 animate-slide-up border-2 border-brand-purple/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-purple" />
              Saque via PIX
            </h3>
            <button onClick={() => setShowWithdraw(false)} className="p-1.5 rounded-xl hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Tipo de chave PIX
              </label>
              <div className="relative">
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="input-field w-full appearance-none pr-8"
                >
                  {PIX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Chave PIX
              </label>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Digite sua chave PIX"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Valor (máx. {formatPrice(balance)})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0,00"
                  max={balance}
                  min={1}
                  step="0.01"
                  className="input-field w-full pl-9"
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {[25, 50, 100].map((pct) => {
                  const val = ((balance * pct) / 100).toFixed(2);
                  return (
                    <button
                      key={pct}
                      onClick={() => setWithdrawAmount(val)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20 transition-colors"
                    >
                      {pct}%
                    </button>
                  );
                })}
                <button
                  onClick={() => setWithdrawAmount(balance.toFixed(2))}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20 transition-colors"
                >
                  Tudo
                </button>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {withdrawing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              ) : (
                <><DollarSign className="w-4 h-4" /> Confirmar saque</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Histórico de transações */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Histórico de transações</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma transação ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const meta = TX_LABELS[tx.type] || { label: tx.type, color: 'text-gray-600', bg: 'bg-gray-100' };
              const isCredit = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    {isCredit
                      ? <ArrowDownLeft className={`w-4 h-4 ${meta.color}`} />
                      : <ArrowUpRight className={`w-4 h-4 ${meta.color}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {tx.description || meta.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {tx.status === 'pending' && (
                        <span className="ml-2 text-amber-500 font-medium">• pendente</span>
                      )}
                    </p>
                  </div>
                  <span className={`font-bold text-sm tabular-nums flex-shrink-0 ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : ''}{formatPrice(Math.abs(tx.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
