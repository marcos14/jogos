/* ==========================================================================
   Super Adventure - Fase 3: o jogo ligado, juntando moedas e quebrando blocos
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase3-tela.test.mjs

   O `fase3.test.mjs` cuida das funcoes puras. Aqui o game.js roda com a tela
   de mentira e a fase 1 de verdade:

     - o HUD comeca com 0 pontos, 3 coracoes e "Fase 1 / 3"
     - andar por cima das moedas soma 10 em cada uma e o HUD acompanha na hora
     - a moeda pega nao volta: passar de novo no mesmo lugar nao da ponto
     - dar uma cabecada num bloco quebravel tira ele do mundo, solta o efeito
       do cristal e para de pinta-lo na tela
     - o efeito e curto: some sozinho depois de alguns quadros
     - cair num buraco custa um coracao, mas nao devolve as moedas ja pegas
       (o reinicio da fase inteira so acontece quando as vidas acabam - isso
       quem testa e o fase4-tela)
     - o piloto automatico chega na bandeira com pontos no bolso, e a tela de
       fim mostra o mesmo numero do HUD
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, Mapa, Itens, fase, mundo } = dom.api;
const M = Fisica.medidas;
const T = M.TILE;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const texto = (id) => dom.elementos[id].textContent;

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

function soltarTudo() {
  ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
}

/** Segura uma tecla por `n` quadros e solta. */
function segurar(tecla, n) {
  dom.tecla(tecla, true);
  dom.avancarQuadros(n);
  dom.tecla(tecla, false);
}

/** Anda para a direita ate passar de `x` (ou desistir). */
function andarAte(x, maxQuadros = 400) {
  dom.tecla('ArrowRight', true);
  let quadros = 0;
  while (heroi().x < x && quadros < maxQuadros) { dom.avancarQuadros(1); quadros++; }
  dom.tecla('ArrowRight', false);
  dom.avancarQuadros(1);
  return quadros;
}

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

