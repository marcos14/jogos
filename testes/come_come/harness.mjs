/* ==========================================================================
   Harness dos testes do Come-Come
   --------------------------------------------------------------------------
   O repositorio nao tem framework de teste (e nao vai ganhar um: nada novo no
   package.json). Entao aqui tem o minimo necessario - o mesmo truque do
   harness do super_adventure, adaptado para este jogo:

     - `carregarJogo()` roda o game.js num `vm` com um DOM de mentira. Como o
       jogo so liga a parte de tela quando acha o canvas #tela, e este DOM de
       mentira nao tem canvas nenhum, sobra exatamente o miolo testavel: os
       modulos puros publicados em `window.ComeCome`.
     - `carregarJogoComTela()` da o canvas: o jogo liga de verdade (teclado,
       laco de quadros e desenho) sem navegador nenhum. O "canvas" e um
       gravador - guarda cada retangulo pintado, e da para conferir onde o
       come-come foi parar na tela. Desde a fase 7 ele tambem tem uma
       Fullscreen API de mentira (`dom.telaCheia` conta os pedidos e as
       saidas), porque o pedido de verdade so vale dentro de um clique num
       navegador - e um atalho, `dom.comecarPartida()`, que clica no JOGAR do
       menu, que agora e por onde toda partida comeca.
     - `criarPiloto()` devolve o piloto automatico das fases 2, 6a e 6b: busca
       em largura ate a pastilha inteira mais perto, passando so por onde
       nenhum cacador esta por perto. E o jeito de atravessar uma corrida
       inteira dentro de um teste.
     - `subirPlataforma()` (fase 8) levanta o servidor das salas DE VERDADE
       numa porta sorteada, e `criarAbaDaPlataforma()` cria uma "aba" que fala
       com ele por WebSocket - juntas elas dao uma sala inteira sem navegador.
     - `teste()` / `fim()`: um corredor de testes de dez linhas.

   Rodar:  node testes/come_come/fase1.test.mjs
   ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Carrega o game.js de um jogo e devolve o que ele publicou em `window`. */
export function carregarJogo(slug = 'come_come') {
  const arquivo = path.join(RAIZ, 'jogos', slug, 'game.js');
  const codigo = fs.readFileSync(arquivo, 'utf8');

  const janela = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() { return 0; },
    setTimeout() { return 0; },
  };
  const documento = {
    // Sem canvas: o jogo para logo depois de exportar os modulos puros.
    getElementById() { return null; },
    addEventListener() {},
  };
  janela.window = janela;
  janela.document = documento;

  const contexto = vm.createContext({
    window: janela,
    document: documento,
    console,
    requestAnimationFrame: janela.requestAnimationFrame,
    setTimeout,
  });

  vm.runInContext(codigo, contexto, { filename: `jogos/${slug}/game.js` });

  if (!contexto.window.ComeCome) {
    throw new Error(`${slug}/game.js nao publicou window.ComeCome`);
  }
  return contexto.window.ComeCome;
}

/* --------------------------------------------------------------------------
   DOM de mentira COM tela: o suficiente para o jogo ligar de verdade (teclado,
   laco de quadros e desenho) sem navegador nenhum.
   -------------------------------------------------------------------------- */

