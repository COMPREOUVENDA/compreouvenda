import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBase32Secret, getOtpAuthUrl } from '@/lib/totp';
import crypto from 'crypto';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const secret = generateBase32Secret();
  const qrCode = getOtpAuthUrl(user.email || '', secret);
  const backupCodes = Array.from({ length: 8 }, () =
>    crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  );

  // Salva secret e backup codes (não habilita ainda — só após verificação)
  const { error } = await supabase
    .from('user_2fa')
    .upsert({
      user_id: user.id,
      secret,
      backup_codes: backupCodes,
      enabled: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ secret, qrCode, backupCodes });
}
