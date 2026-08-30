/* ==========================================================================
   Come-Come - Fase 3b: as personalidades e os ciclos dispersar/cacar
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase3b.test.mjs

   A fase 3a deu aos quatro fantasmas um corpo que anda em grade atras de um
   alvo. Aqui se testa quem DIZ qual e esse alvo, nos modulos puros:

     - `Personalidades`: o alvo de cada um dos quatro, em caca e em dispersao
     - `Sorteio`: o sorteador de semente, que precisa dar igual duas vezes
       (numa sala, os cinco aparelhos tiram a mesma sequencia)
     - `Ciclos`: a tabela dispersar <-> cacar, trocando nos tempos certos
     - `Fantasmas.inverter`: a meia-volta de todos na troca de ciclo
     - e os quatro juntos, por ciclos inteiros, sem entrar em parede nenhuma
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Mapa, Movimento, Fantasmas, Sorteio, Ciclos, Personalidades, mapas, mundo } =
  carregarJogo('come_come');
const mapa = mapas[0];

/* Os objetos nascem dentro do `vm`, e por isso os prototipos deles nao sao os
   deste arquivo: comparar o texto evita que o `deepEqual` estrito reclame de
   coisas iguaizinhas. */
const igual = (a, b, oque) => assert.equal(JSON.stringify(a), JSON.stringify(b), oque);

/** O quadrado (coluna, linha) em que um corpo esta. */
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

/** Um fantasma montado a mao, solto no labirinto - para testar uma cena so. */
function solto(chave, c, l, dir) {
  return {
    indice: 0, chave, nome: chave, cor: '#fff',
    etapa: 'livre', espera: 0,
    casaY: Mapa.centro(c, l).y,
    corpo: Movimento.novoCorpo(c, l, dir)
  };
}

console.log('Come-Come - fase 3b\n');

// ------------------------------------------------- Os cantos da dispersao --
teste('cada personalidade tem o seu canto, um por quadrante', () => {
  const cantos = Fantasmas.TIPOS.map((t) => Personalidades.cantoDe(mapa, t.chave));

  igual(cantos[0], { c: 26, l: 0 }, 'o vermelho vai para cima, a direita');
  igual(cantos[1], { c: 1, l: 0 }, 'o rosa para cima, a esquerda');
  igual(cantos[2], { c: 27, l: 30 }, 'o azul para baixo, a direita');
  igual(cantos[3], { c: 0, l: 30 }, 'o laranja para baixo, a esquerda');

  const lugares = new Set(cantos.map((p) => `${p.c},${p.l}`));
  assert.equal(lugares.size, 4, 'quatro cantos diferentes');
});

teste('os cantos ficam na beirada do desenho, onde ninguem chega', () => {
  Fantasmas.TIPOS.forEach((t) => {
    const canto = Personalidades.cantoDe(mapa, t.chave);
    assert.equal(Mapa.livre(mapa, canto.c, canto.l), false,
      `o canto do ${t.nome} nao e chao - e por isso ele fica dando voltas por la`);
  });
});

teste('num labirinto de outro tamanho, os cantos acompanham', () => {
  const pequeno = Mapa.ler(['##########', '#........#', '##########']);
  igual(Personalidades.cantoDe(pequeno, 'perseguidor'), { c: 8, l: 0 });
  igual(Personalidades.cantoDe(pequeno, 'timido'), { c: 9, l: 2 });
});

// ------------------------------------------------------ O alvo de cada um --
teste('na dispersao, cada um mira o proprio canto e esquece o come-come', () => {
  const come = { c: 13, l: 23, dir: 'esquerda' };
  Fantasmas.TIPOS.forEach((t) => {
    const alvo = Personalidades.alvoDe(t.chave, {
      mapa, modo: 'dispersar', come,
      fantasma: { c: 13, l: 22 },              // colado no come-come, e nem assim
      sorteado: { c: 1, l: 1 }
    });
    igual(alvo, Personalidades.cantoDe(mapa, t.chave), `o alvo do ${t.nome}`);
  });
});

teste('o perseguidor mira o quadrado em que o come-come esta', () => {
  const alvo = Personalidades.alvoDe('perseguidor', {
    mapa, modo: 'cacar', come: { c: 13, l: 23, dir: 'cima' },
    fantasma: { c: 1, l: 1 }
  });
  igual(alvo, { c: 13, l: 23 }, 'a casa do come-come, sem mais nada');
});

