'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Order } from '@/types';
import { PLATFORM_FEE_PERCENT } from '@/lib/constants';

const supabase = createClient();

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

        // Usar a API route para criar o pedido (garante notificação ao vendedor)
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            seller_id: product.user_id,
            buyer_id: user.id,
            amount: gross,
            delivery_type: deliveryType,
            payment_method: paymentMethod,
          }),
        });

        if (!res.ok) {
          // Fallback: inserir diretamente se API falhar
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
          return order as Order;
        }

        const { orderId } = await res.json();

        // Buscar o pedido criado para retornar tipado
        const { data: order } = await supabase
          .from('orders')
          .select('*, product:products(id, title, price, images:product_images(url))')
          .eq('id', orderId)
          .single();

        return (order as unknown as Order) || null;
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

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, delivery_status: 'confirmed', buyer_confirmed: true }
            : o
        )
      );

      return !error;
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
