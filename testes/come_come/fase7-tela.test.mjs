/* ==========================================================================
   Come-Come - Fase 7 (tela): menu, pausa, recomecar, tela cheia e controles
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase7-tela.test.mjs

   Tudo o que a fase 7 entrega mora na tela, entao o jogo roda de verdade (HUD,
   botoes, teclado e laco de quadros) num DOM de mentira:

     - o jogo abre no MENU: sem HUD, sem cartaz de controles e com o mundo
       parado atras dele. O botao JOGAR e que comeca a partida, guardando o
       nome digitado
     - o botao de pausa (e as teclas P / ESC) CONGELA o mundo: o come-come, os
       fantasmas e o relogio ficam onde estavam, mas a cena continua sendo
       desenhada, com o quadro de pausa por cima
     - a pausa larga o pedido de curva guardado - ninguem vira sozinho na volta
     - "Continuar" retoma do mesmo lugar; "Recomecar" volta para o labirinto 1
       com o placar, as vidas e o caderno da corrida zerados
     - pausar so vale com um labirinto em andamento: no menu e nas telas de fim
       o botao nao faz nada
     - a tela cheia chama a Fullscreen API do navegador (aqui de mentira: o
       navegador de verdade so a libera dentro de um clique) e o botao muda de
       cara quando o navegador avisa que entrou ou saiu
     - o cartaz dos controles aparece com o labirinto rolando e some atras de
       qualquer tela
     - perder o foco pausa sozinho, e girar o aparelho nao quebra a partida
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogoComTela, RAIZ, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Corrida, Movimento, mundo } = dom.api;

const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const texto = (id) => dom.elementos[id].textContent;
const escondida = (id) => dom.elementos[id].classList.contains('hidden');

/** Uma foto do mundo: e ela que nao pode mudar com o jogo pausado. */
const foto = () => JSON.stringify({
  relogio: jogo().relogio,
  pontos: jogo().pontos,
  vidas: jogo().vidas,
  come: jogo().come,
  fantasmas: jogo().fantasmas.lista.map((f) => [f.corpo.x, f.corpo.y, f.etapa]),
  ciclo: jogo().ciclo,
  poder: jogo().poder,
  rodada: jogo().rodada,
  pastilhas: jogo().pastilhas.faltam,
});

/**
 * Limpa o labirinto na marra: deixa uma pastilha de pe, poe o come-come em
 * cima dela e anda um quadro. E o atalho para chegar nas telas de fim sem
 * atravessar o labirinto inteiro a pe (isso o `fase6b-tela` ja faz).
 */
function limparLabirintoAgora() {
  const mapa = dom.api.labirinto;
  const alvo = mapa.pastilhas[0];
  jogo().pastilhas = {
    restam: jogo().pastilhas.restam.map((_, i) => i === 0),
    faltam: 1,
    comidas: mapa.totalPastilhas - 1,
  };
  jogo().come = Movimento.novoCorpo(alvo.c, alvo.l);
  dom.avancarQuadros(1);
}

console.log('Come-Come - fase 7 (tela)\n');

// -------------------------------------------------------------- O menu -----
teste('o jogo abre no menu, sem HUD e sem cartaz de controles', () => {
  assert.equal(jogo().tela, 'menu');
  assert.equal(escondida('tela-menu'), false, 'o menu esta na tela');
  assert.equal(escondida('hud'), true, 'o HUD (e os dois botoes) so entra em jogo');
  assert.equal(escondida('controles'), true, 'o cartaz dos controles tambem');
  assert.equal(escondida('tela-pausa'), true);
});

teste('no menu o mundo nao anda, mas o labirinto ja e desenhado atras', () => {
  const antes = foto();
  dom.avancarQuadros(60);

  assert.equal(foto(), antes, 'nenhum fantasma saiu da casa esperando o JOGAR');
  assert.equal(jogo().relogio, 0);
  assert.ok(dom.pintados.length > 200, 'e o labirinto aparece atras do menu');
});

