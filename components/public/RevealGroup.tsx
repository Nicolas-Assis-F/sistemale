'use client';

import { Children } from 'react';
import { m, type Variants } from 'motion/react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/**
 * Container para grids repetidos (cards de categoria/produto/serviço/garantia):
 * anima a entrada de cada filho direto em cascata (`staggerChildren`) quando
 * o grupo entra na viewport. Cada filho direto ganha seu próprio `m.div`
 * de fade+translate — o filho original é renderizado dentro, sem alterar
 * sua própria marcação.
 */
export function RevealGroup({ children, className }: Props) {
  return (
    <m.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
    >
      {Children.map(children, (child, index) => (
        <m.div variants={item} key={index}>
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
