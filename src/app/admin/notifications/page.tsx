'use client';

import { Bell, Send, Users, Loader2, BarChart2, CheckCircle, XCircle, Clock, Smartphone } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  totalSubscribers: number;
  sentToday: number;
  failedToday: number;
  pendingCount: number;
}

interface QueueItem {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('/');
  const [notifType, setNotifType] = useState('promotion');
  const [target, setTarget] = useState<'all' | 'sellers' | 'buyers'>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [stats, setStats] = useState<Stats>({ totalSubscribers: 0, sentToday: 0, failedToday: 0, pendingCount: 0 });
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'stats'>('send');

  const supabase = createClient();

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [subRes, sentRes, failedRes, pendingRes, histRes] = await Promise.all([
        supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('notification_queue').select('id', { count: 'exact', head: true })
          .eq('status', 'sent').gte('created_at', today.toISOString()),
        supabase.from('notification_queue').select('id', { count: 'exact', head: true })
          .eq('status', 'failed').gte('created_at', today.toISOString()),
        supabase.from('notification_queue').select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('notification_queue').select('*').order('created_at', { ascending: false }).limit(30),
      ]);

      setStats({
        totalSubscribers: subRes.count || 0,
        sentToday: sentRes.count || 0,
        failedToday: failedRes.count || 0,
        pendingCount: pendingRes.count || 0,
      });
      setHistory(histRes.data || []);
    } catch (e) {
      console.error('loadStats error', e);
    } finally {
      setLoadingStats(false);
    }
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          cronSecret: process.env.NEXT_PUBLIC_CRON_SECRET,
          notification: {
            title: title.trim(),
            body: body.trim(),
            url: notifUrl || '/',
            type: notifType,
            icon: '/icons/icon-192.png',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || 'Erro ao enviar');
      } else {
        setSent(true);
        setTitle('');
        setBody('');
        setNotifUrl('/');
        setTimeout(() => { setSent(false); loadStats(); }, 3000);
      }
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'sent') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    return <Clock className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800 p-1 rounded-2xl w-fit">
        {[
          { id: 'send', label: 'Enviar', icon: Send },
          { id: 'stats', label: 'Estatísticas', icon: BarChart2 },
          { id: 'history', label: 'Histórico', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === id ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Inscritos', value: stats.totalSubscribers, icon: Smartphone, color: 'text-purple-400' },
            { label: 'Enviadas hoje', value: stats.sentToday, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Falhas hoje', value: stats.failedToday, icon: XCircle, color: 'text-red-400' },
            { label: 'Pendentes', value: stats.pendingCount, icon: Clock, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm text-gray-400">{label}</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {loadingStats ? '—' : value.toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Send form */}
      {activeTab === 'send' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-5">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-purple" /> Enviar Notificação Push
          </h3>

          {sent && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl">
              Notificação enviada com sucesso!
            </div>
          )}
          {sendError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {sendError}
            </div>
          )}

          {/* Target */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Destinatários</label>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'sellers', label: 'Vendedores' },
                { key: 'buyers', label: 'Compradores' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTarget(opt.key as typeof target)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    target === opt.key ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
            <select
              value={notifType}
              onChange={(e) => setNotifType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
              <option value="promotion">Promoção</option>
              <option value="system">Sistema</option>
              <option value="new_order">Novo Pedido</option>
              <option value="payment_received">Pagamento</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação"
              maxLength={100}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Conteúdo da notificação..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none"
            />
          </div>

          {/* URL */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">URL de destino</label>
            <input
              type="text"
              value={notifUrl}
              onChange={(e) => setNotifUrl(e.target.value)}
              placeholder="/"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full bg-brand-purple text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-purple/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Notificação
          </button>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Histórico de Envios</h3>
            <button onClick={loadStats} className="text-xs text-gray-400 hover:text-white transition-colors">
              Atualizar
            </button>
          </div>
          {history.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {history.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="shrink-0">{statusIcon(item.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.body}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
