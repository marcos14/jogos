/* ==========================================================================
   Come-Come - Fase 8: o jogo SEM a Central (e a fiacao do SDK)
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase8.test.mjs

   A regra de ouro da plataforma e que um jogo que nao sabe nada dela continua
   funcionando. Este arquivo cobre justamente esse lado:

     - o index.html carrega o `/plataforma/sdk.js` (o unico caminho absoluto do
       jogo) ANTES do game.js, e traz o "JOGAR COM AMIGOS" ja escondido
     - sem `window.Plataforma` (index.html aberto direto do disco, sem
       servidor) o botao continua escondido, `rede.ligada` e falso e a corrida
       solo vai do MENU ate o PARABENS sem esbarrar em nada
     - com o SDK carregado mas o multijogador FORA DO AR, e a mesma coisa: o
       jogo nem tenta abrir lobby nenhum
     - a fiacao do SDK: `iniciar()` chamado com o slug e o apelido certos, e o
       lobby aberto com os quatro ganchos do contrato
     - as saidas de emergencia da sala (a partida acabou, o anfitriao caiu)
       devolvem todo mundo ao menu, com o recado na tarja
     - o manifesto continua declarando a sala de 1 a 5 e passando pelo
       validador do servidor

   As tres abas de verdade, conversando por WebSocket com o servidor de salas,
   estao no fase8-tela.test.mjs.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  carregarJogoComTela, criarPiloto, lerJogoJson, RAIZ, teste, fim,
} from './harness.mjs';
import { lerManifestoPlataforma } from '../../server/src/plataforma/manifesto.js';

const html = fs.readFileSync(path.join(RAIZ, 'jogos', 'come_come', 'index.html'), 'utf8');
const codigoDoJogo = fs.readFileSync(path.join(RAIZ, 'jogos', 'come_come', 'game.js'), 'utf8');
const css = fs.readFileSync(path.join(RAIZ, 'jogos', 'come_come', 'style.css'), 'utf8');

console.log('Come-Come - fase 8 (sem a Central)\n');

// ----------------------------------------------------------- O index.html --
teste('o index.html carrega o SDK da plataforma antes do game.js', () => {
  const sdk = html.indexOf('src="/plataforma/sdk.js"');
  const jogo = html.indexOf('src="game.js"');

  assert.ok(sdk > 0, 'o <script> do /plataforma/sdk.js esta la');
  assert.ok(jogo > sdk, 'e ele vem antes do game.js, senao o jogo nao o acharia');
  assert.ok(html.includes('src="/plataforma/sdk.js"'),
    'o caminho e absoluto: aberto do disco ele simplesmente nao carrega');
});

teste('o menu tem as duas portas: sozinho e com amigos', () => {
  assert.ok(html.includes('id="btn-jogar"'), 'o "JOGAR SOZINHO" continua ali');
  assert.ok(html.includes('JOGAR SOZINHO'));
  assert.ok(html.includes('id="btn-amigos"'), 'e o botao dos amigos existe');
  assert.ok(html.includes('JOGAR COM AMIGOS'));

  const botao = html.slice(html.indexOf('id="btn-amigos"'),
    html.indexOf('id="btn-amigos"') + 120);
  assert.ok(botao.includes('hidden'), 'que nasce escondido - quem o mostra e a rede');
});

teste('o HUD tem a caixa do codigo da sala e o menu tem a tarja de recado', () => {
  assert.ok(html.includes('id="hud-sala"'), 'a caixa do codigo da sala');
  assert.ok(html.includes('id="hud-sala-codigo"'));
  assert.ok(html.includes('id="aviso"'), 'a tarja de recado do menu');

  const caixa = html.slice(html.indexOf('id="hud-sala"'), html.indexOf('id="hud-sala-codigo"'));
  assert.ok(caixa.includes('hidden'), 'a caixa da sala so aparece no jogo em grupo');

  const tarja = html.slice(html.indexOf('id="aviso"'), html.indexOf('id="aviso"') + 80);
  assert.ok(tarja.includes('hidden'), 'e a tarja comeca vazia e escondida');

  assert.ok(/\.aviso\{/.test(css), 'o CSS pinta a tarja');
  assert.ok(/#hud-sala strong\{/.test(css), 'e destaca o codigo da sala no HUD');
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

teste('o SDK e iniciado com o slug do jogo e o apelido guardado', () => {
  const trecho = codigoDoJogo.slice(codigoDoJogo.indexOf('window.Plataforma.iniciar('));
  const chamada = trecho.slice(0, trecho.indexOf(')') + 1);

  assert.ok(chamada.includes("jogo: 'come_come'"), 'o slug e o da pasta do jogo');
  assert.ok(chamada.includes('apelido: lerApelidoGuardado()'),
    'e o nome da ultima partida vai junto, para o lobby ja abrir preenchido');
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
  const dom = carregarJogoComTela('come_come');

  assert.equal(dom.api.pronta, null, 'nao ha promessa de plataforma pendurada');
  assert.equal(dom.api.rede.ligada, false);
  assert.equal(dom.api.rede.sala, null);
  assert.equal(dom.api.rede.papel, 'solo');
  assert.equal(dom.escondido('btn-amigos'), true,
    'o botao "JOGAR COM AMIGOS" continua escondido');
  assert.equal(dom.escondido('aviso'), true, 'e nao ha recado nenhum na tela');
});

teste('e a corrida solo vai do MENU ate o PARABENS, com os tres labirintos', () => {
  const dom = carregarJogoComTela('come_come');
  const jogo = dom.api.jogo;
  const limparOLabirinto = criarPiloto(dom);

  assert.equal(jogo.tela, 'menu', 'o jogo abre no menu');
  dom.comecarPartida('Ana');
  assert.equal(jogo.tela, 'jogando');
  assert.equal(jogo.apelido, 'Ana');
  assert.equal(dom.escondido('hud'), false);
  assert.equal(dom.escondido('hud-sala'), true, 'sem sala, sem caixa de codigo no HUD');

  for (let fase = 1; fase <= dom.api.mundo.TOTAL_FASES; fase++) {
    assert.equal(jogo.fase, fase, `o piloto esta no labirinto ${fase}`);
    limparOLabirinto();
    if (fase < dom.api.mundo.TOTAL_FASES) {
      assert.equal(jogo.tela, 'fase', `o labirinto ${fase} ficou limpo`);
      dom.clicar('btn-proxima');
    }
  }

  assert.equal(jogo.tela, 'parabens', 'os tres labirintos limpos');
  assert.equal(dom.escondido('tela-parabens'), false);
  assert.ok(jogo.corrida.total > 0, `a corrida rendeu ${jogo.corrida.total} pontos`);
  assert.equal(dom.texto('parabens-total'), String(jogo.corrida.total));
});

teste('e o "JOGAR DE NOVO" do PARABENS recomeca a corrida sozinho', () => {
  const dom = carregarJogoComTela('come_come');
  dom.comecarPartida('Ana');
  dom.api.jogo.corrida = dom.api.Corrida.concluir(
    dom.api.Corrida.novoEstado(), 1, 100);          // um caderno com uma fase feita

  dom.clicar('btn-de-novo');
  assert.equal(dom.api.jogo.tela, 'jogando');
  assert.equal(dom.api.jogo.fase, 1, 'de volta ao labirinto 1');
  assert.equal(dom.api.jogo.corrida.total, 0, 'com o caderno em branco');
  assert.equal(dom.api.rede.sala, null, 'e sem sala nenhuma no caminho');
});

// ------------------------------------- Com o SDK, mas o servidor fora ------
teste('SDK na pagina e multijogador fora do ar: so o "JOGAR SOZINHO"', async () => {
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

  const dom = carregarJogoComTela('come_come', { plataforma });
  await dom.api.pronta;

  assert.equal(dom.api.rede.ligada, false, 'a rede nao ligou');
  assert.equal(dom.escondido('btn-amigos'), true, 'e o botao dos amigos nem apareceu');

  dom.clicar('btn-amigos');
  assert.equal(abriuLobby, false, 'clicar nele (escondido) tambem nao abre lobby');

  dom.comecarPartida('Bia');
  dom.avancarQuadros(10);
  assert.equal(dom.api.jogo.tela, 'jogando', 'o solo joga igual');
  assert.ok(dom.api.jogo.relogio > 0, 'e o labirinto anda');
});

teste('o SDK quebrando na hora de iniciar nao derruba o jogo', async () => {
  const plataforma = {
    perfil: { apelido: '', definirApelido() {} },
    iniciar() { return Promise.reject('sem plataforma (de mentira, e o teste)'); },
  };

  const dom = carregarJogoComTela('come_come', { plataforma });
  await dom.api.pronta;                 // a promessa resolve, nao estoura

  assert.equal(dom.api.rede.ligada, false);
  dom.comecarPartida('Caio');
  assert.equal(dom.api.jogo.tela, 'jogando', 'e da para jogar do mesmo jeito');
});

/* --------------------------------------------------------------------------
   A fiacao, com uma Central de mentira. As tres abas de verdade estao no
   fase8-tela.test.mjs; aqui o que se olha e o que o JOGO faz em cada gancho.
   -------------------------------------------------------------------------- */
