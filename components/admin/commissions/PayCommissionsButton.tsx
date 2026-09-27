'use client';

import { Button } from '@/components/ui/button';

import { useState, useTransition, type FormEvent } from 'react';
import { Banknote, Copy, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { payEmployeeCommissions } from '@/app/admin/comissoes/_actions';
import { toast } from '../toast';

const inputCls = 'mt-1.5 h-10 w-full rounded-xl border border-le-line bg-white px-3 text-sm outline-none focus:border-le-blue';

/** Registra o pagamento de todas as comissões liberadas do funcionário. */
export function PayCommissionsButton({ employeeId, employeeName, amountCents, count, pixKey }: {
  employeeId: string; employeeName: string; amountCents: number; count: number; pixKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    start(async () => {
      const res = await payEmployeeCommissions(employeeId, fd);
      if ('error' in res) return setError(res.error);
      toast(res.message ?? 'Pagamento registrado');
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={amountCents <= 0}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-le-ink px-3 text-xs font-semibold text-white transition-colors hover:bg-le-ink disabled:cursor-not-allowed disabled:bg-le-line disabled:text-le-muted"
      >
        <Banknote className="h-3.5 w-3.5" /> {amountCents > 0 ? `Pagar ${formatCurrency(amountCents)}` : 'Nada a pagar'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar comissões — {employeeName}</DialogTitle>
            <DialogDescription>{count} comissão(ões) liberada(s) · total {formatCurrency(amountCents)}. Faça o pagamento e registre aqui para baixar do saldo.</DialogDescription>
          </DialogHeader>
          {pixKey && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-le-subtle px-3 py-2.5 text-xs">
              <span className="min-w-0"><span className="text-le-muted">Chave PIX: </span><span className="font-mono">{pixKey}</span></span>
              <button type="button" onClick={() => navigator.clipboard.writeText(pixKey).then(() => toast('Chave PIX copiada'))} className="shrink-0 text-le-blue" aria-label="Copiar chave PIX">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-le-text">
                Data do pagamento
                <input name="paidAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
              </label>
              <label className="block text-xs font-medium text-le-text">
                Forma
                <select name="method" defaultValue="PIX" className={inputCls}>
                  <option>PIX</option><option>Transferência</option><option>Dinheiro</option><option>Folha de pagamento</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-medium text-le-text">
              Observação (opcional)
              <input name="notes" maxLength={300} placeholder="Ex.: comprovante 1234" className={inputCls} />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <Button type="submit" loading={pending} className="w-full">
               Confirmar pagamento de {formatCurrency(amountCents)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
