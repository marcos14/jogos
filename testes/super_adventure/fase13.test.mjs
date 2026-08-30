/* ==========================================================================
   Super Adventure - Fase 13: o placar de todos e o ranking do fim
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase13.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas de navegador:
   Ana e a anfitria (simula o mundo inteiro) e Bento e Caio sao convidados. A
   Plataforma e de mentira e entrega na hora - a latencia e assunto do
   fase10.test.mjs. Aqui o alvo e o placar:

     - a MINI-LISTA lateral, que so existe em grupo e mostra a turma inteira
       com o total da corrida de cada um, na hora em que os pontos sobem;
     - o TOTAL das fases fechadas, que viaja no retrato do mundo (sem ele o
       placar so saberia contar a fase de agora);
     - o RANKING do fim: o anfitriao chama `terminar(placar)` quando a bandeira
       da fase 3 cai, a Central devolve o mesmo placar para todos e cada tela
       monta a lista do PIOR para o MELHOR;
     - a espera de ~3 segundos: sem resposta da plataforma, cada tela mostra o
       placar que ela mesma tem (a regra da tabela 4.5).

   As funcoes puras que sustentam isso (o modulo `Placar`) sao testadas
   primeiro, sem DOM nenhum.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#f87858', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#b8f818', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#3cbcfc', indice: 2, pronto: true, anfitriao: false },
];

console.log('Super Adventure - fase 13\n');

// ----------------------------------------------- As funcoes puras ----------
const { Placar } = carregarJogo();

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/** Uma linha de placar de mentira, do jeito que o modulo gosta. */
const linha = (id, indice, pontos, eu) =>
  ({ id, indice, apelido: id, cor: '#fcfcfc', pontos, eu: !!eu });

const nomes = (lista) => lista.map((p) => p.id);

teste('daSala soma a fase de agora com o que as fases fechadas renderam', () => {
  const time = [
    { id: 'a', indice: 0, apelido: 'Ana', cor: '#f87858', pontos: 30, total: 200, local: true },
    { id: 'b', indice: 1, apelido: 'Bento', cor: '#b8f818', pontos: 90, total: 100 },
  ];

  const andando = Placar.daSala(time, false);
  igual(andando.map((p) => [p.id, p.pontos]), [['a', 230], ['b', 190]],
    'com a fase rolando, vale o total mais os pontos dela');
  assert.equal(andando[0].eu, true, 'e a linha de casa vem marcada');

  // Com a bandeira ja tocada, os pontos da fase entraram no total: soma-los de
  // novo contaria a mesma fase duas vezes.
  const fechada = Placar.daSala(time, true);
  igual(fechada.map((p) => [p.id, p.pontos]), [['a', 200], ['b', 100]],
    'com a fase fechada, o total sozinho ja e a conta inteira');
});

teste('melhorPrimeiro e piorPrimeiro sao um o contrario do outro', () => {
  const lista = [linha('a', 0, 10), linha('b', 1, 90), linha('c', 2, 50)];

  igual(nomes(Placar.melhorPrimeiro(lista)), ['b', 'c', 'a'], 'do melhor para o pior');
  igual(nomes(Placar.piorPrimeiro(lista)), ['a', 'c', 'b'], 'e do pior para o melhor');
  igual(nomes(lista), ['a', 'b', 'c'], 'a lista recebida nao foi mexida');
});

teste('quem empata fica na ordem do indice - a mesma em todos os aparelhos', () => {
  const lista = [linha('c', 2, 40), linha('a', 0, 40), linha('b', 1, 40)];
  igual(nomes(Placar.melhorPrimeiro(lista)), ['a', 'b', 'c'],
    'empate desempata pelo indice do jogador na sala');
});

teste('colocar da o lugar de cada um, e empate divide o mesmo lugar', () => {
  const lista = [linha('a', 0, 90), linha('b', 1, 40), linha('c', 2, 40), linha('d', 3, 10)];
  const comLugar = Placar.colocar(lista);

  igual(comLugar.map((p) => [p.id, p.lugar]),
    [['a', 1], ['b', 2], ['c', 2], ['d', 4]],
    'os dois de 40 pontos dividem o 2o lugar, e o proximo e o 4o');
  assert.equal(Placar.lugarDe(lista, 'c'), 2, 'lugarDe conta a mesma coisa');
  assert.equal(Placar.lugarDe(lista, 'ninguem'), 0, 'e quem nao esta na lista nao tem lugar');
});