/** Um elemento de mentira, com o pouco de DOM que o jogo usa. */
function criarElemento(tag, id) {
  const elemento = {
    tag,
    id,
    className: '',
    style: {},
    offsetHeight: id === 'palco' ? 496 : 540,
    offsetWidth: 448,
    clientWidth: 448,
    clientHeight: 496,
    classes: new Set(),
    filhos: [],
    ouvintes: {},
    atributos: {},
    classList: {
      add(c) { this.dono.classes.add(c); },
      remove(c) { this.dono.classes.delete(c); },
      contains(c) { return this.dono.classes.has(c); },
    },
    // O campo do nome do menu (fase 7): so o `value` mesmo, que e o unico
    // pedaco de `<input>` que o jogo usa.
    value: '',
    setAttribute(nome, valor) { this.atributos[nome] = valor; },
    getAttribute(nome) { return this.atributos[nome] ?? null; },
    addEventListener(tipo, fn) { (this.ouvintes[tipo] = this.ouvintes[tipo] || []).push(fn); },
    disparar(tipo, evento = {}) {
      (this.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },
    appendChild(filho) { this.filhos.push(filho); return filho; },
  };

  let texto = '';
  Object.defineProperty(elemento, 'textContent', {
    get() {
      return elemento.filhos.length
        ? elemento.filhos.map((f) => f.textContent).join('')
        : texto;
    },
    set(valor) { texto = String(valor); elemento.filhos.length = 0; },
  });

  elemento.classList.dono = elemento;
  return elemento;
}

/**
 * Carrega o jogo com uma tela de mentira e devolve as pecas para dirigi-lo.
 * O canvas grava cada `fillRect` em `dom.pintados` - e assim da para conferir
 * o que foi parar na tela sem abrir navegador nenhum.
 */
export function carregarJogoComTela(slug = 'come_come', opcoes = {}) {
  const codigo = fs.readFileSync(path.join(RAIZ, 'jogos', slug, 'game.js'), 'utf8');

  const pintados = [];
  const contexto2d = {
    fillStyle: '#000',
    imageSmoothingEnabled: true,
    fillRect(x, y, l, a) { pintados.push({ x, y, l, a, cor: this.fillStyle }); },
  };

  const elementos = {};
  for (const id of ['app', 'palco', 'rodape', 'hud',
                    'hud-pontos', 'hud-vidas', 'hud-fase', 'hud-faltam',
                    'btn-pausa', 'btn-tela-cheia',
                    'hud-sala', 'hud-sala-codigo', 'hud-eu', 'hud-eu-nome',
                    'tela-menu', 'campo-apelido', 'btn-jogar', 'controles',
                    'btn-amigos', 'aviso',
                    'tela-pausa', 'btn-continuar', 'btn-recomecar',
                    'tela-fase', 'fase-numero', 'fase-pontos',
                    'fase-bonus', 'fase-proxima', 'btn-proxima',
                    'tela-fim', 'fim-fase', 'fim-pontos', 'btn-fim-de-novo',
                    'tela-parabens', 'parabens-total', 'btn-de-novo',
                    'parabens-fase-1', 'parabens-fase-2', 'parabens-fase-3']) {
    elementos[id] = criarElemento('div', id);
  }
  // No index.html as telas de fim ja nascem escondidas.
  elementos['tela-fase'].classes.add('hidden');
  elementos['tela-fim'].classes.add('hidden');
  elementos['tela-parabens'].classes.add('hidden');
  // E, desde a fase 7, o HUD, o quadro de pausa e o cartaz dos controles
  // tambem: quem comeca na tela e o menu.
  elementos.hud.classes.add('hidden');
  elementos['tela-pausa'].classes.add('hidden');
  elementos.controles.classes.add('hidden');
  // E, desde a fase 8, a caixa do codigo da sala, o botao "JOGAR COM AMIGOS" e
  // a tarja de recado: os tres so aparecem com a Central no ar.
  elementos['hud-sala'].classes.add('hidden');
  elementos['btn-amigos'].classes.add('hidden');
  elementos.aviso.classes.add('hidden');
  // E, desde a fase 11, a caixa do "voce e" - o nome e a cor da sala.
  elementos['hud-eu'].classes.add('hidden');

  elementos.tela = criarElemento('canvas', 'tela');
  elementos.tela.getContext = () => contexto2d;

  let proximoQuadro = null;
  const janela = {
    innerWidth: 800,
    innerHeight: 900,
    ouvintes: {},
    addEventListener(tipo, fn) { (janela.ouvintes[tipo] = janela.ouvintes[tipo] || []).push(fn); },
    removeEventListener() {},
    requestAnimationFrame(fn) { proximoQuadro = fn; return 1; },
    matchMedia: (consulta) => ({
      media: consulta,
      matches: Boolean(opcoes.toque) && /pointer:\s*coarse/.test(consulta),
      addEventListener() {},
      removeEventListener() {},
    }),
    navigator: { maxTouchPoints: opcoes.toque ? 5 : 0 },
  };

  /* A Fullscreen API de mentira (fase 7). O navegador de verdade nao deixa
     entrar em tela cheia fora de um clique, entao aqui so ficam registradas as
     chamadas - e o `fullscreenchange` e disparado na hora, como ele faz. */
  const raiz = criarElemento('html', 'html');
  const telaCheia = { pedidos: 0, saidas: 0 };

  const documento = {
    documentElement: raiz,
    fullscreenElement: null,
    hidden: false,               // o `visibilitychange` da aba que sai de cena
    createElement(tag) { return criarElemento(tag, ''); },
    exitFullscreen() {
      telaCheia.saidas++;
      documento.fullscreenElement = null;
      dom.eventoDocumento('fullscreenchange');
      return Promise.resolve();
    },
    getElementById(id) { return elementos[id] || null; },
    ouvintes: {},
    addEventListener(tipo, fn) {
      (documento.ouvintes[tipo] = documento.ouvintes[tipo] || []).push(fn);
    },
  };
  raiz.requestFullscreen = () => {
    telaCheia.pedidos++;
    documento.fullscreenElement = raiz;
    dom.eventoDocumento('fullscreenchange');
    return Promise.resolve();
  };
  /* O `localStorage` de mentira: um por copia do jogo, entao o nome guardado
     numa "aba" nao vaza para a outra. `opcoes.guardado` deixa o teste comecar
     com alguma coisa ja la dentro (o nome da ultima partida, por exemplo). */
  const guardado = new Map(Object.entries(opcoes.guardado || {}));
  janela.localStorage = {
    getItem: (chave) => (guardado.has(chave) ? guardado.get(chave) : null),
    setItem: (chave, valor) => { guardado.set(chave, String(valor)); },
    removeItem: (chave) => { guardado.delete(chave); },
  };

  janela.window = janela;
  janela.document = documento;
  if (opcoes.plataforma) janela.Plataforma = opcoes.plataforma;

  const contexto = vm.createContext({
    window: janela,
    document: documento,
    console,
    requestAnimationFrame: janela.requestAnimationFrame,
    setTimeout: () => 0,
  });
  vm.runInContext(codigo, contexto, { filename: `jogos/${slug}/game.js` });

  const PASSO_MS = contexto.window.ComeCome.mundo.PASSO_MS;
  let relogio = 0;
  let ligado = false;

  const dom = {
    elementos,
    pintados,
    telaCheia,
    documento,
    guardado,
    api: contexto.window.ComeCome,

    /**
     * Comeca a partida pelo menu - o caminho de verdade desde a fase 7. O
     * `apelido` e o que a crianca digitaria no campo antes de clicar.
     */
    comecarPartida(apelido = '') {
      elementos['campo-apelido'].value = apelido;
      elementos['btn-jogar'].disparar('click');
    },

    /** Dispara um evento no documento. */
    eventoDocumento(tipo, evento = {}) {
      (documento.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },

    /** Dispara um evento na janela (keydown, keyup, blur, resize...). */
    eventoJanela(tipo, evento = {}) {
      (janela.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },

    /** Aperta (ou solta) uma tecla, como o navegador faria. */
    tecla(nome, apertada = true) {
      dom.eventoJanela(apertada ? 'keydown' : 'keyup', { key: nome });
    },

    clicar(id) { elementos[id].disparar('click'); },

    /** O texto de um elemento do HUD (ou de qualquer outro). */
    texto(id) { return elementos[id].textContent; },

    /** Aquele elemento esta escondido? (`class="hidden"`, como no CSS) */
    escondido(id) { return elementos[id].classList.contains('hidden'); },

    /**
     * Roda `n` quadros de 1/60s. O primeiro quadro de todos so acerta o
     * relogio (dt = 0), entao ele e feito uma vez, por fora da conta.
     */
    avancarQuadros(n) {
      if (!ligado) { proximoQuadro(relogio); ligado = true; }
      for (let i = 0; i < n; i++) {
        // Um tiquinho a mais que 1/60s: assim o arredondamento do ponto
        // flutuante nunca deixa o acumulador devendo um passo.
        relogio += PASSO_MS + 1e-9;
        pintados.length = 0;
        proximoQuadro(relogio);
      }
    },
  };
  return dom;
}

/* --------------------------------------------------------------------------
   O PILOTO AUTOMATICO
   --------------------------------------------------------------------------
   O mesmo piloto dos testes de tela das fases 2, 6a e 6b, aqui num lugar so:
   busca em largura ate a pastilha inteira mais perto, passando SO por onde
   nenhum cacador esta a menos de dois quadrados. Como nas fases 2 e 3 os
   fantasmas correm mais que o come-come, ele nasce imortal (a rodada e
   devolvida ao cheio antes de cada quadro) - um teste sobre a CORRIDA nao pode
   virar um teste sobre sobrevivencia. `criarPiloto(dom, { imortal: false })`
   tira essa rede.
   -------------------------------------------------------------------------- */
export function criarPiloto(dom, opcoes = {}) {
  const imortal = opcoes.imortal !== false;
  const { Mapa, Movimento, Pastilhas, Rodada, mundo } = dom.api;

  const jogo = () => dom.api.jogo;
  const mapa = () => dom.api.labirinto;
  const come = () => dom.api.jogo.come;
  const chave = (c, l) => `${c},${l}`;

  const OLHO_DO_MEDO = 8;       // mais longe que isto ele nao se preocupa
  const MARGEM = 2;             // quadrados de folga que ele exige do cacador

  /** Um quadro, com (ou sem) a rede de seguranca das vidas. */
  function quadro() {
    if (imortal) {
      jogo().rodada = Rodada.novoEstado();
      jogo().vidas = mundo.VIDAS_INICIAIS;
    }
    dom.avancarQuadros(1);
  }

  /** A que distancia (em quadrados) o cacador mais proximo esta de cada lugar. */
  function mapaDePerigo() {
    const m = mapa();
    const perigo = new Map();
    const fila = [];

    for (const f of jogo().fantasmas.lista) {
      if (!Rodada.cacador(f) || f.etapa === 'casa') continue;   // preso, nao pega
      const c = Mapa.coluna(f.corpo.x);
      const l = Mapa.linha(f.corpo.y);
      if (perigo.has(chave(c, l))) continue;
      perigo.set(chave(c, l), 0);
      fila.push({ c, l, d: 0 });
    }

    for (let i = 0; i < fila.length; i++) {
      const aqui = fila[i];
      if (aqui.d >= OLHO_DO_MEDO) continue;
      for (const dir of Movimento.DIRECOES) {
        if (!Mapa.podeIr(m, aqui.c, aqui.l, dir)) continue;
        const v = Mapa.vizinho(m, aqui.c, aqui.l, dir);
        if (perigo.has(chave(v.c, v.l))) continue;
        perigo.set(chave(v.c, v.l), aqui.d + 1);
        fila.push({ c: v.c, l: v.l, d: aqui.d + 1 });
      }
    }
    return perigo;
  }

  /** A primeira direcao do caminho seguro ate a pastilha inteira mais perto. */
  function direcaoParaAPastilhaMaisPerto() {
    const m = mapa();
    const perigo = mapaDePerigo();
    const seguro = (c, l) => (perigo.get(chave(c, l)) ?? 99) > MARGEM;
    const c0 = Mapa.coluna(come().x);
    const l0 = Mapa.linha(come().y);
    const veio = new Map([[chave(c0, l0), null]]);
    const fila = [{ c: c0, l: l0 }];

    for (let i = 0; i < fila.length; i++) {
      const aqui = fila[i];
      const pastilha = Mapa.pastilhaEm(m, aqui.c, aqui.l);
      if (pastilha >= 0 && Pastilhas.existe(jogo().pastilhas, pastilha)) {
        let passo = veio.get(chave(aqui.c, aqui.l));
        if (!passo) continue;                       // ja estamos em cima dela
        while (veio.get(chave(passo.c, passo.l))) {
          passo = veio.get(chave(passo.c, passo.l));
        }
        return passo.dir;
      }
      for (const dir of Movimento.DIRECOES) {
        if (!Mapa.podeIr(m, aqui.c, aqui.l, dir)) continue;
        const v = Mapa.vizinho(m, aqui.c, aqui.l, dir);
        if (veio.has(chave(v.c, v.l))) continue;
        if (!seguro(v.c, v.l)) continue;
        veio.set(chave(v.c, v.l), { c: aqui.c, l: aqui.l, dir });
        fila.push(v);
      }
    }

    // Cercado: foge para o vizinho mais longe dos quatro e tenta de novo adiante.
    let melhor = null;
    let maisLonge = -1;
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(m, c0, l0, dir)) continue;
      const v = Mapa.vizinho(m, c0, l0, dir);
      const d = perigo.get(chave(v.c, v.l)) ?? 99;
      if (d > maisLonge) { maisLonge = d; melhor = dir; }
    }
    return melhor;
  }

  /**
   * Roda o jogo com o piloto no volante ate o labirinto sair do ar (limpo, ou
   * a tela de fim subindo) e devolve os pontos que a fase rendeu.
   */
  return function limparOLabirinto(maxDecisoes = 6000) {
    for (let i = 0; i < maxDecisoes; i++) {
      if (jogo().tela !== 'jogando') return jogo().pontos;
      if (!Movimento.noCentro(come())) { quadro(); continue; }

      const dir = direcaoParaAPastilhaMaisPerto();
      if (!dir) {
        throw new Error(
          `o piloto ficou sem caminho (faltavam ${Pastilhas.faltam(jogo().pastilhas)})`);
      }
      dom.api.entrada.desejada = dir;
      for (let q = 0; q < 8 && jogo().tela === 'jogando'; q++) quadro();
    }
    throw new Error(
      `o piloto nao limpou o labirinto (faltaram ${Pastilhas.faltam(jogo().pastilhas)})`);
  };
}

/* --------------------------------------------------------------------------
   A PLATAFORMA DE VERDADE, DENTRO DO TESTE
   --------------------------------------------------------------------------
   `subirPlataforma()` levanta o servidor das salas de verdade - o mesmo
   `montarWebSocket()` do `server/src/plataforma/`, com o mesmo `salas.js` -
   numa porta sorteada, mais as duas rotas que o SDK consulta. Nada de express:
   um `http.createServer` basta e o teste sobe em milissegundos.
   -------------------------------------------------------------------------- */
export async function subirPlataforma() {
  process.env.PASTA_JOGOS = process.env.PASTA_JOGOS || path.join(RAIZ, 'jogos');

  const { capacidades, montarWebSocket } = await import('../../server/src/plataforma/index.js');
  const { VERSAO_PLATAFORMA } = await import('../../server/src/plataforma/manifesto.js');
  const { listarSalas, estatisticas } = await import('../../server/src/plataforma/salas.js');

  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://interno');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (url.pathname === '/api/plataforma') {
      res.end(JSON.stringify({ versao: VERSAO_PLATAFORMA, capacidades, ...estatisticas() }));
      return;
    }
    if (url.pathname === '/api/plataforma/salas') {
      res.end(JSON.stringify({ salas: listarSalas(url.searchParams.get('jogo') || '') }));
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });

  montarWebSocket(servidor);
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));

  const { port } = servidor.address();
  return {
    porta: port,
    url: `http://127.0.0.1:${port}`,
    ws: `ws://127.0.0.1:${port}/plataforma/ws`,
    capacidades,
    async fechar() {
      servidor.closeAllConnections();
      await new Promise((pronto) => servidor.close(pronto));
    },
  };
}

