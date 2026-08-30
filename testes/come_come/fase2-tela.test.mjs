/* ==========================================================================
   Come-Come - Fase 2: o HUD e o labirinto limpo de ponta a ponta
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase2-tela.test.mjs

   O `fase2.test.mjs` cuida do modulo puro. Aqui o game.js roda com uma tela de
   mentira e um PILOTO AUTOMATICO no lugar da crianca: a cada centro de
   quadrado ele procura a pastilha mais perto (uma busca em largura pelo
   labirinto, com o tunel e tudo) e aperta a seta daquele lado. Assim da para
   percorrer o labirinto inteiro ate limpa-lo e conferir o que a fase 2
   promete: os pontos subindo no HUD, as pastilhas sumindo do desenho e a fase
   dada por concluida quando a ultima some.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Mapa, Movimento, Pastilhas, mundo } = dom.api;
const mapa = dom.api.mapas[0];
const TILE = mundo.TILE;

const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const coluna = () => Mapa.coluna(come().x);
const linha = () => Mapa.linha(come().y);
const faltam = () => Pastilhas.faltam(jogo().pastilhas);

const COR_PASTILHA = '#fcd8a8';
const pastilhasPintadas = () => dom.pintados.filter((p) => p.cor === COR_PASTILHA).length;

/** Poe o come-come no centro de um quadrado, olhando para onde o teste quer. */
function porNoQuadrado(c, l, dir) {
  const corpo = come();
  const meio = Mapa.centro(c, l);
  corpo.x = meio.x;
  corpo.y = meio.y;
  corpo.dir = dir;
  corpo.desejada = dir;
  corpo.parado = false;
  dom.api.entrada.desejada = dir;
}

/* --------------------------------------------------------------------------
   O piloto automatico: uma busca em largura a partir do quadrado em que o
   come-come esta, ate a pastilha inteira mais perto. Devolve a PRIMEIRA
   direcao do caminho - que e o que uma crianca apertaria ali.
   -------------------------------------------------------------------------- */
function direcaoParaAPastilhaMaisPerto() {
  const c0 = coluna();
  const l0 = linha();
  const chave = (c, l) => `${c},${l}`;
  const veio = new Map([[chave(c0, l0), null]]);
  const fila = [{ c: c0, l: l0 }];

  for (let i = 0; i < fila.length; i++) {
    const aqui = fila[i];
    const pastilha = Mapa.pastilhaEm(mapa, aqui.c, aqui.l);
    if (pastilha >= 0 && Pastilhas.existe(jogo().pastilhas, pastilha)) {
      // Volta pelo caminho ate o comeco: o primeiro passo e o que interessa.
      let passo = veio.get(chave(aqui.c, aqui.l));
      if (!passo) continue;                       // ja estamos em cima dela
      while (veio.get(chave(passo.c, passo.l))) {
        passo = veio.get(chave(passo.c, passo.l));
      }
      return passo.dir;
    }
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(mapa, aqui.c, aqui.l, dir)) continue;
      const v = Mapa.vizinho(mapa, aqui.c, aqui.l, dir);
      if (veio.has(chave(v.c, v.l))) continue;
      veio.set(chave(v.c, v.l), { c: aqui.c, l: aqui.l, dir });
      fila.push(v);
    }
  }
  return null;
}

/**
 * Roda o jogo com o piloto automatico no volante ate o labirinto ficar limpo
 * (ou desistir). Cada decisao vale um quadrado: 16px a 2px por quadro sao 8
 * quadros exatos, entao no fim deles o come-come esta no centro do seguinte.
 */
function limparOLabirinto(maxDecisoes = 3000) {
  for (let i = 0; i < maxDecisoes; i++) {
    if (jogo().tela !== 'jogando') return i;
    if (!Movimento.noCentro(come())) { dom.avancarQuadros(1); continue; }

    const dir = direcaoParaAPastilhaMaisPerto();
    assert.ok(dir, `sem caminho para a proxima pastilha (faltavam ${faltam()})`);
    dom.api.entrada.desejada = dir;
    dom.avancarQuadros(8);
  }
  assert.fail(`o piloto nao limpou o labirinto (faltaram ${faltam()})`);
}

console.log('Come-Come - fase 2 (tela)\n');

// ------------------------------------------------------------ O comeco -----
teste('o HUD abre zerado, com as tres vidas e a fase 1 de 3', () => {
  assert.equal(dom.texto('hud-pontos'), '0');
  assert.equal(dom.texto('hud-vidas'), '🟡🟡🟡', 'tres vidas, ainda sem morrer');
  assert.equal(dom.texto('hud-fase'), '1 / 3');
  assert.equal(dom.texto('hud-faltam'), '244', 'as 244 pastilhas do labirinto 1');
  assert.equal(dom.escondido('tela-fase'), true, 'a fase mal comecou');

  assert.equal(jogo().pontos, 0);
  assert.equal(jogo().vidas, 3);
  assert.equal(faltam(), 244);

  dom.avancarQuadros(1);       // o primeiro quadro de todos so acerta o relogio
});