teste('ranking vai do pior para o melhor: a lista termina no campeao', () => {
  const lista = [linha('a', 0, 10), linha('b', 1, 90, true), linha('c', 2, 50)];
  const ordem = Placar.ranking(lista);

  igual(nomes(ordem), ['a', 'c', 'b'], 'o campeao e a ultima linha');
  igual(ordem.map((p) => p.lugar), [3, 2, 1], 'cada um com o seu lugar');
  assert.equal(Placar.lugarDoEu(ordem), 1, 'e o jogador de casa ficou em 1o');
});

teste('paraRede leva so o que o outro lado precisa, na ordem em que foi dado', () => {
  const lista = Placar.piorPrimeiro([linha('a', 0, 10), linha('b', 1, 90, true)]);
  const rede = Placar.paraRede(lista);

  igual(rede, [
    { id: 'a', indice: 0, apelido: 'a', cor: '#fcfcfc', pontos: 10 },
    { id: 'b', indice: 1, apelido: 'b', cor: '#fcfcfc', pontos: 90 },
  ], 'a ordem e do pior para o melhor, e o "eu" nao viaja: isso e de cada tela');
});

teste('normalizar arruma o que chegou da rede e marca quem sou eu', () => {
  const cru = [
    { id: 'a', indice: 0, apelido: 'Ana', cor: 'javascript:alert(1)', pontos: 30.7 },
    { id: 'b', apelido: null, cor: '#b8f818', pontos: '90' },
  ];
  const lista = Placar.normalizar(cru, 'b');

  assert.equal(lista[0].cor, '#0058f8', 'cor que nao e cor vira o azul de sempre');
  assert.equal(lista[0].pontos, 30, 'pontos viram numero inteiro');
  assert.equal(lista[1].apelido, 'Jogador', 'quem chegou sem apelido ganha um');
  assert.equal(lista[1].indice, 1, 'e sem indice vale a posicao na lista');
  igual(lista.map((p) => p.eu), [false, true], 'so a minha linha e marcada');
  igual(Placar.normalizar(null, 'b'), [], 'placar nenhum e uma lista vazia');
});

teste('assinatura muda quando um placar muda - e so quando muda', () => {
  const antes = [linha('a', 0, 10), linha('b', 1, 90)];
  const mesma = [linha('a', 0, 10), linha('b', 1, 90)];
  const depois = [linha('a', 0, 20), linha('b', 1, 90)];

  assert.equal(Placar.assinatura(antes), Placar.assinatura(mesma), 'nada mudou');
  assert.notEqual(Placar.assinatura(antes), Placar.assinatura(depois), 'a Ana fez pontos');
});

// ------------------------------------------------------- As tres abas ------
const abas = new Map();
const terminares = [];       // o que o anfitriao mandou para a plataforma
let plataformaMuda = false;  // ligado, o `terminar()` nao volta para ninguem

