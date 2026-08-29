/* ==========================================================================
   A Plataforma: o que todo jogo ganha de graca ao seguir o padrao.
   --------------------------------------------------------------------------
   Hoje: multijogador (salas + repasse de mensagens).
   Contratado, ainda sem servidor: ranking central, privacidade, faixa etaria
   - o manifesto ja e validado, entao os jogos podem declarar desde ja.

   Liga tres coisas no servidor:
     GET  /api/plataforma                 - o que a plataforma sabe fazer
     GET  /api/plataforma/salas?jogo=...  - salas abertas na rede local
     WS   /plataforma/ws                  - o canal das salas
   ========================================================================== */
import path from 'node:path';
import { config } from '../config.js';
import { lerJogo } from '../catalogo.js';
import { VERSAO_PLATAFORMA, MAX_JOGADORES_ABSOLUTO } from './manifesto.js';
import { aceitarUpgrade } from './websocket.js';
import {
  criarSala, acharSala, entrarNaSala, sairDaSala, marcarPronto,
  iniciarPartida, terminarPartida, repassar, listarSalas, estatisticas,
  ErroDeSala,
} from './salas.js';

const CAMINHO_WS = '/plataforma/ws';

/** O que esta de pe hoje. Os jogos consultam isso e se adaptam. */
export const capacidades = {
  multijogador: { disponivel: true, maxJogadores: MAX_JOGADORES_ABSOLUTO, caminho: CAMINHO_WS },
  ranking:      { disponivel: false, motivo: 'Por enquanto o ranking e local, no navegador.' },
  privacidade:  { disponivel: false, motivo: 'Contrato definido; painel de politicas ainda nao.' },
  classificacao:{ disponivel: false, motivo: 'Contrato definido; portao de idade ainda nao.' },
};

// ------------------------------------------------------------ HTTP / REST --
export function montarRotas(app) {
  app.get('/api/plataforma', (_req, res) => {
    res.json({ versao: VERSAO_PLATAFORMA, capacidades, ...estatisticas() });
  });

  app.get('/api/plataforma/salas', (req, res) => {
    const jogo = typeof req.query.jogo === 'string' ? req.query.jogo : '';
    res.json({ salas: listarSalas(jogo) });
  });

  // O SDK que os jogos carregam: /plataforma/sdk.js
  app.use('/plataforma', (req, res, next) => {
    if (req.path !== '/sdk.js') return next();
    res.sendFile(path.join(config.pastaPublica, 'plataforma', 'sdk.js'));
  });
}

// ------------------------------------------------------- WebSocket / salas --

/** Liga o canal das salas no servidor HTTP ja criado pelo app.listen(). */
export function montarWebSocket(servidor) {
  servidor.on('upgrade', (req, socket, cabeca) => {
    const url = new URL(req.url, 'http://interno');
    if (url.pathname !== CAMINHO_WS) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }
    const conexao = aceitarUpgrade(req, socket, cabeca);
    if (conexao) atender(conexao);
  });
}

function atender(conexao) {
  conexao.enviarJson({ t: 'ola', versao: VERSAO_PLATAFORMA });

  conexao.on('mensagem', (msg) => {
    tratar(conexao, msg).catch((erro) => {
      const conhecido = erro instanceof ErroDeSala;
      if (!conhecido) console.error('[plataforma] erro inesperado:', erro);
      conexao.enviarJson({
        t: 'erro',
        msg: conhecido ? erro.message : 'Deu algum problema aqui no servidor.',
        sobre: msg?.t || null,
      });
    });
  });

  conexao.on('fim', () => { sairDaSala(conexao, 'desconectou'); });
}

/** Carrega o bloco multijogador do jogo, ja validado pelo catalogo. */
async function manifestoMultijogador(slug) {
  const jogo = await lerJogo(slug);
  if (!jogo) throw new ErroDeSala('Esse jogo nao existe.');
  const mj = jogo.plataforma?.multijogador;
  if (!mj) throw new ErroDeSala('Esse jogo nao declarou multijogador no jogo.json.');
  return mj;
}

async function tratar(conexao, msg) {
  switch (msg.t) {
    case 'ping':
      return conexao.enviarJson({ t: 'pong' });

    case 'criar': {
      const manifesto = await manifestoMultijogador(msg.jogo);
      const sala = criarSala({
        conexao, jogo: msg.jogo, manifesto, apelido: msg.apelido, opcoes: msg.opcoes,
      });
      console.log(`[plataforma] sala ${sala.codigo} criada em "${sala.jogo}"`);
      return;
    }

    case 'entrar': {
      const sala = acharSala(msg.codigo);
      if (!sala) throw new ErroDeSala('Nao achei nenhuma sala com esse codigo.');
      // Confere o manifesto de novo: o jogo.json pode ter mudado no disco.
      await manifestoMultijogador(sala.jogo);
      entrarNaSala({ conexao, sala, apelido: msg.apelido });
      return;
    }

    case 'sair':
      sairDaSala(conexao, 'saiu');
      return conexao.enviarJson({ t: 'sai' });

    case 'pronto':
      marcarPronto(conexao, msg.valor);
      return;

    case 'iniciar':
      iniciarPartida(conexao);
      return;

    case 'fim':
      terminarPartida(conexao, msg.placar);
      return;

    case 'msg':
      repassar(conexao, { para: msg.para, d: msg.d });
      return;

    default:
      throw new ErroDeSala('Nao entendi esse pedido: ' + String(msg.t).slice(0, 20));
  }
}
