'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Image as ImageIcon, DollarSign, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onSendImage: (file: File) => void;
  onSendOffer: (amount: number, message: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onSendImage, onSendOffer, onTyping, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    onTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSendImage(file);
    e.target.value = '';
  };

  const handleOffer = () => {
    const amount = parseFloat(offerAmount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (amount > 0) {
      onSendOffer(amount, offerMessage || 'Gostaria de fazer uma oferta');
      setShowOffer(false);
      setOfferAmount('');
      setOfferMessage('');
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-3">
      {showOffer && (
        <div className="mb-3 p-3 bg-gray-700 rounded-xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">💰 Fazer oferta</span>
            <button onClick={() => setShowOffer(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="R$ 0,00"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-lg font-bold mb-2 focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            placeholder="Mensagem (opcional)"
            value={offerMessage}
            onChange={(e) => setOfferMessage(e.target.value)}
            className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-purple-500"
          />
          <button onClick={handleOffer} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors">
            Enviar oferta
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition-colors" title="Enviar imagem">
          <ImageIcon className="w-5 h-5" />
        </button>
        <button onClick={() => setShowOffer(!showOffer)} className="p-2 text-gray-400 hover:text-green-400 transition-colors" title="Fazer oferta">
          <DollarSign className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-2xl px-4 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-purple-500 placeholder-gray-500 max-h-[120px]"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-full transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
