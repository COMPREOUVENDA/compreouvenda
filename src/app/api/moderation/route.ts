import { NextResponse } from 'next/server';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  try {
    const { title, description, images } = await request.json();

    if (!title && !description) {
      return NextResponse.json({ error: 'Nothing to moderate' }, { status: 400 });
    }

    const textToCheck = `${title || ''} ${description || ''}`.trim();

    // Use OpenAI Moderation API
    if (OPENAI_KEY) {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ input: textToCheck }),
      });
      const data = await res.json();
      const result = data.results?.[0];

      if (result?.flagged) {
        const categories = Object.entries(result.categories)
          .filter(([, v]) => v)
          .map(([k]) => k);
        return NextResponse.json({
          approved: false,
          reason: 'Conteúdo impróprio detectado',
          categories,
          message: 'Seu anúncio contém conteúdo que viola nossas políticas. Por favor, revise o título e a descrição.',
        });
      }
    }

    // Basic keyword filter (fallback without OpenAI)
    const prohibited = ['arma', 'droga', 'ilegal', 'falsific', 'pirata', 'roubo', 'furto', 'contrabando', 'explosiv'];
    const lower = textToCheck.toLowerCase();
    const found = prohibited.filter(word => lower.includes(word));

    if (found.length > 0) {
      return NextResponse.json({
        approved: false,
        reason: 'Produto possivelmente proibido',
        categories: found,
        message: 'Seu anúncio pode conter termos relacionados a produtos proibidos. Revise o conteúdo.',
      });
    }

    return NextResponse.json({ approved: true });
  } catch (error: any) {
    console.error('Moderation error:', error);
    return NextResponse.json({ approved: true }); // Fail open
  }
}