teste('no menu nao ha o que pausar', () => {
  dom.clicar('btn-pausa');
  assert.equal(jogo().pausado, false, 'nao ha labirinto nenhum para congelar');
  assert.equal(escondida('tela-pausa'), true);

  dom.tecla('p');
  assert.equal(jogo().pausado, false);
  assert.equal(escondida('tela-pausa'), true);
});

teste('digitar o nome nao pausa o jogo nem vira o come-come', () => {
  // O "p" de "Pedro" e a tecla da pausa; o "a" e a seta da esquerda. Nenhum
  // dos dois pode valer enquanto o dedo esta no campo do nome.
  const campo = dom.elementos['campo-apelido'];
  for (const letra of ['p', 'a', 'f', 'w']) {
    dom.eventoJanela('keydown', { key: letra, target: campo });
  }

  assert.equal(jogo().pausado, false, 'o nome com "p" nao pausou nada');
  assert.equal(dom.api.entrada.desejada, null, 'nem o "a" virou o come-come');
  assert.equal(dom.telaCheia.pedidos, 0, 'nem o "f" abriu a tela cheia');
});

teste('o botao JOGAR comeca a partida e guarda o nome, limpinho', () => {
  dom.elementos['campo-apelido'].value = '  Bia  ';
  dom.clicar('btn-jogar');

  assert.equal(jogo().apelido, 'Bia', 'o espaco sobrando saiu');
  assert.equal(jogo().tela, 'jogando');
  assert.equal(escondida('tela-menu'), true, 'o menu saiu da frente');
  assert.equal(escondida('hud'), false, 'o HUD entrou');
  assert.equal(escondida('controles'), false, 'e o cartaz dos controles tambem');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(texto('hud-vidas'), '🟡🟡🟡');
  assert.equal(texto('btn-pausa'), '⏸');
  assert.equal(texto('btn-tela-cheia'), '⛶');
});

teste('comecada a partida, o mundo anda', () => {
  const x0 = come().x;
  dom.tecla('ArrowLeft');
  dom.avancarQuadros(20);

  assert.ok(come().x < x0, 'o come-come andou para a esquerda');
  assert.equal(jogo().relogio, 20, 'e o relogio do mundo andou junto');
});

// --------------------------------------------------------------- A pausa ---
teste('o botao de pausa congela o mundo inteiro', () => {
  const antes = foto();
  dom.clicar('btn-pausa');
  dom.avancarQuadros(120);

  assert.equal(jogo().pausado, true);
  assert.equal(foto(), antes, 'nada no mundo se mexeu com o jogo pausado');
});

teste('o quadro de pausa aparece e o cartaz dos controles sai da frente', () => {
  assert.equal(escondida('tela-pausa'), false, 'o quadro de pausa esta na tela');
  assert.equal(escondida('controles'), true, 'o cartaz ficou atras dele');
  assert.equal(texto('btn-pausa'), '▶', 'e o botao virou "continuar"');
  assert.equal(dom.elementos['btn-pausa'].getAttribute('aria-label'), 'Continuar');
});

teste('pausado, a cena continua sendo desenhada', () => {
  dom.avancarQuadros(1);
  assert.ok(dom.pintados.length > 200, 'o labirinto fica ali, paradinho');
});

teste('a pausa larga o pedido de curva guardado', () => {
  assert.equal(dom.api.entrada.desejada, null,
    'a seta apertada antes da pausa nao vira ninguem na volta');
});

teste('apertar a seta durante a pausa nao adianta nada', () => {
  const antes = foto();
  dom.tecla('ArrowRight');
  dom.avancarQuadros(60);

  assert.equal(dom.api.entrada.desejada, null, 'a seta nem foi guardada');
  assert.equal(foto(), antes, 'o mundo continua congelado');
});

teste('"Continuar" retoma o labirinto do mesmo lugar', () => {
  const antes = foto();
  dom.clicar('btn-continuar');

  assert.equal(jogo().pausado, false);
  assert.equal(escondida('tela-pausa'), true, 'o quadro de pausa sumiu');
  assert.equal(escondida('controles'), false, 'e o cartaz voltou');
  assert.equal(texto('btn-pausa'), '⏸');
  assert.equal(dom.elementos['btn-pausa'].getAttribute('aria-label'), 'Pausar');
  assert.equal(foto(), antes, 'ninguem andou nem voltou no clique');

  const relogio = jogo().relogio;
  dom.avancarQuadros(10);
  assert.equal(jogo().relogio, relogio + 10, 'e o mundo voltou a andar');
});

