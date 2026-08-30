/* ==========================================================================
   Super Adventure - Fase 3: moedas, blocos quebraveis e pontos (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase3.test.mjs

   Confere o que a fase 3 do plano promete, sem DOM nenhum:
     - o tilemap traz as moedas e os blocos quebraveis (a fase 1 tem 100 e 10)
     - encostar numa moeda soma 10 pontos e ela some DE VEZ (nao volta num
       segundo passo)
     - as 100 moedas da fase 1 valem 1000 pontos, uma a uma
     - bloco quebravel e solido enquanto esta de pe: da para pisar em cima e
       da para bater a cabeca nele
     - bater nele por baixo (ou pousar em cima) quebra o bloco, e a partir dai
       ele some dos solidos - o caminho abre
     - `Itens.passo()` e puro: nao mexe no estado que recebe
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Fisica, Mapa, Itens, fase, mundo } = carregarJogo('super_adventure');
const M = Fisica.medidas;
const T = M.TILE;

const PARADO = { esquerda: false, direita: false, pular: false };
const PULO = { esquerda: false, direita: false, pular: true };

/* Um mapa pequeno so para estes testes:

       0123456789   */
const DESENHO_TESTE = [
  '..........',   // 0
  '...?.?o...',   // 1  dois blocos quebraveis e uma moeda no alto
  '.....o....',   // 2  moeda debaixo do segundo bloco
  '..P....o..',   // 3  o heroi nasce aqui; moeda no chao
  '##########',   // 4  chao
  '##########'    // 5
];
const teste1 = Mapa.ler(DESENHO_TESTE);

const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Um corpo parado bem em cima de um retangulo (para encostar nele). */
function emCimaDe(alvo) {
  return Fisica.novoCorpo(
    alvo.x + alvo.l / 2 - M.HEROI_L / 2,
    alvo.y + alvo.a / 2 - M.HEROI_A / 2,
  );
}

/**
 * Roda `n` passos de fisica + itens juntos, como o jogo faz de verdade.
 * Devolve { corpo, estado, pontos, eventos }.
 */
function correr(corpo, estado, entrada, n, mapa) {
  let pontos = 0;
  const eventos = [];
  for (let i = 0; i < n; i++) {
    const antes = corpo;
    corpo = Fisica.passo(antes, entrada, estado.limites);
    const r = Itens.passo(estado, mapa, antes, corpo);
    if (r.estado !== estado) {
      estado = r.estado;
      pontos += r.pontos;
      r.pegou.forEach((m) => eventos.push(`moeda:${m}`));
      if (r.quebrou >= 0) eventos.push(`bloco:${r.quebrou}`);
    }
  }
  return { corpo, estado, pontos, eventos };
}

console.log('Super Adventure - fase 3\n');

// -------------------------------------------------------- O que o mapa tem --
teste('o tilemap entrega as moedas e os blocos quebraveis', () => {
  assert.equal(teste1.moedas.length, 3, 'tres moedas no desenho de teste');
  assert.equal(teste1.quebraveis.length, 2, 'dois blocos quebraveis');
  igual(teste1.quebraveis, [
    { x: 3 * T, y: 1 * T, l: T, a: T },
    { x: 5 * T, y: 1 * T, l: T, a: T },
  ], 'cada bloco fica sozinho, nunca juntado com o vizinho');
});

teste('a moeda fica no meio do quadrado, menor que ele', () => {
  igual(teste1.moedas[0], Mapa.retanguloMoeda(6, 1));
  const m = teste1.moedas[0];
  assert.ok(m.l < T && m.a < T, 'nao ocupa o quadrado inteiro');
  assert.equal(m.x + m.l / 2, 6 * T + T / 2, 'centrada na coluna');
});

teste('a fase 1 tem as 100 moedas e os 10 blocos quebraveis do plano', () => {
  assert.equal(fase.moedas.length, 100);
  assert.equal(fase.quebraveis.length, 10);
});

teste('nenhuma moeda ou bloco nasce dentro do chao', () => {
  const dentro = (item) => fase.solidos.some((s) => Fisica.tocando(item, s));
  assert.equal(fase.moedas.filter(dentro).length, 0, 'moeda enterrada');
  assert.equal(fase.quebraveis.filter(dentro).length, 0, 'bloco enterrado');
});

