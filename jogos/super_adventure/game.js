/* ==========================================================================
   SUPER ADVENTURE  -  plataforma retro, no estilo dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 3 do plano: moedas, blocos quebraveis, pontuacao e HUD.

     - `Fisica`: as funcoes puras do movimento, com colisao AABB contra os
       blocos solidos do mapa (para em cima, nao atravessa, bate a cabeca).
     - `Mapa`: le um tilemap escrito como texto e devolve os retangulos
       solidos, as moedas, os blocos quebraveis, o ponto de nascimento e a
       bandeira. Tambem e funcao pura.
     - `Itens`: o que o heroi encosta e o que ele quebra. Tambem puro: recebe
       o estado dos itens e devolve um estado NOVO, com o que aconteceu.
     - `Camera`: side-scroll, seguindo o heroi sem sair das bordas do mundo.
     - A fase 1 do jogo ja e um percurso de verdade: 120 colunas de 32px, com
       buracos, degraus, plataformas soltas, 100 moedas, 10 blocos quebraveis
       e a bandeira no fim.

   Nada disto usa imagem: tudo e retangulo pintado no Canvas 2D. Checkpoints,
   vidas de verdade, inimigos e a rede chegam nas fases seguintes do plano.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------- O mundo ----
  var LARGURA = 960, ALTURA = 540;        // resolucao logica do canvas
  var TILE = 32;                          // o mundo e feito de quadrados de 32
  var CHAO_Y = 14 * TILE;                 // linha 14 do tilemap: o piso comum
  var HEROI_L = 32, HEROI_A = 32;         // o heroi mede 32x32, como pede o PRD

  // ---------------------------------------------------------- A pontuacao ---
  var PONTOS_MOEDA = 10;                  // cada moeda vale 10 pontos
  var VIDAS_INICIAIS = 3;                 // fixo nesta fase do plano
  var TOTAL_FASES = 3;                    // o jogo completo tem 3 fases

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
         o  moeda          ?  bloco quebravel (tem um cristal dentro)

     `Mapa.ler()` transforma esse desenho nos retangulos solidos que a fisica
     usa. Blocos vizinhos de uma mesma linha viram UM retangulo so, o que deixa
     a lista curta e a colisao barata.

     Os blocos quebraveis sao solidos tambem, mas ficam numa lista separada e
     NUNCA sao juntados com os vizinhos: cada um pode sumir sozinho quando o
     heroi bate nele, e ai a lista de solidos e remontada sem ele. */
  var Mapa = (function () {

    // Uma moeda nao ocupa o quadrado inteiro: fica no meio dele.
    var MOEDA_L = 16, MOEDA_A = 24;

    function solidoChar(ch) { return ch === '#' || ch === '='; }
    function quebravelChar(ch) { return ch === '?'; }

    /** A letra de um quadrado do mapa (fora do mapa = vazio). */
    function tile(mapa, coluna, linha) {
      if (linha < 0 || linha >= mapa.grade.length) return '.';
      var texto = mapa.grade[linha];
      if (coluna < 0 || coluna >= texto.length) return '.';
      return texto.charAt(coluna);
    }

    /** Aquele quadrado do mapa e solido? (o bloco quebravel tambem e) */
    function solido(mapa, coluna, linha) {
      var ch = tile(mapa, coluna, linha);
      return solidoChar(ch) || quebravelChar(ch);
    }

    /** O retangulo de uma moeda, no meio do quadrado (coluna, linha). */
    function retanguloMoeda(coluna, linha) {
      return {
        x: coluna * TILE + (TILE - MOEDA_L) / 2,
        y: linha * TILE + (TILE - MOEDA_A) / 2,
        l: MOEDA_L, a: MOEDA_A
      };
    }

    /** A lista de solidos do mapa mais os blocos quebraveis que sobraram. */
    function limitesCom(mapa, blocosVivos) {
      var solidos = mapa.solidos.slice();
      for (var i = 0; i < mapa.quebraveis.length; i++) {
        if (!blocosVivos || blocosVivos[i]) solidos.push(mapa.quebraveis[i]);
      }
      return { esquerda: 0, direita: mapa.largura, solidos: solidos };
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
        moedas: [],
        quebraveis: [],
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
          if (ch === 'o') mapa.moedas.push(retanguloMoeda(c, r));
          if (quebravelChar(ch)) {
            mapa.quebraveis.push({ x: c * TILE, y: r * TILE, l: TILE, a: TILE });
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

      // Os limites do mapa inteirinho, com todos os blocos quebraveis de pe.
      mapa.limites = limitesCom(mapa, null);
      return mapa;
    }

    return {
      ler: ler,
      tile: tile,
      solido: solido,
      limitesCom: limitesCom,
      retanguloMoeda: retanguloMoeda,
      TILE: TILE
    };
  }());

  // -------------------------------------------------------------- Itens -----
  /* O que da para pegar e o que da para quebrar.

     O mapa (`Mapa.ler`) diz ONDE cada moeda e cada bloco estao - isso nunca
     muda. O que muda durante a partida e quais deles ainda existem, e isso
     fica num "estado dos itens":

         { moedas: [true, false, ...],   // true = ainda esta la
           blocos: [true, ...],
           limites: { esquerda, direita, solidos } }

     `Itens.passo()` e puro como o `Fisica.passo()`: nao mexe no estado que
     recebe. Se nada aconteceu, devolve o MESMO estado (barato); se o heroi
     pegou moeda ou quebrou bloco, devolve um estado novo mais o resumo do que
     aconteceu, para o jogo somar os pontos e soltar os efeitos na tela. */
  var Itens = (function () {

    var NADA = [];

    /** Um array de `n` posicoes, todas com `true`. */
    function todosDePe(n) {
      var lista = [];
      for (var i = 0; i < n; i++) lista.push(true);
      return lista;
    }

    /** O estado do comeco da fase: tudo no lugar, nada pego nem quebrado. */
    function novoEstado(mapa) {
      return {
        moedas: todosDePe(mapa.moedas.length),
        blocos: todosDePe(mapa.quebraveis.length),
        limites: mapa.limites
      };
    }

    /** Quantas moedas ainda existem / quantos blocos ainda estao de pe. */
    function quantos(lista) {
      var n = 0;
      for (var i = 0; i < lista.length; i++) if (lista[i]) n++;
      return n;
    }

    /** As moedas que o corpo esta encostando agora (so as que ainda existem). */
    function moedasTocadas(corpo, mapa, estado) {
      var eu = Fisica.retangulo(corpo);
      var achadas = null;
      for (var i = 0; i < mapa.moedas.length; i++) {
        if (!estado.moedas[i]) continue;
        if (!Fisica.tocando(eu, mapa.moedas[i])) continue;
        (achadas = achadas || []).push(i);
      }
      return achadas || NADA;
    }

    /** Quanto dois retangulos se cruzam na horizontal (0 = nao se cruzam). */
    function sobreposicaoX(corpo, bloco) {
      return Math.min(corpo.x + HEROI_L, bloco.x + bloco.l) -
             Math.max(corpo.x, bloco.x);
    }

    /**
     * Qual bloco quebravel o heroi acertou neste quadro (-1 = nenhum).
     * Vale de duas formas, as duas do PRD:
     *   - de baixo: subindo, a cabeca atravessou a base do bloco;
     *   - de cima: caindo, os pes pousaram no topo do bloco.
     * Se dois blocos servirem, ganha aquele em que o heroi estava mais em cima
     * - do jeito que os platformers antigos fazem.
     */
    function blocoAtingido(antes, depois, mapa, estado) {
      var subindo = depois.y < antes.y;
      var caindo = depois.y > antes.y;
      var melhor = -1, maiorToque = 0;

      for (var i = 0; i < mapa.quebraveis.length; i++) {
        if (!estado.blocos[i]) continue;
        var b = mapa.quebraveis[i];
        var toque = sobreposicaoX(depois, b);
        if (toque <= 0) continue;

        var base = b.y + b.a;
        var cabecada = subindo && antes.y >= base && depois.y <= base;
        var pisada = caindo && depois.noChao &&
                     antes.y + HEROI_A <= b.y &&
                     Math.abs(depois.y + HEROI_A - b.y) < 0.5;

        if ((cabecada || pisada) && toque > maiorToque) {
          maiorToque = toque;
          melhor = i;
        }
      }
      return melhor;
    }

    /**
     * Um passo do mundo dos itens, entre o corpo do quadro passado (`antes`) e
     * o deste quadro (`depois`). Devolve:
     *   { estado, pegou: [indices das moedas], quebrou: indice|-1, pontos }
     */
    function passo(estado, mapa, antes, depois) {
      var pegou = moedasTocadas(depois, mapa, estado);
      var quebrou = blocoAtingido(antes, depois, mapa, estado);
      if (!pegou.length && quebrou < 0) {
        return { estado: estado, pegou: NADA, quebrou: -1, pontos: 0 };
      }

      var novo = {
        moedas: estado.moedas.slice(),
        blocos: estado.blocos.slice(),
        limites: estado.limites
      };
      for (var i = 0; i < pegou.length; i++) novo.moedas[pegou[i]] = false;
      if (quebrou >= 0) {
        novo.blocos[quebrou] = false;
        novo.limites = Mapa.limitesCom(mapa, novo.blocos);   // o bloco sumiu
      }

      return {
        estado: novo,
        pegou: pegou,
        quebrou: quebrou,
        pontos: pegou.length * PONTOS_MOEDA
      };
    }

    return {
      novoEstado: novoEstado,
      moedasTocadas: moedasTocadas,
      blocoAtingido: blocoAtingido,
      passo: passo,
      quantos: quantos,
      PONTOS_MOEDA: PONTOS_MOEDA
    };
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
    '......................................................???..........................................................F....',
    '................................oooo..........ooo.........oo.oo...oo......oooo.............ooo..........ooo.............',
    '..............???.........oo....====.....oo...===..ooooooooo....ooooo..??.====......oo.....===..oo..??..===.............',
    '.........ooo..ooo........o..o....oo.....o..o..ooo.###########..#######.oo..........o..o........o..o.oo..........oo..oo..',
    '..P..ooo..........ooo.oo......oo.....ooo....oo....###########..#######.........ooo......ooo.................oooo....ooo.',
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
      Itens: Itens,
      Camera: Camera,
      FASE_1: FASE_1,
      fase: fase,
      mundo: {
        LARGURA: LARGURA, ALTURA: ALTURA, CHAO_Y: CHAO_Y, TILE: TILE,
        LARGURA_MUNDO: fase.largura, PASSO_MS: PASSO_MS,
        PONTOS_MOEDA: PONTOS_MOEDA, VIDAS_INICIAIS: VIDAS_INICIAIS,
        TOTAL_FASES: TOTAL_FASES
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
    btnDeNovo: $('btn-de-novo'),
    pontos: $('hud-pontos'),
    vidas: $('hud-vidas'),
    fase: $('hud-fase'),
    pontosFim: $('fim-pontos')
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

  // ----- Moedas, blocos quebraveis e os efeitos de pegar/quebrar. Todos sao
  // desenhados a partir do estado dos itens: quem ja foi pego (ou quebrado)
  // simplesmente nao e pintado mais.

  /** Esta a vista da camera? (com uma folga de um quadrado de cada lado) */
  function naTela(item, cam) {
    var x = item.x - cam;
    return x + item.l > -TILE && x < LARGURA + TILE;
  }

  // A moeda gira: 4 quadros, do disco cheio ate quase de perfil.
  var GIRO_MOEDA = [16, 11, 5, 11];

  function desenharMoeda(m, cam, quadro) {
    var l = GIRO_MOEDA[((quadro / 6) | 0) % GIRO_MOEDA.length];
    var x = (m.x - cam + (m.l - l) / 2) | 0;
    bloco(x, m.y + 2, l, m.a - 4, '#a04808');          // a borda escura
    bloco(x + 1, m.y, l - 2, m.a, '#fcd800');          // o dourado
    if (l > 6) bloco(x + 3, m.y + 5, 2, m.a - 10, '#fca044');   // o brilho
  }

  /** Um losango de 16x20 - o cristal que mora dentro do bloco quebravel. */
  function desenharCristal(x, y, cor) {
    bloco(x + 6, y, 4, 4, cor);
    bloco(x + 3, y + 4, 10, 4, cor);
    bloco(x, y + 8, 16, 4, cor);
    bloco(x + 3, y + 12, 10, 4, cor);
    bloco(x + 6, y + 16, 4, 4, cor);
  }

  function desenharQuebravel(b, cam, quadro) {
    var x = b.x - cam;
    bloco(x, b.y, TILE, TILE, '#0d0d17');
    bloco(x + 2, b.y + 2, TILE - 4, TILE - 4, '#6844fc');
    bloco(x + 2, b.y + 2, TILE - 4, 4, '#b8b8f8');            // luz em cima
    bloco(x + 2, b.y + TILE - 6, TILE - 4, 4, '#3820a0');     // sombra embaixo
    desenharCristal(x + 8, b.y + 6, ((quadro / 14) | 0) % 2 ? '#b8f8f8' : '#00e8d8');
  }

  function desenharItens(cam) {
    var i;
    for (i = 0; i < fase.moedas.length; i++) {
      if (!jogo.itens.moedas[i]) continue;
      if (naTela(fase.moedas[i], cam)) desenharMoeda(fase.moedas[i], cam, jogo.relogio);
    }
    for (i = 0; i < fase.quebraveis.length; i++) {
      if (!jogo.itens.blocos[i]) continue;
      if (naTela(fase.quebraveis[i], cam)) desenharQuebravel(fase.quebraveis[i], cam, jogo.relogio);
    }
  }

  // ----- Efeitos: duram poucos quadros e nao mexem em nada do mundo.
  var EFEITO_MOEDA = 20, EFEITO_CRISTAL = 34;

  function desenharEfeitoMoeda(x, y, t) {
    var d = 4 + t;                                   // as faiscas se abrindo
    var lado = Math.max(1, 5 - ((t / 5) | 0));
    bloco(x - d, y - d, lado, lado, '#fcfcfc');
    bloco(x + d, y - d, lado, lado, '#fcfcfc');
    bloco(x - d, y + d, lado, lado, '#fcd800');
    bloco(x + d, y + d, lado, lado, '#fcd800');
    if (t < 12) bloco(x - 3, y - 8 - t * 1.5, 6, 10 - t / 2, '#fcd800');
  }

  function desenharEfeitoCristal(x, y, t) {
    for (var i = 0; i < 4; i++) {                    // os cacos do bloco
      var lado = i < 2 ? -1 : 1;
      var alto = i % 2 ? 1 : 0.6;
      bloco(x + lado * (6 + t * 1.2) - 3, y - 10 * alto + t * t * 0.05 - 4,
            6, 6, i % 2 ? '#6844fc' : '#3820a0');
    }
    if (t < 24) desenharCristal(x - 8, y - 10 - t * 1.1, t % 6 < 3 ? '#b8f8f8' : '#00e8d8');
  }

  function desenharEfeitos(cam) {
    for (var i = 0; i < jogo.efeitos.length; i++) {
      var f = jogo.efeitos[i];
      var x = f.x - cam;
      if (x < -TILE * 2 || x > LARGURA + TILE * 2) continue;
      var t = f.total - f.vida;                      // quadros desde que nasceu
      if (f.tipo === 'moeda') desenharEfeitoMoeda(x, f.y, t);
      else desenharEfeitoCristal(x, f.y, t);
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
    desenharItens(cam);
    desenharBandeira(cam);

    var arte;
    if (!jogo.heroi.noChao) arte = HEROI_PULANDO;
    else if (jogo.heroi.andando) {
      arte = ((jogo.relogio / 8) | 0) % 2 ? HEROI_ANDANDO : HEROI_PARADO;
    } else arte = HEROI_PARADO;

    sprite(arte, jogo.heroi.x - cam, jogo.heroi.y, 2, jogo.heroi.direcao < 0);
    desenharEfeitos(cam);
  }

  // -------------------------------------------------------------- O jogo ----
  var jogo = {
    tela: 'menu',                       // 'menu' | 'jogando'
    relogio: 0,                         // quadros desde o inicio da partida
    quedas: 0,                          // quantas vezes caiu num buraco
    concluida: false,                   // ja tocou a bandeira?
    camera: 0,
    pontos: 0,                          // o placar que aparece no HUD
    vidas: VIDAS_INICIAIS,              // fixo em 3 ate a fase 4 do plano
    fase: 1,                            // a fase 1 de 3
    heroi: Fisica.novoCorpo(fase.spawn.x, fase.spawn.y),
    itens: Itens.novoEstado(fase),      // quais moedas/blocos ainda existem
    efeitos: [],                        // faiscas e cristais, so enfeite
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

  // ----------------------------------------------------------------- HUD ----
  /* Pontos, vidas e fase ficam no HTML (fora do canvas): assim eles crescem
     junto com a tela e continuam legiveis no celular. Escrever no DOM so
     quando o numero muda evita mexer na pagina 60 vezes por segundo. */
  var CORACAO = '❤️';
  var hudPintado = { pontos: -1, vidas: -1, fase: -1 };

  function repetir(texto, n) {
    var saida = '';
    for (var i = 0; i < n; i++) saida += texto;
    return saida;
  }

  function atualizarHud() {
    if (jogo.pontos !== hudPintado.pontos) {
      hudPintado.pontos = jogo.pontos;
      el.pontos.textContent = String(jogo.pontos);
    }
    if (jogo.vidas !== hudPintado.vidas) {
      hudPintado.vidas = jogo.vidas;
      el.vidas.textContent = repetir(CORACAO, jogo.vidas) || '—';
    }
    if (jogo.fase !== hudPintado.fase) {
      hudPintado.fase = jogo.fase;
      el.fase.textContent = jogo.fase + ' / ' + TOTAL_FASES;
    }
  }

  /* Volta a fase inteira ao comeco: heroi no spawn, moedas e blocos de volta
     no lugar e o placar zerado. Cair num buraco ainda e so isto - o checkpoint
     e a perda de vida chegam na fase 4 do plano. */
  function reiniciarFase() {
    jogo.heroi = Fisica.novoCorpo(fase.spawn.x, fase.spawn.y);
    jogo.itens = Itens.novoEstado(fase);
    jogo.efeitos.length = 0;
    jogo.pontos = 0;
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
    jogo.concluida = false;
    el.fim.classList.add('hidden');
    atualizarHud();
  }

  /** Guarda um efeito de tela (faisca da moeda, cristal do bloco). */
  function soltarEfeito(tipo, item, duracao) {
    jogo.efeitos.push({
      tipo: tipo,
      x: item.x + item.l / 2,
      y: item.y + item.a / 2,
      vida: duracao,
      total: duracao
    });
  }

  /** Envelhece os efeitos e joga fora os que ja acabaram. */
  function envelhecerEfeitos() {
    for (var i = jogo.efeitos.length - 1; i >= 0; i--) {
      if (--jogo.efeitos[i].vida <= 0) jogo.efeitos.splice(i, 1);
    }
  }

  /* Passa o mundo dos itens um quadro para a frente: soma os pontos das moedas
     pegas, tira do mapa o bloco quebrado e solta os efeitos na tela. */
  function atualizarItens(antes) {
    var r = Itens.passo(jogo.itens, fase, antes, jogo.heroi);
    if (r.estado === jogo.itens) return;

    jogo.itens = r.estado;
    jogo.pontos += r.pontos;

    for (var i = 0; i < r.pegou.length; i++) {
      soltarEfeito('moeda', fase.moedas[r.pegou[i]], EFEITO_MOEDA);
      emitir('moeda');
    }
    if (r.quebrou >= 0) {
      soltarEfeito('cristal', fase.quebraveis[r.quebrou], EFEITO_CRISTAL);
      emitir('bloco-quebrado');
    }
    atualizarHud();
  }

  function atualizar() {
    if (jogo.concluida) return;

    jogo.relogio++;
    var antes = jogo.heroi;
    jogo.heroi = Fisica.passo(antes, entrada, jogo.itens.limites);
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
    envelhecerEfeitos();

    if (Fisica.caiu(jogo.heroi, fase.fundo)) {          // caiu num buraco
      jogo.quedas++;
      emitir('queda');
      reiniciarFase();
      return;
    }

    atualizarItens(antes);

    if (Fisica.tocandoCorpo(jogo.heroi, fase.bandeira)) {
      jogo.concluida = true;
      emitir('fase-concluida');
      el.pontosFim.textContent = String(jogo.pontos);
      el.fim.classList.remove('hidden');
    }
  }

  function comecarSolo() {
    jogo.tela = 'jogando';
    jogo.relogio = 0;
    jogo.quedas = 0;
    jogo.vidas = VIDAS_INICIAIS;
    jogo.fase = 1;
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
  atualizarHud();
  ajustarPalco();
  desenharCena();
  requestAnimationFrame(quadro);
}());
