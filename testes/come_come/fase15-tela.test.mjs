/* ==========================================================================
   Come-Come - Fase 15 (tela): a cruzeta e o deslize, num tablet de mentira
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase15-tela.test.mjs

   O jogo roda de verdade num DOM de mentira que finge ser um tablet
   (`{ toque: true }`: `matchMedia('(pointer: coarse)')` responde que sim). O
   que este teste confere:

     - num aparelho de dedo a cruzeta entra no palco e o cartaz das setas -
       que fala de teclado - sai;
     - encostar numa seta pede a curva na hora, pelo MESMO `entrada.desejada`
       do teclado, e nao precisa segurar: levantar o dedo nao desfaz o pedido;
     - o dedo que ARRASTA de uma seta para a outra troca o pedido sem sair da
       tela (para isso o jogo solta a captura implicita do navegador);
     - deslizar o dedo em cima do labirinto tambem pede a curva: vale o eixo em
       que ele andou mais, um tremor nao conta, e o dedo pode mudar de ideia
       no meio do caminho sem levantar;
     - no menu, na pausa e nas telas de fim a cruzeta some e nenhum toque
       guarda pedido nenhum;
     - num computador (sem `{ toque: true }`) nada muda - e o primeiro toque de
       verdade na tela liga a cruzeta mesmo assim;
     - o index.html e o style.css tem a cruzeta, translucida, e o layout de
       celular (deitado: HUD em coluna e faixas reservadas; dedo: sem teclado
       na ajuda).
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogoComTela, RAIZ, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come', { toque: true });
const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const entrada = dom.api.entrada;
const escondida = (id) => dom.elementos[id].classList.contains('hidden');
const acesa = (id) => dom.elementos[id].classList.contains('apertado');

console.log('Come-Come - fase 15 (tela)\n');

// -------------------------------------------------------------- O menu -----
teste('no menu nao ha cruzeta nem cartaz', () => {
  assert.equal(jogo().tela, 'menu');
  assert.equal(escondida('toque'), true, 'a cruzeta so entra com o labirinto rolando');
  assert.equal(escondida('controles'), true);
});

teste('num aparelho de dedo o jogo ja comeca em modo toque', () => {
  assert.equal(dom.api.toqueLigado(), true, 'o (pointer: coarse) foi reconhecido');
});

teste('no menu um toque na seta nao guarda pedido nenhum', () => {
  dom.dedoBaixo('toque-esquerda');
  dom.dedoCima();
  assert.equal(entrada.desejada, null, 'atras do menu nao ha o que virar');
});

// ------------------------------------------------- A partida comecando -----
teste('comecar a partida traz a cruzeta - e nao o cartaz das setas', () => {
  dom.comecarPartida('Bia');

  assert.equal(jogo().tela, 'jogando');
  assert.equal(escondida('toque'), false, 'a cruzeta esta no palco');
  assert.equal(escondida('controles'), true,
    'e o cartaz das setas ficou de fora: neste aparelho nao ha teclado');
  assert.equal(escondida('hud'), false, 'o HUD e o mesmo de sempre');
});

// ---------------------------------------------------------- A cruzeta ------
teste('o dedo na seta da esquerda pede a curva na hora', () => {
  const x0 = come().x;
  dom.dedoBaixo('toque-esquerda');

  assert.equal(entrada.desejada, 'esquerda', 'e o mesmo pedido que a seta do teclado faz');
  assert.equal(acesa('toque-esquerda'), true, 'a seta acendeu');

  dom.avancarQuadros(20);
  assert.ok(come().x < x0, `o come-come foi para a esquerda (${x0} -> ${come().x})`);
});

teste('levantar o dedo apaga a seta mas nao desfaz o pedido', () => {
  dom.dedoCima();
  assert.equal(acesa('toque-esquerda'), false, 'a seta apagou');
  assert.equal(entrada.desejada, 'esquerda',
    'o pedido de curva fica guardado ate a esquina, como no teclado');
});

teste('arrastar o polegar de uma seta para a outra troca o pedido', () => {
  dom.dedoBaixo('toque-cima');
  assert.equal(entrada.desejada, 'cima');
  assert.equal(acesa('toque-cima'), true);

  const chegou = dom.dedoArrastar('toque-cima', 'toque-direita');
  assert.equal(chegou, true, 'o jogo soltou a captura implicita - a vizinha recebe o dedo');
  assert.equal(entrada.desejada, 'direita', 'o pedido virou');
  assert.equal(acesa('toque-direita'), true, 'a nova seta acendeu');
  assert.equal(acesa('toque-cima'), false, 'e a antiga apagou');
  dom.dedoCima();
});

teste('um mouse so passeando por cima das setas nao pede nada', () => {
  entrada.desejada = null;
  dom.elementos['toque-baixo'].disparar('pointerenter', { pointerId: 9, pointerType: 'mouse', buttons: 0 });
  assert.equal(entrada.desejada, null, 'sem botao apertado, passar por cima nao conta');
  assert.equal(acesa('toque-baixo'), false);
});

// ---------------------------------------------------------- O deslize ------
teste('deslizar o dedo no labirinto pede a curva na direcao do gesto', () => {
  entrada.desejada = null;
  dom.deslizar(100, 100, [[112, 101], [140, 103]]);
  assert.equal(entrada.desejada, 'direita', '40px para a direita');

  dom.deslizar(100, 100, [[98, 60]]);
  assert.equal(entrada.desejada, 'cima', 'para cima o y diminui');

  dom.deslizar(100, 100, [[40, 110]]);
  assert.equal(entrada.desejada, 'esquerda', 'torto, mas andou mais no eixo x');
});

teste('um tremor do dedo nao vira o come-come', () => {
  entrada.desejada = 'direita';
  dom.deslizar(100, 100, [[104, 102], [108, 99], [112, 103]]);
  assert.equal(entrada.desejada, 'direita', 'menos que o minimo em cada passo: nada mudou');
  assert.ok(dom.api.DESLIZE_MINIMO >= 16 && dom.api.DESLIZE_MINIMO <= 40,
    `o minimo (${dom.api.DESLIZE_MINIMO}px) e curto para o dedo de crianca e longo para um tremor`);
});

teste('o dedo pode mudar de ideia no meio do deslize, sem levantar', () => {
  entrada.desejada = null;
  dom.deslizar(100, 100, [[100, 140], [100, 141], [60, 141]]);
  assert.equal(entrada.desejada, 'esquerda',
    'primeiro "baixo", depois "esquerda": vale o ultimo, e a conta recomecou de onde o dedo estava');
});

teste('so o dedo que comecou o deslize conta', () => {
  entrada.desejada = null;
  const palco = dom.elementos.palco;
  palco.disparar('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
  palco.disparar('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 });
  assert.equal(entrada.desejada, null, 'o segundo dedo nao e o do deslize');
  palco.disparar('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 100 });
  assert.equal(entrada.desejada, 'direita');
  dom.dedoCima(1);
});

// ------------------------------------------------------------- A pausa -----
teste('a pausa tira a cruzeta da tela, e o toque nao guarda pedido', () => {
  dom.clicar('btn-pausa');
  assert.equal(jogo().pausado, true);
  assert.equal(escondida('toque'), true, 'sem labirinto rolando, sem cruzeta');
  assert.equal(entrada.desejada, null, 'a pausa larga o pedido guardado');

  dom.dedoBaixo('toque-direita');
  dom.dedoCima();
  assert.equal(entrada.desejada, null, 'um toque atras do quadro de pausa nao vira nada');

  dom.deslizar(100, 100, [[160, 100]]);
  assert.equal(entrada.desejada, null, 'nem um deslize');
});

teste('"Continuar" traz a cruzeta de volta', () => {
  dom.clicar('btn-continuar');
  assert.equal(escondida('toque'), false);
  dom.dedoBaixo('toque-baixo');
  dom.dedoCima();
  assert.equal(entrada.desejada, 'baixo');
});

teste('voltar ao menu tira a cruzeta', () => {
  dom.api.voltarAoMenu();
  assert.equal(escondida('toque'), true);
  assert.equal(escondida('controles'), true);
});

// ------------------------------------------------------- O computador ------
teste('sem tela sensivel, o jogo e o de sempre: cartaz sim, cruzeta nao', () => {
  const pc = carregarJogoComTela('come_come');
  assert.equal(pc.api.toqueLigado(), false);
  pc.comecarPartida('Leo');

  assert.equal(pc.elementos.controles.classList.contains('hidden'), false, 'o cartaz das setas');
  assert.equal(pc.elementos.toque.classList.contains('hidden'), true, 'e nada de cruzeta');

  pc.tecla('ArrowLeft');
  assert.equal(pc.api.entrada.desejada, 'esquerda', 'o teclado segue valendo');
});

teste('mas o primeiro toque de verdade liga a cruzeta assim mesmo', () => {
  const pc = carregarJogoComTela('come_come');
  pc.comecarPartida('Leo');
  pc.eventoJanela('pointerdown', { pointerId: 1, pointerType: 'mouse', buttons: 1 });
  assert.equal(pc.api.toqueLigado(), false, 'um clique de mouse nao prova nada');

  pc.eventoJanela('pointerdown', { pointerId: 2, pointerType: 'touch', buttons: 1 });
  assert.equal(pc.api.toqueLigado(), true, 'um dedo, sim');
  assert.equal(pc.elementos.toque.classList.contains('hidden'), false, 'a cruzeta entrou');
  assert.equal(pc.elementos.controles.classList.contains('hidden'), true, 'e o cartaz saiu');
});

// ------------------------------------------------------ Os arquivos -------
teste('o index.html tem a cruzeta, com nome para o leitor de tela', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'jogos', 'come_come', 'index.html'), 'utf8');

  for (const id of ['toque', 'toque-cima', 'toque-baixo', 'toque-esquerda', 'toque-direita']) {
    assert.ok(html.includes(`id="${id}"`), `faltou id="${id}"`);
  }
  const cruzeta = html.slice(html.indexOf('id="toque"'), html.indexOf('id="rodape"'));
  assert.equal((cruzeta.match(/aria-label="Virar/g) || []).length, 4, 'as quatro setas tem nome');
  assert.ok(/id="toque" class="hidden"/.test(html), 'a cruzeta nasce escondida');
  assert.ok(html.includes('class="so-toque"'), 'a ajuda tem a linha do dedo');
  assert.ok(html.includes('class="teclado"'), 'e as linhas das teclas estao marcadas');
});

teste('o style.css faz a cruzeta translucida e o layout de celular', () => {
  const css = fs.readFileSync(path.join(RAIZ, 'jogos', 'come_come', 'style.css'), 'utf8');

  const grade = css.slice(css.indexOf('#toque{'), css.indexOf('.toque-botao{'));
  assert.ok(/pointer-events:\s*none/.test(grade), 'a grade em si nao rouba o toque');

  const seta = css.slice(css.indexOf('.toque-botao{'), css.indexOf('.toque-cima{'));
  assert.ok(/pointer-events:\s*auto/.test(seta), 'quem recebe o dedo e a seta');
  assert.ok(/touch-action:\s*none/.test(seta), 'segurar a seta nao rola nem da zoom');
  assert.ok(/rgba\(/.test(seta), 'e ela e translucida');
  assert.ok(/\.toque-botao\.apertado\{/.test(css), 'ha o estado "apertado"');

  assert.ok(/--vidro:\s*rgba\([^)]*,\s*\.\d+\)/.test(css), 'o "vidro" dos controles e translucido');
  assert.ok(/\.hud-box\{[^}]*var\(--vidro\)/.test(css), 'e as caixas do HUD sao feitas dele');
  assert.ok(/\.botao-icone\{[^}]*var\(--vidro-/.test(css), 'os botoes do HUD tambem');
  assert.ok(/@media \(orientation: landscape\)/.test(css), 'deitado tem regra propria');
  assert.ok(/--banda:\s*\d+px/.test(css), 'com faixas reservadas nos lados');
  assert.ok(/@media \(pointer: coarse\)/.test(css), 'e o aparelho de dedo tambem');
  assert.ok(/\.ajuda \.teclado\{\s*display:\s*none/.test(css), 'sem teclado na ajuda do dedo');
  assert.ok(/#palco\{[^}]*touch-action:\s*none/.test(css), 'arrastar no palco e jogo, nunca rolagem');
});

await fim('Fase 15 (tela)');