/** O mesmo piloto automatico do teste da fase 2. */
function jogarSozinho(maxQuadros) {
  let quadros = 0, xAnterior = -1, pulando = false;
  dom.tecla('ArrowRight', true);

  while (!jogo.concluida && quadros < maxQuadros) {
    const h = heroi();
    const colunaAFrente = Math.floor((h.x + M.HEROI_L) / T);
    const linhaDosPes = Math.round((h.y + M.HEROI_A) / T);
    const buracoAFrente = !Mapa.solido(fase, colunaAFrente, linhaDosPes);
    const parede = h.x === xAnterior;

    if (h.noChao && (buracoAFrente || parede) && !pulando) {
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

// O bloco quebravel da coluna 15, linha 11: o primeiro que da para alcancar
// vindo do comeco da fase.
const BLOCO_COL15 = fase.quebraveis.findIndex((b) => b.x === 15 * T && b.y === 11 * T);

console.log('Super Adventure - fase 3 (tela)\n');

// ----------------------------------------------------------------- HUD ------
teste('a partida comeca com 0 pontos, 3 coracoes e a fase 1 de 3', () => {
  dom.clicar('btn-solo');

  assert.equal(jogo.pontos, 0);
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(texto('hud-vidas'), '❤️❤️❤️');
  assert.equal(jogo.vidas, mundo.VIDAS_INICIAIS);
  assert.equal(texto('hud-fase'), `1 / ${mundo.TOTAL_FASES}`);
  assert.equal(dom.elementos.hud.classList.contains('hidden'), false, 'o HUD aparece');
});

teste('o mundo comeca com as 100 moedas e os 10 blocos de pe', () => {
  assert.equal(Itens.quantos(jogo.itens.moedas), 100);
  assert.equal(Itens.quantos(jogo.itens.blocos), 10);
});

// --------------------------------------------------------------- Moedas -----
teste('andar por cima das moedas soma 10 em cada uma, e o HUD acompanha', () => {
  dom.avancarQuadros(1);                   // o primeiro quadro so acerta o relogio
  assert.equal(jogo.pontos, 0, 'ainda nao encostou em nada');

  segurar('ArrowRight', 60);               // as 3 moedas do comeco (colunas 5, 6 e 7)

  assert.equal(jogo.pontos, 30, 'tres moedas, 10 pontos cada');
  assert.equal(texto('hud-pontos'), '30', 'o HUD mostra o mesmo numero');
  assert.equal(contar('moeda'), 3, 'avisou uma vez por moeda');
  assert.equal(Itens.quantos(jogo.itens.moedas), 97);
});

teste('a moeda pega nao volta: passar de novo nao da ponto nenhum', () => {
  segurar('ArrowLeft', 60);                // volta por cima do mesmo caminho
  segurar('ArrowRight', 60);               // e passa de novo
  assert.equal(jogo.pontos, 30, 'o placar ficou onde estava');
  assert.equal(Itens.quantos(jogo.itens.moedas), 97);
});

teste('as moedas que ainda existem sao pintadas na tela', () => {
  dom.avancarQuadros(1);
  assert.ok(pintadosDaCor('#fcd800') > 0, 'tem moeda dourada na tela');
});

// ------------------------------------------------- Os blocos quebraveis -----
teste('o bloco quebravel aparece na tela antes de levar a cabecada', () => {
  andarAte(15 * T + 1);                    // debaixo do bloco da coluna 15
  assert.ok(jogo.itens.blocos[BLOCO_COL15], 'o bloco ainda esta de pe');
  assert.ok(pintadosDaCor('#6844fc') > 0, 'o bloco esta sendo pintado');
});

teste('pular por baixo do bloco quebra ele e solta o cristal', () => {
  const pontosAntes = jogo.pontos;
  const blocosAntes = Itens.quantos(jogo.itens.blocos);

  dom.tecla(' ', true);
  dom.avancarQuadros(6);
  dom.tecla(' ', false);

  assert.equal(jogo.itens.blocos[BLOCO_COL15], false, 'o bloco sumiu do mundo');
  assert.equal(Itens.quantos(jogo.itens.blocos), blocosAntes - 1, 'so ele sumiu');
  assert.equal(contar('bloco-quebrado'), 1, 'avisou quem estava escutando');
  assert.ok(jogo.efeitos.some((f) => f.tipo === 'cristal'), 'soltou o cristal');
  assert.equal(jogo.pontos, pontosAntes + 10,
    'e de quebra pegou a moeda que estava debaixo do bloco');
  assert.equal(texto('hud-pontos'), String(jogo.pontos));
});

teste('o bloco quebrado sai dos solidos: o pulo passa direto por ali', () => {
  const noLugarDoBloco = jogo.itens.limites.solidos.some(
    (s) => s.x === 15 * T && s.y === 11 * T);
  assert.equal(noLugarDoBloco, false);

  dom.avancarQuadros(40);                  // deixa o heroi voltar ao chao
  const chao = heroi().y;
  let maisAlto = chao;
  dom.tecla(' ', true);
  for (let i = 0; i < 40; i++) { dom.avancarQuadros(1); maisAlto = Math.min(maisAlto, heroi().y); }
  dom.tecla(' ', false);
  dom.avancarQuadros(40);

  assert.ok(chao - maisAlto > 11 * T - chao, 'passou da altura onde o bloco estava');
});

teste('o efeito do cristal e curto: some sozinho', () => {
  dom.avancarQuadros(40);
  assert.equal(jogo.efeitos.length, 0, 'nenhum efeito ficou pendurado');

  // O lugar onde o bloco estava fica vazio; os vizinhos continuam pintados.
  const noLugar = dom.pintados.filter(
    (p) => p.cor === '#6844fc' && p.x === 15 * T - jogo.camera + 2);
  assert.equal(noLugar.length, 0, 'o bloco quebrado nao e mais pintado');
  assert.ok(pintadosDaCor('#6844fc') > 0, 'mas os blocos vizinhos continuam la');
});

// ------------------------------------- Cair custa uma vida, nao o placar ----
// (a regra completa - checkpoints e reinicio sem vidas - esta no fase4-tela)
teste('cair num buraco custa uma vida, mas as moedas ja pegas continuam pegas', () => {
  soltarTudo();
  const pontosAntes = jogo.pontos;
  const blocosAntes = Itens.quantos(jogo.itens.blocos);
  assert.ok(pontosAntes > 0, 'tinha pontos antes de cair');

  const quedasAntes = jogo.quedas;
  dom.tecla('ArrowRight', true);   // no caminho ate o buraco ainda pega moedas
  for (let i = 0; i < 600 && jogo.quedas === quedasAntes; i++) dom.avancarQuadros(1);
  soltarTudo();

  assert.equal(jogo.quedas, quedasAntes + 1, 'caiu no buraco');
  assert.ok(jogo.pontos >= pontosAntes, 'o placar da tentativa ficou de pe');
  assert.equal(texto('hud-pontos'), String(jogo.pontos));
  assert.equal(jogo.pontos / 10, 100 - Itens.quantos(jogo.itens.moedas),
    'moeda pega nao volta: os pontos continuam batendo com o mapa');
  assert.equal(Itens.quantos(jogo.itens.blocos), blocosAntes,
    'bloco quebrado continua quebrado');
  assert.equal(jogo.efeitos.length, 0);
  assert.equal(jogo.vidas, 2, 'foi-se um coracao');
  assert.equal(texto('hud-vidas'), '❤️❤️');
});

// -------------------------------------------------- Uma fase inteirinha -----
teste('o piloto automatico chega na bandeira com moedas no bolso', () => {
  dom.clicar('btn-solo');                  // partida limpa
  const quadros = jogarSozinho(4000);

  assert.equal(jogo.concluida, true, `nao chegou na bandeira em ${quadros} quadros`);
  assert.ok(jogo.pontos >= 100, `juntou so ${jogo.pontos} pontos no caminho`);
  assert.equal(jogo.pontos % 10, 0, 'todo ponto veio de moeda (10 em 10)');
  assert.equal(jogo.pontos / 10, 100 - Itens.quantos(jogo.itens.moedas),
    'os pontos batem com as moedas que sumiram do mapa');
});

teste('a tela de fim mostra o mesmo placar do HUD', () => {
  assert.equal(dom.elementos['tela-fim'].classList.contains('hidden'), false);
  assert.equal(texto('fim-pontos'), String(jogo.pontos));
  assert.equal(texto('hud-pontos'), String(jogo.pontos));
});

teste('"Jogar de novo" devolve o mundo inteiro e zera o placar', () => {
  dom.clicar('btn-de-novo');
  assert.equal(jogo.pontos, 0);
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(Itens.quantos(jogo.itens.moedas), 100);
  assert.equal(Itens.quantos(jogo.itens.blocos), 10);
  assert.equal(heroi().x, fase.spawn.x);
});

teste('o desenho continua barato mesmo com moedas e blocos na tela', () => {
  dom.avancarQuadros(1);
  const longeDaTela = dom.pintados.filter(
    (p) => p.x + p.l < -320 || p.x > mundo.LARGURA + 320);
  assert.equal(longeDaTela.length, 0, 'ninguem pinta longe da tela');
  assert.ok(dom.pintados.length < 1200,
    `${dom.pintados.length} retangulos num quadro`);
});

await fim('Fase 3 (tela)');