teste('o emboscador mira quatro casas a frente, na direcao do come-come', () => {
  const daqui = (dir) => Personalidades.alvoDe('emboscador', {
    mapa, modo: 'cacar', come: { c: 13, l: 23, dir }, fantasma: { c: 1, l: 1 }
  });

  assert.equal(mundo.PASSOS_A_FRENTE, 4);
  igual(daqui('esquerda'), { c: 9, l: 23 });
  igual(daqui('direita'), { c: 17, l: 23 });
  igual(daqui('cima'), { c: 13, l: 19 });
  igual(daqui('baixo'), { c: 13, l: 27 });
});

teste('o alvo do emboscador pode cair fora do labirinto, e tudo bem', () => {
  // Perto da borda, quatro casas a frente e parede - so o que importa e a
  // DISTANCIA ate ali, e ela existe para qualquer par de numeros.
  const alvo = Personalidades.alvoDe('emboscador', {
    mapa, modo: 'cacar', come: { c: 1, l: 1, dir: 'cima' }
  });
  igual(alvo, { c: 1, l: -3 });
  assert.equal(Fantasmas.escolher(mapa, 1, 5, 'cima', alvo), 'cima',
    'e o fantasma continua sabendo para onde ir');
});

teste('o timido caca de longe e se acanha de perto', () => {
  const come = { c: 13, l: 23, dir: 'esquerda' };
  const alvoCom = (c, l) => Personalidades.alvoDe('timido', {
    mapa, modo: 'cacar', come, fantasma: { c, l }
  });

  assert.equal(mundo.DISTANCIA_TIMIDO, 8, 'o limite e de oito quadrados');

  // Nove quadrados a esquerda: longe, entao ele caca junto com os outros.
  igual(alvoCom(4, 23), { c: 13, l: 23 }, 'de longe ele vem');

  // Sete quadrados: perto demais para a coragem dele.
  igual(alvoCom(6, 23), Personalidades.cantoDe(mapa, 'timido'), 'de perto ele foge');

  // Exatamente oito ainda e "perto" - so passa a cacar acima disso.
  igual(alvoCom(5, 23), Personalidades.cantoDe(mapa, 'timido'), 'no limite, foge');
});

teste('o aleatorio vai aonde o sorteio mandou', () => {
  const alvo = Personalidades.alvoDe('aleatorio', {
    mapa, modo: 'cacar', come: { c: 13, l: 23, dir: 'cima' },
    sorteado: { c: 26, l: 5 }
  });
  igual(alvo, { c: 26, l: 5 });
});

// -------------------------------------------------------------- O sorteio --
teste('a mesma semente da a mesma sequencia, duas vezes', () => {
  const sequencia = (semente) => {
    let s = Sorteio.semear(semente);
    const saida = [];
    for (let i = 0; i < 20; i++) { s = Sorteio.proximo(s); saida.push(s); }
    return saida;
  };
  igual(sequencia(1042942333), sequencia(1042942333), 'o mesmo filme');
  assert.notEqual(sequencia(1042942333).join(), sequencia(7).join(),
    'sementes diferentes, caminhos diferentes');
});

teste('o sorteio devolve inteiros dentro da faixa pedida', () => {
  let s = Sorteio.semear(mundo.SEMENTE_PADRAO);
  const vistos = new Set();
  for (let i = 0; i < 500; i++) {
    s = Sorteio.proximo(s);
    const n = Sorteio.ate(s, 10);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 10, `sorteou ${n}`);
    vistos.add(n);
    assert.ok(Sorteio.valor(s) >= 0 && Sorteio.valor(s) < 1);
  }
  assert.ok(vistos.size >= 8, `varre a faixa toda (${vistos.size} valores de 10)`);
});

teste('semente estranha nao quebra o sorteio', () => {
  [0, -5, undefined, null, NaN, 2 ** 40].forEach((estranha) => {
    const s = Sorteio.semear(estranha);
    assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 32, `semear(${estranha}) = ${s}`);
    assert.ok(Number.isInteger(Sorteio.proximo(s)));
    assert.equal(Sorteio.ate(s, 0), 0, 'lista vazia nao explode');
  });
});

