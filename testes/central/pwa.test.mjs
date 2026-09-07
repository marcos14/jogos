/* ==========================================================================
   Teste da Central como app (PWA)
   --------------------------------------------------------------------------
   Duas metades:

   1. O service worker (server/public/sw.js) carregado num `vm` com um
      navegador de mentira - `self`, `caches`, `fetch`, `Request` - para
      exercitar a regra "rede primeiro, cache depois" sem navegador nenhum:
      o que passa direto (admin, login, plataforma), o que e guardado, o que
      vem do cache quando a rede cai ou demora, e a pagina de "sem conexao".

   2. O servidor DE VERDADE (server/src/server.js) numa porta sorteada, para
      conferir o que um celular precisa para instalar a Central: o manifesto
      (nome, icones 192/512, any e maskable, atalhos dos jogos), os PNG com o
      tamanho prometido, o sw.js sem cache HTTP, a casca inteira respondendo
      200 (senao a instalacao do worker falharia), as paginas apontando para
      o manifesto - e, se houver `openssl` na maquina, a segunda porta em
      https com o WebSocket das salas respondendo ao upgrade por ela.

   Rodar:  node testes/central/pwa.test.mjs
   ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const SERVIDOR = path.join(RAIZ, 'server');

// ------------------------------------------------------------ corredor ----
let falhas = 0;
let total = 0;

async function teste(nome, fn) {
  total++;
  try {
    await fn();
    console.log(`  ok   ${nome}`);
  } catch (erro) {
    falhas++;
    console.log(`  FALHA ${nome}\n        ${erro.message}`);
  }
}

function confere(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

function igual(a, b, mensagem) {
  if (a !== b) throw new Error(`${mensagem}: esperava ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const nunca = () => new Promise(() => {});

// ========================================================================
// 1. O service worker num navegador de mentira
// ========================================================================

const ORIGEM = 'https://central.teste';

/** Carrega o sw.js num vm e devolve os ouvintes registrados + o mundo falso. */
function carregarWorker({ tempoLimite = 50 } = {}) {
  let codigo = fs.readFileSync(path.join(SERVIDOR, 'public', 'sw.js'), 'utf8');
  // O tempo limite de verdade e de segundos; no teste, milissegundos.
  codigo = codigo.replace(/const TEMPO_LIMITE_MS = \d+;/, `const TEMPO_LIMITE_MS = ${tempoLimite};`);
  // Expoe as constantes internas para o teste conferir.
  codigo += '\nself.__casca = CASCA; self.__semCache = SEM_CACHE; self.__caches = [CACHE_CASCA, CACHE_JOGOS];';

  const ouvintes = {};
  const guardado = new Map();      // nome do cache -> Map(caminho -> resposta)
  const registro = { puts: [], deletes: [], addAll: null, skipWaiting: 0, claim: 0 };

  const abrirCache = (nome) => {
    if (!guardado.has(nome)) guardado.set(nome, new Map());
    const mapa = guardado.get(nome);
    return {
      async match(pedido, opcoes = {}) {
        const url = new URL(typeof pedido === 'string' ? pedido : pedido.url, ORIGEM);
        const chave = opcoes.ignoreSearch ? url.pathname : url.pathname + url.search;
        return mapa.get(chave);
      },
      async put(pedido, resposta) {
        const url = new URL(pedido.url);
        mapa.set(url.pathname + url.search, resposta);
        registro.puts.push({ cache: nome, url: url.pathname + url.search });
      },
      async addAll(pedidos) {
        registro.addAll = pedidos.map((p) => new URL(p.url).pathname);
        registro.addAllSemCacheHttp = pedidos.every((p) => p.cache === 'reload');
      },
    };
  };

  const self = {
    location: { origin: ORIGEM },
    navigator: { onLine: true },
    addEventListener(tipo, fn) { ouvintes[tipo] = fn; },
    skipWaiting() { registro.skipWaiting++; return Promise.resolve(); },
    clients: { claim() { registro.claim++; return Promise.resolve(); } },
  };

  const caches = {
    async open(nome) { return abrirCache(nome); },
    async match(pedido, opcoes) {
      for (const nome of guardado.keys()) {
        const achou = await abrirCache(nome).match(pedido, opcoes);
        if (achou) return achou;
      }
      return undefined;
    },
    async keys() { return [...guardado.keys()]; },
    async delete(nome) { registro.deletes.push(nome); return guardado.delete(nome); },
  };

  // O Request do navegador resolve '/estilo.css' contra a origem do worker;
  // o do Node exige URL absoluta. Este so guarda o que o teste confere.
  class RequestFalso {
    constructor(url, init = {}) {
      this.url = new URL(url, ORIGEM).href;
      this.cache = init.cache;
      this.method = 'GET';
    }
  }

  const contexto = vm.createContext({
    self, caches, URL, Request: RequestFalso, setTimeout, console,
    fetch: () => Promise.reject(new Error('fetch nao configurado')),
  });
  vm.runInContext(codigo, contexto, { filename: 'server/public/sw.js' });

  // Poe uma resposta direto no cache, como se ja tivesse sido guardada antes.
  const preencher = (nome, caminho, resposta) => {
    if (!guardado.has(nome)) guardado.set(nome, new Map());
    guardado.get(nome).set(caminho, resposta);
  };

  return { ouvintes, self, contexto, registro, guardado, preencher };
}

