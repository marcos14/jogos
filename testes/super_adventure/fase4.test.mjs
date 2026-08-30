/* ==========================================================================
   Super Adventure - Fase 4: checkpoints e vidas (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase4.test.mjs

   Confere o que a fase 4 do plano promete, sem DOM nenhum:
     - a letra `C` do tilemap vira um checkpoint, no formato de mastro, e eles
       saem na ordem do percurso (da esquerda para a direita)
     - a fase 1 tem 3 checkpoints, espalhados e plantados no chao - e continua
       com as 100 moedas de antes
     - `Progresso.novoEstado()` comeca com 3 vidas e nenhum checkpoint ligado
     - encostar num checkpoint liga ele; ligado, ele NAO expira e nao liga de
       novo (nada de avisar duas vezes)
     - o heroi renasce no ultimo checkpoint ligado - e no comeco da fase
       enquanto nenhum foi ligado
     - perder vida com vidas de sobra devolve ao checkpoint; a ultima vida
       reinicia a tentativa inteira (vidas cheias, checkpoints apagados)
     - `tocar()` e `perderVida()` sao puras: nao mexem no estado que recebem
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Fisica, Mapa, Progresso, fase, mundo } = carregarJogo('super_adventure');
const M = Fisica.medidas;
const T = M.TILE;

/* Um mapa pequeno so para estes testes:

       0123456789   */
const DESENHO_TESTE = [
  '..........',   // 0
  '..........',   // 1
  '......C.C.',   // 2  dois checkpoints, colunas 6 e 8
  '.P........',   // 3  o heroi nasce na coluna 1
  '####.#####',   // 4  chao, com um buraco na coluna 4
  '####.#####'    // 5
];
const teste1 = Mapa.ler(DESENHO_TESTE);

const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Um corpo de pe no pe do mastro do checkpoint `i`. */
function noCheckpoint(mapa, i) {
  const cp = mapa.checkpoints[i];
  return Fisica.novoCorpo(cp.x, cp.y + cp.a - M.HEROI_A);
}

/** Um estado de progresso montado na mao. */
function estadoCom(vidas, ativos, atual) {
  return { vidas: vidas, ativos: ativos, atual: atual };
}

console.log('Super Adventure - fase 4\n');

// ------------------------------------------------- O `C` virando checkpoint --
teste('a letra C do tilemap vira um checkpoint em forma de mastro', () => {
  assert.equal(teste1.checkpoints.length, 2);
  igual(teste1.checkpoints, [
    { x: 6 * T, y: 2 * T, l: T, a: 2 * T },
    { x: 8 * T, y: 2 * T, l: T, a: 2 * T },
  ], 'cada mastro vai da letra ate o chao logo abaixo dela');
});

teste('o checkpoint nao e solido: da para atravessar andando', () => {
  const cp = teste1.checkpoints[0];
  const dentro = teste1.limites.solidos.some((s) => Fisica.tocando(cp, s));
  assert.equal(dentro, false, 'nenhum solido nasceu no lugar do mastro');

  let corpo = Fisica.novoCorpo(4 * T + T, 4 * T - M.HEROI_A);   // antes do mastro
  for (let i = 0; i < 60; i++) corpo = Fisica.passo(corpo, { direita: true }, teste1.limites);
  assert.ok(corpo.x > cp.x + cp.l, 'passou direto pelo checkpoint');
});

teste('a fase 1 tem 3 checkpoints, na ordem do percurso e de pe no chao', () => {
  assert.equal(fase.checkpoints.length, 3);
  igual(fase.checkpoints.map((c) => c.x / T), [29, 63, 87],
    'colunas 29, 63 e 87 - depois de cada lugar onde da para cair');

  fase.checkpoints.forEach((cp, i) => {
    assert.ok(cp.x > fase.spawn.x, `o checkpoint ${i} fica depois do comeco`);
    assert.ok(cp.x < fase.bandeira.x, `o checkpoint ${i} fica antes da bandeira`);
    assert.ok(cp.a >= T, `o checkpoint ${i} ficou sem mastro`);
    const enterrado = fase.solidos.some((s) => Fisica.tocando(cp, s));
    assert.equal(enterrado, false, `o checkpoint ${i} nasceu dentro do chao`);
  });
});