function salaPara(id) {
  return {
    codigo: 'F13A',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 1313,
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
    /* Igualzinho ao servidor: o `fim` volta para a sala INTEIRA, o anfitriao
       incluso, com o mesmo placar para todo mundo. */
    terminar(placar) {
      terminares.push({ de: id, placar });
      if (plataformaMuda) return mj;
      for (const j of jogadores) {
        const aba = abas.get(j.id);
        if (aba && aba.ganchos.aoTerminar) aba.ganchos.aoTerminar({ placar });
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

const jogador = (tab, id) => tab.jogo.jogadores.find((j) => j.id === id);

/** As linhas de uma lista de placar, como estao na tela. */
const linhasDe = (tab, id) => tab.dom.elementos[id].filhos.map((li) => ({
  lugar: li.querySelector('.lugar').textContent,
  nome: li.querySelector('.nome').textContent,
  pontos: Number(li.querySelector('.pts').textContent),
  cor: li.querySelector('.cor').style.background,
  eu: li.className === 'eu',
}));

const placarNaTela = (tab) => linhasDe(tab, 'placar-lista');
const rankingNaTela = (tab) => linhasDe(tab, 'fim-ranking');
const escondido = (tab, id) => tab.dom.elementos[id].classes.has('hidden');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todos = [ana, bento, caio];

for (const tab of todos) tab.rede.ganchos.aoComecar(salaPara(tab.id));

const { Fisica } = ana.dom.api;
const fase = () => ana.dom.api.fase;

/** Um quadro em cada aba, `n` vezes - como tres aparelhos rodando juntos. */
function avancarTodos(n) {
  for (let i = 0; i < n; i++) for (const tab of todos) tab.dom.avancarQuadros(1);
}

/** Manda o retrato do mundo agora e deixa cada convidado assentar. */
function sincronizar(quadros = 2) {
  ana.dom.api.mandarEstado();
  avancarTodos(quadros);
  ana.dom.api.mandarEstado();
}

/** Poe um jogador em (x, y) no mundo do anfitriao - o unico que existe. */
function porNoMundo(id, x, y) {
  jogador(ana, id).corpo = Fisica.novoCorpo(x, y);
}

/** Da pontos a alguem no mundo do anfitriao, como se ele tivesse pego moedas. */
function darPontos(id, quanto) {
  jogador(ana, id).pontos += quanto;
}

/** Alguem encosta na bandeira e a fase fecha para a sala inteira. */
function tocarBandeira(id) {
  const b = fase().bandeira;
  porNoMundo(id, b.x, b.y);
  ana.dom.avancarQuadros(1);
  sincronizar();
}

// ------------------------------------------------ A mini-lista lateral -----
teste('a mini-lista do placar aparece quando ha sala, com a turma inteira', () => {
  for (const tab of todos) {
    assert.equal(escondido(tab, 'placar-sala'), false, `${tab.id} ve o placar da sala`);
    assert.deepEqual(placarNaTela(tab).map((p) => p.nome), ['Ana', 'Bento', 'Caio'],
      `${tab.id} ve os tres jogadores`);
    assert.deepEqual(placarNaTela(tab).map((p) => p.pontos), [0, 0, 0],
      `${tab.id} ve todo mundo zerado no comeco`);
  }
});

teste('cada linha vem com a cor da sala, e a minha vem marcada', () => {
  const cores = { Ana: '#f87858', Bento: '#b8f818', Caio: '#3cbcfc' };
  for (const tab of todos) {
    for (const p of placarNaTela(tab)) {
      assert.equal(p.cor, cores[p.nome], `${tab.id}: ${p.nome} esta com a cor dele`);
    }
    const meu = placarNaTela(tab).filter((p) => p.eu);
    assert.equal(meu.length, 1, `${tab.id} tem uma linha marcada como dele`);
    assert.equal(meu[0].nome, jogador(tab, tab.id).apelido, `${tab.id} marcou a linha certa`);
  }
});

teste('os pontos de um aparecem na tela de todos, na hora', () => {
  darPontos('bento', 120);
  darPontos('caio', 30);
  sincronizar();

  for (const tab of todos) {
    assert.deepEqual(placarNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Bento', 120], ['Caio', 30], ['Ana', 0]],
      `${tab.id} ve o placar de todos, do melhor para o pior`);
    assert.deepEqual(placarNaTela(tab).map((p) => p.lugar), ['1º', '2º', '3º'],
      `${tab.id} ve o lugar de cada um`);
  }
});

teste('quem passa na frente reordena a lista de todo mundo', () => {
  darPontos('ana', 200);
  sincronizar();

  for (const tab of todos) {
    assert.deepEqual(placarNaTela(tab).map((p) => p.nome), ['Ana', 'Bento', 'Caio'],
      `${tab.id} ja ve a Ana na frente`);
  }
});

// ------------------------------------- O total das fases, no retrato -------
teste('a bandeira fecha a fase e o bonus entra no total de todos', () => {
  tocarBandeira('bento');

  const esperado = { ana: 250, bento: 170, caio: 80 };   // pontos + 50 de bonus
  for (const tab of todos) {
    for (const p of jogadores) {
      assert.equal(jogador(tab, p.id).total, esperado[p.id],
        `${tab.id} ve o total de ${p.id} fechado com o bonus`);
    }
  }
});

teste('o total sobrevive a troca de fase: os pontos zeram, o placar nao', () => {
  ana.dom.clicar('btn-proxima');
  sincronizar(3);

  for (const tab of todos) {
    assert.equal(tab.jogo.fase, 2, `${tab.id} esta na fase 2`);
    assert.equal(jogador(tab, tab.id).pontos, 0, `${tab.id} comeca a fase 2 zerado`);
    assert.deepEqual(placarNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Ana', 250], ['Bento', 170], ['Caio', 80]],
      `${tab.id} ve o placar da corrida, e nao so o da fase`);
  }
});

teste('na fase nova os pontos novos somam em cima do total', () => {
  darPontos('caio', 300);
  sincronizar();

  for (const tab of todos) {
    assert.deepEqual(placarNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Caio', 380], ['Ana', 250], ['Bento', 170]],
      `${tab.id} ve o Caio disparar na frente`);
  }
});

// ---------------------------------------------- O ranking do fim -----------
teste('a bandeira da fase 3 fecha a partida da sala pela plataforma', () => {
  tocarBandeira('caio');                 // fim da fase 2
  ana.dom.clicar('btn-proxima');
  sincronizar(3);
  assert.equal(ana.jogo.fase, 3, 'a sala chegou na fase 3');

  darPontos('bento', 500);
  sincronizar();
  tocarBandeira('ana');                  // fim da corrida

  assert.equal(terminares.length, 1, 'o fim foi pedido uma vez so');
  assert.equal(terminares[0].de, 'ana', 'e quem pediu foi a anfitria');
  igual(terminares[0].placar.map((p) => [p.apelido, p.pontos]),
    [['Ana', 350], ['Caio', 480], ['Bento', 770]],
    'o placar viaja do PIOR para o MELHOR');
});

teste('todas as telas recebem o mesmo ranking, do pior para o melhor', () => {
  for (const tab of todos) {
    assert.equal(escondido(tab, 'tela-fim'), false, `${tab.id} esta na tela de PARABENS`);
    assert.equal(escondido(tab, 'fim-sala'), false, `${tab.id} ve o ranking da sala`);
    assert.equal(escondido(tab, 'fim-esperando'), true,
      `${tab.id} nao ficou esperando: o placar chegou`);
    assert.deepEqual(rankingNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Ana', 350], ['Caio', 480], ['Bento', 770]],
      `${tab.id} ve a mesma lista, terminando no campeao`);
    assert.deepEqual(rankingNaTela(tab).map((p) => p.lugar), ['🥉', '🥈', '🥇'],
      `${tab.id} ve as medalhas nos tres primeiros lugares`);
  }
});

teste('cada tela marca a sua linha e diz em que lugar a crianca ficou', () => {
  const meu = (tab) => rankingNaTela(tab).filter((p) => p.eu).map((p) => p.nome);
  assert.deepEqual(meu(ana), ['Ana'], 'a Ana se acha na lista');
  assert.deepEqual(meu(bento), ['Bento'], 'o Bento tambem');
  assert.deepEqual(meu(caio), ['Caio'], 'e o Caio');

  const recado = (tab) => tab.dom.elementos['fim-subtitulo'].textContent;
  assert.equal(recado(bento), 'Você foi o campeão da sala! 🏆', 'o campeao ouve isso');
  assert.equal(recado(caio), 'Você ficou em 2º lugar na sala 🏆', 'o segundo, isso');
  assert.equal(recado(ana), 'Você ficou em 3º lugar na sala 🏆', 'e a anfitria ficou em 3o');
});

teste('o ranking bate com o caderno da corrida de cada um', () => {
  for (const tab of todos) {
    const meu = rankingNaTela(tab).find((p) => p.eu);
    assert.equal(meu.pontos, tab.jogo.corrida.total,
      `${tab.id}: o numero do ranking e o total das tres fases dele`);
    assert.equal(tab.dom.elementos['fim-total'].textContent, String(tab.jogo.corrida.total),
      `${tab.id}: e o mesmo numero do resumo`);
  }
});

teste('acabada a partida, ninguem manda mais pacote nenhum', () => {
  const antes = todos.map((tab) => tab.dom.api.rede.enviados);
  avancarTodos(30);
  assert.deepEqual(todos.map((tab) => tab.dom.api.rede.enviados), antes,
    'o mundo parou e a rede tambem');
  for (const tab of todos) {
    assert.equal(tab.dom.api.rede.encerrada, true, `${tab.id} sabe que a partida acabou`);
  }
});

teste('numa sala o botao do fim leva de volta ao lobby, e nao para a fase 1', () => {
  for (const tab of todos) {
    assert.equal(tab.dom.elementos['btn-de-novo'].textContent, 'VOLTAR AO LOBBY',
      `${tab.id} ve o botao do lobby`);
  }
  bento.dom.clicar('btn-de-novo');
  assert.equal(bento.jogo.tela, 'menu', 'o Bento saiu da fase');
  assert.equal(bento.jogo.fase, 3, 'e ninguem recomecou a corrida sozinho');
  assert.equal(escondido(bento, 'placar-sala'), true, 'a mini-lista saiu da tela');
});

// -------------------------------- A plataforma que nao responde (4.5) ------
teste('sem resposta da plataforma, o placar local sobe depois de ~3 segundos', async () => {
  plataformaMuda = true;
  const avisos = [];
  for (const tab of todos) {
    tab.rede.ganchos.aoComecar(salaPara(tab.id));    // partida nova, mesma sala
    tab.dom.api.aoEvento((e) => { if (e.tipo.indexOf('ranking') === 0) avisos.push(e.tipo); });
    tab.dom.api.irParaFase(3);
  }
  darPontos('bento', 70);
  darPontos('caio', 140);
  sincronizar();
  tocarBandeira('ana');

  assert.equal(terminares.length, 2, 'a anfitria pediu o fim de novo');
  for (const tab of todos) {
    assert.equal(escondido(tab, 'fim-esperando'), false,
      `${tab.id} ainda esta juntando o placar da sala`);
    assert.equal(rankingNaTela(tab).length, 0, `${tab.id} nao inventou ranking nenhum`);
  }

  avancarTodos(200);                                  // mais de 3 segundos

  for (const tab of todos) {
    assert.equal(escondido(tab, 'fim-esperando'), true, `${tab.id} desistiu de esperar`);
    assert.deepEqual(rankingNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Ana', 50], ['Bento', 120], ['Caio', 190]],
      `${tab.id} mostrou o placar que tem em casa - e ele bate com o dos outros`);
  }
  assert.deepEqual(avisos, ['ranking-local', 'ranking-local', 'ranking-local'],
    'as tres telas sabem que o placar e o local, e nao o oficial');
});

// ------------------------------------------------------ E sozinho? ---------
teste('sozinho nao ha placar de sala nenhum: o PARABENS e o de sempre', () => {
  const solo = carregarJogoComTela('super_adventure');
  solo.clicar('btn-solo');
  assert.equal(solo.elementos['placar-sala'].classes.has('hidden'), true,
    'a mini-lista nao aparece no jogo solo');

  const mapa = solo.api.fase;
  solo.api.irParaFase(3);
  solo.api.jogo.heroi = solo.api.Fisica.novoCorpo(solo.api.fase.bandeira.x,
    solo.api.fase.bandeira.y);
  solo.avancarQuadros(2);

  assert.equal(solo.api.jogo.corrida.terminada, true, 'a corrida acabou');
  assert.equal(solo.elementos['tela-fim'].classes.has('hidden'), false, 'com o PARABENS na tela');
  assert.equal(solo.elementos['fim-sala'].classes.has('hidden'), true, 'e sem ranking de sala');
  assert.equal(solo.elementos['fim-subtitulo'].textContent, 'Você venceu as três fases 🏆',
    'o recado e o de quem jogou sozinho');
  assert.equal(solo.elementos['btn-de-novo'].textContent, 'JOGAR NOVAMENTE',
    'e o botao volta a ser o de recomecar a corrida');
  assert.ok(mapa, 'o mapa da fase 1 continua carregado no comeco');

  solo.clicar('btn-de-novo');
  assert.equal(solo.api.jogo.fase, 1, 'jogar de novo comeca da fase 1');
  assert.equal(solo.api.jogo.eu.total, 0, 'com o total da corrida zerado');
});

// ------------------------------------------------- O que esta na pagina ----
teste('o index.html tem a mini-lista do placar e o ranking do fim', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { RAIZ } = await import('./harness.mjs');
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');

  for (const id of ['placar-sala', 'placar-lista', 'fim-subtitulo', 'fim-sala',
                    'fim-ranking', 'fim-esperando']) {
    assert.ok(html.includes('id="' + id + '"'), `o index.html tem o #${id}`);
  }
});

teste('o style.css poe o placar no canto e desenha o ranking', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { RAIZ } = await import('./harness.mjs');
  const css = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'style.css'), 'utf8');

  assert.ok(/#placar-sala\s*{[^}]*position:\s*absolute/.test(css),
    'a mini-lista fica por cima do palco');
  assert.ok(/#placar-sala\s*{[^}]*pointer-events:\s*none/.test(css),
    'e nao rouba o toque do jogo');
  assert.ok(css.includes('.placar-lista li.eu'), 'a minha linha e destacada');
  assert.ok(css.includes('.ranking li:last-child'), 'e o campeao fecha o ranking em destaque');
  assert.ok(!/blur|linear-gradient|radial-gradient/.test(css),
    'nada de desfoque nem degrade: o visual e 8-bit');
});

await fim('Fase 13');
