/* ==========================================================================
   Come-Come - Fase 11: mundo unico - pastilhas, poder e fantasmas da sala
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase11.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas de navegador:
   Ana e a anfitria (simula o mundo inteiro) e Bento e Caio sao convidados. A
   Central e de mentira e entrega na hora - a latencia e o assunto do
   fase10.test.mjs, e o WebSocket de verdade o do fase8-tela. Aqui o alvo e
   outro: o labirinto e UM SO, e disputado.

     - a pastilha que um come some nas tres telas, e os pontos ficam so com
       quem chegou primeiro (o `modo: competitivo` do manifesto);
     - a bolota grande vale para a SALA: os quatro fantasmas ficam azuis para
       todo mundo ao mesmo tempo;
     - mas a escada 200/400/800/1600 e de CADA UM: dois come-comes cacando ao
       mesmo tempo ganham 200 cada, e nao 200 e 400;
     - cada fantasma cuida do come-come mais PERTO, sem largar a personalidade;
     - um tombo de um nao mexe no mundo dos outros;
     - cada aparelho pinta cada jogador com a cor da SALA, e o apelido e a cor
       que vieram de fora entram como dados (`textContent`, cor conferida);
     - e o jogo de um jogador so continua exatamente o que era.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, teste, fim } from './harness.mjs';

/* Cores fora da paleta de casa (`['#fcd800', '#ff8adc', '#7cf8a0', ...]`), de
   proposito: assim, achar uma delas no canvas quer dizer que aquele jogador foi
   pintado com a cor que a CENTRAL escolheu, e nao com a de reserva. */
const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

const abas = new Map();

