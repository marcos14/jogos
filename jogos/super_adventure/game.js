/* ==========================================================================
   SUPER ADVENTURE  -  plataforma retro, no estilo dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 2 do plano: colisao com plataformas, camera lateral e bandeira.

     - `Fisica`: as funcoes puras do movimento, agora com colisao AABB contra
       os blocos solidos do mapa (para em cima, nao atravessa, bate a cabeca).
     - `Mapa`: le um tilemap escrito como texto e devolve os retangulos
       solidos, o ponto de nascimento e a bandeira. Tambem e funcao pura.
     - `Camera`: side-scroll, seguindo o heroi sem sair das bordas do mundo.
     - A fase 1 do jogo ja e um percurso de verdade: 120 colunas de 32px, com
       buracos, degraus, plataformas soltas e a bandeira no fim.

   Nada disto usa imagem: tudo e retangulo pintado no Canvas 2D. Moedas,
   blocos quebraveis, checkpoints, inimigos e a rede chegam nas fases
   seguintes do plano.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------- O mundo ----
  var LARGURA = 960, ALTURA = 540;        // resolucao logica do canvas
  var TILE = 32;                          // o mundo e feito de quadrados de 32
  var CHAO_Y = 14 * TILE;                 // linha 14 do tilemap: o piso comum
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
     os pes no chao consegue pular.

     Subindo 120px o heroi passa ~31 quadros no ar, ou seja, atravessa no
     maximo uns 93px na horizontal durante um pulo. Por isso os buracos do mapa
     tem 2 quadrados (64px) e os degraus sobem 2 quadrados: tudo dentro do
     alcance, do jeito que uma fase facil pede. */

  // Tela de treino, sem mapa nenhum: uma tela de largura e um chao liso. E o
  // cenario que os testes de fisica pura usam.
  var LIMITES_PADRAO = { esquerda: 0, direita: LARGURA, chao: CHAO_Y };

  var Fisica = (function () {

    var SEM_SOLIDOS = [];

    function limitar(v, min, max) { return v < min ? min : (v > max ? max : v); }

    /** Dois retangulos {x, y, l, a} se encostam? */
    function tocando(a, b) {
      return a.x < b.x + b.l && a.x + a.l > b.x &&
             a.y < b.y + b.a && a.y + a.a > b.y;
    }

    /** O retangulo que o corpo ocupa no mundo. */
    function retangulo(corpo) {
      return { x: corpo.x, y: corpo.y, l: HEROI_L, a: HEROI_A };
    }

    /** O corpo encostou num retangulo do mundo (bandeira, moeda, inimigo...)? */
    function tocandoCorpo(corpo, alvo) {
      return !!alvo && tocando(retangulo(corpo), alvo);
    }

    /** Caiu para fora do mapa? (o corpo inteiro ja passou do fundo) */
    function caiu(corpo, fundo) {
      return corpo.y > fundo;
    }

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
     * Empurra o corpo para fora dos solidos na horizontal: recebe o x ja
     * andado e devolve ate onde deu para ir. Usa o y do quadro anterior, como
     * manda o feijao-com-arroz dos platformers (resolve X, depois resolve Y).
     */
    function resolverX(x, y, vx, solidos) {
      if (vx === 0) return x;
      for (var i = 0; i < solidos.length; i++) {
        var s = solidos[i];
        if (y + HEROI_A <= s.y || y >= s.y + s.a) continue;   // outra altura
        if (x + HEROI_L <= s.x || x >= s.x + s.l) continue;   // nao encostou
        if (vx > 0) x = Math.min(x, s.x - HEROI_L);           // bateu de frente
        else x = Math.max(x, s.x + s.l);                      // bateu de costas
      }
      return x;
    }

    /**
     * Um passo de simulacao. Funcao pura: nao mexe no corpo recebido, devolve
     * um corpo novo.
     *   corpo   - { x, y, vx, vy, noChao, subida, pularPreso, direcao }
     *   entrada - { esquerda, direita, pular } (booleanos)
     *   limites - { esquerda, direita, chao?, solidos? }
     *             `chao` e o piso liso da tela de treino (opcional) e
     *             `solidos` sao os retangulos do tilemap.
     */
    function passo(corpo, entrada, limites) {
      var lim = limites || LIMITES_PADRAO;
      var solidos = lim.solidos || SEM_SOLIDOS;
      var chao = typeof lim.chao === 'number' ? lim.chao : Infinity;
      var e = entrada || {};
      var i, s;

      // --- horizontal: velocidade constante, sem sair do mapa pelos lados ---
      var vx = velocidadeHorizontal(e);
      var x = limitar(corpo.x + vx, lim.esquerda, lim.direita - HEROI_L);
      x = resolverX(x, corpo.y, vx, solidos);

      // --- vertical: pulo com impulso, gravidade e teto de subida -----------
      var y = corpo.y;
      var vy = corpo.vy;
      var noChao = false;
      var subida = corpo.subida || 0;

      // Sem pulo duplo: so decola quem esta no chao. E cada pulo precisa de um
      // toque novo - segurar a tecla nao faz o heroi ficar quicando sozinho.
      var pularPreso = !!e.pular;
      if (e.pular && corpo.noChao && !corpo.pularPreso) {
        vy = -IMPULSO_PULO;
        subida = 0;
      }

      if (vy < 0) {                     // subindo: corta no teto do pulo
        var falta = ALTURA_MAX_PULO - subida;
        if (falta <= 0) vy = 0;
        else if (-vy > falta) vy = -falta;
        subida += -vy;
      }

      y += vy;
      var vyProximo = Math.min(vy + GRAVIDADE, VEL_Y_MAX);

      if (vy >= 0) {
        // Descendo (ou parado em cima de algo): pousa na superficie mais alta
        // que os pes cruzaram neste quadro.
        var pouso = Infinity;
        for (i = 0; i < solidos.length; i++) {
          s = solidos[i];
          if (x + HEROI_L <= s.x || x >= s.x + s.l) continue;  // fora do bloco
          if (corpo.y + HEROI_A > s.y) continue;               // ja estava abaixo
          if (y + HEROI_A < s.y) continue;                     // ainda nao chegou
          pouso = Math.min(pouso, s.y - HEROI_A);
        }
        if (pouso < Infinity) { y = pouso; vyProximo = 0; noChao = true; subida = 0; }
      } else {
        // Subindo: bate a cabeca no bloco mais baixo que a cabeca atravessou.
        var teto = -Infinity;
        for (i = 0; i < solidos.length; i++) {
          s = solidos[i];
          if (x + HEROI_L <= s.x || x >= s.x + s.l) continue;
          if (corpo.y < s.y + s.a) continue;                   // ja estava dentro
          if (y >= s.y + s.a) continue;                        // nao alcancou
          teto = Math.max(teto, s.y + s.a);
        }
        if (teto > -Infinity) { y = teto; vyProximo = 0; subida = ALTURA_MAX_PULO; }
      }

      if (y >= chao - HEROI_A) {        // o piso liso da tela de treino
        y = chao - HEROI_A;
        vyProximo = 0;
        noChao = true;
        subida = 0;
      }

      return {
        x: x, y: y, vx: vx, vy: vyProximo,
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
      resolverX: resolverX,
      passo: passo,
      limitar: limitar,
      tocando: tocando,
      tocandoCorpo: tocandoCorpo,
      retangulo: retangulo,
      caiu: caiu,
      medidas: {
        VEL_X: VEL_X,
        IMPULSO_PULO: IMPULSO_PULO,
        GRAVIDADE: GRAVIDADE,
        ALTURA_MAX_PULO: ALTURA_MAX_PULO,
        VEL_Y_MAX: VEL_Y_MAX,
        HEROI_L: HEROI_L,
        HEROI_A: HEROI_A,
        TILE: TILE
      }
    };
  }());

  // --------------------------------------------------------------- O mapa ---
  /* Um tilemap e um desenho em texto, uma letra por quadrado de 32x32:

         .  vazio          #  terra (o chao e os degraus)
         =  plataforma     P  onde o heroi nasce      F  a bandeira do fim

     `Mapa.ler()` transforma esse desenho nos retangulos solidos que a fisica
     usa. Blocos vizinhos de uma mesma linha viram UM retangulo so, o que deixa
     a lista curta e a colisao barata. */
  var Mapa = (function () {

    function solidoChar(ch) { return ch === '#' || ch === '='; }

    /** A letra de um quadrado do mapa (fora do mapa = vazio). */
    function tile(mapa, coluna, linha) {
      if (linha < 0 || linha >= mapa.grade.length) return '.';
      var texto = mapa.grade[linha];
      if (coluna < 0 || coluna >= texto.length) return '.';
      return texto.charAt(coluna);
    }

    /** Aquele quadrado do mapa e solido? */
    function solido(mapa, coluna, linha) {
      return solidoChar(tile(mapa, coluna, linha));
    }

    /** Le o desenho e devolve o mapa pronto para a fisica e para o desenho. */
    function ler(grade) {
      var colunas = 0, r, c;
      for (r = 0; r < grade.length; r++) colunas = Math.max(colunas, grade[r].length);

      var mapa = {
        grade: grade,
        colunas: colunas,
        linhas: grade.length,
        largura: colunas * TILE,
        altura: grade.length * TILE,
        solidos: [],
        spawn: null,
        bandeira: null
      };
      mapa.fundo = mapa.altura;      // abaixo disto, caiu num buraco

      for (r = 0; r < grade.length; r++) {
        var inicio = -1;
        for (c = 0; c <= colunas; c++) {
          var ch = tile(mapa, c, r);
          if (solidoChar(ch)) {
            if (inicio < 0) inicio = c;
            continue;
          }
          if (inicio >= 0) {                       // fechou uma fileira de blocos
            mapa.solidos.push({
              x: inicio * TILE, y: r * TILE,
              l: (c - inicio) * TILE, a: TILE
            });
            inicio = -1;
          }
          if (ch === 'P') mapa.spawn = { x: c * TILE, y: r * TILE };
          if (ch === 'F') {
            // O mastro vai da letra F ate o primeiro chao abaixo dela.
            var pe = r + 1;
            while (pe < grade.length && !solido(mapa, c, pe)) pe++;
            mapa.bandeira = {
              x: c * TILE, y: r * TILE,
              l: TILE, a: (pe - r) * TILE
            };
          }
        }
      }

      mapa.limites = {
        esquerda: 0,
        direita: mapa.largura,
        solidos: mapa.solidos
      };
      return mapa;
    }

    return { ler: ler, tile: tile, solido: solido, TILE: TILE };
  }());

  // ------------------------------------------------------------- A camera ---
  /* Side-scroll: a camera anda so na horizontal, centrada no heroi, e trava
     nas duas pontas do mundo para nunca mostrar o lado de fora do mapa. */
  var Camera = (function () {
    function seguir(centroX, larguraMundo, larguraTela) {
      var tela = larguraTela || LARGURA;
      return Fisica.limitar(centroX - tela / 2, 0, Math.max(0, larguraMundo - tela));
    }
    return { seguir: seguir };
  }());

  // ------------------------------------------------------ O mapa da fase 1 --
  // Facil: chao quase todo continuo, buracos de 2 quadrados, degraus de 2 e
  // algumas plataformas soltas para quem quiser subir. A bandeira fica no fim.
  var FASE_1 = [
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '........................................................................................................................',
    '...................................................................................................................F....',
    '........................................................................................................................',
    '................................====..........===.........................====.............===..........===.............',
    '..................................................###########..#######..................................................',
    '..P...............................................###########..#######..................................................',
    '##########################..#############..##################..#####################..##########..######################',
    '##########################..#############..##################..#####################..##########..######################',
    '##########################..#############..##################..#####################..##########..######################'
  ];

  var fase = Mapa.ler(FASE_1);

  // Aberto para os testes em Node (e, mais para a frente, para a rede).
  // Nada disto depende de DOM.
  if (typeof window !== 'undefined') {
    window.SuperAdventure = {
      Fisica: Fisica,
      Mapa: Mapa,
      Camera: Camera,
      FASE_1: FASE_1,
      fase: fase,
      mundo: {
        LARGURA: LARGURA, ALTURA: ALTURA, CHAO_Y: CHAO_Y, TILE: TILE,
        LARGURA_MUNDO: fase.largura, PASSO_MS: PASSO_MS
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
    fim: $('tela-fim'),
    btnSolo: $('btn-solo'),
    btnDeNovo: $('btn-de-novo')
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

  // ----- Fundo: ceu, nuvens e morros repetidos ao longo do mundo inteiro. O
  // fundo anda pela metade da velocidade da camera (parallax), o que da a
  // sensacao de distancia sem custar quase nada.
  var VAO_NUVEM = 330, VAO_MORRO = 470;
  var ALTURA_NUVEM = [56, 92, 40];
  var LARGURA_MORRO = [200, 260, 160];

  function repetido(lista, i) { return lista[((i % lista.length) + lista.length) % lista.length]; }

  function desenharNuvem(x, y) {
    bloco(x + 16, y, 48, 16, '#fcfcfc');
    bloco(x, y + 16, 80, 16, '#fcfcfc');
    bloco(x + 8, y + 32, 64, 8, '#e0e0f0');
  }

  function desenharMorro(x, largura) {
    for (var i = 0; i < 4; i++) {
      var recuo = i * 24;
      if (largura - recuo * 2 <= 0) break;
      bloco(x + recuo, CHAO_Y - 24 - i * 24, largura - recuo * 2, 24,
            i < 3 ? '#00a800' : '#4cd44c');
    }
  }

  /** Repete um enfeite de `vao` em `vao` pixels, so onde a tela alcanca. */
  function repetindo(vao, largura, fundoX, desenhar) {
    var primeiro = Math.ceil((fundoX - largura) / vao);
    var ultimo = Math.floor((fundoX + LARGURA) / vao);
    for (var i = primeiro; i <= ultimo; i++) desenhar(i * vao - fundoX, i);
  }

  function morroDaVez(x, i) { desenharMorro(x, repetido(LARGURA_MORRO, i)); }
  function nuvemDaVez(x, i) { desenharNuvem(x, repetido(ALTURA_NUVEM, i)); }

  function desenharFundo(cam) {
    bloco(0, 0, LARGURA, ALTURA, '#5c94fc');
    var fundoX = cam * 0.5;                      // parallax
    repetindo(VAO_MORRO, 260, fundoX, morroDaVez);
    repetindo(VAO_NUVEM, 80, fundoX, nuvemDaVez);
  }

  // ----- O mapa: so os quadrados que estao na frente da camera sao pintados.
  function desenharTerra(x, y, comGrama) {
    bloco(x, y, TILE, TILE, '#c84c0c');
    if (comGrama) {
      bloco(x, y, TILE, 6, '#00a800');
      bloco(x, y + 6, TILE, 4, '#007818');
    }
    for (var i = comGrama ? 12 : 2; i < TILE - 4; i += 10) {
      var desloca = (((y / TILE) | 0) + i) % 2 ? 0 : 8;
      bloco(x + desloca, y + i, 12, 6, '#e45c10');
      bloco(x + desloca + 16, y + i, 12, 6, '#e45c10');
    }
  }

  function desenharPlataforma(x, y) {
    bloco(x, y, TILE, TILE, '#0d0d17');
    bloco(x + 2, y + 2, TILE - 4, TILE - 4, '#c86818');
    bloco(x + 2, y + 2, TILE - 4, 5, '#fca044');
    bloco(x + 2, y + TILE - 8, TILE - 4, 6, '#a04808');
  }

  function desenharMapa(cam) {
    var c0 = Math.max(0, Math.floor(cam / TILE));
    var c1 = Math.min(fase.colunas - 1, Math.floor((cam + LARGURA) / TILE));
    for (var r = 0; r < fase.linhas; r++) {
      for (var c = c0; c <= c1; c++) {
        var ch = Mapa.tile(fase, c, r);
        if (ch === '#') {
          desenharTerra(c * TILE - cam, r * TILE, !Mapa.solido(fase, c, r - 1));
        } else if (ch === '=') {
          desenharPlataforma(c * TILE - cam, r * TILE);
        }
      }
    }
  }

  function desenharBandeira(cam) {
    var b = fase.bandeira;
    if (!b) return;
    var x = b.x - cam, y = b.y;
    if (x + b.l < -TILE || x > LARGURA + TILE) return;

    bloco(x + 13, y, 6, b.a - 10, '#e0e0f0');            // mastro
    bloco(x + 9, y - 8, 14, 8, '#fcd800');               // bolinha do topo
    var pano = jogo.concluida ? b.a - 46 : 6;            // ganhou: a bandeira desce
    for (var i = 0; i < 7; i++) {                        // o pano, em degraus
      bloco(x + 19, y + pano + i * 4, 22 - Math.abs(i - 3) * 5, 4, '#d82800');
    }
    bloco(x + 3, y + b.a - 10, 26, 10, '#0d0d17');       // base
  }

  function desenharCena() {
    var cam = jogo.camera;
    desenharFundo(cam);
    desenharMapa(cam);
    desenharBandeira(cam);

    var arte;
    if (!jogo.heroi.noChao) arte = HEROI_PULANDO;
    else if (jogo.heroi.andando) {
      arte = ((jogo.relogio / 8) | 0) % 2 ? HEROI_ANDANDO : HEROI_PARADO;
    } else arte = HEROI_PARADO;

    sprite(arte, jogo.heroi.x - cam, jogo.heroi.y, 2, jogo.heroi.direcao < 0);
  }

  // -------------------------------------------------------------- O jogo ----
  var jogo = {
    tela: 'menu',                       // 'menu' | 'jogando'
    relogio: 0,                         // quadros desde o inicio da partida
    quedas: 0,                          // quantas vezes caiu num buraco
    concluida: false,                   // ja tocou a bandeira?
    camera: 0,
    heroi: Fisica.novoCorpo(fase.spawn.x, fase.spawn.y),
    eventos: []                         // os ultimos avisos (para os testes)
  };

  var entrada = { esquerda: false, direita: false, pular: false };
  var ouvintes = [];

  /** Avisa quem estiver escutando. Por enquanto: 'queda' e 'fase-concluida'. */
  function emitir(tipo) {
    var evento = { tipo: tipo, quadro: jogo.relogio };
    jogo.eventos.push(evento);
    if (jogo.eventos.length > 20) jogo.eventos.shift();
    for (var i = 0; i < ouvintes.length; i++) ouvintes[i](evento);
  }

  // O estado vivo, para os testes dirigirem o jogo sem navegador.
  window.SuperAdventure.jogo = jogo;
  window.SuperAdventure.entrada = entrada;
  window.SuperAdventure.aoEvento = function (fn) { ouvintes.push(fn); };

  function centroDoHeroi() { return jogo.heroi.x + HEROI_L / 2; }

  /* Volta o heroi para o comeco da fase. Cair num buraco ainda e so isto: o
     checkpoint e a perda de vida chegam na fase 4 do plano, e o mundo ainda
     nao guarda nada (moedas e blocos) que precise ser desfeito. */
  function reiniciarFase() {
    jogo.heroi = Fisica.novoCorpo(fase.spawn.x, fase.spawn.y);
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
    jogo.concluida = false;
    el.fim.classList.add('hidden');
  }

  function atualizar() {
    if (jogo.concluida) return;

    jogo.relogio++;
    jogo.heroi = Fisica.passo(jogo.heroi, entrada, fase.limites);
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);

    if (Fisica.caiu(jogo.heroi, fase.fundo)) {          // caiu num buraco
      jogo.quedas++;
      emitir('queda');
      reiniciarFase();
      return;
    }

    if (Fisica.tocandoCorpo(jogo.heroi, fase.bandeira)) {
      jogo.concluida = true;
      emitir('fase-concluida');
      el.fim.classList.remove('hidden');
    }
  }

  function comecarSolo() {
    jogo.tela = 'jogando';
    jogo.relogio = 0;
    jogo.quedas = 0;
    jogo.eventos.length = 0;
    entrada.esquerda = entrada.direita = entrada.pular = false;
    reiniciarFase();
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
  el.btnDeNovo.addEventListener('click', comecarSolo);

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

  jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
  ajustarPalco();
  desenharCena();
  requestAnimationFrame(quadro);
}());
