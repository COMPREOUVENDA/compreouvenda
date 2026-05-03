'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Lock, Phone, MapPin, ChevronRight, ChevronLeft,
  ShoppingBag, Store, Heart, Loader2, Eye, EyeOff,
  CheckCircle2, XCircle, FileText, Calendar, Home, Check,
  ShieldAlert, AlertTriangle, Navigation,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  maskPhone, maskCPF, maskCNPJ, maskCEP, maskDate,
  validateCPF, validateCNPJ, validateEmail, validate18Plus,
  getPasswordStrength, lookupCep,
} from '@/lib/masks';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Conta', 'Dados', 'Endereço', 'Confirmar'];

const USER_TYPES = [
  { type: 'buyer', icon: ShoppingBag, label: 'Comprador', desc: 'Quero comprar produtos' },
  { type: 'seller', icon: Store, label: 'Vendedor', desc: 'Quero vender meus produtos' },
  { type: 'charity', icon: Heart, label: 'Instituição', desc: 'Sou uma instituição beneficente' },
];

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Step 2
  personType: 'cpf' | 'cnpj';
  document: string;
  birthDate: string;
  userType: string;
  // Step 3
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  // Step 4
  acceptTerms: boolean;
}

type GeoPhase = 'consent' | 'loading' | 'granted' | 'denied';

// ─── Inline field validation feedback ─────────────────────────────────────────

interface FieldStatus {
  touched: boolean;
  valid: boolean;
  message: string;
}