// ------------------------------------------------------------- As moedas ----
teste('encostar numa moeda soma 10 pontos', () => {
  const estado = Itens.novoEstado(teste1);
  const corpo = emCimaDe(teste1.moedas[0]);
  const r = Itens.passo(estado, teste1, corpo, corpo);

  assert.equal(r.pontos, Itens.PONTOS_MOEDA);
  assert.equal(Itens.PONTOS_MOEDA, mundo.PONTOS_MOEDA);
  igual(r.pegou, [0]);
  assert.equal(r.quebrou, -1);
});

teste('cada uma das 100 moedas da fase 1 vale +10 e nao volta nunca mais', () => {
  let estado = Itens.novoEstado(fase);
  let pontos = 0;

  fase.moedas.forEach((moeda, i) => {
    const corpo = emCimaDe(moeda);

    const primeira = Itens.passo(estado, fase, corpo, corpo);
    assert.equal(primeira.pontos, 10, `a moeda ${i} nao valeu 10`);
    igual(primeira.pegou, [i], `a moeda ${i} nao foi a que sumiu`);
    estado = primeira.estado;
    pontos += primeira.pontos;

    // O mesmo lugar, um passo depois: a moeda nao pode estar la de novo.
    const segunda = Itens.passo(estado, fase, corpo, corpo);
    assert.equal(segunda.pontos, 0, `a moeda ${i} voltou no passo seguinte`);
    assert.equal(segunda.pegou.length, 0);
    assert.equal(segunda.estado, estado, 'sem mudanca, o estado nem e trocado');
  });

  assert.equal(pontos, 1000, 'as 100 moedas da fase 1 somam 1000 pontos');
  assert.equal(Itens.quantos(estado.moedas), 0, 'nao sobrou moeda nenhuma');
});

teste('quem passa longe nao pega moeda nenhuma', () => {
  const estado = Itens.novoEstado(teste1);
  const corpo = Fisica.novoCorpo(0, 0);
  const r = Itens.passo(estado, teste1, corpo, corpo);
  assert.equal(r.pontos, 0);
  assert.equal(r.estado, estado, 'o estado nem precisou ser trocado');
});

teste('andando pelo chao, o heroi pega a moeda que esta no caminho', () => {
  const estado = Itens.novoEstado(teste1);
  const noChao = Fisica.novoCorpo(2 * T, 4 * T - M.HEROI_A);
  const r = correr(noChao, estado, { direita: true }, 80, teste1);

  assert.equal(r.pontos, 10, 'passou por cima da moeda da linha do chao');
  igual(r.eventos, ['moeda:2']);
  assert.equal(Itens.quantos(r.estado.moedas), 2, 'as outras duas continuam la');
});

// -------------------------------------------------- Os blocos quebraveis ----
teste('bloco quebravel e solido: da para pousar em cima dele', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[0];
  const caindo = { ...Fisica.novoCorpo(bloco.x, bloco.y - M.HEROI_A - 8), noChao: false, vy: 4 };
  let depois = caindo;
  for (let i = 0; i < 5; i++) {
    depois = Fisica.passo(depois, PARADO, estado.limites);
    assert.ok(depois.y <= bloco.y - M.HEROI_A, 'atravessou o bloco');
  }
  assert.equal(depois.y, bloco.y - M.HEROI_A, 'parou em cima do bloco');
  assert.equal(depois.noChao, true);
});

teste('pular por baixo quebra o bloco e abre o caminho', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[0];
  const noChao = Fisica.novoCorpo(bloco.x, 4 * T - M.HEROI_A);

  // Com o bloco de pe, a cabeca para na base dele.
  const semQuebrar = Fisica.passo(noChao, PULO, estado.limites);
  assert.ok(semQuebrar.y >= bloco.y + bloco.a - 1, 'ainda esta abaixo do bloco');

  const r = correr(noChao, estado, PULO, 60, teste1);
  igual(r.eventos, ['bloco:0'], 'o bloco 0 foi o que quebrou');
  assert.equal(r.estado.blocos[0], false, 'sumiu do mundo');
  assert.equal(r.estado.blocos[1], true, 'o vizinho continua de pe');
  assert.equal(Itens.quantos(r.estado.blocos), 1);
  assert.equal(r.pontos, 0, 'bloco nao vale ponto - vale o cristal que solta');

  // Sem o bloco, os solidos daquele lugar somem.
  const aindaSolido = r.estado.limites.solidos.some(
    (s) => s.x === bloco.x && s.y === bloco.y);
  assert.equal(aindaSolido, false, 'o bloco saiu da lista de solidos');
  assert.ok(r.estado.limites.solidos.length < estado.limites.solidos.length);
});

