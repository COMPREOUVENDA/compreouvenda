import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SOCIAL_PROVIDERS = ['google', 'facebook'] as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')

  if (!provider || !SOCIAL_PROVIDERS.includes(provider as any)) {
    return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const redirectTo = `${request.nextUrl.origin}/auth/callback`

  // Redirect to Supabase OAuth
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`

  return NextResponse.redirect(authUrl)
}
