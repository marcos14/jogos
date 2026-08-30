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
   foi parar na tela.
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
    classList: {
      add(c) { this.dono.classes.add(c); },
      remove(c) { this.dono.classes.delete(c); },
      contains(c) { return this.dono.classes.has(c); },
    },
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
  for (const id of ['app', 'palco', 'hud', 'tela-menu', 'tela-fim',
                    'btn-solo', 'btn-de-novo', 'hud-pontos']) {
    elementos[id] = criarElemento(id);
    elementos[id].classList.dono = elementos[id];
  }
  // No index.html o HUD e a tela de fim ja nascem escondidos.
  elementos.hud.classes.add('hidden');
  elementos['tela-fim'].classes.add('hidden');

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
  const documento = {
    getElementById(id) { return elementos[id] || null; },
    addEventListener() {},
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
    api: contexto.window.SuperAdventure,

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
