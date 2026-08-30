/* ==========================================================================
   Super Adventure - Fase 4: o jogo ligado, perdendo vidas e voltando ao
   checkpoint
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase4-tela.test.mjs

   O `fase4.test.mjs` cuida das funcoes puras. Aqui o game.js roda com a tela
   de mentira e a fase 1 de verdade:

     - o checkpoint aparece apagado (cinza) e acende quando o heroi encosta
     - acender avisa uma vez so e solta o efeito na tela
     - cair custa um coracao: o HUD perde um ❤️ e o heroi reaparece NO
       CHECKPOINT, com as moedas que ja tinha juntado
     - o checkpoint nao expira: a segunda queda devolve ao mesmo lugar
     - a terceira queda acaba com as vidas e a fase inteira recomeca do zero -
       moedas e blocos de volta, placar zerado, checkpoints apagados e os 3
       coracoes cheios de novo
     - o checkpoint mais novo e o que vale: depois de acender o terceiro, e
       nele que o heroi renasce
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, Mapa, Itens, Progresso, fase, mundo } = dom.api;
const M = Fisica.medidas;
const T = M.TILE;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const texto = (id) => dom.elementos[id].textContent;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

function soltarTudo() {
  ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
}

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

/**
 * O piloto automatico dos testes das fases 2 e 3 (segura a direita e pula na
 * parede ou no buraco), so que parando quando `pronto()` diz que chegou.
 */
function correrAte(pronto, maxQuadros = 3000) {
  let quadros = 0, xAnterior = -1, pulando = false;
  dom.tecla('ArrowRight', true);

  while (!pronto() && quadros < maxQuadros) {
    const h = heroi();
    const colunaAFrente = Math.floor((h.x + M.HEROI_L) / T);
    const linhaDosPes = Math.round((h.y + M.HEROI_A) / T);
    const buracoAFrente = !Mapa.solido(fase, colunaAFrente, linhaDosPes);

    if (h.noChao && (buracoAFrente || h.x === xAnterior) && !pulando) {
      dom.tecla(' ', true);
      pulando = true;
    } else if (pulando) {
      dom.tecla(' ', false);
      pulando = false;
    }

    xAnterior = h.x;
    dom.avancarQuadros(1);
    quadros++;
  }

  soltarTudo();
  return quadros;
}

/** Segura uma tecla enquanto `enquanto()` for verdade (ou desistir). */
function andarEnquanto(tecla, enquanto, maxQuadros = 200) {
  dom.tecla(tecla, true);
  let quadros = 0;
  while (enquanto() && quadros < maxQuadros) { dom.avancarQuadros(1); quadros++; }
  soltarTudo();
  return quadros;
}

/** Anda para a direita, sem pular, ate cair no proximo buraco. */
function cairNoProximoBuraco(maxQuadros = 600) {
  const quedasAntes = jogo.quedas;
  dom.tecla('ArrowRight', true);
  let quadros = 0;
  while (jogo.quedas === quedasAntes && quadros < maxQuadros) {
    dom.avancarQuadros(1);
    quadros++;
  }
  soltarTudo();
  assert.equal(jogo.quedas, quedasAntes + 1, `nao caiu em ${quadros} quadros`);
}

/** Onde o heroi deveria estar depois de renascer no checkpoint `i`. */
function peDoCheckpoint(i) {
  const cp = fase.checkpoints[i];
  return { x: cp.x, y: cp.y + cp.a - M.HEROI_A };
}

console.log('Super Adventure - fase 4 (tela)\n');

// ----------------------------------------------------- Antes de encostar ----
teste('a partida comeca com 3 coracoes e nenhum checkpoint ligado', () => {
  dom.clicar('btn-solo');

  assert.equal(jogo.vidas, 3);
  assert.equal(texto('hud-vidas'), '❤️❤️❤️');
  assert.equal(jogo.progresso.atual, -1);
  igual(jogo.progresso.ativos, [false, false, false]);
  assert.equal(heroi().x, fase.spawn.x, 'nasce no comeco da fase');
});

