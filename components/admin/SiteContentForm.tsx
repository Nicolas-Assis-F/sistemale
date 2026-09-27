'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUploader } from '@/components/admin/ImageUploader';

type Json = Record<string, unknown>;

interface Props {
  contentKey: string;
  defaultValues: Json;
  action: (formData: FormData) => Promise<unknown>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SiteContentForm({ contentKey, defaultValues, action }: Props) {
  const [data, setData] = useState<Json>(defaultValues);
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  const str = (k: string) => (data[k] as string) ?? '';

  type Row = Record<string, string>;
  const rows = (k: string) => (data[k] as Row[]) ?? [];
  const setRow = (k: string, i: number, field: string, value: string) =>
    setData((d) => {
      const arr = [...((d[k] as Row[]) ?? [])];
      arr[i] = { ...arr[i], [field]: value };
      return { ...d, [k]: arr };
    });
  const addRow = (k: string, blank: Row) => setData((d) => ({ ...d, [k]: [...((d[k] as Row[]) ?? []), blank] }));
  const removeRow = (k: string, i: number) =>
    setData((d) => ({ ...d, [k]: ((d[k] as Row[]) ?? []).filter((_, idx) => idx !== i) }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('payload', JSON.stringify(data));
    await action(fd);
    setSaving(false);
  }

  function ArrayEditor({ k, fields, blank, title }: { k: string; fields: { name: string; label: string; area?: boolean }[]; blank: Row; title: string }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addRow(k, blank)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <div className="space-y-3">
          {rows(k).map((row, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.name} className={f.area ? 'sm:col-span-2' : ''}>
                    {f.area ? (
                      <Textarea
                        rows={2}
                        placeholder={f.label}
                        value={row[f.name] ?? ''}
                        onChange={(e) => setRow(k, i, f.name, e.target.value)}
                      />
                    ) : (
                      <Input
                        placeholder={f.label}
                        value={row[f.name] ?? ''}
                        onChange={(e) => setRow(k, i, f.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeRow(k, i)}
                className="mt-1 text-muted-foreground hover:text-destructive"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {rows(k).length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Field label="Rótulo (eyebrow)">
        <Input value={str('heroEyebrow')} onChange={(e) => set('heroEyebrow', e.target.value)} />
      </Field>
      <Field label="Título do hero">
        <Input value={str('heroTitle')} onChange={(e) => set('heroTitle', e.target.value)} />
      </Field>

      {contentKey === 'home' && (
        <Field label="Destaque do título" hint="Texto colorido na segunda linha do título.">
          <Input value={str('heroHighlight')} onChange={(e) => set('heroHighlight', e.target.value)} />
        </Field>
      )}

      <Field label="Subtítulo do hero">
        <Textarea rows={3} value={str('heroSubtitle')} onChange={(e) => set('heroSubtitle', e.target.value)} />
      </Field>

      {contentKey === 'home' && (
        <>
          <Field label="Imagem do hero" hint="Foto de fundo do topo da página. Sem imagem, usa o gradiente da marca.">
            <ImageUploader
              value={str('heroImage') ? [str('heroImage')] : []}
              onChange={(urls) => set('heroImage', urls[urls.length - 1] ?? '')}
            />
          </Field>
          <Field label="Título da chamada final (CTA)">
            <Input value={str('ctaTitle')} onChange={(e) => set('ctaTitle', e.target.value)} />
          </Field>
          <Field label="Subtítulo da CTA">
            <Textarea rows={2} value={str('ctaSubtitle')} onChange={(e) => set('ctaSubtitle', e.target.value)} />
          </Field>

          <ArrayEditor
            k="trust"
            title="Destaques do hero (chips)"
            blank={{ icon: '', title: '' }}
            fields={[{ name: 'icon', label: 'Ícone (ex: Zap, Truck, Factory)' }, { name: 'title', label: 'Texto' }]}
          />
          <ArrayEditor
            k="stats"
            title="Números / Estatísticas"
            blank={{ value: '', label: '' }}
            fields={[{ name: 'value', label: 'Valor (ex: 2021)' }, { name: 'label', label: 'Rótulo (ex: Desde)' }]}
          />
          <ArrayEditor
            k="testimonials"
            title="Depoimentos de clientes"
            blank={{ quote: '', name: '', role: '' }}
            fields={[
              { name: 'quote', label: 'Depoimento', area: true },
              { name: 'name', label: 'Nome' },
              { name: 'role', label: 'Empresa / cidade' },
            ]}
          />
          <ArrayEditor
            k="guarantees"
            title="Certificações & Garantia"
            blank={{ icon: '', title: '', description: '' }}
            fields={[
              { name: 'icon', label: 'Ícone (ex: ShieldCheck)' },
              { name: 'title', label: 'Título' },
              { name: 'description', label: 'Descrição', area: true },
            ]}
          />
        </>
      )}

      {contentKey === 'sobre' && (
        <>
          <Field label="História (Markdown)" hint="Aceita Markdown: **negrito**, ## títulos, listas.">
            <Textarea rows={8} value={str('story')} onChange={(e) => set('story', e.target.value)} />
          </Field>
          <ArrayEditor
            k="stats"
            title="Números / Estatísticas"
            blank={{ label: '', value: '' }}
            fields={[{ name: 'value', label: 'Valor (ex: 2021)' }, { name: 'label', label: 'Rótulo (ex: Desde)' }]}
          />
          <ArrayEditor
            k="values"
            title="Diferenciais"
            blank={{ title: '', description: '' }}
            fields={[{ name: 'title', label: 'Título' }, { name: 'description', label: 'Descrição', area: true }]}
          />
        </>
      )}

      {contentKey === 'servicos' && (
        <ArrayEditor
          k="steps"
          title="Etapas do processo"
          blank={{ title: '', description: '' }}
          fields={[{ name: 'title', label: 'Título' }, { name: 'description', label: 'Descrição', area: true }]}
        />
      )}

      {contentKey === 'contato' && (
        <Field label="Horário de atendimento">
          <Input value={str('hours')} onChange={(e) => set('hours', e.target.value)} />
        </Field>
      )}

      <Button type="submit" loading={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
    </form>
  );
}
