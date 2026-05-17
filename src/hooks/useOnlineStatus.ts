'use client';

import { useState, useEffect } from 'react';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  /** Timestamp do último evento de mudança de status */
  lastChanged: number | null;
}

/**
 * useOnlineStatus — detecta navigator.onLine e escuta eventos online/offline.
 *
 * Quando offline:
 * - Produtos: usar dados do cache/localStorage (mock)
 * - Perfil: usar dados do localStorage
 * - Chat: usar último estado do localStorage
 *
 * Exibe badge "Modo Offline" no header via isOffline.
 */
export function useOnlineStatus(): OfflineState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });
  const [lastChanged, setLastChanged] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChanged(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChanged(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sincroniza com o estado real na montagem
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChanged,
  };
}

// ─── Helpers para dados em cache (modo offline) ───────────────────────────────

const OFFLINE_PRODUCTS_KEY = 'compreouvenda_offline_products';
const OFFLINE_PROFILE_KEY = 'compreouvenda_offline_profile';
const OFFLINE_CHAT_KEY = 'compreouvenda_offline_chat';

/** Mock de produtos para exibição quando offline */
const MOCK_PRODUCTS = [
  {
    id: 'offline-1',
    title: 'Produto em cache (offline)',
    price: 0,
    city: 'São Paulo',
    state: 'SP',
    offline: true,
  },
];

export function getOfflineProducts() {
  if (typeof window === 'undefined') return MOCK_PRODUCTS;
  try {
    const raw = localStorage.getItem(OFFLINE_PRODUCTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return MOCK_PRODUCTS;
}

export function saveProductsToOfflineCache(products: unknown[]) {
  try {
    localStorage.setItem(OFFLINE_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
}

export function getOfflineProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveProfileToOfflineCache(profile: unknown) {
  try {
    localStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getOfflineChatState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_CHAT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveChatStateToOfflineCache(chatState: unknown) {
  try {
    localStorage.setItem(OFFLINE_CHAT_KEY, JSON.stringify(chatState));
  } catch {
    // ignore
  }
}
