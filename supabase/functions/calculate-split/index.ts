// supabase/functions/calculate-split/index.ts
// Edge Function for payment split calculation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SplitRequest {
  product_id: string;
  buyer_id: string;
  reseller_id?: string;
  payment_amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product_id, buyer_id, reseller_id, payment_amount }: SplitRequest = await req.json();

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, users!products_user_id_fkey(id, name, email)')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get platform settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['platform_fee_percent']);

    const platformFeePercent = settings?.find((s: any) => s.key === 'platform_fee_percent')?.value ?? 10;
    const gatewayFeePercent = 2.5; // Standard gateway fee

    // Calculate split
    const grossValue = payment_amount;
    const gatewayFee = round(grossValue * gatewayFeePercent / 100);
    const platformFee = round(grossValue * Number(platformFeePercent) / 100);

    let resellerCommission = 0;
    if (reseller_id && product.allow_resale_by_others) {
      if (product.reseller_commission_type === 'percentage') {
        resellerCommission = round(grossValue * (product.reseller_commission_value || 0) / 100);
      } else {
        resellerCommission = product.reseller_commission_value || 0;
      }
    }

    let sellerNet = grossValue - gatewayFee - platformFee - resellerCommission;

    let donationAmount = 0;
    if (product.donation_enabled && product.charity_id) {
      if (product.donation_type === 'percentage') {
        donationAmount = round(sellerNet * (product.donation_value || 0) / 100);
      } else {
        donationAmount = Math.min(product.donation_value || 0, sellerNet);
      }
      sellerNet -= donationAmount;
    }

    const splitResult = {
      gross_value: grossValue,
      gateway_fee: gatewayFee,
      platform_fee: platformFee,
      reseller_commission: resellerCommission,
      donation_amount: donationAmount,
      seller_net: sellerNet,
      seller_id: product.user_id,
      reseller_id: reseller_id || null,
      charity_id: product.charity_id || null,
    };

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id,
        buyer_id,
        seller_id: product.user_id,
        reseller_id: reseller_id || null,
        gross_value: grossValue,
        platform_fee: platformFee,
        gateway_fee: gatewayFee,
        reseller_commission_value: resellerCommission,
        donation_value: donationAmount,
        seller_net_value: sellerNet,
        payment_status: 'pending',
        split_status: 'pending',
        delivery_type: 'local_pickup',
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Create payment splits
    const splits = [
      { order_id: order.id, recipient_type: 'seller', recipient_id: product.user_id, amount: sellerNet, status: 'pending' },
      { order_id: order.id, recipient_type: 'platform', recipient_id: null, amount: platformFee, status: 'pending' },
    ];

    if (resellerCommission > 0 && reseller_id) {
      splits.push({ order_id: order.id, recipient_type: 'reseller', recipient_id: reseller_id, amount: resellerCommission, status: 'pending' });
    }

    if (donationAmount > 0 && product.charity_id) {
      splits.push({ order_id: order.id, recipient_type: 'charity', recipient_id: product.charity_id, amount: donationAmount, status: 'pending' });
    }

    await supabase.from('payment_splits').insert(splits);

    // Create commission record if applicable
    if (resellerCommission > 0 && reseller_id) {
      await supabase.from('commissions').insert({
        product_id,
        reseller_id,
        owner_id: product.user_id,
        order_id: order.id,
        commission_type: product.reseller_commission_type,
        commission_value: product.reseller_commission_value,
        calculated_amount: resellerCommission,
        status: 'pending',
      });
    }

    // Create donation record if applicable
    if (donationAmount > 0 && product.charity_id) {
      await supabase.from('donations').insert({
        order_id: order.id,
        product_id,
        charity_id: product.charity_id,
        donor_id: product.user_id,
        donation_type: product.donation_type,
        donation_value: product.donation_value,
        calculated_amount: donationAmount,
        status: 'pending',
      });
    }

    // Send notifications
    const notifications = [
      {
        user_id: product.user_id,
        title: 'Nova venda! 🎉',
        body: `Seu produto "${product.title}" recebeu um pedido de compra.`,
        type: 'order_created',
        data: { order_id: order.id, product_id },
      },
      {
        user_id: buyer_id,
        title: 'Pedido criado',
        body: `Seu pedido para "${product.title}" foi criado. Aguardando pagamento.`,
        type: 'order_created',
        data: { order_id: order.id, product_id },
      },
    ];

    if (reseller_id) {
      notifications.push({
        user_id: reseller_id,
        title: 'Comissão gerada! 💰',
        body: `Você receberá R$ ${resellerCommission.toFixed(2)} de comissão pela venda.`,
        type: 'commission_generated',
        data: { order_id: order.id, product_id },
      });
    }

    await supabase.from('notifications').insert(notifications);

    return new Response(
      JSON.stringify({ success: true, order, split: splitResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Split calculation error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro no cálculo do split' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
