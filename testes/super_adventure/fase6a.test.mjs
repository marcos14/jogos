/* ==========================================================================
   Super Adventure - Fase 6a: as tres fases do PRD (funcoes puras)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase6a.test.mjs

   Confere o que a fase 6a do plano promete, sem DOM nenhum:
     - as tres fases existem, cada uma com as suas contagens: 100, 80 e 60
       moedas, checkpoints e bandeira em todas
     - a dificuldade sobe de verdade: mais buracos na 2, bichos a 3px por
       quadro em vez de 2, e bichos que PERSEGUEM o heroi na 3
     - todo vao maior do que um pulo tem uma plataforma movel atravessando
     - as letras M / - / N / | do tilemap viram plataformas moveis com trilho,
       e nenhuma das quatro e solida como quadrado do mapa
     - `Moveis` anda 1px por quadro, para nas duas pontas do trilho e volta
     - a fisica marca em `apoio` a plataforma em que o heroi pousou, e
       `Moveis.carregar()` leva o heroi junto quando ela anda (nos dois eixos)
     - `andarUm()`, `andar()` e `carregar()` sao puras
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Fisica, Mapa, Moveis, Inimigos, mapas, FASES } = carregarJogo('super_adventure');
const M = Fisica.medidas;
const T = M.TILE;

const [fase1, fase2, fase3] = mapas;

/* Um mapa de laboratorio com uma plataforma de cada tipo:

       0123456789
   0   ..|.......      o elevador nasce na linha 1 e o trilho `|` vai da
   1   ..N.......      linha 0 a linha 2
   2   ..|.......
   3   -MM--.....      a deitada tem 2 quadrados e um trilho de 5 (colunas 0 a 4)
   4   ..........
   5   ##########   */
const DESENHO_TESTE = [
  '..|.......',
  '..N.......',
  '..|.......',
  '-MM--.....',
  '..........',
  '##########'
];
const teste1 = Mapa.ler(DESENHO_TESTE);

const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);
const copia = (x) => JSON.parse(JSON.stringify(x));

/** Roda `n` quadros das plataformas e devolve o estado no fim. */
function andar(estado, n) {
  let atual = estado;
  for (let i = 0; i < n; i++) atual = Moveis.andar(atual).estado;
  return atual;
}

/** Por onde a plataforma `i` passou em `n` quadros. */
function trilha(estado, i, n, campo = 'x') {
  const pontos = [];
  let atual = estado;
  for (let q = 0; q < n; q++) {
    atual = Moveis.andar(atual).estado;
    pontos.push(atual.lista[i][campo]);
  }
  return pontos;
}

/** As colunas sem NENHUM quadrado solido, agrupadas em vaos seguidos. */
function vaos(mapa) {
  const cheia = (c) => {
    for (let r = 0; r < mapa.linhas; r++) if (Mapa.solido(mapa, c, r)) return true;
    return false;
  };
  const lista = [];
  let inicio = -1;
  for (let c = 0; c <= mapa.colunas; c++) {
    if (c < mapa.colunas && !cheia(c)) { if (inicio < 0) inicio = c; continue; }
    if (inicio >= 0) { lista.push({ de: inicio, ate: c - 1, largura: c - inicio }); inicio = -1; }
  }
  return lista;
}

console.log('Super Adventure - fase 6a\n');

// ------------------------------------------------------------ As tres fases --
teste('o jogo tem as tres fases do PRD, na ordem fixa', () => {
  assert.equal(mapas.length, 3);
  igual(FASES.map((f) => f.numero), [1, 2, 3]);
  FASES.forEach((f, i) => {
    assert.equal(typeof f.nome, 'string', `a fase ${i + 1} tem nome`);
    assert.ok(f.nome.length > 0);
  });
});

teste('cada fase tem as moedas que o plano pediu: 100, 80 e 60', () => {
  assert.equal(fase1.moedas.length, 100, 'fase 1');
  assert.equal(fase2.moedas.length, 80, 'fase 2');
  assert.equal(fase3.moedas.length, 60, 'fase 3');
});