function salaPara(id) {
  return {
    codigo: 'F11C', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 31337,
    eu: id, souAnfitriao: id === 'ana', anfitriao: 'ana',
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

async function abrirAba(id) {
  const rede = criarPlataforma(id);
  const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

const valor = (o) => JSON.parse(JSON.stringify(o));

/** A linha daquela pessoa no mundo de uma aba. */
function jogador(aba, id) {
  return aba.jogo.jogadores.find((j) => j.id === id);
}

/* Nenhuma pastilha voltou a existir: as que ja tinham sumido continuam
   sumidas. (Comer MAIS pastilhas no meio do caminho e a vida seguindo - o que
   nao pode e o labirinto se refazer.) */
function continuamComidas(agora, antes, msg) {
  for (let i = 0; i < antes.restam.length; i++) {
    if (antes.restam[i]) continue;
    assert.equal(agora.restam[i], false, `${msg} (a pastilha ${i} voltou)`);
  }
  assert.ok(agora.faltam <= antes.faltam, msg);
}

/** Um quadro em cada aba, na mesma ordem, `quantos` vezes. */
function avancarTodos(quantos, ordem) {
  for (let i = 0; i < quantos; i++) for (const aba of ordem) aba.dom.avancarQuadros(1);
}

/* Poe o come-come de alguem em cima de um lugar do labirinto DA ANFITRIA - que
   e o unico mundo que decide qualquer coisa. O pedido de direcao guardado se
   perde junto: senao o corpo sairia andando para o lado em que estava indo e
   comeria de tabela a pastilha do vizinho. */
function porEm(id, x, y, dir = 'esquerda') {
  const j = jogador(ana, id);
  j.corpo = { x, y, dir, desejada: dir, parado: false, passos: j.corpo.passos };
  j.entrada.desejada = null;
  return j;
}

/* Tira alguem do caminho: o come-come vai para o canto de cima a esquerda, que
   e parede macica. La ele nao come pastilha nenhuma (nao ha), nao encosta em
   fantasma (o corredor mais perto esta a um quadrado inteiro, e o toque conta
   em 8px) e nao atrapalha a conta de ninguem. */
function estacionar(id) {
  const meio = ana.dom.api.Mapa.centro(0, 0);
  return porEm(id, meio.x, meio.y);
}

/* Um quadro do mundo da anfitria com as vidas repostas antes. E a mesma rede de
   seguranca do piloto do harness: aqui o assunto e a pastilha, o poder e a
   escada, e um tombo no meio congelaria o mundo e faria o teste falar de
   sobrevivencia. O tombo tem o teste dele, mais abaixo. */
function quadroDoMundo(quantos = 1) {
  const { Rodada } = ana.dom.api;
  for (let i = 0; i < quantos; i++) {
    ana.jogo.rodada = Rodada.novoEstado();
    ana.jogo.tombado = -1;
    ana.dom.avancarQuadros(1);
  }
}

/* Poe um come-come em cima de um fantasma azul, os dois no MEIO do mesmo
   quadrado. Encaixar os dois no centro e o que faz o encontro sobreviver ao
   quadro seguinte: o `Movimento` alinha todo corpo no eixo do corredor, e
   largar os dois no meio do caminho podia separa-los mais do que os 8px do
   toque. A pastilha que estivesse ali sai da frente junto - o que esta em jogo
   nestes testes e quanto vale o FANTASMA. */
function encostarNoFantasma(id, f) {
  const { Mapa } = ana.dom.api;
  const meio = Mapa.centro(Mapa.coluna(f.corpo.x), Mapa.linha(f.corpo.y));
  f.corpo = { ...f.corpo, x: meio.x, y: meio.y };
  limparQuadrado(f.corpo);
  return porEm(id, meio.x, meio.y, f.corpo.dir);
}

/* Tira da frente a pastilha do quadrado em que aquele corpo esta - so no mundo
   da anfitria, que e o unico que decide. Usado nos testes da escada: o que esta
   em jogo la e quanto vale o fantasma, e nao a pastilha que calhou de estar
   debaixo dele. */
function limparQuadrado(corpo) {
  const { Mapa, Pastilhas } = ana.dom.api;
  const mapa = ana.dom.api.labirinto;
  ana.jogo.pastilhas = Pastilhas.comer(
    ana.jogo.pastilhas, mapa, Mapa.coluna(corpo.x), Mapa.linha(corpo.y)).estado;
}

/** A primeira pastilha comum ainda de pe que nao esta debaixo de ninguem. */
function pastilhaLivre() {
  const mapa = ana.dom.api.labirinto;
  const ocupados = ana.jogo.jogadores.map((j) => `${j.corpo.x},${j.corpo.y}`);
  for (let i = 0; i < mapa.pastilhas.length; i++) {
    const p = mapa.pastilhas[i];
    if (p.poder) continue;
    if (!ana.jogo.pastilhas.restam[i]) continue;
    if (ocupados.indexOf(`${p.x},${p.y}`) >= 0) continue;
    return { indice: i, ...p };
  }
  throw new Error('o labirinto ficou sem pastilha livre para o teste');
}

/** A bolota de poder ainda de pe mais proxima do canto de cima. */
function bolotaLivre() {
  const mapa = ana.dom.api.labirinto;
  const i = mapa.poderes.find((k) => ana.jogo.pastilhas.restam[k]);
  assert.ok(i !== undefined, 'o labirinto ainda tem bolota de poder para o teste');
  return { indice: i, ...mapa.pastilhas[i] };
}

console.log('Come-Come - fase 11\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todas = [ana, bento, caio];

for (const aba of todas) aba.rede.ganchos.aoComecar(salaPara(aba.id));
/* Os primeiros quadros de uma copia recem-carregada nao simulam nada: o laco do
   navegador precisa de duas batidas para ter um `dt` para medir. Essa e a
   "partida a frio" - sem ela, todo teste daqui teria que contar um quadro a
   mais so por causa do relogio. */
for (const aba of todas) aba.dom.avancarQuadros(1);

// ------------------------------------------------- A pastilha e do grupo --
teste('a pastilha que um convidado come some nas tres telas', () => {
  estacionar('ana');
  estacionar('caio');
  const pastilha = pastilhaLivre();
  const faltavam = ana.jogo.pastilhas.faltam;

  porEm('bento', pastilha.x, pastilha.y);
  quadroDoMundo();                     // um quadro do mundo do anfitriao

  assert.equal(ana.jogo.pastilhas.restam[pastilha.indice], false,
    'no mundo da anfitria a pastilha ja nao existe mais');
  assert.equal(ana.jogo.pastilhas.faltam, faltavam - 1, 'e o contador desceu um');

  ana.dom.api.mandarEstado();
  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.pastilhas.restam[pastilha.indice], false,
      `${aba.id} viu a mesma pastilha sumir`);
    assert.equal(aba.jogo.pastilhas.faltam, faltavam - 1,
      'e o HUD dele conta as mesmas que faltam');
  }
});

teste('...e os pontos ficam so com quem comeu', () => {
  const { PONTOS_PASTILHA } = ana.dom.api.mundo;
  estacionar('ana');
  estacionar('caio');
  const pastilha = pastilhaLivre();
  const antes = {
    ana: jogador(ana, 'ana').pontos,
    bento: jogador(ana, 'bento').pontos,
    caio: jogador(ana, 'caio').pontos,
  };

  porEm('bento', pastilha.x, pastilha.y);
  quadroDoMundo();
  ana.dom.api.mandarEstado();

  for (const aba of todas) {
    assert.equal(jogador(aba, 'bento').pontos, antes.bento + PONTOS_PASTILHA,
      `${aba.id} ve os 10 pontos na linha do Bento`);
    assert.equal(jogador(aba, 'ana').pontos, antes.ana, 'e ninguem mais ganhou nada');
    assert.equal(jogador(aba, 'caio').pontos, antes.caio);
  }
  assert.equal(bento.jogo.pontos, antes.bento + PONTOS_PASTILHA,
    'no aparelho do Bento o HUD e a linha dele');
  assert.equal(caio.jogo.pontos, antes.caio,
    'e no do Caio o HUD continua onde estava');
});

teste('a mesma pastilha nao rende duas vezes, nem para quem passar depois', () => {
  const { PONTOS_PASTILHA } = ana.dom.api.mundo;
  estacionar('ana');
  estacionar('bento');
  const pastilha = pastilhaLivre();

  porEm('caio', pastilha.x, pastilha.y);
  quadroDoMundo();
  const ganhou = jogador(ana, 'caio').pontos;

  // Agora o Bento passa por cima do mesmo quadrado, ja limpo.
  const antesBento = jogador(ana, 'bento').pontos;
  porEm('bento', pastilha.x, pastilha.y);
  quadroDoMundo();

  assert.equal(jogador(ana, 'bento').pontos, antesBento,
    'quadrado limpo nao rende nada para quem chega depois');
  assert.equal(jogador(ana, 'caio').pontos, ganhou,
    'e quem comeu tambem nao ganha de novo');
  assert.equal(PONTOS_PASTILHA, 10, 'a pastilha comum continua valendo 10');
});

// ------------------------------------------------- A bolota e da sala ------
teste('a bolota de um assusta os fantasmas para os tres ao mesmo tempo', () => {
  const { PONTOS_PODER } = ana.dom.api.mundo;
  estacionar('ana');
  estacionar('bento');
  // Os quatro na rua, para o susto ter em quem pegar.
  quadroDoMundo(400);                  // tempo de os quatro sairem da casa
  ana.dom.api.mandarEstado();

  const bolota = bolotaLivre();
  const antes = jogador(ana, 'caio').pontos;
  for (const aba of todas) {
    assert.equal(aba.jogo.poder.ativo, false, `${aba.id} comeca sem feitico nenhum`);
  }

  porEm('caio', bolota.x, bolota.y);
  quadroDoMundo();
  ana.dom.api.mandarEstado();

  for (const aba of todas) {
    assert.equal(aba.jogo.poder.ativo, true, `${aba.id} ve o feitico valendo`);
    assert.equal(aba.jogo.poder.restam, ana.jogo.poder.restam,
      'com o mesmo tanto de tempo pela frente');
    const naRua = aba.jogo.fantasmas.lista.filter((f) => f.etapa === 'livre');
    assert.ok(naRua.length > 0, 'ha fantasma na rua para se assustar');
    assert.ok(naRua.every((f) => f.assustado === true),
      `os fantasmas da rua estao azuis na tela do ${aba.id}`);
  }
  assert.equal(jogador(ana, 'caio').pontos, antes + PONTOS_PODER,
    'mas os 50 pontos da bolota sao so de quem a mordeu');
});

teste('dois jogadores comendo fantasmas mantem escadas independentes', () => {
  const { Poder, mundo } = ana.dom.api;
  const azuis = ana.jogo.fantasmas.lista.filter((f) => f.assustado && f.etapa === 'livre');
  assert.ok(azuis.length >= 2, 'ha pelo menos dois fantasmas azuis para a caca');

  const antes = {
    bento: jogador(ana, 'bento').pontos,
    caio: jogador(ana, 'caio').pontos,
  };
  estacionar('ana');

  // Cada um encosta no SEU fantasma, no mesmo quadro.
  encostarNoFantasma('bento', azuis[0]);
  encostarNoFantasma('caio', azuis[1]);
  quadroDoMundo();

  assert.equal(jogador(ana, 'bento').pontos, antes.bento + mundo.PREMIOS[0],
    'o primeiro fantasma do Bento vale 200');
  assert.equal(jogador(ana, 'caio').pontos, antes.caio + mundo.PREMIOS[0],
    'e o primeiro do Caio tambem vale 200 - a escada dele e outra');

  assert.equal(Poder.escadaDe(ana.jogo.poder, 1), 1, 'cada um subiu um degrau');
  assert.equal(Poder.escadaDe(ana.jogo.poder, 2), 1);
  assert.equal(Poder.escadaDe(ana.jogo.poder, 0), 0, 'e quem nao comeu nao subiu');
  assert.equal(ana.jogo.poder.comidos, 2, 'a sala inteira comeu dois');

  ana.dom.api.mandarEstado();
  for (const aba of [bento, caio]) {
    assert.deepEqual(valor(aba.jogo.poder), valor(ana.jogo.poder),
      `a escada de cada um chegou inteira na tela do ${aba.id}`);
  }
});

teste('o segundo fantasma de um vale 400, e o primeiro do outro ainda vale 200', () => {
  const { mundo } = ana.dom.api;
  const azuis = ana.jogo.fantasmas.lista.filter((f) => f.assustado && f.etapa === 'livre');
  assert.ok(azuis.length >= 1, 'sobrou fantasma azul para o segundo degrau');

  const antes = jogador(ana, 'bento').pontos;
  estacionar('ana');
  estacionar('caio');
  encostarNoFantasma('bento', azuis[0]);
  quadroDoMundo();

  assert.equal(jogador(ana, 'bento').pontos, antes + mundo.PREMIOS[1],
    'o segundo fantasma do Bento vale 400');
});

teste('a bolota seguinte zera a escada de todo mundo', () => {
  const { Poder } = ana.dom.api;
  estacionar('ana');
  estacionar('bento');
  const bolota = bolotaLivre();

  porEm('caio', bolota.x, bolota.y);
  quadroDoMundo();

  assert.equal(ana.jogo.poder.comidos, 0, 'bolota nova, disputa nova');
  for (const j of jogadores) {
    assert.equal(Poder.escadaDe(ana.jogo.poder, j.indice), 0,
      `${j.apelido} recomeca do 200`);
  }
});

// ----------------------------------------- Os fantasmas e o mais perto -----
teste('cada fantasma mira o come-come mais perto, sem largar a personalidade', () => {
  const { Personalidades, Fantasmas, Mapa, mapas } = carregarJogo();
  const mapa = mapas[0];

  const perto = { c: 6, l: 5, dir: 'esquerda' };
  const longe = { c: 21, l: 26, dir: 'cima' };
  const fantasmas = Fantasmas.novoEstado(mapa);
  // Os quatro soltos na rua, dois de cada lado do labirinto.
  fantasmas.lista.forEach((f, i) => {
    f.etapa = 'livre';
    const onde = i < 2 ? { c: 6, l: 8 } : { c: 21, l: 23 };
    const meio = Mapa.centro(onde.c, onde.l);
    f.corpo = { ...f.corpo, x: meio.x, y: meio.y };
  });

  const passo = Personalidades.passo(Personalidades.novoEstado(7), fantasmas, mapa, {
    modo: 'cacar', comes: [perto, longe],
  });

  // O perseguidor mira o quadrado de quem esta perto dele - cada um o seu.
  assert.deepEqual(valor(passo.alvos[0]), { c: perto.c, l: perto.l },
    'o vermelho de cima caca quem esta em cima');
  assert.deepEqual(valor(passo.fugas[0]), valor(perto), 'e e dele que ele fugiria');
  assert.deepEqual(valor(passo.fugas[3]), valor(longe),
    'o laranja de baixo cuida de quem esta embaixo');

  // E a personalidade continua a mesma: o rosa corta quatro casas a FRENTE.
  const rosa = passo.alvos[1];
  assert.deepEqual(valor(rosa),
    { c: perto.c - Personalidades.PASSOS_A_FRENTE, l: perto.l },
    'o rosa continua emboscando, agora do come-come mais perto');

  // Trocar quem esta perto troca de quem cada um cuida - e mais nada.
  const trocado = Personalidades.passo(Personalidades.novoEstado(7), fantasmas, mapa, {
    modo: 'cacar', comes: [longe, perto],
  });
  assert.deepEqual(valor(trocado.alvos), valor(passo.alvos),
    'a ordem da lista nao muda nada: quem manda e a distancia');
});

teste('Personalidades.maisPerto() desempata pela ordem da sala', () => {
  const { Personalidades } = carregarJogo();
  const a = { c: 4, l: 4 }, b = { c: 12, l: 4 };
  assert.deepEqual(valor(Personalidades.maisPerto([a, b], { c: 8, l: 4 })), valor(a),
    'empatado, vence o primeiro da fila - e a mesma conta nos cinco aparelhos');
  assert.deepEqual(valor(Personalidades.maisPerto([a, b], { c: 11, l: 4 })), valor(b));
  assert.equal(Personalidades.maisPerto([], { c: 1, l: 1 }), null,
    'sem ninguem no labirinto nao ha quem mirar');
});

teste('na dispersao ninguem mira ninguem: cada um vai para o seu canto', () => {
  const { Personalidades, Fantasmas, mapas } = carregarJogo();
  const mapa = mapas[0];
  const fantasmas = Fantasmas.novoEstado(mapa);
  const passo = Personalidades.passo(Personalidades.novoEstado(1), fantasmas, mapa, {
    modo: 'dispersar', comes: [{ c: 6, l: 5 }, { c: 21, l: 26 }],
  });
  passo.alvos.forEach((alvo, i) => {
    assert.deepEqual(valor(alvo), valor(Personalidades.cantoDe(mapa, fantasmas.lista[i].chave)),
      'o canto de sempre, com sala ou sem sala');
  });
});

// -------------------------------------------------- O tombo e de quem cai --
teste('um tombo de um nao mexe no mundo dos outros', () => {
  const { Rodada } = ana.dom.api;
  estacionar('bento');
  estacionar('caio');

  const antes = {
    pastilhas: valor(ana.jogo.pastilhas),
    poder: valor(ana.jogo.poder),
    bento: jogador(ana, 'bento').pontos,
    caio: jogador(ana, 'caio').pontos,
  };

  // O tombo montado a mao, como o `Rodada.perder()` o deixaria.
  ana.jogo.rodada = { vidas: 2, pausa: 60, pego: 0, acabou: false };
  ana.jogo.tombado = 0;
  ana.dom.avancarQuadros(5);
  ana.dom.api.mandarEstado();

  continuamComidas(ana.jogo.pastilhas, antes.pastilhas,
    'o que os outros ja comeram continua comido');
  assert.equal(jogador(ana, 'bento').pontos, antes.bento, 'e os pontos deles ficam de pe');
  assert.equal(jogador(ana, 'caio').pontos, antes.caio);
  assert.equal(ana.jogo.poder.comidos, antes.poder.comidos,
    'e a escada da bolota continua onde estava');

  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.tombado, 0, `${aba.id} sabe quem caiu`);
    continuamComidas(aba.jogo.pastilhas, antes.pastilhas,
      'e o labirinto dele nao voltou uma pastilha sequer');
    assert.equal(jogador(aba, 'bento').pontos, antes.bento);
  }

  // Passada a pausa, todo mundo volta ao lugar - e as pastilhas ficam comidas.
  ana.jogo.rodada = { vidas: 2, pausa: 1, pego: 0, acabou: false };
  ana.dom.avancarQuadros(2);
  assert.equal(Rodada.parado(ana.jogo.rodada), false, 'o mundo voltou a andar');
  continuamComidas(ana.jogo.pastilhas, antes.pastilhas,
    'o reinicio da rodada nao repoe pastilha nenhuma');
  ana.jogo.rodada = Rodada.novoEstado();
  ana.jogo.tombado = -1;
  ana.dom.api.mandarEstado();
});