teste('plantar os checkpoints nao mexeu nas moedas nem nos blocos da fase 1', () => {
  assert.equal(fase.moedas.length, 100);
  assert.equal(fase.quebraveis.length, 10);
});

// ------------------------------------------------ O comeco de uma tentativa --
teste('o progresso comeca com 3 vidas e nenhum checkpoint ligado', () => {
  const estado = Progresso.novoEstado(fase);
  assert.equal(estado.vidas, mundo.VIDAS_INICIAIS);
  assert.equal(estado.vidas, 3);
  assert.equal(estado.atual, -1, 'nenhum checkpoint ligado ainda');
  igual(estado.ativos, [false, false, false]);
});

teste('sem checkpoint ligado, o heroi nasce no comeco da fase', () => {
  const estado = Progresso.novoEstado(fase);
  igual(Progresso.nascedouro(fase, estado), { x: fase.spawn.x, y: fase.spawn.y });
});

teste('com um checkpoint ligado, o heroi nasce de pe no mastro dele', () => {
  fase.checkpoints.forEach((cp, i) => {
    const onde = Progresso.nascedouro(fase, estadoCom(3, [true, true, true], i));
    assert.equal(onde.x, cp.x, `checkpoint ${i}: nasce na coluna do mastro`);
    assert.equal(onde.y + M.HEROI_A, cp.y + cp.a, `checkpoint ${i}: com os pes no chao`);

    // E o chao daquele lugar segura mesmo: parado, ele nao afunda nem cai.
    let corpo = Fisica.novoCorpo(onde.x, onde.y);
    for (let n = 0; n < 30; n++) corpo = Fisica.passo(corpo, {}, fase.limites);
    assert.equal(corpo.y, onde.y, `checkpoint ${i}: o heroi renasceu no ar`);
    assert.equal(Fisica.caiu(corpo, fase.fundo), false);
  });
});

// ---------------------------------------------------- Ligando o checkpoint --
teste('encostar num checkpoint liga ele e passa a ser o mais novo', () => {
  const estado = Progresso.novoEstado(teste1);
  const r = Progresso.tocar(estado, teste1, noCheckpoint(teste1, 1));

  assert.equal(r.ativou, 1);
  assert.equal(r.estado.atual, 1, 'o checkpoint 1 e o novo nascedouro');
  igual(r.estado.ativos, [false, true]);
  assert.equal(r.estado.vidas, estado.vidas, 'ligar checkpoint nao mexe em vida');
});

teste('quem passa longe nao liga checkpoint nenhum', () => {
  const estado = Progresso.novoEstado(teste1);
  const longe = Fisica.novoCorpo(0, 4 * T - M.HEROI_A);
  const r = Progresso.tocar(estado, teste1, longe);

  assert.equal(r.ativou, -1);
  assert.equal(r.estado, estado, 'sem mudanca, o estado nem e trocado');
});

teste('checkpoint ligado nao liga de novo (nem avisa duas vezes)', () => {
  const corpo = noCheckpoint(teste1, 0);
  const primeira = Progresso.tocar(Progresso.novoEstado(teste1), teste1, corpo);
  const segunda = Progresso.tocar(primeira.estado, teste1, corpo);

  assert.equal(segunda.ativou, -1);
  assert.equal(segunda.estado, primeira.estado);
});

teste('checkpoint nao expira: continua ligado a tentativa inteira', () => {
  let estado = Progresso.tocar(Progresso.novoEstado(teste1), teste1,
    noCheckpoint(teste1, 0)).estado;

  // O heroi sai de perto e o mundo anda mil quadros: nada disso apaga nada.
  let corpo = noCheckpoint(teste1, 0);
  for (let i = 0; i < 1000; i++) {
    corpo = Fisica.passo(corpo, { esquerda: i < 40 }, teste1.limites);
    estado = Progresso.tocar(estado, teste1, corpo).estado;
  }

  assert.equal(estado.ativos[0], true, 'o checkpoint apagou sozinho');
  assert.equal(estado.atual, 0, 'e continua sendo o nascedouro');
});