function criarCentralDeMentira() {
  const central = {
    iniciada: null,          // o que foi passado para `Plataforma.iniciar()`
    apelidoDefinido: null,   // o que o jogo mandou para `perfil.definirApelido`
    ganchos: null,           // as opcoes do `abrirLobby()`
    saiu: 0,                 // quantas vezes o jogo largou a sala
    enviados: [],
  };
  const plataforma = {
    versao: 1,
    perfil: {
      apelido: '',
      definirApelido(nome) { central.apelidoDefinido = nome; plataforma.perfil.apelido = nome; },
    },
    multijogador: {
      disponivel: true,
      em() {},
      abrirLobby(opcoes) { central.ganchos = opcoes; },
      sair() { central.saiu++; },
      enviar(d) { central.enviados.push(d); },
      paraAnfitriao(d) { central.enviados.push(d); },
      terminar() {},
    },
    iniciar(opcoes) { central.iniciada = opcoes; return Promise.resolve(plataforma); },
  };
  central.plataforma = plataforma;
  return central;
}

/** Uma sala pronta, como a que chega no `aoComecar`. */
function salaDeMentira(souAnfitriao = true) {
  return {
    codigo: 'AB12', estado: 'jogando', modo: 'competitivo',
    max: 5, min: 1, taxaEstado: 20, semente: 12345,
    eu: 'eu-1', souAnfitriao, anfitriao: souAnfitriao ? 'eu-1' : 'outro-1',
    jogadores: [
      { id: 'eu-1', apelido: 'Duda', cor: '#ff0000', indice: 0, pronto: true, anfitriao: souAnfitriao },
      { id: 'outro-1', apelido: 'Elo', cor: '#00ff00', indice: 1, pronto: true, anfitriao: !souAnfitriao },
    ],
  };
}

