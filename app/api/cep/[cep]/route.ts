import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type ViaCep = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; ibge?: string; erro?: boolean | string };

/**
 * GET /api/cep/74000000 — preenche endereço pelo CEP (ViaCEP) e confere o
 * município no catálogo IBGE local. Só recebe o CEP; nenhum dado do cliente sai daqui.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ cep: string }> }) {
  const cep = (await params).cep.replace(/\D/g, '');
  if (cep.length !== 8) return NextResponse.json({ error: 'CEP deve ter 8 dígitos.' }, { status: 422 });

  let data: ViaCep;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(6_000), next: { revalidate: 86_400 } });
    if (!res.ok) throw new Error(String(res.status));
    data = (await res.json()) as ViaCep;
  } catch {
    return NextResponse.json({ error: 'Consulta de CEP indisponível. Preencha o endereço manualmente.' }, { status: 503 });
  }
  if (data.erro) return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 });

  const municipality = data.ibge
    ? await prisma.municipality.findFirst({ where: { ibgeCode: data.ibge, active: true }, select: { ibgeCode: true, name: true, state: true } })
    : null;

  return NextResponse.json(
    {
      postalCode: cep,
      street: data.logradouro || '',
      district: data.bairro || '',
      cityName: municipality?.name ?? data.localidade ?? '',
      state: municipality?.state ?? data.uf ?? '',
      municipalityCode: municipality?.ibgeCode ?? '',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
