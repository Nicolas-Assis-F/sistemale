'use client';

import { useAdminForm } from './use-admin-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  role: z.string().optional(),
  active: z.boolean(),
  phone: z.string().optional(),
  pixKey: z.string().optional(),
  commission: z.string().refine((v) => !v || /^\d{1,2}([.,]\d{1,2})?$|^100$/.test(v.trim()), 'Use um percentual como 2,5'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  action: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
}

export function EmployeeForm({ defaultValues, action, submitLabel = 'Salvar alterações' }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: '', active: true, phone: '', pixKey: '', commission: '', ...defaultValues },
  });

  const onSubmit = useAdminForm(form, action);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl><Input {...field} placeholder="Nome do funcionário" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função (opcional)</FormLabel>
              <FormControl><Input {...field} placeholder="Torneiro, Soldador..." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp / telefone</FormLabel>
                <FormControl><Input {...field} placeholder="(62) 90000-0000" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pixKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave PIX (para comissões)</FormLabel>
                <FormControl><Input {...field} placeholder="CPF, e-mail, telefone ou aleatória" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="commission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comissão padrão (%)</FormLabel>
              <FormControl><Input {...field} inputMode="decimal" placeholder="Ex.: 2,5" className="max-w-40" /></FormControl>
              <FormDescription className="text-xs">
                Sugerida ao vincular o funcionário a um pedido e aplicada automaticamente quando ele é o responsável pela produção. Paga sobre o total do pedido, liberada quando o pedido é quitado.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <FormLabel>Ativo</FormLabel>
                <FormDescription className="text-xs">Disponível para atribuição em pedidos.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className="sticky bottom-0 w-full sm:w-auto" type="submit" loading={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
