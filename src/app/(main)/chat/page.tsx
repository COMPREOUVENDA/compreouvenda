'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowLeft, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChat, type Conversation } from '@/hooks/useChat';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';

export default function ChatPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const {
    conversations, messages, selectedId, loading, typingUser,
    selectConversation, sendMessage, sendOffer, respondOffer, sendImage, broadcastTyping
  } = useChat();
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select from URL param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && !selectedId) selectConversation(id);
  }, [searchParams, selectedId, selectConversation]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const getOtherUser = (conv: Conversation) => {
    if (!user) return { name: 'Usuário', avatar: null };
    const isbuyer = conv.buyer_id === user.id;
    const other = isbuyer ? conv.seller : conv.buyer;
    return { name: other?.name || 'Usuário', avatar: other?.avatar_url };
  };

  const getUnreadCount = (conv: Conversation) => {
    if (!user) return 0;
    return conv.buyer_id === user.id ? (conv.unread_buyer || 0) : (conv.unread_seller || 0);
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const other = getOtherUser(c);
    return other.name.toLowerCase().includes(search.toLowerCase()) ||
      c.product?.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_message?.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selectedId);

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, typeof messages>);

  const getDateLabel = (dateStr: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
    if (dateStr === today) return 'Hoje';
    if (dateStr === yesterday) return 'Ontem';
    return dateStr;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Faça login para acessar o chat</p>
          <a href="/login" className="mt-4 inline-block bg-purple-600 text-white px-6 py-2 rounded-xl">Entrar</a>
        </div>
      </div>
    );
  }

  // Mobile: show only list or chat
  const showChat = !!selectedId;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-900 overflow-hidden">
      {/* Sidebar - conversations list */}
      <div className={`w-full md:w-[380px] md:border-r border-gray-700 flex flex-col bg-gray-800 ${showChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white mb-3">Mensagens</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-700 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">Nenhuma conversa ainda</p>
              <p className="text-gray-500 text-sm mt-1">Inicie uma conversa a partir de um produto</p>
            </div>
          ) : (
            filtered.map(conv => {
              const other = getOtherUser(conv);
              const unread = getUnreadCount(conv);
              const isActive = conv.id === selectedId;
              const time = conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-700/50 transition-colors border-b border-gray-700/50 ${isActive ? 'bg-gray-700' : ''}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {other.avatar ? <img src={other.avatar} className="w-full h-full rounded-full object-cover" /> : other.name[0]?.toUpperCase()}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">{unread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-sm truncate">{other.name}</span>
                      <span className="text-[10px] text-gray-500 ml-2 shrink-0">{time}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{conv.product?.title}</p>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>{conv.last_message || 'Nova conversa'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${showChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700 bg-gray-800">
              <button onClick={() => selectConversation(null)} className="md:hidden p-1 text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {getOtherUser(selectedConv).name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{getOtherUser(selectedConv).name}</p>
                <p className="text-xs text-gray-400 truncate">{selectedConv.product?.title} • R$ {selectedConv.product?.price?.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] text-gray-500 bg-gray-800 px-3 py-1 rounded-full">{getDateLabel(date)}</span>
                  </div>
                  {msgs.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      content={msg.content}
                      type={msg.type}
                      isMine={msg.sender_id === user.id}
                      timestamp={msg.created_at}
                      readAt={msg.read_at}
                      imageUrl={msg.type === 'image' ? msg.content : undefined}
                      offerAmount={msg.offer_amount}
                      offerStatus={msg.offer_status}
                      onAcceptOffer={() => respondOffer(msg.id, 'accepted')}
                      onRejectOffer={() => respondOffer(msg.id, 'rejected')}
                    />
                  ))}
                </div>
              ))}
              {typingUser && <TypingIndicator name={typingUser} />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={(text) => sendMessage(text, 'text')}
              onSendImage={sendImage}
              onSendOffer={sendOffer}
              onTyping={broadcastTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">Selecione uma conversa</p>
              <p className="text-gray-500 text-sm mt-1">Ou inicie uma nova a partir de um produto</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
