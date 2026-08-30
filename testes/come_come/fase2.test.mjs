/* ==========================================================================
   Come-Come - Fase 2: as pastilhas, a pontuacao e o labirinto limpo
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase2.test.mjs

   Confere o que a fase 2 do plano promete, no modulo puro:
     - comer soma os pontos certos (10 na comum, 50 na de poder)
     - a mesma pastilha nao conta duas vezes
     - o contador de faltantes desce a cada mordida e chega a zero
     - a pastilha de poder vem marcada a parte (e ainda sem efeito nenhum)
     - nada disso mexe no estado que recebeu
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Mapa, Movimento, Pastilhas, mapas, mundo } = carregarJogo('come_come');
const mapa = mapas[0];
const TILE = mundo.TILE;

/** Um quadrado que tem pastilha comum / de poder, para os testes montarem cenas. */
const comum = mapa.pastilhas.find((p) => !p.poder);
const poder = mapa.pastilhas[mapa.poderes[0]];

console.log('Come-Come - fase 2\n');

// ---------------------------------------------------- O mapa sabe onde estao --
teste('o mapa diz qual pastilha mora em cada quadrado', () => {
  mapa.pastilhas.forEach((p, i) => {
    assert.equal(Mapa.pastilhaEm(mapa, p.c, p.l), i, `a pastilha ${i}`);
  });
  assert.equal(Mapa.pastilhaEm(mapa, 0, 0), -1, 'numa parede nao ha pastilha');
  assert.equal(Mapa.pastilhaEm(mapa, 13, 23), -1, 'no nascimento tambem nao');
  assert.equal(Mapa.pastilhaEm(mapa, -1, 5), -1, 'fora do desenho, muito menos');
  assert.equal(Mapa.pastilhaEm(mapa, 5, 99), -1);
});

// ------------------------------------------------------------- O comeco -----
teste('a fase comeca com todas as pastilhas do desenho de pe', () => {
  const estado = Pastilhas.novoEstado(mapa);
  assert.equal(Pastilhas.faltam(estado), 244);
  assert.equal(estado.comidas, 0);
  assert.equal(estado.restam.length, mapa.totalPastilhas);
  assert.equal(estado.restam.every((p) => p === true), true);
  assert.equal(Pastilhas.limpo(estado), false);

  mapa.pastilhas.forEach((p, i) => {
    assert.equal(Pastilhas.existe(estado, i), true, `a pastilha ${i} esta de pe`);
  });
});

// ------------------------------------------------------------- Comer --------
teste('comer uma pastilha comum vale 10 pontos e ela some', () => {
  const antes = Pastilhas.novoEstado(mapa);
  const mordida = Pastilhas.comer(antes, mapa, comum.c, comum.l);

  assert.equal(mordida.pontos, 10);
  assert.equal(mordida.poder, false);
  assert.equal(mordida.comeu, Mapa.pastilhaEm(mapa, comum.c, comum.l));
  assert.equal(mordida.limpou, false, 'ainda faltam 243');

  assert.equal(Pastilhas.existe(mordida.estado, mordida.comeu), false);
  assert.equal(Pastilhas.faltam(mordida.estado), 243);
  assert.equal(mordida.estado.comidas, 1);
});

teste('a pastilha de poder vale 50 e vem marcada a parte', () => {
  const mordida = Pastilhas.comer(Pastilhas.novoEstado(mapa), mapa, poder.c, poder.l);
  assert.equal(mordida.pontos, 50);
  assert.equal(mordida.poder, true, 'quem come precisa saber que era a de poder');
  assert.equal(Pastilhas.faltam(mordida.estado), 243, 'ela conta como uma so');
});

teste('a mesma pastilha nao conta duas vezes', () => {
  const primeira = Pastilhas.comer(Pastilhas.novoEstado(mapa), mapa, comum.c, comum.l);
  const segunda = Pastilhas.comer(primeira.estado, mapa, comum.c, comum.l);

  assert.equal(segunda.comeu, -1, 'nao havia mais nada ali');
  assert.equal(segunda.pontos, 0);
  assert.equal(segunda.poder, false);
  assert.equal(Pastilhas.faltam(segunda.estado), 243, 'o contador nao mexeu');
  assert.equal(segunda.estado, primeira.estado, 'sem mordida, o estado e o mesmo');
});

teste('quadrado sem pastilha nenhuma nao rende nada', () => {
  const estado = Pastilhas.novoEstado(mapa);
  [[0, 0], [13, 23], [3, 14], [13, 12]].forEach(([c, l]) => {
    const mordida = Pastilhas.comer(estado, mapa, c, l);
    assert.equal(mordida.comeu, -1, `no quadrado (${c}, ${l})`);
    assert.equal(mordida.pontos, 0);
    assert.equal(mordida.estado, estado);
  });
});

