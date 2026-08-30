/* ==========================================================================
   Super Adventure - Fase 6a (tela): as fases 2 e 3 jogadas de verdade
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase6a-tela.test.mjs

   Aqui o jogo roda de verdade (menu, teclado, laco de quadros e desenho) num
   DOM de mentira, e o que se confere e a fase 6a dentro da partida:
     - trocar de fase troca o mundo inteiro: mapa, moedas, bichos, checkpoints,
       plataformas moveis, HUD e placar
     - o piloto automatico atravessa a fase 2 inteira ate a bandeira, com as
       80 moedas no lugar e os 3 checkpoints acendendo pelo caminho
     - os checkpoints das fases novas funcionam: cair depois de acender um
       devolve o heroi a ELE, nao ao comeco da fase
     - as plataformas moveis da fase 3 andam sozinhas, sao pintadas na tela e
       CARREGAM o heroi que esta em cima - tanto a ponte deitada quanto o
       elevador, que e o unico jeito de chegar no alto do paredao
     - o piloto automatico tambem atravessa a fase 3 inteira ate a bandeira
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, criarPiloto, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, Inimigos, mapas } = dom.api;
const M = Fisica.medidas;
const T = M.TILE;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const fase = () => dom.api.fase;
const texto = (id) => dom.elementos[id].textContent;
const correr = criarPiloto(dom);

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

const COR_MOVEL = '#a4a4c4';        // o ferro da plataforma movel, so dela

/** Poe o heroi de pe exatamente em (x, y). */
function porHeroiEm(x, y) {
  jogo.heroi = Fisica.novoCorpo(x, y);
}

/** Acende o checkpoint `i` da fase atual encostando o heroi nele. */
function acenderCheckpoint(i) {
  const cp = fase().checkpoints[i];
  porHeroiEm(cp.x, cp.y + cp.a - M.HEROI_A);
  dom.avancarQuadros(1);
  assert.equal(jogo.progresso.ativos[i], true, `o checkpoint ${i} acendeu`);
  return cp;
}

/** Larga o heroi no buraco da coluna `coluna` e espera a queda. */
function cairNoBuraco(coluna, maxQuadros = 120) {
  const quedas = contar('queda');
  porHeroiEm(coluna * T + 8, 13 * T);
  let q = 0;
  while (contar('queda') === quedas && q < maxQuadros) { dom.avancarQuadros(1); q++; }
  assert.equal(contar('queda'), quedas + 1, `nao caiu no buraco em ${q} quadros`);
}

console.log('Super Adventure - fase 6a (tela)\n');

// ------------------------------------------------------------ Trocar de fase --
teste('a partida comeca sempre na fase 1 de 3', () => {
  dom.clicar('btn-solo');
  assert.equal(jogo.fase, 1);
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(fase().moedas.length, 100);
  assert.equal(fase(), mapas[0], 'o mundo em jogo e o mapa da fase 1');
});

teste('ir para a fase 2 troca o mundo inteiro', () => {
  jogo.pontos = 999;
  dom.api.irParaFase(2);

  assert.equal(jogo.fase, 2);
  assert.equal(texto('hud-fase'), '2 / 3', 'o HUD acompanha');
  assert.equal(fase(), mapas[1]);
  assert.equal(fase().moedas.length, 80, 'as 80 moedas da fase 2');
  assert.equal(jogo.itens.moedas.length, 80, 'todas de pe');
  assert.equal(jogo.inimigos.lista.length, 6, 'e os seis bichos dela');
  assert.equal(Inimigos.quantos(jogo.inimigos), 6, 'todos vivos');
  igual(heroi().x, fase().spawn.x, 'o heroi nasce no comeco da fase nova');
  assert.equal(jogo.pontos, 0, 'com o placar zerado');
  assert.equal(texto('hud-pontos'), '0');
  assert.equal(jogo.vidas, 3, 'e as tres vidas cheias');
  igual(jogo.progresso.ativos, [false, false, false], 'nenhum checkpoint aceso');
});