teste('as tres tem tamanho crescente, spawn no chao e bandeira no fim', () => {
  igual(mapas.map((m) => m.colunas), [120, 128, 140]);
  mapas.forEach((m, i) => {
    assert.ok(m.spawn, `a fase ${i + 1} tem onde nascer`);
    assert.equal(Mapa.solido(m, m.spawn.x / T, m.spawn.y / T + 1), true,
      `o spawn da fase ${i + 1} fica em pe no chao`);
    assert.ok(m.bandeira, `a fase ${i + 1} tem bandeira`);
    assert.ok(m.bandeira.x > m.largura - 8 * T, 'e ela fica la no fim');
    assert.ok(m.bandeira.x > m.spawn.x, 'depois do comeco, nao antes');
  });
});

teste('as tres tem 3 checkpoints, em ordem e plantados no chao', () => {
  mapas.forEach((m, i) => {
    assert.equal(m.checkpoints.length, 3, `a fase ${i + 1} tem 3 checkpoints`);
    let anterior = -1;
    m.checkpoints.forEach((cp) => {
      assert.ok(cp.x > anterior, 'na ordem do percurso');
      anterior = cp.x;
      assert.equal(Mapa.solido(m, cp.x / T, (cp.y + cp.a) / T), true,
        'o mastro vai ate o chao');
      assert.ok(cp.x > m.spawn.x && cp.x < m.bandeira.x,
        'entre o comeco e a bandeira');
    });
  });
});

teste('nenhum bicho nasce em cima do heroi nem de um checkpoint', () => {
  const longe = (a, b) => Math.abs(a.x - b.x) >= 4 * T;
  mapas.forEach((m, i) => {
    m.inimigos.forEach((ini) => {
      assert.equal(Mapa.solido(m, ini.x / T, ini.y / T + 1), true,
        `bicho da fase ${i + 1} plantado no chao`);
      assert.equal(longe(ini, m.spawn), true, 'longe de onde o heroi nasce');
      m.checkpoints.forEach((cp, c) => {
        assert.equal(longe(ini, cp), true, `longe do checkpoint ${c}`);
      });
    });
  });
});

// ------------------------------------------------------ Dificuldade que sobe --
teste('a fase 2 e media: mais buracos e mais bichos que a fase 1', () => {
  assert.ok(vaos(fase2).length > vaos(fase1).length,
    `fase 2 tem ${vaos(fase2).length} vaos e a fase 1 tem ${vaos(fase1).length}`);
  assert.equal(fase2.inimigos.length, 6, 'seis bichos');
  assert.equal(fase2.inimigos.filter((i) => i.tipo === 'goomba').length, 3);
  assert.equal(fase2.inimigos.filter((i) => i.tipo === 'turtle').length, 3);
  assert.equal(fase2.quebraveis.length, 5, 'e cinco blocos quebraveis');
});

teste('os bichos ficam mais rapidos: 2px por quadro na 1, 3px na 2 e na 3', () => {
  igual(mapas.map((m) => m.velInimigo), [2, 3, 3]);
  igual(mapas.map((m) => Inimigos.novoEstado(m).lista[0].vx), [-2, -3, -3],
    'e e essa a velocidade com que eles saem andando');
});

teste('a fase 3 e a dificil: bichos espertos, moveis e itens espalhados', () => {
  igual(mapas.map((m) => m.espertos), [false, false, true]);
  assert.equal(fase3.moveis.length, 4, 'quatro plataformas moveis');
  assert.equal(fase3.inimigos.length, 6);
  assert.equal(fase3.quebraveis.length, 8, 'oito blocos espalhados pela fase');
  const colunas = fase3.quebraveis.map((b) => b.x / T);
  assert.ok(Math.max(...colunas) - Math.min(...colunas) > fase3.colunas * 0.7,
    'espalhados de ponta a ponta, nao amontoados num canto so');
});

teste('so os bichos da fase 3 perseguem o heroi', () => {
  const perto = { x: 10 * T, y: 3 * T };            // heroi na mesma altura
  const ini = { tipo: 'goomba', x: 12 * T, y: 3 * T, vx: 3, vy: 0, estado: 'vivo' };
  const solidos = [{ x: 0, y: 4 * T, l: 40 * T, a: T }];
  const bobo = { esquerda: 0, direita: 40 * T, solidos };
  const esperto = { esquerda: 0, direita: 40 * T, solidos, espertos: true };

  assert.equal(Inimigos.andarUm(ini, bobo, perto).vx, 3,
    'sem `espertos`, ele segue o rumo dele');

  const cacador = Inimigos.andarUm(ini, esperto, perto);
  assert.equal(cacador.vx, -3, 'com `espertos`, vira para o lado do heroi');
  assert.equal(cacador.x, ini.x - 3, 'e vai atras, na velocidade de sempre');
});

