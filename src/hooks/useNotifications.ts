'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const supabase = createClient();

export interface NewMessageAlert {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatar?: string;
  preview: string;
  at: string;
}

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
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [messageAlert, setMessageAlert] = useState<NewMessageAlert | null>(null);
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);
  // Track which conversation IDs belong to this user
  const convIdsRef = useRef<Set<string>>(new Set());

  // Load notifications — try notification_queue first, fall back to notifications table
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    // Try notification_queue (new push system)
    const { data: queueData } = await supabase
      .from('notification_queue')
      .select('id, user_id, type, title, body, data, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Also try legacy notifications table
    const { data: legacyData } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, data, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const combined = [
      ...(queueData || []),
      ...(legacyData || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 50);

    setNotifications(combined as Notification[]);
    setUnreadCount(combined.filter((n) => !n.read_at).length);
  }, [user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Listen on notification_queue
    const queueChannel = supabase
      .channel(`notif_queue:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_queue', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          if (Notification.permission === 'granted') {
            new window.Notification(notif.title, {
              body: notif.body,
              icon: '/icons/icon-192.png',
            });
          }
        }
      )
      .subscribe();

    // Also listen on legacy notifications table if it exists
    const legacyChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(legacyChannel);
    };
  }, [user, loadNotifications]);

  // Register Service Worker & Push subscription
  const enablePush = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return false;

      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey,
      });

      const sub = subscription.toJSON();

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          deviceInfo: { userAgent: navigator.userAgent },
        }),
      });

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
    // Try notification_queue first
    const { error } = await supabase
      .from('notification_queue')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('id', notifId);

    if (error) {
      // Fall back to legacy table
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notifId);
    }

    setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();

    await Promise.all([
      supabase
        .from('notification_queue')
        .update({ read_at: now, status: 'read' })
        .eq('user_id', user.id)
        .is('read_at', null),
      supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);

    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);
  }, [user]);

  // Dismiss message alert helper
  const dismissMessageAlert = useCallback(() => {
    setMessageAlert(null);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  // Global real-time listener for new messages across all conversations
  useEffect(() => {
    if (!user) return;

    // First, load user's conversation IDs
    supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .then(({ data }) => {
        if (data) {
          convIdsRef.current = new Set(data.map((c: { id: string }) => c.id));
        }
      });

    // Keep conversation IDs in sync
    const convChannel = supabase
      .channel(`user-convs:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${user.id}` },
        (p) => { convIdsRef.current.add((p.new as { id: string }).id); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `seller_id=eq.${user.id}` },
        (p) => { convIdsRef.current.add((p.new as { id: string }).id); }
      )
      .subscribe();

    // Listen for new messages globally
    const msgChannel = supabase
      .channel(`new-msgs:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as {
            id: string; conversation_id: string; sender_id: string; content: string; type: string; created_at: string;
          };

          // Skip own messages
          if (msg.sender_id === user.id) return;
          // Only care about conversations the user is part of
          if (!convIdsRef.current.has(msg.conversation_id)) return;
          // Skip if user is already viewing this conversation
          if (pathname?.includes('/chat')) return;

          // Fetch sender info
          const { data: sender } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', msg.sender_id)
            .single();

          const preview = msg.type === 'image'
            ? '📷 Imagem'
            : msg.type === 'offer'
            ? '💰 Proposta de valor'
            : msg.content.slice(0, 80);

          const alert: NewMessageAlert = {
            id: msg.id,
            conversationId: msg.conversation_id,
            senderName: (sender as any)?.name || 'Alguém',
            senderAvatar: (sender as any)?.avatar_url,
            preview,
            at: msg.created_at,
          };

          setMessageAlert(alert);

          // Native browser notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new window.Notification(`💬 ${alert.senderName}`, {
              body: preview,
              icon: '/icons/icon-192.png',
              tag: `msg-${msg.conversation_id}`,
              renotify: true,
            });
          }

          // Auto-dismiss after 6s
          if (dismissTimer.current) clearTimeout(dismissTimer.current);
          dismissTimer.current = setTimeout(() => setMessageAlert(null), 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [user, pathname]);

  return {
    notifications,
    unreadCount,
    pushEnabled,
    enablePush,
    markAsRead,
    markAllRead,
    loadNotifications,
    messageAlert,
    dismissMessageAlert,
  };
}
