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
    tip: $('tip')
  };

  // ------------------------------------------------------------- Estado ------
  var state = {
    screen: 'start',      // start | playing | paused | levelup | over
    player: '',
    score: 0, level: 1, eggsLevel: 0, eggsTotal: 0, streak: 0, bestStreak: 0,
    timeLeft: 0, t: 0, shake: 0, overlayT: 0
  };

  var chicken = { x: W / 2, y: H / 2, dir: 1, walk: 0, lay: 0, cluck: 0, moving: false };
  var eggs = new Map();          // chave: r * COLS + c
  var chicks = [];
  var fox = null;
  var foxTimer = 0;
  var parts = [];                // particulas (penas, poeira)
  var texts = [];                // textos flutuantes (+10, Ops!)
  var demoTarget = { x: W / 2, y: H / 2, t: 0 };

  var pointer = { x: W / 2, y: H / 2, has: false, touch: false, down: false };
  var keys = Object.create(null);

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
    swap(chicken);
    chicken.dir = 1;
    chicks.forEach(function (ch) { swap(ch); var t = ch.vx; ch.vx = ch.vy; ch.vy = t; });
    parts.forEach(function (p) { swap(p); var t = p.vx; p.vx = p.vy; p.vy = t; });
    texts.forEach(swap);
    decor.forEach(swap);
    swap(pointer);
    swap(demoTarget);
    if (fox) { swap(fox); var t = fox.homeX; fox.homeX = fox.homeY; fox.homeY = t; }

    chicken.x = clamp(chicken.x, GX + 20, GX + GRID_W - 20);
    chicken.y = clamp(chicken.y, GY + 22, GY + GRID_H - 18);
    chicken.lay = 0;            // folego apos girar o aparelho
  }

  // Deitado -> 13x8; em pe -> 8x13. Devolve true se a orientacao mudou.
  function chooseLayout() {
    var wantCols = window.innerHeight > window.innerWidth ? 8 : 13;
    if (wantCols === COLS) return false;
    COLS = wantCols;
    ROWS = wantCols === 8 ? 13 : 8;
    GRID_W = COLS * CELL; GRID_H = ROWS * CELL;
    W = GRID_W + MARGIN * 2; H = GRID_H + MARGIN * 2;
    transposeWorld();
    resizeCanvas();
    return true;
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

  // ------------------------------------------------------- Ciclo de jogo -----
  function startGame(name) {
    state.player = name;
    state.score = 0; state.level = 1; state.eggsLevel = 0; state.eggsTotal = 0;
    state.streak = 0; state.bestStreak = 0; state.shake = 0;
    state.timeLeft = rules.levelTime(1);
    eggs.clear(); chicks.length = 0; parts.length = 0; texts.length = 0;
    fox = null; foxTimer = rules.foxInterval(1);
    chicken.x = W / 2; chicken.y = H / 2; chicken.lay = 0; chicken.cluck = 0;

    el.name.textContent = name;
    el.hud.classList.remove('hidden');
    fitStage();
    el.start.classList.add('hidden');
    el.over.classList.add('hidden');
    el.overlay.classList.add('hidden');
    el.tip.textContent = 'Dica: fique de olho no anel dourado — quando ele completa, sai ovo!';
    state.screen = 'playing';
    syncHud(true);
    Sfx.wake();
  }

  function levelUp() {
    // Os ovos que sobraram no terreiro chocam de uma vez, como bonus.
    var bonus = 0;
    eggs.forEach(function (e) {
      bonus += 5;
      spawnChick(e.x, e.y);
      puff(e.x, e.y, '#ffffff', 4);
    });
    eggs.clear();
    state.score += bonus;

    state.level++;
    state.eggsLevel = 0;
    state.timeLeft = rules.levelTime(state.level);
    fox = null;
    foxTimer = rules.foxInterval(state.level);

    var msgs = [
      'Mais rápido agora!',
      'A Galinha Feliz está animada!',
      'Corra para lugares novos!',
      'Que galinha veloz!'
    ];
    el.ovTitle.textContent = 'Fase ' + state.level;
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

  function gameOver() {
    state.screen = 'over';
    Sfx.over();
    var entry = {
      name: state.player, score: state.score, level: state.level,
      eggs: state.eggsTotal, date: new Date().toISOString().slice(0, 10)
    };
    var list = saveRank(entry);
    var top = list.indexOf(entry);

    el.overScore.textContent = state.score;
    el.overLevel.textContent = state.level;
    el.overEggs.textContent = state.eggsTotal;
    el.overLine.textContent = top === 0
      ? 'Uau, ' + state.player + '! Você é a galinha mais feliz de todas!'
      : (top > 0 ? 'Boa, ' + state.player + '! Você ficou em ' + (top + 1) + 'º lugar.'
                 : 'Boa tentativa, ' + state.player + '!');
    renderRank(el.rank2, list, top >= 0 ? list[top] : null);
    el.overlay.classList.add('hidden');
    el.over.classList.remove('hidden');
    el.hud.classList.add('hidden');
    fitStage();
  }

  function backToMenu() {
    state.screen = 'start';
    eggs.clear(); chicks.length = 0; parts.length = 0; texts.length = 0; fox = null;
    el.over.classList.add('hidden');
    el.overlay.classList.add('hidden');
    el.hud.classList.add('hidden');
    el.start.classList.remove('hidden');
    fitStage();
    renderRank(el.rank1, loadRank(), null);
  }

  // -------------------------------------------------------- Atualizacao ------
  function multiplier() { return Math.min(5, 1 + Math.floor(state.streak / 10)); }

  function moveChicken(dt, live) {
    var sp = rules.chickenSpeed(live ? state.level : 1);
    var dx = 0, dy = 0;

    if (keys.l) dx -= 1;
    if (keys.r) dx += 1;
    if (keys.u) dy -= 1;
    if (keys.d) dy += 1;

    if (dx || dy) {
      var m = Math.sqrt(dx * dx + dy * dy);
      chicken.x += (dx / m) * sp * dt;
      chicken.y += (dy / m) * sp * dt;
      chicken.moving = true;
      if (dx) chicken.dir = dx > 0 ? 1 : -1;
    } else if (live && !pointer.has) {
      chicken.moving = false;              // jogando, mas sem mouse/toque ainda
    } else {
      // alvo: ponteiro (jogando) ou piloto automatico (tela inicial)
      var tx, ty;
      if (live) { tx = pointer.x; ty = pointer.y; }
      else {
        demoTarget.t -= dt;
        if (demoTarget.t <= 0) {
          demoTarget.t = rand(0.9, 2.0);
          demoTarget.x = rand(GX + 30, GX + GRID_W - 30);
          demoTarget.y = rand(GY + 30, GY + GRID_H - 30);
        }
        tx = demoTarget.x; ty = demoTarget.y;
      }
      var vx = tx - chicken.x, vy = ty - chicken.y, d = Math.sqrt(vx * vx + vy * vy);
      if (d > 3) {
        var step = Math.min(d, sp * dt);
        chicken.x += (vx / d) * step;
        chicken.y += (vy / d) * step;
        chicken.moving = true;
        if (Math.abs(vx) > 4) chicken.dir = vx > 0 ? 1 : -1;
      } else {
        chicken.moving = false;
      }
    }

    chicken.x = clamp(chicken.x, GX + 20, GX + GRID_W - 20);
    chicken.y = clamp(chicken.y, GY + 22, GY + GRID_H - 18);
    if (chicken.moving) chicken.walk += dt * 9;
    if (chicken.cluck > 0) chicken.cluck -= dt;
  }

  function layTick(dt, live) {
    var interval = live ? rules.layInterval(state.level) : 1.1;
    chicken.lay += dt;
    if (chicken.lay < interval) return;
    chicken.lay = 0;

    var c = cellCol(chicken.x), r = cellRow(chicken.y), k = r * COLS + c;

    if (eggs.has(k)) {                       // lugar ja ocupado: nao vale
      if (live) {
        state.streak = 0;
        floatText(chicken.x, chicken.y - 46, 'Ops! Já tem ovo', '#ffd3e3');
        Sfx.fail();
      }
      return;
    }

    var e = {
      c: c, r: r, x: cellCX(c), y: cellCY(r) + 6,
      age: 0, hatchAt: rules.hatchTime(live ? state.level : 1), pop: 1,
      tilt: rand(-0.18, 0.18)
    };
    eggs.set(k, e);
    puff(e.x, e.y, '#ffffff', 5);
    chicken.cluck = 0.75;

    if (!live) return;                       // demo da tela inicial: sem som/pontos
    Sfx.cluck(); Sfx.egg();

    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    var mult = multiplier();
    state.score += 10 * mult;
    state.eggsLevel++;
    state.eggsTotal++;
    floatText(e.x, e.y - 34, '+' + (10 * mult) + (mult > 1 ? ' x' + mult : ''), '#ffd23f');

    if (state.eggsLevel >= EGGS_PER_LEVEL) levelUp();
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
        Sfx.hatch();
        state.score += 5;
        floatText(e.x, e.y - 30, '+5 piu!', '#fffdf7');
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
          state.score = Math.max(0, state.score - 25);
          state.eggsLevel = Math.max(0, state.eggsLevel - 1);
          state.streak = 0;
          floatText(e.x, e.y - 30, '-25 roubou!', '#ef5b5b');
          puff(e.x, e.y, '#ef5b5b', 10);
          shake(10);
          Sfx.steal();
        }
      }
      // a galinha pode enxotar a raposa
      if (fox.state === 'hunt' && dist(chicken.x, chicken.y, fox.x, fox.y) < 44) {
        fox.state = 'flee';
        state.score += 30;
        floatText(fox.x, fox.y - 34, 'Xô! +30', '#8ed26a');
        puff(fox.x, fox.y, '#ffd23f', 10);
        Sfx.scare();
        shake(5);
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
    moveChicken(dt, live);
    layTick(dt, live);
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
    set('score', el.score, state.score);
    set('level', el.level, state.level);
    set('eggs', el.eggs, state.eggsLevel + ' / ' + EGGS_PER_LEVEL);
    set('time', el.time, Math.ceil(state.timeLeft) + 's');

    var m = multiplier();
    if (force || hudCache.combo !== m) {
      hudCache.combo = m;
      el.combo.textContent = 'x' + m;
      el.comboBox.classList.toggle('hot', m > 1);
    }
    el.barEggs.style.width = (state.eggsLevel / EGGS_PER_LEVEL * 100) + '%';
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

  function drawChicken() {
    var x = chicken.x, y = chicken.y;
    var bob = chicken.moving ? Math.sin(chicken.walk * 2) * 2.5 : Math.sin(state.t * 3) * 1.2;
    var swing = chicken.moving ? Math.sin(chicken.walk * 2) * 6 : 0;

    // anel dourado: quanto falta para o proximo ovo
    var live = state.screen !== 'start';
    var interval = live ? rules.layInterval(state.level) : 1.1;
    var p = clamp(chicken.lay / interval, 0, 1);
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(x, y + 16, 31, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = p > 0.85 ? '#ffffff' : '#ffd23f';
    ctx.beginPath(); ctx.arc(x, y + 16, 31, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    ctx.restore();

    shadowBlob(x, y + 24, 28, 9);

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(chicken.dir, 1);

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
    ctx.rotate(chicken.moving ? Math.sin(chicken.walk * 2) * 0.22 : 0.05);
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
    if (chicken.cluck > 0) {
      var a = Math.min(1, chicken.cluck / 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      var bx = x + chicken.dir * 34, by = y - 58;
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
    drawChicken();
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

    if (state.screen === 'playing' || state.screen === 'start') {
      update(dt);
    } else if (state.screen === 'levelup') {
      updateFx(dt);
      updateChicks(dt);
      state.overlayT -= dt;
      if (state.overlayT <= 0) {
        el.overlay.classList.add('hidden');
        state.screen = 'playing';
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------- Ligacoes UI ------
  el.form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = el.input.value.trim().replace(/\s+/g, ' ');
    if (!name) { el.input.focus(); return; }
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
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
}());
