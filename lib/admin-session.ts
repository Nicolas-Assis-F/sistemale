// Token da sessão do painel (cookie admin_auth). Implementação única em WebCrypto:
// roda no proxy e no servidor. Formato: v1.<expiraEm>.<nonce>.<assinatura>
//  - a validade vai assinada dentro do token (não depende do maxAge do cookie);
//  - a chave de assinatura mistura AUTH_COOKIE_SECRET com o hash da ADMIN_PASSWORD:
//    trocar a senha invalida todas as sessões abertas;
//  - sem segredo configurado (ou curto demais), nada é aceito (falha fechada).

export const ADMIN_COOKIE = 'admin_auth';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 3; // 3 dias

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function signingKey() {
  const secret = process.env.AUTH_COOKIE_SECRET ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (secret.length < 32 || !password) return null;
  const pwHash = hex(await crypto.subtle.digest('SHA-256', enc.encode(password)));
  return crypto.subtle.importKey('raw', enc.encode(`${secret}|${pwHash}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(payload: string) {
  const key = await signingKey();
  if (!key) return null;
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

/** Comparação em tempo constante para strings de mesmo tamanho. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminToken(now = Date.now()) {
  const exp = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS;
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload = `v1.${exp}.${nonce}`;
  const sig = await sign(payload);
  if (!sig) throw new Error('AUTH_COOKIE_SECRET (32+ caracteres) e ADMIN_PASSWORD são obrigatórios.');
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(value: string | undefined | null, now = Date.now()) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;
  const expected = await sign(parts.slice(0, 3).join('.'));
  return expected !== null && safeEqual(parts[3], expected);
}

/** Compara a senha digitada com ADMIN_PASSWORD sem vazar tamanho nem conteúdo pelo tempo. */
export async function passwordMatches(provided: string) {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return safeEqual(hex(a), hex(b));
}
