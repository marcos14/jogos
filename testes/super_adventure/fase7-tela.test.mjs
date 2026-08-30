/* ==========================================================================
   Super Adventure - Fase 7 (tela): pausa, recomecar, tela cheia e controles
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase7-tela.test.mjs

   Tudo o que a fase 7 entrega mora na tela, entao o jogo roda de verdade (HUD,
   botoes, teclado e laco de quadros) num DOM de mentira:

     - o botao de pausa (e as teclas P / ESC) CONGELA o mundo: o heroi, os
       bichos e o relogio ficam onde estavam, mas a cena continua sendo
       desenhada, com o quadro de pausa por cima
     - a pausa solta as teclas presas - ninguem volta correndo sozinho
     - "Continuar" retoma do mesmo lugar; "Recomecar" volta para a fase 1 com o
       placar, as vidas e o caderno da corrida zerados
     - pausar so vale com uma fase em andamento: no menu e nas telas de fim o
       botao nao faz nada
     - a tela cheia chama a Fullscreen API do navegador (aqui de mentira: o
       navegador de verdade so a libera dentro de um clique) e o botao muda de
       cara quando o navegador avisa que entrou ou saiu
     - a caixa de controles aparece com o jogo rolando e some atras de qualquer
       tela
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogoComTela, criarPiloto, RAIZ, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const texto = (id) => dom.elementos[id].textContent;
const escondida = (id) => dom.elementos[id].classList.contains('hidden');
const correr = criarPiloto(dom);

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

/** Uma foto do mundo: e ela que nao pode mudar com o jogo pausado. */
const foto = () => JSON.stringify({
  x: heroi().x, y: heroi().y, vx: heroi().vx, vy: heroi().vy,
  relogio: jogo.relogio,
  pontos: jogo.pontos,
  vidas: jogo.vidas,
  bichos: jogo.inimigos.lista.map((i) => [i.x, i.y, i.estado]),
  moveis: jogo.moveis.lista.map((m) => [m.x, m.y]),
});

const soltarTudo = () => ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));

console.log('Super Adventure - fase 7 (tela)\n');

// -------------------------------------------------------------- O menu -----
teste('no menu nao ha caixa de controles nem o que pausar', () => {
  assert.equal(jogo.tela, 'menu');
  assert.equal(escondida('hud'), true, 'o HUD (e os dois botoes) so entra em jogo');
  assert.equal(escondida('controles'), true, 'a caixa de controles tambem');

  dom.clicar('btn-pausa');
  assert.equal(jogo.pausado, false, 'nao ha fase nenhuma para congelar');
  assert.equal(escondida('tela-pausa'), true);
  assert.equal(contar('pausa'), 0, 'e nem aviso de pausa saiu');
});

// ------------------------------------------------- O jogo em andamento -----
teste('comecar a partida traz o HUD, os dois botoes e a caixa de controles', () => {
  dom.clicar('btn-solo');

  assert.equal(escondida('hud'), false);
  assert.equal(escondida('controles'), false, 'o lembrete dos controles apareceu');
  assert.equal(escondida('tela-pausa'), true, 'e nada de pausa antes da hora');
  assert.equal(texto('btn-pausa'), '⏸');
  assert.equal(texto('btn-tela-cheia'), '⛶');
});

teste('o botao de pausa congela o mundo inteiro', () => {
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(20);
  const andou = heroi().x;
  assert.ok(andou > 0, 'o heroi estava correndo');

  dom.clicar('btn-pausa');
  const antes = foto();
  dom.avancarQuadros(120);

  assert.equal(jogo.pausado, true);
  assert.equal(foto(), antes, 'nada no mundo se mexeu com o jogo pausado');
  assert.equal(heroi().x, andou, 'o heroi ficou exatamente onde estava');
  assert.equal(contar('pausa'), 1);
});

teste('a pausa solta as teclas presas', () => {
  assert.equal(dom.api.entrada.direita, false, 'a seta que estava apertada foi solta');
  assert.equal(dom.api.entrada.esquerda, false);
  assert.equal(dom.api.entrada.pular, false);
});

teste('o quadro de pausa aparece e a caixa de controles sai da frente', () => {
  assert.equal(escondida('tela-pausa'), false, 'o quadro de pausa esta na tela');
  assert.equal(escondida('controles'), true, 'a caixa de controles ficou atras dele');
  assert.equal(texto('btn-pausa'), '▶', 'e o botao virou "continuar"');
});

