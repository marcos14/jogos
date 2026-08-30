/* ==========================================================================
   Come-Come - Fase 3a: os quatro fantasmas, a casa e o movimento em grade
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase3a.test.mjs

   Confere o que a fase 3a do plano promete, no modulo puro:
     - a casa sai do desenho sozinha (porta, rua, miolo e os quatro lugares)
     - os quatro nascem no lugar certo e saem da casa na ordem prevista
     - a porta e atravessada SO na saida, e nunca de volta
     - nenhum fantasma solto no labirinto entra numa parede
     - na encruzilhada, a escolha e a que mais aproxima do alvo recebido
     - a meia-volta nao acontece (a nao ser num beco sem saida)
     - eles atravessam o tunel como qualquer corpo da grade
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Mapa, Movimento, Fantasmas, mapas, mundo } = carregarJogo('come_come');
const mapa = mapas[0];
const TILE = mundo.TILE;
const casa = mapa.casa;

/* Os objetos e os arrays do jogo nascem dentro do `vm`, e por isso os
   prototipos deles nao sao os deste arquivo: `deepEqual` reclamaria de coisas
   iguaizinhas. Comparar o texto resolve, e de quebra deixa a mensagem de erro
   legivel. */
const igual = (a, b, oque) => assert.equal(JSON.stringify(a), JSON.stringify(b), oque);

/** O quadrado (coluna, linha) em que um corpo esta. */
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

/** Um fantasma montado a mao, solto no labirinto - para testar uma cena so. */
function solto(c, l, dir) {
  return {
    indice: 0, chave: 'teste', nome: 'Teste', cor: '#fff',
    etapa: 'livre', espera: 0,
    casaY: Mapa.centro(c, l).y,
    corpo: Movimento.novoCorpo(c, l, dir)
  };
}

console.log('Come-Come - fase 3a\n');

// ---------------------------------------------------------------- A casa ---
teste('a casa dos fantasmas sai do desenho sozinha', () => {
  assert.ok(casa, 'o labirinto 1 tem casa');

  // A porta e o `-` mais em cima e mais a esquerda.
  igual(casa.porta, { c: 13, l: 12 });
  assert.equal(Mapa.letra(mapa, casa.porta.c, casa.porta.l), Mapa.PORTA);

  // De um lado dela a rua, do outro o miolo.
  igual(casa.fora, { c: 13, l: 11 });
  igual(casa.dentro, { c: 13, l: 13 });
  assert.equal(Mapa.livre(mapa, casa.fora.c, casa.fora.l), true, 'fora e chao');
  assert.equal(Mapa.livre(mapa, casa.dentro.c, casa.dentro.l), true, 'dentro tambem');

  // O retangulo do miolo, achado enchendo a casa a partir de dentro.
  assert.equal(casa.c0, 11);
  assert.equal(casa.c1, 16);
  assert.equal(casa.l0, 13);
  assert.equal(casa.l1, 15);
});

teste('a agua do miolo nao vaza para a rua pela porta', () => {
  // Se vazasse, o retangulo pegaria o labirinto inteiro.
  const largura = casa.c1 - casa.c0 + 1;
  const altura = casa.l1 - casa.l0 + 1;
  assert.equal(largura, 6, 'a casa tem 6 quadrados de largura');
  assert.equal(altura, 3, 'e 3 de altura');
  assert.ok(largura < mapa.colunas && altura < mapa.linhas);

  // Todo quadrado do retangulo e chao, e nenhum tem pastilha.
  for (let l = casa.l0; l <= casa.l1; l++) {
    for (let c = casa.c0; c <= casa.c1; c++) {
      assert.equal(Mapa.livre(mapa, c, l), true, `(${c}, ${l}) e chao`);
      assert.equal(Mapa.pastilhaEm(mapa, c, l), -1, `(${c}, ${l}) sem pastilha`);
    }
  }
});

teste('a saida aponta para a coluna da porta e a linha da rua', () => {
  assert.equal(casa.saidaX, Mapa.centro(casa.porta.c, casa.porta.l).x);
  assert.equal(casa.saidaY, Mapa.centro(casa.fora.c, casa.fora.l).y);
});

teste('os quatro lugares: um na rua e tres na linha do meio do miolo', () => {
  assert.equal(casa.lugares.length, 4);
  igual(casa.lugares[0], casa.fora, 'o primeiro ja nasce na rua');
  igual(casa.lugares[1], { c: 13, l: 14 }, 'na coluna da porta');
  igual(casa.lugares[2], { c: 11, l: 14 }, 'encostado na esquerda');
  igual(casa.lugares[3], { c: 16, l: 14 }, 'e na direita');
});

teste('um desenho sem porta nenhuma simplesmente nao tem casa', () => {
  const sem = Mapa.ler(['#####', '#...#', '#####']);
  assert.equal(sem.casa, null);
});

