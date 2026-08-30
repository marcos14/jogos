/* ==========================================================================
   Come-Come - Fase 1: o jogo ligado de ponta a ponta (sem navegador)
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase1-tela.test.mjs

   O `fase1.test.mjs` cuida dos modulos puros. Aqui o game.js roda com uma tela
   de mentira - teclado, laco de quadros e desenho - para conferir a mesma
   coisa que se ve abrindo o index.html no navegador: o come-come anda quando a
   seta e apertada, vira nas esquinas, atravessa o tunel e e pintado no canvas
   sem imagem nenhuma. O canvas de mentira grava cada retangulo pintado.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Mapa, Movimento, mundo } = dom.api;
const TILE = mundo.TILE;

const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const coluna = () => Mapa.coluna(come().x);
const linha = () => Mapa.linha(come().y);

const COR_COME = '#fcd800';
const COR_PASTILHA = '#fcd8a8';
const COR_PAREDE = '#1a1ac0';

const pixeisDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor);

/** Quanto amarelo tem na tela agora: a area do corpo do come-come. */
const areaDoCome = () => pixeisDaCor(COR_COME)
  .reduce((soma, p) => soma + p.l * p.a, 0);

/**
 * Poe o come-come no centro de um quadrado, olhando para onde o teste quer.
 * Cada teste comeca de um lugar conhecido: assim um teste nao herda a posicao
 * em que o anterior parou.
 */
function porNoQuadrado(c, l, dir, passos = 0) {
  const corpo = come();
  const meio = Mapa.centro(c, l);
  corpo.x = meio.x;
  corpo.y = meio.y;
  corpo.dir = dir;
  corpo.desejada = dir;
  corpo.parado = false;
  corpo.passos = passos;
  dom.api.entrada.desejada = dir;
}

/** Aperta a seta e anda ate `chegou()` (ou desiste), como uma crianca faria. */
function dirigir(tecla, chegou, max = 900) {
  dom.tecla(tecla);
  for (let i = 0; i < max && !chegou(); i++) dom.avancarQuadros(1);
  assert.ok(chegou(), `o come-come nao chegou andando para ${tecla}`);
}

console.log('Come-Come - fase 1 (tela)\n');

teste('o jogo abre ja jogando, com o come-come no nascimento', () => {
  assert.equal(jogo().tela, 'jogando');
  assert.equal(jogo().fase, 1);
  assert.equal(coluna(), 13);
  assert.equal(linha(), 23);
  assert.equal(Movimento.noCentro(come()), true);
  assert.equal(jogo().relogio, 0, 'nenhum passo antes do primeiro quadro');

  // O primeiro quadro de todos so acerta o relogio do laco (dt = 0).
  dom.avancarQuadros(1);
});

teste('o laco roda um passo de mundo por quadro', () => {
  const antes = jogo().relogio;
  dom.avancarQuadros(30);
  assert.equal(jogo().relogio - antes, 30);
  assert.ok(dom.pintados.length > 0, 'e desenha a cena em todos eles');
});

teste('a seta da direita muda a posicao do come-come, 2px por quadro', () => {
  porNoQuadrado(13, 23, 'esquerda');
  dom.tecla('ArrowRight');
  dom.avancarQuadros(1);              // a meia-volta e imediata
  assert.equal(come().dir, 'direita');

  const x0 = come().x;
  dom.avancarQuadros(10);
  assert.equal(come().x, x0 + 10 * mundo.VEL_COME);
  assert.equal(come().y, 23 * TILE + TILE / 2, 'sem sair do meio do corredor');
});

teste('a seta da esquerda volta com a mesma velocidade', () => {
  dom.tecla('ArrowLeft');
  dom.avancarQuadros(1);
  const x0 = come().x;
  dom.avancarQuadros(10);
  assert.equal(come().x, x0 - 10 * mundo.VEL_COME);
  assert.equal(come().dir, 'esquerda');
});

teste('a seta para cima so vira quando o corredor abre', () => {
  // Do nascimento para a esquerda: em cima da coluna 13 esta a casa dos
  // fantasmas, e o primeiro corredor que sobe e o da coluna 12.
  porNoQuadrado(13, 23, 'esquerda');
  const y0 = come().y;

  dom.tecla('ArrowUp');
  dom.avancarQuadros(8);
  assert.equal(come().dir, 'esquerda', 'ainda era parede em cima');
  assert.equal(come().y, y0, 'e por isso ele nao subiu nada');
  assert.equal(coluna(), 12, 'mas ja andou ate a coluna 12');

  dom.avancarQuadros(1);
  assert.equal(come().dir, 'cima', 'ali o corredor abre e ele vira');
  assert.equal(come().x, 12 * TILE + TILE / 2, 'virou alinhado no meio do corredor');
});

teste('bater na parede para o come-come no centro do quadrado', () => {
  porNoQuadrado(13, 23, 'esquerda');
  dirigir('ArrowLeft', () => coluna() === 6 && come().parado);
  assert.equal(come().x, 6 * TILE + TILE / 2);
  assert.equal(linha(), 23);

  const x0 = come().x;
  dom.avancarQuadros(60);
  assert.equal(come().x, x0, 'insistindo na parede, ele fica onde esta');
  assert.equal(come().parado, true);
});