/** Um pedido de mentira, com so o que o worker olha. */
function pedido(caminho, { modo = 'no-cors', metodo = 'GET', cabecalhos = {}, origem = ORIGEM } = {}) {
  return { method: metodo, url: origem + caminho, mode: modo, headers: new Headers(cabecalhos) };
}

/** Uma resposta de mentira: o worker so olha ok/status/redirected/type e clona. */
function resposta(nome, extra = {}) {
  const r = { nome, ok: true, status: 200, redirected: false, type: 'basic', ...extra };
  r.clone = () => ({ ...r });
  return r;
}

/** Dispara o 'fetch' do worker e devolve a promessa passada ao respondWith (ou null). */
function despachar(w, p) {
  let prometido = null;
  w.ouvintes.fetch({ request: p, respondWith(x) { prometido = x; } });
  // Quem chama decide se espera ou nao; isto so impede que uma rejeicao
  // ignorada (no teste dos caminhos que passam direto) derrube o processo.
  if (prometido) prometido.catch(() => {});
  return prometido;
}

console.log('\nService worker num navegador de mentira');

await teste('a casca e os caminhos sem cache estao declarados', () => {
  const w = carregarWorker();
  for (const c of ['/', '/offline.html', '/jogar.html', '/plataforma/sdk.js', '/manifest.webmanifest',
    '/icones/icone-192.png', '/icones/icone-512.png', '/icones/icone-maskable-512.png', '/icones/apple-touch-icon.png']) {
    confere(w.self.__casca.includes(c), `${c} esta na casca`);
  }
  const bate = (caminho) => w.self.__semCache.some((re) => re.test(caminho));
  for (const c of ['/admin', '/admin.html', '/admin.js', '/api/admin/jogos', '/api/admin/upload', '/api/login',
    '/api/logout', '/api/sessao', '/api/plataforma', '/api/plataforma/salas', '/plataforma/ws', '/sw.js']) {
    confere(bate(c), `${c} passa direto`);
  }
  for (const c of ['/', '/estilo.css', '/api/jogos', '/api/jogos/come_come', '/api/config', '/jogar/come_come',
    '/jogos/come_come/game.js', '/plataforma/sdk.js', '/administracao']) {
    confere(!bate(c), `${c} passa pelo worker`);
  }
});

await teste('install guarda a casca sem o cache HTTP e pula a espera', async () => {
  const w = carregarWorker();
  let promessa;
  w.ouvintes.install({ waitUntil(p) { promessa = p; } });
  await promessa;
  igual(JSON.stringify(w.registro.addAll), JSON.stringify(w.self.__casca), 'addAll recebeu a casca inteira');
  confere(w.registro.addAllSemCacheHttp, 'cada pedido pulou o cache HTTP (cache: reload)');
  igual(w.registro.skipWaiting, 1, 'skipWaiting foi chamado');
});

await teste('activate apaga so as cascas antigas e assume as abas', async () => {
  const w = carregarWorker();
  const [casca] = w.self.__caches;
  w.preencher('casca-v0', '/', resposta('velha'));
  w.preencher(casca, '/', resposta('atual'));
  w.preencher('jogos', '/jogos/x/game.js', resposta('jogo'));
  w.preencher('outra-coisa', '/x', resposta('x'));
  let promessa;
  w.ouvintes.activate({ waitUntil(p) { promessa = p; } });
  await promessa;
  igual(w.registro.deletes.sort().join(','), 'casca-v0,outra-coisa', 'apagou so o que nao e desta versao');
  confere(w.guardado.has('jogos'), 'os jogos guardados ficam');
  igual(w.registro.claim, 1, 'clients.claim foi chamado');
});

