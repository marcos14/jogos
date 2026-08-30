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

function criarElemento(id) {
  return {
    id,
    style: {},
    offsetHeight: id === 'palco' ? 540 : 620,
    offsetWidth: 960,
    clientWidth: 960,
    clientHeight: 540,
    classes: new Set(),
    ouvintes: {},
    atributos: {},
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
  };
}

/** Carrega o jogo com uma tela de mentira e devolve as pecas para dirigi-lo. */
export function carregarJogoComTela(slug = 'super_adventure') {
  const codigo = fs.readFileSync(path.join(RAIZ, 'jogos', slug, 'game.js'), 'utf8');

  const pintados = [];
  const contexto2d = {
    fillStyle: '#000',
    imageSmoothingEnabled: true,
    fillRect(x, y, l, a) { pintados.push({ x, y, l, a, cor: this.fillStyle }); },
  };

  const elementos = {};
  for (const id of ['app', 'palco', 'hud', 'tela-menu', 'tela-fase', 'tela-fim',
                    'tela-pausa', 'controles',
                    'btn-solo', 'btn-proxima', 'btn-de-novo',
                    'btn-pausa', 'btn-tela-cheia', 'btn-continuar', 'btn-recomecar',
                    'hud-pontos', 'hud-vidas', 'hud-fase',
                    'fase-numero', 'fase-pontos', 'fase-bonus', 'fase-proxima',
                    'fim-fase-1', 'fim-fase-2', 'fim-fase-3', 'fim-total']) {
    elementos[id] = criarElemento(id);
    elementos[id].classList.dono = elementos[id];
  }
  // No index.html o HUD, as telas de fim, a pausa e a caixa de controles ja
  // nascem escondidos.
  elementos.hud.classes.add('hidden');
  elementos['tela-fase'].classes.add('hidden');
  elementos['tela-fim'].classes.add('hidden');
  elementos['tela-pausa'].classes.add('hidden');
  elementos.controles.classes.add('hidden');

  elementos.tela = criarElemento('tela');
  elementos.tela.classList.dono = elementos.tela;
  elementos.tela.getContext = () => contexto2d;

  let proximoQuadro = null;
  const janela = {
    innerWidth: 1280,
    innerHeight: 720,
    ouvintes: {},
    addEventListener(tipo, fn) { (janela.ouvintes[tipo] = janela.ouvintes[tipo] || []).push(fn); },
    removeEventListener() {},
    requestAnimationFrame(fn) { proximoQuadro = fn; return 1; },
  };
  /* A Fullscreen API de mentira. O navegador de verdade nao deixa entrar em
     tela cheia fora de um clique, entao aqui so ficam registradas as chamadas
     - e o `fullscreenchange` e disparado na hora, como o navegador faz. */
  const raiz = criarElemento('html');
  raiz.classList.dono = raiz;
  const telaCheia = { pedidos: 0, saidas: 0 };

  const documento = {
    documentElement: raiz,
    fullscreenElement: null,
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