// ---------------------------------------------------------- Os atalhos -----
teste('a tecla P pausa e despausa', () => {
  dom.tecla('p');
  assert.equal(jogo().pausado, true, 'o P pausou');
  assert.equal(escondida('tela-pausa'), false);

  dom.tecla('p');
  assert.equal(jogo().pausado, false, 'e o P de novo continuou o jogo');
  assert.equal(escondida('tela-pausa'), true);
});

teste('o ESC pausa (e nao tira da pausa: em tela cheia ele e do navegador)', () => {
  dom.tecla('Escape');
  assert.equal(jogo().pausado, true);

  dom.tecla('Escape');
  assert.equal(jogo().pausado, true, 'continua pausado');

  dom.clicar('btn-continuar');
  assert.equal(jogo().pausado, false);
});

// -------------------------------------------------------- A tela cheia -----
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
  dom.tecla('f');
  assert.equal(dom.telaCheia.pedidos, 2);

  dom.tecla('f');
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

teste('a tela cheia nao mexe no mundo nem na pausa', () => {
  assert.equal(jogo().pausado, false, 'ninguem pausou por causa do F');
  const relogio = jogo().relogio;
  dom.avancarQuadros(5);
  assert.equal(jogo().relogio, relogio + 5, 'e o labirinto continuou rolando');
});

// ----------------------------------------------- O foco e o giro da tela ---
teste('perder o foco da janela pausa sozinho', () => {
  assert.equal(jogo().pausado, false);
  const antes = foto();

  dom.eventoJanela('blur');

  assert.equal(jogo().pausado, true, 'a aba que saiu de cena congelou o mundo');
  assert.equal(escondida('tela-pausa'), false, 'com o quadro de pausa na tela');
  dom.avancarQuadros(120);
  assert.equal(foto(), antes, 'e nenhum fantasma andou nesse tempo');
});

teste('a aba escondida tambem pausa, e a partida continua inteira na volta', () => {
  dom.clicar('btn-continuar');
  dom.avancarQuadros(5);

  dom.documento.hidden = true;
  dom.eventoDocumento('visibilitychange');
  assert.equal(jogo().pausado, true);

  dom.documento.hidden = false;
  const antes = foto();
  dom.clicar('btn-continuar');
  assert.equal(jogo().pausado, false);
  assert.equal(foto(), antes, 'a partida voltou exatamente de onde parou');
});

teste('girar o aparelho nao quebra a partida', () => {
  const antes = foto();
  dom.eventoJanela('orientationchange');
  dom.eventoJanela('resize');

  assert.equal(jogo().pausado, false, 'girar nao pausa: so remede o palco');
  assert.equal(foto(), antes, 'e nao encosta em nada do mundo');
  assert.ok(/px$/.test(dom.elementos.palco.style.width), 'o palco foi remedido');
  assert.ok(/px$/.test(dom.elementos.palco.style.height));

  const relogio = jogo().relogio;
  dom.avancarQuadros(10);
  assert.equal(jogo().relogio, relogio + 10, 'e o labirinto continua rolando');
});

// ---------------------------------------------- O cartaz e as telas de fim -
teste('o quadro de fim de fase tira o cartaz dos controles da tela', () => {
  limparLabirintoAgora();

  assert.equal(jogo().tela, 'fase', 'o labirinto 1 ficou limpo');
  assert.equal(escondida('tela-fase'), false, 'com o quadro "LABIRINTO LIMPO"');
  assert.equal(escondida('controles'), true, 'o cartaz saiu da frente');
});

teste('com a fase concluida o botao de pausa nao faz nada', () => {
  dom.clicar('btn-pausa');
  dom.tecla('p');

  assert.equal(jogo().pausado, false, 'o mundo ja esta parado atras do quadro');
  assert.equal(escondida('tela-pausa'), true);
});