// ------------------------------------------------------------ Os quatro ----
teste('sao quatro, cada um com nome, cor e chave proprios', () => {
  const estado = Fantasmas.novoEstado(mapa);
  assert.equal(estado.lista.length, 4);
  assert.equal(Fantasmas.TIPOS.length, 4);

  const chaves = estado.lista.map((f) => f.chave);
  igual(chaves, ['perseguidor', 'emboscador', 'timido', 'aleatorio']);
  assert.equal(new Set(estado.lista.map((f) => f.cor)).size, 4, 'quatro cores');

  estado.lista.forEach((f, i) => {
    assert.equal(f.indice, i);
    assert.match(f.cor, /^#[0-9a-f]{6}$/i, `a cor do ${f.nome}`);
    assert.ok(f.nome.length > 0);
  });
});

teste('cada um nasce no seu lugar da casa, parado no centro do quadrado', () => {
  const estado = Fantasmas.novoEstado(mapa);
  estado.lista.forEach((f, i) => {
    const meio = Mapa.centro(casa.lugares[i].c, casa.lugares[i].l);
    assert.equal(f.corpo.x, meio.x, `o x do ${f.nome}`);
    assert.equal(f.corpo.y, meio.y, `o y do ${f.nome}`);
    assert.equal(f.casaY, meio.y);
    assert.equal(Movimento.noCentro(f.corpo), true);
  });
});

teste('o primeiro ja nasce na rua; os outros tres esperam na casa', () => {
  const estado = Fantasmas.novoEstado(mapa);
  assert.equal(estado.lista[0].etapa, 'livre', 'o vermelho comeca solto');
  assert.equal(estado.lista[1].etapa, 'casa');
  assert.equal(estado.lista[2].etapa, 'casa');
  assert.equal(estado.lista[3].etapa, 'casa');

  igual(mundo.SAIDAS, [0, 120, 240, 360], 'as esperas sao escalonadas');
  for (let i = 1; i < mundo.SAIDAS.length; i++) {
    assert.ok(mundo.SAIDAS[i] > mundo.SAIDAS[i - 1], 'e crescentes');
  }
});

// ------------------------------------------------------- Saindo da casa ----
teste('todos saem da casa, na ordem prevista', () => {
  let estado = Fantasmas.novoEstado(mapa);
  const alvo = { c: mapa.nascimento.c, l: mapa.nascimento.l };
  const chegouNaRua = [0, null, null, null];

  for (let q = 1; q <= 900; q++) {
    estado = Fantasmas.passo(estado, mapa, alvo);
    estado.lista.forEach((f, i) => {
      if (chegouNaRua[i] === null && f.etapa === 'livre') chegouNaRua[i] = q;
    });
  }

  assert.equal(Fantasmas.todosNaRua(estado), true, 'os quatro estao no labirinto');
  chegouNaRua.forEach((q, i) => {
    assert.ok(q !== null, `o fantasma ${i} saiu`);
  });
  for (let i = 1; i < 4; i++) {
    assert.ok(chegouNaRua[i] > chegouNaRua[i - 1],
      `o fantasma ${i} sai depois do ${i - 1} (${chegouNaRua})`);
  }

  // Ninguem sai antes da hora dele.
  chegouNaRua.forEach((q, i) => {
    assert.ok(q >= mundo.SAIDAS[i], `o fantasma ${i} esperou os ${mundo.SAIDAS[i]} quadros`);
  });
});

teste('quem espera balanca no lugar, sem trocar de quadrado', () => {
  let estado = Fantasmas.novoEstado(mapa);
  const rosa = estado.lista[1];
  const quadrado = onde(rosa.corpo);
  const alturas = new Set();

  for (let q = 0; q < 60; q++) {
    estado = Fantasmas.passo(estado, mapa, null);
    const f = estado.lista[1];
    assert.equal(f.etapa, 'casa', 'ainda nao e a vez dele');
    assert.equal(f.corpo.x, rosa.corpo.x, 'o balanco e so de cima para baixo');
    igual(onde(f.corpo), quadrado, 'e ele nao sai do quadrado');
    alturas.add(f.corpo.y);
  }
  assert.ok(alturas.size > 4, `o balanco mexe de verdade (${alturas.size} alturas)`);
  assert.equal(Math.max(...alturas) - Math.min(...alturas), 8, '4px para cada lado');
});

teste('a porta e atravessada so na saida, e nunca de volta', () => {
  let estado = Fantasmas.novoEstado(mapa);
  const alvo = { c: 1, l: 1 };
  const portas = new Set(mapa.portas.map((p) => `${p.c},${p.l}`));

  for (let q = 0; q < 3000; q++) {
    estado = Fantasmas.passo(estado, mapa, alvo);
    estado.lista.forEach((f) => {
      const q0 = onde(f.corpo);
      if (!portas.has(`${q0.c},${q0.l}`)) return;
      assert.equal(f.etapa, 'saindo',
        `so quem esta saindo pisa na porta (${f.nome} estava '${f.etapa}')`);
    });
  }
  assert.equal(Fantasmas.todosNaRua(estado), true);
});

// ------------------------------------------------ Andando sem atravessar ---
teste('nenhum fantasma solto entra numa parede', () => {
  let estado = Fantasmas.novoEstado(mapa);
  // Um alvo que passeia pelos quatro cantos: assim eles varrem o labirinto.
  const cantos = [{ c: 1, l: 1 }, { c: 26, l: 1 }, { c: 26, l: 29 }, { c: 1, l: 29 }];
  let livresVistos = 0;

  for (let q = 0; q < 6000; q++) {
    estado = Fantasmas.passo(estado, mapa, cantos[Math.floor(q / 250) % 4]);
    estado.lista.forEach((f) => {
      const { c, l } = onde(f.corpo);
      // Alinhado no meio do corredor, sempre - em x ou em y.
      assert.ok(f.corpo.x % TILE === TILE / 2 || f.corpo.y % TILE === TILE / 2,
        `${f.nome} desalinhou em (${f.corpo.x}, ${f.corpo.y})`);
      if (f.etapa !== 'livre') return;
      livresVistos++;
      assert.equal(Mapa.parede(mapa, c, l), false,
        `${f.nome} entrou na parede (${c}, ${l}) no quadro ${q}`);
      assert.equal(f.corpo.parado, false, `${f.nome} travou em (${c}, ${l})`);
    });
  }
  assert.ok(livresVistos > 20000, 'eles andaram de verdade');
});

teste('solto no labirinto, o fantasma nunca da meia-volta', () => {
  let estado = Fantasmas.novoEstado(mapa);
  const alvo = { c: 13, l: 23 };
  const antes = estado.lista.map((f) => (f.etapa === 'livre' ? f.corpo.dir : null));
  let esquinas = 0;

  for (let q = 0; q < 4000; q++) {
    estado = Fantasmas.passo(estado, mapa, alvo);
    estado.lista.forEach((f, i) => {
      if (f.etapa !== 'livre') { antes[i] = null; return; }
      if (antes[i] && f.corpo.dir !== antes[i]) {
        esquinas++;
        assert.notEqual(f.corpo.dir, Movimento.oposta(antes[i]),
          `${f.nome} deu meia-volta no quadro ${q}`);
      }
      antes[i] = f.corpo.dir;
    });
  }
  assert.ok(esquinas > 50, `eles viraram esquinas de verdade (${esquinas})`);
});

// -------------------------------------------------- A escolha da esquina ---
/* O cruzamento (6, 8) do labirinto 1 tem tres saidas - cima, baixo e esquerda
   - e por isso e um bom banco de provas para a regra da escolha. */
teste('o cruzamento de prova tem mesmo tres saidas', () => {
  igual(Mapa.saidas(mapa, 6, 8).sort(), ['baixo', 'cima', 'esquerda']);
});

teste('na encruzilhada ele pega a saida que mais aproxima do alvo', () => {
  // Descendo pelo corredor (veio de cima): sobram esquerda e baixo.
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'baixo', { c: 1, l: 29 }), 'baixo',
    'o alvo esta la embaixo');
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'baixo', { c: 1, l: 8 }), 'esquerda',
    'o alvo esta a esquerda');

  // Subindo pelo corredor (veio de baixo): sobram esquerda e cima.
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'cima', { c: 6, l: 1 }), 'cima');
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'cima', { c: 1, l: 8 }), 'esquerda');
});

