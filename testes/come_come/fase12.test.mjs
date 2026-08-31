/* ==========================================================================
   Come-Come - Fase 12: regras da sala e espectador
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase12.test.mjs

   Aqui a sala ja tem um mundo unico. O alvo agora e a regra social desse
   mundo: o grupo limpa o labirinto junto, quem zera as vidas sai do tabuleiro
   ate a proxima fase, e so o anfitriao vira a pagina da sala.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

function salaPara(id) {
  return {
    codigo: 'F12C', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 1212,
    eu: id, souAnfitriao: id === 'ana', anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function criarPlataforma(id, abas) {
  let ganchos = {};

  function entregar(destino, origem, d) {
    const aba = abas.get(destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: origem, d });
  }

  const mj = {
    disponivel: true,
    max: 5,
    em() { return mj; },
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { return mj; },
    terminar() { return mj; },
    enviar(d) {
      for (const j of jogadores) if (j.id !== id) entregar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) { entregar('ana', id, d); return true; },
  };

  const plataforma = {
    versao: 1,
    perfil: { apelido: id, definirApelido() {} },
    multijogador: mj,
    iniciar() { return Promise.resolve(plataforma); },
  };
  return { plataforma, get ganchos() { return ganchos; } };
}

async function abrirSala() {
  const abas = new Map();

  async function abrirAba(id) {
    const rede = criarPlataforma(id, abas);
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

function estacionar(aba, id) {
  const { Mapa } = aba.dom.api;
  const meio = Mapa.centro(0, 0);
  const j = jogador(aba, id);
  j.corpo = { x: meio.x, y: meio.y, dir: 'esquerda', desejada: null, parado: true, passos: 0 };
  j.entrada.desejada = null;
}

function deixarSoUmaPastilha(aba, indice) {
  const restam = aba.jogo.pastilhas.restam.map((_, i) => i === indice);
  aba.jogo.pastilhas = {
    restam,
    faltam: 1,
    comidas: restam.length - 1,
  };
}

function pastilhaComum(aba) {
  const mapa = aba.dom.api.labirinto;
  for (let i = 0; i < mapa.pastilhas.length; i++) {
    if (!mapa.pastilhas[i].poder && aba.jogo.pastilhas.restam[i]) {
      return { indice: i, ...mapa.pastilhas[i] };
    }
  }
  throw new Error('faltou uma pastilha comum para o teste');
}

function porEm(aba, id, x, y, dir = 'esquerda') {
  const j = jogador(aba, id);
  j.corpo = { x, y, dir, desejada: null, parado: false, passos: j.corpo.passos };
  j.entrada.desejada = null;
  return j;
}

function limparQuadrado(aba, corpo) {
  const { Mapa, Pastilhas } = aba.dom.api;
  const mapa = aba.dom.api.labirinto;
  aba.jogo.pastilhas = Pastilhas.comer(
    aba.jogo.pastilhas, mapa, Mapa.coluna(corpo.x), Mapa.linha(corpo.y)).estado;
}

function corredorParaTombo(aba) {
  const { Mapa } = aba.dom.api;
  const mapa = aba.dom.api.labirinto;
  for (let l = 1; l < mapa.linhas - 1; l++) {
    for (let c = 1; c < mapa.colunas - 1; c++) {
      if (Mapa.livre(mapa, c, l) && Mapa.podeIr(mapa, c, l, 'direita')) {
        return Mapa.centro(c, l);
      }
    }
  }
  throw new Error('faltou corredor para montar o tombo');
}

function armarTombo(aba, id) {
  const meio = corredorParaTombo(aba);
  const fantasma = aba.jogo.fantasmas.lista[0];
  fantasma.etapa = 'livre';
  fantasma.assustado = false;
  fantasma.descanso = false;
  fantasma.corpo = { x: meio.x, y: meio.y, dir: 'direita', desejada: 'direita', parado: false, passos: 0 };
  porEm(aba, id, meio.x, meio.y, 'direita');
  limparQuadrado(aba, fantasma.corpo);
}

console.log('Come-Come - fase 12\n');

teste('a ultima pastilha comida por um convidado fecha a fase nas tres telas', async () => {
  const { ana, bento, caio, todas } = await abrirSala();
  estacionar(ana, 'ana');
  estacionar(ana, 'caio');
  const ultima = pastilhaComum(ana);
  deixarSoUmaPastilha(ana, ultima.indice);
  porEm(ana, 'bento', ultima.x, ultima.y);

  ana.dom.avancarQuadros(1);

  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'fase', `${aba.id} viu o labirinto limpo`);
    assert.equal(aba.jogo.pastilhas.faltam, 0);
    assert.equal(aba.dom.escondido('tela-fase'), false);
  }
  assert.equal(bento.jogo.pontos, jogador(bento, 'bento').pontos,
    'o HUD do convidado ficou com o placar de quem comeu a ultima');
});

teste('quem zera as vidas vira espectador e volta inteiro na fase seguinte', async () => {
  const { ana, bento, caio, todas } = await abrirSala();
  estacionar(ana, 'ana');
  estacionar(ana, 'caio');
  jogador(ana, 'bento').vidas = 1;
  armarTombo(ana, 'bento');

  ana.dom.avancarQuadros(1);
  assert.equal(jogador(ana, 'bento').vidas, 0, 'Bento perdeu a ultima vida');
  assert.equal(jogador(ana, 'bento').espectador, true, 'e saiu da disputa da fase');
  ana.dom.api.mandarEstado();

  for (const aba of todas) {
    assert.equal(jogador(aba, 'bento').espectador, true,
      `${aba.id} recebeu o estado de espectador`);
  }
  assert.equal(bento.dom.texto('hud-vidas'), 'ESPECTADOR',
    'o aparelho do Bento avisa que ele esta assistindo');
  assert.notEqual(caio.dom.texto('hud-vidas'), 'ESPECTADOR',
    'quem ainda tem vida continua com as bolinhas no HUD');

  ana.jogo.rodada.pausa = 1;
  ana.dom.avancarQuadros(1);
  ana.dom.api.mandarEstado();
  assert.ok(jogador(ana, 'bento').corpo.x < 0, 'passado o susto, ele saiu do labirinto');
  assert.ok(jogador(bento, 'bento').corpo.x < 0, 'e o convidado viu a mesma saida');

  const ultima = pastilhaComum(ana);
  deixarSoUmaPastilha(ana, ultima.indice);
  porEm(ana, 'ana', ultima.x, ultima.y);
  ana.dom.avancarQuadros(1);
  assert.equal(bento.jogo.tela, 'fase', 'todos chegaram ao quadro de labirinto limpo');

  bento.dom.clicar('btn-proxima');
  assert.equal(bento.jogo.fase, 1, 'o convidado nao vira a pagina sozinho');
  assert.equal(bento.jogo.tela, 'fase');

  ana.dom.clicar('btn-proxima');
  ana.dom.avancarQuadros(3);

  for (const aba of todas) {
    assert.equal(aba.jogo.fase, 2, `${aba.id} virou para o labirinto 2 com a anfitria`);
    assert.equal(aba.jogo.tela, 'jogando');
    assert.equal(jogador(aba, 'bento').espectador, false, 'Bento voltou a jogar');
    assert.equal(jogador(aba, 'bento').vidas, aba.dom.api.mundo.VIDAS_INICIAIS,
      'com as vidas cheias');
  }
});

teste('se todos viram espectadores antes de limpar, a corrida termina', async () => {
  const { ana, bento, caio, todas } = await abrirSala();
  jogador(ana, 'ana').vidas = 0;
  jogador(ana, 'ana').espectador = true;
  jogador(ana, 'caio').vidas = 0;
  jogador(ana, 'caio').espectador = true;
  jogador(ana, 'bento').vidas = 1;
  armarTombo(ana, 'bento');

  ana.dom.avancarQuadros(1);
  assert.equal(ana.jogo.rodada.acabou, true, 'nao sobrou ninguem no labirinto');
  ana.jogo.rodada.pausa = 1;
  ana.dom.avancarQuadros(1);

  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'fim', `${aba.id} caiu na tela de fim`);
    assert.equal(aba.dom.escondido('tela-fim'), false);
  }
});

teste('em grupo, pausa local nao congela o mundo da sala', async () => {
  const { ana, bento } = await abrirSala();
  const antes = ana.jogo.relogio;

  ana.dom.tecla('p');
  bento.dom.tecla('Escape');
  ana.dom.avancarQuadros(5);

  assert.equal(ana.jogo.pausado, false, 'nem a anfitria pausa uma sala');
  assert.equal(bento.jogo.pausado, false, 'nem o convidado sobe quadro de pausa local');
  assert.ok(ana.jogo.relogio > antes, 'o mundo continuou andando');
});

teste('sozinho, o fim das vidas continua encerrando a partida normal', async () => {
  const dom = carregarJogoComTela('come_come');
  await Promise.resolve();
  dom.comecarPartida('Duda');
  dom.avancarQuadros(1);

  dom.api.jogo.rodada = { vidas: 0, pausa: 1, pego: 0, acabou: true };
  dom.avancarQuadros(1);

  assert.equal(dom.api.jogo.tela, 'fim');
  assert.equal(dom.api.jogo.jogadores.length, 1);
  assert.equal(dom.api.jogo.eu.espectador, false, 'solo nao vira espectador');
});

await fim('Fase 12');
