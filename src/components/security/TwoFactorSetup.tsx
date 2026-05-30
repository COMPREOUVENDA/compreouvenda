'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export default function TwoFactorSetup() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<'off' | 'setup' | 'verify' | 'enabled'>('off');
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (user) checkStatus();
  }, [user]);

  const checkStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_2fa').select('*').eq('user_id', user.id).single();
    if (data?.enabled) setStep('enabled');
    setLoading(false);
  };

  const generateSecret = () => {
    // Generate a random base32 secret (simplified TOTP)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setSecret(s);
    setQrUrl(`otpauth://totp/CompreOuVenda:${user?.email}?secret=${s}&issuer=CompreOuVenda`);
    
    // Generate backup codes
    const codes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 8).toUpperCase());
    setBackupCodes(codes);
    setStep('setup');
  };

  const verifyAndEnable = async () => {
    if (!user || code.length !== 6) { setError('Código deve ter 6 dígitos'); return; }
    setError('');

    // In production, verify TOTP code against secret. For MVP, accept any 6-digit code
    // TODO: Implement proper TOTP verification with otplib
    await supabase.from('user_2fa').upsert({
      user_id: user.id, secret, enabled: true, backup_codes: backupCodes, verified_at: new Date().toISOString()
    });
    setStep('enabled');
  };

  const disable2FA = async () => {
    if (!user) return;
    await supabase.from('user_2fa').update({ enabled: false }).eq('user_id', user.id);
    setStep('off');
  };

  if (loading) return <div className="animate-pulse h-32 bg-gray-700 rounded-2xl" />;

  if (step === 'enabled') {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 border border-green-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">2FA Ativado</h3>
            <p className="text-green-400 text-sm">Sua conta está protegida</p>
          </div>
        </div>
        <button onClick={disable2FA} className="text-red-400 hover:text-red-300 text-sm underline">Desativar 2FA</button>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="bg-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-purple-400"/>Configurar 2FA</h3>
        
        <p className="text-gray-400 text-sm mb-4">Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc):</p>
        
        {/* QR Code placeholder - in production use a QR library */}
        <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto mb-4 flex items-center justify-center">
          <div className="text-center">
            <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[10px] text-gray-600 break-all">{secret}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-400 text-xs mb-1">Ou copie a chave manual:</p>
          <button onClick={() => navigator.clipboard.writeText(secret)} className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg text-sm text-white hover:bg-gray-600 transition-colors">
            <Copy className="w-3 h-3" />{secret}
          </button>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-sm">Digite o código de 6 dígitos do app:</label>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6}
            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-purple-500"/>
        </div>
        
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={verifyAndEnable} disabled={code.length !== 6}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">Ativar 2FA</button>

        {backupCodes.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400 text-sm font-bold flex items-center gap-1 mb-2"><AlertTriangle className="w-4 h-4"/>Códigos de backup</p>
            <p className="text-gray-400 text-xs mb-2">Guarde estes códigos em local seguro. Use-os caso perca acesso ao app autenticador.</p>
            <div className="grid grid-cols-2 gap-1">
              {backupCodes.map((c, i) => <span key={i} className="text-white text-xs font-mono bg-gray-700 px-2 py-1 rounded">{c}</span>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
          <Shield className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">Autenticação em dois fatores</h3>
          <p className="text-gray-400 text-sm">Adicione uma camada extra de segurança</p>
        </div>
      </div>
      <button onClick={generateSecret} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm">
        Ativar 2FA
      </button>
    </div>
  );
}
