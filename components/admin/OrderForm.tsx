'use client';

import { useState } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { OrderFormSection } from './orders/OrderFormSection';
import { OrderReview } from './orders/OrderReview';
import { toast } from './toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { OrderStatus } from '@prisma/client';
import { Plus, Trash2, Search, PackagePlus, FilePlus2 } from 'lucide-react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, parseCurrencyToCents, centsToCurrencyInput } from '@/lib/format';
import { ORDER_STATUS_ORDER, ORDER_STATUS_LABELS } from '@/lib/order-status';

interface CatalogProduct { id: string; name: string; sku: string; priceCents: number }
interface CustomerOpt { id: string; code: string; name: string }
interface EmployeeOpt { id: string; name: string }

export interface OrderItemState {
  key: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  priceReais: string;
  icmsPercent: number;
}

interface DefaultValues {
  customerId?: string;
  clientRef?: string;
  status?: OrderStatus;
  employeeId?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  deliveryDate?: string;
  notes?: string;
  items?: OrderItemState[];
}

interface Props {
  products: CatalogProduct[];
  customers: CustomerOpt[];
  employees: EmployeeOpt[];
  defaultValues?: DefaultValues;
  action: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
}

const NEW_CUSTOMER = '__new__';

const orderItemSchema = z.object({
  productId: z.string().nullable(),
  name: z.string().min(1, 'Designação obrigatória'),
  description: z.string(),
  quantity: z.number().int().min(1, 'Mínimo 1'),
  priceReais: z.string(),
  icmsPercent: z.number().int().min(0).max(100),
});

const orderFormSchema = z
  .object({
    customerId: z.string(),
    customerName: z.string(),
    customerDoc: z.string(),
    customerPhone: z.string(),
    customerEmail: z.string(),
    customerAddress: z.string(),
    customerCity: z.string(),
    customerState: z.string(),
    customerZip: z.string(),
    customerContact: z.string(),
    clientRef: z.string(),
    status: z.string(),
    employeeId: z.string(),
    paymentTerms: z.string(),
    paymentMethod: z.string(),
    deliveryDate: z.string(),
    notes: z.string(),
    items: z.array(orderItemSchema).min(1, 'Adicione ao menos um item ao pedido'),
  })
  .superRefine((data, ctx) => {
    if (data.customerId === NEW_CUSTOMER && !data.customerName.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecione um cliente ou informe o nome do novo cliente.',
        path: ['customerName'],
      });
    }
  });

type FormValues = z.infer<typeof orderFormSchema>;

