/* ==========================================================================
   Come-Come - Fase 6a: os tres labirintos e a tabela de dificuldade
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase6a.test.mjs

   Sem DOM nenhum: aqui se confere o que a fase 6a do plano promete.

   1. OS TRES DESENHOS SAO VALIDOS. Nao basta parecerem um labirinto: cada um
      dos tres tem de ter 28 x 31 quadrados, a borda fechada (menos as duas
      bocas do tunel), um nascimento, quatro pastilhas de poder e a casa dos
      fantasmas com a porta virada para a rua. E, principalmente:

        - TODA pastilha e alcancavel a pe a partir do nascimento;
        - nenhuma celula solta - todo chao fora da casa esta ligado ao resto;
        - nenhum beco sem saida (o `Fantasmas.escolher` conta com isso: e a
          regra "descarte a meia-volta" que faz os quatro patrulharem);
        - o miolo da casa NAO vaza para a rua (senao a porta nao seria porta).

      A conferencia e uma busca em largura a partir do `P`, com o tunel e
      tudo - a mesma que o jogo usa para andar.

   2. A TABELA DE DIFICULDADE CRESCE FASE A FASE. O feitico encurta, a pressa
      dos fantasmas aumenta, eles saem da casa mais cedo e a tabela de ciclos
      troca respiro por caca. E a tabela CHEGA no labirinto: e ela que sai do
      `mapa.dificuldade` e vira o mundo que a crianca joga.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const {
  Mapa, Movimento, Fantasmas, Ciclos, Poder, Pastilhas,
  LABIRINTO_1, LABIRINTO_2, LABIRINTO_3, LABIRINTOS, DIFICULDADE, mapas, mundo
} = carregarJogo('come_come');

const DESENHOS = [LABIRINTO_1, LABIRINTO_2, LABIRINTO_3];
const chave = (c, l) => `${c},${l}`;
// As listas vem de dentro do `vm`: comparar por JSON evita a briga de
// prototipos que o `deepEqual` estrito compra.
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Todo quadrado alcancavel a pe a partir de (c, l), com o tunel valendo. */
function alcancaveis(mapa, inicio) {
  const vistos = new Set([chave(inicio.c, inicio.l)]);
  const fila = [inicio];
  for (let i = 0; i < fila.length; i++) {
    const aqui = fila[i];
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(mapa, aqui.c, aqui.l, dir)) continue;
      const v = Mapa.vizinho(mapa, aqui.c, aqui.l, dir);
      if (vistos.has(chave(v.c, v.l))) continue;
      vistos.add(chave(v.c, v.l));
      fila.push(v);
    }
  }
  return vistos;
}

/** Aquele quadrado e o miolo da casa dos fantasmas? */
function noMiolo(mapa, c, l) {
  const casa = mapa.casa;
  return casa && c >= casa.c0 && c <= casa.c1 && l >= casa.l0 && l <= casa.l1;
}

/** Quantas vezes uma letra aparece no desenho inteiro. */
function contar(desenho, letra) {
  return desenho.join('').split('').filter((ch) => ch === letra).length;
}

/** Quanto tempo a tabela de ciclos passa em cada humor (o -1 nao conta). */
function tempoNoHumor(tabela, modo) {
  return tabela
    .filter((linha) => linha.modo === modo && linha.quadros > 0)
    .reduce((total, linha) => total + linha.quadros, 0);
}

console.log('Come-Come - fase 6a\n');

// ------------------------------------------------------- Os tres desenhos --
teste('o jogo tem os tres labirintos do PRD, na ordem fixa', () => {
  assert.equal(DESENHOS.length, 3);
  assert.equal(LABIRINTOS.length, 3);
  assert.equal(mapas.length, 3);
  assert.equal(mundo.TOTAL_FASES, 3);

  LABIRINTOS.forEach((lab, i) => {
    assert.equal(lab.numero, i + 1, `o labirinto ${i + 1} sabe o numero dele`);
    assert.equal(typeof lab.nome, 'string');
    assert.ok(lab.nome.length > 0, `o labirinto ${i + 1} tem nome`);
    assert.equal(lab.desenho, DESENHOS[i]);
    assert.equal(lab.dificuldade, DIFICULDADE[i], 'e a linha da dificuldade dele');
  });

  // Tres desenhos diferentes, e nao o mesmo copiado tres vezes.
  const textos = DESENHOS.map((d) => d.join('\n'));
  assert.notEqual(textos[0], textos[1]);
  assert.notEqual(textos[1], textos[2]);
  assert.notEqual(textos[0], textos[2]);
});

