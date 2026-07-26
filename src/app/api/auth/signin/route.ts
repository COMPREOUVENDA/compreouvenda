import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const supabase = createClient(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 });
  }
}