await teste('o que passa direto: admin, login, plataforma, POST, outra origem, range', () => {
  const w = carregarWorker();
  igual(despachar(w, pedido('/admin', { modo: 'navigate' })), null, '/admin');
  igual(despachar(w, pedido('/api/admin/jogos')), null, '/api/admin/jogos');
  igual(despachar(w, pedido('/api/login', { metodo: 'POST' })), null, 'POST');
  igual(despachar(w, pedido('/api/plataforma/salas?jogo=come_come')), null, 'salas');
  igual(despachar(w, pedido('/plataforma/ws')), null, 'websocket');
  igual(despachar(w, pedido('/lib.js', { origem: 'https://cdn.exemplo' })), null, 'outra origem');
  igual(despachar(w, pedido('/jogos/x/musica.mp3', { cabecalhos: { Range: 'bytes=0-100' } })), null, 'range');
  confere(despachar(w, pedido('/', { modo: 'navigate' })) !== null, 'a raiz passa pelo worker');
  confere(despachar(w, pedido('/jogos/come_come/game.js')) !== null, 'um jogo passa pelo worker');
});

await teste('com rede, a resposta vem do servidor e e guardada no cache certo', async () => {
  const w = carregarWorker();
  const [casca, jogos] = w.self.__caches;
  w.contexto.fetch = async (p) => resposta('rede:' + new URL(p.url).pathname);

  const r1 = await despachar(w, pedido('/estilo.css'));
  igual(r1.nome, 'rede:/estilo.css', 'veio da rede');
  const r2 = await despachar(w, pedido('/jogos/come_come/game.js'));
  igual(r2.nome, 'rede:/jogos/come_come/game.js', 'veio da rede');
  await espera(5);   // o put e assincrono, sem segurar a resposta
  igual(JSON.stringify(w.registro.puts), JSON.stringify([
    { cache: casca, url: '/estilo.css' },
    { cache: jogos, url: '/jogos/come_come/game.js' },
  ]), 'casca na casca, jogo nos jogos');
});

await teste('resposta redirecionada, parcial, com erro ou opaca nao entra no cache', async () => {
  const w = carregarWorker();
  const casos = [
    resposta('redir', { redirected: true }),
    resposta('parcial', { status: 206 }),
    resposta('erro', { ok: false, status: 404 }),
    resposta('opaca', { type: 'opaque' }),
  ];
  for (const caso of casos) {
    w.contexto.fetch = async () => caso;
    const r = await despachar(w, pedido('/jogar/sumiu', { modo: 'navigate' }));
    igual(r.nome, caso.nome, 'a resposta ainda e entregue');
  }
  await espera(5);
  igual(w.registro.puts.length, 0, 'nada foi guardado');
});

await teste('sem rede, vem o que estava guardado', async () => {
  const w = carregarWorker();
  w.preencher('jogos', '/jogos/come_come/game.js', resposta('guardado'));
  w.contexto.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await despachar(w, pedido('/jogos/come_come/game.js'));
  igual(r.nome, 'guardado', 'veio do cache');
});

await teste('servidor demorando mais que o limite: o cache responde na hora', async () => {
  const w = carregarWorker({ tempoLimite: 30 });
  w.preencher('casca-v1', '/estilo.css', resposta('guardado'));
  w.contexto.fetch = nunca;
  const inicio = Date.now();
  const r = await despachar(w, pedido('/estilo.css'));
  igual(r.nome, 'guardado', 'veio do cache');
  confere(Date.now() - inicio < 1000, 'nao esperou a rede');
});

await teste('navigator.onLine falso: nem tenta a rede se tem cache', async () => {
  const w = carregarWorker();
  w.self.navigator.onLine = false;
  w.preencher('casca-v1', '/', resposta('catalogo guardado'));
  let chamadas = 0;
  w.contexto.fetch = async () => { chamadas++; throw new TypeError('offline'); };
  const r = await despachar(w, pedido('/?origem=atalho', { modo: 'navigate' }));
  igual(r.nome, 'catalogo guardado', 'o catalogo veio do cache, ignorando o ?...');
  igual(chamadas, 0, 'a rede nao foi chamada');
});

