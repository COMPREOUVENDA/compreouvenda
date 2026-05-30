'use client';

import { useState } from 'react';
import { Star, Camera, Send, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface ReviewFormProps {
  orderId: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  productTitle: string;
  onSubmit?: () => void;
}

export default function ReviewForm({ orderId, productId, sellerId, sellerName, productTitle, onSubmit }: ReviewFormProps) {
  const { user } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setLoading(true);

    const supabase = createClient();
    await supabase.from('reviews').insert({
      order_id: orderId, product_id: productId, reviewer_id: user.id,
      seller_id: sellerId, rating, comment: comment.trim() || null
    });

    setSubmitted(true);
    setLoading(false);
    onSubmit?.();
  };

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-white font-bold text-lg">Avaliação enviada!</h3>
        <p className="text-gray-400 text-sm mt-1">Obrigado por avaliar {sellerName}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <h3 className="text-white font-bold text-lg mb-1">Avaliar compra</h3>
      <p className="text-gray-400 text-sm mb-4">{productTitle} — vendido por {sellerName}</p>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(i => (
          <button key={i} onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(i)}>
            <Star className={`w-8 h-8 transition-colors ${(hoverRating || rating) >= i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
          </button>
        ))}
        <span className="text-gray-400 text-sm ml-2 self-center">
          {rating === 1 ? 'Ruim' : rating === 2 ? 'Regular' : rating === 3 ? 'Bom' : rating === 4 ? 'Muito bom' : rating === 5 ? 'Excelente' : ''}
        </span>
      </div>

      {/* Comment */}
      <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Conte como foi sua experiência (opcional)"
        rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500 placeholder-gray-500 mb-4" />

      <button onClick={handleSubmit} disabled={loading || rating === 0}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
        <Send className="w-4 h-4" />{loading ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </div>
  );
}
