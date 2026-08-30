/* ==========================================================================
   Super Adventure - Fase 13 (tela): o ranking passando pela Central de verdade
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase13-tela.test.mjs

   O fase13.test.mjs troca os pacotes numa plataforma de mentira, que entrega
   na hora. Aqui o servidor das salas sobe DE VERDADE dentro do teste (o mesmo
   `montarWebSocket()` e o mesmo `salas.js` do `server/src/plataforma/`) e tres
   abas conversam com ele por WebSocket - entao quem carrega o placar do fim e
   o `terminar()` do jogo, o `t: 'fim'` do canal e o `aoTerminar` do SDK, um
   atras do outro, como no navegador.

   O que se ve por aqui:

     - o placar lateral das tres abas andando junto durante a partida;
     - a bandeira da fase 3 fechando a partida da SALA: o anfitriao chama
       `terminar(placar)`, o servidor devolve o mesmo `fim` para todo mundo e
       as tres telas montam o MESMO ranking, do pior para o melhor;
     - a sala voltando ao lobby no servidor, que e para onde o botao do fim
       leva a criancada.
   ========================================================================== */

import assert from 'node:assert/strict';
import {
  carregarJogoComTela, criarAbaDaPlataforma, subirPlataforma, teste, fim,
} from './harness.mjs';

const servidor = await subirPlataforma();

async function abrirAba(apelido) {
  const rede = criarAbaDaPlataforma(servidor, apelido);
  await rede.abrir();
  const dom = carregarJogoComTela('super_adventure', { plataforma: rede.plataforma });
  await dom.api.pronta;
  dom.clicar('btn-amigos');            // abre o lobby e liga os quatro ganchos
  return { apelido, rede, dom, jogo: dom.api.jogo };
}

const ana = await abrirAba('Ana');
const bento = await abrirAba('Bento');
const caio = await abrirAba('Caio');
const todos = [ana, bento, caio];

const pausa = (ms) => new Promise((segue) => setTimeout(segue, ms));
const escondido = (aba, id) => aba.dom.elementos[id].classList.contains('hidden');

/** As linhas de uma lista de placar, como estao na tela. */
const linhasDe = (aba, id) => aba.dom.elementos[id].filhos.map((li) => ({
  lugar: li.querySelector('.lugar').textContent,
  nome: li.querySelector('.nome').textContent,
  pontos: Number(li.querySelector('.pts').textContent),
  eu: li.className === 'eu',
}));

const placarNaTela = (aba) => linhasDe(aba, 'placar-lista');
const rankingNaTela = (aba) => linhasDe(aba, 'fim-ranking');
const jogador = (aba, apelido) => aba.jogo.jogadores.find((j) => j.apelido === apelido);

/** Um quadro em cada aba, com um respiro para o WebSocket entregar. */
async function correr(quadros) {
  for (let i = 0; i < quadros; i++) {
    for (const aba of todos) aba.dom.avancarQuadros(1);
    await pausa(1);
  }
}

/** Roda as tres abas ate a condicao acontecer (ou desiste e reclama). */
async function ate(condicao, oQue, voltas = 400) {
  for (let i = 0; i < voltas; i++) {
    if (condicao()) return;
    await correr(1);
  }
  throw new Error(`nunca aconteceu: ${oQue}`);
}

/** Poe alguem na bandeira, no mundo do anfitriao - o unico que existe. */
function tocarBandeira(apelido) {
  const b = ana.dom.api.fase.bandeira;
  jogador(ana, apelido).corpo = ana.dom.api.Fisica.novoCorpo(b.x, b.y);
}

console.log('Super Adventure - fase 13 (tela)\n');

let codigo = '';