teste('quebrado o bloco, o heroi sobe mais alto do que subia antes', () => {
  const bloco = teste1.quebraveis[0];
  const noChao = Fisica.novoCorpo(bloco.x, 4 * T - M.HEROI_A);

  const alturaCom = (estado) => {
    let corpo = noChao, maisAlto = corpo.y;
    for (let i = 0; i < 40; i++) {
      corpo = Fisica.passo(corpo, PULO, estado.limites);
      maisAlto = Math.min(maisAlto, corpo.y);
    }
    return noChao.y - maisAlto;
  };

  const inteiro = Itens.novoEstado(teste1);
  const quebrado = correr(noChao, inteiro, PULO, 60, teste1).estado;

  assert.ok(alturaCom(inteiro) < M.ALTURA_MAX_PULO - T, 'o bloco cortava o pulo');
  assert.ok(Math.abs(alturaCom(quebrado) - M.ALTURA_MAX_PULO) < 0.001,
    'agora vai ate o teto do pulo');
});

teste('a cabecada tambem pega a moeda que estava debaixo do bloco', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[1];             // tem uma moeda logo abaixo
  const noChao = Fisica.novoCorpo(bloco.x, 4 * T - M.HEROI_A);
  const r = correr(noChao, estado, PULO, 60, teste1);

  assert.deepEqual(new Set(r.eventos), new Set(['moeda:1', 'bloco:1']));
  assert.equal(r.pontos, 10);
});

teste('pousar em cima do bloco tambem quebra ele', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[0];
  const caindo = { ...Fisica.novoCorpo(bloco.x, bloco.y - M.HEROI_A - 20), noChao: false, vy: 6 };
  const r = correr(caindo, estado, PARADO, 30, teste1);

  igual(r.eventos, ['bloco:0']);
  assert.equal(r.estado.blocos[0], false);
  assert.equal(r.corpo.y, 4 * T - M.HEROI_A, 'sem o bloco, foi parar no chao');
});

teste('so quebra quando bate: passar do lado nao derruba nada', () => {
  const estado = Itens.novoEstado(teste1);
  const longe = Fisica.novoCorpo(0, 4 * T - M.HEROI_A);
  const r = correr(longe, estado, { direita: true }, 20, teste1);
  assert.equal(Itens.quantos(r.estado.blocos), 2, 'os dois continuam de pe');
});

teste('encostado na base do bloco, parado, ele nao quebra sozinho', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[0];
  const colado = { ...Fisica.novoCorpo(bloco.x, bloco.y + bloco.a), noChao: false, vy: 0 };
  assert.equal(Itens.blocoAtingido(colado, colado, teste1, estado), -1);
});

teste('bloco quebrado nao quebra de novo', () => {
  const estado = Itens.novoEstado(teste1);
  const bloco = teste1.quebraveis[0];
  const noChao = Fisica.novoCorpo(bloco.x, 4 * T - M.HEROI_A);
  const primeira = correr(noChao, estado, PULO, 60, teste1);
  const segunda = correr(noChao, primeira.estado, PULO, 60, teste1);
  assert.equal(segunda.eventos.length, 0, 'nao ha mais nada ali para quebrar');
});

// --------------------------------------------------------------- Pureza -----
teste('Itens.passo() nao mexe no estado que recebe', () => {
  const estado = Itens.novoEstado(teste1);
  const copia = JSON.stringify({ moedas: estado.moedas, blocos: estado.blocos });
  const corpo = emCimaDe(teste1.moedas[0]);

  const a = Itens.passo(estado, teste1, corpo, corpo);
  const b = Itens.passo(estado, teste1, corpo, corpo);

  assert.equal(JSON.stringify({ moedas: estado.moedas, blocos: estado.blocos }), copia,
    'o estado original ficou intacto');
  assert.equal(JSON.stringify(a.estado.moedas), JSON.stringify(b.estado.moedas),
    'mesma entrada, mesmo resultado');
  assert.notEqual(a.estado, estado, 'o estado devolvido e outro objeto');
});

teste('Itens.novoEstado() comeca com tudo no lugar', () => {
  const estado = Itens.novoEstado(fase);
  assert.equal(Itens.quantos(estado.moedas), 100);
  assert.equal(Itens.quantos(estado.blocos), 10);
  assert.equal(estado.limites.solidos.length,
    fase.solidos.length + fase.quebraveis.length,
    'com todos os blocos de pe, eles entram nos solidos');
});

await fim('Fase 3');
