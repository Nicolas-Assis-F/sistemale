'use client';

import { useAdminForm } from './use-admin-form';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  doc: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  contact: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  action: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
}

function TextField({ form, name, label, placeholder }: { form: UseFormReturn<FormValues>; name: keyof FormValues; label: string; placeholder?: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...field} placeholder={placeholder} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CustomerForm({ defaultValues, action, submitLabel = 'Salvar alterações' }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', doc: '', email: '', phone: '', address: '', city: '', state: '', zip: '', contact: '',
      ...defaultValues,
    },
  });

  const onSubmit = useAdminForm(form, action);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={form} name="name" label="Nome / Razão social" placeholder="Cliente" />
          <TextField form={form} name="doc" label="CNPJ / CPF" />
          <TextField form={form} name="contact" label="Pessoa de contato" />
          <TextField form={form} name="phone" label="Telefone" />
          <TextField form={form} name="email" label="E-mail" />
        </div>
        <TextField form={form} name="address" label="Endereço" placeholder="Rua, número, bairro" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <TextField form={form} name="city" label="Cidade" />
          <TextField form={form} name="state" label="UF" />
          <TextField form={form} name="zip" label="CEP" />
        </div>
        <Button className="sticky bottom-0 w-full sm:w-auto" type="submit" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