// -------------------------------------------------------------- A sala -----
teste('as tres abas entram numa sala de verdade e a partida comeca', async () => {
  const criada = ana.rede.esperar('sala');
  ana.rede.mj.criar();
  codigo = (await criada).codigo;

  for (const aba of [bento, caio]) {
    const entrou = aba.rede.esperar('sala');
    aba.rede.mj.entrar(codigo);
    await entrou;
  }
  for (const aba of todos) {
    const mudou = aba.rede.esperar('sala');
    aba.rede.mj.pronto(true);
    await mudou;
  }

  const comecou = todos.map((aba) => aba.rede.esperar('inicio'));
  ana.rede.mj.comecar();
  await Promise.all(comecou);

  for (const aba of todos) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} caiu na tela do jogo`);
    assert.equal(aba.jogo.jogadores.length, 3, `${aba.apelido} tem a sala inteira no mundo`);
  }
});

// ------------------------------------------------ O placar em tempo real ---
teste('a mini-lista lateral aparece nas tres telas, com a turma inteira', async () => {
  await correr(3);
  for (const aba of todos) {
    assert.equal(escondido(aba, 'placar-sala'), false, `${aba.apelido} ve o placar da sala`);
    assert.deepEqual(placarNaTela(aba).map((p) => p.nome), ['Ana', 'Bento', 'Caio'],
      `${aba.apelido} ve os tres jogadores`);
  }
});

teste('os pontos que sobem na anfitria aparecem na tela dos convidados', async () => {
  jogador(ana, 'Caio').pontos += 150;
  jogador(ana, 'Bento').pontos += 40;

  await ate(() => placarNaTela(caio)[0].pontos === 150 && placarNaTela(bento)[0].pontos === 150,
    'o placar novo chegar nos convidados');

  for (const aba of todos) {
    assert.deepEqual(placarNaTela(aba).map((p) => [p.nome, p.pontos]),
      [['Caio', 150], ['Bento', 40], ['Ana', 0]],
      `${aba.apelido} ve o mesmo placar, do melhor para o pior`);
  }
});

// ------------------------------------------------- A bandeira da fase 3 ----
teste('a sala inteira vai para a fase 3 pelo retrato do anfitriao', async () => {
  ana.dom.api.irParaFase(3);
  await ate(() => todos.every((aba) => aba.jogo.fase === 3), 'todo mundo chegar na fase 3');

  // Trocar de fase zera os pontos DA FASE; o total da corrida e que manda no
  // placar, e aqui ele ainda e zero para todos (nenhuma bandeira caiu).
  jogador(ana, 'Bento').pontos += 300;
  jogador(ana, 'Caio').pontos += 120;
  jogador(ana, 'Ana').pontos += 60;
  await ate(() => placarNaTela(caio)[0].pontos === 300, 'os pontos da fase 3 chegarem');
});

teste('a bandeira da fase 3 fecha a partida e o placar volta pela Central', async () => {
  const fimNaAna = ana.rede.esperar('fim');
  const fimNoBento = bento.rede.esperar('fim');
  const fimNoCaio = caio.rede.esperar('fim');

  tocarBandeira('Caio');
  await ate(() => ana.jogo.concluida, 'a anfitria ver a bandeira cair');

  const chegou = await Promise.all([fimNaAna, fimNoBento, fimNoCaio]);
  for (const f of chegou) {
    assert.deepEqual(f.placar.map((p) => [p.apelido, p.pontos]),
      [['Ana', 110], ['Caio', 170], ['Bento', 350]],
      'o placar veio do servidor do pior para o melhor, igual para todos');
  }
});

teste('as tres telas montam o mesmo ranking, terminando no campeao', async () => {
  await ate(() => todos.every((aba) => rankingNaTela(aba).length === 3),
    'o ranking subir nas tres telas');

  for (const aba of todos) {
    assert.equal(escondido(aba, 'tela-fim'), false, `${aba.apelido} esta no PARABENS`);
    assert.equal(escondido(aba, 'fim-sala'), false, `${aba.apelido} ve o ranking da sala`);
    assert.equal(escondido(aba, 'fim-esperando'), true, `${aba.apelido} nao ficou esperando`);
    assert.deepEqual(rankingNaTela(aba).map((p) => [p.nome, p.pontos]),
      [['Ana', 110], ['Caio', 170], ['Bento', 350]],
      `${aba.apelido} ve a lista do pior para o melhor`);
    assert.deepEqual(rankingNaTela(aba).map((p) => p.lugar), ['🥉', '🥈', '🥇'],
      `${aba.apelido} ve as medalhas`);
    assert.deepEqual(rankingNaTela(aba).filter((p) => p.eu).map((p) => p.nome), [aba.apelido],
      `${aba.apelido} se acha na lista`);
  }
});

teste('acabada a partida, a sala volta a aparecer aberta na rede', async () => {
  await ate(() => ana.rede.salaAgora() && ana.rede.salaAgora().estado === 'lobby',
    'o servidor devolver a sala ao lobby');

  // O mesmo `listarSalas()` que responde em /api/plataforma/salas - lido
  // direto, sem HTTP, que e o que o catalogo mostraria agora.
  const { listarSalas } = await import('../../server/src/plataforma/salas.js');
  assert.ok(listarSalas('super_adventure').some((s) => s.codigo === codigo),
    'a sala esta de novo na lista de abertas');

  for (const aba of todos) {
    assert.equal(aba.dom.api.rede.encerrada, true, `${aba.apelido} sabe que a partida acabou`);
    assert.equal(aba.dom.elementos['btn-de-novo'].textContent, 'VOLTAR AO LOBBY',
      `${aba.apelido} ve o botao do lobby`);
  }
});

teste('o botao do fim devolve a crianca ao lobby, sem largar a sala', () => {
  bento.dom.clicar('btn-de-novo');

  assert.equal(bento.jogo.tela, 'menu', 'o Bento saiu da fase');
  assert.equal(bento.rede.lobbyAberto(), true, 'e caiu no lobby da Central');
  assert.equal(bento.dom.api.rede.sala.codigo, codigo, 'continuando na mesma sala');
});

/* O corredor de testes so roda a fila aqui, e ele mesmo encerra o processo no
   fim - o servidor e os canais que sobrarem vao junto. */
await fim('Fase 13 (tela)');
