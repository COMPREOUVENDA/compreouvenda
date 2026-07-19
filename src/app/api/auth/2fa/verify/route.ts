import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyTOTP } from '@/lib/totp';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { code } = await request.json();

  // Busca o secret salvo no servidor (não confia no enviado pelo client)
  const { data: record, error: fetchError } = await supabase
    .from('user_2fa')
    .select('secret, backup_codes')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !record?.secret) {
    return NextResponse.json({ success: false, error: 'Configuração 2FA não encontrada' });
  }

  const { secret, backup_codes: backupCodes } = record;
  const isBackupCode = Array.isArray(backupCodes) && backupCodes.includes(code.toUpperCase());

  if (!verifyTOTP(code, secret) && !isBackupCode) {
    return NextResponse.json({ success: false, error: 'Código inválido' });
  }

  // Se usou backup code, remove-o da lista
  const updatedBackupCodes = isBackupCode
    ? (backupCodes as string[]).filter((c) => c !== code.toUpperCase())
    : backupCodes;

  const { error } = await supabase.from('user_2fa').upsert({
    user_id: user.id,
    secret,
    enabled: true,
    backup_codes: updatedBackupCodes,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, usedBackupCode: isBackupCode });
}
