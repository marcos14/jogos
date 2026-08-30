/* ==========================================================================
   Super Adventure - Fase 6b: a corrida das tres fases (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase6b.test.mjs

   Confere o caderninho da partida solo, sem DOM nenhum:
     - `Corrida.novoEstado()` abre na fase 1, com o caderno em branco
     - `Corrida.concluir()` guarda uma linha por fase - pontos, o bonus fixo
       de +50 da bandeira e o total da fase - e abre a proxima
     - a ordem e fixa e so anda para a frente: 1 -> 2 -> 3, nunca 3 -> 2
     - a bandeira da fase 3 termina a corrida, e o total e a soma das tres
       fases mais os tres bonus
     - `concluir()` e pura: nao mexe no estado que recebe
     - o index.html tem todos os ids que o game.js procura (o harness usa um
       DOM de mentira, entao e aqui que os dois arquivos sao confrontados)
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { carregarJogo, RAIZ, teste, fim } from './harness.mjs';

const { Corrida, mundo } = carregarJogo('super_adventure');

const BONUS = mundo.PONTOS_BANDEIRA;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Joga uma corrida inteira de mentira: tres fases, com estes pontos. */
function corridaCom(pontos) {
  let estado = Corrida.novoEstado();
  pontos.forEach((p, i) => { estado = Corrida.concluir(estado, i + 1, p); });
  return estado;
}

console.log('Super Adventure - fase 6b\n');

// -------------------------------------------------------------- O comeco ---
teste('a bandeira vale 50 pontos de bonus', () => {
  assert.equal(BONUS, 50);
  assert.equal(Corrida.PONTOS_BANDEIRA, 50, 'o modulo e o mundo dizem o mesmo');
});

teste('uma corrida nova comeca na fase 1, com o caderno em branco', () => {
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

// ------------------------------------------------------ Fechar uma fase ----
teste('concluir a fase 1 guarda a linha dela e abre a fase 2', () => {
  const c = Corrida.concluir(Corrida.novoEstado(), 1, 430);

  assert.equal(c.fases.length, 1);
  igual(c.fases[0], { numero: 1, pontos: 430, bonus: BONUS, total: 480 });
  assert.equal(c.total, 480, 'o total ja conta o bonus da bandeira');
  assert.equal(c.fase, 2, 'a proxima fase e a 2');
  assert.equal(c.terminada, false, 'a corrida continua');
});

teste('uma fase que nao rendeu nada ainda vale o bonus da bandeira', () => {
  const c = Corrida.concluir(Corrida.novoEstado(), 1, 0);
  igual(c.fases[0], { numero: 1, pontos: 0, bonus: BONUS, total: BONUS });
  assert.equal(c.total, BONUS);
});

teste('concluir() nao mexe no estado que recebe', () => {
  const antes = Corrida.novoEstado();
  const copia = JSON.stringify(antes);
  const depois = Corrida.concluir(antes, 1, 200);

  assert.equal(JSON.stringify(antes), copia, 'o estado velho ficou igualzinho');
  assert.notEqual(depois, antes);
  assert.notEqual(depois.fases, antes.fases);
});

teste('mesma entrada, mesmo resultado', () => {
  const base = Corrida.concluir(Corrida.novoEstado(), 1, 310);
  igual(Corrida.concluir(base, 2, 120), Corrida.concluir(base, 2, 120));
});

// ------------------------------------------------------- A ordem fixa ------
teste('a corrida anda 1 -> 2 -> 3 e para na 3', () => {
  let c = Corrida.novoEstado();
  const visitadas = [c.fase];

  for (let i = 1; i <= mundo.TOTAL_FASES; i++) {
    c = Corrida.concluir(c, i, 100);
    visitadas.push(c.fase);
  }
  igual(visitadas, [1, 2, 3, 3], 'a fase nunca volta para tras');
});

teste('a bandeira da fase 3 termina a corrida', () => {
  const c = corridaCom([100, 200, 300]);

  assert.equal(c.terminada, true);
  assert.equal(c.fase, mundo.TOTAL_FASES, 'e nao existe fase 4');
  assert.equal(c.fases.length, 3, 'com as tres fases no caderno');
  igual(c.fases.map((f) => f.numero), [1, 2, 3], 'na ordem em que foram jogadas');
});

teste('o total e a soma das tres fases mais os tres bonus', () => {
  const pontos = [430, 260, 180];
  const c = corridaCom(pontos);
  const soma = pontos.reduce((a, b) => a + b, 0);

  assert.equal(c.total, soma + 3 * BONUS);
  assert.equal(c.total, c.fases.reduce((a, f) => a + f.total, 0),
    'o total tambem fecha somando linha por linha');
  igual(c.fases.map((f) => f.total), [480, 310, 230]);
});

teste('as fases 1 e 2 nao terminam a corrida', () => {
  assert.equal(corridaCom([100]).terminada, false);
  assert.equal(corridaCom([100, 100]).terminada, false);
});

// -------------------------------------------------- O HTML e o game.js -----
teste('o index.html tem os ids que o game.js procura', () => {
  const pasta = path.join(RAIZ, 'jogos', 'super_adventure');
  const html = fs.readFileSync(path.join(pasta, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(pasta, 'game.js'), 'utf8');

  const procurados = [...js.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(procurados.length >= 15, 'achou os $(...) do game.js');

  for (const id of procurados) {
    assert.ok(html.includes(`id="${id}"`), `o index.html nao tem id="${id}"`);
  }
});

teste('o index.html traz as duas telas de fim e os dois botoes', () => {
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');

  for (const trecho of ['id="tela-fase"', 'id="btn-proxima"',
                        'id="tela-fim"', 'id="btn-de-novo"',
                        'id="fim-fase-1"', 'id="fim-fase-2"', 'id="fim-fase-3"',
                        'id="fim-total"', 'PARABÉNS']) {
    assert.ok(html.includes(trecho), `faltou ${trecho} no index.html`);
  }
  assert.ok(html.indexOf('class="tela hidden"') > 0,
    'e as telas de fim nascem escondidas');
});

await fim('Fase 6b');
