/* ==========================================================================
   COME-COME  -  labirinto de fliperama, no clima dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 2 do plano: AS PASTILHAS, A PONTUACAO, O HUD E O LABIRINTO LIMPO. O
   come-come agora COME: passar por cima de uma pastilha faz ela sumir e somar
   pontos, o HUD mostra o placar, as vidas e a fase, e quando a ultima pastilha
   some o labirinto e dado por limpo.

   O chao de tudo (fase 1) continua sendo o mesmo:

     - `Mapa`: o labirinto e um DESENHO EM TEXTO, uma letra por quadrado. Este
       modulo le o desenho e devolve a grade que o jogo usa (paredes, pastilhas,
       pastilhas de poder, a porta da casa dos fantasmas, o nascimento e as
       linhas de tunel). Funcao pura: nao sabe nada de tela nem de teclado.
     - `Movimento`: andar em grade, do jeito que o genero pede - o come-come
       tem uma DIRECAO ATUAL e uma DIRECAO DESEJADA, e a curva so acontece
       quando o corredor abre para aquele lado. Bateu na parede, para no centro
       da celula; andando, fica sempre alinhado no meio do corredor. Pura
       tambem, e por isso o convidado vai poder prever o proprio corpo com
       exatamente a mesma funcao que o anfitriao roda.
     - O TUNEL lateral: quem sai por uma ponta da linha do tunel entra pela
       outra, sem parar de andar.
     - O desenho, 8-bit de verdade: nao existe imagem nenhuma no jogo. As
       paredes sao blocos com um brilho de 2px nas beiradas que dao para o
       corredor, as pastilhas sao quadradinhos e o come-come e um circulo
       RASTERIZADO na mao, linha por linha, com a boca abrindo e fechando na
       direcao em que ele anda.

   E o que a fase 2 poe por cima:

     - `Pastilhas`: o caderninho do labirinto - quais pastilhas ainda estao de
       pe, o que acontece quando o come-come passa por cima de uma (ela some e
       vale 10; a de PODER vale 50 e vem marcada a parte, ainda sem efeito
       nenhum - isso e a fase 4) e quantas faltam para o labirinto ficar limpo.
       Puro tambem, e pelo mesmo motivo do resto: numa sala vai ser ele, no
       aparelho do anfitriao, que diz qual pastilha sumiu para todo mundo.
     - O HUD - pontos, vidas e fase - mora no HTML, FORA do canvas: assim ele
       cresce junto com a tela e continua legivel no celular.
     - A ultima pastilha do labirinto fecha a fase.

   O labirinto tem 28 colunas por 31 linhas de quadrados de 16px - 448 x 496
   pixels, que e o tamanho de dentro do canvas. O tamanho de FORA (o quanto ele
   aparece na tela) e escolhido pelo CSS, mantendo a proporcao: as contas do
   jogo acontecem sempre nos mesmos 448 x 496, em qualquer aparelho.

   Os fantasmas ainda nao existem (fase 3), a pastilha de poder ainda so vale
   pontos (fase 4), as vidas ainda nao caem porque nao ha de quem fugir (fase
   5), o labirinto ainda e um so (fase 6a) e a tela entra direto no jogo, sem
   menu (fase 7). O que da para fazer hoje e o que a fase 2 promete: correr
   pelo labirinto comendo tudo, ver o placar subir e limpar o labirinto.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------- O mundo ----
  var TILE = 16;                          // o labirinto e feito de quadrados de 16
  var COLUNAS = 28, LINHAS = 31;          // o tamanho de todo labirinto do jogo
  var LARGURA = COLUNAS * TILE;           // 448 - a largura de dentro do canvas
  var ALTURA = LINHAS * TILE;             // 496 - e a altura
  var PASSO_MS = 1000 / 60;               // um passo de simulacao

  /* Velocidade em pixels por quadro, num relogio fixo de 60 quadros por
     segundo. 2px por quadro sao 8 quadros para atravessar um quadrado: o
     come-come chega EXATAMENTE no centro de cada celula, e e nesses centros
     que ele decide se vira ou nao. Numero redondo e o que mantem a grade
     honesta - nada de meio pixel sobrando. */
  var VEL_COME = 2;

  // ------------------------------------------------------------ As regras ---
  var PONTOS_PASTILHA = 10;               // cada pastilha comum
  var PONTOS_PODER = 50;                  // a pastilha de poder (efeito: fase 4)
  var VIDAS_INICIAIS = 3;                 // ainda nao ha como perder (fase 5)
  var TOTAL_FASES = 3;                    // os tres labirintos do jogo (fase 6a)

  // ------------------------------------------------------------ As direcoes -
  /* A ordem importa: e ela que vira numero quando a direcao viajar pela rede,
     e e nela que a direcao oposta e "duas casas adiante". */
  var DIRECOES = ['direita', 'baixo', 'esquerda', 'cima'];

  var VETORES = {
    direita:  { dc:  1, dl:  0 },
    baixo:    { dc:  0, dl:  1 },
    esquerda: { dc: -1, dl:  0 },
    cima:     { dc:  0, dl: -1 }
  };

  /** A direcao contraria a esta (dar meia-volta). */
  function oposta(dir) {
    var i = DIRECOES.indexOf(dir);
    return i < 0 ? dir : DIRECOES[(i + 2) % 4];
  }

  // --------------------------------------------------------------- O mapa ---
  /* Um labirinto e um desenho em texto, uma letra por quadrado de 16x16:

         #  parede                    .  pastilha (10 pontos)
         o  pastilha de poder         -  a porta da casa dos fantasmas
         P  onde o come-come nasce    T  a boca do tunel, nas duas pontas
         (espaco)  chao vazio, sem pastilha nenhuma

     Andam por cima: `.`, `o`, `P`, `T` e o espaco. Nao andam: `#` e `-` - a
     porta da casa e parede para o come-come, e sera passagem so para os
     fantasmas (fase 3a).

     A linha do TUNEL e a que comeca e termina com `T`: nela, sair pela
     esquerda e entrar pela direita. `Mapa.vizinho()` ja devolve o vizinho com
     essa volta feita, entao ninguem mais no arquivo precisa saber do assunto.

     Fora do desenho e parede - menos, claro, na linha do tunel. */
  var Mapa = (function () {

    var PAREDE = '#', PASTILHA = '.', PODER = 'o', PORTA = '-',
        NASCIMENTO = 'P', TUNEL = 'T', VAZIO = ' ';

    // Por onde o come-come passa. A porta da casa fica de fora de proposito.
    var ANDAVEIS = {};
    ANDAVEIS[PASTILHA] = true;
    ANDAVEIS[PODER] = true;
    ANDAVEIS[NASCIMENTO] = true;
    ANDAVEIS[TUNEL] = true;
    ANDAVEIS[VAZIO] = true;

    /** A letra de um quadrado do desenho (fora do desenho: parede). */
    function letra(mapa, c, l) {
      if (l < 0 || l >= mapa.linhas) return PAREDE;
      if (c < 0 || c >= mapa.colunas) return PAREDE;
      return mapa.grade[l].charAt(c) || VAZIO;
    }

    /** Aquele quadrado e parede para o come-come? (a porta da casa tambem e) */
    function parede(mapa, c, l) { return !livre(mapa, c, l); }

    /** O come-come passa por aquele quadrado? */
    function livre(mapa, c, l) { return ANDAVEIS[letra(mapa, c, l)] === true; }

    /** O centro, em pixels, do quadrado (c, l). E nele que a grade "encaixa". */
    function centro(c, l) {
      return { x: c * TILE + TILE / 2, y: l * TILE + TILE / 2 };
    }

    /** Em que coluna (ou linha) da grade cai uma coordenada em pixels. */
    function coluna(x) { return Math.floor(x / TILE); }
    function linha(y) { return Math.floor(y / TILE); }

    /**
     * O vizinho de (c, l) na direcao `dir`, com o tunel ja resolvido: saindo
     * pela ponta de uma linha de tunel, o vizinho e a ponta do outro lado.
     */
    function vizinho(mapa, c, l, dir) {
      var v = VETORES[dir];
      if (!v) return { c: c, l: l };
      var nc = c + v.dc, nl = l + v.dl;
      if (mapa.tuneis[l] && (nc < 0 || nc >= mapa.colunas)) {
        nc = (nc + mapa.colunas) % mapa.colunas;
      }
      return { c: nc, l: nl };
    }

    /** Da para sair de (c, l) andando para `dir`? */
    function podeIr(mapa, c, l, dir) {
      var v = vizinho(mapa, c, l, dir);
      return livre(mapa, v.c, v.l);
    }

    /**
     * O indice da pastilha que mora no quadrado (c, l) - ou -1 se ali nao ha
     * pastilha nenhuma. E a pergunta que o come-come faz a cada quadro ("tem
     * comida debaixo dos meus pes?"), entao ela e uma consulta numa tabela
     * montada uma vez so na leitura do desenho, e nao uma varredura nas 244.
     */
    function pastilhaEm(mapa, c, l) {
      if (l < 0 || l >= mapa.linhas || c < 0 || c >= mapa.colunas) return -1;
      var i = mapa.indicePastilha[l * mapa.colunas + c];
      return i === undefined ? -1 : i;
    }

    /** Quantas saidas tem aquele quadrado (2 = corredor, 3+ = encruzilhada). */
    function saidas(mapa, c, l) {
      var lista = [];
      for (var i = 0; i < DIRECOES.length; i++) {
        if (podeIr(mapa, c, l, DIRECOES[i])) lista.push(DIRECOES[i]);
      }
      return lista;
    }

    /**
     * Le o desenho e devolve o labirinto pronto para o jogo.
     * Nada aqui depende de tela: e so texto virando numeros.
     */
    function ler(grade, opcoes) {
      var op = opcoes || {};
      var colunas = 0, c, l;
      for (l = 0; l < grade.length; l++) colunas = Math.max(colunas, grade[l].length);

      var mapa = {
        grade: grade,
        colunas: colunas,
        linhas: grade.length,
        largura: colunas * TILE,
        altura: grade.length * TILE,
        pastilhas: [],          // todas elas, na ordem de leitura
        poderes: [],            // so os indices das pastilhas de poder
        indicePastilha: [],     // quadrado -> indice da pastilha dali (-1: nenhuma)
        portas: [],             // os quadrados da porta da casa
        tuneis: [],             // tuneis[linha] = true na linha do tunel
        nascimento: null,       // onde o come-come nasce
        nome: op.nome || ''
      };

      // A tabela quadrado -> pastilha comeca vazia: -1 e "aqui nao ha nada".
      for (var q = 0; q < mapa.linhas * colunas; q++) mapa.indicePastilha.push(-1);

      for (l = 0; l < mapa.linhas; l++) {
        // A linha do tunel e a que tem uma boca em cada ponta.
        mapa.tuneis[l] = letra(mapa, 0, l) === TUNEL
                      && letra(mapa, colunas - 1, l) === TUNEL;

        for (c = 0; c < colunas; c++) {
          var ch = letra(mapa, c, l);
          if (ch === PASTILHA || ch === PODER) {
            var meio = centro(c, l);
            if (ch === PODER) mapa.poderes.push(mapa.pastilhas.length);
            mapa.indicePastilha[l * colunas + c] = mapa.pastilhas.length;
            mapa.pastilhas.push({
              c: c, l: l, x: meio.x, y: meio.y, poder: ch === PODER
            });
          }
          if (ch === PORTA) mapa.portas.push({ c: c, l: l });
          if (ch === NASCIMENTO) mapa.nascimento = { c: c, l: l };
        }
      }

      mapa.totalPastilhas = mapa.pastilhas.length;
      return mapa;
    }

    return {
      ler: ler,
      letra: letra,
      livre: livre,
      parede: parede,
      vizinho: vizinho,
      podeIr: podeIr,
      pastilhaEm: pastilhaEm,
      saidas: saidas,
      centro: centro,
      coluna: coluna,
      linha: linha,
      TILE: TILE,
      PAREDE: PAREDE, PASTILHA: PASTILHA, PODER: PODER, PORTA: PORTA,
      NASCIMENTO: NASCIMENTO, TUNEL: TUNEL, VAZIO: VAZIO
    };
  }());

  // ---------------------------------------------------------- O movimento ---
  /* Andar num labirinto nao e andar solto pela tela: o corpo corre por trilhos.
     Ele tem uma DIRECAO ATUAL (para onde esta indo agora) e uma DIRECAO
     DESEJADA (para onde a crianca pediu para ir). A desejada fica guardada e
     so vira a atual quando o corredor abre para aquele lado - e por isso da
     para apertar a seta ANTES da esquina e a curva sair certinha, como nos
     fliperamas.

     A conta acontece nos CENTROS das celulas: e la que se decide virar, e e la
     que se para diante de uma parede. Entre um centro e o outro so existe uma
     mudanca possivel, a meia-volta - afinal a celula de tras acabou de ser
     visitada, entao ela esta livre com certeza.

     `passo()` e funcao pura: recebe um corpo e devolve um corpo NOVO. E dela
     que vai sair, mais para a frente, a previsao local do convidado - o mesmo
     passo rodando nos dois aparelhos da o mesmo resultado. */
  var Movimento = (function () {

    var MEIO = TILE / 2;

    /** Um come-come novinho, parado no centro do quadrado (c, l). */
    function novoCorpo(c, l, dir) {
      var meio = Mapa.centro(c, l);
      var d = VETORES[dir] ? dir : 'esquerda';
      return {
        x: meio.x, y: meio.y,
        dir: d,                 // para onde ele esta indo agora
        desejada: d,            // para onde a crianca pediu para ir
        parado: false,          // encostou numa parede e nao tem para onde ir
        passos: 0               // quadros andados (e o relogio da boca)
      };
    }

    /** O corpo esta bem no centro de um quadrado? (so ali ele pode virar) */
    function noCentro(corpo) {
      return mod(corpo.x, TILE) === MEIO && mod(corpo.y, TILE) === MEIO;
    }

    /** Resto sempre positivo: o `%` do JavaScript nao serve para negativo. */
    function mod(a, b) { return ((a % b) + b) % b; }

    /**
     * Um quadro de movimento. Devolve um corpo novo, sem mexer no que recebeu.
     * `opcoes.velocidade` troca os 2px por quadro (os fantasmas e as fases mais
     * dificeis vao usar isso).
     */
    function passo(corpo, mapa, opcoes) {
      var vel = (opcoes && opcoes.velocidade) || VEL_COME;
      var x = corpo.x, y = corpo.y;
      var c = Mapa.coluna(x), l = Mapa.linha(y);
      var dir = corpo.dir;
      var desejada = corpo.desejada || dir;
      var centrado = noCentro(corpo);

      if (centrado) {
        // No centro do quadrado: aqui o corredor pode abrir para o lado.
        if (desejada !== dir && Mapa.podeIr(mapa, c, l, desejada)) dir = desejada;
      } else if (desejada === oposta(dir)) {
        // No meio do caminho so cabe a meia-volta - de onde viemos esta livre.
        dir = desejada;
      }

      // Parede pela frente, e no centro do quadrado: para aqui mesmo.
      var parado = centrado && !Mapa.podeIr(mapa, c, l, dir);
      var v = VETORES[dir];

      if (!parado) {
        x += v.dc * vel;
        y += v.dl * vel;

        /* Alinhado no meio do corredor: andando na horizontal o corpo fica
           exatamente no centro da linha, e andando na vertical, no centro da
           coluna. Sem isso um empurrao (ou um retrato vindo da rede, la na
           frente) deixaria o come-come raspando a parede. */
        if (v.dl === 0) y = l * TILE + MEIO;
        else x = c * TILE + MEIO;

        // O tunel: saiu por uma ponta, entra pela outra sem parar de andar.
        if (x < 0) x += mapa.largura;
        else if (x >= mapa.largura) x -= mapa.largura;
      }

      return {
        x: x, y: y,
        dir: dir,
        desejada: corpo.desejada,
        parado: parado,
        passos: corpo.passos + (parado ? 0 : 1)
      };
    }

    return {
      novoCorpo: novoCorpo,
      passo: passo,
      noCentro: noCentro,
      oposta: oposta,
      DIRECOES: DIRECOES,
      VETORES: VETORES,
      VELOCIDADE: VEL_COME
    };
  }());

  // ---------------------------------------------------------- As pastilhas --
  /* O caderninho do labirinto: o `Mapa` diz ONDE cada pastilha esta (isso nao
     muda nunca); o "estado das pastilhas" diz quais ainda estao de pe NESTA
     partida:

         { restam: [true, false, true, ...],   // uma casinha por pastilha
           faltam: 243,                        // quantas ainda estao de pe
           comidas: 1 }                        // quantas ja sumiram

     A regra e a do genero, e cabe em uma frase: o come-come come a pastilha do
     quadrado em que ele ESTA. Comum vale 10, a de poder vale 50 e vem marcada
     a parte - o efeito dela (fantasmas assustados) e a fase 4; hoje ela so
     rende mais pontos. Comida uma vez, ela nao volta e nao conta de novo:
     `comer()` num quadrado ja limpo simplesmente nao faz nada.

     Como o resto dos modulos, nada aqui mexe no estado que recebe: quando a
     mordida acontece sai um estado NOVO, e quando nao acontece sai o mesmo de
     antes. Numa sala vai ser esta funcao, rodando no aparelho do anfitriao,
     que decide qual pastilha sumiu para todo mundo. */
  var Pastilhas = (function () {

    /** O comeco de uma fase: todas as pastilhas do desenho de pe. */
    function novoEstado(mapa) {
      var restam = [];
      for (var i = 0; i < mapa.totalPastilhas; i++) restam.push(true);
      return { restam: restam, faltam: mapa.totalPastilhas, comidas: 0 };
    }

    /** Aquela pastilha ainda esta de pe? */
    function existe(estado, i) { return estado.restam[i] === true; }

    /** Quantas ainda faltam para o labirinto ficar limpo. */
    function faltam(estado) { return estado.faltam; }

    /** O labirinto foi limpo? (e o que fecha a fase) */
    function limpo(estado) { return estado.faltam === 0; }

    /** Nada aconteceu neste quadro: o mesmo estado, sem mordida nenhuma. */
    function nada(estado) {
      return { estado: estado, comeu: -1, poder: false, pontos: 0, limpou: false };
    }

    /**
     * Comer a pastilha do quadrado (c, l), se houver uma inteira ali.
     * Devolve `{ estado, comeu, poder, pontos, limpou }`:
     *   comeu   o indice da pastilha que sumiu (-1 = nenhuma)
     *   poder   ela era uma pastilha de poder?
     *   pontos  quanto ela rendeu
     *   limpou  foi ela a ultima do labirinto?
     */
    function comer(estado, mapa, c, l) {
      var i = Mapa.pastilhaEm(mapa, c, l);
      if (i < 0 || !existe(estado, i)) return nada(estado);

      var restam = estado.restam.slice();
      restam[i] = false;
      var novo = {
        restam: restam,
        faltam: estado.faltam - 1,
        comidas: estado.comidas + 1
      };
      var poder = mapa.pastilhas[i].poder === true;

      return {
        estado: novo,
        comeu: i,
        poder: poder,
        pontos: poder ? PONTOS_PODER : PONTOS_PASTILHA,
        limpou: novo.faltam === 0
      };
    }

    /** Um quadro: o come-come come o que estiver debaixo dos pes dele. */
    function passo(estado, mapa, corpo) {
      return comer(estado, mapa, Mapa.coluna(corpo.x), Mapa.linha(corpo.y));
    }

    /** Quanto vale limpar o labirinto inteiro (240 x 10 + 4 x 50 = 2600). */
    function totalDoLabirinto(mapa) {
      var total = 0;
      for (var i = 0; i < mapa.pastilhas.length; i++) {
        total += mapa.pastilhas[i].poder ? PONTOS_PODER : PONTOS_PASTILHA;
      }
      return total;
    }

    return {
      novoEstado: novoEstado,
      comer: comer,
      passo: passo,
      existe: existe,
      faltam: faltam,
      limpo: limpo,
      totalDoLabirinto: totalDoLabirinto,
      PONTOS_PASTILHA: PONTOS_PASTILHA,
      PONTOS_PODER: PONTOS_PODER
    };
  }());

  // ------------------------------------------------------- O labirinto 1 ----
  /* O primeiro dos tres labirintos do jogo: corredores largos, quatro
     pastilhas de poder nos cantos e um tunel na linha do meio. A casa dos
     fantasmas fica no centro, com a porta (`--`) virada para cima. */
  var LABIRINTO_1 = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.##### ## #####.######',
    '######.##### ## #####.######',
    '######.##          ##.######',
    '######.## ###--### ##.######',
    '######.## #      # ##.######',
    'T     .   #      #   .     T',
    '######.## #      # ##.######',
    '######.## ######## ##.######',
    '######.##          ##.######',
    '######.## ######## ##.######',
    '######.## ######## ##.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#o..##.......P .......##..o#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '#..........................#',
    '############################'
  ];

  // Os labirintos do jogo, na ordem em que sao jogados. Os outros dois entram
  // na fase 6a do plano; por ora a corrida tem um so.
  var LABIRINTOS = [
    { numero: 1, nome: 'Praca Redonda', desenho: LABIRINTO_1 }
  ];

  var mapas = [];
  for (var iMapa = 0; iMapa < LABIRINTOS.length; iMapa++) {
    mapas.push(Mapa.ler(LABIRINTOS[iMapa].desenho, LABIRINTOS[iMapa]));
  }

  // O labirinto que esta em jogo agora.
  var labirinto = mapas[0];

  // Aberto para os testes em Node. Nada disto depende de DOM.
  if (typeof window !== 'undefined') {
    window.ComeCome = {
      Mapa: Mapa,
      Movimento: Movimento,
      Pastilhas: Pastilhas,
      LABIRINTO_1: LABIRINTO_1,
      LABIRINTOS: LABIRINTOS,
      mapas: mapas,
      labirinto: labirinto,
      mundo: {
        TILE: TILE, COLUNAS: COLUNAS, LINHAS: LINHAS,
        LARGURA: LARGURA, ALTURA: ALTURA,
        PASSO_MS: PASSO_MS, VEL_COME: VEL_COME,
        PONTOS_PASTILHA: PONTOS_PASTILHA, PONTOS_PODER: PONTOS_PODER,
        VIDAS_INICIAIS: VIDAS_INICIAIS, TOTAL_FASES: TOTAL_FASES
      }
    };
  }

  // Carregado fora da pagina do jogo (o arnes dos testes): os modulos puros ja
  // foram exportados, e o resto - que precisa de tela - nao roda.
  if (typeof document === 'undefined' || !document.getElementById('tela')) return;

  // ------------------------------------------------------------- Desenho ----
  /* Nao existe imagem nenhuma neste jogo: tudo e retangulo pintado no Canvas
     2D, do tamanho de um pixel de console antigo. */
  var COR_FUNDO = '#0d0d17';
  var COR_PAREDE = '#1a1ac0';        // o azul cheio do bloco
  var COR_PAREDE_LUZ = '#5c5cff';    // o brilho de 2px virado para o corredor
  var COR_PORTA = '#ffb8de';         // a porta da casa dos fantasmas
  var COR_PASTILHA = '#fcd8a8';
  var COR_COME = '#fcd800';
  var COR_OLHO = '#0d0d17';

  var BRILHO = 2;                    // a espessura do brilho das paredes
  var PASTILHA_L = 2;                // a pastilha comum e um quadradinho 2x2
  var PODER_MIN = 4, PODER_MAX = 8;  // a de poder pulsa entre 4x4 e 8x8

  /* A boca abre e fecha num ciclo de 16 quadros - o mesmo tempo que o
     come-come leva para atravessar dois quadrados. `ABERTURA_MAX` e a meia
     boca, em radianos: uns 40 graus para cada lado. */
  var CICLO_BOCA = 16;
  var ABERTURA_MAX = 0.7;

  // Onde fica o olho, conforme a direcao: sempre do lado de fora da boca.
  var OLHO = {
    direita:  { dx: -1, dy: -6 },
    esquerda: { dx: -1, dy: -6 },
    cima:     { dx: -6, dy: -1 },
    baixo:    { dx: -6, dy: -1 }
  };

  var tela = document.getElementById('tela');
  var ctx = tela.getContext('2d');
  if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

  function $(id) { return document.getElementById(id); }

  var el = {
    app: $('app'),
    palco: $('palco'),

    // O HUD: os numeros que a crianca acompanha sem tirar o olho do labirinto.
    pontos: $('hud-pontos'),
    vidas: $('hud-vidas'),
    fase: $('hud-fase'),
    faltam: $('hud-faltam'),

    // A tela provisoria de fim de fase (o encadeamento e a fase 6b do plano).
    telaFase: $('tela-fase'),
    faseNumero: $('fase-numero'),
    fasePontos: $('fase-pontos')
  };

  /** As paredes: bloco cheio, com brilho so nas beiradas que dao para o chao. */
  function desenharParedes(mapa) {
    for (var l = 0; l < mapa.linhas; l++) {
      for (var c = 0; c < mapa.colunas; c++) {
        var ch = Mapa.letra(mapa, c, l);
        var x = c * TILE, y = l * TILE;

        if (ch === Mapa.PORTA) {
          // A porta da casa: uma barrinha rosa deitada, no meio do quadrado.
          ctx.fillStyle = COR_PORTA;
          ctx.fillRect(x, y + TILE / 2 - 2, TILE, 3);
          continue;
        }
        if (ch !== Mapa.PAREDE) continue;

        ctx.fillStyle = COR_PAREDE;
        ctx.fillRect(x, y, TILE, TILE);

        ctx.fillStyle = COR_PAREDE_LUZ;
        if (!Mapa.parede(mapa, c, l - 1)) ctx.fillRect(x, y, TILE, BRILHO);
        if (!Mapa.parede(mapa, c, l + 1)) ctx.fillRect(x, y + TILE - BRILHO, TILE, BRILHO);
        if (!Mapa.parede(mapa, c - 1, l)) ctx.fillRect(x, y, BRILHO, TILE);
        if (!Mapa.parede(mapa, c + 1, l)) ctx.fillRect(x + TILE - BRILHO, y, BRILHO, TILE);
      }
    }
  }

  /**
   * As pastilhas que ainda estao de pe. As de poder pulsam, para a crianca
   * achar de longe. Quem foi comida simplesmente nao e pintada - e por isso
   * que o desenho conta a mesma historia que o `estado`.
   */
  function desenharPastilhas(mapa, estado, relogio) {
    ctx.fillStyle = COR_PASTILHA;
    var grande = (relogio % 40) < 20;
    for (var i = 0; i < mapa.pastilhas.length; i++) {
      if (!Pastilhas.existe(estado, i)) continue;
      var p = mapa.pastilhas[i];
      var lado = p.poder ? (grande ? PODER_MAX : PODER_MIN) : PASTILHA_L;
      ctx.fillRect(p.x - lado / 2, p.y - lado / 2, lado, lado);
    }
  }

  /**
   * O come-come: um circulo de 16px rasterizado na mao, linha por linha, com
   * uma fatia tirada fora - a boca - apontando para onde ele anda. Cada linha
   * vira UM retangulo, entao o bicho inteiro sai em ~16 pinceladas.
   *
   * `abertura` vai de 0 (boca fechada, uma bolinha) a 1 (boca escancarada).
   */
  function desenharComeCome(cx, cy, dir, abertura) {
    var raio = TILE / 2;
    var v = VETORES[dir] || VETORES.esquerda;
    var angulo = Math.atan2(v.dl, v.dc);
    var meiaBoca = abertura * ABERTURA_MAX;

    ctx.fillStyle = COR_COME;
    for (var py = -raio; py < raio; py++) {
      var inicio = -1;
      for (var px = -raio; px <= raio; px++) {
        var dentro = false;
        if (px < raio) {
          var mx = px + 0.5, my = py + 0.5;
          dentro = (mx * mx + my * my) <= raio * raio;
          if (dentro && meiaBoca > 0.02) {
            var d = Math.atan2(my, mx) - angulo;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            if (Math.abs(d) < meiaBoca) dentro = false;      // isto e a boca
          }
        }
        if (dentro && inicio < 0) inicio = px;
        if (!dentro && inicio >= 0) {
          ctx.fillRect(cx + inicio, cy + py, px - inicio, 1);
          inicio = -1;
        }
      }
    }

    var olho = OLHO[dir] || OLHO.esquerda;
    ctx.fillStyle = COR_OLHO;
    ctx.fillRect(cx + olho.dx, cy + olho.dy, 2, 2);
  }

  /** A cena inteira, do zero, uma vez por quadro. */
  function desenharCena() {
    ctx.fillStyle = COR_FUNDO;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    desenharParedes(labirinto);
    desenharPastilhas(labirinto, jogo.pastilhas, jogo.relogio);

    var come = jogo.come;
    var ciclo = come.passos % CICLO_BOCA;
    var abertura = ciclo < CICLO_BOCA / 2
      ? ciclo / (CICLO_BOCA / 2)
      : (CICLO_BOCA - ciclo) / (CICLO_BOCA / 2);

    desenharComeCome(come.x, come.y, come.dir, abertura);

    /* Na boca do tunel um pedaco do come-come ja passou da beirada da tela: a
       copia do outro lado faz a travessia parecer o que ela e - um passo so.
       Ela so entra quando o corpo REALMENTE cruza a borda (o centro dele a
       menos de meio quadrado da ponta); no resto do labirinto e desenho a
       toa. */
    var meio = TILE / 2;
    if (come.x < meio) desenharComeCome(come.x + labirinto.largura, come.y, come.dir, abertura);
    else if (come.x > labirinto.largura - meio) {
      desenharComeCome(come.x - labirinto.largura, come.y, come.dir, abertura);
    }
  }

  // -------------------------------------------------------------- O jogo ----
  /* O que a crianca esta pedindo AGORA. Hoje so o teclado escreve aqui; na
     fase 15 a cruzeta e o deslize passam a escrever no mesmo lugar, e nem a
     fisica nem a rede ficam sabendo de onde veio. */
  var entrada = { desejada: null };

  var jogo = {
    tela: 'jogando',                 // o menu chega na fase 7
    relogio: 0,                      // quadros desde o inicio da partida
    fase: 1,                         // o labirinto 1 de 3
    pontos: 0,                       // o que a fase rendeu ate agora
    vidas: VIDAS_INICIAIS,           // ainda nao ha como perder (fase 5)
    come: Movimento.novoCorpo(labirinto.nascimento.c, labirinto.nascimento.l),
    pastilhas: Pastilhas.novoEstado(labirinto)
  };

  // O estado vivo, para os testes dirigirem o jogo sem navegador.
  window.ComeCome.jogo = jogo;
  window.ComeCome.entrada = entrada;

  /** Um passo do mundo. */
  function atualizar() {
    jogo.relogio++;
    if (entrada.desejada) jogo.come.desejada = entrada.desejada;
    jogo.come = Movimento.passo(jogo.come, labirinto);

    // O que estiver debaixo dos pes dele some e vira ponto. Cada pastilha conta
    // uma vez so: nos outros 7 quadros dentro do mesmo quadrado ja nao ha nada.
    var mordida = Pastilhas.passo(jogo.pastilhas, labirinto, jogo.come);
    if (mordida.comeu >= 0) {
      jogo.pastilhas = mordida.estado;
      jogo.pontos += mordida.pontos;
      if (mordida.limpou) concluirFase();
    }
  }

  /**
   * A ultima pastilha sumiu: o labirinto esta limpo e a fase acabou. Por ora a
   * tela so mostra o que a fase rendeu e o mundo congela - quem encadeia o
   * labirinto seguinte e a corrida das tres fases (fase 6b do plano).
   */
  function concluirFase() {
    jogo.tela = 'fase';
    el.faseNumero.textContent = String(jogo.fase);
    el.fasePontos.textContent = String(jogo.pontos);
    el.telaFase.classList.remove('hidden');
  }

  // ----------------------------------------------------------------- HUD ----
  /* Pontos, vidas, fase e quantas pastilhas faltam ficam no HTML (fora do
     canvas): assim eles crescem junto com a tela e continuam legiveis no
     celular. Escrever no DOM so quando o numero muda evita mexer na pagina 60
     vezes por segundo. */
  var COME_VIDA = '🟡';
  var hudPintado = { pontos: -1, vidas: -1, fase: -1, faltam: -1 };

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
      el.vidas.textContent = repetir(COME_VIDA, jogo.vidas) || '—';
    }
    if (jogo.fase !== hudPintado.fase) {
      hudPintado.fase = jogo.fase;
      el.fase.textContent = jogo.fase + ' / ' + TOTAL_FASES;
    }
    var faltam = Pastilhas.faltam(jogo.pastilhas);
    if (faltam !== hudPintado.faltam) {
      hudPintado.faltam = faltam;
      el.faltam.textContent = String(faltam);
    }
  }

  // ------------------------------------------------------------- Teclado ----
  // Setas e WASD dizem a mesma coisa: para que lado a crianca quer virar. O
  // pedido FICA guardado ate o corredor abrir - e por isso da para apertar a
  // seta um pouco antes da esquina.
  var TECLAS = {
    ArrowLeft: 'esquerda', a: 'esquerda', A: 'esquerda',
    ArrowRight: 'direita', d: 'direita', D: 'direita',
    ArrowUp: 'cima', w: 'cima', W: 'cima',
    ArrowDown: 'baixo', s: 'baixo', S: 'baixo'
  };

  window.addEventListener('keydown', function (ev) {
    var dir = TECLAS[ev.key];
    if (!dir) return;
    ev.preventDefault();
    entrada.desejada = dir;
  });

  // ------------------------------------------------------- Tamanho da tela --
  // O canvas tem sempre 448x496 por dentro; aqui so escolhemos de que tamanho
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
  // Relogio fixo de 60 passos por segundo: o labirinto anda sempre igual em
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
      // A fase pode acabar no meio da rajada (a ultima pastilha some): dai em
      // diante o mundo nao anda mais neste quadro.
      while (acumulado >= PASSO_MS && passos < 6 && jogo.tela === 'jogando') {
        atualizar();
        acumulado -= PASSO_MS;
        passos++;
      }
      if (acumulado > PASSO_MS * 6) acumulado = 0;   // a aba voltou do sono
    } else {
      acumulado = 0;
    }

    atualizarHud();
    desenharCena();
  }

  ajustarPalco();
  atualizarHud();
  desenharCena();
  requestAnimationFrame(quadro);
}());