teste('pausado, a cena continua sendo desenhada', () => {
  dom.avancarQuadros(1);
  assert.ok(dom.pintados.length > 0, 'a fase continua ali, paradinha');
});

teste('segurar a seta durante a pausa nao adianta nada', () => {
  const antes = foto();
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(60);
  dom.tecla('ArrowRight', false);

  assert.equal(foto(), antes, 'o mundo continua congelado');
});

teste('"Continuar" retoma a fase do mesmo lugar', () => {
  const x0 = heroi().x;
  dom.clicar('btn-continuar');

  assert.equal(jogo.pausado, false);
  assert.equal(escondida('tela-pausa'), true, 'o quadro de pausa sumiu');
  assert.equal(escondida('controles'), false, 'e a caixa de controles voltou');
  assert.equal(texto('btn-pausa'), '⏸');
  assert.equal(contar('continuou'), 1);
  assert.equal(heroi().x, x0, 'o heroi nao andou nem voltou no caminho');

  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(10);
  soltarTudo();
  assert.ok(heroi().x > x0, 'e o mundo voltou a andar');
});

// ---------------------------------------------------------- Os atalhos -----
teste('a tecla P pausa e despausa', () => {
  dom.tecla('p', true);
  assert.equal(jogo.pausado, true, 'o P pausou');
  assert.equal(escondida('tela-pausa'), false);

  dom.tecla('p', true);
  assert.equal(jogo.pausado, false, 'e o P de novo continuou o jogo');
  assert.equal(escondida('tela-pausa'), true);
});

teste('o ESC pausa (e nao tira da pausa: em tela cheia ele e do navegador)', () => {
  dom.tecla('Escape', true);
  assert.equal(jogo.pausado, true);

  dom.tecla('Escape', true);
  assert.equal(jogo.pausado, true, 'continua pausado');

  dom.clicar('btn-continuar');
  assert.equal(jogo.pausado, false);
});

// --------------------------------------------------------- A tela cheia ----
teste('o botao de tela cheia chama a Fullscreen API do navegador', () => {
  assert.equal(dom.telaCheia.pedidos, 0);

  dom.clicar('btn-tela-cheia');

  assert.equal(dom.telaCheia.pedidos, 1, 'pediu tela cheia uma vez');
  assert.equal(dom.documento.fullscreenElement, dom.documento.documentElement,
    'e o pedido foi para o documento inteiro (vale dentro do iframe do catalogo)');
  assert.equal(texto('btn-tela-cheia'), '🗗', 'o botao virou "sair"');
  assert.equal(dom.elementos['btn-tela-cheia'].getAttribute('aria-label'),
    'Sair da tela cheia');
});

teste('o mesmo botao sai da tela cheia', () => {
  dom.clicar('btn-tela-cheia');

  assert.equal(dom.telaCheia.saidas, 1);
  assert.equal(dom.documento.fullscreenElement, null);
  assert.equal(texto('btn-tela-cheia'), '⛶');
  assert.equal(dom.elementos['btn-tela-cheia'].getAttribute('aria-label'), 'Tela cheia');
});

teste('a tecla F tambem alterna a tela cheia', () => {
  dom.tecla('f', true);
  assert.equal(dom.telaCheia.pedidos, 2);

  dom.tecla('f', true);
  assert.equal(dom.telaCheia.saidas, 2);
  assert.equal(dom.documento.fullscreenElement, null);
});

teste('sair pelo ESC do navegador tambem acerta o botao', () => {
  dom.clicar('btn-tela-cheia');
  assert.equal(texto('btn-tela-cheia'), '🗗');

  // O navegador saiu sozinho e so avisou depois - e o caso do ESC.
  dom.documento.fullscreenElement = null;
  dom.eventoDocumento('fullscreenchange');

  assert.equal(texto('btn-tela-cheia'), '⛶', 'o botao voltou a oferecer tela cheia');
});

// ------------------------------------------------- A pausa e as telas ------
teste('a bandeira da fase 1 tira a caixa de controles da tela', () => {
  correr(() => jogo.concluida, 6000);

  assert.equal(jogo.concluida, true, 'chegou na bandeira da fase 1');
  assert.equal(escondida('tela-fase'), false, 'com o quadro de fim de fase na tela');
  assert.equal(escondida('controles'), true, 'a caixa de controles saiu da frente');
});

