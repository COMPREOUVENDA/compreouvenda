import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePricing, type ProductInput } from '@/lib/ai-pricing';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, condition, brand, price, images } = body;

    if (!title || !category || !condition) {
      return NextResponse.json(
        { success: false, error: 'title, category e condition são obrigatórios' },
        { status: 400 },
      );
    }

    const productInput: ProductInput = {
      title,
      description,
      category_id: category,
      condition,
      brand,
      price: price ? parseFloat(price) : undefined,
      images,
    };

    const suggestion = await analyzePricing(productInput);

    const responseTime = Date.now() - startTime;

    // Persist price_suggestions
    await supabase.from('price_suggestions').insert({
      user_id: user.id,
      suggested_price: suggestion.suggested_price,
      min_price: suggestion.min_price,
      max_price: suggestion.max_price,
      quick_sale_price: suggestion.quick_sale_price,
      max_profit_price: suggestion.max_profit_price,
      confidence_score: suggestion.confidence_score,
      market_position: suggestion.market_position,
      estimated_days_to_sell: suggestion.estimated_days_to_sell,
      demand_level: suggestion.demand_level,
      ai_model: suggestion.ai_model,
      analysis_data: {
        reasoning: suggestion.reasoning,
        market_avg: suggestion.market_avg,
        similar_count: suggestion.similar_count,
      },
    });

    // Persist ai_pricing_logs
    await supabase.from('ai_pricing_logs').insert({
      user_id: user.id,
      request_type: 'price_suggestion',
      model_used: suggestion.ai_model,
      input_data: productInput,
      output_data: suggestion,
      response_time_ms: responseTime,
    });

    return NextResponse.json({ success: true, data: suggestion });
  } catch (error) {
    console.error('AI pricing error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao analisar preço' },
      { status: 500 },
    );
  }
}
