/* ==========================================================================
   Come-Come - Fase 1: o labirinto lido e o come-come andando na grade
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase1.test.mjs

   Confere o que a fase 1 do plano promete:
     - o `Mapa` le o desenho em texto e devolve a grade certinha (paredes,
       pastilhas, pastilhas de poder, porta da casa, nascimento e tunel)
     - o `Movimento` nao atravessa parede: para no centro da celula
     - a direcao desejada so vira quando o corredor abre para aquele lado
     - o tunel devolve o come-come do outro lado do labirinto
     - o bloco "plataforma" do jogo.json passa pelo validador do servidor e o
       catalogo lista o jogo sem `problema` (as mesmas contas de /api/jogos)
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, lerJogoJson, teste, fim, RAIZ } from './harness.mjs';
import { lerManifestoPlataforma } from '../../server/src/plataforma/manifesto.js';

process.env.PASTA_JOGOS = process.env.PASTA_JOGOS || `${RAIZ}/jogos`;
const { lerJogo, listarJogos } = await import('../../server/src/catalogo.js');

const { Mapa, Movimento, LABIRINTO_1, mapas, mundo } = carregarJogo('come_come');
const mapa = mapas[0];
const TILE = mundo.TILE;

// Os corpos nascem dentro do `vm`, com outro Object.prototype: comparar em
// texto evita que o assert.deepEqual estrito reclame do prototipo.
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

const coluna = (corpo) => Mapa.coluna(corpo.x);
const linha = (corpo) => Mapa.linha(corpo.y);

/** Roda `n` passos com o mesmo corpo e devolve o corpo final. */
function correr(corpo, n, aCada) {
  for (let i = 0; i < n; i++) {
    corpo = Movimento.passo(corpo, mapa);
    if (aCada) aCada(corpo, i);
  }
  return corpo;
}

/** Pede uma direcao e anda ate `chegou()` dizer que chegou (ou desistir). */
function levar(corpo, dir, chegou, max = 900) {
  let atual = { ...corpo, desejada: dir };
  for (let i = 0; i < max && !chegou(atual); i++) atual = Movimento.passo(atual, mapa);
  assert.ok(chegou(atual), `nao consegui levar o come-come para ${dir}`);
  return atual;
}

console.log('Come-Come - fase 1\n');

// --------------------------------------------------------------- O mapa -----
teste('o desenho do labirinto 1 tem 28 colunas por 31 linhas', () => {
  assert.equal(LABIRINTO_1.length, 31);
  LABIRINTO_1.forEach((texto, l) => {
    assert.equal(texto.length, 28, `a linha ${l} tem ${texto.length} letras`);
  });
});

teste('o Mapa le o desenho e devolve a grade em pixels', () => {
  assert.equal(mapa.colunas, 28);
  assert.equal(mapa.linhas, 31);
  assert.equal(mapa.largura, 28 * TILE);
  assert.equal(mapa.altura, 31 * TILE);
});

teste('o Mapa acha o nascimento, as pastilhas, os poderes e a porta da casa', () => {
  igual(mapa.nascimento, { c: 13, l: 23 }, 'o come-come nasce embaixo da casa');
  assert.equal(mapa.totalPastilhas, 244);
  assert.equal(mapa.pastilhas.length, mapa.totalPastilhas);
  assert.equal(mapa.poderes.length, 4, 'quatro pastilhas de poder, uma por canto');
  assert.equal(mapa.portas.length, 2, 'a porta da casa tem dois quadrados');

  // As de poder estao mesmo marcadas como poder, e as outras nao.
  mapa.poderes.forEach((i) => assert.equal(mapa.pastilhas[i].poder, true));
  const comuns = mapa.pastilhas.filter((p) => !p.poder);
  assert.equal(comuns.length, 240);
});

teste('cada pastilha sabe o centro do quadrado dela, em pixels', () => {
  mapa.pastilhas.forEach((p) => {
    assert.equal(p.x, p.c * TILE + TILE / 2);
    assert.equal(p.y, p.l * TILE + TILE / 2);
    assert.equal(Mapa.letra(mapa, p.c, p.l), p.poder ? 'o' : '.');
  });
});