await teste('sem rede e sem cache: pagina inteira cai no "sem conexao", arquivo avulso falha', async () => {
  const w = carregarWorker();
  w.preencher('casca-v1', '/offline.html', resposta('sem conexao'));
  w.contexto.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await despachar(w, pedido('/jogar/nunca_aberto', { modo: 'navigate' }));
  igual(r.nome, 'sem conexao', 'a navegacao ganha a pagina de sem conexao');
  let erro = null;
  try { await despachar(w, pedido('/jogos/nunca_aberto/game.js')); } catch (e) { erro = e; }
  confere(erro instanceof TypeError, 'o arquivo avulso falha como falharia sem o worker');
});

await teste('/jogar/<slug> sem rede cai na pagina de jogar guardada', async () => {
  const w = carregarWorker();
  w.preencher('casca-v1', '/jogar.html', resposta('pagina de jogar'));
  w.preencher('casca-v1', '/offline.html', resposta('sem conexao'));
  w.contexto.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await despachar(w, pedido('/jogar/come_come', { modo: 'navigate' }));
  igual(r.nome, 'pagina de jogar', 'usou o /jogar.html da casca');
});

await teste('servidor lento mas vivo, sem cache: a resposta e esperada ate o fim', async () => {
  const w = carregarWorker({ tempoLimite: 20 });
  w.contexto.fetch = () => espera(80).then(() => resposta('lenta'));
  const r = await despachar(w, pedido('/jogos/novo/game.js'));
  igual(r.nome, 'lenta', 'a rede lenta ainda foi entregue');
});

// ========================================================================
// 2. O servidor de verdade
// ========================================================================

function portaLivre() {
  return new Promise((resolver, rejeitar) => {
    const s = net.createServer();
    s.on('error', rejeitar);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolver(port));
    });
  });
}

/** GET simples que aceita o certificado de teste e devolve status, cabecalhos e corpo. */
function pegar(url, { upgrade = false } = {}) {
  return new Promise((resolver, rejeitar) => {
    const modulo = url.startsWith('https:') ? https : http;
    const opcoes = { rejectUnauthorized: false, headers: {} };
    if (upgrade) {
      opcoes.headers = {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': Buffer.from('0123456789abcdef').toString('base64'),
      };
    }
    const req = modulo.get(url, opcoes, (res) => {
      const pedacos = [];
      res.on('data', (p) => pedacos.push(p));
      res.on('end', () => resolver({ status: res.statusCode, cabecalhos: res.headers, corpo: Buffer.concat(pedacos) }));
    });
    req.on('upgrade', (res, socket) => {
      socket.once('data', (quadro) => {
        socket.destroy();
        resolver({ status: res.statusCode, cabecalhos: res.headers, quadro });
      });
    });
    req.on('error', rejeitar);
    req.setTimeout(5000, () => { req.destroy(new Error('tempo esgotado')); });
  });
}

