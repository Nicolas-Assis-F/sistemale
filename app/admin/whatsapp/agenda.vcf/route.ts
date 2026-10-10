import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatPhone } from '@/lib/leads/rules';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/**
 * Contatos que ainda não estão na agenda, em vCard: importe no Google Contatos
 * (ou abra no celular) e o WhatsApp passa a mostrar o nome. ?id= baixa só um.
 */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) return new Response('Não autorizado', { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  const leads = await prisma.lead.findMany({
    where: id ? { id } : { savedName: null },
    select: { name: true, suggestedName: true, phone: true, kind: true, equipment: true, city: true },
    orderBy: { name: 'asc' },
  });
  const cards = leads.map((l) => {
    const name = l.suggestedName || l.name;
    const note = [l.kind, l.equipment, l.city].filter(Boolean).join(' · ');
    return ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(name)}`, `N:${esc(name)};;;;`, `TEL;TYPE=CELL:+${l.phone}`,
      'ORG:Cliente perfuração (L&E)', ...(note ? [`NOTE:${esc(note)}`] : []), 'END:VCARD'].join('\r\n');
  });
  const file = id && leads[0] ? `${formatPhone(leads[0].phone).replace(/\D/g, '')}.vcf` : 'clientes-nao-salvos.vcf';
  return new Response(cards.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-store',
    },
  });
}
