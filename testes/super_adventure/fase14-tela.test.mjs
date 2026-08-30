/* ==========================================================================
   Super Adventure - Fase 14 (tela): a sala se desmanchando de verdade
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase14-tela.test.mjs

   O fase14.test.mjs cutuca os ganchos na mao, numa plataforma de mentira. Aqui
   o servidor das salas sobe DE VERDADE dentro do teste (o mesmo
   `montarWebSocket()` e o mesmo `salas.js` do `server/src/plataforma/`) e tres
   abas conversam com ele por WebSocket - entao quem desmancha a sala e o
   proprio servidor, do jeito que ele faz no navegador:

     - um convidado FECHA O CANAL no meio da partida: o servidor manda o `saiu`
       para quem ficou, as duas telas tiram ele do mundo e do placar, e a
       partida continua andando entre os dois que sobraram;
     - depois e o ANFITRIAO que fecha: dai o servidor devolve a sala ao lobby e
       manda `abortou` - o convidado que restou volta ao menu com o motivo na
       tarja, sem nenhuma tela presa por cima do jogo, e ja consegue clicar em
       "Jogar solo" e continuar jogando.
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
const jogador = (aba, apelido) => aba.jogo.jogadores.find((j) => j.apelido === apelido);
const placarNaTela = (aba) => aba.dom.elementos['placar-lista'].filhos
  .map((li) => li.querySelector('.nome').textContent);

let vivos = todos;

/** Um quadro em cada aba que ainda esta no ar, com um respiro para o canal. */
async function correr(quadros) {
  for (let i = 0; i < quadros; i++) {
    for (const aba of vivos) aba.dom.avancarQuadros(1);
    await pausa(1);
  }
}

/** Roda as abas ate a condicao acontecer (ou desiste e reclama). */
async function ate(condicao, oQue, voltas = 400) {
  for (let i = 0; i < voltas; i++) {
    if (condicao()) return;
    await correr(1);
  }
  throw new Error(`nunca aconteceu: ${oQue}`);
}

console.log('Super Adventure - fase 14 (tela)\n');

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

  await correr(5);
  for (const aba of todos) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} caiu na tela do jogo`);
    assert.equal(aba.jogo.jogadores.length, 3, `${aba.apelido} tem a sala inteira no mundo`);
  }
});

// ------------------------------------- O convidado que fecha a aba ---------
teste('convidado que some no meio da partida sai do mundo e do placar', async () => {
  jogador(ana, 'Caio').pontos += 200;      // ele estava ate ganhando
  await correr(4);

  caio.rede.fechar();                      // a aba do Caio foi fechada
  vivos = [ana, bento];

  await ate(() => ana.jogo.jogadores.length === 2 && bento.jogo.jogadores.length === 2,
    'o servidor avisar as duas telas que o Caio saiu');

  for (const aba of vivos) {
    assert.equal(jogador(aba, 'Caio'), undefined, `${aba.apelido} nao tem mais o Caio no mundo`);
    assert.deepEqual(placarNaTela(aba), ['Ana', 'Bento'],
      `${aba.apelido} ve o placar sem o Caio`);
    assert.equal(aba.dom.api.rede.saidas, 1, `${aba.apelido} contou a saida`);
  }
});

teste('a partida continua entre os dois que ficaram', async () => {
  const relogio = ana.jogo.relogio;
  jogador(ana, 'Bento').pontos += 60;

  await ate(() => jogador(bento, 'Bento').pontos === 60,
    'os pontos novos chegarem no convidado que ficou');

  assert.ok(ana.jogo.relogio > relogio, 'a anfitria continuou simulando o mundo');
  for (const aba of vivos) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} continua na fase`);
    assert.equal(escondido(aba, 'recado-palco'), true,
      `${aba.apelido} nao tem tarja nenhuma: a rede esta boa`);
    assert.equal(aba.dom.api.rede.instavel, false, `${aba.apelido} esta ouvindo a sala`);
  }
});

// --------------------------------------- O anfitriao que fecha a aba -------
teste('anfitriao que cai aborta a partida: o convidado volta ao menu com o motivo', async () => {
  const abortou = bento.rede.esperar('abortou');
  ana.rede.fechar();                       // a aba da anfitria foi fechada
  vivos = [bento];

  const aviso = await abortou;
  assert.ok(/anfitriao/i.test(aviso.motivo), 'o motivo veio do servidor');

  assert.equal(bento.jogo.tela, 'menu', 'o Bento voltou ao menu');
  assert.equal(bento.dom.elementos.aviso.textContent, aviso.motivo, 'com o motivo na tarja');
  assert.equal(bento.dom.api.rede.sala, null, 'e sem sala nenhuma');
});

teste('e nenhuma tela ficou presa por cima do jogo', () => {
  for (const tela of ['tela-fase', 'tela-fim', 'tela-pausa', 'hud', 'placar-sala',
                      'controles', 'recado-palco', 'hud-sala']) {
    assert.equal(escondido(bento, tela), true, `o Bento nao tem ${tela} na frente`);
  }
  assert.equal(escondido(bento, 'tela-menu'), false, 'o menu esta na tela');
});

teste('do menu da para voltar a jogar na hora', async () => {
  bento.dom.clicar('btn-solo');
  await correr(10);

  assert.equal(bento.jogo.tela, 'jogando', 'o Bento esta jogando de novo');
  assert.equal(bento.jogo.fase, 1, 'na fase 1');
  assert.equal(bento.jogo.jogadores.length, 1, 'sozinho, como um jogo solo');
});

teste('a sala vazia deixa de existir no servidor', async () => {
  bento.rede.fechar();
  vivos = [];
  await pausa(30);

  const { listarSalas } = await import('../../server/src/plataforma/salas.js');
  assert.equal(listarSalas('super_adventure').some((s) => s.codigo === codigo), false,
    'a sala nao esta mais na lista de abertas');
});

/* O corredor de testes so roda a fila aqui, e ele mesmo encerra o processo no
   fim - o servidor e os canais que sobrarem vao junto. */
await fim('Fase 14 (tela)');