teste('os tres tem 28 x 31 quadrados e so as letras da legenda', () => {
  const legenda = ['#', '.', 'o', 'P', '-', 'T', ' '];
  DESENHOS.forEach((desenho, i) => {
    assert.equal(desenho.length, 31, `o labirinto ${i + 1} tem 31 linhas`);
    desenho.forEach((linha, l) => {
      assert.equal(linha.length, 28, `a linha ${l} do labirinto ${i + 1}`);
      for (const ch of linha) {
        assert.ok(legenda.indexOf(ch) >= 0,
          `letra desconhecida "${ch}" no labirinto ${i + 1}, linha ${l}`);
      }
    });
  });
});

teste('a borda e fechada em todos, menos nas duas bocas do tunel', () => {
  mapas.forEach((mapa, i) => {
    for (let c = 0; c < mapa.colunas; c++) {
      assert.equal(Mapa.letra(mapa, c, 0), '#', `borda de cima do ${i + 1} em ${c}`);
      assert.equal(Mapa.letra(mapa, c, mapa.linhas - 1), '#',
        `borda de baixo do ${i + 1} em ${c}`);
    }
    for (let l = 0; l < mapa.linhas; l++) {
      const esquerda = Mapa.letra(mapa, 0, l);
      const direita = Mapa.letra(mapa, mapa.colunas - 1, l);
      assert.ok(esquerda === '#' || esquerda === 'T', `borda esquerda do ${i + 1} na linha ${l}`);
      assert.ok(direita === '#' || direita === 'T', `borda direita do ${i + 1} na linha ${l}`);
      assert.equal(esquerda === 'T', direita === 'T', 'tunel torto');
    }
  });
});

teste('cada um tem o SEU tunel lateral, e os tres em linhas diferentes', () => {
  const linhas = mapas.map((mapa, i) => {
    const doTunel = mapa.tuneis.map((tem, l) => (tem ? l : -1)).filter((l) => l >= 0);
    assert.equal(doTunel.length, 1, `o labirinto ${i + 1} tem uma linha de tunel so`);
    assert.equal(contar(DESENHOS[i], 'T'), 2, 'com uma boca em cada ponta');

    // Sair por uma ponta e entrar pela outra, sem parar de andar.
    const l = doTunel[0];
    const saindo = Mapa.vizinho(mapa, 0, l, 'esquerda');
    assert.equal(saindo.c, mapa.colunas - 1, 'quem sai pela esquerda entra pela direita');
    assert.equal(saindo.l, l);
    const voltando = Mapa.vizinho(mapa, mapa.colunas - 1, l, 'direita');
    assert.equal(voltando.c, 0, 'e vice-versa');
    return l;
  });
  assert.equal(new Set(linhas).size, 3, `os tres tuneis mudam de lugar (${linhas})`);
});

teste('cada um tem uma casa de fantasmas com a porta virada para a rua', () => {
  mapas.forEach((mapa, i) => {
    const casa = mapa.casa;
    assert.ok(casa, `o labirinto ${i + 1} tem casa`);
    assert.equal(casa.dentro.l, casa.porta.l + 1, 'o miolo fica logo abaixo da porta');
    assert.equal(casa.fora.l, casa.porta.l - 1, 'e a rua logo acima dela');
    assert.equal(Mapa.livre(mapa, casa.fora.c, casa.fora.l), true, 'a rua e chao');
    assert.equal(Mapa.livre(mapa, casa.porta.c, casa.porta.l), false,
      'a porta e parede para quem anda por fora');
    assert.ok(casa.c1 - casa.c0 >= 2, 'o miolo cabe os quatro');
    assert.equal(casa.lugares.length, 4, 'quatro lugares, um por fantasma');
    casa.lugares.forEach((lugar, q) => {
      const dentro = noMiolo(mapa, lugar.c, lugar.l);
      if (q === 0) assert.equal(dentro, false, 'o primeiro ja nasce na rua');
      else assert.equal(dentro, true, `o fantasma ${q} nasce dentro da casa`);
    });
  });
});