teste('empate resolve na ordem do fliperama: cima, esquerda, baixo, direita', () => {
  // (7, 7) fica exatamente a mesma distancia de (5, 8) e de (6, 9).
  assert.equal(Fantasmas.distancia(5, 8, 7, 7), Fantasmas.distancia(6, 9, 7, 7));
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'baixo', { c: 7, l: 7 }), 'esquerda',
    'entre esquerda e baixo empatados, vence a esquerda');

  igual(Fantasmas.PREFERENCIA, ['cima', 'esquerda', 'baixo', 'direita']);
});

teste('a meia-volta esta fora da lista, mesmo quando seria o melhor caminho', () => {
  // Subindo, com o alvo bem embaixo: descer seria o certo, mas e proibido.
  const escolha = Fantasmas.escolher(mapa, 6, 8, 'cima', { c: 6, l: 26 });
  assert.notEqual(escolha, 'baixo', 'nada de dar meia-volta');
  assert.equal(escolha, 'esquerda', 'entre cima e esquerda, esquerda aproxima mais');
});

teste('sem alvo nenhum, a ordem de preferencia decide sozinha', () => {
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'baixo', null), 'esquerda');
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'direita', null), 'cima');
});

teste('num beco sem saida so resta a meia-volta', () => {
  const beco = Mapa.ler(['#####', '#...#', '###.#', '#####']);
  // (1, 1) so tem uma saida: a direita. Chegando por ela, e por ela que se sai.
  igual(Mapa.saidas(beco, 1, 1), ['direita']);
  assert.equal(Fantasmas.escolher(beco, 1, 1, 'esquerda', { c: 3, l: 2 }), 'direita');
});

