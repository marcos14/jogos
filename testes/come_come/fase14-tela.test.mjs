/* ==========================================================================
   Come-Come - Fase 14 (tela): queda do anfitriao com a Central real
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase14-tela.test.mjs

   Sobe o servidor de salas de verdade e fecha o canal da anfitria no meio da
   partida. Os convidados precisam voltar ao menu com o aviso e seguir
   jogaveis sem recarregar a pagina.
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

console.log('Come-Come - fase 14 (tela)\n');

const ana = await abrirAba('Ana');
const bento = await abrirAba('Bento');
const caio = await abrirAba('Caio');
const todas = [ana, bento, caio];
let codigo = '';

teste('a sala real comeca com tres abas', async () => {
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
  for (const aba of todas) aba.dom.avancarQuadros(2);

  for (const aba of todas) {
    assert.equal(aba.jogo.tela, 'jogando', `${aba.apelido} entrou no jogo`);
    assert.equal(aba.dom.texto('hud-sala-codigo'), codigo);
  }
});

teste('fechar o canal da anfitria devolve os convidados ao menu, jogaveis', async () => {
  const abortouBento = bento.rede.esperar('abortou');
  const abortouCaio = caio.rede.esperar('abortou');
  ana.rede.fechar();
  const avisos = await Promise.all([abortouBento, abortouCaio]);

  assert.ok(avisos.every((a) => a.motivo), 'a Central explicou o motivo');
  await esperar(() => bento.jogo.tela === 'menu' && caio.jogo.tela === 'menu',
    'os convidados nao voltaram ao menu');

  for (const aba of [bento, caio]) {
    assert.equal(aba.dom.api.rede.sala, null);
    assert.equal(aba.dom.api.rede.papel, 'solo');
    assert.equal(aba.dom.escondido('hud'), true);
    assert.equal(aba.dom.escondido('tela-menu'), false);
    assert.equal(aba.dom.escondido('aviso'), false);
    assert.ok(aba.dom.texto('aviso').length > 0, `${aba.apelido} viu o recado`);

    aba.dom.comecarPartida(aba.apelido);
    const antes = aba.jogo.relogio;
    aba.dom.avancarQuadros(20);
    assert.equal(aba.jogo.tela, 'jogando');
    assert.ok(aba.jogo.relogio > antes, `${aba.apelido} conseguiu jogar sozinho`);
    assert.equal(aba.dom.escondido('aviso'), true);
  }
});

await fim('Fase 14 (tela)');
