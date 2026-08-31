/* ==========================================================================
   Come-Come - Fase 6a: os labirintos 2 e 3 percorridos ate ficarem limpos
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase6a-tela.test.mjs

   O `fase6a.test.mjs` confere os desenhos e a tabela de dificuldade sem DOM
   nenhum. Aqui o game.js roda com a tela de mentira e o mesmo PILOTO
   AUTOMATICO da fase 2 no lugar da crianca - so que agora ele entra pela
   porta dos fundos (`irParaFase`) e joga o labirinto 2 e o labirinto 3 do
   comeco ao fim.

   O que se prova aqui:

     - `irParaFase()` troca o desenho de verdade: o HUD marca a fase, as
       pastilhas do labirinto novo estao todas de pe e o come-come nasce no
       `P` dele;
     - os dois labirintos novos sao percorriveis: o piloto limpa cada um deles
       inteiro, e a ultima pastilha fecha a fase;
     - a dificuldade CHEGOU no mundo: na fase 3 os quatro andam mais do que na
       fase 1 no mesmo numero de quadros, o feitico dura menos e eles saem da
       casa mais cedo.

   O piloto e o mesmo da fase 2: busca em largura ate a pastilha inteira mais
   perto, passando so por onde nenhum cacador esta por perto. Como nas fases 2
   e 3 os fantasmas andam MAIS RAPIDO que ele, aqui o come-come e imortal - a
   rodada e devolvida ao cheio antes de cada quadro, do mesmo jeito que no
   `fase3b-tela.test.mjs`. Este arquivo e sobre PERCORRER os dois labirintos
   novos ate limpa-los; quem prova o tombo e as vidas e o `fase5-tela`.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
// Desde a fase 7 o jogo abre no MENU: quem comeca a partida e o botao JOGAR.
dom.comecarPartida();
const { Mapa, Movimento, Pastilhas, Rodada, Fantasmas, mundo } = dom.api;

/* O come-come imortal: sem isto o piloto perderia as tres vidas no meio do
   labirinto 3 e o teste falaria sobre sobrevivencia, e nao sobre percorrer o
   labirinto inteiro - que e o que esta fase promete. */
const quadroDeVerdade = dom.avancarQuadros;
dom.avancarQuadros = (n) => {
  for (let i = 0; i < n; i++) {
    dom.api.jogo.rodada = dom.api.Rodada.novoEstado();
    dom.api.jogo.vidas = dom.api.mundo.VIDAS_INICIAIS;
    quadroDeVerdade(1);
  }
};

const jogo = () => dom.api.jogo;
const mapa = () => dom.api.labirinto;
const come = () => dom.api.jogo.come;
const faltam = () => Pastilhas.faltam(jogo().pastilhas);

const chave = (c, l) => `${c},${l}`;

/* --------------------------------------------------------------------------
   O piloto automatico da fase 2, com o labirinto vindo de fora: assim ele
   serve para os tres desenhos.
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

/**
 * Roda o jogo com o piloto no volante ate o labirinto ficar limpo. Cada
 * decisao vale um quadrado: 16px a 2px por quadro sao 8 quadros exatos.
 * Devolve quantas decisoes ele precisou.
 */
function limparOLabirinto(maxDecisoes = 6000) {
  for (let i = 0; i < maxDecisoes; i++) {
    if (jogo().tela !== 'jogando') return i;
    if (!Movimento.noCentro(come())) { dom.avancarQuadros(1); continue; }

    const dir = direcaoParaAPastilhaMaisPerto();
    assert.ok(dir, `sem caminho para a proxima pastilha (faltavam ${faltam()})`);
    dom.api.entrada.desejada = dir;
    dom.avancarQuadros(8);
  }
  assert.fail(`o piloto nao limpou o labirinto (faltaram ${faltam()})`);
}

/** Uma copia do jogo, imortal, aberta direto numa fase. */
function abrirNaFase(fase) {
  const outro = carregarJogoComTela('come_come');
  outro.comecarPartida();
  const quadro = outro.avancarQuadros;
  outro.avancarQuadros = (n) => {
    for (let i = 0; i < n; i++) {
      outro.api.jogo.rodada = outro.api.Rodada.novoEstado();
      outro.api.jogo.vidas = outro.api.mundo.VIDAS_INICIAIS;
      quadro(1);
    }
  };
  outro.avancarQuadros(1);
  outro.api.irParaFase(fase);
  return outro;
}

