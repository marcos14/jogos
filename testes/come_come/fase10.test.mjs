/* ==========================================================================
   Come-Come - Fase 10: a previsao local do convidado
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase10.test.mjs

   Duas copias do game.js rodam em VMs separadas, como duas abas: Ana e a
   anfitria (simula o labirinto inteiro) e Bento e o convidado. Entre as duas
   mora uma Central de mentira COM LATENCIA: cada mensagem fica alguns quadros
   na fila antes de ser entregue, que e o que acontece numa rede de verdade e
   e a unica razao de a previsao local existir.

   O alvo aqui e o conteudo da fase 10:

     - o convidado dobra a esquina no QUADRO em que a tecla e apertada,
       rodando a mesma `Movimento.passo()` da fase 1 no proprio corpo;
     - quando o retrato chega, a posicao adivinhada e puxada 25% do caminho
       ate a oficial - e chega la em poucos retratos, sem solavanco;
     - um erro grande plantado a mao forca o encaixe seco;
     - a correcao anda em passos INTEIROS da grade: depois dela o come-come
       continua acertando os centros dos quadrados e virando esquinas;
     - adivinhar posicao nao e adivinhar mundo: pastilha, fantasma, ponto e
       vida continuam sendo coisa do anfitriao.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
];

const abas = new Map();
const postados = [];      // tudo o que foi posto na rede, entregue ou nao

/* A rede de mentira: `relogio` conta os quadros do teste e cada mensagem sai
   da fila `atraso` quadros depois de ter sido postada. */
let relogio = 0;
let atraso = 6;
const fila = [];

const TECLA = {
  direita: 'ArrowRight', esquerda: 'ArrowLeft', cima: 'ArrowUp', baixo: 'ArrowDown',
};

