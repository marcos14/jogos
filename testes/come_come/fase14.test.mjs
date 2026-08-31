/* ==========================================================================
   Come-Come - Fase 14: casos de borda do multijogador
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase14.test.mjs

   A sala ja tem placar, ranking e mundo unico. Esta fase testa as quatro
   quebras conhecidas da sala: jogador que sai, anfitriao que cai, pacote velho
   depois do fim e silencio do anfitriao por mais de dois segundos.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const baseJogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

function copia(o) { return JSON.parse(JSON.stringify(o)); }

function salaPara(id, jogadores = baseJogadores) {
  return {
    codigo: 'F14C', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 1414,
    eu: id, souAnfitriao: id === 'ana', anfitriao: 'ana',
    jogadores: jogadores.map((j) => ({ ...j, anfitriao: j.id === 'ana' })),
  };
}

function criarCentral(opcoes = {}) {
  const abas = new Map();
  const jogadores = baseJogadores.map((j) => ({ ...j }));
  const terminados = [];

  function vivos() {
    return jogadores.filter((j) => abas.has(j.id));
  }

  function entregar(destino, origem, d) {
    const aba = abas.get(destino);
    if (aba && aba.rede.ganchos.aoReceber) aba.rede.ganchos.aoReceber({ de: origem, d });
  }

  function emitir(id, nome, dado) {
    const aba = abas.get(id);
    if (!aba) return;
    for (const fn of aba.rede.ouvintes.get(nome) || []) fn(dado);
  }

  function criarPlataforma(id) {
    let ganchos = {};
    const ouvintes = new Map();

    function em(nome, fn) {
      if (!ouvintes.has(nome)) ouvintes.set(nome, []);
      ouvintes.get(nome).push(fn);
      return mj;
    }

    const mj = {
      disponivel: true,
      max: 5,
      em,
      abrirLobby(op) { ganchos = op || {}; return mj; },
      sair() { return mj; },
      enviar(d) {
        for (const j of vivos()) if (j.id !== id) entregar(j.id, id, copia(d));
        return true;
      },
      paraAnfitriao(d) { entregar('ana', id, copia(d)); return true; },
      terminar(placar) {
        terminados.push(copia(placar));
        if (opcoes.emudecerFim) return mj;
        for (const j of vivos()) {
          const aba = abas.get(j.id);
          if (aba && aba.rede.ganchos.aoTerminar) {
            aba.rede.ganchos.aoTerminar({ placar: copia(placar), sala: salaPara(j.id, vivos()) });
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
    return { plataforma, ouvintes, get ganchos() { return ganchos; } };
  }

  return {
    terminados,
    abas,
    async abrirSala() {
      async function abrirAba(id) {
        const rede = criarPlataforma(id);
        const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
        const aba = { id, rede, dom, jogo: dom.api.jogo };
        abas.set(id, aba);
        await dom.api.pronta;
        dom.api.abrirLobby();
        return aba;
      }

      const ana = await abrirAba('ana');
      const bento = await abrirAba('bento');
      const caio = await abrirAba('caio');
      const todas = [ana, bento, caio];
      for (const aba of todas) aba.rede.ganchos.aoComecar(salaPara(aba.id));
      for (const aba of todas) aba.dom.avancarQuadros(1);
      return { ana, bento, caio, todas };
    },
    sair(id) {
      const jogador = jogadores.find((j) => j.id === id);
      abas.delete(id);
      for (const j of vivos()) emitir(j.id, 'saiu', jogador);
    },
    abortar(motivo = 'O anfitriao saiu - a partida foi encerrada.') {
      for (const j of vivos()) {
        const aba = abas.get(j.id);
        if (aba && aba.rede.ganchos.aoAbortar) aba.rede.ganchos.aoAbortar({ motivo, sala: salaPara(j.id, vivos()) });
      }
    },
  };
}

function jogador(aba, id) {
  return aba.jogo.jogadores.find((j) => j.id === id);
}

function linhasDoMini(aba) {
  return aba.dom.elementos['hud-placar'].filhos.map((l) => l.textContent);
}

function encerrarPorVidas(aba) {
  for (const j of aba.jogo.jogadores) {
    j.vidas = 0;
    j.espectador = true;
  }
  aba.jogo.rodada = { vidas: 0, pausa: 1, pego: 0, acabou: true };
  aba.dom.avancarQuadros(1);
}

console.log('Come-Come - fase 14\n');

teste('alguem sai no meio: some do labirinto e do placar, e a partida continua', async () => {
  const central = criarCentral();
  const { ana, bento, caio } = await central.abrirSala();

  jogador(ana, 'bento').pontos = 90;
  ana.dom.api.mandarEstado();
  assert.ok(linhasDoMini(caio).some((l) => l.indexOf('Bento') >= 0), 'Bento estava no placar');

  central.sair('bento');

  for (const aba of [ana, caio]) {
    assert.equal(jogador(aba, 'bento'), undefined, `${aba.id} tirou Bento do mundo`);
    assert.ok(!linhasDoMini(aba).some((l) => l.indexOf('Bento') >= 0), 'e do placar');
    assert.equal(aba.jogo.tela, 'jogando', 'a partida continuou');
  }

  const relogio = ana.jogo.relogio;
  ana.dom.avancarQuadros(6);
  ana.dom.api.mandarEstado();
  assert.ok(ana.jogo.relogio > relogio, 'o mundo da anfitria seguiu andando');
  assert.equal(caio.jogo.jogadores.length, 2, 'o retrato seguinte tambem veio sem Bento');
});

teste('anfitriao cai durante a partida: convidados voltam ao menu com motivo', async () => {
  const central = criarCentral();
  const { bento, caio } = await central.abrirSala();

  central.abortar('A anfitria caiu.');

  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.tela, 'menu', `${aba.id} voltou ao menu`);
    assert.equal(aba.dom.api.rede.sala, null);
    assert.equal(aba.dom.api.rede.papel, 'solo');
    assert.equal(aba.dom.escondido('hud'), true);
    assert.equal(aba.dom.escondido('aviso'), false);
    assert.equal(aba.dom.texto('aviso'), 'A anfitria caiu.');
  }
});

teste('anfitriao cai depois do fim: convidados fecham no ranking local', async () => {
  const central = criarCentral({ emudecerFim: true });
  const { ana, bento, caio } = await central.abrirSala();

  jogador(ana, 'ana').pontos = 30;
  jogador(ana, 'bento').pontos = 140;
  jogador(ana, 'caio').pontos = 70;
  encerrarPorVidas(ana);

  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.tela, 'fim', `${aba.id} aguardava o ranking`);
    assert.equal(aba.dom.texto('fim-subtitulo'), 'Aguardando o ranking da Central...');
  }

  central.abortar('A anfitria caiu.');

  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.tela, 'fim', `${aba.id} continuou na tela de fim`);
    assert.equal(aba.dom.texto('fim-subtitulo'), 'Ranking local da sala.');
    assert.deepEqual(copia(aba.jogo.rankingSala.map((l) => [l.posicao, l.apelido, l.pontos])),
      [[1, 'Bento', 140], [2, 'Caio', 70], [3, 'Ana', 30]]);
    assert.equal(aba.dom.escondido('tela-menu'), true, 'nao voltou para o menu');
  }
});

teste('pacote atrasado depois do fim e descartado em silencio', async () => {
  const central = criarCentral({ emudecerFim: true });
  const { ana, bento } = await central.abrirSala();

  jogador(ana, 'ana').pontos = 10;
  jogador(ana, 'bento').pontos = 20;
  encerrarPorVidas(ana);

  const tela = bento.jogo.tela;
  const fase = bento.jogo.fase;
  const pontos = bento.jogo.pontos;
  const recebidos = bento.dom.api.rede.ultimoRecebido;
  const pacoteVelho = bento.dom.api.Pacote.montar(ana.jogo, recebidos + 99);
  pacoteVelho.f = 3;
  pacoteVelho.j[1][6] = 9999;

  bento.rede.ganchos.aoReceber({ de: 'ana', d: pacoteVelho });

  assert.equal(bento.jogo.tela, tela);
  assert.equal(bento.jogo.fase, fase);
  assert.equal(bento.jogo.pontos, pontos);
  assert.equal(bento.dom.api.rede.ultimoRecebido, recebidos);
});

teste('mais de dois segundos sem estado acende tarja, e o proximo pacote apaga', async () => {
  const central = criarCentral();
  const { ana, bento } = await central.abrirSala();

  ana.dom.api.mandarEstado();
  assert.equal(bento.dom.api.rede.primeiroEstado, true, 'o convidado recebeu o primeiro retrato');

  bento.dom.avancarQuadros(121);
  assert.equal(bento.dom.escondido('aviso'), false, 'a tarja apareceu');
  assert.equal(bento.dom.texto('aviso'), 'Conexão instável');

  ana.dom.api.mandarEstado();
  assert.equal(bento.dom.escondido('aviso'), true, 'o pacote seguinte apagou a tarja');
  assert.equal(bento.dom.api.rede.semNoticias, 0);
});

await fim('Fase 14');
