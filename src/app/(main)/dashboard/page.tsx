'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package, ShoppingBag, Heart, Video, Users, HandHeart, TrendingUp,
  Settings, Bell, Store, UserCheck, Percent, Loader2,
  CheckCircle, Save, Trash2, Download, AlertTriangle, X, Shield,
  FileText, Mail, ToggleLeft, ToggleRight, Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useProducts } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import StarRating from '@/components/ui/StarRating';
import FirstSellCTA from '@/components/onboarding/FirstSellCTA';
import type { Product, Order } from '@/types';
import { MOCK_PRODUCTS } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

const supabase = createClient();

const TABS = [
  { id: 'listings', label: 'Anúncios', icon: Package },
  { id: 'sold', label: 'Vendidos', icon: TrendingUp },
  { id: 'purchases', label: 'Compras', icon: ShoppingBag },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'commissions', label: 'Comissões', icon: Users },
  { id: 'donations', label: 'Doações', icon: HandHeart },
  { id: 'settings', label: 'Config', icon: Settings },
  { id: 'privacy', label: 'Privacidade', icon: Shield },
];

// --- Types for Privacy Tab ---
interface UserConsent {
  id: string;
  subject: string;
  purpose: string;
  legal_basis: string;
  granted: boolean;
  granted_at: string | null;
  required: boolean;
}

const DEFAULT_CONSENTS: UserConsent[] = [
  {
    id: 'terms',
    subject: 'Termos de Uso',
    purpose: 'Aceite dos termos gerais de uso da plataforma',
    legal_basis: 'Contrato (Art. 7º, V - LGPD)',
    granted: true,
    granted_at: new Date().toISOString(),
    required: true,
  },
  {
    id: 'privacy',
    subject: 'Política de Privacidade',
    purpose: 'Consentimento para coleta e tratamento de dados pessoais',
    legal_basis: 'Consentimento (Art. 7º, I - LGPD)',
    granted: true,
    granted_at: new Date().toISOString(),
    required: true,
  },
  {
    id: 'geolocation',
    subject: 'Geolocalização',
    purpose: 'Mostrar produtos próximos e melhorar a experiência de compra',
    legal_basis: 'Consentimento (Art. 7º, I - LGPD)',
    granted: false,
    granted_at: null,
    required: false,
  },
  {
    id: 'marketing',
    subject: 'Marketing',
    purpose: 'Envio de ofertas, novidades e comunicações promocionais',
    legal_basis: 'Consentimento (Art. 7º, I - LGPD)',
    granted: false,
    granted_at: null,
    required: false,
  },
];

function OrderMiniCard({ order }: { order: Order }) {
  const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
  const image = product?.images?.[0]?.url || '';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    paid: 'bg-emerald-50 text-emerald-600',
    held: 'bg-brand-blue/10 text-brand-blue',
    released: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-gray-100 text-gray-500',
    failed: 'bg-red-50 text-red-500',
  };
  const statusLabels: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', held: 'Retido',
    released: 'Liberado', refunded: 'Reembolsado', failed: 'Falhou',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-t border-gray-100 first:border-t-0">
      <div
        className="w-12 h-12 rounded-xl bg-cover bg-center bg-gray-100 flex-shrink-0"
        style={image ? { backgroundImage: `url(${image})` } : {}}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product?.title || 'Produto'}
        </p>
        <p className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</p>
      </div>
      <div className="text-right">
        <span className="font-display font-bold text-brand-purple text-sm">
          {formatPrice(order.gross_value)}
        </span>
        <span className={`block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-500'}`}>
          {statusLabels[order.payment_status] || order.payment_status}
        </span>
      </div>
    </div>
  );
}

// --- Delete Account Modal ---
interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

