/* ==========================================================================
   COME-COME  -  labirinto de fliperama, no clima dos consoles de 8 bits
   --------------------------------------------------------------------------
   FASE 10 do plano: A PREVISAO LOCAL DO CONVIDADO.
   A partida solo inteira ja estava de pe desde a fase 7; a fase 8 abriu a
   porta da Central e a 9 juntou a turma num labirinto so, o do anfitriao.
   Agora o convidado deixa de esperar o retrato para sair do lugar: ele ADIVINHA
   o proprio come-come com a mesmissima `Movimento.passo()` que o anfitriao
   roda, e o pacote que chega so acerta o que ficou torto. O mundo continua
   sendo o do anfitriao - pastilha, fantasma e ponto so ele decide.

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

   O que a fase 2 pos por cima:

     - `Pastilhas`: o caderninho do labirinto - quais pastilhas ainda estao de
       pe, o que acontece quando o come-come passa por cima de uma (ela some e
       vale 10; a de PODER vale 50 e vem marcada a parte, ainda sem efeito
       nenhum - isso e a fase 4) e quantas faltam para o labirinto ficar limpo.
       Puro tambem, e pelo mesmo motivo do resto: numa sala vai ser ele, no
       aparelho do anfitriao, que diz qual pastilha sumiu para todo mundo.
     - O HUD - pontos, vidas e fase - mora no HTML, FORA do canvas: assim ele
       cresce junto com a tela e continua legivel no celular.
     - A ultima pastilha do labirinto fecha a fase.

   E o que a fase 3a poe por cima:

     - A CASA dos fantasmas sai do desenho sozinha: `Mapa.ler()` acha a porta
       (`-`), descobre de que lado dela fica a rua e enche o miolo para saber o
       retangulo da casa e os quatro lugares de dentro. Nenhum labirinto
       precisa dizer isso a mao - o desenho ja conta.
     - `Fantasmas`: quatro corpos, cada um com a sua cor e o seu tempo de
       saida. Quem espera balanca na casa; chegada a hora, anda ate a coluna da
       porta, sobe pela porta (a unica passagem que e deles) e cai na rua. Da
       rua nao se volta para dentro: para o corpo livre a porta e parede como
       qualquer outra.
     - Na rua eles andam em grade como o come-come, com uma regra so: em cada
       centro de quadrado olham as saidas, DESCARTAM a meia-volta e pegam a que
       deixa o vizinho mais perto do ALVO que receberam. Empatou, vence a ordem
       do fliperama: cima, esquerda, baixo, direita. Corredor comprido nao tem
       escolha nenhuma - e por isso eles entram no tunel e saem do outro lado.
     - O alvo chega de fora, e de proposito: o `Fantasmas` sabe ANDAR ate um
       alvo, e nao de quem e o alvo.
     - Desenho 8-bit de cada um: a cupula redonda rasterizada na mao, a saia
       balancando em quatro pes e os olhos apontando para onde ele anda.

   O que a fase 3b poe por cima:

     - `Personalidades`: quem diz qual e o alvo de cada um, a cada quadro. O
       vermelho mira o quadrado do come-come; o rosa, quatro casas A FRENTE
       dele; o azul so tem coragem de longe (de perto, se acanha e volta para
       o canto); o laranja sorteia um lugar do labirinto de meio em meio
       segundo. Na dispersao ninguem mira o come-come: cada um vai para o SEU
       canto - que fica na parede da borda, onde nunca se chega, e e por isso
       que ele fica dando voltas pelo quadrante em vez de estacionar.
     - `Sorteio`: um gerador de bolso com SEMENTE, no lugar do `Math.random()`.
       Numa sala os cinco aparelhos precisam ver o laranja andar igual, e para
       isso o sorteio tem que sair de um numero combinado.
     - `Ciclos`: a tabela do fliperama - 7 segundos dispersando, 20 cacando,
       de novo 7 e 20, depois 5 e 20 duas vezes, e dai em diante e caca ate o
       fim. Sao esses respiros que fazem o jogo ser jogavel.
     - Na virada do ciclo, TODOS que estao na rua dao meia-volta na hora
       (`Fantasmas.inverter`), como no original: e o aviso que a crianca ve sem
       ler nada, e a brecha para escapar de um cerco.

   E o que a fase 4 poe por cima:

     - `Poder`: o cronometro da pastilha de poder. Ele sabe quanto tempo o
       feitico ainda dura, quando comecar a PISCAR o aviso de que vai acabar e
       quanto vale o proximo fantasma - a escada 200, 400, 800, 1600, que zera
       a cada nova pastilha. A duracao vem do LABIRINTO (`duracaoPoder`), e nao
       de um numero solto: e assim que os labirintos 2 e 3 vao encurtar o
       feitico sem tocar em nenhuma linha daqui.
     - Os fantasmas ganharam HUMOR. Mordida a pastilha, todos ficam
       `assustado`: azuis, de cara boba, em meia velocidade e - os que estao na
       rua - de meia-volta dada. Nesse estado eles nao cacam: fogem, escolhendo
       em cada esquina a saida que mais AFASTA do come-come.
     - Enquanto o poder vale, o relogio dos humores (dispersar/cacar) fica
       PARADO. Quando o feitico acaba, os quatro voltam exatamente ao ciclo em
       que estavam - sem meia-volta nenhuma, como no fliperama.
     - Encostar num assustado agora vale ponto: ele vira OLHOS, corre de volta
       para casa pela grade (mais rapido que qualquer um), desce pela porta,
       espera um segundinho e renasce inteiro, ja no humor da vez.
     - A meia velocidade do medo e feita andando um quadro sim, um nao - e nao
       com 1px por quadro. E a unica maneira de o corpo continuar caindo nos
       centros dos quadrados quando o feitico acabar e a velocidade voltar a 2.

   E o que a fase 5 poe por cima:

     - `Rodada`: as vidas e o tombo. Ele sabe QUEM machuca (o espelho exato do
       `Fantasmas.comestivel`: assustado nunca, olhos muito menos), QUANTO custa
       (uma vida, e uma so por rodada - o cerco dos quatro nao cobra quatro
       vezes) e O QUE VOLTA quando a pausa passa: o come-come no nascimento, os
       quatro na casa, o relogio dos humores do zero e nenhum feitico valendo.
     - As PASTILHAS ficam de fora do reinicio de proposito: o que a crianca ja
       comeu continua comido. Sem isso o tombo apagaria a fase inteira, e
       ninguem chegaria ao fim de um labirinto de 244 pastilhas.
     - A pausa congela o mundo INTEIRO, inclusive o relogio - que e o mesmo dos
       fantasmas. So o cronometro do tombo anda. Na tela os quatro somem na
       hora e o come-come vai abrindo a boca ate nao sobrar nada dele: e o
       adeus dos fliperamas, e o que a crianca precisa ver ali e ela mesma indo
       embora, nao quem a pegou.
     - Zeradas as vidas, sobe a tela de FIM DE JOGO com os pontos. Em grupo vai
       ser diferente - quem zera vira espectador ate a proxima fase -, mas isso
       e assunto de uma fase mais adiante.

   E o que a fase 6a poe por cima:

     - Mais dois DESENHOS, no mesmo tamanho e com a mesma legenda do primeiro.
       O labirinto 2 tem quarteiroes pequenos e o tunel na rua debaixo da casa;
       o 3 tem quarteiroes grandes, de corredor comprido, e o tunel passando
       bem na frente da porta de onde os fantasmas saem. Como o `Mapa` le tudo
       do desenho (a casa, a porta, o nascimento, as linhas de tunel), um
       labirinto novo e um texto novo - e nada mais.
     - A TABELA DE DIFICULDADE, uma linha por fase, la em cima no arquivo: o
       feitico (8s, 6s, 4s), a pressa de cada fantasma, os tempos de saida da
       casa e a tabela dispersar/cacar. A linha viaja grudada no mapa
       (`mapa.dificuldade`), entao quem carrega um labirinto carrega junto as
       regras dele.
     - A PRESSA e o degrau de velocidade, e ela e o oposto exato da meia
       velocidade do medo: em vez de pular um quadro, o fantasma anda DUAS
       vezes num quadro, de tantos em tantos. E o unico jeito de correr mais
       sem sair da grade de 2px - com 3px por quadro o corpo nunca mais
       acertaria o centro de um quadrado. No labirinto 1 ninguem apressa; no 2
       os dois da frente; no 3 os quatro. Nunca mais do que isso: fantasma bem
       mais rapido que o come-come nao e dificuldade, e beco sem saida.
     - `irParaFase(n)` carrega um dos tres e comeca do zero. Ele so CARREGA;
       quem manda na ordem, no bonus e na tela de Parabens e a corrida.

   O que a fase 6b pos por cima:

     - `Corrida`: o caderninho da partida solo - quanto cada labirinto rendeu,
       o bonus de 500 por deixa-lo sem nenhuma pastilha de pe, o total ate
       agora e qual e o proximo. Puro como o resto, e com uma regra so: a
       corrida anda para a FRENTE. Ou fecha uma fase e abre a seguinte, ou para
       na terceira - nao existe voltar, nem fase 4.
     - Limpar o labirinto 1 ou o 2 sobe o quadro LABIRINTO LIMPO, com o que a
       fase rendeu, o bonus e o botao que abre o proximo. O mundo fica
       congelado atras dele: quem troca de labirinto e o clique, e nao o
       relogio.
     - Limpar o 3 fecha a corrida e traz o PARABENS, com uma linha por fase
       ("pastilhas + bonus = total"), o total das tres e o botao de jogar de
       novo - que zera o caderno, enche as vidas e volta para o labirinto 1.
     - O HUD continua contando os pontos DA FASE, e nao os da corrida: e o
       numero que a crianca acompanha enquanto joga. O total da corrida so
       aparece nas telas de fim - a de Parabens e a de fim de jogo.

   E o que a fase 7 poe por cima - a MOLDURA, no fim do arquivo:

     - O jogo abre no MENU, e nao mais no labirinto. Ele tem o nome do jogo, o
       campo do nome da crianca (guardado no aparelho, para nao ter que digitar
       de novo) e o botao JOGAR. Enquanto o menu esta na tela nao existe HUD,
       nem mundo andando: o `quadro()` so simula com a tela em 'jogando'.
     - A PAUSA (botao do HUD, `P` ou `ESC`) congela o mundo INTEIRO e mais
       nada: `atualizar()` para de ser chamado - entao o relogio, os fantasmas
       e o feitico ficam onde estavam - mas o laco continua desenhando, e o
       labirinto fica ali paradinho atras do quadro. Dele saem os dois
       caminhos: CONTINUAR volta do mesmo ponto e RECOMECAR joga a corrida
       inteira fora e devolve o jogo ao labirinto 1.
     - Comecar uma partida e um caminho SO (`comecarPartida`): o JOGAR do menu,
       o RECOMECAR da pausa e os dois JOGAR DE NOVO das telas de fim passam
       todos por ele. Nao existem duas maneiras diferentes de zerar a corrida.
     - A TELA CHEIA (botao do HUD ou `F`) e a Fullscreen API do navegador,
       pedida para o documento inteiro - o que funciona tanto com o jogo aberto
       direto quanto dentro do iframe do catalogo. Quem manda no desenho do
       botao e o navegador, pelo `fullscreenchange`: sair pelo `ESC` tambem o
       acerta.
     - O CARTAZ dos controles no canto de baixo do palco, so com o labirinto
       rolando: qualquer tela que suba por cima (menu, pausa, fim de fase, fim
       de jogo, Parabens) o esconde.
     - Perder o foco PAUSA sozinho, e girar o aparelho so refaz a conta do
       tamanho do palco. Nem um nem outro toca em uma linha do mundo: a partida
       continua exatamente de onde parou.

   Todo labirinto tem 28 colunas por 31 linhas de quadrados de 16px - 448 x 496
   pixels, que e o tamanho de dentro do canvas. O tamanho de FORA (o quanto ele
   aparece na tela) e escolhido pelo CSS, mantendo a proporcao: as contas do
   jogo acontecem sempre nos mesmos 448 x 496, em qualquer aparelho.

   E o que a fase 8 poe por cima - A CENTRAL, no fim do arquivo:

     - O `index.html` carrega o `/plataforma/sdk.js`, o unico caminho absoluto
       do jogo. Servido pela Central ele existe; aberto direto do disco, nao -
       e ai `window.Plataforma` e `undefined`, o botao dos amigos continua
       escondido e o resto do arquivo nem fica sabendo que existe rede. Essa e
       a regra de ouro da plataforma, e e por isso que TODO o codigo de rede
       mora atras de um portao so, na ultima linha do arquivo.
     - `Rede`: o pedaco que fala com a Central. Ele liga o SDK (`iniciar`),
       mostra o botao, abre o lobby com os quatro ganchos do contrato
       (`aoComecar`, `aoReceber`, `aoTerminar`, `aoAbortar`, com
       `voltarAoLobby: false` - depois da partida quem manda na tela e o jogo)
       e guarda o instantaneo da sala em `rede`.
     - O lobby e da PLATAFORMA, inteiro: nome, criar sala, entrar pelo codigo
       de 4 letras, lista de salas abertas na rede de casa, quem ja chegou e o
       botao de comecar. O jogo nao redesenha nada disso.
     - Comecada a sala, todo mundo cai no labirinto 1 pelo mesmo
       `comecarPartida()` de sempre, com o codigo da sala no HUD e cada
       aparelho sabendo se e `anfitriao` ou `convidado`. NESTA FASE cada um
       ainda simula o seu proprio labirinto - o mundo unico e a fase 9.
     - As saidas de emergencia, que nunca podem deixar ninguem preso numa tela
       parada: o anfitriao caindo (`aoAbortar`) devolve todo mundo ao menu com
       o motivo na tarja vermelha; a partida encerrada pela Central
       (`aoTerminar`) faz o mesmo; e "JOGAR SOZINHO" larga a sala a qualquer
       momento e volta a ser o jogo de um jogador so.

   E o que a fase 9 poe por cima - UM MUNDO SO:

     - A lista de jogadores substitui o heroi unico: numa sala existe um
       come-come por pessoa no MESMO labirinto, cada um nascendo num ponto
       diferente (`Mapa.nascimentos`) e atendendo pelo `indice` da sala, que e
       a identidade dele na partida. Sozinho a lista tem uma pessoa so, e nada
       do resto do arquivo mudou.
     - `Pacote`: o tradutor da rede. `montar()` vira o mundo do anfitriao em
       numeros inteiros (as pessoas, os quatro fantasmas, as pastilhas comidas
       em BITS, o poder, a rodada e uma fila curta de avisos) e `aplicar()`
       copia esse retrato por cima do mundo do convidado. E o mundo INTEIRO a
       cada pacote, e nao a diferenca: um retrato perdido no caminho nao
       desalinha nada.
     - O convidado manda so a direcao desejada; o anfitriao manda o retrato
       completo umas 20 vezes por segundo. Efeito e local: o convidado refaz a
       faisca a partir dos AVISOS que viajam junto, e nunca recebe pixel.

   E o que a fase 10 poe por cima - A PREVISAO LOCAL, que e esta fase:

     - `preverCorpoLocal()`: o quadro do convidado. Ele nao simula o mundo (nao
       come pastilha, nao come fantasma, nao leva tombo e nao ganha ponto), mas
       roda a MESMA `Movimento.passo()` no proprio corpo, com o pedido de
       direcao que acabou de subir pela rede. E por isso que a esquina dobra no
       quadro em que a tecla e apertada, e nao alguns quadros depois.
     - `Previsao`: o encontro entre o que ele adivinhou e o que o anfitriao
       mandou. Erro de ate 90px DENTRO DO MESMO CORREDOR anda 25% do caminho,
       em passos inteiros de 2px (a grade tem que continuar honesta, senao o
       come-come nunca mais acertaria o centro de um quadrado e nunca mais
       viraria uma esquina). Erro maior - ou em outro corredor, onde nao existe
       meio caminho sem atravessar parede - encaixa de uma vez.
     - A direcao NOVA nao espera a proxima batida da taxa: ela sobe no mesmo
       quadro em que a tecla e apertada. Sem isso o anfitriao perderia a
       esquina que a previsao daqui ja dobrou, e o retrato seguinte mandaria o
       come-come de volta.
     - Os outros come-comes e os quatro fantasmas o convidado so DESENHA, do
       jeito que vieram no retrato: adivinhar o que nao e seu seria contar uma
       historia diferente da do anfitriao.

   O que da para fazer hoje e a partida solo INTEIRA, do menu ao fim: os tres
   labirintos em fila, comendo as pastilhas todas e fugindo dos quatro, virando
   o jogo com a bolota do canto - e ou se chega ao PARABENS com o total das
   tres fases, ou os fantasmas cobram as tres vidas antes disso. E, com a
   Central no ar, da para abrir uma sala e levar a turma para o MESMO
   labirinto, com o controle respondendo na hora em todos os aparelhos - a
   disputa das pastilhas e as regras da sala sao as fases 11 e 12.
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

  /* A boca abre e fecha num ciclo de 16 quadros - o mesmo tempo que o
     come-come leva para atravessar dois quadrados. E medida de DESENHO, mas
     mora aqui em cima porque o pacote da rede precisa dela: no retrato do
     mundo viaja so a posicao do come-come dentro deste ciclo (0 a 15), e nao
     a contagem inteira de passos, que cresce sem parar. */
  var CICLO_BOCA = 16;

  /* Os fantasmas correm no mesmo compasso, pelo mesmo motivo: a grade so fica
     honesta com uma velocidade que divide os 16px do quadrado, e 1px por
     quadro seria uma lesma. Quem afina isso fase a fase e a tabela de
     dificuldade (fase 6a); ate la os quatro andam como o come-come. */
  var VEL_FANTASMA = 2;

  /* Os olhos do fantasma comido voltam para casa CORRENDO - e o alivio de quem
     acabou de levar uma mordida virar um par de olhos em fuga, e nao um
     cacador de volta na esquina. 4px por quadro tambem dividem os 16 do
     quadrado, entao a grade continua honesta. (Quem e comido e encaixado no
     centro do quadrado na hora: veja `Fantasmas.comido`.) */
  var VEL_OLHOS = 4;

  /* Quanto o fantasma comido espera dentro da casa antes de sair de novo.
     Um segundo: o bastante para a crianca ver que ele renasceu, curto o
     bastante para nao virar folga. */
  var RENASCER = 60;

  /* Quanto cada fantasma espera dentro da casa antes de abrir a porta, em
     quadros (60 = 1 segundo). O primeiro ja nasce na rua; os outros tres saem
     escalonados, para a crianca ter tempo de comecar a comer. Estes sao os
     tempos do labirinto 1; os outros dois tem os seus, na tabela de
     dificuldade logo abaixo. */
  var SAIDAS = [0, 120, 240, 360];

  /* Os ciclos do fliperama: os fantasmas nao cacam a partida inteira - de
     tempos em tempos eles largam o come-come e vao dar uma volta pelo canto
     deles. Sao os respiros que fazem o jogo ser jogavel: sem eles a crianca
     seria cercada em dez segundos. A tabela e a do arcade original, em
     quadros (60 = 1 segundo), e o -1 do fim quer dizer "daqui em diante e
     caca para sempre". */
  var CICLOS = [
    { modo: 'dispersar', quadros:  7 * 60 },
    { modo: 'cacar',     quadros: 20 * 60 },
    { modo: 'dispersar', quadros:  7 * 60 },
    { modo: 'cacar',     quadros: 20 * 60 },
    { modo: 'dispersar', quadros:  5 * 60 },
    { modo: 'cacar',     quadros: 20 * 60 },
    { modo: 'dispersar', quadros:  5 * 60 },
    { modo: 'cacar',     quadros: -1 }
  ];

  /* As mesmas linhas, mais apertadas, para os labirintos 2 e 3: o respiro da
     dispersao encolhe e a caca estica. */
  var CICLOS_2 = [
    { modo: 'dispersar', quadros:  5 * 60 },
    { modo: 'cacar',     quadros: 25 * 60 },
    { modo: 'dispersar', quadros:  5 * 60 },
    { modo: 'cacar',     quadros: 25 * 60 },
    { modo: 'dispersar', quadros:  4 * 60 },
    { modo: 'cacar',     quadros: 25 * 60 },
    { modo: 'dispersar', quadros:  4 * 60 },
    { modo: 'cacar',     quadros: -1 }
  ];

  var CICLOS_3 = [
    { modo: 'dispersar', quadros:  4 * 60 },
    { modo: 'cacar',     quadros: 30 * 60 },
    { modo: 'dispersar', quadros:  4 * 60 },
    { modo: 'cacar',     quadros: 30 * 60 },
    { modo: 'dispersar', quadros:  3 * 60 },
    { modo: 'cacar',     quadros: 30 * 60 },
    { modo: 'dispersar', quadros:  3 * 60 },
    { modo: 'cacar',     quadros: -1 }
  ];

  /* Quanto tempo a pastilha de poder vale, em quadros, quando o labirinto nao
     disser nada. Cada labirinto tem o SEU numero (`poder` na tabela de
     dificuldade, que vira `mapa.duracaoPoder`): e assim que os labirintos 2 e
     3 encurtam o feitico sem mexer em mais nada. */
  var PODER_QUADROS = 8 * 60;

  /* --------------------------------------------- A TABELA DE DIFICULDADE ---
     Tudo o que muda de um labirinto para o outro mora AQUI, nesta tabela e em
     nenhum outro lugar - da para conferir as tres fases de uma olhada so. O
     desenho de cada labirinto fica no fim do arquivo; o que vem aqui e o
     ajuste fino, e ele so anda para um lado: cada coluna aperta da fase 1
     para a 3.

       poder    quanto a pastilha de poder vale, em quadros - 8s, 6s, 4s
       pressa   quantos passos A MAIS cada um dos quatro da a cada 16 quadros,
                na ordem vermelho, rosa, azul, laranja: 0 e a velocidade do
                come-come (2px por quadro) e 1 sao 106% dela. No labirinto 1
                ninguem tem pressa; no 2 os dois da frente apertam o passo; no
                3 os quatro correm. Mais do que isso ninguem escapa: um
                fantasma bem mais rapido que o come-come nao e dificuldade, e
                beco sem saida - o fliperama original nunca passou disso.
                Por dentro e o mesmo truque da meia velocidade do medo, ao
                contrario (andar duas vezes num quadro em vez de nenhuma), e
                pelo mesmo motivo: com 3px por quadro o corpo sairia da grade
                de 2px e nunca mais acertaria o centro de um quadrado.
       saidas   quanto cada um espera na casa antes de abrir a porta
       ciclos   a tabela dispersar/cacar da fase (menos respiro, mais caca)
  */
  var DIFICULDADE = [
    { fase: 1, poder: 8 * 60, pressa: [0, 0, 0, 0], saidas: [0, 120, 240, 360], ciclos: CICLOS },
    { fase: 2, poder: 6 * 60, pressa: [1, 1, 0, 0], saidas: [0,  90, 180, 270], ciclos: CICLOS_2 },
    { fase: 3, poder: 4 * 60, pressa: [1, 1, 1, 1], saidas: [0,  60, 120, 180], ciclos: CICLOS_3 }
  ];

  /* De quantos em quantos quadros a pressa da a volta. Dezesseis quadros sao
     dois quadrados de corredor, entao `pressa` se le direto: 1 e "um quadrado
     a mais a cada dois". */
  var COMPASSO_PRESSA = 16;

  /* O aviso de que o feitico esta acabando: nos ultimos dois segundos os
     fantasmas piscam entre o azul e o branco, meio segundo de cada vez... quer
     dizer, 20 quadros de ciclo - 6 piscadas certinhas dentro do aviso. */
  var AVISO_PODER = 2 * 60;
  var PISCA_PODER = 20;

  /* A escada do fliperama: o primeiro fantasma comido DENTRO DA MESMA pastilha
     vale 200, o segundo 400, e assim por diante. Comer os quatro rende 3000 -
     mais do que 300 pastilhas comuns, e por isso vale a pena arriscar. Cada
     pastilha nova recomeca a escada do 200. */
  var PREMIOS = [200, 400, 800, 1600];

  /* A que distancia, em pixels, o come-come e um fantasma se encostam. Meio
     quadrado: menos que isso deixaria escapar o cruzamento de dois corpos que
     andam em direcoes opostas. */
  var RAIO_TOQUE = 8;

  /* Quanto o mundo fica parado depois de um tombo, em quadros. Um segundo e
     meio: nos primeiros dois tercos o come-come vai abrindo a boca ate sumir
     (o adeus dos fliperamas), e no terco final o labirinto fica vazio - o
     respiro que a crianca usa para entender o que aconteceu antes de todo
     mundo voltar para o lugar. */
  var PAUSA_TOMBO = 90;

  /* De quanto em quanto o fantasma aleatorio sorteia um lugar novo do
     labirinto: meio segundo e o bastante para ele mudar de ideia numa esquina
     ou noutra sem virar um pinguim eletrico. */
  var TROCA_SORTEIO = 30;

  /* Quantos quadrados a frente do come-come o emboscador mira, e a partir de
     que distancia o timido cria coragem (em quadrados). Os dois numeros sao os
     do fliperama. */
  var PASSOS_A_FRENTE = 4;
  var DISTANCIA_TIMIDO = 8;

  /* A semente do sorteio. Numa sala ela vem da Central (a mesma para os cinco
     aparelhos, e por isso o laranja anda igual em todos); no jogo de um
     jogador so ela e este numero fixo - assim a partida e sempre a mesma para
     quem esta testando, e a crianca nao nota diferenca nenhuma. */
  var SEMENTE_PADRAO = 20250830;

  // ------------------------------------------------------------ As regras ---
  var PONTOS_PASTILHA = 10;               // cada pastilha comum
  var PONTOS_PODER = 50;                  // a pastilha de poder (efeito: fase 4)
  var VIDAS_INICIAIS = 3;                 // tres tombos e a partida solo acaba
  var TOTAL_FASES = 3;                    // os tres labirintos do jogo (fase 6a)

  /* O premio por deixar um labirinto sem nenhuma pastilha de pe. Sao 50
     pastilhas de bonus: o bastante para a crianca sentir que limpar o
     labirinto vale mais do que so as pastilhas que ela comeu, e pouco o
     bastante para nao virar o jogo de cabeca para baixo - com 244 pastilhas na
     mesa, quem joga bem continua ganhando pelo que comeu. */
  var PONTOS_LIMPOU = 500;

  /* Quantos avisos cabem no retrato do mundo. Aviso e coisa rara - a bolota
     mordida e o fantasma comido -, entao entre dois pacotes (tres quadros) mal
     acontece um. O teto esta aqui para o caso torto: pacote nenhum pode
     crescer sem limite por causa de uma fila que ninguem esvaziou. */
  var MAX_AVISOS = 6;

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
     * As distancias, em quadrados, de cada lugar do labirinto ate o mais perto
     * de um punhado de partidas - uma busca em largura pela grade, com o tunel
     * contando como um passo. A chave e `coluna + ',' + linha`.
     */
    function distancias(mapa, partidas) {
      var visto = {}, fila = [], i, d;
      for (i = 0; i < partidas.length; i++) {
        var p = partidas[i];
        if (visto[p.c + ',' + p.l] !== undefined) continue;
        visto[p.c + ',' + p.l] = 0;
        fila.push({ c: p.c, l: p.l, d: 0 });
      }
      for (i = 0; i < fila.length; i++) {
        var aqui = fila[i];
        for (d = 0; d < DIRECOES.length; d++) {
          if (!podeIr(mapa, aqui.c, aqui.l, DIRECOES[d])) continue;
          var v = vizinho(mapa, aqui.c, aqui.l, DIRECOES[d]);
          if (visto[v.c + ',' + v.l] !== undefined) continue;
          visto[v.c + ',' + v.l] = aqui.d + 1;
          fila.push({ c: v.c, l: v.l, d: aqui.d + 1 });
        }
      }
      return visto;
    }

    /**
     * Onde nascem os `quantos` come-comes de uma partida - um por pessoa da
     * sala, e cada um num canto diferente do labirinto.
     *
     * O primeiro e sempre o `P` do desenho: assim o jogo de um jogador so
     * nasce exatamente onde sempre nasceu. Os outros saem de uma regra simples
     * e sem sorteio nenhum: cada vez, o quadrado andavel MAIS LONGE de todos os
     * que ja foram escolhidos (empate: o de cima, e depois o da esquerda).
     * Como a conta e a mesma em todo aparelho, os cinco veem os cinco
     * nascendo nos mesmos lugares - e ninguem nasce em cima do vizinho.
     *
     * O miolo da casa dos fantasmas fica de fora (a lista `chao` ja o exclui):
     * de dentro dela a porta e parede, e o coitado nasceria preso.
     */
    function nascimentos(mapa, quantos) {
      var quero = Math.max(1, quantos | 0);
      var lista = [{ c: mapa.nascimento.c, l: mapa.nascimento.l }];
      var chao = mapa.chao && mapa.chao.length ? mapa.chao : lista;

      while (lista.length < quero) {
        var longe = distancias(mapa, lista);
        var melhor = null, melhorD = -1;
        for (var i = 0; i < chao.length; i++) {
          var q = chao[i];
          var d = longe[q.c + ',' + q.l];
          if (d === undefined || d <= melhorD) continue;   // empate: fica o primeiro
          melhor = q;
          melhorD = d;
        }
        // Labirinto de um corredor so (nao existe nenhum aqui, mas um desenho
        // novo pode ser assim): dai todo mundo nasce onde o `P` manda.
        if (!melhor || melhorD <= 0) { lista.push(lista[0]); continue; }
        lista.push({ c: melhor.c, l: melhor.l });
      }
      return lista;
    }

    /**
     * A casa dos fantasmas, descoberta a partir do desenho - nenhum labirinto
     * precisa dizer isto a mao. Anda assim:
     *
     *   1. a PORTA e o `-` mais em cima (e mais a esquerda, se houver dois);
     *   2. de um lado dela ha rua e do outro o miolo da casa: o lado que e
     *      chao andavel e o de FORA, e o oposto e o de DENTRO;
     *   3. enchendo o miolo a partir de dentro (a porta nao e chao, entao a
     *      agua nunca vaza para a rua) sai o retangulo da casa;
     *   4. os quatro LUGARES sao a rua diante da porta - onde o primeiro
     *      fantasma ja nasce, como no fliperama - e tres pontos na linha do
     *      meio do miolo: a coluna da porta, a parede da esquerda e a da
     *      direita.
     *
     * Devolve `null` num desenho sem porta nenhuma.
     */
    function acharCasa(mapa) {
      if (!mapa.portas.length) return null;

      var porta = mapa.portas[0], i;
      for (i = 1; i < mapa.portas.length; i++) {
        var p = mapa.portas[i];
        if (p.l < porta.l || (p.l === porta.l && p.c < porta.c)) porta = p;
      }

      var acima = { c: porta.c, l: porta.l - 1 };
      var abaixo = { c: porta.c, l: porta.l + 1 };
      var foraEmCima = livre(mapa, acima.c, acima.l);
      var fora = foraEmCima ? acima : abaixo;
      var dentro = foraEmCima ? abaixo : acima;
      if (!livre(mapa, dentro.c, dentro.l)) return null;

      // Enchendo o miolo: so passa por chao, e a porta nao e chao.
      var vistos = {}, fila = [dentro];
      var c0 = dentro.c, c1 = dentro.c, l0 = dentro.l, l1 = dentro.l;
      vistos[dentro.c + ',' + dentro.l] = true;
      for (i = 0; i < fila.length; i++) {
        var aqui = fila[i];
        if (aqui.c < c0) c0 = aqui.c;
        if (aqui.c > c1) c1 = aqui.c;
        if (aqui.l < l0) l0 = aqui.l;
        if (aqui.l > l1) l1 = aqui.l;
        for (var d = 0; d < DIRECOES.length; d++) {
          var v = VETORES[DIRECOES[d]];
          var nc = aqui.c + v.dc, nl = aqui.l + v.dl;
          if (!livre(mapa, nc, nl)) continue;
          if (vistos[nc + ',' + nl]) continue;
          vistos[nc + ',' + nl] = true;
          fila.push({ c: nc, l: nl });
        }
      }

      var meio = Math.floor((l0 + l1) / 2);
      return {
        porta: porta,
        fora: fora,                    // o quadrado da rua, diante da porta
        dentro: dentro,                // o quadrado do miolo colado na porta
        c0: c0, c1: c1, l0: l0, l1: l1,
        saidaX: centro(porta.c, porta.l).x,   // a coluna por onde eles sobem
        saidaY: centro(fora.c, fora.l).y,     // a linha em que a rua comeca
        voltaY: centro(dentro.c, dentro.l).y, // e a linha em que os olhos param
        lugares: [
          { c: fora.c, l: fora.l },
          { c: porta.c, l: meio },
          { c: c0, l: meio },
          { c: c1, l: meio }
        ]
      };
    }

    /**
     * Le o desenho e devolve o labirinto pronto para o jogo.
     * Nada aqui depende de tela: e so texto virando numeros.
     */
    function ler(grade, opcoes) {
      var op = opcoes || {};
      // Sem dizer nada, um desenho solto vale pelas regras da fase 1.
      var dif = op.dificuldade || DIFICULDADE[0];
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
        chao: [],               // todo quadrado por onde se anda, fora da casa
        indicePastilha: [],     // quadrado -> indice da pastilha dali (-1: nenhuma)
        portas: [],             // os quadrados da porta da casa
        tuneis: [],             // tuneis[linha] = true na linha do tunel
        nascimento: null,       // onde o come-come nasce
        casa: null,             // a casa dos fantasmas (montada la embaixo)
        /* A linha da TABELA DE DIFICULDADE deste labirinto - o quanto o
           feitico dura, a pressa dos fantasmas, os tempos de saida da casa e
           a tabela de ciclos. Ela viaja grudada no mapa de proposito: quem
           joga um labirinto nao precisa lembrar de buscar os ajustes em outro
           canto, e um desenho solto (os testes fazem isso o tempo todo) vale
           pelas regras da fase 1. */
        dificuldade: dif,
        // Quanto tempo a pastilha de poder vale NESTE labirinto: e o que
        // deixa os labirintos 2 e 3 mais dificeis sem uma linha de codigo
        // nova. Vale o da dificuldade, e `poder` troca so por cima (os testes
        // gostam de encurtar o feitico a mao).
        duracaoPoder: op.poder > 0 ? op.poder : (dif.poder || PODER_QUADROS),
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
      mapa.casa = acharCasa(mapa);

      /* A lista de todo quadrado por onde se anda, sem o miolo da casa. E dela
         que o fantasma aleatorio tira o alvo dele (fase 3b): sortear um lugar
         de dentro da casa mandaria o coitado bater na porta a partida inteira,
         ja que de fora ela e parede. */
      for (l = 0; l < mapa.linhas; l++) {
        for (c = 0; c < colunas; c++) {
          if (!livre(mapa, c, l)) continue;
          if (mapa.casa && c >= mapa.casa.c0 && c <= mapa.casa.c1
                        && l >= mapa.casa.l0 && l <= mapa.casa.l1) continue;
          mapa.chao.push({ c: c, l: l });
        }
      }
      return mapa;
    }

    return {
      ler: ler,
      acharCasa: acharCasa,
      letra: letra,
      livre: livre,
      parede: parede,
      vizinho: vizinho,
      podeIr: podeIr,
      pastilhaEm: pastilhaEm,
      saidas: saidas,
      distancias: distancias,
      nascimentos: nascimentos,
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

  // -------------------------------------------------------- Os fantasmas ----
  /* Os quatro moradores da casa do centro. Cada um e um corpo igualzinho ao do
     come-come (mesma grade, mesmo `Movimento.passo`) mais tres coisas: a cor,
     o tempo que ele espera antes de sair e em que ETAPA da vida ele esta:

         'casa'     esperando a vez, balancando no lugar
         'saindo'   andando ate a coluna da porta e subindo por ela
         'livre'    circulando pelo labirinto atras do alvo
         'olhos'    foi comido: so os olhos, correndo de volta para a porta
         'entrando' descendo pela porta ate o miolo, para renascer

     A porta e o unico lugar do desenho que so eles atravessam - e mesmo assim
     so de dentro para fora, na etapa 'saindo', que e uma rota escrita a mao
     (ande ate a coluna da porta, depois suba ate a rua) e nao precisa perguntar
     nada ao mapa. Ja livre na rua, o corpo usa as regras normais do labirinto,
     e por isso a porta vira parede: ninguem volta para casa por vontade
     propria - so comido, virado em olhos, que e o unico caso em que a rota da
     porta e percorrida de tras para a frente.

     Alem da etapa, cada um carrega um HUMOR: `assustado` liga quando a crianca
     morde a pastilha de poder. Assustado ele fica azul, anda em MEIA
     velocidade e, em vez de mirar o alvo, escolhe em cada esquina a saida que
     mais AFASTA do come-come. A meia velocidade e feita andando um quadro sim,
     um nao (o campo `descanso`), e nao com 1px por quadro: com 1px o corpo
     acabaria numa coordenada impar e, quando o feitico passasse e a velocidade
     voltasse a 2, ele nunca mais acertaria o centro de um quadrado - deixaria
     de virar nas esquinas e sairia atravessando parede.

     Na rua a decisao e a do fliperama, e cabe em tres linhas: em cada centro de
     quadrado, olhe as saidas, JOGUE FORA a meia-volta e fique com a que deixa o
     vizinho mais perto do alvo. Empate resolve na ordem cima, esquerda, baixo,
     direita. Repare no que essa regra faz sozinha: num corredor comprido sobra
     uma saida so, entao nao ha escolha nenhuma - e e assim que eles entram no
     tunel e saem do outro lado sem uma linha de codigo a mais.

     O ALVO vem de fora de proposito: aqui dentro ele e so um par de numeros.
     Quem decide para onde cada personalidade olha e o `Personalidades`, e quem
     diz quando eles largam a caca para dispersar e o `Ciclos` - os dois logo
     abaixo. Puro como o resto - `passo()` devolve um estado NOVO -, porque numa
     sala vai ser este mesmo passo, no aparelho do anfitriao, que diz onde os
     quatro estao para todo mundo. */
  var Fantasmas = (function () {

    /* A ordem de desempate do fliperama: entre duas saidas que aproximam o
       mesmo tanto, vence a primeira desta lista. */
    var PREFERENCIA = ['cima', 'esquerda', 'baixo', 'direita'];

    var TIPOS = [
      { chave: 'perseguidor', nome: 'Vermelho', cor: '#ff3c28' },
      { chave: 'emboscador',  nome: 'Rosa',     cor: '#ffb8ff' },
      { chave: 'timido',      nome: 'Azul',     cor: '#28d8f8' },
      { chave: 'aleatorio',   nome: 'Laranja',  cor: '#ffa030' }
    ];

    /* O sobe-e-desce de quem espera na casa: 16 quadros, 4px para cada lado.
       E so enfeite - o quadrado da grade continua sendo o mesmo. */
    var BALANCO = [0, 1, 2, 3, 4, 3, 2, 1, 0, -1, -2, -3, -4, -3, -2, -1];

    /** Distancia (ao quadrado, que basta para comparar) entre dois quadrados. */
    function distancia(c1, l1, c2, l2) {
      var dc = c1 - c2, dl = l1 - l2;
      return dc * dc + dl * dl;
    }

    /**
     * A saida que um fantasma parado no centro de (c, l) escolheria para
     * chegar em `alvo`, vindo na direcao `dir`. Sem meia-volta: e a regra que
     * faz eles patrulharem em vez de ficarem indo e voltando na mesma esquina.
     * Sem alvo, a ordem de preferencia decide sozinha.
     *
     * Com `fugir`, a mesma regra ao contrario: fica a saida que mais AFASTA do
     * alvo. E assim que o fantasma assustado corre do come-come em vez de ir
     * atras dele - a mesma esquina, a mesma conta, o sinal trocado.
     */
    function escolher(mapa, c, l, dir, alvo, fugir) {
      var proibida = oposta(dir);
      var melhor = null, melhorDist = -1, i;

      for (i = 0; i < PREFERENCIA.length; i++) {
        var d = PREFERENCIA[i];
        if (d === proibida) continue;
        if (!Mapa.podeIr(mapa, c, l, d)) continue;
        var v = Mapa.vizinho(mapa, c, l, d);
        var dist = alvo ? distancia(v.c, v.l, alvo.c, alvo.l) : 0;
        var ganhou = fugir ? dist > melhorDist : dist < melhorDist;
        if (melhor === null || ganhou) { melhor = d; melhorDist = dist; }
      }
      if (melhor) return melhor;

      // Beco sem saida (nao existe nenhum nos labirintos do jogo, mas um
      // desenho novo pode trazer um): so resta dar meia-volta.
      return Mapa.podeIr(mapa, c, l, proibida) ? proibida : dir;
    }

    /** O alvo do fantasma `i`: um alvo para cada, ou o mesmo para todos. */
    function alvoDe(alvos, i) {
      if (!alvos) return null;
      return alvos.length === undefined ? alvos : (alvos[i] || null);
    }

    /** Os quatro fantasmas no comeco de uma rodada, cada um no seu lugar. */
    function novoEstado(mapa, opcoes) {
      var op = opcoes || {};
      var saidas = op.saidas || SAIDAS;
      var lugares = (mapa.casa && mapa.casa.lugares) || [];
      var lista = [];

      for (var i = 0; i < TIPOS.length; i++) {
        var lugar = lugares[i] || mapa.nascimento;
        var corpo = Movimento.novoCorpo(lugar.c, lugar.l, i === 0 ? 'esquerda' : 'cima');
        var espera = saidas[i] === undefined ? 0 : saidas[i];
        lista.push({
          indice: i,
          chave: TIPOS[i].chave,
          nome: TIPOS[i].nome,
          cor: TIPOS[i].cor,
          // Quem nao espera nada ja nasce na rua - e o caso do primeiro.
          etapa: espera > 0 ? 'casa' : 'livre',
          espera: espera,
          casaY: corpo.y,
          assustado: false,     // ligado pela pastilha de poder
          descanso: false,      // o quadro parado da meia velocidade do medo
          corpo: corpo
        });
      }
      return { lista: lista, relogio: 0 };
    }

    /**
     * As velocidades de um quadro, a partir do que o jogo pediu. Aceita um
     * numero (o jeito antigo: so a velocidade normal) ou um objeto com
     * `velocidade`, `olhos`, a posicao de quem foge (`fuga`), a `pressa` da
     * fase e o `quadro` em que estamos (e ele que da o compasso da pressa).
     */
    function opcoesDe(opcoes) {
      var op = (typeof opcoes === 'number') ? { velocidade: opcoes } : (opcoes || {});
      return {
        normal: op.velocidade || VEL_FANTASMA,
        olhos: op.olhos || VEL_OLHOS,
        fuga: op.fuga || null,
        pressa: op.pressa || null,      // um numero por fantasma: a pressa da fase
        quadro: op.quadro || 0
      };
    }

    /**
     * Este fantasma anda DUAS vezes neste quadro? E a pressa das fases mais
     * dificeis (a tabela de dificuldade la em cima), e vale so para quem esta
     * solto na rua e sem medo: quem espera na casa, quem sobe a porta e o par
     * de olhos voltando tem cada um o seu compasso proprio.
     *
     * O compasso sai do relogio dos quatro, e nao dos passos de cada um: assim
     * os quatro apressam no mesmo quadro e a conta continua a mesma depois de
     * um tombo, de um susto ou de uma volta para casa.
     */
    function comPressa(f, op) {
      if (f.etapa !== 'livre' || f.assustado) return false;
      var quanto = (op.pressa && op.pressa[f.indice]) || 0;
      return quanto > 0 && (op.quadro % COMPASSO_PRESSA) < quanto;
    }

    /** Um quadro de um fantasma so. Devolve um fantasma NOVO. */
    function passoDeUm(f, mapa, alvo, opcoes) {
      var op = opcoesDe(opcoes);
      var vel = op.normal;
      var corpo = f.corpo;
      var passos = corpo.passos + 1;

      // ------------------------------------------------- esperando a vez ---
      if (f.etapa === 'casa') {
        var espera = f.espera - 1;
        if (espera > 0) {
          return copia(f, {
            espera: espera,
            corpo: junta(corpo, {
              y: f.casaY + BALANCO[passos % BALANCO.length],
              passos: passos
            })
          });
        }
        // Chegou a hora: para de balancar e comeca a rota da porta.
        return copia(f, {
          etapa: 'saindo',
          espera: 0,
          corpo: junta(corpo, {
            y: f.casaY, dir: 'cima', desejada: 'cima', parado: false, passos: passos
          })
        });
      }

      // ----------------------------------------------- abrindo a portinha ---
      /* Rota escrita a mao, e por isso nao pergunta nada ao mapa: primeiro
         acerta a coluna da porta, depois sobe por ela ate a rua. E o unico
         trecho do jogo em que alguem passa por cima de um `-`. */
      if (f.etapa === 'saindo') {
        var casa = mapa.casa;
        var x = corpo.x, y = corpo.y, dir = corpo.dir;

        if (x !== casa.saidaX) {
          var paraDireita = x < casa.saidaX;
          dir = paraDireita ? 'direita' : 'esquerda';
          x += (paraDireita ? 1 : -1) * Math.min(vel, Math.abs(casa.saidaX - x));
        } else if (y !== casa.saidaY) {
          var paraBaixo = y < casa.saidaY;
          dir = paraBaixo ? 'baixo' : 'cima';
          y += (paraBaixo ? 1 : -1) * Math.min(vel, Math.abs(casa.saidaY - y));
        }

        var chegou = (x === casa.saidaX && y === casa.saidaY);
        return copia(f, {
          etapa: chegou ? 'livre' : 'saindo',
          corpo: junta(corpo, {
            x: x, y: y,
            // Na rua ele vira para o lado, como no fliperama.
            dir: chegou ? 'esquerda' : dir,
            desejada: chegou ? 'esquerda' : dir,
            parado: false,
            passos: passos
          })
        });
      }

      // ------------------------------------------- comido, voltando a pe ---
      /* So os olhos, correndo pela grade ate a rua diante da porta. E a mesma
         regra de sempre - a saida que mais aproxima do alvo -, com um alvo
         fixo: a casa. Chegou la, comeca a descer. */
      if (f.etapa === 'olhos') {
        var porta = mapa.casa.fora;
        var co = Mapa.coluna(corpo.x), lo = Mapa.linha(corpo.y);
        var olhando = corpo;

        if (Movimento.noCentro(corpo)) {
          if (co === porta.c && lo === porta.l) {
            return copia(f, {
              etapa: 'entrando',
              corpo: junta(corpo, { parado: false, passos: passos })
            });
          }
          olhando = junta(corpo, { desejada: escolher(mapa, co, lo, corpo.dir, porta) });
        }
        return copia(f, {
          corpo: Movimento.passo(olhando, mapa, { velocidade: op.olhos })
        });
      }

      // ---------------------------------------------- descendo pela porta ---
      /* A rota da saida, de tras para a frente - e o unico jeito de voltar
         para dentro, ja que de fora a porta e parede como qualquer outra.
         Chegando no miolo, ele volta a ser um fantasma esperando a vez: um
         segundinho de espera e a rota da porta o devolve a rua, ja no humor da
         vez (a pastilha que o comeu pode nem estar mais valendo). */
      if (f.etapa === 'entrando') {
        var lar = mapa.casa;
        var ex = corpo.x, ey = corpo.y, edir = corpo.dir;

        if (ex !== lar.saidaX) {
          var pDireita = ex < lar.saidaX;
          edir = pDireita ? 'direita' : 'esquerda';
          ex += (pDireita ? 1 : -1) * Math.min(op.olhos, Math.abs(lar.saidaX - ex));
        } else if (ey !== lar.voltaY) {
          var pBaixo = ey < lar.voltaY;
          edir = pBaixo ? 'baixo' : 'cima';
          ey += (pBaixo ? 1 : -1) * Math.min(op.olhos, Math.abs(lar.voltaY - ey));
        }

        var emCasa = (ex === lar.saidaX && ey === lar.voltaY);
        return copia(f, {
          etapa: emCasa ? 'casa' : 'entrando',
          espera: emCasa ? RENASCER : f.espera,
          casaY: emCasa ? lar.voltaY : f.casaY,
          assustado: false,
          descanso: false,
          corpo: junta(corpo, {
            x: ex, y: ey, dir: edir, desejada: edir, parado: false, passos: passos
          })
        });
      }

      // ------------------------------------------------- solto na cidade ---
      /* Assustado, ele anda um quadro sim, um nao: e a meia velocidade do
         medo, feita sem tirar o corpo da grade de 2px (veja o comentario la em
         cima). No quadro de descanso ele fica exatamente como esta. */
      if (f.assustado && !f.descanso) {
        return copia(f, { descanso: true });
      }

      var novo = corpo;
      if (Movimento.noCentro(corpo)) {
        var c = Mapa.coluna(corpo.x), l = Mapa.linha(corpo.y);
        /* Fugindo, o alvo deixa de ser o que a personalidade queria e passa a
           ser o come-come - de quem ele quer distancia. */
        var mira = f.assustado ? (op.fuga || alvo) : alvo;
        novo = junta(corpo, {
          desejada: escolher(mapa, c, l, corpo.dir, mira, f.assustado)
        });
      }
      return copia(f, {
        descanso: false,
        corpo: Movimento.passo(novo, mapa, { velocidade: vel })
      });
    }

    /** Um quadro dos quatro. `alvos` e um por fantasma, ou um so para todos. */
    function passo(estado, mapa, alvos, opcoes) {
      var op = opcoesDe(opcoes);
      op.quadro = estado.relogio;
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var f = estado.lista[i], alvo = alvoDe(alvos, i);
        var apressado = comPressa(f, op);
        f = passoDeUm(f, mapa, alvo, op);
        // O passo a mais da pressa e o passo inteiro de novo, com a esquina
        // conferida outra vez: e o unico jeito de o corpo continuar caindo nos
        // centros dos quadrados e virando onde deve.
        if (apressado) f = passoDeUm(f, mapa, alvo, op);
        lista.push(f);
      }
      return { lista: lista, relogio: estado.relogio + 1 };
    }

    /** Copia rasa com trocas - o jeito ES5 de "devolver um estado novo". */
    function copia(f, trocas) {
      var novo = {
        indice: f.indice, chave: f.chave, nome: f.nome, cor: f.cor,
        etapa: f.etapa, espera: f.espera, casaY: f.casaY,
        assustado: f.assustado === true, descanso: f.descanso === true,
        corpo: f.corpo
      };
      for (var k in trocas) if (trocas.hasOwnProperty(k)) novo[k] = trocas[k];
      return novo;
    }

    function junta(corpo, trocas) {
      var novo = {
        x: corpo.x, y: corpo.y, dir: corpo.dir, desejada: corpo.desejada,
        parado: corpo.parado, passos: corpo.passos
      };
      for (var k in trocas) if (trocas.hasOwnProperty(k)) novo[k] = trocas[k];
      return novo;
    }

    /**
     * A meia-volta de todo mundo, do jeito do fliperama: quando o ciclo troca
     * (de dispersar para cacar, ou o contrario) os fantasmas que estao na rua
     * dao meia-volta na hora, no meio do corredor mesmo. E o aviso que a
     * crianca ve sem ler nada - "eles mudaram de ideia" - e o que abre a
     * brecha para escapar de um cerco.
     *
     * Quem ainda esta na casa ou subindo a porta fica como esta: a rota de
     * saida e escrita a mao e nao tem meia-volta nenhuma.
     */
    function inverter(estado) {
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var f = estado.lista[i];
        if (f.etapa !== 'livre') { lista.push(f); continue; }
        var volta = oposta(f.corpo.dir);
        lista.push(copia(f, {
          corpo: junta(f.corpo, { dir: volta, desejada: volta, parado: false })
        }));
      }
      return { lista: lista, relogio: estado.relogio };
    }

    /**
     * A crianca mordeu a pastilha de poder: todo mundo fica com medo. Quem
     * esta na rua ainda da meia-volta na hora - e o mesmo susto da troca de
     * ciclo, e o sinal de que agora quem corre atras e ela. Quem ja e so um
     * par de olhos voltando para casa nao se assusta com nada: aquele ja foi
     * comido.
     */
    function assustar(estado) {
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var f = estado.lista[i];
        if (f.etapa === 'olhos' || f.etapa === 'entrando') { lista.push(f); continue; }

        var trocas = { assustado: true, descanso: false };
        if (f.etapa === 'livre') {
          var volta = oposta(f.corpo.dir);
          trocas.corpo = junta(f.corpo, {
            dir: volta, desejada: volta, parado: false
          });
        }
        lista.push(copia(f, trocas));
      }
      return { lista: lista, relogio: estado.relogio };
    }

    /**
     * O feitico passou: todos voltam a ser eles mesmos. Sem meia-volta - eles
     * simplesmente retomam o ciclo em que estavam quando a pastilha foi
     * mordida, como no fliperama.
     */
    function acalmar(estado) {
      var lista = [];
      for (var i = 0; i < estado.lista.length; i++) {
        var f = estado.lista[i];
        lista.push(f.assustado ? copia(f, { assustado: false, descanso: false }) : f);
      }
      return { lista: lista, relogio: estado.relogio };
    }

    /**
     * O fantasma `i` foi comido: vira um par de olhos correndo para casa.
     *
     * O corpo e ENCAIXADO no centro do quadrado em que ele estava. Isso e o que
     * deixa os 4px por quadro dos olhos caindo certinho nos centros seguintes -
     * de uma coordenada qualquer, um passo de 4 pularia por cima deles e o
     * coitado nunca mais viraria numa esquina.
     */
    function comido(estado, i) {
      var lista = estado.lista.slice();
      var f = lista[i];
      if (!f || f.etapa === 'olhos' || f.etapa === 'entrando') return estado;

      var meio = Mapa.centro(Mapa.coluna(f.corpo.x), Mapa.linha(f.corpo.y));
      lista[i] = copia(f, {
        etapa: 'olhos',
        assustado: false,
        descanso: false,
        corpo: junta(f.corpo, { x: meio.x, y: meio.y, parado: false })
      });
      return { lista: lista, relogio: estado.relogio };
    }

    /** Aquele fantasma pode ser comido agora? */
    function comestivel(f) {
      return f.assustado === true && f.etapa !== 'olhos' && f.etapa !== 'entrando';
    }

    /**
     * O fantasma e o come-come estao se encostando? A conta e em pixels (e nao
     * em quadrados) porque os dois andam entre os centros: esperar que os dois
     * caiam no mesmo quadrado deixaria escapar o cruzamento no meio do
     * corredor. Passando o `mapa`, a boca do tunel tambem conta - do outro lado
     * da tela eles estao a um passo, nao a um labirinto de distancia.
     */
    function encostou(f, corpo, mapa) {
      var dx = Math.abs(f.corpo.x - corpo.x);
      if (mapa) dx = Math.min(dx, mapa.largura - dx);
      var dy = Math.abs(f.corpo.y - corpo.y);
      return dx * dx + dy * dy <= RAIO_TOQUE * RAIO_TOQUE;
    }

    /** Todos ja sairam da casa? (o teste e o desenho gostam de saber) */
    function todosNaRua(estado) {
      for (var i = 0; i < estado.lista.length; i++) {
        if (estado.lista[i].etapa !== 'livre') return false;
      }
      return true;
    }

    return {
      novoEstado: novoEstado,
      passo: passo,
      passoDeUm: passoDeUm,
      escolher: escolher,
      distancia: distancia,
      inverter: inverter,
      assustar: assustar,
      acalmar: acalmar,
      comido: comido,
      comestivel: comestivel,
      comPressa: comPressa,
      encostou: encostou,
      todosNaRua: todosNaRua,
      TIPOS: TIPOS,
      SAIDAS: SAIDAS,
      PREFERENCIA: PREFERENCIA,
      BALANCO: BALANCO,
      VELOCIDADE: VEL_FANTASMA,
      VELOCIDADE_OLHOS: VEL_OLHOS,
      RENASCER: RENASCER,
      RAIO_TOQUE: RAIO_TOQUE
    };
  }());

  // ---------------------------------------------------------- O sorteio ----
  /* Um sorteador de bolso, e nao o `Math.random()`: o fantasma aleatorio
     precisa sortear IGUAL nos cinco aparelhos de uma sala, e para isso o
     sorteio tem que sair de um numero combinado - a SEMENTE que a Central manda
     no comeco da partida.

     E o gerador linear de sempre (o dos livros: `x = a*x + c`, tudo modulo
     2^32). Ele nao serve para criptografia nenhuma, e nem precisa: serve para
     dois aparelhos tirarem a mesma sequencia de numeros a partir do mesmo
     ponto de partida, que e exatamente o pedido. As contas cabem folgadas nos
     inteiros exatos do JavaScript (1664525 x 2^32 ainda esta abaixo de 2^53),
     entao o resultado e o mesmo em qualquer maquina.

     Puro como o resto: quem guarda a semente e o estado que passa por aqui. */
  var Sorteio = (function () {
    var A = 1664525, C = 1013904223, M = 4294967296;   // 2^32

    /** Qualquer numero virando uma semente valida (inteiro dentro de 0..2^32). */
    function semear(semente) {
      var n = Math.floor(Math.abs(Number(semente)));
      return isFinite(n) ? n % M : 1;
    }

    /** A proxima semente da sequencia. */
    function proximo(semente) { return (A * semear(semente) + C) % M; }

    /** A semente virando um numero de 0 (inclusive) a 1 (exclusive). */
    function valor(semente) { return semear(semente) / M; }

    /** Um inteiro sorteado de 0 a n-1. */
    function ate(semente, n) {
      return n > 0 ? Math.floor(valor(semente) * n) % n : 0;
    }

    /** Pular `vezes` sorteios de uma vez (os testes gostam). */
    function avancar(semente, vezes) {
      var s = semear(semente);
      for (var i = 0; i < vezes; i++) s = proximo(s);
      return s;
    }

    return {
      semear: semear, proximo: proximo, valor: valor, ate: ate, avancar: avancar
    };
  }());

  // ------------------------------------------------ Dispersar e cacar -------
  /* O relogio dos humores. O jogo nao e uma cacada sem fim: ele alterna entre
     DISPERSAR (cada fantasma vai dar uma volta pelo canto dele) e CACAR (os
     quatro miram o come-come), na tabela do fliperama - sete segundos de
     respiro, vinte de perigo, e assim por diante, ate a caca virar permanente
     no fim.

     Um estado de tres numeros: em que linha da tabela estamos, ha quantos
     quadros, e o humor que sai disso. `passo()` e puro e devolve, junto, o
     aviso de que a linha VIROU - e desse aviso que sai a meia-volta de todos
     (`Fantasmas.inverter`), o sinal mais visivel do jogo. */
  var Ciclos = (function () {

    /* A tabela da vez: a que o jogo mandou (`tabela`), a do labirinto em jogo
       (`ciclos`, que e como a tabela de dificuldade chama a coluna dela) ou,
       sem nenhuma das duas, a do labirinto 1. */
    function tabelaDe(opcoes) {
      var tabela = opcoes && (opcoes.tabela || opcoes.ciclos);
      return tabela && tabela.length ? tabela : CICLOS;
    }

    /** O comeco da rodada: a primeira linha da tabela, do quadro zero. */
    function novoEstado(opcoes) {
      var tabela = tabelaDe(opcoes);
      return { etapa: 0, relogio: 0, modo: tabela[0].modo, trocou: false };
    }

    /**
     * Um quadro do relogio. Devolve um estado NOVO, com `trocou: true` no
     * exato quadro em que a linha da tabela muda. A ultima linha tem
     * `quadros: -1` e nao acaba nunca: dali em diante e caca ate o fim.
     */
    function passo(estado, opcoes) {
      var tabela = tabelaDe(opcoes);
      var etapa = estado.etapa, relogio = estado.relogio + 1, trocou = false;
      var linha = tabela[etapa] || tabela[tabela.length - 1];

      if (linha.quadros >= 0 && relogio >= linha.quadros && etapa + 1 < tabela.length) {
        etapa++;
        relogio = 0;
        trocou = true;
      }
      return {
        etapa: etapa,
        relogio: relogio,
        modo: tabela[etapa].modo,
        trocou: trocou
      };
    }

    /** Quantos quadros faltam para a proxima troca (-1 = nao troca mais). */
    function faltam(estado, opcoes) {
      var linha = tabelaDe(opcoes)[estado.etapa];
      return linha.quadros < 0 ? -1 : linha.quadros - estado.relogio;
    }

    return {
      novoEstado: novoEstado,
      passo: passo,
      faltam: faltam,
      tabelaDe: tabelaDe,
      TABELA: CICLOS
    };
  }());

  // ------------------------------------------------- As personalidades ------
  /* Aqui mora a diferenca entre os quatro. O `Fantasmas` sabe ANDAR ate um
     alvo; quem diz qual e o alvo de cada um, a cada quadro, e este modulo:

       perseguidor (vermelho)  mira o quadrado em que o come-come esta. E o
                               caçador puro: se voce parar, ele chega.
       emboscador  (rosa)      mira quatro quadrados A FRENTE do come-come, na
                               direcao em que ele anda - por isso ele parece
                               sempre aparecer pela esquina de la.
       timido      (azul)      alterna conforme a DISTANCIA: de longe (mais de
                               oito quadrados) ele caca junto com os outros; de
                               perto, se acanha e volta para o canto dele. E o
                               que faz o cerco quase se fechar e afrouxar.
       aleatorio   (laranja)   sorteia um lugar do labirinto de meio em meio
                               segundo e vai la. Usa a SEMENTE, e nao o
                               `Math.random()`: numa sala os cinco aparelhos
                               precisam ve-lo andar igual.

     Na DISPERSAO ninguem mira o come-come: cada um vai para o seu canto, e
     como o canto fica fora do labirinto ele nunca chega - fica dando voltas
     pelo quadrante dele, que e o respiro que a crianca usa para comer em paz.

     Estado de tres campos (a semente, o alvo sorteado e quanto falta para
     sortear outro) e `passo()` puro, como todo o resto: numa sala e o
     anfitriao que roda isto. */
  var Personalidades = (function () {

    /* O canto de cada um, um por quadrante. Numero negativo conta da outra
       beirada: `-2` e "a segunda coluna de tras para a frente". Os cantos ficam
       de proposito na borda do desenho, onde e parede: fantasma nenhum chega
       la, e e isso que faz ele circular pelo quadrante em vez de estacionar. */
    var CANTOS = {
      perseguidor: { c: -2, l:  0 },    // canto de cima, a direita
      emboscador:  { c:  1, l:  0 },    // canto de cima, a esquerda
      timido:      { c: -1, l: -1 },    // canto de baixo, a direita
      aleatorio:   { c:  0, l: -1 }     // canto de baixo, a esquerda
    };

    /** O canto de dispersao daquela personalidade, neste labirinto. */
    function cantoDe(mapa, chave) {
      var canto = CANTOS[chave] || CANTOS.perseguidor;
      return {
        c: canto.c < 0 ? mapa.colunas + canto.c : canto.c,
        l: canto.l < 0 ? mapa.linhas + canto.l : canto.l
      };
    }

    /** O comeco da rodada, com a semente combinada (a da sala, quando houver). */
    function novoEstado(semente) {
      return {
        semente: Sorteio.semear(semente === undefined ? SEMENTE_PADRAO : semente),
        espera: 0,        // quadros ate o proximo sorteio
        sorteado: null    // o lugar que o laranja esta procurando agora
      };
    }

    /** Um quadro do sorteio do laranja: so tira um lugar novo quando da a hora. */
    function sortear(estado, mapa) {
      if (estado.sorteado && estado.espera > 0) {
        return {
          semente: estado.semente,
          espera: estado.espera - 1,
          sorteado: estado.sorteado
        };
      }
      var semente = Sorteio.proximo(estado.semente);
      var chao = mapa.chao && mapa.chao.length ? mapa.chao : [{ c: 0, l: 0 }];
      var lugar = chao[Sorteio.ate(semente, chao.length)];
      return {
        semente: semente,
        espera: TROCA_SORTEIO,
        sorteado: { c: lugar.c, l: lugar.l }
      };
    }

    /**
     * O alvo de uma personalidade, montado a mao. `dados` traz:
     *   mapa      o labirinto (e dele que saem os cantos)
     *   modo      'dispersar' ou 'cacar'
     *   come      { c, l, dir } - onde o come-come esta e para onde vai
     *   fantasma  { c, l } - onde ESTE fantasma esta (so o timido usa)
     *   sorteado  { c, l } - o lugar da vez (so o laranja usa)
     */
    function alvoDe(chave, dados) {
      var mapa = dados.mapa;
      if (dados.modo === 'dispersar') return cantoDe(mapa, chave);

      var come = dados.come || { c: 0, l: 0, dir: 'esquerda' };
      var aqui = { c: come.c, l: come.l };

      if (chave === 'emboscador') {
        var v = VETORES[come.dir] || VETORES.esquerda;
        return {
          c: come.c + v.dc * PASSOS_A_FRENTE,
          l: come.l + v.dl * PASSOS_A_FRENTE
        };
      }

      if (chave === 'timido') {
        var f = dados.fantasma || aqui;
        var longe = Fantasmas.distancia(f.c, f.l, come.c, come.l)
                  > DISTANCIA_TIMIDO * DISTANCIA_TIMIDO;
        return longe ? aqui : cantoDe(mapa, chave);
      }

      if (chave === 'aleatorio') return dados.sorteado || aqui;

      return aqui;   // o perseguidor, e qualquer chave que ninguem conheca
    }

    /**
     * Um quadro: sorteia (se der a hora) e devolve o alvo de cada fantasma, na
     * ordem da lista. Sai `{ estado, alvos }` - o `alvos` vai direto para o
     * `Fantasmas.passo()`.
     */
    function passo(estado, fantasmas, mapa, contexto) {
      var ctx = contexto || {};
      var novo = sortear(estado, mapa);
      var modo = ctx.modo || 'cacar';
      var alvos = [];

      for (var i = 0; i < fantasmas.lista.length; i++) {
        var f = fantasmas.lista[i];
        alvos.push(alvoDe(f.chave, {
          mapa: mapa,
          modo: modo,
          come: ctx.come,
          fantasma: { c: Mapa.coluna(f.corpo.x), l: Mapa.linha(f.corpo.y) },
          sorteado: novo.sorteado
        }));
      }
      return { estado: novo, alvos: alvos };
    }

    return {
      novoEstado: novoEstado,
      passo: passo,
      sortear: sortear,
      alvoDe: alvoDe,
      cantoDe: cantoDe,
      CANTOS: CANTOS,
      PASSOS_A_FRENTE: PASSOS_A_FRENTE,
      DISTANCIA_TIMIDO: DISTANCIA_TIMIDO,
      TROCA_SORTEIO: TROCA_SORTEIO
    };
  }());

  // ------------------------------------------------------------- O poder ----
  /* O cronometro da pastilha de poder - o modulo que vira o jogo do avesso.
     Um estado de quatro numeros:

         { ativo: true,      // o feitico esta valendo?
           restam: 480,      // quantos quadros ainda faltam
           duracao: 480,     // quantos ele tinha quando comecou
           comidos: 0 }      // fantasmas comidos DENTRO desta pastilha

     Tres coisas moram aqui, e nenhuma delas precisa de tela:

       1. QUANTO DURA. Nao e um numero solto: sai do labirinto
          (`mapa.duracaoPoder`), e por isso os labirintos 2 e 3 vao poder
          encurtar o feitico so mudando o desenho deles.
       2. O AVISO. Nos ultimos dois segundos `piscando()` alterna entre ligado
          e desligado a cada dez quadros: e o que faz o fantasma piscar entre o
          azul e o branco, avisando a crianca para largar a caca e correr.
       3. A ESCADA. 200 no primeiro fantasma, 400 no segundo, 800 no terceiro e
          1600 no quarto - e cada pastilha nova recomeca do 200. Comer os
          quatro numa pastilha so vale 3000 pontos.

     Puro como todo o resto: `passo()` devolve um estado NOVO e avisa, junto,
     no exato quadro em que o feitico acaba - e desse aviso que sai o
     `Fantasmas.acalmar`. */
  var Poder = (function () {

    /** Quanto o feitico dura neste labirinto (em quadros). */
    function duracaoDe(mapa) {
      var d = mapa && mapa.duracaoPoder;
      return (typeof d === 'number' && d > 0) ? d : PODER_QUADROS;
    }

    /** O comeco da rodada: nenhum feitico valendo. */
    function novoEstado() {
      return { ativo: false, restam: 0, duracao: 0, comidos: 0 };
    }

    /**
     * A crianca mordeu uma pastilha de poder. O relogio comeca do zero mesmo
     * que o feitico anterior ainda estivesse valendo - e a escada tambem: a
     * segunda pastilha vale 200 de novo no primeiro fantasma.
     */
    function ligar(estado, mapa) {
      var d = duracaoDe(mapa);
      return { ativo: true, restam: d, duracao: d, comidos: 0 };
    }

    /**
     * Um quadro do cronometro. Devolve `{ estado, acabou }`, com `acabou` no
     * exato quadro em que o feitico termina.
     */
    function passo(estado) {
      if (!estado.ativo) return { estado: estado, acabou: false };

      var restam = estado.restam - 1;
      if (restam > 0) {
        return {
          estado: {
            ativo: true, restam: restam,
            duracao: estado.duracao, comidos: estado.comidos
          },
          acabou: false
        };
      }
      return {
        estado: {
          ativo: false, restam: 0,
          duracao: estado.duracao, comidos: estado.comidos
        },
        acabou: true
      };
    }

    /** Estamos na reta final do feitico? (e quando o aviso comeca) */
    function avisando(estado) {
      return estado.ativo === true && estado.restam <= AVISO_PODER;
    }

    /** O aviso esta ACESO neste quadro? (o branco do piscar) */
    function piscando(estado) {
      return avisando(estado)
          && (estado.restam % PISCA_PODER) < (PISCA_PODER / 2);
    }

    /** Quanto vale o proximo fantasma comido nesta pastilha. */
    function proximoPremio(estado) {
      var i = estado.comidos;
      return PREMIOS[i < PREMIOS.length ? i : PREMIOS.length - 1];
    }

    /**
     * Mais um fantasma comido: sobe um degrau da escada e devolve quanto ele
     * valeu. Sem feitico valendo nao ha premio nenhum - fantasma que nao esta
     * assustado nao se come.
     */
    function comer(estado) {
      if (!estado.ativo) return { estado: estado, pontos: 0 };
      return {
        estado: {
          ativo: true, restam: estado.restam,
          duracao: estado.duracao, comidos: estado.comidos + 1
        },
        pontos: proximoPremio(estado)
      };
    }

    return {
      novoEstado: novoEstado,
      duracaoDe: duracaoDe,
      ligar: ligar,
      passo: passo,
      avisando: avisando,
      piscando: piscando,
      proximoPremio: proximoPremio,
      comer: comer,
      PREMIOS: PREMIOS,
      QUADROS: PODER_QUADROS,
      AVISO: AVISO_PODER,
      PISCA: PISCA_PODER
    };
  }());

  // ------------------------------------------------------------ A rodada ----
  /* O outro lado da mordida: ate aqui os quatro eram enfeite perigoso: davam
     susto, mas nao machucavam. Agora encostar num CACADOR custa uma vida.

     Uma RODADA e o pedaco de partida que vai de um nascimento ate o tombo
     seguinte. O estado dela cabe em quatro campos:

         { vidas: 3,        // quantos come-comes ainda restam
           pausa: 0,        // quadros de mundo parado depois do tombo
           pego: -1,        // quem pegou (para o desenho e, la na frente, o som)
           acabou: false }  // as vidas acabaram: a partida solo terminou

     Tres regras, e so:

       1. QUEM MACHUCA. Fantasma assustado nunca: aquele se come, e vale a
          escada da fase 4. Um par de olhos voltando para casa, muito menos.
          Machuca o resto - e por isso `cacador()` e o espelho exato do
          `Fantasmas.comestivel()`.
       2. UMA VIDA POR RODADA. Com a pausa correndo, encostar de novo nao tira
          nada. Sem isso o cerco dos quatro custaria as tres vidas de uma vez,
          no mesmo quadro.
       3. O QUE VOLTA. `reiniciar()` devolve todo mundo ao comeco: o come-come
          no nascimento, os quatro na casa com os tempos de saida de sempre, o
          relogio dos humores do zero e nenhum feitico valendo. As PASTILHAS
          ficam de fora de proposito - o que a crianca ja comeu continua
          comido, senao o tombo apagaria a fase inteira.

     Puro como o resto, e pelo mesmo motivo: numa sala e o anfitriao que roda
     isto, e o convidado so recebe o resultado. */
  var Rodada = (function () {

    /** Aquele fantasma machuca quem encostar nele agora? */
    function cacador(f) {
      return f.assustado !== true && f.etapa !== 'olhos' && f.etapa !== 'entrando';
    }

    /** O comeco de uma partida: as vidas cheias e ninguem pego. */
    function novoEstado(vidas) {
      var n = (typeof vidas === 'number' && vidas > 0) ? Math.floor(vidas) : VIDAS_INICIAIS;
      return { vidas: n, pausa: 0, pego: -1, acabou: false };
    }

    /**
     * Qual fantasma pegou o come-come neste quadro - ou -1, que e o caso de
     * quase todos eles. A conta de encostar e a mesma da fase 4 (em pixels, e
     * com o tunel no meio), so que agora do lado de quem caca.
     */
    function pegou(fantasmas, corpo, mapa) {
      var lista = (fantasmas && fantasmas.lista) || [];
      for (var i = 0; i < lista.length; i++) {
        if (!cacador(lista[i])) continue;
        if (Fantasmas.encostou(lista[i], corpo, mapa)) return i;
      }
      return -1;
    }

    /** Quantos quadros a pausa do tombo dura (o labirinto pode ter o seu). */
    function pausaDe(opcoes) {
      var p = opcoes && opcoes.pausa;
      return (typeof p === 'number' && p > 0) ? p : PAUSA_TOMBO;
    }

    /**
     * O tombo. Devolve `{ estado, perdeu, acabou }`, com `perdeu` so no quadro
     * em que a vida realmente foi embora: com a pausa ja correndo (ou com a
     * partida acabada) nada acontece - e a regra 2 la de cima.
     */
    function perder(estado, quem, opcoes) {
      if (estado.pausa > 0 || estado.acabou) {
        return { estado: estado, perdeu: false, acabou: estado.acabou };
      }
      var vidas = estado.vidas - 1;
      if (vidas < 0) vidas = 0;
      return {
        estado: {
          vidas: vidas,
          pausa: pausaDe(opcoes),
          pego: (typeof quem === 'number' && quem >= 0) ? quem : -1,
          acabou: vidas === 0
        },
        perdeu: true,
        acabou: vidas === 0
      };
    }

    /**
     * Um quadro da pausa. `voltou` cai no exato quadro em que ela termina e
     * todo mundo volta para o lugar; se as vidas acabaram vem `acabou` no
     * lugar dele - e dali sobe a tela de fim de jogo.
     */
    function passo(estado) {
      if (estado.pausa <= 0) return { estado: estado, voltou: false, acabou: false };

      var pausa = estado.pausa - 1;
      return {
        estado: {
          vidas: estado.vidas,
          pausa: pausa,
          pego: pausa > 0 ? estado.pego : -1,
          acabou: estado.acabou
        },
        voltou: pausa === 0 && !estado.acabou,
        acabou: pausa === 0 && estado.acabou
      };
    }

    /** O mundo esta parado agora? (e o que congela tudo durante o tombo) */
    function parado(estado) { return estado.pausa > 0; }

    /**
     * Quanto da pausa ja passou, de 0 (o susto) a 1 (a hora de voltar). E daqui
     * que sai o sumico do come-come na tela - o unico uso desta conta.
     */
    function fatia(estado, opcoes) {
      var total = pausaDe(opcoes);
      if (estado.pausa <= 0) return 1;
      return (total - estado.pausa) / total;
    }

    /**
     * Todo mundo de volta ao comeco da rodada. As pastilhas nao aparecem aqui
     * de proposito (regra 3), e o sorteio do laranja tambem nao: a semente
     * segue de onde estava, que numa sala e o unico jeito de os cinco
     * aparelhos continuarem vendo o mesmo filme.
     */
    function reiniciar(mapa, opcoes) {
      return {
        come: Movimento.novoCorpo(mapa.nascimento.c, mapa.nascimento.l),
        fantasmas: Fantasmas.novoEstado(mapa, opcoes),
        ciclo: Ciclos.novoEstado(opcoes),
        poder: Poder.novoEstado()
      };
    }

    return {
      novoEstado: novoEstado,
      cacador: cacador,
      pegou: pegou,
      perder: perder,
      passo: passo,
      parado: parado,
      fatia: fatia,
      reiniciar: reiniciar,
      VIDAS: VIDAS_INICIAIS,
      PAUSA: PAUSA_TOMBO
    };
  }());

  // ------------------------------------------------------------ A corrida ---
  /* O caderninho da partida solo: os tres labirintos sao UMA corrida so, e e
     aqui que ela e anotada.

       { fase: 2,          // qual labirinto vem agora
         fases: [ … ],     // uma linha por labirinto ja limpo
         total: 2940,      // a soma de todas as linhas
         terminada: false} // o terceiro labirinto ja foi limpo?

     Cada linha guarda o que o labirinto rendeu:

         { numero: 1, pontos: 2440, bonus: 500, total: 2940 }

     `pontos` sao as pastilhas e os fantasmas daquele labirinto (o mesmo numero
     que estava no HUD na hora em que a ultima pastilha sumiu) e `bonus` e o
     premio fixo por limpar. O modulo e puro como o resto - `concluir()`
     devolve um estado NOVO - e a regra de ouro mora aqui: a corrida so anda
     para a FRENTE, e para na terceira. */
  var Corrida = (function () {

    /** O comeco de tudo: labirinto 1, caderno em branco. */
    function novoEstado() {
      return { fase: 1, fases: [], total: 0, terminada: false };
    }

    /**
     * Fecha o labirinto `numero` com os `pontos` que ele rendeu e abre o
     * seguinte. No terceiro nao ha seguinte: a corrida termina, e a tela de
     * Parabens monta o resumo com `fases` e `total`.
     */
    function concluir(estado, numero, pontos) {
      var linha = {
        numero: numero,
        pontos: pontos,
        bonus: PONTOS_LIMPOU,
        total: pontos + PONTOS_LIMPOU
      };
      var ultima = numero >= TOTAL_FASES;
      return {
        // Nunca para tras: ou anda um labirinto, ou para no ultimo.
        fase: ultima ? TOTAL_FASES : numero + 1,
        fases: estado.fases.concat([linha]),
        total: estado.total + linha.total,
        terminada: ultima
      };
    }

    return {
      novoEstado: novoEstado,
      concluir: concluir,
      PONTOS_LIMPOU: PONTOS_LIMPOU,
      TOTAL_FASES: TOTAL_FASES
    };
  }());

  // ------------------------------------------------ A previsao do convidado -
  /* O convidado nao pode esperar o pacote do anfitriao para sair do lugar: com
     o vai-e-volta da rede a esquina so dobraria alguns quadros depois do dedo,
     e num labirinto isso e a diferenca entre virar e bater na parede. Entao
     ele ADIVINHA - roda a mesma `Movimento.passo()` da fase 1 no proprio
     corpo, com a direcao que ele acabou de pedir, e vai andando.

     Adivinhar erra: o retrato que chega foi tirado ha alguns quadros e o
     anfitriao pode ter dobrado (ou deixado de dobrar) uma esquina que este
     aparelho ja contou de outro jeito. Por isso, quando o pacote chega, a
     posicao adivinhada e puxada para a oficial:

         erro de ate 90px, no MESMO corredor  ->  anda 25% do caminho, e o
                               resto vem nos retratos seguintes: ninguem ve
                               teleporte nenhum
         erro maior, ou em outro corredor     ->  encaixa de uma vez

     Os 25% e os 90px sao os numeros da regra 4.1.2 do AGENTS.md. O "mesmo
     corredor" e o que o labirinto acrescenta a eles, e por dois motivos:

       1. NAO EXISTE MEIO CAMINHO ENTRE DOIS CORREDORES. Puxar o come-come 25%
          na diagonal o poria dentro da parede que separa um do outro. Quando
          o anfitriao dobrou uma esquina que a previsao daqui nao dobrou (ou o
          contrario), o unico ajuste honesto e o encaixe seco - e ele e
          pequeno, porque a distancia entre duas esquinas vizinhas e curta.
       2. A GRADE TEM QUE CONTINUAR HONESTA. O movimento decide virar nos
          CENTROS dos quadrados, e so chega neles porque anda de 2 em 2 pixels
          a partir de um centro. Uma correcao de 1,5px tiraria o corpo desse
          trilho para sempre: ele nunca mais acertaria um centro, e nunca mais
          viraria uma esquina. Por isso a correcao anda em passos INTEIROS de
          2px, e so no eixo em que o corpo esta indo - o eixo de travessia nao
          e uma dimensao livre num labirinto, e o corredor.

     O que a correcao NAO desfaz e a idade do retrato: quando o pacote chega,
     ele conta onde o come-come estava ha alguns quadros, e por isso a previsao
     acaba assentando um tiquinho atras do anfitriao - tantos pixels quanto a
     rede demorar. Na rede de casa, que e onde este jogo roda, e um ou dois
     pixels; e o preco de nao ter que carregar historico nenhum, e ele e barato
     perto do que se ganha: a esquina dobra no quadro do dedo.

     Como todo o resto por aqui, `corrigir()` e funcao pura: nao mexe nos
     corpos que recebe. */
  var Previsao = (function () {

    var CORRECAO = 0.25;       // quanto do erro some a cada retrato
    var ERRO_SNAP = 90;        // acima disto nao da para disfarcar: encaixa
    var GRADE = VEL_COME;      // o passo da grade - a correcao anda de 2 em 2

    /* A diferenca entre dois x, com a volta do tunel ja feita: quem acabou de
       sair por uma ponta esta a dois passos de quem ainda nao saiu pela outra,
       e nao a um labirinto inteiro de distancia. */
    function diferenca(a, b, largura) {
      var d = a - b;
      if (!largura) return d;
      if (d > largura / 2) d -= largura;
      else if (d < -largura / 2) d += largura;
      return d;
    }

    /** A distancia entre a posicao adivinhada e a oficial, em pixels. */
    function erroEntre(local, oficial, largura) {
      var dx = diferenca(oficial.x, local.x, largura);
      var dy = oficial.y - local.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Os dois corpos estao no mesmo pedaco reto de corredor? Sao duas
     * perguntas: a diferenca esta toda no eixo em que o corpo anda (senao sao
     * corredores que se cruzam) e todo quadrado entre um e o outro e chao
     * (senao ha parede no meio, e o caminho de la ate aqui deu a volta).
     */
    function mesmoTrilho(local, mapa, dx, dy) {
      var v = VETORES[local.dir] || VETORES.esquerda;
      var deitado = v.dl === 0;
      if (deitado ? dy !== 0 : dx !== 0) return false;

      var l = Mapa.linha(local.y), c = Mapa.coluna(local.x);
      var quantos = Math.ceil((deitado ? Math.abs(dx) : Math.abs(dy)) / TILE);
      var passo = (deitado ? dx : dy) > 0 ? 1 : -1;

      for (var i = 0; i <= quantos; i++) {
        var cc = deitado ? c + passo * i : c;
        var ll = deitado ? l : l + passo * i;
        // Na linha do tunel, o quadrado depois da ponta e o da outra ponta.
        if (mapa.tuneis[ll]) cc = ((cc % mapa.colunas) + mapa.colunas) % mapa.colunas;
        if (!Mapa.livre(mapa, cc, ll)) return false;
      }
      return true;
    }

    /* O corpo de casa em outro lugar. A direcao, o pedido guardado e o relogio
       da boca continuam sendo os que este aparelho adivinhou: e dai que vem a
       resposta instantanea do controle. */
    function em(corpo, x, y, largura) {
      var nx = x;
      if (largura) {
        if (nx < 0) nx += largura;
        else if (nx >= largura) nx -= largura;
      }
      return {
        x: nx, y: y,
        dir: corpo.dir,
        desejada: corpo.desejada,
        parado: corpo.parado,
        passos: corpo.passos
      };
    }

    /* O encaixe seco: vale o corpo do anfitriao, porque um erro desse tamanho
       quer dizer que os dois contaram historias diferentes. Duas coisas ficam
       sendo as de casa: o pedido de direcao (quem manda nele e o dedo que esta
       na tecla AGORA, e nao o que o anfitriao sabia ha alguns quadros) e o
       relogio da boca, que e enfeite e nunca deve dar um tranco. */
    function encaixar(local, oficial) {
      return {
        x: oficial.x, y: oficial.y,
        dir: oficial.dir,
        desejada: local ? local.desejada : oficial.desejada,
        parado: oficial.parado,
        passos: local ? local.passos : oficial.passos
      };
    }

    /** Um quarto do caminho, arredondado para passos inteiros da grade. */
    function quarto(d) { return Math.round(d * CORRECAO / GRADE) * GRADE; }

    /**
     * Junta a posicao adivinhada com a que o anfitriao mandou. Devolve
     * `{ corpo, erro, snap }`, com `snap` em `true` quando nao havia meio
     * caminho e o corpo foi encaixado de uma vez so.
     */
    function corrigir(local, oficial, mapa) {
      var largura = mapa && mapa.largura;
      if (!local) return { corpo: encaixar(null, oficial), erro: 0, snap: true };

      var dx = diferenca(oficial.x, local.x, largura);
      var dy = oficial.y - local.y;
      var erro = Math.sqrt(dx * dx + dy * dy);
      if (erro === 0) return { corpo: local, erro: 0, snap: false };

      if (erro > ERRO_SNAP || !mapa || !mesmoTrilho(local, mapa, dx, dy)) {
        return { corpo: encaixar(local, oficial), erro: erro, snap: true };
      }

      var ax = quarto(dx), ay = quarto(dy);
      /* O quarto do caminho nao chegou a um passo da grade: encosta de vez, em
         vez de arrastar o errinho de dois pixels para sempre. O anfitriao esta
         na grade, entao encostar nele nunca sai do corredor. */
      if (ax === 0 && ay === 0) { ax = dx; ay = dy; }

      return {
        corpo: em(local, local.x + ax, local.y + ay, largura),
        erro: erro, snap: false
      };
    }

    return {
      corrigir: corrigir,
      erroEntre: erroEntre,
      mesmoTrilho: mesmoTrilho,
      medidas: {
        CORRECAO: CORRECAO,
        ERRO_SNAP: ERRO_SNAP,
        GRADE: GRADE
      }
    };
  }());

  // ------------------------------------------------------ O pacote da rede --
  /* Numa sala existe UM labirinto so, e quem roda ele e o anfitriao. Vinte
     vezes por segundo ele manda para todos um retrato desse mundo; este modulo
     e o tradutor dos dois lados - `montar()` faz o retrato, `aplicar()` copia o
     retrato recebido por cima do mundo do convidado.

     O retrato e pequeno de proposito (a plataforma corta em 64 KB e 90
     mensagens por segundo): campos de uma letra e arrays de numeros INTEIROS,
     do jeito que a Galinha Feliz e o Super Adventure fazem.

         { k: 'e',             // "e" de estado (o convidado manda "i")
           n: 173,             // numero de ordem; retrato velho vai para o lixo
           f: 1,               // o labirinto em jogo
           t: 940,             // o relogio do mundo (e o das animacoes)
           q: 0,               // 0 jogando | 1 labirinto limpo | 2 fim de jogo
           j: [[indice, x, y, dir, desejada, boca, pontos], ...],  // as pessoas
           g: [[x, y, dir, etapa, sinais], ...],                   // os quatro
           c: [ ... ],         // as pastilhas ja comidas, em bits
           p: [ativo, restam, duracao, comidos],        // o feitico da bolota
           r: [vidas, pausa, pego, acabou, tombado],    // a rodada
           ev: [[tipo, x, y, indice, valor], ...] }     // a fila de avisos

     Tres coisas merecem nota:

       - `boca` e a posicao do come-come dentro do ciclo de 16 quadros da boca,
         e nao a contagem inteira de passos: um digito em vez de cinco, e o
         desenho fica igualzinho.
       - as pastilhas viajam como BITS - 244 pastilhas cabem em nove numeros -
         e sao o mundo inteiro, nao a diferenca: pacote perdido nao desalinha
         nada, o proximo retrato ja traz tudo de novo.
       - `ev` sao os AVISOS: as mordidas que valem mais que uma pastilha (a
         bolota e o fantasma comido). O convidado nao recebe pixel nenhum de
         efeito - ele refaz a faisca no lugar certo a partir desta fila.

     Tudo aqui e conversao pura: `aplicar()` mexe no mundo que recebe, mas nao
     sabe desenhar nem tocar em tela nenhuma - o que ele devolve e a lista de
     avisos, para quem chamou soltar as faiscas. */
  var Pacote = (function () {

    var BITS = 30;                       // bits por numero (cabe num int de JS)
    var ETAPAS = ['casa', 'saindo', 'livre', 'olhos', 'entrando'];
    var AVISOS = ['poder', 'fantasma'];  // os tipos de aviso, na ordem do numero

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

    /** A direcao virando numero (e -1 quando nao ha direcao nenhuma). */
    function codigoDir(dir) {
      var i = DIRECOES.indexOf(dir);
      return i < 0 ? -1 : i;
    }

    /** O caminho de volta. Numero de fora do baralho vira `null`. */
    function direcaoDe(codigo) {
      return DIRECOES[codigo] || null;
    }

    /** O jogador daquele indice, dentro de uma lista. */
    function porIndice(jogadores, indice) {
      for (var i = 0; i < jogadores.length; i++) {
        if (jogadores[i].indice === indice) return jogadores[i];
      }
      return null;
    }

    /** Uma pessoa em sete numeros. */
    function linhaJogador(j) {
      var c = j.corpo;
      return [
        j.indice | 0, c.x | 0, c.y | 0,
        codigoDir(c.dir), codigoDir(c.desejada),
        c.passos % CICLO_BOCA,
        j.pontos | 0
      ];
    }

    /* O corpo oficial de uma pessoa, lido do retrato. `parado` nao viaja: ele
       so muda o desenho de quem esta encostado numa parede, e o proximo passo
       do anfitriao ja descobre isso de novo. */
    function corpoDaLinha(linha) {
      return {
        x: linha[1], y: linha[2],
        dir: direcaoDe(linha[3]) || 'esquerda',
        desejada: direcaoDe(linha[4]),
        parado: false,
        passos: linha[5] | 0
      };
    }

    /** Um fantasma em cinco numeros (a cor e o nome dele ja sao sabidos). */
    function linhaFantasma(f) {
      return [
        f.corpo.x | 0, f.corpo.y | 0, codigoDir(f.corpo.dir),
        ETAPAS.indexOf(f.etapa),
        (f.assustado ? 1 : 0) | (f.descanso ? 2 : 0)
      ];
    }

    /** O mundo do anfitriao num pacote. `numero` e a ordem do pacote. */
    function montar(estado, numero) {
      var jogadores = [], fantasmas = [], avisos = [], i;

      for (i = 0; i < estado.jogadores.length; i++) {
        jogadores.push(linhaJogador(estado.jogadores[i]));
      }
      for (i = 0; i < estado.fantasmas.lista.length; i++) {
        fantasmas.push(linhaFantasma(estado.fantasmas.lista[i]));
      }
      for (i = 0; i < (estado.avisos || []).length; i++) {
        var a = estado.avisos[i];
        avisos.push([
          AVISOS.indexOf(a.tipo), a.x | 0, a.y | 0, a.indice | 0, a.valor | 0
        ]);
      }

      var comidas = [];
      for (i = 0; i < estado.pastilhas.restam.length; i++) {
        comidas.push(!estado.pastilhas.restam[i]);
      }

      return {
        k: 'e', n: numero | 0,
        f: estado.fase | 0,
        t: estado.relogio | 0,
        q: parada(estado),
        j: jogadores,
        g: fantasmas,
        c: empacotar(comidas),
        p: [
          estado.poder.ativo ? 1 : 0, estado.poder.restam | 0,
          estado.poder.duracao | 0, estado.poder.comidos | 0
        ],
        r: [
          estado.rodada.vidas | 0, estado.rodada.pausa | 0,
          estado.rodada.pego, estado.rodada.acabou ? 1 : 0,
          estado.tombado
        ],
        ev: avisos
      };
    }

    /* O mundo do anfitriao ainda esta andando? 0 = sim; 1 = o labirinto ficou
       limpo; 2 = as vidas acabaram. E com este numero que a tela do convidado
       vira a pagina junto com a dele - ninguem fica olhando um mundo parado
       sem saber por que. */
    function parada(estado) {
      if (estado.tela === 'fim') return 2;
      return estado.tela === 'jogando' ? 0 : 1;
    }

    /** O que o convidado manda de volta: a direcao que ele quer, e so. */
    function entrada(numero, pedido) {
      return { k: 'i', n: numero | 0, d: codigoDir(pedido && pedido.desejada) };
    }

    /** O pacote parece mesmo um retrato do mundo? */
    function ehEstado(d) { return !!d && d.k === 'e' && !!d.j; }

    /** E um pacote de direcao de convidado? */
    function ehEntrada(d) { return !!d && d.k === 'i'; }

    /**
     * Copia o retrato recebido por cima do mundo `alvo` (o `jogo` do
     * convidado) e devolve
     *
     *     { avisos: [ {tipo,x,y,indice,valor}, ... ],   // as faiscas
     *       correcao: { erro, snap } | null }           // o tranco na previsao
     *
     * O que NAO vem no retrato o convidado ja tem: a cor e o nome de cada
     * fantasma, o desenho do labirinto e o lugar de cada pastilha. Por isso os
     * fantasmas sao remendados por cima da lista que ele ja montou, e nao
     * criados do zero.
     *
     * Com `preverLocal` ligado (o convidado, desde a fase 10), o corpo de casa
     * NAO e copiado por cima: ele foi adivinhado aqui e so e puxado para a
     * posicao oficial por `Previsao.corrigir()` - `correcao` conta o tamanho
     * desse tranco. Os outros come-comes sao sempre os do anfitriao.
     */
    function aplicar(d, alvo, mapa, preverLocal) {
      var i, linha, correcao = null;

      for (i = 0; i < d.j.length; i++) {
        linha = d.j[i];
        var j = porIndice(alvo.jogadores, linha[0]);
        if (!j) continue;                     // alguem que ja saiu da sala
        var oficial = corpoDaLinha(linha);
        if (preverLocal && j.local) {
          var ajuste = Previsao.corrigir(j.corpo, oficial, mapa);
          j.corpo = ajuste.corpo;
          correcao = { erro: ajuste.erro, snap: ajuste.snap };
        } else {
          j.corpo = oficial;
        }
        j.pontos = linha[6] | 0;
      }

      var lista = [];
      for (i = 0; i < alvo.fantasmas.lista.length; i++) {
        var f = alvo.fantasmas.lista[i];
        linha = (d.g || [])[i];
        if (!linha) { lista.push(f); continue; }
        lista.push({
          indice: f.indice, chave: f.chave, nome: f.nome, cor: f.cor,
          etapa: ETAPAS[linha[3]] || 'livre',
          espera: f.espera, casaY: f.casaY,
          assustado: (linha[4] & 1) === 1,
          descanso: (linha[4] & 2) === 2,
          corpo: {
            x: linha[0], y: linha[1],
            dir: direcaoDe(linha[2]) || 'esquerda',
            desejada: direcaoDe(linha[2]) || 'esquerda',
            parado: false, passos: f.corpo.passos + 1
          }
        });
      }
      alvo.fantasmas = { lista: lista, relogio: d.t | 0 };

      var comidas = desempacotar(d.c, mapa.totalPastilhas);
      var restam = [], faltam = 0, comeu = 0;
      for (i = 0; i < comidas.length; i++) {
        restam.push(!comidas[i]);
        if (comidas[i]) comeu++; else faltam++;
      }
      alvo.pastilhas = { restam: restam, faltam: faltam, comidas: comeu };

      var p = d.p || [0, 0, 0, 0];
      alvo.poder = {
        ativo: p[0] === 1, restam: p[1] | 0,
        duracao: p[2] | 0, comidos: p[3] | 0
      };

      var r = d.r || [0, 0, -1, 0, -1];
      alvo.rodada = {
        vidas: r[0] | 0, pausa: r[1] | 0,
        pego: typeof r[2] === 'number' ? r[2] : -1,
        acabou: r[3] === 1
      };
      alvo.vidas = alvo.rodada.vidas;
      alvo.tombado = typeof r[4] === 'number' ? r[4] : -1;
      alvo.relogio = d.t | 0;

      var avisos = [];
      for (i = 0; i < (d.ev || []).length; i++) {
        var a = d.ev[i];
        avisos.push({
          tipo: AVISOS[a[0]] || 'poder',
          x: a[1] | 0, y: a[2] | 0, indice: a[3] | 0, valor: a[4] | 0
        });
      }
      return { avisos: avisos, correcao: correcao };
    }

    return {
      montar: montar,
      aplicar: aplicar,
      entrada: entrada,
      ehEstado: ehEstado,
      ehEntrada: ehEntrada,
      porIndice: porIndice,
      codigoDir: codigoDir,
      direcaoDe: direcaoDe,
      empacotar: empacotar,
      desempacotar: desempacotar,
      ETAPAS: ETAPAS,
      AVISOS: AVISOS,
      BITS: BITS
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

  // ------------------------------------------------------- O labirinto 2 ----
  /* O segundo: as ruas do meio ficam mais estreitas e os quarteiroes se
     repetem em blocos pequenos, entao a esquina de fuga esta sempre um passo
     mais longe do que se espera. O tunel desceu para a rua DEBAIXO da casa
     (linha 17), e por isso a volta pelo outro lado da tela passa raspando na
     porta de onde eles saem. As quatro bolotas continuam onde tem de estar:
     nas quatro pontas do labirinto, uma por quadrante. */
  var LABIRINTO_2 = [
    '############################',
    '#..........................#',
    '#.##.####.##.##.##.####.##.#',
    '#o##.####.##.##.##.####.##o#',
    '#.##.####.##.##.##.####.##.#',
    '#......##..........##......#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#.####....##....##....####.#',
    '#.####.##.##.##.##.##.####.#',
    '#.####.##.##.##.##.##.####.#',
    '#.####                ####.#',
    '#.####.## ###--### ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## ######## ##.####.#',
    'T    ..................    T',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#.##......##....##......##.#',
    '#.##.####.##.##.##.####.##.#',
    '#o##.####.##.##.##.####.##o#',
    '#......##.##.P .##.##......#',
    '#.####.##.##.##.##.##.####.#',
    '#.####.##.##.##.##.##.####.#',
    '#.##...##..........##...##.#',
    '#.##.####.##.##.##.####.##.#',
    '#.##.####.##.##.##.####.##.#',
    '#....####..........####....#',
    '############################'
  ];

  // ------------------------------------------------------- O labirinto 3 ----
  /* O ultimo: os quarteiroes de cima viraram blocos grandes, de corredor
     comprido - e corredor comprido e onde quem corre mais alcanca. O tunel
     subiu para a linha 11, a rua que passa BEM na frente da porta da casa:
     escapar por ele e passar na boca do lobo. */
  var LABIRINTO_3 = [
    '############################',
    '#..........................#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#......#####....#####......#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#.####....##....##....####.#',
    '#.####.##.##.##.##.##.####.#',
    '#.####.##.##.##.##.##.####.#',
    'T    ..................    T',
    '#.####.## ###--### ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## #      # ##.####.#',
    '#.####.## ######## ##.####.#',
    '#......##.##....##.##......#',
    '#.####.##.##.##.##.##.####.#',
    '#.####.##.##.##.##.##.####.#',
    '#......##.##....##.##......#',
    '#.##.####.##.##.##.####.##.#',
    '#.##.####.##.##.##.####.##.#',
    '#....####.##.P .##.####....#',
    '#.##.####.##.##.##.####.##.#',
    '#.##.####.##.##.##.####.##.#',
    '#o##......##....##......##o#',
    '#.####.##.##.##.##.##.####.#',
    '#.####.##.##.##.##.##.####.#',
    '#......##..........##......#',
    '############################'
  ];

  /* Os tres labirintos do jogo, na ordem em que sao jogados. O desenho e o
     nome moram aqui; o ajuste fino de cada fase (o feitico, a pressa dos
     quatro, os tempos de saida e os ciclos) vem inteiro da TABELA DE
     DIFICULDADE la de cima - um lugar so para conferir os tres. */
  var LABIRINTOS = [
    { numero: 1, nome: 'Praca Redonda', desenho: LABIRINTO_1, dificuldade: DIFICULDADE[0] },
    { numero: 2, nome: 'Vila Estreita', desenho: LABIRINTO_2, dificuldade: DIFICULDADE[1] },
    { numero: 3, nome: 'Avenida Longa', desenho: LABIRINTO_3, dificuldade: DIFICULDADE[2] }
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
      Fantasmas: Fantasmas,
      Poder: Poder,
      Rodada: Rodada,
      Corrida: Corrida,
      Previsao: Previsao,
      Pacote: Pacote,
      Sorteio: Sorteio,
      Ciclos: Ciclos,
      Personalidades: Personalidades,
      LABIRINTO_1: LABIRINTO_1,
      LABIRINTO_2: LABIRINTO_2,
      LABIRINTO_3: LABIRINTO_3,
      LABIRINTOS: LABIRINTOS,
      DIFICULDADE: DIFICULDADE,
      mapas: mapas,
      labirinto: labirinto,
      mundo: {
        TILE: TILE, COLUNAS: COLUNAS, LINHAS: LINHAS,
        LARGURA: LARGURA, ALTURA: ALTURA,
        PASSO_MS: PASSO_MS, VEL_COME: VEL_COME, VEL_FANTASMA: VEL_FANTASMA,
        VEL_OLHOS: VEL_OLHOS, RENASCER: RENASCER, RAIO_TOQUE: RAIO_TOQUE,
        PAUSA_TOMBO: PAUSA_TOMBO,
        PODER_QUADROS: PODER_QUADROS, AVISO_PODER: AVISO_PODER,
        PISCA_PODER: PISCA_PODER, PREMIOS: PREMIOS,
        SAIDAS: SAIDAS, CICLOS: CICLOS, CICLOS_2: CICLOS_2, CICLOS_3: CICLOS_3,
        COMPASSO_PRESSA: COMPASSO_PRESSA, TROCA_SORTEIO: TROCA_SORTEIO,
        PASSOS_A_FRENTE: PASSOS_A_FRENTE, DISTANCIA_TIMIDO: DISTANCIA_TIMIDO,
        SEMENTE_PADRAO: SEMENTE_PADRAO,
        PONTOS_PASTILHA: PONTOS_PASTILHA, PONTOS_PODER: PONTOS_PODER,
        VIDAS_INICIAIS: VIDAS_INICIAIS, TOTAL_FASES: TOTAL_FASES,
        PONTOS_LIMPOU: PONTOS_LIMPOU,
        CICLO_BOCA: CICLO_BOCA, MAX_AVISOS: MAX_AVISOS
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
  var COR_BRANCO_DO_OLHO = '#ffffff';   // os olhos dos fantasmas
  var COR_PUPILA = '#2020c0';

  /* Numa sala ha um come-come por pessoa no mesmo labirinto, e a crianca
     precisa achar o DELA num relance: a cor sai do `indice` da sala, que e
     igual nos cinco aparelhos. O primeiro e o amarelo de sempre, que e o do
     jogo de um jogador so. (A cor que a Central escolheu para cada um entra no
     desenho na fase 11, junto com o mini-placar.) */
  var CORES_JOGADOR = ['#fcd800', '#ff8adc', '#7cf8a0', '#8ad0ff', '#ffa030'];

  function corDoJogador(j) {
    return CORES_JOGADOR[(j.indice | 0) % CORES_JOGADOR.length] || COR_COME;
  }

  /* O fantasma com medo: azul-marinho de cara boba, e branco no piscar que
     avisa que o feitico esta acabando. A cara (dois olhinhos e a boca em
     ziguezague) sai clara no azul e vermelha no branco - assim a piscada e
     visivel de longe, mesmo num tablet ao sol. */
  var COR_ASSUSTADO = '#2121de';
  var COR_ASSUSTADO_AVISO = '#f8f8f8';
  var COR_CARA_MEDO = '#e0e0f8';
  var COR_CARA_AVISO = '#f02020';

  var BRILHO = 2;                    // a espessura do brilho das paredes
  var PASTILHA_L = 2;                // a pastilha comum e um quadradinho 2x2
  var PODER_MIN = 4, PODER_MAX = 8;  // a de poder pulsa entre 4x4 e 8x8

  // A faisca de um aviso: um quadrado de 16px que encolhe em meio segundo.
  var EFEITO_QUADROS = 30;
  var EFEITO_LADO = TILE;

  /* `ABERTURA_MAX` e a meia boca, em radianos: uns 40 graus para cada lado.
     (O ciclo de 16 quadros da boca mora la em cima, com as medidas do mundo:
     o pacote da rede tambem precisa dele.) */
  var ABERTURA_MAX = 0.7;

  // Onde fica o olho, conforme a direcao: sempre do lado de fora da boca.
  var OLHO = {
    direita:  { dx: -1, dy: -6 },
    esquerda: { dx: -1, dy: -6 },
    cima:     { dx: -6, dy: -1 },
    baixo:    { dx: -6, dy: -1 }
  };

  /* A saia do fantasma, pixel a pixel: 1 e pe, 0 e o vao. Sao duas ondas, as
     duas simetricas, e elas se revezam a cada 8 quadros - e esse revezamento
     que faz o bicho parecer que flutua em vez de deslizar. Escrever a mascara
     a mao (em vez de calcula-la) e o que garante a simetria: um recorte que
     nao fecha nas duas beiradas deixa o fantasma torto.
     `PUPILA` diz para que canto do olho a pupila corre. */
  var SAIA = [
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0]
  ];
  var SAIA_ALTURA = 2, SAIA_CICLO = 8;

  /* A boca do fantasma assustado, pixel a pixel nas mesmas 16 colunas do
     corpo: duas linhas que se alternam formam o ziguezague de dentinhos. Ela
     e escrita a mao pelo mesmo motivo da saia - simetria garantida. */
  var BOCA_MEDO = [
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0]
  ];

  var PUPILA = {
    direita:  { dx: 2, dy: 1 },
    esquerda: { dx: 0, dy: 1 },
    cima:     { dx: 1, dy: 0 },
    baixo:    { dx: 1, dy: 2 }
  };

  var tela = document.getElementById('tela');
  var ctx = tela.getContext('2d');
  if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

  function $(id) { return document.getElementById(id); }

  var el = {
    app: $('app'),
    palco: $('palco'),

    // O HUD: os numeros que a crianca acompanha sem tirar o olho do labirinto.
    hud: $('hud'),
    pontos: $('hud-pontos'),
    vidas: $('hud-vidas'),
    fase: $('hud-fase'),
    faltam: $('hud-faltam'),
    btnPausa: $('btn-pausa'),
    btnTelaCheia: $('btn-tela-cheia'),

    // A sala (fase 8): o codigo de 4 letras no HUD, so nas partidas em grupo,
    // e a tarja de recado do menu (a sala acabou, o anfitriao caiu).
    hudSala: $('hud-sala'),
    hudSalaCodigo: $('hud-sala-codigo'),
    btnAmigos: $('btn-amigos'),
    aviso: $('aviso'),

    // A moldura da fase 7: o menu de entrada, o quadro de pausa e o cartaz
    // com o lembrete dos controles.
    menu: $('tela-menu'),
    campoApelido: $('campo-apelido'),
    btnJogar: $('btn-jogar'),
    controles: $('controles'),
    telaPausa: $('tela-pausa'),
    btnContinuar: $('btn-continuar'),
    btnRecomecar: $('btn-recomecar'),

    // Fim de fase: um labirinto limpo, e o botao que abre o proximo.
    telaFase: $('tela-fase'),
    faseNumero: $('fase-numero'),
    fasePontos: $('fase-pontos'),
    faseBonus: $('fase-bonus'),
    faseProxima: $('fase-proxima'),
    btnProxima: $('btn-proxima'),

    // Fim de jogo: as tres vidas acabaram.
    telaFim: $('tela-fim'),
    fimPontos: $('fim-pontos'),
    fimFase: $('fim-fase'),
    btnFimDeNovo: $('btn-fim-de-novo'),

    // Parabens: os tres labirintos limpos, com o resumo da corrida.
    telaParabens: $('tela-parabens'),
    parabensFases: [$('parabens-fase-1'), $('parabens-fase-2'), $('parabens-fase-3')],
    parabensTotal: $('parabens-total'),
    btnDeNovo: $('btn-de-novo')
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
   * `abertura` vai de 0 (boca fechada, uma bolinha) a 1 (boca escancarada), e
   * `cor` e a do dono do come-come (sem ela, o amarelo de sempre).
   */
  function desenharComeCome(cx, cy, dir, abertura, cor) {
    var raio = TILE / 2;
    var v = VETORES[dir] || VETORES.esquerda;
    var angulo = Math.atan2(v.dl, v.dc);
    var meiaBoca = abertura * ABERTURA_MAX;

    ctx.fillStyle = cor || COR_COME;
    for (var py = -raio; py < raio; py++) {
      /* `null` e nao -1: o comeco de uma faixa pode muito bem ser a coluna -8,
         e um sentinela numerico se confundiria com ela - o que apagaria a
         metade esquerda do bicho inteiro. */
      var inicio = null;
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
        if (dentro && inicio === null) inicio = px;
        if (!dentro && inicio !== null) {
          ctx.fillRect(cx + inicio, cy + py, px - inicio, 1);
          inicio = null;
        }
      }
    }

    var olho = OLHO[dir] || OLHO.esquerda;
    ctx.fillStyle = COR_OLHO;
    ctx.fillRect(cx + olho.dx, cy + olho.dy, 2, 2);
  }

  /**
   * Um fantasma: a cupula de cima rasterizada linha por linha (como o
   * come-come), o corpo reto embaixo e, nas duas ultimas linhas, a saia
   * recortada em quatro pes. Os olhos sao dois quadrados brancos com a pupila
   * correndo para o lado em que ele anda - e o unico jeito de a crianca saber,
   * de longe, para onde o fantasma vai.
   *
   * `onda` (0 ou 1) troca o recorte da saia de lugar. `humor` diz o que
   * desenhar por cima do corpo:
   *
   *     'normal'     a cor dele e os olhos apontando para onde ele vai
   *     'assustado'  o azul do medo e a cara boba (olhinhos e ziguezague)
   *     'aviso'      a mesma cara, no branco do piscar de fim de feitico
   *     'olhos'      so os olhos: foi comido e esta voltando para casa
   */
  function desenharFantasma(cx, cy, cor, dir, onda, humor) {
    // Comido, do fantasma sobram os olhos - e e so o que se pinta.
    if (humor === 'olhos') { desenharOlhos(cx, cy, dir); return; }

    var raio = TILE / 2;
    var saiaAgora = SAIA[onda ? 1 : 0];
    var medo = humor === 'assustado' || humor === 'aviso';
    var px, py;

    ctx.fillStyle = cor;
    for (py = -raio; py < raio; py++) {
      // A cupula: um quarto de circulo em cima, parede reta da metade para
      // baixo. Arredondar aqui e o que da a beirada em degraus dos 8 bits.
      var meia = py < 0 ? Math.round(Math.sqrt(raio * raio - py * py)) : raio;
      var saia = py >= raio - SAIA_ALTURA;

      // `null` e nao -1: a faixa pode comecar na coluna -8 (veja o come-come).
      var inicio = null;
      for (px = -raio; px <= raio; px++) {
        var cheio = px >= -meia && px < meia;
        if (cheio && saia) cheio = saiaAgora[px + raio] === 1;
        if (cheio && inicio === null) inicio = px;
        if (!cheio && inicio !== null) {
          ctx.fillRect(cx + inicio, cy + py, px - inicio, 1);
          inicio = null;
        }
      }
    }

    if (medo) desenharCaraDeMedo(cx, cy, humor === 'aviso');
    else desenharOlhos(cx, cy, dir);
  }

  /** Os dois olhos com a pupila correndo para o lado em que ele anda. */
  function desenharOlhos(cx, cy, dir) {
    var pupila = PUPILA[dir] || PUPILA.esquerda;
    var olhos = [-5, 1];
    for (var i = 0; i < olhos.length; i++) {
      var ox = cx + olhos[i], oy = cy - 4;
      ctx.fillStyle = COR_BRANCO_DO_OLHO;
      ctx.fillRect(ox, oy, 4, 4);
      ctx.fillStyle = COR_PUPILA;
      ctx.fillRect(ox + pupila.dx, oy + pupila.dy, 2, 2);
    }
  }

  /**
   * A cara de quem esta com medo: dois olhinhos parados (ele nao esta mirando
   * nada - esta fugindo) e a boca em ziguezague. `aviso` troca o claro pelo
   * vermelho, que e o que faz a piscada aparecer.
   */
  function desenharCaraDeMedo(cx, cy, aviso) {
    var raio = TILE / 2;
    ctx.fillStyle = aviso ? COR_CARA_AVISO : COR_CARA_MEDO;

    ctx.fillRect(cx - 4, cy - 4, 2, 2);
    ctx.fillRect(cx + 2, cy - 4, 2, 2);

    for (var linha = 0; linha < BOCA_MEDO.length; linha++) {
      var mascara = BOCA_MEDO[linha];
      for (var px = 0; px < mascara.length; px++) {
        if (mascara[px]) ctx.fillRect(cx - raio + px, cy + 1 + linha, 1, 1);
      }
    }
  }

  /**
   * Os quatro no labirinto, com a mesma copia do outro lado que o come-come
   * ganha na boca do tunel.
   */
  function desenharFantasmas(estado, relogio, poder) {
    var onda = Math.floor(relogio / SAIA_CICLO) % 2;
    var meio = TILE / 2;
    for (var i = 0; i < estado.lista.length; i++) {
      var f = estado.lista[i];
      var c = f.corpo;
      var humor = humorDe(f, poder);
      var cor = corDoHumor(f, humor);
      desenharFantasma(c.x, c.y, cor, c.dir, onda, humor);
      if (c.x < meio) desenharFantasma(c.x + labirinto.largura, c.y, cor, c.dir, onda, humor);
      else if (c.x > labirinto.largura - meio) {
        desenharFantasma(c.x - labirinto.largura, c.y, cor, c.dir, onda, humor);
      }
    }
  }

  /** Como este fantasma tem que ser desenhado agora. */
  function humorDe(f, poder) {
    if (f.etapa === 'olhos' || f.etapa === 'entrando') return 'olhos';
    if (!f.assustado) return 'normal';
    return Poder.piscando(poder) ? 'aviso' : 'assustado';
  }

  /** E de que cor. */
  function corDoHumor(f, humor) {
    if (humor === 'assustado') return COR_ASSUSTADO;
    if (humor === 'aviso') return COR_ASSUSTADO_AVISO;
    return f.cor;
  }

  /* O adeus dos fliperamas: pego, o come-come vai abrindo a boca ate nao
     sobrar nada dele. A boca escancarada do jogo normal e `abertura = 1`
     (140 graus); para sumir de vez ela precisa dar a volta inteira, e por isso
     o sumico chega a `PI / ABERTURA_MAX`. Ele acontece nos dois primeiros
     tercos da pausa - o terco final e o labirinto vazio. */
  var SUMICO = 2 / 3;
  var ABERTURA_SUMIU = Math.PI / ABERTURA_MAX;

  /**
   * Um come-come na tela, com a boca no ponto certo do ciclo e a copia do
   * outro lado do tunel quando ele esta atravessando.
   *
   * A copia so entra quando o corpo REALMENTE cruza a borda (o centro dele a
   * menos de meio quadrado da ponta); no resto do labirinto e desenho a toa.
   */
  function desenharUmJogador(j) {
    var come = j.corpo;
    var cor = corDoJogador(j);
    var meio = TILE / 2;
    var ciclo = come.passos % CICLO_BOCA;
    var abertura = ciclo < CICLO_BOCA / 2
      ? ciclo / (CICLO_BOCA / 2)
      : (CICLO_BOCA - ciclo) / (CICLO_BOCA / 2);

    desenharComeCome(come.x, come.y, come.dir, abertura, cor);

    if (come.x < meio) {
      desenharComeCome(come.x + labirinto.largura, come.y, come.dir, abertura, cor);
    } else if (come.x > labirinto.largura - meio) {
      desenharComeCome(come.x - labirinto.largura, come.y, come.dir, abertura, cor);
    }
  }

  /* As faiscas dos avisos: um quadrado que encolhe no lugar em que alguem
     mordeu uma bolota ou comeu um fantasma, na cor de quem fez a jogada. Elas
     sao LOCAIS - no aparelho do convidado quem as solta e a fila de avisos que
     veio no retrato, e nao um pixel mandado pela rede. */
  function desenharEfeitos() {
    for (var i = 0; i < jogo.efeitos.length; i++) {
      var e = jogo.efeitos[i];
      var quanto = e.vida / EFEITO_QUADROS;              // 1 = novinho, 0 = fim
      var lado = Math.max(2, Math.round(EFEITO_LADO * quanto));
      ctx.fillStyle = e.cor;
      ctx.fillRect(e.x - lado / 2, e.y - lado / 2, lado, lado);
    }
  }

  /** A cena inteira, do zero, uma vez por quadro. */
  function desenharCena() {
    ctx.fillStyle = COR_FUNDO;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    desenharParedes(labirinto);
    desenharPastilhas(labirinto, jogo.pastilhas, jogo.relogio);

    if (Rodada.parado(jogo.rodada)) {
      /* No tombo os fantasmas somem da tela na hora, como no fliperama: o que
         a crianca tem que ver e o come-come pego indo embora. Quem foi pego
         viaja no retrato do mundo, entao as tres telas veem o MESMO come-come
         sumindo - e nao cada uma o seu. */
      var pego = Pacote.porIndice(jogo.jogadores, jogo.tombado) || jogo.eu;
      var come = pego.corpo;
      var indo = Rodada.fatia(jogo.rodada) / SUMICO;
      if (indo < 1) {
        desenharComeCome(come.x, come.y, come.dir, indo * ABERTURA_SUMIU,
          corDoJogador(pego));
      }
      return;
    }

    /* Os outros vem antes: o come-come DESTE aparelho fica por cima de todos,
       para a crianca nunca perder o dela de vista num empurra-empurra. */
    for (var i = 0; i < jogo.jogadores.length; i++) {
      if (!jogo.jogadores[i].local) desenharUmJogador(jogo.jogadores[i]);
    }
    desenharUmJogador(jogo.eu);

    // Os fantasmas vem por ultimo: quando um passa por cima do come-come, e
    // ele que aparece - e assim a crianca ve o perigo, nao o contrario.
    desenharFantasmas(jogo.fantasmas, jogo.relogio, jogo.poder);
    desenharEfeitos();
  }

  // -------------------------------------------------------------- O jogo ----
  /* O que a crianca esta pedindo AGORA. Hoje so o teclado escreve aqui; na
     fase 15 a cruzeta e o deslize passam a escrever no mesmo lugar, e nem a
     fisica nem a rede ficam sabendo de onde veio. */
  var entrada = { desejada: null };

  /**
   * Uma pessoa na partida. Sozinho existe uma so, a de casa; numa sala existe
   * uma por aparelho, todas no mesmo labirinto, e a identidade de cada uma e o
   * `indice` que a Central deu (cabe num byte e e igual nos cinco aparelhos -
   * o `id` e para falar com a plataforma, nao para andar no labirinto).
   *
   * O come-come de casa usa o MESMO objeto `entrada` do teclado: assim tanto
   * faz de onde veio o pedido de curva - a seta, a cruzeta (fase 15) ou o
   * pacote de um convidado -, o mundo le sempre do mesmo lugar.
   */
  function novoJogador(dados) {
    var d = dados || {};
    var casa = d.local === true;
    var nasce = labirinto.nascimento;
    return {
      id: d.id || '',
      indice: d.indice | 0,
      apelido: d.apelido || '',
      cor: d.cor || '',              // a cor da sala (o desenho e a fase 11)
      local: casa,                   // este e o come-come DESTE aparelho?
      // Todo mundo nasce no `P` do desenho e e espalhado logo em seguida por
      // `recolocarJogadores()`, que e quem sabe quantas pessoas ha na partida.
      corpo: Movimento.novoCorpo(nasce.c, nasce.l),
      entrada: casa ? entrada : { desejada: null },
      pontos: 0,
      seq: 0                         // o numero do ultimo pedido dele que valeu
    };
  }

  var jogo = {
    tela: 'menu',                    // 'menu' | 'jogando' | 'fase' | 'fim' | 'parabens'
    pausado: false,                  // pausa: o mundo congela, a tela nao
    apelido: '',                     // o nome digitado no menu
    relogio: 0,                      // quadros desde o inicio da partida
    fase: 1,                         // o labirinto 1 de 3
    vidas: VIDAS_INICIAIS,           // a copia que o HUD le (quem manda e a rodada)
    jogadores: [],                   // uma pessoa por aparelho (sozinho: so eu)
    eu: null,                        // a deste aparelho, dentro da lista
    tombado: -1,                     // o indice de quem levou o tombo da vez
    avisos: [],                      // a fila curta que viaja no retrato do mundo
    efeitos: [],                     // ... e as faiscas que ela vira na tela
    pastilhas: Pastilhas.novoEstado(labirinto),
    // Os fantasmas e o relogio dos humores ja nascem com os numeros da FASE:
    // os tempos de saida da casa e a tabela de ciclos saem da dificuldade do
    // labirinto em jogo, e nao de um padrao solto.
    fantasmas: Fantasmas.novoEstado(labirinto, labirinto.dificuldade),
    ciclo: Ciclos.novoEstado(labirinto.dificuldade),  // dispersar ou cacar, e ha quanto tempo
    miras: Personalidades.novoEstado(),      // a semente e o alvo sorteado do laranja
    poder: Poder.novoEstado(),               // o cronometro da pastilha de poder
    rodada: Rodada.novoEstado(),             // as vidas e a pausa do tombo
    corrida: Corrida.novoEstado()            // o caderninho dos tres labirintos
  };

  /* O come-come de casa e os pontos dele atendem pelos nomes de sempre:
     `jogo.come` e `jogo.pontos`. Desde que existe uma lista de jogadores, quem
     guarda os dois e a linha da pessoa deste aparelho - e estes dois atalhos
     evitam que o resto do arquivo (e os testes) precise saber disso.

     Numa sala, `jogo.pontos` continua sendo o placar DESTE aparelho: o dos
     outros mora na linha de cada um, e viaja no retrato do mundo. */
  Object.defineProperty(jogo, 'come', {
    enumerable: true,
    get: function () { return jogo.eu.corpo; },
    set: function (corpo) { jogo.eu.corpo = corpo; }
  });
  Object.defineProperty(jogo, 'pontos', {
    enumerable: true,
    get: function () { return jogo.eu.pontos; },
    set: function (pontos) { jogo.eu.pontos = pontos; }
  });

  /** De volta a ser um jogo de um jogador so: um come-come, o de casa. */
  function jogarSozinho() {
    jogo.jogadores = [novoJogador({ local: true, indice: 0 })];
    jogo.eu = jogo.jogadores[0];
    jogo.avisos = [];
  }

  jogarSozinho();

  // O estado vivo, para os testes dirigirem o jogo sem navegador.
  window.ComeCome.jogo = jogo;
  window.ComeCome.entrada = entrada;

  /**
   * Um quadro de movimento de TODOS os come-comes do labirinto, cada um com o
   * que o dono dele pediu: a seta de casa, ou a direcao que chegou pela rede.
   *
   * Sozinho isto e exatamente o que sempre foi - a lista tem uma pessoa so.
   * Numa sala e aqui que o mundo do anfitriao vira o mundo de todos: e a
   * mesmissima `Movimento.passo()` para os cinco corpos, que e o que deixa o
   * convidado prever o proprio come-come com a mesma funcao (fase 10).
   */
  function moverJogadores() {
    for (var i = 0; i < jogo.jogadores.length; i++) {
      var j = jogo.jogadores[i];
      if (j.entrada.desejada) j.corpo.desejada = j.entrada.desejada;
      j.corpo = Movimento.passo(j.corpo, labirinto);
    }
  }

  /**
   * O quadro do CONVIDADO. O mundo nao e dele - as pastilhas, os fantasmas, o
   * poder, as vidas e o placar sao decididos pelo anfitriao -, mas o corpo
   * dele e adivinhado aqui, com a mesmissima `Movimento.passo()` que o
   * anfitriao roda e com o pedido de direcao que acabou de subir pela rede.
   *
   * E isto que tira o "molenga" do controle: o come-come dobra a esquina no
   * quadro em que a tecla e apertada, sem esperar o vai-e-volta. O retrato que
   * chega depois so acerta o que ficou torto (`Previsao.corrigir`, dentro do
   * `Pacote.aplicar`).
   *
   * O que NAO acontece aqui: comer pastilha, comer fantasma, levar tombo,
   * ganhar ponto. Adivinhar isso daria a esta tela pontos que o anfitriao nao
   * deu - e duas telas contando historias diferentes e justamente o que o
   * modelo do anfitriao existe para evitar.
   */
  function preverCorpoLocal() {
    // O mundo do anfitriao esta parado no tombo (ou a rodada acabou): a
    // previsao para junto, senao o come-come daqui sairia andando sozinho
    // enquanto os outros dois estao congelados.
    if (Rodada.parado(jogo.rodada)) return;
    var eu = jogo.eu;
    if (!eu) return;
    if (eu.entrada.desejada) eu.corpo.desejada = eu.entrada.desejada;
    eu.corpo = Movimento.passo(eu.corpo, labirinto);
  }

  /**
   * Um aviso: alguem mordeu uma bolota ('poder') ou comeu um fantasma
   * ('fantasma'). Ele faz duas coisas, e nesta ordem:
   *
   *   1. solta a faisca AQUI, na hora - efeito e sempre local;
   *   2. no anfitriao, entra na fila que viaja no proximo retrato do mundo,
   *      para os convidados soltarem a mesma faisca no mesmo lugar.
   *
   * Sozinho (ou como convidado, que nao simula nada) a fila nem se enche: nao
   * ha para quem contar.
   */
  function soltarAviso(tipo, x, y, indice, valor) {
    var aviso = { tipo: tipo, x: x | 0, y: y | 0, indice: indice | 0, valor: valor | 0 };
    efeitoDoAviso(aviso);
    if (rede.papel !== 'anfitriao') return;
    jogo.avisos.push(aviso);
    if (jogo.avisos.length > MAX_AVISOS) jogo.avisos.shift();
  }

  /** A faisca de um aviso, na cor de quem fez a jogada. */
  function efeitoDoAviso(aviso) {
    var dono = Pacote.porIndice(jogo.jogadores, aviso.indice) || jogo.eu;
    jogo.efeitos.push({
      x: aviso.x, y: aviso.y, cor: corDoJogador(dono), vida: EFEITO_QUADROS
    });
  }

  /* As faiscas envelhecem por fora do mundo, um quadro por quadro desenhado.
     E de proposito: elas nao sao o jogo (nao mudam nada) e por isso continuam
     andando na tela do convidado, que nao simula, e somem sozinhas depois da
     pausa - ninguem volta de um telefonema e encontra um brilho parado. */
  function passarEfeitos() {
    var vivos = [];
    for (var i = 0; i < jogo.efeitos.length; i++) {
      var e = jogo.efeitos[i];
      e.vida--;
      if (e.vida > 0) vivos.push(e);
    }
    jogo.efeitos = vivos;
  }

  /** Um passo do mundo. */
  function atualizar() {
    /* O tombo congela TUDO - inclusive o relogio do mundo, que e o mesmo dos
       fantasmas. So a pausa anda, e no fim dela ou todo mundo volta para o
       lugar ou sobe a tela de fim de jogo. */
    if (Rodada.parado(jogo.rodada)) {
      var espera = Rodada.passo(jogo.rodada);
      jogo.rodada = espera.estado;
      if (espera.voltou) recomecarRodada();
      else if (espera.acabou) fimDeJogo();
      return;
    }

    jogo.relogio++;
    moverJogadores();

    // O que estiver debaixo dos pes dele some e vira ponto. Cada pastilha conta
    // uma vez so: nos outros 7 quadros dentro do mesmo quadrado ja nao ha nada.
    var mordida = Pastilhas.passo(jogo.pastilhas, labirinto, jogo.come);
    if (mordida.comeu >= 0) {
      jogo.pastilhas = mordida.estado;
      jogo.pontos += mordida.pontos;
      // A bolota grande vira o jogo: o feitico comeca (ou recomeca do zero, se
      // ja estava valendo) e os quatro levam o susto.
      if (mordida.poder) {
        jogo.poder = Poder.ligar(jogo.poder, labirinto);
        jogo.fantasmas = Fantasmas.assustar(jogo.fantasmas);
        soltarAviso('poder', jogo.come.x, jogo.come.y, jogo.eu.indice, mordida.pontos);
      }
      if (mordida.limpou) concluirFase();
    }

    var quadradoDoCome = {
      c: Mapa.coluna(jogo.come.x),
      l: Mapa.linha(jogo.come.y),
      dir: jogo.come.dir
    };

    /* Enquanto o feitico vale, o relogio dos humores fica PARADO: quando ele
       acabar, os quatro voltam exatamente ao ciclo em que estavam - sem
       meia-volta, como no fliperama. Fora do feitico o relogio anda normal, e
       na virada da tabela todos dao meia-volta na hora. */
    if (jogo.poder.ativo) {
      var tique = Poder.passo(jogo.poder);
      jogo.poder = tique.estado;
      if (tique.acabou) jogo.fantasmas = Fantasmas.acalmar(jogo.fantasmas);
    } else {
      jogo.ciclo = Ciclos.passo(jogo.ciclo, labirinto.dificuldade);
      if (jogo.ciclo.trocou) jogo.fantasmas = Fantasmas.inverter(jogo.fantasmas);
    }

    /* Agora cada um recebe o SEU alvo: o vermelho mira o come-come, o rosa
       quatro casas a frente dele, o azul so caca de longe e o laranja vai
       aonde o sorteio mandar - ou, na dispersao, cada um para o seu canto.
       Quem esta assustado ignora tudo isso e so quer distancia do come-come
       (`fuga`) - e nesse estado ele nao machuca ninguem. */
    var mira = Personalidades.passo(jogo.miras, jogo.fantasmas, labirinto, {
      modo: jogo.ciclo.modo,
      come: quadradoDoCome
    });
    jogo.miras = mira.estado;
    /* A PRESSA e o degrau de velocidade da fase: no labirinto 1 os quatro
       correm como o come-come, e nos outros dois eles dao um passo a mais de
       vez em quando (a tabela de dificuldade diz quantos). */
    jogo.fantasmas = Fantasmas.passo(jogo.fantasmas, labirinto, mira.alvos, {
      fuga: quadradoDoCome,
      pressa: labirinto.dificuldade.pressa
    });

    comerFantasmas();
    checarTombo();
  }

  /**
   * O outro lado da pastilha de poder: encostar num fantasma assustado o come.
   * Ele vale o proximo degrau da escada (200, 400, 800, 1600 dentro da mesma
   * pastilha), vira um par de olhos e sai correndo para casa.
   *
   * A conferencia vem DEPOIS do passo dos fantasmas: o encontro so existe
   * quando os dois ja andaram, e assim ninguem e comido de mentira.
   */
  function comerFantasmas() {
    var lista = jogo.fantasmas.lista;
    for (var i = 0; i < lista.length; i++) {
      var f = lista[i];
      if (!Fantasmas.comestivel(f)) continue;
      if (!Fantasmas.encostou(f, jogo.come, labirinto)) continue;

      var premio = Poder.comer(jogo.poder);
      jogo.poder = premio.estado;
      jogo.pontos += premio.pontos;
      soltarAviso('fantasma', f.corpo.x, f.corpo.y, jogo.eu.indice, premio.pontos);
      jogo.fantasmas = Fantasmas.comido(jogo.fantasmas, i);
      lista = jogo.fantasmas.lista;
    }
  }

  /**
   * O tombo: um fantasma em caca encostou no come-come. Custa uma vida e para
   * o mundo por um segundo e meio - e uma vida so, ainda que os quatro estejam
   * em cima dele (quem cuida disso e o `Rodada.perder`).
   *
   * A conferencia vem depois do `comerFantasmas()` de proposito: com o feitico
   * valendo quem encosta e comido, e nao o contrario.
   */
  function checarTombo() {
    /* A ultima pastilha pode ter sumido neste mesmo quadro: fase limpa e fase
       limpa, e ninguem leva um tombo depois de ganhar. */
    if (jogo.tela !== 'jogando') return;

    var quem = Rodada.pegou(jogo.fantasmas, jogo.come, labirinto);
    if (quem < 0) return;

    var tombo = Rodada.perder(jogo.rodada, quem);
    if (!tombo.perdeu) return;
    jogo.rodada = tombo.estado;
    jogo.vidas = tombo.estado.vidas;
    // Quem foi pego: hoje o labirinto so machuca o come-come deste aparelho
    // (em grupo, o tombo de cada um e a fase 12), mas o desenho ja pergunta
    // pelo indice - e ele viaja no retrato.
    jogo.tombado = jogo.eu.indice;
  }

  /**
   * Carrega o labirinto 1, 2 ou 3 e comeca ele do zero: o desenho da vez, as
   * pastilhas todas de pe, o come-come no nascimento, os quatro na casa e o
   * relogio dos humores zerado - tudo ja com os numeros da fase, que vem da
   * tabela de dificuldade grudada no mapa.
   *
   * Este e o degrau de baixo: ele CARREGA uma fase, nao decide qual vem
   * depois. Quem manda na ordem (o bonus por limpar, a proxima, a tela de
   * Parabens) e a corrida - o `Corrida` e o `avancarFase()` logo abaixo. Os
   * testes chamam esta funcao direto para entrar na 2 ou na 3 sem jogar as
   * anteriores.
   */
  function irParaFase(numero) {
    var n = Math.min(Math.max(numero | 0, 1), TOTAL_FASES);
    labirinto = mapas[n - 1];
    window.ComeCome.labirinto = labirinto;

    jogo.fase = n;
    jogo.pontos = 0;
    jogo.relogio = 0;
    jogo.tela = 'jogando';
    jogo.pastilhas = Pastilhas.novoEstado(labirinto);
    // As vidas atravessam a fase: quem chegou aqui com duas continua com duas.
    // So depois de um fim de jogo a rodada volta cheia.
    jogo.rodada = jogo.rodada.acabou
      ? Rodada.novoEstado()
      : { vidas: jogo.rodada.vidas, pausa: 0, pego: -1, acabou: false };
    jogo.vidas = jogo.rodada.vidas;

    var novo = Rodada.reiniciar(labirinto, labirinto.dificuldade);
    recolocarJogadores();
    jogo.fantasmas = novo.fantasmas;
    jogo.ciclo = novo.ciclo;
    jogo.poder = novo.poder;

    el.telaFase.classList.add('hidden');
    el.telaFim.classList.add('hidden');
    el.telaParabens.classList.add('hidden');
    atualizarHud();
    atualizarControles();
  }

  // Os testes entram direto na fase 2 ou na 3 por aqui.
  window.ComeCome.irParaFase = function (n) { irParaFase(n); };

  /**
   * Passada a pausa, todo mundo volta para o lugar de comeco: o come-come no
   * nascimento, os quatro na casa e o relogio dos humores do zero. O labirinto
   * NAO se refaz - as pastilhas ja comidas continuam comidas -, e o pedido de
   * direcao guardado tambem se perde: seria feio a crianca renascer ja andando
   * para o lado em que acabou de ser pega.
   */
  function recomecarRodada() {
    // O `novo.come` que a rodada devolve vale para um come-come so: quem poe
    // cada pessoa da sala no lugar dela e o `recolocarJogadores()`.
    var novo = Rodada.reiniciar(labirinto, labirinto.dificuldade);
    recolocarJogadores();
    jogo.fantasmas = novo.fantasmas;
    jogo.ciclo = novo.ciclo;
    jogo.poder = novo.poder;
  }

  /**
   * Todo mundo de volta ao lugar de nascer, um por ponto de partida: o
   * primeiro no `P` do desenho (que sozinho e o unico) e os outros
   * espalhados pelo labirinto, na ordem do `indice` da sala. Como a conta e a
   * mesma em todo aparelho, os cinco veem os cinco nascendo nos mesmos
   * lugares.
   *
   * O pedido de direcao guardado se perde junto: seria feio a crianca
   * renascer ja andando para o lado em que acabou de ser pega.
   */
  function recolocarJogadores() {
    var lugares = Mapa.nascimentos(labirinto, jogo.jogadores.length);
    jogo.tombado = -1;
    for (var i = 0; i < jogo.jogadores.length; i++) {
      var j = jogo.jogadores[i];
      var lugar = lugares[i] || labirinto.nascimento;
      j.corpo = Movimento.novoCorpo(lugar.c, lugar.l);
      j.entrada.desejada = null;
    }
  }

  /**
   * As tres vidas acabaram: no jogo de um jogador so a partida termina aqui,
   * com os pontos na tela. (Em grupo, quem zera as vidas vira espectador ate a
   * proxima fase - isso e a fase 12 do plano.)
   */
  function fimDeJogo() {
    jogo.tela = 'fim';
    // Os pontos que aparecem sao os da CORRIDA inteira: o que os labirintos ja
    // limpos renderam (com os bonus) mais o que esta rolando neste aqui.
    el.fimPontos.textContent = String(jogo.corrida.total + jogo.pontos);
    el.fimFase.textContent = String(jogo.fase);
    el.telaFim.classList.remove('hidden');
    atualizarControles();
  }

  /**
   * A ultima pastilha sumiu: o labirinto esta limpo. A fase e fechada no
   * caderninho da corrida - com os pontos dela e o bonus por limpar - e dai
   * saem dois caminhos: nos labirintos 1 e 2 sobe o quadro "LABIRINTO LIMPO",
   * com o botao que abre o proximo; no 3 a corrida acaba, e o que sobe e o
   * PARABENS com o resumo das tres.
   */
  function concluirFase() {
    jogo.tela = 'fase';
    jogo.corrida = Corrida.concluir(jogo.corrida, jogo.fase, jogo.pontos);

    if (jogo.corrida.terminada) { mostrarParabens(); return; }

    el.faseNumero.textContent = String(jogo.fase);
    el.fasePontos.textContent = String(jogo.pontos);
    el.faseBonus.textContent = '+' + PONTOS_LIMPOU;
    el.faseProxima.textContent = String(jogo.corrida.fase);
    el.telaFase.classList.remove('hidden');
    atualizarControles();
  }

  /**
   * Os tres labirintos limpos: a tela de PARABENS, com uma linha por fase
   * ("pastilhas + bonus = total") e o total da corrida embaixo.
   */
  function mostrarParabens() {
    jogo.tela = 'parabens';
    for (var i = 0; i < el.parabensFases.length; i++) {
      var linha = jogo.corrida.fases[i];
      el.parabensFases[i].textContent = linha
        ? linha.pontos + ' + ' + linha.bonus + ' = ' + linha.total
        : '—';
    }
    el.parabensTotal.textContent = String(jogo.corrida.total);
    el.telaFase.classList.add('hidden');
    el.telaParabens.classList.remove('hidden');
    atualizarControles();
  }

  /**
   * O botao do quadro de fim de fase. Ele so anda para a FRENTE, e so depois
   * de um labirinto limpo: clicar no meio da fase (ou depois do Parabens) nao
   * leva a lugar nenhum. Qual e a proxima quem diz e o caderninho.
   */
  function avancarFase() {
    if (jogo.tela !== 'fase' || jogo.corrida.terminada) return;
    irParaFase(jogo.corrida.fase);
  }

  el.btnProxima.addEventListener('click', avancarFase);

  /* ==========================================================================
     A MOLDURA  -  menu, pausa, tela cheia e o lembrete dos controles
     --------------------------------------------------------------------------
     Nada daqui mexe no mundo: o mundo continua sendo o `atualizar()` la de
     cima. O que esta parte faz e decidir QUANDO ele anda (o menu e a pausa
     seguram; o `quadro()` so simula com a tela em 'jogando' e sem pausa) e o
     que a crianca ve por cima do labirinto.
     ========================================================================== */

  /** Mostra ou esconde um elemento - a mesma classe `hidden` do CSS. */
  function exibir(elemento, mostrar) {
    if (mostrar) elemento.classList.remove('hidden');
    else elemento.classList.add('hidden');
  }

  /* O cartaz do canto so aparece com o labirinto rolando: no menu, na pausa e
     nas telas de fim ha sempre um quadro por cima, e o lembrete atras dele so
     sujaria a tela. */
  function atualizarControles() {
    exibir(el.controles, jogo.tela === 'jogando' && !jogo.pausado);
  }

  /* Pausar so faz sentido com um labirinto em andamento: no menu nao ha o que
     congelar, e nas telas de fim o mundo ja esta parado atras do quadro. */
  function podePausar() {
    return jogo.tela === 'jogando';
  }

  /* A pausa congela o mundo e nada mais: o laco continua desenhando (o
     labirinto fica ali, paradinho) mas `atualizar()` nao roda, entao nem o
     relogio - que e o mesmo dos fantasmas - anda.

     O pedido de curva guardado se perde junto: uma seta apertada antes da
     pausa nao pode virar o come-come numa esquina minutos depois, quando a
     crianca voltar. */
  function definirPausa(pausado) {
    if (jogo.pausado === pausado || (pausado && !podePausar())) return;

    jogo.pausado = pausado;
    entrada.desejada = null;
    exibir(el.telaPausa, pausado);
    pintarBotaoPausa();
    atualizarControles();
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
     catalogo (`/jogar/come_come`), que ja vem com `allowfullscreen`. */
  function alternarTelaCheia() {
    if (emTelaCheia()) {
      chamarPrimeiro(document, ['exitFullscreen', 'webkitExitFullscreen']);
      return;
    }
    chamarPrimeiro(document.documentElement,
      ['requestFullscreen', 'webkitRequestFullscreen']);
  }

  /* Quem manda no botao e o navegador: ele avisa quando entrou ou saiu (a
     crianca pode sair pelo ESC, sem passar por aqui). O palco e remedido junto,
     porque a janela acabou de mudar de tamanho. */
  function aoMudarTelaCheia() {
    var cheia = emTelaCheia();
    el.btnTelaCheia.textContent = cheia ? '🗗' : '⛶';
    el.btnTelaCheia.title = cheia ? 'Sair da tela cheia (F)' : 'Tela cheia (F)';
    el.btnTelaCheia.setAttribute('aria-label',
      cheia ? 'Sair da tela cheia' : 'Tela cheia');
    ajustarPalco();
  }

  // ------------------------------------------------------------- O menu ----
  /* O nome fica guardado no aparelho para a crianca nao ter que digitar de
     novo a cada partida. E so isto que o jogo guarda - o `jogo.json` declara
     exatamente isso em `privacidade.coleta`. Navegador em modo privado (ou
     `index.html` aberto do disco em alguns navegadores) faz o storage
     explodir: o `try` engole, e o campo comeca vazio. */
  var CHAVE_APELIDO = 'come_come:apelido';
  var APELIDO_MAX = 14;              // o mesmo `maxlength` do campo no HTML

  function lerApelidoGuardado() {
    try { return window.localStorage.getItem(CHAVE_APELIDO) || ''; }
    catch (e) { return ''; }
  }

  function guardarApelido(nome) {
    try { window.localStorage.setItem(CHAVE_APELIDO, nome); } catch (e) {}
  }

  /** O que a crianca digitou, limpo: sem espaco sobrando e no maximo 14 letras. */
  function apelidoDoCampo() {
    var nome = String(el.campoApelido.value || '').replace(/^\s+|\s+$/g, '');
    return nome.slice(0, APELIDO_MAX);
  }

  /* Comeca (ou recomeca) a corrida inteira: caderno em branco, vidas cheias,
     labirinto 1. E o que fazem o "JOGAR SOZINHO" do menu, o "RECOMECAR" da
     pausa, os dois "JOGAR DE NOVO" das telas de fim e a sala que comeca - um
     caminho so, para nao existir duas maneiras diferentes de comecar uma
     partida. Ele NAO mexe na sala: quem entra e quem sai de uma e o `Rede`. */
  function comecarPartida() {
    definirPausa(false);               // recomecar pela pausa descongela tudo
    Rede.avisar('');                   // nenhuma tarja de sala sobra na partida
    jogo.apelido = apelidoDoCampo();
    guardarApelido(jogo.apelido);
    jogo.corrida = Corrida.novoEstado();
    jogo.rodada = Rodada.novoEstado();
    jogo.efeitos = [];
    /* O sorteio do fantasma laranja sai da SEMENTE, e numa sala a semente e a
       que a Central mandou para todos: assim o mundo do anfitriao e o mesmo
       filme em qualquer aparelho que precise recontar a historia. */
    jogo.miras = Personalidades.novoEstado(
      rede.sala ? rede.sala.semente : SEMENTE_PADRAO);
    irParaFase(1);
    exibir(el.menu, false);
    exibir(el.hud, true);
    atualizarControles();
    ajustarPalco();
  }

  /* "JOGAR SOZINHO": larga qualquer sala em que se esteja e comeca a corrida
     de um jogador so. Sem a Central no ar isto e literalmente o botao JOGAR de
     sempre - `sairDaSala()` nao tem sala nenhuma para largar. */
  function comecarSolo() {
    Rede.sairDaSala();
    comecarPartida();
  }

  /* Os dois "JOGAR DE NOVO" das telas de fim. Sozinho eles recomecam a corrida
     na hora. Numa sala a partida e de todos: quando ela acaba, a Central
     devolve a sala ao lobby - entao o caminho e voltar para la, onde o
     anfitriao pode comecar outra com a turma inteira. */
  function jogarDeNovo() {
    if (rede.sala) {
      voltarAoMenu();
      Rede.abrirLobby();
      return;
    }
    comecarPartida();
  }

  /* Volta para a tela inicial, com o mundo parado atras dela. So a rede precisa
     disto: quando a sala acaba ou o anfitriao cai, ninguem pode ficar preso
     numa partida que nao existe mais. A tarja de recado NAO e limpa aqui - e
     ela que vai explicar, no menu, por que a partida terminou. */
  function voltarAoMenu() {
    definirPausa(false);
    jogo.tela = 'menu';
    entrada.desejada = null;
    exibir(el.telaFase, false);
    exibir(el.telaFim, false);
    exibir(el.telaParabens, false);
    exibir(el.hud, false);
    exibir(el.menu, true);
    atualizarControles();
  }

  el.btnJogar.addEventListener('click', comecarSolo);
  el.btnDeNovo.addEventListener('click', jogarDeNovo);
  el.btnFimDeNovo.addEventListener('click', jogarDeNovo);
  // "Recomecar" nao larga a sala: quem quer voltar a jogar sozinho clica em
  // "JOGAR SOZINHO", no menu.
  el.btnRecomecar.addEventListener('click', comecarPartida);
  el.btnPausa.addEventListener('click', alternarPausa);
  el.btnContinuar.addEventListener('click', function () { definirPausa(false); });
  el.btnTelaCheia.addEventListener('click', alternarTelaCheia);

  // Digitar o nome e apertar Enter e o mesmo que clicar em JOGAR SOZINHO.
  el.campoApelido.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    comecarSolo();
  });

  document.addEventListener('fullscreenchange', aoMudarTelaCheia);
  document.addEventListener('webkitfullscreenchange', aoMudarTelaCheia);

  // Os testes dirigem a moldura por aqui, sem precisar do DOM inteiro.
  window.ComeCome.alternarPausa = function () { alternarPausa(); };
  window.ComeCome.comecarPartida = function () { comecarPartida(); };
  window.ComeCome.voltarAoMenu = function () { voltarAoMenu(); };

  /* ==========================================================================
     A CENTRAL  -  o jogo em cima da Plataforma da rede de casa
     --------------------------------------------------------------------------
     Todo o codigo de rede mora aqui dentro, e nada disto acontece se o
     `window.Plataforma` nao existir (jogo aberto direto do disco, ou servidor
     fora do ar): o botao "JOGAR COM AMIGOS" continua escondido e o resto do
     arquivo nem sabe que a rede existe. O portao e um so, e e a ultima coisa
     do arquivo.

     Comecada a sala existe UM labirinto so, e ele e o do anfitriao:

         CONVIDADO                 ANFITRIAO                  CONVIDADO
         a direcao  ------------->  simula o mundo  -------->  desenha, preve
         (20x/s, e na hora          inteiro, com todos         (20x/s) e corrige
          em que ela muda)

     O anfitriao roda o `atualizar()` de sempre com a lista inteira de pessoas
     dentro (um come-come por aparelho, cada um andando com o que o dono dele
     pediu) e manda o retrato pronto (`Pacote.montar`) na taxa que o manifesto
     pediu. O convidado nao simula o mundo: manda so a direcao que quer
     (`Pacote.entrada`) e copia o retrato que chega (`Pacote.aplicar`),
     soltando as faiscas dos avisos que vieram junto - menos o proprio corpo,
     que ele adivinha em `preverCorpoLocal()` e so acerta com
     `Previsao.corrigir()`.
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
    snaps: 0              // ... e os que precisaram encaixar de uma vez
  };

  var Rede = (function () {
    var P = null;         // o SDK da Central, ja iniciado
    var mj = null;        // P.multijogador
    var quadrosDesdeEnvio = 0;   // para mandar na taxa certa, nao a cada quadro
    var ultimaEnviada;    // a ultima direcao que este convidado ja contou
    var FOLGA_PEDIDO = 2; // quadros minimos entre dois pedidos fora de hora

    /* Liga o jogo na plataforma. Devolve `false` (e nao muda nada na tela)
       quando o multijogador nao esta disponivel - e o caso do servidor fora do
       ar, em que o jogo segue sendo o de sempre, so sozinho. */
    function iniciar(plataforma) {
      P = plataforma || null;
      mj = P && P.multijogador;
      if (!mj || !mj.disponivel) return false;

      rede.ligada = true;
      // O erro que o servidor devolve (sala cheia, codigo que nao existe) vira
      // a tarja do menu: a crianca precisa saber o que aconteceu.
      mj.em('erro', function (texto) { avisar(texto); });

      el.btnAmigos.classList.remove('hidden');
      el.btnAmigos.addEventListener('click', abrirLobby);
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
      /* O nome digitado no menu e o apelido da sala: a crianca escreve o nome
         dela uma vez so. Campo vazio nao apaga o que ja estava guardado - o
         proprio lobby tem um campo de nome, e quem chega nele com o nome
         preenchido nao precisa digitar nada. */
      var nome = apelidoDoCampo();
      if (nome && P && P.perfil) P.perfil.definirApelido(nome);
      mj.abrirLobby({
        aoComecar: comecar,
        aoReceber: receber,
        aoTerminar: terminar,
        aoAbortar: abortar,
        // Depois da partida quem manda na tela e o jogo (a tela de PARABENS);
        // o lobby so volta quando a crianca clicar em "JOGAR COM AMIGOS".
        voltarAoLobby: false
      });
    }

    /* A sala comecou: todo mundo cai no labirinto 1 junto, pelo mesmo caminho
       de sempre, com o codigo da sala no HUD. O apelido passa a ser o que ficou
       na sala (o lobby deixa trocar), e nao mais o do campo do menu. */
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
      quadrosDesdeEnvio = 0;
      ultimaEnviada = undefined;
      montarJogadores(sala);
      mostrarSala();
      comecarPartida();

      // O lobby deixa trocar o nome: quem manda e o que ficou na sala, e ele
      // fica guardado aqui tambem - o menu da proxima vez ja abre com ele.
      var naSala = apelidoNaSala(sala);
      if (naSala) {
        jogo.apelido = naSala;
        el.campoApelido.value = naSala;
        guardarApelido(naSala);
      }
    }

    /* A sala vira a lista de come-comes do labirinto, na ordem do `indice` -
       que e a identidade de cada um dentro da partida (o `id` e para falar com
       a plataforma). A pessoa deste aparelho e a que tem o id de `sala.eu`, e
       e ela que continua sendo `jogo.come` para o resto do arquivo.

       Onde cada um nasce quem decide e `recolocarJogadores()`, logo em seguida
       (o `comecarPartida()` do `comecar` chama ele): a mesma conta em todo
       aparelho, entao os cinco veem os cinco nascendo nos mesmos lugares. */
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
      if (!eu) return;                 // sala sem mim: nao mexe em nada

      lista.sort(function (a, b) { return a.indice - b.indice; });
      jogo.jogadores = lista;
      jogo.eu = eu;
      jogo.avisos = [];
    }

    /** O apelido deste aparelho dentro da sala, como os outros o veem. */
    function apelidoNaSala(sala) {
      var todos = (sala && sala.jogadores) || [];
      for (var i = 0; i < todos.length; i++) {
        if (todos[i].id === sala.eu) return todos[i].apelido || '';
      }
      return '';
    }

    /* Chegou um pacote de outro jogador: ou e a direcao de um convidado (e
       quem trata e o anfitriao), ou e o retrato do mundo (e quem copia sao os
       convidados). Qualquer outra coisa e anotada e ignorada sem barulho - e
       pacote de uma sala que ja acabou vai direto para o lixo. */
    function receber(msg) {
      if (!rede.sala) return;
      rede.recebidas++;
      rede.ultimaMensagem = msg;

      var d = msg && msg.d;
      if (Pacote.ehEntrada(d) && rede.papel === 'anfitriao') aplicarEntrada(msg.de, d);
      else if (Pacote.ehEstado(d) && rede.papel === 'convidado') aplicarEstado(d);
    }

    /* A direcao que um convidado pediu, do lado do anfitriao. Ela fica na
       linha dele e vale no proximo quadro, exatamente como a seta daqui - e e
       isso que faz o come-come do convidado andar no mundo do anfitriao.
       Pedido atrasado (numero menor que o ultimo) e descartado. */
    function aplicarEntrada(id, d) {
      var j = jogadorPorId(id);
      if (!j || j.local) return;
      if (d.n && d.n <= j.seq) return;
      j.seq = d.n || 0;
      j.entrada.desejada = Pacote.direcaoDe(d.d);
    }

    /** A pessoa daquele id da plataforma (ou `null`, se ela nao esta aqui). */
    function jogadorPorId(id) {
      for (var i = 0; i < jogo.jogadores.length; i++) {
        if (jogo.jogadores[i].id === id) return jogo.jogadores[i];
      }
      return null;
    }

    /* O retrato do mundo, do lado do convidado: ele copia tudo por cima do que
       tinha e refaz as faiscas dos avisos que vieram junto - efeito e local,
       nao viaja pela rede.

       Retrato velho vai para o lixo. E como o pacote e o mundo INTEIRO (e nao
       a diferenca para o anterior), um que se perde no caminho nao desalinha
       nada: o proximo ja traz tudo de novo. */
    function aplicarEstado(d) {
      if (jogo.tela !== 'jogando') return;
      if (d.n && d.n <= rede.ultimoRecebido) { rede.atrasados++; return; }
      rede.ultimoRecebido = d.n || 0;

      // O anfitriao virou a pagina: o labirinto novo entra ANTES do resto,
      // senao as pastilhas seriam lidas com o desenho errado.
      if (d.f && d.f !== jogo.fase) irParaFase(d.f);

      /* O `true` do fim liga a previsao local: o corpo deste aparelho NAO e
         copiado por cima, ele foi adivinhado aqui e so e puxado para a posicao
         oficial. Os outros come-comes, os fantasmas e as pastilhas sao sempre
         os do anfitriao. */
      var novidades = Pacote.aplicar(d, jogo, labirinto, true);
      if (novidades.correcao) {
        rede.erro = novidades.correcao.erro;
        if (novidades.correcao.snap) rede.snaps++;
        else rede.correcoes++;
      }
      for (var i = 0; i < novidades.avisos.length; i++) {
        efeitoDoAviso(novidades.avisos[i]);
      }
      atualizarHud();

      /* O mundo do anfitriao parou: ou o labirinto ficou limpo, ou as vidas
         acabaram. A tela daqui vira a pagina junto - ninguem fica olhando um
         labirinto parado sem saber por que. (As regras da sala - a fase que
         acaba para o grupo e quem vira espectador - sao a fase 12.) */
      if (d.q === 1) concluirFase();
      else if (d.q === 2) fimDeJogo();
    }

    /* O quadro da rede, chamado uma vez por quadro desenhado. O anfitriao
       manda o mundo, o convidado manda a direcao - os dois na taxa que o
       manifesto pediu (20 por segundo), que num relogio de 60 quadros da um
       pacote a cada tres. Bem dentro dos freios da plataforma: 64 KB e 90
       mensagens por segundo. */
    function passo() {
      if (!rede.sala || jogo.tela !== 'jogando') return;

      var taxa = rede.sala.taxaEstado || 15;
      var cada = Math.max(1, Math.round(60 / taxa));
      quadrosDesdeEnvio++;

      /* A direcao NOVA nao espera a proxima batida: ela sobe no mesmo quadro
         em que a tecla foi apertada. E o que faz o anfitriao dobrar a MESMA
         esquina que a previsao daqui acabou de dobrar - esperar ate tres
         quadros para contar seria pedir para ele perder a esquina e mandar o
         come-come de volta. Custa pouco: so a MUDANCA sobe fora de hora, e
         nunca duas vezes seguidas (a folga garante isso), entao o convidado
         fica bem longe das 90 mensagens por segundo da plataforma. */
      if (rede.papel === 'convidado' && entrada.desejada !== ultimaEnviada
          && quadrosDesdeEnvio >= FOLGA_PEDIDO) {
        quadrosDesdeEnvio = 0;
        mandarEntrada();
        return;
      }

      if (quadrosDesdeEnvio < cada) return;
      quadrosDesdeEnvio = 0;

      if (rede.papel === 'anfitriao') mandarEstado();
      else mandarEntrada();
    }

    /* O retrato do mundo, para a sala inteira. A fila de avisos vai junto e e
       esvaziada aqui: cada faisca viaja uma vez so. */
    function mandarEstado() {
      if (!mj || rede.papel !== 'anfitriao') return;
      rede.enviados++;
      mj.enviar(Pacote.montar(jogo, ++rede.seq));
      jogo.avisos = [];
    }

    /** E o que sobe do convidado: a direcao que ele quer, e mais nada. */
    function mandarEntrada() {
      if (!mj || rede.papel !== 'convidado') return;
      rede.enviados++;
      ultimaEnviada = entrada.desejada;
      mj.paraAnfitriao(Pacote.entrada(++rede.seq, entrada));
    }

    /* A partida da sala foi encerrada pela Central. Ninguem pode ficar preso
       numa partida que nao existe mais: todo mundo volta ao menu com o recado.
       (O ranking da sala nesta tela e a fase 13.) */
    function terminar() {
      if (!rede.sala) return;
      limparSala();
      voltarAoMenu();
      avisar('A partida da sala terminou.');
    }

    /* O anfitriao caiu (ou a sala se desfez). Era a maquina dele que mandava na
       sala, entao nao ha partida em grupo para continuar: todo mundo volta ao
       menu com o motivo na tarja vermelha, e dali da para jogar sozinho ou
       abrir o lobby de novo (a Central ja escolheu um anfitriao novo). O que
       nao pode acontecer, de jeito nenhum, e alguem ficar preso numa tela
       parada. */
    function abortar(motivo) {
      if (!rede.sala) return;
      var recado = (motivo && motivo.motivo) || 'A sala foi encerrada.';
      limparSala();
      voltarAoMenu();
      avisar(recado);
    }

    /** Larga a sala e volta a ser um jogo de um jogador so. */
    function sairDaSala() {
      if (!rede.sala) return;
      limparSala();
      if (mj) mj.sair();
    }

    /* Largar a sala e desfazer o mundo de todos: o labirinto volta a ter um
       come-come so, o de casa. Sem isto os come-comes dos outros ficariam
       parados na tela, esperando pacotes que nao chegam mais. */
    function limparSala() {
      rede.sala = null;
      rede.papel = 'solo';
      jogarSozinho();
      mostrarSala();
    }

    /** O codigo da sala no HUD - so nas partidas em grupo. */
    function mostrarSala() {
      if (rede.sala) el.hudSalaCodigo.textContent = rede.sala.codigo;
      exibir(el.hudSala, !!rede.sala);
    }

    /* A tarja de recado do menu. Texto vazio apaga e esconde. O que chega aqui
       vem de outro aparelho (ou do servidor): e DADO, e por isso entra por
       `textContent` - nunca por `innerHTML`. */
    function avisar(texto) {
      el.aviso.textContent = texto || '';
      exibir(el.aviso, !!texto);
    }

    return {
      iniciar: iniciar,
      abrirLobby: abrirLobby,
      sairDaSala: sairDaSala,
      avisar: avisar,
      passo: passo,
      mandarEstado: mandarEstado,
      /* O MUNDO anda neste aparelho? O convidado nao simula o mundo: ele
         desenha o que chega e adivinha so o proprio come-come. */
      simulaAqui: function () { return rede.papel !== 'convidado'; }
    };
  }());

  window.ComeCome.rede = rede;
  window.ComeCome.abrirLobby = function () { Rede.abrirLobby(); };
  // Os testes de sala forcam um retrato fresco por aqui.
  window.ComeCome.mandarEstado = function () { Rede.mandarEstado(); };

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

  /* Os atalhos das tres teclas de interface. O `Esc` so PAUSA: sair da pausa
     por ele nao daria certo em tela cheia, onde o navegador rouba o `Esc` para
     si e a crianca ficaria com o jogo andando sem ter mandado. */
  var ATALHOS = {
    p: alternarPausa, P: alternarPausa,
    Escape: function () { definirPausa(true); },
    Esc: function () { definirPausa(true); },
    f: alternarTelaCheia, F: alternarTelaCheia
  };

  window.addEventListener('keydown', function (ev) {
    // Digitando o nome no menu, a tecla e do campo: nada de pausar o jogo
    // porque o nome da crianca tem um "p" (nem de virar por causa do "a").
    if (ev.target === el.campoApelido) return;

    var atalho = ATALHOS[ev.key];
    if (atalho) { ev.preventDefault(); atalho(); return; }

    var dir = TECLAS[ev.key];
    if (!dir) return;
    ev.preventDefault();
    // No menu, na pausa e nas telas de fim a seta nao guarda nada: sem isto,
    // uma tecla apertada atras do quadro viraria o come-come na volta.
    if (jogo.tela !== 'jogando' || jogo.pausado) return;
    entrada.desejada = dir;
  });

  /* Perder o foco pausa sozinho (a crianca trocou de aba, chegou uma ligacao,
     o tablet apagou a tela): ninguem volta e encontra as tres vidas gastas por
     fantasmas que andaram enquanto a tela estava em outro lugar. E, como a
     pausa nao mexe em nada do mundo, a partida continua exatamente de onde
     parou. */
  function pausarPorFalta() { definirPausa(true); }

  window.addEventListener('blur', pausarPorFalta);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pausarPorFalta();
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

  /* Girar o aparelho nao mexe no mundo - so na conta do tamanho do palco. A
     medida e refeita duas vezes de proposito: na hora (para a tela nao ficar
     torta nenhum quadro) e de novo um instantinho depois, porque no celular a
     janela ainda esta reportando o tamanho ANTIGO quando o evento chega. */
  window.addEventListener('resize', ajustarPalco);
  window.addEventListener('orientationchange', function () {
    ajustarPalco();
    setTimeout(ajustarPalco, 120);
  });

  // ---------------------------------------------------------- Laco do jogo --
  // Relogio fixo de 60 passos por segundo: o labirinto anda sempre igual em
  // qualquer aparelho - e e isso que deixa anfitriao e convidado batendo certo
  // numa sala.
  var acumulado = 0, ultimo = 0;

  function quadro(agora) {
    requestAnimationFrame(quadro);
    var dt = ultimo ? Math.min(200, agora - ultimo) : 0;
    ultimo = agora;

    /* Pausado, o mundo nao anda - mas a cena continua sendo desenhada, entao o
       labirinto fica ali paradinho atras do quadro de pausa. O acumulador zera
       no `else`: ao continuar, ninguem leva um punhado de quadros de uma vez.

       Quem esta na sala como convidado anda no mesmo compasso, mas nao roda o
       mundo: `preverCorpoLocal()` adivinha SO o come-come deste aparelho, e o
       resto (pastilhas, fantasmas, placar) chega pronto no retrato. */
    if (jogo.tela === 'jogando' && !jogo.pausado) {
      acumulado += dt;
      var passos = 0;
      // A fase pode acabar no meio da rajada (a ultima pastilha some): dai em
      // diante o mundo nao anda mais neste quadro.
      while (acumulado >= PASSO_MS && passos < 6 && jogo.tela === 'jogando') {
        if (Rede.simulaAqui()) atualizar();
        else preverCorpoLocal();
        acumulado -= PASSO_MS;
        passos++;
      }
      if (acumulado > PASSO_MS * 6) acumulado = 0;   // a aba voltou do sono
    } else {
      acumulado = 0;
    }

    Rede.passo();
    passarEfeitos();
    atualizarHud();
    desenharCena();
  }

  // O campo do menu ja comeca com o nome da ultima partida.
  el.campoApelido.value = lerApelidoGuardado();

  atualizarHud();
  atualizarControles();
  pintarBotaoPausa();
  aoMudarTelaCheia();      // e o botao de tela cheia comeca no estado certo
  desenharCena();
  requestAnimationFrame(quadro);

  /* --------------------------------------------------------- A Plataforma --
     O SDK so existe quando o jogo e servido pela Central (`/plataforma/sdk.js`
     e um caminho absoluto: aberto direto do disco ele nem carrega). E mesmo
     tendo o SDK, `iniciar()` pode voltar dizendo que o multijogador nao esta
     de pe - e ai tambem fica so o "JOGAR SOZINHO". Nos dois casos o jogo
     inteiro continua funcionando; e por isso que este pedaco e o ULTIMO do
     arquivo e nao segura nada: quando ele roda, o labirinto ja esta na tela.

     O apelido guardado no aparelho vai junto: quem ja jogou aqui antes chega
     ao lobby com o nome preenchido. */
  window.ComeCome.pronta = window.Plataforma
    ? window.Plataforma.iniciar({ jogo: 'come_come', apelido: lerApelidoGuardado() })
        .then(function (P) { Rede.iniciar(P); return P; })
        ['catch'](function (erro) {
          console.warn('[come-come] plataforma fora do ar:', erro);
          return null;
        })
    : null;
}());
