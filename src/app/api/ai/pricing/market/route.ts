import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData, getDemandLevel } from '@/lib/ai-pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json({ error: 'category é obrigatório' }, { status: 400 });
    }

    const data = await fetchMarketData(category);
    const demand_level = getDemandLevel(data.demand_score);

    // Determine trend (simplified)
    const trend = data.demand_score >= 70 ? 'alta' : data.demand_score >= 45 ? 'estável' : 'baixa';

    return NextResponse.json({
      category: data.category,
      avg_price: data.avg_price,
      min_price: data.min_price,
      max_price: data.max_price,
      listings: data.total_listings,
      sold_30d: data.sold_last_30_days,
      avg_days_to_sell: data.avg_days_to_sell,
      demand_level,
      demand_score: data.demand_score,
      trend,
    });
  } catch (error) {
    console.error('Market data error:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de mercado' }, { status: 500 });
  }
}
