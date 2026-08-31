/* ==========================================================================
   Come-Come - Fase 9: o anfitriao simula o mundo com varios come-comes
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase9.test.mjs

   Tres copias do game.js rodam em VMs separadas, como tres abas. Em vez de
   abrir WebSocket de verdade (isso o fase8-tela ja faz), aqui a Central e uma
   de mentira, em memoria: `enviar()` entrega o retrato do mundo aos
   convidados e `paraAnfitriao()` entrega a direcao dos convidados ao
   anfitriao - e o teste pode DERRUBAR pacotes de proposito, que e o unico
   jeito de provar que perder um nao desalinha nada.

   O alvo aqui e o conteudo da fase 9: um come-come por pessoa no mesmo
   labirinto, a direcao subindo para o anfitriao, o retrato inteiro descendo
   para os convidados e os avisos virando faisca do outro lado. A previsao
   local do convidado - o que ele faz ENQUANTO o pacote nao chega - e o
   assunto da fase 10, e por causa dela as comparacoes de mundo daqui tiram a
   linha de quem esta olhando: desde aquela fase, o come-come DE CASA e
   adivinhado no lugar de copiado, e e a unica coisa da tela que pode estar
   alguns pixels a frente do que o anfitriao mandou.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, carregarJogoComTela, lerJogoJson, teste, fim } from './harness.mjs';

const jogadores = [
  { id: 'ana', apelido: 'Ana', cor: '#d82800', indice: 0, pronto: true, anfitriao: true },
  { id: 'bento', apelido: 'Bento', cor: '#00a800', indice: 1, pronto: true, anfitriao: false },
  { id: 'caio', apelido: 'Caio', cor: '#6844fc', indice: 2, pronto: true, anfitriao: false },
];

// As cores com que cada come-come e pintado, na ordem do `indice` da sala.
const CORES = ['#fcd800', '#ff8adc', '#7cf8a0'];

const pacotes = [];        // tudo o que passou pela Central de mentira
const abas = new Map();
let perdendo = 0;          // quantos retratos ainda serao jogados fora

function salaPara(id, todos = jogadores) {
  return {
    codigo: 'F9A1', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 90210,
    eu: id, souAnfitriao: id === todos[0].id, anfitriao: todos[0].id,
    jogadores: todos.slice(),
  };
}

function criarPlataforma(id, todos = jogadores) {
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
      pacotes.push({ de: id, para: 'outros', d, bytes: JSON.stringify(d).length });
      // O pacote que "se perdeu no caminho": ninguem recebe, e ninguem avisa.
      if (perdendo > 0) { perdendo--; return true; }
      for (const j of todos) if (j.id !== id) entregar(j.id, id, d);
      return true;
    },
    paraAnfitriao(d) {
      pacotes.push({ de: id, para: 'anfitriao', d, bytes: JSON.stringify(d).length });
      entregar(todos[0].id, id, d);
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

async function abrirAba(id, todos = jogadores) {
  const rede = criarPlataforma(id, todos);
  const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
  abas.set(id, rede);
  await dom.api.pronta;
  dom.api.abrirLobby();
  return { id, rede, dom, jogo: dom.api.jogo };
}

const valor = (o) => JSON.parse(JSON.stringify(o));

/** O retrato do mundo daquela aba, com o numero de ordem tirado fora. */
function retrato(aba) {
  const p = valor(aba.dom.api.Pacote.montar(aba.jogo, 999));
  delete p.n;
  return p;
}

/* O mesmo retrato sem a linha de uma pessoa - a de quem esta olhando. Desde a
   fase 10 o come-come de casa e ADIVINHADO pelo proprio aparelho (e so puxado
   de leve quando o pacote chega), entao ele nao e copia de nada: o que tem que
   bater entre as tres telas e o MUNDO - as outras pessoas, os quatro
   fantasmas, as pastilhas, o poder, a rodada e o relogio. */
function semALinhaDe(p, aba) {
  const meu = aba.jogo.eu.indice;
  return { ...p, j: p.j.filter((linha) => linha[0] !== meu) };
}

/** O mundo daquela aba e o mesmo que a anfitria esta simulando? */
function mundoIgualAoDaAna(aba, msg) {
  assert.deepEqual(semALinhaDe(retrato(aba), aba), semALinhaDe(retrato(ana), aba), msg);
}