teste('passo() come o que estiver debaixo dos pes do come-come', () => {
  const estado = Pastilhas.novoEstado(mapa);
  const corpo = Movimento.novoCorpo(comum.c, comum.l, 'esquerda');
  const mordida = Pastilhas.passo(estado, mapa, corpo);
  assert.equal(mordida.comeu, Mapa.pastilhaEm(mapa, comum.c, comum.l));
  assert.equal(mordida.pontos, 10);

  // Fora do centro, mas ainda dentro do mesmo quadrado: e a mesma pastilha.
  const meio = { ...corpo, x: corpo.x + TILE / 2 - 1 };
  assert.equal(Pastilhas.passo(estado, mapa, meio).comeu, mordida.comeu);

  // No nascimento nao ha pastilha nenhuma - e por isso o come-come nao ganha
  // 10 pontos de graca no primeiro quadro da partida.
  const nascendo = Movimento.novoCorpo(mapa.nascimento.c, mapa.nascimento.l);
  assert.equal(Pastilhas.passo(estado, mapa, nascendo).comeu, -1);
});

// ---------------------------------------------------- Ate o labirinto limpo --
teste('comendo todas, o contador chega a zero e a ultima avisa', () => {
  let estado = Pastilhas.novoEstado(mapa);
  let pontos = 0;

  mapa.pastilhas.forEach((p, i) => {
    const mordida = Pastilhas.comer(estado, mapa, p.c, p.l);
    assert.equal(mordida.comeu, i);
    assert.equal(Pastilhas.faltam(mordida.estado), 243 - i);
    assert.equal(mordida.limpou, i === mapa.totalPastilhas - 1,
      `so a ultima fecha o labirinto (esta e a ${i})`);
    estado = mordida.estado;
    pontos += mordida.pontos;
  });

  assert.equal(Pastilhas.faltam(estado), 0);
  assert.equal(estado.comidas, 244);
  assert.equal(Pastilhas.limpo(estado), true);
  assert.equal(pontos, 2600, '240 x 10 + 4 x 50');
  assert.equal(pontos, Pastilhas.totalDoLabirinto(mapa));
});

teste('o labirinto so fica limpo quando NENHUMA sobra', () => {
  let estado = Pastilhas.novoEstado(mapa);
  // Todas menos a ultima do desenho.
  for (let i = 0; i < mapa.pastilhas.length - 1; i++) {
    estado = Pastilhas.comer(estado, mapa, mapa.pastilhas[i].c, mapa.pastilhas[i].l).estado;
  }
  assert.equal(Pastilhas.faltam(estado), 1);
  assert.equal(Pastilhas.limpo(estado), false, 'uma sozinha ainda segura a fase');

  const ultima = mapa.pastilhas[mapa.pastilhas.length - 1];
  const fecha = Pastilhas.comer(estado, mapa, ultima.c, ultima.l);
  assert.equal(fecha.limpou, true);
  assert.equal(Pastilhas.limpo(fecha.estado), true);
});

// ------------------------------------------------------------- Pureza -------
teste('comer() e funcao pura: nao mexe no estado que recebeu', () => {
  const antes = Pastilhas.novoEstado(mapa);
  const copia = JSON.parse(JSON.stringify(antes));
  const mordida = Pastilhas.comer(antes, mapa, comum.c, comum.l);

  assert.equal(JSON.stringify(antes), JSON.stringify(copia),
    'o estado original ficou intacto');
  assert.notEqual(mordida.estado, antes, 'devolveu um estado novo');
  assert.equal(Pastilhas.faltam(antes), 244, 'e o de antes continua cheio');
});

teste('mesmo estado + mesmo quadrado = mesmo resultado', () => {
  const estado = Pastilhas.novoEstado(mapa);
  const a = Pastilhas.comer(estado, mapa, poder.c, poder.l);
  const b = Pastilhas.comer(estado, mapa, poder.c, poder.l);
  assert.equal(JSON.stringify(a.estado), JSON.stringify(b.estado));
  assert.equal(a.pontos, b.pontos);
  assert.equal(a.comeu, b.comeu);
});

// ------------------------------------------------------------- As regras ----
teste('a pontuacao do jogo e a que o README promete', () => {
  assert.equal(Pastilhas.PONTOS_PASTILHA, 10);
  assert.equal(Pastilhas.PONTOS_PODER, 50);
  assert.equal(mundo.PONTOS_PASTILHA, 10);
  assert.equal(mundo.PONTOS_PODER, 50);
  assert.equal(mundo.VIDAS_INICIAIS, 3, 'tres vidas, como no fliperama');
  assert.equal(mundo.TOTAL_FASES, 3, 'tres labirintos');
});

await fim('Fase 2');
