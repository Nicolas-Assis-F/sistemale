// Leitura do XML de NF-e de COMPRA (modelo 55), sem banco. O XML é a fonte
// confiável (o DANFE em PDF é só representação). Custo efetivo de cada item:
//   vProd + vFrete + vSeg + vOutro − vDesc + vIPI + vICMSST
// No Simples Nacional não há crédito de ICMS/IPI: tudo isso vira custo.
import { XMLParser } from 'fast-xml-parser';

export type NfeItem = {
  position: number; code: string; description: string; ncm: string; cfop: string; unit: string;
  quantity: number; unitPriceCents: number; totalCents: number;
  ipiCents: number; icmsCents: number; icmsStCents: number; extraCents: number; discountCents: number;
  /** Custo real do item (com IPI, ST, frete e despesas rateadas na nota, menos desconto) */
  effectiveTotalCents: number;
  effectiveUnitCostCents: number;
};

export type NfeDoc = {
  accessKey: string; number: string; series: string; issuedAt: Date | null;
  supplierDoc: string; supplierName: string; supplierState: string;
  recipientDoc: string; totalCents: number; items: NfeItem[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false, // NCM, CNPJ e códigos com zeros à esquerda ficam como texto
  parseAttributeValue: false,
  processEntities: false, // não expande entidades (proteção contra XML malicioso)
  isArray: (name) => name === 'det',
});

type Node = Record<string, unknown>;
const obj = (v: unknown): Node => (v && typeof v === 'object' ? (v as Node) : {});
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const num = (v: unknown) => {
  const n = Number.parseFloat(str(v));
  return Number.isFinite(n) ? n : 0;
};
const cents = (v: unknown) => Math.round(num(v) * 100);

/** Primeiro subgrupo de ICMS (ICMS00, ICMS10, ICMSSN101…) ou de IPI (IPITrib). */
function firstChild(v: unknown): Node {
  const o = obj(v);
  const key = Object.keys(o).find((k) => !k.startsWith('@_'));
  return key ? obj(o[key]) : {};
}

export class NfeParseError extends Error {}

export function parseNfeXml(xml: string): NfeDoc {
  if (xml.length > 3_000_000) throw new NfeParseError('Arquivo grande demais para uma NF-e.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new NfeParseError('XML com DOCTYPE/ENTITY não é aceito.');
  let root: Node;
  try {
    root = parser.parse(xml) as Node;
  } catch {
    throw new NfeParseError('Não é um XML válido.');
  }
  const nfe = obj(obj(root.nfeProc).NFe ?? root.NFe);
  const inf = obj(nfe.infNFe);
  if (!Object.keys(inf).length) throw new NfeParseError('XML não é de uma NF-e (infNFe não encontrado).');

  const ide = obj(inf.ide);
  if (str(ide.mod) && str(ide.mod) !== '55') throw new NfeParseError('Só NF-e modelo 55 (não NFC-e).');
  const idKey = str(inf['@_Id']).replace(/^NFe/, '');
  const protKey = str(obj(obj(obj(root.nfeProc).protNFe).infProt).chNFe);
  const accessKey = /^\d{44}$/.test(protKey) ? protKey : idKey;
  if (!/^\d{44}$/.test(accessKey)) throw new NfeParseError('Chave de acesso inválida.');

  const emit = obj(inf.emit);
  const dest = obj(inf.dest);
  const total = obj(obj(inf.total).ICMSTot);
  const dets = (inf.det as unknown[] | undefined) ?? [];
  if (!dets.length) throw new NfeParseError('NF-e sem itens.');

  const items: NfeItem[] = dets.map((d, i) => {
    const det = obj(d);
    const prod = obj(det.prod);
    const imp = obj(det.imposto);
    const icms = firstChild(imp.ICMS);
    const ipi = obj(obj(imp.IPI).IPITrib);
    const quantity = num(prod.qCom);
    const totalCents = cents(prod.vProd);
    const extraCents = cents(prod.vFrete) + cents(prod.vSeg) + cents(prod.vOutro);
    const discountCents = cents(prod.vDesc);
    const ipiCents = cents(ipi.vIPI);
    const icmsStCents = cents(icms.vICMSST);
    const effectiveTotalCents = totalCents + extraCents - discountCents + ipiCents + icmsStCents;
    return {
      position: Number(str(det['@_nItem'])) || i + 1,
      code: str(prod.cProd), description: str(prod.xProd), ncm: str(prod.NCM), cfop: str(prod.CFOP),
      unit: str(prod.uCom).toUpperCase(), quantity,
      unitPriceCents: cents(prod.vUnCom), totalCents,
      ipiCents, icmsCents: cents(icms.vICMS), icmsStCents, extraCents, discountCents,
      effectiveTotalCents,
      effectiveUnitCostCents: quantity > 0 ? Math.round(effectiveTotalCents / quantity) : 0,
    };
  });

  const dh = str(ide.dhEmi) || str(ide.dEmi);
  const issuedAt = dh ? new Date(dh) : null;
  return {
    accessKey,
    number: str(ide.nNF), series: str(ide.serie),
    issuedAt: issuedAt && !Number.isNaN(issuedAt.getTime()) ? issuedAt : null,
    supplierDoc: str(emit.CNPJ) || str(emit.CPF), supplierName: str(emit.xNome), supplierState: str(obj(emit.enderEmit).UF),
    recipientDoc: str(dest.CNPJ) || str(dest.CPF),
    totalCents: cents(total.vNF),
    items,
  };
}

export { isKgUnit } from './steel';
