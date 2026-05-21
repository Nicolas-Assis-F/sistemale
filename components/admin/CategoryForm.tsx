'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { slugify } from '@/lib/slugify';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório'),
  description: z.string().max(500).optional(),
  icon: z.string().max(200).optional(),
  order: z.number().int(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  action: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
}

export function CategoryForm({ defaultValues, action, submitLabel = 'Salvar' }: Props) {
  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      icon: '',
      order: 0,
      ...defaultValues,
    },
  });

  const nameValue = form.watch('name');
  useEffect(() => {
    if (!slugEdited && nameValue) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, slugEdited, form]);

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, String(v ?? '')));
    await action(fd);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
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
                  onChange={(e) => {
                    setSlugEdited(true);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ícone (nome lucide ou URL)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Droplets" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordem</FormLabel>
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

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
