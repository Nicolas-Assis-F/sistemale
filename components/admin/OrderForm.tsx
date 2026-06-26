'use client';

import { useRef, useState } from 'react';
import type { OrderStatus } from '@prisma/client';
import { Plus, Trash2, Search, PackagePlus, FilePlus2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
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

function parsePriceToCents(value: string): number {
  const n = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const NEW_CUSTOMER = '__new__';

export function OrderForm({ products, customers, employees, defaultValues, action, submitLabel = 'Salvar Pedido' }: Props) {
  const idCounter = useRef(0);
  const newKey = () => `i${idCounter.current++}`;

  const [customerId, setCustomerId] = useState(defaultValues?.customerId || NEW_CUSTOMER);
  const [newCustomer, setNewCustomer] = useState({
    name: '', doc: '', phone: '', email: '', address: '', city: '', state: '', zip: '', contact: '',
  });

  const [clientRef, setClientRef] = useState(defaultValues?.clientRef ?? '');
  const [status, setStatus] = useState<OrderStatus>(defaultValues?.status ?? 'ORCAMENTO');
  const [employeeId, setEmployeeId] = useState(defaultValues?.employeeId || '');
  const [paymentTerms, setPaymentTerms] = useState(defaultValues?.paymentTerms ?? '');
  const [paymentMethod, setPaymentMethod] = useState(defaultValues?.paymentMethod ?? '');
  const [deliveryDate, setDeliveryDate] = useState(defaultValues?.deliveryDate ?? '');
  const [notes, setNotes] = useState(defaultValues?.notes ?? '');

  const [items, setItems] = useState<OrderItemState[]>(
    () => (defaultValues?.items ?? []).map((i) => ({ ...i, key: newKey() }))
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (key: string, patch: Partial<OrderItemState>) =>
    setItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) => setItems((arr) => arr.filter((it) => it.key !== key));

  function addFreeItem() {
    setItems((arr) => [...arr, { key: newKey(), productId: null, name: '', description: '', quantity: 1, priceReais: '', icmsPercent: 0 }]);
  }

  function addPickedProducts() {
    const toAdd = products
      .filter((p) => picked.has(p.id))
      .map((p) => ({
        key: newKey(),
        productId: p.id,
        name: p.name,
        description: '',
        quantity: 1,
        priceReais: (p.priceCents / 100).toFixed(2).replace('.', ','),
        icmsPercent: 0,
      }));
    setItems((arr) => [...arr, ...toAdd]);
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

  const total = items.reduce((sum, it) => sum + it.quantity * parsePriceToCents(it.priceReais), 0);

  const filteredProducts = filter
    ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(filter.toLowerCase()))
    : products;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (items.length === 0) { setError('Adicione ao menos um item ao pedido.'); return; }
    if (customerId === NEW_CUSTOMER && !newCustomer.name.trim()) { setError('Selecione um cliente ou informe o nome do novo cliente.'); return; }
    if (items.some((it) => !it.name.trim())) { setError('Todos os itens precisam de uma descrição.'); return; }

    setSaving(true);
    const fd = new FormData();
    if (customerId !== NEW_CUSTOMER) {
      fd.append('customerId', customerId);
    } else {
      fd.append('customerName', newCustomer.name);
      fd.append('customerDoc', newCustomer.doc);
      fd.append('customerPhone', newCustomer.phone);
      fd.append('customerEmail', newCustomer.email);
      fd.append('customerAddress', newCustomer.address);
      fd.append('customerCity', newCustomer.city);
      fd.append('customerState', newCustomer.state);
      fd.append('customerZip', newCustomer.zip);
      fd.append('customerContact', newCustomer.contact);
    }
    fd.append('clientRef', clientRef);
    fd.append('status', status);
    fd.append('employeeId', employeeId);
    fd.append('paymentTerms', paymentTerms);
    fd.append('paymentMethod', paymentMethod);
    fd.append('deliveryDate', deliveryDate);
    fd.append('notes', notes);
    fd.append('items', JSON.stringify(items.map((it) => ({
      productId: it.productId,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: parsePriceToCents(it.priceReais),
      icmsPercent: it.icmsPercent,
    }))));

    const res = await action(fd);
    if (res && typeof res === 'object' && 'error' in res) {
      setError('Verifique os dados do pedido e tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-24">
      {/* Cliente */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">Cliente</h2>
        <div className="max-w-md">
          <label className="mb-1.5 block text-sm font-medium">Selecionar cliente</label>
          <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? NEW_CUSTOMER)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_CUSTOMER}>+ Novo cliente</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {customerId === NEW_CUSTOMER && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input placeholder="Nome / Razão social *" value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />
            <Input placeholder="CNPJ / CPF" value={newCustomer.doc} onChange={(e) => setNewCustomer((c) => ({ ...c, doc: e.target.value }))} />
            <Input placeholder="Contato" value={newCustomer.contact} onChange={(e) => setNewCustomer((c) => ({ ...c, contact: e.target.value }))} />
            <Input placeholder="Telefone" value={newCustomer.phone} onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />
            <Input placeholder="E-mail" value={newCustomer.email} onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} />
            <Input placeholder="Endereço" value={newCustomer.address} onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))} className="sm:col-span-2" />
            <Input placeholder="Cidade" value={newCustomer.city} onChange={(e) => setNewCustomer((c) => ({ ...c, city: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="UF" value={newCustomer.state} onChange={(e) => setNewCustomer((c) => ({ ...c, state: e.target.value }))} />
              <Input placeholder="CEP" value={newCustomer.zip} onChange={(e) => setNewCustomer((c) => ({ ...c, zip: e.target.value }))} />
            </div>
          </div>
        )}
      </section>

      {/* Itens */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Itens do pedido</h2>
          <div className="flex gap-2">
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
              <Input className="pl-8" placeholder="Buscar produto..." value={filter} onChange={(e) => setFilter(e.target.value)} />
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
          {items.map((it) => (
            <div key={it.key} className="rounded-xl border border-border p-3">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-2">
                  <Input placeholder="Designação *" value={it.name} onChange={(e) => updateItem(it.key, { name: e.target.value })} />
                  <Input placeholder="Descrição (linha adicional)" value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Qtd.</label>
                      <Input type="number" min={1} value={it.quantity}
                        onChange={(e) => updateItem(it.key, { quantity: isNaN(e.target.valueAsNumber) ? 1 : Math.max(1, e.target.valueAsNumber) })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Preço unit. (R$)</label>
                      <Input inputMode="decimal" placeholder="0,00" value={it.priceReais}
                        onChange={(e) => updateItem(it.key, { priceReais: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">ICMS (%)</label>
                      <Input type="number" min={0} max={100} value={it.icmsPercent}
                        onChange={(e) => updateItem(it.key, { icmsPercent: isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber })} />
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(it.key)} className="mt-1 text-muted-foreground hover:text-destructive" aria-label="Remover item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-right text-xs text-muted-foreground">
                Subtotal: <span className="font-semibold text-foreground">{formatCurrency(it.quantity * parsePriceToCents(it.priceReais))}</span>
              </p>
            </div>
          ))}
          {items.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhum item. Adicione do catálogo ou um item livre.
            </p>
          )}
        </div>
      </section>

      {/* Dados do pedido */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">Dados do pedido</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as OrderStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Funcionário responsável</label>
            <Select value={employeeId || '__none__'} onValueChange={(v) => setEmployeeId(!v || v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ref. do cliente</label>
            <Input value={clientRef} onChange={(e) => setClientRef(e.target.value)} placeholder="Ex: Ivomar" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Data prevista de entrega</label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Condições de pagamento</label>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Promissória, à vista..." />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Forma de pagamento</label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Boleto, PIX..." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Observações</label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Rodapé sticky com total */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 supports-backdrop-filter:backdrop-blur-md md:left-60">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Total do pedido</p>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Salvando...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
