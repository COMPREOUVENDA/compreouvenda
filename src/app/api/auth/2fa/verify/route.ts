import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function verifyTOTP(secret: string, code: string): boolean {
  const time = Math.floor(Date.now() / 30000)
  for (let i = -1; i <= 1; i++) {
    const generated = generateTOTP(secret, time + i)
    if (generated === code) return true
  }
  return false
}

function generateTOTP(secret: string, time: number): string {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of secret) {
    const val = base32chars.indexOf(c.toUpperCase())
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  const key = Buffer.from(bytes)
  const timeBuffer = Buffer.alloc(8)
  timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0)
  timeBuffer.writeUInt32BE(time & 0xffffffff, 4)
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const otp = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000
  return otp.toString().padStart(6, '0')
}

function generateBackupCodes(): string[] {
  const codes = []
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { code, secret } = await request.json()

  if (!verifyTOTP(secret, code)) {
    return NextResponse.json({ success: false, error: 'Código inválido' })
  }

  const backupCodes = generateBackupCodes()

  const { error } = await supabase.from('user_2fa').upsert({
    user_id: user.id,
    secret,
    enabled: true,
    backup_codes: backupCodes,
    verified_at: new Date().toISOString()
  }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ success: false, error: error.message })
  }

  return NextResponse.json({ success: true, backupCodes })
}
