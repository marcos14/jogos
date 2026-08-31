/* ==========================================================================
   Come-Come - Fase 13: HUD multijogador e ranking final
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase13.test.mjs

   O mundo unico ja existe. Esta fase cuida de como a sala enxerga o placar:
   mini-lista no HUD durante a partida, ranking final igual para todo mundo,
   empate com o mesmo lugar e fallback local quando a Central nao confirma o
   encerramento.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

function valor(o) { return JSON.parse(JSON.stringify(o)); }

function salaPara(id) {
  return {
    codigo: 'F13C', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 1313,
    eu: id, souAnfitriao: id === 'ana', anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function criarPlataforma(id, abas, opcoes = {}) {
  let ganchos = {};
  const terminados = [];

  function entregar(destino, origem, d) {
    const aba = abas.get(destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: origem, d });
  }

  const mj = {
    disponivel: true,
    max: 5,
    em() { return mj; },
    abrirLobby(op) { ganchos = op || {}; return mj; },
    sair() { return mj; },
    enviar(d) {
      for (const j of jogadores) if (j.id !== id) entregar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) { entregar('ana', id, d); return true; },
    terminar(placar) {
      terminados.push(valor(placar));
      if (opcoes.emudecerFim) return mj;
      for (const j of jogadores) {
        const aba = abas.get(j.id);
        if (aba && aba.ganchos.aoTerminar) {
          aba.ganchos.aoTerminar({ placar: valor(placar), sala: salaPara(j.id) });
        }
      }
      return mj;
    },
  };

  const plataforma = {
    versao: 1,
    perfil: { apelido: id, definirApelido() {} },
    multijogador: mj,
    iniciar() { return Promise.resolve(plataforma); },
  };
  return { plataforma, terminados, get ganchos() { return ganchos; } };
}

async function abrirSala(opcoes = {}) {
  const abas = new Map();

  async function abrirAba(id) {
    const rede = criarPlataforma(id, abas, opcoes);
    const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
    abas.set(id, rede);
    await dom.api.pronta;
    dom.api.abrirLobby();
    return { id, rede, dom, jogo: dom.api.jogo };
  }

  const ana = await abrirAba('ana');
  const bento = await abrirAba('bento');
  const caio = await abrirAba('caio');
  const todas = [ana, bento, caio];

  for (const aba of todas) aba.rede.ganchos.aoComecar(salaPara(aba.id));
  for (const aba of todas) aba.dom.avancarQuadros(1);
  return { ana, bento, caio, todas };
}

function jogador(aba, id) {
  return aba.jogo.jogadores.find((j) => j.id === id);
}

function darPontos(aba, pontos) {
  for (const id of Object.keys(pontos)) jogador(aba, id).pontos = pontos[id];
}

function linhasDoMini(aba) {
  return aba.dom.elementos['hud-placar'].filhos.map((l) => l.textContent);
}

function linhaMinha(aba) {
  return aba.dom.elementos['fim-ranking'].filhos.find((l) => l.textContent.indexOf('(você)') >= 0);
}

function encerrarPorVidas(aba) {
  for (const j of aba.jogo.jogadores) {
    j.vidas = 0;
    j.espectador = true;
  }
  aba.jogo.rodada = { vidas: 0, pausa: 1, pego: 0, acabou: true };
  aba.dom.avancarQuadros(1);
}

console.log('Come-Come - fase 13\n');

teste('Placar ordena, empata no mesmo lugar e monta o formato do terminar()', () => {
  const { Placar } = carregarJogo();
  const r = Placar.ranking([
    { indice: 2, apelido: 'Caio', cor: '#6844fc', pontos: 90 },
    { indice: 0, apelido: 'Ana', cor: '#d82800', pontos: 120 },
    { indice: 1, apelido: 'Bento', cor: '#00a800', pontos: 120 },
    { indice: 3, apelido: 'Dani', cor: '#ffffff', pontos: 10 },
  ]);

  assert.deepEqual(valor(r.map((l) => l.apelido)), ['Ana', 'Bento', 'Caio', 'Dani']);
  assert.deepEqual(valor(r.map((l) => l.posicao)), [1, 1, 3, 4]);
  assert.deepEqual(valor(r.map((l) => l.medalha)), ['🥇', '🥇', '🥉', '4º']);

  const viaja = Placar.paraTerminar(r);
  assert.deepEqual(valor(viaja[0]), [1, 0, 120, 'Ana', '#d82800']);
  assert.deepEqual(valor(Placar.doTerminar(viaja).map((l) => [l.posicao, l.indice, l.pontos])),
    [[1, 0, 120], [1, 1, 120], [3, 2, 90], [4, 3, 10]]);
});

teste('o mini-placar aparece em grupo, reordena e sobrevive a troca de fase', async () => {
  const { ana, bento, caio, todas } = await abrirSala();
  for (const aba of todas) {
    assert.equal(aba.dom.escondido('hud-placar'), false, `${aba.id} ve o placar da sala`);
    assert.deepEqual(linhasDoMini(aba).map((t) => t.replace(/\d+$/g, '')),
      ['1º Ana', '1º Bento', '1º Caio']);
  }

  darPontos(ana, { ana: 30, bento: 90, caio: 90 });
  ana.dom.api.mandarEstado();
  for (const aba of todas) aba.dom.avancarQuadros(1);

  for (const aba of todas) {
    const linhas = linhasDoMini(aba);
    assert.ok(linhas[0].indexOf('Bento') >= 0, 'Bento passa na frente pelo indice menor no empate');
    assert.ok(linhas[1].indexOf('Caio') >= 0, 'Caio fica no mesmo primeiro lugar');
    assert.ok(linhas[2].indexOf('Ana') >= 0, 'Ana caiu para terceiro');
  }

  ana.dom.api.irParaFase(2);
  ana.dom.api.mandarEstado();
  for (const aba of [bento, caio]) aba.dom.avancarQuadros(1);

  for (const aba of todas) {
    assert.equal(aba.jogo.fase, 2, `${aba.id} virou a fase`);
    assert.equal(aba.dom.escondido('hud-placar'), false, 'e a mini-lista continuou no HUD');
    assert.ok(linhasDoMini(aba)[0].indexOf('Bento') >= 0, 'com a mesma ordem');
  }
});

teste('o ranking confirmado pela Central sai igual nas tres telas e marca cada aparelho', async () => {
  const { ana, bento, caio, todas } = await abrirSala();
  darPontos(ana, { ana: 50, bento: 120, caio: 120 });

  encerrarPorVidas(ana);

  assert.equal(ana.rede.terminados.length, 1, 'a anfitria chamou terminar(placar)');
  assert.deepEqual(ana.rede.terminados[0].map((l) => l.slice(0, 3)),
    [[1, 1, 120], [1, 2, 120], [3, 0, 50]]);

  const ranking = valor(ana.jogo.rankingSala);
  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'fim', `${aba.id} chegou ao fim da sala`);
    assert.equal(aba.dom.escondido('fim-ranking'), false, 'o ranking esta visivel');
    assert.equal(aba.dom.texto('fim-subtitulo'), 'Ranking confirmado pela Central.');
    assert.deepEqual(valor(aba.jogo.rankingSala), ranking, 'o ranking de dados e o mesmo');

    const minha = linhaMinha(aba);
    assert.ok(minha, `${aba.id} marcou a propria linha`);
    assert.ok(minha.textContent.indexOf(jogador(aba, aba.id).apelido) >= 0);
  }
});

teste('sem confirmacao da Central, todos caem no ranking local depois de 3 segundos', async () => {
  const { ana, bento, caio, todas } = await abrirSala({ emudecerFim: true });
  darPontos(ana, { ana: 80, bento: 10, caio: 80 });

  encerrarPorVidas(ana);
  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'fim', `${aba.id} parou no fim da sala`);
    assert.equal(aba.dom.texto('fim-subtitulo'), 'Aguardando o ranking da Central...');
  }

  for (const aba of todas) aba.dom.avancarQuadros(181);

  const ranking = valor(ana.jogo.rankingSala);
  for (const aba of todas) {
    assert.equal(aba.dom.texto('fim-subtitulo'), 'Ranking local da sala.');
    assert.deepEqual(valor(aba.jogo.rankingSala), ranking,
      'mesmo sem a Central, todos usam o ultimo placar recebido');
    assert.equal(aba.jogo.rankingSala[0].posicao, 1);
    assert.equal(aba.jogo.rankingSala[1].posicao, 1);
    assert.equal(aba.jogo.rankingSala[2].posicao, 3);
  }
});

teste('sozinho nao aparece mini-placar nem ranking da sala', async () => {
  const dom = carregarJogoComTela('come_come');
  await Promise.resolve();
  dom.comecarPartida('Duda');
  dom.avancarQuadros(1);

  assert.equal(dom.escondido('hud-placar'), true);
  dom.api.jogo.rodada = { vidas: 0, pausa: 1, pego: 0, acabou: true };
  dom.avancarQuadros(1);
  assert.equal(dom.api.jogo.tela, 'fim');
  assert.equal(dom.escondido('fim-ranking'), true);
  assert.equal(dom.escondido('fim-placar-solo'), false);
});

await fim('Fase 13');