teste('as teclas W A S D fazem o mesmo que as setas', () => {
  porNoQuadrado(6, 23, 'esquerda');
  dom.tecla('w');
  dom.avancarQuadros(1);
  assert.equal(come().dir, 'cima', 'o W sobe');

  porNoQuadrado(6, 23, 'esquerda');
  dom.tecla('s');
  dom.avancarQuadros(1);
  assert.equal(come().dir, 'baixo', 'o S desce');

  porNoQuadrado(13, 23, 'esquerda');
  dom.tecla('d');
  dom.avancarQuadros(1);
  assert.equal(come().dir, 'direita', 'o D vai para a direita');

  dom.tecla('a');
  dom.avancarQuadros(1);
  assert.equal(come().dir, 'esquerda', 'e o A para a esquerda');
});

teste('o tunel devolve o come-come do outro lado da tela', () => {
  porNoQuadrado(4, 14, 'esquerda');
  dirigir('ArrowLeft', () => coluna() === 0 && Movimento.noCentro(come()));

  dom.avancarQuadros(5);              // 8 -> 6 -> 4 -> 2 -> 0 -> 446
  assert.ok(come().x > mundo.LARGURA - TILE,
    `saiu pela esquerda e apareceu na direita (x = ${come().x})`);
  assert.equal(linha(), 14, 'na mesma linha do tunel');

  // E de volta, pelo mesmo caminho.
  dirigir('ArrowRight', () => coluna() === 0 && Movimento.noCentro(come()));
  assert.equal(linha(), 14);
});

// ------------------------------------------------------------- O desenho ----
teste('o labirinto e desenhado no canvas, sem imagem nenhuma', () => {
  dom.avancarQuadros(1);
  assert.ok(dom.pintados.length > 500, `${dom.pintados.length} retangulos num quadro so`);
  assert.equal(dom.pintados.every((p) => typeof p.cor === 'string'), true);

  const paredes = pixeisDaCor(COR_PAREDE);
  assert.ok(paredes.length > 200, `${paredes.length} blocos de parede`);

  const pastilhas = pixeisDaCor(COR_PASTILHA);
  assert.equal(pastilhas.length, dom.api.mapas[0].totalPastilhas,
    'uma pastilha pintada para cada uma do desenho');
});

teste('nada e pintado fora do canvas', () => {
  dom.avancarQuadros(1);
  dom.pintados.forEach((p) => {
    // A folga de um quadrado e a copia do come-come na boca do tunel: metade
    // dele ja esta do outro lado da tela.
    assert.ok(p.x >= -TILE && p.x + p.l <= mundo.LARGURA + TILE,
      `retangulo em x = ${p.x} (largura ${p.l})`);
    assert.ok(p.y >= 0 && p.y + p.a <= mundo.ALTURA, `retangulo em y = ${p.y}`);
  });
});

teste('o come-come e um circulo de 16px com a boca aberta na direcao dele', () => {
  // Longe do tunel, para a copia do outro lado da tela nao entrar na conta.
  porNoQuadrado(21, 17, 'baixo', 8);          // 8 = boca escancarada
  dom.avancarQuadros(1);

  const pixeis = pixeisDaCor(COR_COME);
  assert.ok(pixeis.length > 4, `o corpo saiu em ${pixeis.length} pinceladas`);

  const esquerda = Math.min(...pixeis.map((p) => p.x));
  const direita = Math.max(...pixeis.map((p) => p.x + p.l));
  const topo = Math.min(...pixeis.map((p) => p.y));
  const base = Math.max(...pixeis.map((p) => p.y + p.a));

  assert.ok(esquerda >= come().x - TILE / 2 && direita <= come().x + TILE / 2,
    'o desenho cabe nos 16px de largura do come-come');
  assert.ok(topo >= come().y - TILE / 2 && base <= come().y + TILE / 2,
    'e nos 16px de altura');

  // A boca e uma fatia TIRADA do circulo, do lado para onde ele anda: descendo,
  // a metade de baixo tem menos amarelo que a de cima.
  const area = (lista) => lista.reduce((soma, p) => soma + p.l * p.a, 0);
  const cima = area(pixeis.filter((p) => p.y < come().y));
  const baixo = area(pixeis.filter((p) => p.y >= come().y));
  assert.ok(baixo < cima, `a boca esta virada para baixo (${baixo} < ${cima})`);
});

teste('a boca abre e fecha enquanto ele anda, e para quando ele para', () => {
  porNoQuadrado(21, 17, 'baixo');
  const areas = [];
  for (let i = 0; i < 16; i++) { dom.avancarQuadros(1); areas.push(areaDoCome()); }
  assert.ok(Math.max(...areas) > Math.min(...areas),
    'o corpo muda de tamanho: a boca esta mesmo mexendo');

  // Encostado numa parede ele congela - a boca junto.
  porNoQuadrado(13, 23, 'cima');
  dom.avancarQuadros(1);
  assert.equal(come().parado, true);
  const parada = areaDoCome();
  dom.avancarQuadros(8);
  assert.equal(areaDoCome(), parada, 'parado, a boca tambem fica parada');
});

await fim('Fase 1 (tela)');
