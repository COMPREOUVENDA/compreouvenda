'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type GeoPermissionStatus = 'prompt' | 'granted' | 'denied';

export interface GeolocationState {
  /** Permission status — never stores raw coords */
  status: GeoPermissionStatus;
  city: string | null;
  state: string | null;
  error: string | null;
  loading: boolean;
  /** true when city/state have been resolved */
  granted: boolean;
  /** Human-readable label */
  locationLabel: string;
}

const STORAGE_KEY = 'compreouvenda_geo_v2';

// ─── Mock de localização para Modo Teste ──────────────────────────────────────
const GEO_MOCK: Pick<GeolocationState, 'status' | 'city' | 'state' | 'granted' | 'locationLabel'> = {
  status: 'granted',
  city: 'São Paulo',
  state: 'SP',
  granted: true,
  locationLabel: 'São Paulo, SP',
};

/**
 * Verifica se o modo de teste de geolocalização está ativo.
 * Quando ativo, o hook retorna dados mock sem chamar navigator.geolocation.
 *
 * Condições de ativação:
 * - NEXT_PUBLIC_GEO_REQUIRED=false (variável de ambiente)
 * - localStorage: geo_test_mode=true
 * - localStorage: geo_required=false (toggle do painel admin)
 *
 * Para desativar: definir NEXT_PUBLIC_GEO_REQUIRED=true ou reativar no admin.
 */
function isGeoTestModeActive(): boolean {
  // 1. Variável de ambiente
  const envRequired = process.env.NEXT_PUBLIC_GEO_REQUIRED;
  if (envRequired === 'false') return true;
  // Default é false (modo teste habilitado) quando a variável não está definida
  if (!envRequired || envRequired === undefined) return true;

  if (typeof window === 'undefined') return false;

  // 2. Flag direto no localStorage
  try {
    if (localStorage.getItem('geo_test_mode') === 'true') return true;
    // 3. Toggle do painel admin
    if (localStorage.getItem('geo_required') === 'false') return true;
  } catch {
    // ignore
  }

  return false;
}

function loadFromStorage(): Partial<GeolocationState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GeolocationState>;
      // Validate stored value — only keep city/state (LGPD)
      return {
        status: parsed.status ?? 'prompt',
        city: parsed.city ?? null,
        state: parsed.state ?? null,
        granted: parsed.granted ?? false,
      };
    }
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(city: string | null, state: string | null, status: GeoPermissionStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ city, state, status, granted: status === 'granted' }));
  } catch {
    // ignore
  }
}

export function useGeolocation() {
  const { user } = useAuthStore();

  // ── Modo Teste: retornar mock sem chamar navigator.geolocation ─────────────
  // O código original abaixo permanece intacto para reativação quando
  // NEXT_PUBLIC_GEO_REQUIRED=true ou toggle admin ativado.
  const testModeActive = isGeoTestModeActive();

  const [state, setState] = useState<GeolocationState>(() => {
    // Se modo de teste ativo, inicializar com dados mock
    if (testModeActive) {
      return {
        ...GEO_MOCK,
        error: null,
        loading: false,
      };
    }

    const saved = loadFromStorage();
    return {
      status: saved.status ?? 'prompt',
      city: saved.city ?? null,
      state: saved.state ?? null,
      error: null,
      loading: false,
      granted: saved.granted ?? false,
      locationLabel: saved.city && saved.state ? `${saved.city}, ${saved.state}` : 'Localização não definida',
    };
  });

  // Keep locationLabel in sync
  useEffect(() => {
    setState((s) => ({
      ...s,
      locationLabel:
        s.city && s.state
          ? `${s.city}, ${s.state}`
          : s.city
          ? s.city
          : 'Localização não definida',
    }));
  }, [state.city, state.state]);

  // Reverse geocoding via Nominatim (free, no key required)
  // CÓDIGO ORIGINAL PRESERVADO — apenas ignorado no modo de teste
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await resp.json();
      const addr = data.address || {};
      const city =
        addr.city || addr.town || addr.municipality || addr.village || 'Cidade não identificada';
      const stateAbbr = addr.state || '';
      return { city, state: stateAbbr };
    } catch {
      return { city: null, state: null };
    }
  }, []);

  // Record LGPD geo consent in Supabase
  // CÓDIGO ORIGINAL PRESERVADO — apenas ignorado no modo de teste
  const recordConsent = useCallback(
    async (city: string | null, stateAbbr: string | null) => {
      if (!user?.id) return;
      const supabase = createClient();
      // Upsert into geo_consents table (see migration)
      await supabase.from('geo_consents').upsert({
        user_id: user.id,
        city: city ?? '',
        state: stateAbbr ?? '',
        purpose: 'marketplace_proximity_and_donations',
        consented_at: new Date().toISOString(),
      });
      // Update users table — only city/state, never raw coords
      await supabase
        .from('users')
        .update({ city: city ?? '', state: stateAbbr ?? '' })
        .eq('id', user.id);
    },
    [user]
  );

  // Request location
  // CÓDIGO ORIGINAL PRESERVADO — no modo de teste, apenas atualiza o estado mock
  const requestLocation = useCallback(() => {
    // Modo de teste: retornar dados mock sem chamar navigator.geolocation
    if (isGeoTestModeActive()) {
      setState({
        ...GEO_MOCK,
        error: null,
        loading: false,
      });
      return;
    }

    // ── Código original de geolocalização (preservado intacto) ──────────────
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        status: 'denied',
        error: 'Geolocalização não suportada neste navegador',
        loading: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode — extract only city/state (LGPD minimization)
        const geo = await reverseGeocode(latitude, longitude);

        setState({
          status: 'granted',
          city: geo.city,
          state: geo.state,
          error: null,
          loading: false,
          granted: true,
          locationLabel:
            geo.city && geo.state
              ? `${geo.city}, ${geo.state}`
              : geo.city ?? 'Localização não definida',
        });

        saveToStorage(geo.city, geo.state, 'granted');
        await recordConsent(geo.city, geo.state);
      },
      (err) => {
        let msg = 'Erro ao obter localização';
        switch (err.code) {
          case 1:
            msg = 'Permissão de localização negada pelo usuário';
            break;
          case 2:
            msg = 'Localização indisponível no momento';
            break;
          case 3:
            msg = 'Tempo esgotado ao obter localização';
            break;
        }
        setState((s) => ({
          ...s,
          status: 'denied',
          error: msg,
          loading: false,
        }));
        saveToStorage(null, null, 'denied');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, [reverseGeocode, recordConsent]);

  // Alias kept for backward compatibility
  const watchLocation = useCallback(() => null, []);

  // Haversine — kept for product distance display
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    []
  );

  return {
    ...state,
    requestLocation,
    watchLocation,
    calculateDistance,
  };
}
