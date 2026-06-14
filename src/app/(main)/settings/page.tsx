'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Camera, Save, Shield, Bell, LogOut, ChevronRight,
  Loader2, CheckCircle, AlertCircle, Phone, MapPin, FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  type: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('id, name, email, phone, bio, avatar_url, city, state, type')
      .eq('auth_id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        city: data.city || '',
        state: data.state || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('users')
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase().slice(0, 2) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
    } else {
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setProfile((p) => p ? { ...p, ...form } : p);
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Imagem muito grande. Máximo 5MB.' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `avatars/${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setMessage({ type: 'error', text: 'Erro ao enviar foto.' });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', profile.id);
    setProfile((p) => p ? { ...p, avatar_url: avatarUrl } : p);
    setMessage({ type: 'success', text: 'Foto atualizada!' });
    setTimeout(() => setMessage(null), 3000);
    setUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  const avatarInitial = (form.name || profile?.name || 'U')[0]?.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-5">
      <h1 className="font-display font-bold text-2xl text-gray-900">Configurações</h1>

      {/* Feedback message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Avatar */}
      <div className="card-elevated p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Foto de Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-brand-purple/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center text-white text-2xl font-bold">
                {avatarInitial}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-purple rounded-full flex items-center justify-center text-white shadow-md hover:bg-brand-purple/90 transition-colors"
            >
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div>
            <p className="font-medium text-gray-900">{profile?.name}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-1 text-xs text-brand-purple font-medium hover:underline"
            >
              Alterar foto
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Profile form */}
      <div className="card-elevated p-5 space-y-4">
        <h2 className="font-display font-semibold text-gray-900">Informações Pessoais</h2>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Nome completo
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Seu nome"
            className="input-field"
            maxLength={80}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Telefone / WhatsApp
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
            className="input-field"
            maxLength={20}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Bio / Sobre você
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Conte um pouco sobre você ou sua loja..."
            rows={3}
            className="input-field resize-none"
            maxLength={300}
          />
          <p className="text-[10px] text-gray-400 text-right mt-0.5">{form.bio.length}/300</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Cidade
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="São Paulo"
              className="input-field"
              maxLength={60}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Estado (UF)</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="SP"
              className="input-field uppercase"
              maxLength={2}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Quick links */}
      <div className="card-elevated divide-y divide-gray-100">
        <button
          onClick={() => router.push('/settings/security')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <Shield className="w-4 h-4 text-brand-purple" />
            Segurança e 2FA
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => router.push('/notifications')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <Bell className="w-4 h-4 text-brand-orange" />
            Preferências de Notificações
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}