teste('avancar e a mesma coisa que chamar proximo n vezes', () => {
  let s = Sorteio.semear(99);
  for (let i = 0; i < 7; i++) s = Sorteio.proximo(s);
  assert.equal(Sorteio.avancar(99, 7), s);
});

// ------------------------------------------- O sorteio dentro do jogo ------
teste('o chao do labirinto e a lista de onde o laranja pode ser mandado', () => {
  assert.ok(mapa.chao.length > 200, `o labirinto 1 tem ${mapa.chao.length} quadrados de chao`);
  mapa.chao.forEach((p) => {
    assert.equal(Mapa.livre(mapa, p.c, p.l), true, `(${p.c}, ${p.l}) e chao`);
    const dentroDaCasa = p.c >= mapa.casa.c0 && p.c <= mapa.casa.c1
                      && p.l >= mapa.casa.l0 && p.l <= mapa.casa.l1;
    assert.equal(dentroDaCasa, false, `(${p.c}, ${p.l}) nao e o miolo da casa`);
  });
});

teste('o alvo do laranja troca de meio em meio segundo, e nao a cada quadro', () => {
  assert.equal(mundo.TROCA_SORTEIO, 30);

  let estado = Personalidades.novoEstado(12345);
  const alvos = [];
  for (let q = 0; q < 90; q++) {
    estado = Personalidades.sortear(estado, mapa);
    alvos.push(`${estado.sorteado.c},${estado.sorteado.l}`);
  }
  const trocas = alvos.filter((a, i) => i > 0 && a !== alvos[i - 1]).length;
  assert.equal(trocas, 2, `90 quadros = 3 sorteios (${trocas} trocas)`);
  assert.equal(new Set(alvos).size, 3, 'tres lugares diferentes');
});

teste('o lugar sorteado e sempre chao de verdade', () => {
  let estado = Personalidades.novoEstado(mundo.SEMENTE_PADRAO);
  const vistos = new Set();
  for (let q = 0; q < 3000; q++) {
    estado = Personalidades.sortear(estado, mapa);
    const p = estado.sorteado;
    assert.equal(Mapa.livre(mapa, p.c, p.l), true, `sorteou a parede (${p.c}, ${p.l})`);
    vistos.add(`${p.c},${p.l}`);
  }
  assert.ok(vistos.size > 30, `ele passeia pelo labirinto todo (${vistos.size} lugares)`);
});

teste('a mesma semente da os mesmos alvos duas vezes (e outra semente, outros)', () => {
  const corrida = (semente) => {
    let miras = Personalidades.novoEstado(semente);
    const fantasmas = Fantasmas.novoEstado(mapa);
    const saida = [];
    for (let q = 0; q < 300; q++) {
      const passo = Personalidades.passo(miras, fantasmas, mapa, {
        modo: 'cacar', come: { c: 13, l: 23, dir: 'esquerda' }
      });
      miras = passo.estado;
      saida.push(JSON.stringify(passo.alvos));
    }
    return saida;
  };

  const a = corrida(777), b = corrida(777), c = corrida(778);
  assert.equal(a.join('|'), b.join('|'), 'igualzinho nos dois aparelhos');
  assert.notEqual(a.join('|'), c.join('|'), 'outra semente, outro laranja');

  // E so o laranja muda: os outros tres nao sorteiam nada.
  const primeiroA = JSON.parse(a[0]), primeiroC = JSON.parse(c[0]);
  igual(primeiroA.slice(0, 3), primeiroC.slice(0, 3), 'os tres primeiros sao os mesmos');
});

teste('passo() devolve um alvo por fantasma, na ordem da lista', () => {
  const fantasmas = Fantasmas.novoEstado(mapa);
  const passo = Personalidades.passo(Personalidades.novoEstado(1), fantasmas, mapa, {
    modo: 'dispersar', come: { c: 13, l: 23, dir: 'esquerda' }
  });
  assert.equal(passo.alvos.length, 4);
  passo.alvos.forEach((alvo, i) => {
    igual(alvo, Personalidades.cantoDe(mapa, fantasmas.lista[i].chave),
      `o alvo do fantasma ${i}`);
  });
});

teste('Personalidades.passo() e puro: nao mexe no estado que recebeu', () => {
  const antes = Personalidades.novoEstado(42);
  const copia = JSON.parse(JSON.stringify(antes));
  const fantasmas = Fantasmas.novoEstado(mapa);
  const depois = Personalidades.passo(antes, fantasmas, mapa, {
    modo: 'cacar', come: { c: 13, l: 23, dir: 'cima' }
  });
  assert.equal(JSON.stringify(antes), JSON.stringify(copia), 'o de antes ficou intacto');
  assert.notEqual(depois.estado, antes);
});

