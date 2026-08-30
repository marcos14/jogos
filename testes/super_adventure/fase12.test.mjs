/* ==========================================================================
   Super Adventure - Fase 12: a bandeira e o checkpoint sao da SALA
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase12.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas de navegador:
   Ana e a anfitria (simula o mundo inteiro) e Bento e Caio sao convidados. A
   Plataforma e de mentira e entrega na hora - a latencia e assunto do
   fase10.test.mjs. Aqui o alvo sao as duas regras novas:

     - a BANDEIRA e do grupo: o primeiro que encostar nela fecha a fase para
       todo mundo, seja ele o anfitriao ou um convidado do outro lado do mapa,
       e o anfitriao leva a sala inteira para a fase seguinte;
     - o CHECKPOINT e do grupo: o mastro que um jogador acende aparece aceso
       para os outros e passa a ser o lugar onde a sala renasce - inclusive
       para quem ficou sem coracoes no meio da fase.

   As funcoes puras que sustentam isso (`Progresso.compartilhar` e
   `Progresso.renovarVidas`) sao testadas primeiro, sem DOM nenhum.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#f87858', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#b8f818', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#3cbcfc', indice: 2, pronto: true, anfitriao: false },
];

const abas = new Map();

function salaPara(id) {
  return {
    codigo: 'F12A',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 1212,
    eu: id,
    souAnfitriao: id === 'ana',
    anfitriao: 'ana',
    jogadores: jogadores.slice(),
  };
}

function criarPlataforma(id) {
  let ganchos = {};

  function entregar(destino, origem, d) {
    const aba = abas.get(destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: origem, d });
  }

  const mj = {
    disponivel: true,
    max: 8,
    em() { return mj; },
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { return mj; },
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

async function abrirAba(id) {
  const rede = criarPlataforma(id);
  const dom = carregarJogoComTela('super_adventure', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

const jogador = (tab, id) => tab.jogo.jogadores.find((j) => j.id === id);
const subtitulo = (tab) => tab.dom.elementos['fase-subtitulo'].textContent;

console.log('Super Adventure - fase 12\n');

// ----------------------------------------------- As funcoes puras ----------
const { Progresso, mapas } = carregarJogo();
const mapa1 = mapas[0];

teste('compartilhar acende o mastro na conta de quem nao encostou nele', () => {
  const dele = Progresso.novoEstado(mapa1);
  const doOutro = Progresso.compartilhar(dele, 1);

  igual(doOutro.ativos, [false, true, false], 'o mastro 1 acendeu');
  assert.equal(doOutro.atual, 1, 'e virou o nascedouro dele tambem');
  assert.equal(doOutro.vidas, dele.vidas, 'os coracoes nao se misturam');
  igual(dele.ativos, [false, false, false], 'o estado recebido nao foi mexido');
});

teste('compartilhar nao mexe em nada quando o mastro ja estava aceso', () => {
  const aceso = Progresso.compartilhar(Progresso.novoEstado(mapa1), 2);
  assert.equal(Progresso.compartilhar(aceso, 2), aceso, 'devolve o MESMO estado');
  assert.equal(Progresso.compartilhar(aceso, -1), aceso, 'e ignora indice nenhum');
});

teste('renovarVidas devolve os coracoes cheios sem apagar os checkpoints', () => {
  const gasto = { vidas: 0, ativos: [true, true, false], atual: 1 };
  const novo = Progresso.renovarVidas(gasto);

  assert.equal(novo.vidas, Progresso.VIDAS_INICIAIS, 'os coracoes voltaram');
  igual(novo.ativos, [true, true, false], 'os mastros do grupo continuam acesos');
  assert.equal(novo.atual, 1, 'e o nascedouro continua sendo o do grupo');
  assert.equal(gasto.vidas, 0, 'o estado recebido nao foi mexido');
});

// ------------------------------------------------------- As tres abas ------
const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todos = [ana, bento, caio];

for (const tab of todos) tab.rede.ganchos.aoComecar(salaPara(tab.id));

const { Fisica, Progresso: ProgressoDoJogo } = ana.dom.api;
const fase = () => ana.dom.api.fase;

/** Um quadro em cada aba, `n` vezes - como tres aparelhos rodando juntos. */
function avancarTodos(n) {
  for (let i = 0; i < n; i++) for (const tab of todos) tab.dom.avancarQuadros(1);
}

