/* ==========================================================================
   Service worker da Central de Jogos
   --------------------------------------------------------------------------
   E o que faz a Central virar um app de verdade quando instalada na tela
   inicial: ela abre mesmo sem rede, e um jogo que ja foi jogado neste
   aparelho continua abrindo.

   A regra e uma so - REDE PRIMEIRO, CACHE DEPOIS:
     - com a rede de casa no ar, tudo vem fresco do servidor (um jogo
       republicado pelo admin aparece na hora, sem versao velha presa - e
       anfitriao e convidados nunca ficam com game.js diferentes);
     - sem rede, ou com o servidor demorando mais que TEMPO_LIMITE_MS, vem o
       que foi guardado da ultima vez;
     - se nao tem nem um nem outro, a pagina de "sem conexao".

   Dois caches:
     - casca-v<N>: as paginas da propria Central (catalogo, pagina de jogar,
       estilo, SDK, icones). Sao guardadas na instalacao; a cada VERSAO o
       nome muda e o cache antigo e apagado;
     - jogos: tudo que os jogos carregam, guardado na primeira vez que sao
       jogados. Nao tem versao: um jogo guardado continua guardado.

   O que NUNCA passa por aqui: o admin e o login (sempre ao vivo, e nada de
   guardar pagina logada), a API da plataforma (uma lista de salas velha e
   pior que nenhuma) e o WebSocket (que nem e um fetch).

   Para forcar todo mundo a baixar a casca de novo, suba a VERSAO.
   ========================================================================== */
'use strict';

const VERSAO = '1';
const CACHE_CASCA = 'casca-v' + VERSAO;
const CACHE_JOGOS = 'jogos';
const TEMPO_LIMITE_MS = 4000;
const PAGINA_SEM_REDE = '/offline.html';

const CASCA = [
  '/',
  '/estilo.css',
  '/catalogo.js',
  '/pwa.js',
  '/jogar.html',
  '/plataforma/sdk.js',
  '/manifest.webmanifest',
  PAGINA_SEM_REDE,
  '/icones/icone.svg',
  '/icones/icone-192.png',
  '/icones/icone-512.png',
  '/icones/icone-maskable-192.png',
  '/icones/icone-maskable-512.png',
  '/icones/apple-touch-icon.png',
];

// Caminhos que passam direto pelo navegador, sem olhar nem guardar.
const SEM_CACHE = [
  /^\/admin(\.html|\.js)?$/,
  /^\/api\/admin(\/|$)/,
  /^\/api\/(login|logout|sessao)$/,
  /^\/api\/plataforma(\/|$)/,
  /^\/plataforma\/ws$/,
  /^\/sw\.js$/,
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_CASCA)
      // cache: 'reload' pula o cache HTTP do navegador: a casca vem do servidor.
      .then((cache) => cache.addAll(CASCA.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_CASCA && nome !== CACHE_JOGOS)
          .map((nome) => caches.delete(nome)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (SEM_CACHE.some((regra) => regra.test(url.pathname))) return;
  // Pedaco de arquivo (audio ou video pulando de posicao): o navegador cuida.
  if (pedido.headers.has('range')) return;

  evento.respondWith(redePrimeiro(pedido, url));
});

async function redePrimeiro(pedido, url) {
  const nomeDoCache = CASCA.indexOf(url.pathname) >= 0 ? CACHE_CASCA : CACHE_JOGOS;
  const navegacao = pedido.mode === 'navigate';

  // Sem rede nenhuma o navegador ja sabe: nem perde tempo tentando.
  if (self.navigator && self.navigator.onLine === false) {
    const guardado = await doCache(pedido, navegacao);
    if (guardado) return guardado;
  }

  const pelaRede = fetch(pedido).then((resposta) => {
    guardar(nomeDoCache, pedido, resposta);
    return resposta;
  });
  // A falha e tratada logo abaixo; isto so evita o aviso de "rejeicao sem dono"
  // quando a resposta acaba vindo do cache.
  pelaRede.catch(() => {});

  const resposta = await Promise.race([pelaRede, esperar(TEMPO_LIMITE_MS)]).catch(() => null);
  if (resposta) return resposta;

  const guardado = await doCache(pedido, navegacao);
  if (guardado) return guardado;

  // Nem rede rapida nem cache: espera a rede ate o fim (pode ser so um
  // servidor lento). Se ela falhar de vez, uma pagina inteira ganha o aviso
  // de "sem conexao"; um arquivo avulso falha como falharia sem o worker.
  try {
    return await pelaRede;
  } catch (erro) {
    if (navegacao) {
      const semRede = await caches.match(PAGINA_SEM_REDE);
      if (semRede) return semRede;
    }
    throw erro;
  }
}

/** Procura no cache. Numa navegacao a busca ignora o "?..." da URL, e o
 *  /jogar/<slug> de um jogo cai na pagina de jogar guardada. */
async function doCache(pedido, navegacao) {
  const guardado = await caches.match(pedido, { ignoreSearch: navegacao });
  if (guardado || !navegacao) return guardado;
  if (/^\/jogar\/[^/]+$/.test(new URL(pedido.url).pathname)) return caches.match('/jogar.html');
  return undefined;
}

function guardar(nome, pedido, resposta) {
  // So resposta inteira, bem-sucedida e da propria Central. Uma que veio de
  // redirecionamento nao entra: o navegador se recusa a usa-la numa
  // navegacao, e o /jogar/<slug> de um jogo que sumiu redireciona para /.
  if (!resposta || !resposta.ok || resposta.status === 206 || resposta.redirected || resposta.type !== 'basic') return;
  const copia = resposta.clone();
  caches.open(nome).then((cache) => cache.put(pedido, copia)).catch(() => {});
}

function esperar(ms) {
  return new Promise((_resolver, rejeitar) => {
    setTimeout(() => rejeitar(new Error('tempo esgotado')), ms);
  });
}
