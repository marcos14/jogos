/* ==========================================================================
   A Central como app (PWA)
   --------------------------------------------------------------------------
   Instalada na tela inicial do celular ou do tablet, a Central abre como um
   app: icone proprio, sem a barra do navegador, e funcionando sem rede para
   os jogos que ja foram abertos. Tres pecas fazem isso:

     GET /manifest.webmanifest   quem a Central e (nome, cor, icones) - montado
                                 na hora, porque o nome vem do TITULO do .env
                                 e os atalhos vem do catalogo do momento;
     GET /sw.js                  o service worker (public/sw.js), servido sem
                                 cache HTTP para o navegador ver cada versao;
     public/pwa.js               o registro do service worker e o botao
                                 "Instalar" do catalogo.

   O restante (icones, pagina de "sem conexao") sao arquivos comuns em public/.
   ========================================================================== */
import path from 'node:path';
import { config } from './config.js';
import { listarJogos } from './catalogo.js';

/** As cores do manifesto: as mesmas do estilo.css (--destaque e --fundo). */
export const CORES = { tema: '#ff5fa2', fundo: '#fff7fb' };

/** Quantos jogos viram atalho no icone do app (toque longo, no Android). */
const MAX_ATALHOS = 4;

/** Corta um texto longo em palavra inteira, com reticencias. */
function resumir(texto, maximo) {
  if (texto.length <= maximo) return texto;
  const corte = texto.lastIndexOf(' ', maximo - 1);
  return texto.slice(0, corte > maximo / 2 ? corte : maximo - 1).replace(/[\s,;:.]+$/, '') + '…';
}

export const ICONES = [
  { src: '/icones/icone-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icones/icone-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icones/icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** Monta o manifesto do app com o titulo do .env e os jogos visiveis de agora. */
export async function montarManifesto() {
  const jogos = await listarJogos();

  return {
    id: '/',
    name: config.titulo,
    short_name: config.tituloCurto,
    description: 'Os jogos da família, num toque.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: CORES.fundo,
    theme_color: CORES.tema,
    categories: ['games', 'kids', 'entertainment'],
    prefer_related_applications: false,
    icons: ICONES,
    shortcuts: jogos.slice(0, MAX_ATALHOS).map((jogo) => ({
      name: jogo.nome,
      description: jogo.descricao ? resumir(jogo.descricao, 100) : undefined,
      url: `/jogar/${encodeURIComponent(jogo.slug)}`,
    })),
  };
}

export function montarPwa(app) {
  app.get('/manifest.webmanifest', async (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.type('application/manifest+json');
    res.send(JSON.stringify(await montarManifesto(), null, 2));
  });

  // Sem cache HTTP: o navegador confere o sw.js a cada visita e, se mudou,
  // instala a versao nova sozinho. (Um sw.js preso no cache e um app velho
  // que ninguem consegue atualizar.)
  app.get('/sw.js', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.set('Service-Worker-Allowed', '/');
    res.sendFile(path.join(config.pastaPublica, 'sw.js'));
  });
}
