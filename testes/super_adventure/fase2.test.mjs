/* ==========================================================================
   Super Adventure - Fase 2: colisao, camera e bandeira (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase2.test.mjs

   Confere o que a fase 2 do plano promete, sem DOM nenhum:
     - o tilemap escrito em texto vira retangulos solidos, spawn e bandeira
     - o heroi pousa em cima de CADA superficie do mapa, sem atravessar,
       mesmo caindo na velocidade maxima
     - parede pela frente para o heroi; bloco em cima faz ele bater a cabeca
     - buraco = queda para fora do mapa, detectada
     - a camera segue o heroi e trava nas duas pontas do mundo
     - encostar na bandeira e detectado
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Fisica, Mapa, Camera, fase, mundo } = carregarJogo('super_adventure');
const M = Fisica.medidas;
const T = M.TILE;

const PARADO = { esquerda: false, direita: false, pular: false };
const DIREITA = { esquerda: false, direita: true, pular: false };
const PULO = { esquerda: false, direita: false, pular: true };

/* Um mapa pequeno, so para os testes: chao com um buraco de 2 quadrados, uma
   plataforma solta no alto, um degrau de 2 e a bandeira em cima do degrau.

       0123456789ab   */
const DESENHO_TESTE = [
  '............',   // 0
  '............',   // 1
  '....===.....',   // 2  plataforma solta
  '............',   // 3
  '.........F..',   // 4  bandeira
  '..P.....####',   // 5  degrau
  '####..######',   // 6  chao (buraco nas colunas 4 e 5)
  '####..######'    // 7
];
const teste1 = Mapa.ler(DESENHO_TESTE);

// Os objetos nascem dentro do `vm`, com outro Object.prototype: comparar em
// texto evita que o assert.deepEqual estrito reclame do prototipo.
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Roda `n` passos com a mesma entrada e devolve o corpo final. */
function correr(corpo, entrada, n, limites, aCada) {
  for (let i = 0; i < n; i++) {
    corpo = Fisica.passo(corpo, entrada, limites);
    if (aCada) aCada(corpo, i);
  }
  return corpo;
}

/**
 * Todas as superficies em que da para pisar num mapa: quadrado solido com
 * espaco vazio logo acima. Devolve { x, topo } em pixels.
 */
function superficies(mapa) {
  const lista = [];
  for (let r = 0; r < mapa.linhas; r++) {
    for (let c = 0; c < mapa.colunas; c++) {
      if (Mapa.solido(mapa, c, r) && !Mapa.solido(mapa, c, r - 1)) {
        lista.push({ coluna: c, linha: r, x: c * T, topo: r * T });
      }
    }
  }
  return lista;
}

/** Larga o heroi 8px acima da superficie, na velocidade maxima de queda. */
function largarEm(mapa, sup) {
  const corpo = Fisica.novoCorpo(sup.x, sup.topo - M.HEROI_A - 8);
  return { ...corpo, noChao: false, vy: M.VEL_Y_MAX };
}

console.log('Super Adventure - fase 2\n');

// ------------------------------------------------------------- O tilemap ----
teste('o desenho em texto vira solidos, spawn e bandeira', () => {
  igual(teste1.spawn, { x: 2 * T, y: 5 * T });
  igual(teste1.bandeira, { x: 9 * T, y: 4 * T, l: T, a: T },
    'o mastro vai da letra F ate o chao logo abaixo dela');
  assert.equal(teste1.largura, 12 * T);
  assert.equal(teste1.altura, 8 * T);
  assert.equal(teste1.fundo, 8 * T);
});

teste('blocos vizinhos da mesma linha viram um retangulo so', () => {
  const naLinha = (r) => teste1.solidos.filter((s) => s.y === r * T);
  igual(naLinha(2), [{ x: 4 * T, y: 2 * T, l: 3 * T, a: T }]);
  igual(naLinha(5), [{ x: 8 * T, y: 5 * T, l: 4 * T, a: T }]);
  igual(naLinha(6), [
    { x: 0, y: 6 * T, l: 4 * T, a: T },
    { x: 6 * T, y: 6 * T, l: 6 * T, a: T },
  ], 'o buraco parte o chao em dois');
});

teste('o mapa da fase 1 tem 120 colunas, spawn no chao e bandeira no fim', () => {
  assert.equal(fase.colunas, 120);
  assert.equal(fase.largura, mundo.LARGURA_MUNDO);
  assert.equal(fase.spawn.y + M.HEROI_A, mundo.CHAO_Y, 'nasce com os pes no chao');
  assert.ok(fase.bandeira, 'tem bandeira');
  assert.ok(fase.bandeira.x > fase.largura - 6 * T, 'a bandeira fica la no fim');
  assert.ok(fase.solidos.length > 10);
});