teste('com a fase concluida o botao de pausa nao faz nada', () => {
  const pausas = contar('pausa');
  dom.clicar('btn-pausa');
  dom.tecla('p', true);

  assert.equal(jogo.pausado, false, 'o mundo ja esta parado atras do quadro');
  assert.equal(escondida('tela-pausa'), true);
  assert.equal(contar('pausa'), pausas, 'e nenhum aviso novo de pausa');
});

// --------------------------------------------------------- O recomecar -----
teste('a fase 2 rende pontos e uma linha no caderno da corrida', () => {
  dom.clicar('btn-proxima');
  assert.equal(jogo.fase, 2);
  assert.equal(jogo.corrida.fases.length, 1, 'a fase 1 ja esta no caderno');

  correr(() => jogo.pontos > 0, 900);
  assert.ok(jogo.pontos > 0, `a fase 2 ja rendeu ${jogo.pontos} pontos`);
});

teste('"Recomecar" volta para a fase 1 com tudo zerado', () => {
  dom.tecla('p', true);
  assert.equal(jogo.pausado, true, 'pausou no meio da fase 2');

  dom.clicar('btn-recomecar');

  assert.equal(jogo.pausado, false, 'a pausa saiu junto');
  assert.equal(escondida('tela-pausa'), true);
  assert.equal(escondida('controles'), false, 'e a caixa de controles voltou');
  assert.equal(texto('btn-pausa'), '⏸');

  assert.equal(jogo.fase, 1, 'de volta para a fase 1');
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(heroi().x, dom.api.mapas[0].spawn.x, 'com o heroi no comeco dela');
  assert.equal(jogo.pontos, 0, 'o placar zerou');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(jogo.vidas, 3, 'as tres vidas de volta');
  assert.equal(jogo.relogio, 0);
  assert.equal(jogo.concluida, false);
  assert.equal(jogo.corrida.total, 0, 'e o caderno da corrida em branco');
  assert.equal(jogo.corrida.fases.length, 0);
  assert.equal(jogo.corrida.fase, 1);
});

teste('depois de recomecar da para jogar (e pausar) normalmente', () => {
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(20);
  soltarTudo();
  assert.ok(heroi().x > dom.api.mapas[0].spawn.x, 'o heroi voltou a andar');

  dom.clicar('btn-pausa');
  assert.equal(jogo.pausado, true);
  dom.clicar('btn-continuar');
  assert.equal(jogo.pausado, false);
});

// ------------------------------------------------- O HTML e o CSS ----------
teste('o index.html tem o quadro de pausa, os botoes e a caixa de controles', () => {
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');

  for (const trecho of ['id="btn-pausa"', 'id="btn-tela-cheia"',
                        'id="tela-pausa"', 'id="btn-continuar"',
                        'id="btn-recomecar"', 'id="controles"',
                        'PAUSA', 'CONTINUAR', 'RECOMEÇAR']) {
    assert.ok(html.includes(trecho), `faltou ${trecho} no index.html`);
  }

  const caixa = html.slice(html.indexOf('id="controles"'), html.indexOf('id="tela-pausa"'));
  assert.ok(caixa.includes('Mover'), 'a caixa lembra como andar');
  assert.ok(caixa.includes('ESPAÇO') && caixa.includes('Pular'), 'e como pular');
  assert.ok(caixa.includes('hidden'), 'e ela nasce escondida, como o HUD');
});

teste('o style.css poe a caixa no canto de baixo e cuida da tela cheia', () => {
  const css = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'style.css'), 'utf8');

  const caixa = css.slice(css.indexOf('#controles{'), css.indexOf('#controles b{'));
  assert.ok(/position:\s*absolute/.test(caixa), 'a caixa flutua sobre o palco');
  assert.ok(/right:\s*8px/.test(caixa) && /bottom:\s*8px/.test(caixa),
    'no canto de baixo a direita');
  assert.ok(/pointer-events:\s*none/.test(caixa), 'e sem roubar o toque do jogo');

  assert.ok(css.includes('html:fullscreen'), 'a moldura sai da frente em tela cheia');
  assert.ok(/\.botao-icone\{/.test(css), 'e os botoes do HUD tem estilo proprio');
});

await fim('Fase 7 (tela)');
