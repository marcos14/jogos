/* ==========================================================================
   Super Adventure - Fase 1: movimento basico e manifesto
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase1.test.mjs

   Confere o que a fase 1 do plano promete:
     - velocidade horizontal constante e parada imediata ao soltar a tecla
     - pulo com altura maxima de 120px, sem pulo duplo
     - gravidade acelerando a queda ate o piso
     - o heroi nao sai do mapa pelos lados
     - o bloco "plataforma" do jogo.json passa pelo validador do servidor e o
       catalogo lista o jogo sem `problema` (as mesmas contas de /api/jogos)
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, lerJogoJson, teste, fim, RAIZ } from './harness.mjs';
import { lerManifestoPlataforma } from '../../server/src/plataforma/manifesto.js';

process.env.PASTA_JOGOS = process.env.PASTA_JOGOS || `${RAIZ}/jogos`;
const { lerJogo, listarJogos } = await import('../../server/src/catalogo.js');

const { Fisica, LIMITES_PADRAO, mundo } = carregarJogo('super_adventure');
const M = Fisica.medidas;

const PARADO = { esquerda: false, direita: false, pular: false };
const DIREITA = { esquerda: false, direita: true, pular: false };
const ESQUERDA = { esquerda: true, direita: false, pular: false };
const PULO = { esquerda: false, direita: false, pular: true };

const noChao = () => Fisica.novoCorpo(300, LIMITES_PADRAO.chao - M.HEROI_A);

// Os corpos nascem dentro do `vm`, com outro Object.prototype: comparar em
// texto evita que o assert.deepEqual estrito reclame do prototipo.
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Roda `n` passos com a mesma entrada e devolve o corpo final. */
function correr(corpo, entrada, n, aCada) {
  for (let i = 0; i < n; i++) {
    corpo = Fisica.passo(corpo, entrada, LIMITES_PADRAO);
    if (aCada) aCada(corpo, i);
  }
  return corpo;
}

console.log('Super Adventure - fase 1\n');

// ------------------------------------------------------------- Andar --------
teste('anda para a direita a 3px por quadro, sempre igual', () => {
  const inicio = noChao();
  let anterior = inicio;
  const fim10 = correr(inicio, DIREITA, 10, (corpo) => {
    assert.equal(corpo.x - anterior.x, M.VEL_X, 'cada quadro anda exatamente 3px');
    assert.equal(corpo.vx, M.VEL_X);
    anterior = corpo;
  });
  assert.equal(fim10.x, inicio.x + 10 * M.VEL_X);
  assert.equal(fim10.direcao, 1);
});

teste('anda para a esquerda com a mesma velocidade', () => {
  const inicio = noChao();
  const depois = correr(inicio, ESQUERDA, 10);
  assert.equal(depois.x, inicio.x - 10 * M.VEL_X);
  assert.equal(depois.direcao, -1);
});

teste('para na hora que solta a tecla (sem escorregar)', () => {
  const andando = correr(noChao(), DIREITA, 20);
  const soltou = Fisica.passo(andando, PARADO, LIMITES_PADRAO);
  assert.equal(soltou.vx, 0);
  assert.equal(soltou.x, andando.x, 'o primeiro quadro parado ja nao anda nada');
  const maisTarde = correr(soltou, PARADO, 30);
  assert.equal(maisTarde.x, andando.x);
});

teste('as duas setas juntas nao andam para lado nenhum', () => {
  assert.equal(Fisica.velocidadeHorizontal({ esquerda: true, direita: true }), 0);
  assert.equal(Fisica.velocidadeHorizontal({}), 0);
});

// -------------------------------------------------------------- Pular -------
teste('o pulo sobe no maximo 120px', () => {
  const inicio = noChao();
  let maisAlto = inicio.y;
  const depois = correr(inicio, PULO, 120, (corpo) => {
    maisAlto = Math.min(maisAlto, corpo.y);
  });
  assert.equal(inicio.y - maisAlto, M.ALTURA_MAX_PULO, 'altura maxima do pulo');
  assert.equal(depois.y, inicio.y, 'e volta a pousar no mesmo piso');
  assert.equal(depois.noChao, true);
});

teste('o pulo comeca com o impulso cheio, para responder na hora', () => {
  const primeiro = Fisica.passo(noChao(), PULO, LIMITES_PADRAO);
  assert.equal(noChao().y - primeiro.y, M.IMPULSO_PULO);
  assert.equal(primeiro.noChao, false);
});

teste('nao existe pulo duplo: no ar, apertar de novo nao faz nada', () => {
  let corpo = Fisica.passo(noChao(), PULO, LIMITES_PADRAO);   // decolou
  const noAr = corpo;
  // Segurando o pulo o tempo todo, a subida nunca recomeca.
  let maisAlto = noAr.y;
  for (let i = 0; i < 8; i++) {
    corpo = Fisica.passo(corpo, PULO, LIMITES_PADRAO);
    assert.notEqual(corpo.vy, -M.IMPULSO_PULO, 'nao ganhou impulso novo no ar');
    maisAlto = Math.min(maisAlto, corpo.y);
  }
  const inicioNoChao = noChao();
  assert.ok(inicioNoChao.y - maisAlto <= M.ALTURA_MAX_PULO);

  // Solta e aperta de novo no meio da queda: continua caindo.
  let caindo = correr(corpo, PARADO, 3);
  assert.ok(!caindo.noChao, 'ainda esta no ar');
  const tentou = Fisica.passo(caindo, PULO, LIMITES_PADRAO);
  assert.ok(tentou.y > caindo.y, 'continuou descendo em vez de pular de novo');
});

