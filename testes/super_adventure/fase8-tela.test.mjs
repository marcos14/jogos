/* ==========================================================================
   Super Adventure - Fase 8 (tela): o menu Solo/Amigos e o lobby da Central
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase8-tela.test.mjs

   Aqui o servidor das salas sobe DE VERDADE dentro do teste (o mesmo
   `montarWebSocket()` e o mesmo `salas.js` do `server/src/plataforma/`, numa
   porta sorteada) e tres "abas" conversam com ele por WebSocket, cada uma com
   a sua copia do jogo rodando num DOM de mentira:

     - Ana cria a sala; Bento e Caio entram pelo codigo de 4 letras
     - os tres marcam "Pronto" e a anfitria aperta "Comecar"
     - as tres abas caem na tela do jogo, na fase 1, com o codigo da sala no
       HUD e cada uma sabendo se e anfitria ou convidada
     - o cano de mensagens esta aberto nos dois sentidos (convidado -> anfitriao
       e anfitriao -> todos)
     - "Jogar solo" larga a sala e volta a ser um jogo de um jogador so
     - a anfitria fechando a aba no meio da partida devolve os outros ao menu
       com o recado, sem ninguem travado

   O que este arquivo NAO testa: o CONTEUDO dos pacotes e o mundo sincronizado
   (o anfitriao simulando todo mundo) - isso e do fase9.test.mjs e do
   fase9-tela.test.mjs.
   ========================================================================== */

import assert from 'node:assert/strict';
import {
  carregarJogoComTela, criarAbaDaPlataforma, subirPlataforma, teste, fim,
} from './harness.mjs';

const servidor = await subirPlataforma();

/** Uma aba de navegador: o canal com o servidor + o jogo rodando nela. */
async function abrirAba(apelido) {
  const rede = criarAbaDaPlataforma(servidor, apelido);
  await rede.abrir();
  const dom = carregarJogoComTela('super_adventure', { plataforma: rede.plataforma });
  await dom.api.pronta;
  return { apelido, rede, dom, jogo: dom.api.jogo };
}

const escondido = (aba, id) => aba.dom.elementos[id].classList.contains('hidden');
const texto = (aba, id) => aba.dom.elementos[id].textContent;

/* Espera a sala de uma aba chegar num estado (tres jogadores, todos prontos...).
   Cada aviso do servidor chega no seu tempo em cada socket, entao olhar o
   estado de vez em quando e mais honesto do que contar mensagens. */
async function esperarSala(aba, condicao, oQue, ms = 3000) {
  const limite = Date.now() + ms;
  for (;;) {
    const sala = aba.rede.salaAgora();
    if (sala && condicao(sala)) return sala;
    if (Date.now() > limite) throw new Error(`a sala de ${aba.apelido} nunca ficou ${oQue}`);
    await new Promise((segue) => setTimeout(segue, 10));
  }
}

const ana = await abrirAba('Ana');
const bento = await abrirAba('Bento');
const caio = await abrirAba('Caio');
let codigo = '';

console.log('Super Adventure - fase 8 (tela)\n');

// ------------------------------------------------------------- O botao -----
teste('com a Central no ar, o menu ganha o "Jogar com amigos"', () => {
  assert.equal(ana.dom.api.rede.ligada, true, 'a rede ligou nas tres abas');
  assert.equal(bento.dom.api.rede.ligada, true);
  assert.equal(caio.dom.api.rede.ligada, true);

  assert.equal(escondido(ana, 'btn-amigos'), false, 'o botao apareceu');
  assert.equal(escondido(ana, 'btn-solo'), false, 'e o "Jogar solo" continua ali');
  assert.equal(ana.jogo.tela, 'menu', 'ninguem foi jogado no jogo antes da hora');
});

teste('clicar nele abre o lobby da plataforma com os quatro ganchos', () => {
  ana.dom.clicar('btn-amigos');

  assert.equal(ana.rede.lobbyAberto(), true, 'o lobby foi aberto pelo SDK');
  const ganchos = ana.rede.ganchos();
  for (const nome of ['aoComecar', 'aoReceber', 'aoTerminar', 'aoAbortar']) {
    assert.equal(typeof ganchos[nome], 'function', `faltou o gancho ${nome}`);
  }
  assert.equal(ganchos.voltarAoLobby, false, 'quem manda na tela do fim e o jogo');

  bento.dom.clicar('btn-amigos');
  caio.dom.clicar('btn-amigos');
});

