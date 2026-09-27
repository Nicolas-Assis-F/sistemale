import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
