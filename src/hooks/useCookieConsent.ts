'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export const CONSENT_VERSION = 'v1';
export const CONSENT_KEY = 'cookie_consent_v1';

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'custom';

interface UseCookieConsentReturn {
  consent: CookieConsent | null;
  status: ConsentStatus;
  isLoaded: boolean;
  acceptAll: () => Promise<void>;
  rejectNonEssential: () => Promise<void>;
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => Promise<void>;
}

function setConsentCookie(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${CONSENT_KEY}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

async function persistConsentToSupabase(consent: CookieConsent) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_consents').upsert(
      {
        user_id: user.id,
        essential: consent.essential,
        analytics: consent.analytics,
        marketing: consent.marketing,
        version: consent.version,
        consented_at: consent.timestamp,
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // Supabase persist is best-effort — do not block UX
  }
}

export function useCookieConsent(): UseCookieConsentReturn {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsent;
        setConsent(parsed);
      }
    } catch {
      // Corrupt data — treat as no consent
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveConsent = useCallback(async (newConsent: CookieConsent) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsentCookie(newConsent);
    setConsent(newConsent);
    await persistConsentToSupabase(newConsent);
  }, []);

  const acceptAll = useCallback(async () => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    await saveConsent(newConsent);
  }, [saveConsent]);

  const rejectNonEssential = useCallback(async () => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    await saveConsent(newConsent);
  }, [saveConsent]);

  const savePreferences = useCallback(
    async (prefs: { analytics: boolean; marketing: boolean }) => {
      const newConsent: CookieConsent = {
        essential: true,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
      };
      await saveConsent(newConsent);
    },
    [saveConsent]
  );

  const status: ConsentStatus = (() => {
    if (!consent) return 'pending';
    if (consent.analytics && consent.marketing) return 'accepted';
    if (!consent.analytics && !consent.marketing) return 'rejected';
    return 'custom';
  })();

  return {
    consent,
    status,
    isLoaded,
    acceptAll,
    rejectNonEssential,
    savePreferences,
  };
}
