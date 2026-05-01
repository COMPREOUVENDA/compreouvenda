import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    const { updateSession } = await import('@/lib/supabase/middleware');
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