// ---------------------------------------------- A cor e o nome da sala -----
teste('cada aparelho pinta cada jogador com a cor da sala', () => {
  estacionar('ana');
  // Cada um num canto, para as tres bocas caberem na mesma tela sem se cobrir.
  const { Mapa } = ana.dom.api;
  const mapa = ana.dom.api.labirinto;
  const lugares = Mapa.nascimentos(mapa, 3);
  jogadores.forEach((j, i) => {
    const meio = Mapa.centro(lugares[i].c, lugares[i].l);
    porEm(j.id, meio.x, meio.y);
  });
  ana.dom.api.mandarEstado();
  avancarTodos(1, todas);

  for (const aba of todas) {
    const cores = new Set(aba.dom.pintados.map((p) => p.cor));
    for (const j of jogadores) {
      assert.ok(cores.has(j.cor),
        `na tela do ${aba.id}, ${j.apelido} esta pintado de ${j.cor}`);
    }
    assert.equal(cores.has('#ff8adc'), false,
      'e a paleta de reserva nem apareceu: quem manda na cor e a Central');
  }
});

teste('o apelido e a cor da sala entram no HUD como dados', () => {
  for (const aba of todas) {
    const meu = jogadores.find((j) => j.id === aba.id);
    assert.equal(aba.dom.escondido('hud-eu'), false,
      `em grupo, ${aba.id} ve a caixa do "voce e"`);
    assert.equal(aba.dom.texto('hud-eu-nome'), meu.apelido,
      'com o apelido que ficou na sala, escrito como texto');
    assert.equal(aba.dom.elementos['hud-eu-nome'].style.color, meu.cor,
      'e na cor com que o come-come dele e pintado');
  }
});