teste('cada um tem um nascimento (fora da casa) e quatro pastilhas de poder', () => {
  mapas.forEach((mapa, i) => {
    assert.equal(contar(DESENHOS[i], 'P'), 1, `um nascimento so no labirinto ${i + 1}`);
    assert.ok(mapa.nascimento, 'e o mapa achou');
    assert.equal(noMiolo(mapa, mapa.nascimento.c, mapa.nascimento.l), false,
      'o come-come nao nasce trancado na casa dos fantasmas');
    assert.equal(mapa.poderes.length, 4, `quatro bolotas no labirinto ${i + 1}`);
    assert.ok(mapa.totalPastilhas > 200, `e um labirinto cheio (${mapa.totalPastilhas})`);
  });
});

// ------------------------------------------------- Os desenhos sao inteiros -
teste('toda pastilha e alcancavel a pe a partir do nascimento', () => {
  mapas.forEach((mapa, i) => {
    const daPara = alcancaveis(mapa, mapa.nascimento);
    mapa.pastilhas.forEach((p, q) => {
      assert.ok(daPara.has(chave(p.c, p.l)),
        `a pastilha ${q} do labirinto ${i + 1} esta ilhada em (${p.c}, ${p.l})`);
    });
    assert.equal(Pastilhas.totalDoLabirinto(mapa) > 0, true);
  });
});

teste('nenhuma celula solta: todo chao fora da casa esta ligado ao resto', () => {
  mapas.forEach((mapa, i) => {
    const daPara = alcancaveis(mapa, mapa.nascimento);
    for (let l = 0; l < mapa.linhas; l++) {
      for (let c = 0; c < mapa.colunas; c++) {
        if (!Mapa.livre(mapa, c, l)) continue;
        if (noMiolo(mapa, c, l)) continue;
        assert.ok(daPara.has(chave(c, l)),
          `o labirinto ${i + 1} tem chao solto em (${c}, ${l})`);
      }
    }
  });
});

teste('nenhum beco sem saida: todo quadrado de rua tem pelo menos duas saidas', () => {
  mapas.forEach((mapa, i) => {
    for (let l = 0; l < mapa.linhas; l++) {
      for (let c = 0; c < mapa.colunas; c++) {
        if (!Mapa.livre(mapa, c, l)) continue;
        if (noMiolo(mapa, c, l)) continue;
        assert.ok(Mapa.saidas(mapa, c, l).length >= 2,
          `beco sem saida no labirinto ${i + 1}, em (${c}, ${l})`);
      }
    }
  });
});

teste('o miolo da casa nao vaza para a rua em nenhum dos tres', () => {
  mapas.forEach((mapa, i) => {
    const daPara = alcancaveis(mapa, mapa.nascimento);
    for (let l = mapa.casa.l0; l <= mapa.casa.l1; l++) {
      for (let c = mapa.casa.c0; c <= mapa.casa.c1; c++) {
        assert.equal(daPara.has(chave(c, l)), false,
          `a casa do labirinto ${i + 1} vaza em (${c}, ${l})`);
      }
    }
    // E o chao do jogo (de onde o laranja sorteia) fica sem o miolo da casa.
    mapa.chao.forEach((q) => {
      assert.equal(noMiolo(mapa, q.c, q.l), false, 'o sorteio nao cai dentro da casa');
    });
  });
});

// ----------------------------------------------- A tabela de dificuldade ---
teste('a tabela tem uma linha por fase, na ordem', () => {
  assert.equal(DIFICULDADE.length, 3);
  DIFICULDADE.forEach((linha, i) => {
    assert.equal(linha.fase, i + 1);
    assert.equal(linha.pressa.length, 4, 'uma pressa por fantasma');
    assert.equal(linha.saidas.length, 4, 'um tempo de saida por fantasma');
    assert.ok(linha.ciclos.length > 0, 'e a tabela de ciclos da fase');
  });
});

teste('o feitico encurta fase a fase', () => {
  const duracoes = DIFICULDADE.map((d) => d.poder);
  igual(duracoes, [8 * 60, 6 * 60, 4 * 60]);
  assert.ok(duracoes[1] < duracoes[0] && duracoes[2] < duracoes[1]);
});

