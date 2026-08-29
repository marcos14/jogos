/* ==========================================================================
   Salas multijogador.
   --------------------------------------------------------------------------
   O servidor NAO sabe jogar nenhum jogo. Ele cuida de:
     - juntar gente numa sala (codigo de 4 letras ou lista de salas abertas),
     - dizer quem e o anfitriao (o cliente que roda a simulacao de verdade),
     - repassar mensagens entre os jogadores da sala,
     - fechar a sala quando esvazia.
   Assim a regra de cada jogo fica no jogo, e a plataforma serve a todos.
   ========================================================================== */
import crypto from 'node:crypto';

// Sem O/0/I/1 - as criancas digitam esse codigo olhando para a tela do amigo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 4;

const CORES = ['#ff8fb8', '#7bc4ff', '#ffd166', '#8ce99a', '#c9a7ff', '#ffa07a', '#5fd6c8', '#ff9f6e'];

const SALA_PARADA_MS = 20 * 60_000;   // sala sem novidade nenhuma some
const LIMPEZA_MS = 60_000;

const salas = new Map();              // codigo -> Sala

function novoCodigo() {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
      codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
    }
    if (!salas.has(codigo)) return codigo;
  }
  return null;
}

const apelidoLimpo = (valor) =>
  String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, 14) || 'Jogador';

export class ErroDeSala extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeSala'; }
}

class Sala {
  constructor({ codigo, jogo, manifesto, opcoes }) {
    this.codigo = codigo;
    this.jogo = jogo;                        // slug
    this.manifesto = manifesto;              // bloco multijogador ja validado
    this.max = Math.min(manifesto.max, Number(opcoes?.max) || manifesto.max);
    this.publica = manifesto.listarSalas && opcoes?.publica !== false;
    this.jogadores = [];                     // [{ id, apelido, cor, pronto, conexao }]
    this.anfitriao = null;                   // id do anfitriao
    this.estado = 'lobby';                   // lobby | jogando
    this.semente = 0;
    this.criadaEm = Date.now();
    this.mexidaEm = Date.now();
    this.placar = null;
  }

  get cheia() { return this.jogadores.length >= this.max; }

  jogador(id) { return this.jogadores.find((j) => j.id === id) || null; }

  /** O que os clientes veem da sala (sem conexoes nem lixo interno). */
  paraCliente() {
    return {
      codigo: this.codigo,
      jogo: this.jogo,
      estado: this.estado,
      max: this.max,
      min: this.manifesto.min,
      modo: this.manifesto.modo,
      taxaEstado: this.manifesto.taxaEstado,
      publica: this.publica,
      anfitriao: this.anfitriao,
      jogadores: this.jogadores.map((j, i) => ({
        id: j.id, apelido: j.apelido, cor: j.cor, indice: i,
        pronto: j.pronto, anfitriao: j.id === this.anfitriao,
      })),
    };
  }

  /** Resumo publico para a lista de salas abertas. */
  paraLista() {
    return {
      codigo: this.codigo,
      jogo: this.jogo,
      estado: this.estado,
      jogadores: this.jogadores.length,
      max: this.max,
      anfitriao: this.jogador(this.anfitriao)?.apelido || '',
      criadaEm: new Date(this.criadaEm).toISOString(),
    };
  }

  avisar(mensagem, exceto = null) {
    for (const j of this.jogadores) {
      if (j.id !== exceto) j.conexao.enviarJson(mensagem);
    }
  }

  avisarSala() { this.avisar({ t: 'sala', sala: this.paraCliente() }); }
}

// ------------------------------------------------------------------ acoes --

export function criarSala({ conexao, jogo, manifesto, apelido, opcoes }) {
  const codigo = novoCodigo();
  if (!codigo) throw new ErroDeSala('Tem sala demais aberta agora. Tente daqui a pouco.');

  const sala = new Sala({ codigo, jogo, manifesto, opcoes });
  salas.set(codigo, sala);
  entrarNaSala({ conexao, sala, apelido });
  return sala;
}

export function acharSala(codigo) {
  return salas.get(String(codigo ?? '').toUpperCase().trim()) || null;
}

export function entrarNaSala({ conexao, sala, apelido }) {
  if (sala.estado !== 'lobby') throw new ErroDeSala('Essa partida ja comecou.');
  if (sala.cheia) throw new ErroDeSala('A sala ja esta cheia (' + sala.max + ' jogadores).');
  if (conexao.dados.sala) sairDaSala(conexao);

  const usados = new Set(sala.jogadores.map((j) => j.cor));
  const jogador = {
    id: crypto.randomBytes(6).toString('hex'),
    apelido: apelidoUnico(sala, apelidoLimpo(apelido)),
    cor: CORES.find((c) => !usados.has(c)) || CORES[sala.jogadores.length % CORES.length],
    pronto: false,
    conexao,
  };

  sala.jogadores.push(jogador);
  if (!sala.anfitriao) sala.anfitriao = jogador.id;
  sala.mexidaEm = Date.now();

  conexao.dados.sala = sala.codigo;
  conexao.dados.jogadorId = jogador.id;

  conexao.enviarJson({ t: 'entrei', eu: jogador.id, sala: sala.paraCliente() });
  sala.avisar({ t: 'sala', sala: sala.paraCliente() }, jogador.id);
  return jogador;
}

/** Dois "Ana" na mesma sala viram "Ana" e "Ana 2". */
function apelidoUnico(sala, apelido) {
  const existe = (nome) => sala.jogadores.some((j) => j.apelido.toLowerCase() === nome.toLowerCase());
  if (!existe(apelido)) return apelido;
  for (let n = 2; n <= 9; n++) {
    const tentativa = (apelido + ' ' + n).slice(0, 16);
    if (!existe(tentativa)) return tentativa;
  }
  return (apelido + '*').slice(0, 16);
}

