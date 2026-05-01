'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  read_at?: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read_at).length);
    }
  }, [user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new window.Notification(notif.title, {
              body: notif.body,
              icon: '/logo-icon.jpeg',
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotifications]);

  // Register Service Worker & Push subscription
  const enablePush = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      // Register SW
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BPlaceholder',
      });

      const sub = subscription.toJSON();

      // Store in DB
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint!,
        p256dh: sub.keys!.p256dh,
        auth_key: sub.keys!.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'user_id,endpoint' });

      setPushEnabled(true);
      return true;
    } catch (e) {
      console.error('Push registration failed:', e);
      return false;
    }
  }, [user]);

  // Check if push is already enabled
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notifId: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notifId);
    
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  }, [user]);

  return {
    notifications,
    unreadCount,
    pushEnabled,
    enablePush,
    markAsRead,
    markAllRead,
    loadNotifications,
  };
}