teste('cair antes de qualquer checkpoint devolve o heroi ao comeco', () => {
  dom.avancarQuadros(1);
  cairNoProximoBuraco();                   // o primeiro buraco fica na coluna 26

  assert.equal(jogo.vidas, 2, 'custou um coracao');
  assert.equal(texto('hud-vidas'), '❤️❤️', 'o HUD acompanha na hora');
  assert.equal(contar('vida-perdida'), 1);
  assert.equal(heroi().x, fase.spawn.x, 'sem checkpoint, volta para o comeco');
  assert.equal(heroi().y, fase.spawn.y);
  assert.equal(jogo.camera, 0, 'e a camera volta junto');
});

// ------------------------------------------------ Acendendo o checkpoint ----
teste('o checkpoint apagado e pintado em cinza', () => {
  correrAte(() => heroi().x > fase.checkpoints[0].x - 5 * T);
  dom.avancarQuadros(1);
  assert.equal(jogo.progresso.ativos[0], false, 'ainda nao encostou nele');
  assert.ok(pintadosDaCor('#585868') > 0, 'o mastro apagado esta na tela');
  assert.equal(pintadosDaCor('#78f800'), 0, 'nada aceso ainda');
});

teste('encostar no checkpoint acende ele, avisa uma vez e solta o efeito', () => {
  correrAte(() => jogo.progresso.ativos[0]);

  assert.equal(jogo.progresso.ativos[0], true, 'o checkpoint 0 acendeu');
  assert.equal(jogo.progresso.atual, 0, 'e virou o nascedouro');
  assert.equal(contar('checkpoint'), 1, 'avisou uma vez so');
  assert.ok(jogo.efeitos.some((f) => f.tipo === 'checkpoint'), 'soltou as faiscas');
  assert.equal(jogo.vidas, 2, 'acender checkpoint nao devolve nem tira vida');
});

teste('o checkpoint aceso e pintado colorido', () => {
  dom.avancarQuadros(1);
  assert.ok(pintadosDaCor('#78f800') > 0, 'a bandeirinha acesa esta na tela');
});

teste('passar de novo pelo checkpoint aceso nao avisa outra vez', () => {
  const cp = fase.checkpoints[0];
  const quedasAntes = jogo.quedas;

  // Vai um pouco adiante e volta - sem chegar perto do buraco que fica antes
  // do checkpoint, senao a ida e volta viraria uma queda.
  andarEnquanto('ArrowRight', () => heroi().x < cp.x + 3 * T);
  andarEnquanto('ArrowLeft', () => !Fisica.tocandoCorpo(heroi(), cp));

  assert.ok(Fisica.tocandoCorpo(heroi(), cp), 'encostou nele de novo');
  assert.equal(jogo.quedas, quedasAntes, 'a ida e volta foi em terra firme');
  assert.equal(contar('checkpoint'), 1, 'continua sendo um aviso so');
  assert.equal(jogo.progresso.ativos[0], true);
});

// ----------------------------------------- Cair depois do checkpoint aceso --
teste('cair depois do checkpoint devolve o heroi a ELE, nao ao comeco', () => {
  const pontosAntes = jogo.pontos;
  assert.ok(pontosAntes > 0, 'ja tinha juntado moeda no caminho');

  cairNoProximoBuraco();

  const pe = peDoCheckpoint(0);
  assert.equal(heroi().x, pe.x, 'renasceu na coluna do checkpoint');
  assert.equal(heroi().y, pe.y, 'e de pe no chao, nao no ar');
  assert.ok(heroi().x > fase.spawn.x, 'nao voltou para o comeco da fase');
  assert.equal(jogo.vidas, 1, 'segundo coracao perdido');
  assert.equal(texto('hud-vidas'), '❤️');
  assert.ok(jogo.pontos >= pontosAntes, 'o placar da tentativa continua de pe');
  assert.equal(jogo.pontos / 10, 100 - Itens.quantos(jogo.itens.moedas),
    'as moedas ja pegas continuam pegas');
  assert.equal(jogo.efeitos.length, 0, 'a tela limpou os efeitos');
});