// -------------------------------------------------------------- Os ciclos --
teste('a tabela alterna dispersar e cacar, e acaba em caca para sempre', () => {
  const tabela = Ciclos.TABELA;
  assert.equal(tabela[0].modo, 'dispersar', 'a partida abre com um respiro');
  tabela.forEach((linha, i) => {
    if (i === 0) return;
    assert.notEqual(linha.modo, tabela[i - 1].modo, `a linha ${i} alterna`);
  });
  assert.equal(tabela[tabela.length - 1].modo, 'cacar');
  assert.equal(tabela[tabela.length - 1].quadros, -1, 'a ultima nao acaba nunca');

  // Cada dispersao e mais curta ou igual a anterior: o jogo aperta.
  const respiros = tabela.filter((l) => l.modo === 'dispersar').map((l) => l.quadros);
  igual(respiros, [420, 420, 300, 300]);
});

teste('o ciclo troca nos tempos certos da tabela', () => {
  const tabela = Ciclos.TABELA;
  const trocas = [];
  let estado = Ciclos.novoEstado();
  assert.equal(estado.modo, 'dispersar');

  for (let q = 1; q <= 8000; q++) {
    estado = Ciclos.passo(estado);
    if (estado.trocou) trocas.push({ quadro: q, modo: estado.modo });
  }

  // Os tempos esperados sao a soma da tabela, linha a linha.
  const esperados = [];
  let soma = 0;
  for (let i = 0; i + 1 < tabela.length; i++) {
    soma += tabela[i].quadros;
    esperados.push({ quadro: soma, modo: tabela[i + 1].modo });
  }
  igual(trocas, esperados, 'as trocas caem exatamente nos quadros da tabela');
  assert.equal(trocas.length, 7, 'sete trocas, e depois e caca ate o fim');
});

teste('depois da ultima linha nao ha mais troca nenhuma', () => {
  let estado = Ciclos.novoEstado();
  for (let q = 0; q < 6000; q++) estado = Ciclos.passo(estado);
  assert.equal(estado.modo, 'cacar');
  assert.equal(estado.etapa, Ciclos.TABELA.length - 1);
  assert.equal(Ciclos.faltam(estado), -1, 'nao falta nada: nao troca mais');

  for (let q = 0; q < 20000; q++) {
    estado = Ciclos.passo(estado);
    assert.equal(estado.trocou, false, `trocou no quadro ${q} depois do fim da tabela`);
    assert.equal(estado.modo, 'cacar');
  }
});

teste('faltam() conta o que falta para a proxima troca', () => {
  let estado = Ciclos.novoEstado();
  assert.equal(Ciclos.faltam(estado), 420);
  for (let q = 0; q < 100; q++) estado = Ciclos.passo(estado);
  assert.equal(Ciclos.faltam(estado), 320);
});

teste('da para trocar a tabela (a dificuldade da fase 6a vai fazer isso)', () => {
  const curta = [
    { modo: 'dispersar', quadros: 10 },
    { modo: 'cacar', quadros: 20 },
    { modo: 'dispersar', quadros: -1 }
  ];
  let estado = Ciclos.novoEstado({ tabela: curta });
  const trocas = [];
  for (let q = 1; q <= 100; q++) {
    estado = Ciclos.passo(estado, { tabela: curta });
    if (estado.trocou) trocas.push(q + ':' + estado.modo);
  }
  igual(trocas, ['10:cacar', '30:dispersar']);
});

teste('Ciclos.passo() e puro: nao mexe no estado que recebeu', () => {
  const antes = Ciclos.novoEstado();
  const copia = JSON.parse(JSON.stringify(antes));
  const depois = Ciclos.passo(antes);
  assert.equal(JSON.stringify(antes), JSON.stringify(copia));
  assert.notEqual(depois, antes);
  assert.equal(depois.relogio, antes.relogio + 1);
});

