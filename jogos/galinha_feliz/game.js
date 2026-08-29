/* ==========================================================================
   GALINHA FELIZ  -  o joguinho de computador da Peppa Pig
   --------------------------------------------------------------------------
   Mecanica:
     - O jogador entra com o nome e controla a Galinha Feliz pelo terreiro.
     - A cada X segundos ela bota um ovo NO QUADRADINHO onde estiver.
     - So conta ovo em quadradinho vazio -> e preciso correr para lugares
       diferentes do tabuleiro.
     - Os ovos chocam sozinhos e viram pintinhos (como no desenho), liberando
       o lugar de novo e dando pontos extras.
     - 100 ovos = proxima fase: a galinha bota mais rapido, os ovos chocam
       mais rapido e a raposa aparece (a partir da fase 3) para roubar ovos.
     - Cada fase tem um tempo; se acabar, fim de jogo e o placar vai pro
       ranking (localStorage).
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------ Constantes --
  // O tabuleiro tem sempre 104 lugares: 13x8 deitado, 8x13 em pe. Como um e a
  // transposta do outro, da para girar o mundo inteiro trocando x por y.
  var CELL = 66, MARGIN = 40;
  var COLS = 13, ROWS = 8;                 // tabuleiro de lugares (muda no retrato)
  var W = COLS * CELL + MARGIN * 2;        // resolucao logica do canvas (938 x 608)
  var H = ROWS * CELL + MARGIN * 2;
  var GRID_W = COLS * CELL, GRID_H = ROWS * CELL;
  var GX = MARGIN, GY = MARGIN;
  var EGGS_PER_LEVEL = 100;

  var INK = '#3a2b26';

  // Avisos que o anfitriao manda junto com o estado, para os convidados
  // fazerem o mesmo barulho e a mesma poeirinha na hora certa.
  var EV = { OVO: 1, CHOCO: 2, ROUBO: 3, XO: 4, OPS: 5, FASE: 6 };

  // Como cada fase fica mais dificil / mais rapida
  var rules = {
    layInterval:  function (L) { return Math.max(0.22, 0.78 * Math.pow(0.88, L - 1)); },
    hatchTime:    function (L) { return Math.max(3.5, 9 - (L - 1) * 0.55); },
    levelTime:    function (L) { return Math.max(75, 130 - (L - 1) * 7); },
    chickenSpeed: function (L) { return Math.min(450, 270 + (L - 1) * 14); },
    foxInterval:  function (L) { return L < 3 ? Infinity : Math.max(7, 18 - (L - 3) * 1.5); },
    foxSpeed:     function (L) { return Math.min(265, 150 + (L - 3) * 12); }
  };

  // ------------------------------------------------------------- Utilidades --
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function cellCol(x) { return clamp(Math.floor((x - GX) / CELL), 0, COLS - 1); }
  function cellRow(y) { return clamp(Math.floor((y - GY) / CELL), 0, ROWS - 1); }
  function cellCX(c) { return GX + c * CELL + CELL / 2; }
  function cellCY(r) { return GY + r * CELL + CELL / 2; }

  // ------------------------------------------------------------------ Audio --
  var Sfx = (function () {
    var ac = null, enabled = true;
    function ctx() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ac) ac = new AC();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function beep(o) {
      if (!enabled) return;
      var a = ctx(); if (!a) return;
      var t0 = a.currentTime + (o.delay || 0);
      var osc = a.createOscillator(), g = a.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.from, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      osc.connect(g); g.connect(a.destination);
      osc.start(t0); osc.stop(t0 + o.dur + 0.03);
    }
    return {
      cluck: function () {
        beep({ from: 880, to: 420, dur: 0.09, type: 'square', vol: 0.08 });
        beep({ from: 700, to: 300, dur: 0.10, type: 'square', vol: 0.06, delay: 0.09 });
      },
      egg:   function () { beep({ from: 1200, to: 1900, dur: 0.11, vol: 0.09 }); },
      fail:  function () { beep({ from: 240, to: 110, dur: 0.16, type: 'sawtooth', vol: 0.06 }); },
      hatch: function () {
        [1400, 1750, 2100].forEach(function (f, i) {
          beep({ from: f, to: f * 1.25, dur: 0.07, type: 'triangle', vol: 0.06, delay: i * 0.06 });
        });
      },
      level: function () {
        [523, 659, 784, 1046].forEach(function (f, i) {
          beep({ from: f, to: f, dur: 0.2, type: 'triangle', vol: 0.11, delay: i * 0.11 });
        });
      },
      steal: function () { beep({ from: 320, to: 70, dur: 0.35, type: 'sawtooth', vol: 0.1 }); },
      scare: function () { beep({ from: 600, to: 1500, dur: 0.14, type: 'square', vol: 0.08 }); },
      over:  function () {
        [660, 560, 440, 330].forEach(function (f, i) {
          beep({ from: f, to: f * 0.92, dur: 0.3, type: 'triangle', vol: 0.11, delay: i * 0.18 });
        });
      },
      toggle: function () { enabled = !enabled; if (enabled) ctx(); return enabled; },
      isOn: function () { return enabled; },
      wake: function () { ctx(); }
    };
  }());

  // ------------------------------------------------------------------- DOM ---
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('game');
  var ctx = canvas.getContext('2d');

  var el = {
    hud: $('hud'), name: $('hud-name'), score: $('hud-score'), level: $('hud-level'),
    eggs: $('hud-eggs'), barEggs: $('bar-eggs'), time: $('hud-time'), barTime: $('bar-time'),
    combo: $('hud-combo'), comboBox: $('hud-combo-box'),
    btnSound: $('btn-sound'), btnPause: $('btn-pause'),
    start: $('screen-start'), form: $('form-start'), input: $('input-name'),
    overlay: $('screen-overlay'), ovTitle: $('overlay-title'), ovText: $('overlay-text'),
    btnResume: $('btn-resume'), btnQuit: $('btn-quit'),
    over: $('screen-over'), overLine: $('over-line'), overScore: $('over-score'),
    overLevel: $('over-level'), overEggs: $('over-eggs'),
    btnAgain: $('btn-again'), btnMenu: $('btn-menu'),
    rank1: $('ranking-list'), rank2: $('ranking-list-2'),
    tip: $('tip'),
    // multijogador
    btnFriends: $('btn-friends'), btnLobby: $('btn-lobby'),
    mpBoard: $('mp-board'), mpCode: $('mp-code'), mpList: $('mp-list'), mpNet: $('mp-net'),
    overRanking: $('over-ranking'), overSala: $('over-sala'), rankSala: $('ranking-sala')
  };

  // ------------------------------------------------------------- Estado ------
  var state = {
    screen: 'start',      // start | playing | paused | levelup | over
    player: '',
    level: 1, eggsLevel: 0,
    timeLeft: 0, t: 0, shake: 0, overlayT: 0,
    // Multijogador: null = sozinho. Ver a secao "Rede" la embaixo.
    rede: null
  };

  /**
   * Uma galinha por jogador. A minha e `chicken`; as outras chegam pela rede.
   * `entrada` e o que o jogador esta pedindo agora (mouse/dedo ou setas) - e a
   * mesma coisa para a minha galinha e para a do amigo do outro lado da casa.
   */
  function novaGalinha(cfg) {
    return {
      id: cfg.id || 'eu', indice: cfg.indice || 0,
      apelido: cfg.apelido || '', cor: cfg.cor || '#fffdf7',
      x: cfg.x != null ? cfg.x : W / 2, y: cfg.y != null ? cfg.y : H / 2,
      dir: 1, walk: 0, lay: 0, cluck: 0, moving: false,
      score: 0, streak: 0, bestStreak: 0, eggs: 0,
      entrada: { ax: W / 2, ay: H / 2, dx: 0, dy: 0, tem: false },
      // so nos convidados: para onde o anfitriao disse que ela esta indo
      redeX: null, redeY: null
    };
  }

  var galinhas = [novaGalinha({})];
  var chicken = galinhas[0];     // a minha galinha
  var eggs = new Map();          // chave: r * COLS + c
  var chicks = [];
  var fox = null;
  var foxTimer = 0;
  var parts = [];                // particulas (penas, poeira)
  var texts = [];                // textos flutuantes (+10, Ops!)
  var demoTarget = { x: W / 2, y: H / 2, t: 0 };

  var pointer = { x: W / 2, y: H / 2, has: false, touch: false, down: false };
  var keys = Object.create(null);

  function galinhaPorIndice(i) {
    for (var k = 0; k < galinhas.length; k++) if (galinhas[k].indice === i) return galinhas[k];
    return null;
  }

  /** Sozinho sao 100 ovos por fase; em grupo, 60 por jogador. */
  function metaOvos() {
    return galinhas.length > 1 ? 60 * galinhas.length : EGGS_PER_LEVEL;
  }

  // --------------------------------------------------- Canvas / orientacao ---
  function resizeCanvas() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  // Gira o mundo trocando x <-> y (13x8 <-> 8x13 sem perder nada de lugar).
  function transposeWorld() {
    var old = eggs;
    eggs = new Map();
    old.forEach(function (e) {
      var c = e.r, r = e.c;                // (coluna, linha) viram (linha, coluna)
      e.c = c; e.r = r;
      e.x = cellCX(c); e.y = cellCY(r) + 6;
      eggs.set(r * COLS + c, e);
    });

    function swap(o) { var t = o.x; o.x = o.y; o.y = t; }
    galinhas.forEach(function (g) {
      swap(g);
      g.dir = 1;
      var t = g.entrada.ax; g.entrada.ax = g.entrada.ay; g.entrada.ay = t;
      var d = g.entrada.dx; g.entrada.dx = g.entrada.dy; g.entrada.dy = d;
      if (g.redeX != null) { var r = g.redeX; g.redeX = g.redeY; g.redeY = r; }
    });
    chicks.forEach(function (ch) { swap(ch); var t = ch.vx; ch.vx = ch.vy; ch.vy = t; });
    parts.forEach(function (p) { swap(p); var t = p.vx; p.vx = p.vy; p.vy = t; });
    texts.forEach(swap);
    decor.forEach(swap);
    swap(pointer);
    swap(demoTarget);
    if (fox) { swap(fox); var t = fox.homeX; fox.homeX = fox.homeY; fox.homeY = t; }

    galinhas.forEach(function (g) {
      g.x = clamp(g.x, GX + 20, GX + GRID_W - 20);
      g.y = clamp(g.y, GY + 22, GY + GRID_H - 18);
      g.lay = 0;                // folego apos girar o aparelho
    });
  }

  /** Aplica um tabuleiro de `cols` colunas (13 deitado, 8 em pe). */
  function aplicarLayout(cols) {
    if (cols !== 8 && cols !== 13) return false;
    if (cols === COLS) return false;
    COLS = cols;
    ROWS = cols === 8 ? 13 : 8;
    GRID_W = COLS * CELL; GRID_H = ROWS * CELL;
    W = GRID_W + MARGIN * 2; H = GRID_H + MARGIN * 2;
    transposeWorld();
    resizeCanvas();
    return true;
  }

  // Deitado -> 13x8; em pe -> 8x13. Devolve true se a orientacao mudou.
  // Num convidado o tabuleiro e o do anfitriao: todo mundo precisa ver o
  // mesmo terreiro, senao os quadradinhos nao batem.
  function chooseLayout() {
    if (state.rede && state.rede.papel === 'convidado') return false;
    return aplicarLayout(window.innerHeight > window.innerWidth ? 8 : 13);
  }

  // Deixa o palco o maior possivel sem distorcer nem passar da tela.
  function fitStage() {
    var app = document.getElementById('app');
    var stage = document.getElementById('stage');
    stage.style.width = '';
    stage.style.height = '';
    var others = app.offsetHeight - stage.offsetHeight;   // HUD + rodape + espacos
    var availW = app.clientWidth;
    var availH = window.innerHeight - others - 24;
    var s = Math.max(0.12, Math.min(availW / W, availH / H));
    stage.style.width = Math.floor(W * s) + 'px';
    stage.style.height = Math.floor(H * s) + 'px';
  }

  function onResize() { chooseLayout(); fitStage(); }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 120); });
  resizeCanvas();

  // -------------------------------------------------------- Cenario fixo -----
  // Tufos de grama e florzinhas ficam na moldura, fora dos quadradinhos.
  var decor = (function () {
    var d = [], tries = 0;
    while (d.length < 46 && tries < 900) {
      tries++;
      var x = rand(14, W - 14), y = rand(14, H - 14);
      var inside = x > GX - 6 && x < GX + GRID_W + 6 && y > GY - 6 && y < GY + GRID_H + 6;
      if (inside) continue;
      d.push({
        x: x, y: y,
        kind: Math.random() < 0.55 ? 'tuft' : 'flower',
        color: pick(['#ff8fb1', '#ffd23f', '#ffffff', '#c58cf5']),
        s: rand(0.75, 1.25)
      });
    }
    return d;
  }());

  // ------------------------------------------------------------- Ranking -----
  var RANK_KEY = 'galinhaFeliz.ranking.v1';
  var NAME_KEY = 'galinhaFeliz.lastName';

  function loadRank() {
    try { return JSON.parse(localStorage.getItem(RANK_KEY)) || []; } catch (e) { return []; }
  }
  function saveRank(entry) {
    var list = loadRank();
    list.push(entry);
    list.sort(function (a, b) { return b.score - a.score; });
    list = list.slice(0, 10);
    try { localStorage.setItem(RANK_KEY, JSON.stringify(list)); } catch (e) { /* modo privado */ }
    return list;
  }
  function renderRank(target, list, mine) {
    target.innerHTML = '';
    if (!list.length) {
      target.innerHTML = '<li class="empty">Ninguém jogou ainda...</li>';
      return;
    }
    var medals = ['🥇', '🥈', '🥉'];
    list.forEach(function (e, i) {
      var li = document.createElement('li');
      if (mine && e === mine) li.className = 'me';
      li.innerHTML =
        '<span class="pos">' + (medals[i] || (i + 1) + '.') + '</span>' +
        '<span class="who"></span>' +
        '<span class="lv">fase ' + e.level + '</span>' +
        '<span class="pts">' + e.score + '</span>';
      li.querySelector('.who').textContent = e.name;
      target.appendChild(li);
    });
  }

  /** Cor vinda da rede so entra no HTML se for mesmo uma cor. */
  function corSegura(valor) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(valor || '')) ? valor : '#fffdf7';
  }

  /** Placar de uma partida em grupo (nao mexe no ranking do navegador). */
  function renderPlacarSala(target, placar) {
    target.innerHTML = '';
    var medals = ['🥇', '🥈', '🥉'];
    placar.forEach(function (p, i) {
      var li = document.createElement('li');
      if (p.eu) li.className = 'me';
      li.innerHTML =
        '<span class="pos">' + (medals[i] || (i + 1) + '.') + '</span>' +
        '<span class="dot" style="background:' + corSegura(p.cor) + '"></span>' +
        '<span class="who"></span>' +
        '<span class="lv">' + p.eggs + ' ovos</span>' +
        '<span class="pts">' + p.score + '</span>';
      li.querySelector('.who').textContent = p.apelido;
      target.appendChild(li);
    });
  }

  // ------------------------------------------------------------ Efeitos ------
  function puff(x, y, color, n) {
    for (var i = 0; i < (n || 8); i++) {
      var a = rand(0, Math.PI * 2), s = rand(40, 150);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: rand(0.4, 0.8), max: 0.8, r: rand(2.5, 5.5),
        color: color || '#ffffff', rot: rand(0, 6), spin: rand(-6, 6)
      });
    }
  }
  function floatText(x, y, txt, color) {
    texts.push({ x: x, y: y, txt: txt, color: color || '#fffdf7', life: 1, vy: -46 });
  }
  function shake(v) { state.shake = Math.max(state.shake, v); }

  // ----------------------------------------------------------- Entradas ------
  var TOUCH_LIFT = 62;      // no dedo, a galinha anda ACIMA do toque (senao some)

  function canvasPos(ev) {
    var r = canvas.getBoundingClientRect();
    var lift = ev.pointerType === 'touch' ? TOUCH_LIFT : 0;
    return {
      x: clamp((ev.clientX - r.left) * (W / r.width), 0, W),
      y: clamp((ev.clientY - r.top) * (H / r.height) - lift, 0, H)
    };
  }
  canvas.addEventListener('pointerdown', function (ev) {
    Sfx.wake();
    pointer.touch = ev.pointerType === 'touch';
    pointer.down = true;
    var p = canvasPos(ev); pointer.x = p.x; pointer.y = p.y; pointer.has = true;
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} }
    ev.preventDefault();
  });
  canvas.addEventListener('pointermove', function (ev) {
    pointer.touch = ev.pointerType === 'touch';
    if (pointer.touch && !pointer.down) return;
    var p = canvasPos(ev); pointer.x = p.x; pointer.y = p.y; pointer.has = true;
    ev.preventDefault();
  });
  window.addEventListener('pointerup', function () { pointer.down = false; });
  window.addEventListener('pointercancel', function () { pointer.down = false; });
  canvas.addEventListener('pointerleave', function () { if (!pointer.touch) pointer.has = false; });

  var KEYMAP = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
    ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd'
  };
  window.addEventListener('keydown', function (ev) {
    if (KEYMAP[ev.code]) {
      keys[KEYMAP[ev.code]] = true;
      pointer.has = false;             // teclado assume o controle
      if (state.screen === 'playing') ev.preventDefault();
    }
    if (ev.code === 'KeyP' || ev.code === 'Escape') togglePause();
    if (ev.code === 'KeyM') toggleSound();
  });
  window.addEventListener('keyup', function (ev) {
    if (KEYMAP[ev.code]) keys[KEYMAP[ev.code]] = false;
  });
  window.addEventListener('blur', function () {
    keys = Object.create(null);
    if (state.screen === 'playing') togglePause();
  });

  /**
   * Traduz mouse/dedo/teclado para a "entrada" da minha galinha - o mesmo
   * formatinho que chega pela rede quando e a galinha de um amigo.
   */
  function lerEntradaLocal() {
    var e = chicken.entrada;
    e.dx = (keys.l ? -1 : 0) + (keys.r ? 1 : 0);
    e.dy = (keys.u ? -1 : 0) + (keys.d ? 1 : 0);
    e.tem = pointer.has;
    if (pointer.has) { e.ax = pointer.x; e.ay = pointer.y; }
  }

  // ------------------------------------------------------- Ciclo de jogo -----
  function startGame(name) {
    state.player = name;
    state.level = 1; state.eggsLevel = 0; state.shake = 0;
    state.timeLeft = rules.levelTime(1);
    eggs.clear(); chicks.length = 0; parts.length = 0; texts.length = 0;
    fox = null; foxTimer = rules.foxInterval(1);

    // Em grupo, cada galinha comeca num cantinho diferente do terreiro.
    galinhas.forEach(function (g, i) {
      var n = galinhas.length;
      var a = (i / n) * Math.PI * 2;
      g.x = n > 1 ? W / 2 + Math.cos(a) * GRID_W * 0.28 : W / 2;
      g.y = n > 1 ? H / 2 + Math.sin(a) * GRID_H * 0.28 : H / 2;
      g.lay = 0; g.cluck = 0; g.score = 0; g.streak = 0; g.bestStreak = 0; g.eggs = 0;
      g.entrada.ax = g.x; g.entrada.ay = g.y; g.entrada.dx = 0; g.entrada.dy = 0;
      g.entrada.tem = false;
      g.redeX = null; g.redeY = null;
    });

    el.name.textContent = name;
    el.hud.classList.remove('hidden');
    fitStage();
    el.start.classList.add('hidden');
    el.over.classList.add('hidden');
    el.overlay.classList.add('hidden');
    el.tip.textContent = state.rede
      ? 'Corra para os quadradinhos vazios antes dos seus amigos!'
      : 'Dica: fique de olho no anel dourado — quando ele completa, sai ovo!';
    state.screen = 'playing';
    Rede.mostrarPlacar();
    syncHud(true);
    Sfx.wake();
  }

  function levelUp() {
    // Os ovos que sobraram no terreiro chocam de uma vez, como bonus - cada um
    // rende para quem botou.
    var bonus = 0;
    eggs.forEach(function (e) {
      bonus += 5;
      var dono = galinhaPorIndice(e.dono) || chicken;
      dono.score += 5;
      spawnChick(e.x, e.y);
      puff(e.x, e.y, '#ffffff', 4);
    });
    eggs.clear();

    state.level++;
    state.eggsLevel = 0;
    state.timeLeft = rules.levelTime(state.level);
    fox = null;
    foxTimer = rules.foxInterval(state.level);

    Rede.evento(EV.FASE, 0, 0, state.level, bonus);
    avisoDeFase(state.level, bonus);
  }

  /** A telinha de "Fase N" - o convidado mostra a mesma quando o aviso chega. */
  function avisoDeFase(nivel, bonus) {
    var msgs = [
      'Mais rápido agora!',
      'A Galinha Feliz está animada!',
      'Corra para lugares novos!',
      'Que galinha veloz!'
    ];
    el.ovTitle.textContent = 'Fase ' + nivel;
    el.ovText.textContent = (bonus ? 'Bônus de ' + bonus + ' pontos! ' : '') + pick(msgs);
    el.btnResume.classList.add('hidden');
    el.btnQuit.classList.add('hidden');
    el.overlay.classList.remove('hidden');
    state.screen = 'levelup';
    state.overlayT = 2.4;
    Sfx.level();
    syncHud(true);
  }

  function togglePause() {
    // Em grupo ninguem para o jogo dos outros - o mundo continua girando.
    if (state.rede) return;
    if (state.screen === 'playing') {
      state.screen = 'paused';
      el.ovTitle.textContent = 'Pausa';
      el.ovText.textContent = 'Respire fundo, galinha!';
      el.btnResume.classList.remove('hidden');
      el.btnQuit.classList.remove('hidden');
      el.overlay.classList.remove('hidden');
    } else if (state.screen === 'paused') {
      state.screen = 'playing';
      el.overlay.classList.add('hidden');
    }
  }

  /**
   * Fim de jogo. Sozinho, o placar vai para o ranking do navegador.
   * Em grupo quem decide o fim e o anfitriao: ele avisa a plataforma e todo
   * mundo cai nesta mesma tela, com o placar da sala.
   */
  function gameOver(placarDaSala) {
    if (state.screen === 'over') return;
    var eraRede = Boolean(state.rede);

    if (eraRede && !placarDaSala) {
      if (state.rede.papel === 'convidado') return;   // quem manda e o anfitriao

      // Anfitriao: fecha a partida pela plataforma e espera o "fim" voltar,
      // para que todos vejam o mesmo placar ao mesmo tempo.
      if (!state.rede.encerrando) {
        state.rede.encerrando = state.t;
        Rede.enviarEstado();
        Rede.encerrarPartida(Rede.placar());
        return;
      }
      // Se a plataforma nao confirmar em 3 segundos (rede caiu), mostra o
      // placar que temos aqui em vez de deixar a tela congelada.
      if (state.t - state.rede.encerrando < 3) return;
    }

    state.screen = 'over';
    Sfx.over();

    el.overScore.textContent = chicken.score;
    el.overLevel.textContent = state.level;
    el.overEggs.textContent = chicken.eggs;
    el.overlay.classList.add('hidden');
    el.over.classList.remove('hidden');
    el.hud.classList.add('hidden');
    el.mpBoard.classList.add('hidden');

    if (eraRede) {
      // Partida em grupo: o ranking de um jogador so nao serve de comparacao,
      // entao mostramos o placar da sala.
      var placar = placarDaSala && placarDaSala.length ? placarDaSala : Rede.placar();
      var meu = 0;
      placar.forEach(function (p, i) {
        p.eu = Boolean(p.eu) || p.id === chicken.id;   // marca quem sou eu na lista
        if (p.eu) meu = i + 1;
      });
      el.overLine.textContent = meu === 1
        ? 'Uau, ' + state.player + '! Você foi a galinha mais feliz da sala!'
        : 'Boa, ' + state.player + '! Você ficou em ' + meu + 'º lugar na sala.';
      renderPlacarSala(el.rankSala, placar);
      el.overRanking.classList.add('hidden');
      el.overSala.classList.remove('hidden');
      el.btnAgain.classList.add('hidden');
      el.btnLobby.classList.remove('hidden');
    } else {
      var entry = {
        name: state.player, score: chicken.score, level: state.level,
        eggs: chicken.eggs, date: new Date().toISOString().slice(0, 10)
      };
      var list = saveRank(entry);
      var top = list.indexOf(entry);
      el.overLine.textContent = top === 0
        ? 'Uau, ' + state.player + '! Você é a galinha mais feliz de todas!'
        : (top > 0 ? 'Boa, ' + state.player + '! Você ficou em ' + (top + 1) + 'º lugar.'
                   : 'Boa tentativa, ' + state.player + '!');
      renderRank(el.rank2, list, top >= 0 ? list[top] : null);
      el.overRanking.classList.remove('hidden');
      el.overSala.classList.add('hidden');
      el.btnAgain.classList.remove('hidden');
      el.btnLobby.classList.add('hidden');
    }
    fitStage();
  }

  function backToMenu() {
    Rede.sairDaPartida();
    state.screen = 'start';
    eggs.clear(); chicks.length = 0; parts.length = 0; texts.length = 0; fox = null;
    el.over.classList.add('hidden');
    el.overlay.classList.add('hidden');
    el.hud.classList.add('hidden');
    el.start.classList.remove('hidden');
    fitStage();
    chooseLayout();
    renderRank(el.rank1, loadRank(), null);
  }

  // -------------------------------------------------------- Atualizacao ------
  function multiplier(g) { return Math.min(5, 1 + Math.floor((g || chicken).streak / 10)); }

  /**
   * Move UMA galinha a partir da entrada dela. Nao importa se a entrada veio
   * do mouse aqui do lado ou do tablet do primo: e o mesmo caminho.
   */
  function moveGalinha(g, dt, live) {
    var sp = rules.chickenSpeed(live ? state.level : 1);
    var dx = g.entrada.dx, dy = g.entrada.dy;

    if (dx || dy) {
      var m = Math.sqrt(dx * dx + dy * dy);
      g.x += (dx / m) * sp * dt;
      g.y += (dy / m) * sp * dt;
      g.moving = true;
      if (dx) g.dir = dx > 0 ? 1 : -1;
    } else if (live && !g.entrada.tem) {
      g.moving = false;                    // jogando, mas sem mouse/toque ainda
    } else {
      // alvo: o que o jogador apontou ou, na tela inicial, o piloto automatico
      var tx, ty;
      if (live) { tx = g.entrada.ax; ty = g.entrada.ay; }
      else {
        demoTarget.t -= dt;
        if (demoTarget.t <= 0) {
          demoTarget.t = rand(0.9, 2.0);
          demoTarget.x = rand(GX + 30, GX + GRID_W - 30);
          demoTarget.y = rand(GY + 30, GY + GRID_H - 30);
        }
        tx = demoTarget.x; ty = demoTarget.y;
      }
      var vx = tx - g.x, vy = ty - g.y, d = Math.sqrt(vx * vx + vy * vy);
      if (d > 3) {
        var step = Math.min(d, sp * dt);
        g.x += (vx / d) * step;
        g.y += (vy / d) * step;
        g.moving = true;
        if (Math.abs(vx) > 4) g.dir = vx > 0 ? 1 : -1;
      } else {
        g.moving = false;
      }
    }

    g.x = clamp(g.x, GX + 20, GX + GRID_W - 20);
    g.y = clamp(g.y, GY + 22, GY + GRID_H - 18);
    if (g.moving) g.walk += dt * 9;
    if (g.cluck > 0) g.cluck -= dt;
  }

  function layTick(g, dt, live) {
    var interval = live ? rules.layInterval(state.level) : 1.1;
    g.lay += dt;
    if (g.lay < interval) return;
    g.lay = 0;

    var c = cellCol(g.x), r = cellRow(g.y), k = r * COLS + c;

    if (eggs.has(k)) {                       // lugar ja ocupado: nao vale
      if (live) {
        g.streak = 0;
        floatText(g.x, g.y - 46, 'Ops! Já tem ovo', '#ffd3e3');
        Rede.evento(EV.OPS, g.x, g.y, g.indice, 0);
        if (g === chicken) Sfx.fail();
      }
      return;
    }

    var e = {
      c: c, r: r, x: cellCX(c), y: cellCY(r) + 6,
      age: 0, hatchAt: rules.hatchTime(live ? state.level : 1), pop: 1,
      tilt: rand(-0.18, 0.18), dono: g.indice
    };
    eggs.set(k, e);
    puff(e.x, e.y, '#ffffff', 5);
    g.cluck = 0.75;

    if (!live) return;                       // demo da tela inicial: sem som/pontos
    if (g === chicken) { Sfx.cluck(); Sfx.egg(); }

    g.streak++;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    var mult = multiplier(g);
    var pontos = 10 * mult;
    g.score += pontos;
    g.eggs++;
    state.eggsLevel++;
    floatText(e.x, e.y - 34, '+' + pontos + (mult > 1 ? ' x' + mult : ''), '#ffd23f');
    Rede.evento(EV.OVO, e.x, e.y, g.indice, pontos);

    if (state.eggsLevel >= metaOvos()) levelUp();
  }

  function spawnChick(x, y) {
    var side = pick(['l', 'r', 'u', 'd']);
    var tx = side === 'l' ? -60 : side === 'r' ? W + 60 : x;
    var ty = side === 'u' ? -60 : side === 'd' ? H + 60 : y;
    var vx = tx - x, vy = ty - y, d = Math.sqrt(vx * vx + vy * vy) || 1;
    var sp = rand(70, 120);
    chicks.push({ x: x, y: y, vx: (vx / d) * sp, vy: (vy / d) * sp, t: rand(0, 6), dir: vx > 0 ? 1 : -1 });
  }

  function updateEggs(dt, live) {
    var hatched = [];
    eggs.forEach(function (e, k) {
      e.age += dt;
      if (e.pop > 0) e.pop = Math.max(0, e.pop - dt * 4);
      if (e.age >= e.hatchAt) hatched.push(k);
    });
    hatched.forEach(function (k) {
      var e = eggs.get(k);
      eggs.delete(k);
      spawnChick(e.x, e.y);
      puff(e.x, e.y, '#fffdf7', 7);
      if (live) {
        var dono = galinhaPorIndice(e.dono) || chicken;
        dono.score += 5;
        if (dono === chicken) Sfx.hatch();
        floatText(e.x, e.y - 30, '+5 piu!', '#fffdf7');
        Rede.evento(EV.CHOCO, e.x, e.y, e.dono, 5);
      }
    });
  }

  function updateChicks(dt) {
    for (var i = chicks.length - 1; i >= 0; i--) {
      var ch = chicks[i];
      ch.t += dt;
      ch.x += ch.vx * dt;
      ch.y += ch.vy * dt;
      if (ch.x < -80 || ch.x > W + 80 || ch.y < -80 || ch.y > H + 80) chicks.splice(i, 1);
    }
  }

  function spawnFox() {
    if (eggs.size < 4) return;
    var side = pick(['l', 'r', 'u', 'd']);
    var x = side === 'l' ? -50 : side === 'r' ? W + 50 : rand(60, W - 60);
    var y = side === 'u' ? -50 : side === 'd' ? H + 50 : rand(60, H - 60);
    fox = { x: x, y: y, homeX: x, homeY: y, state: 'hunt', key: null, dir: 1, t: 0, carrying: false };
    pickFoxTarget();
    floatText(clamp(x, 60, W - 60), clamp(y, 40, H - 40), 'A raposa!', '#ef5b5b');
  }

  function pickFoxTarget() {
    if (!eggs.size) { fox.state = 'flee'; return; }
    var arr = Array.from(eggs.keys());
    fox.key = pick(arr);
  }

  function updateFox(dt) {
    foxTimer -= dt;
    if (!fox && foxTimer <= 0) {
      spawnFox();
      foxTimer = rules.foxInterval(state.level);
      if (!fox) foxTimer = 3;               // sem ovos suficientes: tenta de novo
    }
    if (!fox) return;

    fox.t += dt;
    var sp = rules.foxSpeed(state.level);
    var tx, ty;

    if (fox.state === 'hunt') {
      var e = eggs.get(fox.key);
      if (!e) { pickFoxTarget(); e = eggs.get(fox.key); }
      if (!e) { fox.state = 'flee'; }
      else {
        tx = e.x; ty = e.y;
        if (dist(fox.x, fox.y, tx, ty) < 16) {   // roubou!
          eggs.delete(fox.key);
          fox.state = 'flee';
          fox.carrying = true;
          var dono = galinhaPorIndice(e.dono) || chicken;
          dono.score = Math.max(0, dono.score - 25);
          dono.streak = 0;
          state.eggsLevel = Math.max(0, state.eggsLevel - 1);
          floatText(e.x, e.y - 30, '-25 roubou!', '#ef5b5b');
          puff(e.x, e.y, '#ef5b5b', 10);
          shake(10);
          if (dono === chicken) Sfx.steal();
          Rede.evento(EV.ROUBO, e.x, e.y, e.dono, 25);
        }
      }
      // qualquer galinha pode enxotar a raposa - o ponto e de quem chegou perto
      if (fox.state === 'hunt') {
        for (var gi = 0; gi < galinhas.length; gi++) {
          var g = galinhas[gi];
          if (dist(g.x, g.y, fox.x, fox.y) >= 44) continue;
          fox.state = 'flee';
          g.score += 30;
          floatText(fox.x, fox.y - 34, 'Xô! +30', '#8ed26a');
          puff(fox.x, fox.y, '#ffd23f', 10);
          if (g === chicken) Sfx.scare();
          shake(5);
          Rede.evento(EV.XO, fox.x, fox.y, g.indice, 30);
          break;
        }
      }
    }

    if (fox.state === 'flee') { tx = fox.homeX; ty = fox.homeY; }

    if (tx !== undefined) {
      var vx = tx - fox.x, vy = ty - fox.y, d = Math.sqrt(vx * vx + vy * vy) || 1;
      fox.x += (vx / d) * sp * dt;
      fox.y += (vy / d) * sp * dt;
      if (Math.abs(vx) > 3) fox.dir = vx > 0 ? 1 : -1;
    }
    if (fox.state === 'flee' && dist(fox.x, fox.y, fox.homeX, fox.homeY) < 12) fox = null;
  }

  function updateFx(dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 260 * dt; p.vx *= 0.98;
      p.rot += p.spin * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) {
      var t = texts[i];
      t.life -= dt * 0.9;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life <= 0) texts.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  }

  function update(dt) {
    var live = state.screen === 'playing';
    if (live) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) { state.timeLeft = 0; updateFx(dt); gameOver(); return; }
    }
    lerEntradaLocal();
    for (var i = 0; i < galinhas.length; i++) {
      moveGalinha(galinhas[i], dt, live);
      layTick(galinhas[i], dt, live);
    }
    updateEggs(dt, live);
    updateChicks(dt);
    if (live) updateFox(dt);
    updateFx(dt);
    if (live) syncHud(false);

    // No modo demo o terreiro nao pode lotar
    if (!live && eggs.size > 34) {
      var k = eggs.keys().next().value;
      var e = eggs.get(k); eggs.delete(k); spawnChick(e.x, e.y);
    }
  }

  // ---------------------------------------------------------------- HUD ------
  var hudCache = {};
  function syncHud(force) {
    function set(key, node, value) {
      if (force || hudCache[key] !== value) { hudCache[key] = value; node.textContent = value; }
    }
    var meta = metaOvos();
    set('score', el.score, chicken.score);
    set('level', el.level, state.level);
    set('eggs', el.eggs, state.eggsLevel + ' / ' + meta);
    set('time', el.time, Math.ceil(state.timeLeft) + 's');

    var m = multiplier(chicken);
    if (force || hudCache.combo !== m) {
      hudCache.combo = m;
      el.combo.textContent = 'x' + m;
      el.comboBox.classList.toggle('hot', m > 1);
    }
    if (state.rede) Rede.atualizarPlacar(force);
    el.barEggs.style.width = (state.eggsLevel / meta * 100) + '%';
    var tp = state.timeLeft / rules.levelTime(state.level);
    el.barTime.style.width = (tp * 100) + '%';
    el.barTime.classList.toggle('low', tp < 0.2);
  }

  // ------------------------------------------------------------ Desenho ------
  function ellipse(x, y, rx, ry, fill, stroke, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.restore();
  }
  function shadowBlob(x, y, rx, ry) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#1d3b14';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawField() {
    // grama de fundo
    ctx.fillStyle = '#8ed26a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#84c962';
    for (var y = 0; y < H; y += 26) ctx.fillRect(0, y, W, 13);

    // tabuleiro dos "lugares"
    ctx.save();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(GX + c * CELL, GY + r * CELL, CELL, CELL);
      }
    }
    ctx.strokeStyle = 'rgba(58,43,38,.16)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= COLS; i++) {
      ctx.beginPath(); ctx.moveTo(GX + i * CELL, GY); ctx.lineTo(GX + i * CELL, GY + GRID_H); ctx.stroke();
    }
    for (var j = 0; j <= ROWS; j++) {
      ctx.beginPath(); ctx.moveTo(GX, GY + j * CELL); ctx.lineTo(GX + GRID_W, GY + j * CELL); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(58,43,38,.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(GX, GY, GRID_W, GRID_H);
    ctx.restore();

    // grama alta e florzinhas na moldura
    decor.forEach(function (d) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.s, d.s);
      if (d.kind === 'tuft') {
        ctx.strokeStyle = '#6fb44e';
        ctx.lineWidth = 3;
        for (var k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 5, 6);
          ctx.quadraticCurveTo(k * 9, -4, k * 12, -12);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = '#6fb44e';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -2); ctx.stroke();
        ctx.fillStyle = d.color;
        for (var p = 0; p < 5; p++) {
          var a = p / 5 * Math.PI * 2;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 5, -4 + Math.sin(a) * 5, 3.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(0, -4, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawCellHint() {
    var c = cellCol(chicken.x), r = cellRow(chicken.y);
    var occupied = eggs.has(r * COLS + c);
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = occupied ? 'rgba(239,91,91,.9)' : 'rgba(255,255,255,.95)';
    ctx.fillStyle = occupied ? 'rgba(239,91,91,.16)' : 'rgba(255,255,255,.22)';
    var x = GX + c * CELL + 3, y = GY + r * CELL + 3, s = CELL - 6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, s, s, 10); else ctx.rect(x, y, s, s);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawEgg(e) {
    var life = e.age / e.hatchAt;
    var wob = life > 0.7 ? Math.sin(state.t * 22 + e.x) * 0.22 * ((life - 0.7) / 0.3) : 0;
    var s = 1 + e.pop * 0.45;

    shadowBlob(e.x, e.y + 15, 13 * s, 5 * s);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.tilt + wob);
    ctx.scale(s, s * (1 - e.pop * 0.15));

    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.bezierCurveTo(11, -19, 15, -4, 15, 3);
    ctx.bezierCurveTo(15, 14, 8, 19, 0, 19);
    ctx.bezierCurveTo(-8, 19, -15, 14, -15, 3);
    ctx.bezierCurveTo(-15, -4, -11, -19, 0, -19);
    ctx.closePath();
    ctx.fillStyle = '#fff6e2';
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-5, -6, 3.4, 5.4, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();

    // Em grupo, uma fitinha na cor de quem botou o ovo.
    if (galinhas.length > 1) {
      var dono = galinhaPorIndice(e.dono);
      if (dono) {
        ctx.beginPath();
        ctx.moveTo(-13, 8); ctx.lineTo(13, 8);
        ctx.lineWidth = 5; ctx.strokeStyle = dono.cor; ctx.stroke();
      }
    }

    if (life > 0.7) {                       // rachaduras: vai chocar
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, -2); ctx.lineTo(-5, 2); ctx.lineTo(-8, 6); ctx.lineTo(-1, 9);
      ctx.stroke();
      if (life > 0.88) {
        ctx.beginPath();
        ctx.moveTo(11, -4); ctx.lineTo(5, 0); ctx.lineTo(9, 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawChick(ch) {
    var hop = Math.abs(Math.sin(ch.t * 9)) * 5;
    shadowBlob(ch.x, ch.y + 12, 10, 4);
    ctx.save();
    ctx.translate(ch.x, ch.y - hop);
    ctx.scale(ch.dir >= 0 ? 1 : -1, 1);

    ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-3, 13 + hop * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(4, 13 + hop * 0.6); ctx.stroke();

    ellipse(0, 1, 11, 10, '#ffd23f');
    ellipse(6, -9, 8, 7.5, '#ffd23f');
    ctx.beginPath();
    ctx.moveTo(12, -10); ctx.lineTo(19, -8); ctx.lineTo(12, -5); ctx.closePath();
    ctx.fillStyle = '#ff9f43'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -11, 1.9, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(-2, 2, 5, -0.6, 1.6); ctx.strokeStyle = '#e8ae1f'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }

  function drawFox(f) {
    var bob = Math.sin(f.t * 12) * 2;
    shadowBlob(f.x, f.y + 18, 24, 7);
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.scale(f.dir >= 0 ? 1 : -1, 1);

    // rabo
    ctx.save();
    ctx.translate(-24, -2);
    ctx.rotate(Math.sin(f.t * 8) * 0.2 - 0.3);
    ellipse(-10, 0, 15, 8, '#e8763a');
    ellipse(-22, -2, 6, 5, '#fffdf7');
    ctx.restore();

    // patas
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    [-12, -2, 8, 16].forEach(function (px, i) {
      ctx.beginPath();
      ctx.moveTo(px, 8);
      ctx.lineTo(px + Math.sin(f.t * 12 + i) * 3, 20);
      ctx.stroke();
    });

    ellipse(0, 0, 25, 15, '#e8763a');       // corpo
    ellipse(20, -10, 13, 12, '#e8763a');    // cabeca

    // orelhas
    [[14, -20, -0.3], [26, -19, 0.25]].forEach(function (o) {
      ctx.save(); ctx.translate(o[0], o[1]); ctx.rotate(o[2]);
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(0, -12); ctx.lineTo(6, 4); ctx.closePath();
      ctx.fillStyle = '#c85c28'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    });

    // focinho
    ctx.beginPath();
    ctx.moveTo(28, -14); ctx.lineTo(44, -8); ctx.lineTo(28, -2); ctx.closePath();
    ctx.fillStyle = '#fffdf7'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(44, -8, 2.8, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(24, -14, 2.6, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();

    if (f.carrying) {                        // fugindo com o ovo na boca
      ctx.save(); ctx.translate(36, 2); ctx.rotate(0.4);
      ellipse(0, 0, 8, 10, '#fff6e2');
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGalinha(g) {
    var x = g.x, y = g.y;
    var euMesmo = g === chicken;
    var emGrupo = galinhas.length > 1;
    var bob = g.moving ? Math.sin(g.walk * 2) * 2.5 : Math.sin(state.t * 3) * 1.2;
    var swing = g.moving ? Math.sin(g.walk * 2) * 6 : 0;

    // anel dourado: quanto falta para o proximo ovo
    var live = state.screen !== 'start';
    var interval = live ? rules.layInterval(state.level) : 1.1;
    var p = clamp(g.lay / interval, 0, 1);
    ctx.save();
    ctx.globalAlpha = euMesmo ? 1 : 0.55;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(x, y + 16, 31, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = p > 0.85 ? '#ffffff' : '#ffd23f';
    ctx.beginPath(); ctx.arc(x, y + 16, 31, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    ctx.restore();

    shadowBlob(x, y + 24, 28, 9);

    // Em grupo, cada galinha pisa num tapetinho da cor dela.
    if (emGrupo) {
      ctx.save();
      ctx.lineWidth = euMesmo ? 5 : 3.5;
      ctx.strokeStyle = g.cor;
      ctx.beginPath();
      ctx.ellipse(x, y + 24, 26, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(g.dir, 1);

    // pernas
    ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 4;
    [[-8, swing], [8, -swing]].forEach(function (leg) {
      ctx.beginPath();
      ctx.moveTo(leg[0], 16);
      ctx.lineTo(leg[0] + leg[1] * 0.4, 27);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(leg[0] + leg[1] * 0.4 - 6, 28);
      ctx.lineTo(leg[0] + leg[1] * 0.4, 27);
      ctx.lineTo(leg[0] + leg[1] * 0.4 + 6, 28);
      ctx.stroke();
    });

    // cauda
    ctx.save();
    ctx.translate(-24, -8);
    [0, 1, 2].forEach(function (i) {
      ctx.save();
      ctx.rotate(-0.5 - i * 0.32);
      ctx.beginPath();
      ctx.ellipse(-10, 0, 12, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === 1 ? '#f4efe2' : '#fffdf7';
      ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    ellipse(0, 0, 29, 25, '#fffdf7');          // corpo

    // asa
    ctx.save();
    ctx.translate(2, 2);
    ctx.rotate(g.moving ? Math.sin(g.walk * 2) * 0.22 : 0.05);
    ellipse(0, 0, 14, 11, '#f4efe2');
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-2, 2, 8, -0.4, 1.4); ctx.stroke();
    ctx.restore();

    ellipse(15, -23, 16, 15, '#fffdf7');       // cabeca

    // crista
    [[8, -37, 6], [15, -41, 7], [22, -37, 6]].forEach(function (o) {
      ctx.beginPath(); ctx.arc(o[0], o[1], o[2], 0, Math.PI * 2);
      ctx.fillStyle = '#ef5b5b'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    });

    // bico
    ctx.beginPath();
    ctx.moveTo(28, -25); ctx.lineTo(42, -20); ctx.lineTo(28, -15); ctx.closePath();
    ctx.fillStyle = '#ff9f43'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();

    ellipse(26, -10, 5, 6, '#ef5b5b');         // barbela

    // olho
    ellipse(19, -27, 6.5, 7, '#ffffff');
    ctx.beginPath(); ctx.arc(21, -27, 3.2, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(22.4, -28.6, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();

    ctx.save();                                 // bochecha
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(10, -17, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#f47ba7'; ctx.fill();
    ctx.restore();

    ctx.restore();

    // balaozinho "Co!"
    if (g.cluck > 0) {
      var a = Math.min(1, g.cluck / 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      var bx = x + g.dir * 34, by = y - 58;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx - 26, by - 16, 52, 30, 12);
      else ctx.rect(bx - 26, by - 16, 52, 30);
      ctx.fillStyle = '#fffdf7'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 6, by + 12); ctx.lineTo(bx - 2, by + 22); ctx.lineTo(bx + 6, by + 12);
      ctx.closePath(); ctx.fillStyle = '#fffdf7'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
      ctx.fillText('Có!', bx, by);
      ctx.restore();
    }

    // Em grupo, a plaquinha com o nome de quem controla esta galinha.
    if (emGrupo && g.apelido) {
      ctx.save();
      ctx.font = 'bold 13px "Comic Sans MS", sans-serif';
      var largura = ctx.measureText(g.apelido).width + 16;
      var ty = y - 46;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - largura / 2, ty - 10, largura, 20, 10);
      else ctx.rect(x - largura / 2, ty - 10, largura, 20);
      ctx.fillStyle = g.cor; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(g.apelido, x, ty);
      ctx.restore();
    }
  }

  function drawFx() {
    parts.forEach(function (p) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    texts.forEach(function (t) {
      ctx.save();
      ctx.globalAlpha = clamp(t.life, 0, 1);
      ctx.font = 'bold 22px "Comic Sans MS", sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = INK;
      ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
      ctx.restore();
    });
  }

  function drawFrame() {
    // cerquinha de madeira ao redor do terreiro
    ctx.save();
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    }
    drawField();
    if (state.screen === 'playing' || state.screen === 'start') drawCellHint();

    eggs.forEach(drawEgg);
    chicks.forEach(drawChick);
    if (fox) drawFox(fox);
    // as outras galinhas primeiro; a minha fica sempre por cima
    galinhas.forEach(function (g) { if (g !== chicken) drawGalinha(g); });
    drawGalinha(chicken);
    drawFx();
    drawFrame();
    ctx.restore();
  }

  // ------------------------------------------------------------- Loop --------
  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;

    var convidado = state.rede && state.rede.papel === 'convidado';

    if (state.screen === 'playing' || state.screen === 'start') {
      // O convidado nao simula o mundo: ele obedece ao que o anfitriao manda.
      if (convidado && state.screen === 'playing') Rede.passoConvidado(dt);
      else update(dt);
    } else if (state.screen === 'levelup') {
      updateFx(dt);
      updateChicks(dt);
      if (convidado) Rede.passoConvidado(dt, true);
      state.overlayT -= dt;
      if (state.overlayT <= 0) {
        el.overlay.classList.add('hidden');
        state.screen = 'playing';
      }
    }

    Rede.passoRede(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ==========================================================================
     REDE  -  o jogo em grupo, em cima da Plataforma
     --------------------------------------------------------------------------
     Modelo: o ANFITRIAO simula o terreiro inteiro (o mesmo `update()` de
     sempre) e manda o mundo pronto ~20x por segundo. Os CONVIDADOS mandam so
     o que estao pedindo (para onde a galinha deve ir) e desenham o que chega.

     Por que assim: um so lugar decide quem pegou o quadradinho primeiro, entao
     nunca acontece de dois jogadores acharem que botaram o ovo no mesmo lugar.
     ========================================================================== */
  var Rede = (function () {
    var P = null;            // window.Plataforma, depois de iniciar()
    var mj = null;           // Plataforma.multijogador
    var placarCache = '';

    var TAXA_ENTRADA = 20;   // envios de entrada por segundo (convidado)

    // ------------------------------------------------------------- ajudas --
    function souAnfitriao() { return state.rede && state.rede.papel === 'anfitriao'; }
    function souConvidado() { return state.rede && state.rede.papel === 'convidado'; }

    function montarGalinhas(sala) {
      galinhas = sala.jogadores.map(function (j) {
        return novaGalinha({ id: j.id, indice: j.indice, apelido: j.apelido, cor: corSegura(j.cor) });
      });
      chicken = galinhas.filter(function (g) { return g.id === sala.eu; })[0] || galinhas[0];
    }

    function galinhaPorId(id) {
      for (var i = 0; i < galinhas.length; i++) if (galinhas[i].id === id) return galinhas[i];
      return null;
    }

    // -------------------------------------------------- comeco/fim de sala --
    function comecar(sala) {
      state.rede = {
        papel: sala.souAnfitriao ? 'anfitriao' : 'convidado',
        sala: sala,
        seq: 0,
        eventos: [],
        acumulado: 0,
        acumuladoEntrada: 0,
        encerrando: false,
        ultimoPacote: 0,
        primeiroEstado: false
      };
      montarGalinhas(sala);
      state.player = chicken.apelido;
      el.input.value = chicken.apelido;
      placarCache = '';
      el.mpCode.textContent = sala.codigo;
      startGame(chicken.apelido);
    }

    function terminar(fim) {
      if (!state.rede) return;
      var sala = state.rede.sala;
      var placar = (fim && fim.placar ? fim.placar : placarLocal()).map(function (p) {
        return {
          id: p.id, apelido: p.apelido, cor: corSegura(p.cor),
          score: p.score | 0, eggs: p.eggs | 0, eu: p.id === sala.eu
        };
      });
      gameOver(placar);
    }

    function abortar(aviso) {
      if (!state.rede) return;
      state.rede = null;
      galinhas = [chicken];
      chicken.indice = 0;
      el.mpBoard.classList.add('hidden');
      state.screen = 'over';        // deixa o backToMenu limpar tudo
      backToMenu();
      el.tip.textContent = aviso && aviso.motivo ? aviso.motivo : 'A partida foi encerrada.';
    }

    function placarLocal() {
      return galinhas.map(function (g) {
        return { id: g.id, apelido: g.apelido, cor: g.cor, score: g.score, eggs: g.eggs };
      }).sort(function (a, b) { return b.score - a.score; });
    }

    // --------------------------------------------------------- instantaneo --
    /** O mundo inteiro num pacote pequeno (numeros inteiros sempre que da). */
    function montarEstado() {
      var g = galinhas.map(function (x) {
        return [x.indice, x.x | 0, x.y | 0, x.dir, x.moving ? 1 : 0,
                (clamp(x.lay / rules.layInterval(state.level), 0, 1) * 100) | 0,
                (x.cluck * 100) | 0];
      });

      var o = [];
      eggs.forEach(function (e, k) {
        o.push([k, (clamp(e.age / e.hatchAt, 0, 1) * 100) | 0, (e.hatchAt * 10) | 0, e.dono]);
      });

      var s = galinhas.map(function (x) { return [x.indice, x.score, x.eggs, x.streak]; });

      var pacote = {
        k: 'e',
        n: ++state.rede.seq,
        c: COLS,
        f: state.level,
        tl: (state.timeLeft * 10) | 0,
        el: state.eggsLevel,
        mt: metaOvos(),
        g: g, o: o, s: s,
        r: fox ? [fox.x | 0, fox.y | 0, fox.dir, fox.carrying ? 1 : 0] : 0,
        ev: state.rede.eventos
      };
      state.rede.eventos = [];
      return pacote;
    }

    /** O convidado copia o mundo que chegou por cima do que ele tinha. */
    function aplicarEstado(s) {
      // Pacote atrasado que chega depois do fim nao mexe mais em nada.
      if (!state.rede || (state.screen !== 'playing' && state.screen !== 'levelup')) return;
      state.rede.primeiroEstado = true;
      state.rede.ultimoPacote = state.t;

      // O tabuleiro e sempre o do anfitriao - senao os quadradinhos nao batem.
      if (s.c !== COLS) { aplicarLayout(s.c); fitStage(); }

      state.level = s.f;
      state.timeLeft = s.tl / 10;
      state.eggsLevel = s.el;

      // galinhas
      s.g.forEach(function (linha) {
        var g = galinhaPorIndice(linha[0]);
        if (!g) return;
        var alvoX = linha[1], alvoY = linha[2];
        if (g === chicken) {
          // A minha galinha eu ja movo aqui na hora (fica leve no dedo); so
          // corrijo o rumo se estiver longe do que o anfitriao viu.
          var erro = dist(g.x, g.y, alvoX, alvoY);
          if (erro > 90) { g.x = alvoX; g.y = alvoY; }
          else { g.x += (alvoX - g.x) * 0.25; g.y += (alvoY - g.y) * 0.25; }
        } else {
          g.redeX = alvoX; g.redeY = alvoY;
          g.dir = linha[3];
          g.moving = linha[4] === 1;
        }
        g.lay = (linha[5] / 100) * rules.layInterval(state.level);
        g.cluck = linha[6] / 100;
      });

      // pontos
      s.s.forEach(function (linha) {
        var g = galinhaPorIndice(linha[0]);
        if (!g) return;
        g.score = linha[1]; g.eggs = linha[2]; g.streak = linha[3];
      });

      // ovos: mantem os que ja existiam (para nao perder a animacao de "pop")
      var novos = new Map();
      s.o.forEach(function (linha) {
        var k = linha[0], frac = linha[1] / 100, hatchAt = linha[2] / 10, dono = linha[3];
        var e = eggs.get(k);
        if (!e) {
          var c = k % COLS, r = (k - c) / COLS;
          e = { c: c, r: r, x: cellCX(c), y: cellCY(r) + 6, pop: 1, tilt: rand(-0.18, 0.18) };
        }
        e.hatchAt = hatchAt || 6;
        e.age = frac * e.hatchAt;
        e.dono = dono;
        novos.set(k, e);
      });
      eggs = novos;

      // raposa
      if (s.r) {
        if (!fox) fox = { x: s.r[0], y: s.r[1], dir: s.r[2], state: 'hunt', t: 0, carrying: false };
        fox.x = s.r[0]; fox.y = s.r[1]; fox.dir = s.r[2]; fox.carrying = s.r[3] === 1;
      } else {
        fox = null;
      }

      (s.ev || []).forEach(aplicarEvento);
      syncHud(false);
    }

    /** Sons, poeirinha e textos: o convidado refaz o efeito no lugar certo. */
    function aplicarEvento(ev) {
      var k = ev[0], x = ev[1], y = ev[2], i = ev[3], v = ev[4];
      var meu = chicken.indice === i;

      if (k === EV.OVO) {
        puff(x, y, '#ffffff', 5);
        floatText(x, y - 34, '+' + v, '#ffd23f');
        if (meu) { Sfx.cluck(); Sfx.egg(); }
      } else if (k === EV.CHOCO) {
        spawnChick(x, y);
        puff(x, y, '#fffdf7', 7);
        floatText(x, y - 30, '+5 piu!', '#fffdf7');
        if (meu) Sfx.hatch();
      } else if (k === EV.OPS) {
        floatText(x, y - 46, 'Ops! Já tem ovo', '#ffd3e3');
        if (meu) Sfx.fail();
      } else if (k === EV.ROUBO) {
        puff(x, y, '#ef5b5b', 10);
        floatText(x, y - 30, '-' + v + ' roubou!', '#ef5b5b');
        shake(10);
        if (meu) Sfx.steal();
      } else if (k === EV.XO) {
        puff(x, y, '#ffd23f', 10);
        floatText(x, y - 34, 'Xô! +' + v, '#8ed26a');
        shake(5);
        if (meu) Sfx.scare();
      } else if (k === EV.FASE) {
        avisoDeFase(i, v);
      }
    }

    // ------------------------------------------------------------- placar --
    function atualizarPlacar(force) {
      var lista = placarLocal();
      var assinatura = lista.map(function (p) { return p.id + ':' + p.score; }).join('|');
      if (!force && assinatura === placarCache) return;
      placarCache = assinatura;

      el.mpList.innerHTML = '';
      lista.forEach(function (p) {
        var li = document.createElement('li');
        if (p.id === chicken.id) li.className = 'me';
        li.innerHTML =
          '<span class="dot" style="background:' + corSegura(p.cor) + '"></span>' +
          '<span class="who"></span><span class="pts">' + p.score + '</span>';
        li.querySelector('.who').textContent = p.apelido;
        el.mpList.appendChild(li);
      });
    }

    function mostrarPlacar() {
      var mostrar = Boolean(state.rede);
      el.mpBoard.classList.toggle('hidden', !mostrar);
      if (mostrar) { el.mpCode.textContent = state.rede.sala.codigo; atualizarPlacar(true); }
    }

    // ---------------------------------------------------------- por quadro --
    /** Envia o que precisa ser enviado neste quadro. */
    function passoRede(dt) {
      if (!state.rede || (state.screen !== 'playing' && state.screen !== 'levelup')) return;
      var taxa = state.rede.sala.taxaEstado || 15;

      if (souAnfitriao()) {
        state.rede.acumulado += dt;
        if (state.rede.acumulado >= 1 / taxa) { state.rede.acumulado = 0; enviarEstado(); }
        return;
      }

      state.rede.acumuladoEntrada += dt;
      if (state.rede.acumuladoEntrada < 1 / TAXA_ENTRADA) return;
      state.rede.acumuladoEntrada = 0;
      lerEntradaLocal();
      mj.paraAnfitriao({
        k: 'i',
        ax: chicken.entrada.ax | 0, ay: chicken.entrada.ay | 0,
        dx: chicken.entrada.dx, dy: chicken.entrada.dy,
        tem: chicken.entrada.tem ? 1 : 0
      });

      // Sem noticias do anfitriao ha muito tempo: avisa na tela.
      var mudo = state.t - state.rede.ultimoPacote;
      el.mpNet.textContent = state.rede.primeiroEstado && mudo > 2 ? 'Conexão instável…' : '';
    }

    function enviarEstado() {
      if (!souAnfitriao() || !mj) return;
      mj.enviar(montarEstado());
    }

    /**
     * O quadro do convidado: ele nao simula o terreiro, mas move a propria
     * galinha na hora (para o dedo nao ficar "molenga") e desliza as outras
     * ate onde o anfitriao disse que elas estao.
     */
    function passoConvidado(dt, soEfeitos) {
      if (!soEfeitos) {
        state.timeLeft = Math.max(0, state.timeLeft - dt);
        lerEntradaLocal();
        moveGalinha(chicken, dt, true);
      }

      galinhas.forEach(function (g) {
        if (g === chicken || g.redeX == null) return;
        var f = Math.min(1, dt * 14);
        g.x += (g.redeX - g.x) * f;
        g.y += (g.redeY - g.y) * f;
        if (g.moving) g.walk += dt * 9;
        if (g.cluck > 0) g.cluck -= dt;
      });

      // o anel dourado continua girando entre um pacote e outro
      galinhas.forEach(function (g) { g.lay += dt; });

      updateChicks(dt);
      updateFx(dt);
      syncHud(false);
    }

    // ------------------------------------------------------- entrada remota --
    function receber(msg) {
      var d = msg.d;
      if (!d || !state.rede) return;

      if (d.k === 'i' && souAnfitriao()) {
        var g = galinhaPorId(msg.de);
        if (!g) return;
        g.entrada.ax = clamp(Number(d.ax) || 0, 0, W);
        g.entrada.ay = clamp(Number(d.ay) || 0, 0, H);
        g.entrada.dx = clamp(Number(d.dx) || 0, -1, 1);
        g.entrada.dy = clamp(Number(d.dy) || 0, -1, 1);
        g.entrada.tem = d.tem === 1;
        return;
      }

      if (d.k === 'e' && souConvidado()) aplicarEstado(d);
    }

    /** Alguem fechou a aba no meio da partida. */
    function saiu(jogador) {
      var g = galinhaPorId(jogador.id);
      if (!g || !state.rede) return;
      floatText(g.x, g.y - 60, jogador.apelido + ' saiu', '#ffd3e3');
      galinhas = galinhas.filter(function (x) { return x !== g; });
      atualizarPlacar(true);
    }

    // ------------------------------------------------------------- ligacao --
    function iniciar(plataforma) {
      P = plataforma;
      mj = P.multijogador;
      if (!mj || !mj.disponivel) return false;

      mj.em('saiu', saiu);
      mj.em('erro', function (texto) { el.mpNet.textContent = texto; });

      el.btnFriends.classList.remove('hidden');
      el.btnFriends.addEventListener('click', abrirLobby);
      el.btnLobby.addEventListener('click', abrirLobby);
      return true;
    }

    function abrirLobby() {
      if (!mj) return;
      var nome = el.input.value.trim().replace(/\s+/g, ' ');
      if (nome) P.perfil.definirApelido(nome);
      Sfx.wake();
      mj.abrirLobby({
        aoComecar: comecar,
        aoReceber: receber,
        aoTerminar: terminar,
        aoAbortar: abortar,
        // No fim da partida quem manda na tela e o jogo (o placar da sala);
        // o lobby so volta quando a crianca clicar em "voltar para a sala".
        voltarAoLobby: false
      });
    }

    /** Volta a ser um jogo de um jogador so (sair da sala pelo menu). */
    function sairDaPartida() {
      if (!state.rede) return;
      state.rede = null;
      galinhas = [chicken];
      chicken.indice = 0;
      chicken.apelido = '';
      el.mpBoard.classList.add('hidden');
      if (mj) mj.sair();
    }

    return {
      iniciar: iniciar,
      passoRede: passoRede,
      passoConvidado: passoConvidado,
      enviarEstado: enviarEstado,
      atualizarPlacar: atualizarPlacar,
      mostrarPlacar: mostrarPlacar,
      placar: placarLocal,
      sairDaPartida: sairDaPartida,
      encerrarPartida: function (placar) { if (mj) mj.terminar(placar); },
      /** Guarda um efeito para mandar junto com o proximo pacote. */
      evento: function (k, x, y, i, v) {
        if (!souAnfitriao() || state.rede.eventos.length > 40) return;
        state.rede.eventos.push([k, x | 0, y | 0, i, v | 0]);
      }
    };
  }());

  // ------------------------------------------------------- Ligacoes UI ------
  el.form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = el.input.value.trim().replace(/\s+/g, ' ');
    if (!name) { el.input.focus(); return; }
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    Rede.sairDaPartida();          // "jogar sozinho" sai de qualquer sala
    startGame(name);
  });
  el.btnAgain.addEventListener('click', function () { startGame(state.player); });
  el.btnMenu.addEventListener('click', backToMenu);
  el.btnResume.addEventListener('click', togglePause);
  el.btnQuit.addEventListener('click', function () { state.screen = 'playing'; gameOver(); });
  el.btnPause.addEventListener('click', togglePause);
  el.btnSound.addEventListener('click', toggleSound);

  function toggleSound() {
    var on = Sfx.toggle();
    el.btnSound.textContent = on ? '🔊' : '🔇';
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.screen === 'playing') togglePause();
  });

  // ------------------------------------------------------------- Boot -------
  try {
    var lastName = localStorage.getItem(NAME_KEY);
    if (lastName) el.input.value = lastName;
  } catch (e) {}
  chooseLayout();
  fitStage();
  renderRank(el.rank1, loadRank(), null);
  requestAnimationFrame(frame);

  // Plataforma: se estiver de pe, aparece o botao "Jogar com amigos". Se o
  // jogo for aberto solto (sem a Central), nada disso existe e o jogo roda
  // igualzinho de um jogador so.
  if (window.Plataforma) {
    window.Plataforma.iniciar({ jogo: 'galinha_feliz', apelido: el.input.value })
      .then(function (P) {
        if (!Rede.iniciar(P)) return;
        if (!el.input.value && P.perfil.apelido) el.input.value = P.perfil.apelido;
      })
      .catch(function (e) { console.warn('[galinha] plataforma fora do ar:', e); });
  }
}());
