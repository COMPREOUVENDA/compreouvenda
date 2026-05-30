import { NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/mercadopago';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const status = await getPaymentStatus(params.id);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