teste('os fantasmas ficam mais rapidos fase a fase, sem nunca disparar', () => {
  const soma = DIFICULDADE.map((d) => d.pressa.reduce((a, b) => a + b, 0));
  assert.ok(soma[1] > soma[0], 'a fase 2 corre mais que a 1');
  assert.ok(soma[2] > soma[1], 'e a 3 mais que a 2');
  igual(DIFICULDADE[0].pressa, [0, 0, 0, 0], 'no labirinto 1 ninguem apressa');

  DIFICULDADE.forEach((d, i) => {
    d.pressa.forEach((p) => {
      assert.ok(p >= 0 && p * 2 <= mundo.COMPASSO_PRESSA,
        `a pressa da fase ${i + 1} nao passa de meio passo por quadro (${p})`);
    });
  });
});

teste('eles saem da casa cada vez mais cedo', () => {
  DIFICULDADE.forEach((d) => {
    assert.equal(d.saidas[0], 0, 'o primeiro sempre ja nasce na rua');
  });
  for (let i = 1; i < DIFICULDADE.length; i++) {
    for (let q = 1; q < 4; q++) {
      assert.ok(DIFICULDADE[i].saidas[q] < DIFICULDADE[i - 1].saidas[q],
        `o fantasma ${q} sai mais cedo na fase ${i + 1}`);
    }
  }
});

teste('a tabela de ciclos troca respiro por caca fase a fase', () => {
  const dispersar = DIFICULDADE.map((d) => tempoNoHumor(d.ciclos, 'dispersar'));
  const cacar = DIFICULDADE.map((d) => tempoNoHumor(d.ciclos, 'cacar'));

  assert.ok(dispersar[1] < dispersar[0] && dispersar[2] < dispersar[1],
    `a dispersao encolhe (${dispersar})`);
  assert.ok(cacar[1] > cacar[0] && cacar[2] > cacar[1], `e a caca estica (${cacar})`);

  DIFICULDADE.forEach((d, i) => {
    const ultima = d.ciclos[d.ciclos.length - 1];
    assert.equal(ultima.modo, 'cacar', `a fase ${i + 1} acaba cacando`);
    assert.equal(ultima.quadros, -1, 'e dali em diante e caca para sempre');
    d.ciclos.forEach((linha, q) => {
      const esperado = q % 2 === 0 ? 'dispersar' : 'cacar';
      assert.equal(linha.modo, esperado, 'os humores se alternam');
    });
  });
});

// --------------------------------------- A tabela chegando no labirinto ----
teste('cada labirinto carrega a linha de dificuldade dele', () => {
  mapas.forEach((mapa, i) => {
    assert.equal(mapa.dificuldade, DIFICULDADE[i]);
    assert.equal(mapa.duracaoPoder, DIFICULDADE[i].poder);
    assert.equal(Poder.duracaoDe(mapa), DIFICULDADE[i].poder, 'e o feitico sai dali');
    assert.equal(Ciclos.tabelaDe(mapa.dificuldade), DIFICULDADE[i].ciclos,
      'a tabela de ciclos tambem');
  });

  // Um desenho solto (os testes fazem isso o tempo todo) vale pela fase 1.
  const solto = Mapa.ler(LABIRINTO_2);
  assert.equal(solto.dificuldade, DIFICULDADE[0]);
  assert.equal(solto.duracaoPoder, mundo.PODER_QUADROS);
});

teste('os fantasmas nascem com os tempos de saida da fase', () => {
  mapas.forEach((mapa, i) => {
    const estado = Fantasmas.novoEstado(mapa, mapa.dificuldade);
    estado.lista.forEach((f, q) => {
      const espera = DIFICULDADE[i].saidas[q];
      assert.equal(f.espera, espera, `o fantasma ${q} da fase ${i + 1}`);
      assert.equal(f.etapa, espera > 0 ? 'casa' : 'livre');
    });
  });
});

teste('o relogio dos humores comeca na tabela da fase', () => {
  mapas.forEach((mapa, i) => {
    let ciclo = Ciclos.novoEstado(mapa.dificuldade);
    assert.equal(ciclo.modo, 'dispersar', 'toda fase comeca com um respiro');

    // Um quadro antes da troca ainda e dispersao; no quadro dela, ja e caca.
    const quadros = DIFICULDADE[i].ciclos[0].quadros;
    for (let q = 0; q < quadros - 1; q++) ciclo = Ciclos.passo(ciclo, mapa.dificuldade);
    assert.equal(ciclo.modo, 'dispersar', `a fase ${i + 1} dispersa ${quadros} quadros`);
    ciclo = Ciclos.passo(ciclo, mapa.dificuldade);
    assert.equal(ciclo.modo, 'cacar');
    assert.equal(ciclo.trocou, true, 'e o aviso da meia-volta sai na hora certa');
  });
});