async function abrirComCentral(guardado = {}) {
  const central = criarCentralDeMentira();
  const dom = carregarJogoComTela('come_come', { plataforma: central.plataforma, guardado });
  await dom.api.pronta;
  return { central, dom };
}

teste('com a Central no ar o botao aparece e `iniciar` leva slug e apelido', async () => {
  const { central, dom } = await abrirComCentral({ 'come_come:apelido': 'Duda' });

  assert.equal(central.iniciada.jogo, 'come_come', 'o slug e o da pasta do jogo');
  assert.equal(central.iniciada.apelido, 'Duda', 'e o nome da ultima partida vai junto');
  assert.equal(dom.api.rede.ligada, true);
  assert.equal(dom.escondido('btn-amigos'), false, 'o botao dos amigos apareceu');
  assert.equal(dom.elementos['campo-apelido'].value, 'Duda',
    'e o campo do menu ja abre com o nome guardado');
});

teste('clicar nele leva o nome do campo e abre o lobby com os quatro ganchos', async () => {
  const { central, dom } = await abrirComCentral();

  dom.elementos['campo-apelido'].value = '  Duda  ';
  dom.clicar('btn-amigos');

  assert.equal(central.apelidoDefinido, 'Duda', 'o espaco sobrando saiu no caminho');
  assert.ok(central.ganchos, 'o lobby foi aberto');
  for (const nome of ['aoComecar', 'aoReceber', 'aoTerminar', 'aoAbortar']) {
    assert.equal(typeof central.ganchos[nome], 'function', `faltou o gancho ${nome}`);
  }
  assert.equal(central.ganchos.voltarAoLobby, false,
    'quem manda na tela do fim e o jogo');
  assert.equal(dom.api.jogo.tela, 'menu', 'no lobby ainda ninguem esta jogando');
});

teste('a sala comecando poe todo mundo no labirinto 1, com o codigo no HUD', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(true));

  assert.equal(dom.api.jogo.tela, 'jogando');
  assert.equal(dom.api.jogo.fase, 1, 'todo mundo comeca pelo labirinto 1');
  assert.equal(dom.api.rede.papel, 'anfitriao');
  assert.equal(dom.api.rede.sala.codigo, 'AB12');
  assert.equal(dom.escondido('hud-sala'), false, 'a caixa da sala apareceu');
  assert.equal(dom.texto('hud-sala-codigo'), 'AB12');
  assert.equal(dom.escondido('tela-menu'), true, 'o menu saiu da frente');
  assert.equal(dom.escondido('hud'), false, 'o HUD entrou');
  assert.equal(dom.api.jogo.apelido, 'Duda', 'o apelido e o que ficou na sala');

  dom.avancarQuadros(10);
  assert.ok(dom.api.jogo.relogio > 0, 'e o labirinto anda');
});

