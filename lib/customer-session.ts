// Sessão do cliente em Server Components / Server Actions (server-only).
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { customerAuth } from '@/lib/customer-auth';
import { generateCustomerCode, withUniqueRetry } from '@/lib/order-number';

export const getCustomerSession = cache(async () => customerAuth.api.getSession({ headers: await headers() }));

/** Exige cliente logado; senão manda para o login preservando o destino. */
export async function requireCustomer(next: string) {
  const session = await getCustomerSession();
  if (!session) redirect(`/conta/entrar?next=${encodeURIComponent(next)}`);
  const customer = await ensureCustomerLink(session.user);
  if (!customer) redirect('/conta/entrar?verificar=1');
  return { session, customer };
}

/**
 * Liga a conta ao cadastro comercial (Customer), só com e-mail VERIFICADO:
 *  1) já vinculada → devolve;
 *  2) existe Customer com o mesmo e-mail e sem conta → vincula (pedidos feitos
 *     pelo painel aparecem para o cliente);
 *  3) senão cria um Customer novo.
 */
export async function ensureCustomerLink(user: { id: string; name: string; email: string; emailVerified: boolean }) {
  if (!user.emailVerified) return null;
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { customer: true } });
  if (current?.customer) return current.customer;

  const existing = await prisma.customer.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' }, user: null },
    orderBy: { createdAt: 'asc' },
  });
  const customer =
    existing ??
    (await withUniqueRetry(async () =>
      prisma.customer.create({ data: { code: await generateCustomerCode(), name: user.name, email: user.email } }),
    ));
  await prisma.user.update({ where: { id: user.id }, data: { customerId: customer.id } });
  return customer;
}
