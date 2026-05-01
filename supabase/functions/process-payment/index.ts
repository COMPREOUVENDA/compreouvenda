// supabase/functions/process-payment/index.ts
// Edge Function for payment processing (prepared for gateway integration)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  order_id: string;
  payment_method: 'credit_card' | 'pix' | 'boleto';
  installments?: number;
  card_token?: string;
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

    const { order_id, payment_method, installments, card_token }: PaymentRequest = await req.json();

    // Get order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.payment_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Pedido já processado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process payment via gateway
    // TODO: Integrate with Pagar.me / Stripe Connect / MercadoPago / Asaas
    const gatewayResult = await processWithGateway({
      amount: order.gross_value,
      method: payment_method,
      installments: installments || 1,
      card_token,
      splits: await getSplitsForOrder(supabase, order_id),
    });

    // Create payment record
    await supabase.from('payments').insert({
      order_id,
      amount: order.gross_value,
      status: gatewayResult.success ? 'held' : 'failed',
      provider: 'gateway_placeholder',
      provider_transaction_id: gatewayResult.transaction_id,
      method: payment_method,
      installments: installments || 1,
      metadata: gatewayResult,
    });

    // Update order status
    await supabase
      .from('orders')
      .update({
        payment_status: gatewayResult.success ? 'held' : 'failed',
        payment_provider: 'gateway_placeholder',
        transaction_id: gatewayResult.transaction_id,
      })
      .eq('id', order_id);

    if (gatewayResult.success) {
      // Notify seller
      await supabase.from('notifications').insert({
        user_id: order.seller_id,
        title: 'Pagamento confirmado! 💳',
        body: 'O pagamento foi confirmado. Aguardando entrega/retirada.',
        type: 'payment_confirmed',
        data: { order_id },
      });

      // Update product status
      await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', order.product_id);
    }

    return new Response(
      JSON.stringify({
        success: gatewayResult.success,
        transaction_id: gatewayResult.transaction_id,
        status: gatewayResult.success ? 'held' : 'failed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro no processamento do pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getSplitsForOrder(supabase: any, orderId: string) {
  const { data } = await supabase
    .from('payment_splits')
    .select('*')
    .eq('order_id', orderId);
  return data || [];
}

// Placeholder for gateway integration
async function processWithGateway(params: {
  amount: number;
  method: string;
  installments: number;
  card_token?: string;
  splits: any[];
}) {
  // In production: Call actual payment gateway API
  // Pagar.me: POST /transactions with split_rules
  // Stripe Connect: Create PaymentIntent with transfer_data
  // MercadoPago: Create payment with marketplace split
  // Asaas: Create charge with split

  return {
    success: true,
    transaction_id: `txn_${Date.now()}`,
    gateway: 'placeholder',
    amount: params.amount,
    method: params.method,
    installments: params.installments,
    created_at: new Date().toISOString(),
  };
}