// ----------------------------------------------------------- A meia-volta --
teste('a troca de ciclo inverte a direcao de todos os que estao na rua', () => {
  const estado = {
    lista: [
      solto('perseguidor', 6, 8, 'baixo'),
      solto('emboscador', 13, 11, 'esquerda'),
      solto('timido', 6, 5, 'cima'),
      solto('aleatorio', 21, 8, 'direita')
    ],
    relogio: 10
  };
  const virado = Fantasmas.inverter(estado);

  igual(virado.lista.map((f) => f.corpo.dir), ['cima', 'direita', 'baixo', 'esquerda']);
  virado.lista.forEach((f, i) => {
    assert.equal(f.corpo.desejada, f.corpo.dir,
      'a desejada acompanha, senao o corpo viraria de volta no proximo quadro');
    assert.equal(f.corpo.dir, Movimento.oposta(estado.lista[i].corpo.dir));
    igual(onde(f.corpo), onde(estado.lista[i].corpo), 'sem sair do lugar');
  });
  assert.equal(virado.relogio, 10, 'o relogio dos fantasmas nao mexe');
});

teste('quem ainda esta na casa ou subindo a porta nao da meia-volta', () => {
  let estado = Fantasmas.novoEstado(mapa);
  for (let q = 0; q < 130; q++) estado = Fantasmas.passo(estado, mapa, { c: 1, l: 1 });

  const etapas = estado.lista.map((f) => f.etapa);
  assert.ok(etapas.indexOf('casa') >= 0, 'ainda ha gente esperando');
  assert.ok(etapas.indexOf('livre') >= 0, 'e gente na rua');

  const virado = Fantasmas.inverter(estado);
  estado.lista.forEach((f, i) => {
    if (f.etapa === 'livre') {
      assert.equal(virado.lista[i].corpo.dir, Movimento.oposta(f.corpo.dir));
    } else {
      assert.equal(virado.lista[i], f, `${f.nome} ficou como estava`);
    }
  });
});

teste('depois da meia-volta ele anda mesmo para o outro lado', () => {
  const embaixo = { c: 6, l: 26 };
  let f = solto('perseguidor', 6, 5, 'baixo');
  for (let q = 0; q < 3; q++) f = Fantasmas.passoDeUm(f, mapa, embaixo, mundo.VEL_FANTASMA);
  const desceu = f.corpo.y;
  assert.equal(desceu, Mapa.centro(6, 5).y + 6, 'desceu meio quadrado');

  // O alvo continua la embaixo - e nem assim ele desce: a meia-volta manda.
  const virado = Fantasmas.inverter({ lista: [f], relogio: 0 }).lista[0];
  let volta = virado;
  for (let q = 0; q < 3; q++) volta = Fantasmas.passoDeUm(volta, mapa, embaixo, mundo.VEL_FANTASMA);

  assert.ok(volta.corpo.y < desceu, `subiu de volta (${desceu} -> ${volta.corpo.y})`);
  assert.equal(volta.corpo.y, Mapa.centro(6, 5).y, 'voltou ao centro de onde saiu');
});

teste('inverter() e puro: nao mexe no estado que recebeu', () => {
  const antes = { lista: [solto('perseguidor', 6, 8, 'baixo')], relogio: 0 };
  const copia = JSON.parse(JSON.stringify(antes));
  Fantasmas.inverter(antes);
  assert.equal(JSON.stringify(antes), JSON.stringify(copia));
});

// -------------------------------------------------- Os tres modulos juntos --
teste('por ciclos inteiros, ninguem entra em parede nem trava', () => {
  let fantasmas = Fantasmas.novoEstado(mapa);
  let ciclo = Ciclos.novoEstado();
  let miras = Personalidades.novoEstado(mundo.SEMENTE_PADRAO);
  const come = { c: 13, l: 23, dir: 'esquerda' };
  const modosVistos = new Set();
  let meiasVoltas = 0;

  for (let q = 0; q < 4000; q++) {
    ciclo = Ciclos.passo(ciclo);
    if (ciclo.trocou) { fantasmas = Fantasmas.inverter(fantasmas); meiasVoltas++; }
    modosVistos.add(ciclo.modo);

    const mira = Personalidades.passo(miras, fantasmas, mapa, { modo: ciclo.modo, come });
    miras = mira.estado;
    fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos);

    fantasmas.lista.forEach((f) => {
      if (f.etapa !== 'livre') return;
      const p = onde(f.corpo);
      assert.equal(Mapa.parede(mapa, p.c, p.l), false,
        `${f.nome} entrou na parede (${p.c}, ${p.l}) no quadro ${q}`);
      assert.equal(f.corpo.parado, false, `${f.nome} travou no quadro ${q}`);
    });
  }

  igual([...modosVistos].sort(), ['cacar', 'dispersar'], 'os dois humores aconteceram');
  assert.ok(meiasVoltas >= 4, `houve meia-volta de verdade (${meiasVoltas})`);
});