export function OrderForm({ products, customers, employees, defaultValues, action, submitLabel = 'Salvar pedido' }: Props) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: defaultValues?.customerId || NEW_CUSTOMER,
      customerName: '',
      customerDoc: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerCity: '',
      customerState: '',
      customerZip: '',
      customerContact: '',
      clientRef: defaultValues?.clientRef ?? '',
      status: defaultValues?.status ?? 'ORCAMENTO',
      employeeId: defaultValues?.employeeId || '',
      paymentTerms: defaultValues?.paymentTerms ?? '',
      paymentMethod: defaultValues?.paymentMethod ?? '',
      deliveryDate: defaultValues?.deliveryDate ?? '',
      notes: defaultValues?.notes ?? '',
      items: (defaultValues?.items ?? []).map((it) => ({
        productId: it.productId,
        name: it.name,
        description: it.description,
        quantity: it.quantity,
        priceReais: it.priceReais,
        icmsPercent: it.icmsPercent,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const customerId = form.watch('customerId');
  const items = form.watch('items');

  const total = items.reduce((sum, it) => sum + it.quantity * parseCurrencyToCents(it.priceReais), 0);

  const filteredProducts = filter
    ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(filter.toLowerCase()))
    : products;

  function addFreeItem() {
    append({ productId: null, name: '', description: '', quantity: 1, priceReais: '', icmsPercent: 0 });
  }

  function addPickedProducts() {
    const toAdd = products
      .filter((p) => picked.has(p.id))
      .map((p) => ({
        productId: p.id,
        name: p.name,
        description: '',
        quantity: 1,
        priceReais: centsToCurrencyInput(p.priceCents),
        icmsPercent: 0,
      }));
    if (toAdd.length > 0) append(toAdd);
    setPicked(new Set());
    setPickerOpen(false);
    setFilter('');
  }

  function togglePicked(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(values: FormValues) {
    setFormError('');
    setSaving(true);

    const fd = new FormData();
    if (values.customerId !== NEW_CUSTOMER) {
      fd.append('customerId', values.customerId);
    } else {
      fd.append('customerName', values.customerName);
      fd.append('customerDoc', values.customerDoc);
      fd.append('customerPhone', values.customerPhone);
      fd.append('customerEmail', values.customerEmail);
      fd.append('customerAddress', values.customerAddress);
      fd.append('customerCity', values.customerCity);
      fd.append('customerState', values.customerState);
      fd.append('customerZip', values.customerZip);
      fd.append('customerContact', values.customerContact);
    }
    fd.append('clientRef', values.clientRef);
    fd.append('status', values.status);
    fd.append('employeeId', values.employeeId);
    fd.append('paymentTerms', values.paymentTerms);
    fd.append('paymentMethod', values.paymentMethod);
    fd.append('deliveryDate', values.deliveryDate);
    fd.append('notes', values.notes);
    fd.append('items', JSON.stringify(values.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: parseCurrencyToCents(it.priceReais),
      icmsPercent: it.icmsPercent,
    }))));

    try {
    const res = await action(fd);
    if (res && typeof res === 'object' && 'error' in res) {
      const fieldErrors = (res as { error: Record<string, string[] | undefined> }).error;
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          form.setError(field as keyof FormValues, { type: 'server', message: messages[0] });
        }
      });
      setFormError('Verifique os dados do pedido e tente novamente.');
      setSaving(false);
    }
    } catch (error) {
      unstable_rethrow(error);
      setFormError('Não foi possível salvar o pedido. Tente novamente.');
      toast('Não foi possível salvar o pedido.', 'error');
    } finally { setSaving(false); }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault(); if (!saving) event.currentTarget.requestSubmit();
        }
      }} className="space-y-6 pb-32">
        <nav aria-label="Seções do pedido" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {['Cliente', 'Itens', 'Condições', 'Revisão'].map((label, index) => <a key={label} href={`#${['cliente', 'itens', 'condicoes', 'revisao'][index]}`} className="rounded-xl border border-le-line bg-le-surface px-3 py-3 text-sm font-medium hover:border-le-blue">{index + 1}. {label}</a>)}
        </nav>
        {/* Cliente */}
        <OrderFormSection id="cliente">
          <h2 id="cliente-title" className="mb-4 font-heading text-lg font-medium">1. Cliente</h2>
          <div className="max-w-md">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar cliente</FormLabel>
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NEW_CUSTOMER)} items={[{ value: NEW_CUSTOMER, label: '+ Novo cliente' }, ...customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))]}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NEW_CUSTOMER}>+ Novo cliente</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {customerId === NEW_CUSTOMER && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="Nome / Razão social *" placeholder="Nome / Razão social *" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerDoc"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="CNPJ / CPF" placeholder="CNPJ / CPF" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerContact"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="Contato" placeholder="Contato" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="Telefone" placeholder="Telefone" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="E-mail" placeholder="E-mail" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormControl><Input aria-label="Endereço" placeholder="Endereço" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerCity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl><Input aria-label="Cidade" placeholder="Cidade" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="customerState"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Input aria-label="UF" placeholder="UF" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Input aria-label="CEP" placeholder="CEP" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </OrderFormSection>

        {/* Itens */}
        <OrderFormSection id="itens">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="itens-title" className="font-heading text-lg font-medium">2. Itens do pedido</h2>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPickerOpen((o) => !o)}>
                <PackagePlus className="h-4 w-4" /> Do catálogo
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addFreeItem}>
                <FilePlus2 className="h-4 w-4" /> Item livre
              </Button>
            </div>
          </div>

          {/* Seletor do catálogo (múltipla seleção) */}
          {pickerOpen && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Buscar produto no catálogo" className="pl-8" placeholder="Buscar produto..." value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePicked(p.id)} className="h-4 w-4 accent-primary" />
                    <span className="flex-1 text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.sku}</span>
                    <span className="w-20 text-right text-xs font-medium">{formatCurrency(p.priceCents)}</span>
                  </label>
                ))}
                {filteredProducts.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
              </div>
              <div className="mt-2 flex justify-end">
                <Button type="button" size="sm" className="gap-1.5" disabled={picked.size === 0} onClick={addPickedProducts}>
                  <Plus className="h-4 w-4" /> Adicionar {picked.size > 0 ? `(${picked.size})` : ''}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de itens */}
          <div className="space-y-3">
            {fields.map((field, index) => {
              const it = items[index];
              const subtotal = it ? it.quantity * parseCurrencyToCents(it.priceReais) : 0;
              const nameError = form.formState.errors.items?.[index]?.name;
              const quantityError = form.formState.errors.items?.[index]?.quantity;
              const icmsError = form.formState.errors.items?.[index]?.icmsPercent;
              return (
                <div key={field.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <div className="grid min-w-0 flex-1 gap-2">
                      <div>
                        <Input aria-label="Designação *" placeholder="Designação *" {...form.register(`items.${index}.name`)} />
                        {nameError && <p className="mt-1 text-xs text-destructive">{nameError.message}</p>}
                      </div>
                      <Input aria-label="Descrição (linha adicional)" placeholder="Descrição (linha adicional)" {...form.register(`items.${index}.description`)} />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Qtd.</label>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: qtyField }) => (
                              <Input
                                aria-label="Quantidade"
                                type="number"
                                min={1}
                                value={qtyField.value}
                                onChange={(e) => qtyField.onChange(Number.isNaN(e.target.valueAsNumber) ? 1 : Math.max(1, e.target.valueAsNumber))}
                              />
                            )}
                          />
                          {quantityError && <p className="mt-1 text-xs text-destructive">{quantityError.message}</p>}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Preço unit. (R$)</label>
                          <Input aria-label="Preço unitário em reais" inputMode="decimal" placeholder="0,00" {...form.register(`items.${index}.priceReais`)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">ICMS (%)</label>
                          <FormField
                            control={form.control}
                            name={`items.${index}.icmsPercent`}
                            render={({ field: icmsField }) => (
                              <Input
                                aria-invalid={!!icmsError}
                                aria-describedby={icmsError ? `icms-${index}-error` : undefined}
                                aria-label="ICMS (%)"
                                type="number"
                                min={0}
                                max={100}
                                value={icmsField.value}
                                onChange={(e) => icmsField.onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                              />
                            )}
                          />
                          {icmsError && <p id={`icms-${index}-error`} className="mt-1 text-xs text-destructive">{icmsError.message}</p>}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => remove(index)} className="mt-1 text-muted-foreground hover:text-destructive" aria-label="Remover item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    Subtotal: <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
                  </p>
                </div>
              );
            })}
            {fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nenhum item. Adicione do catálogo ou um item livre.
              </p>
            )}
            {form.formState.errors.items?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
            )}
          </div>
        </OrderFormSection>

        {/* Dados do pedido */}
        <OrderFormSection id="condicoes">
          <h2 id="condicoes-title" className="mb-4 font-heading text-lg font-medium">3. Condições</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} items={ORDER_STATUS_ORDER.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORDER_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário responsável</FormLabel>
                  <Select
                    items={[{ value: '__none__', label: 'Nenhum' }, ...employees.map((employee) => ({ value: employee.id, label: employee.name }))]}
                    value={field.value || '__none__'}
                    onValueChange={(v) => field.onChange(!v || v === '__none__' ? '' : v)}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ref. do cliente</FormLabel>
                  <FormControl><Input aria-label="Ex: Ivomar" placeholder="Ex: Ivomar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data prevista de entrega</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condições de pagamento</FormLabel>
                  <FormControl><Input aria-label="Promissória, à vista..." placeholder="Promissória, à vista..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <FormControl><Input aria-label="Boleto, PIX..." placeholder="Boleto, PIX..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </OrderFormSection>

        <OrderReview customer={customerId === NEW_CUSTOMER ? form.watch('customerName') : customers.find((customer) => customer.id === customerId)?.name ?? ''} items={items} terms={form.watch('paymentTerms')} method={form.watch('paymentMethod')} delivery={form.watch('deliveryDate')} total={total} />
        {formError && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
        )}

        {/* Rodapé sticky com total */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 supports-backdrop-filter:backdrop-blur-md md:left-60.5">
          <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Total do pedido</p>
              <p className="text-xl font-bold">{formatCurrency(total)}</p>
            </div>
            <Button type="submit" size="lg" loading={saving}>
              {saving ? 'Salvando...' : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