// ---------------------------------------------------------- Pousar nelas ----
teste('o heroi pousa em cima de cada plataforma do mapa de teste', () => {
  const chaoDeCima = superficies(teste1);
  assert.equal(chaoDeCima.length, 3 + 4 + 6, 'plataforma + degrau + chao');
  for (const sup of chaoDeCima) {
    const parou = correr(largarEm(teste1, sup), PARADO, 5, teste1.limites,
      (corpo) => assert.ok(corpo.y <= sup.topo - M.HEROI_A,
        `atravessou a superficie da coluna ${sup.coluna}`));
    assert.equal(parou.y, sup.topo - M.HEROI_A, `pousou na coluna ${sup.coluna}`);
    assert.equal(parou.noChao, true);
    assert.equal(parou.vy, 0);
  }
});

teste('e tambem em cada superficie da fase 1 inteira, sem atravessar', () => {
  const chaoDeCima = superficies(fase);
  assert.ok(chaoDeCima.length > 100, `${chaoDeCima.length} superficies no mapa`);
  for (const sup of chaoDeCima) {
    const parou = correr(largarEm(fase, sup), PARADO, 5, fase.limites,
      (corpo) => assert.ok(corpo.y <= sup.topo - M.HEROI_A,
        `atravessou o chao na coluna ${sup.coluna}, linha ${sup.linha}`));
    assert.equal(parou.y, sup.topo - M.HEROI_A,
      `pousou na coluna ${sup.coluna}, linha ${sup.linha}`);
    assert.equal(parou.noChao, true);
  }
});

teste('parado em cima de um bloco, continua em cima (nao escorrega para dentro)', () => {
  const emCima = Fisica.novoCorpo(4 * T, 2 * T - M.HEROI_A);   // na plataforma solta
  const depois = correr(emCima, PARADO, 120, teste1.limites);
  assert.equal(depois.y, 2 * T - M.HEROI_A);
  assert.equal(depois.noChao, true);
});

teste('andando ate a beirada, o heroi cai (a plataforma acaba)', () => {
  const emCima = Fisica.novoCorpo(4 * T, 2 * T - M.HEROI_A);
  let quadroDaQueda = -1;
  const depois = correr(emCima, DIREITA, 60, teste1.limites, (corpo, i) => {
    if (quadroDaQueda < 0 && !corpo.noChao) quadroDaQueda = i;
  });
  assert.ok(quadroDaQueda > 0, 'em algum quadro os pes ficaram sem chao');
  assert.equal(depois.y, 5 * T - M.HEROI_A, 'e ele foi parar no degrau la embaixo');
});

// -------------------------------------------------------------- Paredes ----
teste('a parede do degrau para o heroi (nao atravessa de lado)', () => {
  const andando = Fisica.novoCorpo(6 * T, 6 * T - M.HEROI_A);
  const depois = correr(andando, DIREITA, 60, teste1.limites);
  assert.equal(depois.x, 8 * T - M.HEROI_L, 'encostou na parede e ficou nela');
  assert.equal(depois.y, 6 * T - M.HEROI_A, 'continua no chao de baixo');
});

teste('e tambem segura quem chega de costas, vindo da direita', () => {
  // Encostado na quina direita da plataforma solta, tentando ir para a esquerda.
  const encostado = { ...Fisica.novoCorpo(7 * T, 2 * T), noChao: false };
  const depois = Fisica.passo(encostado, { esquerda: true }, teste1.limites);
  assert.equal(depois.x, 7 * T, 'a plataforma barrou o caminho');
  assert.equal(Fisica.resolverX(7 * T - 3, 2 * T, -M.VEL_X, teste1.solidos), 7 * T);
});

teste('pulando por baixo de um bloco, bate a cabeca', () => {
  const embaixo = Fisica.novoCorpo(6 * T, 6 * T - M.HEROI_A);
  let maisAlto = embaixo.y;
  const depois = correr(embaixo, PULO, 60, teste1.limites, (corpo) => {
    maisAlto = Math.min(maisAlto, corpo.y);
  });
  assert.equal(maisAlto, 3 * T, 'a cabeca parou logo abaixo da plataforma');
  assert.ok(embaixo.y - maisAlto < M.ALTURA_MAX_PULO, 'nem chegou aos 120px');
  assert.equal(depois.y, 6 * T - M.HEROI_A, 'e voltou para o chao');
});

teste('pulando em cima de um degrau de 2 quadrados, o heroi sobe', () => {
  const antes = Fisica.novoCorpo(8 * T - M.HEROI_L, 6 * T - M.HEROI_A);
  const depois = correr(antes, { direita: true, pular: true }, 60, teste1.limites);
  assert.equal(depois.y, 5 * T - M.HEROI_A, 'pousou em cima do degrau');
  assert.ok(depois.x >= 8 * T);
});

// --------------------------------------------------------------- Buraco ----
teste('cair no buraco e detectado (passou do fundo do mapa)', () => {
  const naBeirada = Fisica.novoCorpo(4 * T, 6 * T - M.HEROI_A);
  let caiu = false;
  const depois = correr({ ...naBeirada, noChao: false }, PARADO, 60, teste1.limites,
    (corpo) => { caiu = caiu || Fisica.caiu(corpo, teste1.fundo); });
  assert.equal(caiu, true, 'a queda foi percebida');
  assert.equal(Fisica.caiu(depois, teste1.fundo), true);
});

