/* ==========================================================================
   SUPER ADVENTURE  -  plataforma retro, no estilo dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE n1 do plano: O JOGO NO DEDO. No tablet e no celular nao existe seta nem
   barra de espaco, entao os controles vao para o vidro: a cruzeta num canto de
   baixo do palco, o botao de pular no outro, um para cada polegar. Os tres
   botoes escrevem no MESMO `entrada` que o teclado escreve - a fisica, a pausa
   e a rede nao ficam sabendo de nada. Quem conta os dedos e o modulo `Toque`
   (puro, sem DOM): dai saem de graca os dois polegares ao mesmo tempo, os dois
   dedos no mesmo botao e o arrasto de um botao para o outro. E `entrada` e a
   SOMA de dois cadernos, o `teclado` e o `Toque`, para que num aparelho hibrido
   tirar o dedo de um botao nao solte a seta que a outra mao segura.

   Antes disso, a FASE 14 fechou o QUANDO A SALA SE DESMANCHA. Uma partida em
   grupo tem quatro jeitos conhecidos de dar errado, e nenhum deles pode travar
   a tela de ninguem:

     - alguem SAI no meio (fechou a aba, o wi-fi caiu): a plataforma manda o
       `saiu` e cada aparelho tira aquela linha do mundo e do placar. Quem ficou
       continua jogando, com um jogador a menos;
     - o ANFITRIAO cai: era a maquina dele que simulava o mundo, entao a partida
       aborta (`aoAbortar`). Todo mundo volta ao menu com o motivo na tarja - ou,
       se a corrida ja tinha acabado e faltava so o placar oficial, o PARABENS
       fecha com o ranking daqui mesmo;
     - PACOTE ATRASADO depois do fim: um retrato (ou ate o `fim` da Central) que
       chega quando o ranking ja esta na tela e descartado sem barulho, senao
       ele mexeria num mundo que ninguem mais esta jogando;
     - MAIS DE 2 SEGUNDOS sem noticia da sala: a tarja "CONEXAO INSTAVEL" sobe
       no palco e some sozinha no primeiro pacote que chegar.

   Antes disso, o placar ja era de todos (fase 13): uma mini-lista no canto da
   tela mostra a turma inteira e quantos pontos cada um fez, na hora em que faz;
   e a bandeira da fase 3 fecha a partida da sala pela Central
   (`terminar(placar)`), de onde volta para todos, ao mesmo tempo, o mesmo
   RANKING - montado do pior para o melhor, para a lista terminar no campeao. Se
   a plataforma nao confirmar em ~3 segundos, cada tela mostra o placar que ela
   mesma tem, e ninguem fica esperando para sempre.

   Antes disso a bandeira e o checkpoint ja eram da SALA (fase 12): o primeiro
   jogador que encostar na bandeira - anfitriao ou convidado, tanto faz - fecha
   a fase para todo mundo junto, e o mastro que um acende passa a valer para o
   grupo inteiro: dali em diante e nele que a sala renasce. O mundo ja era um so
   desde a fase 11 (moedas, blocos e bichos do MUNDO do anfitriao: quem pega
   tira de todos e os pontos ficam so com quem pegou), com a camera de cada
   aparelho centrada no personagem de casa e os outros jogadores aparecendo,
   cada um com a sua cor, quando entram no campo de visao. O convidado continua
   adivinhando so o proprio corpo (fase 10) e corrigindo de leve (25% do erro
   por retrato, ou de uma vez quando o erro passa de 90px) com o retrato que
   chega 20 vezes por segundo.

     - `Fisica`: as funcoes puras do movimento, com colisao AABB contra os
       blocos solidos do mapa (para em cima, nao atravessa, bate a cabeca).
     - `Mapa`: le um tilemap escrito como texto e devolve os retangulos
       solidos, as moedas, os blocos quebraveis, os checkpoints, os inimigos,
       o ponto de nascimento e a bandeira. Tambem e funcao pura.
     - `Itens`: o que o heroi encosta e o que ele quebra. Tambem puro: recebe
       o estado dos itens e devolve um estado NOVO, com o que aconteceu.
     - `Progresso`: as vidas e os checkpoints. Cair custa uma vida e devolve o
       heroi ao ultimo checkpoint ligado; sem vidas, a fase inteira recomeca.
       Numa sala o mastro aceso e do grupo (`compartilhar`). Puro tambem.
     - `Inimigos`: a patrulha do goomba e da turtle (ida e volta na plataforma,
       2px por quadro) e o que acontece no contato: pisar em cima derrota
       (+20 pontos; a turtle vira casco), encostar de frente custa uma vida.
       Puro do mesmo jeito.
     - `Moveis`: as plataformas moveis da fase 3. Andam sozinhas pelo trilho
       desenhado no tilemap, param um instante em cada ponta e CARREGAM quem
       estiver em cima. Pura tambem.
     - `Camera`: side-scroll, seguindo o heroi sem sair das bordas do mundo.
       Ela e de cada APARELHO: numa sala, o mundo e um so, mas cada tela olha
       para o proprio personagem.
     - `Corrida`: o caderninho da partida solo - quanto cada fase rendeu, o
       bonus de bandeira e qual e a proxima. So anda para a frente. Puro.
     - `Placar`: a lista de jogadores virando placar - a ordem (do melhor para
       o pior na mini-lista, do pior para o melhor no ranking do fim), o lugar
       de cada um com empate valendo o mesmo lugar, e o que viaja para a
       plataforma no `terminar()`. Puro tambem.
     - `Previsao`: como a posicao que o convidado adivinhou e casada com a que
       o anfitriao mandou - 25% do erro por pacote, ou de uma vez acima de
       90px. Pura tambem.
     - `Pacote`: o tradutor da rede. Transforma o mundo do anfitriao num
       punhado de numeros inteiros (e de volta, do lado do convidado). Puro.
     - `Toque`: o caderninho dos dedos na tela - um mapa "id do dedo" -> acao
       mais um contador por acao. Puro tambem: nao sabe nada de DOM.
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
   `atualizar()` para) e a caixa no canto lembra os controles - ou, num aparelho
   de dedo, os botoes de toque entram no lugar dela.

     - `Rede`: tudo o que sabe da Central mora aqui dentro, e o arquivo inteiro
       so entra nesse caminho se `window.Plataforma` existir. Sem servidor (o
       index.html aberto direto do disco), o `/plataforma/sdk.js` nem carrega:
       o botao "Jogar com amigos" continua escondido e o jogo e o mesmo de
       sempre, do menu ao PARABENS.

   Com uma sala aberta, o mundo passa a ser UM SO e quem manda nele e o
   anfitriao: `jogo.jogadores` deixa de ter uma linha e passa a ter uma por
   pessoa da sala, cada uma com o seu corpo, os seus pontos e as suas vidas (os
   checkpoints acesos sao os mesmos para todos, porque o mastro e do grupo, e a
   bandeira fecha a fase para a sala inteira). O anfitriao anda com todos eles
   no mesmo mapa (as mesmas
   moedas, os mesmos bichos, as mesmas plataformas) e manda o retrato pronto; o
   convidado manda as teclas, copia o mundo que chega e adivinha por conta
   propria um corpo so - o dele. O jogador local continua sendo `jogo.heroi`
   para o resto do arquivo, e sozinho a lista tem uma linha so: o solo nao
   muda em nada.

   O que e do MUNDO fica solto no `jogo` (`itens`, `inimigos`, `moveis`,
   `limites`, `quemChegou`) e o que e de cada um fica na linha dele (`corpo`,
   `pontos` da fase, `total` das fases fechadas, `vidas`, `progresso`,
   `entrada`). Dai sai a regra do mundo
   compartilhado: moeda pega some para todos, bloco quebrado cai para todos,
   bicho pisado nao volta para ninguem - e so o placar de quem fez e que sobe.
   Cair num buraco, ao contrario, e problema de quem caiu: o mundo dos outros
   nao e mexido (e por isso `reiniciarFase()` e `Inimigos.reposicionar()` so
   acontecem sozinho, nunca numa sala).

   Da mesma familia sao a BANDEIRA e o CHECKPOINT, que desde a fase 12 valem
   para a sala inteira: o primeiro que encosta na bandeira fecha a fase de
   todos (o retrato leva o `q` e o `w` - que a bandeira caiu e quem a tocou), e
   o mastro que um acende entra na conta de todo mundo (`acenderNoGrupo`), de
   modo que a lista de checkpoints e a mesma em todas as linhas. Os coracoes,
   esses, continuam sendo de cada um.

   O PLACAR e a terceira coisa que e da sala: a mini-lista lateral mostra a
   turma inteira ordenada pelo total da corrida (as fases fechadas mais a de
   agora), e ela e reescrita so quando algum numero muda. No fim das tres
   fases, o anfitriao manda o ultimo retrato e chama `terminar(placar)`: a
   Central devolve o mesmo placar para todos, e cada tela monta com ele o
   ranking do pior para o melhor. Nao vindo resposta em ~3 segundos, cada uma
   mostra o placar que tem em casa - que bate com o dos outros, porque o
   `total` de cada jogador viaja no retrato.

   E quando a sala se desmancha, tudo isso e desfeito com cuidado: `jogadorSaiu`
   tira do mundo (e do placar) quem largou a partida, `abortar` devolve a turma
   ao menu com o motivo na tarja, `rede.encerrada` manda para o lixo o que
   chegar depois do fim e `vigiarConexao` conta os quadros calados para avisar,
   passados 2 segundos, que a rede engasgou.

   A camera, essa, e de cada aparelho: `seguirCamera()` centra a janela no
   personagem de casa, dentro da MESMA geometria que o anfitriao esta usando -
   o canvas tem sempre 960x540 por dentro, em qualquer tela, entao as posicoes
   batem em todos os aparelhos (regra 4 do PLATAFORMA.md).

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

     As regras do PRD, em funcoes puras:

       - `tocar()`  liga o checkpoint em que o heroi encostou. Uma vez ligado,
         ele fica ligado ate o fim da tentativa: checkpoint nao expira.
       - `perderVida()` tira um coracao. Sobrando vida, o heroi volta ao ultimo
         checkpoint ligado; sem nenhuma, a tentativa acaba e a fase inteira
         recomeca - vidas cheias de novo e todos os checkpoints apagados.
       - `compartilhar()` liga o mesmo checkpoint na conta de OUTRO jogador:
         numa sala o mastro e do grupo, quem acende acende para todos (PRD).
       - `renovarVidas()` devolve os coracoes cheios SEM apagar os mastros -
         e o que acontece com quem fica sem vidas numa sala, onde os
         checkpoints acesos sao da fase e nao dele.

     Como todo o resto, nenhuma delas mexe no estado que recebe. */
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
      return { estado: compartilhar(estado, i), ativou: i };
    }

    /**
     * Liga o checkpoint `indice` neste estado, tenha ele encostado no mastro
     * ou nao - e assim que o checkpoint de um jogador vale para o grupo
     * inteiro. As vidas nao se misturam: cada um tem as suas. Devolve o
     * MESMO estado quando o mastro ja estava aceso para ele.
     */
    function compartilhar(estado, indice) {
      if (indice < 0 || estado.ativos[indice]) return estado;
      var ativos = estado.ativos.slice();
      ativos[indice] = true;
      return { vidas: estado.vidas, ativos: ativos, atual: indice };
    }

    /**
     * Os coracoes cheios de novo, com os checkpoints como estao. Numa sala os
     * mastros acesos sao da fase (do grupo), entao apagar os de quem ficou sem
     * vidas o mandaria de volta para um comeco que o grupo ja deixou para tras.
     */
    function renovarVidas(estado) {
      return {
        vidas: VIDAS_INICIAIS,
        ativos: estado.ativos,
        atual: estado.atual
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
      compartilhar: compartilhar,
      renovarVidas: renovarVidas,
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
     nas duas pontas do mundo para nunca mostrar o lado de fora do mapa.

     Numa sala, cada aparelho chama isto com o SEU heroi e com a largura do
     mesmo mapa: o mundo e um so, as janelas e que sao diferentes. Por ser
     funcao pura de tres numeros, a conta do convidado da exatamente a mesma
     coisa que a do anfitriao daria - o que muda e so quem esta no meio dela. */
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

  // -------------------------------------------------------------- As cores --
  var COR_SOLO = '#0058f8';               // o azul do macacao, jogando sozinho

  /** So aceita cor de verdade; qualquer outra coisa vira o azul de sempre. */
  function corSegura(cor) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(cor || '')) ? cor : COR_SOLO;
  }

  // -------------------------------------------------------------- O placar --
  /* Numa sala o jogo e uma disputa, e disputa pede placar: a mini-lista que
     fica no canto da tela durante a partida inteira e o ranking que sobe no
     fim das tres fases saem os dois daqui. Este modulo nao ve tela nenhuma -
     sao funcoes puras sobre a lista de jogadores.

     Uma linha do placar e:

         { id, indice, apelido, cor, pontos, eu }

     `pontos` e o total da CORRIDA, e nao o da fase: o que ja fechou (`total`,
     as fases vencidas com o bonus de bandeira de cada uma) mais o que esta
     sendo feito na fase de agora. Com a fase ja fechada pela bandeira, o
     `total` sozinho ja e a conta inteira - somar os pontos da fase de novo
     contaria a mesma fase duas vezes, e e disso que `faseFechada` cuida.

     O ranking do fim vai do PIOR para o MELHOR, de proposito: a lista sobe
     degrau por degrau e termina no campeao. Empate vale o mesmo lugar, e o
     desempate da ORDEM e sempre o `indice` do jogador na sala - o mesmo numero
     em todos os aparelhos, entao todo mundo ve a lista na mesma ordem. */
  var Placar = (function () {

    /** O que este jogador fez na corrida inteira, ate agora. */
    function pontosDe(j, faseFechada) {
      return (j.total | 0) + (faseFechada ? 0 : (j.pontos | 0));
    }

    /** A lista de jogadores do mundo virando placar, do melhor para o pior. */
    function daSala(jogadores, faseFechada) {
      var lista = [], i;
      for (i = 0; i < jogadores.length; i++) {
        var j = jogadores[i];
        lista.push({
          id: j.id,
          indice: j.indice | 0,
          apelido: j.apelido || 'Jogador',
          cor: j.cor,
          pontos: pontosDe(j, faseFechada),
          eu: !!j.local
        });
      }
      return melhorPrimeiro(lista);
    }

    function copiar(p, lugar) {
      return {
        id: p.id, indice: p.indice, apelido: p.apelido, cor: p.cor,
        pontos: p.pontos, eu: !!p.eu, lugar: lugar || p.lugar || 0
      };
    }

    /** Do melhor para o pior; quem empata fica na ordem do indice. */
    function melhorPrimeiro(lista) {
      return lista.slice().sort(function (a, b) {
        return (b.pontos - a.pontos) || (a.indice - b.indice);
      });
    }

    /** E o contrario: a lista que termina no campeao. */
    function piorPrimeiro(lista) {
      return melhorPrimeiro(lista).reverse();
    }

    /** Cada um com o seu lugar (1, 2, 3...), do melhor para o pior. Quem
        empata em pontos divide o mesmo lugar. */
    function colocar(lista) {
      var ordenada = melhorPrimeiro(lista), saida = [], lugar = 1;
      for (var i = 0; i < ordenada.length; i++) {
        if (i > 0 && ordenada[i].pontos < ordenada[i - 1].pontos) lugar = i + 1;
        saida.push(copiar(ordenada[i], lugar));
      }
      return saida;
    }

    /** O ranking do fim: do pior para o melhor, cada um com o seu lugar. */
    function ranking(lista) {
      return colocar(lista).reverse();
    }

    /** Em que lugar ficou quem tem esse id (0 se ele nao esta na lista). */
    function lugarDe(lista, id) {
      var comLugar = colocar(lista);
      for (var i = 0; i < comLugar.length; i++) {
        if (comLugar[i].id === id) return comLugar[i].lugar;
      }
      return 0;
    }

    /** O placar de quem sou eu, quando a lista chegou pronta de fora. */
    function lugarDoEu(lista) {
      for (var i = 0; i < lista.length; i++) if (lista[i].eu) return lugarDe(lista, lista[i].id);
      return 0;
    }

    /* O que viaja para a plataforma no `terminar()`: so os campos que o outro
       lado precisa. `eu` fica de fora de proposito - isso e coisa de cada
       tela, e cada uma marca a sua linha quando o placar chega. */
    function paraRede(lista) {
      var saida = [];
      for (var i = 0; i < lista.length; i++) {
        saida.push({
          id: lista[i].id, indice: lista[i].indice,
          apelido: lista[i].apelido, cor: lista[i].cor,
          pontos: lista[i].pontos | 0
        });
      }
      return saida;
    }

    /* O caminho de volta: as linhas que chegaram pela rede arrumadas para a
       tela - apelido em texto, cor que e mesmo uma cor, pontos inteiros - e
       com a marca de quem sou eu. */
    function normalizar(placar, meuId) {
      var bruto = placar || [], lista = [];
      for (var i = 0; i < bruto.length; i++) {
        var p = bruto[i] || {};
        lista.push({
          id: p.id || '',
          indice: typeof p.indice === 'number' ? p.indice : i,
          apelido: String(p.apelido || 'Jogador'),
          cor: corSegura(p.cor),
          pontos: p.pontos | 0,
          eu: !!p.id && p.id === meuId
        });
      }
      return lista;
    }

    /* O placar inteiro num texto so. E com ele que o HUD sabe se mudou alguma
       coisa: sem isso a mini-lista seria reescrita 60 vezes por segundo. */
    function assinatura(lista) {
      var partes = [];
      for (var i = 0; i < lista.length; i++) {
        partes.push(lista[i].id + ':' + lista[i].pontos);
      }
      return partes.join('|');
    }

    return {
      daSala: daSala,
      pontosDe: pontosDe,
      melhorPrimeiro: melhorPrimeiro,
      piorPrimeiro: piorPrimeiro,
      colocar: colocar,
      ranking: ranking,
      lugarDe: lugarDe,
      lugarDoEu: lugarDoEu,
      paraRede: paraRede,
      normalizar: normalizar,
      assinatura: assinatura
    };
  }());

  // ------------------------------------------------ A previsao do convidado -
  /* O convidado nao pode esperar o pacote do anfitriao para sair do lugar: com
     o vai-e-volta da rede o controle ficaria "molenga", sempre alguns quadros
     atras do dedo. Entao ele ADIVINHA - roda a mesma fisica pura da fase 1 no
     proprio corpo, com as teclas que ele acabou de mandar, e vai andando.

     Adivinhar erra um pouquinho: o retrato que chega foi tirado ha alguns
     quadros e o anfitriao pode ter visto uma parede (ou um pisao) que o
     convidado ainda nao viu. Por isso, quando o pacote chega, a posicao
     adivinhada e puxada para a oficial:

         erro de ate 90px  ->  anda 25% do caminho, e o resto vem nos pacotes
                               seguintes: ninguem ve teleporte nenhum
         erro maior        ->  encaixa de uma vez, porque a essa altura o
                               convidado adivinhou outra historia (caiu num
                               buraco, levou um pisao, voltou ao checkpoint)

     Sao os numeros da regra 4.1.2 do AGENTS.md. Como todo o resto por aqui,
     `corrigir()` e funcao pura: nao mexe nos corpos que recebe. */
  var Previsao = (function () {

    var CORRECAO = 0.25;       // quanto do erro some a cada pacote
    var ERRO_SNAP = 90;        // acima disto nao da para disfarcar: encaixa
    var ERRO_ZERO = 0.5;       // menos de meio pixel ja e o lugar certo

    /** A distancia entre a posicao adivinhada e a oficial, em pixels. */
    function erroEntre(local, oficial) {
      var dx = oficial.x - local.x, dy = oficial.y - local.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /* O corpo de casa com outro x e outro y. O resto - velocidade, pulo,
       animacao - continua sendo o que o convidado adivinhou: e dai que vem a
       resposta instantanea do controle. */
    function em(corpo, x, y) {
      return {
        x: x, y: y, vx: corpo.vx, vy: corpo.vy,
        noChao: corpo.noChao, subida: corpo.subida,
        pularPreso: corpo.pularPreso, direcao: corpo.direcao,
        andando: corpo.andando, apoio: corpo.apoio
      };
    }

    /* O encaixe seco: vale o corpo do anfitriao inteirinho, porque um erro
       desse tamanho quer dizer que as duas simulacoes contaram historias
       diferentes. So `pularPreso` fica sendo o de casa - quem manda nele e o
       dedo que esta na tecla, e trocar isso faria o heroi pular sozinho por
       estar com o espaco apertado. */
    function encaixar(local, oficial) {
      return {
        x: oficial.x, y: oficial.y,
        vx: local ? local.vx : oficial.vx,
        vy: oficial.vy,
        noChao: oficial.noChao,
        subida: oficial.subida,
        pularPreso: local ? local.pularPreso : oficial.pularPreso,
        direcao: oficial.direcao,
        andando: oficial.andando,
        apoio: oficial.apoio
      };
    }

    /**
     * Junta a posicao adivinhada com a que o anfitriao mandou. Devolve
     * `{ corpo, erro, snap }`, com `snap` em `true` quando o erro era grande
     * demais para disfarcar e o corpo foi encaixado de uma vez so.
     */
    function corrigir(local, oficial) {
      if (!local) return { corpo: encaixar(null, oficial), erro: 0, snap: true };

      var erro = erroEntre(local, oficial);
      if (erro > ERRO_SNAP) {
        return { corpo: encaixar(local, oficial), erro: erro, snap: true };
      }
      // Perto o bastante para o olho nao ver: encosta de vez e acaba com a
      // sobra de erro que ficaria se arrastando para sempre.
      if (erro <= ERRO_ZERO) {
        return { corpo: em(local, oficial.x, oficial.y), erro: erro, snap: false };
      }
      return {
        corpo: em(local,
          local.x + (oficial.x - local.x) * CORRECAO,
          local.y + (oficial.y - local.y) * CORRECAO),
        erro: erro, snap: false
      };
    }

    return {
      corrigir: corrigir,
      erroEntre: erroEntre,
      medidas: {
        CORRECAO: CORRECAO,
        ERRO_SNAP: ERRO_SNAP,
        ERRO_ZERO: ERRO_ZERO
      }
    };
  }());

  // -------------------------------------------------------- O pacote da rede -
  /* Numa partida em grupo existe UM mundo so, e quem roda ele e o anfitriao.
     Vinte vezes por segundo ele manda para todos um retrato desse mundo; este
     modulo e o tradutor dos dois lados - `montar()` faz o retrato, `aplicar()`
     copia o retrato recebido por cima do mundo do convidado.

     O retrato e pequeno de proposito (a plataforma corta em 64 KB e 90
     mensagens por segundo): campos de uma letra e arrays de numeros inteiros,
     do jeito que a Galinha Feliz faz.

         { k: 'e',                 // "e" de estado (o convidado manda "i")
           n: 173,                 // numero de ordem; pacote velho e ignorado
           f: 2,                   // a fase em jogo
           t: 940,                 // o relogio do anfitriao
           q: 0,                   // 1 = a bandeira ja foi tocada
           w: -1,                  // quem tocou nela (indice; -1 = ninguem)
           j: [[i, x, y, dir, sinais, pontos, vidas, checkpoints, total], ...],
           m: [ ... ],             // as moedas que ainda existem, em bits
           b: [ ... ],             // idem para os blocos quebraveis
           i: [[x, y, vx, estado], ...],    // os bichos
           v: [[x, y], ...] }               // as plataformas moveis

     `sinais` sao os dois bits que o desenho precisa (1 = com os pes no chao,
     2 = andando) e `checkpoints` e a lista de mastros acesos cabendo num
     numero so - ela e a mesma para todo mundo, porque o checkpoint e do grupo.
     `total` e o que aquele jogador ja levou das fases FECHADAS (com o bonus de
     bandeira de cada uma): sem ele, o placar da sala so saberia contar a fase
     de agora e o convidado nao teria como montar o ranking sozinho quando a
     plataforma demora. Cem moedas viram quatro numeros: cada um carrega 30
     bits.

     Tudo aqui e funcao pura de conversao: `aplicar()` mexe no mundo que
     recebe, mas nao sabe desenhar nem tocar em tela nenhuma - o que ele
     devolve e a lista do que MUDOU, para quem chamou soltar as faiscas. */
  var Pacote = (function () {

    var BITS = 30;                       // bits por numero (cabe num int de JS)
    var ESTADOS = ['vivo', 'casco', 'morto'];

    /** Uma lista de booleanos virando um numero so (ate 30 posicoes). */
    function bitsDe(lista) {
      var n = 0;
      for (var i = 0; i < lista.length && i < BITS; i++) if (lista[i]) n |= 1 << i;
      return n;
    }

    /** O caminho de volta: o numero virando `quantos` booleanos. */
    function deBits(numero, quantos) {
      var lista = [];
      for (var i = 0; i < quantos; i++) lista.push(((numero >> i) & 1) === 1);
      return lista;
    }

    /** Uma lista comprida de booleanos virando um array de numeros. */
    function empacotar(lista) {
      var saida = [];
      for (var i = 0; i < lista.length; i++) {
        var caixa = (i / BITS) | 0;
        while (saida.length <= caixa) saida.push(0);
        if (lista[i]) saida[caixa] |= 1 << (i % BITS);
      }
      return saida;
    }

    /** E a volta: `quantos` booleanos lidos de um array de numeros. */
    function desempacotar(numeros, quantos) {
      var lista = [], caixas = numeros || [];
      for (var i = 0; i < quantos; i++) {
        var n = caixas[(i / BITS) | 0] || 0;
        lista.push(((n >> (i % BITS)) & 1) === 1);
      }
      return lista;
    }

    /** Os indices que existiam em `antes` e nao existem mais em `agora`. */
    function sumiram(antes, agora) {
      var lista = [];
      for (var i = 0; i < agora.length; i++) {
        if (antes[i] && !agora[i]) lista.push(i);
      }
      return lista;
    }

    /** O ultimo checkpoint aceso da lista (-1 se nenhum). */
    function ultimoAceso(ativos) {
      var atual = -1;
      for (var i = 0; i < ativos.length; i++) if (ativos[i]) atual = i;
      return atual;
    }

    function porIndice(jogadores, indice) {
      for (var i = 0; i < jogadores.length; i++) {
        if (jogadores[i].indice === indice) return jogadores[i];
      }
      return null;
    }

    /** Um jogador em nove numeros. */
    function linhaJogador(j) {
      var c = j.corpo;
      return [
        j.indice, c.x | 0, c.y | 0, c.direcao,
        (c.noChao ? 1 : 0) | (c.andando ? 2 : 0),
        j.pontos | 0, j.vidas | 0, bitsDe(j.progresso.ativos),
        j.total | 0
      ];
    }

    /* O corpo oficial de um jogador, lido do retrato: so o que se ve. E ele
       que o convidado desenha nos OUTROS - e com que ele acerta o de casa. */
    function corpoDaLinha(linha) {
      var sinais = linha[4];
      return {
        x: linha[1], y: linha[2], vx: 0, vy: 0,
        noChao: (sinais & 1) === 1,
        subida: 0, pularPreso: false,
        direcao: linha[3] < 0 ? -1 : 1,
        andando: (sinais & 2) === 2,
        apoio: -1
      };
    }

    /** O mundo do anfitriao num pacote. `numero` e a ordem do pacote. */
    function montar(estado, numero) {
      var jogadores = [], bichos = [], moveis = [], i;

      for (i = 0; i < estado.jogadores.length; i++) {
        jogadores.push(linhaJogador(estado.jogadores[i]));
      }
      for (i = 0; i < estado.inimigos.lista.length; i++) {
        var b = estado.inimigos.lista[i];
        bichos.push([b.x | 0, b.y | 0, b.vx, ESTADOS.indexOf(b.estado)]);
      }
      for (i = 0; i < estado.moveis.lista.length; i++) {
        var m = estado.moveis.lista[i];
        moveis.push([m.x | 0, m.y | 0]);
      }

      return {
        k: 'e', n: numero | 0,
        f: estado.fase, t: estado.relogio | 0,
        q: estado.concluida ? 1 : 0,
        w: estado.quemChegou >= 0 ? estado.quemChegou : -1,
        j: jogadores,
        m: empacotar(estado.itens.moedas),
        b: empacotar(estado.itens.blocos),
        i: bichos,
        v: moveis
      };
    }

    /** O que o convidado manda de volta: as tres teclas dele. */
    function entrada(numero, teclas) {
      return {
        k: 'i', n: numero | 0,
        e: teclas.esquerda ? 1 : 0,
        d: teclas.direita ? 1 : 0,
        p: teclas.pular ? 1 : 0
      };
    }

    /** O pacote parece mesmo um retrato do mundo? */
    function ehEstado(d) { return !!d && d.k === 'e' && !!d.j; }

    /** E um pacote de teclas de convidado? */
    function ehEntrada(d) { return !!d && d.k === 'i'; }

    /**
     * Copia o retrato recebido por cima do mundo `alvo` (o `jogo` do
     * convidado). Devolve o que mudou desde o pacote anterior:
     *
     *     { moedas: [i], blocos: [i], inimigos: [i], checkpoints: [i],
     *       correcao: { erro, snap } | null }
     *
     * E com essa lista que o convidado solta as mesmas faiscas que o
     * anfitriao viu, sem precisar receber um pixel sequer.
     *
     * Com `preverLocal` ligado (o convidado, desde a fase 10), o corpo de casa
     * NAO e copiado por cima: ele foi adivinhado aqui e so e puxado para a
     * posicao oficial por `Previsao.corrigir()` - `correcao` conta o tamanho
     * desse tranco. Os outros corpos sao sempre os do anfitriao.
     */
    function aplicar(d, alvo, mapa, preverLocal) {
      var novidades = {
        moedas: [], blocos: [], inimigos: [], checkpoints: [], correcao: null
      };
      var i, linha;

      // --- os jogadores: onde estao, quanto fizeram, quantas vidas tem ------
      for (i = 0; i < d.j.length; i++) {
        linha = d.j[i];
        var j = porIndice(alvo.jogadores, linha[0]);
        if (!j) continue;
        var oficial = corpoDaLinha(linha);
        if (preverLocal && j.local) {
          var ajuste = Previsao.corrigir(j.corpo, oficial);
          j.corpo = ajuste.corpo;
          novidades.correcao = { erro: ajuste.erro, snap: ajuste.snap };
        } else {
          j.corpo = oficial;
        }
        j.pontos = linha[5];
        j.vidas = linha[6];
        // O total das fases fechadas e do anfitriao: e ele quem soma o bonus
        // da bandeira quando a fase acaba para a sala.
        j.total = linha[8] | 0;
        var ativos = deBits(linha[7], mapa.checkpoints.length);
        /* As faiscas do checkpoint saem uma vez so, na linha do jogador de
           casa - e a lista dele ja traz os mastros que os OUTROS acenderam,
           porque o checkpoint e do grupo. */
        if (j.local) {
          for (var c = 0; c < ativos.length; c++) {
            if (ativos[c] && !j.progresso.ativos[c]) novidades.checkpoints.push(c);
          }
        }
        j.progresso = { vidas: linha[6], ativos: ativos, atual: ultimoAceso(ativos) };
      }

      // --- moedas e blocos: o mundo e um so, quem pegou tirou de todos ------
      var moedas = desempacotar(d.m, mapa.moedas.length);
      var blocos = desempacotar(d.b, mapa.quebraveis.length);
      novidades.moedas = sumiram(alvo.itens.moedas, moedas);
      novidades.blocos = sumiram(alvo.itens.blocos, blocos);
      alvo.itens = {
        moedas: moedas, blocos: blocos,
        // O bloco que caiu deixa de ser solido: a lista precisa ser remontada.
        limites: novidades.blocos.length ? Mapa.limitesCom(mapa, blocos)
                                         : alvo.itens.limites
      };

      // --- os bichos --------------------------------------------------------
      var bichos = [], antes = alvo.inimigos.lista;
      for (i = 0; i < (d.i || []).length; i++) {
        linha = d.i[i];
        var velho = antes[i] || mapa.inimigos[i] || { tipo: 'goomba' };
        var situacao = ESTADOS[linha[3]] || 'vivo';
        if (velho.estado === 'vivo' && situacao !== 'vivo') novidades.inimigos.push(i);
        bichos.push({
          tipo: velho.tipo, x: linha[0], y: linha[1],
          vx: linha[2], vy: 0, estado: situacao
        });
      }
      alvo.inimigos = { lista: bichos };

      // --- as plataformas moveis: so a posicao viaja, o trilho ja e sabido --
      var pontes = [];
      for (i = 0; i < alvo.moveis.lista.length; i++) {
        var ponte = alvo.moveis.lista[i], onde = (d.v || [])[i];
        pontes.push(!onde ? ponte : {
          eixo: ponte.eixo, x: onde[0], y: onde[1],
          l: ponte.l, a: ponte.a, min: ponte.min, max: ponte.max,
          passo: ponte.passo, espera: ponte.espera
        });
      }
      alvo.moveis = { lista: pontes };
      alvo.limites = Moveis.limitesCom(alvo.itens.limites, alvo.moveis);
      alvo.relogio = d.t | 0;
      // Quem chegou na bandeira: a fase e da sala, entao todos veem o mesmo
      // nome no quadro de fim de fase - mesmo quem estava do outro lado do mapa.
      alvo.quemChegou = typeof d.w === 'number' ? d.w : -1;

      return novidades;
    }

    return {
      montar: montar,
      aplicar: aplicar,
      entrada: entrada,
      ehEstado: ehEstado,
      ehEntrada: ehEntrada,
      linhaJogador: linhaJogador,
      corpoDaLinha: corpoDaLinha,
      bitsDe: bitsDe,
      deBits: deBits,
      empacotar: empacotar,
      desempacotar: desempacotar,
      sumiram: sumiram,
      porIndice: porIndice,
      BITS: BITS,
      ESTADOS: ESTADOS
    };
  }());

  // --------------------------------------------------------------- O toque --
  /* No tablet e no celular nao existe seta nem barra de espaco: o que existe
     sao dedos em cima do vidro. Este modulo e o caderninho deles - um mapa
     "id do dedo" -> acao (`esquerda`, `direita` ou `pular`) mais um contador
     por acao. Dai saem as tres coisas que uma crianca faz sem pensar:

       - APERTAR DOIS BOTOES AO MESMO TEMPO (correr e pular): sao dois dedos,
         cada um na sua linha, e cada um mexe so na acao dele;
       - DOIS DEDOS NO MESMO BOTAO: o contador vai a 2 e tirar um deles nao
         solta o botao - so o ultimo solta;
       - ARRASTAR o dedo de um botao para o outro sem tirar da tela: o mesmo
         id troca de linha, o botao velho volta a zero e o novo acende.

     Puro: nao sabe nada de DOM nem de eventos, e cada funcao devolve um estado
     NOVO, como o resto dos modulos deste arquivo. */
  var Toque = (function () {

    var ACOES = ['esquerda', 'direita', 'pular'];

    function novoEstado() {
      return { dedos: {}, esquerda: 0, direita: 0, pular: 0 };
    }

    function copiar(estado) {
      var novo = { dedos: {} };
      for (var chave in estado.dedos) {
        if (Object.prototype.hasOwnProperty.call(estado.dedos, chave)) {
          novo.dedos[chave] = estado.dedos[chave];
        }
      }
      for (var i = 0; i < ACOES.length; i++) novo[ACOES[i]] = estado[ACOES[i]];
      return novo;
    }

    function ehAcao(acao) {
      for (var i = 0; i < ACOES.length; i++) if (ACOES[i] === acao) return true;
      return false;
    }

    /** O dedo `id` passou a apertar `acao` (largando o botao anterior dele). */
    function encostar(estado, id, acao) {
      if (!ehAcao(acao)) return estado;
      var chave = String(id);
      if (estado.dedos[chave] === acao) return estado;

      var novo = copiar(estado);
      var antes = novo.dedos[chave];
      if (antes) novo[antes] = Math.max(0, novo[antes] - 1);
      novo.dedos[chave] = acao;
      novo[acao] = novo[acao] + 1;
      return novo;
    }

    /** O dedo `id` saiu da tela (ou do botao). */
    function soltar(estado, id) {
      var chave = String(id);
      var acao = estado.dedos[chave];
      if (!acao) return estado;

      var novo = copiar(estado);
      delete novo.dedos[chave];
      novo[acao] = Math.max(0, novo[acao] - 1);
      return novo;
    }

    /** Tudo solto de uma vez (pausa, aba que perdeu o foco, aparelho girado). */
    function largarTudo() { return novoEstado(); }

    /** Tem algum dedo nesta acao agora? */
    function apertada(estado, acao) { return (estado[acao] | 0) > 0; }

    /** Quantos dedos estao na tela. */
    function dedos(estado) {
      var n = 0;
      for (var chave in estado.dedos) {
        if (Object.prototype.hasOwnProperty.call(estado.dedos, chave)) n++;
      }
      return n;
    }

    return {
      novoEstado: novoEstado,
      encostar: encostar,
      soltar: soltar,
      largarTudo: largarTudo,
      apertada: apertada,
      dedos: dedos,
      ACOES: ACOES
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
      Placar: Placar,
      Previsao: Previsao,
      Pacote: Pacote,
      Toque: Toque,
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
    recado: $('recado-palco'),
    btnSolo: $('btn-solo'),
    btnAmigos: $('btn-amigos'),
    aviso: $('aviso'),
    hudSala: $('hud-sala'),
    hudSalaCodigo: $('hud-sala-codigo'),
    placarSala: $('placar-sala'),
    placarLista: $('placar-lista'),
    toque: $('toque'),
    toqueEsquerda: $('toque-esquerda'),
    toqueDireita: $('toque-direita'),
    toquePular: $('toque-pular'),
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
    faseSubtitulo: $('fase-subtitulo'),
    fasePontos: $('fase-pontos'),
    faseBonus: $('fase-bonus'),
    faseProxima: $('fase-proxima'),
    fimLinhas: [$('fim-fase-1'), $('fim-fase-2'), $('fim-fase-3')],
    fimTotal: $('fim-total'),
    fimSubtitulo: $('fim-subtitulo'),
    fimSala: $('fim-sala'),
    fimRanking: $('fim-ranking'),
    fimEsperando: $('fim-esperando')
  };

  function bloco(x, y, l, a, cor) {
    ctx.fillStyle = cor;
    ctx.fillRect(x | 0, y | 0, l | 0, a | 0);
  }

  /**
   * Desenha um sprite de texto; `virado` espelha na horizontal.
   * `corDoTime` troca o azul do macacao (`b`) pela cor que a sala deu ao
   * jogador - e assim que, numa partida em grupo, da para saber quem e quem.
   */
  function sprite(linhas, x, y, escala, virado, corDoTime) {
    var colunas = linhas[0].length;
    for (var r = 0; r < linhas.length; r++) {
      var linha = linhas[r];
      for (var c = 0; c < linha.length; c++) {
        var ch = linha.charAt(c);
        var cor = (corDoTime && ch === 'b') ? corDoTime : PALETA[ch];
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

  // ----- Os jogadores. Sozinho e um so, com o macacao azul de sempre; numa
  // sala sao todos os que estao na fase, cada um com a cor que a sala deu -
  // e o de casa e pintado por ultimo, para nunca ficar escondido atras de
  // outro.
  function desenharJogador(j, cam) {
    var c = j.corpo;
    if (!c) return;
    if (!naTela({ x: c.x, y: c.y, l: HEROI_L, a: HEROI_A }, cam)) return;

    var arte;
    if (!c.noChao) arte = HEROI_PULANDO;
    else if (c.andando) arte = ((jogo.relogio / 8) | 0) % 2 ? HEROI_ANDANDO : HEROI_PARADO;
    else arte = HEROI_PARADO;

    sprite(arte, c.x - cam, c.y, 2, c.direcao < 0, j.cor);
  }

  function desenharJogadores(cam) {
    for (var i = 0; i < jogo.jogadores.length; i++) {
      if (jogo.jogadores[i] !== jogo.eu) desenharJogador(jogo.jogadores[i], cam);
    }
    desenharJogador(jogo.eu, cam);
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
    desenharJogadores(cam);
    desenharEfeitos(cam);
  }

  // -------------------------------------------------------------- O jogo ----
  /* O mundo e um so, e dentro dele mora uma lista de jogadores. Sozinho a
     lista tem uma linha; numa sala, uma por pessoa. Cada linha guarda o que e
     DAQUELE jogador (o corpo, os pontos, as vidas, os checkpoints acesos e as
     teclas que ele esta apertando) - o resto (mapa, moedas, bichos,
     plataformas) e do mundo, e por isso fica solto no `jogo`. */
  // (`COR_SOLO` e `corSegura()` moram la em cima, junto do `Placar`: o placar
  // da sala precisa deles antes de existir tela nenhuma.)
  var VAO_NASCIMENTO = 10;                // um respiro entre quem nasce junto

  /* O que o jogador de casa esta pedindo AGORA. Duas maos escrevem aqui - o
     teclado e os dedos na tela - e por isso cada uma tem o seu caderno: o
     `teclado` e o `Toque`, somados em `aplicarEntrada()`. O resto do arquivo
     (a fisica, a pausa, a rede) le so o `entrada` e nao sabe de onde veio. */
  var entrada = { esquerda: false, direita: false, pular: false };
  var teclado = { esquerda: false, direita: false, pular: false };

  /* Um jogador novinho. O de casa (`local`) usa o MESMO objeto de entrada que
     o teclado escreve; os outros tem o deles, preenchido pelos pacotes que
     chegam. `seq` e o numero do ultimo comando aceito - comando atrasado nao
     manda no personagem. */
  function novoJogador(dados) {
    return {
      id: dados.id || 'eu',
      indice: dados.indice || 0,
      apelido: dados.apelido || '',
      cor: corSegura(dados.cor),
      local: !!dados.local,
      entrada: dados.local ? entrada : { esquerda: false, direita: false, pular: false },
      seq: 0,
      corpo: Fisica.novoCorpo(fase.spawn.x, fase.spawn.y),
      pontos: 0,
      // `pontos` e o que ele fez NESTA fase (e o numero do HUD); `total` e o
      // que as fases ja fechadas renderam, com o bonus de bandeira de cada
      // uma. O placar da sala e a soma dos dois.
      total: 0,
      vidas: VIDAS_INICIAIS,
      progresso: Progresso.novoEstado(fase),
      quedas: 0
    };
  }

  var jogo = {
    tela: 'menu',                       // 'menu' | 'jogando'
    pausado: false,                     // pausa: o mundo congela, a tela nao
    relogio: 0,                         // quadros desde o inicio da partida
    tentativas: 1,                      // sobe toda vez que as vidas acabam
    concluida: false,                   // ja tocou a bandeira?
    quemChegou: -1,                     // o indice de quem tocou nela (-1 = ninguem)
    camera: 0,
    fase: 1,                            // a fase 1 de 3
    corrida: Corrida.novoEstado(),      // o caderninho das tres fases
    jogadores: [],                      // uma linha por pessoa na fase
    eu: null,                           // a linha do jogador deste aparelho
    itens: Itens.novoEstado(fase),      // quais moedas/blocos ainda existem
    inimigos: Inimigos.novoEstado(fase),     // onde os bichos estao e como estao
    moveis: Moveis.novoEstado(fase),         // onde estao as plataformas moveis
    limites: fase.limites,              // os solidos deste quadro (com as moveis)
    efeitos: [],                        // faiscas e cristais, so enfeite
    eventos: []                         // os ultimos avisos (para os testes)
  };

  jogo.eu = novoJogador({ local: true, cor: COR_SOLO });
  jogo.jogadores = [jogo.eu];

  /* `jogo.heroi`, `jogo.pontos`, `jogo.vidas`, `jogo.progresso` e `jogo.quedas`
     sao atalhos para o jogador deste aparelho: quem guarda de verdade e a
     linha dele em `jogo.jogadores`. Assim o HUD, o desenho e os testes
     continuam falando de "o heroi" como sempre falaram, e o mundo em grupo
     nao precisa de nenhuma copia paralela. */
  function atalho(nome, campo) {
    Object.defineProperty(jogo, nome, {
      enumerable: true, configurable: true,
      get: function () { return jogo.eu[campo]; },
      set: function (valor) { jogo.eu[campo] = valor; }
    });
  }
  atalho('heroi', 'corpo');
  atalho('pontos', 'pontos');
  atalho('vidas', 'vidas');
  atalho('progresso', 'progresso');
  atalho('quedas', 'quedas');

  /** Estamos numa partida com mais gente (e nao sozinhos)? */
  function emGrupo() { return jogo.jogadores.length > 1; }

  /** A linha de quem tem aquele id na sala (null se ja saiu). */
  function jogadorPorId(id) {
    for (var i = 0; i < jogo.jogadores.length; i++) {
      if (jogo.jogadores[i].id === id) return jogo.jogadores[i];
    }
    return null;
  }

  var ouvintes = [];

  /* Avisa quem estiver escutando. Os avisos de hoje:
       'moeda', 'bloco-quebrado', 'checkpoint', 'inimigo-derrotado', 'queda',
       'dano', 'vida-perdida', 'jogador-recomecou', 'fase-reiniciada',
       'fase-concluida', 'corrida-vencida', 'pausa', 'continuou',
       'rede-ligada', 'sala-comecou', 'sala-terminou', 'sala-abortada',
       'saiu-da-sala', 'jogador-saiu' (alguem largou a sala), 'conexao-instavel'
       e 'conexao-voltou' (a sala ficou - ou deixou de ficar - calada por mais
       de 2 segundos), 'ranking-da-sala' (o placar oficial da plataforma) e
       'ranking-local' (o daqui, quando ela demorou demais). */
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

  /* A camera e de cada aparelho: ela segue o jogador de casa, no mundo que e
     de todos. */
  function seguirCamera() {
    jogo.camera = Camera.seguir(centroDoHeroi(), fase.largura, LARGURA);
  }

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

  // ------------------------------------------------- O placar da sala ------
  /* A mini-lista lateral: quem esta na sala e quantos pontos cada um fez, na
     hora em que faz. Ela nao existe no jogo solo (sozinho o placar e o do HUD)
     e e reescrita so quando algum numero muda - com oito jogadores, mexer no
     DOM 60 vezes por segundo seria desperdicio puro.

     O numero de cada linha e o total da CORRIDA (as fases fechadas mais a de
     agora), e nao so o da fase: numa disputa de tres fases e esse o numero que
     diz quem esta na frente. */
  var placarPintado = '';

  /** Mostra ou esconde um pedaco da pagina. */
  function exibir(elemento, sim) {
    if (sim) elemento.classList.remove('hidden');
    else elemento.classList.add('hidden');
  }

  /* A tarja do palco: um recado curto pintado POR CIMA de tudo - inclusive das
     telas de fim de fase e de parabens, porque ela e a ultima coisa dentro do
     `#palco`. E dela que sai o aviso de "conexao instavel" (a sala ficou mais
     de 2 segundos calada) e o motivo de uma partida que acabou no meio. Texto
     vazio apaga e esconde. */
  function recadoNoPalco(texto) {
    el.recado.textContent = texto || '';
    exibir(el.recado, !!texto);
  }

  /** O placar de agora, do melhor para o pior. */
  function placarDaSala() {
    return Placar.daSala(jogo.jogadores, jogo.concluida);
  }

  /* Um pedacinho de texto da lista. Sempre `textContent`, nunca HTML: o
     apelido vem da rede e vira texto, e mais nada. */
  function pedaco(classe, texto) {
    var e = document.createElement('span');
    e.className = classe;
    e.textContent = texto;
    return e;
  }

  /** O quadradinho da cor do jogador, do lado do nome. */
  function pedacoDaCor(cor) {
    var e = document.createElement('span');
    e.className = 'cor';
    e.style.background = corSegura(cor);
    return e;
  }

  /** Uma linha de placar: lugar, cor, nome e pontos. */
  function linhaDoPlacar(p, lugar) {
    var li = document.createElement('li');
    if (p.eu) li.className = 'eu';
    li.appendChild(pedaco('lugar', lugar));
    li.appendChild(pedacoDaCor(p.cor));
    li.appendChild(pedaco('nome', p.apelido));
    li.appendChild(pedaco('pts', String(p.pontos)));
    return li;
  }

  /** O ouro, a prata e o bronze - do quarto lugar em diante, o numero. */
  function medalha(lugar) {
    return ['🥇', '🥈', '🥉'][lugar - 1] || lugar + 'º';
  }

  /* Reescreve a mini-lista, se e que mudou alguma coisa. `forcar` serve para
     as horas em que a lista some e volta (o comeco de uma sala, a saida de uma
     pausa): dai o texto tem de ser pintado de novo mesmo sem novidade. */
  function atualizarPlacar(forcar) {
    if (!emGrupo()) { placarPintado = ''; return; }

    var lista = Placar.colocar(placarDaSala());
    var assinatura = Placar.assinatura(lista);
    if (!forcar && assinatura === placarPintado) return;
    placarPintado = assinatura;

    el.placarLista.innerHTML = '';
    for (var i = 0; i < lista.length; i++) {
      el.placarLista.appendChild(linhaDoPlacar(lista[i], lista[i].lugar + 'º'));
    }
  }

  /** Guarda o progresso novo do jogador; `vidas` e a copia que o HUD le. */
  function aplicarProgresso(j, novo) {
    j.progresso = novo;
    j.vidas = novo.vidas;
    if (j.local) atualizarHud();
  }

  /* Onde este jogador nasce agora: no ultimo checkpoint que ELE acendeu ou no
     comeco da fase. Nascendo no comeco, cada um ganha um passinho de folga na
     horizontal - com oito pessoas na sala, todo mundo em cima do mesmo pixel
     viraria uma bola de macacoes. */
  function nascedouroDe(j) {
    var onde = Progresso.nascedouro(fase, j.progresso);
    if (j.progresso.atual >= 0) return onde;
    return {
      x: Fisica.limitar(onde.x + j.indice * VAO_NASCIMENTO, 0, fase.largura - HEROI_L),
      y: onde.y
    };
  }

  /* Poe um jogador de pe onde ele deve nascer agora. As moedas e os blocos NAO
     sao mexidos: o que ja foi pego continua pego. Sozinho, as plataformas
     moveis voltam para o lugar e as faiscas somem junto; numa sala elas sao do
     mundo inteiro e ninguem para o mundo dos outros por ter caido num buraco. */
  function nascer(j) {
    var onde = nascedouroDe(j);
    j.corpo = Fisica.novoCorpo(onde.x, onde.y);
    if (!emGrupo()) {
      jogo.moveis = Moveis.novoEstado(fase);
      jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);
      jogo.efeitos.length = 0;
    }
    if (j.local) seguirCamera();
  }

  /* Volta a fase inteira ao comeco de uma tentativa nova: todo mundo no spawn,
     moedas e blocos de volta no lugar, checkpoints apagados, vidas cheias e os
     placares zerados (senao daria para juntar as mesmas moedas de novo). */
  function reiniciarFase() {
    jogo.itens = Itens.novoEstado(fase);
    jogo.inimigos = Inimigos.novoEstado(fase);
    jogo.moveis = Moveis.novoEstado(fase);
    jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);
    jogo.efeitos.length = 0;
    jogo.concluida = false;
    jogo.quemChegou = -1;

    for (var i = 0; i < jogo.jogadores.length; i++) {
      var j = jogo.jogadores[i];
      j.pontos = 0;
      j.progresso = Progresso.novoEstado(fase);
      j.vidas = j.progresso.vidas;
      var onde = nascedouroDe(j);
      j.corpo = Fisica.novoCorpo(onde.x, onde.y);
    }

    seguirCamera();
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

  /* Passa o mundo dos itens um quadro para a frente para UM jogador: soma os
     pontos das moedas que ele pegou, tira do mapa o bloco que ele quebrou e
     solta os efeitos na tela. As moedas e os blocos sao do mundo: quem pega,
     pega de todos. */
  function atualizarItens(j, antes) {
    var r = Itens.passo(jogo.itens, fase, antes, j.corpo);
    if (r.estado === jogo.itens) return;

    jogo.itens = r.estado;
    jogo.limites = Moveis.limitesCom(r.estado.limites, jogo.moveis);
    j.pontos += r.pontos;

    for (var i = 0; i < r.pegou.length; i++) {
      soltarEfeito('moeda', fase.moedas[r.pegou[i]], EFEITO_MOEDA);
      emitir('moeda');
    }
    if (r.quebrou >= 0) {
      soltarEfeito('cristal', fase.quebraveis[r.quebrou], EFEITO_CRISTAL);
      emitir('bloco-quebrado');
    }
    if (j.local) atualizarHud();
  }

  /* Perder um coracao - seja caindo num buraco, seja esbarrando de frente num
     inimigo. Sobrando vida, o heroi volta ao ultimo checkpoint ligado com as
     moedas que ja juntou (e os bichos que ainda estao vivos voltam para onde
     nasceram); sem nenhuma, a tentativa acaba e a fase inteira recomeca do
     zero. `motivo` e so o aviso que sai antes: 'queda' ou 'dano'. */
  function perderVida(j, motivo) {
    emitir(motivo);

    var r = Progresso.perderVida(j.progresso, fase);
    if (r.tipo === 'reinicio') {
      if (emGrupo()) { recomecarJogador(j); return; }
      jogo.tentativas++;
      reiniciarFase();
      emitir('fase-reiniciada');
      return;
    }

    aplicarProgresso(j, r.estado);
    // Sozinho, os bichos vivos voltam para onde nasceram (senao o heroi
    // renasceria com um deles no colo). Numa sala eles sao de todo mundo:
    // reposicionar os bichos porque UM jogador caiu bagunçaria a fase dos
    // outros - e por isso os checkpoints do mapa ficam longe deles.
    if (!emGrupo()) jogo.inimigos = Inimigos.reposicionar(jogo.inimigos, fase);
    nascer(j);                                 // e as moveis voltam com ele
    emitir('vida-perdida');
  }

  /* Numa partida em grupo, quem fica sem coracoes ganha os coracoes de volta e
     renasce no checkpoint do GRUPO. O mundo NAO recomeca (as moedas e os
     bichos sao de todos), e por isso os pontos que ele ja fez continuam com
     ele: aquelas moedas nao voltaram para o mapa. Os mastros acesos tambem
     ficam onde estao - eles sao da fase, e apaga-los mandaria um jogador so de
     volta para um comeco que a sala inteira ja deixou para tras. */
  function recomecarJogador(j) {
    aplicarProgresso(j, Progresso.renovarVidas(j.progresso));
    nascer(j);
    emitir('jogador-recomecou');
  }

  /** Cair num buraco: conta a queda e cobra o coracao. */
  function cair(j) {
    j.quedas++;
    perderVida(j, 'queda');
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

  /* A patrulha dos bichos, UMA vez por quadro - eles sao do mundo, nao de cada
     jogador. O bicho esperto da fase 3 vai atras de quem estiver mais perto
     dele; sozinho, esse alguem e sempre o heroi de casa, e nada muda. */
  function corpoMaisPertoDe(ini) {
    var perto = null, menor = Infinity;
    for (var i = 0; i < jogo.jogadores.length; i++) {
      var c = jogo.jogadores[i].corpo;
      if (!c) continue;
      var d = Math.abs(c.x - ini.x) + Math.abs(c.y - ini.y);
      if (d < menor) { menor = d; perto = c; }
    }
    return perto;
  }

  function andarInimigos() {
    var lista = [];
    for (var i = 0; i < jogo.inimigos.lista.length; i++) {
      var ini = jogo.inimigos.lista[i];
      lista.push(Inimigos.andarUm(ini, jogo.limites, corpoMaisPertoDe(ini)));
    }
    jogo.inimigos = { lista: lista };
  }

  /* O contato de UM jogador com os bichos que ja andaram neste quadro.
     Devolve `true` quando o contato custou uma vida - o jogador para o quadro
     por ali, porque ele ja mudou de lugar. */
  function atualizarInimigos(j, antes) {
    var r = Inimigos.contato(jogo.inimigos, antes, j.corpo);
    jogo.inimigos = r.estado;

    if (r.derrotados.length) {
      j.pontos += r.pontos;
      for (var i = 0; i < r.derrotados.length; i++) {
        var ini = r.estado.lista[r.derrotados[i]];
        soltarEfeito('inimigo', Inimigos.retangulo(ini), EFEITO_INIMIGO);
        emitir('inimigo-derrotado');
      }
      j.corpo = quicar(j.corpo);
      if (j.local) atualizarHud();
    }

    if (!r.dano) return false;
    perderVida(j, 'dano');
    return true;
  }

  /* Encostou num checkpoint apagado? Ele acende - e fica aceso ate o fim da
     tentativa, mesmo depois de o jogador passar direto por ele. Numa sala o
     mastro e do GRUPO: quem encosta acende para todo mundo, e dali em diante
     e nele que a sala inteira renasce (o PRD pede checkpoint compartilhado).
     Sozinho a lista tem uma linha so e nada muda. */
  function atualizarCheckpoints(j) {
    var r = Progresso.tocar(j.progresso, fase, j.corpo);
    if (r.ativou < 0) return;
    aplicarProgresso(j, r.estado);
    acenderNoGrupo(j, r.ativou);
    soltarEfeito('checkpoint', fase.checkpoints[r.ativou], EFEITO_CHECKPOINT);
    emitir('checkpoint');
  }

  /* Passa o mastro que `quemAcendeu` ligou para os outros jogadores da fase.
     So os checkpoints viajam: os coracoes continuam sendo de cada um. */
  function acenderNoGrupo(quemAcendeu, indice) {
    for (var i = 0; i < jogo.jogadores.length; i++) {
      var outro = jogo.jogadores[i];
      if (outro === quemAcendeu) continue;
      var novo = Progresso.compartilhar(outro.progresso, indice);
      if (novo !== outro.progresso) aplicarProgresso(outro, novo);
    }
  }

  // -------------------------------------------------- Controles de toque ---
  /* No tablet e no celular nao ha seta nem barra de espaco: o jogo e jogado com
     dois polegares, a cruzeta num canto e o pulo no outro. Os tres botoes
     escrevem no MESMO `entrada` que o teclado escreve, entao a fisica, a pausa
     e a rede nao ficam sabendo de nada - para elas "direita apertada" e
     "direita apertada", venha de onde vier.

     Quem conta os dedos e o modulo `Toque`, la em cima (puro, sem DOM). Aqui
     embaixo fica so a fiacao com os eventos de ponteiro - `pointer*`, que valem
     para dedo, caneta e mouse de uma vez so, sem tres caminhos diferentes. */
  var toque = Toque.novoEstado();
  var toqueLigado = aparelhoDeToque();

  var BOTOES_DE_TOQUE = [
    { elemento: el.toqueEsquerda, acao: 'esquerda' },
    { elemento: el.toqueDireita, acao: 'direita' },
    { elemento: el.toquePular, acao: 'pular' }
  ];

  /* Este aparelho e de dedo? O sinal que vale e o do ponteiro GROSSO (`pointer:
     coarse`): ele diz "quem aponta aqui e um dedo", que e exatamente a
     pergunta. Os outros dois sao rede de seguranca para navegador antigo. */
  function aparelhoDeToque() {
    var nav = window.navigator;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    if (nav && (nav.maxTouchPoints | 0) > 0) return true;
    return 'ontouchstart' in window;
  }

  /* A soma das duas maos: uma acao esta apertada se a TECLA dela esta apertada
     ou se ha um dedo no botao dela. Somar (em vez de um escrever por cima do
     outro) e o que faz teclado e dedo conviverem no mesmo aparelho: tirar o
     dedo de um botao nao solta a seta que a outra mao esta segurando. */
  function aplicarEntrada() {
    for (var i = 0; i < Toque.ACOES.length; i++) {
      var acao = Toque.ACOES[i];
      entrada[acao] = teclado[acao] || Toque.apertada(toque, acao);
    }
  }

  /** Troca o estado dos dedos e refaz a conta. */
  function mudarToque(novo) {
    toque = novo;
    pintarBotoesDeToque();
    aplicarEntrada();
  }

  /* O afundado dos botoes que estao com dedo em cima. E uma classe, e nao o
     `:active` do navegador, porque o dedo que ARRASTA de um botao para o outro
     precisa acender o novo - e o `:active` fica preso no primeiro. */
  function pintarBotoesDeToque() {
    for (var i = 0; i < BOTOES_DE_TOQUE.length; i++) {
      var b = BOTOES_DE_TOQUE[i];
      if (Toque.apertada(toque, b.acao)) b.elemento.classList.add('apertado');
      else b.elemento.classList.remove('apertado');
    }
  }

  /* Larga so os DEDOS - as teclas seguem valendo. E o que acontece quando os
     botoes saem da tela (pausa, fim de fase): o dedo continua no vidro, mas o
     botao nao esta mais debaixo dele. */
  function largarDedos() {
    if (Toque.dedos(toque) === 0) return;
    mudarToque(Toque.largarTudo());
  }

  /* Larga TUDO - teclas e dedos. E o que a pausa, o comeco de uma corrida nova
     e a aba que perde o foco pedem: dali ninguem sai correndo sozinho. */
  function largarControles() {
    teclado.esquerda = teclado.direita = teclado.pular = false;
    toque = Toque.largarTudo();
    pintarBotoesDeToque();
    aplicarEntrada();
  }

  /* Liga ou desliga o modo dedo. Ligado, os botoes entram no palco e a caixa de
     controles sai: ela fala de setas e barra de espaco, que num aparelho sem
     teclado nao existem - e ainda ficaria bem debaixo do botao de pular. */
  function definirToque(ligado) {
    if (toqueLigado === ligado) return;
    toqueLigado = ligado;
    largarDedos();
    atualizarControles();
  }

  function ligarBotaoDeToque(elemento, acao) {
    elemento.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      /* O navegador prende o dedo no botao em que ele encostou (a "captura
         implicita" dos eventos de ponteiro). Soltando essa captura, o
         `pointerenter`/`pointerleave` dos vizinhos volta a valer - e ai
         arrastar o polegar de um botao para o outro passa a funcionar, que e
         como se vira o heroi sem tirar o dedo da tela. */
      if (elemento.hasPointerCapture && elemento.releasePointerCapture &&
          elemento.hasPointerCapture(ev.pointerId)) {
        elemento.releasePointerCapture(ev.pointerId);
      }
      if (ev.pointerType === 'touch') definirToque(true);
      mudarToque(Toque.encostar(toque, ev.pointerId, acao));
    });

    /* O dedo entrou ARRASTANDO, vindo do botao do lado. Um mouse so passeando
       por cima (nenhum botao apertado) nao conta. */
    elemento.addEventListener('pointerenter', function (ev) {
      if (!ev.buttons) return;
      mudarToque(Toque.encostar(toque, ev.pointerId, acao));
    });

    elemento.addEventListener('pointerleave', function (ev) {
      mudarToque(Toque.soltar(toque, ev.pointerId));
    });
  }

  for (var iBotaoToque = 0; iBotaoToque < BOTOES_DE_TOQUE.length; iBotaoToque++) {
    ligarBotaoDeToque(BOTOES_DE_TOQUE[iBotaoToque].elemento,
                      BOTOES_DE_TOQUE[iBotaoToque].acao);
  }

  /* Soltar e sempre na JANELA, e nao no botao: o dedo pode terminar fora dele
     (arrastou para o meio da tela e so entao levantou) e o botao nunca ficaria
     sabendo. */
  function soltarDedo(ev) { mudarToque(Toque.soltar(toque, ev.pointerId)); }

  window.addEventListener('pointerup', soltarDedo);
  window.addEventListener('pointercancel', soltarDedo);

  /* A rede de seguranca da deteccao: um toque em qualquer canto da pagina ja
     prova que este aparelho e de dedo. Serve para o navegador antigo que nao
     responde `pointer: coarse` e para o hibrido (notebook com tela sensivel)
     que so se revela quando alguem encosta nele. */
  window.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType === 'touch') definirToque(true);
  }, true);

  /* Girar o aparelho no meio de um pulo costuma comer o `pointerup` do dedo que
     estava na tela: sem isto o heroi sairia correndo sozinho para sempre. */
  window.addEventListener('orientationchange', largarDedos);

  window.SuperAdventure.Toque = Toque;
  window.SuperAdventure.toque = function () { return toque; };
  window.SuperAdventure.toqueLigado = function () { return toqueLigado; };
  window.SuperAdventure.definirToque = function (ligado) { definirToque(ligado); };

  // ------------------------------------------------- Pausa e tela cheia ----
  /* A caixa de controles no canto do palco. Ela so aparece com o jogo
     rolando: no menu, na pausa e nas telas de fim tem sempre um quadro por
     cima, e o lembrete atras dele so sujaria a tela.

     Os botoes de toque entram no LUGAR dela quando o aparelho e de dedo: um
     cartaz falando de setas nao serve para quem nao tem teclado. Saindo da
     tela, os botoes largam os dedos que estavam em cima - senao o heroi
     voltaria correndo sozinho na proxima fase.

     O placar da sala segue a mesma regra - e so aparece quando ha sala. */
  function atualizarControles() {
    var mostrar = jogo.tela === 'jogando' && !jogo.pausado && !jogo.concluida;
    var comToque = mostrar && toqueLigado;
    var comPlacar = mostrar && emGrupo();
    exibir(el.controles, mostrar && !toqueLigado);
    exibir(el.toque, comToque);
    if (!comToque) largarDedos();
    exibir(el.placarSala, comPlacar);
    if (comPlacar) atualizarPlacar(true);
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
    largarControles();
    // Pausado, o convidado para de mandar teclas - e o anfitriao continuaria
    // com as ultimas que recebeu, correndo sozinho. Este ultimo pacote e o que
    // solta as teclas la do outro lado tambem.
    Rede.mandarEntrada();

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

  /* A linha de baixo do quadro de fim de fase. Sozinho e sempre "você"; numa
     sala, o nome de quem tocou a bandeira primeiro - ela vale para o grupo
     inteiro, entao quem ficou para tras precisa saber por que a fase acabou. */
  function recadoDaBandeira() {
    var quem = emGrupo() ? Pacote.porIndice(jogo.jogadores, jogo.quemChegou) : null;
    if (!quem || quem.local) return 'Você chegou na bandeira 🚩';
    return (quem.apelido || 'Outro jogador') + ' chegou na bandeira primeiro 🚩';
  }

  function mostrarFimDeFase(linha) {
    atualizarControles();
    el.faseSubtitulo.textContent = recadoDaBandeira();
    el.faseNumero.textContent = String(linha.numero);
    el.fasePontos.textContent = String(linha.pontos);
    el.faseBonus.textContent = '+' + linha.bonus;
    el.faseProxima.textContent = String(linha.numero + 1);
    // Numa sala quem vira a pagina e o anfitriao: o convidado ve o mesmo
    // quadro, mas com o botao desligado - ele vai junto quando o pacote
    // chegar com a fase nova.
    var convidado = rede.papel === 'convidado';
    el.btnProxima.disabled = convidado;
    el.btnProxima.title = convidado ? 'O anfitrião leva todo mundo para a próxima fase' : '';
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
    prepararFimDaSala();
    el.fim.classList.remove('hidden');
  }

  /* Sozinho, o PARABENS e o de sempre: o resumo da corrida e o botao de jogar
     de novo. Numa sala ele ganha embaixo o RANKING DA SALA - que ainda nao
     chegou, porque quem da a palavra final e a plataforma. Ate o `aoTerminar`
     voltar (ou ate a espera de ~3s acabar) fica o recado de que o placar esta
     sendo juntado, e o botao vira "voltar ao lobby": recomecar a corrida
     sozinho deixaria a sala inteira para tras. */
  function prepararFimDaSala() {
    var grupo = emGrupo();
    exibir(el.fimSala, grupo);
    el.btnDeNovo.textContent = grupo ? 'VOLTAR AO LOBBY' : 'JOGAR NOVAMENTE';
    if (!grupo) {
      el.fimSubtitulo.textContent = 'Você venceu as três fases 🏆';
      return;
    }
    el.fimSubtitulo.textContent = 'A sala terminou as três fases 🏆';
    el.fimRanking.innerHTML = '';
    exibir(el.fimEsperando, true);
  }

  /** O recado de cima do ranking: em que lugar da sala este jogador ficou. */
  function recadoDoRanking(lista) {
    var lugar = Placar.lugarDoEu(lista);
    if (lugar === 1) return 'Você foi o campeão da sala! 🏆';
    if (lugar > 1) return 'Você ficou em ' + lugar + 'º lugar na sala 🏆';
    return 'A sala terminou as três fases 🏆';
  }

  /* O ranking da sala, do PIOR para o MELHOR: a lista sobe degrau por degrau e
     termina no campeao, que e como a criancada gosta de ver. `oficial` diz de
     onde ele veio - do `aoTerminar` da plataforma (o mesmo placar para todos)
     ou daqui de dentro, porque a confirmacao demorou demais. */
  function mostrarRanking(placar, oficial) {
    var lista = Placar.ranking(placar);

    el.fimRanking.innerHTML = '';
    for (var i = 0; i < lista.length; i++) {
      el.fimRanking.appendChild(linhaDoPlacar(lista[i], medalha(lista[i].lugar)));
    }
    el.fimSubtitulo.textContent = recadoDoRanking(lista);
    exibir(el.fimEsperando, false);
    exibir(el.fimSala, true);
    el.btnDeNovo.textContent = 'VOLTAR AO LOBBY';
    el.fim.classList.remove('hidden');
    emitir(oficial ? 'ranking-da-sala' : 'ranking-local');
  }

  /* O botao "Proxima fase". A corrida so anda para a frente e so depois de uma
     bandeira - clicar fora disso nao faz nada. Numa sala, quem anda a fase e o
     anfitriao: o convidado troca de fase quando o pacote dele disser. */
  function avancarFase() {
    if (!jogo.concluida || jogo.corrida.terminada) return;
    if (rede.papel === 'convidado') return;
    irParaFase(jogo.corrida.fase);
  }

  /* Encostou na bandeira: a fase entra no caderno com o bonus de +50 e o jogo
     para (o `atualizar()` volta na primeira linha enquanto `concluida` for
     verdade), esperando o clique que leva para a fase seguinte.

     `quemChegou` e a linha de quem tocou a bandeira, e so o anfitriao (ou quem
     joga sozinho) sabe disso na hora: no convidado a chamada vem do retrato,
     que ja trouxe o indice de quem chegou. O caderno e sempre o DAQUI - cada
     um fecha a fase com os pontos que ele mesmo fez. */
  function concluirFase(quemChegou) {
    jogo.concluida = true;
    if (quemChegou) jogo.quemChegou = quemChegou.indice;
    fecharPontosDaFase();
    jogo.corrida = Corrida.concluir(jogo.corrida, jogo.fase, jogo.pontos);
    emitir('fase-concluida');

    if (jogo.corrida.terminada) {
      mostrarParabens();
      // Numa sala a corrida so acaba de verdade quando a plataforma disser:
      // e ela que devolve para todos o mesmo placar, na mesma hora.
      Rede.encerrarPartida();
      emitir('corrida-vencida');
      return;
    }
    mostrarFimDeFase(jogo.corrida.fases[jogo.corrida.fases.length - 1]);
  }

  /* O que esta fase rendeu para cada jogador entra no total da corrida dele:
     os pontos que ele fez nela mais o bonus da bandeira, que e da sala inteira
     (a fase acaba para todos ao mesmo tempo, entao o bonus tambem e de todos).
     Quem faz essa conta e quem manda no mundo - o anfitriao, ou quem joga
     sozinho; no convidado o `total` chega pronto no retrato, e somar aqui
     tambem contaria a mesma fase duas vezes. */
  function fecharPontosDaFase() {
    if (rede.papel === 'convidado') return;
    for (var i = 0; i < jogo.jogadores.length; i++) {
      var j = jogo.jogadores[i];
      j.total = (j.total | 0) + j.pontos + PONTOS_BANDEIRA;
    }
  }

  /* Um quadro do mundo inteiro - e o que o anfitriao (ou quem esta sozinho)
     roda. A ordem importa:

       1. as plataformas moveis andam;
       2. cada jogador e levado por ela, da o passo dele e junta o que
          encostou (quem caiu num buraco sai do quadro por aqui);
       3. os bichos patrulham UMA vez, ja com todo mundo no lugar novo;
       4. e so entao vem o contato com os bichos, os checkpoints e a bandeira.

     Sozinho, isso e exatamente o que o jogo sempre fez: a lista de jogadores
     tem uma linha so. */
  function simularMundo() {
    var passoMoveis = Moveis.andar(jogo.moveis);
    jogo.moveis = passoMoveis.estado;
    jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);
    envelhecerEfeitos();

    var seguem = [], antes = [], i, j, deAntes;

    for (i = 0; i < jogo.jogadores.length; i++) {
      j = jogo.jogadores[i];
      deAntes = Moveis.carregar(j.corpo, passoMoveis.deltas);
      j.corpo = Fisica.passo(deAntes, j.entrada, jogo.limites);

      if (Fisica.caiu(j.corpo, fase.fundo)) {          // caiu num buraco
        cair(j);
        continue;
      }
      atualizarItens(j, deAntes);
      seguem.push(j);
      antes.push(deAntes);
    }

    andarInimigos();

    for (i = 0; i < seguem.length; i++) {
      j = seguem[i];
      if (atualizarInimigos(j, antes[i])) continue;    // o contato custou uma vida
      atualizarCheckpoints(j);
      /* A bandeira e da sala: o PRIMEIRO que encostar nela fecha a fase para
         todo mundo, seja ele o anfitriao ou um convidado do outro lado do
         mapa. Se dois encostarem no mesmo quadro, vale quem vem antes na
         lista (a ordem do `indice`, igual em todos os aparelhos). */
      if (Fisica.tocandoCorpo(j.corpo, fase.bandeira)) {
        concluirFase(j);
        return;
      }
    }
  }

  /* O quadro do convidado. O MUNDO nao e dele - moedas, blocos, bichos,
     checkpoints e bandeira sao decididos pelo anfitriao - mas o CORPO dele e
     adivinhado aqui, com a mesma fisica pura de sempre e as mesmas teclas que
     acabaram de subir pela rede. E isto que tira o "molenga" do controle: o
     heroi sai andando no quadro em que o dedo aperta, sem esperar o
     vai-e-volta; o pacote que chega depois so acerta o que ficou torto
     (`Previsao.corrigir`, la no `Pacote.aplicar`).

     As plataformas moveis andam junto porque sao previsiveis (um trilho, um
     pixel por quadro): sem isso, quem estivesse em cima de uma escorregaria
     dela entre um pacote e outro. O retrato seguinte acerta a posicao delas de
     qualquer jeito.

     O que NAO acontece aqui: pegar moeda, quebrar bloco, pisar em bicho,
     acender checkpoint, perder vida. Adivinhar isso daria pontos que o
     anfitriao nao deu - o convidado so fica sabendo pelo pacote. Adivinhar um
     tombo tambem nao faz mal nenhum: o corpo desce alguns pixels e o proximo
     retrato encaixa ele de volta no checkpoint, de uma vez, porque um erro
     desses passa longe dos 90px. */
  function preverCorpoLocal() {
    envelhecerEfeitos();

    var passoMoveis = Moveis.andar(jogo.moveis);
    jogo.moveis = passoMoveis.estado;
    jogo.limites = Moveis.limitesCom(jogo.itens.limites, jogo.moveis);

    var eu = jogo.eu;
    var deAntes = Moveis.carregar(eu.corpo, passoMoveis.deltas);
    eu.corpo = Fisica.passo(deAntes, eu.entrada, jogo.limites);
  }

  function atualizar() {
    if (!jogo.concluida) {
      jogo.relogio++;
      // O convidado nao simula o mundo dos outros: ele adivinha so o proprio
      // corpo e espera o retrato do anfitriao para acertar o resto.
      if (rede.papel === 'convidado') preverCorpoLocal();
      else simularMundo();
      seguirCamera();
    }
    // Depois da bandeira o mundo para, mas a rede nao: e por esses pacotes que
    // os convidados ficam sabendo que a fase acabou (e, logo depois, qual e a
    // proxima).
    Rede.passo();
    // E o placar de todos anda junto: os pontos que sobem aqui e os que
    // chegaram no ultimo retrato.
    atualizarPlacar(false);
  }

  /* Comeca (ou recomeca) a corrida inteira: caderno em branco, fase 1. E o
     que fazem o "Jogar solo" do menu, o "Jogar novamente" da tela de parabens,
     o "Recomecar" da pausa e o comeco de uma partida em grupo. Quem esta numa
     sala continua nela - largar a sala e coisa do "Jogar solo". */
  function comecarPartida() {
    definirPausa(false);                // recomecar pela pausa descongela tudo
    Rede.avisar('');                    // o recado da partida passada nao volta
    jogo.tela = 'jogando';
    jogo.relogio = 0;
    jogo.quedas = 0;
    jogo.tentativas = 1;
    jogo.eventos.length = 0;
    jogo.corrida = Corrida.novoEstado();
    // Corrida nova, placar novo: o total das fases fechadas volta a zero (os
    // pontos da fase quem zera e o `reiniciarFase()`, logo abaixo).
    for (var i = 0; i < jogo.jogadores.length; i++) jogo.jogadores[i].total = 0;
    placarPintado = '';
    largarControles();
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

  /* O botao da tela de PARABENS. Sozinho ele recomeca a corrida na hora. Numa
     sala a partida e de todos: quando ela acaba, a Central devolve a sala ao
     lobby - entao o caminho e voltar para la, onde o anfitriao pode comecar
     outra com a turma inteira. */
  function jogarDeNovo() {
    if (rede.sala) {
      voltarAoMenu();
      Rede.abrirLobby();
      return;
    }
    comecarPartida();
  }

  /* Volta para a tela inicial. So a rede precisa disto: quando a sala acaba ou
     o anfitriao cai, ninguem pode ficar preso numa fase que nao existe mais. */
  function voltarAoMenu() {
    definirPausa(false);
    jogo.tela = 'menu';
    jogo.concluida = false;
    largarControles();
    Rede.limparRecado();          // nenhuma tarja de partida sobra no menu
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

     Comecada a sala, existe UM mundo so e ele e o do anfitriao:

         CONVIDADO                 ANFITRIAO                  CONVIDADO
         teclas  ───────────────▶  simula o mundo  ─────────▶  desenha, preve
         (20x/s)                   inteiro, com todos          (20x/s)  e corrige

     O anfitriao roda `simularMundo()` com a lista inteira de jogadores e manda
     o retrato pronto (`Pacote.montar`) na taxa que o manifesto pediu; o
     convidado manda so as tres teclas dele e copia o retrato que chega
     (`Pacote.aplicar`) - menos o proprio corpo, que ele adivinha em
     `preverCorpoLocal()` e so acerta com `Previsao.corrigir()`.
     ========================================================================== */
  var rede = {
    ligada: false,        // o multijogador da plataforma respondeu "de pe"
    sala: null,           // o instantaneo da sala, numa partida em grupo
    papel: 'solo',        // 'solo' | 'anfitriao' | 'convidado'
    recebidas: 0,         // pacotes que chegaram de outros jogadores
    ultimaMensagem: null, // o ultimo deles, cru
    enviados: 0,          // pacotes que este aparelho mandou
    seq: 0,               // o numero do ultimo pacote que ele montou
    ultimoRecebido: 0,    // o numero do ultimo retrato aplicado
    atrasados: 0,         // retratos que chegaram velhos e foram para o lixo
    erro: 0,              // o quanto a previsao local errou no ultimo retrato
    correcoes: 0,         // retratos que puxaram a previsao de leve (25%)
    snaps: 0,             // ... e os que precisaram encaixar de uma vez
    encerrando: false,    // a corrida acabou e o placar oficial esta a caminho
    espera: 0,            // quadros de espera por esse placar
    encerrada: false,     // ja veio (ou ja desistimos): a partida acabou
    saidas: 0,            // gente que largou a sala no meio da partida
    descartados: 0,       // pacotes que chegaram depois do fim e foram ignorados
    semPacote: 0,         // quadros desde o ultimo pacote da sala
    instavel: false       // ... e passou de 2 segundos: a tarja esta na tela
  };

  var Rede = (function () {
    var P = null;         // o SDK da Central, ja iniciado
    var mj = null;        // P.multijogador
    var quadrosDesdeEnvio = 0;   // para mandar na taxa certa, nao a cada quadro
    var QUADROS_ESPERA_FIM = 3 * 60;   // ~3s esperando o placar da plataforma
    var QUADROS_SEM_PACOTE = 2 * 60;   // 2s calado ja e sinal de rede engasgada

    /* Liga o jogo na plataforma. Devolve `false` (e nao muda nada na tela)
       quando o multijogador nao esta disponivel - e o caso do servidor fora do
       ar, em que o jogo segue sendo o de sempre, so solo. */
    function iniciar(plataforma) {
      P = plataforma || null;
      mj = P && P.multijogador;
      if (!mj || !mj.disponivel) return false;

      rede.ligada = true;
      mj.em('erro', function (texto) { avisar(texto); });
      // Alguem largou a sala: a plataforma avisa a turma inteira, e cada
      // aparelho tira aquela linha do mundo por conta propria.
      mj.em('saiu', function (quem) { jogadorSaiu(quem); });

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

    /* A sala comecou: todo mundo cai na tela do jogo, na fase 1, e a lista de
       jogadores do mundo passa a ser a lista da sala - cada um com o seu
       `indice` (a identidade dele na partida) e a sua `cor`. */
    function comecar(sala) {
      rede.sala = sala;
      rede.papel = sala.souAnfitriao ? 'anfitriao' : 'convidado';
      rede.recebidas = 0;
      rede.ultimaMensagem = null;
      rede.enviados = 0;
      rede.seq = 0;
      rede.ultimoRecebido = 0;
      rede.atrasados = 0;
      rede.erro = 0;
      rede.correcoes = 0;
      rede.snaps = 0;
      rede.encerrando = false;
      rede.espera = 0;
      rede.encerrada = false;
      rede.saidas = 0;
      rede.descartados = 0;
      rede.semPacote = 0;
      marcarInstavel(false);
      quadrosDesdeEnvio = 0;
      montarJogadores(sala);
      avisar('');
      mostrarSala();
      comecarPartida();
      emitir('sala-comecou');
    }

    /* A sala vira a lista de jogadores do mundo, na ordem do `indice`. O
       jogador deste aparelho e o que tem o id de `sala.eu` - e e ele que
       continua sendo `jogo.heroi` para o resto do arquivo. */
    function montarJogadores(sala) {
      var todos = (sala && sala.jogadores) || [];
      var lista = [], eu = null, i;

      for (i = 0; i < todos.length; i++) {
        var p = todos[i];
        var j = novoJogador({
          id: p.id, indice: p.indice, apelido: p.apelido, cor: p.cor,
          local: p.id === sala.eu
        });
        if (j.local) eu = j;
        lista.push(j);
      }
      if (!eu) return;                // sala sem mim: nao mexe em nada

      lista.sort(function (a, b) { return a.indice - b.indice; });
      jogo.jogadores = lista;
      jogo.eu = eu;
    }

    /* Alguem largou a sala no meio da partida: fechou a aba, o wi-fi caiu ou
       clicou em "Jogar solo". A plataforma manda o `saiu` para a sala inteira
       e cada aparelho tira aquela linha do mundo sozinho - no anfitriao ela
       para de ser simulada (e de viajar no retrato), nos convidados ela some
       da tela e do placar. Para quem ficou, a partida continua exatamente como
       estava: um jogador a menos, e mais nada.

       O meu proprio `saiu` nunca chega aqui (a plataforma avisa quem ficou),
       mas o `local` fica de guarda: perder a propria linha deixaria o jogo sem
       heroi. */
    function jogadorSaiu(quem) {
      var id = quem && quem.id;
      if (!rede.sala || rede.encerrada || !id) return;

      var j = jogadorPorId(id);
      if (!j || j.local) return;

      tirarDoMundo(id);
      rede.saidas++;
      emitir('jogador-saiu');
    }

    /* Tira a linha daquele jogador do mundo e do instantaneo da sala. O placar
       lateral e repintado na hora (a lista encolheu) e, se sobrou so o jogador
       de casa, ele nem aparece mais: a mini-lista e coisa de grupo. */
    function tirarDoMundo(id) {
      var ficam = [], i;
      for (i = 0; i < jogo.jogadores.length; i++) {
        if (jogo.jogadores[i].id !== id) ficam.push(jogo.jogadores[i]);
      }
      jogo.jogadores = ficam;

      if (rede.sala && rede.sala.jogadores) {
        var naSala = [];
        for (i = 0; i < rede.sala.jogadores.length; i++) {
          if (rede.sala.jogadores[i].id !== id) naSala.push(rede.sala.jogadores[i]);
        }
        rede.sala.jogadores = naSala;
      }
      atualizarControles();
      atualizarPlacar(true);
    }

    /** De volta a ser um jogo de um jogador so. */
    function jogarSozinho() {
      jogo.eu = novoJogador({ local: true, cor: COR_SOLO });
      jogo.jogadores = [jogo.eu];
    }

    /* Chegou um pacote de outro jogador: ou sao as teclas de um convidado
       (e quem trata e o anfitriao), ou e o retrato do mundo (e quem copia sao
       os convidados). Qualquer outra coisa e ignorada sem barulho. */
    function receber(msg) {
      if (!rede.sala) return;         // pacote atrasado, de uma sala que acabou
      /* A partida ja fechou (o ranking esta na tela): o que ainda estava a
         caminho chegou tarde demais. Aplicar um retrato agora mexeria no mundo
         que ficou congelado atras do quadro de PARABENS - e podia ate trocar a
         fase debaixo dele. Vai para o lixo, sem barulho. */
      if (rede.encerrada) { rede.descartados++; return; }

      chegouPacote();
      rede.recebidas++;
      rede.ultimaMensagem = msg;

      var d = msg && msg.d;
      if (Pacote.ehEntrada(d) && rede.papel === 'anfitriao') {
        aplicarEntrada(msg.de, d);
      } else if (Pacote.ehEstado(d) && rede.papel === 'convidado') {
        aplicarEstado(d);
      }
    }

    /* As teclas de um convidado, do lado do anfitriao. Elas ficam guardadas na
       linha dele e sao usadas no proximo quadro, como se fossem o teclado
       daqui. Comando atrasado (numero menor que o ultimo) e descartado. */
    function aplicarEntrada(id, d) {
      var j = jogadorPorId(id);
      if (!j || j.local) return;
      if (d.n && d.n <= j.seq) return;
      j.seq = d.n || 0;
      j.entrada.esquerda = d.e === 1;
      j.entrada.direita = d.d === 1;
      j.entrada.pular = d.p === 1;
    }

    /* O retrato do mundo, do lado do convidado: ele copia tudo por cima do que
       tinha e refaz as faiscas do que mudou (a moeda que sumiu, o bloco que
       caiu, o bicho que foi pisado) - efeito e local, nao viaja pela rede.

       O corpo de casa e a excecao: aquele o convidado ja adivinhou sozinho, e
       o retrato so puxa ele para o lugar certo (25% do erro, ou de uma vez se
       o erro passar de 90px). */
    function aplicarEstado(d) {
      if (jogo.tela !== 'jogando') return;
      if (d.n && d.n <= rede.ultimoRecebido) { rede.atrasados++; return; }
      rede.ultimoRecebido = d.n || 0;

      // O anfitriao virou a pagina: a fase nova entra antes de copiar o resto,
      // senao as moedas e os bichos seriam lidos com o mapa errado.
      if (d.f && d.f !== jogo.fase) irParaFase(d.f);

      var novidades = Pacote.aplicar(d, jogo, fase, true);
      anotarCorrecao(novidades.correcao);
      efeitosDoPacote(novidades);
      seguirCamera();
      atualizarHud();

      // A bandeira: alguem da sala ja chegou nela (o `w` diz quem) e o quadro
      // de fim de fase sobe aqui tambem, com os pontos que ESTE jogador fez.
      if (d.q && !jogo.concluida) concluirFase();
    }

    /* Anota o tranco que o retrato deu na previsao local. Serve de termometro
       da rede: com a casa em paz o erro fica na casa das dezenas de pixels e
       os `snaps` sao raros - um por morte, um por troca de fase. */
    function anotarCorrecao(c) {
      if (!c) return;
      rede.erro = c.erro;
      if (c.snap) rede.snaps++;
      else rede.correcoes++;
    }

    /** As faiscas do que mudou de um pacote para o outro. */
    function efeitosDoPacote(n) {
      var i;
      for (i = 0; i < n.moedas.length; i++) {
        soltarEfeito('moeda', fase.moedas[n.moedas[i]], EFEITO_MOEDA);
      }
      for (i = 0; i < n.blocos.length; i++) {
        soltarEfeito('cristal', fase.quebraveis[n.blocos[i]], EFEITO_CRISTAL);
      }
      for (i = 0; i < n.inimigos.length; i++) {
        soltarEfeito('inimigo',
          Inimigos.retangulo(jogo.inimigos.lista[n.inimigos[i]]), EFEITO_INIMIGO);
      }
      for (i = 0; i < n.checkpoints.length; i++) {
        soltarEfeito('checkpoint', fase.checkpoints[n.checkpoints[i]], EFEITO_CHECKPOINT);
      }
    }

    /* O quadro da rede. O anfitriao manda o mundo, o convidado manda as
       teclas - os dois na taxa que o manifesto pediu (20 por segundo), que num
       relogio de 60 quadros da um pacote a cada tres. Bem dentro dos freios da
       plataforma: 64 KB e 90 mensagens por segundo. */
    function passo() {
      // Corrida fechada: em vez de mandar mundo, o que se faz aqui e contar os
      // quadros de espera pelo placar oficial.
      if (rede.encerrando) { esperarFim(); return; }
      if (!rede.sala || rede.encerrada || jogo.tela !== 'jogando') return;

      vigiarConexao();

      var taxa = rede.sala.taxaEstado || 15;
      var cada = Math.max(1, Math.round(60 / taxa));
      if (++quadrosDesdeEnvio < cada) return;
      quadrosDesdeEnvio = 0;

      if (rede.papel === 'anfitriao') mandarEstado();
      else mandarEntrada();
    }

    /* O termometro da rede. Com a sala andando, alguma coisa chega umas 20
       vezes por segundo: o retrato do mundo, para o convidado, e as teclas dos
       convidados, para o anfitriao. Dois segundos inteiros de silencio ja sao
       sinal de que a conexao engasgou, e ai a tarja sobe no palco - a crianca
       precisa saber que o jogo travado nao e culpa dela. Ela some sozinha no
       primeiro pacote que chegar.

       Sozinho numa sala (o manifesto permite salas de um) nao ha com quem
       falar: dai nao ha nada a vigiar. */
    function vigiarConexao() {
      if (!emGrupo()) { marcarInstavel(false); return; }
      rede.semPacote++;
      marcarInstavel(rede.semPacote > QUADROS_SEM_PACOTE);
    }

    /** Chegou pacote: a rede esta viva de novo. */
    function chegouPacote() {
      rede.semPacote = 0;
      marcarInstavel(false);
    }

    /** Poe (ou tira) a tarja de conexao instavel, uma vez so por mudanca. */
    function marcarInstavel(sim) {
      if (rede.instavel === sim) return;
      rede.instavel = sim;
      recadoNoPalco(sim ? '⚠ CONEXÃO INSTÁVEL' : '');
      emitir(sim ? 'conexao-instavel' : 'conexao-voltou');
    }

    function mandarEstado() {
      if (!mj || rede.papel !== 'anfitriao') return;
      rede.enviados++;
      mj.enviar(Pacote.montar(jogo, ++rede.seq));
    }

    function mandarEntrada() {
      if (!mj || rede.papel !== 'convidado') return;
      rede.enviados++;
      mj.paraAnfitriao(Pacote.entrada(++rede.seq, entrada));
    }

    /* A bandeira da fase 3 fechou a corrida. Numa sala quem encerra a partida
       e o ANFITRIAO: ele manda o ultimo retrato (e assim os convidados veem a
       bandeira cair) e pede a plataforma que termine, com o placar da sala
       junto - do pior para o melhor, que e a ordem em que o ranking aparece.
       Todo mundo, ele inclusive, cai no `aoTerminar` com esse mesmo placar.

       Ate ele voltar, cada quadro conta: passados ~3 segundos sem resposta,
       vale o placar daqui (a regra da tabela 4.5) - ninguem fica olhando para
       um "juntando o placar..." que nao termina nunca. */
    function encerrarPartida() {
      if (!rede.sala || rede.encerrando || rede.encerrada) return;
      rede.encerrando = true;
      rede.espera = 0;
      marcarInstavel(false);     // acabou: nao ha mais pacote para esperar
      if (rede.papel !== 'anfitriao') return;

      mandarEstado();
      if (mj) mj.terminar(Placar.paraRede(Placar.piorPrimeiro(placarDaSala())));
    }

    /** Conta a espera pelo placar oficial e desiste depois de ~3 segundos. */
    function esperarFim() {
      if (++rede.espera < QUADROS_ESPERA_FIM) return;
      rede.encerrando = false;
      rede.encerrada = true;
      mostrarRanking(placarDaSala(), false);
    }

    /* A partida foi encerrada pela plataforma. Com a corrida terminada, e este
       o placar que o ranking do PARABENS estava esperando; a sala continua de
       pe (a Central devolveu ela ao lobby), e e para la que vai quem clicar no
       botao. Fora disso a sala acabou no meio do caminho, e ninguem pode ficar
       preso numa fase que nao existe mais. */
    function terminar(fim) {
      if (!rede.sala) return;
      /* Partida ja fechada: este `fim` demorou mais que os ~3 segundos de
         espera e chegou depois de o ranking daqui ja estar na tela. Trocar a
         lista debaixo do nariz de quem esta lendo nao ajuda ninguem - ele e
         descartado, e so. */
      if (rede.encerrada) { rede.descartados++; return; }

      // Esperando o placar, ou ainda com o quadro de fim na tela (o oficial
      // chegou atrasado, depois de a espera ja ter mostrado o daqui).
      var noQuadroDoFim = jogo.corrida.terminada && jogo.tela === 'jogando';
      if (rede.encerrando || noQuadroDoFim) {
        var placar = Placar.normalizar((fim && fim.placar) || [], rede.sala.eu);
        rede.encerrando = false;
        rede.encerrada = true;
        mostrarRanking(placar.length ? placar : placarDaSala(), true);
        emitir('sala-terminou');
        return;
      }
      limparSala();
      voltarAoMenu();
      avisar('A partida da sala terminou.');
      emitir('sala-terminou');
    }

    /* O anfitriao caiu (ou a sala se desfez) no meio da partida. Era a maquina
       dele que simulava o mundo, entao nao ha partida para continuar: a regra
       do PRD e abortar. O que nao pode acontecer, de jeito nenhum, e alguem
       ficar preso numa tela parada - e por isso ha dois caminhos:

         - a corrida ainda estava rolando: todo mundo volta ao menu, com o
           motivo na tarja vermelha, e dali da para jogar solo ou abrir o lobby
           de novo (a Central ja escolheu um anfitriao novo para a sala);
         - a corrida ja tinha acabado e o que faltava era so o placar oficial:
           vale o daqui, e a tela de PARABENS fecha com o ranking local em vez
           de ficar "juntando o placar da sala..." para sempre. */
    function abortar(motivo) {
      if (!rede.sala) return;
      var recado = (motivo && motivo.motivo) || 'A sala foi encerrada.';

      if (rede.encerrando || (jogo.corrida.terminada && jogo.tela === 'jogando')) {
        rede.encerrando = false;
        rede.encerrada = true;
        marcarInstavel(false);
        mostrarRanking(placarDaSala(), false);
        recadoNoPalco(recado);
        avisar(recado);
        emitir('sala-abortada');
        return;
      }

      limparSala();
      voltarAoMenu();
      avisar(recado);
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
      rede.encerrando = false;
      rede.espera = 0;
      rede.encerrada = false;
      rede.semPacote = 0;
      limparRecado();            // sem sala nao ha conexao para reclamar
      jogarSozinho();
      mostrarSala();
      atualizarControles();      // sem sala nao ha placar lateral
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

    /** Apaga a tarja do palco (e o motivo dela) - o menu comeca limpo. */
    function limparRecado() {
      marcarInstavel(false);
      recadoNoPalco('');
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
      encerrarPartida: encerrarPartida,
      passo: passo,
      mandarEstado: mandarEstado,
      mandarEntrada: mandarEntrada,
      limparRecado: limparRecado,
      avisar: avisar
    };
  }());

  window.SuperAdventure.rede = rede;
  window.SuperAdventure.placarDaSala = function () { return placarDaSala(); };
  window.SuperAdventure.abrirLobby = function () { Rede.abrirLobby(); };
  window.SuperAdventure.voltarAoMenu = function () { voltarAoMenu(); };
  window.SuperAdventure.mandarEstado = function () { Rede.mandarEstado(); };
  window.SuperAdventure.mandarEntrada = function () { Rede.mandarEntrada(); };

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
    teclado[acao] = apertada;
    aplicarEntrada();
  }

  window.addEventListener('keydown', function (ev) {
    var atalho = ATALHOS[ev.key];
    if (atalho) { ev.preventDefault(); atalho(); return; }
    tecla(ev, true);
  });
  window.addEventListener('keyup', function (ev) { tecla(ev, false); });
  window.addEventListener('blur', largarControles);

  el.btnSolo.addEventListener('click', comecarSolo);
  el.btnProxima.addEventListener('click', avancarFase);
  el.btnDeNovo.addEventListener('click', jogarDeNovo);
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