teste('o bicho esperto so enxerga quem esta perto e na mesma altura', () => {
  const ini = { tipo: 'goomba', x: 12 * T, y: 3 * T, vx: 3, vy: 0, estado: 'vivo' };
  assert.equal(Inimigos.vendo(ini, { x: 10 * T, y: 3 * T }), true, 'ao lado');
  assert.equal(Inimigos.vendo(ini, { x: 2 * T, y: 3 * T }), false, 'longe demais');
  assert.equal(Inimigos.vendo(ini, { x: 12 * T, y: 3 * T - 120 }), false,
    'quem pula some da vista dele');
  assert.equal(Inimigos.medidas.VISTA, 6 * T, 'a vista dele e de 6 quadrados');
});

teste('todo vao maior que um pulo tem plataforma movel atravessando', () => {
  // O heroi passa ~31 quadros no ar e anda 3px por quadro: uns 93px, ou seja,
  // 2 quadrados. Vao maior que isso so da para passar de plataforma.
  mapas.forEach((m, i) => {
    vaos(m).forEach((v) => {
      if (v.largura <= 2) return;
      const cobre = m.moveis.some((p) =>
        p.min <= v.de * T && p.max + p.l >= (v.ate + 1) * T);
      assert.equal(cobre, true,
        `fase ${i + 1}: vao de ${v.largura} quadrados na coluna ${v.de}, sem ponte`);
    });
  });
});

// ------------------------------------------- As letras das plataformas moveis --
teste('as letras M, N, - e | nao sao quadrados solidos do mapa', () => {
  [[1, 3], [2, 3], [0, 3], [3, 3], [2, 1], [2, 0], [2, 2]].forEach((par) => {
    assert.equal(Mapa.solido(teste1, par[0], par[1]), false,
      `o quadrado (${par[0]}, ${par[1]}) nao pode ser solido`);
  });
  assert.equal(teste1.solidos.length, 1, 'so o chao da linha 5 e solido');
});

teste('a fileira de M vira uma plataforma deitada com o trilho dela', () => {
  const deitada = teste1.moveis.filter((m) => m.eixo === 'x');
  assert.equal(deitada.length, 1);
  igual(deitada[0], {
    eixo: 'x', x: 1 * T, y: 3 * T, l: 2 * T, a: T,
    min: 0, max: 5 * T - 2 * T
  }, 'dois quadrados de plataforma num trilho de cinco');
});

teste('a fileira de N vira um elevador com o trilho em pe', () => {
  const emPe = teste1.moveis.filter((m) => m.eixo === 'y');
  assert.equal(emPe.length, 1);
  igual(emPe[0], {
    eixo: 'y', x: 2 * T, y: 1 * T, l: T, a: T, min: 0, max: 2 * T
  }, 'um quadrado de plataforma subindo e descendo tres linhas');
});

teste('as quatro moveis da fase 3 sao tres pontes e um elevador', () => {
  const deitadas = fase3.moveis.filter((m) => m.eixo === 'x');
  const emPe = fase3.moveis.filter((m) => m.eixo === 'y');
  assert.equal(deitadas.length, 3, 'tres pontes sobre os vaos');
  assert.equal(emPe.length, 1, 'e um elevador');

  deitadas.forEach((p) => {
    assert.equal(p.l, 2 * T, 'a ponte tem dois quadrados');
    assert.equal(p.y, 14 * T, 'e anda rente ao chao dos dois lados');
    assert.ok(p.max - p.min >= 6 * T, 'atravessando um vao de verdade');
  });
  assert.equal(emPe[0].max - emPe[0].min, 4 * T, 'o elevador sobe 4 quadrados');
});

// ------------------------------------------------------- A patrulha do trilho --
teste('a plataforma anda 1px por quadro ate a ponta do trilho', () => {
  const estado = Moveis.novoEstado(teste1);
  const deitada = estado.lista.findIndex((m) => m.eixo === 'x');

  igual(trilha(estado, deitada, 6), [31, 30, 29, 28, 27, 26],
    'de 1 em 1, indo para a esquerda (a ponta em que se embarca)');
  assert.equal(Moveis.medidas.VEL, 1);
});

