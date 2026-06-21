import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const descricoesCondicao: Record<string, string> = {
  new: 'novo, sem uso, na embalagem original',
  like_new: 'seminovo, pouco uso, excelente estado',
  good: 'bom estado, marcas mínimas de uso',
  fair: 'estado razoável, marcas visíveis de uso',
  used: 'usado, pode ter defeitos ou desgaste',
};

const rotulosCondicao: Record<string, string> = {
  new: 'Novo',
  like_new: 'Seminovo',
  good: 'Bom estado',
  fair: 'Razoável',
  used: 'Usado',
};

function gerarTitulo(params: {
  hint: string;
  category: string;
  condition: string;
}): string {
  const { hint, category, condition } = params;
  const cat = CATEGORIES.find((c) => c.id === category);
  const nomeCategoria = cat?.name ?? 'Produto';
  const rotuloCondicao = rotulosCondicao[condition] ?? '';

  const base = hint.trim();

  if (!base) {
    return `${nomeCategoria} ${rotuloCondicao}`.trim();
  }

  // Título já parece adequado (>= 20 caracteres com palavras suficientes)
  const palavras = base.split(/\s+/).filter(Boolean);
  if (palavras.length >= 4 && base.length >= 20) {
    // Enriquecer: adicionar condição no início se não estiver presente
    const temCondicao = Object.values(rotulosCondicao).some((r) =>
      base.toLowerCase().includes(r.toLowerCase())
    );
    if (!temCondicao && rotuloCondicao) {
      return `${rotuloCondicao} – ${base}`;
    }
    return base;
  }

  // Construir do zero
  const partes: string[] = [];
  if (rotuloCondicao) partes.push(rotuloCondicao);
  partes.push(base || nomeCategoria);
  return partes.join(' – ');
}

function gerarDescricao(params: {
  title: string;
  category: string;
  condition: string;
  price: number;
}): string {
  const { title, category, condition, price } = params;
  const cat = CATEGORIES.find((c) => c.id === category);
  const nomeCategoria = cat?.name ?? 'produto';
  const descCondicao = descricoesCondicao[condition] ?? 'usado';
  const precoFormatado =
    price > 0
      ? `R$ ${price.toFixed(2).replace('.', ',')}`
      : 'preço a combinar';

  const linhas = [
    `Vendo ${title}. Item ${descCondicao}.`,
    ``,
    `✅ Produto da categoria ${nomeCategoria}`,
    `📦 Condição: ${rotulosCondicao[condition] ?? condition}`,
    `💰 Valor: ${precoFormatado}`,
    ``,
    `Entrego pessoalmente ou combino envio. Aceito Pix. Estou aberto a propostas razoáveis.`,
    ``,
    `Entre em contato pelo chat para mais fotos ou informações. Produto sem garantia de loja.`,
  ];

  return linhas.join('\n');
}

export async function POST(req: NextRequest) {
  // Limite de requisições: 20 por minuto por IP
  const ip = getClientIp(req);
  const rl = rateLimit(`ai-generate:${ip}`, { limit: 20, windowSec: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'Muitas requisições. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, hint = '', category = '', condition = 'used', price = 0 } =
      body as {
        type: 'title' | 'description';
        hint?: string;
        category?: string;
        condition?: string;
        price?: number;
      };

    if (!type) {
      return NextResponse.json(
        { success: false, error: '"type" é obrigatório: "title" ou "description"' },
        { status: 400 }
      );
    }

    if (type === 'title') {
      const titulo = gerarTitulo({ hint, category, condition });
      return NextResponse.json({ success: true, result: titulo });
    }

    if (type === 'description') {
      const tituloBase = hint || gerarTitulo({ hint, category, condition });
      const descricao = gerarDescricao({
        title: tituloBase,
        category,
        condition,
        price: Number(price),
      });
      return NextResponse.json({ success: true, result: descricao });
    }

    return NextResponse.json(
      { success: false, error: 'type deve ser "title" ou "description"' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[IA gerar] Erro ao gerar conteúdo:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar conteúdo' },
      { status: 500 }
    );
  }
}
