/* ==========================================================================
   Come-Come - Fase 3a: os quatro fantasmas dentro da partida
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase3a-tela.test.mjs

   O `fase3a.test.mjs` cuida do modulo puro. Aqui o game.js roda com a tela de
   mentira e o jogo ligado de verdade: os quatro comecam na casa, saem um a um,
   aparecem PINTADOS no canvas com a cor de cada um e mudam de posicao a cada
   quadro - sem nunca entrar numa parede e sem que nada disso atrapalhe o que a
   fase 2 ja fazia (comer pastilha e limpar o labirinto).
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
// Desde a fase 7 o jogo abre no MENU: quem comeca a partida e o botao JOGAR.
dom.comecarPartida();
const { Mapa, Movimento, Fantasmas, mundo } = dom.api;
const mapa = dom.api.mapas[0];
const TILE = mundo.TILE;

const jogo = () => dom.api.jogo;
const fantasmas = () => dom.api.jogo.fantasmas.lista;
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });
const lugar = (corpo) => `${corpo.x},${corpo.y}`;

const CORES = Fantasmas.TIPOS.map((t) => t.cor);
const COR_PUPILA = '#2020c0';
const COR_BRANCO = '#ffffff';

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor);

/** Quantos quadros faltam ate o ultimo fantasma pisar na rua. */
const QUADROS_ATE_TODOS = 500;

/* --------------------------------------------------------------------------
   A fase 5 pos o tombo no jogo: encostar num fantasma em caca custa uma vida e
   para o mundo por um segundo e meio. Este arquivo e sobre o MOVIMENTO dos
   quatro, e para observa-lo o come-come fica parado no meio do labirinto - o
   que hoje seria um tombo atras do outro, com o mundo congelado a maior parte
   do tempo. Entao aqui ele e IMORTAL: a rodada e devolvida ao cheio antes de
   cada quadro, e o labirinto nunca para de andar. Quem prova o tombo de
   verdade e o `fase5-tela.test.mjs`.
   -------------------------------------------------------------------------- */
const quadroDeVerdade = dom.avancarQuadros;
dom.avancarQuadros = (n) => {
  for (let i = 0; i < n; i++) {
    dom.api.jogo.rodada = dom.api.Rodada.novoEstado();
    dom.api.jogo.vidas = dom.api.mundo.VIDAS_INICIAIS;
    quadroDeVerdade(1);
  }
};


console.log('Come-Come - fase 3a (tela)\n');

// ------------------------------------------------------------- O comeco ----
teste('a partida abre com os quatro fantasmas, cada um no seu lugar', () => {
  dom.avancarQuadros(1);       // o primeiro quadro de todos so acerta o relogio

  assert.equal(fantasmas().length, 4);
  fantasmas().forEach((f, i) => {
    const esperado = mapa.casa.lugares[i];
    const q = onde(f.corpo);
    assert.equal(q.c, esperado.c, `a coluna do ${f.nome}`);
    assert.equal(q.l, esperado.l, `a linha do ${f.nome}`);
  });

  assert.equal(fantasmas()[0].etapa, 'livre', 'o vermelho ja comeca na rua');
  assert.equal(fantasmas()[1].etapa, 'casa');
  assert.equal(fantasmas()[2].etapa, 'casa');
  assert.equal(fantasmas()[3].etapa, 'casa');
});

teste('os quatro sao pintados no canvas, cada um com a sua cor', () => {
  dom.avancarQuadros(1);
  CORES.forEach((cor, i) => {
    const blocos = pintadosDaCor(cor);
    assert.ok(blocos.length > 6,
      `o fantasma ${i} foi desenhado em faixas (${blocos.length} retangulos)`);
  });

  // Olhos: dois brancos por fantasma, com a pupila dentro.
  assert.equal(pintadosDaCor(COR_BRANCO).length, 8, 'dois olhos para cada um');
  assert.equal(pintadosDaCor(COR_PUPILA).length, 8, 'e uma pupila em cada olho');
});

teste('cada fantasma cabe num quadrado de 16px, no lugar dele', () => {
  dom.avancarQuadros(1);
  CORES.forEach((cor, i) => {
    const blocos = pintadosDaCor(cor);
    const corpo = fantasmas()[i].corpo;
    const x0 = Math.min(...blocos.map((p) => p.x));
    const x1 = Math.max(...blocos.map((p) => p.x + p.l));
    const y0 = Math.min(...blocos.map((p) => p.y));
    const y1 = Math.max(...blocos.map((p) => p.y + p.a));

    // O corpo e simetrico e ocupa os 16px de largura - nada de meio fantasma.
    assert.equal(x0, corpo.x - TILE / 2, `a beirada esquerda do fantasma ${i}`);
    assert.equal(x1, corpo.x + TILE / 2, `a beirada direita do fantasma ${i}`);

    // Em altura a cupula come um pixel do topo: o desenho cabe, e nao vaza.
    assert.ok(y0 >= corpo.y - TILE / 2, `o topo do fantasma ${i}`);
    assert.equal(y1, corpo.y + TILE / 2, `a saia do fantasma ${i}`);
    assert.ok(y1 - y0 >= TILE - 2, `a altura do fantasma ${i} (${y1 - y0})`);
  });
});

