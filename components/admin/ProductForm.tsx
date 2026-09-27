'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploader } from './ImageUploader';
import { slugify } from '@/lib/slugify';
import { formatCurrency } from '@/lib/format';
import { parseImportPrice } from '@/lib/product-import';
import { Plus, Trash2, Tag, DollarSign, FileText, Settings2, ImageIcon, Megaphone, Check, ImageOff, ExternalLink } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(160),
  slug: z.string().min(1, 'Slug obrigatório'),
  sku: z.string().min(1, 'SKU obrigatório'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  shortDesc: z.string().min(1, 'Descrição curta obrigatória').max(200),
  description: z.string(),
  priceReais: z.string().refine((value) => parseImportPrice(value) !== null, 'Informe um preço válido ou 0 para sob cotação'),
  originalPriceReais: z.string().optional(),
  stock: z.number().int().min(0),
  active: z.boolean(),
  featured: z.boolean(),
  images: z.array(z.string()),
  specs: z.array(z.object({ key: z.string(), value: z.string() })),
});

type FormValues = z.infer<typeof schema>;

interface Category { id: string; name: string }
interface Props {
  categories: Category[];
  defaultValues?: Partial<FormValues>;
  action: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
  /** 'sheet': dentro do slide-over da listagem — sem prévia lateral, rodapé fixo, sem redirect. */
  variant?: 'page' | 'sheet';
  onSuccess?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function Section({ icon: Icon, title, step, description, children }: { icon: React.ElementType; title: string; step: string; description: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-le-line bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-le-line px-5 py-4 sm:px-6">
        <span className="font-mono text-xs font-bold text-le-blue">{step}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-le-subtle text-le-blue"><Icon className="h-4 w-4" /></span>
        <div><h3 className="font-heading text-base font-semibold text-le-text">{title}</h3><p className="text-xs text-le-muted">{description}</p></div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </div>
  );
}

export function ProductForm({ categories, defaultValues, action, submitLabel = 'Salvar', variant = 'page', onSuccess, onCancel, onDirtyChange }: Props) {
  const inSheet = variant === 'sheet';
  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);
  const [serverError, setServerError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      sku: '',
      categoryId: '',
      shortDesc: '',
      description: '',
      priceReais: '0',
      originalPriceReais: '',
      stock: 0,
      active: true,
      featured: false,
      images: [],
      specs: [],
      ...defaultValues,
    },
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({
    control: form.control,
    name: 'specs',
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const nameValue = form.watch('name');
  useEffect(() => {
    if (!slugEdited && nameValue) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, slugEdited, form]);

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.append('name', values.name);
    fd.append('slug', values.slug);
    fd.append('sku', values.sku);
    fd.append('categoryId', values.categoryId);
    fd.append('shortDesc', values.shortDesc);
    fd.append('description', values.description);
    fd.append('priceReais', values.priceReais);
    fd.append('originalPriceReais', values.originalPriceReais ?? '');
    fd.append('stock', String(values.stock));
    fd.append('active', String(values.active));
    fd.append('featured', String(values.featured));
    fd.append('images', JSON.stringify(values.images));
    fd.append('specs', JSON.stringify(values.specs));
    if (inSheet) fd.append('mode', 'inline');
    setServerError('');
    try {
      const response = await action(fd);
      if (response && typeof response === 'object' && 'error' in response) {
        const err = (response as { error: unknown }).error;
        setServerError(typeof err === 'string' ? err : Object.values(err as Record<string, string[]>).flat().join(' · ') || 'Revise os campos do produto.');
        return;
      }
      form.reset(values);
      onSuccess?.();
    } catch { setServerError('Não foi possível salvar. Confira sua conexão e tente novamente.'); }
  }

  const preview = form.watch();
  const previewPrice = parseImportPrice(preview.priceReais);
  const completed = [!!preview.name, !!preview.sku, !!preview.categoryId, previewPrice !== null, !!preview.shortDesc, preview.images.length > 0].filter(Boolean).length;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); form.handleSubmit(onSubmit)(); } }}
        className={inSheet ? 'flex min-h-full flex-col' : 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]'}>
        <div className={inSheet ? 'flex-1 space-y-5 bg-le-subtle p-4 sm:p-7' : 'space-y-5'}>

        {/* 1 — Identificação */}
        <Section icon={Tag} step="01" title="Identificação" description="Nome, referência e linha de produto.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl><Input {...field} autoFocus placeholder="Ex.: Cabeçote hidráulico 200 m" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input {...field} placeholder="EX-001" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  {/* `items` deixa o Select.Value mostrar o nome (não o id) antes de o menu abrir */}
                  <Select value={field.value} onValueChange={field.onChange} items={categories.map((c) => ({ value: c.id, label: c.name }))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <details className="rounded-md border border-le-line bg-le-subtle px-4 py-3"><summary className="cursor-pointer text-xs font-semibold text-le-text">Ajustes avançados da URL</summary><FormField control={form.control} name="slug" render={({ field }) => <FormItem className="mt-3"><FormLabel>Endereço do produto</FormLabel><FormControl><Input {...field} onChange={(event) => { setSlugEdited(true); field.onChange(event); }} /></FormControl><FormMessage /></FormItem>} /></details>
        </Section>

        {/* 2 — Preços e Estoque */}
        <Section icon={DollarSign} step="02" title="Preço e disponibilidade" description="Valores exibidos na vitrine e saldo para consulta.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="priceReais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$) · 0 para sob cotação</FormLabel>
                  <FormControl><Input {...field} placeholder="1299,90" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="originalPriceReais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço &ldquo;De&rdquo; (promoção)</FormLabel>
                  <FormControl><Input {...field} placeholder="1499,90 — opcional" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* 3 — Conteúdo */}
        <Section icon={FileText} step="03" title="Apresentação do produto" description="Explique o uso do equipamento com clareza.">
          <FormField
            control={form.control}
            name="shortDesc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição curta <span className="text-muted-foreground font-normal">(aparece no card — máx. 200 caracteres)</span></FormLabel>
                <FormControl><Textarea {...field} rows={2} maxLength={200} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição longa <span className="text-muted-foreground font-normal">(suporta Markdown)</span></FormLabel>
                <FormControl><Textarea {...field} rows={8} className="font-mono text-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        {/* 4 — Especificações */}
        <Section icon={Settings2} step="04" title="Ficha técnica" description="Dados que ajudam o cliente a comparar e decidir.">
          <div className="space-y-2">
            {specFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <Input
                  {...form.register(`specs.${index}.key`)}
                  placeholder="Chave (ex: Potência)"
                  className="flex-1"
                />
                <Input
                  {...form.register(`specs.${index}.value`)}
                  placeholder="Valor (ex: 1cv)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSpec(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendSpec({ key: '', value: '' })}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar especificação
          </Button>
          <div className="flex flex-wrap gap-2">{['Profundidade', 'Diâmetro', 'Material', 'Conexão'].map((key) => <button key={key} type="button" onClick={() => appendSpec({ key, value: '' })} className="rounded-full border border-le-line px-3 py-1 text-xs font-medium text-le-text hover:border-le-blue hover:text-le-blue">+ {key}</button>)}</div>
        </Section>

        {/* 5 — Imagens */}
        <Section icon={ImageIcon} step="05" title="Fotos do produto" description="A primeira imagem será a capa do catálogo.">
          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ImageUploader value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        {/* 6 — Publicação */}
        <Section icon={Megaphone} step="06" title="Publicação" description="Defina onde o produto aparece.">
          <div className="flex flex-wrap gap-8">
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer">Ativo</FormLabel>
                    <p className="text-xs text-muted-foreground">Visível no catálogo público</p>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer">Destaque</FormLabel>
                    <p className="text-xs text-muted-foreground">Aparece na página inicial</p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </Section>

        </div>
        {inSheet ? (
          <div className="sticky bottom-0 z-10 border-t border-border bg-white/95 px-4 py-3 supports-backdrop-filter:backdrop-blur-md sm:px-7">
            {serverError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{serverError}</p>}
            <div className="flex items-center gap-4">
              <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-le-subtle"><div className="h-full rounded-full bg-le-blue origin-left transition-transform duration-300" style={{ transform: `scaleX(${completed / 6})` }} /></div>
                <span className="text-[11px] text-muted-foreground">Ficha {completed}/6 · {preview.active ? 'publicada' : 'rascunho'}</span>
              </div>
              <div className="ml-auto flex gap-2">
                {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
                <Button type="submit" loading={form.formState.isSubmitting} disabled={categories.length === 0} className="min-w-36 bg-le-blue font-semibold hover:bg-le-blue-hover">
                  {form.formState.isSubmitting ? 'Salvando…' : submitLabel}
                  <kbd className="ml-1 hidden rounded bg-white/15 px-1 font-mono text-[11px] sm:inline">⌘↵</kbd>
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-xl border border-le-line bg-white shadow-sm"><div className="border-b border-le-line p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-le-warning">Prévia da vitrine</p><p className="mt-1 text-xs text-le-muted">Atualiza conforme você preenche</p></div><div className="relative aspect-[4/3] bg-le-subtle">{preview.images[0] ? <Image src={preview.images[0]} alt="Prévia do produto" fill sizes="300px" className="object-contain p-4" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-le-muted"><ImageOff className="h-9 w-9" /><span className="text-xs">Adicione uma foto</span></div>}</div><div className="p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-le-muted">{categories.find((item) => item.id === preview.categoryId)?.name || 'Sem categoria'}</p><h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold text-le-text">{preview.name || 'Nome do equipamento'}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-le-muted">{preview.shortDesc || 'O resumo aparece aqui para o cliente.'}</p><p className="mt-4 border-t border-le-line pt-3 font-heading text-xl font-bold text-le-text">{previewPrice === 0 ? 'Sob cotação' : previewPrice !== null ? formatCurrency(previewPrice) : 'Preço inválido'}</p></div></div>
          <div className="rounded-xl border border-le-line bg-le-ink p-5 text-white"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[.12em] text-white/65">Ficha pronta</p><span className="font-heading text-xl font-bold text-orange">{completed}/6</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full origin-left bg-orange transition-transform duration-300" style={{ transform: `scaleX(${completed / 6})` }} /></div><p className="mt-3 text-xs leading-5 text-white/65">Nome, SKU, categoria, preço, resumo e foto compõem uma ficha completa.</p>{serverError && <p role="alert" className="mt-4 rounded-md bg-le-danger p-3 text-xs text-white">{serverError}</p>}<Button type="submit" loading={form.formState.isSubmitting} disabled={categories.length === 0} className="mt-5 h-11 w-full bg-orange font-bold text-le-text hover:bg-le-yellow">{form.formState.isSubmitting ? 'Salvando...' : submitLabel}</Button>{categories.length === 0 && <Link href="/admin/categorias/novo" className="mt-3 inline-flex items-center gap-1 text-xs text-orange underline">Crie uma categoria primeiro <ExternalLink className="h-3 w-3" /></Link>}<p className="mt-3 flex items-center gap-1.5 text-xs text-white/60"><Check className="h-3.5 w-3.5 text-orange" /> {preview.active ? 'Visível no catálogo' : 'Rascunho oculto no catálogo'}</p></div>
        </aside>
        )}
      </form>
    </Form>
  );
}