teste('nascer em cima do P nao ganha ponto de graca', () => {
  assert.equal(coluna(), 13);
  assert.equal(linha(), 23);
  dom.avancarQuadros(3);
  assert.equal(jogo().pontos, 0, 'no quadrado do nascimento nao ha pastilha');
  assert.equal(faltam(), 244);
});

// ------------------------------------------------------------- Comendo -----
teste('passar por cima de uma pastilha soma 10 no HUD e ela some do desenho', () => {
  porNoQuadrado(13, 23, 'esquerda');
  const antesPontos = jogo().pontos;
  const antesFaltam = faltam();
  const antesPintadas = (dom.avancarQuadros(1), pastilhasPintadas());

  // O vizinho da esquerda do nascimento tem pastilha: sao 8 quadros ate o
  // centro dele (16px de quadrado, 2px por quadro).
  assert.equal(Mapa.pastilhaEm(mapa, 12, 23) >= 0, true);
  dom.avancarQuadros(8);

  assert.equal(coluna(), 12);
  assert.equal(jogo().pontos, antesPontos + 10);
  assert.equal(faltam(), antesFaltam - 1);
  assert.equal(dom.texto('hud-pontos'), String(antesPontos + 10), 'o HUD acompanhou');
  assert.equal(dom.texto('hud-faltam'), String(antesFaltam - 1));
  assert.equal(pastilhasPintadas(), antesPintadas - 1, 'uma pastilha a menos na tela');
});

teste('a mesma pastilha nao conta duas vezes', () => {
  const pontos = jogo().pontos;
  const restantes = faltam();
  dom.avancarQuadros(3);       // ainda dentro do mesmo quadrado
  assert.equal(jogo().pontos, pontos, 'o quadrado ja estava limpo');

  porNoQuadrado(12, 23, 'esquerda');
  dom.avancarQuadros(1);
  assert.equal(jogo().pontos, pontos, 'voltar para cima dela tambem nao rende');
  assert.equal(faltam(), restantes);
});

teste('a pastilha de poder vale 50 (e ainda nao faz mais nada)', () => {
  const poder = mapa.pastilhas[mapa.poderes[0]];
  assert.equal(Pastilhas.existe(jogo().pastilhas, mapa.poderes[0]), true);

  porNoQuadrado(poder.c, poder.l, 'direita');
  const pontos = jogo().pontos;
  dom.avancarQuadros(1);

  assert.equal(jogo().pontos, pontos + 50, 'a de poder rende cinco pastilhas');
  assert.equal(dom.texto('hud-pontos'), String(pontos + 50));
  assert.equal(Pastilhas.existe(jogo().pastilhas, mapa.poderes[0]), false);
  assert.equal(jogo().tela, 'jogando', 'nenhum efeito por enquanto');
});

// ----------------------------------------------------- O labirinto limpo ----
teste('o piloto automatico percorre o labirinto inteiro e o deixa limpo', () => {
  const decisoes = limparOLabirinto();
  assert.ok(decisoes > 100, `o piloto andou de verdade (${decisoes} decisoes)`);

  assert.equal(faltam(), 0, 'nenhuma pastilha sobrou');
  assert.equal(Pastilhas.limpo(jogo().pastilhas), true);
  assert.equal(dom.texto('hud-faltam'), '0');

  // Cada uma foi contada uma vez so: o total do labirinto, nem mais nem menos.
  assert.equal(jogo().pontos, 2600, '240 x 10 + 4 x 50');
  assert.equal(jogo().pontos, Pastilhas.totalDoLabirinto(mapa));
  assert.equal(dom.texto('hud-pontos'), '2600', 'e o HUD mostra o mesmo numero');
});

teste('a ultima pastilha fecha a fase, com o placar na tela', () => {
  assert.equal(jogo().tela, 'fase');
  assert.equal(dom.escondido('tela-fase'), false, 'a tela de fim de fase subiu');
  assert.equal(dom.texto('fase-numero'), '1');
  assert.equal(dom.texto('fase-pontos'), '2600');
});

teste('com a fase concluida o mundo congela, mas a tela continua sendo pintada', () => {
  const relogio = jogo().relogio;
  const onde = { x: come().x, y: come().y };

  dom.tecla('ArrowLeft');
  dom.avancarQuadros(30);

  assert.equal(jogo().relogio, relogio, 'nenhum passo de mundo a mais');
  assert.equal(come().x, onde.x, 'e o come-come ficou onde parou');
  assert.equal(come().y, onde.y);
  assert.ok(dom.pintados.length > 200, 'o laco de desenho nao parou');
});

// ----------------------------------------------------- Um jogo novo em paz --
teste('um jogo recem-aberto nasce com o labirinto cheio de novo', () => {
  const novo = carregarJogoComTela('come_come');
  novo.avancarQuadros(1);
  assert.equal(Pastilhas.faltam(novo.api.jogo.pastilhas), 244);
  assert.equal(novo.api.jogo.pontos, 0);
  assert.equal(novo.texto('hud-pontos'), '0');
  assert.equal(novo.escondido('tela-fase'), true);
  assert.equal(
    novo.pintados.filter((p) => p.cor === COR_PASTILHA).length,
    mapa.totalPastilhas,
    'as 244 pastilhas pintadas',
  );
});

await fim('Fase 2 (tela)');
