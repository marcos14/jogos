/* ==========================================================================
   Super Adventure - Fase 1: o jogo ligado de ponta a ponta (sem navegador)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase1-tela.test.mjs

   O `fase1.test.mjs` cuida da fisica pura. Aqui o game.js roda com uma tela de
   mentira - menu, teclado, laco de quadros e desenho - para conferir a mesma
   coisa que se ve abrindo o index.html no navegador: o botao "Jogar Solo"
   comeca a partida, as setas andam, o espaco pula ate 120px e o heroi nao sai
   da tela. O canvas de mentira grava cada retangulo pintado.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, mundo, LIMITES_PADRAO } = dom.api;
const M = Fisica.medidas;

const heroi = () => dom.api.jogo.heroi;

/** Cores que so o heroi usa - servem para achar ele entre os pixels pintados.
    (o preto, o vermelho e o amarelo tambem aparecem no cenario e na bandeira) */
const CORES_HEROI = new Set(['#fcbc9c', '#0058f8', '#503000']);

function pixeisDoHeroi() {
  return dom.pintados.filter((p) => CORES_HEROI.has(p.cor));
}

function soltarTudo() {
  ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
}

console.log('Super Adventure - fase 1 (tela)\n');

teste('o jogo abre no menu, sem partida rolando', () => {
  assert.equal(dom.api.jogo.tela, 'menu');
  assert.equal(dom.elementos['tela-menu'].classList.contains('hidden'), false);
});

teste('parado no menu, o mundo nao anda', () => {
  dom.avancarQuadros(30);
  assert.equal(dom.api.jogo.relogio, 0);
  assert.ok(dom.pintados.length > 0, 'mas a cena continua sendo desenhada');
});

teste('"Jogar Solo" comeca a partida: esconde o menu e mostra o HUD', () => {
  dom.clicar('btn-solo');
  assert.equal(dom.elementos['tela-menu'].classList.contains('hidden'), true);
  assert.equal(dom.elementos.hud.classList.contains('hidden'), false);
  assert.equal(dom.api.jogo.tela, 'jogando');
  assert.equal(heroi().y, mundo.CHAO_Y - M.HEROI_A, 'nasce com os pes no chao');
});

teste('o laco roda um passo de fisica por quadro', () => {
  const antes = dom.api.jogo.relogio;
  dom.avancarQuadros(30);
  assert.equal(dom.api.jogo.relogio - antes, 30);
});

teste('a seta da direita anda 3px por quadro e soltar para na hora', () => {
  const x0 = heroi().x;
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(60);
  assert.equal(heroi().x, x0 + 60 * M.VEL_X);

  dom.tecla('ArrowRight', false);
  const parou = heroi().x;
  dom.avancarQuadros(60);
  assert.equal(heroi().x, parou, 'soltou a tecla, parou no lugar');
});

teste('a seta da esquerda volta com a mesma velocidade', () => {
  const x0 = heroi().x;
  dom.tecla('ArrowLeft', true);
  dom.avancarQuadros(20);
  dom.tecla('ArrowLeft', false);
  assert.equal(heroi().x, x0 - 20 * M.VEL_X);
  assert.equal(heroi().direcao, -1);
});

teste('o espaco pula, sobe no maximo 120px e volta ao chao', () => {
  soltarTudo();
  dom.avancarQuadros(5);
  const chao = heroi().y;

  dom.tecla(' ', true);
  let maisAlto = chao;
  for (let i = 0; i < 60; i++) {
    dom.avancarQuadros(1);
    maisAlto = Math.min(maisAlto, heroi().y);
  }
  dom.tecla(' ', false);

  assert.equal(chao - maisAlto, M.ALTURA_MAX_PULO);
  assert.equal(heroi().y, chao, 'pousou de volta no piso');
  assert.equal(heroi().noChao, true);
});

teste('as teclas W / A / D fazem o mesmo que as setas', () => {
  soltarTudo();
  const x0 = heroi().x;
  dom.tecla('d', true);
  dom.avancarQuadros(10);
  dom.tecla('d', false);
  assert.equal(heroi().x, x0 + 10 * M.VEL_X);

  dom.tecla('w', true);
  dom.avancarQuadros(1);
  dom.tecla('w', false);
  assert.equal(heroi().noChao, false, 'o W tambem pula');
  dom.avancarQuadros(60);
});

teste('trocar de aba solta as teclas (nao fica andando sozinho)', () => {
  soltarTudo();
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(2);
  assert.equal(dom.api.entrada.direita, true);

  dom.eventoJanela('blur');
  const x0 = heroi().x;
  dom.avancarQuadros(20);
  assert.equal(dom.api.entrada.direita, false);
  assert.equal(heroi().x, x0, 'ninguem anda sozinho depois de perder o foco');
});

teste('o heroi nao sai do mapa pela esquerda nem pela direita', () => {
  soltarTudo();
  dom.tecla('ArrowLeft', true);
  dom.avancarQuadros(600);
  dom.tecla('ArrowLeft', false);
  assert.equal(heroi().x, LIMITES_PADRAO.esquerda, 'travou na borda esquerda');

  // Do outro lado do mundo (o percurso inteiro e assunto da fase 2): logo
  // depois da bandeira, para o fim da fase nao atrapalhar a conta.
  heroi().x = mundo.LARGURA_MUNDO - 80;
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(120);
  dom.tecla('ArrowRight', false);
  assert.equal(heroi().x + M.HEROI_L, mundo.LARGURA_MUNDO, 'travou na borda direita');
});

teste('o heroi e desenhado no canvas, dentro da tela, sem imagem nenhuma', () => {
  dom.avancarQuadros(1);
  const pixeis = pixeisDoHeroi();
  assert.ok(pixeis.length > 100, `desenhou ${pixeis.length} quadradinhos do heroi`);

  const esquerda = Math.min(...pixeis.map((p) => p.x));
  const direita = Math.max(...pixeis.map((p) => p.x + p.l));
  const topo = Math.min(...pixeis.map((p) => p.y));
  const base = Math.max(...pixeis.map((p) => p.y + p.a));

  const naTela = heroi().x - dom.api.jogo.camera;   // a camera desloca o desenho
  assert.ok(esquerda >= naTela && direita <= naTela + M.HEROI_L,
    'o desenho cabe nos 32px de largura do heroi');
  assert.ok(topo >= heroi().y && base <= heroi().y + M.HEROI_A,
    'o desenho cabe nos 32px de altura do heroi');
  assert.ok(esquerda >= 0 && direita <= mundo.LARGURA, 'esta dentro da tela');
});

teste('a cena inteira e pintada com retangulos (nada de imagem externa)', () => {
  dom.avancarQuadros(1);
  assert.ok(dom.pintados.length > 300, 'ceu, morros, chao e heroi num quadro so');
  assert.equal(dom.pintados.every((p) => typeof p.cor === 'string'), true);
});

await fim('Fase 1 (tela)');
