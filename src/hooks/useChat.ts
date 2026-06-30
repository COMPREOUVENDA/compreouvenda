'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

export interface Conversation {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_at?: string;
  unread_buyer?: number;
  unread_seller?: number;
  status?: string;
  product?: { title: string; price: number; images?: { url: string }[] };
  buyer?: { id: string; name: string; avatar_url?: string };
  seller?: { id: string; name: string; avatar_url?: string };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'offer' | 'system';
  offer_amount?: number;
  offer_status?: string;
  metadata?: any;
  read_at?: string | null;
  created_at: string;
}

export function useChat() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('conversations')
      .select(`*, product:products(title, price, images:product_images(url)), buyer:users!conversations_buyer_id_fkey(id, name, avatar_url), seller:users!conversations_seller_id_fkey(id, name, avatar_url)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    if (data) setConversations(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('convs-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${user.id}` }, () => loadConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `seller_id=eq.${user.id}` }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) setMessages(data);
    // Mark as read
    if (user) {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }
  }, [user]);

  // Select conversation
  const selectConversation = useCallback((convId: string | null) => {
    setSelectedId(convId);
    if (convId) loadMessages(convId);
    else setMessages([]);
  }, [loadMessages]);

  // Subscribe to messages in selected conversation
  useEffect(() => {
    if (!selectedId || !user) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel(`msgs-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Auto mark as read
        if (msg.sender_id !== user.id) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      // Typing via broadcast
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUser(payload.name);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTypingUser(null), 3000);
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [selectedId, user]);

  // Send message — usa /api/messages para push server-side
  const sendMessage = async (content: string, type: 'text' | 'image' = 'text', metadata?: any) => {
    if (!user || !selectedId) return;

    // Tentar via API (dispara push + Realtime)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedId,
          sender_id: user.id,
          content,
          type,
          metadata: metadata || null,
        }),
      });
      if (res.ok) return;
    } catch {
      // Fallback direto via Supabase se API falhar
    }

    // Fallback: insert direto
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_id: user.id,
      content,
      type,
      ...(metadata ? { metadata } : {}),
    });
    await supabase
      .from('conversations')
      .update({ last_message: content, last_message_at: new Date().toISOString() })
      .eq('id', selectedId);
  };

  // Send offer
  const sendOffer = async (amount: number, message: string) => {
    if (!user || !selectedId) return;

    // Tentar via API (dispara push + Realtime)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedId,
          sender_id: user.id,
          content: message,
          type: 'offer',
          offer_amount: amount,
        }),
      });
      if (res.ok) return;
    } catch {
      // Fallback
    }

    // Fallback direto
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_id: user.id,
      content: message,
      type: 'offer',
      offer_amount: amount,
      offer_status: 'pending',
    });
    await supabase
      .from('conversations')
      .update({
        last_message: `Oferta: R$ ${amount}`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', selectedId);
  };

  // Accept/reject offer
  const respondOffer = async (messageId: string, status: 'accepted' | 'rejected') => {
    await supabase.from('messages').update({ offer_status: status }).eq('id', messageId);
  };

  // Upload image
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `chat/${selectedId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-images').upload(path, file);
    if (error) {
      // Try creating bucket
      await supabase.storage.createBucket('chat-images', { public: true });
      const { error: err2 } = await supabase.storage.from('chat-images').upload(path, file);
      if (err2) return null;
    }
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // Send image
  const sendImage = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      await sendMessage(url, 'image', { fileName: file.name, fileSize: file.size });
    }
  };

  // Typing broadcast
  const broadcastTyping = () => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, name: user.name || 'Usuário' } });
  };

  return {
    conversations, messages, selectedId, loading, typingUser,
    selectConversation, sendMessage, sendOffer, respondOffer, sendImage, broadcastTyping, loadConversations
  };
}