teste('o PARABENS tambem esconde o cartaz', () => {
  dom.clicar('btn-proxima');
  assert.equal(jogo().fase, 2);
  assert.equal(escondida('controles'), false, 'de volta ao labirinto, o cartaz voltou');

  dom.api.irParaFase(3);
  limparLabirintoAgora();

  assert.equal(jogo().tela, 'parabens');
  assert.equal(escondida('tela-parabens'), false);
  assert.equal(escondida('controles'), true);
});

// ------------------------------------------------------- O recomecar -------
teste('"Jogar de novo" do PARABENS zera a corrida', () => {
  assert.ok(jogo().corrida.total > 0, 'a corrida tinha pontos no caderno');
  dom.clicar('btn-de-novo');

  assert.equal(jogo().tela, 'jogando');
  assert.equal(jogo().fase, 1);
  assert.equal(jogo().corrida.total, 0);
  assert.equal(jogo().corrida.fases.length, 0);
  assert.equal(escondida('tela-parabens'), true);
  assert.equal(escondida('controles'), false);
});

teste('"Recomecar" da pausa volta para o labirinto 1 com tudo zerado', () => {
  // Uma corrida no meio do caminho: o labirinto 1 fechado no caderno, o 2 em
  // andamento, com pontos feitos e uma vida a menos.
  jogo().corrida = Corrida.concluir(jogo().corrida, 1, 120);
  dom.api.irParaFase(2);
  jogo().pontos = 340;
  jogo().rodada = { vidas: 1, pausa: 0, pego: -1, acabou: false };
  jogo().vidas = 1;
  dom.avancarQuadros(30);

  dom.tecla('p');
  assert.equal(jogo().pausado, true, 'pausou no meio do labirinto 2');

  dom.clicar('btn-recomecar');

  assert.equal(jogo().pausado, false, 'a pausa saiu junto');
  assert.equal(escondida('tela-pausa'), true);
  assert.equal(escondida('controles'), false, 'e o cartaz voltou');
  assert.equal(texto('btn-pausa'), '⏸');

  assert.equal(jogo().fase, 1, 'de volta para o labirinto 1');
  assert.equal(texto('hud-fase'), '1 / 3');
  const nascimento = Movimento.novoCorpo(
    dom.api.labirinto.nascimento.c, dom.api.labirinto.nascimento.l);
  assert.equal(jogo().come.x, nascimento.x, 'com o come-come no nascimento dele');
  assert.equal(jogo().come.y, nascimento.y);
  assert.equal(jogo().pontos, 0, 'o placar zerou');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(jogo().vidas, mundo.VIDAS_INICIAIS, 'as tres vidas de volta');
  assert.equal(texto('hud-vidas'), '🟡🟡🟡');
  assert.equal(jogo().relogio, 0);
  assert.equal(jogo().pastilhas.faltam, dom.api.mapas[0].totalPastilhas,
    'e o labirinto 1 cheio de pastilhas de novo');
  assert.equal(jogo().corrida.total, 0, 'o caderno da corrida em branco');
  assert.equal(jogo().corrida.fases.length, 0);
  assert.equal(jogo().corrida.fase, 1);
});

teste('o nome digitado sobrevive ao recomeco', () => {
  assert.equal(jogo().apelido, 'Bia');
});

teste('depois de recomecar da para jogar (e pausar) normalmente', () => {
  const x0 = come().x;
  dom.tecla('ArrowLeft');
  dom.avancarQuadros(20);
  assert.ok(come().x < x0, 'o come-come voltou a andar');

  dom.clicar('btn-pausa');
  assert.equal(jogo().pausado, true);
  dom.clicar('btn-continuar');
  assert.equal(jogo().pausado, false);
});

