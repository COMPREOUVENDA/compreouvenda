/**
 * AI Pricing Engine
 * Camada 1: Algoritmo interno baseado em produtos similares no banco
 * Camada 2: OpenAI GPT (ativa automaticamente se OPENAI_API_KEY existir)
 */

// ============================================================
// TYPES
// ============================================================

export type MarketPosition = 'excellent' | 'competitive' | 'high' | 'very_high';
export type DemandLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

export interface ProductInput {
  title: string;
  description?: string;
  category_id: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'used';
  brand?: string;
  price?: number; // preco digitado pelo usuario (para comparacao)
  images?: string[];
}

export interface PriceSuggestion {
  suggested_price: number;
  min_price: number;
  max_price: number;
  quick_sale_price: number;
  max_profit_price: number;
  confidence_score: number; // 0-100
  market_position: MarketPosition;
  estimated_days_to_sell: number;
  demand_level: DemandLevel;
  ai_model: string;
  reasoning?: string;
  similar_count?: number;
  market_avg?: number;
}

export interface SaleEstimate {
  estimated_days: number;
  probability: number; // 0-100
  interest_level: string;
  negotiation_chance: number; // 0-100
}

export interface MarketData {
  category: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_listings: number;
  sold_last_30_days: number;
  avg_days_to_sell: number;
  demand_score: number;
}

// ============================================================
// CONDITION ADJUSTMENTS
// ============================================================

const CONDITION_FACTORS: Record<ProductInput['condition'], number> = {
  new: 1.0,
  like_new: 0.85,
  good: 0.70,
  fair: 0.55,
  used: 0.45,
};

// Premium brands list (simplified)
const PREMIUM_BRANDS = [
  'apple', 'samsung', 'sony', 'lg', 'rolex', 'louis vuitton', 'gucci',
  'bmw', 'mercedes', 'audi', 'porsche', 'dyson', 'bose', 'herman miller',
];

// ============================================================
// HELPER: detect premium brand
// ============================================================
function isPremiumBrand(title: string, brand?: string): boolean {
  const text = ((brand || '') + ' ' + title).toLowerCase();
  return PREMIUM_BRANDS.some((b) => text.includes(b));
}

// ============================================================
// getMarketPosition
// ============================================================
export function getMarketPosition(price: number, avgMarket: number): MarketPosition {
  if (price <= avgMarket * 0.8) return 'excellent';
  if (price <= avgMarket * 1.0) return 'competitive';
  if (price <= avgMarket * 1.3) return 'high';
  return 'very_high';
}

// ============================================================
// getDemandLevel
// ============================================================
export function getDemandLevel(demandScore: number): DemandLevel {
  if (demandScore >= 80) return 'very_high';
  if (demandScore >= 65) return 'high';
  if (demandScore >= 45) return 'medium';
  if (demandScore >= 25) return 'low';
  return 'very_low';
}

// ============================================================
// estimateSaleSpeed
// ============================================================
export function estimateSaleSpeed(
  price: number,
  marketData: MarketData,
  position: MarketPosition,
): SaleEstimate {
  const base = marketData.avg_days_to_sell || 10;
  let factor = 1.0;
  let probability = 70;

  switch (position) {
    case 'excellent':
      factor = 0.5;
      probability = 92;
      break;
    case 'competitive':
      factor = 0.8;
      probability = 78;
      break;
    case 'high':
      factor = 1.4;
      probability = 55;
      break;
    case 'very_high':
      factor = 2.2;
      probability = 30;
      break;
  }

  const estimated_days = Math.max(1, Math.round(base * factor));
  const interest_level =
    probability >= 80 ? 'muito alto' : probability >= 60 ? 'alto' : probability >= 40 ? 'médio' : 'baixo';
  const negotiation_chance = position === 'excellent' ? 20 : position === 'competitive' ? 35 : 60;

  return { estimated_days, probability, interest_level, negotiation_chance };
}

// ============================================================
// INTERNAL PRICING ALGORITHM
// ============================================================
export function internalPricingAlgorithm(
  product: ProductInput,
  marketData: MarketData,
): PriceSuggestion {
  const conditionFactor = CONDITION_FACTORS[product.condition] ?? 0.7;
  const premium = isPremiumBrand(product.title, product.brand) ? 1.1 : 1.0;

  const avgPrice = marketData.avg_price || 100;
  const minMarket = marketData.min_price || avgPrice * 0.3;
  const maxMarket = marketData.max_price || avgPrice * 2;

  // Base suggestion = avg * condition adjustment * premium
  let base = avgPrice * conditionFactor * premium;

  // Clamp to market range
  base = Math.max(minMarket, Math.min(maxMarket, base));

  const suggested_price = Math.round(base);
  const min_price = Math.round(base * 0.85);
  const max_price = Math.round(base * 1.2);
  const quick_sale_price = Math.round(base * 0.78);
  const max_profit_price = Math.round(base * 1.18);

  // confidence based on how much data we have
  const confidence_score = Math.min(
    95,
    30 + Math.min(marketData.total_listings, 200) / 200 * 65,
  );

  const market_position = getMarketPosition(suggested_price, avgPrice);
  const demand_level = getDemandLevel(marketData.demand_score || 50);
  const saleEstimate = estimateSaleSpeed(suggested_price, marketData, market_position);

  return {
    suggested_price,
    min_price,
    max_price,
    quick_sale_price,
    max_profit_price,
    confidence_score: Math.round(confidence_score),
    market_position,
    estimated_days_to_sell: saleEstimate.estimated_days,
    demand_level,
    ai_model: 'internal_v1',
    reasoning: `Baseado em ${marketData.total_listings} produtos similares na categoria. Preço médio de mercado: R$ ${avgPrice.toFixed(2)}.`,
    similar_count: marketData.total_listings,
    market_avg: avgPrice,
  };
}