teste('os bichos da fase 2 andam mais rapido que os da fase 1', () => {
  dom.avancarQuadros(1);
  const antes = jogo.inimigos.lista.map((i) => i.x);
  dom.avancarQuadros(1);
  const passos = jogo.inimigos.lista.map((i, n) => Math.abs(i.x - antes[n]));

  passos.forEach((passo, n) => {
    assert.ok(passo === 3 || passo === 0,
      `o bicho ${n} andou ${passo}px (devia ser 3, ou 0 no quadro da virada)`);
  });
  assert.ok(passos.filter((p) => p === 3).length >= 5, 'quase todos andando');
});

teste('o checkpoint da fase 2 devolve o heroi a ELE depois da queda', () => {
  const cp = acenderCheckpoint(0);
  const vidas = jogo.vidas;

  cairNoBuraco(112);                          // o ultimo buraco da fase 2

  assert.equal(jogo.vidas, vidas - 1, 'custou um coracao');
  assert.equal(heroi().x, cp.x, 'renasceu no checkpoint, nao no comeco');
  assert.equal(heroi().y, cp.y + cp.a - M.HEROI_A);
  assert.notEqual(cp.x, fase().spawn.x, 'que nao e o comeco da fase');
});

teste('o piloto automatico atravessa a fase 2 inteira ate a bandeira', () => {
  dom.api.irParaFase(2);
  const moedasAntes = contar('moeda');
  const quadros = correr(() => jogo.concluida, 6000);

  assert.equal(jogo.concluida, true, `nao chegou na bandeira em ${quadros} quadros`);
  assert.equal(contar('fase-concluida'), 1);
  igual(jogo.progresso.ativos, [true, true, true],
    'acendeu os tres checkpoints no caminho');
  assert.ok(contar('moeda') - moedasAntes > 40, 'juntou moedas pelo caminho');
  assert.ok(jogo.pontos > 0);
  assert.equal(texto('hud-pontos'), String(jogo.pontos), 'e o HUD acompanha');
  assert.equal(jogo.tentativas, 1, 'sem precisar recomecar a fase');
});

// ------------------------------------------------------------- A fase 3 -----
teste('ir para a fase 3 traz as 60 moedas e as quatro plataformas moveis', () => {
  dom.api.irParaFase(3);

  assert.equal(jogo.fase, 3);
  assert.equal(texto('hud-fase'), '3 / 3');
  assert.equal(fase().moedas.length, 60, 'as 60 moedas da fase 3');
  assert.equal(fase().moveis.length, 4);
  assert.equal(jogo.moveis.lista.length, 4, 'as quatro estao em jogo');
  jogo.moveis.lista.forEach((m, i) => {
    igual([m.x, m.y], [fase().moveis[i].x, fase().moveis[i].y],
      `a plataforma ${i} comeca onde o desenho pos ela`);
  });
  assert.equal(jogo.concluida, false, 'e a fase recomeca por aberta');
});

teste('as plataformas moveis andam sozinhas, 1px por quadro', () => {
  dom.avancarQuadros(1);
  const antes = jogo.moveis.lista.map((m) => ({ x: m.x, y: m.y }));
  dom.avancarQuadros(10);

  jogo.moveis.lista.forEach((m, i) => {
    const andou = m.eixo === 'x' ? m.x - antes[i].x : m.y - antes[i].y;
    assert.equal(Math.abs(andou), 10, `a plataforma ${i} andou ${andou}px em 10 quadros`);
    if (m.eixo === 'x') assert.equal(m.y, antes[i].y, 'a deitada nao sobe nem desce');
    else assert.equal(m.x, antes[i].x, 'o elevador nao anda de lado');
  });
});

teste('a plataforma movel e pintada quando a camera chega nela', () => {
  const ponte = jogo.moveis.lista.find((m) => m.eixo === 'x');
  porHeroiEm(ponte.x - 4 * T, 13 * T);
  dom.avancarQuadros(1);
  assert.ok(pintadosDaCor(COR_MOVEL) > 0, 'o ferro da ponte esta na tela');

  porHeroiEm(130 * T, 13 * T);                       // longe de todas elas
  dom.avancarQuadros(1);
  assert.equal(pintadosDaCor(COR_MOVEL), 0, 'e some quando a camera sai de perto');
});

