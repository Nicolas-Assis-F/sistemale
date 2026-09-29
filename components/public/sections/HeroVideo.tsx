'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { HeroMedia } from '@/lib/hero-media';

/** O celular e quem reduz movimentos recebem somente o pôster, sem baixar vídeo. */
export function HeroVideo({ media }: { media: HeroMedia }) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const desktop = matchMedia('(min-width: 768px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => setEnabled(desktop.matches && !reduced.matches && visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    if (container.current) observer.observe(container.current);
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => { observer.disconnect(); desktop.removeEventListener('change', update); reduced.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (!video.current) return;
    if (paused) video.current.pause();
    else void video.current.play().catch(() => setPaused(true));
  }, [enabled, paused]);

  return <>
    <div ref={container} className="le-hero-video" aria-hidden="true">
      {/* Imagem nativa: pôster local já otimizado em WebP. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.poster} alt="" className="le-hero-video-poster" />
      {enabled && !failed && <video ref={video} muted playsInline loop autoPlay preload="none" poster={media.poster} tabIndex={-1} onError={() => setFailed(true)}>
        {media.sources.map((source) => <source key={source.src} {...source} />)}
      </video>}
      <div className="le-hero-video-shade" />
    </div>
    {enabled && !failed && <button type="button" onClick={() => setPaused((value) => !value)} className="le-hero-video-control" aria-label={paused ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo'}>
      {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
    </button>}
  </>;
}
