/* ==========================================================================
   Super Adventure - Fase 8: o jogo SEM a Central (e a fiacao do SDK)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase8.test.mjs

   A regra de ouro da plataforma e que um jogo que nao sabe nada dela continua
   funcionando. Este arquivo cobre justamente esse lado:

     - o index.html carrega o `/plataforma/sdk.js` (caminho absoluto) ANTES do
       game.js, e traz o botao "Jogar com amigos" ja escondido
     - sem `window.Plataforma` (index.html aberto direto do disco, sem
       servidor) o botao continua escondido, `rede.ligada` e falso e a corrida
       solo vai do menu ate a bandeira da fase 1 sem esbarrar em nada
     - com o SDK carregado mas o multijogador FORA DO AR, e a mesma coisa: o
       jogo nem tenta abrir lobby nenhum
     - o manifesto do jogo.json continua declarando a sala de 1 a 8 (RF-10) e
       passando pelo validador do servidor

   As duas abas de verdade, conversando por WebSocket, estao no
   fase8-tela.test.mjs.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  carregarJogoComTela, criarPiloto, lerJogoJson, RAIZ, teste, fim,
} from './harness.mjs';
import { lerManifestoPlataforma } from '../../server/src/plataforma/manifesto.js';

const html = fs.readFileSync(path.join(RAIZ, 'jogos', 'super_adventure', 'index.html'), 'utf8');
const codigoDoJogo = fs.readFileSync(path.join(RAIZ, 'jogos', 'super_adventure', 'game.js'), 'utf8');

console.log('Super Adventure - fase 8 (sem a Central)\n');

// ----------------------------------------------------------- O index.html --
teste('o index.html carrega o SDK da plataforma antes do game.js', () => {
  const sdk = html.indexOf('src="/plataforma/sdk.js"');
  const jogo = html.indexOf('src="game.js"');

  assert.ok(sdk > 0, 'o <script> do /plataforma/sdk.js esta la');
  assert.ok(jogo > sdk, 'e ele vem antes do game.js, senao o jogo nao o acharia');
  assert.ok(html.includes('src="/plataforma/sdk.js"'),
    'o caminho e absoluto: aberto do disco ele simplesmente nao carrega');
});

teste('o menu tem o botao "Jogar com amigos", escondido de nascenca', () => {
  const botao = html.slice(html.indexOf('id="btn-amigos"'), html.indexOf('id="btn-amigos"') + 200);
  assert.ok(html.includes('id="btn-amigos"'), 'o botao existe');
  assert.ok(botao.includes('hidden'), 'e nasce escondido - quem o mostra e a rede');
  assert.ok(html.includes('JOGAR COM AMIGOS'));
  assert.ok(html.includes('id="btn-solo"'), 'e o "Jogar solo" continua ali do lado');
});

teste('o HUD tem a caixa do codigo da sala e o menu tem a tarja de recado', () => {
  assert.ok(html.includes('id="hud-sala"'), 'a caixa do codigo da sala');
  assert.ok(html.includes('id="hud-sala-codigo"'));
  assert.ok(html.includes('id="aviso"'), 'a tarja de recado do menu');

  const caixa = html.slice(html.indexOf('id="hud-sala"'), html.indexOf('id="hud-sala-codigo"'));
  assert.ok(caixa.includes('hidden'), 'a caixa da sala so aparece no jogo em grupo');
});

// ------------------------------------------------------------- O game.js ---
teste('todo o codigo de rede esta atras de "if (window.Plataforma)"', () => {
  // Os comentarios falam da plataforma o tempo todo; o que interessa aqui e o
  // codigo que roda.
  const semComentarios = codigoDoJogo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const usos = semComentarios.match(/window\.Plataforma/g) || [];
  assert.equal(usos.length, 2,
    'so o portao (`window.Plataforma ? window.Plataforma.iniciar(...) : null`) '
    + 'toca no SDK direto');
  assert.ok(/window\.Plataforma\s*\n?\s*\?\s*window\.Plataforma\.iniciar/.test(semComentarios),
    'e o jogo so chama iniciar() quando o SDK esta na pagina');
});

teste('o lobby e aberto com os quatro ganchos do contrato da plataforma', () => {
  const trecho = codigoDoJogo.slice(codigoDoJogo.indexOf('mj.abrirLobby('));
  const chamada = trecho.slice(0, trecho.indexOf('});'));

  for (const gancho of ['aoComecar', 'aoReceber', 'aoTerminar', 'aoAbortar']) {
    assert.ok(chamada.includes(gancho + ':'), `faltou o gancho ${gancho}`);
  }
  assert.ok(chamada.includes('voltarAoLobby: false'),
    'depois da partida quem manda na tela e o jogo, nao o lobby');
});

// ---------------------------------------------- Sem plataforma nenhuma -----
teste('sem window.Plataforma o jogo nem tenta falar com a Central', () => {
  const dom = carregarJogoComTela('super_adventure');

  assert.equal(dom.api.pronta, null, 'nao ha promessa de plataforma pendurada');
  assert.equal(dom.api.rede.ligada, false);
  assert.equal(dom.api.rede.sala, null);
  assert.equal(dom.api.rede.papel, 'solo');
  assert.equal(dom.elementos['btn-amigos'].classList.contains('hidden'), true,
    'o botao "Jogar com amigos" continua escondido');
});

teste('e a corrida solo vai do menu ate a bandeira da fase 1', () => {
  const dom = carregarJogoComTela('super_adventure');
  const jogo = dom.api.jogo;
  const correr = criarPiloto(dom);

  dom.clicar('btn-solo');
  assert.equal(jogo.tela, 'jogando');
  assert.equal(dom.elementos.hud.classList.contains('hidden'), false);
  assert.equal(dom.elementos['hud-sala'].classList.contains('hidden'), true,
    'sem sala, sem caixa de codigo no HUD');

  correr(() => jogo.concluida, 6000);
  assert.equal(jogo.concluida, true, 'chegou na bandeira');
  assert.ok(jogo.pontos > 0, `e juntou ${jogo.pontos} pontos no caminho`);
  assert.equal(dom.elementos['tela-fase'].classList.contains('hidden'), false);
});

// ------------------------------------- Com o SDK, mas o servidor fora ------
teste('SDK na pagina e multijogador fora do ar: so o "Jogar solo"', async () => {
  let abriuLobby = false;
  const plataforma = {
    versao: 1,
    perfil: { apelido: '', definirApelido() {} },
    multijogador: {
      disponivel: false,             // e o que o SDK devolve sem servidor
      em() {},
      abrirLobby() { abriuLobby = true; },
    },
    iniciar() { return Promise.resolve(plataforma); },
  };

  const dom = carregarJogoComTela('super_adventure', { plataforma });
  await dom.api.pronta;

  assert.equal(dom.api.rede.ligada, false, 'a rede nao ligou');
  assert.equal(dom.elementos['btn-amigos'].classList.contains('hidden'), true,
    'e o botao dos amigos nem apareceu');

  dom.clicar('btn-amigos');
  assert.equal(abriuLobby, false, 'clicar nele (escondido) tambem nao abre lobby');

  dom.clicar('btn-solo');
  dom.tecla('ArrowRight', true);
  dom.avancarQuadros(30);
  dom.tecla('ArrowRight', false);
  assert.ok(dom.api.jogo.heroi.x > dom.api.mapas[0].spawn.x, 'o solo joga igual');
});

teste('o SDK quebrando na hora de iniciar nao derruba o jogo', async () => {
  const plataforma = {
    perfil: { apelido: '', definirApelido() {} },
    iniciar() { return Promise.reject('sem plataforma (de mentira, e o teste)'); },
  };

  const dom = carregarJogoComTela('super_adventure', { plataforma });
  await dom.api.pronta;                 // a promessa resolve, nao estoura

  assert.equal(dom.api.rede.ligada, false);
  dom.clicar('btn-solo');
  assert.equal(dom.api.jogo.tela, 'jogando', 'e da para jogar do mesmo jeito');
});

// ------------------------------------------------------------ Manifesto ----
teste('o jogo.json continua declarando a sala de 1 a 8 (RF-10)', () => {
  const j = lerJogoJson('super_adventure');
  assert.deepEqual(j.plataforma.multijogador, {
    min: 1, max: 8, modo: 'competitivo', autoridade: 'anfitriao',
    taxaEstado: 20, listarSalas: true,
  });
  assert.deepEqual(lerManifestoPlataforma(j.plataforma).problemas, [],
    'e o validador do servidor nao corrige nada');
});

await fim('Fase 8');