teste('chegando na ponta ela para um instante e volta', () => {
  const estado = Moveis.novoEstado(teste1);
  const deitada = estado.lista.findIndex((m) => m.eixo === 'x');
  const PAUSA = Moveis.medidas.PAUSA;

  const xs = trilha(estado, deitada, 33 + PAUSA);
  assert.equal(xs[31], 0, 'levou 32 quadros para chegar no min do trilho');
  for (let i = 32; i < 32 + PAUSA; i++) {
    assert.equal(xs[i], 0, `ainda parada no quadro ${i}`);
  }
  assert.equal(xs[32 + PAUSA], 1, 'e ai volta andando para a direita');
});

teste('ela nunca sai do trilho, por mais que ande', () => {
  const estado = Moveis.novoEstado(teste1);
  const deitada = estado.lista.findIndex((m) => m.eixo === 'x');
  const xs = trilha(estado, deitada, 600);
  const molde = teste1.moveis.find((m) => m.eixo === 'x');

  assert.equal(Math.min(...xs), molde.min, 'vai ate a ponta da esquerda');
  assert.equal(Math.max(...xs), molde.max, 'e ate a ponta da direita');
  assert.ok(xs.filter((x, i) => i > 0 && x > xs[i - 1]).length > 50, 'ida');
  assert.ok(xs.filter((x, i) => i > 0 && x < xs[i - 1]).length > 50, 'e volta');
});

teste('o elevador desce primeiro, para embarcar la de baixo', () => {
  const estado = Moveis.novoEstado(teste1);
  const emPe = estado.lista.findIndex((m) => m.eixo === 'y');
  const ys = trilha(estado, emPe, 40, 'y');

  igual(ys.slice(0, 4), [33, 34, 35, 36], 'descendo 1px por quadro');
  assert.equal(Math.max(...ys), 2 * T, 'para no pe do trilho');
  const molde = teste1.moveis.find((m) => m.eixo === 'y');
  igual([molde.min, molde.max], [0, 2 * T]);
});

teste('trilho de um lugar so nao anda (nem quebra)', () => {
  const parada = Mapa.ler(['MM........', '##########']);
  assert.equal(parada.moveis.length, 1);
  const estado = Moveis.novoEstado(parada);
  igual(andar(estado, 50).lista, estado.lista, 'ficou onde estava');
});

// -------------------------------------------------- A plataforma que carrega --
teste('a plataforma entra nos solidos marcada com o indice dela', () => {
  const estado = Moveis.novoEstado(teste1);
  const limites = Moveis.limitesCom(teste1.limites, estado);

  assert.equal(limites.solidos.length, teste1.limites.solidos.length + 2);
  estado.lista.forEach((m, i) => {
    const r = limites.solidos.find((s) => s.movel === i);
    assert.ok(r, `a plataforma ${i} esta nos solidos`);
    igual([r.x, r.y, r.l, r.a], [m.x, m.y, m.l, m.a]);
  });
  assert.equal(Moveis.limitesCom(teste1.limites, { lista: [] }),
    teste1.limites, 'sem moveis, os limites nem sao recriados');
});

teste('pousar numa plataforma movel marca o apoio dela no corpo', () => {
  const estado = Moveis.novoEstado(teste1);
  const limites = Moveis.limitesCom(teste1.limites, estado);
  const deitada = estado.lista.findIndex((m) => m.eixo === 'x');
  const p = estado.lista[deitada];

  let corpo = Fisica.novoCorpo(p.x, p.y - M.HEROI_A - 10);
  corpo.noChao = false;
  for (let i = 0; i < 10; i++) corpo = Fisica.passo(corpo, {}, limites);

  assert.equal(corpo.noChao, true, 'pousou');
  assert.equal(corpo.y, p.y - M.HEROI_A, 'em cima dela');
  assert.equal(corpo.apoio, deitada, 'e sabe em qual plataforma esta');
});

teste('pousar no chao firme deixa o apoio em -1', () => {
  const limites = Moveis.limitesCom(teste1.limites, Moveis.novoEstado(teste1));
  let corpo = Fisica.novoCorpo(8 * T, 0);
  corpo.noChao = false;
  for (let i = 0; i < 40; i++) corpo = Fisica.passo(corpo, {}, limites);

  assert.equal(corpo.y, 5 * T - M.HEROI_A, 'pousou no chao da linha 5');
  assert.equal(corpo.apoio, -1, 'chao firme nao carrega ninguem');
});

