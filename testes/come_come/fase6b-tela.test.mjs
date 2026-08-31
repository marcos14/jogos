/* ==========================================================================
   Come-Come - Fase 6b (tela): uma corrida inteira, labirinto 1 -> 2 -> 3
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase6b-tela.test.mjs

   Aqui o game.js roda de verdade (teclado, laco de quadros e desenho) num DOM
   de mentira, e o piloto automatico joga a partida solo do comeco ao fim:

     - limpar os labirintos 1 e 2 abre o quadro "LABIRINTO LIMPO", com o que a
       fase rendeu, o bonus de +500 e o botao que leva para o proximo
     - o botao so anda para a FRENTE: clicar no meio da fase nao faz nada, e
       depois do Parabens ele nao leva a lugar nenhum
     - limpar o labirinto 3 traz o PARABENS, com uma linha por fase e o total -
       que tem de bater com a soma das tres fases + 3 bonus
     - "Jogar de novo" zera o caderno e devolve o jogo para o labirinto 1
     - a outra saida: perdendo as vidas no meio da corrida, a tela de FIM DE
       JOGO mostra os pontos das fases ja fechadas mais os desta

   O piloto e o mesmo dos testes de tela das fases 2 e 6a: busca em largura ate
   a pastilha inteira mais perto, passando so por onde nenhum cacador esta por
   perto. Como nas fases 2 e 3 os fantasmas correm mais que ele, aqui o
   come-come e imortal - a rodada e devolvida ao cheio antes de cada quadro.
   Este arquivo e sobre a CORRIDA das tres fases; quem prova o tombo e as vidas
   e o `fase5-tela.test.mjs`.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Mapa, Movimento, Pastilhas, Rodada, mundo } = dom.api;

const BONUS = mundo.PONTOS_LIMPOU;

/* O come-come imortal: sem isto o piloto perderia as tres vidas no meio do
   labirinto 3 e o teste falaria sobre sobrevivencia, e nao sobre a corrida das
   tres fases - que e o que esta fase promete. */
const quadroDeVerdade = dom.avancarQuadros;
dom.avancarQuadros = (n) => {
  for (let i = 0; i < n; i++) {
    dom.api.jogo.rodada = Rodada.novoEstado();
    dom.api.jogo.vidas = mundo.VIDAS_INICIAIS;
    quadroDeVerdade(1);
  }
};

const jogo = () => dom.api.jogo;
const mapa = () => dom.api.labirinto;
const come = () => dom.api.jogo.come;
const corrida = () => dom.api.jogo.corrida;
const faltam = () => Pastilhas.faltam(jogo().pastilhas);

const chave = (c, l) => `${c},${l}`;
/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* --------------------------------------------------------------------------
   O piloto automatico, o mesmo das fases 2 e 6a.
   -------------------------------------------------------------------------- */
const OLHO_DO_MEDO = 8;         // mais longe que isto ele nao se preocupa
const MARGEM = 2;               // quadrados de folga que ele exige do cacador

/** A que distancia (em quadrados) o cacador mais proximo esta de cada lugar. */
function mapaDePerigo() {
  const m = mapa();
  const perigo = new Map();
  const fila = [];

  for (const f of jogo().fantasmas.lista) {
    if (!Rodada.cacador(f) || f.etapa === 'casa') continue;   // preso, nao pega
    const c = Mapa.coluna(f.corpo.x);
    const l = Mapa.linha(f.corpo.y);
    if (perigo.has(chave(c, l))) continue;
    perigo.set(chave(c, l), 0);
    fila.push({ c, l, d: 0 });
  }

  for (let i = 0; i < fila.length; i++) {
    const aqui = fila[i];
    if (aqui.d >= OLHO_DO_MEDO) continue;
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(m, aqui.c, aqui.l, dir)) continue;
      const v = Mapa.vizinho(m, aqui.c, aqui.l, dir);
      if (perigo.has(chave(v.c, v.l))) continue;
      perigo.set(chave(v.c, v.l), aqui.d + 1);
      fila.push({ c: v.c, l: v.l, d: aqui.d + 1 });
    }
  }
  return perigo;
}

