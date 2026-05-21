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
  turbopack: {
    // Silencia o aviso de workspace root
    root: __dirname,
  },
};

export default nextConfig;