// -------------------------------------------------------------- A sala -----
teste('Ana cria a sala e ganha um codigo de 4 letras', async () => {
  const esperando = ana.rede.esperar('sala');
  ana.rede.mj.criar();
  const sala = await esperando;

  codigo = sala.codigo;
  assert.equal(codigo.length, 4, `o codigo tem 4 letras (veio "${codigo}")`);
  assert.equal(sala.estado, 'lobby');
  assert.equal(sala.souAnfitriao, true, 'quem cria e a anfitria');
  assert.equal(sala.max, 8, 'a sala aceita os 8 do manifesto');
  assert.equal(sala.jogadores.length, 1);
  assert.equal(ana.jogo.tela, 'menu', 'no lobby ainda ninguem esta jogando');
});

teste('a sala aparece na lista de salas abertas da rede', async () => {
  const r = await fetch(`${servidor.url}/api/plataforma/salas?jogo=super_adventure`);
  const { salas } = await r.json();

  const minha = salas.find((s) => s.codigo === codigo);
  assert.ok(minha, 'a sala esta na lista (listarSalas: true no jogo.json)');
  assert.equal(minha.jogo, 'super_adventure');
});

teste('Bento e Caio entram digitando o codigo', async () => {
  const chegouB = bento.rede.esperar('sala');
  bento.rede.mj.entrar(codigo.toLowerCase());     // o SDK ja poe em maiuscula
  const salaB = await chegouB;

  assert.equal(salaB.codigo, codigo);
  assert.equal(salaB.souAnfitriao, false, 'quem entra e convidado');

  const chegouC = caio.rede.esperar('sala');
  caio.rede.mj.entrar(codigo);
  await chegouC;

  const cheia = await esperarSala(ana, (s) => s.jogadores.length === 3, 'com os tres');
  assert.equal(cheia.jogadores.length, 3, 'a anfitria ve os tres na sala');
  assert.deepEqual(cheia.jogadores.map((j) => j.apelido), ['Ana', 'Bento', 'Caio']);
  assert.deepEqual(cheia.jogadores.map((j) => j.indice), [0, 1, 2],
    'cada um com o seu indice fixo na partida');
  assert.ok(cheia.jogadores.every((j) => j.cor), 'e com uma cor propria');
});

teste('os tres marcam "Pronto"', async () => {
  for (const aba of [ana, bento, caio]) {
    const mudou = aba.rede.esperar('sala');
    aba.rede.mj.pronto(true);
    await mudou;
  }

  const sala = await esperarSala(ana, (s) => s.jogadores.every((j) => j.pronto),
    'com todo mundo pronto');
  assert.equal(sala.jogadores.filter((j) => j.pronto).length, 3,
    'os tres aparecem prontos para a anfitria');
});

