import assert from 'node:assert/strict';
import { test } from 'node:test';
import { awaitingReply, firstName, nextDispatchState, normalizePhone, renderTemplate, whatsappLink } from './rules';

const t = (s: string) => new Date(`2026-10-${s}T12:00:00-03:00`);

test('primeiro nome ignora o produto salvo no nome', () => {
  assert.equal(firstName('Haste 2 7/8 Face'), 'Face');
  assert.equal(firstName('Rosca Ivomar'), 'Ivomar');
  assert.equal(firstName('ILMARA Morais'), 'Ilmara');
  assert.equal(firstName('Maquina 100m'), 'tudo bem');
  assert.equal(renderTemplate('Fala, {nome}!', 'Izaldo Cabecote 15k'), 'Fala, Izaldo!');
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
