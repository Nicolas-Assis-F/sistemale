import {
  ArrowDownToLine, Cog, Diameter, Fan, Gauge, Layers, Link2, RotateCw, Ruler, Settings2, Wrench,
  type LucideIcon, type LucideProps,
} from "lucide-react";

const SPEC_ICONS: [RegExp, LucideIcon][] = [
  [/torque/i, Gauge],
  [/capacidade|profundidade/i, ArrowDownToLine],
  [/rota[cç][aã]o|rpm/i, RotateCw],
  [/motor|acionamento/i, Cog],
  [/di[aâ]metro/i, Diameter],
  [/conex[aã]o|ponteira/i, Link2],
  [/redu[cç][aã]o/i, Settings2],
  [/l[aâ]mina|cortador/i, Fan],
  [/material|tratamento/i, Layers],
  [/comprimento|torre/i, Ruler],
];

/** Ícone semântico para uma chave de especificação técnica. */
export function SpecIcon({ specKey, ...props }: LucideProps & { specKey: string }) {
  const Icon = SPEC_ICONS.find(([re]) => re.test(specKey))?.[1] ?? Wrench;
  return <Icon aria-hidden {...props} />;
}

export function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.48-.23-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.23 9.44-9.45 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.64l6.04-1.58a11.33 11.33 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.37-11.37 0-3.03-1.18-5.89-3.34-8.04" />
    </svg>
  );
}
