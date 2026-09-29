// Guardas de segurança verificadas no código-fonte: quebram o `npm test` se
// alguém criar uma página do admin ou uma Server Action sem checar o login.
// Não dependemos só do proxy.ts (já houve CVE de bypass do proxy no Next).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p: string) => p.slice(ROOT.length + 1);

test('toda página do admin (menos o login) exige sessão no servidor', () => {
  const pages = walk(join(ROOT, 'app/admin')).filter((p) => p.endsWith('page.tsx') && !p.endsWith('admin/login/page.tsx'));
  assert.ok(pages.length > 20, 'encontrou as páginas do admin');
  const unguarded = pages.filter((p) => !/await requireAdmin\(\)/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(unguarded.map(rel), []);
});

/** Actions públicas de propósito (formulários abertos do site). */
const PUBLIC_ACTIONS = new Set(['app/(public)/contato/_actions.ts::submitContact']);

test('toda Server Action checa autenticação (ou está na lista de públicas)', () => {
  const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components')), ...walk(join(ROOT, 'lib'))]
    .filter((p) => /\.(ts|tsx)$/.test(p) && /^['"]use server['"]/.test(readFileSync(p, 'utf8')));
  const missing: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const re = /export async function (\w+)\s*\(/g;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const rest = src.slice(m.index + m[0].length);
      const next = rest.search(/\nexport /);
      const head = (next === -1 ? rest : rest.slice(0, next)).slice(0, 700);
      const key = `${rel(f)}::${m[1]}`;
      if (!/requireAdmin\(|requireCustomer\(|isAuthenticated\(/.test(head) && !PUBLIC_ACTIONS.has(key)) missing.push(key);
    }
    // Só funções async podem ser exportadas de 'use server'; qualquer outra coisa é suspeita
    assert.ok(!/^export (const|let|function) /m.test(src), `${rel(f)} exporta algo que não é async function`);
  }
  assert.deepEqual(missing, []);
});

test('nenhuma variável secreta tem prefixo NEXT_PUBLIC_ (iria para o navegador)', () => {
  const src = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib')), ...walk(join(ROOT, 'components'))]
    .filter((p) => /\.(ts|tsx)$/.test(p)).map((p) => readFileSync(p, 'utf8')).join('\n');
  const publicVars = new Set(src.match(/NEXT_PUBLIC_[A-Z_]+/g) ?? []);
  const secretish = [...publicVars].filter((v) => /KEY|SECRET|TOKEN|PASSWORD|DATABASE|PRIVATE/.test(v));
  assert.deepEqual(secretish, []);
});

test('módulos com segredos são server-only (import no cliente quebra o build)', () => {
  for (const f of ['lib/db.ts', 'lib/asaas.ts', 'lib/auth.ts', 'lib/email.ts', 'lib/customer-auth.ts']) {
    assert.match(readFileSync(join(ROOT, f), 'utf8'), /^import 'server-only';/m, f);
  }
});