/* --------------------------------------------------------------------------
   UMA "ABA" DO NAVEGADOR
   --------------------------------------------------------------------------
   O `/plataforma/sdk.js` de verdade desenha o lobby inteiro em HTML, e um DOM
   de mentira nao da conta disso. Entao aqui vai o MIOLO dele: o mesmo canal
   WebSocket, falando com o servidor de verdade, e a mesma cara publica que o
   jogo usa (`iniciar()`, `multijogador.disponivel`, `abrirLobby()`, `criar()`,
   `entrar()`, `pronto()`, `comecar()`, `enviar()`...). Os quatro ganchos sao
   ligados exatamente como o SDK liga: `inicio` -> `aoComecar`, `msg` ->
   `aoReceber`, `fim` -> `aoTerminar`, `abortou` -> `aoAbortar`.

   Uma aba dessas + `carregarJogoComTela(slug, { plataforma: aba.plataforma })`
   e uma aba de navegador inteira, sem navegador.
   -------------------------------------------------------------------------- */
export function criarAbaDaPlataforma(servidor, apelido = 'Jogador', slug = 'come_come') {
  const ouvintes = new Map();
  let ws = null;
  let sala = null;
  let meuId = null;
  let ganchos = {};
  let lobbyAberto = false;

  function em(nome, fn) {
    if (!ouvintes.has(nome)) ouvintes.set(nome, []);
    ouvintes.get(nome).push(fn);
    return mj;
  }
  function fora(nome, fn) {
    if (ouvintes.has(nome)) ouvintes.set(nome, ouvintes.get(nome).filter((f) => f !== fn));
    return mj;
  }
  function solta(nome, dado) {
    (ouvintes.get(nome) || []).slice().forEach((fn) => fn(dado));
  }

  function souAnfitriao() { return Boolean(sala && meuId && sala.anfitriao === meuId); }

  function instantaneo() {
    if (!sala) return null;
    return {
      codigo: sala.codigo, estado: sala.estado, modo: sala.modo,
      max: sala.max, min: sala.min, taxaEstado: sala.taxaEstado,
      eu: meuId, souAnfitriao: souAnfitriao(), anfitriao: sala.anfitriao,
      jogadores: sala.jogadores.slice(), semente: sala.semente || 0,
    };
  }

  // As mesmas traducoes de mensagem do SDK.
  function tratar(m) {
    if (m.t === 'entrei') { meuId = m.eu; sala = m.sala; solta('sala', instantaneo()); }
    else if (m.t === 'sala') { sala = m.sala; solta('sala', instantaneo()); }
    else if (m.t === 'anfitriao') { if (sala) sala.anfitriao = m.id; solta('sala', instantaneo()); }
    else if (m.t === 'inicio') {
      if (sala) { sala = m.sala; sala.semente = m.semente; }
      solta('inicio', instantaneo());
    } else if (m.t === 'fim') {
      if (m.sala) sala = m.sala;
      solta('fim', { placar: m.placar || [], sala: instantaneo() });
    } else if (m.t === 'abortou') solta('abortou', { motivo: m.motivo, sala: instantaneo() });
    else if (m.t === 'saiu') solta('saiu', m.jogador);
    else if (m.t === 'msg') solta('msg', { de: m.de, d: m.d });
    else if (m.t === 'erro') solta('erro', m.msg || 'Algo deu errado.');
  }

  function enviar(objeto) {
    if (!ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify(objeto));
    return true;
  }

  const mj = {
    disponivel: Boolean(servidor.capacidades?.multijogador?.disponivel),
    max: servidor.capacidades?.multijogador?.maxJogadores || 0,
    em, fora,
    sala: instantaneo,
    souAnfitriao,
    eu: () => (sala && meuId ? sala.jogadores.find((j) => j.id === meuId) || null : null),
    conectar: () => mj,
    criar: (opcoes) => (enviar({ t: 'criar', jogo: slug, apelido, opcoes: opcoes || {} }), mj),
    entrar: (codigo) => (enviar({ t: 'entrar', codigo: String(codigo || '').toUpperCase().trim(), apelido }), mj),
    pronto: (valor) => (enviar({ t: 'pronto', valor: valor !== false }), mj),
    comecar: () => (enviar({ t: 'iniciar' }), mj),
    terminar: (placar) => (enviar({ t: 'fim', placar }), mj),
    sair: () => { enviar({ t: 'sair' }); sala = null; meuId = null; return mj; },
    enviar: (d) => enviar({ t: 'msg', para: 'outros', d }),
    paraAnfitriao: (d) => enviar({ t: 'msg', para: 'anfitriao', d }),
    paraJogador: (id, d) => enviar({ t: 'msg', para: id, d }),
    abrirLobby(opcoes) { ganchos = opcoes || {}; lobbyAberto = true; return mj; },
    fecharLobby() { lobbyAberto = false; return mj; },
  };

  em('inicio', (s) => { lobbyAberto = false; if (ganchos.aoComecar) ganchos.aoComecar(s); });
  em('msg', (m) => { if (ganchos.aoReceber) ganchos.aoReceber(m); });
  em('fim', (f) => { if (ganchos.aoTerminar) ganchos.aoTerminar(f); });
  em('abortou', (a) => { if (ganchos.aoAbortar) ganchos.aoAbortar(a); });

  const plataforma = {
    versao: 1,
    perfil: { apelido, definirApelido: (nome) => (apelido = String(nome || '').slice(0, 14)) },
    multijogador: mj,
    iniciar: () => Promise.resolve(plataforma),
  };

  const aba = {
    plataforma,
    mj,
    /** Abre o canal e espera o "ola" do servidor. */
    abrir() {
      return new Promise((pronto, falhou) => {
        ws = new WebSocket(servidor.ws);
        ws.onmessage = (ev) => {
          let m;
          try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m && m.t === 'ola') return pronto(aba);
          if (m && m.t) tratar(m);
        };
        ws.onerror = () => falhou(new Error('nao consegui abrir o canal da plataforma'));
      });
    },
    fechar() { if (ws) { ws.close(); ws = null; } },
    /** Espera o proximo evento com esse nome (ou desiste em `ms`). */
    esperar(nome, ms = 3000) {
      return new Promise((pronto, falhou) => {
        const relogio = setTimeout(() => {
          fora(nome, ouvinte);
          falhou(new Error(`a plataforma nao mandou "${nome}" em ${ms}ms`));
        }, ms);
        function ouvinte(dado) {
          clearTimeout(relogio);
          fora(nome, ouvinte);
          pronto(dado);
        }
        em(nome, ouvinte);
      });
    },
    lobbyAberto: () => lobbyAberto,
    ganchos: () => ganchos,
    salaAgora: instantaneo,
  };
  return aba;
}

/** Le e devolve o jogo.json de um jogo. */
export function lerJogoJson(slug = 'come_come') {
  return JSON.parse(
    fs.readFileSync(path.join(RAIZ, 'jogos', slug, 'jogo.json'), 'utf8'),
  );
}

// ------------------------------------------------------- Corredor de testes --
// Os testes sao enfileirados e rodados na ordem por `fim()`, para que testes
// assincronos (os que leem o catalogo, por exemplo) tambem contem.
const fila = [];

export function teste(nome, fn) {
  fila.push({ nome, fn });
}

export async function fim(titulo) {
  let falhas = 0;
  for (const { nome, fn } of fila) {
    try {
      await fn();
      console.log(`  ok      ${nome}`);
    } catch (erro) {
      falhas++;
      console.log(`  FALHOU  ${nome}`);
      console.log(`          ${String(erro.message).replace(/\n/g, '\n          ')}`);
    }
  }
  console.log(`\n${titulo}: ${fila.length - falhas}/${fila.length} passaram.`);
  process.exit(falhas ? 1 : 0);
}