/** A primeira direcao do caminho seguro ate a pastilha inteira mais perto. */
function direcaoParaAPastilhaMaisPerto() {
  const m = mapa();
  const perigo = mapaDePerigo();
  const seguro = (c, l) => (perigo.get(chave(c, l)) ?? 99) > MARGEM;
  const c0 = Mapa.coluna(come().x);
  const l0 = Mapa.linha(come().y);
  const veio = new Map([[chave(c0, l0), null]]);
  const fila = [{ c: c0, l: l0 }];

  for (let i = 0; i < fila.length; i++) {
    const aqui = fila[i];
    const pastilha = Mapa.pastilhaEm(m, aqui.c, aqui.l);
    if (pastilha >= 0 && Pastilhas.existe(jogo().pastilhas, pastilha)) {
      let passo = veio.get(chave(aqui.c, aqui.l));
      if (!passo) continue;                       // ja estamos em cima dela
      while (veio.get(chave(passo.c, passo.l))) {
        passo = veio.get(chave(passo.c, passo.l));
      }
      return passo.dir;
    }
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(m, aqui.c, aqui.l, dir)) continue;
      const v = Mapa.vizinho(m, aqui.c, aqui.l, dir);
      if (veio.has(chave(v.c, v.l))) continue;
      if (!seguro(v.c, v.l)) continue;
      veio.set(chave(v.c, v.l), { c: aqui.c, l: aqui.l, dir });
      fila.push(v);
    }
  }

  // Cercado: foge para o vizinho mais longe dos quatro e tenta de novo adiante.
  let melhor = null;
  let maisLonge = -1;
  for (const dir of Movimento.DIRECOES) {
    if (!Mapa.podeIr(m, c0, l0, dir)) continue;
    const v = Mapa.vizinho(m, c0, l0, dir);
    const d = perigo.get(chave(v.c, v.l)) ?? 99;
    if (d > maisLonge) { maisLonge = d; melhor = dir; }
  }
  return melhor;
}

/** O que cada fase rendeu, anotado na hora em que a ultima pastilha sumiu. */
const rendeu = [];

/**
 * Roda o jogo com o piloto no volante ate o labirinto ficar limpo, anota o que
 * a fase rendeu e devolve esse numero.
 */
function limparOLabirinto(maxDecisoes = 6000) {
  for (let i = 0; i < maxDecisoes; i++) {
    if (jogo().tela !== 'jogando') {
      rendeu.push(jogo().pontos);
      return jogo().pontos;
    }
    if (!Movimento.noCentro(come())) { dom.avancarQuadros(1); continue; }

    const dir = direcaoParaAPastilhaMaisPerto();
    assert.ok(dir, `sem caminho para a proxima pastilha (faltavam ${faltam()})`);
    dom.api.entrada.desejada = dir;
    dom.avancarQuadros(8);
  }
  return assert.fail(`o piloto nao limpou o labirinto (faltaram ${faltam()})`);
}

console.log('Come-Come - fase 6b (tela)\n');

// -------------------------------------------------------- O labirinto 1 ----
teste('a corrida comeca no labirinto 1, com o caderno em branco', () => {
  dom.avancarQuadros(1);

  assert.equal(jogo().fase, 1);
  assert.equal(dom.texto('hud-fase'), '1 / 3');
  assert.equal(corrida().fase, 1);
  igual(corrida().fases, []);
  assert.equal(corrida().total, 0);
  assert.equal(corrida().terminada, false);
  assert.equal(dom.escondido('tela-fase'), true, 'sem quadro de fim de fase');
  assert.equal(dom.escondido('tela-parabens'), true, 'e sem PARABENS');
});

teste('clicar em "proximo labirinto" no meio da fase nao adianta nada', () => {
  dom.avancarQuadros(30);
  dom.clicar('btn-proxima');

  assert.equal(jogo().fase, 1, 'continua no labirinto 1');
  assert.equal(mapa(), dom.api.mapas[0]);
  assert.equal(jogo().tela, 'jogando');
  assert.equal(dom.escondido('tela-fase'), true);
});