teste('o come-come tambem sai inteiro, e nao pela metade', () => {
  dom.avancarQuadros(1);
  const come = jogo().come;
  const corpo = dom.pintados.filter((p) => p.cor === '#fcd800');
  const x0 = Math.min(...corpo.map((p) => p.x));
  const x1 = Math.max(...corpo.map((p) => p.x + p.l));
  assert.equal(x0, come.x - TILE / 2, 'a metade esquerda esta la');
  assert.equal(x1, come.x + TILE / 2, 'e a direita tambem');
});

// -------------------------------------------------------- Saindo da casa ---
teste('eles saem da casa um a um, e a porta so serve para isso', () => {
  const portas = new Set(mapa.portas.map((p) => `${p.c},${p.l}`));
  const chegouNaRua = [1, null, null, null];

  for (let q = 1; q <= QUADROS_ATE_TODOS; q++) {
    dom.avancarQuadros(1);
    fantasmas().forEach((f, i) => {
      if (chegouNaRua[i] === null && f.etapa === 'livre') chegouNaRua[i] = q;
      const casa = onde(f.corpo);
      if (portas.has(`${casa.c},${casa.l}`)) {
        assert.equal(f.etapa, 'saindo', `${f.nome} so pisa na porta para sair`);
      }
    });
  }

  chegouNaRua.forEach((q, i) => assert.ok(q, `o fantasma ${i} saiu`));
  for (let i = 1; i < 4; i++) {
    assert.ok(chegouNaRua[i] > chegouNaRua[i - 1],
      `um a um, na ordem (${chegouNaRua})`);
  }
  assert.equal(Fantasmas.todosNaRua(jogo().fantasmas), true);
});

teste('com todos na rua, os quatro estao espalhados pelo labirinto', () => {
  const quadrados = new Set(fantasmas().map((f) => {
    const q = onde(f.corpo);
    return `${q.c},${q.l}`;
  }));
  assert.ok(quadrados.size >= 3, `nao ficaram todos em cima uns dos outros (${[...quadrados]})`);

  fantasmas().forEach((f) => {
    const q = onde(f.corpo);
    assert.equal(Mapa.parede(mapa, q.c, q.l), false, `${f.nome} esta num corredor`);
    assert.ok(q.l < mapa.casa.l0 || q.l > mapa.casa.l1 || q.c < mapa.casa.c0 || q.c > mapa.casa.c1,
      `${f.nome} ja saiu da casa de vez`);
  });
});

// ------------------------------------------------------ Andando de verdade --
teste('os quatro mudam de posicao a cada quadro', () => {
  let antes = fantasmas().map((f) => lugar(f.corpo));

  for (let q = 0; q < 120; q++) {
    dom.avancarQuadros(1);
    const agora = fantasmas().map((f) => lugar(f.corpo));
    agora.forEach((p, i) => {
      assert.notEqual(p, antes[i],
        `${fantasmas()[i].nome} ficou parado no quadro ${q} (${p})`);
    });
    antes = agora;
  }
});

teste('numa partida de verdade, nenhum deles entra numa parede', () => {
  const setas = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];

  for (let q = 0; q < 1500; q++) {
    // A crianca vai virando de vez em quando: assim o alvo passeia junto.
    if (q % 37 === 0) dom.tecla(setas[(q / 37) % setas.length]);
    dom.avancarQuadros(1);

    fantasmas().forEach((f) => {
      const p = onde(f.corpo);
      assert.ok(f.corpo.x % TILE === TILE / 2 || f.corpo.y % TILE === TILE / 2,
        `${f.nome} desalinhou em (${f.corpo.x}, ${f.corpo.y})`);
      if (f.etapa !== 'livre') return;
      assert.equal(Mapa.parede(mapa, p.c, p.l), false,
        `${f.nome} entrou na parede (${p.c}, ${p.l}) no quadro ${q}`);
      assert.equal(f.corpo.parado, false, `${f.nome} travou`);
    });
  }
});

