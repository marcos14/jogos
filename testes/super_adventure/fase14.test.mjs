/* ==========================================================================
   Super Adventure - Fase 14: os casos de borda do multijogador
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase14.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas de navegador:
   Ana e a anfitria (simula o mundo inteiro) e Bento e Caio sao convidados. A
   Plataforma e de mentira - mas esta, ao contrario da do fase13.test.mjs, sabe
   fazer o que a Central faz quando a coisa da errado: mandar o `saiu` de quem
   largou a sala, chamar o `aoAbortar` de todo mundo quando o anfitriao cai,
   entregar um pacote atrasado depois do fim da partida e simplesmente PARAR de
   entregar, para o jogo descobrir sozinho que a rede engasgou.

   O que se cobra aqui:

     - quem sai some do mundo e do placar, e a partida continua para quem ficou;
     - o `aoAbortar` no meio da partida devolve todo mundo ao menu, com o motivo
       na tarja - e nenhuma tela fica presa por cima do jogo;
     - pacote (e ate o `fim` da plataforma) que chega DEPOIS de a partida
       fechar e descartado, sem erro e sem mexer no mundo congelado;
     - mais de 2 segundos sem noticia da sala e a tarja "CONEXAO INSTAVEL" no
       palco - que some sozinha no primeiro pacote que chegar.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const elenco = [
  { id: 'ana', apelido: 'Ana', cor: '#f87858', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#b8f818', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#3cbcfc', indice: 2, pronto: true, anfitriao: false },
];

console.log('Super Adventure - fase 14\n');

// ------------------------------------------- A Central de mentira ----------
const abas = new Map();
const naSala = new Set(elenco.map((j) => j.id));
let entregando = true;        // desligado, nenhuma mensagem chega a lugar nenhum
let plataformaMuda = false;   // ligada, o `terminar()` nao volta para ninguem

/** O instantaneo da sala como ela esta agora, do ponto de vista de `id`. */
function salaPara(id) {
  return {
    codigo: 'F14A',
    estado: 'jogando',
    modo: 'competitivo',
    max: 8,
    min: 1,
    taxaEstado: 20,
    semente: 1414,
    eu: id,
    souAnfitriao: id === 'ana',
    anfitriao: 'ana',
    jogadores: elenco.filter((j) => naSala.has(j.id)),
  };
}

