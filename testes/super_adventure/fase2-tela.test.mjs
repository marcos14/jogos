/* ==========================================================================
   Super Adventure - Fase 2: o jogo ligado, percorrendo a fase 1 inteira
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase2-tela.test.mjs

   O `fase2.test.mjs` cuida das funcoes puras. Aqui o game.js roda com a tela
   de mentira e a fase 1 de verdade:

     - a camera acompanha o heroi e trava nas pontas do mundo
     - cair num buraco dispara o aviso de queda e devolve o heroi ao inicio
     - um piloto automatico (segura a direita e pula na parede ou no buraco)
       atravessa a fase inteira ate a bandeira sem cair nenhuma vez - ou seja,
       o percurso e possivel de verdade
     - encostar na bandeira dispara o evento 'fase-concluida', mostra a tela
       de fim de fase (a fase 1 nao e o fim do jogo, entao o quadro que abre e
       o "FASE 1 CONCLUIDA") e para o mundo
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, criarPiloto, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, Camera, fase, mundo } = dom.api;
const M = Fisica.medidas;
const T = M.TILE;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;

/** Guarda tudo que o jogo avisou, na ordem. */
const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

function soltarTudo() {
  ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
}

/* O piloto automatico do harness: segura a direita e pula na parede, no
   buraco e nos inimigos. Roda ate a bandeira (ou desistir). */
const correrAte = criarPiloto(dom);
const jogarSozinho = (maxQuadros) => correrAte(() => jogo.concluida, maxQuadros);

console.log('Super Adventure - fase 2 (tela)\n');

teste('a partida comeca no spawn do tilemap, com a camera no pe da esquerda', () => {
  dom.clicar('btn-solo');
  assert.equal(heroi().x, fase.spawn.x);
  assert.equal(heroi().y, fase.spawn.y);
  assert.equal(jogo.camera, 0, 'no comeco do mundo a camera nao tem para onde ir');
  assert.equal(jogo.concluida, false);
  assert.equal(dom.elementos['tela-fase'].classList.contains('hidden'), true);
  assert.equal(dom.elementos['tela-fim'].classList.contains('hidden'), true);
});

teste('a camera segue o heroi enquanto ele anda', () => {
  dom.avancarQuadros(1);                   // o primeiro quadro so acerta o relogio
  const x0 = heroi().x;
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(200);
  dom.tecla('ArrowRight', false);

  assert.equal(heroi().x, x0 + 200 * M.VEL_X, 'andou 3px por quadro, sem tropecos');
  assert.equal(jogo.camera,
    Camera.seguir(heroi().x + M.HEROI_L / 2, fase.largura, mundo.LARGURA));
  assert.ok(jogo.camera > 0, 'a camera ja saiu do lugar');
});

teste('o desenho do heroi acompanha a camera (fica sempre na tela)', () => {
  dom.avancarQuadros(1);
  // Cores que so o heroi usa (o preto e o vermelho tambem aparecem no cenario).
  const CORES_HEROI = new Set(['#fcbc9c', '#0058f8', '#503000']);
  const pixeis = dom.pintados.filter((p) => CORES_HEROI.has(p.cor));
  const esquerda = Math.min(...pixeis.map((p) => p.x));
  const direita = Math.max(...pixeis.map((p) => p.x + p.l));
  const naTela = heroi().x - jogo.camera;

  assert.ok(esquerda >= naTela && direita <= naTela + M.HEROI_L,
    'o heroi e pintado na posicao da camera, nao na do mundo');
  assert.ok(esquerda >= 0 && direita <= mundo.LARGURA, 'e dentro da tela');
});

teste('o mapa inteiro nao e pintado a cada quadro, so o pedaco visivel', () => {
  dom.avancarQuadros(1);
  const longeDaTela = dom.pintados.filter(
    (p) => p.x + p.l < -320 || p.x > mundo.LARGURA + 320);
  assert.equal(longeDaTela.length, 0, 'ninguem pinta longe da tela');
  assert.ok(dom.pintados.length < 1200,
    `${dom.pintados.length} retangulos num quadro (o mundo tem 120 colunas)`);
});

teste('cair num buraco e detectado: avisa e devolve o heroi ao inicio', () => {
  soltarTudo();
  const quedasAntes = jogo.quedas;
  const avisosAntes = contar('queda');

  dom.tecla('ArrowRight', true);           // o primeiro buraco fica na coluna 26
  for (let i = 0; i < 400 && jogo.quedas === quedasAntes; i++) dom.avancarQuadros(1);
  dom.tecla('ArrowRight', false);

  assert.equal(jogo.quedas, quedasAntes + 1, 'contou a queda');
  assert.equal(contar('queda'), avisosAntes + 1, 'avisou quem estava escutando');
  assert.equal(heroi().x, fase.spawn.x, 'voltou para o comeco da fase');
  assert.equal(heroi().y, fase.spawn.y);
  assert.equal(jogo.camera, 0, 'e a camera voltou junto');
});

teste('o piloto automatico atravessa a fase 1 inteira ate a bandeira', () => {
  dom.clicar('btn-solo');                  // partida limpa
  const quadros = jogarSozinho(4000);

  assert.equal(jogo.concluida, true, `nao chegou na bandeira em ${quadros} quadros`);
  assert.equal(jogo.quedas, 0, 'atravessou o percurso sem cair em buraco nenhum');
  assert.ok(Fisica.tocandoCorpo(heroi(), fase.bandeira), 'esta encostado na bandeira');
  assert.ok(quadros < 4000);
});

teste('encostar na bandeira dispara o evento e mostra a tela de fim de fase', () => {
  assert.equal(avisos[avisos.length - 1], 'fase-concluida');
  assert.equal(contar('fase-concluida'), 1, 'so avisa uma vez');
  assert.equal(dom.elementos['tela-fase'].classList.contains('hidden'), false);
  assert.equal(dom.elementos['tela-fim'].classList.contains('hidden'), true,
    'o PARABENS so aparece depois da fase 3');
});

teste('com a fase concluida o mundo para de andar', () => {
  const antes = { x: heroi().x, y: heroi().y, relogio: jogo.relogio };
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(60);
  dom.tecla('ArrowRight', false);

  assert.equal(heroi().x, antes.x, 'o heroi ficou parado na bandeira');
  assert.equal(heroi().y, antes.y);
  assert.equal(jogo.relogio, antes.relogio, 'o relogio da fase tambem parou');
  assert.ok(dom.pintados.length > 0, 'mas a cena continua sendo desenhada');
});

teste('"Jogar novamente" recomeca a fase 1 do zero', () => {
  dom.clicar('btn-de-novo');
  assert.equal(jogo.concluida, false);
  assert.equal(jogo.relogio, 0);
  assert.equal(jogo.quedas, 0);
  assert.equal(heroi().x, fase.spawn.x);
  assert.equal(dom.elementos['tela-fase'].classList.contains('hidden'), true);
  assert.equal(dom.elementos['tela-fim'].classList.contains('hidden'), true);
  assert.equal(dom.elementos.hud.classList.contains('hidden'), false);
});

await fim('Fase 2 (tela)');