export function sairDaSala(conexao, motivo = 'saiu') {
  const sala = salas.get(conexao.dados.sala);
  if (!sala) return null;

  const id = conexao.dados.jogadorId;
  const indice = sala.jogadores.findIndex((j) => j.id === id);
  conexao.dados.sala = null;
  conexao.dados.jogadorId = null;
  if (indice < 0) return sala;

  const [saiu] = sala.jogadores.splice(indice, 1);
  sala.mexidaEm = Date.now();

  if (!sala.jogadores.length) {
    salas.delete(sala.codigo);
    return sala;
  }

  sala.avisar({ t: 'saiu', jogador: { id: saiu.id, apelido: saiu.apelido }, motivo });

  // Anfitriao caiu: no lobby o proximo assume; no meio da partida a partida
  // acaba, porque era a maquina dele que estava simulando o mundo.
  if (sala.anfitriao === id) {
    sala.anfitriao = sala.jogadores[0].id;
    if (sala.estado === 'jogando') {
      sala.estado = 'lobby';
      sala.jogadores.forEach((j) => { j.pronto = false; });
      sala.avisar({ t: 'abortou', motivo: 'O anfitriao saiu - a partida foi encerrada.' });
    } else {
      sala.avisar({ t: 'anfitriao', id: sala.anfitriao });
    }
  }

  sala.avisarSala();
  return sala;
}

export function marcarPronto(conexao, valor) {
  const sala = salas.get(conexao.dados.sala);
  if (!sala) throw new ErroDeSala('Voce nao esta numa sala.');
  const jogador = sala.jogador(conexao.dados.jogadorId);
  if (!jogador) throw new ErroDeSala('Voce nao esta numa sala.');
  jogador.pronto = Boolean(valor);
  sala.mexidaEm = Date.now();
  sala.avisarSala();
  return sala;
}

export function iniciarPartida(conexao) {
  const sala = salas.get(conexao.dados.sala);
  if (!sala) throw new ErroDeSala('Voce nao esta numa sala.');
  if (sala.anfitriao !== conexao.dados.jogadorId) throw new ErroDeSala('So o anfitriao comeca a partida.');
  if (sala.estado === 'jogando') throw new ErroDeSala('A partida ja esta rolando.');
  if (sala.jogadores.length < sala.manifesto.min) {
    throw new ErroDeSala('Precisa de pelo menos ' + sala.manifesto.min + ' jogadores.');
  }

  sala.estado = 'jogando';
  sala.placar = null;
  sala.semente = crypto.randomInt(1, 2147483647);
  sala.mexidaEm = Date.now();
  sala.avisar({ t: 'inicio', semente: sala.semente, sala: sala.paraCliente() });
  return sala;
}

export function terminarPartida(conexao, placar) {
  const sala = salas.get(conexao.dados.sala);
  if (!sala) throw new ErroDeSala('Voce nao esta numa sala.');
  if (sala.anfitriao !== conexao.dados.jogadorId) throw new ErroDeSala('So o anfitriao encerra a partida.');

  sala.estado = 'lobby';
  sala.placar = Array.isArray(placar) ? placar.slice(0, 16) : null;
  sala.jogadores.forEach((j) => { j.pronto = false; });
  sala.mexidaEm = Date.now();
  sala.avisar({ t: 'fim', placar: sala.placar, sala: sala.paraCliente() });
  return sala;
}

/**
 * Repasse de mensagem do jogo. O servidor nao olha o conteudo de `d`:
 * quem entende disso e o jogo, dos dois lados.
 *   para: 'todos' | 'outros' | 'anfitriao' | '<id de jogador>'
 */
export function repassar(conexao, { para = 'outros', d }) {
  const sala = salas.get(conexao.dados.sala);
  if (!sala) throw new ErroDeSala('Voce nao esta numa sala.');
  const de = conexao.dados.jogadorId;
  if (!sala.jogador(de)) throw new ErroDeSala('Voce nao esta numa sala.');

  sala.mexidaEm = Date.now();
  const pacote = { t: 'msg', de, d };

  if (para === 'todos') return sala.avisar(pacote);
  if (para === 'outros') return sala.avisar(pacote, de);
  if (para === 'anfitriao') return sala.jogador(sala.anfitriao)?.conexao.enviarJson(pacote);
  return sala.jogador(para)?.conexao.enviarJson(pacote);
}

export function listarSalas(jogo) {
  const lista = [];
  for (const sala of salas.values()) {
    if (jogo && sala.jogo !== jogo) continue;
    if (!sala.publica || sala.estado !== 'lobby' || sala.cheia) continue;
    lista.push(sala.paraLista());
  }
  return lista.sort((a, b) => b.jogadores - a.jogadores);
}

export function estatisticas() {
  let jogadores = 0;
  for (const sala of salas.values()) jogadores += sala.jogadores.length;
  return { salas: salas.size, jogadores };
}

/** Varre salas paradas de tempos em tempos. */
const faxina = setInterval(() => {
  const agora = Date.now();
  for (const [codigo, sala] of salas) {
    if (!sala.jogadores.length || agora - sala.mexidaEm > SALA_PARADA_MS) {
      sala.avisar({ t: 'erro', msg: 'A sala foi fechada por inatividade.' });
      sala.jogadores.forEach((j) => { j.conexao.dados.sala = null; });
      salas.delete(codigo);
    }
  }
}, LIMPEZA_MS);
faxina.unref?.();