teste('eles perseguem o alvo: alguem chega perto do come-come', () => {
  let maisPerto = Infinity;
  for (let q = 0; q < 900; q++) {
    dom.avancarQuadros(1);
    const come = onde(jogo().come);
    fantasmas().forEach((f) => {
      const p = onde(f.corpo);
      maisPerto = Math.min(maisPerto, Fantasmas.distancia(p.c, p.l, come.c, come.l));
    });
  }
  assert.ok(maisPerto <= 1,
    `alguem encostou no come-come (a menor distancia foi ${maisPerto})`);
});

// ------------------------------------------------------------- Os olhos ----
teste('a pupila corre para o lado em que o fantasma anda', () => {
  const desvios = { direita: 2, esquerda: 0, cima: 1, baixo: 1 };

  ['direita', 'esquerda', 'cima', 'baixo'].forEach((dir) => {
    // Um corredor comprido, para o fantasma seguir naquela direcao mesmo.
    const f = fantasmas()[0];
    const meio = Mapa.centro(13, 11);
    f.corpo.x = meio.x;
    f.corpo.y = meio.y;
    f.corpo.dir = dir === 'baixo' ? 'esquerda' : dir;
    f.corpo.desejada = f.corpo.dir;
    dom.avancarQuadros(1);

    const corpo = fantasmas()[0].corpo;
    const esperadoX = corpo.x - 5 + desvios[corpo.dir];
    const pupilas = pintadosDaCor(COR_PUPILA).filter((p) => p.x === esperadoX);
    assert.ok(pupilas.length >= 1,
      `a pupila do vermelho andando para '${corpo.dir}' (x esperado ${esperadoX})`);
    assert.equal(pupilas[0].l, 2, 'a pupila e um quadradinho de 2px');
    assert.equal(pupilas[0].a, 2);
  });
});

// ------------------------------------------------- O resto do jogo em paz ---
teste('a porta da casa continua sendo parede para o come-come', () => {
  assert.equal(Mapa.podeIr(mapa, mapa.casa.fora.c, mapa.casa.fora.l, 'baixo'), false);
  assert.equal(Mapa.livre(mapa, mapa.casa.porta.c, mapa.casa.porta.l), false);
});

teste('os fantasmas nao atrapalham o come-come comer pastilha', () => {
  const pontos = jogo().pontos;
  dom.avancarQuadros(120);
  assert.ok(jogo().pontos >= pontos, 'o placar so sobe');
  assert.equal(jogo().vidas, 3, 'aqui o tombo esta desligado, de proposito');
  assert.equal(jogo().tela, 'jogando');
});

teste('quando a fase acaba, os fantasmas congelam junto com o mundo', () => {
  // Limpa o labirinto na marra, pelo estado, e deixa uma pastilha para o
  // proximo quadro comer - e ela que fecha a fase.
  const alvo = { ...onde(jogo().come) };
  const perto = mapa.pastilhas.findIndex((p) => p.c === alvo.c && p.l === alvo.l);
  const restam = jogo().pastilhas.restam.map((_, i) => i === perto);
  jogo().pastilhas = { restam, faltam: 1, comidas: mapa.totalPastilhas - 1 };
  if (perto < 0) {
    // O come-come nao estava em cima de pastilha nenhuma: pisa numa.
    const p = mapa.pastilhas[0];
    const meio = Mapa.centro(p.c, p.l);
    jogo().come.x = meio.x;
    jogo().come.y = meio.y;
    jogo().pastilhas = {
      restam: jogo().pastilhas.restam.map((_, i) => i === 0),
      faltam: 1,
      comidas: mapa.totalPastilhas - 1
    };
  }

  dom.avancarQuadros(2);
  assert.equal(jogo().tela, 'fase', 'a ultima pastilha fechou a fase');

  const parados = fantasmas().map((f) => lugar(f.corpo));
  dom.avancarQuadros(30);
  assert.equal(fantasmas().map((f) => lugar(f.corpo)).join(' | '), parados.join(' | '),
    'os quatro ficaram onde estavam');
  assert.ok(dom.pintados.length > 200, 'e a tela continua sendo pintada');
});

// ------------------------------------------------------ Um jogo novo em paz --
teste('um jogo recem-aberto poe os quatro de volta na casa', () => {
  const novo = carregarJogoComTela('come_come');
  novo.comecarPartida();
  novo.avancarQuadros(1);
  const lista = novo.api.jogo.fantasmas.lista;
  assert.equal(lista.length, 4);
  assert.equal(lista[0].etapa, 'livre');
  assert.equal(lista[3].etapa, 'casa');
  assert.equal(novo.api.jogo.fantasmas.relogio, novo.api.jogo.relogio,
    'os fantasmas andam no mesmo relogio do mundo');
});

await fim('Fase 3a (tela)');