function jogador(aba, id) {
  return aba.jogo.jogadores.find((j) => j.id === id);
}

/** Um quadro em cada aba, na mesma ordem, `quantos` vezes. */
function avancarTodos(quantos, ordem) {
  for (let i = 0; i < quantos; i++) for (const aba of ordem) aba.dom.avancarQuadros(1);
}

console.log('Come-Come - fase 9\n');

const ana = await abrirAba('ana');
const bento = await abrirAba('bento');
const caio = await abrirAba('caio');
const todas = [ana, bento, caio];

for (const aba of todas) aba.rede.ganchos.aoComecar(salaPara(aba.id));

// ------------------------------------------------------ Um mundo, varios --
teste('a sala vira um come-come por pessoa, cada um nascendo num canto', () => {
  const { Mapa } = ana.dom.api;
  const mapa = ana.dom.api.labirinto;

  for (const aba of todas) {
    assert.equal(aba.jogo.jogadores.length, 3, `${aba.id} ve os tres come-comes`);
    assert.deepEqual(valor(aba.jogo.jogadores.map((j) => j.id)), ['ana', 'bento', 'caio']);
    assert.deepEqual(valor(aba.jogo.jogadores.map((j) => j.indice)), [0, 1, 2],
      'na ordem do indice da sala, que e a identidade de cada um');
    assert.equal(aba.jogo.eu.id, aba.id, 'e sabe qual deles e o deste aparelho');
    assert.equal(aba.jogo.come, aba.jogo.eu.corpo,
      '`jogo.come` continua sendo o come-come de casa');
  }

  const lugares = ana.jogo.jogadores.map((j) => `${Mapa.coluna(j.corpo.x)},${Mapa.linha(j.corpo.y)}`);
  assert.equal(new Set(lugares).size, 3, 'ninguem nasce em cima do vizinho');
  for (const j of ana.jogo.jogadores) {
    assert.ok(Mapa.livre(mapa, Mapa.coluna(j.corpo.x), Mapa.linha(j.corpo.y)),
      'e todo mundo nasce em corredor, nunca dentro da parede');
  }

  ana.dom.avancarQuadros(1);
  for (const cor of CORES) {
    assert.ok(ana.dom.pintados.some((p) => p.cor === cor),
      `o come-come de cor ${cor} apareceu na tela`);
  }
});

teste('o nascimento do primeiro continua sendo o P do desenho', () => {
  const { Mapa, mapas } = carregarJogo();
  for (const mapa of mapas) {
    const lugares = valor(Mapa.nascimentos(mapa, 5));
    assert.deepEqual(lugares[0], { c: mapa.nascimento.c, l: mapa.nascimento.l },
      'o primeiro e o P: sozinho, nada mudou de lugar');
    assert.equal(lugares.length, 5, 'e ha um ponto de partida por pessoa da sala');
    const chaves = lugares.map((p) => `${p.c},${p.l}`);
    assert.equal(new Set(chaves).size, 5, 'todos diferentes');
    for (const p of lugares) {
      assert.ok(Mapa.livre(mapa, p.c, p.l), 'e todos em corredor');
      const dentroDaCasa = mapa.casa && p.c >= mapa.casa.c0 && p.c <= mapa.casa.c1
                        && p.l >= mapa.casa.l0 && p.l <= mapa.casa.l1;
      assert.ok(!dentroDaCasa, 'ninguem nasce trancado na casa dos fantasmas');
    }
  }
});

// --------------------------------------------- O convidado manda a direcao --
teste('o convidado manda so a direcao desejada', () => {
  bento.dom.tecla('ArrowRight');
  bento.dom.avancarQuadros(4);

  const meus = pacotes.filter((p) => p.de === 'bento' && p.para === 'anfitriao');
  assert.ok(meus.length > 0, 'a direcao subiu para o anfitriao');

  const ultimo = meus[meus.length - 1].d;
  assert.deepEqual(Object.keys(ultimo).sort(), ['d', 'k', 'n'],
    'e no pacote nao vai mais nada: tipo, ordem e a direcao');
  assert.equal(ultimo.k, 'i');
  assert.equal(ana.dom.api.Pacote.direcaoDe(ultimo.d), 'direita');
});