teste('parede e porta barram o come-come; pastilha, vazio e tunel deixam passar', () => {
  assert.equal(Mapa.livre(mapa, 0, 0), false, 'a moldura e parede');
  assert.equal(Mapa.parede(mapa, 0, 0), true);
  assert.equal(Mapa.livre(mapa, 13, 12), false, 'a porta da casa e parede para ele');
  assert.equal(Mapa.letra(mapa, 13, 12), '-');

  assert.equal(Mapa.livre(mapa, 1, 1), true, 'pastilha');
  assert.equal(Mapa.livre(mapa, 1, 3), true, 'pastilha de poder');
  assert.equal(Mapa.livre(mapa, 13, 23), true, 'o quadrado do nascimento');
  assert.equal(Mapa.livre(mapa, 0, 14), true, 'a boca do tunel');
  assert.equal(Mapa.livre(mapa, 3, 14), true, 'o corredor vazio do tunel');
});

teste('fora do desenho e parede - menos na linha do tunel', () => {
  assert.equal(mapa.tuneis[14], true, 'a linha 14 e a do tunel');
  assert.equal(Boolean(mapa.tuneis[13]), false);
  assert.equal(Mapa.livre(mapa, -1, 5), false, 'fora do mapa, numa linha comum');
  assert.equal(Mapa.livre(mapa, 28, 5), false);
  assert.equal(Mapa.livre(mapa, 5, -1), false, 'acima do desenho');
  assert.equal(Mapa.livre(mapa, 5, 31), false, 'abaixo do desenho');
});

teste('o vizinho na linha do tunel da a volta pelo outro lado', () => {
  igual(Mapa.vizinho(mapa, 0, 14, 'esquerda'), { c: 27, l: 14 });
  igual(Mapa.vizinho(mapa, 27, 14, 'direita'), { c: 0, l: 14 });
  igual(Mapa.vizinho(mapa, 5, 14, 'esquerda'), { c: 4, l: 14 }, 'no meio da linha, nada muda');
  igual(Mapa.vizinho(mapa, 1, 5, 'esquerda'), { c: 0, l: 5 }, 'noutra linha, nada de volta');
  assert.equal(Mapa.podeIr(mapa, 0, 14, 'esquerda'), true);
  assert.equal(Mapa.podeIr(mapa, 1, 5, 'esquerda'), false, 'a moldura barra');
});

teste('as saidas de um quadrado dizem se ele e corredor ou encruzilhada', () => {
  igual(Mapa.saidas(mapa, 13, 23), ['direita', 'esquerda'],
    'o nascimento e um corredor deitado');
  igual(Mapa.saidas(mapa, 6, 23), ['direita', 'baixo', 'cima'],
    'a esquina de baixo a esquerda abre para tres lados');
  igual(Mapa.saidas(mapa, 0, 0), [], 'no canto da moldura nao ha para onde ir');
});

// ---------------------------------------------------------- O movimento -----
teste('o come-come nasce parado no centro do quadrado dele', () => {
  const come = Movimento.novoCorpo(13, 23);
  assert.equal(come.x, 13 * TILE + TILE / 2);
  assert.equal(come.y, 23 * TILE + TILE / 2);
  assert.equal(Movimento.noCentro(come), true);
  assert.equal(come.dir, 'esquerda');
  assert.equal(come.passos, 0);
});

teste('anda 2px por quadro, sempre igual', () => {
  let anterior = Movimento.novoCorpo(13, 23, 'esquerda');
  correr(anterior, 8, (corpo) => {
    assert.equal(anterior.x - corpo.x, mundo.VEL_COME);
    assert.equal(corpo.y, anterior.y, 'andando deitado, a altura nao muda');
    anterior = corpo;
  });
});

teste('nao atravessa parede: para no centro da celula', () => {
  // Acima do nascimento e a parede de baixo da casa dos fantasmas.
  const come = Movimento.novoCorpo(13, 23, 'cima');
  const depois = correr(come, 40);
  assert.equal(depois.x, come.x);
  assert.equal(depois.y, come.y, 'nao saiu do lugar');
  assert.equal(depois.parado, true);
  assert.equal(depois.passos, 0, 'parado, a boca tambem para');
});

teste('andando pelo corredor, para exatamente no centro do ultimo quadrado', () => {
  // Do nascimento para a esquerda o corredor acaba na coluna 6.
  const depois = correr(Movimento.novoCorpo(13, 23, 'esquerda'), 60);
  assert.equal(coluna(depois), 6);
  assert.equal(depois.x, 6 * TILE + TILE / 2, 'parou no centro do quadrado');
  assert.equal(depois.parado, true);
  assert.equal(Mapa.podeIr(mapa, 6, 23, 'esquerda'), false);
});

