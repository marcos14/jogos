/* ==========================================================================
   Super Adventure - Fase 11: mundo compartilhado e camera de cada jogador
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase11.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas de navegador:
   Ana e a anfitria (simula o mundo inteiro) e Bento e Caio sao convidados. A
   Plataforma e de mentira e entrega na hora - a latencia e o assunto do
   fase10.test.mjs; aqui o alvo e outro:

     - moeda, bloco quebravel e bicho sao do MUNDO, nao de cada jogador: quem
       pega tira de todo mundo e os pontos ficam so com quem pegou;
     - cair num buraco e problema de quem caiu: o mundo dos outros nao muda;
     - a geometria e uma so (a do anfitriao), mas a CAMERA e de cada aparelho,
       centrada no proprio personagem;
     - cada jogador e pintado com a sua cor, e quem esta longe demais nao entra
       na tela de quem esta perto.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

/* Cores fora da paleta do cenario, de proposito: assim, achar a cor no canvas
   quer dizer que aquele jogador foi pintado, e mais nada. */
const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#f87858', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#b8f818', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#3cbcfc', indice: 2, pronto: true, anfitriao: false },
];

const abas = new Map();

function salaPara(id) {
  return {
    codigo: 'F11A',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 4242,
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

const valor = (o) => JSON.parse(JSON.stringify(o));
const jogador = (tab, id) => tab.jogo.jogadores.find((j) => j.id === id);

console.log('Super Adventure - fase 11\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todos = [ana, bento, caio];

for (const tab of todos) tab.rede.ganchos.aoComecar(salaPara(tab.id));

const { Fisica, Mapa, Itens, Inimigos, Camera, mundo } = ana.dom.api;
const T = mundo.TILE;
const fase = () => ana.dom.api.fase;

/** Um quadro em cada aba, `n` vezes - como tres aparelhos rodando juntos. */
function avancarTodos(n, ordem = todos) {
  for (let i = 0; i < n; i++) for (const tab of ordem) tab.dom.avancarQuadros(1);
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

/** O y de quem fica de pe na coluna `coluna` (null se nao ha chao ali). */
function chaoDaColuna(coluna) {
  const m = fase();
  for (let r = 0; r < m.linhas; r++) {
    if (Mapa.solido(m, coluna, r)) return r * T - T;
  }
  return null;
}

/** A primeira moeda ainda de pe a partir da coluna `coluna`. */
function moedaViva(coluna = 0) {
  const m = fase();
  for (let i = 0; i < m.moedas.length; i++) {
    if (ana.jogo.itens.moedas[i] && m.moedas[i].x >= coluna * T) return { i, m: m.moedas[i] };
  }
  return null;
}

const pontos = () => todos.map((tab) => jogadores.map((j) => jogador(tab, j.id).pontos));
const moedasVivas = (tab) => Itens.quantos(tab.jogo.itens.moedas);

// ------------------------------------------------- O mundo e um so ---------
teste('as moedas, os bichos e os blocos moram no mundo, nao dentro do jogador', () => {
  for (const tab of todos) {
    for (const campo of ['itens', 'inimigos', 'moveis', 'limites']) {
      assert.ok(campo in tab.jogo, `${tab.id} guarda "${campo}" no mundo`);
    }
    for (const linha of tab.jogo.jogadores) {
      for (const campo of ['itens', 'inimigos', 'moveis', 'moedas', 'blocos', 'limites']) {
        assert.ok(!(campo in linha),
          `${tab.id}: o jogador ${linha.id} nao pode ter "${campo}" so dele`);
      }
    }
  }
});

teste('as tres abas comecam com o mesmo mundo: 100 moedas, 10 blocos, 4 bichos', () => {
  for (const tab of todos) {
    assert.equal(moedasVivas(tab), 100, `${tab.id} ve as 100 moedas`);
    assert.equal(Itens.quantos(tab.jogo.itens.blocos), 10, `${tab.id} ve os 10 blocos`);
    assert.equal(tab.jogo.inimigos.lista.length, 4, `${tab.id} ve os 4 bichos`);
    assert.equal(Inimigos.quantos(tab.jogo.inimigos), 4, `${tab.id} ve os 4 vivos`);
  }
});

// ----------------------------------------------------------- As moedas -----
teste('a moeda que a anfitria pega some para todos, e os 10 pontos sao so dela', () => {
  const alvo = moedaViva();
  assert.ok(alvo, 'a fase tem moeda de pe para o teste');
  const antes = pontos()[0];

  porNoMundo('ana', alvo.m.x, alvo.m.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    assert.equal(tab.jogo.itens.moedas[alvo.i], false, `${tab.id} ve a moeda sumida`);
    assert.equal(moedasVivas(tab), 99, `${tab.id} conta 99 moedas`);
    assert.equal(jogador(tab, 'ana').pontos, antes[0] + 10,
      `${tab.id} ve os 10 pontos da anfitria`);
    assert.equal(jogador(tab, 'bento').pontos, antes[1], `${tab.id}: Bento nao pontuou`);
    assert.equal(jogador(tab, 'caio').pontos, antes[2], `${tab.id}: Caio nao pontuou`);
  }
});

teste('a moeda que um convidado pega some para todos, e os pontos sao so dele', () => {
  const alvo = moedaViva();
  assert.ok(alvo, 'ainda ha moeda de pe');
  const antes = pontos()[0];

  porNoMundo('bento', alvo.m.x, alvo.m.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    assert.equal(tab.jogo.itens.moedas[alvo.i], false, `${tab.id} ve a moeda sumida`);
    assert.equal(moedasVivas(tab), 98, `${tab.id} conta 98 moedas`);
    assert.equal(jogador(tab, 'bento').pontos, antes[1] + 10,
      `${tab.id} ve os 10 pontos de Bento`);
    assert.equal(jogador(tab, 'ana').pontos, antes[0], `${tab.id}: a anfitria nao pontuou`);
    assert.equal(jogador(tab, 'caio').pontos, antes[2], `${tab.id}: Caio nao pontuou`);
  }
  assert.equal(bento.jogo.eu.pontos, jogador(ana, 'bento').pontos,
    'o placar do convidado e o que o anfitriao contou');
});

teste('a moeda ja pega nao volta para ninguem: passar de novo nao da ponto', () => {
  const m = fase().moedas;
  const pega = m.map((_, i) => i).filter((i) => !ana.jogo.itens.moedas[i])[0];
  const antes = pontos()[0];

  porNoMundo('caio', m[pega].x, m[pega].y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    assert.equal(moedasVivas(tab), 98, `${tab.id} continua com 98 moedas`);
    assert.equal(jogador(tab, 'caio').pontos, antes[2], `${tab.id}: Caio nao ganhou nada`);
  }
});

// ------------------------------------------------ Os blocos quebraveis -----
teste('o bloco que um convidado quebra cai do mundo de todos e sai dos solidos', () => {
  const b = fase().quebraveis.findIndex((q, i) => ana.jogo.itens.blocos[i]);
  assert.ok(b >= 0, 'ainda ha bloco de pe');
  const alvo = fase().quebraveis[b];
  const chao = chaoDaColuna(alvo.x / T);
  assert.ok(chao !== null, 'ha chao debaixo do bloco escolhido');

  porNoMundo('bento', alvo.x, chao);
  bento.dom.tecla(' ', true);
  let quadros = 0;
  while (ana.jogo.itens.blocos[b] && quadros < 120) { avancarTodos(1); quadros++; }
  bento.dom.tecla(' ', false);
  sincronizar();

  assert.equal(ana.jogo.itens.blocos[b], false, `o bloco nao caiu em ${quadros} quadros`);
  for (const tab of todos) {
    assert.equal(tab.jogo.itens.blocos[b], false, `${tab.id} ve o bloco quebrado`);
    assert.equal(Itens.quantos(tab.jogo.itens.blocos), 9, `${tab.id} conta 9 blocos de pe`);
    const aindaSolido = tab.jogo.limites.solidos.some(
      (s) => s.x === alvo.x && s.y === alvo.y && s.l === T);
    assert.equal(aindaSolido, false, `${tab.id} tirou o bloco dos solidos`);
  }
});

// -------------------------------------------------------- Os inimigos ------
teste('o bicho que um convidado pisa e derrotado para todos, e os 20 sao dele', () => {
  const i = ana.jogo.inimigos.lista.findIndex((b) => b.estado === 'vivo');
  assert.ok(i >= 0, 'ha bicho vivo para o teste');
  const antes = pontos()[0];

  const alvo = ana.jogo.inimigos.lista[i];
  porNoMundo('caio', alvo.x, alvo.y - 40);
  let quadros = 0;
  while (ana.jogo.inimigos.lista[i].estado === 'vivo' && quadros < 120) {
    ana.dom.avancarQuadros(1);
    quadros++;
  }
  sincronizar();

  assert.notEqual(ana.jogo.inimigos.lista[i].estado, 'vivo',
    `o bicho ${i} nao foi pisado em ${quadros} quadros`);
  for (const tab of todos) {
    assert.notEqual(tab.jogo.inimigos.lista[i].estado, 'vivo',
      `${tab.id} ve o bicho ${i} derrotado`);
    assert.equal(Inimigos.quantos(tab.jogo.inimigos), 3, `${tab.id} conta 3 bichos vivos`);
    assert.equal(jogador(tab, 'caio').pontos, antes[2] + 20,
      `${tab.id} ve os 20 pontos de Caio`);
    assert.equal(jogador(tab, 'ana').pontos, antes[0], `${tab.id}: a anfitria nao pontuou`);
    assert.equal(jogador(tab, 'bento').pontos, antes[1], `${tab.id}: Bento nao pontuou`);
  }
});

teste('o bicho derrotado nao volta para ninguem', () => {
  const mortos = ana.jogo.inimigos.lista
    .map((b, i) => (b.estado === 'vivo' ? -1 : i)).filter((i) => i >= 0);
  assert.ok(mortos.length > 0, 'ha bicho fora de combate para conferir');
  avancarTodos(30);
  sincronizar();

  for (const tab of todos) {
    for (const i of mortos) {
      assert.notEqual(tab.jogo.inimigos.lista[i].estado, 'vivo',
        `${tab.id}: o bicho ${i} continua fora de combate`);
    }
  }
});

// ------------------------------------------------- Cada um com a sua vida --
teste('cair num buraco e problema de quem caiu: o mundo dos outros nao muda', () => {
  const antesMoedas = valor(ana.jogo.itens.moedas);
  const antesBlocos = valor(ana.jogo.itens.blocos);
  const antesVidas = jogador(ana, 'bento').vidas;
  const antesPontos = pontos()[0];
  // O bicho vivo que ja andou para longe do ninho: se o mundo fosse
  // reiniciado por causa da queda, ele voltaria para la.
  const ninho = fase().inimigos;
  const longe = ana.jogo.inimigos.lista
    .map((b, i) => ({ i, b, d: Math.abs(b.x - ninho[i].x) }))
    .filter((c) => c.b.estado === 'vivo')
    .sort((a, b) => b.d - a.d)[0];
  assert.ok(longe && longe.d > T, 'ha bicho vivo longe do ninho para conferir');

  porNoMundo('bento', 600, fase().fundo + 40);
  avancarTodos(2);
  sincronizar();

  for (const tab of todos) {
    assert.equal(jogador(tab, 'bento').vidas, antesVidas - 1,
      `${tab.id} ve Bento com um coracao a menos`);
    assert.deepEqual(valor(tab.jogo.itens.moedas), antesMoedas,
      `${tab.id}: as moedas do mundo nao voltaram`);
    assert.deepEqual(valor(tab.jogo.itens.blocos), antesBlocos,
      `${tab.id}: os blocos do mundo nao voltaram`);
    assert.equal(jogador(tab, 'ana').pontos, antesPontos[0], `${tab.id}: placar da anfitria`);
    assert.equal(jogador(tab, 'caio').pontos, antesPontos[2], `${tab.id}: placar de Caio`);
    assert.notEqual(tab.jogo.inimigos.lista[longe.i].x, ninho[longe.i].x,
      `${tab.id}: o bicho ${longe.i} nao foi devolvido ao ninho`);
  }
  assert.ok(jogador(ana, 'bento').corpo.y < fase().fundo, 'Bento renasceu dentro da fase');
});

// ------------------------------------------------------------ A camera -----
teste('a geometria e a mesma nas tres abas: so a camera e de cada aparelho', () => {
  const geometria = (tab) => valor({
    largura: tab.dom.api.fase.largura,
    linhas: tab.dom.api.fase.linhas,
    colunas: tab.dom.api.fase.colunas,
    moedas: tab.dom.api.fase.moedas,
    quebraveis: tab.dom.api.fase.quebraveis,
    checkpoints: tab.dom.api.fase.checkpoints,
    bandeira: tab.dom.api.fase.bandeira,
    tela: tab.dom.api.mundo.LARGURA,
  });

  assert.deepEqual(geometria(bento), geometria(ana), 'Bento ve o mundo da anfitria');
  assert.deepEqual(geometria(caio), geometria(ana), 'Caio ve o mesmo mundo');
});

teste('a camera de cada aparelho segue o proprio jogador, no mesmo mundo', () => {
  const colunas = { ana: 8, bento: 44, caio: 86 };
  for (const id of Object.keys(colunas)) {
    const y = chaoDaColuna(colunas[id]);
    assert.ok(y !== null, `a coluna ${colunas[id]} tem chao`);
    porNoMundo(id, colunas[id] * T, y);
  }
  sincronizar(3);

  const cameras = {};
  for (const tab of todos) {
    const c = tab.jogo.eu.corpo;
    const esperada = Camera.seguir(c.x + T / 2, tab.dom.api.fase.largura, mundo.LARGURA);
    assert.equal(tab.jogo.camera, esperada, `${tab.id} olha para o proprio personagem`);
    cameras[tab.id] = tab.jogo.camera;

    // O corpo oficial do jogador de casa e o mesmo em todas as abas.
    assert.equal(Math.round(c.x), Math.round(jogador(ana, tab.id).corpo.x),
      `${tab.id} esta onde o anfitriao disse`);
  }

  assert.ok(cameras.ana !== cameras.bento && cameras.bento !== cameras.caio,
    'tres jogadores espalhados, tres cameras diferentes');
  // Longe das bordas do mundo, o personagem fica no meio da tela.
  const meio = bento.jogo.eu.corpo.x + T / 2 - bento.jogo.camera;
  assert.equal(meio, mundo.LARGURA / 2, 'o convidado do meio fica centrado na tela');
});

teste('a camera trava nas pontas do mundo, sem mostrar o lado de fora', () => {
  porNoMundo('bento', 0, chaoDaColuna(1));
  sincronizar(3);
  assert.equal(bento.jogo.camera, 0, 'no comeco da fase a camera nao passa do zero');

  const ultima = fase().colunas - 3;
  porNoMundo('bento', ultima * T, chaoDaColuna(ultima));
  sincronizar(3);
  assert.equal(bento.jogo.camera, fase().largura - mundo.LARGURA,
    'no fim da fase a camera para na borda');
});

teste('cada aba pinta o pedaco do mundo que esta debaixo da SUA camera', () => {
  const colunas = { ana: 8, bento: 44, caio: 86 };
  for (const id of Object.keys(colunas)) porNoMundo(id, colunas[id] * T, chaoDaColuna(colunas[id]));
  sincronizar(3);
  avancarTodos(1);

  const m = fase().moedas;
  for (const tab of todos) {
    const cam = tab.jogo.camera;
    // As moedas de pe que estao dentro da janela desta aba (o desenho tem uma
    // folga de um quadrado de cada lado, para nada aparecer "nascendo" na
    // beirada da tela).
    const naJanela = m.filter((moeda, i) => tab.jogo.itens.moedas[i] &&
      moeda.x + moeda.l > cam - T && moeda.x < cam + mundo.LARGURA + T);
    // O dourado tambem pinta a fivela do macacao, o topo do checkpoint aceso e
    // a bolinha da bandeira: a moeda e o retangulo dourado da altura dela.
    const ouro = tab.dom.pintados.filter((p) => p.cor === '#fcd800' && p.a === m[0].a);

    assert.equal(ouro.length > 0, naJanela.length > 0,
      `${tab.id}: pintou moeda se (e so se) havia moeda na janela dele`);
    for (const p of ouro) {
      assert.ok(p.x >= -2 * T && p.x <= mundo.LARGURA + 2 * T,
        `${tab.id}: moeda pintada dentro da tela (x=${p.x})`);
      assert.ok(naJanela.some((moeda) => Math.abs(p.x + cam - moeda.x) <= T),
        `${tab.id}: a moeda pintada em ${p.x} e uma moeda do mundo, na camera dele`);
    }
  }

  assert.notEqual(ana.jogo.camera, caio.jogo.camera, 'as janelas sao mesmo diferentes');
});

// ------------------------------------------------- Quem aparece na tela ----
teste('quem esta perto aparece na tela do outro, cada um com a sua cor', () => {
  const coluna = 44;
  const y = chaoDaColuna(coluna);
  porNoMundo('ana', coluna * T, y);
  porNoMundo('bento', (coluna + 3) * T, y);
  porNoMundo('caio', 86 * T, chaoDaColuna(86));
  sincronizar(3);
  avancarTodos(1);

  const cores = (tab) => new Set(tab.dom.pintados.map((p) => p.cor));

  const naTelaDeBento = cores(bento);
  assert.ok(naTelaDeBento.has('#b8f818'), 'Bento se ve com a cor dele');
  assert.ok(naTelaDeBento.has('#f87858'), 'Bento ve a anfitria, que esta do lado');
  assert.equal(naTelaDeBento.has('#3cbcfc'), false, 'Caio esta longe: nao entra na tela');

  const naTelaDeAna = cores(ana);
  assert.ok(naTelaDeAna.has('#f87858'), 'a anfitria se ve');
  assert.ok(naTelaDeAna.has('#b8f818'), 'e ve Bento, que esta do lado');
  assert.equal(naTelaDeAna.has('#3cbcfc'), false, 'Caio continua fora da tela dela');

  const naTelaDeCaio = cores(caio);
  assert.ok(naTelaDeCaio.has('#3cbcfc'), 'Caio se ve');
  assert.equal(naTelaDeCaio.has('#f87858'), false, 'a anfitria esta longe dele');
  assert.equal(naTelaDeCaio.has('#b8f818'), false, 'Bento tambem');
});

teste('quem chega perto entra na tela, e cada tela mostra o seu pedaco', () => {
  const coluna = 84;
  porNoMundo('bento', coluna * T, chaoDaColuna(coluna));
  sincronizar(3);
  avancarTodos(1);

  const cores = (tab) => new Set(tab.dom.pintados.map((p) => p.cor));
  assert.ok(cores(caio).has('#b8f818'), 'agora Caio ve Bento chegando');
  assert.ok(cores(bento).has('#3cbcfc'), 'e Bento ve Caio');
  assert.equal(cores(ana).has('#b8f818'), false,
    'na tela da anfitria, que ficou para tras, Bento sumiu');
  assert.notEqual(bento.jogo.camera, ana.jogo.camera,
    'cada aba olha para o seu pedaco do mesmo mundo');
});

// ------------------------------------------- O mundo continua sendo um so --
teste('depois de todos jogarem juntos, as tres abas contam o mesmo mundo', () => {
  const colunas = { ana: 6, bento: 10, caio: 14 };
  for (const id of Object.keys(colunas)) porNoMundo(id, colunas[id] * T, chaoDaColuna(colunas[id]));
  sincronizar(3);

  for (const tab of todos) tab.dom.tecla('ArrowRight', true);
  for (let q = 0; q < 300; q++) {
    for (const tab of todos) {
      if (q % 31 === 0) tab.dom.tecla(' ', true);        // um pulinho de vez em quando
      if (q % 31 === 5) tab.dom.tecla(' ', false);
      tab.dom.avancarQuadros(1);
    }
  }
  for (const tab of todos) { tab.dom.tecla('ArrowRight', false); tab.dom.tecla(' ', false); }
  sincronizar(3);

  // O retrato do mundo, sem o relogio e sem o numero do pacote: moedas,
  // blocos, bichos e plataformas tem de bater nas tres abas.
  const mundoDe = (tab) => {
    const p = tab.dom.api.Pacote.montar(tab.jogo, 0);
    return valor({ m: p.m, b: p.b, i: p.i, v: p.v, f: p.f });
  };
  assert.deepEqual(mundoDe(bento), mundoDe(ana), 'Bento continua no mundo da anfitria');
  assert.deepEqual(mundoDe(caio), mundoDe(ana), 'Caio tambem');

  // E o placar de cada um e o mesmo em todas as telas.
  const placar = (tab) => jogadores.map((j) => [jogador(tab, j.id).pontos, jogador(tab, j.id).vidas]);
  assert.deepEqual(placar(bento), placar(ana), 'Bento ve o placar de todos igualzinho');
  assert.deepEqual(placar(caio), placar(ana), 'Caio tambem');
  assert.ok(ana.jogo.fase === 1 && !ana.jogo.concluida, 'ninguem chegou na bandeira ainda');
});

await fim('Fase 11');
