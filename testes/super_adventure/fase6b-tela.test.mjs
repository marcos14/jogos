/* ==========================================================================
   Super Adventure - Fase 6b (tela): uma corrida inteira, fase 1 -> 2 -> 3
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase6b-tela.test.mjs

   Aqui o jogo roda de verdade (menu, teclado, laco de quadros e desenho) num
   DOM de mentira, e o piloto automatico joga a partida solo do comeco ao fim:

     - a bandeira das fases 1 e 2 abre o quadro "FASE N CONCLUIDA", com o que
       a fase rendeu, o bonus de +50 e o botao que leva para a proxima
     - o botao so anda para a frente: clicar no meio da fase nao faz nada, e
       depois da fase 3 ele nao leva a lugar nenhum
     - a bandeira da fase 3 traz o PARABENS, com os pontos de cada fase e o
       total - que tem de bater com a soma das tres fases + 3 bonus
     - "Jogar novamente" zera tudo e devolve o jogo para a fase 1
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, criarPiloto, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { mundo, mapas } = dom.api;
const BONUS = mundo.PONTOS_BANDEIRA;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const fase = () => dom.api.fase;
const texto = (id) => dom.elementos[id].textContent;
const escondida = (id) => dom.elementos[id].classList.contains('hidden');
const correr = criarPiloto(dom);

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** O que cada fase rendeu, anotado na hora em que a bandeira foi tocada. */
const rendeu = [];

/** Corre a fase que estiver em jogo ate a bandeira e anota os pontos. */
function jogarAFase(maxQuadros = 6000) {
  const quadros = correr(() => jogo.concluida, maxQuadros);
  assert.equal(jogo.concluida, true,
    `nao chegou na bandeira da fase ${jogo.fase} em ${quadros} quadros`);
  rendeu.push(jogo.pontos);
  return jogo.pontos;
}

console.log('Super Adventure - fase 6b (tela)\n');

// ------------------------------------------------------------- A fase 1 ----
teste('a corrida comeca na fase 1, com o caderno em branco', () => {
  dom.clicar('btn-solo');

  assert.equal(jogo.fase, 1);
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(jogo.corrida.fase, 1);
  igual(jogo.corrida.fases, []);
  assert.equal(jogo.corrida.total, 0);
  assert.equal(jogo.corrida.terminada, false);
  assert.equal(escondida('tela-fase'), true, 'sem quadro de fim de fase');
  assert.equal(escondida('tela-fim'), true, 'e sem PARABENS');
});

teste('clicar em "proxima fase" no meio da fase nao adianta nada', () => {
  dom.avancarQuadros(30);
  dom.clicar('btn-proxima');

  assert.equal(jogo.fase, 1, 'continua na fase 1');
  assert.equal(fase(), mapas[0]);
  assert.equal(escondida('tela-fase'), true);
});

teste('a bandeira da fase 1 abre o quadro "FASE 1 CONCLUIDA"', () => {
  const pontos = jogarAFase();

  assert.equal(contar('fase-concluida'), 1);
  assert.equal(contar('corrida-vencida'), 0, 'a corrida ainda nao acabou');
  assert.equal(escondida('tela-fase'), false, 'o quadro da fase apareceu');
  assert.equal(escondida('tela-fim'), true, 'o PARABENS continua guardado');

  assert.equal(texto('fase-numero'), '1');
  assert.equal(texto('fase-pontos'), String(pontos), 'os pontos da fase');
  assert.equal(texto('fase-bonus'), '+' + BONUS);
  assert.equal(texto('fase-proxima'), '2', 'o botao aponta para a fase 2');
});

teste('a fase 1 entrou no caderno com o bonus da bandeira', () => {
  const c = jogo.corrida;
  assert.equal(c.fases.length, 1);
  igual(c.fases[0],
    { numero: 1, pontos: rendeu[0], bonus: BONUS, total: rendeu[0] + BONUS });
  assert.equal(c.total, rendeu[0] + BONUS);
  assert.equal(c.fase, 2, 'e a proxima fase e a 2');
  assert.equal(jogo.fase, 1, 'mas o mundo em jogo ainda e o da fase 1');
});

// ------------------------------------------------------------- A fase 2 ----
teste('"proxima fase" leva para a fase 2 e troca o mundo inteiro', () => {
  dom.clicar('btn-proxima');

  assert.equal(jogo.fase, 2);
  assert.equal(texto('hud-fase'), '2 / 3');
  assert.equal(fase(), mapas[1], 'o mundo em jogo e o mapa da fase 2');
  assert.equal(fase().moedas.length, 80, 'com as 80 moedas dela');
  assert.equal(escondida('tela-fase'), true, 'o quadro sumiu');
  assert.equal(jogo.concluida, false, 'e a fase nova comeca aberta');

  assert.equal(jogo.pontos, 0, 'o placar do HUD recomeca do zero na fase nova');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(jogo.vidas, 3, 'com as tres vidas cheias');
  assert.equal(heroi().x, mapas[1].spawn.x, 'e o heroi no spawn da fase 2');
  assert.equal(jogo.corrida.total, rendeu[0] + BONUS,
    'o que a fase 1 rendeu continua guardado no caderno');
});

