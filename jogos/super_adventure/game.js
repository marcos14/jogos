/* ==========================================================================
   SUPER ADVENTURE  -  plataforma retro, no estilo dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 1 do plano: esqueleto do jogo, manifesto e movimento basico.

     - Menu inicial com "Jogar Solo" e um HUD provisorio.
     - Um heroi de 32x32 desenhado em Canvas 2D (sem imagem nenhuma) que anda,
       para na hora que solta a tecla, pula com impulso e cai com gravidade.
     - Toda a fisica do movimento vive em FUNCOES PURAS (o modulo `Fisica`),
       sem tocar em DOM: dado um corpo + o que esta apertado, devolve o proximo
       corpo. E o que os testes em Node exercitam, e e o que o convidado vai
       usar para prever o proprio personagem no multijogador.

   Plataformas, moedas, inimigos, camera e rede chegam nas proximas fases.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------- O mundo ----
  var LARGURA = 960, ALTURA = 540;        // resolucao logica do canvas
  var CHAO_Y = 452;                       // altura do piso (topo do chao)
  var LARGURA_MUNDO = LARGURA;            // fase de treino: cabe numa tela so
  var HEROI_L = 32, HEROI_A = 32;         // o heroi mede 32x32, como pede o PRD

  // ------------------------------------------------------------- A fisica ---
  // Numeros em pixels por quadro, num relogio fixo de 60 quadros por segundo.
  var VEL_X = 3;                          // andar: 3px por quadro
  var IMPULSO_PULO = 15;                  // pulo: 15px no primeiro quadro
  var GRAVIDADE = 0.6;                    // 0,6px por quadro, a cada quadro
  var ALTURA_MAX_PULO = 120;              // teto do pulo: sobe no maximo 120px
  var VEL_Y_MAX = 18;                     // velocidade de queda no limite
  var PASSO_MS = 1000 / 60;               // um passo de simulacao

  /* O impulso de 15 com gravidade 0,6 subiria bem mais que 120px sozinho. Como
     nos platformers classicos, a subida e CORTADA no teto do pulo: o impulso
     continua forte (o controle responde na hora) e a altura fica exatamente na
     medida pedida. E tambem por isso nao existe pulo duplo - so quem esta com
     os pes no chao consegue pular. */

  var LIMITES_PADRAO = { esquerda: 0, direita: LARGURA_MUNDO, chao: CHAO_Y };

  var Fisica = (function () {

    function limitar(v, min, max) { return v < min ? min : (v > max ? max : v); }

    /** Um corpo novo, parado, com o canto de cima e da esquerda em (x, y). */
    function novoCorpo(x, y) {
      return {
        x: x, y: y,
        vx: 0, vy: 0,               // velocidade do quadro atual
        noChao: true,               // pisando em algo solido?
        subida: 0,                  // quanto ja subiu neste pulo (teto: 120px)
        pularPreso: false,          // o pulo ja estava apertado no quadro passado
        direcao: 1,                 // 1 = olhando para a direita, -1 esquerda
        andando: false              // so para a animacao
      };
    }

    /**
     * Velocidade horizontal a partir do que esta apertado.
     * Nada apertado (ou as duas setas juntas) = parado na hora, sem inercia.
     */
    function velocidadeHorizontal(entrada) {
      var e = entrada || {};
      var esquerda = e.esquerda ? 1 : 0;
      var direita = e.direita ? 1 : 0;
      if (esquerda === direita) return 0;
      return direita ? VEL_X : -VEL_X;
    }

    /**
     * Um passo de simulacao. Funcao pura: nao mexe no corpo recebido, devolve
     * um corpo novo.
     *   corpo   - { x, y, vx, vy, noChao, subida, pularPreso, direcao }
     *   entrada - { esquerda, direita, pular } (booleanos)
     *   limites - { esquerda, direita, chao } em pixels do mundo
     */
    function passo(corpo, entrada, limites) {
      var lim = limites || LIMITES_PADRAO;
      var e = entrada || {};

      // --- horizontal: velocidade constante, sem sair do mapa pelos lados ---
      var vx = velocidadeHorizontal(e);
      var x = limitar(corpo.x + vx, lim.esquerda, lim.direita - HEROI_L);

      // --- vertical: pulo com impulso, gravidade e teto de subida -----------
      var y = corpo.y;
      var vy = corpo.vy;
      var noChao = corpo.noChao;
      var subida = corpo.subida || 0;

      // Sem pulo duplo: so decola quem esta no chao. E cada pulo precisa de um
      // toque novo - segurar a tecla nao faz o heroi ficar quicando sozinho.
      var pularPreso = !!e.pular;
      if (e.pular && noChao && !corpo.pularPreso) {
        vy = -IMPULSO_PULO;
        noChao = false;
        subida = 0;
      }

      if (vy < 0) {                     // subindo: corta no teto do pulo
        var falta = ALTURA_MAX_PULO - subida;
        if (falta <= 0) vy = 0;
        else if (-vy > falta) vy = -falta;
        subida += -vy;
      }

      y += vy;
      vy = Math.min(vy + GRAVIDADE, VEL_Y_MAX);

      if (y >= lim.chao - HEROI_A) {    // pousou no piso
        y = lim.chao - HEROI_A;
        vy = 0;
        noChao = true;
        subida = 0;
      } else {
        noChao = false;
      }

      return {
        x: x, y: y, vx: vx, vy: vy,
        noChao: noChao,
        subida: subida,
        pularPreso: pularPreso,
        direcao: vx === 0 ? corpo.direcao : (vx > 0 ? 1 : -1),
        andando: vx !== 0 && noChao
      };
    }

    return {
      novoCorpo: novoCorpo,
      velocidadeHorizontal: velocidadeHorizontal,
      passo: passo,
      limitar: limitar,
      medidas: {
        VEL_X: VEL_X,
        IMPULSO_PULO: IMPULSO_PULO,
        GRAVIDADE: GRAVIDADE,
        ALTURA_MAX_PULO: ALTURA_MAX_PULO,
        VEL_Y_MAX: VEL_Y_MAX,
        HEROI_L: HEROI_L,
        HEROI_A: HEROI_A
      }
    };
  }());

  // Aberto para os testes em Node (e, mais para a frente, para a rede).
  // Nada disto depende de DOM.
  if (typeof window !== 'undefined') {
    window.SuperAdventure = {
      Fisica: Fisica,
      mundo: {
        LARGURA: LARGURA, ALTURA: ALTURA, CHAO_Y: CHAO_Y,
        LARGURA_MUNDO: LARGURA_MUNDO, PASSO_MS: PASSO_MS
      },
      LIMITES_PADRAO: LIMITES_PADRAO
    };
  }

  // Carregado fora da pagina do jogo (harness de teste): a fisica ja foi
  // exportada, e o resto - que precisa de tela - nao roda.
  if (typeof document === 'undefined' || !document.getElementById('tela')) return;

  // ------------------------------------------------------------- Desenho ----
  var PALETA = {
    '.': null,
    r: '#d82800',   // bone
    s: '#fcbc9c',   // pele
    e: '#0d0d17',   // olhos
    m: '#a02000',   // boca
    b: '#0058f8',   // macacao
    y: '#fcd800',   // fivela
    k: '#503000'    // botas
  };

  // O heroi: 16x16 quadradinhos de 2px = 32x32 pixels na tela.
  var HEROI_PARADO = [
    '......rrrr......',
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '....ssssssss....',
    '....sesssses....',
    '....ssssssss....',
    '.....smmms......',
    '...bbbbbbbbbb...',
    '..sbbbbbbbbbbs..',
    '..sbbyyyyyybbs..',
    '...bbbbbbbbbb...',
    '...bbbb..bbbb...',
    '...bbbb..bbbb...',
    '...bbbb..bbbb...',
    '..kkkkk..kkkkk..',
    '..kkkkk..kkkkk..'
  ];

  // O mesmo heroi de pernas abertas: alternando os dois quadros, ele anda.
  var HEROI_ANDANDO = [
    '......rrrr......',
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '....ssssssss....',
    '....sesssses....',
    '....ssssssss....',
    '.....smmms......',
    '...bbbbbbbbbb...',
    '..sbbbbbbbbbbs..',
    '..sbbyyyyyybbs..',
    '...bbbbbbbbbb...',
    '....bbbbbbbb....',
    '...bbbb..bbbb...',
    '..bbbb....bbbb..',
    '..kkkk....kkkk..',
    '.kkkkk....kkkkk.'
  ];

  // No ar os bracos sobem e as pernas se juntam.
  var HEROI_PULANDO = [
    '......rrrr......',
    '.....rrrrrr.....',
    '..s.rrrrrrrr.s..',
    '..s.ssssssss.s..',
    '..s.sesssses.s..',
    '..sbssssssssbs..',
    '...b.smmms..b...',
    '...bbbbbbbbbb...',
    '...bbbbbbbbbb...',
    '...bbyyyyyybb...',
    '...bbbbbbbbbb...',
    '...bbbb..bbbb...',
    '...bbbb..bbbb...',
    '..kkkkk..kkkkk..',
    '..kkkkk..kkkkk..',
    '................'
  ];

  var $ = function (id) { return document.getElementById(id); };

  var tela = $('tela');
  var ctx = tela.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var el = {
    app: $('app'),
    palco: $('palco'),
    hud: $('hud'),
    menu: $('tela-menu'),
    btnSolo: $('btn-solo')
  };

  function bloco(x, y, l, a, cor) {
    ctx.fillStyle = cor;
    ctx.fillRect(x | 0, y | 0, l | 0, a | 0);
  }

  /** Desenha um sprite de texto; `virado` espelha na horizontal. */
  function sprite(linhas, x, y, escala, virado) {
    var colunas = linhas[0].length;
    for (var r = 0; r < linhas.length; r++) {
      var linha = linhas[r];
      for (var c = 0; c < linha.length; c++) {
        var cor = PALETA[linha.charAt(c)];
        if (!cor) continue;
        var cc = virado ? (colunas - 1 - c) : c;
        bloco(x + cc * escala, y + r * escala, escala, escala, cor);
      }
    }
  }

  // Cenario fixo da tela de treino: nuvens, morros e um chao de tijolos.
  var NUVENS = [{ x: 90, y: 70 }, { x: 430, y: 44 }, { x: 700, y: 96 }];
  var MORROS = [{ x: 120, l: 200 }, { x: 560, l: 260 }];

  function desenharNuvem(n) {
    bloco(n.x + 16, n.y, 48, 16, '#fcfcfc');
    bloco(n.x, n.y + 16, 80, 16, '#fcfcfc');
    bloco(n.x + 8, n.y + 32, 64, 8, '#e0e0f0');
  }

  function desenharMorro(m) {
    for (var i = 0; i < 4; i++) {
      var recuo = i * 24;
      bloco(m.x + recuo, CHAO_Y - 24 - i * 24, m.l - recuo * 2, 24,
            i < 3 ? '#00a800' : '#4cd44c');
    }
  }

  function desenharChao() {
    bloco(0, CHAO_Y, LARGURA, 8, '#00a800');                  // grama
    bloco(0, CHAO_Y + 8, LARGURA, ALTURA - CHAO_Y - 8, '#c84c0c');
    for (var y = CHAO_Y + 8; y < ALTURA; y += 16) {           // tijolos
      var desloca = ((y - CHAO_Y - 8) / 16) % 2 ? 16 : 0;
      for (var x = -32; x < LARGURA; x += 32) {
        bloco(x + desloca, y, 30, 14, '#e45c10');
      }
    }
  }

  function desenharCena() {
    bloco(0, 0, LARGURA, ALTURA, '#5c94fc');
    NUVENS.forEach(desenharNuvem);
    MORROS.forEach(desenharMorro);
    desenharChao();

    var arte;
    if (!jogo.heroi.noChao) arte = HEROI_PULANDO;
    else if (jogo.heroi.andando) {
      arte = ((jogo.relogio / 8) | 0) % 2 ? HEROI_ANDANDO : HEROI_PARADO;
    } else arte = HEROI_PARADO;

    sprite(arte, jogo.heroi.x, jogo.heroi.y, 2, jogo.heroi.direcao < 0);
  }

  // -------------------------------------------------------------- O jogo ----
  var jogo = {
    tela: 'menu',                       // 'menu' | 'jogando'
    relogio: 0,                         // quadros desde o inicio da partida
    heroi: Fisica.novoCorpo(64, CHAO_Y - HEROI_A)
  };

  var entrada = { esquerda: false, direita: false, pular: false };

  // O estado vivo, para os testes dirigirem o jogo sem navegador.
  window.SuperAdventure.jogo = jogo;
  window.SuperAdventure.entrada = entrada;

  function atualizar() {
    jogo.relogio++;
    jogo.heroi = Fisica.passo(jogo.heroi, entrada, LIMITES_PADRAO);
  }

  function comecarSolo() {
    jogo.tela = 'jogando';
    jogo.relogio = 0;
    jogo.heroi = Fisica.novoCorpo(64, CHAO_Y - HEROI_A);
    entrada.esquerda = entrada.direita = entrada.pular = false;
    el.menu.classList.add('hidden');
    el.hud.classList.remove('hidden');
    ajustarPalco();
  }

  // -------------------------------------------------------------- Teclado ---
  var TECLAS = {
    ArrowLeft: 'esquerda', a: 'esquerda', A: 'esquerda',
    ArrowRight: 'direita', d: 'direita', D: 'direita',
    ArrowUp: 'pular', w: 'pular', W: 'pular', ' ': 'pular', Spacebar: 'pular'
  };

  function tecla(ev, apertada) {
    var acao = TECLAS[ev.key];
    if (!acao) return;
    ev.preventDefault();
    entrada[acao] = apertada;
  }

  window.addEventListener('keydown', function (ev) { tecla(ev, true); });
  window.addEventListener('keyup', function (ev) { tecla(ev, false); });
  window.addEventListener('blur', function () {
    entrada.esquerda = entrada.direita = entrada.pular = false;
  });

  el.btnSolo.addEventListener('click', comecarSolo);

  // ------------------------------------------------------- Tamanho da tela --
  // O canvas tem sempre 960x540 por dentro; aqui so escolhemos de que tamanho
  // ele aparece, mantendo a proporcao.
  function ajustarPalco() {
    el.palco.style.width = '';
    el.palco.style.height = '';
    var sobra = el.app.offsetHeight - el.palco.offsetHeight;
    var dispL = el.app.clientWidth;
    var dispA = window.innerHeight - sobra - 16;
    var escala = Math.max(0.2, Math.min(dispL / LARGURA, dispA / ALTURA));
    el.palco.style.width = Math.floor(LARGURA * escala) + 'px';
    el.palco.style.height = Math.floor(ALTURA * escala) + 'px';
  }

  window.addEventListener('resize', ajustarPalco);
  window.addEventListener('orientationchange', function () {
    setTimeout(ajustarPalco, 120);
  });

  // ---------------------------------------------------------- Laco do jogo --
  // Relogio fixo de 60 passos por segundo: a fisica anda sempre igual em
  // qualquer aparelho - e e isso que vai deixar anfitriao e convidado batendo
  // certo quando o multijogador entrar.
  var acumulado = 0, ultimo = 0;

  function quadro(agora) {
    requestAnimationFrame(quadro);
    var dt = ultimo ? Math.min(200, agora - ultimo) : 0;
    ultimo = agora;

    if (jogo.tela === 'jogando') {
      acumulado += dt;
      var passos = 0;
      while (acumulado >= PASSO_MS && passos < 6) {
        atualizar();
        acumulado -= PASSO_MS;
        passos++;
      }
      if (acumulado > PASSO_MS * 6) acumulado = 0;   // a aba voltou do sono
    } else {
      acumulado = 0;
    }

    desenharCena();
  }

  ajustarPalco();
  desenharCena();
  requestAnimationFrame(quadro);
}());