teste('o que o convidado aperta anda no mundo do anfitriao', () => {
  const antes = valor(jogador(ana, 'bento').corpo);
  assert.equal(jogador(ana, 'bento').entrada.desejada, 'direita',
    'o anfitriao guardou a direcao que o convidado pediu');

  avancarTodos(12, todas);

  const agora = jogador(ana, 'bento').corpo;
  assert.equal(agora.dir, 'direita', 'o come-come do Bento virou no mundo da Ana');
  assert.ok(agora.x > antes.x, 'e andou para la');

  assert.equal(jogador(ana, 'caio').corpo.dir, 'esquerda',
    'e quem nao pediu nada segue como estava');
});

// ------------------------------------------------- O retrato do anfitriao --
teste('o retrato do anfitriao chega igual nas tres telas', () => {
  ana.dom.api.mandarEstado();          // forca um retrato fresco para comparar

  mundoIgualAoDaAna(bento,
    'Bento copiou as pessoas, os fantasmas, as pastilhas, o poder e a rodada');
  mundoIgualAoDaAna(caio, 'e Caio copiou o mesmo mundo');

  for (const aba of [bento, caio]) {
    assert.equal(jogador(aba, 'bento').corpo.dir, 'direita',
      `${aba.id} ve o come-come do Bento virado para onde ele pediu`);
  }
});

teste('o pacote ida-e-volta nao perde informacao', () => {
  const { Pacote } = ana.dom.api;
  const pacote = valor(Pacote.montar(ana.jogo, 7));

  // Um mundo qualquer (o do Caio) recebendo o retrato e virando o mundo da Ana.
  Pacote.aplicar(pacote, caio.jogo, caio.dom.api.labirinto);

  assert.deepEqual(retrato(caio), retrato(ana), 'o mundo remontado e o mesmo');
  assert.deepEqual(valor(caio.jogo.pastilhas), valor(ana.jogo.pastilhas),
    'inclusive a lista inteira de pastilhas de pe');
  assert.equal(caio.jogo.vidas, ana.jogo.vidas, 'e as vidas no HUD');
});

teste('pacote perdido nao desalinha nada: e estado inteiro, nao diferenca', () => {
  const perdidosAntes = pacotes.filter((p) => p.de === 'ana').length;

  perdendo = 5;                        // os cinco proximos retratos somem
  avancarTodos(30, todas);
  perdendo = 0;

  assert.ok(pacotes.filter((p) => p.de === 'ana').length > perdidosAntes,
    'a anfitria continuou mandando (e o caminho e que engoliu)');
  assert.notDeepEqual(semALinhaDe(retrato(bento), bento), semALinhaDe(retrato(ana), bento),
    'sem retrato nenhum, o mundo do convidado ficou para tras');

  ana.dom.api.mandarEstado();          // um unico retrato depois do buraco
  mundoIgualAoDaAna(bento, 'e um pacote so ja poe tudo no lugar de novo');
  mundoIgualAoDaAna(caio);
});

teste('retrato atrasado que chega fora de ordem vai para o lixo', () => {
  const { Pacote } = ana.dom.api;
  const velho = valor(Pacote.montar(ana.jogo, 1));   // numero de ordem la de tras
  const atrasadosAntes = bento.dom.api.rede.atrasados;
  const antes = retrato(bento);

  abas.get('bento').ganchos.aoReceber({ de: 'ana', d: velho });

  assert.equal(bento.dom.api.rede.atrasados, atrasadosAntes + 1, 'foi contado como atrasado');
  assert.deepEqual(retrato(bento), antes, 'e nao mexeu no mundo');
});

// --------------------------------------------------- Os avisos e a faisca --
teste('os avisos viajam e viram faisca na tela do convidado', () => {
  const mapa = ana.dom.api.labirinto;
  const bolota = mapa.pastilhas[mapa.poderes.find(
    (i) => ana.jogo.pastilhas.restam[i])];
  assert.ok(bolota, 'o labirinto ainda tem bolota de poder para o teste');

  const antes = { bento: bento.jogo.efeitos.length, caio: caio.jogo.efeitos.length };

  ana.jogo.come.x = bolota.x;
  ana.jogo.come.y = bolota.y;
  ana.dom.avancarQuadros(1);

  assert.ok(ana.jogo.efeitos.length > 0, 'a faisca saiu na hora no aparelho de quem mordeu');
  assert.ok(ana.jogo.poder.ativo, 'e a bolota fez o que tinha que fazer');

  ana.dom.api.mandarEstado();
  assert.ok(bento.jogo.efeitos.length > antes.bento, 'Bento soltou a mesma faisca');
  assert.ok(caio.jogo.efeitos.length > antes.caio, 'e Caio tambem');
  assert.ok(bento.jogo.poder.ativo, 'e os dois viram os fantasmas se assustarem');

  assert.deepEqual(valor(ana.jogo.avisos), [],
    'a fila esvazia no envio: cada faisca viaja uma vez so');
});

