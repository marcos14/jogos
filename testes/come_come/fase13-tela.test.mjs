/* ==========================================================================
   Come-Come - Fase 13 (tela): ranking com a Central real
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase13-tela.test.mjs

   Sobe o servidor de salas de verdade e encerra uma partida pelo caminho real
   do WebSocket: o anfitriao chama `terminar(placar)`, a Central devolve o fim
   e as tres abas mostram o mesmo ranking da sala.
   ========================================================================== */

import assert from 'node:assert/strict';
import {
  carregarJogoComTela, criarAbaDaPlataforma, subirPlataforma, teste, fim,
} from './harness.mjs';

const servidor = await subirPlataforma();

async function abrirAba(apelido) {
  const rede = criarAbaDaPlataforma(servidor, apelido);
  await rede.abrir();
  const dom = carregarJogoComTela('come_come', { plataforma: rede.plataforma });
  await dom.api.pronta;
  dom.elementos['campo-apelido'].value = apelido;
  dom.clicar('btn-amigos');
  return { apelido, rede, dom, jogo: dom.api.jogo };
}

async function esperar(condicao, msg, ms = 3000) {
  const limite = Date.now() + ms;
  for (;;) {
    if (condicao()) return;
    if (Date.now() > limite) throw new Error(msg);
    await new Promise((segue) => setTimeout(segue, 10));
  }
}

function jogador(aba, apelido) {
  return aba.jogo.jogadores.find((j) => j.apelido === apelido);
}

function encerrarPorVidas(aba) {
  for (const j of aba.jogo.jogadores) {
    j.vidas = 0;
    j.espectador = true;
  }
  aba.jogo.rodada = { vidas: 0, pausa: 1, pego: 0, acabou: true };
  aba.dom.avancarQuadros(1);
}

function valor(o) { return JSON.parse(JSON.stringify(o)); }

console.log('Come-Come - fase 13 (tela)\n');

const ana = await abrirAba('Ana');
const bento = await abrirAba('Bento');
const caio = await abrirAba('Caio');
const todas = [ana, bento, caio];
let codigo = '';

teste('a sala real comeca com mini-placar nas tres abas', async () => {
  const criou = ana.rede.esperar('sala');
  ana.rede.mj.criar();
  codigo = (await criou).codigo;

  for (const aba of [bento, caio]) {
    const entrou = aba.rede.esperar('sala');
    aba.rede.mj.entrar(codigo);
    await entrou;
  }

  await esperar(() => ana.rede.salaAgora()?.jogadores.length === 3,
    'a anfitria nao viu os tres jogadores');

  for (const aba of todas) {
    const mudou = aba.rede.esperar('sala');
    aba.rede.mj.pronto(true);
    await mudou;
  }

  const inicios = todas.map((aba) => aba.rede.esperar('inicio'));
  ana.rede.mj.comecar();
  await Promise.all(inicios);
  for (const aba of todas) aba.dom.avancarQuadros(1);

  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} caiu no jogo`);
    assert.equal(aba.dom.escondido('hud-placar'), false, 'o mini-placar apareceu');
    assert.equal(aba.dom.texto('hud-sala-codigo'), codigo);
  }
});

teste('o ranking final confirmado pela Central real chega igual para todos', async () => {
  jogador(ana, 'Ana').pontos = 40;
  jogador(ana, 'Bento').pontos = 160;
  jogador(ana, 'Caio').pontos = 160;

  encerrarPorVidas(ana);

  await esperar(() => todas.every((aba) => aba.jogo.tela === 'fim'
    && aba.dom.texto('fim-subtitulo') === 'Ranking confirmado pela Central.'),
    'o ranking confirmado nao chegou nas tres abas');

  const ranking = valor(ana.jogo.rankingSala);
  assert.deepEqual(ranking.map((l) => [l.posicao, l.apelido, l.pontos]),
    [[1, 'Bento', 160], [1, 'Caio', 160], [3, 'Ana', 40]]);

  for (const aba of todas) {
    assert.deepEqual(valor(aba.jogo.rankingSala), ranking,
      `${aba.apelido} recebeu o mesmo ranking`);
    assert.equal(aba.dom.escondido('fim-ranking'), false);
    assert.ok(aba.dom.elementos['fim-ranking'].filhos.some((l) => (
      l.textContent.indexOf('(você)') >= 0 && l.textContent.indexOf(aba.apelido) >= 0
    )), `${aba.apelido} marcou a propria linha`);
  }
});

await fim('Fase 13 (tela)');
