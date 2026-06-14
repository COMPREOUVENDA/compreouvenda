import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';

const conditionDescriptions: Record<string, string> = {
  new: 'novo, sem uso, na embalagem original',
  like_new: 'seminovo, pouco uso, excelente estado',
  good: 'bom estado, marcas mínimas de uso',
  fair: 'estado razoável, marcas visíveis de uso',
  used: 'usado, pode ter defeitos ou desgaste',
};

const conditionLabels: Record<string, string> = {
  new: 'Novo',
  like_new: 'Seminovo',
  good: 'Bom estado',
  fair: 'Razoável',
  used: 'Usado',
};

function generateTitle(params: {
  hint: string;
  category: string;
  condition: string;
}): string {
  const { hint, category, condition } = params;
  const cat = CATEGORIES.find((c) => c.id === category);
  const catName = cat?.name ?? 'Produto';
  const condLabel = conditionLabels[condition] ?? '';

  const base = hint.trim();

  if (!base) {
    return `${catName} ${condLabel}`.trim();
  }

  // Already looks like a proper title (>= 20 chars with letters)
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 4 && base.length >= 20) {
    // Enrich: add condition label at start if not present
    const hasCondition = Object.values(conditionLabels).some((l) =>
      base.toLowerCase().includes(l.toLowerCase())
    );
    if (!hasCondition && condLabel) {
      return `${condLabel} – ${base}`;
    }
    return base;
  }

  // Build from scratch
  const titleParts: string[] = [];
  if (condLabel) titleParts.push(condLabel);
  titleParts.push(base || catName);
  return titleParts.join(' – ');
}

function generateDescription(params: {
  title: string;
  category: string;
  condition: string;
  price: number;
}): string {
  const { title, category, condition, price } = params;
  const cat = CATEGORIES.find((c) => c.id === category);
  const catName = cat?.name ?? 'produto';
  const condDesc = conditionDescriptions[condition] ?? 'usado';
  const priceFormatted =
    price > 0
      ? `R$ ${price.toFixed(2).replace('.', ',')}`
      : 'preço a combinar';

  const descriptions = [
    `Vendo ${title}. Item ${condDesc}.`,
    ``,
    `✅ Produto da categoria ${catName}`,
    `📦 Condição: ${conditionLabels[condition] ?? condition}`,
    `💰 Valor: ${priceFormatted}`,
    ``,
    `Entrego pessoalmente ou combino envio. Aceito Pix. Estou aberto a propostas razoáveis.`,
    ``,
    `Entre em contato pelo chat para mais fotos ou informações. Produto sem garantia de loja.`,
  ];

  return descriptions.join('\n');
}

export async function POST(req: NextRequest) {
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
      const title = generateTitle({ hint, category, condition });
      return NextResponse.json({ success: true, result: title });
    }

    if (type === 'description') {
      const titleForDesc = hint || generateTitle({ hint, category, condition });
      const description = generateDescription({
        title: titleForDesc,
        category,
        condition,
        price: Number(price),
      });
      return NextResponse.json({ success: true, result: description });
    }

    return NextResponse.json(
      { success: false, error: 'type deve ser "title" ou "description"' },
      { status: 400 }
    );
  } catch (err) {
    console.error('AI generate error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar conteúdo' },
      { status: 500 }
    );
  }
}