// ---------------------------------------------------------- A pressa -------
teste('a pressa e um passo a mais no comeco de cada compasso', () => {
  const solto = { indice: 0, etapa: 'livre', assustado: false };
  const compasso = mundo.COMPASSO_PRESSA;

  assert.equal(Fantasmas.comPressa(solto, { pressa: [0, 0, 0, 0], quadro: 0 }), false,
    'sem pressa nenhuma, ninguem anda duas vezes');

  let vezes = 0;
  for (let q = 0; q < compasso * 3; q++) {
    if (Fantasmas.comPressa(solto, { pressa: [1, 0, 0, 0], quadro: q })) vezes++;
  }
  assert.equal(vezes, 3, 'uma vez por compasso');

  vezes = 0;
  for (let q = 0; q < compasso * 3; q++) {
    if (Fantasmas.comPressa(solto, { pressa: [2, 0, 0, 0], quadro: q })) vezes++;
  }
  assert.equal(vezes, 6, 'duas vezes por compasso');

  // A pressa e de cada um: o vizinho de indice 1 nao herda a do 0.
  assert.equal(Fantasmas.comPressa({ indice: 1, etapa: 'livre', assustado: false },
    { pressa: [2, 0, 0, 0], quadro: 0 }), false);
});

teste('quem esta com medo, na casa ou virado em olhos nunca tem pressa', () => {
  const op = { pressa: [2, 2, 2, 2], quadro: 0 };
  assert.equal(Fantasmas.comPressa({ indice: 0, etapa: 'livre', assustado: true }, op), false,
    'assustado anda em MEIA velocidade, nunca em dobro');
  ['casa', 'saindo', 'olhos', 'entrando'].forEach((etapa) => {
    assert.equal(Fantasmas.comPressa({ indice: 0, etapa, assustado: false }, op), false,
      `quem esta ${etapa} tem o compasso proprio dele`);
  });
});

teste('com pressa o fantasma anda mais, e sem sair da grade de 16px', () => {
  const mapa = mapas[2];
  const alvo = { c: mapa.nascimento.c, l: mapa.nascimento.l };
  const QUADROS = mundo.COMPASSO_PRESSA * 4;

  const correr = (pressa) => {
    let estado = Fantasmas.novoEstado(mapa, { saidas: [0, 0, 0, 0] });
    for (let q = 0; q < QUADROS; q++) {
      estado = Fantasmas.passo(estado, mapa, alvo, { pressa: pressa });
      estado.lista.forEach((f) => {
        // A grade continua honesta: andando na horizontal ele fica no centro
        // da linha; na vertical, no centro da coluna.
        const noMeioX = f.corpo.x % mundo.TILE === mundo.TILE / 2;
        const noMeioY = f.corpo.y % mundo.TILE === mundo.TILE / 2;
        assert.ok(noMeioX || noMeioY, `desalinhou em (${f.corpo.x}, ${f.corpo.y})`);
        assert.equal(Mapa.parede(mapa, Mapa.coluna(f.corpo.x), Mapa.linha(f.corpo.y)), false,
          'e ninguem entrou em parede');
      });
    }
    return estado.lista.map((f) => f.corpo.passos);
  };

  const parados = correr([0, 0, 0, 0]);
  const apressados = correr([1, 1, 1, 1]);
  apressados.forEach((passos, i) => {
    assert.equal(passos, parados[i] + QUADROS / mundo.COMPASSO_PRESSA,
      `o fantasma ${i} deu os passos a mais do compasso`);
  });
});

teste('passo() com pressa continua puro: nao mexe no estado que recebeu', () => {
  const mapa = mapas[1];
  const estado = Fantasmas.novoEstado(mapa, mapa.dificuldade);
  const antes = JSON.stringify(estado);
  Fantasmas.passo(estado, mapa, mapa.nascimento, { pressa: mapa.dificuldade.pressa });
  assert.equal(JSON.stringify(estado), antes);
});

await fim('Fase 6a');