teste('o segundo checkpoint passa a valer, sem apagar o primeiro', () => {
  const passo1 = Progresso.tocar(Progresso.novoEstado(teste1), teste1, noCheckpoint(teste1, 0));
  const passo2 = Progresso.tocar(passo1.estado, teste1, noCheckpoint(teste1, 1));

  igual(passo2.estado.ativos, [true, true], 'os dois ficam ligados');
  assert.equal(passo2.estado.atual, 1, 'mas o nascedouro e o mais novo');
});

// ------------------------------------------------------------- As vidas -----
teste('perder uma vida com vidas de sobra devolve ao checkpoint', () => {
  const estado = estadoCom(3, [true, false, false], 0);
  const r = Progresso.perderVida(estado, fase);

  assert.equal(r.tipo, 'checkpoint');
  assert.equal(r.estado.vidas, 2, 'foi-se um coracao');
  assert.equal(r.estado.atual, 0, 'o checkpoint continua valendo');
  igual(r.estado.ativos, [true, false, false]);
  igual(Progresso.nascedouro(fase, r.estado),
    Progresso.nascedouro(fase, estado), 'renasce no mesmo lugar');
});

teste('a segunda queda tambem so custa um coracao', () => {
  const r = Progresso.perderVida(estadoCom(2, [true, true, false], 1), fase);
  assert.equal(r.tipo, 'checkpoint');
  assert.equal(r.estado.vidas, 1);
  assert.equal(r.estado.atual, 1);
});

teste('sem vidas, a tentativa recomeca: vidas cheias e checkpoints apagados', () => {
  const r = Progresso.perderVida(estadoCom(1, [true, true, true], 2), fase);

  assert.equal(r.tipo, 'reinicio');
  assert.equal(r.estado.vidas, mundo.VIDAS_INICIAIS, 'os 3 coracoes de volta');
  assert.equal(r.estado.atual, -1, 'volta a nascer no comeco da fase');
  igual(r.estado.ativos, [false, false, false]);
  igual(Progresso.nascedouro(fase, r.estado), { x: fase.spawn.x, y: fase.spawn.y });
});

teste('tres quedas seguidas: checkpoint, checkpoint, reinicio', () => {
  let estado = Progresso.tocar(Progresso.novoEstado(fase), fase,
    noCheckpoint(fase, 0)).estado;
  const tipos = [];

  for (let i = 0; i < 3; i++) {
    const r = Progresso.perderVida(estado, fase);
    tipos.push(r.tipo);
    estado = r.estado;
  }

  igual(tipos, ['checkpoint', 'checkpoint', 'reinicio']);
  assert.equal(estado.vidas, 3, 'a tentativa nova comeca cheia');
  assert.equal(estado.atual, -1);
});

// --------------------------------------------------------------- Pureza -----
teste('tocar() e perderVida() nao mexem no estado que recebem', () => {
  const estado = estadoCom(3, [false, false, false], -1);
  const copia = JSON.stringify(estado);

  const a = Progresso.tocar(estado, fase, noCheckpoint(fase, 0));
  const b = Progresso.perderVida(a.estado, fase);

  assert.equal(JSON.stringify(estado), copia, 'o estado original ficou intacto');
  assert.notEqual(a.estado, estado, 'o estado devolvido e outro objeto');
  assert.notEqual(b.estado, a.estado);
  assert.equal(a.estado.vidas, 3, 'ligar checkpoint nao tirou vida');
});

teste('mesma entrada, mesmo resultado', () => {
  const estado = Progresso.novoEstado(fase);
  const corpo = noCheckpoint(fase, 1);
  const a = Progresso.tocar(estado, fase, corpo);
  const b = Progresso.tocar(estado, fase, corpo);
  igual(a.estado, b.estado);
  assert.equal(a.ativou, b.ativou);
});

await fim('Fase 4');
