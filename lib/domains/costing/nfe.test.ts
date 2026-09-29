import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKgUnit, NfeParseError, parseNfeXml } from './nfe';

const KEY = '52260911222333000181550010000012341000012345';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe${KEY}" versao="4.00">
    <ide><mod>55</mod><serie>1</serie><nNF>1234</nNF><dhEmi>2026-09-20T10:15:00-03:00</dhEmi></ide>
    <emit><CNPJ>11222333000181</CNPJ><xNome>Aços Goiás Ltda</xNome><enderEmit><UF>GO</UF></enderEmit></emit>
    <dest><CNPJ>55011626000150</CNPJ></dest>
    <det nItem="1">
      <prod><cProd>0045</cProd><xProd>BARRA REDONDA SAE 1045 3.1/2"</xProd><NCM>72142000</NCM><CFOP>5102</CFOP>
        <uCom>KG</uCom><qCom>146.2000</qCom><vUnCom>9.0000000000</vUnCom><vProd>1315.80</vProd><vFrete>30.00</vFrete><vDesc>15.80</vDesc></prod>
      <imposto><ICMS><ICMS00><vICMS>157.90</vICMS></ICMS00></ICMS><IPI><IPITrib><vIPI>65.79</vIPI></IPITrib></IPI></imposto>
    </det>
    <det nItem="2">
      <prod><cProd>T278</cProd><xProd>TUBO SCH80 2.7/8"</xProd><NCM>07304390</NCM><CFOP>5102</CFOP>
        <uCom>PC</uCom><qCom>2</qCom><vUnCom>410.00</vUnCom><vProd>820.00</vProd></prod>
      <imposto><ICMS><ICMSSN202><vICMSST>41.00</vICMSST></ICMSSN202></ICMS></imposto>
    </det>
    <total><ICMSTot><vNF>2257.79</vNF></ICMSTot></total>
  </infNFe></NFe>
  <protNFe><infProt><chNFe>${KEY}</chNFe></infProt></protNFe>
</nfeProc>`;

test('lê cabeçalho, fornecedor e itens da NF-e', () => {
  const n = parseNfeXml(xml);
  assert.equal(n.accessKey, KEY);
  assert.equal(n.number, '1234');
  assert.equal(n.supplierDoc, '11222333000181');
  assert.equal(n.supplierName, 'Aços Goiás Ltda');
  assert.equal(n.supplierState, 'GO');
  assert.equal(n.totalCents, 225779);
  assert.equal(n.issuedAt?.toISOString(), '2026-09-20T13:15:00.000Z');
  assert.equal(n.items.length, 2);
});

test('custo efetivo do item: IPI, frete e desconto; NCM com zero à esquerda preservado', () => {
  const [barra, tubo] = parseNfeXml(xml).items;
  assert.equal(barra.ncm, '72142000');
  assert.equal(barra.quantity, 146.2);
  // 1315,80 + 30 frete − 15,80 desconto + 65,79 IPI = 1395,79
  assert.equal(barra.effectiveTotalCents, 139579);
  assert.equal(barra.effectiveUnitCostCents, 955); // R$ 9,55/kg
  assert.equal(tubo.ncm, '07304390');
  assert.equal(tubo.icmsStCents, 4100);
  assert.equal(tubo.effectiveUnitCostCents, 43050);
});

test('recusa XML que não é NF-e, com DOCTYPE/ENTITY ou chave inválida', () => {
  assert.throws(() => parseNfeXml('<nota>oi</nota>'), NfeParseError);
  assert.throws(() => parseNfeXml('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><x>&a;</x>'), /DOCTYPE/);
  assert.throws(() => parseNfeXml(xml.replaceAll(KEY, '123')), /Chave/);
  assert.throws(() => parseNfeXml('não é xml <<<'), NfeParseError);
});

test('unidades de quilo', () => {
  for (const u of ['KG', 'kg', 'KGS', 'Kg.']) assert.equal(isKgUnit(u), true, u);
  for (const u of ['PC', 'UN', 'BR', 'M']) assert.equal(isKgUnit(u), false, u);
});
