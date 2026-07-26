import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    enableServerSignup: process.env.NEXT_PUBLIC_ENABLE_SERVER_SIGNUP,
  });
}