// ----------------------------------------------------- A partida comeca ----
teste('a anfitria comeca e as tres abas caem na tela do jogo', async () => {
  const comecouA = ana.rede.esperar('inicio');
  const comecouB = bento.rede.esperar('inicio');
  const comecouC = caio.rede.esperar('inicio');

  ana.rede.mj.comecar();
  await Promise.all([comecouA, comecouB, comecouC]);

  for (const aba of [ana, bento, caio]) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} esta na tela do jogo`);
    assert.equal(aba.jogo.fase, 1, 'e todo mundo comeca pela fase 1');
    assert.equal(escondido(aba, 'tela-menu'), true, 'o menu saiu da frente');
    assert.equal(escondido(aba, 'hud'), false, 'o HUD entrou');
    assert.equal(escondido(aba, 'controles'), false, 'e a caixa de controles');
    assert.equal(aba.rede.lobbyAberto(), false, 'o lobby se fechou sozinho');
  }
});

teste('cada aba sabe se e anfitria ou convidada, e mostra o codigo no HUD', () => {
  assert.equal(ana.dom.api.rede.papel, 'anfitriao');
  assert.equal(bento.dom.api.rede.papel, 'convidado');
  assert.equal(caio.dom.api.rede.papel, 'convidado');

  for (const aba of [ana, bento, caio]) {
    assert.equal(escondido(aba, 'hud-sala'), false, 'a caixa da sala apareceu');
    assert.equal(texto(aba, 'hud-sala-codigo'), codigo);
    assert.equal(aba.dom.api.rede.sala.codigo, codigo);
    assert.equal(aba.dom.api.rede.sala.jogadores.length, 3);
  }
});

teste('a fase corre na anfitria e e desenhada nas tres abas', () => {
  const x0 = ana.jogo.heroi.x;
  ana.dom.tecla('ArrowRight', true);
  ana.dom.avancarQuadros(30);
  ana.dom.tecla('ArrowRight', false);
  assert.ok(ana.jogo.heroi.x > x0, 'a anfitria anda com a seta - o mundo e dela');

  for (const aba of [ana, bento, caio]) {
    aba.dom.avancarQuadros(5);
    assert.ok(aba.dom.pintados.length > 0, `${aba.apelido} esta desenhando a fase`);
  }
});

// ---------------------------------------------------- O cano de mensagens --
/* Desde a fase 9 o cano vive cheio: a anfitria manda o mundo 20 vezes por
   segundo e os convidados mandam as teclas na mesma taxa. O que interessa
   aqui e so a DIRECAO de cada tipo de pacote - por isso cada aba anota TUDO o
   que chega nela e o teste procura a marca no meio. Quem confere o conteudo
   dos pacotes de verdade sao os testes da fase 9. */
function anotarPacotes(aba) {
  const caixa = [];
  aba.rede.mj.em('msg', (m) => caixa.push(m.d));
  return caixa;
}

const chegouMarca = (caixa, marca) => caixa.some((d) => d && d.marca === marca);

async function esperarPacote(caixa, marca, ms = 3000) {
  const limite = Date.now() + ms;
  while (!chegouMarca(caixa, marca)) {
    if (Date.now() > limite) throw new Error(`o pacote "${marca}" nunca chegou`);
    await new Promise((segue) => setTimeout(segue, 10));
  }
}

const naAna = anotarPacotes(ana);
const naBento = anotarPacotes(bento);
const naCaio = anotarPacotes(caio);

teste('o convidado consegue falar com o anfitriao (e so com ele)', async () => {
  bento.rede.mj.paraAnfitriao({ k: 'x', marca: 'so-para-a-anfitria' });
  await esperarPacote(naAna, 'so-para-a-anfitria');

  assert.ok(chegouMarca(naAna, 'so-para-a-anfitria'), 'a anfitria recebeu o pacote');
  assert.ok(!chegouMarca(naCaio, 'so-para-a-anfitria'),
    'e Caio nao viu nada: o pacote era so dela');
});

teste('e o anfitriao consegue falar com todos de uma vez', async () => {
  ana.rede.mj.enviar({ k: 'x', marca: 'para-a-sala-inteira' });
  await Promise.all([
    esperarPacote(naBento, 'para-a-sala-inteira'),
    esperarPacote(naCaio, 'para-a-sala-inteira'),
  ]);

  for (const [aba, caixa] of [[bento, naBento], [caio, naCaio]]) {
    assert.ok(chegouMarca(caixa, 'para-a-sala-inteira'), `${aba.apelido} recebeu o recado`);
  }
});

// ------------------------------------------------------- Voltar ao solo ----
teste('"Jogar solo" larga a sala e volta a ser um jogo de um jogador so', async () => {
  const outrosViram = ana.rede.esperar('saiu');
  caio.dom.clicar('btn-solo');

  assert.equal(caio.dom.api.rede.sala, null, 'Caio nao esta mais em sala nenhuma');
  assert.equal(caio.dom.api.rede.papel, 'solo');
  assert.equal(escondido(caio, 'hud-sala'), true, 'a caixa do codigo sumiu do HUD');
  assert.equal(caio.jogo.tela, 'jogando', 'e ele continua jogando, agora sozinho');
  assert.equal(caio.jogo.fase, 1);

  const quemSaiu = await outrosViram;
  assert.equal(quemSaiu.apelido, 'Caio', 'a sala soube que ele saiu');
});

// ------------------------------------------------ O anfitriao caindo -------
teste('a anfitria fechando a aba devolve os convidados ao menu', async () => {
  const abortou = bento.rede.esperar('abortou');
  ana.rede.fechar();                    // e o que fechar a aba faz
  const aviso = await abortou;

  assert.ok(aviso.motivo, `a plataforma explicou o motivo ("${aviso.motivo}")`);
  assert.equal(bento.jogo.tela, 'menu', 'Bento voltou para a tela inicial');
  assert.equal(bento.dom.api.rede.sala, null, 'e nao esta mais em sala nenhuma');
  assert.equal(escondido(bento, 'hud'), true, 'sem HUD de partida');
  assert.equal(escondido(bento, 'tela-menu'), false, 'com o menu de volta');
  assert.equal(escondido(bento, 'aviso'), false, 'e o recado na tela');
  assert.equal(texto(bento, 'aviso'), aviso.motivo);
});

teste('e ele pode jogar sozinho na hora, sem recarregar nada', () => {
  bento.dom.clicar('btn-solo');
  const x0 = bento.jogo.heroi.x;
  bento.dom.tecla('ArrowRight', true);
  bento.dom.avancarQuadros(30);
  bento.dom.tecla('ArrowRight', false);

  assert.equal(bento.jogo.tela, 'jogando');
  assert.ok(bento.jogo.heroi.x > x0);
});

teste('e o "Jogar com amigos" continua de pe para a proxima sala', () => {
  assert.equal(escondido(bento, 'btn-amigos'), false);
  bento.dom.clicar('btn-amigos');
  assert.equal(bento.rede.lobbyAberto(), true, 'o lobby abre de novo');
});

/* O corredor de testes so roda a fila aqui, e ele mesmo encerra o processo no
   fim - o servidor e os canais que sobrarem vao junto. */
await fim('Fase 8 (tela)');