teste('limpar o labirinto 1 abre o quadro "LABIRINTO LIMPO"', () => {
  const pontos = limparOLabirinto();

  assert.equal(faltam(), 0, 'nenhuma pastilha sobrou');
  assert.equal(jogo().tela, 'fase');
  assert.equal(dom.escondido('tela-fase'), false, 'o quadro da fase apareceu');
  assert.equal(dom.escondido('tela-parabens'), true, 'o PARABENS continua guardado');

  assert.equal(dom.texto('fase-numero'), '1');
  assert.equal(dom.texto('fase-pontos'), String(pontos), 'os pontos da fase');
  assert.equal(dom.texto('fase-bonus'), '+' + BONUS);
  assert.equal(dom.texto('fase-proxima'), '2', 'o botao aponta para o labirinto 2');
});

teste('a fase 1 entrou no caderno com o bonus por limpar', () => {
  const c = corrida();
  assert.equal(c.fases.length, 1);
  igual(c.fases[0],
    { numero: 1, pontos: rendeu[0], bonus: BONUS, total: rendeu[0] + BONUS });
  assert.equal(c.total, rendeu[0] + BONUS);
  assert.equal(c.fase, 2, 'e o proximo labirinto e o 2');
  assert.equal(jogo().fase, 1, 'mas o labirinto em jogo ainda e o 1');
});

teste('com a fase fechada o mundo congela atras do quadro', () => {
  const antes = { x: come().x, y: come().y, relogio: jogo().relogio };
  dom.tecla('ArrowRight');
  dom.avancarQuadros(60);

  assert.equal(come().x, antes.x, 'o come-come ficou onde estava');
  assert.equal(come().y, antes.y);
  assert.equal(jogo().relogio, antes.relogio, 'e o relogio do mundo tambem parou');
  assert.ok(dom.pintados.length > 0, 'mas a cena continua sendo desenhada');
});

// -------------------------------------------------------- O labirinto 2 ----
teste('"proximo labirinto" leva para a fase 2 e troca o mundo inteiro', () => {
  dom.clicar('btn-proxima');
  const m = dom.api.mapas[1];

  assert.equal(jogo().fase, 2);
  assert.equal(dom.texto('hud-fase'), '2 / 3');
  assert.equal(mapa(), m, 'o labirinto em jogo e o segundo');
  assert.equal(faltam(), m.totalPastilhas, 'com as pastilhas dele todas de pe');
  assert.equal(dom.escondido('tela-fase'), true, 'o quadro sumiu');
  assert.equal(jogo().tela, 'jogando', 'e a fase nova comeca aberta');

  assert.equal(jogo().pontos, 0, 'o placar do HUD recomeca do zero na fase nova');
  assert.equal(dom.texto('hud-pontos'), '0');
  assert.equal(jogo().vidas, 3, 'com as tres vidas cheias');
  assert.equal(Mapa.coluna(come().x), m.nascimento.c, 'e o come-come no P da fase 2');
  assert.equal(corrida().total, rendeu[0] + BONUS,
    'o que a fase 1 rendeu continua guardado no caderno');
});

teste('limpar o labirinto 2 abre o quadro dele, apontando para o 3', () => {
  const pontos = limparOLabirinto();

  assert.equal(faltam(), 0);
  assert.equal(jogo().tela, 'fase');
  assert.equal(dom.escondido('tela-fase'), false);
  assert.equal(dom.escondido('tela-parabens'), true);

  assert.equal(dom.texto('fase-numero'), '2');
  assert.equal(dom.texto('fase-pontos'), String(pontos));
  assert.equal(dom.texto('fase-proxima'), '3');
  assert.equal(corrida().fase, 3);
  assert.equal(corrida().terminada, false, 'a corrida ainda nao acabou');
});