function useFieldStatus(initial: FieldStatus = { touched: false, valid: false, message: '' }) {
  const [status, setStatus] = useState<FieldStatus>(initial);
  return { status, setStatus };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // ─── Geolocation state ──────────────────────────────────────────────────────
  const [geoPhase, setGeoPhase] = useState<GeoPhase>('consent');
  const [geoError, setGeoError] = useState('');
  const [showBrowserHelp, setShowBrowserHelp] = useState(false);
  // Divergence: CEP city/state vs GPS city/state
  const [cepDivergence, setCepDivergence] = useState<{
    cepCity: string; cepState: string; gpsCity: string; gpsState: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    personType: 'cpf', document: '', birthDate: '', userType: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    lat: null, lng: null,
    acceptTerms: false,
  });

  // ─── Field statuses ─────────────────────────────────────────────────────────

  const nameStatus = useFieldStatus();
  const emailStatus = useFieldStatus();
  const phoneStatus = useFieldStatus();
  const passwordStatus = useFieldStatus();
  const confirmStatus = useFieldStatus();
  const documentStatus = useFieldStatus();
  const birthStatus = useFieldStatus();

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const set = useCallback(
    (key: keyof FormData, value: string | boolean | number | null) =>
      setFormData((prev) => ({ ...prev, [key]: value })),
    []
  );

  const passwordStrength = getPasswordStrength(formData.password);

  // ─── Reverse geocoding ───────────────────────────────────────────────────────

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<{ city: string; state: string }> => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await resp.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || '';
      const state = addr.state || '';
      return { city, state };
    } catch {
      return { city: '', state: '' };
    }
  }, []);

  // ─── Request GPS ─────────────────────────────────────────────────────────────

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não é suportada neste navegador.');
      setGeoPhase('denied');
      return;
    }
    setGeoPhase('loading');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setFormData((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          cidade: geo.city || prev.cidade,
          estado: geo.state || prev.estado,
        }));
        setGeoPhase('granted');
      },
      (err) => {
        let msg = 'Não foi possível obter sua localização.';
        if (err.code === 1) msg = 'Você recusou o acesso à localização.';
        else if (err.code === 2) msg = 'Sua localização está indisponível no momento.';
        else if (err.code === 3) msg = 'Tempo esgotado ao obter localização.';
        setGeoError(msg);
        setGeoPhase('denied');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [reverseGeocode]);

  // ─── CEP lookup ─────────────────────────────────────────────────────────────

  const handleCepChange = (raw: string) => {
    const masked = maskCEP(raw);
    set('cep', masked);
    setCepError('');
    setCepDivergence(null);

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      setTimeout(() => {
        const found = lookupCep(digits);
        if (found) {
          setFormData((prev) => {
            const newData = {
              ...prev,
              cep: masked,
              rua: found.rua,
              bairro: found.bairro,
              cidade: found.cidade,
              estado: found.estado,
            };
            // Check divergence vs GPS
            if (prev.lat && prev.lng) {
              const gpsCity = prev.cidade;
              const gpsState = prev.estado;
              const isSameCity = found.cidade.toLowerCase() === gpsCity.toLowerCase();
              const isSameState = found.estado.toLowerCase() === gpsState.toLowerCase();
              if (!isSameCity || !isSameState) {
                setCepDivergence({
                  cepCity: found.cidade,
                  cepState: found.estado,
                  gpsCity,
                  gpsState,
                });
                // Don't auto-override city/state from CEP; keep GPS values
                return { ...prev, cep: masked, rua: found.rua, bairro: found.bairro };
              }
            }
            return newData;
          });
        } else {
          setCepError('CEP não encontrado. Preencha manualmente.');
        }
        setCepLoading(false);
      }, 400);
    }
  };

  // ─── Step validation ────────────────────────────────────────────────────────

  const validateStep0 = () => {
    let ok = true;

    if (!formData.name || formData.name.trim().length < 3) {
      nameStatus.setStatus({ touched: true, valid: false, message: 'Nome deve ter pelo menos 3 caracteres' });
      ok = false;
    } else {
      nameStatus.setStatus({ touched: true, valid: true, message: '' });
    }

    if (!validateEmail(formData.email)) {
      emailStatus.setStatus({ touched: true, valid: false, message: 'E-mail inválido' });
      ok = false;
    } else {
      emailStatus.setStatus({ touched: true, valid: true, message: '' });
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      phoneStatus.setStatus({ touched: true, valid: false, message: 'Telefone inválido' });
      ok = false;
    } else {
      phoneStatus.setStatus({ touched: true, valid: true, message: '' });
    }

    if (formData.password.length < 6) {
      passwordStatus.setStatus({ touched: true, valid: false, message: 'Mínimo 6 caracteres' });
      ok = false;
    } else {
      passwordStatus.setStatus({ touched: true, valid: true, message: '' });
    }

    if (formData.confirmPassword !== formData.password) {
      confirmStatus.setStatus({ touched: true, valid: false, message: 'Senhas não coincidem' });
      ok = false;
    } else if (formData.confirmPassword.length > 0) {
      confirmStatus.setStatus({ touched: true, valid: true, message: '' });
    }

    return ok;
  };

  const validateStep1 = () => {
    let ok = true;

    const rawDoc = formData.document.replace(/\D/g, '');
    if (formData.personType === 'cpf') {
      if (!validateCPF(rawDoc)) {
        documentStatus.setStatus({ touched: true, valid: false, message: 'CPF inválido' });
        ok = false;
      } else {
        documentStatus.setStatus({ touched: true, valid: true, message: '' });
      }
    } else {
      if (!validateCNPJ(rawDoc)) {
        documentStatus.setStatus({ touched: true, valid: false, message: 'CNPJ inválido' });
        ok = false;
      } else {
        documentStatus.setStatus({ touched: true, valid: true, message: '' });
      }
    }

    if (formData.personType === 'cpf') {
      if (!validate18Plus(formData.birthDate)) {
        birthStatus.setStatus({ touched: true, valid: false, message: 'Você deve ter 18 anos ou mais' });
        ok = false;
      } else {
        birthStatus.setStatus({ touched: true, valid: true, message: '' });
      }
    }

    if (!formData.userType) {
      setGlobalError('Selecione o tipo de usuário');
      ok = false;
    }

    return ok;
  };

  const validateStep2 = () => {
    if (!formData.lat || !formData.lng) {
      setGlobalError('Localização obrigatória. Permita o acesso à sua localização para continuar.');
      return false;
    }
    return true;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      setGlobalError('Aceite os Termos de Uso para continuar');
      return;
    }
    setGlobalError('');
    setLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.name, formData.userType, {
        phone: formData.phone.replace(/\D/g, ''),
        document: formData.document.replace(/\D/g, ''),
        city: formData.cidade,
        state: formData.estado,
        lat: formData.lat ?? undefined,
        lng: formData.lng ?? undefined,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setGlobalError('Este e-mail já está cadastrado. Faça login.');
        setStep(0);
      } else if (msg.includes('password')) {
        setGlobalError('A senha deve ter pelo menos 6 caracteres');
        setStep(0);
      } else {
        setGlobalError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    setGlobalError('');
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setGlobalError('');
    setStep((s) => s - 1);
  };

  // ─── Field component helpers ─────────────────────────────────────────────────

  const FieldIcon = ({
    status, touched,
  }: {
    status: FieldStatus; touched?: boolean;
  }) => {
    if (!status.touched && !touched) return null;
    if (status.valid) return <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />;
    return <XCircle className="w-4 h-4 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />;
  };

  const borderClass = (s: FieldStatus) => {
    if (!s.touched) return '';
    return s.valid ? '!border-green-500' : '!border-red-400';
  };

  // ─── Progress bar ────────────────────────────────────────────────────────────

  const progressWidth = `${((step) / (STEPS.length - 1)) * 100}%`;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-1.5 bg-gradient-brand" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        {/* Logo */}
        <div className="mb-6 animate-fade-in">
          <Image
            src="/logo-full.png"
            alt="compreOUvenda.com"
            width={260}
            height={84}
            className="mx-auto h-16 w-auto object-contain"
            priority
          />
        </div>

        {/* Step progress */}
        <div className="w-full max-w-md mb-6">
          {/* Labels */}
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-xs font-semibold transition-colors ${
                  i <= step ? 'text-brand-purple' : 'text-gray-300'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          {/* Bar */}
          <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-purple to-brand-pink rounded-full transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
          {/* Dots */}
          <div className="flex justify-between mt-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  i < step
                    ? 'bg-brand-purple border-brand-purple'
                    : i === step
                    ? 'bg-white border-brand-purple'
                    : 'bg-white border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 animate-slide-up">

          {globalError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
              {globalError}
            </div>
          )}

          {/* ── Step 0: Conta ──────────────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Criar conta</h2>
              <p className="text-gray-400 text-center text-sm mb-7">Comece a comprar e vender agora</p>

              <div className="space-y-4">

                {/* Nome */}
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) => {
                        set('name', e.target.value);
                        const v = e.target.value.trim().length >= 3;
                        nameStatus.setStatus({ touched: true, valid: v, message: v ? '' : 'Mínimo 3 caracteres' });
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(nameStatus.status)}`}
                    />
                    <FieldIcon status={nameStatus.status} />
                  </div>
                  {nameStatus.status.touched && !nameStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{nameStatus.status.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={formData.email}
                      onChange={(e) => {
                        set('email', e.target.value);
                        const v = validateEmail(e.target.value);
                        emailStatus.setStatus({ touched: true, valid: v, message: v ? '' : 'E-mail inválido' });
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(emailStatus.status)}`}
                    />
                    <FieldIcon status={emailStatus.status} />
                  </div>
                  {emailStatus.status.touched && !emailStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{emailStatus.status.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="WhatsApp (XX) XXXXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => {
                        const masked = maskPhone(e.target.value);
                        set('phone', masked);
                        const v = masked.replace(/\D/g, '').length >= 10;
                        phoneStatus.setStatus({ touched: true, valid: v, message: v ? '' : 'Número inválido' });
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(phoneStatus.status)}`}
                    />
                    <FieldIcon status={phoneStatus.status} />
                  </div>
                  {phoneStatus.status.touched && !phoneStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{phoneStatus.status.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha (mínimo 6 caracteres)"
                      value={formData.password}
                      onChange={(e) => {
                        set('password', e.target.value);
                        const v = e.target.value.length >= 6;
                        passwordStatus.setStatus({ touched: true, valid: v, message: v ? '' : 'Mínimo 6 caracteres' });
                        if (formData.confirmPassword) {
                          confirmStatus.setStatus({
                            touched: true,
                            valid: e.target.value === formData.confirmPassword,
                            message: e.target.value === formData.confirmPassword ? '' : 'Senhas não coincidem',
                          });
                        }
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(passwordStatus.status)}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength */}
                  {formData.password.length > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-0.5 font-medium ${
                        passwordStrength.strength === 'forte' ? 'text-green-600' :
                        passwordStrength.strength === 'média' ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        Força: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                  {passwordStatus.status.touched && !passwordStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{passwordStatus.status.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirmar senha"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        set('confirmPassword', e.target.value);
                        const v = e.target.value === formData.password;
                        confirmStatus.setStatus({ touched: true, valid: v, message: v ? '' : 'Senhas não coincidem' });
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(confirmStatus.status)}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmStatus.status.touched && !confirmStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{confirmStatus.status.message}</p>
                  )}
                </div>

                <button onClick={goNext} className="btn-primary w-full flex items-center justify-center gap-2">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 1: Dados Pessoais ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Dados pessoais</h2>
              <p className="text-gray-400 text-center text-sm mb-7">Precisamos verificar sua identidade</p>

              <div className="space-y-5">

                {/* CPF / CNPJ toggle */}
                <div>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
                    {(['cpf', 'cnpj'] as const).map((pt) => (
                      <button
                        key={pt}
                        onClick={() => {
                          set('personType', pt);
                          set('document', '');
                          documentStatus.setStatus({ touched: false, valid: false, message: '' });
                        }}
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                          formData.personType === pt
                            ? 'bg-brand-purple text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pt === 'cpf' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={formData.personType === 'cpf' ? 'CPF: XXX.XXX.XXX-XX' : 'CNPJ: XX.XXX.XXX/XXXX-XX'}
                      value={formData.document}
                      onChange={(e) => {
                        const masked = formData.personType === 'cpf'
                          ? maskCPF(e.target.value)
                          : maskCNPJ(e.target.value);
                        set('document', masked);
                        const raw = masked.replace(/\D/g, '');
                        const v = formData.personType === 'cpf' ? validateCPF(raw) : validateCNPJ(raw);
                        documentStatus.setStatus({
                          touched: true,
                          valid: v,
                          message: v ? '' : `${formData.personType.toUpperCase()} inválido`,
                        });
                      }}
                      className={`input-field pl-11 pr-9 ${borderClass(documentStatus.status)}`}
                    />
                    <FieldIcon status={documentStatus.status} />
                  </div>
                  {documentStatus.status.touched && !documentStatus.status.valid && (
                    <p className="mt-1 text-xs text-red-500">{documentStatus.status.message}</p>
                  )}
                </div>

                {/* Date of birth (CPF only) */}
                {formData.personType === 'cpf' && (
                  <div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Data de nascimento DD/MM/AAAA"
                        value={formData.birthDate}
                        onChange={(e) => {
                          const masked = maskDate(e.target.value);
                          set('birthDate', masked);
                          const parts = masked.split('/');
                          if (parts.length === 3 && parts[2].length === 4) {
                            const v = validate18Plus(masked);
                            birthStatus.setStatus({
                              touched: true,
                              valid: v,
                              message: v ? '' : 'Você deve ter 18 anos ou mais',
                            });
                          } else {
                            birthStatus.setStatus({ touched: false, valid: false, message: '' });
                          }
                        }}
                        maxLength={10}
                        className={`input-field pl-11 pr-9 ${borderClass(birthStatus.status)}`}
                      />
                      <FieldIcon status={birthStatus.status} />
                    </div>
                    {birthStatus.status.touched && !birthStatus.status.valid && (
                      <p className="mt-1 text-xs text-red-500">{birthStatus.status.message}</p>
                    )}
                  </div>
                )}

                {/* User type */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Como você vai usar o COMPREOUVENDA?</p>
                  <div className="space-y-2.5">
                    {USER_TYPES.map((ut) => (
                      <button
                        key={ut.type}
                        onClick={() => {
                          set('userType', ut.type);
                          setGlobalError('');
                        }}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all ${
                          formData.userType === ut.type
                            ? 'border-brand-purple bg-brand-purple/5'
                            : 'border-gray-200 hover:border-brand-purple/30'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center shrink-0">
                          <ut.icon className="w-5 h-5 text-brand-purple" />
                        </div>
                        <div className="text-left">
                          <span className="font-display font-semibold text-gray-900 text-sm">{ut.label}</span>
                          <p className="text-xs text-gray-400">{ut.desc}</p>
                        </div>
                        {formData.userType === ut.type && (
                          <CheckCircle2 className="w-5 h-5 text-brand-purple ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={goNext} className="btn-primary w-full flex items-center justify-center gap-2">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Endereço ─────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Endereço</h2>
              <p className="text-gray-400 text-center text-sm mb-6">Para mostrar produtos perto de você</p>

              {/* ── Fase A: Consentimento GPS ── */}
              {geoPhase === 'consent' && (
                <div className="animate-fade-in space-y-5">
                  <div className="flex flex-col items-center text-center p-6 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
                      <MapPin className="w-8 h-8 text-brand-purple" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-gray-900 mb-2">
                      Precisamos da sua localização
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Para garantir a veracidade do endereço e mostrar produtos realmente próximos a você,
                      precisamos acessar sua localização atual.
                    </p>
                    <ul className="text-left w-full space-y-2 mb-4">
                      {[
                        'Garantir proximidade entre compradores e vendedores',
                        'Validar seu endereço automaticamente',
                        'Exibir produtos relevantes na sua região',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-400 mb-5">
                      Sua localização é usada apenas para fins de proximidade. Não compartilhamos com terceiros.
                    </p>
                    <button
                      onClick={requestGps}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Permitir Localização
                    </button>
                  </div>
                </div>
              )}

              {/* ── Fase A: Carregando GPS ── */}
              {geoPhase === 'loading' && (
                <div className="animate-fade-in flex flex-col items-center justify-center py-10 space-y-4">
                  <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
                  <p className="text-sm text-gray-500 text-center">
                    Obtendo sua localização...<br />
                    <span className="text-xs text-gray-400">Permita o acesso quando solicitado pelo navegador</span>
                  </p>
                </div>
              )}

              {/* ── Fase A: GPS negado / erro ── */}
              {geoPhase === 'denied' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex flex-col items-center text-center p-6 bg-red-50 rounded-2xl border border-red-200">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-gray-900 mb-2">
                      Localização necessária
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      O acesso à sua localização é obrigatório para cadastro na plataforma. Isso garante que os produtos
                      exibidos estejam realmente próximos a você e aumenta a confiabilidade para todos os usuários.
                    </p>
                    {geoError && (
                      <p className="text-xs text-red-500 mb-3 bg-red-100 px-3 py-1.5 rounded-lg">{geoError}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-4">
                      Para continuar, permita o acesso nas configurações do seu navegador e tente novamente.
                    </p>
                    <button
                      onClick={requestGps}
                      className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
                    >
                      <Navigation className="w-4 h-4" />
                      Tentar novamente
                    </button>
                    <button
                      onClick={() => setShowBrowserHelp((v) => !v)}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Como permitir localização no meu navegador?
                    </button>
                    {showBrowserHelp && (
                      <div className="mt-3 text-left w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                        <div>
                          <p className="font-semibold text-gray-800 mb-1">Chrome</p>
                          <p>Clique no cadeado ao lado da URL → Permissões → Localização → Permitir</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 mb-1">Firefox</p>
                          <p>Clique no cadeado → Permissões do site → Acessar sua localização → Permitir</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 mb-1">Safari</p>
                          <p>Preferências → Sites → Localização → Escolha o site → Permitir</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Fase B: Campos de endereço (após GPS) ── */}
              {geoPhase === 'granted' && (
                <div className="animate-fade-in space-y-4">

                  {/* Badge de localização confirmada */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-green-700 font-medium">
                      Localização confirmada: {formData.cidade}{formData.estado ? `, ${formData.estado}` : ''}
                    </span>
                  </div>

                  {/* Alerta de divergência CEP vs GPS */}
                  {cepDivergence && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">Atenção:</span> o CEP informado corresponde a{' '}
                          <strong>{cepDivergence.cepCity}</strong> mas sua localização indica{' '}
                          <strong>{cepDivergence.gpsCity}</strong>. Deseja corrigir?
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            // Use GPS values (already set)
                            setCepDivergence(null);
                          }}
                          className="flex-1 text-xs font-semibold py-2 px-3 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 transition-all"
                        >
                          Usar localização GPS
                        </button>
                        <button
                          onClick={() => {
                            // Accept CEP city/state, save divergence flag
                            setFormData((prev) => ({
                              ...prev,
                              cidade: cepDivergence.cepCity,
                              estado: cepDivergence.cepState,
                            }));
                            setCepDivergence(null);
                          }}
                          className="flex-1 text-xs font-semibold py-2 px-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          Manter endereço informado
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CEP */}
                  <div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="CEP: 00000-000"
                        value={formData.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className="input-field pl-11 pr-9"
                      />
                      {cepLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-purple absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {cepError && <p className="mt-1 text-xs text-yellow-600">{cepError}</p>}
                  </div>

                  {/* Rua */}
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rua / Logradouro"
                      value={formData.rua}
                      onChange={(e) => set('rua', e.target.value)}
                      className="input-field pl-11"
                    />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Número"
                      value={formData.numero}
                      onChange={(e) => set('numero', e.target.value)}
                      className="input-field w-24"
                    />
                    <input
                      type="text"
                      placeholder="Complemento (opcional)"
                      value={formData.complemento}
                      onChange={(e) => set('complemento', e.target.value)}
                      className="input-field flex-1"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Bairro"
                    value={formData.bairro}
                    onChange={(e) => set('bairro', e.target.value)}
                    className="input-field w-full"
                  />

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={formData.cidade}
                      onChange={(e) => set('cidade', e.target.value)}
                      className="input-field flex-1"
                    />
                    <select
                      value={formData.estado}
                      onChange={(e) => set('estado', e.target.value)}
                      className="input-field w-20"
                    >
                      <option value="">UF</option>
                      {BR_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <button onClick={goNext} className="btn-primary w-full flex items-center justify-center gap-2">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Confirmar ────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">Confirmar dados</h2>
              <p className="text-gray-400 text-center text-sm mb-6">Verifique suas informações</p>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3 text-sm">
                <SummaryRow label="Nome" value={formData.name} />
                <SummaryRow label="E-mail" value={formData.email} />
                <SummaryRow label="Telefone" value={formData.phone || '—'} />
                <SummaryRow
                  label={formData.personType === 'cpf' ? 'CPF' : 'CNPJ'}
                  value={formData.document || '—'}
                />
                {formData.personType === 'cpf' && (
                  <SummaryRow label="Nascimento" value={formData.birthDate || '—'} />
                )}
                <SummaryRow
                  label="Perfil"
                  value={
                    USER_TYPES.find((u) => u.type === formData.userType)?.label ?? '—'
                  }
                />
                {formData.cidade && (
                  <SummaryRow
                    label="Localização"
                    value={`${formData.cidade}${formData.estado ? ' / ' + formData.estado : ''}`}
                  />
                )}
                {formData.lat && formData.lng && (
                  <SummaryRow
                    label="Coordenadas"
                    value={`${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}`}
                  />
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <div
                  onClick={() => set('acceptTerms', !formData.acceptTerms)}
                  className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
                    formData.acceptTerms ? 'bg-brand-purple border-brand-purple' : 'border-gray-300'
                  }`}
                >
                  {formData.acceptTerms && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-600">
                  Li e aceito os{' '}
                  <Link href="/terms" className="text-brand-purple font-semibold hover:underline" target="_blank">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link href="/privacy" className="text-brand-purple font-semibold hover:underline" target="_blank">
                    Política de Privacidade
                  </Link>
                </span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Criar conta
                  </>
                )}
              </button>
            </>
          )}

          {/* Back button */}
          {step > 0 && !loading && (
            <button
              onClick={goBack}
              className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-purple font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right break-all">{value}</span>
    </div>
  );
}
