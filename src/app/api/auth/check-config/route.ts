import { NextResponse } from 'next/server';

function jwtRole(key: string | undefined): string | null {
  if (!key) return null;
  try {
    const payload = key.split('.')[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    return JSON.parse(decoded).role || null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKeyRole: jwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anonKeyRole: jwtRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    enableServerSignup: process.env.NEXT_PUBLIC_ENABLE_SERVER_SIGNUP,
  });
}
