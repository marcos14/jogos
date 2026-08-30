/* ==========================================================================
   Super Adventure - Fase 5: os inimigos (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase5.test.mjs

   Confere o que a fase 5 do plano promete, sem DOM nenhum:
     - as letras `g` e `t` do tilemap viram goomba e turtle, na ordem do
       percurso, e a fase 1 ganha os quatro bichos plantados no chao
     - a patrulha anda 2px por quadro, sempre na mesma velocidade, e vira na
       parede, na beirada da plataforma e na ponta do mundo (ida e volta)
     - o bicho tem gravidade: sumindo o chao debaixo dele, ele cai e pousa
     - pisar em cima derrota: +20 pontos, o goomba some e a turtle vira casco
     - encostar de qualquer outro jeito custa uma vida e nao da ponto nenhum
     - o casco nao anda nem machuca, e derrotado nao volta a ficar vivo
     - `reposicionar()` devolve os VIVOS ao lugar em que nasceram e deixa os
       derrotados como estao
     - `andar()`, `contato()` e `passo()` sao puras: nao mexem no que recebem
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Fisica, Mapa, Inimigos, fase, mundo } = carregarJogo('super_adventure');
const M = Fisica.medidas;
const T = M.TILE;

/* Um mapa pequeno so para estes testes: duas plataformas separadas por um
   buraco, um bicho de cada tipo em cima delas.

       0123456789   */
const DESENHO_TESTE = [
  '..........',   // 0
  '..........',   // 1
  '..........',   // 2
  '..g.....t.',   // 3  goomba na coluna 2, turtle na coluna 8
  '#####..###',   // 4  chao, com um buraco nas colunas 5 e 6
  '#####..###'    // 5
];
const teste1 = Mapa.ler(DESENHO_TESTE);
const LIMITES = teste1.limites;

const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const copia = (x) => JSON.parse(JSON.stringify(x));

/** Um estado de inimigos montado na mao, para os casos de laboratorio. */
function estadoCom(bichos) {
  return {
    lista: bichos.map((b) => ({
      tipo: b.tipo || 'goomba', x: b.x, y: b.y,
      vx: b.vx === undefined ? -Inimigos.medidas.VEL : b.vx,
      vy: b.vy || 0,
      estado: b.estado || 'vivo'
    }))
  };
}

/** Roda `n` quadros de patrulha e devolve o estado no fim. */
function patrulhar(estado, n, limites) {
  let atual = estado;
  for (let i = 0; i < n; i++) atual = Inimigos.andar(atual, limites || LIMITES);
  return atual;
}

/** Todos os `x` por que o bicho `i` passou em `n` quadros de patrulha. */
function trilha(estado, i, n, limites) {
  const xs = [];
  let atual = estado;
  for (let q = 0; q < n; q++) {
    atual = Inimigos.andar(atual, limites || LIMITES);
    xs.push(atual.lista[i].x);
  }
  return xs;
}

/* Quantas vezes a trilha mudou de sentido. No quadro da virada o bicho fica
   parado (anda 0px), entao os passos parados saem da conta antes. */
function viradas(xs) {
  const passos = [];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] !== xs[i - 1]) passos.push(xs[i] - xs[i - 1]);
  }
  let n = 0;
  for (let i = 1; i < passos.length; i++) {
    if ((passos[i] < 0) !== (passos[i - 1] < 0)) n++;
  }
  return n;
}

/** Um par (antes, depois) de corpos do heroi caindo em cima de (x, y). */
function caindoEm(x, y) {
  return { antes: Fisica.novoCorpo(x, y - 16), depois: Fisica.novoCorpo(x, y - 6) };
}

console.log('Super Adventure - fase 5\n');

// ------------------------------------------------- As letras g e t no mapa --
teste('as letras g e t do tilemap viram goomba e turtle', () => {
  assert.equal(teste1.inimigos.length, 2);
  igual(teste1.inimigos, [
    { tipo: 'goomba', x: 2 * T, y: 3 * T },
    { tipo: 'turtle', x: 8 * T, y: 3 * T }
  ], 'na ordem do percurso, da esquerda para a direita');
});

