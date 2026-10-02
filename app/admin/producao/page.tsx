import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { todayStartBR } from '@/lib/finance/summary';
import { cn } from '@/lib/utils';
import { CUT_PLANS, DIAMETERS, ROD_LENGTHS, cutPlanWasteM, rodSku } from '@/lib/production/rules';
import { getBalances } from '@/lib/production/service';
import { Field, Panel, ProductionNav, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { addCut, addEntry, addWeld, adjustBalance } from './_actions';

const REASON_LABELS = { ENTRADA: 'Entrada', CORTE: 'Corte', SOLDA: 'Solda', REFUGO: 'Refugo', AJUSTE: 'Ajuste' } as const;
const KIND_LABELS = { TUBO: 'Tubos', PECA: 'Peças', PAR: 'Pares' } as const;

function Qty({ value }: { value: number | undefined }) {
  const n = value ?? 0;
  return <span className={cn('tabular-nums', n < 0 ? 'font-semibold text-le-danger' : n === 0 ? 'text-le-muted' : 'font-medium text-le-ink')}>{n}</span>;
}

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const flash = await searchParams;
  const today = todayStartBR();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);
  const [balances, pending, rework, weldedToday, approvedToday, scrapToday, approvedWeek, finished, team, moves] = await Promise.all([
    getBalances(),
    prisma.rod.count({ where: { status: 'INSPECAO' } }),
    prisma.rod.count({ where: { status: 'RETRABALHO' } }),
    prisma.rod.count({ where: { createdAt: { gte: today } } }),
    prisma.rod.count({ where: { status: 'APROVADA', approvedAt: { gte: today } } }),
    prisma.rod.count({ where: { status: 'REFUGO', inspectedAt: { gte: today } } }),
    prisma.rod.count({ where: { status: 'APROVADA', approvedAt: { gte: weekAgo } } }),
    prisma.product.findMany({ where: { sku: { startsWith: 'LE-HASTE-' } }, select: { sku: true, stock: true } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, markLetter: true, pieceRateCents: true } }),
    prisma.productionMove.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { employee: { select: { name: true } } } }),
  ]);
  const stockBySku = new Map(finished.map((p) => [p.sku, p.stock]));
  const crew = team.filter((e) => e.pieceRateCents > 0 || e.markLetter);
  const people = crew.length > 0 ? crew : team;
  const anyNegative = [...Object.values(balances.tubes), ...Object.values(balances.pairs), ...Object.values(balances.pieces).flatMap((p) => Object.values(p))].some((n) => n < 0);

  return (
    <div className="le-admin-page">
      <ProductionNav active="/admin/producao" title="Linha de hastes" flash={flash}
        description="Tubo → corte → solda → inspeção → estoque do site. Lance cada etapa quando ela acontecer; o sistema baixa as peças e os pares sozinho." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Soldadas hoje', value: weldedToday, detail: `${approvedWeek} aprovadas nos últimos 7 dias` },
          { label: 'Aprovadas hoje', value: approvedToday, detail: scrapToday ? `${scrapToday} refugada(s) hoje` : 'Nenhum refugo hoje' },
          { label: 'Aguardando inspeção', value: pending, detail: 'Inspecione antes de pagar ou vender', href: '/admin/producao/inspecao' },
          { label: 'Em retrabalho', value: rework, detail: 'Voltam para a inspeção depois de corrigidas', href: '/admin/producao/inspecao' },
        ].map((k) => {
          const body = (
            <>
              <p className="text-xs text-le-muted">{k.label}</p>
              <p className="mt-3 font-heading text-3xl font-medium tracking-[-.06em] text-le-ink">{k.value}</p>
              <p className="mt-2 text-[11px] text-le-muted">{k.detail}</p>
            </>
          );
          return k.href
            ? <Link key={k.label} href={k.href} className="rounded-2xl border border-le-line bg-white p-4 transition-shadow hover:shadow-md">{body}</Link>
            : <div key={k.label} className="rounded-2xl border border-le-line bg-white p-4">{body}</div>;
        })}
      </div>

      <Panel title="Estoque em cada etapa" hint={anyNegative ? 'Número vermelho = foi usado mais do que entrou. Falta lançar uma entrada ou um corte (ou faça a contagem física abaixo).' : 'Pronto = aprovadas no estoque do site.'}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className="border-b border-le-line text-left text-xs text-le-muted">
                <th className="py-2 pr-3 font-medium">Diâmetro</th>
                <th className="px-2 py-2 text-right font-medium">Tubos 9 m</th>
                {ROD_LENGTHS.map((l) => <th key={`p${l}`} className="px-2 py-2 text-right font-medium">Peças {l} m</th>)}
                <th className="px-2 py-2 text-right font-medium">Pares</th>
                {ROD_LENGTHS.map((l) => <th key={`f${l}`} className="px-2 py-2 text-right font-medium text-le-success">Pronto {l} m</th>)}
              </tr>
            </thead>
            <tbody>
              {DIAMETERS.map((d) => (
                <tr key={d.code} className="border-b border-le-line/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-le-ink">{d.label}</td>
                  <td className="px-2 text-right"><Qty value={balances.tubes[d.code]} /></td>
                  {ROD_LENGTHS.map((l) => <td key={l} className="px-2 text-right"><Qty value={balances.pieces[d.code]?.[l]} /></td>)}
                  <td className="px-2 text-right"><Qty value={balances.pairs[d.code]} /></td>
                  {ROD_LENGTHS.map((l) => <td key={l} className="px-2 text-right"><Qty value={stockBySku.get(rodSku(d.code, l))} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="1. Chegou material" hint="Tubos do caminhão ou pares de rosca que vieram do CNC.">
          <form action={addEntry} className="grid gap-3 sm:grid-cols-2">
            <Field label="O que chegou">
              <select name="kind" className={fieldClass} defaultValue="TUBO">
                <option value="TUBO">Tubos de 9 m</option>
                <option value="PAR">Pares de rosca (CNC)</option>
              </select>
            </Field>
            <Field label="Diâmetro">
              <select name="diameter" className={fieldClass}>{DIAMETERS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</select>
            </Field>
            <Field label="Quantidade"><input name="qty" type="number" inputMode="numeric" min={1} max={500} required className={fieldClass} placeholder="50" /></Field>
            <Field label="Observação (opcional)"><input name="note" maxLength={200} className={fieldClass} placeholder="Nota 1234, fornecedor…" /></Field>
            <SubmitButton className="sm:col-span-2">Lançar entrada</SubmitButton>
          </form>
        </Panel>

        <Panel title="2. Corte dos tubos" hint="Prefira os planos sem sobra. Cada tubo cortado vira peças prontas para soldar.">
          <form action={addCut} className="grid gap-3 sm:grid-cols-2">
            <Field label="Diâmetro">
              <select name="diameter" className={fieldClass}>{DIAMETERS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</select>
            </Field>
            <Field label="Plano de corte">
              <select name="plan" className={fieldClass}>
                {CUT_PLANS.map((p) => <option key={p} value={p}>{p} m{cutPlanWasteM(p) ? ` (sobra ${cutPlanWasteM(p)} m)` : ' (sem sobra)'}</option>)}
              </select>
            </Field>
            <Field label="Tubos cortados"><input name="tubes" type="number" inputMode="numeric" min={1} max={500} required className={fieldClass} placeholder="10" /></Field>
            <Field label="Quem cortou">
              <select name="employeeId" className={fieldClass} defaultValue=""><option value="">—</option>{people.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            </Field>
            <SubmitButton className="sm:col-span-2">Lançar corte</SubmitButton>
          </form>
        </Panel>

        <Panel title="3. Hastes soldadas" hint="Lance no fim do dia (ou do turno). As hastes entram na fila de inspeção com a marca do dia + letra do soldador." className="lg:col-span-2">
          {people.length === 0 ? (
            <p className="text-sm text-le-muted">Cadastre o soldador e o ajudante em <Link href="/admin/funcionarios" className="text-le-blue underline">Funcionários</Link> e defina a letra e o valor por haste em <Link href="/admin/producao/pagamentos" className="text-le-blue underline">Equipe e pagamentos</Link>.</p>
          ) : (
            <form action={addWeld} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <Field label="Diâmetro">
                <select name="diameter" className={fieldClass}>{DIAMETERS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</select>
              </Field>
              <Field label="Comprimento">
                <select name="lengthM" className={fieldClass} defaultValue="3">{ROD_LENGTHS.map((l) => <option key={l} value={l}>{l} m</option>)}</select>
              </Field>
              <Field label="Quantidade"><input name="qty" type="number" inputMode="numeric" min={1} max={200} required className={fieldClass} placeholder="30" /></Field>
              <Field label="Soldador">
                <select name="welderId" className={fieldClass} required defaultValue="">
                  <option value="" disabled>Escolha</option>
                  {people.map((e) => <option key={e.id} value={e.id}>{e.name}{e.markLetter ? ` (${e.markLetter})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Ajudante">
                <select name="helperId" className={fieldClass} defaultValue=""><option value="">Sem ajudante</option>{people.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
              </Field>
              <Field label="Dia da solda"><input name="weldedOn" type="date" defaultValue={todayISO} max={todayISO} className={fieldClass} /></Field>
              <div className="flex items-end"><SubmitButton className="w-full">Mandar para inspeção</SubmitButton></div>
            </form>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Últimos lançamentos">
          {moves.length === 0 ? <p className="text-sm text-le-muted">Nada lançado ainda. Comece pela entrada dos tubos.</p> : (
            <ul className="divide-y divide-le-line/60 text-sm">
              {moves.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium text-le-ink">{REASON_LABELS[m.reason]} · {KIND_LABELS[m.kind]} {DIAMETERS.find((d) => d.code === m.diameter)?.label}{m.kind === 'PECA' ? ` ${m.lengthM} m` : ''}</p>
                    <p className="text-xs text-le-muted">{m.note ?? ''}{m.employee ? ` · ${m.employee.name}` : ''} · {m.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={cn('shrink-0 tabular-nums font-semibold', m.qty < 0 ? 'text-le-muted' : 'text-le-success')}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Contagem física" hint="Contou no galpão e não bateu? Digite o que existe de verdade; o sistema grava a diferença como ajuste.">
          <form action={adjustBalance} className="grid gap-3 sm:grid-cols-2">
            <Field label="Item">
              <select name="kind" className={fieldClass} defaultValue="PAR">
                <option value="TUBO">Tubos de 9 m</option>
                <option value="PECA">Peças cortadas</option>
                <option value="PAR">Pares de rosca</option>
              </select>
            </Field>
            <Field label="Diâmetro">
              <select name="diameter" className={fieldClass}>{DIAMETERS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}</select>
            </Field>
            <Field label="Comprimento (só peças)">
              <select name="lengthM" className={fieldClass} defaultValue="3">{ROD_LENGTHS.map((l) => <option key={l} value={l}>{l} m</option>)}</select>
            </Field>
            <Field label="Quantidade contada"><input name="counted" type="number" inputMode="numeric" min={0} required className={fieldClass} /></Field>
            <SubmitButton variant="outline" className="sm:col-span-2">Gravar contagem</SubmitButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}
