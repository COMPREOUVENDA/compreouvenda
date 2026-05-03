'use client';

import { Bell, Send, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'sellers' | 'buyers'>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const supabase = createClient();
      let query = supabase.from('users').select('id');
      if (target === 'sellers') query = query.eq('type', 'seller');
      if (target === 'buyers') query = query.eq('type', 'buyer');
      const { data: users } = await query;
      if (users && users.length > 0) {
        const rows = users.map((u: { id: string }) => ({
          user_id: u.id,
          title,
          body,
          type: 'broadcast',
          read: false,
        }));
        await supabase.from('notifications').insert(rows);
      }
      setSent(true);
      setTitle('');
      setBody('');
      setTimeout(() => setSent(false), 4000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-5">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-purple" /> Enviar Notificação em Massa
        </h3>

        {sent && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl">
            Notificação enviada com sucesso!
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Destinatários</label>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos', icon: Users },
              { key: 'sellers', label: 'Vendedores', icon: Users },
              { key: 'buyers', label: 'Compradores', icon: Users },
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

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notificação"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Conteúdo da notificação..."
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none"
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
    </div>
  );
}
