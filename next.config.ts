import type { NextConfig } from 'next';

// Cabeçalhos de segurança em todas as respostas. A CSP é propositalmente
// estrutural (sem restringir scripts, que o Next injeta inline): bloqueia ser
// embutido em outro site, <base> e <object> injetados e envio de formulário
// para outro domínio.
// HSTS e upgrade para HTTPS só onde há HTTPS (Vercel); em `next start` local
// (http://localhost) eles quebrariam o carregamento.
const onHttps = Boolean(process.env.VERCEL);
const securityHeaders = [
  ...(onHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  {
    key: 'Content-Security-Policy',
    value: `base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'${onHttps ? '; upgrade-insecure-requests' : ''}`,
  },
];

// Áreas privadas: fora dos buscadores e sem cache compartilhado
const privateHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Cache-Control', value: 'private, no-store' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: privateHeaders },
      { source: '/conta/:path*', headers: privateHeaders },
      // O link público do pedido carrega um token na URL: nunca enviar como Referer
      { source: '/pedido/:path*', headers: [...privateHeaders, { key: 'Referrer-Policy', value: 'no-referrer' }] },
    ];
  },
  images: {
    remotePatterns: [
      // Vercel Blob (produção)
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      // Supabase Storage (alternativa futura)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    // Se uma página falhar ao gerar (ex.: banco lento), tenta de novo antes de falhar o build
    staticGenerationRetryCount: 2,
  },
  turbopack: {
    // Silencia o aviso de workspace root
    root: __dirname,
  },
};

export default nextConfig;
