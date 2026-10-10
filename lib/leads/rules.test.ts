import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROMO_HASTES_TEMPLATE, awaitingReply, firstName, nextDispatchState, normalizePhone, renderTemplate, templateVersions, whatsappLink } from './rules';

const t = (s: string) => new Date(`2026-10-${s}T12:00:00-03:00`);

test('primeiro nome ignora o produto salvo no nome', () => {
  assert.equal(firstName('Haste 2 7/8 Face'), 'tudo bem');
  assert.equal(firstName('Maquina 100m Facebook'), 'tudo bem');
  assert.equal(firstName('Compra Maquina Valdivino'), 'Valdivino');
  assert.equal(firstName('Rosca Ivomar'), 'Ivomar');
  assert.equal(firstName('ILMARA Morais'), 'Ilmara');
  assert.equal(firstName('Maquina 100m'), 'tudo bem');
  assert.equal(renderTemplate('Fala, {nome}!', 'Izaldo Cabecote 15k'), 'Fala, Izaldo!');
  assert.equal(firstName('Compra Umaquina'), 'tudo bem');
  assert.equal(firstName('Cabeçote 150m Com Mesa'), 'tudo bem');
  assert.equal(firstName('José Cavalcante Alencar Cabeçes/ponteiras'), 'José');
  assert.equal(firstName('Sapuka Poço'), 'Sapuka');
  assert.equal(firstName('🦍 (indicado por Cleiton de Brasília)'), 'tudo bem');
});

test('mensagem varia entre versões e trechos', () => {
  const tpl = '[Oi|Fala], {nome}! A\n---\nOpa {nome}, B';
  assert.equal(templateVersions(tpl).length, 2);
  assert.equal(renderTemplate(tpl, 'Rosca Ivomar', () => 0), 'Oi, Ivomar! A');
  assert.equal(renderTemplate(tpl, 'Rosca Ivomar', () => 0.99), 'Opa Ivomar, B');
  assert.equal(templateVersions(PROMO_HASTES_TEMPLATE).length, 5);
  const seen = new Set(Array.from({ length: 50 }, () => renderTemplate(PROMO_HASTES_TEMPLATE, 'Ilmara')));
  assert.ok(seen.size > 10);
  for (const m of seen) assert.ok(!/[[\]|{}]/.test(m), m);
});

test('telefone e link do WhatsApp', () => {
  assert.equal(normalizePhone('(62) 99123-4567'), '5562991234567');
  assert.equal(normalizePhone('5562991234567'), '5562991234567');
  assert.equal(whatsappLink('5562991234567', 'oi & tchau'), 'https://wa.me/5562991234567?text=oi%20%26%20tchau');
});

test('aguardando resposta só quando o contato falou por último', () => {
  assert.equal(awaitingReply({ lastInboundAt: t('08'), lastOutboundAt: t('07') }), true);
  assert.equal(awaitingReply({ lastInboundAt: t('07'), lastOutboundAt: t('08') }), false);
  assert.equal(awaitingReply({ lastInboundAt: null, lastOutboundAt: t('08') }), false);
});

test('status do disparo avança com a atividade e nunca volta', () => {
  const base = { status: 'PENDENTE' as const, createdAt: t('05'), sentAt: null };
  assert.equal(nextDispatchState(base, { lastOutboundAt: t('04'), lastInboundAt: null }), null);
  assert.deepEqual(nextDispatchState(base, { lastOutboundAt: t('06'), lastInboundAt: t('04') }), { status: 'ENVIADO', sentAt: t('06'), repliedAt: null });
  assert.deepEqual(nextDispatchState(base, { lastOutboundAt: t('06'), lastInboundAt: t('07') }), { status: 'RESPONDEU', sentAt: t('06'), repliedAt: t('07') });
  assert.equal(nextDispatchState({ ...base, status: 'RESPONDEU' }, { lastOutboundAt: t('09'), lastInboundAt: null }), null);
  assert.equal(nextDispatchState({ ...base, status: 'PULADO' }, { lastOutboundAt: t('09'), lastInboundAt: t('10') }), null);
});
