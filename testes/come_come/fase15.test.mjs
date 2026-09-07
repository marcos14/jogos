/* ==========================================================================
   Come-Come - Fase 15: a geometria do deslize (o modulo `Toque`)
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase15.test.mjs

   No celular a curva e pedida com o dedo: encostando numa seta da cruzeta ou
   DESLIZANDO em cima do labirinto. A parte pura disso e o `Toque` - dado o
   quanto o dedo andou, ele diz se ja e um pedido de curva e para que lado.
   Aqui ele e conferido sem DOM nenhum:

     - um tremor (menos que o minimo) nao vira nada;
     - vale o eixo em que o dedo andou MAIS, e o sinal diz o lado;
     - empate exato entre os eixos vale o horizontal;
     - `ehDirecao` reconhece so as quatro direcoes do labirinto.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Toque } = carregarJogo();
const MIN = 24;

console.log('Come-Come - fase 15 (o deslize)\n');

teste('o modulo existe e conhece as quatro direcoes', () => {
  assert.equal(typeof Toque.direcaoDoDeslize, 'function');
  // Array.from: o jogo roda noutro `vm`, e o deepEqual estrito compara o prototipo.
  assert.deepEqual(Array.from(Toque.DIRECOES), ['esquerda', 'direita', 'cima', 'baixo']);
  for (const d of Toque.DIRECOES) assert.equal(Toque.ehDirecao(d), true);
  assert.equal(Toque.ehDirecao('pular'), false);
  assert.equal(Toque.ehDirecao(null), false);
  assert.equal(Toque.ehDirecao(''), false);
});

teste('um tremor do dedo nao e deslize', () => {
  assert.equal(Toque.direcaoDoDeslize(0, 0, MIN), null);
  assert.equal(Toque.direcaoDoDeslize(10, -8, MIN), null);
  assert.equal(Toque.direcaoDoDeslize(MIN - 1, 0, MIN), null, 'um pixel a menos que o minimo');
  assert.equal(Toque.direcaoDoDeslize(0, -(MIN - 1), MIN), null);
});

teste('no minimo exato ja vale', () => {
  assert.equal(Toque.direcaoDoDeslize(MIN, 0, MIN), 'direita');
  assert.equal(Toque.direcaoDoDeslize(-MIN, 0, MIN), 'esquerda');
  assert.equal(Toque.direcaoDoDeslize(0, -MIN, MIN), 'cima');
  assert.equal(Toque.direcaoDoDeslize(0, MIN, MIN), 'baixo');
});

teste('o sinal diz o lado, nas quatro direcoes', () => {
  assert.equal(Toque.direcaoDoDeslize(80, 0, MIN), 'direita');
  assert.equal(Toque.direcaoDoDeslize(-80, 0, MIN), 'esquerda');
  assert.equal(Toque.direcaoDoDeslize(0, -80, MIN), 'cima', 'para cima o y diminui');
  assert.equal(Toque.direcaoDoDeslize(0, 80, MIN), 'baixo');
});

teste('num deslize torto vale o eixo em que o dedo andou mais', () => {
  assert.equal(Toque.direcaoDoDeslize(60, 20, MIN), 'direita');
  assert.equal(Toque.direcaoDoDeslize(-60, 20, MIN), 'esquerda');
  assert.equal(Toque.direcaoDoDeslize(20, -60, MIN), 'cima');
  assert.equal(Toque.direcaoDoDeslize(-20, 60, MIN), 'baixo');
  // Mesmo que o eixo perdedor sozinho ja passasse do minimo.
  assert.equal(Toque.direcaoDoDeslize(90, 40, MIN), 'direita');
  assert.equal(Toque.direcaoDoDeslize(40, 90, MIN), 'baixo');
});

teste('empate exato vale o horizontal - e o que o labirinto tem mais', () => {
  assert.equal(Toque.direcaoDoDeslize(40, 40, MIN), 'direita');
  assert.equal(Toque.direcaoDoDeslize(-40, -40, MIN), 'esquerda');
});

teste('o minimo e de quem chama: com minimo maior, o mesmo gesto e um tremor', () => {
  assert.equal(Toque.direcaoDoDeslize(30, 0, 24), 'direita');
  assert.equal(Toque.direcaoDoDeslize(30, 0, 40), null);
});

await fim('Fase 15');