teste('o bicho ocupa o quadrado da letra, de pe no chao', () => {
  const estado = Inimigos.novoEstado(teste1);
  igual(Inimigos.retangulo(estado.lista[0]), { x: 2 * T, y: 3 * T, l: T, a: T });
  assert.equal(Mapa.solido(teste1, 2, 4), true, 'tem chao logo abaixo dele');
});

teste('a fase 1 tem os quatro inimigos do plano, dois de cada tipo', () => {
  assert.equal(fase.inimigos.length, 4);
  assert.equal(fase.inimigos.filter((i) => i.tipo === 'goomba').length, 2);
  assert.equal(fase.inimigos.filter((i) => i.tipo === 'turtle').length, 2);

  fase.inimigos.forEach((ini) => {
    const coluna = ini.x / T, linha = ini.y / T;
    assert.equal(Number.isInteger(coluna), true, 'alinhado com a grade');
    assert.equal(Mapa.solido(fase, coluna, linha + 1), true,
      `o bicho da coluna ${coluna} esta plantado no chao`);
    assert.equal(Mapa.solido(fase, coluna, linha), false, 'e nao dentro dele');
  });
});

teste('nenhum bicho nasce em cima do heroi nem de um checkpoint', () => {
  const longe = (a, b) => Math.abs(a.x - b.x) >= 4 * T;
  fase.inimigos.forEach((ini) => {
    assert.equal(longe(ini, fase.spawn), true, 'longe de onde o heroi nasce');
    fase.checkpoints.forEach((cp, i) => {
      assert.equal(longe(ini, cp), true, `longe do checkpoint ${i}`);
    });
  });
});

// ------------------------------------------------------------ O comeco deles --
teste('novoEstado() poe todo mundo vivo, andando para a esquerda', () => {
  const estado = Inimigos.novoEstado(teste1);
  assert.equal(estado.lista.length, 2);
  igual(estado.lista, [
    { tipo: 'goomba', x: 2 * T, y: 3 * T, vx: -2, vy: 0, estado: 'vivo' },
    { tipo: 'turtle', x: 8 * T, y: 3 * T, vx: -2, vy: 0, estado: 'vivo' }
  ]);
  assert.equal(Inimigos.quantos(estado), 2, 'os dois estao vivos');
});

teste('as medidas sao as do plano: 2px por quadro e 20 pontos', () => {
  assert.equal(Inimigos.medidas.VEL, 2, 'a patrulha anda 2px por quadro');
  assert.equal(Inimigos.medidas.PONTOS, 20, 'o pisao vale 20 pontos');
  assert.equal(mundo.PONTOS_INIMIGO, 20, 'e o jogo publica o mesmo numero');
  assert.equal(Inimigos.medidas.LARG, T);
  assert.equal(Inimigos.medidas.ALT, T);
});

// ------------------------------------------------------------------ Patrulha --
teste('a patrulha anda 2px por quadro, sempre na mesma velocidade', () => {
  const estado = estadoCom([{ x: 3 * T, y: 3 * T }]);
  igual(trilha(estado, 0, 10), [94, 92, 90, 88, 86, 84, 82, 80, 78, 76],
    'de 2 em 2, sempre para a esquerda');
});

teste('o goomba vira na beirada da plataforma e nao cai no buraco', () => {
  const estado = Inimigos.novoEstado(teste1);
  const xs = trilha(estado, 0, 400);

  assert.equal(Math.min(...xs), 0, 'chega na ponta esquerda do mundo e volta');
  assert.equal(Math.max(...xs), 4 * T, 'e para na beirada do buraco (coluna 4)');
  assert.ok(viradas(xs) >= 2, `so virou ${viradas(xs)} vezes: nao foi ida e volta`);

  const depois = patrulhar(estado, 400);
  assert.equal(depois.lista[0].y, 3 * T, 'nunca saiu do chao');
  assert.equal(depois.lista[0].estado, 'vivo');
});

