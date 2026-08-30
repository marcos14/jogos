/* ==========================================================================
   Super Adventure - Fase 10: a previsao local do convidado
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase10.test.mjs

   Duas copias do game.js rodam em VMs separadas, como duas abas: Ana e a
   anfitria (simula o mundo) e Bento e o convidado. Entre as duas mora uma
   Plataforma de mentira COM LATENCIA: cada mensagem fica alguns quadros na
   fila antes de ser entregue, que e o que acontece numa rede de verdade e o
   que faz a previsao local existir.

   O alvo aqui e o conteudo da Fase 10:

     - o convidado anda no quadro em que o dedo aperta, sem esperar o retrato
       do anfitriao, rodando a MESMA `Fisica.passo` da fase 1;
     - quando o retrato chega, a posicao adivinhada e puxada 25% do caminho
       ate a oficial - e converge em poucos pacotes;
     - erro maior que 90px encaixa de uma vez (snap);
     - adivinhar posicao nao e adivinhar pontos: moeda, bloco e vida continuam
       sendo coisa do anfitriao.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
];

const abas = new Map();

/* A rede de mentira: `relogio` conta os quadros do teste e cada mensagem sai
   da fila `atraso` quadros depois de ter sido postada. */
let relogio = 0;
let atraso = 6;
const fila = [];

