'use client';

import { CheckCheck, Clock, Check } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  type: 'text' | 'image' | 'offer' | 'system';
  isMine: boolean;
  timestamp: string;
  readAt?: string | null;
  imageUrl?: string;
  offerAmount?: number;
  offerStatus?: string;
  onAcceptOffer?: () => void;
  onRejectOffer?: () => void;
}

export default function MessageBubble({
  content, type, isMine, timestamp, readAt, imageUrl, offerAmount, offerStatus, onAcceptOffer, onRejectOffer
}: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">{content}</span>
      </div>
    );
  }

  if (type === 'offer') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[280px] rounded-2xl p-4 border ${
          offerStatus === 'accepted' ? 'border-green-500 bg-green-500/10' :
          offerStatus === 'rejected' ? 'border-red-500 bg-red-500/10' :
          'border-yellow-500 bg-yellow-500/10'
        }`}>
          <p className="text-xs text-gray-400 mb-1">💰 Oferta de preço</p>
          <p className="text-2xl font-bold text-white">R$ {offerAmount?.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-gray-300 mt-1">{content}</p>
          {offerStatus === 'pending' && !isMine && (
            <div className="flex gap-2 mt-3">
              <button onClick={onAcceptOffer} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-medium transition-colors">
                Aceitar
              </button>
              <button onClick={onRejectOffer} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg font-medium transition-colors">
                Recusar
              </button>
            </div>
          )}
          {offerStatus === 'accepted' && <p className="text-green-400 text-sm mt-2 font-medium">✓ Oferta aceita</p>}
          {offerStatus === 'rejected' && <p className="text-red-400 text-sm mt-2 font-medium">✕ Oferta recusada</p>}
          <span className="text-[10px] text-gray-500 mt-2 block">{time}</span>
        </div>
      </div>
    );
  }

  if (type === 'image' && imageUrl) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[280px] rounded-2xl overflow-hidden ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
          <img src={imageUrl} alt="Imagem" className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity" />
          <div className={`px-3 py-1.5 flex items-center justify-end gap-1 ${isMine ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <span className="text-[10px] text-gray-300">{time}</span>
            {isMine && (readAt ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-400" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
        isMine 
          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-br-sm' 
          : 'bg-gray-700 text-gray-100 rounded-bl-sm'
      }`}>
        <p className="text-sm leading-relaxed break-words">{content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] opacity-70">{time}</span>
          {isMine && (
            readAt 
              ? <CheckCheck className="w-3 h-3 text-blue-400" /> 
              : <Check className="w-3 h-3 opacity-70" />
          )}
        </div>
      </div>
    </div>
  );
}