teste('a turtle patrulha do mesmo jeito, no pedaco de chao dela', () => {
  const xs = trilha(Inimigos.novoEstado(teste1), 1, 400);

  assert.equal(Math.min(...xs), 7 * T, 'para na beirada esquerda do bloco');
  assert.equal(Math.max(...xs), 9 * T, 'e na ponta direita do mundo');
  assert.ok(viradas(xs) >= 2, 'ida e volta, sem cair');
});

teste('vira quando bate numa parede, sem sair do lugar no quadro da virada', () => {
  /*  0123456789
      ..g#......   uma parede de pe bem na frente do goomba
      ##########   */
  const mapa = Mapa.ler(['..g#......', '##########']);
  const estado = Inimigos.novoEstado(mapa);
  estado.lista[0].vx = 2;                       // andando PARA a parede

  igual(trilha(estado, 0, 4, mapa.limites), [2 * T, 62, 60, 58],
    'trava um quadro na parede e volta');
});

teste('sem chao embaixo, o bicho cai ate pousar no proximo solido', () => {
  const estado = estadoCom([{ x: 1 * T, y: 0, vx: 0 }]);
  const depois = patrulhar(estado, 40);

  assert.equal(depois.lista[0].y, 3 * T, 'pousou em cima do chao da linha 4');
  assert.equal(depois.lista[0].vy, 0, 'e parou de cair');
});

// ---------------------------------------------------------------- O contato --
teste('pisar num goomba derrota: +20 pontos, e ele some de vez', () => {
  const estado = Inimigos.novoEstado(teste1);
  const { antes, depois } = caindoEm(2 * T, 3 * T);
  const r = Inimigos.contato(estado, antes, depois);

  assert.equal(r.pontos, 20, 'o pisao vale 20');
  igual(r.derrotados, [0]);
  assert.equal(r.dano, false, 'quem pisa nao se machuca');
  assert.equal(r.quique, true, 'e ainda quica para cima');
  assert.equal(r.estado.lista[0].estado, 'morto', 'o goomba morreu');
  assert.equal(r.estado.lista[1].estado, 'vivo', 'a turtle nem viu');
});

teste('pisar numa turtle nao mata: ela vira casco no mesmo lugar', () => {
  const estado = Inimigos.novoEstado(teste1);
  const { antes, depois } = caindoEm(8 * T, 3 * T);
  const r = Inimigos.contato(estado, antes, depois);

  assert.equal(r.pontos, 20, 'vale os mesmos 20 pontos');
  const casco = r.estado.lista[1];
  assert.equal(casco.estado, 'casco');
  assert.equal(casco.x, 8 * T, 'ficou onde estava');
  assert.equal(casco.vx, 0, 'e parou de andar');
  igual(Inimigos.retangulo(casco), { x: 8 * T, y: 3 * T + 12, l: T, a: 20 },
    'o casco e mais baixinho que a turtle de pe');
});

teste('encostar de frente custa uma vida e nao da ponto nenhum', () => {
  const estado = Inimigos.novoEstado(teste1);
  const antes = Fisica.novoCorpo(1 * T, 3 * T);
  const depois = Fisica.novoCorpo(1 * T + 18, 3 * T);      // andou de lado
  const r = Inimigos.contato(estado, antes, depois);

  assert.equal(r.dano, true, 'esbarrou de frente');
  assert.equal(r.pontos, 0);
  assert.equal(r.quique, false);
  igual(r.derrotados, []);
  assert.equal(r.estado, estado, 'sem derrota, o estado nem e recriado');
});

teste('descer de raspao pelo lado tambem machuca (nao vale como pisao)', () => {
  const estado = Inimigos.novoEstado(teste1);
  // Descendo, mas com os pes ja abaixo da metade do bicho: e esbarrao.
  const antes = Fisica.novoCorpo(2 * T - 20, 3 * T + 2);
  const depois = Fisica.novoCorpo(2 * T - 20, 3 * T + 8);
  const r = Inimigos.contato(estado, antes, depois);

  assert.equal(r.dano, true);
  assert.equal(r.pontos, 0);
});

