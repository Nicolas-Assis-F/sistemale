import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_SESSION_SECONDS, createAdminToken, passwordMatches, verifyAdminToken } from './admin-session';

beforeEach(() => {
  process.env.AUTH_COOKIE_SECRET = 'x'.repeat(64);
  process.env.ADMIN_PASSWORD = 'senha-forte-de-teste';
});

test('token válido é aceito; adulterado, não', async () => {
  const t = await createAdminToken();
  assert.equal(await verifyAdminToken(t), true);
  const parts = t.split('.');
  assert.equal(await verifyAdminToken([...parts.slice(0, 3), parts[3].replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))].join('.')), false);
  // Estender a validade sem reassinar não funciona
  assert.equal(await verifyAdminToken([parts[0], String(Number(parts[1]) + 999_999), parts[2], parts[3]].join('.')), false);
  assert.equal(await verifyAdminToken('qualquer.coisa'), false);
  assert.equal(await verifyAdminToken(undefined), false);
});

test('expira no prazo', async () => {
  const now = Date.now();
  const t = await createAdminToken(now);
  assert.equal(await verifyAdminToken(t, now + (ADMIN_SESSION_SECONDS - 60) * 1000), true);
  assert.equal(await verifyAdminToken(t, now + (ADMIN_SESSION_SECONDS + 1) * 1000), false);
});

test('trocar a senha do admin derruba as sessões abertas', async () => {
  const t = await createAdminToken();
  process.env.ADMIN_PASSWORD = 'senha-nova';
  assert.equal(await verifyAdminToken(t), false);
});

test('trocar o segredo do cookie derruba as sessões abertas', async () => {
  const t = await createAdminToken();
  process.env.AUTH_COOKIE_SECRET = 'y'.repeat(64);
  assert.equal(await verifyAdminToken(t), false);
});

test('sem segredo forte, nada é aceito (falha fechada)', async () => {
  const t = await createAdminToken();
  process.env.AUTH_COOKIE_SECRET = 'curto';
  assert.equal(await verifyAdminToken(t), false);
  await assert.rejects(createAdminToken());
});

test('comparação de senha', async () => {
  assert.equal(await passwordMatches('senha-forte-de-teste'), true);
  assert.equal(await passwordMatches('senha-forte-de-test'), false);
  assert.equal(await passwordMatches(''), false);
  process.env.ADMIN_PASSWORD = '';
  assert.equal(await passwordMatches(''), false, 'sem senha configurada ninguém entra');
});

test('limite de tentativas de login por IP', async () => {
  const { loginBlockedFor, registerLoginFailure, clearLoginFailures } = await import('./login-throttle');
  const ip = '203.0.113.7';
  const now = Date.now();
  for (let i = 0; i < 4; i++) registerLoginFailure(ip, now);
  assert.equal(loginBlockedFor(ip, now), 0, '4 erros ainda não bloqueiam');
  registerLoginFailure(ip, now);
  assert.ok(loginBlockedFor(ip, now) > 0, '5º erro bloqueia');
  assert.equal(loginBlockedFor('198.51.100.1', now), 0, 'outro IP não é afetado');
  assert.equal(loginBlockedFor(ip, now + 16 * 60_000), 0, 'libera depois da janela');
  clearLoginFailures(ip);
  assert.equal(loginBlockedFor(ip, now), 0);
});
