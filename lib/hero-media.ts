import 'server-only';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_BYTES = 4 * 1024 * 1024;
export type HeroMedia = { poster: string; sources: { src: string; type: string }[] };

/** Arquivos opcionais, verificados no servidor; nenhum pedido a URLs inexistentes. */
export async function getHeroMedia(publicDir = join(process.cwd(), 'public')): Promise<HeroMedia | null> {
  async function available(name: string) {
    try {
      const file = await stat(join(publicDir, 'media', name));
      if (!file.isFile() || file.size === 0) return false;
      if (file.size > MAX_BYTES) { console.warn(`Mídia da home ignorada: ${name} excede 4 MB.`); return false; }
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Não foi possível verificar a mídia da home.', error);
      return false;
    }
  }
  const [poster, webm, mp4] = await Promise.all(['hero-poster.webp', 'hero.webm', 'hero.mp4'].map(available));
  if (!poster || (!webm && !mp4)) return null;
  return {
    poster: '/media/hero-poster.webp',
    sources: [
      ...(webm ? [{ src: '/media/hero.webm', type: 'video/webm' }] : []),
      ...(mp4 ? [{ src: '/media/hero.mp4', type: 'video/mp4' }] : []),
    ],
  };
}