/**
 * Quantos PASSOS o vermelho deu em `quadros` quadros. Cada passo sao 2px, e a
 * conta e exata: sem pressa da um passo por quadro; com pressa 1 da um a mais
 * a cada 16.
 */
function passosDoVermelho(fase, quadros) {
  const outro = abrirNaFase(fase);
  const vermelho = () => outro.api.jogo.fantasmas.lista[0];
  assert.equal(vermelho().etapa, 'livre', 'o vermelho ja nasce na rua');
  const antes = vermelho().corpo.passos;
  outro.avancarQuadros(quadros);
  return vermelho().corpo.passos - antes;
}

console.log('Come-Come - fase 6a (tela)\n');

// ------------------------------------------------------------ A troca -----
teste('o jogo abre no labirinto 1, como sempre', () => {
  dom.avancarQuadros(1);
  assert.equal(jogo().fase, 1);
  assert.equal(dom.texto('hud-fase'), '1 / 3');
  assert.equal(mapa(), dom.api.mapas[0]);
  assert.equal(faltam(), dom.api.mapas[0].totalPastilhas);
});

teste('irParaFase(2) troca o desenho, o HUD e poe todo mundo no lugar', () => {
  dom.api.irParaFase(2);
  const m = dom.api.mapas[1];

  assert.equal(mapa(), m, 'o labirinto em jogo e o segundo');
  assert.equal(jogo().fase, 2);
  assert.equal(dom.texto('hud-fase'), '2 / 3');
  assert.equal(faltam(), m.totalPastilhas, 'as pastilhas do 2 estao todas de pe');
  assert.equal(dom.texto('hud-faltam'), String(m.totalPastilhas));
  assert.equal(jogo().pontos, 0);
  assert.equal(jogo().vidas, 3);
  assert.equal(jogo().tela, 'jogando');
  assert.equal(dom.escondido('tela-fase'), true);

  assert.equal(Mapa.coluna(come().x), m.nascimento.c, 'ele nasce no P do labirinto 2');
  assert.equal(Mapa.linha(come().y), m.nascimento.l);
  assert.equal(jogo().poder.ativo, false, 'nenhum feitico sobrando da fase anterior');
  assert.equal(jogo().ciclo.etapa, 0, 'o relogio dos humores comecou do zero');
});

teste('os quatro comecam na casa do labirinto 2, com as saidas da fase 2', () => {
  const dificuldade = mapa().dificuldade;
  const lista = jogo().fantasmas.lista;
  assert.equal(lista.length, 4);
  assert.equal(lista[0].etapa, 'livre', 'o primeiro ja nasce na rua');
  for (let i = 1; i < lista.length; i++) {
    assert.equal(lista[i].etapa, 'casa');
    assert.equal(lista[i].espera, dificuldade.saidas[i],
      `o fantasma ${i} espera o tempo da fase 2`);
  }
});

// ------------------------------------------------- O labirinto 2 limpo -----
teste('o piloto percorre o labirinto 2 inteiro e o deixa limpo', () => {
  const m = dom.api.mapas[1];
  const decisoes = limparOLabirinto();

  assert.ok(decisoes > 100, `o piloto andou de verdade (${decisoes} decisoes)`);
  assert.equal(faltam(), 0, 'nenhuma pastilha sobrou');
  assert.equal(Pastilhas.limpo(jogo().pastilhas), true);
  assert.equal(dom.texto('hud-faltam'), '0');
  assert.ok(jogo().pontos >= Pastilhas.totalDoLabirinto(m),
    'os pontos das pastilhas todas (mais os fantasmas atropelados)');
});

teste('a ultima pastilha do labirinto 2 fecha a fase 2', () => {
  assert.equal(jogo().tela, 'fase');
  assert.equal(dom.escondido('tela-fase'), false);
  assert.equal(dom.texto('fase-numero'), '2');
  assert.equal(dom.texto('fase-pontos'), String(jogo().pontos));
});