teste('o checkpoint da fase 3 devolve o heroi a ELE depois da queda', () => {
  dom.api.irParaFase(3);
  const cp = acenderCheckpoint(0);
  const vidas = jogo.vidas;

  cairNoBuraco(126);                          // o buraco simples do fim da fase

  assert.equal(jogo.vidas, vidas - 1, 'custou um coracao');
  assert.equal(heroi().x, cp.x, 'renasceu no checkpoint');
  igual(jogo.progresso.ativos, [true, false, false], 'que continua aceso');
  jogo.moveis.lista.forEach((m, i) => {
    igual([m.x, m.y], [fase().moveis[i].x, fase().moveis[i].y],
      `a plataforma ${i} voltou para o lugar dela junto com o heroi`);
  });
});

teste('embarcado na ponte, o heroi atravessa o vao grudado nela', () => {
  dom.api.irParaFase(3);
  const quadros = correr(() => heroi().apoio >= 0, 3000);
  assert.ok(heroi().apoio >= 0, `nao embarcou em nada em ${quadros} quadros`);

  const i = heroi().apoio;
  const plataforma = () => jogo.moveis.lista[i];
  assert.equal(plataforma().eixo, 'x', 'a primeira movel do percurso e a ponte');

  const grudado = heroi().x - plataforma().x;
  const quedas = jogo.quedas;
  let andou = 0;
  for (let q = 0; q < 120; q++) {
    const antes = plataforma().x;
    dom.avancarQuadros(1);
    andou += Math.abs(plataforma().x - antes);
    assert.equal(heroi().x - plataforma().x, grudado, `escorregou no quadro ${q}`);
    assert.equal(heroi().y, plataforma().y - M.HEROI_A, `caiu no quadro ${q}`);
    assert.equal(heroi().apoio, i, 'e continua apoiado nela');
  }
  assert.ok(andou > 60, `a ponte andou ${andou}px carregando o heroi`);
  assert.equal(jogo.quedas, quedas, 'ninguem caiu no vao');
});

teste('o elevador leva o heroi ate o alto do paredao', () => {
  const elevador = fase().moveis.findIndex((m) => m.eixo === 'y');
  const alto = 10 * T - M.HEROI_A;              // o topo do paredao das colunas 74-79
  let subiu = false;

  const quadros = correr(() => {
    if (heroi().apoio === elevador) subiu = true;
    return heroi().y <= alto && heroi().x >= 74 * T;
  }, 6000);

  assert.ok(heroi().x >= 74 * T && heroi().y <= alto,
    `nao chegou no alto do paredao em ${quadros} quadros`);
  assert.equal(subiu, true, 'e chegou la de elevador, que e o unico caminho');
});

teste('o piloto automatico termina a fase 3 na bandeira', () => {
  const quadros = correr(() => jogo.concluida, 6000);

  assert.equal(jogo.concluida, true, `nao chegou na bandeira em ${quadros} quadros`);
  igual(jogo.progresso.ativos, [true, true, true],
    'acendeu os tres checkpoints da fase 3');
  assert.equal(Inimigos.quantos(jogo.inimigos), 0,
    'e nenhum dos seis bichos espertos sobrou de pe');
  assert.ok(jogo.pontos > 0);
  assert.equal(jogo.tentativas, 1, 'sem precisar recomecar a fase');
});

teste('voltar para a fase 1 devolve o mundo da fase 1', () => {
  dom.api.irParaFase(1);

  assert.equal(jogo.fase, 1);
  assert.equal(texto('hud-fase'), '1 / 3');
  assert.equal(fase().moedas.length, 100);
  assert.equal(jogo.moveis.lista.length, 0, 'a fase 1 nao tem plataforma movel');
  assert.equal(jogo.concluida, false);
  assert.equal(jogo.pontos, 0);
  assert.equal(heroi().x, mapas[0].spawn.x);
});

await fim('Fase 6a (tela)');