/** Poe um jogador em (x, y) no mundo do anfitriao - o unico que existe. */
function porNoMundo(id, x, y) {
  jogador(ana, id).corpo = Fisica.novoCorpo(x, y);
}

/** Manda o retrato do mundo agora e deixa cada convidado assentar. */
function sincronizar(quadros = 2) {
  ana.dom.api.mandarEstado();
  avancarTodos(quadros);
  ana.dom.api.mandarEstado();
}

/** Joga alguem no fundo do mundo e deixa o anfitriao contar a queda. */
function derrubar(id) {
  porNoMundo(id, 600, fase().fundo + 40);
  avancarTodos(2);
}

// ------------------------------------------- O checkpoint e do grupo -------
teste('o checkpoint que um convidado acende acende para a sala inteira', () => {
  const cp = fase().checkpoints[0];
  const vidasAntes = todos.map((tab) => jogadores.map((j) => jogador(tab, j.id).vidas));

  porNoMundo('bento', cp.x, cp.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    for (const p of jogadores) {
      const linha = jogador(tab, p.id);
      assert.equal(linha.progresso.ativos[0], true,
        `${tab.id}: o mastro 0 esta aceso para ${p.id}`);
      assert.equal(linha.progresso.atual, 0,
        `${tab.id}: e virou o nascedouro de ${p.id}`);
    }
  }
  assert.deepEqual(
    todos.map((tab) => jogadores.map((j) => jogador(tab, j.id).vidas)), vidasAntes,
    'os coracoes de ninguem foram mexidos');
});

teste('a faisca do checkpoint aparece na tela de todo mundo', () => {
  for (const tab of todos) {
    assert.ok(tab.jogo.efeitos.some((e) => e.tipo === 'checkpoint'),
      `${tab.id} soltou a faisca do mastro aceso`);
  }
});

teste('quem cai renasce no checkpoint do grupo, mesmo sem ter encostado nele', () => {
  const antes = jogador(ana, 'caio').vidas;
  const onde = ProgressoDoJogo.nascedouro(fase(), jogador(ana, 'caio').progresso);
  assert.ok(onde.x > fase().spawn.x, 'o nascedouro do grupo ficou adiante do comeco da fase');

  derrubar('caio');
  sincronizar();

  const corpo = jogador(ana, 'caio').corpo;
  assert.equal(Math.round(corpo.x), Math.round(onde.x), 'Caio nasceu no mastro do grupo');
  assert.equal(Math.round(corpo.y), Math.round(onde.y), 'e de pe no pe dele');
  assert.equal(jogador(ana, 'caio').vidas, antes - 1, 'a queda custou um coracao');
  for (const tab of todos) {
    assert.equal(Math.round(jogador(tab, 'caio').corpo.x), Math.round(onde.x),
      `${tab.id} ve Caio no mastro do grupo`);
  }
});