teste('no corredor comprido nao ha escolha nenhuma a fazer', () => {
  // (5, 8) e corredor: so esquerda e direita. Vindo da direita, so da para
  // seguir - o alvo do outro lado nao muda nada.
  igual(Mapa.saidas(mapa, 5, 8).sort(), ['direita', 'esquerda']);
  assert.equal(Fantasmas.escolher(mapa, 5, 8, 'esquerda', { c: 26, l: 8 }), 'esquerda');
});

// ----------------------------------------------------------- O tunel -------
teste('a boca do tunel so deixa seguir em frente', () => {
  assert.equal(Fantasmas.escolher(mapa, 0, 14, 'esquerda', { c: 13, l: 23 }), 'esquerda',
    'o alvo esta longe, do outro lado - e nao adianta, nao ha para onde virar');
});

teste('o fantasma atravessa o tunel e sai do outro lado', () => {
  let f = solto(0, 14, 'esquerda');
  assert.equal(f.corpo.x, 8);

  // 8 -> 6 -> 4 -> 2 -> 0 -> deu a volta.
  for (let q = 0; q < 5; q++) f = Fantasmas.passoDeUm(f, mapa, null, mundo.VEL_FANTASMA);
  assert.equal(f.corpo.x, mapa.largura - 2, 'entrou pela outra ponta');
  assert.equal(f.corpo.dir, 'esquerda', 'sem parar de andar');
  assert.equal(Mapa.coluna(f.corpo.x), mapa.colunas - 1);

  // E continua ate o centro do ultimo quadrado, onde volta a decidir.
  for (let q = 0; q < 3; q++) f = Fantasmas.passoDeUm(f, mapa, null, mundo.VEL_FANTASMA);
  assert.equal(f.corpo.x, Mapa.centro(mapa.colunas - 1, 14).x);
  assert.equal(Movimento.noCentro(f.corpo), true);
});

// ----------------------------------------------------------- O alvo -------
teste('da para dar um alvo para cada fantasma, ou um so para todos', () => {
  const estado = Fantasmas.novoEstado(mapa);

  // Um alvo por fantasma.
  const cada = Fantasmas.passo(estado, mapa, [
    { c: 1, l: 1 }, { c: 26, l: 1 }, { c: 1, l: 29 }, { c: 26, l: 29 }
  ]);
  assert.equal(cada.lista.length, 4);

  // O mesmo alvo para os quatro.
  const todos = Fantasmas.passo(estado, mapa, { c: 1, l: 1 });
  assert.equal(todos.lista[0].corpo.dir, cada.lista[0].corpo.dir,
    'o primeiro recebeu o mesmo alvo dos dois jeitos');
});

teste('a distancia e a comparavel: quanto menor, mais perto', () => {
  assert.equal(Fantasmas.distancia(3, 4, 3, 4), 0);
  assert.equal(Fantasmas.distancia(0, 0, 3, 4), 25);
  assert.ok(Fantasmas.distancia(1, 1, 5, 5) > Fantasmas.distancia(2, 2, 5, 5));
});

// ----------------------------------------------------------- Pureza -------
teste('passo() e funcao pura: nao mexe no estado que recebeu', () => {
  const antes = Fantasmas.novoEstado(mapa);
  const copia = JSON.parse(JSON.stringify(antes));
  const depois = Fantasmas.passo(antes, mapa, { c: 1, l: 1 });

  assert.equal(JSON.stringify(antes), JSON.stringify(copia), 'o de antes ficou intacto');
  assert.notEqual(depois, antes, 'devolveu um estado novo');
  assert.notEqual(depois.lista[0], antes.lista[0]);
  assert.equal(depois.relogio, antes.relogio + 1);
});

teste('mesmo estado + mesmo alvo = mesmo resultado', () => {
  let a = Fantasmas.novoEstado(mapa);
  let b = Fantasmas.novoEstado(mapa);
  const alvo = { c: 13, l: 23 };
  for (let q = 0; q < 500; q++) {
    a = Fantasmas.passo(a, mapa, alvo);
    b = Fantasmas.passo(b, mapa, alvo);
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b),
    'nada de sorteio escondido - o mesmo filme, duas vezes');
});

await fim('Fase 3a');