/** Sobe o server/src/server.js com o ambiente dado e espera o /api/saude. */
async function subirServidor(ambiente = {}) {
  const porta = await portaLivre();
  const saida = [];
  const processo = spawn(process.execPath, ['src/server.js'], {
    cwd: SERVIDOR,
    env: {
      ...process.env,
      PORTA: String(porta),
      ADMIN_SENHA: 'teste',
      PASTA_JOGOS: path.join(RAIZ, 'jogos'),
      PASTA_TEMP: fs.mkdtempSync(path.join(os.tmpdir(), 'central-pwa-')),
      ...ambiente,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  processo.stdout.on('data', (d) => saida.push(String(d)));
  processo.stderr.on('data', (d) => saida.push(String(d)));

  const base = `http://127.0.0.1:${porta}`;
  const limite = Date.now() + 8000;
  while (Date.now() < limite) {
    try {
      const r = await pegar(`${base}/api/saude`);
      if (r.status === 200) break;
    } catch { /* ainda subindo */ }
    await espera(100);
  }
  return {
    base,
    porta,
    log: () => saida.join(''),
    parar: () => new Promise((r) => { processo.once('exit', r); processo.kill(); }),
  };
}

console.log('\nO servidor de verdade');

const servidor = await subirServidor();
let manifesto = null;

try {
  await teste('o manifesto tem o que o celular pede para instalar', async () => {
    const r = await pegar(`${servidor.base}/manifest.webmanifest`);
    igual(r.status, 200, 'status');
    confere(/application\/manifest\+json/.test(r.cabecalhos['content-type']), `content-type: ${r.cabecalhos['content-type']}`);
    confere(/no-cache/.test(r.cabecalhos['cache-control']), 'sem cache HTTP');
    manifesto = JSON.parse(r.corpo.toString('utf8'));
    igual(manifesto.name, 'Central de Jogos', 'name = TITULO');
    igual(manifesto.short_name, 'Central', 'short_name curto');
    igual(manifesto.start_url, '/', 'start_url');
    igual(manifesto.scope, '/', 'scope');
    igual(manifesto.display, 'standalone', 'display');
    confere(/^#[0-9a-f]{6}$/i.test(manifesto.theme_color), 'theme_color');
    confere(/^#[0-9a-f]{6}$/i.test(manifesto.background_color), 'background_color');
    const tamanhos = (proposito) => manifesto.icons
      .filter((i) => i.purpose === proposito).map((i) => i.sizes).sort().join(' ');
    igual(tamanhos('any'), '192x192 512x512', 'icones any');
    igual(tamanhos('maskable'), '192x192 512x512', 'icones maskable');
    confere(manifesto.icons.every((i) => i.type === 'image/png'), 'todos PNG');
  });

  await teste('os atalhos do app sao os jogos visiveis do catalogo', async () => {
    const r = await pegar(`${servidor.base}/api/jogos`);
    const { jogos } = JSON.parse(r.corpo.toString('utf8'));
    confere(jogos.length >= 1, 'ha jogos no catalogo');
    const esperados = jogos.slice(0, 4).map((j) => `/jogar/${j.slug}`).join(',');
    igual(manifesto.shortcuts.map((a) => a.url).join(','), esperados, 'um atalho por jogo, na ordem do catalogo');
    for (const atalho of manifesto.shortcuts) {
      confere(atalho.name && !('short_name' in atalho), `${atalho.name}: nome inteiro, sem short_name cortado`);
      confere(!atalho.description || atalho.description.length <= 101, `${atalho.name}: descricao curta`);
    }
  });

  await teste('cada icone existe, e PNG e tem o tamanho prometido', async () => {
    const todos = [...manifesto.icons, { src: '/icones/apple-touch-icon.png', sizes: '180x180' }];
    for (const icone of todos) {
      const r = await pegar(servidor.base + icone.src);
      igual(r.status, 200, `${icone.src} status`);
      igual(r.cabecalhos['content-type'], 'image/png', `${icone.src} tipo`);
      igual(r.corpo.subarray(1, 4).toString(), 'PNG', `${icone.src} assinatura`);
      const [largura, altura] = icone.sizes.split('x').map(Number);
      igual(r.corpo.readUInt32BE(16), largura, `${icone.src} largura`);
      igual(r.corpo.readUInt32BE(20), altura, `${icone.src} altura`);
    }
    const svg = await pegar(`${servidor.base}/icones/icone.svg`);
    igual(svg.status, 200, 'favicon svg');
    confere(/image\/svg\+xml/.test(svg.cabecalhos['content-type']), 'favicon svg tipo');
  });

  await teste('o sw.js chega sem cache HTTP, como script, e compila', async () => {
    const r = await pegar(`${servidor.base}/sw.js`);
    igual(r.status, 200, 'status');
    confere(/javascript/.test(r.cabecalhos['content-type']), `content-type: ${r.cabecalhos['content-type']}`);
    confere(/no-cache/.test(r.cabecalhos['cache-control']), `cache-control: ${r.cabecalhos['cache-control']}`);
    igual(r.cabecalhos['service-worker-allowed'], '/', 'Service-Worker-Allowed');
    new vm.Script(r.corpo.toString('utf8'), { filename: 'sw.js' });
  });

  await teste('tudo que o worker guarda na instalacao responde 200', async () => {
    const w = carregarWorker();
    for (const caminho of w.self.__casca) {
      const r = await pegar(servidor.base + caminho);
      igual(r.status, 200, caminho);
    }
  });

  await teste('o catalogo e a pagina de jogar apontam para o manifesto e carregam o pwa.js', async () => {
    for (const caminho of ['/', '/jogar/come_come']) {
      const html = (await pegar(servidor.base + caminho)).corpo.toString('utf8');
      confere(html.includes('rel="manifest" href="/manifest.webmanifest"'), `${caminho}: link do manifesto`);
      confere(html.includes('name="theme-color"'), `${caminho}: theme-color`);
      confere(html.includes('name="apple-mobile-web-app-capable" content="yes"'), `${caminho}: apple-mobile-web-app-capable`);
      confere(html.includes('rel="apple-touch-icon"'), `${caminho}: apple-touch-icon`);
      confere(html.includes('<script src="/pwa.js"></script>'), `${caminho}: pwa.js`);
    }
    const catalogo = (await pegar(`${servidor.base}/`)).corpo.toString('utf8');
    confere(catalogo.includes('id="btn-instalar"'), 'botao Instalar');
    confere(catalogo.includes('id="dialogo-instalar"'), 'caixa de instalar');
    for (const modo of ['ios', 'inseguro', 'manual']) {
      confere(catalogo.includes(`data-modo="${modo}"`), `passo a passo "${modo}"`);
    }
    const admin = (await pegar(`${servidor.base}/admin`)).corpo.toString('utf8');
    confere(!admin.includes('pwa.js'), 'o admin fica fora do app');
  });

  await teste('a pagina de sem conexao e o pwa.js existem e compilam', async () => {
    const offline = await pegar(`${servidor.base}/offline.html`);
    igual(offline.status, 200, 'offline.html');
    confere(offline.corpo.toString('utf8').includes('Sem conexão'), 'texto da pagina');
    const pwa = await pegar(`${servidor.base}/pwa.js`);
    igual(pwa.status, 200, 'pwa.js');
    new vm.Script(pwa.corpo.toString('utf8'), { filename: 'pwa.js' });
  });

  await teste('TITULO e TITULO_CURTO mudam o nome do app', async () => {
    const outro = await subirServidor({ TITULO: 'Jogos da Vovó Maria', TITULO_CURTO: 'Vovó' });
    try {
      const m = JSON.parse((await pegar(`${outro.base}/manifest.webmanifest`)).corpo.toString('utf8'));
      igual(m.name, 'Jogos da Vovó Maria', 'name');
      igual(m.short_name, 'Vovó', 'short_name');
    } finally {
      await outro.parar();
    }
  });
} finally {
  await servidor.parar();
}

// -------------------------------------------------------------- HTTPS ----
console.log('\nHTTPS opcional');

const temOpenssl = spawnSync('openssl', ['version'], { stdio: 'ignore' }).status === 0;

await teste('com um certificado que nao existe, o http segue no ar e o log avisa', async () => {
  const s = await subirServidor({ HTTPS_CERT: '/nao/existe/cert.pem', HTTPS_CHAVE: '/nao/existe/chave.pem' });
  try {
    igual((await pegar(`${s.base}/api/saude`)).status, 200, 'http responde');
    await espera(200);
    confere(/HTTPS desligado/.test(s.log()), `o log avisa (veio: ${JSON.stringify(s.log().trim().split('\n').pop())})`);
  } finally {
    await s.parar();
  }
});

if (!temOpenssl) {
  console.log('  --   (sem openssl na maquina: a porta https nao foi testada)');
} else {
  await teste('com certificado, a segunda porta sobe em https e as salas respondem por wss', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'central-cert-'));
    const cert = path.join(pasta, 'cert.pem');
    const chave = path.join(pasta, 'chave.pem');
    const gerado = spawnSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '2', '-nodes',
      '-keyout', chave, '-out', cert, '-subj', '/CN=teste',
      '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
    ], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
    confere(gerado.status === 0 && fs.existsSync(cert), 'openssl gerou o certificado');

    const portaHttps = await portaLivre();
    const s = await subirServidor({ HTTPS_CERT: cert, HTTPS_CHAVE: chave, PORTA_HTTPS: String(portaHttps) });
    try {
      const segura = `https://127.0.0.1:${portaHttps}`;
      let saude = null;
      for (let i = 0; i < 30 && !saude; i++) {
        try { saude = await pegar(`${segura}/api/saude`); } catch { await espera(100); }
      }
      confere(saude && saude.status === 200, 'https responde');
      igual((await pegar(`${segura}/manifest.webmanifest`)).status, 200, 'o manifesto tambem em https');
      igual((await pegar(`${s.base}/api/saude`)).status, 200, 'o http continua no ar');

      const ws = await pegar(`${segura}/plataforma/ws`, { upgrade: true });
      igual(ws.status, 101, 'upgrade aceito por wss');
      confere(ws.cabecalhos['sec-websocket-accept'], 'Sec-WebSocket-Accept presente');
      const ola = JSON.parse(ws.quadro.subarray(2).toString('utf8'));
      igual(ola.t, 'ola', 'a plataforma diz ola pelo canal seguro');
      confere(/https:\/\/localhost:\d+/.test(s.log()), 'o log mostra o endereco https');
    } finally {
      await s.parar();
      fs.rmSync(pasta, { recursive: true, force: true });
    }
  });
}

console.log(`\n${total - falhas}/${total} testes passaram\n`);
process.exit(falhas ? 1 : 0);
