'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { NotificationPreferences } from '@/lib/push-notifications';

const supabase = createClient();

export function usePushNotifications() {
  const { user } = useAuthStore();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_order: true,
    new_message: true,
    price_alert: true,
    product_sold: true,
    review_received: true,
    payment_received: true,
    promotion: true,
    system: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  // Check support and current state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as 'default' | 'granted' | 'denied');
    }
  }, []);

  // Check if already subscribed
  useEffect(() => {
    if (!isSupported || !user) return;

    async function checkSubscription() {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        // ignore
      }
    }

    checkSubscription();
  }, [isSupported, user]);

  // Load preferences
  useEffect(() => {
    if (!user) return;

    fetch('/api/notifications/preferences')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.error) setPreferences(data);
      })
      .catch(() => {});
  }, [user]);

  // Subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;
    setIsLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as 'default' | 'granted' | 'denied');
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
        return false;
      }

      // Convert base64url to Uint8Array for applicationServerKey
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey,
      });

      const subJson = sub.toJSON();
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          deviceInfo,
        }),
      });

      if (!res.ok) {
        console.error('[push] Subscribe API error:', await res.text());
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[push] Subscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) return;

      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error('[push] Unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Update preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<void> => {
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('[push] Update preferences error:', err);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    preferences,
    updatePreferences,
  };
}