teste('carregar() leva o corpo o mesmo tanto que a plataforma andou', () => {
  const corpo = Fisica.novoCorpo(100, 200);
  corpo.apoio = 1;
  const deltas = [{ dx: 5, dy: 0 }, { dx: -1, dy: 3 }];

  const levado = Moveis.carregar(corpo, deltas);
  igual([levado.x, levado.y], [99, 203], 'andou junto com a plataforma 1');
  assert.equal(levado.apoio, 1, 'e continua em cima dela');

  const noChao = Fisica.novoCorpo(100, 200);
  assert.equal(Moveis.carregar(noChao, deltas).x, 100,
    'quem esta no chao firme nao e levado');
  assert.equal(Moveis.carregar(corpo, [{ dx: 5, dy: 0 }, { dx: 0, dy: 0 }]), corpo,
    'plataforma parada nem devolve corpo novo');
});

teste('o heroi parado em cima da ponte atravessa o vao junto com ela', () => {
  let moveis = Moveis.novoEstado(teste1);
  const deitada = moveis.lista.findIndex((m) => m.eixo === 'x');
  const p = moveis.lista[deitada];
  let corpo = Fisica.novoCorpo(p.x, p.y - M.HEROI_A);
  corpo = Fisica.passo(corpo, {}, Moveis.limitesCom(teste1.limites, moveis));
  assert.equal(corpo.apoio, deitada, 'de pe na plataforma');

  const distancia = () => corpo.x - moveis.lista[deitada].x;
  const grudado = distancia();

  for (let q = 0; q < 400; q++) {
    const passo = Moveis.andar(moveis);
    moveis = passo.estado;
    corpo = Fisica.passo(Moveis.carregar(corpo, passo.deltas), {},
      Moveis.limitesCom(teste1.limites, moveis));
    assert.equal(corpo.noChao, true, `caiu no quadro ${q}`);
    assert.equal(distancia(), grudado, `escorregou no quadro ${q}`);
  }
  assert.equal(corpo.apoio, deitada, 'chegou do outro lado ainda em cima dela');
});

teste('o heroi parado no elevador sobe e desce junto com ele', () => {
  let moveis = Moveis.novoEstado(teste1);
  const emPe = moveis.lista.findIndex((m) => m.eixo === 'y');
  const p = moveis.lista[emPe];
  let corpo = Fisica.novoCorpo(p.x, p.y - M.HEROI_A);
  corpo = Fisica.passo(corpo, {}, Moveis.limitesCom(teste1.limites, moveis));

  const alturas = [];
  for (let q = 0; q < 300; q++) {
    const passo = Moveis.andar(moveis);
    moveis = passo.estado;
    corpo = Fisica.passo(Moveis.carregar(corpo, passo.deltas), {},
      Moveis.limitesCom(teste1.limites, moveis));
    assert.equal(corpo.y, moveis.lista[emPe].y - M.HEROI_A,
      `descolou do elevador no quadro ${q}`);
    alturas.push(corpo.y);
  }
  assert.equal(Math.max(...alturas), 2 * T - M.HEROI_A, 'desceu ate o pe');
  assert.equal(Math.min(...alturas), 0 - M.HEROI_A, 'e subiu ate o alto');
});

// ------------------------------------------------------ Funcoes puras mesmo --
teste('andar() e carregar() nao mexem no que recebem', () => {
  const estado = Moveis.novoEstado(teste1);
  const antes = copia(estado);
  const corpo = Fisica.novoCorpo(0, 0);
  corpo.apoio = 0;
  const corpoAntes = copia(corpo);

  Moveis.andar(estado);
  Moveis.andarUm(estado.lista[0]);
  Moveis.carregar(corpo, [{ dx: 7, dy: 7 }, { dx: 0, dy: 0 }]);

  igual(estado, antes, 'as plataformas ficaram intactas');
  igual(corpo, corpoAntes, 'e o corpo do heroi tambem');
});

teste('mesma entrada, mesmo resultado', () => {
  igual(andar(Moveis.novoEstado(fase3), 271),
        andar(Moveis.novoEstado(fase3), 271), 'as moveis sao deterministas');
});

await fim('Fase 6a');