teste('no tombo, as tres telas veem o MESMO come-come sumindo', () => {
  const { Rodada } = ana.dom.api;

  // Um tombo montado a mao: o mundo parado e o come-come do Bento como o pego.
  ana.jogo.rodada = { vidas: 2, pausa: 60, pego: 1, acabou: false };
  ana.jogo.tombado = 1;
  ana.dom.api.mandarEstado();

  for (const aba of [bento, caio]) {
    assert.equal(aba.jogo.tombado, 1, `${aba.id} sabe quem foi pego`);
    assert.equal(aba.jogo.rodada.pausa, 60, 'e que o mundo esta parado');
    assert.equal(aba.jogo.vidas, 2, 'e o HUD ja perdeu a vida junto');
  }

  const alvo = jogador(ana, 'bento').corpo;
  for (const aba of todas) {
    aba.dom.avancarQuadros(1);
    const sumindo = aba.dom.pintados.filter((p) => p.cor === CORES[1]
      && Math.abs(p.x - alvo.x) < 10 && Math.abs(p.y - alvo.y) < 10);
    assert.ok(sumindo.length > 0,
      `${aba.id} desenhou o come-come do Bento indo embora, e nao o dela`);
  }

  ana.jogo.rodada = Rodada.novoEstado();     // e o mundo volta ao normal
  ana.jogo.tombado = -1;
  ana.dom.api.mandarEstado();
  assert.equal(bento.jogo.tombado, -1, 'passado o susto, ninguem esta caindo');
});

// ------------------------------------------------ Quem simula, e quem nao --
teste('o convidado nao simula o MUNDO: ele so anda com o retrato que chega', () => {
  const { Mapa } = caio.dom.api;
  const mapa = caio.dom.api.labirinto;
  // Uma seta que abre no corredor onde ele esta: o come-come de casa e a unica
  // coisa que anda sem pacote (a previsao da fase 10), e sem corredor aberto
  // "nao andou" nao provaria nada.
  const saida = Mapa.saidas(mapa, Mapa.coluna(caio.jogo.come.x), Mapa.linha(caio.jogo.come.y))[0];
  const TECLA = { direita: 'ArrowRight', esquerda: 'ArrowLeft', cima: 'ArrowUp', baixo: 'ArrowDown' };
  caio.dom.tecla(TECLA[saida]);

  const antes = valor({
    relogio: caio.jogo.relogio,
    come: caio.jogo.come,
    fantasma: caio.jogo.fantasmas.lista[0].corpo,
    faltam: caio.jogo.pastilhas.faltam,
    pontos: caio.jogo.pontos,
    vidas: caio.jogo.vidas,
  });

  caio.dom.avancarQuadros(30);         // meio segundo sozinho, sem pacote nenhum

  assert.equal(caio.jogo.relogio, antes.relogio, 'o relogio do mundo nao andou');
  assert.deepEqual(valor(caio.jogo.fantasmas.lista[0].corpo), antes.fantasma,
    'nem os fantasmas');
  assert.equal(caio.jogo.pastilhas.faltam, antes.faltam, 'nem as pastilhas sumiram');
  assert.equal(caio.jogo.pontos, antes.pontos, 'ninguem ganhou ponto por conta propria');
  assert.equal(caio.jogo.vidas, antes.vidas, 'nem perdeu vida');
  assert.ok(caio.dom.pintados.length > 0, 'mas a tela continua sendo pintada');

  // O corpo DELE, sim: e a previsao local da fase 10, para o controle nao
  // ficar molenga enquanto o retrato nao chega.
  assert.notDeepEqual(valor(caio.jogo.come), antes.come,
    'so o come-come de casa andou, adivinhado por ele mesmo');
});

