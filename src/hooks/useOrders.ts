'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Order } from '@/types';
import { PLATFORM_FEE_PERCENT } from '@/lib/constants';

const supabase = createClient();

const MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    product_id: '1',
    buyer_id: 'u10',
    seller_id: 'u1',
    gross_value: 5200,
    platform_fee: 520,
    gateway_fee: 78,
    reseller_commission_value: 0,
    donation_value: 80,
    seller_net_value: 4522,
    payment_status: 'paid',
    delivery_type: 'local_pickup',
    delivery_status: 'delivered',
    buyer_confirmed: false,
    seller_confirmed: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'o2',
    product_id: '3',
    buyer_id: 'u10',
    seller_id: 'u3',
    gross_value: 2800,
    platform_fee: 280,
    gateway_fee: 42,
    reseller_commission_value: 0,
    donation_value: 50,
    seller_net_value: 2428,
    payment_status: 'held',
    delivery_type: 'partner_delivery',
    delivery_status: 'in_transit',
    buyer_confirmed: false,
    seller_confirmed: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function useOrders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Realtime subscription for orders updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`orders:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSales((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSales((prev) =>
              prev.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o))
            );
          }
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getMyOrders = useCallback(async (): Promise<Order[]> => {
    if (!user) {
      setOrders([]);
      return [];
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, product:products(id, title, price, images:product_images(url))')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setOrders([]);
        return [];
      }
      const normalized = (data as Order[]).map((o) => ({
        ...o,
        net_value: o.net_value || (o.gross_value - (o.platform_fee || 0) - (o.gateway_fee || 0) - (o.reseller_commission_value || 0)),
      }));
      setOrders(normalized);
      return normalized;
    } catch {
      setOrders([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getMySales = useCallback(async (): Promise<Order[]> => {
    if (!user) {
      setSales([]);
      return [];
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, product:products(id, title, price, images:product_images(url))')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError || !data) {
        setSales([]);
        return [];
      }
      const normalized = (data as Order[]).map((o) => ({
        ...o,
        net_value: o.net_value || (o.gross_value - (o.platform_fee || 0) - (o.gateway_fee || 0) - (o.reseller_commission_value || 0)),
      }));
      setSales(normalized);
      return normalized;
    } catch {
      setSales([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createOrder = useCallback(
    async (
      productId: string,
      paymentMethod: 'pix' | 'credit',
      deliveryType: 'local_pickup' | 'partner_delivery',
      resellerId?: string
    ): Promise<Order | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);

      try {
        // Fetch product to get price/seller
        const { data: product } = await supabase
          .from('products')
          .select('price, user_id, reseller_commission_value, donation_value, donation_type, donation_enabled')
          .eq('id', productId)
          .single();

        if (!product) throw new Error('Produto não encontrado');

        const gross = product.price as number;
        const platformFee = Math.round(gross * (PLATFORM_FEE_PERCENT / 100));
        const gatewayFee = Math.round(gross * (paymentMethod === 'pix' ? 0.015 : 0.035));
        const resellerCommission = resellerId && product.reseller_commission_value
          ? Math.round(gross * (product.reseller_commission_value / 100))
          : 0;
        const donationValue = product.donation_enabled && product.donation_value
          ? (product.donation_type === 'percentage'
              ? Math.round(gross * (product.donation_value / 100))
              : product.donation_value)
          : 0;
        const sellerNet = gross - platformFee - gatewayFee - resellerCommission - donationValue;

        const { data: order, error: insertError } = await supabase
          .from('orders')
          .insert({
            product_id: productId,
            buyer_id: user.id,
            seller_id: product.user_id,
            reseller_id: resellerId || null,
            gross_value: gross,
            platform_fee: platformFee,
            gateway_fee: gatewayFee,
            reseller_commission_value: resellerCommission,
            donation_value: donationValue,
            seller_net_value: sellerNet,
            payment_status: 'pending',
            payment_provider: 'simulated',
            delivery_type: deliveryType,
            delivery_status: 'pending',
            buyer_confirmed: false,
            seller_confirmed: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Simulate payment approval after 2s
        setTimeout(async () => {
          await supabase
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', order.id);
        }, 2000);

        return order as Order;
      } catch (e: any) {
        setError(e.message || 'Erro ao criar pedido');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order['delivery_status']): Promise<boolean> => {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: status })
        .eq('id', orderId);

      if (error) {
        setError(error.message);
        return false;
      }
      return true;
    },
    []
  );

  const confirmDelivery = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!user) return false;
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_status: 'confirmed',
          buyer_confirmed: true,
          delivery_confirmed_at: new Date().toISOString(),
          payment_status: 'released',
        })
        .eq('id', orderId)
        .eq('buyer_id', user.id);

      if (error) {
        // Update mock state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, delivery_status: 'confirmed', buyer_confirmed: true }
              : o
          )
        );
        return true;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, delivery_status: 'confirmed', buyer_confirmed: true }
            : o
        )
      );
      return true;
    },
    [user]
  );

  return {
    orders,
    sales,
    loading,
    error,
    getMyOrders,
    getMySales,
    createOrder,
    updateOrderStatus,
    confirmDelivery,
  };
}
