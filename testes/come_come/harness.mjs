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
       come-come foi parar na tela.
     - `teste()` / `fim()`: um corredor de testes de dez linhas.

   Rodar:  node testes/come_come/fase1.test.mjs
   ========================================================================== */

import fs from 'node:fs';
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
                    'tela-fase', 'fase-numero', 'fase-pontos',
                    'tela-fim', 'fim-fase', 'fim-pontos']) {
    elementos[id] = criarElemento('div', id);
  }
  // No index.html as telas de fim ja nascem escondidas.
  elementos['tela-fase'].classes.add('hidden');
  elementos['tela-fim'].classes.add('hidden');

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

  const documento = {
    createElement(tag) { return criarElemento(tag, ''); },
    getElementById(id) { return elementos[id] || null; },
    ouvintes: {},
    addEventListener(tipo, fn) {
      (documento.ouvintes[tipo] = documento.ouvintes[tipo] || []).push(fn);
    },
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
    documento,
    api: contexto.window.ComeCome,

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