// -------------------------------------------------------- O labirinto 3 ----
teste('"proximo labirinto" leva para a fase 3, a ultima', () => {
  dom.clicar('btn-proxima');
  const m = dom.api.mapas[2];

  assert.equal(jogo().fase, 3);
  assert.equal(dom.texto('hud-fase'), '3 / 3');
  assert.equal(mapa(), m);
  assert.equal(faltam(), m.totalPastilhas);
  assert.equal(jogo().pontos, 0);
  assert.equal(dom.escondido('tela-fase'), true);
  igual(corrida().fases.map((f) => f.numero), [1, 2],
    'com os dois primeiros labirintos ja no caderno');
});

teste('limpar o labirinto 3 termina a corrida e traz o PARABENS', () => {
  limparOLabirinto();

  assert.equal(faltam(), 0);
  assert.equal(jogo().tela, 'parabens');
  assert.equal(dom.escondido('tela-parabens'), false, 'o PARABENS apareceu');
  assert.equal(dom.escondido('tela-fase'), true, 'no lugar do quadro de fim de fase');
  assert.equal(corrida().terminada, true);
  assert.equal(corrida().fase, 3, 'e nao existe labirinto 4');
});

teste('o PARABENS lista os pontos das tres fases', () => {
  igual(corrida().fases.map((f) => f.numero), [1, 2, 3]);

  corrida().fases.forEach((linha, i) => {
    assert.equal(linha.pontos, rendeu[i], `a fase ${i + 1} rendeu o que rendeu`);
    assert.equal(linha.bonus, BONUS);
    assert.equal(dom.texto(`parabens-fase-${i + 1}`),
      `${rendeu[i]} + ${BONUS} = ${rendeu[i] + BONUS}`,
      `a linha da fase ${i + 1} na tela`);
  });
});

teste('o total soma as tres fases mais os tres bonus', () => {
  const soma = rendeu.reduce((a, b) => a + b, 0);

  assert.equal(rendeu.length, 3, 'as tres fases foram jogadas');
  assert.ok(soma > 3 * 2000, `a corrida rendeu ${soma} pontos de pastilhas`);
  assert.equal(corrida().total, soma + 3 * BONUS);
  assert.equal(dom.texto('parabens-total'), String(soma + 3 * BONUS),
    'e e esse o numero que aparece na tela');
});

teste('depois do PARABENS o botao de proximo labirinto nao leva a lugar nenhum', () => {
  dom.clicar('btn-proxima');

  assert.equal(jogo().fase, 3, 'continua no labirinto 3');
  assert.equal(dom.escondido('tela-parabens'), false, 'com o PARABENS na tela');
  assert.equal(corrida().fases.length, 3, 'sem inventar uma quarta fase');
});

teste('com a corrida vencida o mundo para de andar', () => {
  const antes = { x: come().x, y: come().y, relogio: jogo().relogio };
  dom.tecla('ArrowLeft');
  dom.avancarQuadros(60);

  assert.equal(come().x, antes.x, 'o come-come ficou parado');
  assert.equal(come().y, antes.y);
  assert.equal(jogo().relogio, antes.relogio);
  assert.ok(dom.pintados.length > 0, 'mas a cena continua sendo desenhada');
});

// -------------------------------------------------------- Jogar de novo ----
teste('"Jogar de novo" zera a corrida e volta para o labirinto 1', () => {
  dom.clicar('btn-de-novo');
  const m = dom.api.mapas[0];

  assert.equal(jogo().fase, 1);
  assert.equal(dom.texto('hud-fase'), '1 / 3');
  assert.equal(mapa(), m);
  assert.equal(faltam(), m.totalPastilhas, 'o labirinto 1 esta cheio de novo');
  assert.equal(Mapa.coluna(come().x), m.nascimento.c, 'e ele voltou para o P');

  assert.equal(corrida().fase, 1);
  igual(corrida().fases, [], 'o caderno esta em branco de novo');
  assert.equal(corrida().total, 0);
  assert.equal(corrida().terminada, false);

  assert.equal(jogo().pontos, 0);
  assert.equal(dom.texto('hud-pontos'), '0');
  assert.equal(jogo().vidas, 3);
  assert.equal(jogo().relogio, 0);
  assert.equal(jogo().tela, 'jogando');
  assert.equal(dom.escondido('tela-fase'), true);
  assert.equal(dom.escondido('tela-fim'), true);
  assert.equal(dom.escondido('tela-parabens'), true);
});