teste('apelido esperto vira texto, e cor de mentira nao vira style', async () => {
  const travesso = [
    { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
    {
      id: 'mal', apelido: '<img src=x onerror=alert(1)>',
      cor: 'red; background:url(javascript:alert(1))',
      indice: 1, pronto: true, anfitriao: false,
    },
  ];
  const rede = criarPlataforma('mal');
  const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
  await dom.api.pronta;
  dom.api.abrirLobby();
  rede.ganchos.aoComecar({
    codigo: 'F11X', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 5,
    eu: 'mal', souAnfitriao: false, anfitriao: 'ana', jogadores: travesso,
  });

  const eu = dom.api.jogo.eu;
  assert.equal(eu.apelido, travesso[1].apelido, 'o apelido chega inteiro...');
  assert.equal(dom.texto('hud-eu-nome'), travesso[1].apelido,
    '...e vai para a tela por textContent, que nao interpreta HTML nenhum');
  assert.equal(dom.elementos['hud-eu-nome'].filhos.length, 0,
    'ou seja: nenhum elemento foi criado a partir do nome');

  assert.equal(eu.cor, '', 'a cor de mentira nao virou a cor do jogador');
  assert.equal(dom.elementos['hud-eu-nome'].style.color, '#ff8adc',
    'sobrou a paleta de casa, na ordem do indice da sala');

  dom.avancarQuadros(2);
  const cores = new Set(dom.pintados.map((p) => p.cor));
  assert.equal([...cores].some((c) => String(c).indexOf('javascript') >= 0), false,
    'e no canvas nao entrou nada que nao seja uma cor');
});

teste('sem sala nao ha caixa de "voce e"', () => {
  caio.dom.comecarPartida('Caio');      // "JOGAR SOZINHO", no meio da sala
  assert.equal(caio.dom.escondido('hud-eu'), true,
    'sozinho nao ha com quem se confundir');
  assert.equal(caio.dom.escondido('hud-sala'), true);
});

// ------------------------------------------------------- E o jogo sozinho --
teste('sozinho nada mudou: uma boca, os pontos dela e a escada de sempre', async () => {
  const dom = carregarJogoComTela('come_come');
  await Promise.resolve();
  dom.comecarPartida('Duda');
  dom.avancarQuadros(1);               // a partida a frio do laco de quadros

  const { Mapa, Poder, mundo } = dom.api;
  const jogo = dom.api.jogo;
  const mapa = dom.api.labirinto;

  assert.equal(jogo.jogadores.length, 1, 'um come-come so no labirinto');
  assert.equal(jogo.eu.indice, 0);
  assert.equal(jogo.eu.cor, '', 'sem sala, ninguem escolheu cor nenhuma');

  // Uma pastilha comum: 10 pontos, e o contador desce um.
  const i = mapa.indicePastilha.findIndex((k) => k >= 0 && !mapa.pastilhas[k].poder);
  const pastilha = mapa.pastilhas[mapa.indicePastilha[i]];
  const faltavam = jogo.pastilhas.faltam;
  jogo.come.x = pastilha.x;
  jogo.come.y = pastilha.y;
  dom.avancarQuadros(1);
  assert.equal(jogo.pontos, mundo.PONTOS_PASTILHA, 'os 10 de sempre');
  assert.equal(jogo.pastilhas.faltam, faltavam - 1);
  assert.equal(dom.texto('hud-pontos'), String(mundo.PONTOS_PASTILHA),
    'e o HUD mostra os pontos de quem esta jogando');

  /* A bolota e a escada 200/400: exatamente o que a fase 4 prometeu. Os quatro
     precisam de uns segundos para sair da casa, e nesse tempo eles pegariam um
     come-come parado - dai a rede de seguranca das vidas, a mesma do piloto do
     harness: o assunto aqui e a escada, e nao sobreviver. */
  for (let q = 0; q < 400; q++) {
    jogo.rodada = dom.api.Rodada.novoEstado();
    dom.avancarQuadros(1);
  }
  const bolota = mapa.pastilhas[mapa.poderes.find((k) => jogo.pastilhas.restam[k])];
  const antesDaBolota = jogo.pontos;
  jogo.come.x = bolota.x;
  jogo.come.y = bolota.y;
  dom.avancarQuadros(1);
  assert.equal(jogo.poder.ativo, true, 'o feitico comecou');
  assert.equal(jogo.pontos, antesDaBolota + mundo.PONTOS_PODER, 'e a bolota valeu 50');
  assert.equal(Poder.proximoPremio(jogo.poder), mundo.PREMIOS[0],
    'o proximo fantasma vale 200, sem precisar dizer de quem e a escada');

  const azul = jogo.fantasmas.lista.find((f) => f.assustado && f.etapa === 'livre');
  assert.ok(azul, 'ha fantasma azul para comer');
  const antes = jogo.pontos;
  // Os dois no meio do mesmo quadrado, e sem pastilha ali para confundir a
  // conta - a mesma arrumacao dos testes de sala, la em cima.
  const meio = Mapa.centro(Mapa.coluna(azul.corpo.x), Mapa.linha(azul.corpo.y));
  azul.corpo = { ...azul.corpo, x: meio.x, y: meio.y };
  jogo.pastilhas = dom.api.Pastilhas.comer(
    jogo.pastilhas, mapa, Mapa.coluna(meio.x), Mapa.linha(meio.y)).estado;
  jogo.come.x = meio.x;
  jogo.come.y = meio.y;
  dom.avancarQuadros(1);
  assert.equal(jogo.pontos, antes + mundo.PREMIOS[0], 'o primeiro vale 200');
  assert.equal(jogo.poder.comidos, 1, 'e o total da "sala" de um e um so');
  assert.equal(Poder.escadaDe(jogo.poder, 0), 1, 'na escada da unica pessoa que ha');

  assert.equal(Mapa.coluna(jogo.come.x) >= 0, true, 'e o come-come continua no labirinto');
});

teste('o pacote continua cabendo folgado em 2 KB, agora com a escada junto', () => {
  const { Pacote, mundo } = ana.dom.api;
  for (let i = 0; i < mundo.MAX_AVISOS; i++) {
    ana.jogo.avisos.push({ tipo: 'fantasma', x: 444, y: 488, indice: 4, valor: 1600 });
  }
  const pacote = Pacote.montar(ana.jogo, 99999);
  const bytes = JSON.stringify(pacote).length;
  assert.ok(bytes < 2048, `o retrato do mundo tem ${bytes} bytes`);
  assert.ok(pacote.p.length >= 4, 'o feitico viaja com os quatro numeros de sempre');
  ana.jogo.avisos = [];
});

await fim('Fase 11');
