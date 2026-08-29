import { NextRequest, NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/me
 *
 * Fonte única para o frontend descobrir se a sessão atual tem privilégio
 * administrativo. Resolvido no servidor com service role para que o cliente
 * nunca precise ler `admin_users` diretamente — a tabela permanece fechada
 * por RLS e o navegador só recebe o resultado da decisão.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminIdentity(req);

  if (!admin) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }

  return NextResponse.json({
    isAdmin: true,
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
}
