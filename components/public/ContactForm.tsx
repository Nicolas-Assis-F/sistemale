'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Send } from 'lucide-react';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { submitContact } from '@/app/(public)/contato/_actions';

const schema = z.object({
  name: z.string().min(1, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, 'Escreva sua mensagem'),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError('');
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v ?? ''));
    const res = await submitContact(fd);
    if (res.ok) {
      setSent(true);
      form.reset();
    } else {
      setServerError('Não foi possível enviar. Tente novamente ou use o WhatsApp.');
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="text-lg font-semibold">Mensagem enviada!</h3>
        <p className="text-sm text-muted-foreground">
          Obrigado pelo contato. Nossa equipe responderá em breve.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl><Input {...field} placeholder="Seu nome" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (opcional)</FormLabel>
                <FormControl><Input {...field} placeholder="(62) 9 0000-0000" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input {...field} type="email" placeholder="voce@email.com" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assunto (opcional)</FormLabel>
              <FormControl><Input {...field} placeholder="Orçamento, suporte, dúvida..." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl><Textarea {...field} rows={5} placeholder="Como podemos ajudar?" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full gap-2">
          <Send className="h-4 w-4" />
          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar mensagem'}
        </Button>
      </form>
    </Form>
  );
}