teste('quem fica sem coracoes volta com eles cheios, e no checkpoint do grupo', () => {
  const onde = ProgressoDoJogo.nascedouro(fase(), jogador(ana, 'caio').progresso);
  const quedas = jogador(ana, 'caio').vidas;      // tantas quantas faltam para zerar
  const avisos = [];
  caio.dom.api.aoEvento((e) => avisos.push(e.tipo));

  for (let i = 0; i < quedas; i++) derrubar('caio');
  sincronizar();

  const linha = jogador(ana, 'caio');
  assert.equal(linha.vidas, ProgressoDoJogo.VIDAS_INICIAIS, 'os coracoes voltaram cheios');
  igual(linha.progresso.ativos, [true, false, false],
    'e o mastro do grupo continua aceso para ele');
  assert.equal(Math.round(linha.corpo.x), Math.round(onde.x),
    'ele nao foi mandado de volta para o comeco da fase');
  for (const tab of todos) {
    assert.equal(jogador(tab, 'caio').vidas, ProgressoDoJogo.VIDAS_INICIAIS,
      `${tab.id} ve Caio com os coracoes cheios`);
    assert.equal(jogador(tab, 'caio').progresso.ativos[0], true,
      `${tab.id} ve o mastro do grupo aceso para Caio`);
  }
  // O mundo dos outros nao foi tocado: quem fica sem vidas recomeca sozinho.
  assert.equal(ana.jogo.fase, 1, 'a fase nao recomecou');
  assert.equal(jogador(ana, 'bento').vidas, 3, 'Bento nao perdeu nada com o tombo de Caio');
});

