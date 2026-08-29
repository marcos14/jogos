/* ==========================================================================
   WebSocket minimo (RFC 6455) - sem dependencias externas.
   --------------------------------------------------------------------------
   So o que a plataforma precisa: handshake, frames de texto, ping/pong e
   close. Frames binarios sao recusados. Mensagens muito grandes ou rapidas
   demais derrubam a conexao (freio contra cliente maluco).
   ========================================================================== */
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MAX_MENSAGEM = 64 * 1024;      // 64 KB por mensagem
const MAX_POR_SEGUNDO = 90;          // mensagens/s por conexao
const PING_MS = 25_000;
const SEM_RESPOSTA_MS = 60_000;

/** Responde o handshake e devolve uma Conexao, ou null se o pedido nao presta. */
export function aceitarUpgrade(req, socket) {
  const chave = req.headers['sec-websocket-key'];
  const versao = Number(req.headers['sec-websocket-version']);
  const upgrade = String(req.headers.upgrade || '').toLowerCase();

  if (upgrade !== 'websocket' || !chave || versao !== 13) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return null;
  }

  const aceite = crypto.createHash('sha1').update(chave + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${aceite}\r\n\r\n`
  );
  socket.setNoDelay(true);
  return new Conexao(socket, req);
}

export class Conexao extends EventEmitter {
  constructor(socket, req) {
    super();
    this.socket = socket;
    this.ip = req.socket.remoteAddress || 'desconhecido';
    this.aberta = true;
    this.dados = {};                  // espaco livre para quem usa (sala, jogador...)

    this._buffer = Buffer.alloc(0);
    this._pedacos = [];               // fragmentos de uma mensagem em partes
    this._opFragmento = 0;
    this._janela = { inicio: Date.now(), contagem: 0 };
    this._ultimaResposta = Date.now();

    // O socket vem do 'upgrade' do servidor HTTP, que trabalha em half-open:
    // quando a aba fecha chega um FIN e so o 'end' aparece - sem o listener
    // abaixo o jogador ficaria de fantasma na sala ate o ping estourar.
    socket.setTimeout(0);
    socket.on('data', (parte) => this._receber(parte));
    socket.on('end', () => this._encerrar('desconectou'));
    socket.on('error', () => this._encerrar('erro de rede'));
    socket.on('close', () => this._encerrar('desconectou'));

    this._batida = setInterval(() => {
      if (!this.aberta) return;
      if (Date.now() - this._ultimaResposta > SEM_RESPOSTA_MS) return this.fechar(1001, 'sem resposta');
      this._enviarFrame(0x9, Buffer.alloc(0));
    }, PING_MS);
    this._batida.unref?.();
  }

  /** Envia um objeto como JSON. */
  enviarJson(objeto) {
    if (!this.aberta) return false;
    let texto;
    try { texto = JSON.stringify(objeto); } catch { return false; }
    return this.enviar(texto);
  }

  enviar(texto) {
    if (!this.aberta) return false;
    return this._enviarFrame(0x1, Buffer.from(texto, 'utf8'));
  }

  fechar(codigo = 1000, motivo = '') {
    if (!this.aberta) return;
    const corpo = Buffer.alloc(2 + Buffer.byteLength(motivo));
    corpo.writeUInt16BE(codigo, 0);
    corpo.write(motivo, 2);
    this._enviarFrame(0x8, corpo);
    this._encerrar(motivo || 'fechada');
    this.socket.end();
  }

  // ------------------------------------------------------------- internos --
  _encerrar(motivo) {
    if (!this.aberta) return;
    this.aberta = false;
    clearInterval(this._batida);
    this.emit('fim', motivo);
    this.removeAllListeners();
    try { this.socket.destroy(); } catch { /* ja foi */ }
  }

  _enviarFrame(opcode, carga) {
    const tamanho = carga.length;
    let cabecalho;
    if (tamanho < 126) {
      cabecalho = Buffer.alloc(2);
      cabecalho[1] = tamanho;
    } else if (tamanho < 65536) {
      cabecalho = Buffer.alloc(4);
      cabecalho[1] = 126;
      cabecalho.writeUInt16BE(tamanho, 2);
    } else {
      cabecalho = Buffer.alloc(10);
      cabecalho[1] = 127;
      cabecalho.writeBigUInt64BE(BigInt(tamanho), 2);
    }
    cabecalho[0] = 0x80 | opcode;      // FIN + opcode, sem mascara (servidor)
    try {
      this.socket.write(Buffer.concat([cabecalho, carga]));
      return true;
    } catch {
      this._encerrar('falha ao escrever');
      return false;
    }
  }

  _receber(parte) {
    if (!this.aberta) return;
    this._buffer = this._buffer.length ? Buffer.concat([this._buffer, parte]) : parte;
    if (this._buffer.length > MAX_MENSAGEM * 2) return this.fechar(1009, 'mensagem grande demais');

    while (this.aberta) {
      const frame = this._lerFrame();
      if (!frame) break;
      this._tratarFrame(frame);
    }
  }

  /** Tira um frame do buffer. Devolve null enquanto faltar byte. */
  _lerFrame() {
    const b = this._buffer;
    if (b.length < 2) return null;

    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const mascarado = (b[1] & 0x80) !== 0;
    let tamanho = b[1] & 0x7f;
    let i = 2;

    if (tamanho === 126) {
      if (b.length < i + 2) return null;
      tamanho = b.readUInt16BE(i); i += 2;
    } else if (tamanho === 127) {
      if (b.length < i + 8) return null;
      const grande = b.readBigUInt64BE(i); i += 8;
      if (grande > BigInt(MAX_MENSAGEM)) { this.fechar(1009, 'mensagem grande demais'); return null; }
      tamanho = Number(grande);
    }

    if (tamanho > MAX_MENSAGEM) { this.fechar(1009, 'mensagem grande demais'); return null; }
    if (!mascarado) { this.fechar(1002, 'frame sem mascara'); return null; }
    if (b.length < i + 4 + tamanho) return null;

    const mascara = b.subarray(i, i + 4); i += 4;
    const carga = Buffer.allocUnsafe(tamanho);
    for (let j = 0; j < tamanho; j++) carga[j] = b[i + j] ^ mascara[j & 3];

    this._buffer = b.subarray(i + tamanho);
    return { fin, opcode, carga };
  }

  _tratarFrame({ fin, opcode, carga }) {
    switch (opcode) {
      case 0x8: return this.fechar(1000, 'tchau');
      case 0x9: this._ultimaResposta = Date.now(); return this._enviarFrame(0xA, carga);
      case 0xA: this._ultimaResposta = Date.now(); return;
      case 0x2: return this.fechar(1003, 'so aceito texto');
      case 0x0:
      case 0x1: break;
      default: return this.fechar(1002, 'opcode desconhecido');
    }

    if (opcode === 0x1 && this._pedacos.length) return this.fechar(1002, 'fragmento fora de ordem');
    if (opcode === 0x0 && !this._pedacos.length) return this.fechar(1002, 'continuacao sem inicio');

    this._pedacos.push(carga);
    const total = this._pedacos.reduce((s, p) => s + p.length, 0);
    if (total > MAX_MENSAGEM) return this.fechar(1009, 'mensagem grande demais');
    if (!fin) return;

    const texto = Buffer.concat(this._pedacos).toString('utf8');
    this._pedacos = [];
    this._ultimaResposta = Date.now();

    if (!this._passaNoFreio()) return this.fechar(1008, 'mensagens rapido demais');

    let objeto;
    try { objeto = JSON.parse(texto); } catch { return this.fechar(1003, 'json invalido'); }
    if (!objeto || typeof objeto !== 'object') return this.fechar(1003, 'json invalido');
    this.emit('mensagem', objeto);
  }

  _passaNoFreio() {
    const agora = Date.now();
    if (agora - this._janela.inicio >= 1000) this._janela = { inicio: agora, contagem: 0 };
    return ++this._janela.contagem <= MAX_POR_SEGUNDO;
  }
}
