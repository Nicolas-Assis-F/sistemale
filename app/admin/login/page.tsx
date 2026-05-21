'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Erro ao fazer login.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm">
        {/* Logo centralizada */}
        <div className="flex justify-center mb-8">
          <Image
            src="/LOGO.png"
            alt="L & E Torneadora"
            width={180}
            height={54}
            className="h-14 w-auto object-contain brightness-0 invert"
            priority
          />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <h1 className="text-xl font-bold mb-1 text-center">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center">Painel Administrativo</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-sidebar-foreground/30 mt-6">
          L E TORNEADORA LTDA - ME · CNPJ 44.492.124/0001-07
        </p>
      </div>
    </div>
  );
}