teste('o mastro aceso viaja no retrato: as tres abas contam a mesma lista', () => {
  const cp = fase().checkpoints[1];
  porNoMundo('ana', cp.x, cp.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  const acesos = (tab) => jogadores.map(
    (j) => jogador(tab, j.id).progresso.ativos.map((a) => (a ? '1' : '0')).join(''));
  assert.deepEqual(acesos(ana), ['110', '110', '110'], 'o anfitriao acendeu o mastro 1 para todos');
  assert.deepEqual(acesos(bento), acesos(ana), 'Bento ve a mesma lista');
  assert.deepEqual(acesos(caio), acesos(ana), 'Caio tambem');
});

// ---------------------------------------------- A bandeira e da sala -------
teste('um convidado toca a bandeira e a fase acaba para todo mundo', () => {
  const b = fase().bandeira;
  porNoMundo('bento', b.x, b.y);
  ana.dom.avancarQuadros(1);

  assert.equal(ana.jogo.concluida, true, 'a anfitria fechou a fase mesmo sem ter chegado nela');
  assert.equal(ana.jogo.quemChegou, 1, 'e anotou que quem chegou foi Bento');

  sincronizar();
  for (const tab of todos) {
    assert.equal(tab.jogo.concluida, true, `${tab.id} tambem fechou a fase`);
    assert.equal(tab.jogo.quemChegou, 1, `${tab.id} sabe que foi Bento quem chegou`);
    assert.equal(tab.jogo.corrida.fases.length, 1, `${tab.id} anotou a fase 1 no caderno`);
    assert.equal(tab.jogo.corrida.fase, 2, `${tab.id} tem a fase 2 como proxima`);
    assert.equal(tab.dom.elementos['tela-fase'].classes.has('hidden'), false,
      `${tab.id} mostra o quadro de fim de fase`);
  }
});

teste('cada aba fecha a fase com os pontos de quem esta nela', () => {
  for (const tab of todos) {
    const linha = tab.jogo.corrida.fases[0];
    assert.equal(linha.pontos, tab.jogo.eu.pontos, `${tab.id} contou os proprios pontos`);
    assert.equal(linha.bonus, 50, `${tab.id} ganhou o bonus da bandeira`);
    assert.equal(linha.total, linha.pontos + 50, `${tab.id} somou certo`);
  }
});

teste('o quadro de fim de fase diz quem chegou primeiro', () => {
  assert.equal(subtitulo(bento), 'Você chegou na bandeira 🚩', 'quem chegou ve "você"');
  assert.equal(subtitulo(ana), 'Bento chegou na bandeira primeiro 🚩', 'a anfitria ve o nome');
  assert.equal(subtitulo(caio), 'Bento chegou na bandeira primeiro 🚩', 'Caio tambem');
});

teste('o convidado nao vira a pagina sozinho: quem leva a sala e o anfitriao', () => {
  bento.dom.api.avancarFase();
  bento.dom.avancarQuadros(2);

  assert.equal(bento.jogo.fase, 1, 'Bento continua na fase 1');
  assert.equal(bento.dom.elementos['btn-proxima'].disabled, true,
    'e o botao dele esta desligado');
  assert.equal(ana.dom.elementos['btn-proxima'].disabled, false,
    'o da anfitria e que esta ligado');
});

teste('o anfitriao vira a pagina e a sala inteira vai para a fase 2', () => {
  ana.dom.clicar('btn-proxima');
  sincronizar(3);

  for (const tab of todos) {
    assert.equal(tab.jogo.fase, 2, `${tab.id} esta na fase 2`);
    assert.equal(tab.dom.api.fase.colunas, 128, `${tab.id} carregou o mapa da fase 2`);
    assert.equal(tab.jogo.concluida, false, `${tab.id} voltou a jogar`);
    assert.equal(tab.jogo.quemChegou, -1, `${tab.id} limpou quem chegou na bandeira`);
    assert.equal(tab.dom.elementos['tela-fase'].classes.has('hidden'), true,
      `${tab.id} escondeu o quadro de fim de fase`);
    for (const p of jogadores) {
      igual(jogador(tab, p.id).progresso.ativos, [false, false, false],
        `${tab.id}: os mastros de ${p.id} comecam apagados na fase nova`);
    }
  }
});

teste('na fase nova o checkpoint continua sendo do grupo', () => {
  const cp = fase().checkpoints[0];
  porNoMundo('caio', cp.x, cp.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    for (const p of jogadores) {
      assert.equal(jogador(tab, p.id).progresso.ativos[0], true,
        `${tab.id}: o mastro que Caio acendeu vale para ${p.id}`);
    }
  }
});

teste('a bandeira tocada pelo anfitriao tambem leva a sala inteira adiante', () => {
  const b = fase().bandeira;
  porNoMundo('ana', b.x, b.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  assert.equal(ana.jogo.quemChegou, 0, 'quem chegou foi a anfitria');
  assert.equal(subtitulo(caio), 'Ana chegou na bandeira primeiro 🚩', 'Caio ve o nome dela');
  assert.equal(subtitulo(ana), 'Você chegou na bandeira 🚩', 'e ela ve "você"');

  ana.dom.clicar('btn-proxima');
  sincronizar(3);

  for (const tab of todos) {
    assert.equal(tab.jogo.fase, 3, `${tab.id} chegou na fase 3`);
    assert.equal(tab.jogo.corrida.fases.length, 2, `${tab.id} tem duas fases no caderno`);
  }
});

// ------------------------------------------------------ E sozinho? ---------
teste('sozinho nada muda: a bandeira e o checkpoint continuam sendo so seus', () => {
  const solo = carregarJogoComTela('super_adventure');
  solo.clicar('btn-solo');

  const mapa = solo.api.fase;
  const cp = mapa.checkpoints[2];
  solo.api.jogo.heroi = solo.api.Fisica.novoCorpo(cp.x, cp.y);
  solo.avancarQuadros(2);
  igual(solo.api.jogo.progresso.ativos, [false, false, true],
    'o heroi acendeu o mastro em que encostou');
  assert.equal(solo.api.jogo.jogadores.length, 1, 'e continua sendo um jogador so');

  solo.api.jogo.heroi = solo.api.Fisica.novoCorpo(mapa.bandeira.x, mapa.bandeira.y);
  solo.avancarQuadros(2);
  assert.equal(solo.api.jogo.concluida, true, 'a bandeira fechou a fase');
  assert.equal(solo.api.jogo.quemChegou, 0, 'quem chegou foi ele mesmo');
  assert.equal(solo.elementos['fase-subtitulo'].textContent, 'Você chegou na bandeira 🚩',
    'e o quadro fala com ele, nao de um nome qualquer');
});

await fim('Fase 12');