teste('a bandeira da fase 2 abre o quadro dela, apontando para a fase 3', () => {
  const pontos = jogarAFase();

  assert.equal(contar('fase-concluida'), 2);
  assert.equal(contar('corrida-vencida'), 0);
  assert.equal(escondida('tela-fase'), false);
  assert.equal(escondida('tela-fim'), true);

  assert.equal(texto('fase-numero'), '2');
  assert.equal(texto('fase-pontos'), String(pontos));
  assert.equal(texto('fase-proxima'), '3');
  assert.equal(jogo.corrida.fase, 3);
  assert.equal(jogo.corrida.terminada, false);
});

// ------------------------------------------------------------- A fase 3 ----
teste('"proxima fase" leva para a fase 3, a ultima', () => {
  dom.clicar('btn-proxima');

  assert.equal(jogo.fase, 3);
  assert.equal(texto('hud-fase'), '3 / 3');
  assert.equal(fase().moedas.length, 60, 'as 60 moedas da fase 3');
  assert.equal(jogo.pontos, 0);
  assert.equal(escondida('tela-fase'), true);
  igual(jogo.corrida.fases.map((f) => f.numero), [1, 2],
    'com as duas primeiras fases ja no caderno');
});

teste('a bandeira da fase 3 termina a corrida e traz o PARABENS', () => {
  jogarAFase();

  assert.equal(contar('fase-concluida'), 3);
  assert.equal(contar('corrida-vencida'), 1, 'a corrida foi vencida uma vez');
  assert.equal(avisos[avisos.length - 1], 'corrida-vencida');
  assert.equal(escondida('tela-fim'), false, 'o PARABENS apareceu');
  assert.equal(escondida('tela-fase'), true, 'no lugar do quadro de fim de fase');
  assert.equal(jogo.corrida.terminada, true);
});

teste('a tela final lista os pontos das tres fases', () => {
  igual(jogo.corrida.fases.map((f) => f.numero), [1, 2, 3]);

  jogo.corrida.fases.forEach((linha, i) => {
    assert.equal(linha.pontos, rendeu[i], `a fase ${i + 1} rendeu o que rendeu`);
    assert.equal(linha.bonus, BONUS);
    assert.equal(texto(`fim-fase-${i + 1}`),
      `${rendeu[i]} + ${BONUS} = ${rendeu[i] + BONUS}`,
      `a linha da fase ${i + 1} na tela`);
  });
});

teste('o total soma as tres fases mais os tres bonus da bandeira', () => {
  const soma = rendeu.reduce((a, b) => a + b, 0);

  assert.equal(rendeu.length, 3, 'as tres fases foram jogadas');
  assert.ok(soma > 0, `a corrida rendeu ${soma} pontos de moedas e bichos`);
  assert.equal(jogo.corrida.total, soma + 3 * BONUS);
  assert.equal(texto('fim-total'), String(soma + 3 * BONUS),
    'e e esse o numero que aparece na tela');
});

teste('depois do PARABENS o botao de proxima fase nao leva a lugar nenhum', () => {
  dom.clicar('btn-proxima');

  assert.equal(jogo.fase, 3, 'continua na fase 3');
  assert.equal(escondida('tela-fim'), false, 'com o PARABENS na tela');
  assert.equal(jogo.corrida.fases.length, 3, 'sem inventar uma quarta fase');
});

teste('com a corrida vencida o mundo para de andar', () => {
  const antes = { x: heroi().x, y: heroi().y, relogio: jogo.relogio };
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(60);
  dom.tecla('ArrowRight', false);

  assert.equal(heroi().x, antes.x, 'o heroi ficou parado na bandeira');
  assert.equal(heroi().y, antes.y);
  assert.equal(jogo.relogio, antes.relogio);
  assert.ok(dom.pintados.length > 0, 'mas a cena continua sendo desenhada');
});

// ------------------------------------------------------ Jogar novamente ----
teste('"Jogar novamente" zera a corrida e volta para a fase 1', () => {
  dom.clicar('btn-de-novo');

  assert.equal(jogo.fase, 1);
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(fase(), mapas[0]);
  assert.equal(fase().moedas.length, 100);
  assert.equal(heroi().x, mapas[0].spawn.x, 'o heroi voltou para o comeco');

  assert.equal(jogo.corrida.fase, 1);
  igual(jogo.corrida.fases, [], 'o caderno esta em branco de novo');
  assert.equal(jogo.corrida.total, 0);
  assert.equal(jogo.corrida.terminada, false);

  assert.equal(jogo.pontos, 0);
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(jogo.vidas, 3);
  assert.equal(jogo.relogio, 0);
  assert.equal(jogo.quedas, 0);
  assert.equal(jogo.tentativas, 1);
  assert.equal(jogo.concluida, false);
  assert.equal(escondida('tela-fase'), true);
  assert.equal(escondida('tela-fim'), true);
  assert.equal(escondida('hud'), false, 'e o HUD continua na tela');
});

teste('a corrida nova joga a fase 1 de novo, do zero', () => {
  const pontos = correr(() => jogo.concluida, 6000) && jogo.pontos;

  assert.equal(jogo.concluida, true, 'chegou na bandeira da fase 1 outra vez');
  assert.equal(jogo.corrida.fases.length, 1, 'a primeira linha do caderno novo');
  assert.equal(jogo.corrida.fases[0].numero, 1);
  assert.equal(jogo.corrida.total, pontos + BONUS);
  assert.equal(texto('fase-numero'), '1');
  assert.equal(texto('fase-proxima'), '2');
});

await fim('Fase 6b (tela)');
