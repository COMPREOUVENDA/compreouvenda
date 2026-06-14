'use client';

import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

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
  const [message, setMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (user) loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    // Get or create wallet
    let { data } = await supabase.from('seller_wallet').select('*').eq('user_id', user.id).single();
    if (!data) {
      const { data: newWallet } = await supabase.from('seller_wallet').insert({ user_id: user.id }).select().single();
      data = newWallet;
    }
    if (data) setWallet(data);

    // Load transactions
    const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (txs) setTransactions(txs);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!user || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > wallet.balance) { setMessage('Valor inválido'); return; }
    if (!pixKey) { setMessage('Informe a chave PIX'); return; }

    setWithdrawing(true);
    await supabase.from('withdrawal_requests').insert({
      user_id: user.id, amount, pix_key: pixKey, pix_key_type: pixKeyType
    });
    await supabase.from('seller_wallet').update({
      balance: wallet.balance - amount, pending_balance: (wallet.pending_balance || 0) + amount
    }).eq('user_id', user.id);
    await supabase.from('wallet_transactions').insert({
      user_id: user.id, type: 'withdrawal', amount: -amount, description: `Saque via PIX (${pixKeyType})`, status: 'pending'
    });

    setMessage('Solicitação de saque enviada! Processamento em até 24h.');
    setShowWithdraw(false);
    setWithdrawAmount('');
    setPixKey('');
    loadWallet();
    setWithdrawing(false);
  };

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3].map(i=><div key={i} className="h-24 bg-gray-700 rounded-2xl"/>)}</div></div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Wallet className="w-6 h-6 text-purple-400" />Minha Carteira</h1>

      {message && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{message}</div>}

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-4">
          <p className="text-purple-200 text-xs">Disponível</p>
          <p className="text-white text-xl font-bold mt-1">R$ {(wallet?.balance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/>Pendente</p>
          <p className="text-yellow-400 text-xl font-bold mt-1">R$ {(wallet?.pending_balance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3"/>Total ganho</p>
          <p className="text-green-400 text-xl font-bold mt-1">R$ {(wallet?.total_earned || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/>Sacado</p>
          <p className="text-white text-xl font-bold mt-1">R$ {(wallet?.total_withdrawn || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Withdraw button */}
      <button onClick={() => setShowWithdraw(!showWithdraw)} disabled={(wallet?.balance || 0) <= 0}
        className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-colors mb-6 flex items-center gap-2">
        <DollarSign className="w-5 h-5"/>Solicitar Saque
      </button>

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
          <h3 className="text-white font-bold mb-4">Solicitar saque via PIX</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm">Tipo de chave PIX</label>
              <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white">
                <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Chave aleatória</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Chave PIX</label>
              <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Digite sua chave PIX" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"/>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Valor (máx R$ {(wallet?.balance || 0).toFixed(2)})</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" max={wallet?.balance} className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"/>
            </div>
            <button onClick={handleWithdraw} disabled={withdrawing} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              {withdrawing ? 'Processando...' : 'Confirmar saque'}
            </button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700">
        <h3 className="text-white font-bold p-4 border-b border-gray-700">Histórico</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center p-8">Nenhuma transação ainda</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4 text-green-400"/> : <ArrowUpRight className="w-4 h-4 text-red-400"/>}
                  </div>
                  <div>
                    <p className="text-white text-sm">{tx.description || tx.type}</p>
                    <p className="text-gray-500 text-xs">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
