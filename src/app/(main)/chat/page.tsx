'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, ArrowLeft, AlertTriangle, ImageIcon, CheckCheck, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

interface Conversation {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  product?: { title: string; price: number; images?: { url: string }[] };
  buyer?: { id: string; name: string; avatar_url?: string };
  seller?: { id: string; name: string; avatar_url?: string };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'offer';
  read_at?: string;
  created_at: string;
}

// Mock conversations for when DB is empty
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'mock-1', product_id: '1', buyer_id: 'b1', seller_id: 's1', last_message: 'Aceita R$ 4.800?', last_message_at: new Date(Date.now() - 600000).toISOString(), unread_count: 2, product: { title: 'iPhone 14 Pro Max', price: 5499 }, buyer: { id: 'b1', name: 'Maria Santos' }, seller: { id: 's1', name: 'Vendedor' } },
  { id: 'mock-2', product_id: '2', buyer_id: 'b2', seller_id: 's1', last_message: 'Pode buscar amanhã?', last_message_at: new Date(Date.now() - 3600000).toISOString(), unread_count: 0, product: { title: 'Sofá Retrátil', price: 2800 }, buyer: { id: 'b2', name: 'João Silva' }, seller: { id: 's1', name: 'Vendedor' } },
  { id: 'mock-3', product_id: '3', buyer_id: 'b3', seller_id: 's1', last_message: 'Ainda disponível?', last_message_at: new Date(Date.now() - 10800000).toISOString(), unread_count: 1, product: { title: 'Bicicleta Speed', price: 3200 }, buyer: { id: 'b3', name: 'Ana Oliveira' }, seller: { id: 's1', name: 'Vendedor' } },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', conversation_id: 'mock-1', sender_id: 'b1', content: 'Olá! O produto ainda está disponível?', type: 'text', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'm2', conversation_id: 'mock-1', sender_id: 's1', content: 'Sim, está disponível! Pode vir buscar.', type: 'text', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 780000).toISOString() },
  { id: 'm3', conversation_id: 'mock-1', sender_id: 'b1', content: 'Aceita R$ 4.800?', type: 'text', created_at: new Date(Date.now() - 600000).toISOString() },
];

export default function ChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) {
      setConversations(MOCK_CONVERSATIONS);
      return;
    }

    async function loadConversations() {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          product:products(title, price, images:product_images(url)),
          buyer:users!conversations_buyer_id_fkey(id, name, avatar_url),
          seller:users!conversations_seller_id_fkey(id, name, avatar_url)
        `)
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false });

      if (data && data.length > 0) {
        setConversations(data);
      } else {
        setConversations(MOCK_CONVERSATIONS);
      }
    }

    loadConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${user.id}` },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `seller_id=eq.${user.id}` },
        () => loadConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!selectedConv) return;

    if (selectedConv.id.startsWith('mock-')) {
      setMessages(MOCK_MESSAGES.filter(m => m.conversation_id === selectedConv.id));
      return;
    }

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConv!.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);

      // Mark as read
      if (user) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', selectedConv!.id)
          .neq('sender_id', user.id)
          .is('read_at', null);
      }
    }

    loadMessages();

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          // Mark as read if from other person
          if (user && newMsg.sender_id !== user.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id).then();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    if (!user || selectedConv?.id.startsWith('mock-')) {
      // Mock: add locally
      const mockMsg: Message = {
        id: 'local-' + Date.now(),
        conversation_id: selectedConv?.id || '',
        sender_id: user?.id || 's1',
        content,
        type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, mockMsg]);
      setSending(false);
      inputRef.current?.focus();
      return;
    }

    try {
      await supabase.from('messages').insert({
        conversation_id: selectedConv!.id,
        sender_id: user.id,
        content,
        type: 'text',
      });

      // Update conversation last_message
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv!.id);
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherUser = (conv: Conversation) => {
    if (!user) return conv.buyer;
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const filteredConvs = search
    ? conversations.filter(c => {
        const other = getOtherUser(c);
        return other?.name?.toLowerCase().includes(search.toLowerCase()) ||
               c.product?.title?.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)]">
      <div className="flex h-full bg-white rounded-t-3xl overflow-hidden shadow-sm border border-gray-100">
        {/* Conversations list */}
        <div className={`w-full md:w-80 md:border-r border-gray-100 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <h1 className="font-display font-bold text-xl text-gray-900 mb-3">Mensagens</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredConvs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">Nenhuma conversa ainda</p>
                <p className="text-gray-300 text-xs mt-1">Inicie uma conversa em um produto</p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const other = getOtherUser(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                      selectedConv?.id === conv.id ? 'bg-brand-purple/5 border-l-2 border-brand-purple' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {other?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-gray-900 truncate">{other?.name || 'Usuário'}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{conv.last_message_at ? formatTime(conv.last_message_at) : ''}</span>
                      </div>
                      <p className="text-[10px] text-brand-purple truncate font-medium">{conv.product?.title || 'Produto'}</p>
                      <p className="text-sm text-gray-500 truncate">{conv.last_message || '...'}</p>
                    </div>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-brand-pink text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm">
                <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold">
                  {getOtherUser(selectedConv)?.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-gray-900">{getOtherUser(selectedConv)?.name || 'Usuário'}</span>
                  <p className="text-[10px] text-brand-purple font-medium truncate">{selectedConv.product?.title} · R$ {selectedConv.product?.price?.toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </div>
              </div>

              {/* Safety warning */}
              <div className="px-4 pt-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700">Nunca compartilhe dados bancários ou faça pagamentos fora da plataforma.</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {messages.map((msg) => {
                  const isMine = user ? msg.sender_id === user.id : msg.sender_id === 's1';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMine
                          ? 'bg-brand-purple text-white rounded-br-md'
                          : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                          <span className={`text-[9px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && (
                            msg.read_at
                              ? <CheckCheck className="w-3 h-3 text-blue-300" />
                              : <Clock className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <button className="p-2.5 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="input-field flex-1 py-2.5 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="bg-brand-purple text-white rounded-xl p-2.5 hover:bg-brand-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 bg-brand-purple/10 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-brand-purple" />
              </div>
              <h3 className="font-display font-bold text-lg text-gray-700 mb-1">Suas mensagens</h3>
              <p className="text-sm text-gray-400">Selecione uma conversa ou inicie uma nova a partir de um produto</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
