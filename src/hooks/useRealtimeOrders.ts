'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

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

const POLL_INTERVAL = 15_000;

export function useRealtimeOrders(role: 'buyer' | 'seller' = 'seller') {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<RealtimeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<NewOrderAlert | null>(null);
  const alertTimer = useRef<NodeJS.Timeout | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&role=${role}&limit=50`);
      const json = await res.json();
      const fetched: RealtimeOrder[] = json.orders || [];

      // Detectar novos pedidos comparando com o conjunto anterior
      if (prevIdsRef.current.size > 0 && role === 'seller') {
        for (const order of fetched) {
          if (!prevIdsRef.current.has(order.id)) {
            setNewOrderAlert({ order, at: new Date().toISOString() });
            if (alertTimer.current) clearTimeout(alertTimer.current);
            alertTimer.current = setTimeout(() => setNewOrderAlert(null), 8000);
            break;
          }
        }
      }

      prevIdsRef.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
    } catch (e) {
      console.error('[useRealtimeOrders] loadOrders error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      if (alertTimer.current) clearTimeout(alertTimer.current);
    };
  }, [loadOrders]);

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
