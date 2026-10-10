'use client';

import { useState, useTransition } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/admin/production/ProductionNav';
import { PROMO_HASTES_TEMPLATE, SEGMENTS, SEGMENT_CODES, renderTemplate, templateVersions } from '@/lib/leads/rules';

/** Abre o WhatsApp com a mensagem pronta e marca o disparo como enviado. Quem aperta "enviar" é você. */
export function OpenAndMark({ href, onSent }: { href: string; onSent: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" loading={pending} onClick={() => {
      window.open(href, '_blank', 'noopener');
      start(() => onSent());
    }}>
      <MessageCircle className="size-4" /> Abrir e enviar
    </Button>
  );
}

/** Produto + mensagem: trocar o produto troca o modelo; {nome} vira o primeiro nome de cada contato. */
export function TemplateFields() {
  const [segment, setSegment] = useState<string>('haste_2_7_8');
  const [template, setTemplate] = useState<string>(SEGMENTS.haste_2_7_8.template);
  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-le-muted">Produto (quem tem interesse ou usa)</span>
        <select name="segment" value={segment} className={fieldClass} onChange={(e) => {
          const s = e.target.value;
          setSegment(s);
          setTemplate((s === 'todos' ? SEGMENTS.outros : SEGMENTS[s as keyof typeof SEGMENTS]).template);
        }}>
          <option value="todos">Todos os produtos</option>
          {SEGMENT_CODES.map((s) => <option key={s} value={s}>{SEGMENTS[s].label}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="text-xs font-medium text-le-muted">Mensagem ({'{nome}'} = primeiro nome)</span>
        <textarea name="template" value={template} onChange={(e) => setTemplate(e.target.value)} rows={template.includes('---') ? 12 : 4} maxLength={3000} className={`${fieldClass} h-auto py-2`} />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-le-muted">
          <button type="button" className="font-medium text-le-blue hover:underline" onClick={() => setTemplate(PROMO_HASTES_TEMPLATE)}>Usar promoção de hastes (5 versões)</button>
          <span>Uma linha com --- separa versões; [Fala|Opa] sorteia um trecho. Cada contato recebe uma combinação.</span>
        </span>
        <span className="block text-[11px] text-le-muted">Prévia{templateVersions(template).length > 1 ? ` (1 de ${templateVersions(template).length} versões)` : ''}: {renderTemplate(template, 'Ilmara Morais', () => 0)}</span>
      </label>
    </>
  );
}

/** Botão de envio de formulário que pede confirmação antes (ação que redireciona). */
export function ConfirmSubmit({ message, children }: { message: string; children: React.ReactNode }) {
  return <Button type="submit" variant="danger" onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>{children}</Button>;
}