function DeleteAccountModal({ onClose, onConfirm }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!password || !agreed) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Senha incorreta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-display font-bold text-gray-900">Excluir Conta Permanentemente</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Esta ação é irreversível. Após 30 dias, todos os seus dados serão removidos definitivamente.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">O que será removido:</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Anúncios e produtos</li>
              <li>Favoritos</li>
              <li>Mensagens</li>
              <li>Avaliações feitas por você</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700">O que será mantido (obrigação fiscal):</p>
            <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside mt-1">
              <li>Histórico de transações</li>
            </ul>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Digite sua senha para confirmar
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Sua senha atual"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            <span className="text-xs text-gray-600">
              Entendo que após 30 dias meus dados serão excluídos permanentemente
            </span>
          </label>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password || !agreed || loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('listings');
  const [sellerMode, setSellerMode] = useState<'owner' | 'commissioned' | null>(null);
  const [donationPercent, setDonationPercent] = useState(2);
  const [showSellerSetup, setShowSellerSetup] = useState(true);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ name: '', phone: '', city: '', state: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Privacy tab
  const [consents, setConsents] = useState<UserConsent[]>(DEFAULT_CONSENTS);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [togglingConsent, setTogglingConsent] = useState<string | null>(null);

  // Pending deletion banner
  const [showDeletionBanner, setShowDeletionBanner] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  // Data
  const [userListings, setUserListings] = useState<Product[]>([]);
  const [soldListings, setSoldListings] = useState<Product[]>([]);
  const [commissions, setCommissions] = useState<Order[]>([]);
  const [userRating, setUserRating] = useState({ average: 0, count: 0 });
  const [loadingListings, setLoadingListings] = useState(false);

  const { user } = useAuthStore();
  const { favorites } = useFavorites();
  const { orders, sales, getMyOrders, getMySales } = useOrders();

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile initial data + load seller_type/donation_percent + real rating
  useEffect(() => {
    if (user) {
      setSettingsForm({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || '',
        state: user.state || '',
      });
      if ((user as any).seller_type === 'individual') setSellerMode('owner');
      else if ((user as any).seller_type === 'company') setSellerMode('commissioned');
      if ((user as any).donation_percent !== undefined) setDonationPercent((user as any).donation_percent);
      if ((user as unknown as { status?: string }).status === 'pending_deletion') {
        setShowDeletionBanner(true);
      }
      // Load real rating from Supabase
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
            setUserRating({ average: avg, count: data.length });
          }
        });
    }
  }, [user]);

  // Load user listings & sold
  useEffect(() => {
    const loadListings = async () => {
      setLoadingListings(true);
      try {
        if (!user) {
          setUserListings((MOCK_PRODUCTS as Product[]).slice(0, 4));
          setSoldListings([]);
          return;
        }
        const { data } = await supabase
          .from('products')
          .select(`*, images:product_images(id, url, position, label), user:users!products_user_id_fkey(id, name, avatar_url, city, state), category:categories!products_category_id_fkey(id, name, icon, slug)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!data || data.length === 0) {
          setUserListings((MOCK_PRODUCTS as Product[]).slice(0, 4));
          setSoldListings([]);
        } else {
          setUserListings((data as Product[]).filter((p) => p.status !== 'sold'));
          setSoldListings((data as Product[]).filter((p) => p.status === 'sold'));
        }
      } finally {
        setLoadingListings(false);
      }
    };
    loadListings();
  }, [user]);

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === 'purchases') getMyOrders();
    if (activeTab === 'sold') getMySales();
    if (activeTab === 'commissions') {
      getMyOrders().then((data) => {
        setCommissions((data || []).filter((o) => o.reseller_id === user?.id));
      });
    }
    if (activeTab === 'privacy') loadConsents();
  }, [activeTab, getMyOrders, getMySales, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConsents = useCallback(async () => {
    setLoadingConsents(true);
    try {
      if (!user) {
        // Fallback: read from localStorage
        const raw = typeof window !== 'undefined' ? localStorage.getItem('cookie_consent_v1') : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { analytics?: boolean; marketing?: boolean; timestamp?: string };
          setConsents(DEFAULT_CONSENTS.map((c) => {
            if (c.id === 'geolocation') return c;
            if (c.id === 'marketing') return { ...c, granted: !!parsed.marketing, granted_at: parsed.timestamp || null };
            return c;
          }));
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id);

      if (error || !data || data.length === 0) {
        // Supabase paused or no data — fallback to localStorage
        const raw = typeof window !== 'undefined' ? localStorage.getItem('cookie_consent_v1') : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { analytics?: boolean; marketing?: boolean; timestamp?: string };
          setConsents(DEFAULT_CONSENTS.map((c) => {
            if (c.id === 'marketing') return { ...c, granted: !!parsed.marketing, granted_at: parsed.timestamp || null };
            return c;
          }));
        }
        return;
      }

      // Merge Supabase data with defaults
      const subjectMap: Record<string, string> = {
        'Termos de Uso': 'terms',
        'Política de Privacidade': 'privacy',
        'Geolocalização': 'geolocation',
        'Marketing': 'marketing',
      };

      const updated = DEFAULT_CONSENTS.map((def) => {
        const row = data.find((r) => subjectMap[r.subject as string] === def.id || r.subject === def.subject);
        if (row) {
          return {
            ...def,
            granted: row.granted as boolean,
            granted_at: (row.granted_at as string | null) ?? (row.granted ? new Date().toISOString() : null),
            legal_basis: (row.legal_basis as string | null) || def.legal_basis,
          };
        }
        return def;
      });
      setConsents(updated);
    } catch {
      // Keep defaults
    } finally {
      setLoadingConsents(false);
    }
  }, [user]);

  const toggleConsent = async (consentId: string) => {
    const consent = consents.find((c) => c.id === consentId);
    if (!consent || consent.required) return;

    const newGranted = !consent.granted;
    setTogglingConsent(consentId);

    // Optimistic update
    setConsents((prev) =>
      prev.map((c) =>
        c.id === consentId
          ? { ...c, granted: newGranted, granted_at: newGranted ? new Date().toISOString() : c.granted_at }
          : c
      )
    );

    try {
      if (user) {
        const subjectName: Record<string, string> = {
          geolocation: 'Geolocalização',
          marketing: 'Marketing',
        };
        await supabase.from('user_consents').upsert(
          {
            user_id: user.id,
            subject: subjectName[consentId] || consentId,
            granted: newGranted,
            granted_at: newGranted ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,subject' }
        );
      }

      // Also update localStorage for marketing/analytics
      if (consentId === 'marketing') {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('cookie_consent_v1') : null;
        const existing = raw ? JSON.parse(raw) : { essential: true, version: 'v1' };
        localStorage.setItem('cookie_consent_v1', JSON.stringify({
          ...existing,
          marketing: newGranted,
          timestamp: new Date().toISOString(),
        }));
      }

      showToast(
        newGranted
          ? `Consentimento para "${consent.subject}" reativado.`
          : `Consentimento para "${consent.subject}" revogado.`,
        newGranted ? 'success' : 'warning'
      );
    } catch {
      // Rollback on error
      setConsents((prev) =>
        prev.map((c) => (c.id === consentId ? consent : c))
      );
      showToast('Erro ao atualizar consentimento', 'error');
    } finally {
      setTogglingConsent(null);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    try {
      await supabase
        .from('users')
        .update({
          name: settingsForm.name,
          phone: settingsForm.phone,
          city: settingsForm.city,
          state: settingsForm.state,
          seller_type: sellerMode === 'owner' ? 'individual' : sellerMode === 'commissioned' ? 'company' : undefined,
          donation_percent: donationPercent,
        })
        .eq('id', user.id);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    if (!user) return;

    // 1. Verify password
    const { data: authData } = await supabase.auth.getUser();
    const email = authData?.user?.email;
    if (!email) throw new Error('Usuário não autenticado');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw new Error('Senha incorreta. Tente novamente.');

    // 2. Soft delete: mark as pending_deletion
    const deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('users')
      .update({
        status: 'pending_deletion',
        deleted_at: new Date().toISOString(),
        deletion_scheduled_at: deletionScheduledAt,
      })
      .eq('id', user.id);

    // 3. Audit log
    await logAudit(supabase, {
      actorId: user.id,
      actorEmail: email,
      action: 'account_deletion_requested',
      targetType: 'user',
      targetId: user.id,
      targetEmail: email,
      details: { deletion_scheduled_at: deletionScheduledAt },
    });

    // 4. Sign out
    await supabase.auth.signOut();

    // 5. Redirect with message
    router.push('/login?message=conta-agendada-exclusao');
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    setCancellingDeletion(true);
    try {
      await supabase
        .from('users')
        .update({ status: 'active', deleted_at: null, deletion_scheduled_at: null })
        .eq('id', user.id);

      const { data: authData } = await supabase.auth.getUser();
      await logAudit(supabase, {
        actorId: user.id,
        actorEmail: authData?.user?.email,
        action: 'account_deletion_cancelled',
        targetType: 'user',
        targetId: user.id,
      });

      setShowDeletionBanner(false);
      showToast('Exclusão cancelada. Sua conta está ativa novamente.');
    } catch {
      showToast('Erro ao cancelar exclusão', 'error');
    } finally {
      setCancellingDeletion(false);
    }
  };

  const handleDownloadData = async () => {
    if (!user) return;
    setDownloadingData(true);
    try {
      const [
        { data: profile },
        { data: products },
        { data: ordersData },
        { data: favoritesData },
        { data: reviewsData },
        { data: messagesData },
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('orders').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from('favorites').select('*').eq('user_id', user.id),
        supabase.from('reviews').select('*').eq('reviewer_id', user.id),
        supabase.from('messages').select('*').eq('sender_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        products: products || [],
        orders: ordersData || [],
        favorites: favoritesData || [],
        reviews: reviewsData || [],
        messages: messagesData || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados-compreouvenda.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Dados exportados com sucesso!');
    } catch {
      showToast('Erro ao exportar dados', 'error');
    } finally {
      setDownloadingData(false);
    }
  };

  const displayName = user?.name || 'Usuário';
  const displayCity = user?.city || 'São Paulo';
  const displayState = user?.state || 'SP';

  const userStatus = (user as unknown as { status?: string; deletion_scheduled_at?: string } | null);

  const statsData = [
    { label: 'Anúncios', value: String(userListings.length), color: 'bg-brand-purple/10 text-brand-purple' },
    { label: 'Vendas', value: String(sales.length || soldListings.length), color: 'bg-brand-orange/10 text-brand-orange' },
    {
      label: 'Comissões',
      value: formatPrice(commissions.reduce((s, o) => s + o.reseller_commission_value, 0)),
      color: 'bg-brand-blue/10 text-brand-blue',
    },
    {
      label: 'Doações',
      value: formatPrice([...orders, ...sales].reduce((s, o) => s + o.donation_value, 0)),
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-amber-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Pending Deletion Banner */}
      {showDeletionBanner && userStatus?.status === 'pending_deletion' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Sua conta está agendada para exclusão</p>
            {userStatus?.deletion_scheduled_at && (
              <p className="text-xs text-amber-600 mt-0.5">
                Exclusão em: {new Date(userStatus.deletion_scheduled_at).toLocaleDateString('pt-BR')}
              </p>
            )}
            <p className="text-xs text-amber-600 mt-1">Deseja cancelar a exclusão e manter sua conta?</p>
          </div>
          <button
            onClick={handleCancelDeletion}
            disabled={cancellingDeletion}
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            {cancellingDeletion ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Cancelar Exclusão
          </button>
        </div>
      )}

      {/* Seller Profile Setup */}
      {showSellerSetup && (
        <div className="card-elevated p-6 mb-6 border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900">Como você deseja vender?</h2>
            {sellerMode && (
              <button onClick={() => setShowSellerSetup(false)} className="text-xs text-brand-purple font-semibold hover:underline">
                Salvar e fechar
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">Escolha seu perfil de vendas na plataforma</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setSellerMode('owner')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'owner' ? 'border-brand-purple bg-brand-purple/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Store className={`w-6 h-6 mb-2 ${sellerMode === 'owner' ? 'text-brand-purple' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Proprietário</span>
              <span className="text-xs text-gray-400 mt-1 block">Venda seus próprios produtos diretamente na plataforma</span>
            </button>

            <button
              onClick={() => setSellerMode('commissioned')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'commissioned' ? 'border-brand-orange bg-brand-orange/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <UserCheck className={`w-6 h-6 mb-2 ${sellerMode === 'commissioned' ? 'text-brand-orange' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Comissionado</span>
              <span className="text-xs text-gray-400 mt-1 block">Revenda produtos de terceiros e ganhe comissão sobre cada venda</span>
            </button>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <HandHeart className="w-5 h-5 text-emerald-600" />
              <span className="font-display font-semibold text-sm text-emerald-800">Ofertar percentual a instituições</span>
            </div>
            <p className="text-xs text-emerald-600/70 mb-3">Defina o percentual do valor líquido que será doado a instituições beneficentes</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={1} value={donationPercent}
                onChange={(e) => setDonationPercent(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-2"
              />
              <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-1.5 border border-emerald-200 min-w-[70px] justify-center">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-display font-bold text-emerald-700">{donationPercent}</span>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-emerald-500/70 px-1">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>

          {sellerMode && (
            <div className="mt-4 p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-brand-purple">
                  {sellerMode === 'owner' ? 'Proprietário' : 'Comissionado'}
                </span>
                {' · '}Doação de <span className="font-bold text-emerald-600">{donationPercent}%</span> por venda
              </p>
            </div>
          )}
        </div>
      )}

      {/* Profile header */}
      <div className="card-elevated p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white font-display font-bold text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-gray-900">{displayName}</h1>
              {user?.is_pro && (
                <span className="bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded">PRO</span>
              )}
            </div>
            <p className="text-sm text-gray-400">{displayCity}, {displayState} · Membro desde Jan 2024</p>
            <div className="flex items-center gap-1 mt-1">
              <StarRating rating={userRating.average} size="sm" />
              <span className="text-sm font-semibold">{userRating.average}</span>
              <span className="text-xs text-gray-400">({userRating.count} avaliações)</span>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-xl relative">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {statsData.map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-3 text-center ${stat.color}`}>
              <span className="block font-display font-bold text-lg">{stat.value}</span>
              <span className="text-[10px] font-medium opacity-70">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Listings */}
      {activeTab === 'listings' && (
        <div>
          {loadingListings ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : userListings.length === 0 ? (
            <FirstSellCTA />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {userListings.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Sold */}
      {activeTab === 'sold' && (
        <div>
          {loadingListings ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : soldListings.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-display">Nenhum produto vendido ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {soldListings.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Purchases */}
      {activeTab === 'purchases' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Compras</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma compra ainda</p>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <OrderMiniCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Favorites */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-display">Nenhum favorito ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Videos */}
      {activeTab === 'videos' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Meus Vídeos IA</h3>
          <div className="grid grid-cols-2 gap-3">
            {userListings.filter((p) => p.video_status === 'ready').slice(0, 4).map((p) => (
              <div key={p.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-200">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${p.video_thumbnail || p.images?.[0]?.url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                  <span className="text-white/60 text-[10px]">20s · Modelo</span>
                </div>
                <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Pronto</span>
              </div>
            ))}
            {userListings.filter((p) => p.video_status === 'ready').length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Video className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhum vídeo gerado ainda</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Commissions */}
      {activeTab === 'commissions' && (
        <div className="space-y-3">
          <div className="card-elevated p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Comissões</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <span className="text-xs text-amber-600">Pendente</span>
                <span className="block font-display font-bold text-amber-600">
                  {formatPrice(commissions.filter((o) => o.payment_status === 'pending').reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-600">Aprovado</span>
                <span className="block font-display font-bold text-emerald-600">
                  {formatPrice(commissions.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
              <div className="bg-brand-blue/10 rounded-xl p-3 text-center">
                <span className="text-xs text-brand-blue">Total</span>
                <span className="block font-display font-bold text-brand-blue">
                  {formatPrice(commissions.reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhuma comissão ainda</p>
                <p className="text-xs text-gray-300 mt-1">Compartilhe links de produtos com ?ref=seu_id para ganhar comissão</p>
              </div>
            ) : (
              commissions.map((order) => {
                const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
                return (
                  <div key={order.id} className="flex items-center justify-between py-3 border-t border-gray-100">
                    <div>
                      <span className="font-medium text-sm text-gray-900">{product?.title || 'Produto'}</span>
                      <span className="block text-xs text-gray-400">
                        Comissão: {formatPrice(order.reseller_commission_value)}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      order.payment_status === 'paid'
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-amber-600 bg-amber-50'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Donations */}
      {activeTab === 'donations' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Doações</h3>
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
            <HandHeart className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-display font-bold text-2xl text-emerald-600">
              {formatPrice([...orders, ...sales].reduce((s, o) => s + o.donation_value, 0))}
            </span>
            <p className="text-xs text-emerald-600/70 mt-1">Total doado através das suas vendas</p>
          </div>
          {[...orders, ...sales].filter((o) => o.donation_value > 0).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Nenhuma doação ainda</p>
            </div>
          ) : (
            [...orders, ...sales].filter((o) => o.donation_value > 0).map((order) => {
              const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
              return (
                <div key={order.id} className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <span className="font-medium text-sm text-gray-900">Instituição</span>
                    <span className="block text-xs text-gray-400">
                      Venda: {product?.title || 'Produto'} · {formatRelativeTime(order.created_at)}
                    </span>
                  </div>
                  <span className="font-display font-bold text-emerald-600">
                    {formatPrice(order.donation_value)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="card-elevated p-5 space-y-4">
            <h3 className="font-display font-semibold text-gray-900 mb-2">Configurações do Perfil</h3>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome completo</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input-field w-full"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Telefone</label>
              <input
                type="tel"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="input-field w-full"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Cidade</label>
                <input
                  type="text"
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="input-field w-full"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Estado</label>
                <input
                  type="text"
                  value={settingsForm.state}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, state: e.target.value }))}
                  className="input-field w-full"
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={settingsSaving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {settingsSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : settingsSaved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {settingsSaving ? 'Salvando...' : settingsSaved ? 'Salvo!' : 'Salvar alterações'}
            </button>
          </div>

          {/* LGPD: Download my data */}
          <div className="card-elevated p-5">
            <h4 className="font-display font-semibold text-gray-900 mb-1 text-sm">Portabilidade de Dados (LGPD)</h4>
            <p className="text-xs text-gray-500 mb-3">Baixe uma cópia de todos os seus dados pessoais armazenados na plataforma.</p>
            <button
              onClick={handleDownloadData}
              disabled={downloadingData}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue/10 text-brand-blue rounded-xl text-sm font-medium hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
            >
              {downloadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingData ? 'Exportando...' : 'Baixar meus dados'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="font-display font-semibold text-red-800 text-sm">Zona de Perigo</h4>
            </div>
            <p className="text-xs text-red-600 mb-4">
              A exclusão de conta é irreversível após o período de carência de 30 dias.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir minha conta
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* Tab: Privacy */}
      {activeTab === 'privacy' && (
        <div className="space-y-4">

          {/* Section 1: My Consents */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#5B2D8E]" />
              <h3 className="font-display font-semibold text-gray-100 text-base">Meus Consentimentos</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Gerencie os consentimentos que você concedeu à plataforma. Os itens obrigatórios são necessários para o funcionamento do serviço.
            </p>

            {loadingConsents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#5B2D8E] animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {consents.map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-100">{consent.subject}</span>
                        {consent.required && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                            <Lock className="w-2.5 h-2.5" />
                            Obrigatório
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            consent.granted
                              ? 'bg-emerald-900/50 text-emerald-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {consent.granted ? 'Ativo' : 'Revogado'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{consent.purpose}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Base legal: {consent.legal_basis}</p>
                      {consent.granted && consent.granted_at && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Concedido em: {new Date(consent.granted_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 mt-0.5">
                      {consent.required ? (
                        <div className="opacity-40 cursor-not-allowed" title="Consentimento obrigatório — não pode ser revogado">
                          <ToggleRight className="w-8 h-8 text-[#5B2D8E]" />
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleConsent(consent.id)}
                          disabled={togglingConsent === consent.id}
                          className="transition-transform hover:scale-105 disabled:opacity-50"
                          title={consent.granted ? 'Clique para revogar' : 'Clique para reativar'}
                          aria-label={`${consent.granted ? 'Revogar' : 'Reativar'} consentimento de ${consent.subject}`}
                        >
                          {togglingConsent === consent.id ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                          ) : consent.granted ? (
                            <ToggleRight className="w-8 h-8 text-[#5B2D8E]" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: My Data */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-5 h-5 text-brand-blue" />
              <h3 className="font-display font-semibold text-gray-100 text-base">Meus Dados</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Baixe uma cópia completa de todos os seus dados pessoais armazenados na plataforma (portabilidade de dados — Art. 18, V - LGPD).
            </p>
            <button
              onClick={handleDownloadData}
              disabled={downloadingData}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue/20 text-brand-blue border border-brand-blue/30 rounded-xl text-sm font-medium hover:bg-brand-blue/30 transition-colors disabled:opacity-50"
            >
              {downloadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingData ? 'Exportando...' : 'Baixar meus dados (JSON)'}
            </button>
          </div>

          {/* Section 3: Delete Account */}
          <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-display font-semibold text-red-300 text-base">Excluir Conta</h3>
            </div>
            <p className="text-xs text-red-400/80 mb-4">
              A exclusão de conta é irreversível após o período de carência de 30 dias. Seus dados serão permanentemente removidos (direito ao esquecimento — Art. 18, VI - LGPD).
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-700 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir minha conta
            </button>
          </div>

          {/* Section 4: LGPD Info */}
          <div className="rounded-2xl border border-[#5B2D8E]/30 bg-[#5B2D8E]/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-[#9B6FD4]" />
              <h3 className="font-display font-semibold text-gray-100 text-base">Informações LGPD</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                Nos termos da <strong className="text-gray-100">Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, você, como titular dos dados, tem os seguintes direitos:
              </p>
              <ul className="space-y-1.5 text-xs text-gray-400 list-none">
                {[
                  'Confirmação da existência de tratamento de dados',
                  'Acesso aos seus dados pessoais',
                  'Correção de dados incompletos, inexatos ou desatualizados',
                  'Anonimização, bloqueio ou eliminação de dados desnecessários',
                  'Portabilidade dos dados a outro fornecedor (disponível acima)',
                  'Eliminação dos dados tratados com consentimento (Excluir Conta)',
                  'Informação sobre o compartilhamento de dados',
                  'Revogação do consentimento a qualquer tempo',
                ].map((right) => (
                  <li key={right} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#9B6FD4] flex-shrink-0 mt-0.5" />
                    {right}
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-[#5B2D8E]/20 flex flex-col sm:flex-row gap-3">
                <a
                  href="/privacidade"
                  className="flex items-center gap-1.5 text-xs text-[#9B6FD4] hover:text-[#C49FFF] transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ler Política de Privacidade completa
                </a>
                <a
                  href="mailto:contato@compreouvenda.com"
                  className="flex items-center gap-1.5 text-xs text-[#9B6FD4] hover:text-[#C49FFF] transition-colors font-medium"
                >
                  <Mail className="w-3.5 h-3.5" />
                  DPO: contato@compreouvenda.com
                </a>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
