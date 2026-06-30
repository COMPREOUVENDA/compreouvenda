'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'disputed'
  | 'refunded';

export interface RealtimeOrder {
  id: string;
  status: OrderStatus;
  amount: number;
  payment_method: string;
  delivery_type: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_code?: string;
  product?: {
    id: string;
    title: string;
    images?: { url: string }[];
  };
  buyer?: { id: string; name: string; avatar_url?: string };
  seller?: { id: string; name: string; avatar_url?: string };
}

export interface NewOrderAlert {
  order: RealtimeOrder;
  at: string;
}

export function useRealtimeOrders(role: 'buyer' | 'seller' = 'seller') {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<RealtimeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<NewOrderAlert | null>(null);
  const alertTimer = useRef<NodeJS.Timeout | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&role=${role}&limit=50`);
      const json = await res.json();
      setOrders(json.orders || []);
    } catch (e) {
      console.error('[useRealtimeOrders] loadOrders error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime subscription via Supabase postgres_changes
  useEffect(() => {
    if (!user) return;

    const column = role === 'seller' ? 'seller_id' : 'buyer_id';
    const channelName = `orders-rt-${role}-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `${column}=eq.${user.id}`,
        },
        async (payload) => {
          // Buscar dados completos do novo pedido
          const { data } = await supabase
            .from('orders')
            .select(`
              id, status, amount, payment_method, delivery_type,
              created_at, tracking_code,
              product:products(id, title, images:product_images(url)),
              buyer:users!orders_buyer_id_fkey(id, name, avatar_url),
              seller:users!orders_seller_id_fkey(id, name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const order = data as unknown as RealtimeOrder;
            setOrders((prev) => [order, ...prev]);

            // Mostrar alerta para vendedores
            if (role === 'seller') {
              setNewOrderAlert({ order, at: new Date().toISOString() });
              if (alertTimer.current) clearTimeout(alertTimer.current);
              alertTimer.current = setTimeout(() => setNewOrderAlert(null), 8000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `${column}=eq.${user.id}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...(payload.new as Partial<RealtimeOrder>) } : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (alertTimer.current) clearTimeout(alertTimer.current);
    };
  }, [user, role]);

  const dismissAlert = useCallback(() => {
    setNewOrderAlert(null);
    if (alertTimer.current) clearTimeout(alertTimer.current);
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, trackingCode?: string) => {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, tracking_code: trackingCode }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao atualizar pedido.');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status, tracking_code: trackingCode || o.tracking_code } : o
        )
      );
    },
    []
  );

  // Contadores úteis
  const pendingCount = orders.filter((o) => o.status === 'confirmed' || o.status === 'pending_payment').length;
  const toShipCount = orders.filter((o) => o.status === 'confirmed').length;

  return {
    orders,
    loading,
    newOrderAlert,
    dismissAlert,
    updateOrderStatus,
    loadOrders,
    pendingCount,
    toShipCount,
  };
}
