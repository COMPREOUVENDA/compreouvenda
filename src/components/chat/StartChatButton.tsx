'use client';

import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface StartChatButtonProps {
  productId: string;
  sellerId: string;
  sellerName?: string;
  className?: string;
}

export default function StartChatButton({ productId, sellerId, sellerName, className }: StartChatButtonProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleClick = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.id === sellerId) return; // Can't chat with yourself

    const supabase = createClient();
    
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('product_id', productId)
      .eq('buyer_id', user.id)
      .eq('seller_id', sellerId)
      .single();

    if (existing) {
      router.push(`/chat?id=${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ product_id: productId, buyer_id: user.id, seller_id: sellerId })
      .select('id')
      .single();

    if (newConv) {
      router.push(`/chat?id=${newConv.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-95 ${className || ''}`}
    >
      <MessageCircle className="w-5 h-5" />
      <span>{sellerName ? `Conversar com ${sellerName}` : 'Conversar com vendedor'}</span>
    </button>
  );
}
