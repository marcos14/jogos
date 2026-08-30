/* ==========================================================================
   Harness dos testes do Super Adventure
   --------------------------------------------------------------------------
   O repositorio nao tem framework de teste (e nao vai ganhar um: nada novo no
   package.json). Entao aqui tem o minimo necessario:

     - `carregarJogo()` roda o game.js num `vm` com um DOM de mentira. Como o
       jogo so liga a parte de tela quando acha o canvas #tela, e o DOM de
       mentira nao tem canvas nenhum, sobra exatamente o miolo testavel: as
       funcoes puras de fisica publicadas em `window.SuperAdventure`.
     - `teste()` / `fim()`: um corredor de testes de dez linhas.

   Rodar:  node testes/super_adventure/fase1.test.mjs
   ========================================================================== */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Carrega o game.js de um jogo e devolve o que ele publicou em `window`. */
export function carregarJogo(slug = 'super_adventure') {
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
    // Sem canvas: o jogo para logo depois de exportar a fisica.
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

  if (!contexto.window.SuperAdventure) {
    throw new Error(`${slug}/game.js nao publicou window.SuperAdventure`);
  }
  return contexto.window.SuperAdventure;
}

/* --------------------------------------------------------------------------
   DOM de mentira COM tela: o suficiente para o jogo ligar de verdade (menu,
   teclado, laco de quadros e desenho) sem navegador nenhum. O "canvas" e um
   gravador: guarda cada retangulo pintado, e da para conferir onde o heroi
   foi parar na tela. Desde a fase 7 tem tambem uma Fullscreen API de mentira
   (`dom.telaCheia` conta os pedidos e as saidas), porque o pedido de tela
   cheia de verdade so vale dentro de um clique num navegador.
   -------------------------------------------------------------------------- */

/* Um elemento de mentira. Desde a fase 13 ele tambem sabe ter FILHOS: o placar
   da sala e o ranking do fim sao listas montadas na mao pelo jogo
   (`createElement` + `appendChild`), e o teste precisa conseguir ler o que
   sobrou na tela. `textContent` de quem tem filhos e a juncao dos filhos, como
   no DOM de verdade, e `innerHTML = ''` esvazia a lista. */
