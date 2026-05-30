import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function generateSecret() {
  const buffer = crypto.randomBytes(20)
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < buffer.length; i++) {
    secret += base32chars[buffer[i] % 32]
  }
  return secret
}

function generateQRCodeURL(secret: string, email: string) {
  const issuer = 'CompreOuVenda'
  const otpauth = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const secret = generateSecret()
  const qrCode = generateQRCodeURL(secret, user.email || '')

  return NextResponse.json({ secret, qrCode })
}
