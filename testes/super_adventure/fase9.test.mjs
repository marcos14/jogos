/* ==========================================================================
   Super Adventure - Fase 9: anfitriao simula o mundo da sala inteira
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase9.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas. Em vez de
   abrir WebSocket de verdade, este teste usa uma Plataforma minima em memoria:
   `enviar()` entrega o pacote do anfitriao aos convidados, e
   `paraAnfitriao()` entrega as teclas dos convidados ao anfitriao.

   O alvo aqui e o conteudo da Fase 9: mundo unico, comandos subindo para o
   anfitriao, estado compacto descendo para os convidados e cores vindas da
   sala. A previsao local do convidado - o que ele faz ENQUANTO o pacote nao
   chega - e o assunto do fase10.test.mjs.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

const pacotes = [];
const abas = new Map();

function salaPara(id) {
  return {
    codigo: 'F9A1',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 90210,
    eu: id,
    souAnfitriao: id === 'ana',
    anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function criarPlataforma(id) {
  const ouvintes = new Map();
  let ganchos = {};

  function em(nome, fn) {
    if (!ouvintes.has(nome)) ouvintes.set(nome, []);
    ouvintes.get(nome).push(fn);
    return mj;
  }

  function entregar(destino, origem, d) {
    const aba = abas.get(destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: origem, d });
  }

  const mj = {
    disponivel: true,
    max: 8,
    em,
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { return mj; },
    enviar(d) {
      pacotes.push({ de: id, para: 'outros', d, bytes: JSON.stringify(d).length });
      for (const j of jogadores) if (j.id !== id) entregar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) {
      pacotes.push({ de: id, para: 'anfitriao', d, bytes: JSON.stringify(d).length });
      entregar('ana', id, d);
      return true;
    },
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

function iniciarSala(tab) {
  tab.rede.ganchos.aoComecar(salaPara(tab.id));
}

function jogador(tab, id) {
  return tab.jogo.jogadores.find((j) => j.id === id);
}

function valor(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function pacoteMundo(tab) {
  const p = tab.dom.api.Pacote.montar(tab.jogo, 999);
  delete p.n;
  return valor(p);
}

function avancarTodos(quadros, ordem) {
  for (let i = 0; i < quadros; i++) {
    for (const tab of ordem) tab.dom.avancarQuadros(1);
  }
}

console.log('Super Adventure - fase 9\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');

for (const tab of [ana, bento, caio]) iniciarSala(tab);

teste('a sala vira uma lista de jogadores com as cores da plataforma', () => {
  for (const tab of [ana, bento, caio]) {
    assert.equal(tab.jogo.jogadores.length, 3, `${tab.id} ve os tres jogadores`);
    assert.deepEqual(valor(tab.jogo.jogadores.map((j) => j.id)), ['ana', 'bento', 'caio']);
    assert.deepEqual(valor(tab.jogo.jogadores.map((j) => j.cor)), jogadores.map((j) => j.cor));
    assert.equal(tab.jogo.eu.id, tab.id, 'o heroi local e o jogador certo');
  }

  ana.dom.avancarQuadros(1);
  for (const cor of jogadores.map((j) => j.cor)) {
    assert.ok(ana.dom.pintados.some((p) => p.cor === cor), `a cor ${cor} apareceu no canvas`);
  }
});

teste('o convidado manda comandos e o anfitriao passa a andar com eles', () => {
  bento.dom.tecla('ArrowRight', true);
  bento.dom.avancarQuadros(18);

  const entradaRecebida = pacotes.find((p) => p.de === 'bento' && p.para === 'anfitriao' &&
    p.d.k === 'i' && p.d.d === 1);
  assert.ok(entradaRecebida, 'as teclas subiram para o anfitriao');
  assert.equal(jogador(ana, 'bento').entrada.direita, true,
    'o anfitriao guardou a entrada do convidado');
});

teste('o anfitriao simula o corpo do convidado dentro do mesmo mundo', () => {
  const x0 = jogador(ana, 'bento').corpo.x;

  avancarTodos(36, [ana, bento, caio]);
  bento.dom.tecla('ArrowRight', false);
  avancarTodos(6, [ana, bento, caio]);

  assert.ok(jogador(ana, 'bento').corpo.x > x0,
    'Bento andou na simulacao da anfitria');
  assert.equal(jogador(ana, 'ana').corpo.x, ana.jogo.heroi.x,
    'a anfitria tambem esta na mesma lista simulada');
});

teste('o estado completo do anfitriao chega igual aos convidados', () => {
  ana.dom.api.mandarEstado();           // forca um retrato fresco para comparar

  assert.deepEqual(pacoteMundo(bento), pacoteMundo(ana),
    'Bento copiou jogadores, moedas, blocos, inimigos e plataformas');
  assert.deepEqual(pacoteMundo(caio), pacoteMundo(ana),
    'Caio copiou o mesmo mundo');
});

teste('moedas e placares do pacote sao do mesmo mundo compartilhado', () => {
  const moeda = ana.dom.api.fase.moedas.find((m, i) => ana.jogo.itens.moedas[i]);
  assert.ok(moeda, 'a fase tem moeda viva para o teste');

  const a = jogador(ana, 'ana');
  a.corpo.x = moeda.x;
  a.corpo.y = moeda.y;
  ana.dom.avancarQuadros(1);
  ana.dom.api.mandarEstado();

  assert.equal(jogador(ana, 'ana').pontos, 10, 'a anfitria pontuou pela moeda');
  assert.equal(jogador(bento, 'ana').pontos, 10, 'Bento ve o placar da anfitria');
  assert.equal(jogador(caio, 'ana').pontos, 10, 'Caio ve o mesmo placar');
  assert.deepEqual(valor(bento.jogo.itens.moedas), valor(ana.jogo.itens.moedas),
    'Bento ve a mesma lista de moedas vivas');
  assert.deepEqual(valor(caio.jogo.itens.moedas), valor(ana.jogo.itens.moedas),
    'Caio ve a mesma lista de moedas vivas');
});

teste('os pacotes ficam dentro dos limites da plataforma', () => {
  const estados = pacotes.filter((p) => p.d.k === 'e');
  const entradas = pacotes.filter((p) => p.d.k === 'i');
  assert.ok(estados.length > 0, 'o anfitriao mandou retratos do mundo');
  assert.ok(entradas.length > 0, 'os convidados mandaram entradas');

  const maior = Math.max(...pacotes.map((p) => p.bytes));
  assert.ok(maior < 64 * 1024, `maior pacote tem ${maior} bytes`);

  const porJogador = new Map();
  for (const p of pacotes) porJogador.set(p.de, (porJogador.get(p.de) || 0) + 1);
  for (const [id, total] of porJogador) {
    assert.ok(total <= 90, `${id} mandou ${total} mensagens no segundo simulado`);
  }
});

await fim('Fase 9');
