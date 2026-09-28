import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBrState, municipalitySearchKey } from './municipalities';

test('chave de busca ignora acento, caixa e espaços extras', () => {
  assert.equal(municipalitySearchKey('Goiânia'), 'goiania');
  assert.equal(municipalitySearchKey('  Aparecida  de GOIÂNIA '), 'aparecida de goiania');
  assert.equal(municipalitySearchKey("Alta Floresta D'Oeste"), "alta floresta d'oeste");
  assert.equal(municipalitySearchKey('São João d’Aliança'), 'sao joao d’alianca');
});

test('UF válida', () => {
  assert.equal(isBrState('GO'), true);
  assert.equal(isBrState('go'), false);
  assert.equal(isBrState('XX'), false);
});