// ============================================================
// OPENAI PRICING ANALYSIS
// ============================================================
async function openAIPricingAnalysis(product: ProductInput, marketData: MarketData): Promise<PriceSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const conditionLabels: Record<ProductInput['condition'], string> = {
    new: 'Novo',
    like_new: 'Seminovo',
    good: 'Bom estado',
    fair: 'Razoável',
    used: 'Usado',
  };

  const systemPrompt = `Você é um especialista em precificação de marketplace brasileiro.
Analise o produto e retorne um JSON com a seguinte estrutura exata:
{
  "suggested_price": number,
  "min_price": number,
  "max_price": number,
  "quick_sale_price": number,
  "max_profit_price": number,
  "confidence_score": number (0-100),
  "market_position": "excellent"|"competitive"|"high"|"very_high",
  "estimated_days_to_sell": number,
  "demand_level": "very_high"|"high"|"medium"|"low"|"very_low",
  "reasoning": string
}`;

  const userPrompt = `Produto: ${product.title}
Categoria ID: ${product.category_id}
Condição: ${conditionLabels[product.condition]}
Descrição: ${product.description || 'Não informada'}
Marca: ${product.brand || 'Não informada'}

Dados de mercado desta categoria:
- Preço médio: R$ ${marketData.avg_price}
- Mínimo: R$ ${marketData.min_price}
- Máximo: R$ ${marketData.max_price}
- Produtos ativos: ${marketData.total_listings}
- Vendidos em 30 dias: ${marketData.sold_last_30_days}
- Média de dias para vender: ${marketData.avg_days_to_sell}

Responda APENAS com o JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract JSON from content
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid OpenAI response format');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    suggested_price: parsed.suggested_price,
    min_price: parsed.min_price,
    max_price: parsed.max_price,
    quick_sale_price: parsed.quick_sale_price,
    max_profit_price: parsed.max_profit_price,
    confidence_score: parsed.confidence_score ?? 75,
    market_position: parsed.market_position ?? 'competitive',
    estimated_days_to_sell: parsed.estimated_days_to_sell ?? 10,
    demand_level: parsed.demand_level ?? 'medium',
    ai_model: 'gpt-4o-mini',
    reasoning: parsed.reasoning,
    similar_count: marketData.total_listings,
    market_avg: marketData.avg_price,
  };
}

// ============================================================
// FETCH MARKET DATA (server-side via Supabase)
// ============================================================
async function fetchMarketData(categoryId: string): Promise<MarketData> {
  // Default fallback
  const defaults: MarketData = {
    category: categoryId,
    avg_price: 200,
    min_price: 20,
    max_price: 2000,
    total_listings: 50,
    sold_last_30_days: 20,
    avg_days_to_sell: 10,
    demand_score: 60,
  };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return defaults;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/market_analytics?category=eq.${encodeURIComponent(categoryId)}&order=updated_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) return defaults;
    const rows = await response.json();
    if (!rows?.length) return defaults;

    const r = rows[0];
    return {
      category: r.category,
      avg_price: parseFloat(r.avg_price) || defaults.avg_price,
      min_price: parseFloat(r.min_price) || defaults.min_price,
      max_price: parseFloat(r.max_price) || defaults.max_price,
      total_listings: r.total_listings || defaults.total_listings,
      sold_last_30_days: r.sold_last_30_days || defaults.sold_last_30_days,
      avg_days_to_sell: parseFloat(r.avg_days_to_sell) || defaults.avg_days_to_sell,
      demand_score: r.demand_score || defaults.demand_score,
    };
  } catch {
    return defaults;
  }
}

// ============================================================
// MAIN: analyzePricing
// ============================================================
export async function analyzePricing(product: ProductInput): Promise<PriceSuggestion> {
  const marketData = await fetchMarketData(product.category_id);
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasOpenAI) {
    try {
      const result = await openAIPricingAnalysis(product, marketData);
      return result;
    } catch (err) {
      // Fallback to internal algorithm
      console.warn('OpenAI pricing failed, using internal algorithm:', err);
    }
  }

  return internalPricingAlgorithm(product, marketData);
}

export { fetchMarketData };