teste('no mesmo quadro, o pisao ganha do esbarrao', () => {
  const estado = estadoCom([
    { x: 2 * T, y: 3 * T },              // este leva o pisao
    { x: 2 * T + 26, y: 2 * T }          // e neste o heroi esbarra de lado
  ]);
  const { antes, depois } = caindoEm(2 * T, 3 * T);
  const r = Inimigos.contato(estado, antes, depois);

  assert.equal(r.pontos, 20);
  igual(r.derrotados, [0]);
  assert.equal(r.dano, false, 'quem estava no ataque nao leva dano');
});

teste('o casco nao anda e nao machuca mais ninguem', () => {
  const estado = estadoCom([
    { tipo: 'turtle', x: 2 * T, y: 3 * T, estado: 'casco', vx: 0 }
  ]);
  const depois = patrulhar(estado, 60);
  assert.equal(depois.lista[0].x, 2 * T, 'ficou quietinho no lugar');

  const corpo = Fisica.novoCorpo(2 * T, 3 * T);
  const r = Inimigos.contato(depois, corpo, corpo);
  assert.equal(r.dano, false, 'encostar num casco nao custa vida');
  assert.equal(r.pontos, 0, 'nem da ponto de novo');
});

teste('quem foi derrotado nao volta a aparecer na partida', () => {
  const estado = Inimigos.novoEstado(teste1);
  const { antes, depois } = caindoEm(2 * T, 3 * T);
  let atual = Inimigos.contato(estado, antes, depois).estado;

  const parado = Fisica.novoCorpo(0, 0);         // o heroi longe de todo mundo
  for (let q = 0; q < 300; q++) {
    const r = Inimigos.passo(atual, LIMITES, parado, parado);
    assert.equal(r.pontos, 0, 'ninguem ganha ponto de graca');
    atual = r.estado;
  }

  assert.equal(atual.lista[0].estado, 'morto', 'continua morto 300 quadros depois');
  assert.equal(atual.lista[0].x, 2 * T, 'e nem sai do lugar');
  assert.equal(Inimigos.quantos(atual), 1, 'so a turtle continua viva');
  assert.equal(Inimigos.quantos(atual, 'morto'), 1);
});

// -------------------------------------------------- De volta ao checkpoint ---
teste('reposicionar() devolve os vivos ao lugar em que nasceram', () => {
  const estado = patrulhar(Inimigos.novoEstado(teste1), 20);
  assert.notEqual(estado.lista[0].x, 2 * T, 'a patrulha ja tinha andado');

  const voltou = Inimigos.reposicionar(estado, teste1);
  igual(voltou.lista, Inimigos.novoEstado(teste1).lista, 'todos no lugar de novo');
});

teste('reposicionar() nao ressuscita quem ja foi derrotado', () => {
  const estado = Inimigos.novoEstado(teste1);
  const { antes, depois } = caindoEm(2 * T, 3 * T);
  const morreu = Inimigos.contato(estado, antes, depois).estado;

  const voltou = Inimigos.reposicionar(patrulhar(morreu, 30), teste1);
  assert.equal(voltou.lista[0].estado, 'morto', 'o goomba continua morto');
  assert.equal(voltou.lista[1].estado, 'vivo');
  assert.equal(voltou.lista[1].x, 8 * T, 'e a turtle viva voltou ao ninho');
});

// ------------------------------------------------------ Funcoes puras mesmo --
teste('andar(), contato() e passo() nao mexem no estado que recebem', () => {
  const estado = Inimigos.novoEstado(teste1);
  const antesJSON = copia(estado);
  const { antes, depois } = caindoEm(2 * T, 3 * T);
  const corpoJSON = copia(antes);

  Inimigos.andar(estado, LIMITES);
  Inimigos.contato(estado, antes, depois);
  Inimigos.passo(estado, LIMITES, antes, depois);

  igual(estado, antesJSON, 'o estado dos bichos ficou intacto');
  igual(antes, corpoJSON, 'e o corpo do heroi tambem');
});

teste('mesma entrada, mesmo resultado', () => {
  igual(patrulhar(Inimigos.novoEstado(teste1), 137),
        patrulhar(Inimigos.novoEstado(teste1), 137),
        'a patrulha e determinista');
});

await fim('Fase 5');
