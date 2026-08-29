import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendPushNotification, sendBulkNotification, type PushNotification, type NotificationType } from '@/lib/push-notifications';
import { cleanEnv } from '@/lib/env';
import { requireAdmin } from '@/lib/api-auth';

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookieStore.set(name, value, options as any)
          );
        },
      },
    }
  );
}

// POST /api/notifications/send
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userIds, notification, cronSecret, target } = body as {
      userId?: string;
      userIds?: string[];
      notification: PushNotification;
      cronSecret?: string;
      target?: 'all' | 'sellers' | 'buyers';
    };

    // Validate auth: either CRON_SECRET or authenticated admin
    const isCron = cronSecret === process.env.CRON_SECRET;
    const cronHeader = req.headers.get('x-cron-secret') === process.env.CRON_SECRET;

    if (!isCron && !cronHeader) {
      // Fonte única: admin_users. Envio de notificação em massa é operacional
      // ou de conteúdo — super_admin sempre passa.
      const admin = await requireAdmin(req, ['admin_operational', 'admin_content']);
      if (admin instanceof NextResponse) return admin;
    }

    if (!notification?.title || !notification?.body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    // Bulk to target group
    if (target) {
      const supabase = createClient();
      let query = supabase.from('users').select('id');
      if (target === 'sellers') query = query.eq('type', 'seller');
      if (target === 'buyers') query = query.eq('type', 'buyer');
      const { data: users } = await query;
      if (users && users.length > 0) {
        await sendBulkNotification(users.map((u: { id: string }) => u.id), notification);
        return NextResponse.json({ success: true, sent: users.length });
      }
      return NextResponse.json({ success: true, sent: 0 });
    }

    // Bulk by explicit list
    if (userIds && userIds.length > 0) {
      await sendBulkNotification(userIds, notification);
      return NextResponse.json({ success: true, sent: userIds.length });
    }

    // Single user
    if (userId) {
      await sendPushNotification(userId, notification);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'userId, userIds or target required' }, { status: 400 });
  } catch (err: any) {
    console.error('[send notification]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