teste('o "Jogar de novo" do fim de jogo passa pelo mesmo caminho', () => {
  jogo().corrida = Corrida.concluir(jogo().corrida, 1, 90);
  dom.api.irParaFase(2);
  jogo().pontos = 70;

  dom.clicar('btn-fim-de-novo');

  assert.equal(jogo().fase, 1);
  assert.equal(jogo().pontos, 0);
  assert.equal(jogo().corrida.total, 0);
  assert.equal(jogo().corrida.fases.length, 0);
  assert.equal(escondida('tela-fim'), true);
});

// ------------------------------------------------ Um jogo aberto do zero ---
teste('uma copia nova do jogo tambem abre no menu, com tudo no lugar', () => {
  const novo = carregarJogoComTela('come_come');
  novo.avancarQuadros(30);

  assert.equal(novo.api.jogo.tela, 'menu');
  assert.equal(novo.api.jogo.pausado, false);
  assert.equal(novo.api.jogo.apelido, '');
  assert.equal(novo.api.jogo.relogio, 0, 'o mundo esperou o JOGAR');
  assert.equal(novo.elementos.hud.classList.contains('hidden'), true);
  assert.equal(novo.elementos.controles.classList.contains('hidden'), true);
  assert.equal(novo.elementos['btn-pausa'].textContent, '⏸');
  assert.equal(novo.elementos['btn-tela-cheia'].textContent, '⛶');

  novo.comecarPartida('Zé');
  assert.equal(novo.api.jogo.apelido, 'Zé');
  assert.equal(novo.api.jogo.tela, 'jogando');
  novo.avancarQuadros(10);
  assert.equal(novo.api.jogo.relogio, 10);
});

// ------------------------------------------------------ O HTML e o CSS -----
teste('o index.html tem o menu, o quadro de pausa, os botoes e o cartaz', () => {
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'come_come', 'index.html'), 'utf8');

  for (const trecho of ['id="tela-menu"', 'id="campo-apelido"', 'id="btn-jogar"',
                        'id="btn-pausa"', 'id="btn-tela-cheia"',
                        'id="tela-pausa"', 'id="btn-continuar"',
                        'id="btn-recomecar"', 'id="controles"',
                        'id="btn-fim-de-novo"',
                        'COME', 'PAUSA', 'CONTINUAR', 'RECOMEÇAR', 'JOGAR']) {
    assert.ok(html.includes(trecho), `faltou ${trecho} no index.html`);
  }

  assert.ok(/<header id="hud" class="hidden">/.test(html),
    'o HUD nasce escondido: no menu nao ha nada para mostrar');

  const menu = html.slice(html.indexOf('id="tela-menu"'), html.indexOf('id="tela-fase"'));
  assert.ok(/Qual é o seu nome\?/.test(menu), 'o menu pede o nome da crianca');
  assert.ok(/maxlength="14"/.test(menu), 'com um limite de letras');

  const cartaz = html.slice(html.indexOf('id="controles"'), html.indexOf('id="tela-pausa"'));
  assert.ok(cartaz.includes('Virar'), 'o cartaz lembra como virar');
  assert.ok(cartaz.includes('Pausa') && cartaz.includes('Tela cheia'),
    'e lembra da pausa e da tela cheia');
  assert.ok(cartaz.includes('hidden'), 'e ele nasce escondido, como o HUD');
});

teste('o style.css poe o cartaz no canto e cuida da tela cheia', () => {
  const css = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'come_come', 'style.css'), 'utf8');

  const cartaz = css.slice(css.indexOf('#controles{'), css.indexOf('#controles b{'));
  assert.ok(/position:\s*absolute/.test(cartaz), 'o cartaz flutua sobre o palco');
  assert.ok(/right:\s*8px/.test(cartaz) && /bottom:\s*8px/.test(cartaz),
    'no canto de baixo a direita');
  assert.ok(/pointer-events:\s*none/.test(cartaz), 'e sem roubar o toque do jogo');

  assert.ok(css.includes('html:fullscreen'), 'a moldura sai da frente em tela cheia');
  assert.ok(/\.botao-icone\{/.test(css), 'os botoes do HUD tem estilo proprio');
  assert.ok(/#campo-apelido\{/.test(css), 'e o campo do nome tambem');
});

await fim('Fase 7 (tela)');
