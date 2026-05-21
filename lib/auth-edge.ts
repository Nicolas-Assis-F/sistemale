// Versão Edge-compatível para uso no middleware (sem node:crypto)
async function hmacEdge(value: string): Promise<string> {
  const secret = process.env.AUTH_COOKIE_SECRET ?? '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aKey = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bKey = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const dummy = encoder.encode('dummy');
  const [aSig, bSig] = await Promise.all([
    crypto.subtle.sign('HMAC', aKey, dummy),
    crypto.subtle.sign('HMAC', bKey, dummy),
  ]);
  const aArr = new Uint8Array(aSig);
  const bArr = new Uint8Array(bSig);
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}

export async function verifyAuthCookieEdge(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return false;
  const token = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const expected = await hmacEdge(token);
  return timingSafeEqual(sig, expected);
}
