'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, MapPin, ChevronRight, ShoppingBag, Store, Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const STEPS = ['Conta', 'Perfil', 'Localização'];

const USER_TYPES = [
  { type: 'buyer', icon: ShoppingBag, label: 'Comprador', desc: 'Quero comprar produtos' },
  { type: 'seller', icon: Store, label: 'Vendedor', desc: 'Quero vender meus produtos' },
  { type: 'charity', icon: Heart, label: 'Instituição', desc: 'Sou uma instituição beneficente' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', type: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.name, formData.type);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already registered')) {
        setError('Este e-mail já está cadastrado');
      } else if (msg.includes('password')) {
        setError('A senha deve ter pelo menos 6 caracteres');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToProfile = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleSelectType = (type: string) => {
    setFormData({ ...formData, type });
    setStep(2);
  };

  const handleLocationAndFinish = async () => {
    // Try to get location, then register
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => handleRegister(),
        () => handleRegister() // Register even without location
      );
    } else {
      await handleRegister();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-2 bg-gradient-brand" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-6 animate-fade-in">
          <Image src="/logo-full.png" alt="compreOUvenda.com" width={280} height={90} className="mx-auto h-18 w-auto object-contain" priority />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step ? 'bg-brand-purple text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-brand-purple' : 'text-gray-400'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-purple' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="w-full max-w-md card-elevated p-8 animate-slide-up">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {step === 0 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Criar conta</h2>
              <p className="text-gray-400 text-center text-sm mb-8">Comece a comprar e vender agora</p>
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Nome completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field pl-11" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field pl-11" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input-field pl-11" required minLength={6} />
                </div>
                <button onClick={handleContinueToProfile} className="btn-primary w-full flex items-center justify-center gap-2">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Seu perfil</h2>
              <p className="text-gray-400 text-center text-sm mb-8">Como você quer usar o COMPREOUVENDA?</p>
              <div className="space-y-3">
                {USER_TYPES.map((ut) => (
                  <button
                    key={ut.type}
                    onClick={() => handleSelectType(ut.type)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      formData.type === ut.type ? 'border-brand-purple bg-brand-purple/5' : 'border-gray-200 hover:border-brand-purple/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                      <ut.icon className="w-6 h-6 text-brand-purple" />
                    </div>
                    <div className="text-left">
                      <span className="font-display font-semibold text-gray-900">{ut.label}</span>
                      <p className="text-sm text-gray-400">{ut.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Localização</h2>
              <p className="text-gray-400 text-center text-sm mb-8">Para mostrar produtos perto de você</p>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-10 h-10 text-brand-blue" />
                </div>
                <p className="text-sm text-gray-500">Permita o acesso à sua localização para ver produtos próximos e calcular distâncias.</p>
                <button
                  onClick={handleLocationAndFinish}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Criando conta...' : 'Permitir e criar conta'}
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Pular e criar conta
                </button>
              </div>
            </>
          )}

          {step > 0 && !loading && (
            <button onClick={() => setStep(step - 1)} className="mt-4 text-sm text-gray-400 hover:text-gray-600 w-full text-center">
              ← Voltar
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Já tem conta? <Link href="/login" className="text-brand-purple font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