teste('a geometria e a do anfitriao: ele vira a pagina e os tres vao junto', () => {
  ana.dom.api.irParaFase(2);
  avancarTodos(6, todas);

  for (const aba of todas) {
    assert.equal(aba.jogo.fase, 2, `${aba.id} esta no labirinto 2`);
    assert.equal(aba.dom.api.labirinto.nome, ana.dom.api.labirinto.nome,
      'com o mesmo desenho debaixo dos pes');
  }
  ana.dom.api.mandarEstado();
  mundoIgualAoDaAna(bento, 'e o mundo continua batendo');
});

// ---------------------------------------------------- Os freios da Central --
teste('o pacote cabe folgado em 2 KB com os cinco jogadores do manifesto', async () => {
  const cinco = [0, 1, 2, 3, 4].map((i) => ({
    id: `p${i}`, apelido: `Jogador ${i}`, cor: '#ffffff',
    indice: i, pronto: true, anfitriao: i === 0,
  }));
  const anfitria = await abrirAba('p0', cinco);
  anfitria.rede.ganchos.aoComecar(salaPara('p0', cinco));
  anfitria.dom.avancarQuadros(120);

  assert.equal(anfitria.jogo.jogadores.length, 5, 'a sala cheia do manifesto');
  assert.equal(lerJogoJson('come_come').plataforma.multijogador.max, 5);

  // O pior caso: a fila de avisos cheia ate o teto.
  const { MAX_AVISOS } = anfitria.dom.api.mundo;
  for (let i = 0; i < MAX_AVISOS; i++) {
    anfitria.jogo.avisos.push({ tipo: 'fantasma', x: 444, y: 488, indice: 4, valor: 1600 });
  }

  const bytes = JSON.stringify(anfitria.dom.api.Pacote.montar(anfitria.jogo, 99999)).length;
  assert.ok(bytes < 2048, `o retrato do mundo tem ${bytes} bytes`);
});

teste('e a sala inteira fica dentro dos freios da plataforma', () => {
  const estados = pacotes.filter((p) => p.d.k === 'e');
  const entradas = pacotes.filter((p) => p.d.k === 'i');
  assert.ok(estados.length > 0, 'o anfitriao mandou retratos do mundo');
  assert.ok(entradas.length > 0, 'os convidados mandaram direcoes');

  const maior = Math.max(...pacotes.map((p) => p.bytes));
  assert.ok(maior < 64 * 1024, `o maior pacote tem ${maior} bytes`);

  // A taxa: um pacote a cada tres quadros, com o relogio de 60 quadros que o
  // teste roda - bem longe das 90 mensagens por segundo da plataforma.
  const quadros = new Map();
  for (const p of pacotes) quadros.set(p.de, (quadros.get(p.de) || 0) + 1);
  for (const [id, total] of quadros) {
    assert.ok(total <= 90, `${id} mandou ${total} pacotes no segundo simulado`);
  }
});

// ------------------------------------------------------- E o jogo sozinho --
teste('sozinho o labirinto continua tendo um come-come so, no P do desenho', async () => {
  const dom = carregarJogoComTela('come_come');
  await Promise.resolve();
  dom.comecarPartida('Duda');
  dom.avancarQuadros(30);

  const { Mapa } = dom.api;
  const mapa = dom.api.labirinto;
  assert.equal(dom.api.jogo.jogadores.length, 1, 'uma pessoa so no labirinto');
  assert.equal(dom.api.jogo.eu.local, true, 'e ela e a de casa');
  assert.equal(dom.api.jogo.eu.indice, 0);
  assert.equal(Mapa.linha(dom.api.jogo.come.y), mapa.nascimento.l,
    'que nasceu na linha do P de sempre');
  assert.ok(dom.api.jogo.relogio > 0, 'e o mundo anda sem Central nenhuma');
  assert.deepEqual(valor(dom.api.jogo.avisos), [],
    'sem sala, a fila de avisos nem se enche: nao ha para quem contar');
});

teste('largar a sala desfaz o mundo de todos', () => {
  caio.dom.comecarPartida('Caio');     // "JOGAR SOZINHO", no meio da sala

  assert.equal(caio.dom.api.rede.papel, 'solo');
  assert.equal(caio.jogo.jogadores.length, 1, 'o labirinto dele ficou so com ele');
  assert.equal(caio.jogo.eu.local, true);

  const relogio = caio.jogo.relogio;
  caio.dom.avancarQuadros(10);
  assert.ok(caio.jogo.relogio > relogio, 'e agora ele mesmo simula o mundo de novo');
});

await fim('Fase 9');