teste('o checkpoint nao expira: continua aceso depois da queda', () => {
  assert.equal(jogo.progresso.ativos[0], true);
  assert.equal(jogo.progresso.atual, 0);
  dom.avancarQuadros(120);                 // e o tempo passando nao apaga nada
  assert.equal(jogo.progresso.ativos[0], true);
});

// ---------------------------------------- A ultima vida: a fase recomeca ----
teste('sem vidas, a fase inteira recomeca do zero', () => {
  const tentativasAntes = jogo.tentativas;
  assert.ok(jogo.pontos > 0 && Itens.quantos(jogo.itens.moedas) < 100,
    'tinha moedas juntadas para devolver');

  cairNoProximoBuraco();                   // a terceira queda

  assert.equal(contar('fase-reiniciada'), 1, 'avisou o reinicio da fase');
  assert.equal(jogo.quedas, 3, 'tres quedas seguidas');
  assert.equal(jogo.tentativas, tentativasAntes + 1, 'comecou uma tentativa nova');
  assert.equal(jogo.vidas, 3, 'os 3 coracoes de volta');
  assert.equal(texto('hud-vidas'), '❤️❤️❤️');
  assert.equal(jogo.pontos, 0, 'o placar zerou');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(Itens.quantos(jogo.itens.moedas), 100, 'as 100 moedas voltaram');
  assert.equal(Itens.quantos(jogo.itens.blocos), 10, 'os blocos tambem');
  igual(jogo.progresso.ativos, [false, false, false], 'checkpoints apagados');
  assert.equal(jogo.progresso.atual, -1);
  assert.equal(heroi().x, fase.spawn.x, 'de volta ao comeco da fase');
  assert.equal(heroi().y, fase.spawn.y);
  assert.equal(jogo.camera, 0);
});

teste('e o checkpoint volta a ser pintado apagado', () => {
  correrAte(() => heroi().x > fase.checkpoints[0].x - 5 * T);
  dom.avancarQuadros(1);
  assert.equal(pintadosDaCor('#78f800'), 0, 'nada aceso na tela');
  assert.ok(pintadosDaCor('#585868') > 0, 'o mastro esta apagado de novo');
});

// ------------------------------------------- Os tres checkpoints da fase ----
teste('os tres checkpoints acendem ao longo do percurso', () => {
  dom.clicar('btn-solo');                  // partida limpa
  correrAte(() => jogo.progresso.ativos[2]);

  igual(jogo.progresso.ativos, [true, true, true],
    'acendeu os tres no caminho');
  assert.equal(jogo.progresso.atual, 2, 'o mais novo e o terceiro');
  assert.equal(jogo.vidas, 3, 'chegou la sem cair nenhuma vez');
  assert.equal(jogo.quedas, 0);
});

teste('depois do terceiro checkpoint, e nele que o heroi renasce', () => {
  cairNoProximoBuraco();

  const pe = peDoCheckpoint(2);
  assert.equal(heroi().x, pe.x);
  assert.equal(heroi().y, pe.y);
  assert.equal(jogo.vidas, 2);
  assert.ok(jogo.camera > 0, 'a camera foi junto, la para o fim do mundo');
  igual(jogo.progresso.ativos, [true, true, true],
    'os tres continuam acesos');
});

teste('do terceiro checkpoint da para terminar a fase', () => {
  correrAte(() => jogo.concluida, 1500);
  assert.equal(jogo.concluida, true, 'chegou na bandeira');
  assert.equal(dom.elementos['tela-fim'].classList.contains('hidden'), false);
});

teste('"Jogar de novo" devolve as 3 vidas e apaga os checkpoints', () => {
  dom.clicar('btn-de-novo');

  assert.equal(jogo.vidas, 3);
  assert.equal(texto('hud-vidas'), '❤️❤️❤️');
  assert.equal(jogo.quedas, 0);
  assert.equal(jogo.tentativas, 1);
  igual(jogo.progresso.ativos, [false, false, false]);
  assert.equal(heroi().x, fase.spawn.x);
  assert.equal(Progresso.nascedouro(fase, jogo.progresso).x, fase.spawn.x);
});

await fim('Fase 4 (tela)');