function criarPlataforma(id) {
  let ganchos = {};
  const ouvintes = new Map();

  function entregar(destino, origem, d) {
    if (!entregando || !naSala.has(destino)) return;
    const aba = abas.get(destino);
    if (aba && aba.ganchos.aoReceber) aba.ganchos.aoReceber({ de: origem, d });
  }

  const mj = {
    disponivel: true,
    max: 8,
    em(nome, fn) {
      if (!ouvintes.has(nome)) ouvintes.set(nome, []);
      ouvintes.get(nome).push(fn);
      return mj;
    },
    abrirLobby(opcoes) { ganchos = opcoes || {}; return mj; },
    sair() { naSala.delete(id); return mj; },
    enviar(d) {
      for (const j of elenco) if (j.id !== id) entregar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) { entregar('ana', id, d); return true; },
    /* Igualzinho ao servidor: o `fim` volta para a sala INTEIRA, o anfitriao
       incluso, com o mesmo placar para todo mundo. */
    terminar(placar) {
      if (plataformaMuda || !entregando) return mj;
      for (const j of elenco) {
        const aba = abas.get(j.id);
        if (naSala.has(j.id) && aba && aba.ganchos.aoTerminar) aba.ganchos.aoTerminar({ placar });
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

  return {
    plataforma,
    get ganchos() { return ganchos; },
    /** Dispara um evento do canal (o `saiu`, por exemplo) nesta aba. */
    soltar(nome, dado) { (ouvintes.get(nome) || []).slice().forEach((fn) => fn(dado)); },
  };
}

async function abrirAba(id) {
  const rede = criarPlataforma(id);
  const dom = carregarJogoComTela('super_adventure', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

/* O que o servidor faz quando alguem larga a sala (fechou a aba, o wi-fi caiu,
   clicou em sair): tira o jogador da sala e avisa quem ficou. Quem saiu nao
   recebe o proprio aviso. */
function largarSala(id, motivo = 'saiu') {
  const quem = elenco.find((j) => j.id === id);
  naSala.delete(id);
  for (const outro of naSala) {
    abas.get(outro).soltar('saiu', { id, apelido: quem.apelido, motivo });
  }
}

/** O que o servidor faz quando o anfitriao cai no meio da partida. */
function abortarSala(motivo = 'O anfitriao saiu - a partida foi encerrada.') {
  for (const id of [...naSala]) {
    const aba = abas.get(id);
    if (aba.ganchos.aoAbortar) aba.ganchos.aoAbortar({ motivo });
  }
}

// ---------------------------------------------------------- As tres abas ---
const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todos = [ana, bento, caio];

const { Fisica } = ana.dom.api;
const fase = () => ana.dom.api.fase;
const jogador = (tab, id) => tab.jogo.jogadores.find((j) => j.id === id);
const escondido = (tab, id) => tab.dom.elementos[id].classes.has('hidden');
const recado = (tab) => tab.dom.elementos['recado-palco'].textContent;
const rede = (tab) => tab.dom.api.rede;

/** As linhas de uma lista de placar, como estao na tela. */
const linhasDe = (tab, id) => tab.dom.elementos[id].filhos.map((li) => ({
  lugar: li.querySelector('.lugar').textContent,
  nome: li.querySelector('.nome').textContent,
  pontos: Number(li.querySelector('.pts').textContent),
}));

const placarNaTela = (tab) => linhasDe(tab, 'placar-lista');
const rankingNaTela = (tab) => linhasDe(tab, 'fim-ranking');

/** As abas que ainda estao na sala, um quadro em cada, `n` vezes. */
function avancarTodos(n) {
  for (let i = 0; i < n; i++) {
    for (const tab of todos) if (naSala.has(tab.id)) tab.dom.avancarQuadros(1);
  }
}

/** Manda o retrato do mundo agora e deixa cada convidado assentar. */
function sincronizar(quadros = 2) {
  ana.dom.api.mandarEstado();
  avancarTodos(quadros);
  ana.dom.api.mandarEstado();
}

function darPontos(id, quanto) { jogador(ana, id).pontos += quanto; }

/** Comeca uma partida nova, na sala como ela esta agora. */
function comecarPartida() {
  for (const tab of todos) {
    if (naSala.has(tab.id)) tab.rede.ganchos.aoComecar(salaPara(tab.id));
  }
}

comecarPartida();

// =========================================================================
// 1. ALGUEM SAI NO MEIO DA PARTIDA
// =========================================================================
teste('a partida comeca com a sala inteira no mundo de todas as abas', () => {
  sincronizar();
  for (const tab of todos) {
    assert.equal(tab.jogo.jogadores.length, 3, `${tab.id} tem os tres no mundo`);
    assert.deepEqual(placarNaTela(tab).map((p) => p.nome), ['Ana', 'Bento', 'Caio'],
      `${tab.id} ve os tres no placar`);
  }
});

teste('quem sai some do mundo e do placar de quem ficou', () => {
  darPontos('bento', 120);
  darPontos('caio', 300);
  sincronizar();

  largarSala('caio');

  for (const tab of [ana, bento]) {
    assert.equal(tab.jogo.jogadores.length, 2, `${tab.id} ficou com dois no mundo`);
    assert.equal(jogador(tab, 'caio'), undefined, `${tab.id} nao tem mais o Caio`);
    assert.deepEqual(placarNaTela(tab).map((p) => p.nome), ['Bento', 'Ana'],
      `${tab.id} ve o placar sem o Caio - e o Bento na frente`);
    assert.equal(rede(tab).saidas, 1, `${tab.id} contou uma saida`);
  }
});

teste('a partida continua para quem ficou: o mundo anda e os pontos sobem', () => {
  const relogio = ana.jogo.relogio;
  darPontos('bento', 40);
  avancarTodos(30);
  sincronizar();

  assert.ok(ana.jogo.relogio > relogio, 'a anfitria continuou simulando o mundo');
  for (const tab of [ana, bento]) {
    assert.equal(tab.jogo.tela, 'jogando', `${tab.id} continua na fase`);
    assert.equal(escondido(tab, 'placar-sala'), false, `${tab.id} ainda ve o placar da sala`);
    assert.equal(jogador(tab, 'bento').pontos, 160, `${tab.id} ve os pontos novos do Bento`);
  }
  assert.equal(bento.jogo.relogio > 0, true, 'e o convidado continua recebendo o mundo');
});

teste('o retrato do anfitriao passa a viajar sem a linha de quem saiu', () => {
  const ultimo = rede(bento).ultimaMensagem;
  assert.equal(ultimo.d.j.length, 2, 'o retrato tem duas linhas de jogador');
  // O jogo roda dentro de um `vm`: os arrays que vem de la tem outro prototipo
  // e o `deepEqual` reclama. Comparar o texto resolve.
  assert.equal(JSON.stringify(ultimo.d.j.map((linha) => linha[0])), '[0,1]',
    'so os indices de quem ficou (Ana e Bento)');
});

teste('o "saiu" de quem nem estava na sala nao mexe em nada', () => {
  bento.rede.soltar('saiu', { id: 'zeca', apelido: 'Zeca' });
  assert.equal(bento.jogo.jogadores.length, 2, 'o mundo do Bento continua com dois');
  assert.equal(rede(bento).saidas, 1, 'e nenhuma saida nova foi contada');
});

teste('ninguem se apaga a si mesmo se o proprio "saiu" chegar de volta', () => {
  bento.rede.soltar('saiu', { id: 'bento', apelido: 'Bento' });
  assert.ok(jogador(bento, 'bento'), 'o Bento continua existindo na tela do Bento');
  assert.ok(bento.jogo.eu, 'e o jogo continua tendo um heroi');
});

teste('sobrando um so, a mini-lista sai da tela e o jogo segue', () => {
  largarSala('bento');
  avancarTodos(10);

  assert.equal(ana.jogo.jogadores.length, 1, 'a anfitria ficou sozinha na sala');
  assert.equal(escondido(ana, 'placar-sala'), true, 'sem grupo, sem mini-lista');
  assert.equal(ana.jogo.tela, 'jogando', 'e a fase continua rolando');
  assert.equal(rede(ana).saidas, 2, 'as duas saidas foram contadas');
});

teste('sozinho na sala, ninguem reclama de conexao instavel', () => {
  ana.dom.avancarQuadros(200);          // mais de 3 segundos sem pacote nenhum
  assert.equal(rede(ana).instavel, false, 'nao ha com quem falar: nada a vigiar');
  assert.equal(escondido(ana, 'recado-palco'), true, 'e nenhuma tarja subiu no palco');
});

// =========================================================================
// 2. O ANFITRIAO CAI NO MEIO DA PARTIDA
// =========================================================================
teste('o aoAbortar no meio da partida devolve todo mundo ao menu, com o motivo', () => {
  naSala.add('bento');
  naSala.add('caio');
  comecarPartida();
  sincronizar();
  for (const tab of todos) assert.equal(tab.jogo.tela, 'jogando', `${tab.id} esta na fase`);

  abortarSala();

  for (const tab of todos) {
    assert.equal(tab.jogo.tela, 'menu', `${tab.id} voltou para o menu`);
    assert.equal(escondido(tab, 'tela-menu'), false, `${tab.id} ve a tela inicial`);
    assert.equal(escondido(tab, 'aviso'), false, `${tab.id} ve a tarja do recado`);
    assert.equal(tab.dom.elementos.aviso.textContent,
      'O anfitriao saiu - a partida foi encerrada.', `${tab.id} leu o motivo`);
    assert.equal(rede(tab).sala, null, `${tab.id} nao esta mais numa sala`);
    assert.equal(rede(tab).papel, 'solo', `${tab.id} voltou a ser um jogo de um so`);
  }
});

teste('abortar nao deixa nenhuma tela presa por cima do jogo', () => {
  for (const tab of todos) {
    for (const tela of ['tela-fase', 'tela-fim', 'tela-pausa', 'hud',
                        'placar-sala', 'controles', 'recado-palco', 'hud-sala']) {
      assert.equal(escondido(tab, tela), true, `${tab.id} nao tem ${tela} na frente`);
    }
  }
});

teste('depois do aborto da para jogar de novo, na hora', () => {
  caio.dom.clicar('btn-solo');
  caio.dom.avancarQuadros(10);

  assert.equal(caio.jogo.tela, 'jogando', 'o Caio caiu numa partida solo');
  assert.equal(caio.jogo.fase, 1, 'na fase 1');
  assert.equal(caio.jogo.jogadores.length, 1, 'com um jogador so');
  assert.equal(escondido(caio, 'aviso'), true, 'e a tarja do recado saiu da frente');
  caio.dom.api.voltarAoMenu();
});

teste('o anfitriao caindo com o jogo PAUSADO tambem nao prende ninguem', () => {
  comecarPartida();
  sincronizar();
  bento.dom.clicar('btn-pausa');
  assert.equal(bento.jogo.pausado, true, 'o Bento pausou');
  assert.equal(escondido(bento, 'tela-pausa'), false, 'com o quadro de pausa na tela');

  abortarSala('A sala foi desfeita.');

  assert.equal(bento.jogo.pausado, false, 'a pausa foi solta');
  assert.equal(escondido(bento, 'tela-pausa'), true, 'o quadro de pausa saiu');
  assert.equal(bento.jogo.tela, 'menu', 'e o Bento esta no menu');
  assert.equal(bento.dom.elementos.aviso.textContent, 'A sala foi desfeita.', 'com o motivo');
});

teste('anfitriao caido no fim da corrida: vale o placar daqui, sem espera eterna', () => {
  plataformaMuda = true;                  // a Central nao vai confirmar o fim
  comecarPartida();
  for (const tab of todos) tab.dom.api.irParaFase(3);
  darPontos('bento', 90);
  darPontos('caio', 40);
  sincronizar();

  // A bandeira da fase 3 fecha a corrida: dai todo mundo fica esperando o
  // placar oficial - que nunca vem, porque o anfitriao cai antes.
  jogador(ana, 'ana').corpo = Fisica.novoCorpo(fase().bandeira.x, fase().bandeira.y);
  ana.dom.avancarQuadros(1);
  sincronizar();

  for (const tab of todos) {
    assert.equal(tab.jogo.corrida.terminada, true, `${tab.id} viu a corrida acabar`);
    assert.equal(escondido(tab, 'fim-esperando'), false, `${tab.id} esta juntando o placar`);
  }

  abortarSala('A sala foi encerrada.');

  for (const tab of todos) {
    assert.equal(escondido(tab, 'tela-fim'), false, `${tab.id} continua no PARABENS`);
    assert.equal(escondido(tab, 'fim-esperando'), true, `${tab.id} parou de esperar`);
    assert.deepEqual(rankingNaTela(tab).map((p) => [p.nome, p.pontos]),
      [['Ana', 50], ['Caio', 90], ['Bento', 140]],
      `${tab.id} montou o ranking com o placar que tem em casa`);
    assert.equal(recado(tab), 'A sala foi encerrada.', `${tab.id} leu o motivo no palco`);
    assert.equal(rede(tab).encerrada, true, `${tab.id} sabe que a partida acabou`);
  }
});

teste('e do PARABENS de uma sala abortada da para sair', () => {
  caio.dom.clicar('btn-de-novo');
  assert.equal(caio.jogo.tela, 'menu', 'o Caio saiu da tela de fim');
  assert.equal(escondido(caio, 'recado-palco'), true, 'a tarja do palco nao seguiu para o menu');
});

// =========================================================================
// 3. PACOTE ATRASADO, DEPOIS DO FIM DA PARTIDA
// =========================================================================
teste('acabada a partida, o retrato atrasado do anfitriao e descartado', () => {
  plataformaMuda = false;
  comecarPartida();
  for (const tab of todos) tab.dom.api.irParaFase(2);
  darPontos('bento', 70);
  sincronizar();

  ana.dom.api.irParaFase(3);
  jogador(ana, 'caio').corpo = Fisica.novoCorpo(fase().bandeira.x, fase().bandeira.y);
  ana.dom.avancarQuadros(1);
  avancarTodos(2);

  for (const tab of todos) {
    assert.equal(rede(tab).encerrada, true, `${tab.id} recebeu o fim oficial`);
  }

  const antes = todos.map((tab) => ({
    descartados: rede(tab).descartados,
    fase: tab.jogo.fase,
    pontos: jogador(tab, 'bento') ? jogador(tab, 'bento').pontos : -1,
    ranking: rankingNaTela(tab).map((p) => [p.nome, p.pontos]),
  }));

  // O anfitriao (ou um pacote que estava a caminho) manda mais um retrato,
  // agora de um mundo que ninguem mais esta jogando.
  ana.dom.api.irParaFase(1);
  darPontos('bento', 999);
  ana.dom.api.mandarEstado();
  ana.dom.api.mandarEstado();

  for (let i = 1; i < todos.length; i++) {
    const tab = todos[i];
    assert.equal(rede(tab).descartados, antes[i].descartados + 2,
      `${tab.id} jogou fora os dois retratos atrasados`);
    assert.equal(tab.jogo.fase, antes[i].fase, `${tab.id} nao trocou de fase depois do fim`);
    assert.equal(jogador(tab, 'bento').pontos, antes[i].pontos,
      `${tab.id} nao mexeu mais no placar`);
    assert.deepEqual(rankingNaTela(tab).map((p) => [p.nome, p.pontos]), antes[i].ranking,
      `${tab.id} continua com o mesmo ranking na tela`);
  }
});

teste('o "fim" atrasado da plataforma tambem e descartado, sem erro', () => {
  const antes = todos.map((tab) => ({
    descartados: rede(tab).descartados,
    ranking: rankingNaTela(tab).map((p) => [p.nome, p.pontos]),
    tela: tab.jogo.tela,
  }));

  // Um placar completamente diferente, chegando tarde demais.
  const atrasado = { placar: [{ id: 'ana', indice: 0, apelido: 'Ana', cor: '#f87858', pontos: 9999 }] };
  for (const tab of todos) tab.rede.ganchos.aoTerminar(atrasado);

  todos.forEach((tab, i) => {
    assert.equal(rede(tab).descartados, antes[i].descartados + 1,
      `${tab.id} contou o fim atrasado como descartado`);
    assert.deepEqual(rankingNaTela(tab).map((p) => [p.nome, p.pontos]), antes[i].ranking,
      `${tab.id} nao trocou o ranking que ja estava na tela`);
    assert.equal(tab.jogo.tela, antes[i].tela, `${tab.id} continua onde estava`);
  });
});

teste('e nenhum pacote atrasado desperta a partida que acabou', () => {
  const antes = todos.map((tab) => rede(tab).enviados);
  avancarTodos(60);
  assert.deepEqual(todos.map((tab) => rede(tab).enviados), antes,
    'o mundo parou e a rede tambem');
});

// =========================================================================
// 4. A REDE ENGASGA: MAIS DE 2 SEGUNDOS SEM PACOTE
// =========================================================================
teste('mais de 2 segundos sem noticia da sala e a tarja sobe no palco', () => {
  for (const tab of todos) tab.dom.api.voltarAoMenu();
  comecarPartida();
  sincronizar();
  for (const tab of todos) {
    assert.equal(rede(tab).instavel, false, `${tab.id} comeca com a rede em paz`);
  }

  entregando = false;                    // a rede caiu para todo mundo
  avancarTodos(110);                     // menos de 2 segundos
  for (const tab of todos) {
    assert.equal(rede(tab).instavel, false, `${tab.id} ainda nao reclamou`);
  }

  avancarTodos(20);                      // passou dos 2 segundos
  for (const tab of todos) {
    assert.equal(rede(tab).instavel, true, `${tab.id} percebeu o silencio`);
    assert.equal(escondido(tab, 'recado-palco'), false, `${tab.id} ve a tarja no palco`);
    assert.equal(recado(tab), '⚠ CONEXÃO INSTÁVEL', `${tab.id} leu o aviso`);
  }
});

teste('o aviso vale tanto para o anfitriao quanto para os convidados', () => {
  assert.equal(rede(ana).papel, 'anfitriao', 'a Ana e a anfitria');
  assert.equal(rede(bento).papel, 'convidado', 'e o Bento e convidado');
  assert.ok(rede(ana).instavel && rede(bento).instavel,
    'os dois lados sabem quando pararam de ouvir a sala');
});

teste('a tarja some sozinha no primeiro pacote que chegar', () => {
  entregando = true;
  sincronizar();
  avancarTodos(6);        // o tempo de as teclas dos convidados subirem tambem

  for (const tab of todos) {
    assert.equal(rede(tab).instavel, false, `${tab.id} voltou a ouvir a sala`);
    assert.equal(escondido(tab, 'recado-palco'), true, `${tab.id} nao ve mais a tarja`);
    assert.equal(recado(tab), '', `${tab.id} apagou o texto`);
  }
});

teste('a partida sobrevive ao engasgo: ninguem travou nem perdeu o mundo', () => {
  darPontos('bento', 25);
  avancarTodos(30);
  sincronizar();

  for (const tab of todos) {
    assert.equal(tab.jogo.tela, 'jogando', `${tab.id} continua na fase`);
    assert.equal(jogador(tab, 'bento').pontos, jogador(ana, 'bento').pontos,
      `${tab.id} esta com o mesmo placar do mundo do anfitriao`);
  }
});

// ------------------------------------------------------------ E sozinho? ---
teste('no jogo solo nao existe tarja de conexao nenhuma', () => {
  const solo = carregarJogoComTela('super_adventure');
  solo.clicar('btn-solo');
  solo.avancarQuadros(300);            // cinco segundos sem rede nenhuma

  assert.equal(solo.api.rede.instavel, false, 'sem sala, nao ha conexao para vigiar');
  assert.equal(solo.elementos['recado-palco'].classes.has('hidden'), true,
    'e a tarja nunca aparece');
  assert.equal(solo.api.jogo.tela, 'jogando', 'o jogo solo continua rolando');
});

// ------------------------------------------------- O que esta na pagina ----
teste('o index.html tem a tarja do palco, por cima de todas as telas', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { RAIZ } = await import('./harness.mjs');
  const html = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');

  assert.ok(html.includes('id="recado-palco"'), 'o index.html tem o #recado-palco');
  assert.ok(html.indexOf('id="recado-palco"') > html.indexOf('id="tela-fim"'),
    'e ele vem DEPOIS das telas, para ser pintado por cima delas');
});

teste('o style.css desenha a tarja no alto do palco, sem roubar o toque', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { RAIZ } = await import('./harness.mjs');
  const css = fs.readFileSync(
    path.join(RAIZ, 'jogos', 'super_adventure', 'style.css'), 'utf8');

  assert.ok(/#recado-palco\s*{[^}]*position:\s*absolute/.test(css), 'ela fica por cima do palco');
  assert.ok(/#recado-palco\s*{[^}]*pointer-events:\s*none/.test(css), 'e nao rouba o toque do jogo');
  assert.ok(!/blur|linear-gradient|radial-gradient/.test(css),
    'nada de desfoque nem degrade: o visual e 8-bit');
});

await fim('Fase 14');
