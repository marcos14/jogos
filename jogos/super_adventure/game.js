/* ==========================================================================
   SUPER ADVENTURE  -  plataforma retro, no estilo dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 8 do plano: a ligacao com a Central - o menu ganha o "Jogar com
   amigos", que abre o lobby pronto da plataforma (criar sala, codigo de 4
   letras, lista de salas abertas, "pronto" e "comecar"). Quando a sala comeca,
   todo mundo cai na tela do jogo. A sincronia do mundo em si ainda nao: ela
   comeca na fase 9.

     - `Fisica`: as funcoes puras do movimento, com colisao AABB contra os
       blocos solidos do mapa (para em cima, nao atravessa, bate a cabeca).
     - `Mapa`: le um tilemap escrito como texto e devolve os retangulos
       solidos, as moedas, os blocos quebraveis, os checkpoints, os inimigos,
       o ponto de nascimento e a bandeira. Tambem e funcao pura.
     - `Itens`: o que o heroi encosta e o que ele quebra. Tambem puro: recebe
       o estado dos itens e devolve um estado NOVO, com o que aconteceu.
     - `Progresso`: as vidas e os checkpoints. Cair custa uma vida e devolve o
       heroi ao ultimo checkpoint ligado; sem vidas, a fase inteira recomeca.
       Puro tambem.
     - `Inimigos`: a patrulha do goomba e da turtle (ida e volta na plataforma,
       2px por quadro) e o que acontece no contato: pisar em cima derrota
       (+20 pontos; a turtle vira casco), encostar de frente custa uma vida.
       Puro do mesmo jeito.
     - `Moveis`: as plataformas moveis da fase 3. Andam sozinhas pelo trilho
       desenhado no tilemap, param um instante em cada ponta e CARREGAM quem
       estiver em cima. Pura tambem.
     - `Camera`: side-scroll, seguindo o heroi sem sair das bordas do mundo.
     - `Corrida`: o caderninho da partida solo - quanto cada fase rendeu, o
       bonus de bandeira e qual e a proxima. So anda para a frente. Puro.
     - As tres fases do PRD, cada uma um degrau mais dificil que a anterior:

         fase 1  facil   120 colunas, 100 moedas, 4 bichos a 2px/quadro
         fase 2  medio   128 colunas,  80 moedas, 6 bichos a 3px/quadro,
                         buracos por toda parte e uma ponte de plataformas
                         soltas sobre um vao de 12 quadrados
         fase 3  dificil 140 colunas,  60 moedas, 6 bichos a 3px/quadro que
                         PERSEGUEM o heroi quando o veem, tres plataformas
                         moveis sobre vaos e um elevador

   A partida solo e uma corrida fixa fase 1 -> 2 -> 3, sem volta: cada bandeira
   fecha a fase (+50 pontos de bonus) e abre a proxima; a bandeira da fase 3
   fecha a corrida e traz a tela de PARABENS, com os pontos fase a fase e o
   total. "Jogar novamente" comeca tudo do zero, da fase 1.

   A interface fecha o RF-7: o HUD tem os botoes de pausa e de tela cheia, o
   quadro de pausa congela o mundo (o laco continua desenhando, so o
   `atualizar()` para) e a caixa no canto lembra os controles.

     - `Rede`: tudo o que sabe da Central mora aqui dentro, e o arquivo inteiro
       so entra nesse caminho se `window.Plataforma` existir. Sem servidor (o
       index.html aberto direto do disco), o `/plataforma/sdk.js` nem carrega:
       o botao "Jogar com amigos" continua escondido e o jogo e o mesmo de
       sempre, do menu ao PARABENS.

   Nada disto usa imagem: tudo e retangulo pintado no Canvas 2D.
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
  var PONTOS_INIMIGO = 20;                // pisar num inimigo vale 20 pontos
  var PONTOS_BANDEIRA = 50;               // chegar na bandeira vale 50 de bonus
  var VIDAS_INICIAIS = 3;                 // cada tentativa comeca com 3 vidas
  var TOTAL_FASES = 3;                    // o jogo completo tem 3 fases

  // ------------------------------------------------------------- Os bichos ---
  var VEL_INIMIGO = 2;                    // patrulha padrao: 2px por quadro
  var VISTA_INIMIGO = 6 * TILE;           // ate onde um bicho "esperto" enxerga

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
        andando: false,             // so para a animacao
        apoio: -1                   // em que plataforma movel esta pisando
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
     *
     * O corpo devolvido traz `apoio`: o indice da plataforma movel em que ele
     * pousou (os retangulos delas vem marcados com `movel`), ou -1 quando o
     * chao e firme. E com isso que `Moveis.carregar()` leva o heroi junto.
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
      var apoio = -1;

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
          var topo = s.y - HEROI_A;
          // Pisando em duas coisas na mesma altura, a plataforma movel ganha:
          // e nela que o heroi precisa ficar grudado para ser carregado.
          if (topo > pouso || (topo === pouso && s.movel === undefined)) continue;
          pouso = topo;
          apoio = s.movel === undefined ? -1 : s.movel;
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
        apoio = -1;
      }

      return {
        x: x, y: y, vx: vx, vy: vyProximo,
        noChao: noChao,
        subida: subida,
        pularPreso: pularPreso,
        direcao: vx === 0 ? corpo.direcao : (vx > 0 ? 1 : -1),
        andando: vx !== 0 && noChao,
        apoio: apoio
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
         C  checkpoint (o heroi renasce nele depois de ligado)
         g  goomba         t  turtle  (os dois patrulham a plataforma abaixo)
         M  plataforma movel (anda deitada)   -  o trilho por onde ela anda
         N  plataforma movel (elevador)       |  o trilho de subir e descer

     Uma plataforma movel e a fileira de `M` (ou de `N`) desenhada no mapa: ela
     mede o tanto de quadrados que a fileira tem. O trilho e o rastro de `-`
     (ou de `|`) colado nela - a plataforma vai e volta de ponta a ponta do
     rastro, e o `M`/`N` so diz onde ela comeca. Trilho e rastro sao marcas de
     desenho: nenhum dos dois e solido.

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

    /**
     * O retangulo de um mastro plantado no quadrado (coluna, linha): vai da
     * letra ate o primeiro chao abaixo dela. E a forma da bandeira e a dos
     * checkpoints - assim os dois sao faceis de encostar, seja andando pelo
     * chao, seja passando por cima.
     */
    function mastro(mapa, coluna, linha) {
      var pe = linha + 1;
      while (pe < mapa.linhas && !solido(mapa, coluna, pe)) pe++;
      return { x: coluna * TILE, y: linha * TILE, l: TILE, a: (pe - linha) * TILE };
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
      return {
        esquerda: 0, direita: mapa.largura, solidos: solidos,
        espertos: mapa.espertos          // os bichos desta fase perseguem?
      };
    }

    /**
     * O molde de uma plataforma movel deitada: a fileira de `M` das colunas
     * `c0` a `c1` da linha `r`, e o trilho de `-` colado nas duas pontas dela.
     */
    function movelDeitada(mapa, c0, c1, r) {
      var l = (c1 - c0 + 1) * TILE;
      var esq = c0, dir = c1;
      while (tile(mapa, esq - 1, r) === '-') esq--;
      while (tile(mapa, dir + 1, r) === '-') dir++;
      return {
        eixo: 'x', x: c0 * TILE, y: r * TILE, l: l, a: TILE,
        min: esq * TILE, max: (dir + 1) * TILE - l
      };
    }

    /**
     * O molde de um elevador: a fileira de `N` e o trilho de `|` que sobe e
     * desce pela coluna da esquerda dela.
     */
    function movelEmPe(mapa, c0, c1, r) {
      var cima = r, baixo = r;
      while (tile(mapa, c0, cima - 1) === '|') cima--;
      while (tile(mapa, c0, baixo + 1) === '|') baixo++;
      return {
        eixo: 'y', x: c0 * TILE, y: r * TILE, l: (c1 - c0 + 1) * TILE, a: TILE,
        min: cima * TILE, max: baixo * TILE
      };
    }

    /** Acha as fileiras de `M` e de `N` do desenho e devolve os moldes. */
    function lerMoveis(mapa) {
      var lista = [], r, c;
      for (r = 0; r < mapa.linhas; r++) {
        for (c = 0; c < mapa.colunas; c++) {
          var ch = tile(mapa, c, r);
          if (ch !== 'M' && ch !== 'N') continue;
          var fim = c;
          while (tile(mapa, fim + 1, r) === ch) fim++;
          lista.push(ch === 'M' ? movelDeitada(mapa, c, fim, r)
                                : movelEmPe(mapa, c, fim, r));
          c = fim;
        }
      }
      return lista;
    }

    /**
     * Le o desenho e devolve o mapa pronto para a fisica e para o desenho.
     * `opcoes` e o tempero da fase: { velInimigo, espertos }.
     */
    function ler(grade, opcoes) {
      var op = opcoes || {};
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
        checkpoints: [],
        inimigos: [],
        moveis: [],
        spawn: null,
        bandeira: null,
        velInimigo: op.velInimigo || VEL_INIMIGO,   // quantos px por quadro
        espertos: !!op.espertos                     // eles perseguem o heroi?
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
          if (ch === 'C') mapa.checkpoints.push(mastro(mapa, c, r));
          if (ch === 'F') mapa.bandeira = mastro(mapa, c, r);
          if (ch === 'g' || ch === 't') {
            mapa.inimigos.push({
              tipo: ch === 'g' ? 'goomba' : 'turtle',
              x: c * TILE, y: r * TILE
            });
          }
        }
      }

      // Na ordem do percurso: o checkpoint 0 e o primeiro que o heroi encontra
      // andando para a direita (o desenho e lido linha a linha, nao coluna a
      // coluna, entao eles nao saem prontos da leitura). O mesmo vale para os
      // inimigos, que ficam em linhas diferentes conforme a plataforma.
      mapa.checkpoints.sort(function (a, b) { return a.x - b.x; });
      mapa.inimigos.sort(function (a, b) { return a.x - b.x; });
      mapa.moveis = lerMoveis(mapa);

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
      mastro: mastro,
      TILE: TILE
    };
  }());

  // -------------------------------------------------- As plataformas moveis --
  /* A novidade da fase 3: chao que nao fica quieto.

     O mapa diz o molde de cada plataforma (onde ela comeca, que tamanho tem e
     de onde ate onde vai o trilho); o "estado das moveis" diz onde elas estao
     agora e para que lado estao indo:

         { lista: [ { eixo: 'x'|'y', x, y, l, a, min, max, passo, espera } ] }

     `passo` e quantos pixels ela anda por quadro (1, para um lado ou para o
     outro) e `espera` sao os quadros que ela ainda vai ficar parada. Chegando
     numa ponta do trilho ela para meio segundo antes de voltar - e essa
     paradinha que da tempo de subir e de descer dela com calma.

     Quem esta em cima precisa ir junto, senao a plataforma escapa debaixo dos
     pes. Por isso `andar()` devolve tambem o quanto cada uma andou, e
     `carregar()` usa o `apoio` que a fisica marcou no corpo para somar esse
     tanto no heroi antes do passo seguinte. Como todo o resto por aqui, as
     duas sao funcoes puras. */
  var Moveis = (function () {

    var VEL = 1;                          // 1px por quadro: da para embarcar
    var PAUSA = 24;                       // quadros parados em cada ponta
    var VAZIO = { lista: [] };

    /** Uma plataforma novinha, no lugar em que o mapa desenhou ela. */
    function novo(molde) {
      return {
        eixo: molde.eixo, x: molde.x, y: molde.y, l: molde.l, a: molde.a,
        min: molde.min, max: molde.max,
        // Comeca indo para a ponta em que o heroi embarca: a esquerda, nas
        // deitadas; embaixo, nos elevadores.
        passo: molde.eixo === 'x' ? -VEL : VEL,
        espera: 0
      };
    }

    /** O estado do comeco da fase: cada plataforma no lugar do desenho. */
    function novoEstado(mapa) {
      if (!mapa.moveis.length) return VAZIO;
      var lista = [];
      for (var i = 0; i < mapa.moveis.length; i++) lista.push(novo(mapa.moveis[i]));
      return { lista: lista };
    }

    /** O retangulo solido da plataforma `i`, marcado para a fisica reconhecer. */
    function retangulo(m, i) {
      return { x: m.x, y: m.y, l: m.l, a: m.a, movel: i };
    }

    /** Uma copia da plataforma com a posicao e o rumo trocados. */
    function mover(m, pos, passo, espera) {
      var deitada = m.eixo === 'x';
      return {
        eixo: m.eixo,
        x: deitada ? pos : m.x,
        y: deitada ? m.y : pos,
        l: m.l, a: m.a, min: m.min, max: m.max,
        passo: passo, espera: espera
      };
    }

    /** Um quadro de uma plataforma so. Funcao pura. */
    function andarUm(m) {
      if (m.min >= m.max) return m;                  // trilho de um lugar so
      var pos = m.eixo === 'x' ? m.x : m.y;
      if (m.espera > 0) return mover(m, pos, m.passo, m.espera - 1);

      pos += m.passo;
      var passo = m.passo, espera = 0;
      if (pos <= m.min) { pos = m.min; passo = VEL; espera = PAUSA; }
      else if (pos >= m.max) { pos = m.max; passo = -VEL; espera = PAUSA; }
      return mover(m, pos, passo, espera);
    }

    /**
     * Um quadro de todas elas. Devolve { estado, deltas }, com `deltas[i]`
     * dizendo o quanto a plataforma `i` andou neste quadro.
     */
    function andar(estado) {
      if (!estado || !estado.lista.length) return { estado: VAZIO, deltas: [] };
      var lista = [], deltas = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var antes = estado.lista[i];
        var depois = andarUm(antes);
        lista.push(depois);
        deltas.push({ dx: depois.x - antes.x, dy: depois.y - antes.y });
      }
      return { estado: { lista: lista }, deltas: deltas };
    }

    /** Leva o corpo junto com a plataforma em que ele esta pisando. */
    function carregar(corpo, deltas) {
      var i = corpo ? corpo.apoio : -1;
      var d = (i >= 0 && deltas) ? deltas[i] : null;
      if (!d || (d.dx === 0 && d.dy === 0)) return corpo;
      return {
        x: corpo.x + d.dx, y: corpo.y + d.dy,
        vx: corpo.vx, vy: corpo.vy,
        noChao: corpo.noChao, subida: corpo.subida,
        pularPreso: corpo.pularPreso, direcao: corpo.direcao,
        andando: corpo.andando, apoio: corpo.apoio
      };
    }

    /** Os limites do mapa mais as plataformas moveis onde elas estao agora. */
    function limitesCom(limites, estado) {
      if (!estado || !estado.lista.length) return limites;
      var solidos = limites.solidos.slice();
      for (var i = 0; i < estado.lista.length; i++) {
        solidos.push(retangulo(estado.lista[i], i));
      }
      return {
        esquerda: limites.esquerda, direita: limites.direita,
        solidos: solidos, espertos: limites.espertos
      };
    }

    return {
      novoEstado: novoEstado,
      retangulo: retangulo,
      andar: andar,
      andarUm: andarUm,
      carregar: carregar,
      limitesCom: limitesCom,
      medidas: { VEL: VEL, PAUSA: PAUSA }
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

  // ---------------------------------------------------------- O progresso ---
  /* As vidas e os checkpoints - o que sobra de uma tentativa quando o heroi
     cai num buraco.

     O mapa diz ONDE os checkpoints estao; o "estado do progresso" diz o que ja
     aconteceu nesta tentativa:

         { vidas: 3,                    // coracoes que ainda restam
           ativos: [true, false, ...],  // quais checkpoints ja foram ligados
           atual: 0 }                   // o ultimo que ligou (-1 = nenhum)

     As regras do PRD, em duas funcoes puras:

       - `tocar()`  liga o checkpoint em que o heroi encostou. Uma vez ligado,
         ele fica ligado ate o fim da tentativa: checkpoint nao expira.
       - `perderVida()` tira um coracao. Sobrando vida, o heroi volta ao ultimo
         checkpoint ligado; sem nenhuma, a tentativa acaba e a fase inteira
         recomeca - vidas cheias de novo e todos os checkpoints apagados.

     Como todo o resto, nenhuma das duas mexe no estado que recebe. */
  var Progresso = (function () {

    /** Um array de `n` posicoes, todas com `false`. */
    function apagados(n) {
      var lista = [];
      for (var i = 0; i < n; i++) lista.push(false);
      return lista;
    }

    /** O comeco de uma tentativa: vidas cheias, nenhum checkpoint ligado. */
    function novoEstado(mapa) {
      return {
        vidas: VIDAS_INICIAIS,
        ativos: apagados(mapa.checkpoints.length),
        atual: -1
      };
    }

    /** Onde o heroi nasce agora: no checkpoint mais novo, ou no inicio. */
    function nascedouro(mapa, estado) {
      var cp = estado.atual >= 0 ? mapa.checkpoints[estado.atual] : null;
      if (!cp) return { x: mapa.spawn.x, y: mapa.spawn.y };
      // De pe no pe do mastro, exatamente como se tivesse acabado de pousar.
      return {
        x: cp.x + (cp.l - HEROI_L) / 2,
        y: cp.y + cp.a - HEROI_A
      };
    }

    /** Qual checkpoint apagado o corpo esta encostando agora (-1 = nenhum). */
    function checkpointTocado(estado, mapa, corpo) {
      for (var i = 0; i < mapa.checkpoints.length; i++) {
        if (estado.ativos[i]) continue;                // ja estava ligado
        if (Fisica.tocandoCorpo(corpo, mapa.checkpoints[i])) return i;
      }
      return -1;
    }

    /**
     * Liga o checkpoint em que o heroi encostou.
     * Devolve { estado, ativou: indice|-1 } - e o MESMO estado se nada mudou.
     */
    function tocar(estado, mapa, corpo) {
      var i = checkpointTocado(estado, mapa, corpo);
      if (i < 0) return { estado: estado, ativou: -1 };

      var ativos = estado.ativos.slice();
      ativos[i] = true;
      return {
        estado: { vidas: estado.vidas, ativos: ativos, atual: i },
        ativou: i
      };
    }

    /**
     * Tira um coracao. Devolve { estado, tipo }:
     *   'checkpoint' - ainda ha vidas: renascer no ultimo checkpoint ligado
     *   'reinicio'   - acabaram as vidas: a fase inteira volta ao comeco, com
     *                  as vidas cheias e os checkpoints apagados
     */
    function perderVida(estado, mapa) {
      var vidas = estado.vidas - 1;
      if (vidas > 0) {
        return {
          estado: { vidas: vidas, ativos: estado.ativos, atual: estado.atual },
          tipo: 'checkpoint'
        };
      }
      return { estado: novoEstado(mapa), tipo: 'reinicio' };
    }

    return {
      novoEstado: novoEstado,
      nascedouro: nascedouro,
      checkpointTocado: checkpointTocado,
      tocar: tocar,
      perderVida: perderVida,
      VIDAS_INICIAIS: VIDAS_INICIAIS
    };
  }());

  // ----------------------------------------------------------- Os inimigos --
  /* Os dois bichos do PRD, e o que acontece quando o heroi esbarra neles.

     O mapa diz ONDE cada inimigo nasce (a letra `g` ou `t`); o "estado dos
     inimigos" diz onde eles estao agora e como estao:

         { lista: [ { tipo: 'goomba'|'turtle',
                      x, y, vx, vy,
                      estado: 'vivo' | 'casco' | 'morto' } ] }

     A patrulha e simples e sempre na mesma velocidade: o bicho anda para um
     lado ate achar uma parede, a beirada da plataforma ou a ponta do mundo, e
     ai vira. Ele nao cai de bobeira, mas TEM gravidade - se o chao sumir
     debaixo dele (um bloco quebravel, por exemplo), ele despenca ate pousar no
     proximo solido.

     A velocidade e o tempero de cada fase (`mapa.velInimigo`): 2px por quadro
     na fase 1, 3px nas fases 2 e 3. E na fase 3 eles ainda sao ESPERTOS
     (`limites.espertos`): enxergando o heroi a ate seis quadrados, na mesma
     altura, o bicho para de fazer ida e volta e vai atras dele - na mesma
     velocidade de sempre, que e o que o RF-4 permite. Basta o heroi pular que
     ele some da vista e a patrulha volta ao normal; e por isso que o caminho
     deles fica dificil de adivinhar.

     No contato valem as duas regras do PRD:

       - pisar em cima (o heroi vinha descendo e os pes estavam acima da
         metade do bicho) DERROTA: +20 pontos e o heroi quica. O goomba some
         de vez ('morto'); a turtle vira 'casco' - fica no lugar, virou
         enfeite, nao anda nem machuca mais. Nenhum dos dois volta na partida.
       - encostar de qualquer outro jeito custa uma vida.

     Se no mesmo quadro o heroi pisa num bicho e encosta noutro, o pisao ganha:
     quem estava no ataque nao leva dano - do jeito que os platformers antigos
     sempre fizeram.

     Como todo o resto por aqui, nada disto mexe no estado recebido. */
  var Inimigos = (function () {

    var LARG = 32, ALT = 32;              // goomba e turtle ocupam um quadrado
    var CASCO_A = 20;                     // o casco e mais baixo que a turtle
    var VEL = VEL_INIMIGO;                // a patrulha padrao, da fase 1
    var NADA = [];

    /** O retangulo que o inimigo ocupa no mundo (o casco e mais baixinho). */
    function retangulo(ini) {
      var a = ini.estado === 'casco' ? CASCO_A : ALT;
      return { x: ini.x, y: ini.y + (ALT - a), l: LARG, a: a };
    }

    /** Um bicho novinho, no lugar em que o mapa plantou ele, andando para a
        esquerda (e como os platformers de 8 bits sempre soltaram os seus). */
    function novo(molde, vel) {
      return {
        tipo: molde.tipo, x: molde.x, y: molde.y,
        vx: -(vel || VEL), vy: 0, estado: 'vivo'
      };
    }

    /** O estado do comeco da fase: todos vivos, cada um no seu lugar. */
    function novoEstado(mapa) {
      var lista = [];
      for (var i = 0; i < mapa.inimigos.length; i++) {
        lista.push(novo(mapa.inimigos[i], mapa.velInimigo));
      }
      return { lista: lista };
    }

    /** Quantos inimigos estao naquela situacao ('vivo' se nao disser outra). */
    function quantos(estado, situacao) {
      var alvo = situacao || 'vivo', n = 0;
      for (var i = 0; i < estado.lista.length; i++) {
        if (estado.lista[i].estado === alvo) n++;
      }
      return n;
    }

    /** Andar para `x` esbarraria num solido? */
    function parede(x, y, solidos) {
      for (var i = 0; i < solidos.length; i++) {
        var s = solidos[i];
        if (y + ALT <= s.y || y >= s.y + s.a) continue;      // outra altura
        if (x + LARG <= s.x || x >= s.x + s.l) continue;     // nao encostou
        return true;
      }
      return false;
    }

    /** Tem chao debaixo da ponta da frente, ou o proximo passo e no vazio? */
    function chaoAFrente(x, y, vx, solidos) {
      var ponta = vx > 0 ? x + LARG - 1 : x;
      var pes = y + ALT;
      for (var i = 0; i < solidos.length; i++) {
        var s = solidos[i];
        if (ponta < s.x || ponta >= s.x + s.l) continue;
        if (Math.abs(pes - s.y) > 0.5) continue;             // nao e o piso dele
        return true;
      }
      return false;
    }

    /** A superficie mais alta que os pes cruzaram indo de `yAntes` a `y`. */
    function pouso(x, yAntes, y, solidos) {
      var achado = Infinity;
      for (var i = 0; i < solidos.length; i++) {
        var s = solidos[i];
        if (x + LARG <= s.x || x >= s.x + s.l) continue;
        if (yAntes + ALT > s.y) continue;                    // ja estava abaixo
        if (y + ALT < s.y) continue;                         // ainda nao chegou
        achado = Math.min(achado, s.y - ALT);
      }
      return achado;
    }

    /**
     * O bicho esperto enxergou o heroi? So conta quem esta na mesma altura
     * (pulou = sumiu da vista) e a ate seis quadrados de distancia.
     */
    function vendo(ini, heroi) {
      return !!heroi &&
             Math.abs(heroi.y - ini.y) <= ALT &&
             Math.abs(heroi.x - ini.x) <= VISTA_INIMIGO;
    }

    /** Um quadro de patrulha de um bicho so. Funcao pura. */
    function andarUm(ini, limites, heroi) {
      if (ini.estado === 'morto') return ini;
      var solidos = limites.solidos;
      var vx = ini.estado === 'casco' ? 0 : ini.vx;          // casco nao anda
      var x = ini.x;

      // Fase 3: vendo o heroi, o bicho vira para o lado dele e vai atras.
      if (vx !== 0 && limites.espertos && vendo(ini, heroi) && heroi.x !== ini.x) {
        vx = heroi.x > ini.x ? Math.abs(vx) : -Math.abs(vx);
      }

      if (vx !== 0) {
        x = ini.x + vx;
        var noChao = ini.vy === 0;
        if (x < limites.esquerda || x + LARG > limites.direita) vx = -vx;
        else if (parede(x, ini.y, solidos)) vx = -vx;
        else if (noChao && !chaoAFrente(x, ini.y, vx, solidos)) vx = -vx;
        if (x !== ini.x + vx) x = ini.x;                     // vira sem sair do lugar
      }

      var y = ini.y + ini.vy;
      var vy = Math.min(ini.vy + GRAVIDADE, VEL_Y_MAX);
      if (ini.vy >= 0) {
        var chao = pouso(x, ini.y, y, solidos);
        if (chao < Infinity) { y = chao; vy = 0; }
      }

      return { tipo: ini.tipo, x: x, y: y, vx: vx, vy: vy, estado: ini.estado };
    }

    /** Um quadro de patrulha de todos eles. */
    function andar(estado, limites, heroi) {
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        lista.push(andarUm(estado.lista[i], limites, heroi));
      }
      return { lista: lista };
    }

    /** O heroi caiu em cima deste bicho neste quadro? */
    function pisou(antes, depois, ini) {
      if (depois.y <= antes.y) return false;                 // nao vinha descendo
      var alvo = retangulo(ini);
      return antes.y + HEROI_A <= alvo.y + alvo.a / 2;       // os pes vinham de cima
    }

    /**
     * O contato do heroi com os bichos, entre o corpo do quadro passado
     * (`antes`) e o deste quadro (`depois`). Devolve:
     *   { estado, derrotados: [indices], pontos, dano, quique }
     * Sem contato nenhum, devolve o MESMO estado.
     */
    function contato(estado, antes, depois) {
      var eu = Fisica.retangulo(depois);
      var lista = null, derrotados = null, pontos = 0, dano = false;

      for (var i = 0; i < estado.lista.length; i++) {
        var ini = estado.lista[i];
        if (ini.estado !== 'vivo') continue;                 // casco/morto nao contam
        if (!Fisica.tocando(eu, retangulo(ini))) continue;

        if (!pisou(antes, depois, ini)) { dano = true; continue; }

        lista = lista || estado.lista.slice();
        lista[i] = {
          tipo: ini.tipo, x: ini.x, y: ini.y, vx: 0, vy: ini.vy,
          estado: ini.tipo === 'turtle' ? 'casco' : 'morto'
        };
        (derrotados = derrotados || []).push(i);
        pontos += PONTOS_INIMIGO;
      }

      if (!lista) {
        return { estado: estado, derrotados: NADA, pontos: 0, dano: dano, quique: false };
      }
      // Quem pisou nao leva dano no mesmo quadro.
      return {
        estado: { lista: lista }, derrotados: derrotados,
        pontos: pontos, dano: false, quique: true
      };
    }

    /** Patrulha + contato, o passo que o jogo chama a cada quadro. */
    function passo(estado, limites, antes, depois) {
      return contato(andar(estado, limites, depois), antes, depois);
    }

    /**
     * O heroi voltou ao checkpoint: os bichos ainda vivos voltam para onde
     * nasceram (senao o heroi renasceria com um deles no colo). Quem ja foi
     * derrotado continua derrotado - isso nao volta atras na partida.
     */
    function reposicionar(estado, mapa) {
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var ini = estado.lista[i];
        lista.push(ini.estado === 'vivo'
          ? novo(mapa.inimigos[i], mapa.velInimigo) : ini);
      }
      return { lista: lista };
    }

    return {
      novoEstado: novoEstado,
      retangulo: retangulo,
      quantos: quantos,
      andar: andar,
      andarUm: andarUm,
      contato: contato,
      passo: passo,
      pisou: pisou,
      reposicionar: reposicionar,
      vendo: vendo,
      medidas: {
        LARG: LARG, ALT: ALT, CASCO_A: CASCO_A,
        VEL: VEL, VISTA: VISTA_INIMIGO, PONTOS: PONTOS_INIMIGO
      }
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

  // ------------------------------------------------------------- A corrida --
  /* Uma "corrida" e a partida solo inteira: as tres fases do PRD na ordem
     fixa 1 -> 2 -> 3, sem volta (regra de negocio 4). Este modulo e so o
     caderninho dela - nao sabe desenhar nem ouvir teclado:

         { fase: 1,          // a fase que esta em jogo agora
           fases: [],        // uma linha por fase ja concluida
           total: 0,         // a soma de todas as linhas
           terminada: false} // ja passou a bandeira da fase 3?

     Cada linha guarda o que a fase rendeu:

         { numero: 1, pontos: 430, bonus: 50, total: 480 }

     `pontos` sao as moedas e os bichos daquela fase (o mesmo numero que estava
     no HUD na hora da bandeira) e `bonus` e o premio fixo de chegar na
     bandeira. Puro como o resto: `concluir()` devolve um estado NOVO. */
  var Corrida = (function () {

    /** O comeco de tudo: fase 1, caderno em branco. */
    function novoEstado() {
      return { fase: 1, fases: [], total: 0, terminada: false };
    }

    /**
     * Fecha a fase `numero` com os `pontos` que ela rendeu e abre a proxima.
     * Na fase 3 nao ha proxima: a corrida termina e a tela de parabens usa
     * `fases` e `total` para montar o resumo.
     */
    function concluir(estado, numero, pontos) {
      var linha = {
        numero: numero,
        pontos: pontos,
        bonus: PONTOS_BANDEIRA,
        total: pontos + PONTOS_BANDEIRA
      };
      var ultima = numero >= TOTAL_FASES;
      return {
        // Nunca para tras: ou anda uma fase, ou para na ultima.
        fase: ultima ? TOTAL_FASES : numero + 1,
        fases: estado.fases.concat([linha]),
        total: estado.total + linha.total,
        terminada: ultima
      };
    }

    return {
      novoEstado: novoEstado,
      concluir: concluir,
      PONTOS_BANDEIRA: PONTOS_BANDEIRA,
      TOTAL_FASES: TOTAL_FASES
    };
  }());

  // ------------------------------------------------------ O mapa da fase 1 --
  // Facil: chao quase todo continuo, buracos de 2 quadrados, degraus de 2 e
  // algumas plataformas soltas para quem quiser subir. A bandeira fica no fim.
  //
  // Os tres checkpoints (`C`) ficam logo DEPOIS dos lugares onde da para cair:
  // coluna 29 (passado o primeiro buraco), coluna 63 (do outro lado do vao do
  // planalto) e coluna 87 (passado o buraco das colunas 84-85). Assim quem cai
  // volta perto de onde errou, sem refazer a fase inteira.
  //
  // Os quatro inimigos ficam cada um no seu trecho, longe dos checkpoints (para
  // ninguem renascer com um bicho no colo) e longe do comeco (a primeira parte
  // da fase e so de aquecimento): goomba na coluna 47 (o pedacinho de chao
  // entre o buraco e o planalto), turtle na coluna 50 (em cima do planalto),
  // goomba na coluna 74 e turtle na coluna 102. Cada um patrulha o trecho
  // inteiro em que nasceu, virando na parede ou na beirada.
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
    '................................oooo..........ooo.........oo.ooC..oo......oooo.............ooo..........ooo.............',
    '..............???.........oo....====.....oo...===.tooooooooo....ooooo..??.====......oo.....===..oo..??..===.............',
    '.........ooo..ooo........o..oC...oo.....o..o..ooo.###########..#######.oo..........o..oC.......o..o.oo..........oo..oo..',
    '..P..ooo..........ooo.oo......oo.....ooo....oo.g..###########..#######....g....ooo......ooo...........t.....oooo....ooo.',
    '##########################..#############..##################..#####################..##########..######################',
    '##########################..#############..##################..#####################..##########..######################',
    '##########################..#############..##################..#####################..##########..######################'
  ];

  // ------------------------------------------------------ O mapa da fase 2 --
  // Medio: 128 colunas cheias de buracos de 2 quadrados, um vao de 12
  // quadrados atravessado por uma ponte de plataformas soltas (colunas 62-64 e
  // 67-69, com dois quadrados de ar entre elas), 80 moedas, 5 blocos
  // quebraveis, 3 checkpoints (colunas 25, 76 e 105 - sempre logo depois de um
  // buraco) e SEIS bichos, todos 3px por quadro em vez de 2.
  //
  // Cada bicho fica pelo menos cinco quadrados adiante do buraco anterior: de
  // um lado do buraco ninguem enxerga o bicho do outro, e por isso o heroi
  // nunca fica encurralado entre o vao e um bicho que nao da para alcancar.
  var FASE_2 = [
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '................................................................................................................................',
    '..........................................................................................................................F.....',
    '......ooo............................................................................................................ooo........',
    '......===..........?...............?..............?...............................................?.................?===........',
    '............oo.o......oo.C.....oo.....oo....o..oo...oo.....ooo...oo...oo....C...o.....oo.......oo...oo...C...o..oo..............',
    '..P..ooo..oo..g...ooo......oo.t...ooo.....ooo.g..oo.....ooo...............oo..oo.t..oo....ooo.g..oo....oo..oo.t.....ooo.oo...oo.',
    '######################..##############..############..######..===..===..##############..############..##########..##############',
    '######################..##############..############..######............##############..############..##########..##############',
    '######################..##############..############..######............##############..############..##########..##############'
  ];

  // ------------------------------------------------------ O mapa da fase 3 --
  // Dificil: 140 colunas, 60 moedas, 8 blocos quebraveis espalhados por toda a
  // fase, 3 checkpoints (colunas 29, 82 e 108) e seis bichos ESPERTOS, que
  // perseguem o heroi quando o veem.
  //
  // A novidade sao as quatro plataformas moveis. Tres sao deitadas e fazem o
  // papel de ponte sobre vaos de 8 quadrados (colunas 20-27, 46-53 e 98-105):
  // o trilho `-` vai de ponta a ponta do vao, entao numa ponta a plataforma
  // fica rente ao chao de tras e na outra rente ao chao da frente - da para
  // entrar e sair andando, sem pulo. A quarta e um elevador (`N` na coluna 72,
  // com trilho `|` da linha 10 a 14): ele sobe de um poco ate o alto do
  // paredao das colunas 74-79, que nao tem como ser pulado.
  var FASE_3 = [
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '............................................................................................................................................',
    '...........................................................................oooo.......................................................F.....',
    '........................................................................|.######............................................................',
    '...............?.................?.........?...............?............|.######......?..........................?........?............?....',
    '........o........o...oo..oo..C........o........oo..oo...o...o..o........NN######..C.......o........oo..oo...C...o.....o.......oo.....o......',
    '..P..oo..oo.g...oo............oo..o.t...oo..oo...........oo...g..oo.t...|.######....oo..t...oo..o.............oo..o.g...oo..o......oo...oo..',
    '####################--MM----##################--MM----##################|.########################--MM----####################..############',
    '####################........##################........##################..########################........####################..############',
    '####################........##################........##################..########################........####################..############'
  ];

  // As tres fases do PRD, na ordem fixa em que sao jogadas. Cada uma tem o seu
  // tempero: os bichos ficam mais rapidos na 2 e viram cacadores na 3.
  var FASES = [
    { numero: 1, nome: 'Campo Aberto', desenho: FASE_1, velInimigo: 2, espertos: false },
    { numero: 2, nome: 'Salto Alto', desenho: FASE_2, velInimigo: 3, espertos: false },
    { numero: 3, nome: 'Torre Movedica', desenho: FASE_3, velInimigo: 3, espertos: true }
  ];

  var mapas = [];
  for (var iFase = 0; iFase < FASES.length; iFase++) {
    mapas.push(Mapa.ler(FASES[iFase].desenho, FASES[iFase]));
  }

  // A fase que esta sendo jogada agora. `irParaFase()` troca esta variavel -
  // todo o resto do arquivo (desenho, itens, bichos) le sempre daqui.
  var fase = mapas[0];

  // Aberto para os testes em Node (e, mais para a frente, para a rede).
  // Nada disto depende de DOM.
  if (typeof window !== 'undefined') {
    window.SuperAdventure = {
      Fisica: Fisica,
      Mapa: Mapa,
      Itens: Itens,
      Progresso: Progresso,
      Inimigos: Inimigos,
      Moveis: Moveis,
      Camera: Camera,
      Corrida: Corrida,
      FASE_1: FASE_1,
      FASE_2: FASE_2,
      FASE_3: FASE_3,
      FASES: FASES,
      mapas: mapas,
      fase: fase,
      mundo: {
        LARGURA: LARGURA, ALTURA: ALTURA, CHAO_Y: CHAO_Y, TILE: TILE,
        LARGURA_MUNDO: fase.largura, PASSO_MS: PASSO_MS,
        PONTOS_MOEDA: PONTOS_MOEDA, PONTOS_INIMIGO: PONTOS_INIMIGO,
        PONTOS_BANDEIRA: PONTOS_BANDEIRA,
        VIDAS_INICIAIS: VIDAS_INICIAIS,
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
    k: '#503000',   // botas
    n: '#8b4a10',   // goomba: contorno
    f: '#c07038',   // goomba: cogumelo
    w: '#fcfcfc',   // o branco dos olhos
    c: '#a85400',   // goomba: pes
    v: '#189818',   // turtle: contorno do casco
    l: '#58d854',   // turtle: casco
    a: '#f8b800'    // turtle: cabeca e patas
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

  // ----- Os inimigos, tambem 16x16 quadradinhos de 2px. O goomba e um
  // cogumelo emburrado; a turtle e um casco verde com a cabeca de fora. Os dois
  // andam alternando dois quadros (o que muda e o pe que esta na frente), e o
  // casco e o mesmo desenho do casco da turtle, sem cabeca e sem patas,
  // encostado no chao (por isso ele comeca so na linha 6).
  var GOOMBA_A = [
    '................',
    '................',
    '.....nnnnnn.....',
    '...nnffffffnn...',
    '..nffffffffffn..',
    '.nffffffffffffn.',
    '.nffwwffffwwffn.',
    '.nffweffffewffn.',
    '.nffwwffffwwffn.',
    '.nffffffffffffn.',
    '.nnffffffffffnn.',
    '..nnffffffffnn..',
    '...nnnnnnnnnn...',
    '..cc........cc..',
    '.cccc......cccc.',
    '.cccc......cccc.'
  ];

  var GOOMBA_B = [
    '................',
    '................',
    '.....nnnnnn.....',
    '...nnffffffnn...',
    '..nffffffffffn..',
    '.nffffffffffffn.',
    '.nffwwffffwwffn.',
    '.nffweffffewffn.',
    '.nffwwffffwwffn.',
    '.nffffffffffffn.',
    '.nnffffffffffnn.',
    '..nnffffffffnn..',
    '...nnnnnnnnnn...',
    '.cc..........cc.',
    'cccc........cccc',
    'cccc........cccc'
  ];

  var TURTLE_A = [
    '................',
    '.....vvvvvv.....',
    '...vvllllllvv...',
    '..vllllllllllv..',
    '..vllvvllvvllv..',
    '.vlllvllllvlllva',
    '.vllllvvvvllllaa',
    '.vllllllllllllae',
    '..vllllllllllvaa',
    '...vvllllllvv.a.',
    '.....vvvvvv.....',
    '................',
    '................',
    '................',
    '..aaa......aaa..',
    '..aaa......aaa..'
  ];

  var TURTLE_B = [
    '................',
    '.....vvvvvv.....',
    '...vvllllllvv...',
    '..vllllllllllv..',
    '..vllvvllvvllv..',
    '.vlllvllllvlllva',
    '.vllllvvvvllllaa',
    '.vllllllllllllae',
    '..vllllllllllvaa',
    '...vvllllllvv.a.',
    '.....vvvvvv.....',
    '................',
    '................',
    '................',
    '.aaa........aaa.',
    '.aaa........aaa.'
  ];

  var CASCO = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....vvvvvv.....',
    '...vvllllllvv...',
    '..vllllllllllv..',
    '..vllvvllvvllv..',
    '.vlllvllllvlllv.',
    '.vllllvvvvllllv.',
    '.vllllllllllllv.',
    '..vllllllllllv..',
    '...vvllllllvv...',
    '.....vvvvvv.....'
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
    telaFase: $('tela-fase'),
    fim: $('tela-fim'),
    telaPausa: $('tela-pausa'),
    controles: $('controles'),
    btnSolo: $('btn-solo'),
    btnAmigos: $('btn-amigos'),
    aviso: $('aviso'),
    hudSala: $('hud-sala'),
    hudSalaCodigo: $('hud-sala-codigo'),
    btnProxima: $('btn-proxima'),
    btnDeNovo: $('btn-de-novo'),
    btnPausa: $('btn-pausa'),
    btnTelaCheia: $('btn-tela-cheia'),
    btnContinuar: $('btn-continuar'),
    btnRecomecar: $('btn-recomecar'),
    pontos: $('hud-pontos'),
    vidas: $('hud-vidas'),
    fase: $('hud-fase'),
    faseNumero: $('fase-numero'),
    fasePontos: $('fase-pontos'),
    faseBonus: $('fase-bonus'),
    faseProxima: $('fase-proxima'),
    fimLinhas: [$('fim-fase-1'), $('fim-fase-2'), $('fim-fase-3')],
    fimTotal: $('fim-total')
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

  // ----- As plataformas moveis da fase 3: uma ponte de ferro que anda pelo
  // trilho. O trilho e pintado antes, bem apagadinho, para o jogador ver de
  // onde ate onde ela vai antes mesmo de a plataforma chegar.
  function desenharTrilho(m, cam) {
    var deitada = m.eixo === 'x';
    var x = (deitada ? m.min : m.x + m.l / 2 - 2) - cam;
    var y = deitada ? m.y + m.a / 2 - 2 : m.min;
    var comprimento = deitada ? (m.max - m.min) + m.l : (m.max - m.min) + m.a;
    for (var i = 4; i < comprimento - 4; i += 12) {
      if (deitada) bloco(x + i, y, 6, 4, '#54547c');
      else bloco(x, y + i, 4, 6, '#54547c');
    }
  }

  function desenharMovel(m, cam) {
    var x = m.x - cam;
    bloco(x, m.y, m.l, m.a, '#0d0d17');
    bloco(x + 2, m.y + 2, m.l - 4, m.a - 4, '#a4a4c4');      // o ferro
    bloco(x + 2, m.y + 2, m.l - 4, 5, '#dcdcf4');            // luz em cima
    bloco(x + 2, m.y + m.a - 8, m.l - 4, 6, '#4c4c6c');      // sombra embaixo
    for (var i = 6; i < m.l - 8; i += 14) {                  // os rebites
      bloco(x + i, m.y + m.a / 2 - 2, 4, 4, '#242438');
    }
  }

  function desenharMoveis(cam) {
    for (var i = 0; i < fase.moveis.length; i++) {
      var m = jogo.moveis.lista[i];
      if (!m || !naTela(m, cam)) continue;
      desenharTrilho(m, cam);
      desenharMovel(m, cam);
    }
  }

  // ----- Os checkpoints: um mastro com bandeirinha. Apagado ele e cinza e a
  // bandeirinha fica caida no pe; aceso, ela sobe para o topo e balanca.
  function desenharCheckpoint(cp, cam, aceso, quadro) {
    var x = cp.x - cam;
    bloco(x + 13, cp.y + 2, 6, cp.a - 8, aceso ? '#e0e0f0' : '#8888a0');   // mastro
    bloco(x + 5, cp.y + cp.a - 6, 22, 6, '#0d0d17');                       // base
    bloco(x + 10, cp.y, 12, 6, aceso ? '#fcd800' : '#585868');             // topo

    var pano = aceso ? cp.y + 8 : cp.y + cp.a - 26;   // aceso: a bandeirinha sobe
    var balanco = aceso && ((quadro / 10) | 0) % 2 ? 2 : 0;
    for (var i = 0; i < 4; i++) {
      bloco(x + 19, pano + i * 4, 12 - Math.abs(i - 1) * 3 + balanco, 4,
            aceso ? '#78f800' : '#585868');
    }
  }

  function desenharCheckpoints(cam) {
    for (var i = 0; i < fase.checkpoints.length; i++) {
      var cp = fase.checkpoints[i];
      if (!naTela(cp, cam)) continue;
      desenharCheckpoint(cp, cam, jogo.progresso.ativos[i], jogo.relogio);
    }
  }

  // ----- Os inimigos: quem foi derrotado nao e pintado (o goomba some; a
  // turtle vira casco e continua na tela, so que quietinha). Os dois quadros da
  // caminhada se alternam sozinhos com o relogio da partida.
  function desenharInimigo(ini, cam, quadro) {
    var alterna = ((quadro / 9) | 0) % 2;
    var arte;
    if (ini.estado === 'casco') arte = CASCO;
    else if (ini.tipo === 'turtle') arte = alterna ? TURTLE_B : TURTLE_A;
    else arte = alterna ? GOOMBA_B : GOOMBA_A;
    // A turtle olha para onde anda; o goomba e simetrico, tanto faz.
    sprite(arte, ini.x - cam, ini.y, 2, ini.vx > 0);
  }

  function desenharInimigos(cam) {
    var lista = jogo.inimigos.lista;
    for (var i = 0; i < lista.length; i++) {
      var ini = lista[i];
      if (ini.estado === 'morto') continue;
      if (!naTela(Inimigos.retangulo(ini), cam)) continue;
      desenharInimigo(ini, cam, jogo.relogio);
    }
  }

  // ----- Efeitos: duram poucos quadros e nao mexem em nada do mundo.
  var EFEITO_MOEDA = 20, EFEITO_CRISTAL = 34, EFEITO_CHECKPOINT = 30;
  var EFEITO_INIMIGO = 24;

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

  function desenharEfeitoCheckpoint(x, y, t) {
    for (var i = 0; i < 5; i++) {                    // um anel de faiscas subindo
      var angulo = (i / 5) * Math.PI * 2 + t * 0.12;
      var raio = 8 + t;
      bloco(x + Math.cos(angulo) * raio - 2, y + Math.sin(angulo) * raio - t - 2,
            4, 4, i % 2 ? '#00e8d8' : '#fcd800');
    }
  }

  function desenharEfeitoInimigo(x, y, t) {
    for (var i = 0; i < 6; i++) {                    // a poeira do pisao subindo
      var angulo = (i / 6) * Math.PI * 2 + t * 0.1;
      var raio = 6 + t * 1.4;
      bloco(x + Math.cos(angulo) * raio - 2, y + Math.sin(angulo) * raio * 0.5 - t,
            4, 4, i % 2 ? '#fcfcfc' : '#f8b800');
    }
  }

  function desenharEfeitos(cam) {
    for (var i = 0; i < jogo.efeitos.length; i++) {
      var f = jogo.efeitos[i];
      var x = f.x - cam;
      if (x < -TILE * 2 || x > LARGURA + TILE * 2) continue;
      var t = f.total - f.vida;                      // quadros desde que nasceu
      if (f.tipo === 'moeda') desenharEfeitoMoeda(x, f.y, t);
      else if (f.tipo === 'checkpoint') desenharEfeitoCheckpoint(x, f.y, t);
      else if (f.tipo === 'inimigo') desenharEfeitoInimigo(x, f.y, t);
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
    desenharMoveis(cam);
    desenharItens(cam);
    desenharCheckpoints(cam);
    desenharBandeira(cam);
    desenharInimigos(cam);

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
    pausado: false,                     // pausa: o mundo congela, a tela nao
    relogio: 0,                         // quadros desde o inicio da partida
    quedas: 0,                          // quantas vezes caiu num buraco
    tentativas: 1,                      // sobe toda vez que as vidas acabam
    concluida: false,                   // ja tocou a bandeira?
    camera: 0,
    pontos: 0,                          // o placar que aparece no HUD
    vidas: VIDAS_INICIAIS,              // copia de `progresso.vidas`, para o HUD
    fase: 1,                            // a fase 1 de 3
    corrida: Corrida.novoEstado(),      // o caderninho das tres fases
    heroi: Fisica.novoCorpo(fase.spawn.x, fase.spawn.y),
    itens: Itens.novoEstado(fase),      // quais moedas/blocos ainda existem
    progresso: Progresso.novoEstado(fase),   // vidas e checkpoints ligados
    inimigos: Inimigos.novoEstado(fase),     // onde os bichos estao e como estao
    moveis: Moveis.novoEstado(fase),         // onde estao as plataformas moveis
    limites: fase.limites,              // os solidos deste quadro (com as moveis)
    efeitos: [],                        // faiscas e cristais, so enfeite
    eventos: []                         // os ultimos avisos (para os testes)
  };

  var entrada = { esquerda: false, direita: false, pular: false };
  var ouvintes = [];

  /* Avisa quem estiver escutando. Os avisos de hoje:
       'moeda', 'bloco-quebrado', 'checkpoint', 'inimigo-derrotado', 'queda',
       'dano', 'vida-perdida', 'fase-reiniciada', 'fase-concluida',
       'corrida-vencida', 'pausa', 'continuou', 'rede-ligada', 'sala-comecou',
       'sala-terminou', 'sala-abortada', 'saiu-da-sala'. */
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
  window.SuperAdventure.irParaFase = function (n) { irParaFase(n); };
  window.SuperAdventure.avancarFase = function () { avancarFase(); };
  window.SuperAdventure.alternarPausa = function () { alternarPausa(); };
  window.SuperAdventure.alternarTelaCheia = function () { alternarTelaCheia(); };

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

  /** Guarda o progresso novo; `jogo.vidas` e a copia que o HUD le. */
  function aplicarProgresso(novo) {
    jogo.progresso = novo;
    jogo.vidas = novo.vidas;
  }

  /* Poe o heroi de pe onde ele deve nascer agora - no ultimo checkpoint ligado
     ou no comeco da fase - com a camera junto. As moedas e os blocos NAO sao
     mexidos: o que ja foi pego continua pego. */
  function nascer() {
    var onde = Progresso.nascedouro(fase, jogo.progresso);
    jogo.heroi = Fisica.novoCorpo(onde.x, onde.y);
    jogo.moveis = Moveis.novoEstado(fase);     // as plataformas voltam ao lugar
    jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);
    jogo.efeitos.length = 0;
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
  }

  /* Volta a fase inteira ao comeco de uma tentativa nova: heroi no spawn,
     moedas e blocos de volta no lugar, checkpoints apagados, vidas cheias e o
     placar zerado (senao daria para juntar as mesmas moedas de novo). */
  function reiniciarFase() {
    aplicarProgresso(Progresso.novoEstado(fase));
    jogo.itens = Itens.novoEstado(fase);
    jogo.inimigos = Inimigos.novoEstado(fase);
    jogo.pontos = 0;
    jogo.concluida = false;
    nascer();
    esconderTelas();
    atualizarHud();
  }

  /* Carrega a fase 1, 2 ou 3 e comeca ela do zero. E o degrau de baixo: quem
     manda na ORDEM e a corrida (`comecarSolo` abre na 1, `avancarFase` anda
     uma), e ela nunca volta atras. Os testes chamam esta funcao direto para
     entrar numa fase sem ter de jogar as anteriores. */
  function irParaFase(numero) {
    var n = Math.min(Math.max(numero | 0, 1), TOTAL_FASES);
    fase = mapas[n - 1];
    jogo.fase = n;
    window.SuperAdventure.fase = fase;
    window.SuperAdventure.mundo.LARGURA_MUNDO = fase.largura;
    reiniciarFase();
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
    jogo.limites = Moveis.limitesCom(r.estado.limites, jogo.moveis);
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

  /* Perder um coracao - seja caindo num buraco, seja esbarrando de frente num
     inimigo. Sobrando vida, o heroi volta ao ultimo checkpoint ligado com as
     moedas que ja juntou (e os bichos que ainda estao vivos voltam para onde
     nasceram); sem nenhuma, a tentativa acaba e a fase inteira recomeca do
     zero. `motivo` e so o aviso que sai antes: 'queda' ou 'dano'. */
  function perderVida(motivo) {
    emitir(motivo);

    var r = Progresso.perderVida(jogo.progresso, fase);
    if (r.tipo === 'reinicio') {
      jogo.tentativas++;
      reiniciarFase();
      emitir('fase-reiniciada');
      return;
    }

    aplicarProgresso(r.estado);
    jogo.inimigos = Inimigos.reposicionar(jogo.inimigos, fase);
    nascer();                                  // e as moveis voltam com ele
    atualizarHud();
    emitir('vida-perdida');
  }

  /** Cair num buraco: conta a queda e cobra o coracao. */
  function cair() {
    jogo.quedas++;
    perderVida('queda');
  }

  /* O troco do pisao: o heroi sobe uns 60px, bem menos que o pulo inteiro. O
     `subida` ja sai gasto de proposito, e o que segura essa altura menor. */
  var QUIQUE = 9, QUIQUE_ALTURA = 60;

  function quicar(corpo) {
    return {
      x: corpo.x, y: corpo.y, vx: corpo.vx, vy: -QUIQUE,
      noChao: false,
      subida: ALTURA_MAX_PULO - QUIQUE_ALTURA,
      pularPreso: corpo.pularPreso,
      direcao: corpo.direcao,
      andando: false,
      apoio: -1
    };
  }

  /* Um quadro dos inimigos: eles patrulham e, se encostaram no heroi, o
     resultado sai daqui. Devolve `true` quando o contato custou uma vida - o
     `atualizar()` para o quadro por ali, porque o mundo ja mudou de lugar. */
  function atualizarInimigos(antes) {
    var r = Inimigos.passo(jogo.inimigos, jogo.limites, antes, jogo.heroi);
    jogo.inimigos = r.estado;

    if (r.derrotados.length) {
      jogo.pontos += r.pontos;
      for (var i = 0; i < r.derrotados.length; i++) {
        var ini = r.estado.lista[r.derrotados[i]];
        soltarEfeito('inimigo', Inimigos.retangulo(ini), EFEITO_INIMIGO);
        emitir('inimigo-derrotado');
      }
      jogo.heroi = quicar(jogo.heroi);
      atualizarHud();
    }

    if (!r.dano) return false;
    perderVida('dano');
    return true;
  }

  /* Encostou num checkpoint apagado? Ele acende - e fica aceso ate o fim da
     tentativa, mesmo depois de o heroi passar direto por ele. */
  function atualizarCheckpoints() {
    var r = Progresso.tocar(jogo.progresso, fase, jogo.heroi);
    if (r.ativou < 0) return;
    aplicarProgresso(r.estado);
    soltarEfeito('checkpoint', fase.checkpoints[r.ativou], EFEITO_CHECKPOINT);
    emitir('checkpoint');
  }

  // ------------------------------------------------- Pausa e tela cheia ----
  /* A caixa de controles no canto do palco. Ela so aparece com o jogo
     rolando: no menu, na pausa e nas telas de fim tem sempre um quadro por
     cima, e o lembrete atras dele so sujaria a tela. */
  function atualizarControles() {
    var mostrar = jogo.tela === 'jogando' && !jogo.pausado && !jogo.concluida;
    if (mostrar) el.controles.classList.remove('hidden');
    else el.controles.classList.add('hidden');
  }

  /* Pausar so faz sentido com uma fase em andamento - no menu nao ha o que
     congelar, e depois da bandeira o mundo ja esta parado atras do quadro de
     fim de fase. */
  function podePausar() {
    return jogo.tela === 'jogando' && !jogo.concluida;
  }

  /* A pausa congela o mundo e nada mais: o laco continua desenhando (a cena
     fica ali, paradinha) mas `atualizar()` nao roda, entao nem o relogio anda.
     As teclas presas sao soltas junto, senao o heroi sairia correndo sozinho
     na hora de continuar. */
  function definirPausa(pausado) {
    if (jogo.pausado === pausado || (pausado && !podePausar())) return;

    jogo.pausado = pausado;
    entrada.esquerda = entrada.direita = entrada.pular = false;

    if (pausado) el.telaPausa.classList.remove('hidden');
    else el.telaPausa.classList.add('hidden');

    pintarBotaoPausa();
    atualizarControles();
    emitir(pausado ? 'pausa' : 'continuou');
  }

  function alternarPausa() { definirPausa(!jogo.pausado); }

  /** O botao do HUD conta em que pe a pausa esta: ⏸ pausa, ▶ continua. */
  function pintarBotaoPausa() {
    el.btnPausa.textContent = jogo.pausado ? '▶' : '⏸';
    el.btnPausa.title = jogo.pausado ? 'Continuar (P ou ESC)' : 'Pausar (P ou ESC)';
    el.btnPausa.setAttribute('aria-label', jogo.pausado ? 'Continuar' : 'Pausar');
  }

  /* Chama o primeiro nome que existir (as versoes antigas do Safari usam
     `webkit...`). Se a promessa da API for recusada - alguns navegadores
     recusam fora de um clique - o erro morre aqui, sem sujar o console. */
  function chamarPrimeiro(alvo, nomes) {
    if (!alvo) return false;
    for (var i = 0; i < nomes.length; i++) {
      if (typeof alvo[nomes[i]] !== 'function') continue;
      var promessa = alvo[nomes[i]]();
      if (promessa && typeof promessa['catch'] === 'function') {
        promessa['catch'](function () {});
      }
      return true;
    }
    return false;
  }

  function emTelaCheia() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  /* Tela cheia pela API do navegador, pedida para o documento inteiro: assim
     funciona tanto com o jogo aberto direto quanto dentro do iframe do
     catalogo (`/jogar/super_adventure`), que ja vem com `allowfullscreen`. */
  function alternarTelaCheia() {
    if (emTelaCheia()) {
      chamarPrimeiro(document, ['exitFullscreen', 'webkitExitFullscreen']);
      return;
    }
    chamarPrimeiro(document.documentElement,
      ['requestFullscreen', 'webkitRequestFullscreen']);
  }

  /* Quem manda no botao e o navegador: ele avisa quando entrou ou saiu (o
     usuario pode sair pelo ESC, sem passar por aqui). */
  function aoMudarTelaCheia() {
    var cheia = emTelaCheia();
    el.btnTelaCheia.textContent = cheia ? '🗗' : '⛶';
    el.btnTelaCheia.title = cheia ? 'Sair da tela cheia (F)' : 'Tela cheia (F)';
    el.btnTelaCheia.setAttribute('aria-label',
      cheia ? 'Sair da tela cheia' : 'Tela cheia');
    ajustarPalco();
  }

  // --------------------------------------------------- As telas do fim -----
  /* A bandeira fecha a fase. Nas fases 1 e 2 aparece o quadro "FASE N
     CONCLUIDA", com o que ela rendeu e o botao que leva para a proxima; depois
     da bandeira da fase 3 aparece o PARABENS, com a corrida fase a fase e o
     total. As duas telas sao HTML por cima do canvas, como o menu. */
  function esconderTelas() {
    el.telaFase.classList.add('hidden');
    el.fim.classList.add('hidden');
    atualizarControles();
  }

  function mostrarFimDeFase(linha) {
    atualizarControles();
    el.faseNumero.textContent = String(linha.numero);
    el.fasePontos.textContent = String(linha.pontos);
    el.faseBonus.textContent = '+' + linha.bonus;
    el.faseProxima.textContent = String(linha.numero + 1);
    el.telaFase.classList.remove('hidden');
  }

  function mostrarParabens() {
    atualizarControles();
    var linhas = jogo.corrida.fases;
    for (var i = 0; i < el.fimLinhas.length; i++) {
      var linha = linhas[i];
      el.fimLinhas[i].textContent = linha
        ? linha.pontos + ' + ' + linha.bonus + ' = ' + linha.total
        : '—';
    }
    el.fimTotal.textContent = String(jogo.corrida.total);
    el.fim.classList.remove('hidden');
  }

  /* O botao "Proxima fase". A corrida so anda para a frente e so depois de uma
     bandeira - clicar fora disso nao faz nada. */
  function avancarFase() {
    if (!jogo.concluida || jogo.corrida.terminada) return;
    irParaFase(jogo.corrida.fase);
  }

  /* Encostou na bandeira: a fase entra no caderno com o bonus de +50 e o jogo
     para (o `atualizar()` volta na primeira linha enquanto `concluida` for
     verdade), esperando o clique que leva para a fase seguinte. */
  function concluirFase() {
    jogo.concluida = true;
    jogo.corrida = Corrida.concluir(jogo.corrida, jogo.fase, jogo.pontos);
    emitir('fase-concluida');

    if (jogo.corrida.terminada) {
      mostrarParabens();
      emitir('corrida-vencida');
      return;
    }
    mostrarFimDeFase(jogo.corrida.fases[jogo.corrida.fases.length - 1]);
  }

  function atualizar() {
    if (jogo.concluida) return;

    jogo.relogio++;

    /* Primeiro as plataformas moveis andam; depois quem estava em cima e
       levado junto; so entao o heroi da o passo dele, ja com as plataformas na
       posicao nova. Nessa ordem o chao nunca escapa debaixo dos pes. */
    var passoMoveis = Moveis.andar(jogo.moveis);
    jogo.moveis = passoMoveis.estado;
    jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);

    var antes = Moveis.carregar(jogo.heroi, passoMoveis.deltas);
    jogo.heroi = Fisica.passo(antes, entrada, jogo.limites);
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
    envelhecerEfeitos();

    if (Fisica.caiu(jogo.heroi, fase.fundo)) {          // caiu num buraco
      cair();
      return;
    }

    atualizarItens(antes);
    if (atualizarInimigos(antes)) return;              // o contato custou uma vida
    atualizarCheckpoints();

    if (Fisica.tocandoCorpo(jogo.heroi, fase.bandeira)) concluirFase();
  }

  /* Comeca (ou recomeca) a corrida inteira: caderno em branco, fase 1. E o
     que fazem o "Jogar solo" do menu, o "Jogar novamente" da tela de parabens,
     o "Recomecar" da pausa e o comeco de uma partida em grupo. Quem esta numa
     sala continua nela - largar a sala e coisa do "Jogar solo". */
  function comecarPartida() {
    definirPausa(false);                // recomecar pela pausa descongela tudo
    jogo.tela = 'jogando';
    jogo.relogio = 0;
    jogo.quedas = 0;
    jogo.tentativas = 1;
    jogo.eventos.length = 0;
    jogo.corrida = Corrida.novoEstado();
    entrada.esquerda = entrada.direita = entrada.pular = false;
    irParaFase(1);
    el.menu.classList.add('hidden');
    el.hud.classList.remove('hidden');
    atualizarControles();
    ajustarPalco();
  }

  /** "Jogar solo": larga qualquer sala e comeca a corrida sozinho. */
  function comecarSolo() {
    Rede.sairDaSala();
    comecarPartida();
  }

  /* Volta para a tela inicial. So a rede precisa disto: quando a sala acaba ou
     o anfitriao cai, ninguem pode ficar preso numa fase que nao existe mais. */
  function voltarAoMenu() {
    definirPausa(false);
    jogo.tela = 'menu';
    jogo.concluida = false;
    entrada.esquerda = entrada.direita = entrada.pular = false;
    esconderTelas();
    el.hud.classList.add('hidden');
    el.menu.classList.remove('hidden');
  }

  /* ==========================================================================
     A REDE  -  o jogo em cima da Plataforma da Central
     --------------------------------------------------------------------------
     Todo o codigo de rede mora aqui dentro, e nada disto acontece se o
     `window.Plataforma` nao existir (jogo aberto direto do disco, ou servidor
     fora do ar): o botao "Jogar com amigos" continua escondido e o resto do
     arquivo nem sabe que a rede existe.

     Nesta fase do plano o lobby e o comeco da sala ja funcionam de ponta a
     ponta: criar sala, entrar pelo codigo de 4 letras, marcar "pronto" e o
     anfitriao apertar "comecar" - e todo mundo cai na tela do jogo, na fase 1,
     com o codigo da sala no HUD. O que ainda NAO acontece e a sincronia: cada
     aparelho roda o proprio mundo. O anfitriao so passa a simular para todos
     na fase 9.
     ========================================================================== */
  var rede = {
    ligada: false,        // o multijogador da plataforma respondeu "de pe"
    sala: null,           // o instantaneo da sala, numa partida em grupo
    papel: 'solo',        // 'solo' | 'anfitriao' | 'convidado'
    recebidas: 0,         // pacotes que chegaram de outros jogadores
    ultimaMensagem: null  // o ultimo deles (a fase 9 vai tratar de verdade)
  };

  var Rede = (function () {
    var P = null;         // o SDK da Central, ja iniciado
    var mj = null;        // P.multijogador

    /* Liga o jogo na plataforma. Devolve `false` (e nao muda nada na tela)
       quando o multijogador nao esta disponivel - e o caso do servidor fora do
       ar, em que o jogo segue sendo o de sempre, so solo. */
    function iniciar(plataforma) {
      P = plataforma || null;
      mj = P && P.multijogador;
      if (!mj || !mj.disponivel) return false;

      rede.ligada = true;
      mj.em('erro', function (texto) { avisar(texto); });

      el.btnAmigos.classList.remove('hidden');
      el.btnAmigos.addEventListener('click', abrirLobby);
      emitir('rede-ligada');
      return true;
    }

    /* O lobby e da plataforma, inteiro: nome do jogador, criar sala, entrar
       com o codigo de 4 letras, lista de salas abertas na rede de casa, quem
       ja chegou e o botao de comecar. O jogo so diz o que fazer nos quatro
       momentos que interessam a ele. */
    function abrirLobby() {
      if (!mj) return;
      definirPausa(false);
      avisar('');
      mj.abrirLobby({
        aoComecar: comecar,
        aoReceber: receber,
        aoTerminar: terminar,
        aoAbortar: abortar,
        // Depois da partida quem manda na tela e o jogo (a tela de PARABENS);
        // o lobby so volta quando a crianca clicar em "Jogar com amigos".
        voltarAoLobby: false
      });
    }

    /* A sala comecou: todo mundo cai na tela do jogo, na fase 1. O `indice` e
       a `cor` de cada jogador ja vem em `sala.jogadores` - quem usa isso e a
       fase 9, quando o anfitriao passar a simular o mundo para todos. */
    function comecar(sala) {
      rede.sala = sala;
      rede.papel = sala.souAnfitriao ? 'anfitriao' : 'convidado';
      rede.recebidas = 0;
      rede.ultimaMensagem = null;
      avisar('');
      mostrarSala();
      comecarPartida();
      emitir('sala-comecou');
    }

    /* Chegou um pacote de outro jogador. O cano ja esta aberto dos dois lados;
       quem vai entender o conteudo e a fase 9 (o estado do mundo, do
       anfitriao) e a 10 (os comandos, dos convidados). */
    function receber(msg) {
      if (!rede.sala) return;         // pacote atrasado, de uma sala que acabou
      rede.recebidas++;
      rede.ultimaMensagem = msg;
    }

    /** A partida foi encerrada pela plataforma. */
    function terminar() {
      if (!rede.sala) return;
      limparSala();
      voltarAoMenu();
      avisar('A partida da sala terminou.');
      emitir('sala-terminou');
    }

    /** O anfitriao caiu (ou a sala se desfez) no meio da partida. */
    function abortar(motivo) {
      if (!rede.sala) return;
      limparSala();
      voltarAoMenu();
      avisar((motivo && motivo.motivo) || 'A sala foi encerrada.');
      emitir('sala-abortada');
    }

    /** Larga a sala e volta a ser um jogo de um jogador so. */
    function sairDaSala() {
      if (!rede.sala) return;
      limparSala();
      if (mj) mj.sair();
      emitir('saiu-da-sala');
    }

    function limparSala() {
      rede.sala = null;
      rede.papel = 'solo';
      mostrarSala();
    }

    /** O codigo da sala no HUD - so nas partidas em grupo. */
    function mostrarSala() {
      if (rede.sala) {
        el.hudSalaCodigo.textContent = rede.sala.codigo;
        el.hudSala.classList.remove('hidden');
      } else {
        el.hudSala.classList.add('hidden');
      }
    }

    /** A tarja de recado do menu. Texto vazio apaga e esconde. */
    function avisar(texto) {
      el.aviso.textContent = texto || '';
      if (texto) el.aviso.classList.remove('hidden');
      else el.aviso.classList.add('hidden');
    }

    return {
      iniciar: iniciar,
      abrirLobby: abrirLobby,
      sairDaSala: sairDaSala,
      avisar: avisar
    };
  }());

  window.SuperAdventure.rede = rede;
  window.SuperAdventure.abrirLobby = function () { Rede.abrirLobby(); };
  window.SuperAdventure.voltarAoMenu = function () { voltarAoMenu(); };

  // -------------------------------------------------------------- Teclado ---
  var TECLAS = {
    ArrowLeft: 'esquerda', a: 'esquerda', A: 'esquerda',
    ArrowRight: 'direita', d: 'direita', D: 'direita',
    ArrowUp: 'pular', w: 'pular', W: 'pular', ' ': 'pular', Spacebar: 'pular'
  };

  // Os atalhos das duas teclas de interface. `Esc` so pausa: sair da pausa por
  // ele nao daria certo em tela cheia, onde o navegador rouba o `Esc` para si.
  var ATALHOS = {
    p: alternarPausa, P: alternarPausa,
    Escape: function () { definirPausa(true); },
    Esc: function () { definirPausa(true); },
    f: alternarTelaCheia, F: alternarTelaCheia
  };

  function tecla(ev, apertada) {
    var acao = TECLAS[ev.key];
    if (!acao) return;
    ev.preventDefault();
    entrada[acao] = apertada;
  }

  window.addEventListener('keydown', function (ev) {
    var atalho = ATALHOS[ev.key];
    if (atalho) { ev.preventDefault(); atalho(); return; }
    tecla(ev, true);
  });
  window.addEventListener('keyup', function (ev) { tecla(ev, false); });
  window.addEventListener('blur', function () {
    entrada.esquerda = entrada.direita = entrada.pular = false;
  });

  el.btnSolo.addEventListener('click', comecarSolo);
  el.btnProxima.addEventListener('click', avancarFase);
  el.btnDeNovo.addEventListener('click', comecarPartida);
  el.btnPausa.addEventListener('click', alternarPausa);
  el.btnContinuar.addEventListener('click', function () { definirPausa(false); });
  // "Recomecar" e o mesmo caminho do "Jogar novamente": a corrida inteira do
  // zero, da fase 1, com o placar e o caderno em branco. Nenhum dos dois larga
  // a sala - quem quer voltar a jogar sozinho clica em "Jogar solo".
  el.btnRecomecar.addEventListener('click', comecarPartida);
  el.btnTelaCheia.addEventListener('click', alternarTelaCheia);

  document.addEventListener('fullscreenchange', aoMudarTelaCheia);
  document.addEventListener('webkitfullscreenchange', aoMudarTelaCheia);

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

    // Pausado, o mundo nao anda - mas a cena continua sendo desenhada, entao a
    // fase fica ali paradinha atras do quadro de pausa. O acumulador zera no
    // `else`: ao continuar, ninguem leva um punhado de quadros de uma vez.
    if (jogo.tela === 'jogando' && !jogo.pausado) {
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
  pintarBotaoPausa();
  aoMudarTelaCheia();      // e o botao de tela cheia comeca no estado certo
  ajustarPalco();
  desenharCena();
  requestAnimationFrame(quadro);

  /* --------------------------------------------------------- A Plataforma --
     O SDK so existe quando o jogo e servido pela Central (`/plataforma/sdk.js`
     e um caminho absoluto: aberto direto do disco ele nem carrega). E mesmo
     tendo o SDK, `iniciar()` pode voltar dizendo que o multijogador nao esta
     de pe - e ai tambem fica so o "Jogar solo". Nos dois casos o jogo inteiro
     continua funcionando; e por isso que este pedaco e o ultimo do arquivo e
     nao segura nada. */
  window.SuperAdventure.pronta = window.Plataforma
    ? window.Plataforma.iniciar({ jogo: 'super_adventure' })
        .then(function (P) { Rede.iniciar(P); return P; })
        ['catch'](function (erro) {
          console.warn('[super adventure] plataforma fora do ar:', erro);
          return null;
        })
    : null;
}());
