'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reply?: string;
  reviewer: { name: string; avatar_url?: string };
  created_at: string;
  helpful_count: number;
}

export default function ReviewList({ sellerId, productId }: { sellerId?: string; productId?: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadReviews(); }, [sellerId, productId]);

  const loadReviews = async () => {
    const supabase = createClient();
    let query = supabase.from('reviews').select('*, reviewer:users!reviews_reviewer_id_fkey(name, avatar_url)');
    if (sellerId) query = query.eq('seller_id', sellerId);
    if (productId) query = query.eq('product_id', productId);
    const { data } = await query.order('created_at', { ascending: false }).limit(20);
    if (data) {
      setReviews(data as any);
      setTotal(data.length);
      setAvg(data.length > 0 ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    const supabase = createClient();
    await supabase.rpc('increment_helpful', { review_id: reviewId }).catch(() => {
      // Fallback: direct update
      supabase.from('reviews').update({ helpful_count: reviews.find(r => r.id === reviewId)!.helpful_count + 1 }).eq('id', reviewId);
    });
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r));
  };

  if (reviews.length === 0) {
    return <div className="text-gray-500 text-center p-6">Nenhuma avaliação ainda</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800 rounded-2xl">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{avg.toFixed(1)}</p>
          <div className="flex gap-0.5 mt-1">
            {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${avg >= i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />)}
          </div>
          <p className="text-gray-500 text-xs mt-1">{total} avaliações</p>
        </div>
        <div className="flex-1 space-y-1">
          {[5,4,3,2,1].map(n => {
            const count = reviews.filter(r => r.rating === n).length;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-3">{n}</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(review.reviewer as any)?.name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{(review.reviewer as any)?.name || 'Usuário'}</p>
                  <p className="text-gray-500 text-xs">{new Date(review.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${review.rating >= i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />)}
              </div>
            </div>
            {review.comment && <p className="text-gray-300 text-sm">{review.comment}</p>}
            {review.reply && (
              <div className="mt-3 ml-4 pl-3 border-l-2 border-purple-500">
                <p className="text-xs text-purple-400 mb-1">Resposta do vendedor</p>
                <p className="text-gray-400 text-sm">{review.reply}</p>
              </div>
            )}
            <button onClick={() => handleHelpful(review.id)} className="mt-2 flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs transition-colors">
              <ThumbsUp className="w-3 h-3" /> Útil ({review.helpful_count})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
