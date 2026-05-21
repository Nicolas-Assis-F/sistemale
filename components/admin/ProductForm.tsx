'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Trash2, Tag, DollarSign, FileText, Settings2, ImageIcon, Megaphone } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório'),
  sku: z.string().min(1, 'SKU obrigatório'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  shortDesc: z.string().min(1, 'Descrição curta obrigatória').max(200),
  description: z.string(),
  priceReais: z.string().min(1, 'Preço obrigatório'),
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
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/40">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

export function ProductForm({ categories, defaultValues, action, submitLabel = 'Salvar' }: Props) {
  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      sku: '',
      categoryId: '',
      shortDesc: '',
      description: '',
      priceReais: '',
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
    await action(fd);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* 1 — Identificação */}
        <Section icon={Tag} title="Identificação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (URL)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => { setSlugEdited(true); field.onChange(e); }}
                    />
                  </FormControl>
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
        </Section>

        {/* 2 — Preços e Estoque */}
        <Section icon={DollarSign} title="Preços e Estoque">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="priceReais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
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
        <Section icon={FileText} title="Conteúdo">
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
        <Section icon={Settings2} title="Especificações Técnicas">
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
        </Section>

        {/* 5 — Imagens */}
        <Section icon={ImageIcon} title="Imagens do Produto">
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
        <Section icon={Megaphone} title="Publicação">
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

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto px-8">
          {form.formState.isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