// ------------------------------------------------- O labirinto 3 limpo -----
teste('irParaFase(3) abre o ultimo labirinto, com as pastilhas dele', () => {
  dom.api.irParaFase(3);
  const m = dom.api.mapas[2];

  assert.equal(mapa(), m);
  assert.equal(dom.texto('hud-fase'), '3 / 3');
  assert.equal(faltam(), m.totalPastilhas);
  assert.equal(Mapa.coluna(come().x), m.nascimento.c);
  assert.equal(Mapa.linha(come().y), m.nascimento.l);
  assert.equal(dom.escondido('tela-fase'), true, 'a tela de fim de fase saiu');
});

teste('o piloto percorre o labirinto 3 inteiro e o deixa limpo', () => {
  const decisoes = limparOLabirinto();
  assert.ok(decisoes > 100, `o piloto andou de verdade (${decisoes} decisoes)`);
  assert.equal(faltam(), 0, 'nenhuma pastilha sobrou');
  // O terceiro e o ultimo: limpa-lo fecha a corrida, e quem sobe e o
  // PARABENS, e nao o quadro de fim de fase (a corrida e a fase 6b - quem a
  // confere de ponta a ponta e o `fase6b-tela.test.mjs`).
  assert.equal(jogo().tela, 'parabens');
  assert.equal(dom.escondido('tela-parabens'), false);
});

// ------------------------------------------------- A dificuldade na tela ---
teste('na fase 3 o vermelho anda mais que na fase 1 no mesmo tempo', () => {
  const QUADROS = 320;
  const um = passosDoVermelho(1, QUADROS);
  const dois = passosDoVermelho(2, QUADROS);
  const tres = passosDoVermelho(3, QUADROS);

  assert.equal(um, QUADROS, 'no labirinto 1 ele anda um passo por quadro');
  assert.equal(dois, QUADROS + QUADROS / 16, 'no 2 ele da um passo a mais a cada 16');
  assert.equal(tres, QUADROS + QUADROS / 16, 'no 3 tambem - e ai os quatro correm');
  assert.ok(dois > um && tres > um, 'a pressa da tabela chegou no mundo');
});

teste('na fase 2 so os dois da frente apressam; na 3, os quatro', () => {
  // O azul e o laranja ficam na casa no comeco, entao a conta e feita depois
  // de todo mundo estar solto na rua.
  const passosDeCadaUm = (fase) => {
    const outro = abrirNaFase(fase);
    outro.avancarQuadros(400);                    // todos ja sairam da casa
    const antes = outro.api.jogo.fantasmas.lista.map((f) => f.corpo.passos);
    const soltos = outro.api.jogo.fantasmas.lista.map((f) => f.etapa === 'livre');
    outro.avancarQuadros(160);
    return outro.api.jogo.fantasmas.lista
      .map((f, i) => (soltos[i] && f.etapa === 'livre' ? f.corpo.passos - antes[i] : null));
  };

  const dois = passosDeCadaUm(2);
  const tres = passosDeCadaUm(3);
  [dois, tres].forEach((passos, q) => {
    passos.forEach((p, i) => {
      if (p === null) return;                     // esse foi comido no meio
      const pressa = dom.api.DIFICULDADE[q + 1].pressa[i];
      assert.equal(p, 160 + pressa * 10,
        `o fantasma ${i} da fase ${q + 2} anda com pressa ${pressa}`);
    });
  });
});

teste('o feitico da fase 3 e mais curto que o da fase 1', () => {
  const um = dom.api.mapas[0];
  const tres = dom.api.mapas[2];
  assert.equal(um.duracaoPoder, 8 * 60);
  assert.equal(tres.duracaoPoder, 4 * 60);
  assert.ok(tres.duracaoPoder < um.duracaoPoder);
});

teste('voltar para a fase 1 repoe o labirinto do comeco', () => {
  dom.api.irParaFase(1);
  const m = dom.api.mapas[0];
  assert.equal(mapa(), m);
  assert.equal(faltam(), m.totalPastilhas);
  assert.equal(jogo().pontos, 0);
  assert.equal(dom.texto('hud-fase'), '1 / 3');
  assert.equal(jogo().fantasmas.lista[3].espera, mundo.SAIDAS[3],
    'e com os tempos de saida folgados da fase 1');
  assert.equal(Fantasmas.comPressa(jogo().fantasmas.lista[0], { pressa: 0, quadro: 0 }), false,
    'no labirinto 1 ninguem tem pressa');
});

await fim('Fase 6a (tela)');