function salaPara(id) {
  return {
    codigo: 'FA10',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 31337,
    eu: id,
    souAnfitriao: id === 'ana',
    anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function postar(destino, origem, d) {
  fila.push({ em: relogio + atraso, destino, origem, d });
}

/** Entrega tudo o que ja venceu o prazo, na ordem em que foi postado. */
function entregarPendentes() {
  const espera = [];
  const prontos = [];
  for (const m of fila) (m.em <= relogio ? prontos : espera).push(m);
  fila.length = 0;
  for (const m of espera) fila.push(m);
  for (const m of prontos) {
    const aba = abas.get(m.destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: m.origem, d: m.d });
  }
}

/** Joga fora o que ainda estava viajando (para isolar um teste do anterior). */
function limparFila() {
  fila.length = 0;
}

function criarPlataforma(id) {
  let ganchos = {};

  const mj = {
    disponivel: true,
    max: 8,
    em() { return mj; },
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { return mj; },
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
  const dom = carregarJogoComTela('super_adventure', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

function jogador(tab, id) {
  return tab.jogo.jogadores.find((j) => j.id === id);
}

/* Um quadro do mundo inteiro: primeiro chega o que a rede tinha para entregar,
   depois cada aba anda o seu quadro. Devolve o erro anotado a cada retrato que
   o convidado aplicou - e essa lista que conta a historia da convergencia. */
function avancar(quadros, tabs, espiao) {
  const erros = [];
  let aplicados = espiao ? contarPacotes(espiao) : 0;

  for (let i = 0; i < quadros; i++) {
    relogio++;
    entregarPendentes();
    for (const t of tabs) t.dom.avancarQuadros(1);
    if (!espiao) continue;
    const agora = contarPacotes(espiao);
    if (agora > aplicados) erros.push(espiao.dom.api.rede.erro);
    aplicados = agora;
  }
  return erros;
}

function contarPacotes(tab) {
  const r = tab.dom.api.rede;
  return r.correcoes + r.snaps;
}

function soltarTeclas(tab) {
  for (const t of ['ArrowLeft', 'ArrowRight', ' ']) tab.dom.tecla(t, false);
}

console.log('Super Adventure - fase 10\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');

for (const tab of [ana, bento]) tab.rede.ganchos.aoComecar(salaPara(tab.id));

// ---------------------------------------------------------------------------
// 1. A conta da correcao, sem jogo nenhum em volta: so a funcao pura.
// ---------------------------------------------------------------------------
teste('a correcao anda 25% do caminho e guarda o que e do convidado', () => {
  const { Previsao } = bento.dom.api;
  assert.equal(Previsao.medidas.CORRECAO, 0.25, '25% por pacote, como manda a regra');
  assert.equal(Previsao.medidas.ERRO_SNAP, 90, 'acima de 90px e encaixe seco');

  const local = {
    x: 100, y: 200, vx: 3, vy: -4, noChao: false, subida: 40,
    pularPreso: true, direcao: 1, andando: true, apoio: 2,
  };
  const oficial = {
    x: 140, y: 200, vx: 0, vy: 0, noChao: true, subida: 0,
    pularPreso: false, direcao: -1, andando: false, apoio: -1,
  };

  const r = Previsao.corrigir(local, oficial);
  assert.equal(r.snap, false, 'erro de 40px se disfarca');
  assert.equal(Math.round(r.erro), 40);
  assert.equal(r.corpo.x, 110, 'andou um quarto dos 40px');
  assert.equal(r.corpo.y, 200);
  assert.equal(local.x, 100, 'a funcao e pura: o corpo recebido nao mudou');

  // O jeito de andar continua sendo o que o convidado adivinhou - e por isso
  // que o controle nao fica molenga.
  assert.equal(r.corpo.vy, -4, 'a velocidade e a do convidado');
  assert.equal(r.corpo.subida, 40, 'o pulo em andamento segue valendo');
  assert.equal(r.corpo.direcao, 1, 'quem olha para onde e o dedo daqui');
  assert.equal(r.corpo.apoio, 2, 'e a plataforma movel em que ele pisou');
});

teste('erro acima de 90px encaixa de uma vez', () => {
  const { Previsao } = bento.dom.api;
  const local = {
    x: 100, y: 200, vx: 3, vy: 12, noChao: false, subida: 120,
    pularPreso: true, direcao: 1, andando: true, apoio: -1,
  };
  const oficial = {
    x: 100, y: 100, vx: 0, vy: 0, noChao: true, subida: 0,
    pularPreso: false, direcao: -1, andando: false, apoio: 3,
  };

  const r = Previsao.corrigir(local, oficial);
  assert.equal(r.snap, true, '100px de erro nao tem como disfarcar');
  assert.equal(r.erro, 100);
  assert.equal(r.corpo.x, 100);
  assert.equal(r.corpo.y, 100, 'foi parar exatamente onde o anfitriao disse');
  assert.equal(r.corpo.vy, 0, 'e com a queda do anfitriao, nao com a de casa');
  assert.equal(r.corpo.noChao, true);
  assert.equal(r.corpo.apoio, 3);
  // A unica coisa de casa que sobrevive: o dedo que esta na tecla de pular.
  assert.equal(r.corpo.pularPreso, true, 'senao o heroi pularia sozinho');
});

teste('erro de menos de meio pixel encosta de vez', () => {
  const { Previsao } = bento.dom.api;
  const local = {
    x: 100.3, y: 200, vx: 3, vy: 0, noChao: true, subida: 0,
    pularPreso: false, direcao: 1, andando: true, apoio: -1,
  };
  const oficial = { ...local, x: 100 };

  const r = Previsao.corrigir(local, oficial);
  assert.equal(r.snap, false, 'nao e teleporte: e so o resto do arredondamento');
  assert.equal(r.corpo.x, 100, 'encaixou, em vez de arrastar o errinho para sempre');
});

// ---------------------------------------------------------------------------
// 2. O jogo: o convidado anda antes de o pacote chegar.
// ---------------------------------------------------------------------------
teste('o convidado anda no quadro em que aperta, sem esperar o anfitriao', () => {
  limparFila();
  const { Fisica } = bento.dom.api;
  // O primeirissimo quadro do laco so acerta o relogio (dt = 0): a partir do
  // proximo cada `avancarQuadros(1)` e um passo de simulacao de verdade.
  bento.dom.avancarQuadros(1);

  const antes = { ...bento.jogo.heroi };
  const limites = bento.jogo.limites;

  bento.dom.tecla('ArrowRight', true);
  bento.dom.avancarQuadros(1);
  assert.equal(bento.jogo.heroi.x, antes.x + Fisica.medidas.VEL_X,
    'o primeiro quadro ja tirou ele do lugar');

  bento.dom.avancarQuadros(19);
  soltarTeclas(bento);

  // A previsao e a MESMA fisica pura da fase 1, quadro a quadro.
  let esperado = antes;
  for (let i = 0; i < 20; i++) {
    esperado = Fisica.passo(esperado, { esquerda: false, direita: true, pular: false }, limites);
  }
  assert.equal(bento.jogo.heroi.x, esperado.x, 'andou os 60px que a fisica manda');
  assert.equal(bento.jogo.heroi.y, esperado.y, 'e continuou de pe no chao do mapa');
  assert.equal(bento.jogo.heroi.noChao, true);

  limparFila();
});

teste('o convidado nao ganha ponto nem tira moeda por conta propria', () => {
  limparFila();
  const mapa = bento.dom.api.fase;
  const alvo = mapa.moedas.findIndex((m, i) => bento.jogo.itens.moedas[i]);
  assert.ok(alvo >= 0, 'a fase tem moeda viva para o teste');

  const pontos = bento.jogo.eu.pontos;
  bento.jogo.heroi.x = mapa.moedas[alvo].x;
  bento.jogo.heroi.y = mapa.moedas[alvo].y;
  bento.dom.avancarQuadros(3);

  assert.equal(bento.jogo.itens.moedas[alvo], true,
    'a moeda so some quando o anfitriao disser que sumiu');
  assert.equal(bento.jogo.eu.pontos, pontos, 'e o placar tambem e do anfitriao');
  limparFila();
});

// ---------------------------------------------------------------------------
// 3. Com latencia dos dois lados, a previsao converge para o anfitriao.
// ---------------------------------------------------------------------------
teste('com latencia, a previsao converge para o anfitriao em poucos pacotes', () => {
  limparFila();
  atraso = 6;                                  // 6 quadros para cada lado

  // Todo mundo no mesmo ponto de partida antes de medir.
  const partida = { ...jogador(ana, 'bento').corpo };
  bento.jogo.eu.corpo = { ...partida };
  const zerado = bento.dom.api.rede;
  const snaps0 = zerado.snaps;

  bento.dom.tecla('ArrowRight', true);
  const andando = avancar(150, [ana, bento], bento);
  soltarTeclas(bento);
  const parando = avancar(150, [ana, bento], bento);

  const erros = andando.concat(parando);
  assert.ok(erros.length >= 20, `o convidado aplicou ${erros.length} retratos`);
  assert.equal(zerado.snaps, snaps0,
    'com 6 quadros de latencia nada precisou de encaixe seco');

  const maior = Math.max(...erros);
  assert.ok(maior > 10, `o erro chegou a ${maior.toFixed(1)}px - havia o que corrigir`);
  assert.ok(maior < bento.dom.api.Previsao.medidas.ERRO_SNAP,
    `e ficou abaixo dos 90px (maior: ${maior.toFixed(1)}px)`);

  // "Poucos pacotes": do maior erro ate menos de 5px, contando os retratos.
  const pico = erros.indexOf(maior);
  const perto = erros.findIndex((e, i) => i > pico && e < 5);
  assert.ok(perto > pico && perto - pico <= 12,
    `convergiu em ${perto - pico} pacotes depois do pico`);

  const fim = erros[erros.length - 1];
  assert.ok(fim < 1, `parado, o convidado esta em cima do anfitriao (${fim.toFixed(2)}px)`);
  assert.equal(bento.jogo.heroi.x, jogador(ana, 'bento').corpo.x | 0,
    'e no mesmo x que a anfitria simulou');
});

teste('o convidado desenha os OUTROS jogadores como o anfitriao mandou', () => {
  assert.equal(jogador(bento, 'ana').corpo.x, jogador(ana, 'ana').corpo.x | 0,
    'o corpo da anfitria e copiado, nao adivinhado');
  assert.equal(jogador(bento, 'ana').corpo.y, jogador(ana, 'ana').corpo.y | 0);
});

// ---------------------------------------------------------------------------
// 4. Erro grande demais: encaixe seco.
// ---------------------------------------------------------------------------
teste('erro artificial de 200px forca o encaixe no proximo retrato', () => {
  limparFila();
  atraso = 0;                                  // sem espera: um retrato so
  const r = bento.dom.api.rede;
  const snaps0 = r.snaps;
  const correcoes0 = r.correcoes;

  bento.jogo.heroi.x -= 200;                   // um tranco que a rede nao explica
  bento.jogo.heroi.pularPreso = true;          // com o espaco apertado na mao

  ana.dom.api.mandarEstado();
  relogio++;
  entregarPendentes();

  assert.equal(r.snaps, snaps0 + 1, 'o retrato encaixou de uma vez');
  assert.equal(r.correcoes, correcoes0, 'nao foi uma correcao de leve');
  assert.ok(r.erro > 90, `o erro medido foi ${r.erro.toFixed(1)}px`);
  assert.equal(bento.jogo.heroi.x, jogador(ana, 'bento').corpo.x | 0,
    'voltou exatamente para o x do anfitriao');
  assert.equal(bento.jogo.heroi.y, jogador(ana, 'bento').corpo.y | 0);
  assert.equal(bento.jogo.heroi.pularPreso, true,
    'o dedo na tecla continua sendo o de casa');
});

teste('a anfitria nao corrige nada: o mundo dela e o original', () => {
  const r = ana.dom.api.rede;
  assert.equal(r.papel, 'anfitriao');
  assert.equal(r.snaps, 0, 'quem simula o mundo nao adivinha nada');
  assert.equal(r.correcoes, 0);
});

await fim('Fase 10');
