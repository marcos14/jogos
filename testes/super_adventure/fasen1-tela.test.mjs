/* ==========================================================================
   Super Adventure - Fase n1 (tela): os botoes de toque no palco
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fasen1-tela.test.mjs

   O jogo roda de verdade num DOM de mentira que finge ser um tablet
   (`{ toque: true }`: `matchMedia('(pointer: coarse)')` responde que sim). O
   que este teste confere:

     - num aparelho de dedo os botoes entram no palco e a caixa de controles -
       que fala de setas e barra de espaco - sai;
     - o dedo num botao move o heroi na hora e solta na hora, do mesmo jeito
       que a seta;
     - dois dedos ao mesmo tempo correm e pulam;
     - o dedo que ARRASTA de um botao para o outro vira o heroi sem sair da
       tela (para isso o jogo tem que soltar a captura implicita do navegador -
       aqui o DOM de mentira nao deixa arrastar enquanto ela estiver presa);
     - pausar, girar o aparelho, perder o foco e trocar de tela LARGAM os dedos:
       nenhuma dessas coisas pode deixar o heroi correndo sozinho;
     - teclado e dedo convivem no mesmo aparelho;
     - num computador (sem `{ toque: true }`) nada muda - e o primeiro toque de
       verdade na tela liga os botoes mesmo assim.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogoComTela, criarPiloto, RAIZ, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure', { toque: true });
const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const entrada = dom.api.entrada;
const escondida = (id) => dom.elementos[id].classList.contains('hidden');
const aceso = (id) => dom.elementos[id].classList.contains('apertado');
const dedosNoJogo = () => dom.api.Toque.dedos(dom.api.toque());

console.log('Super Adventure - fase n1 (tela)\n');

// -------------------------------------------------------------- O menu -----
teste('no menu nao ha botao de toque nenhum', () => {
  assert.equal(jogo.tela, 'menu');
  assert.equal(escondida('toque'), true, 'os botoes so entram com a fase rolando');
  assert.equal(escondida('controles'), true);
});

teste('num aparelho de dedo o jogo ja comeca em modo toque', () => {
  assert.equal(dom.api.toqueLigado(), true, 'o (pointer: coarse) foi reconhecido');
});

// ------------------------------------------------- A partida comecando -----
teste('comecar a partida traz os botoes - e tira a caixa de controles', () => {
  dom.clicar('btn-solo');

  assert.equal(escondida('toque'), false, 'a cruzeta e o pulo estao no palco');
  assert.equal(escondida('controles'), true,
    'e o cartaz das setas saiu: neste aparelho nao ha teclado');
  assert.equal(escondida('hud'), false, 'o HUD e o mesmo de sempre');
});

// ---------------------------------------------------------- Andar ----------
teste('o dedo no botao da direita faz o heroi andar na hora', () => {
  const x0 = heroi().x;
  dom.dedoBaixo('toque-direita');

  assert.equal(entrada.direita, true, 'e a mesma "direita" que a seta escrevia');
  assert.equal(aceso('toque-direita'), true, 'o botao acendeu');

  dom.avancarQuadros(10);
  assert.ok(heroi().x > x0, `o heroi andou (${x0} -> ${heroi().x})`);
  assert.equal(heroi().vx, 3, 'na mesma velocidade de sempre: 3px por quadro');
});

teste('tirar o dedo para o heroi na hora, sem inercia', () => {
  dom.dedoCima();

  assert.equal(entrada.direita, false);
  assert.equal(aceso('toque-direita'), false, 'o botao apagou');
  assert.equal(dedosNoJogo(), 0);

  dom.avancarQuadros(2);
  assert.equal(heroi().vx, 0, 'parado no mesmo quadro');
});

teste('o botao da esquerda anda para tras', () => {
  const x0 = heroi().x;
  dom.dedoBaixo('toque-esquerda');
  dom.avancarQuadros(6);
  dom.dedoCima();

  assert.ok(heroi().x < x0, 'voltou no caminho');
});

// ------------------------------------------------------ Dois polegares -----
teste('dois dedos: correr e pular ao mesmo tempo', () => {
  assert.equal(heroi().noChao, true, 'com os pes no chao');
  const x0 = heroi().x;
  const y0 = heroi().y;

  dom.dedoBaixo('toque-direita', 1);
  dom.dedoBaixo('toque-pular', 2);

  assert.equal(entrada.direita, true);
  assert.equal(entrada.pular, true);
  assert.equal(dedosNoJogo(), 2, 'os dois polegares na tela');
  assert.equal(aceso('toque-direita') && aceso('toque-pular'), true);

  dom.avancarQuadros(6);
  assert.ok(heroi().y < y0, 'subiu');
  assert.ok(heroi().x > x0, 'e avancou no mesmo pulo');
});

teste('soltar o pulo nao solta a corrida', () => {
  dom.dedoCima(2);

  assert.equal(entrada.pular, false, 'o polegar do pulo saiu');
  assert.equal(entrada.direita, true, 'o da corrida continua ali');
  assert.equal(dedosNoJogo(), 1);

  dom.dedoCima(1);
  assert.equal(entrada.direita, false);
});

teste('dois dedos no mesmo botao: tirar um nao solta o heroi', () => {
  dom.dedoBaixo('toque-direita', 1);
  dom.dedoBaixo('toque-direita', 2);

  dom.dedoCima(1);
  assert.equal(entrada.direita, true, 'ainda tem dedo em cima');
  assert.equal(aceso('toque-direita'), true);

  dom.dedoCima(2);
  assert.equal(entrada.direita, false, 'agora sim');
  assert.equal(aceso('toque-direita'), false);
});

// ---------------------------------------------------------- O arrasto ------
teste('o dedo arrasta de um botao para o outro sem sair da tela', () => {
  dom.dedoBaixo('toque-esquerda', 1);
  assert.equal(entrada.esquerda, true);

  // Se o jogo nao tivesse soltado a captura implicita do navegador, o botao
  // vizinho nao receberia nada e isto devolveria `false`.
  assert.equal(dom.dedoArrastar('toque-direita', 1), true,
    'o jogo soltou a captura do ponteiro, entao o arrasto vale');

  assert.equal(entrada.esquerda, false, 'o botao velho apagou');
  assert.equal(entrada.direita, true, 'e o novo acendeu');
  assert.equal(aceso('toque-esquerda'), false);
  assert.equal(aceso('toque-direita'), true);
  assert.equal(dedosNoJogo(), 1, 'continua sendo um dedo so');

  dom.dedoCima(1);
  assert.equal(entrada.direita, false);
});

teste('o dedo que sai arrastando para fora dos botoes tambem solta', () => {
  dom.dedoBaixo('toque-pular', 1);
  assert.equal(entrada.pular, true);

  // Levantar o dedo longe do botao: o `pointerup` chega pela JANELA.
  dom.eventoJanela('pointerup', { pointerId: 1, pointerType: 'touch', buttons: 0 });
  assert.equal(entrada.pular, false, 'a janela deu conta');
  assert.equal(dedosNoJogo(), 0);
});

teste('um toque cancelado pelo aparelho tambem larga o botao', () => {
  dom.dedoBaixo('toque-direita', 1);
  dom.dedoCancelado(1);

  assert.equal(entrada.direita, false, 'ligacao chegando nao deixa o heroi correndo');
  assert.equal(dedosNoJogo(), 0);
});

// ------------------------------------------------ O que larga os dedos -----
teste('pausar com o dedo no botao larga o dedo e some com os botoes', () => {
  dom.dedoBaixo('toque-direita', 1);
  assert.equal(entrada.direita, true);

  dom.clicar('btn-pausa');

  assert.equal(jogo.pausado, true);
  assert.equal(entrada.direita, false, 'a seta do dedo foi solta junto');
  assert.equal(dedosNoJogo(), 0);
  assert.equal(escondida('toque'), true, 'os botoes sairam de tras do quadro de pausa');

  const x0 = heroi().x;
  dom.avancarQuadros(60);
  assert.equal(heroi().x, x0, 'e o mundo ficou congelado, como manda a pausa');
});

teste('"Continuar" traz os botoes de volta, sem dedo preso', () => {
  dom.clicar('btn-continuar');

  assert.equal(escondida('toque'), false);
  assert.equal(entrada.direita, false, 'ninguem volta correndo sozinho');
  assert.equal(aceso('toque-direita'), false);
});

teste('girar o aparelho larga os dedos', () => {
  dom.dedoBaixo('toque-esquerda', 1);
  assert.equal(entrada.esquerda, true);

  // Girar costuma comer o `pointerup` do dedo que estava na tela.
  dom.eventoJanela('orientationchange');

  assert.equal(entrada.esquerda, false, 'o heroi nao ficou correndo para sempre');
  assert.equal(dedosNoJogo(), 0);
});

teste('a aba perdendo o foco larga os dedos', () => {
  dom.dedoBaixo('toque-pular', 1);
  dom.eventoJanela('blur');

  assert.equal(entrada.pular, false);
  assert.equal(dedosNoJogo(), 0);
});

// ------------------------------------------------- Teclado e dedo junto ----
teste('a seta do teclado continua valendo neste mesmo aparelho', () => {
  const x0 = heroi().x;
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(6);
  dom.tecla('ArrowRight', false);

  assert.ok(heroi().x > x0, 'quem tem teclado tambem joga');
});

teste('um dedo que sai nao solta a seta que a outra mao segura', () => {
  dom.tecla('ArrowRight', true);
  dom.dedoBaixo('toque-direita', 1);
  dom.dedoCima(1);

  assert.equal(entrada.direita, true, 'a seta apertada continua apertada');
  dom.tecla('ArrowRight', false);
  assert.equal(entrada.direita, false);
});

// --------------------------------------------------- As telas por cima -----
teste('a bandeira tira os botoes da tela', () => {
  const correr = criarPiloto(dom);
  correr(() => jogo.concluida, 6000);

  assert.equal(jogo.concluida, true, 'chegou na bandeira da fase 1');
  assert.equal(escondida('tela-fase'), false);
  assert.equal(escondida('toque'), true, 'os botoes sairam de tras do quadro');
  assert.equal(escondida('controles'), true, 'e a caixa de controles tambem');
});

teste('a fase seguinte devolve os botoes', () => {
  dom.clicar('btn-proxima');

  assert.equal(jogo.fase, 2);
  assert.equal(escondida('toque'), false, 'de volta ao palco');
  assert.equal(escondida('controles'), true, 'e a caixa de controles continua fora');
});

// ----------------------------------------------- Num computador comum -----
teste('sem tela sensivel, o jogo e o de sempre: cartaz sim, botoes nao', () => {
  const pc = carregarJogoComTela('super_adventure');

  assert.equal(pc.api.toqueLigado(), false);
  pc.clicar('btn-solo');

  assert.equal(pc.elementos.controles.classList.contains('hidden'), false,
    'a caixa de controles esta la, como sempre esteve');
  assert.equal(pc.elementos.toque.classList.contains('hidden'), true,
    'e nenhum botao de dedo apareceu');
});

teste('mas o primeiro toque de verdade liga os botoes assim mesmo', () => {
  const hibrido = carregarJogoComTela('super_adventure');
  hibrido.clicar('btn-solo');
  assert.equal(hibrido.elementos.toque.classList.contains('hidden'), true);

  // Um notebook com tela sensivel que nao se anunciou: alguem encostou.
  hibrido.eventoJanela('pointerdown', { pointerId: 1, pointerType: 'touch', buttons: 1 });

  assert.equal(hibrido.api.toqueLigado(), true);
  assert.equal(hibrido.elementos.toque.classList.contains('hidden'), false,
    'os botoes entraram');
  assert.equal(hibrido.elementos.controles.classList.contains('hidden'), true,
    'e o cartaz das setas saiu do lugar do botao de pular');
});

teste('um clique de mouse passeando pelos botoes nao mexe no heroi', () => {
  const pc = carregarJogoComTela('super_adventure');
  pc.clicar('btn-solo');

  // Mouse sem botao apertado entrando na area do botao: so passeio.
  pc.elementos['toque-direita'].disparar('pointerenter',
    { pointerId: 1, pointerType: 'mouse', buttons: 0 });

  assert.equal(pc.api.entrada.direita, false);
  assert.equal(pc.api.Toque.dedos(pc.api.toque()), 0);
});

// ------------------------------------------------------ O HTML e o CSS -----
teste('o index.html tem os tres botoes, com nome para o leitor de tela', () => {
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');

  for (const trecho of ['id="toque"', 'id="toque-esquerda"', 'id="toque-direita"',
                        'id="toque-pular"', 'aria-label="Pular"',
                        'aria-label="Andar para a esquerda"',
                        'aria-label="Andar para a direita"']) {
    assert.ok(html.includes(trecho), `faltou ${trecho} no index.html`);
  }

  const caixa = html.slice(html.indexOf('id="toque"'), html.indexOf('id="tela-pausa"'));
  assert.ok(caixa.includes('type="button"'), 'sao botoes de verdade');
  assert.ok(html.slice(0, html.indexOf('id="toque"')).lastIndexOf('hidden') > 0,
    'e nascem escondidos, como o HUD');

  assert.ok(/user-scalable=no/.test(html), 'o zoom de dois dedos fica fora do jogo');
  assert.ok(html.includes('botões na tela'), 'o menu conta que no celular ha botoes');
});

teste('o style.css faz os botoes grandes e sem rolagem por baixo', () => {
  const css = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'style.css'), 'utf8');

  const moldura = css.slice(css.indexOf('#toque{'), css.indexOf('.toque-cruzeta{'));
  assert.ok(/position:\s*absolute/.test(moldura), 'a moldura flutua sobre o palco');
  assert.ok(/pointer-events:\s*none/.test(moldura),
    'e ela mesma nao rouba o toque do jogo');

  const botao = css.slice(css.indexOf('.toque-botao{'), css.indexOf('.toque-salto{'));
  assert.ok(/pointer-events:\s*auto/.test(botao), 'quem recebe o dedo e o botao');
  assert.ok(/touch-action:\s*none/.test(botao),
    'segurar o botao nao pode rolar nem dar zoom na pagina');

  const tamanho = /width:\s*(\d+)px/.exec(botao);
  assert.ok(tamanho && Number(tamanho[1]) >= 44,
    `o botao tem ${tamanho && tamanho[1]}px - o minimo confortavel para o dedo e 44`);

  assert.ok(/\.toque-botao\.apertado\{/.test(css), 'e ha o estado "apertado"');
  assert.ok(/#palco\{[^}]*touch-action:\s*none/.test(css),
    'arrastar em cima do palco e jogo, nunca rolagem');
});

await fim('Fase n1 (tela)');