teste('na dispersao cada um vai para o SEU canto, e nao para o dos outros', () => {
  let fantasmas = Fantasmas.novoEstado(mapa);
  let miras = Personalidades.novoEstado(mundo.SEMENTE_PADRAO);
  const come = { c: 13, l: 23, dir: 'esquerda' };

  // Primeiro solta os quatro na rua (cacando), depois manda dispersar.
  for (let q = 0; q < 600; q++) {
    const mira = Personalidades.passo(miras, fantasmas, mapa, { modo: 'cacar', come });
    miras = mira.estado;
    fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos);
  }
  assert.equal(Fantasmas.todosNaRua(fantasmas), true);

  for (let q = 0; q < 500; q++) {
    const mira = Personalidades.passo(miras, fantasmas, mapa, { modo: 'dispersar', come });
    miras = mira.estado;
    fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos);
  }

  fantasmas.lista.forEach((f) => {
    const p = onde(f.corpo);
    const meu = Personalidades.cantoDe(mapa, f.chave);
    const minha = Fantasmas.distancia(p.c, p.l, meu.c, meu.l);
    Fantasmas.TIPOS.forEach((t) => {
      if (t.chave === f.chave) return;
      const outro = Personalidades.cantoDe(mapa, t.chave);
      assert.ok(minha < Fantasmas.distancia(p.c, p.l, outro.c, outro.l),
        `${f.nome} parou em (${p.c}, ${p.l}), mais perto do canto do ${t.nome}`);
    });
  });
});

teste('na caca eles convergem para o come-come parado', () => {
  let fantasmas = Fantasmas.novoEstado(mapa);
  let miras = Personalidades.novoEstado(mundo.SEMENTE_PADRAO);
  const come = { c: 13, l: 23, dir: 'esquerda' };
  const menor = [Infinity, Infinity, Infinity, Infinity];

  for (let q = 0; q < 1200; q++) {
    const mira = Personalidades.passo(miras, fantasmas, mapa, { modo: 'cacar', come });
    miras = mira.estado;
    fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos);
    fantasmas.lista.forEach((f, i) => {
      if (f.etapa !== 'livre') return;
      const p = onde(f.corpo);
      menor[i] = Math.min(menor[i], Fantasmas.distancia(p.c, p.l, come.c, come.l));
    });
  }

  assert.equal(menor[0], 0, 'o vermelho chega em cima dele');
  // O rosa mira quatro casas A FRENTE: com o come-come parado ele ronda a
  // esquina de la em vez de cair em cima - que e justamente a emboscada.
  assert.ok(menor[1] <= 16, `o rosa emboscou (${menor[1]})`);
  // O azul se acanha a oito quadrados, e o laranja vai aonde o sorteio manda:
  // dos dois se espera chegar perto, nao encostar.
  assert.ok(menor[2] <= 81, `o azul chegou perto (${menor[2]})`);
  assert.ok(menor[3] <= 100, `o laranja passou por perto (${menor[3]})`);
});

teste('a corrida inteira e reprodutivel: mesma semente, mesmo filme', () => {
  const corrida = () => {
    let fantasmas = Fantasmas.novoEstado(mapa);
    let ciclo = Ciclos.novoEstado();
    let miras = Personalidades.novoEstado(mundo.SEMENTE_PADRAO);
    const come = { c: 13, l: 23, dir: 'esquerda' };
    for (let q = 0; q < 1500; q++) {
      ciclo = Ciclos.passo(ciclo);
      if (ciclo.trocou) fantasmas = Fantasmas.inverter(fantasmas);
      const mira = Personalidades.passo(miras, fantasmas, mapa, { modo: ciclo.modo, come });
      miras = mira.estado;
      fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos);
    }
    return JSON.stringify(fantasmas.lista.map((f) => f.corpo));
  };
  assert.equal(corrida(), corrida(), 'nada de sorteio escondido');
});

await fim('Fase 3b');
