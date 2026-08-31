/* ==========================================================================
   Come-Come - Fase 6b: a corrida dos tres labirintos (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase6b.test.mjs

   Confere o caderninho da partida solo, sem DOM nenhum:
     - `Corrida.novoEstado()` abre no labirinto 1, com o caderno em branco
     - `Corrida.concluir()` guarda uma linha por labirinto limpo - pontos, o
       bonus fixo de +500 e o total da fase - e abre o seguinte
     - a ordem e fixa e so anda para a FRENTE: 1 -> 2 -> 3, nunca 3 -> 2
     - limpar o terceiro fecha a corrida, e o total e a soma das tres fases
       mais os tres bonus
     - `concluir()` e pura: nao mexe no estado que recebe
     - o index.html tem todos os ids que o game.js procura (o harness usa um
       DOM de mentira, entao e aqui que os dois arquivos sao confrontados)
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogo, RAIZ, teste, fim } from './harness.mjs';

const { Corrida, mundo } = carregarJogo('come_come');

const BONUS = mundo.PONTOS_LIMPOU;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Joga uma corrida inteira de mentira: tres labirintos, com estes pontos. */
function corridaCom(pontos) {
  let estado = Corrida.novoEstado();
  pontos.forEach((p, i) => { estado = Corrida.concluir(estado, i + 1, p); });
  return estado;
}

console.log('Come-Come - fase 6b\n');

// -------------------------------------------------------------- O comeco ---
teste('limpar um labirinto vale 500 pontos de bonus', () => {
  assert.equal(BONUS, 500);
  assert.equal(Corrida.PONTOS_LIMPOU, 500, 'o modulo e o mundo dizem o mesmo');
});

teste('uma corrida nova comeca no labirinto 1, com o caderno em branco', () => {
  const c = Corrida.novoEstado();
  assert.equal(c.fase, 1);
  igual(c.fases, []);
  assert.equal(c.total, 0);
  assert.equal(c.terminada, false);
});

teste('cada corrida nova e um estado novo', () => {
  const a = Corrida.novoEstado();
  const b = Corrida.novoEstado();
  assert.notEqual(a, b);
  assert.notEqual(a.fases, b.fases, 'nem o caderno e compartilhado');
});

// --------------------------------------------------- Fechar um labirinto ---
teste('concluir a fase 1 guarda a linha dela e abre a fase 2', () => {
  const c = Corrida.concluir(Corrida.novoEstado(), 1, 2440);

  assert.equal(c.fases.length, 1);
  igual(c.fases[0], { numero: 1, pontos: 2440, bonus: BONUS, total: 2940 });
  assert.equal(c.total, 2940, 'o total ja conta o bonus por limpar');
  assert.equal(c.fase, 2, 'o proximo labirinto e o 2');
  assert.equal(c.terminada, false, 'a corrida continua');
});

teste('uma fase que nao rendeu nada ainda vale o bonus por limpar', () => {
  const c = Corrida.concluir(Corrida.novoEstado(), 1, 0);
  igual(c.fases[0], { numero: 1, pontos: 0, bonus: BONUS, total: BONUS });
  assert.equal(c.total, BONUS);
});

teste('concluir() nao mexe no estado que recebe', () => {
  const antes = Corrida.novoEstado();
  const copia = JSON.stringify(antes);
  const depois = Corrida.concluir(antes, 1, 1200);

  assert.equal(JSON.stringify(antes), copia, 'o estado velho ficou igualzinho');
  assert.notEqual(depois, antes);
  assert.notEqual(depois.fases, antes.fases);
});

teste('mesma entrada, mesmo resultado', () => {
  const base = Corrida.concluir(Corrida.novoEstado(), 1, 1310);
  igual(Corrida.concluir(base, 2, 990), Corrida.concluir(base, 2, 990));
});

// ------------------------------------------------------- A ordem fixa ------
teste('a corrida anda 1 -> 2 -> 3 e para na 3', () => {
  let c = Corrida.novoEstado();
  const visitados = [c.fase];

  for (let i = 1; i <= mundo.TOTAL_FASES; i++) {
    c = Corrida.concluir(c, i, 100);
    visitados.push(c.fase);
  }
  igual(visitados, [1, 2, 3, 3], 'o labirinto nunca volta para tras');
});

teste('limpar o terceiro labirinto termina a corrida', () => {
  const c = corridaCom([100, 200, 300]);

  assert.equal(c.terminada, true);
  assert.equal(c.fase, mundo.TOTAL_FASES, 'e nao existe labirinto 4');
  assert.equal(c.fases.length, 3, 'com os tres no caderno');
  igual(c.fases.map((f) => f.numero), [1, 2, 3], 'na ordem em que foram jogados');
});

teste('o total e a soma das tres fases mais os tres bonus', () => {
  const pontos = [2440, 2680, 3100];
  const c = corridaCom(pontos);
  const soma = pontos.reduce((a, b) => a + b, 0);

  assert.equal(c.total, soma + 3 * BONUS);
  assert.equal(c.total, c.fases.reduce((a, f) => a + f.total, 0),
    'o total tambem fecha somando linha por linha');
  igual(c.fases.map((f) => f.total), [2940, 3180, 3600]);
});

teste('as fases 1 e 2 nao terminam a corrida', () => {
  assert.equal(corridaCom([100]).terminada, false);
  assert.equal(corridaCom([100, 100]).terminada, false);
});

// -------------------------------------------------- O HTML e o game.js -----
teste('o index.html tem os ids que o game.js procura', () => {
  const pasta = path.join(RAIZ, 'jogos', 'come_come');
  const html = fs.readFileSync(path.join(pasta, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(pasta, 'game.js'), 'utf8');

  const procurados = [...js.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(procurados.length >= 15, 'achou os $(...) do game.js');

  for (const id of procurados) {
    assert.ok(html.includes(`id="${id}"`), `o index.html nao tem id="${id}"`);
  }
});

teste('o index.html traz as tres telas de fim e os dois botoes', () => {
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'come_come', 'index.html'), 'utf8');

  for (const trecho of ['id="tela-fase"', 'id="btn-proxima"',
                        'id="tela-fim"', 'id="tela-parabens"', 'id="btn-de-novo"',
                        'id="parabens-fase-1"', 'id="parabens-fase-2"',
                        'id="parabens-fase-3"', 'id="parabens-total"',
                        'PARABÉNS']) {
    assert.ok(html.includes(trecho), `faltou ${trecho} no index.html`);
  }
  assert.equal(html.match(/class="tela hidden"/g).length, 3,
    'e as tres telas de fim nascem escondidas');
});

await fim('Fase 6b');