teste('a direcao desejada so vira quando o corredor abre', () => {
  // Saindo do nascimento para a esquerda, pedindo "cima" desde o primeiro
  // quadro: em cima da coluna 13 tem a casa dos fantasmas, e o primeiro
  // corredor que sobe e o da coluna 12.
  let come = { ...Movimento.novoCorpo(13, 23, 'esquerda'), desejada: 'cima' };
  for (let i = 0; i < 8; i++) {
    come = Movimento.passo(come, mapa);
    assert.equal(come.dir, 'esquerda', `no quadro ${i + 1} ainda nao havia corredor`);
    assert.equal(come.y, 23 * TILE + TILE / 2, 'e por isso a altura nao mudou');
  }
  assert.equal(coluna(come), 12, 'chegou no centro da coluna 12');

  come = Movimento.passo(come, mapa);
  assert.equal(come.dir, 'cima', 'ali o corredor abre, e a curva acontece');
  assert.equal(come.x, 12 * TILE + TILE / 2, 'virou alinhado no meio do corredor');
});

teste('o pedido fica guardado ate a esquina aparecer', () => {
  // Pedindo "baixo" no meio do corredor de cima: ele so desce na coluna 6.
  let come = { ...Movimento.novoCorpo(3, 5, 'direita'), desejada: 'baixo' };
  come = correr(come, 4);
  assert.equal(come.dir, 'direita', 'debaixo dele ainda e parede');
  assert.equal(come.desejada, 'baixo', 'o pedido nao se perdeu');

  come = levar(come, 'baixo', (b) => b.dir === 'baixo');
  assert.equal(coluna(come), 6, 'desceu na primeira coluna que abriu');
});

teste('a meia-volta acontece na hora, mesmo no meio do caminho', () => {
  let come = correr(Movimento.novoCorpo(13, 23, 'esquerda'), 3);
  assert.equal(Movimento.noCentro(come), false, 'esta entre dois centros');

  come = Movimento.passo({ ...come, desejada: 'direita' }, mapa);
  assert.equal(come.dir, 'direita', 'de onde ele veio esta livre, sempre');
});

teste('alinha no centro do corredor mesmo saindo torto', () => {
  const torto = { ...Movimento.novoCorpo(13, 23, 'esquerda'), y: 23 * TILE + TILE / 2 + 3 };
  const depois = Movimento.passo(torto, mapa);
  assert.equal(depois.y, 23 * TILE + TILE / 2, 'a altura voltou para o meio da linha');

  const torto2 = { ...Movimento.novoCorpo(12, 22, 'cima'), x: 12 * TILE + TILE / 2 - 5 };
  const depois2 = Movimento.passo(torto2, mapa);
  assert.equal(depois2.x, 12 * TILE + TILE / 2, 'e a largura, para o meio da coluna');
});

// -------------------------------------------------------------- O tunel -----
teste('sair pela esquerda do tunel e entrar pela direita', () => {
  const come = Movimento.novoCorpo(0, 14, 'esquerda');
  const passagem = [];
  const depois = correr(come, 8, (corpo) => passagem.push(corpo.x));

  igual(passagem, [6, 4, 2, 0, 446, 444, 442, 440], 'a travessia nao tem buraco');
  assert.equal(coluna(depois), 27, 'apareceu na outra ponta do labirinto');
  assert.equal(depois.y, 14 * TILE + TILE / 2, 'na mesma linha, claro');
  assert.equal(Movimento.noCentro(depois), true);
});

teste('sair pela direita do tunel e entrar pela esquerda', () => {
  const depois = correr(Movimento.novoCorpo(27, 14, 'direita'), 8);
  assert.equal(coluna(depois), 0);
  assert.equal(depois.x, TILE / 2);
  assert.equal(depois.y, 14 * TILE + TILE / 2);
});

teste('do nascimento da para chegar no tunel so pedindo direcoes', () => {
  let come = Movimento.novoCorpo(13, 23, 'esquerda');
  come = levar(come, 'esquerda', (b) => coluna(b) === 6 && b.parado);
  come = levar(come, 'cima', (b) => linha(b) === 14 && Movimento.noCentro(b));
  come = levar(come, 'esquerda', (b) => coluna(b) === 27);
  assert.equal(linha(come), 14, 'atravessou o tunel andando');
});

