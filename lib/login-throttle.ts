// Sem dependências do Next: testável e usável na rota de login.
// ─── Limite de tentativas de login (por IP) ─────────────────────────────────────
// Em memória por instância: na Vercel cada instância conta separado, então é uma
// barreira, não uma garantia. Junto do atraso por erro, torna força bruta inviável.
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; resetAt: number }>();

export function loginBlockedFor(ip: string, now = Date.now()) {
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - now) / 1000) : 0;
}

export function registerLoginFailure(ip: string, now = Date.now()) {
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;
  if (failures.size > 5_000) {
    for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k);
  }
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
