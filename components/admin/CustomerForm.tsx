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
import { AddressFields, TaxRegistrationFields, type AddressValue, type TaxRegistrationValue } from '@/components/customers/FiscalFields';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  tradeName: z.string().optional(),
  doc: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact: z.string().optional(),
  ieIndicator: z.enum(['', 'CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE']),
  stateRegistration: z.string(),
  postalCode: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string(),
  district: z.string(),
  cityName: z.string(),
  state: z.string(),
  municipalityCode: z.string(),
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

const EMPTY: FormValues = {
  name: '', tradeName: '', doc: '', email: '', phone: '', contact: '',
  ieIndicator: '', stateRegistration: '',
  postalCode: '', street: '', number: '', complement: '', district: '', cityName: '', state: '', municipalityCode: '',
};

export function CustomerForm({ defaultValues, action, submitLabel = 'Salvar alterações' }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const onSubmit = useAdminForm(form, action);
  const values = form.watch();
  const errors = Object.fromEntries(Object.entries(form.formState.errors).map(([k, v]) => [k, v?.message as string | undefined]));
  const patch = (p: Partial<AddressValue & TaxRegistrationValue>) => {
    for (const [k, v] of Object.entries(p)) form.setValue(k as keyof FormValues, v as never, { shouldDirty: true });
    form.clearErrors(Object.keys(p) as (keyof FormValues)[]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-7">
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold">Identificação</legend>
          <TextField form={form} name="name" label="Nome / Razão social" placeholder="Como sai na nota fiscal" />
          <TextField form={form} name="tradeName" label="Nome fantasia" />
          <TextField form={form} name="doc" label="CNPJ / CPF" />
          <TextField form={form} name="contact" label="Pessoa de contato" />
          <TextField form={form} name="phone" label="Telefone" />
          <TextField form={form} name="email" label="E-mail (recebe XML e DANFE)" />
        </fieldset>
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold">Fiscal</legend>
          <TaxRegistrationFields variant="admin" value={values} onChange={patch} errors={errors} />
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Endereço fiscal e de cobrança</legend>
          <AddressFields variant="admin" value={values} onChange={patch} errors={errors} />
        </fieldset>
        <Button className="sticky bottom-0 w-full sm:w-auto" type="submit" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