teste('quem esta no chao nao conta como caido', () => {
  const noChao = Fisica.novoCorpo(0, 6 * T - M.HEROI_A);
  assert.equal(Fisica.caiu(noChao, teste1.fundo), false);
  const naFase = Fisica.novoCorpo(fase.spawn.x, fase.spawn.y);
  assert.equal(Fisica.caiu(naFase, fase.fundo), false);
});

teste('os buracos da fase 1 tem 2 quadrados - da para pular todos', () => {
  // O heroi passa ~31 quadros no ar e anda 3px por quadro: uns 93px. Um
  // buraco de 2 quadrados (64px) cabe com folga; um de 3 (96px) nao caberia.
  const linhaDoChao = (c) => {
    for (let r = 0; r < fase.linhas; r++) if (Mapa.solido(fase, c, r)) return r;
    return null;
  };
  let maior = 0, atual = 0;
  for (let c = 0; c < fase.colunas; c++) {
    if (linhaDoChao(c) === null) { atual++; maior = Math.max(maior, atual); }
    else atual = 0;
  }
  assert.equal(maior, 2, `o maior buraco tem ${maior} quadrados`);
});

teste('o heroi atravessa um buraco de 2 quadrados pulando na beirada', () => {
  const naBeirada = Fisica.novoCorpo(26 * T - M.HEROI_L, mundo.CHAO_Y - M.HEROI_A);
  const depois = correr(naBeirada, { direita: true, pular: true }, 60, fase.limites);
  assert.equal(depois.y, mundo.CHAO_Y - M.HEROI_A, 'pousou do outro lado');
  assert.ok(depois.x >= 28 * T - M.HEROI_L, 'passou do buraco');
  assert.equal(Fisica.caiu(depois, fase.fundo), false);
});

// --------------------------------------------------------------- Camera ----
teste('a camera centra o heroi no meio da tela', () => {
  const centro = 1500;
  assert.equal(Camera.seguir(centro, fase.largura, mundo.LARGURA),
    centro - mundo.LARGURA / 2);
});

teste('a camera trava no comeco e no fim do mundo', () => {
  assert.equal(Camera.seguir(0, fase.largura, mundo.LARGURA), 0);
  assert.equal(Camera.seguir(100, fase.largura, mundo.LARGURA), 0);
  assert.equal(Camera.seguir(fase.largura, fase.largura, mundo.LARGURA),
    fase.largura - mundo.LARGURA);
  assert.equal(Camera.seguir(99999, fase.largura, mundo.LARGURA),
    fase.largura - mundo.LARGURA);
});

teste('num mundo menor que a tela, a camera nao anda', () => {
  assert.equal(Camera.seguir(200, 400, mundo.LARGURA), 0);
});

teste('a camera nunca mostra o lado de fora do mapa', () => {
  for (let x = 0; x <= fase.largura; x += 37) {
    const cam = Camera.seguir(x, fase.largura, mundo.LARGURA);
    assert.ok(cam >= 0 && cam + mundo.LARGURA <= fase.largura, `camera em ${x}`);
  }
});

// ------------------------------------------------------------- Bandeira ----
teste('encostar na bandeira e detectado', () => {
  const b = teste1.bandeira;
  const encostando = Fisica.novoCorpo(b.x, b.y);
  assert.equal(Fisica.tocandoCorpo(encostando, b), true);

  const longe = Fisica.novoCorpo(0, 0);
  assert.equal(Fisica.tocandoCorpo(longe, b), false);
  assert.equal(Fisica.tocandoCorpo(longe, null), false, 'mapa sem bandeira: nada');
});

teste('so encosta na bandeira quem chega nela de verdade', () => {
  const b = fase.bandeira;
  const antes = Fisica.novoCorpo(b.x - M.HEROI_L - 1, mundo.CHAO_Y - M.HEROI_A);
  assert.equal(Fisica.tocandoCorpo(antes, b), false, '1px antes ainda nao vale');

  const chegando = correr(antes, DIREITA, 1, fase.limites);
  assert.equal(Fisica.tocandoCorpo(chegando, b), true, 'um passo depois, valeu');
});

// --------------------------------------------------------------- Pureza ----
teste('passo() continua puro mesmo com solidos no caminho', () => {
  const corpo = Fisica.novoCorpo(fase.spawn.x, fase.spawn.y);
  const copia = JSON.stringify(corpo);
  const a = Fisica.passo(corpo, DIREITA, fase.limites);
  const b = Fisica.passo(corpo, DIREITA, fase.limites);
  assert.equal(JSON.stringify(corpo), copia, 'o corpo original ficou intacto');
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'mesma entrada, mesmo passo');
});

teste('Mapa.ler() nao guarda estado entre chamadas', () => {
  const outro = Mapa.ler(DESENHO_TESTE);
  assert.equal(JSON.stringify(outro.solidos), JSON.stringify(teste1.solidos));
});

await fim('Fase 2');
