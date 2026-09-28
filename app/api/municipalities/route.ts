import { NextResponse } from 'next/server';
import { isBrState, searchMunicipalities } from '@/lib/domains/customers/municipalities';

export const runtime = 'nodejs';

/** GET /api/municipalities?uf=GO&q=goia — dado público do IBGE, sem dados de clientes. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uf = (searchParams.get('uf') ?? '').toUpperCase();
  const q = (searchParams.get('q') ?? '').slice(0, 60);
  if (!isBrState(uf)) return NextResponse.json({ error: 'UF inválida' }, { status: 422 });
  const items = await searchMunicipalities(uf, q);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
}
