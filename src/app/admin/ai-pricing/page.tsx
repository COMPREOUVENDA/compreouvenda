'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, BarChart2, Clock, CheckCircle, XCircle,
  Flame, Snowflake, Package, Filter,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface PricingLog {
  id: string;
  user_id: string;
  product_id: string | null;
  request_type: string;
  model_used: string;
  input_data: { title?: string; category_id?: string };
  output_data: {
    suggested_price?: number;
    confidence_score?: number;
    market_position?: string;
  };
  response_time_ms: number;
  created_at: string;
}

interface PriceSuggestion {
  id: string;
  user_id: string;
  suggested_price: number;
  confidence_score: number;
  market_position: string;
  demand_level: string;
  ai_model: string;
  created_at: string;
}

interface MarketAnalytic {
  id: string;
  category: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  total_listings: number;
  sold_last_30_days: number;
  avg_days_to_sell: number;
  demand_score: number;
  updated_at: string;
}

// ============================================================
// HELPERS
// ============================================================

const CATEGORY_NAMES: Record<string, string> = {
  '1': 'Eletrônicos', '2': 'Móveis', '3': 'Veículos', '4': 'Roupas',
  '5': 'Esportes', '6': 'Casa', '7': 'Brinquedos', '8': 'Livros',
  '9': 'Games', '10': 'Beleza', '11': 'Ferramentas', '12': 'Outros',
};

function formatBRL(v: number) {
  return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0';
}

function positionColor(pos: string) {
  if (pos === 'excellent') return 'text-emerald-400 bg-emerald-500/10';
  if (pos === 'competitive') return 'text-blue-400 bg-blue-500/10';
  if (pos === 'high') return 'text-amber-400 bg-amber-500/10';
  return 'text-red-400 bg-red-500/10';
}

function DemandBadge({ level }: { level: string }) {
  const isHigh = level === 'very_high' || level === 'high';
  const isLow = level === 'very_low' || level === 'low';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isHigh ? 'bg-orange-500/20 text-orange-400' : isLow ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'
    }`}>
      {isHigh ? <Flame className="w-3 h-3" /> : isLow ? <Snowflake className="w-3 h-3" /> : <BarChart2 className="w-3 h-3" />}
      {level?.replace('_', ' ')}
    </span>
  );
}

// ============================================================
// METRIC CARD
// ============================================================
function MetricCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function AdminAIPricingPage() {
  const [logs, setLogs] = useState<PricingLog[]>([]);
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [analytics, setAnalytics] = useState<MarketAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'market'>('logs');
  const [filterCategory, setFilterCategory] = useState('');

  // Simulated fetch from Supabase via anon key
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) return;

        const headers = {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        };

        const [logsRes, suggestionsRes, analyticsRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/ai_pricing_logs?order=created_at.desc&limit=50`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/price_suggestions?order=created_at.desc&limit=100`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/market_analytics?order=category.asc`, { headers }),
        ]);

        if (logsRes.ok) setLogs(await logsRes.json());
        if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } catch (e) {
        console.error('Admin AI load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Metrics
  const totalSuggestions = suggestions.length;
  const avgConfidence = suggestions.length
    ? Math.round(suggestions.reduce((s, r) => s + (r.confidence_score || 0), 0) / suggestions.length)
    : 0;
  const avgResponseMs = logs.length
    ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / logs.length)
    : 0;
  const openAICount = logs.filter((l) => l.model_used?.includes('gpt')).length;

  // Daily chart (last 7 days)
  const daily: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    daily[d.toISOString().slice(0, 10)] = 0;
  }
  suggestions.forEach((s) => {
    const k = s.created_at?.slice(0, 10);
    if (k && k in daily) daily[k]++;
  });
  const dailyEntries = Object.entries(daily);
  const maxDay = Math.max(...Object.values(daily), 1);

  const filteredAnalytics = filterCategory
    ? analytics.filter((a) => a.category === filterCategory)
    : analytics;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">IA Preços</h2>
            <p className="text-xs text-gray-400">Sistema avançado de sugestão de preços por IA</p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de sugestões" value={totalSuggestions} icon={Sparkles} color="bg-brand-purple/20 text-brand-purple" />
        <MetricCard label="Confiança média" value={`${avgConfidence}%`} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-400" />
        <MetricCard label="Tempo médio (ms)" value={avgResponseMs} icon={Clock} color="bg-blue-500/20 text-blue-400" />
        <MetricCard label="Chamadas OpenAI" value={openAICount} icon={BarChart2} color="bg-amber-500/20 text-amber-400" />
      </div>

      {/* Daily chart */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Sugestões por dia (últimos 7 dias)</p>
        <div className="flex items-end gap-2 h-24">
          {dailyEntries.map(([date, count]) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-400">{count}</span>
              <div
                className="w-full rounded-t-lg bg-brand-purple/70 transition-all"
                style={{ height: `${Math.max(4, (count / maxDay) * 80)}px` }}
              />
              <span className="text-[8px] text-gray-500">{date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Logs recentes
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'market' ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Dados de mercado
        </button>
      </div>

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Logs de sugestões</p>
            <span className="text-xs text-gray-400">{logs.length} registros</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhum log ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Modelo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Preço sugerido</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Confiança</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Posição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Tempo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3 text-gray-300 max-w-[180px] truncate">
                        {log.input_data?.title || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.model_used?.includes('gpt')
                            ? 'bg-brand-purple/20 text-brand-purple'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {log.model_used || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {log.output_data?.suggested_price ? formatBRL(log.output_data.suggested_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {log.output_data?.confidence_score ?? '—'}%
                      </td>
                      <td className="px-4 py-3">
                        {log.output_data?.market_position ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${positionColor(log.output_data.market_position)}`}>
                            {log.output_data.market_position}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{log.response_time_ms}ms</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {log.created_at ? new Date(log.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Market */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-purple"
            >
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORY_NAMES).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAnalytics.map((a) => (
              <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand-purple" />
                    <span className="text-sm font-bold text-white">
                      {CATEGORY_NAMES[a.category] || `Cat. ${a.category}`}
                    </span>
                  </div>
                  <DemandBadge level={a.demand_score >= 80 ? 'very_high' : a.demand_score >= 65 ? 'high' : a.demand_score >= 45 ? 'medium' : 'low'} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Preço médio</p>
                    <p className="font-semibold text-white">{formatBRL(a.avg_price)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Faixa</p>
                    <p className="font-semibold text-white">{formatBRL(a.min_price)} – {formatBRL(a.max_price)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Anúncios ativos</p>
                    <p className="font-semibold text-white">{a.total_listings}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Vendidos (30d)</p>
                    <p className="font-semibold text-white">{a.sold_last_30_days}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Dias médios p/ vender</p>
                    <p className="font-semibold text-white">{Number(a.avg_days_to_sell).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Score de demanda</p>
                    <p className="font-semibold text-white">{a.demand_score}/100</p>
                  </div>
                </div>

                {/* Demand bar */}
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-orange rounded-full"
                    style={{ width: `${a.demand_score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