function criarElemento(tag, id) {
  const elemento = {
    tag,
    id,
    className: '',
    style: {},
    offsetHeight: id === 'palco' ? 540 : 620,
    offsetWidth: 960,
    clientWidth: 960,
    clientHeight: 540,
    classes: new Set(),
    filhos: [],
    ouvintes: {},
    atributos: {},
    /* A captura implicita dos eventos de ponteiro, de mentira: o navegador
       prende o dedo no elemento em que ele encostou, e enquanto ela durar os
       vizinhos NAO recebem `pointerenter`/`pointerleave`. Quem quiser deixar o
       dedo arrastar de um botao para o outro precisa soltar a captura - e e
       exatamente isso que o teste do toque confere. */
    capturados: new Set(),
    setPointerCapture(id) { this.capturados.add(id); },
    hasPointerCapture(id) { return this.capturados.has(id); },
    releasePointerCapture(id) { this.capturados.delete(id); },
    classList: {
      add(c) { this.dono.classes.add(c); },
      remove(c) { this.dono.classes.delete(c); },
      contains(c) { return this.dono.classes.has(c); },
    },
    setAttribute(nome, valor) { this.atributos[nome] = valor; },
    getAttribute(nome) { return this.atributos[nome] ?? null; },
    addEventListener(tipo, fn) { (this.ouvintes[tipo] = this.ouvintes[tipo] || []).push(fn); },
    disparar(tipo, evento = {}) {
      (this.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },
    appendChild(filho) { this.filhos.push(filho); return filho; },
    /** So o que o jogo usa: '.classe' e '#id', procurando fundo adentro. */
    querySelector(seletor) { return this.querySelectorAll(seletor)[0] || null; },
    querySelectorAll(seletor) {
      const alvo = seletor.slice(1);
      const casa = (e) => (seletor[0] === '.'
        ? String(e.className || '').split(' ').includes(alvo)
        : e.id === alvo);
      const achados = [];
      for (const f of this.filhos) {
        if (casa(f)) achados.push(f);
        achados.push(...f.querySelectorAll(seletor));
      }
      return achados;
    },
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
  Object.defineProperty(elemento, 'innerHTML', {
    get() { return ''; },
    set() { elemento.filhos.length = 0; texto = ''; },
  });

  elemento.classList.dono = elemento;
  return elemento;
}

/**
 * Carrega o jogo com uma tela de mentira e devolve as pecas para dirigi-lo.
 *
 * `opcoes.plataforma` entra no contexto como `window.Plataforma` - e o lugar
 * do SDK da Central. Sem ela (o padrao), o jogo roda como se tivesse sido
 * aberto direto do disco: nada de rede, so o solo.
 *
 * `opcoes.toque` finge um tablet: o `matchMedia('(pointer: coarse)')` passa a
 * responder que sim e o `navigator.maxTouchPoints` sai de zero, que sao os dois
 * sinais que o jogo olha para por os botoes de dedo no palco. Sem ela (o
 * padrao) o DOM de mentira e um computador com teclado.
 */
export function carregarJogoComTela(slug = 'super_adventure', opcoes = {}) {
  const codigo = fs.readFileSync(path.join(RAIZ, 'jogos', slug, 'game.js'), 'utf8');

  const pintados = [];
  const contexto2d = {
    fillStyle: '#000',
    imageSmoothingEnabled: true,
    fillRect(x, y, l, a) { pintados.push({ x, y, l, a, cor: this.fillStyle }); },
  };

  const elementos = {};
  for (const id of ['app', 'palco', 'hud', 'tela-menu', 'tela-fase', 'tela-fim',
                    'tela-pausa', 'controles', 'recado-palco',
                    'toque', 'toque-esquerda', 'toque-direita', 'toque-pular',
                    'btn-solo', 'btn-amigos', 'btn-proxima', 'btn-de-novo',
                    'btn-pausa', 'btn-tela-cheia', 'btn-continuar', 'btn-recomecar',
                    'aviso', 'hud-sala', 'hud-sala-codigo',
                    'placar-sala', 'placar-lista',
                    'hud-pontos', 'hud-vidas', 'hud-fase',
                    'fase-numero', 'fase-subtitulo', 'fase-pontos', 'fase-bonus',
                    'fase-proxima',
                    'fim-fase-1', 'fim-fase-2', 'fim-fase-3', 'fim-total',
                    'fim-subtitulo', 'fim-sala', 'fim-ranking', 'fim-esperando']) {
    elementos[id] = criarElemento('div', id);
  }
  // No index.html o HUD, as telas de fim, a pausa e a caixa de controles ja
  // nascem escondidos.
  elementos.hud.classes.add('hidden');
  elementos['tela-fase'].classes.add('hidden');
  elementos['tela-fim'].classes.add('hidden');
  elementos['tela-pausa'].classes.add('hidden');
  elementos.controles.classes.add('hidden');
  // Os botoes de toque tambem nascem escondidos: eles so entram no palco em
  // aparelho de dedo, e no lugar da caixa de controles.
  elementos.toque.classes.add('hidden');
  // A tarja de recado do palco (conexao instavel, partida que acabou no meio)
  // tambem nasce escondida e vazia.
  elementos['recado-palco'].classes.add('hidden');
  // O botao "Jogar com amigos", a tarja de recado e a caixa do codigo da sala
  // tambem nascem escondidos: eles so entram com a Central no ar.
  elementos['btn-amigos'].classes.add('hidden');
  elementos.aviso.classes.add('hidden');
  elementos['hud-sala'].classes.add('hidden');
  // O placar da sala e o ranking do fim tambem: os dois so existem em grupo.
  elementos['placar-sala'].classes.add('hidden');
  elementos['fim-sala'].classes.add('hidden');

  elementos.tela = criarElemento('canvas', 'tela');
  elementos.tela.getContext = () => contexto2d;

  let proximoQuadro = null;
  /** Onde cada dedo esta pousado agora: `pointerId` -> id do elemento. */
  const dedosNaTela = new Map();
  const janela = {
    innerWidth: 1280,
    innerHeight: 720,
    ouvintes: {},
    addEventListener(tipo, fn) { (janela.ouvintes[tipo] = janela.ouvintes[tipo] || []).push(fn); },
    removeEventListener() {},
    requestAnimationFrame(fn) { proximoQuadro = fn; return 1; },
    /* O jogo pergunta por `(pointer: coarse)` - "quem aponta aqui e um dedo?" -
       para decidir se os botoes de toque entram no palco. `opcoes.toque` e o
       que finge um tablet; sem ela o DOM de mentira e um computador com
       teclado, como nos testes das fases anteriores. */
    matchMedia: (consulta) => ({
      media: consulta,
      matches: Boolean(opcoes.toque) && /pointer:\s*coarse/.test(consulta),
      addEventListener() {},
      removeEventListener() {},
    }),
    navigator: { maxTouchPoints: opcoes.toque ? 5 : 0 },
  };
  /* A Fullscreen API de mentira. O navegador de verdade nao deixa entrar em
     tela cheia fora de um clique, entao aqui so ficam registradas as chamadas
     - e o `fullscreenchange` e disparado na hora, como o navegador faz. */
  const raiz = criarElemento('html', 'html');
  const telaCheia = { pedidos: 0, saidas: 0 };

  const documento = {
    documentElement: raiz,
    fullscreenElement: null,
    // O jogo monta na mao as linhas do placar da sala e do ranking do fim.
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
  janela.window = janela;
  janela.document = documento;
  // O SDK da Central, quando o teste quer um. Sem ele o jogo se comporta como
  // se tivesse sido aberto direto do disco.
  if (opcoes.plataforma) janela.Plataforma = opcoes.plataforma;

  const contexto = vm.createContext({
    window: janela,
    document: documento,
    console,
    requestAnimationFrame: janela.requestAnimationFrame,
    setTimeout: () => 0,
  });
  vm.runInContext(codigo, contexto, { filename: `jogos/${slug}/game.js` });

  const PASSO_MS = contexto.window.SuperAdventure.mundo.PASSO_MS;
  let relogio = 0;
  let ligado = false;

  const dom = {
    elementos,
    pintados,
    telaCheia,
    documento,
    api: contexto.window.SuperAdventure,

    /** Dispara um evento no documento (fullscreenchange...). */
    eventoDocumento(tipo, evento = {}) {
      (documento.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },

    /** Dispara um evento na janela (keydown, keyup, blur, resize...). */
    eventoJanela(tipo, evento = {}) {
      (janela.ouvintes[tipo] || []).forEach((fn) => fn({ preventDefault() {}, ...evento }));
    },

    /** Aperta (ou solta) uma tecla, como o navegador faria. */
    tecla(nome, apertada) {
      dom.eventoJanela(apertada ? 'keydown' : 'keyup', { key: nome });
    },

    clicar(id) { elementos[id].disparar('click'); },

    /* ---------------------------------------------------------- Os dedos --
       Os tres gestos que uma crianca faz num botao de toque, com os mesmos
       eventos que o navegador manda. Cada dedo tem um `pointerId` proprio, e e
       por isso que dois dedos ao mesmo tempo (correr e pular) funcionam. */

    /** Um dedo encosta num botao. */
    dedoBaixo(id, dedo = 1, tipo = 'touch') {
      const alvo = elementos[id];
      alvo.capturados.add(dedo);          // a captura implicita do navegador
      dedosNaTela.set(dedo, id);
      const evento = { pointerId: dedo, pointerType: tipo, buttons: 1 };
      alvo.disparar('pointerdown', evento);
      dom.eventoJanela('pointerdown', evento);     // o evento sobe ate a janela
    },

    /**
     * O dedo escorrega para outro botao sem sair da tela. Devolve `false` se o
     * navegador ainda estiver com a captura implicita presa no botao de origem
     * - nesse caso o vizinho nao receberia nada, e o arrasto nao aconteceria.
     */
    dedoArrastar(id, dedo = 1, tipo = 'touch') {
      const origem = dedosNaTela.get(dedo);
      const de = origem ? elementos[origem] : null;
      if (de && de.capturados.has(dedo)) return false;

      const evento = { pointerId: dedo, pointerType: tipo, buttons: 1 };
      if (de) de.disparar('pointerleave', evento);
      elementos[id].disparar('pointerenter', evento);
      dedosNaTela.set(dedo, id);
      return true;
    },

    /** O dedo sai da tela. */
    dedoCima(dedo = 1, tipo = 'touch') {
      const origem = dedosNaTela.get(dedo);
      dedosNaTela.delete(dedo);
      const evento = { pointerId: dedo, pointerType: tipo, buttons: 0 };
      dom.eventoJanela('pointerup', evento);
      if (origem) {
        elementos[origem].capturados.delete(dedo);
        elementos[origem].disparar('pointerleave', evento);
      }
    },

    /** O aparelho tirou o dedo da conta (ligacao chegando, aba trocada...). */
    dedoCancelado(dedo = 1, tipo = 'touch') {
      const origem = dedosNaTela.get(dedo);
      dedosNaTela.delete(dedo);
      if (origem) elementos[origem].capturados.delete(dedo);
      dom.eventoJanela('pointercancel', { pointerId: dedo, pointerType: tipo, buttons: 0 });
    },

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
   O piloto automatico: um "jogador" de mentira que atravessa uma fase sozinho.
   Ele segura a direita e pula quando bate numa parede ou quando o chao acaba
   na coluna da frente.

   Desde a fase 5 ele tambem sabe lidar com bicho: vendo um inimigo vivo a
   frente, na mesma altura, ele PARA de andar e espera - e quando o bicho chega
   perto, pula parado, caindo bem em cima dele (o pisao que vale 20 pontos).
   Parar em vez de correr para cima e o que evita as duas maneiras bobas de
   levar dano: esbarrar de lado num bicho que vem andando, e pular um buraco
   para aterrissar bem ao lado de um que estava do outro lado. Se tiver um
   bloco (ou uma plataforma solta) logo acima da cabeca, ele recua uns passos
   antes de pular, senao a cabecada cortaria o pulo pela metade.

   Desde a fase 6a ele tambem sabe esperar. Diante de um vao, ele so pula se
   houver chao firme ao alcance de um pulo (uns 80px); nao havendo, ele fica
   parado na beirada - e e assim que ele embarca nas plataformas moveis da
   fase 3, que chegam rentes ao chao e ficam paradas um instante em cada ponta.
   Em cima delas vale a mesma regra: espera ate o outro lado ficar ao alcance.

   Quem esta no ar nao muda de ideia: a decisao de andar so e revista com os
   pes no chao, senao soltar a seta no meio do pulo derrubaria o heroi dentro
   do buraco que ele estava justamente atravessando.
   -------------------------------------------------------------------------- */
export function criarPiloto(dom) {
  const { Fisica, Mapa, Inimigos } = dom.api;
  const M = Fisica.medidas;
  const T = M.TILE;
  const jogo = dom.api.jogo;

  const VISTA = 6 * T;        // ate onde o piloto repara num bicho
  const PISAO = 1.5 * T;      // a distancia em que pular acerta o pisao
  const ALCANCE = 80;         // o vao que um pulo cobre, com folga (sao ~93px)
  const DEGRAU = 40;          // desnivel que da para descer andando
  const TETO = 130;           // o pulo inteiro, com folga

  /** A fase que esta em jogo agora (muda quando o teste troca de fase). */
  const mapa = () => dom.api.fase;

  /** Os solidos deste instante: o tilemap mais as plataformas moveis. */
  const solidos = () => (jogo.limites || mapa().limites).solidos;

  /** Tem chao na coluna `x`, na altura dos pes (ou um degrau abaixo)? */
  function apoioEm(x, pes) {
    return solidos().some((s) => x >= s.x && x < s.x + s.l &&
                                 s.y >= pes - 4 && s.y <= pes + DEGRAU);
  }

  const chaoAFrente = () =>
    apoioEm(jogo.heroi.x + M.HEROI_L + 1, jogo.heroi.y + M.HEROI_A);

  const chaoAtras = () =>
    apoioEm(jogo.heroi.x - 1, jogo.heroi.y + M.HEROI_A);

  /**
   * A distancia ate a proxima superficie FIRME a frente (Infinity se nao tem
   * nenhuma ao alcance). Superficie e o quadrado solido que tem ceu em cima -
   * a lateral de um paredao nao serve de pouso. As plataformas moveis ficam de
   * fora de proposito: diante delas o piloto espera em vez de pular.
   */
  function alcanceAFrente() {
    const m = mapa();
    const h = jogo.heroi;
    const pes = h.y + M.HEROI_A;
    // A partir da coluna da frente - a mesma que `chaoAFrente()` olha. Comecar
    // na coluna de tras acharia o chao em que o heroi ja esta de pe e daria
    // "distancia zero" bem na beirada de um vao.
    const inicio = Math.floor((h.x + M.HEROI_L + 1) / T);

    for (let c = inicio; c <= inicio + 3; c++) {
      for (let r = 0; r < m.linhas; r++) {
        if (!Mapa.solido(m, c, r) || Mapa.solido(m, c, r - 1)) continue;
        const topo = r * T;
        if (topo < pes - 100 || topo > pes + 400) continue;
        return Math.max(0, c * T - (h.x + M.HEROI_L));
      }
    }
    return Infinity;
  }

  /** Tem alguma coisa solida logo acima da cabeca, no alcance do pulo? */
  function tetoAcima() {
    const h = jogo.heroi;
    const acima = { x: h.x, y: h.y - TETO, l: M.HEROI_L, a: TETO };
    return solidos().some((s) => Fisica.tocando(acima, s));
  }

  /**
   * O bicho vivo mais proximo, na mesma altura (ou `null`). Por padrao so
   * conta quem esta a frente; `dosDoisLados` inclui quem vem por tras - que e
   * o que importa quando o heroi esta parado esperando uma plataforma movel e
   * um bicho esperto da fase 3 resolve ir atras dele.
   */
  function bichoPerto(dosDoisLados) {
    const h = jogo.heroi;
    const lista = jogo.inimigos.lista;
    let perto = null;

    for (let i = 0; i < lista.length; i++) {
      const ini = lista[i];
      if (ini.estado !== 'vivo') continue;          // casco e morto nao mordem
      const r = Inimigos.retangulo(ini);
      const dx = r.x - (h.x + M.HEROI_L);
      const longe = dosDoisLados ? Math.abs(dx) > VISTA
                                 : (dx < -M.HEROI_L || dx > VISTA);
      if (longe) continue;
      if (Math.abs(r.y - h.y) > T) continue;        // noutro andar da fase
      if (!perto || Math.abs(dx) < Math.abs(perto.dx)) perto = { dx, ini };
    }
    return perto;
  }

  /** Corre para a direita ate `pronto()` dizer que chegou (ou desistir). */
  return function correrAte(pronto, maxQuadros = 6000) {
    let quadros = 0, xAnterior = -1, pulando = false, rumo = 'direita';

    while (!pronto() && quadros < maxQuadros) {
      const h = jogo.heroi;
      let pular = false;

      if (h.noChao) {
        const firme = chaoAFrente();
        const bicho = firme ? bichoPerto(false) : null;
        if (bicho) {
          // Encara e espera ele vir - mas nao debaixo de um teto.
          const recuar = tetoAcima() && chaoAtras();
          rumo = recuar ? 'esquerda' : 'parado';
          pular = !recuar && bicho.dx <= PISAO;
        } else if (firme) {
          rumo = 'direita';
          pular = h.x === xAnterior;                // travou numa parede
        } else if (alcanceAFrente() > ALCANCE) {
          rumo = 'parado';                          // espera a ponte chegar
          // Parado e presa facil: quem chegar perto leva um pisao, venha da
          // frente ou de tras.
          const chegando = bichoPerto(true);
          pular = !!chegando && Math.abs(chegando.dx) <= PISAO;
        } else {
          rumo = 'direita';
          pular = true;
        }
      }

      dom.tecla('ArrowRight', rumo === 'direita');
      dom.tecla('ArrowLeft', rumo === 'esquerda');
      dom.tecla(' ', pular && !pulando);
      pulando = pular;
      xAnterior = rumo === 'direita' ? h.x : -1;    // parado nao conta parede
      dom.avancarQuadros(1);
      quadros++;
    }

    ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
    return quadros;
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
export function criarAbaDaPlataforma(servidor, apelido = 'Jogador') {
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
    criar: (opcoes) => (enviar({ t: 'criar', jogo: 'super_adventure', apelido, opcoes: opcoes || {} }), mj),
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
export function lerJogoJson(slug = 'super_adventure') {
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
