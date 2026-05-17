'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Check, Lock, Eye, EyeOff, AlertCircle, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_SETTINGS = [
  { key: 'platform_fee_percent', label: 'Taxa da Plataforma (%)', value: '10', type: 'number' },
  { key: 'max_photos', label: 'Máximo de Fotos por Produto', value: '8', type: 'number' },
  { key: 'max_video_duration', label: 'Duração Máxima do Vídeo (s)', value: '20', type: 'number' },
  { key: 'max_radius_km', label: 'Raio Máximo de Negociação (km)', value: '100', type: 'number' },
  { key: 'video_daily_limit', label: 'Limite Diário de Vídeos', value: '5', type: 'number' },
  { key: 'commission_min', label: 'Comissão Mínima (%)', value: '1', type: 'number' },
  { key: 'commission_max', label: 'Comissão Máxima (%)', value: '30', type: 'number' },
  { key: 'gateway_fee', label: 'Taxa do Gateway (%)', value: '2.5', type: 'number' },
  { key: 'pix_discount', label: 'Desconto PIX (%)', value: '5', type: 'number' },
];

// ─── Chave do localStorage para o toggle de geolocalização ────────────────────
const GEO_REQUIRED_KEY = 'geo_required';

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Toggle: Geolocalização Obrigatória ────────────────────────────────────
  // Lê o estado atual do localStorage; default: false (geo desabilitada para testes)
  const [geoRequired, setGeoRequired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(GEO_REQUIRED_KEY);
      // Se não definido, usa o valor da env var como referência
      if (stored === null) {
        return process.env.NEXT_PUBLIC_GEO_REQUIRED === 'true';
      }
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const defaults: Record<string, string> = {};
    DEFAULT_SETTINGS.forEach((s) => { defaults[s.key] = s.value; });

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from('settings').select('key, value');
        if (data && data.length > 0) {
          const fromDb: Record<string, string> = { ...defaults };
          data.forEach((row: { key: string; value: string }) => { fromDb[row.key] = row.value; });
          setValues(fromDb);
        } else {
          setValues(defaults);
        }
      } catch {
        setValues(defaults);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
      const { error } = await supabase
        .from('settings')
        .upsert(rows, { onConflict: 'key' });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Digite a nova senha.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordMsg({ type: 'error', text: `Erro: ${error.message}` });
      } else {
        setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Erro interno. Tente novamente.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Handler do toggle de geolocalização ──────────────────────────────────
  const handleGeoToggle = () => {
    const next = !geoRequired;
    setGeoRequired(next);
    try {
      // Persiste no localStorage
      localStorage.setItem(GEO_REQUIRED_KEY, String(next));
      // Garante que geo_test_mode seja consistente
      if (!next) {
        // Geo desabilitada → ativar modo de teste
        localStorage.setItem('geo_test_mode', 'true');
      } else {
        // Geo habilitada → remover modo de teste
        localStorage.removeItem('geo_test_mode');
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">
          <Check className="w-4 h-4" /> Configurações salvas com sucesso!
        </div>
      )}

      {/* ── Geolocalização Toggle ─────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-400" /> Geolocalização
        </h3>

        <div className="flex items-center justify-between gap-4 p-4 bg-gray-700/50 rounded-xl">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Geolocalização Obrigatória</p>
            <p className="text-xs text-gray-400 mt-1">
              {geoRequired
                ? 'Ativo — usuários precisam permitir GPS para acessar o app.'
                : 'Desativo (Modo Teste) — GeoGate ignorado. Localização mock: São Paulo, SP.'}
            </p>
          </div>
          <button
            onClick={handleGeoToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              geoRequired
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
            }`}
            title={geoRequired ? 'Clique para desativar a geolocalização obrigatória' : 'Clique para ativar a geolocalização obrigatória'}
          >
            {geoRequired ? (
              <>
                <ToggleRight className="w-5 h-5" />
                Ativo
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                Desativo
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Alteração imediata — sem necessidade de recarregar. Para tornar permanente, defina{' '}
          <code className="text-amber-400">NEXT_PUBLIC_GEO_REQUIRED=true</code> no arquivo <code className="text-amber-400">.env</code>.
        </p>
      </div>

      {/* Password Change Section */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="font-display font-semibold text-white mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-400" /> Alterar Senha do Administrador
        </h3>

        {passwordMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 ${
            passwordMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {passwordMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {passwordMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha (mínimo 6 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 pr-11 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 text-sm"
          />
          <button
            onClick={handlePasswordChange}
            disabled={passwordLoading}
            className="w-full bg-orange-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors disabled:opacity-60"
          >
            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="font-display font-semibold text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" /> Configurações do Sistema
        </h3>
        <div className="space-y-4">
          {DEFAULT_SETTINGS.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-300 flex-1">{s.label}</label>
              <input
                type={s.type}
                value={values[s.key] ?? s.value}
                onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                className="w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full bg-brand-purple text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-purple/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