teste('a corrida nova joga o labirinto 1 de novo, do zero', () => {
  const pontos = limparOLabirinto();

  assert.equal(corrida().fases.length, 1, 'a primeira linha do caderno novo');
  assert.equal(corrida().fases[0].numero, 1);
  assert.equal(corrida().total, pontos + BONUS);
  assert.equal(dom.texto('fase-numero'), '1');
  assert.equal(dom.texto('fase-proxima'), '2');
  assert.equal(dom.escondido('tela-parabens'), true, 'e o PARABENS voltou a se esconder');
});

// ------------------------------------------------- O fim de jogo no meio --
/* A outra saida da corrida: as vidas acabam antes do terceiro labirinto. A
   tela de FIM DE JOGO mostra os pontos da CORRIDA - o que os labirintos ja
   limpos renderam mais o que estava rolando neste -, e nao so os da fase. No
   ultimo teste o come-come volta a ser mortal (a troca mora DENTRO dele: os
   testes sao enfileirados e so rodam no `fim()`). */

/** Aquele quadrado ainda tem uma bolota de poder de pe? */
function temBolota(corpo) {
  const i = Mapa.pastilhaEm(mapa(), Mapa.coluna(corpo.x), Mapa.linha(corpo.y));
  return i >= 0 && mapa().pastilhas[i].poder && Pastilhas.existe(jogo().pastilhas, i);
}

/** Poe o come-come em cima de um cacador solto na rua, ate o tombo acontecer. */
function encostarNumCacador(limite = 1200) {
  for (let q = 0; q < limite; q++) {
    const alvo = jogo().fantasmas.lista.find(
      (f) => Rodada.cacador(f) && f.etapa === 'livre' && !temBolota(f.corpo),
    );
    if (!alvo) { dom.avancarQuadros(1); continue; }

    come().x = alvo.corpo.x;
    come().y = alvo.corpo.y;
    come().dir = alvo.corpo.dir;
    come().desejada = alvo.corpo.dir;
    come().parado = false;
    dom.api.entrada.desejada = null;
    dom.avancarQuadros(1);

    if (Rodada.parado(jogo().rodada)) return;
  }
  assert.fail('nenhum fantasma pegou o come-come');
}

teste('perder as vidas no labirinto 2 fecha a corrida com o total dela', () => {
  dom.avancarQuadros = quadroDeVerdade;      // acabou a imortalidade
  dom.clicar('btn-proxima');
  const jaGanhou = corrida().total;
  assert.ok(jaGanhou > 0, 'a fase 1 ja esta no caderno');

  // Uma vida so: o proximo encontro e o ultimo.
  jogo().rodada = { vidas: 1, pausa: 0, pego: -1, acabou: false };
  jogo().vidas = 1;
  encostarNumCacador();
  const pontosDaFase = jogo().pontos;
  dom.avancarQuadros(mundo.PAUSA_TOMBO + 2);

  assert.equal(jogo().tela, 'fim');
  assert.equal(dom.escondido('tela-fim'), false, 'a tela de fim de jogo subiu');
  assert.equal(dom.texto('fim-fase'), '2', 'com o labirinto em que ela parou');
  assert.equal(dom.texto('fim-pontos'), String(jaGanhou + pontosDaFase),
    'e com os pontos da corrida inteira, nao so os desta fase');
  assert.equal(corrida().fases.length, 1, 'o labirinto 2 nao entrou no caderno');
  assert.equal(corrida().terminada, false, 'e a corrida nao foi vencida');
});

await fim('Fase 6b (tela)');
