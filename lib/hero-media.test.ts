import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, truncate, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getHeroMedia } from './hero-media';

test('mídia da home exige pôster e vídeo de até 4 MB; ausência preserva a home', async () => {
  const root = await mkdtemp(join(tmpdir(), 'le-hero-'));
  try {
    assert.equal(await getHeroMedia(root), null);
    await mkdir(join(root, 'media'));
    const video = join(root, 'media/hero.mp4');
    await writeFile(video, 'video');
    assert.equal(await getHeroMedia(root), null);
    await writeFile(join(root, 'media/hero-poster.webp'), 'poster');
    await truncate(video, 4 * 1024 * 1024);
    assert.deepEqual((await getHeroMedia(root))?.sources, [{ src: '/media/hero.mp4', type: 'video/mp4' }]);
    await truncate(video, 4 * 1024 * 1024 + 1);
    assert.equal(await getHeroMedia(root), null);
    await writeFile(join(root, 'media/hero.webm'), 'video');
    assert.deepEqual((await getHeroMedia(root))?.sources, [{ src: '/media/hero.webm', type: 'video/webm' }]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