function salaPara(id) {
  return {
    codigo: 'FA10', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 4242,
    eu: id, souAnfitriao: id === 'ana', anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function postar(destino, origem, d) {
  postados.push({ em: relogio, de: origem, d });
  fila.push({ em: relogio + atraso, destino, origem, d });
}

/** Entrega tudo o que ja venceu o prazo, na ordem em que foi postado. */
function entregarPendentes() {
  const espera = [], prontos = [];
  for (const m of fila) (m.em <= relogio ? prontos : espera).push(m);
  fila.length = 0;
  for (const m of espera) fila.push(m);
  for (const m of prontos) {
    const aba = abas.get(m.destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: m.origem, d: m.d });
  }
}

/** Joga fora o que ainda estava viajando (para isolar um teste do anterior). */
function limparFila() { fila.length = 0; }

function criarPlataforma(id) {
  let ganchos = {};

  const mj = {
    disponivel: true,
    max: 5,
    em() { return mj; },
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { return mj; },
    terminar() { return mj; },
    enviar(d) {
      for (const j of jogadores) if (j.id !== id) postar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) { postar('ana', id, d); return true; },
  };

  const plataforma = {
    versao: 1,
    perfil: { apelido: id, definirApelido() {} },
    multijogador: mj,
    iniciar() { return Promise.resolve(plataforma); },
  };

  return { plataforma, get ganchos() { return ganchos; } };
}

async function abrirAba(id) {
  const rede = criarPlataforma(id);
  const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

const valor = (o) => JSON.parse(JSON.stringify(o));

function jogador(aba, id) {
  return aba.jogo.jogadores.find((j) => j.id === id);
}

/** Quantos retratos a previsao daquela aba ja teve que acertar. */
function aplicados(aba) {
  const r = aba.dom.api.rede;
  return r.correcoes + r.snaps;
}

/* Um quadro do mundo inteiro: primeiro chega o que a rede tinha para entregar,
   depois cada aba anda o seu quadro. Devolve o erro anotado a cada retrato que
   o convidado aplicou - e essa lista que conta a historia da convergencia.

   `imortal` devolve a rodada da anfitria ao cheio antes de cada quadro: um
   teste sobre PREVISAO nao pode virar um teste sobre fugir de fantasma - o
   tombo congelaria o mundo no meio da medicao. */
function avancar(quadros, tabs, espiao, imortal) {
  const erros = [];
  let contados = espiao ? aplicados(espiao) : 0;

  for (let i = 0; i < quadros; i++) {
    relogio++;
    if (imortal) imortal.jogo.rodada = imortal.dom.api.Rodada.novoEstado();
    entregarPendentes();
    for (const t of tabs) t.dom.avancarQuadros(1);
    if (!espiao) continue;
    const agora = aplicados(espiao);
    if (agora > contados) erros.push(espiao.dom.api.rede.erro);
    contados = agora;
  }
  return erros;
}

console.log('Come-Come - fase 10\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const todas = [ana, bento];

for (const aba of todas) aba.rede.ganchos.aoComecar(salaPara(aba.id));
avancar(2, todas);           // os dois lacos ligados e o relogio acertado

// ---------------------------------------------------------------------------
// 1. A conta da correcao, sem jogo nenhum em volta: so a funcao pura.
// ---------------------------------------------------------------------------
const { Previsao, Movimento, Mapa, mapas } = carregarJogo();
const mapa1 = mapas[0];

/** O primeiro quadrado do labirinto em que os dois eixos abrem. */
function acharCruzamento(mapa, umLado, outroLado) {
  for (let l = 1; l < mapa.linhas - 1; l++) {
    for (let c = 1; c < mapa.colunas - 1; c++) {
      if (!Mapa.livre(mapa, c, l)) continue;
      if (Mapa.podeIr(mapa, c, l, umLado) && Mapa.podeIr(mapa, c, l, outroLado)) return { c, l };
    }
  }
  return null;
}

/** O corredor deitado mais comprido do labirinto: { l, c0, c1 }. */
function corredorMaisComprido(mapa) {
  let melhor = { l: 1, c0: 1, c1: 1 };
  for (let l = 0; l < mapa.linhas; l++) {
    let c0 = -1;
    for (let c = 0; c <= mapa.colunas; c++) {
      const livre = c < mapa.colunas && Mapa.livre(mapa, c, l);
      if (livre && c0 < 0) c0 = c;
      if (!livre && c0 >= 0) {
        if (c - 1 - c0 > melhor.c1 - melhor.c0) melhor = { l: l, c0: c0, c1: c - 1 };
        c0 = -1;
      }
    }
  }
  return melhor;
}

const reta = corredorMaisComprido(mapa1);

teste('a correcao anda 25% do caminho, em passos inteiros da grade', () => {
  assert.equal(Previsao.medidas.CORRECAO, 0.25, '25% por retrato, como manda a regra');
  assert.equal(Previsao.medidas.ERRO_SNAP, 90, 'acima de 90px e encaixe seco');
  assert.equal(Previsao.medidas.GRADE, Movimento.VELOCIDADE,
    'e o passo da correcao e o passo do movimento: 2px');

  const centro = Mapa.centro(reta.c0 + 1, reta.l);
  const local = { x: centro.x + 40, y: centro.y, dir: 'direita', desejada: 'cima', parado: false, passos: 7 };
  const oficial = { x: centro.x, y: centro.y, dir: 'direita', desejada: 'baixo', parado: false, passos: 3 };

  const r = Previsao.corrigir(local, oficial, mapa1);
  assert.equal(r.snap, false, 'erro de 40px no mesmo corredor se disfarca');
  assert.equal(Math.round(r.erro), 40);
  assert.equal(r.corpo.x, local.x - 10, 'andou um quarto dos 40px - e 10 e multiplo de 2');
  assert.equal(r.corpo.y, centro.y, 'o eixo de travessia nao se mexe');
  assert.equal(local.x, centro.x + 40, 'a funcao e pura: o corpo recebido nao mudou');

  // O jeito de andar continua sendo o que o convidado adivinhou - e por isso
  // que o controle nao fica molenga.
  assert.equal(r.corpo.dir, 'direita');
  assert.equal(r.corpo.desejada, 'cima', 'o pedido guardado e o do dedo daqui');
  assert.equal(r.corpo.passos, 7, 'e o relogio da boca tambem');
});

teste('a correcao nunca tira o corpo do trilho de 2 em 2 pixels', () => {
  const centro = Mapa.centro(reta.c0 + 1, reta.l);
  // Um erro de 6px daria 1,5px de correcao - e 1,5px estragaria a grade para
  // sempre: o come-come nunca mais acertaria o centro de um quadrado.
  for (let erro = 2; erro <= 88; erro += 2) {
    const local = { x: centro.x + erro, y: centro.y, dir: 'direita', desejada: null, parado: false, passos: 0 };
    const oficial = { x: centro.x, y: centro.y, dir: 'direita', desejada: null, parado: false, passos: 0 };
    const r = Previsao.corrigir(local, oficial, mapa1);
    assert.equal(r.corpo.x % 2, 0, `erro de ${erro}px deixou o corpo em x=${r.corpo.x}`);
    assert.ok(r.corpo.x <= local.x && r.corpo.x >= oficial.x, 'e sempre entre os dois');
  }

  // E um erro pequeno demais para render um passo encosta de vez, em vez de
  // ficar arrastando o errinho para sempre.
  const perto = { x: centro.x + 2, y: centro.y, dir: 'direita', desejada: null, parado: false, passos: 0 };
  const oficial = { x: centro.x, y: centro.y, dir: 'direita', desejada: null, parado: false, passos: 0 };
  const r = Previsao.corrigir(perto, oficial, mapa1);
  assert.equal(r.corpo.x, centro.x, 'encostou');
  assert.equal(r.snap, false, 'e sem tranco nenhum: sao dois pixels');
});

teste('erro acima de 90px encaixa de uma vez', () => {
  const centro = Mapa.centro(reta.c0 + 1, reta.l);
  const local = { x: centro.x, y: centro.y, dir: 'direita', desejada: 'cima', parado: false, passos: 9 };
  const oficial = { x: centro.x, y: centro.y + 96, dir: 'esquerda', desejada: 'baixo', parado: true, passos: 1 };

  const r = Previsao.corrigir(local, oficial, mapa1);
  assert.equal(r.snap, true, '96px de erro nao tem como disfarcar');
  assert.equal(r.erro, 96);
  assert.equal(r.corpo.x, oficial.x);
  assert.equal(r.corpo.y, oficial.y, 'foi parar exatamente onde o anfitriao disse');
  assert.equal(r.corpo.dir, 'esquerda', 'e virado para onde o anfitriao disse');
  assert.equal(r.corpo.parado, true);
  // A unica coisa de casa que sobrevive ao encaixe: o dedo que esta na tecla.
  assert.equal(r.corpo.desejada, 'cima', 'senao a curva pedida agora se perderia');
});

teste('corredor diferente encaixa de uma vez: nao existe meio caminho', () => {
  const cruz = acharCruzamento(mapa1, 'direita', 'cima');
  assert.ok(cruz, 'o labirinto 1 tem cruzamento para o teste');
  const centro = Mapa.centro(cruz.c, cruz.l);

  // O convidado ja dobrou a esquina (subiu 8px); o anfitriao ainda vem vindo
  // pela horizontal. Puxar 25% na diagonal poria o come-come na parede.
  const local = { x: centro.x, y: centro.y - 8, dir: 'cima', desejada: 'cima', parado: false, passos: 4 };
  const oficial = { x: centro.x - 12, y: centro.y, dir: 'direita', desejada: 'cima', parado: false, passos: 2 };

  const r = Previsao.corrigir(local, oficial, mapa1);
  assert.ok(r.erro < Previsao.medidas.ERRO_SNAP, 'o erro e pequeno...');
  assert.equal(r.snap, true, '...mas os dois estao em corredores que se cruzam');
  assert.equal(r.corpo.x, oficial.x);
  assert.equal(r.corpo.y, oficial.y);

  assert.equal(Previsao.mesmoTrilho(local, mapa1, -12, 8), false,
    'e e isso que `mesmoTrilho` responde');
});

teste('parede no meio do caminho tambem encaixa', () => {
  // Dois pedacos de corredor na mesma linha, separados por parede: a distancia
  // em linha reta e curta, mas nao existe reta entre eles.
  let a = null, b = null;
  for (let l = 1; l < mapa1.linhas - 1 && !a; l++) {
    for (let c = 1; c < mapa1.colunas - 2 && !a; c++) {
      if (Mapa.livre(mapa1, c, l) && Mapa.parede(mapa1, c + 1, l) && Mapa.livre(mapa1, c + 2, l)) {
        a = { c: c, l: l };
        b = { c: c + 2, l: l };
      }
    }
  }
  assert.ok(a, 'o labirinto tem dois corredores separados por parede na mesma linha');

  const local = { ...Mapa.centro(a.c, a.l), dir: 'direita', desejada: null, parado: false, passos: 0 };
  const oficial = { ...Mapa.centro(b.c, b.l), dir: 'direita', desejada: null, parado: false, passos: 0 };
  const r = Previsao.corrigir(local, oficial, mapa1);
  assert.equal(r.snap, true, 'com parede no meio, so o encaixe seco e honesto');
});

teste('a volta do tunel nao vira um erro de labirinto inteiro', () => {
  const linhaTunel = mapa1.grade.findIndex((linha) => linha.charAt(0) === 'T');
  assert.ok(linhaTunel >= 0, 'o labirinto 1 tem tunel');

  // Um saiu pela ponta da direita e entrou pela esquerda; o outro ainda nao.
  const local = { x: 2, y: linhaTunel * 16 + 8, dir: 'direita', desejada: null, parado: false, passos: 0 };
  const oficial = { x: mapa1.largura - 2, y: local.y, dir: 'direita', desejada: null, parado: false, passos: 0 };

  const erro = Previsao.erroEntre(local, oficial, mapa1.largura);
  assert.equal(erro, 4, 'estao a quatro pixels um do outro, e nao a 444');
  const r = Previsao.corrigir(local, oficial, mapa1);
  assert.equal(r.snap, false, 'entao nao ha encaixe nenhum');
  assert.ok(r.corpo.x >= 0 && r.corpo.x < mapa1.largura, 'e a correcao continua dentro do mapa');
});

// ---------------------------------------------------------------------------
// 2. O jogo: o convidado dobra a esquina no quadro em que a tecla e apertada.
// ---------------------------------------------------------------------------
teste('o convidado vira no quadro da tecla, sem esperar o anfitriao', () => {
  limparFila();
  const cruz = acharCruzamento(bento.dom.api.labirinto, 'direita', 'cima');
  const antesDeTudo = aplicados(bento);

  bento.jogo.come = bento.dom.api.Movimento.novoCorpo(cruz.c, cruz.l, 'direita');
  const partida = valor(bento.jogo.come);

  bento.dom.tecla('ArrowUp');
  bento.dom.avancarQuadros(1);          // UM quadro, e nenhum pacote entregue

  assert.equal(bento.jogo.come.dir, 'cima', 'a curva aconteceu no mesmo quadro');
  assert.equal(bento.jogo.come.y, partida.y - Movimento.VELOCIDADE, 'e ele ja subiu 2px');
  assert.equal(bento.jogo.come.x, partida.x, 'sem sair do meio do corredor');
  assert.equal(aplicados(bento), antesDeTudo, 'e nada disso veio de retrato nenhum');

  // A mesma conta que o anfitriao vai rodar, quadro a quadro: e a MESMA funcao.
  const esperado = Movimento.passo({ ...partida, desejada: 'cima' }, bento.dom.api.labirinto);
  assert.deepEqual(valor(bento.jogo.come), valor(esperado),
    'a previsao e o `Movimento.passo()` de sempre, sem atalho nenhum');
});

teste('a direcao nova sobe na hora, sem esperar a batida da taxa', () => {
  limparFila();
  const meus = () => postados.filter((p) => p.de === 'bento');
  const antes = meus().length;

  bento.dom.tecla('ArrowLeft');
  // A batida da taxa e de tres em tres quadros (20 pacotes por segundo num
  // relogio de 60). O pedido novo nao espera por ela: sobe no primeiro quadro
  // em que a folga de dois deixa.
  let quadros = 0;
  while (meus().length === antes && quadros < 6) {
    relogio++;
    bento.dom.avancarQuadros(1);
    quadros++;
  }
  assert.ok(quadros > 0 && quadros <= 2, `o pedido subiu em ${quadros} quadro(s)`);
  assert.equal(meus().length, antes + 1, 'e foi um pacote so');
  assert.equal(bento.dom.api.Pacote.direcaoDe(meus()[meus().length - 1].d.d), 'esquerda',
    'com a direcao nova dentro');

  // Sem direcao nova, quem manda e a taxa: nada sobe nos dois quadros
  // seguintes ao pacote que acabou de sair.
  const marco = meus().length;
  for (let i = 0; i < 2; i++) { relogio++; bento.dom.avancarQuadros(1); }
  assert.equal(meus().length, marco,
    'repetir a mesma direcao nao vira pacote fora de hora');
});

teste('o convidado nao come pastilha nem ganha ponto por conta propria', () => {
  limparFila();
  const mapaB = bento.dom.api.labirinto;
  const alvo = mapaB.pastilhas.findIndex((p, i) => bento.jogo.pastilhas.restam[i]);
  assert.ok(alvo >= 0, 'o labirinto ainda tem pastilha de pe para o teste');

  const pontos = bento.jogo.pontos;
  const faltam = bento.jogo.pastilhas.faltam;
  bento.jogo.come = { ...bento.jogo.come, x: mapaB.pastilhas[alvo].x, y: mapaB.pastilhas[alvo].y };
  bento.dom.avancarQuadros(3);

  assert.equal(bento.jogo.pastilhas.restam[alvo], true,
    'a pastilha so some quando o anfitriao disser que sumiu');
  assert.equal(bento.jogo.pontos, pontos, 'e o placar tambem e do anfitriao');
  assert.equal(bento.jogo.pastilhas.faltam, faltam);
});

// ---------------------------------------------------------------------------
// 3. Com latencia dos dois lados, a previsao converge para o anfitriao.
// ---------------------------------------------------------------------------
teste('com latencia, o erro encolhe sem solavanco em poucos retratos', () => {
  limparFila();
  atraso = 6;                                   // 6 quadros para cada lado

  const mapaB = bento.dom.api.labirinto;
  const linhaReta = corredorMaisComprido(mapaB);
  assert.ok(linhaReta.c1 - linhaReta.c0 >= 8, 'ha corredor comprido para a medicao');

  // Os dois no mesmo corredor, indo para o mesmo lado - so que o convidado ja
  // esta 40px a frente, que e o erro a ser desfeito.
  const oficial = Movimento.novoCorpo(linhaReta.c0 + 1, linhaReta.l, 'direita');
  jogador(ana, 'bento').corpo = { ...oficial };
  jogador(ana, 'bento').entrada.desejada = 'direita';
  bento.jogo.come = { ...oficial, x: oficial.x + 40 };
  bento.dom.tecla('ArrowRight');

  const r = bento.dom.api.rede;
  const snaps0 = r.snaps;

  const erros = avancar(45, todas, bento, ana);

  assert.ok(erros.length >= 8, `o convidado aplicou ${erros.length} retratos`);
  assert.equal(r.snaps, snaps0, 'e nenhum deles precisou de encaixe seco');

  const maior = Math.max(...erros);
  assert.ok(maior >= 30, `o erro medido chegou a ${maior}px - havia o que corrigir`);
  assert.ok(maior < Previsao.medidas.ERRO_SNAP, 'e ficou abaixo dos 90px');

  // "Sem solavanco": nenhum retrato mexeu o come-come mais do que 25% do erro
  // que havia, e o erro so anda para baixo.
  for (let i = 1; i < erros.length; i++) {
    assert.ok(erros[i] <= erros[i - 1], `o erro nao voltou a crescer (${erros.join(' -> ')})`);
    /* Cada retrato anda no maximo um quarto do erro - ou os poucos pixels de
       "encostar de vez", quando o quarto ja nao chega a um passo da grade. */
    assert.ok(erros[i - 1] - erros[i] <= Math.max(2 * Previsao.medidas.GRADE, erros[i - 1] * 0.25 + 2),
      `o tranco de ${erros[i - 1]} para ${erros[i]} coube nos 25%`);
  }

  const ultimo = erros[erros.length - 1];
  assert.equal(ultimo, 0, `no fim o retrato bate certinho (${erros.join(' -> ')})`);
  assert.ok(erros.indexOf(0) <= 12, 'e chegou la em poucos retratos');

  /* O que sobra depois disso e a IDADE do retrato: a previsao acerta o que o
     anfitriao MANDOU, e o que ele mandou tem sempre alguns quadros de estrada.
     Aqui sao seis quadros de latencia - doze pixels de corredor; na rede de
     casa, que e onde este jogo roda, e um ou dois. */
  const sobra = Math.abs(jogador(ana, 'bento').corpo.x - bento.jogo.come.x);
  assert.ok(sobra <= atraso * Movimento.VELOCIDADE,
    `sobrou a idade do retrato: ${sobra}px do que a anfitria simula agora`);
  assert.equal(bento.jogo.come.y, jogador(ana, 'bento').corpo.y,
    'e no meio do mesmo corredor');
});

teste('depois da correcao ele continua na grade, virando esquinas', () => {
  assert.equal(bento.jogo.come.x % 2, 0, 'o corpo ficou no trilho de 2 em 2 pixels');
  assert.equal(bento.jogo.come.y % 2, 0);

  // A prova de fogo: uma curva. Se a correcao tivesse deixado meio pixel para
  // tras, o come-come nunca mais acertaria o centro de um quadrado e nunca
  // mais viraria.
  limparFila();
  const mapaB = bento.dom.api.labirinto;
  const M = bento.dom.api.Mapa;
  let dir = null;
  for (let i = 0; i < 40 && !dir; i++) {
    const c = M.coluna(bento.jogo.come.x), l = M.linha(bento.jogo.come.y);
    const saidas = M.saidas(mapaB, c, l).filter((d) => d === 'cima' || d === 'baixo');
    if (saidas.length && M.centro(c, l).x === bento.jogo.come.x) dir = saidas[0];
    else { relogio++; bento.dom.avancarQuadros(1); }
  }
  assert.ok(dir, 'achou uma esquina no caminho');

  bento.dom.tecla(TECLA[dir]);
  bento.dom.avancarQuadros(1);
  assert.equal(bento.jogo.come.dir, dir, 'e virou nela, na primeira tentativa');
});

teste('os outros come-comes e os fantasmas ele so desenha', () => {
  limparFila();
  atraso = 0;
  ana.dom.api.mandarEstado();
  relogio++;
  entregarPendentes();

  assert.equal(jogador(bento, 'ana').corpo.x, jogador(ana, 'ana').corpo.x | 0,
    'o corpo da anfitria e copiado, nao adivinhado');
  assert.equal(jogador(bento, 'ana').corpo.y, jogador(ana, 'ana').corpo.y | 0);

  const meus = valor(bento.jogo.fantasmas.lista).map((f) => [f.corpo.x, f.corpo.y, f.etapa]);
  const dela = valor(ana.jogo.fantasmas.lista).map((f) => [f.corpo.x | 0, f.corpo.y | 0, f.etapa]);
  assert.deepEqual(meus, dela, 'e os quatro fantasmas tambem');

  const antes = valor(bento.jogo.fantasmas.lista).map((f) => f.corpo.x);
  bento.dom.avancarQuadros(20);        // sem pacote nenhum
  assert.deepEqual(valor(bento.jogo.fantasmas.lista).map((f) => f.corpo.x), antes,
    'sem retrato eles nao andam: o convidado nao os simula');
});

// ---------------------------------------------------------------------------
// 4. Erro grande demais: encaixe seco.
// ---------------------------------------------------------------------------
teste('erro plantado de quase 100px forca o encaixe no proximo retrato', () => {
  limparFila();
  atraso = 0;                                   // sem espera: um retrato so
  const r = bento.dom.api.rede;
  const snaps0 = r.snaps, correcoes0 = r.correcoes;

  const oficial = valor(jogador(ana, 'bento').corpo);
  const longe = oficial.y > 160 ? -96 : 96;     // um tranco que a rede nao explica
  bento.jogo.come = { ...oficial, y: oficial.y + longe, desejada: 'cima' };

  ana.dom.api.mandarEstado();
  relogio++;
  entregarPendentes();

  assert.equal(r.snaps, snaps0 + 1, 'o retrato encaixou de uma vez');
  assert.equal(r.correcoes, correcoes0, 'nao foi uma correcao de leve');
  assert.ok(r.erro > Previsao.medidas.ERRO_SNAP, `o erro medido foi ${r.erro}px`);
  assert.equal(bento.jogo.come.y, jogador(ana, 'bento').corpo.y | 0,
    'voltou exatamente para onde a anfitria disse');
  assert.equal(bento.jogo.come.x, jogador(ana, 'bento').corpo.x | 0);
  assert.equal(bento.jogo.come.desejada, 'cima',
    'e o pedido de direcao continua sendo o do dedo daqui');
});

teste('a anfitria nao corrige nada: o mundo dela e o original', () => {
  const r = ana.dom.api.rede;
  assert.equal(r.papel, 'anfitriao');
  assert.equal(r.snaps, 0, 'quem simula o mundo nao adivinha nada');
  assert.equal(r.correcoes, 0);
  assert.equal(r.erro, 0);
});

// ---------------------------------------------------------------------------
// 5. E o jogo de um jogador so nao ficou sabendo de nada disso.
// ---------------------------------------------------------------------------
teste('sozinho, nada de previsao: o mundo anda inteiro no proprio aparelho', async () => {
  const dom = carregarJogoComTela('come_come');
  await Promise.resolve();
  dom.comecarPartida('Duda');
  dom.avancarQuadros(30);

  assert.equal(dom.api.rede.papel, 'solo');
  assert.equal(dom.api.rede.correcoes, 0, 'nao ha retrato para corrigir');
  assert.equal(dom.api.rede.snaps, 0);
  assert.ok(dom.api.jogo.relogio > 0, 'e o mundo anda sem Central nenhuma');
  assert.ok(dom.api.jogo.fantasmas.lista.some((f) => f.corpo.passos > 0),
    'com os fantasmas andando de verdade');
});

await fim('Fase 10');