teste('andando o labirinto inteiro, nunca entra numa parede', () => {
  // Um passeio comprido: a cada centro de quadrado ele sorteia uma saida
  // valida (sorteio fixo, para o teste dar sempre o mesmo resultado).
  let semente = 20260830;
  const sorteio = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;

  let come = Movimento.novoCorpo(13, 23, 'esquerda');
  for (let i = 0; i < 4000; i++) {
    if (Movimento.noCentro(come)) {
      const saidas = Mapa.saidas(mapa, coluna(come), linha(come));
      come = { ...come, desejada: saidas[Math.floor(sorteio() * saidas.length)] };
    }
    come = Movimento.passo(come, mapa);
    assert.equal(Mapa.livre(mapa, coluna(come), linha(come)), true,
      `no quadro ${i} ele estava em (${coluna(come)}, ${linha(come)})`);
    assert.ok(come.x >= 0 && come.x < mapa.largura, 'nunca sai do labirinto pelos lados');
    assert.ok(come.y >= 0 && come.y < mapa.altura, 'nem por cima ou por baixo');
  }
});

// -------------------------------------------------------------- Pureza ------
teste('passo() e funcao pura: nao mexe no corpo que recebeu', () => {
  const antes = Movimento.novoCorpo(13, 23, 'esquerda');
  const copia = JSON.parse(JSON.stringify(antes));
  const depois = Movimento.passo(antes, mapa);
  igual(antes, copia, 'o corpo original ficou intacto');
  assert.notEqual(depois, antes, 'devolveu um corpo novo');
});

teste('mesmo corpo + mesmo pedido = mesmo resultado', () => {
  const come = { ...Movimento.novoCorpo(13, 23, 'esquerda'), desejada: 'cima' };
  igual(Movimento.passo(come, mapa), Movimento.passo(come, mapa));
});

// ------------------------------------------------------------ Manifesto -----
teste('jogo.json declara o bloco plataforma pedido pelo plano', () => {
  const j = lerJogoJson('come_come');
  assert.equal(j.nome, 'Come-Come');
  assert.ok(j.emoji, 'tem emoji');
  assert.match(j.cor, /^#[0-9a-fA-F]{3,8}$/, 'tem cor valida');
  assert.ok(j.tags.length > 0, 'tem tags');
  assert.ok(j.idade, 'tem idade');

  assert.deepEqual(j.plataforma.multijogador, {
    min: 1, max: 5, modo: 'competitivo', autoridade: 'anfitriao',
    taxaEstado: 20, listarSalas: true,
  });
  assert.ok(j.plataforma.ranking, 'tem bloco ranking');
  assert.ok(j.plataforma.classificacao, 'tem bloco classificacao');
  assert.ok(j.plataforma.privacidade, 'tem bloco privacidade');
});

teste('o validador do servidor aceita o manifesto sem corrigir nada', () => {
  const j = lerJogoJson('come_come');
  const lido = lerManifestoPlataforma(j.plataforma);
  assert.deepEqual(lido.problemas, []);
  assert.equal(lido.multijogador.min, 1);
  assert.equal(lido.multijogador.max, 5);
  assert.equal(lido.multijogador.modo, 'competitivo');
  assert.equal(lido.multijogador.autoridade, 'anfitriao');
  assert.equal(lido.multijogador.taxaEstado, 20);
  assert.equal(lido.multijogador.listarSalas, true);
  assert.equal(lido.ranking.metrica, 'pontos');
});

teste('o catalogo lista come_come sem problema (/api/jogos)', async () => {
  const jogos = await listarJogos();
  const meu = jogos.find((j) => j.slug === 'come_come');
  assert.ok(meu, 'aparece na lista do catalogo');
  assert.equal(meu.problema, null);
  assert.equal(meu.jogavel, true);
  assert.equal(meu.entrada, '/jogos/come_come/index.html');
});

teste('o cartao do jogo traz o multijogador declarado (/api/jogos/<slug>)', async () => {
  const jogo = await lerJogo('come_come');
  assert.equal(jogo.plataforma.multijogador.max, 5);
  assert.equal(jogo.plataforma.multijogador.min, 1);
  assert.ok(jogo.selos.some((s) => s.tipo === 'multijogador'));
});

await fim('Fase 1');