teste('quem nao criou a sala entra como convidado', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(false));

  assert.equal(dom.api.rede.papel, 'convidado');
  assert.equal(dom.api.jogo.tela, 'jogando');
});

teste('"JOGAR SOZINHO" larga a sala e volta a ser um jogo de um jogador so', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(true));

  dom.comecarPartida('Duda');
  assert.equal(central.saiu, 1, 'o jogo avisou a Central que estava saindo');
  assert.equal(dom.api.rede.sala, null, 'nao esta mais em sala nenhuma');
  assert.equal(dom.api.rede.papel, 'solo');
  assert.equal(dom.escondido('hud-sala'), true, 'a caixa do codigo sumiu do HUD');
  assert.equal(dom.api.jogo.tela, 'jogando', 'e a partida continua, agora sozinho');
});

teste('o anfitriao caindo devolve todo mundo ao menu, com o motivo na tarja', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(false));
  dom.avancarQuadros(10);

  central.ganchos.aoAbortar({ motivo: 'O anfitrião saiu da sala.' });

  assert.equal(dom.api.jogo.tela, 'menu', 'ninguem fica preso numa tela parada');
  assert.equal(dom.api.rede.sala, null);
  assert.equal(dom.api.rede.papel, 'solo');
  assert.equal(dom.escondido('hud'), true, 'sem HUD de partida');
  assert.equal(dom.escondido('tela-menu'), false, 'com o menu de volta');
  assert.equal(dom.escondido('aviso'), false, 'e o recado na tela');
  assert.equal(dom.texto('aviso'), 'O anfitrião saiu da sala.');
});

teste('e dali da para jogar sozinho na hora, sem recarregar nada', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(false));
  central.ganchos.aoAbortar({ motivo: 'A sala foi encerrada.' });

  dom.comecarPartida('Duda');
  dom.avancarQuadros(10);
  assert.equal(dom.api.jogo.tela, 'jogando');
  assert.ok(dom.api.jogo.relogio > 0, 'com o labirinto andando de novo');
  assert.equal(dom.escondido('aviso'), true, 'e a tarja sai da frente na partida nova');
  assert.equal(dom.escondido('btn-amigos'), false,
    'o botao dos amigos continua de pe para a proxima sala');
});

teste('a partida da sala terminando abre o ranking da sala', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(true));

  central.ganchos.aoTerminar({ placar: [], sala: salaDeMentira(true) });

  assert.equal(dom.api.jogo.tela, 'fim');
  assert.ok(dom.api.rede.sala, 'a sala fica disponivel para voltar ao lobby');
  assert.equal(dom.escondido('fim-ranking'), false, 'o ranking final apareceu');
  assert.equal(dom.texto('fim-subtitulo'), 'Ranking confirmado pela Central.');
  assert.ok(dom.texto('fim-ranking').indexOf('Duda') >= 0, 'com a linha local');
});

teste('o pacote que chega e anotado, e o de uma sala que acabou vai para o lixo', async () => {
  const { central, dom } = await abrirComCentral();
  dom.clicar('btn-amigos');
  central.ganchos.aoComecar(salaDeMentira(true));

  central.ganchos.aoReceber({ de: 'outro-1', d: { k: 'x' } });
  assert.equal(dom.api.rede.recebidas, 1);
  assert.deepEqual(dom.api.rede.ultimaMensagem.d, { k: 'x' });

  central.ganchos.aoAbortar({ motivo: 'A sala foi encerrada.' });
  central.ganchos.aoReceber({ de: 'outro-1', d: { k: 'y' } });
  assert.equal(dom.api.rede.recebidas, 1, 'o pacote atrasado nao foi contado');
});

// ------------------------------------------------------------ Manifesto ----
teste('o jogo.json continua declarando a sala de 1 a 5', () => {
  const j = lerJogoJson('come_come');
  assert.deepEqual(j.plataforma.multijogador, {
    min: 1, max: 5, modo: 'competitivo', autoridade: 'anfitriao',
    taxaEstado: 20, listarSalas: true,
  });
  assert.deepEqual(lerManifestoPlataforma(j.plataforma).problemas, [],
    'e o validador do servidor nao corrige nada');
});

await fim('Fase 8');