teste('segurar a tecla de pulo nao faz o heroi quicar sozinho', () => {
  const inicio = noChao();
  const depois = correr(inicio, PULO, 200);
  assert.equal(depois.y, inicio.y, 'pousou e ficou parado no chao');
  // Depois de pousar, so um toque novo levanta de novo.
  const soltou = Fisica.passo(depois, PARADO, LIMITES_PADRAO);
  const apertouDeNovo = Fisica.passo(soltou, PULO, LIMITES_PADRAO);
  assert.equal(inicio.y - apertouDeNovo.y, M.IMPULSO_PULO);
});

teste('pular andando mantem os 3px por quadro na horizontal', () => {
  const inicio = noChao();
  const entrada = { esquerda: false, direita: true, pular: true };
  let anterior = inicio;
  correr(inicio, entrada, 20, (corpo) => {
    assert.equal(corpo.x - anterior.x, M.VEL_X);
    anterior = corpo;
  });
});

// ---------------------------------------------------------- Gravidade -------
teste('a queda acelera 0,6px por quadro e para no piso', () => {
  let corpo = Fisica.novoCorpo(300, 100);
  corpo = Fisica.passo({ ...corpo, noChao: false }, PARADO, LIMITES_PADRAO);
  let anterior = corpo;
  for (let i = 0; i < 5; i++) {
    corpo = Fisica.passo(corpo, PARADO, LIMITES_PADRAO);
    const acelerou = Number((corpo.vy - anterior.vy).toFixed(6));
    assert.equal(acelerou, M.GRAVIDADE);
    anterior = corpo;
  }
  const pousado = correr(corpo, PARADO, 200);
  assert.equal(pousado.y, LIMITES_PADRAO.chao - M.HEROI_A);
  assert.equal(pousado.vy, 0);
  assert.equal(pousado.noChao, true);
});

teste('a queda nao passa da velocidade limite', () => {
  const caindo = correr({ ...Fisica.novoCorpo(300, 0), noChao: false }, PARADO, 200,
    (corpo) => assert.ok(corpo.vy <= M.VEL_Y_MAX));
  assert.equal(caindo.noChao, true);
});

// ------------------------------------------------------ Bordas do mapa ------
teste('nao sai do mapa pela esquerda', () => {
  const depois = correr(noChao(), ESQUERDA, 500);
  assert.equal(depois.x, LIMITES_PADRAO.esquerda);
});

teste('nao sai do mapa pela direita', () => {
  const depois = correr(noChao(), DIREITA, 500);
  assert.equal(depois.x, LIMITES_PADRAO.direita - M.HEROI_L);
  assert.equal(depois.x + M.HEROI_L, mundo.LARGURA_MUNDO);
});

// -------------------------------------------------------------- Pureza ------
teste('passo() e funcao pura: nao mexe no corpo que recebeu', () => {
  const antes = noChao();
  const copia = JSON.parse(JSON.stringify(antes));
  const depois = Fisica.passo(antes, DIREITA, LIMITES_PADRAO);
  igual(antes, copia, 'o corpo original ficou intacto');
  assert.notEqual(depois, antes, 'devolveu um corpo novo');
});

teste('mesmo corpo + mesma entrada = mesmo resultado', () => {
  const corpo = noChao();
  igual(
    Fisica.passo(corpo, PULO, LIMITES_PADRAO),
    Fisica.passo(corpo, PULO, LIMITES_PADRAO),
  );
});

// ------------------------------------------------------------ Manifesto -----
teste('jogo.json declara o bloco plataforma pedido pelo RF-10', () => {
  const j = lerJogoJson('super_adventure');
  assert.deepEqual(j.plataforma.multijogador, {
    min: 1, max: 8, modo: 'competitivo', autoridade: 'anfitriao',
    taxaEstado: 20, listarSalas: true,
  });
  assert.ok(j.plataforma.ranking, 'tem bloco ranking');
  assert.ok(j.plataforma.classificacao, 'tem bloco classificacao');
  assert.ok(j.plataforma.privacidade, 'tem bloco privacidade');
});

teste('o validador do servidor aceita o manifesto sem corrigir nada', () => {
  const j = lerJogoJson('super_adventure');
  const lido = lerManifestoPlataforma(j.plataforma);
  assert.deepEqual(lido.problemas, []);
  assert.equal(lido.multijogador.min, 1);
  assert.equal(lido.multijogador.max, 8);
  assert.equal(lido.multijogador.modo, 'competitivo');
  assert.equal(lido.multijogador.autoridade, 'anfitriao');
  assert.equal(lido.multijogador.taxaEstado, 20);
  assert.equal(lido.multijogador.listarSalas, true);
});

teste('o catalogo lista super_adventure sem problema (/api/jogos)', async () => {
  const jogos = await listarJogos();
  const meu = jogos.find((j) => j.slug === 'super_adventure');
  assert.ok(meu, 'aparece na lista do catalogo');
  assert.equal(meu.problema, null);
  assert.equal(meu.jogavel, true);
  assert.equal(meu.entrada, '/jogos/super_adventure/index.html');
});

teste('o cartao do jogo traz o multijogador declarado (/api/jogos/<slug>)', async () => {
  const jogo = await lerJogo('super_adventure');
  assert.equal(jogo.plataforma.multijogador.max, 8);
  assert.ok(jogo.selos.some((s) => s.tipo === 'multijogador'));
});

await fim('Fase 1');
