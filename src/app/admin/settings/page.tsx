'use client';
import { Settings, Save } from 'lucide-react';

const SETTINGS = [
  { key: 'platform_fee_percent', label: 'Taxa da Plataforma (%)', value: '10', type: 'number' },
  { key: 'max_photos', label: 'Máximo de Fotos por Produto', value: '8', type: 'number' },
  { key: 'max_video_duration', label: 'Duração Máxima do Vídeo (s)', value: '20', type: 'number' },
  { key: 'max_radius_km', label: 'Raio Máximo de Negociação (km)', value: '100', type: 'number' },
  { key: 'video_daily_limit', label: 'Limite Diário de Vídeos', value: '5', type: 'number' },
  { key: 'commission_min', label: 'Comissão Mínima (%)', value: '1', type: 'number' },
  { key: 'commission_max', label: 'Comissão Máxima (%)', value: '30', type: 'number' },
  { key: 'gateway_fee', label: 'Taxa do Gateway (%)', value: '2.5', type: 'number' },
];

export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="font-display font-semibold text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-400" /> Configurações do Sistema</h3>
        <div className="space-y-4">
          {SETTINGS.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <label className="text-sm text-gray-300">{s.label}</label>
              <input
                type={s.type}
                defaultValue={s.value}
                className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
          ))}
        </div>
        <button className="mt-6 w-full bg-brand-purple text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-purple/90 transition-colors">
          <Save className="w-4 h-4" /> Salvar Configurações
        </button>
      </div>
    </div>
  );
}
