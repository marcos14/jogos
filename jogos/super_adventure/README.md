# 🍄 Super Adventure

Um platformer retrô, de 8 bits, para as crianças: corra, pule, junte moedas e
chegue na bandeira. São 3 fases fixas e dá para jogar sozinho ou com até 8
amigos na mesma fase, cada um no seu aparelho.

> **Estado: em construção.** Esta é a **fase 14** do plano — o jogo solo está
> completo (as três fases em ordem fixa, o bônus da bandeira, a tela de
> **PARABÉNS** e a interface inteira: pausa, recomeçar, tela cheia e a caixa de
> controles) e o multijogador já joga de verdade: o **JOGAR COM AMIGOS** abre o
> lobby da Central, o anfitrião simula **um mundo só** para a sala inteira, o
> convidado adivinha o próprio corpo para o controle não ficar molenga, as
> moedas/blocos/bichos são de todos (quem pega, tira dos outros), **cada
> aparelho tem a sua câmera** centrada no próprio personagem, a **bandeira e os
> checkpoints são da sala**, **todo mundo vê o placar de todo mundo** (uma
> mini-lista no canto da tela durante a partida e o **ranking da sala** na tela
> de PARABÉNS) e agora a partida também **aguenta a rede dar errado**: quem sai
> some do mundo sem travar os outros, o anfitrião caindo aborta com aviso,
> pacote atrasado depois do fim vai para o lixo e mais de 2 segundos de silêncio
> viram a tarja **CONEXÃO INSTÁVEL**. E agora o jogo também **se joga no dedo**:
> no celular e no tablet a cruzeta e o botão de pular aparecem na tela, um para
> cada polegar. O que ainda **não** aconteceu é o polimento final (paleta,
> responsividade e o checklist de publicação) — é a etapa seguinte.

## Como jogar

| Tecla | O que faz |
|---|---|
| **←** **→** (ou **A** / **D**) | andar |
| **ESPAÇO** (ou **↑** / **W**) | pular |
| **P** | pausar / continuar |
| **ESC** | pausar |
| **F** | tela cheia (entra e sai) |

No celular e no tablet não há teclado: os controles aparecem **na própria tela**
(a cruzeta num canto, o pulo no outro). O passo a passo está em
[No celular e no tablet](#no-celular-e-no-tablet).

Clique em **JOGAR SOLO**, corra para a direita, junte moedas, acenda os
checkpoints, pule em cima dos bichos e chegue na bandeira. A bandeira fecha a
fase e abre a próxima: são três, uma depois da outra, e a da fase 3 traz a tela
de **PARABÉNS**.

## Pontuação

| O que | Vale |
|---|---|
| Encostar numa moeda | **+10** pontos |
| Pular em cima de um inimigo | **+20** pontos |
| Chegar na bandeira | **+50** pontos de bônus, no fim de cada fase |
| Quebrar um bloco | solta o cristal (enfeite); pontos, só os das moedas |

A fase 1 tem **100 moedas** — 1000 pontos se você pegar todas — mais os 4
bichos, que valem 20 cada; a fase 2 tem 80 moedas e 6 bichos, e a fase 3 tem 60
moedas e 6 bichos. Cada moeda some
de vez: uma vez pega, não volta mais durante a tentativa. O HUD no topo mostra
os pontos, os ❤️ e em que fase você está, e o número dos pontos sobe na hora em
que a moeda é encostada.

## Vidas e checkpoints

Cada tentativa começa com **3 ❤️**. Cair num buraco (ou esbarrar de frente num
bicho) custa **um coração** e o
herói reaparece **no último checkpoint aceso** — as moedas que ele já juntou
continuam juntadas e o placar não é mexido. Quando os corações acabam, a
**tentativa termina**: a fase inteira volta ao começo (moedas e blocos de volta
no lugar, checkpoints apagados, placar zerado e os 3 ❤️ cheios de novo). O
placar zera junto justamente para ninguém juntar as mesmas 100 moedas duas
vezes.

Os checkpoints são três mastros com bandeirinha por fase, plantados **logo
depois dos lugares onde dá para cair** (colunas 29, 63 e 87 na fase 1; 25, 76 e
105 na fase 2; 29, 82 e 108 na fase 3). Apagados eles são
cinza e a bandeirinha fica caída no pé; encostar acende: a bandeirinha sobe,
fica verde e solta faíscas. Uma vez aceso, o checkpoint **não expira** — vale
até o fim da tentativa, mesmo que o herói volte atrás ou caia várias vezes. O
que vale para renascer é sempre o **mais recente** que foi aceso.

Numa partida em grupo o mastro é **da sala**: quem encosta nele **acende para
todo mundo**, e dali em diante é ali que a sala inteira renasce — mesmo quem
ainda nem passou por ele. É a regra de checkpoint compartilhado do PRD, e ela
combina com o mundo compartilhado: se as moedas daquele trecho já foram
juntadas por alguém, não faz sentido mandar quem caiu de volta para o começo.
Os **corações**, esses, continuam sendo de cada um.

| Tombos na tentativa | O que acontece |
|---|---|
| 1º | −1 ❤️, volta ao último checkpoint (ou ao começo, se nenhum acendeu) |
| 2º | −1 ❤️, mesma coisa |
| 3º | acabaram os ❤️: a fase inteira recomeça do zero (numa sala, só ele volta — com os ❤️ cheios e o checkpoint do grupo) |

*Tombo* aqui é cair num buraco **ou** encostar de frente num inimigo: as duas
coisas custam o mesmo coração e usam o mesmo caminho de volta.

## Os blocos quebráveis

São 10 na fase 1, 5 na fase 2 e 8 espalhados pela fase 3, roxos e com um
cristal piscando dentro. Eles são **sólidos
enquanto estão de pé**: dá para pousar em cima e a cabeça bate na base deles.
Bater por baixo (ou pousar em cima) quebra o bloco — o cristal sai voando junto
com os cacos e o caminho abre, porque o bloco sai da lista de sólidos na mesma
hora. Vários deles têm uma moeda escondida logo abaixo: a cabeçada pega as duas
coisas de uma vez.

## Os inimigos

São dois tipos, os do PRD, e na fase 1 são **quatro bichos**: dois goombas
(cogumelos emburrados, marrons) e duas turtles (casco verde com a cabeça de
fora). Os dois patrulham do mesmo jeito.

| Coisa | Valor |
|---|---|
| Velocidade da patrulha | 2 px por quadro na fase 1, 3 px nas fases 2 e 3 |
| Onde eles viram | na parede, na beirada da plataforma e na ponta do mundo |
| Pular em cima | **+20** pontos, e o herói quica ~60 px |
| Encostar de qualquer outro jeito | **−1 ❤️** e de volta ao checkpoint |

A patrulha é ida e volta: o bicho anda para um lado até achar uma parede, o fim
da plataforma ou a ponta do mapa, e aí vira — gastando um quadro parado na
virada. Ele **não cai de bobeira**, mas tem gravidade: se o chão sumir debaixo
dele (um bloco quebrável quebrado, por exemplo), ele despenca até pousar no
próximo sólido.

O que muda entre os dois é o que acontece com quem leva o pisão:

- **Goomba:** some de vez. Não é desenhado nem colide mais.
- **Turtle:** vira **casco** — o mesmo casco verde, sem cabeça nem patas,
  mais baixinho (20 px em vez de 32), parado no lugar onde ela estava. O casco
  continua na tela como enfeite: dá para andar por cima dele, e ele não machuca
  nem rende pontos de novo.

Nenhum dos dois volta durante a partida. Quando o herói perde uma vida, os
bichos **ainda vivos** voltam para onde nasceram (senão ele renasceria com um
deles no colo), mas quem já foi derrotado continua derrotado. Isso é regra de
quem joga **sozinho**: numa sala os bichos são de todos e ninguém os move de
lugar por causa do tombo de um jogador — veja *Um mundo só, uma câmera para
cada um*. Só o reinício da
fase inteira — quando os ❤️ acabam — põe os quatro de pé outra vez.

Se no mesmo quadro o herói pisa num bicho e esbarra noutro, o **pisão ganha**:
quem estava no ataque não leva dano, do jeito que os platformers antigos sempre
fizeram.

Na **fase 3** os bichos são **espertos**: enxergando o herói a até 6 quadrados,
na mesma altura, eles largam a ida e volta e vão atrás dele — sempre na mesma
velocidade de 3 px por quadro, que é o que o PRD permite. Basta pular que o
herói some da vista e a patrulha normal volta; é por isso que o caminho deles
fica difícil de adivinhar. Eles continuam sem cair de bobeira: mesmo caçando,
param na beirada da plataforma.

## As três fases

| Fase | Tamanho | Moedas | Bichos | O que ela tem de diferente |
|---|---|---|---|---|
| 1 — Campo Aberto | 120 colunas | 100 | 4 a 2 px/quadro | buracos de 2 quadrados, degraus e plataformas soltas |
| 2 — Salto Alto | 128 colunas | 80 | 6 a 3 px/quadro | buracos por toda parte e uma ponte de plataformas soltas sobre um vão de 12 quadrados |
| 3 — Torre Movediça | 140 colunas | 60 | 6 a 3 px/quadro, espertos | três **pontes móveis** sobre vãos de 8 quadrados, um **elevador** e blocos espalhados |

## A corrida: fase 1 → 2 → 3

A partida solo é uma **corrida** pelas três fases, sempre nessa ordem e **sem
volta**: cada bandeira fecha a fase que estava em jogo e abre a seguinte.

1. A bandeira das fases 1 e 2 abre o quadro **"FASE N CONCLUÍDA"**, com o que a
   fase rendeu, o bônus de **+50** da bandeira e o botão **IR PARA A FASE N+1**.
2. A fase nova começa **do zero**: mundo novo, ❤️ cheios e o placar do HUD
   zerado — o que já foi ganho fica guardado no caderno da corrida.
3. A bandeira da **fase 3** termina a corrida e traz o **PARABÉNS!**, com uma
   linha por fase (`moedas e bichos + bônus = total da fase`) e o **total** da
   corrida inteira.
4. **JOGAR NOVAMENTE** recomeça tudo da fase 1, com o caderno em branco.

O HUD mostra sempre o placar **da fase** em jogo; o total das três fases só
aparece no fim, na tela de parabéns. Quem perde as três vidas repete a fase
inteira — mas nunca volta para uma fase que já venceu.

## Pausa, tela cheia e a caixa de controles

O HUD tem dois botões, à direita dos números — eles só aparecem com uma partida
em andamento, porque no menu não há nada para pausar:

| Botão | O que faz |
|---|---|
| **⏸** | pausa. Vira **▶** e o quadro de **PAUSA** aparece por cima da fase |
| **⛶** | tela cheia. Vira **🗗** enquanto estiver em tela cheia |

A pausa **congela o mundo**: o herói, os bichos, as plataformas móveis e o
relógio da partida ficam exatamente onde estavam. O que não para é o desenho —
a fase continua na tela, paradinha, atrás do quadro. As teclas que estavam
apertadas são soltas junto, senão o herói sairia correndo sozinho na hora de
continuar. O quadro de pausa tem dois caminhos:

- **CONTINUAR** volta para o mesmo lugar, do jeito que estava.
- **RECOMEÇAR** começa a corrida inteira de novo, da **fase 1**, com o placar,
  as vidas e o caderno da corrida zerados — é o mesmo caminho do "Jogar
  novamente" da tela de parabéns.

Pausar só vale com uma fase em andamento: no menu e nas telas de fim de fase o
botão (e as teclas) não fazem nada, porque ali o mundo já está parado.

A **tela cheia** é a Fullscreen API do navegador, pedida para o documento
inteiro (`<html>`) — assim funciona tanto com o `index.html` aberto direto
quanto dentro do iframe do catálogo (`/jogar/super_adventure`), que já vem com
`allowfullscreen`. Quem manda no botão é o navegador: ele avisa (pelo evento
`fullscreenchange`) quando entrou ou saiu, e é aí que o ⛶ vira 🗗 e vice-versa —
inclusive quando quem fecha a tela cheia é o **ESC** do próprio navegador.

No canto de baixo à direita do palco fica a **caixa de controles**
(`← → = Mover | ESPAÇO = Pular`), um cartaz que não recebe clique nenhum. Ela
aparece com o jogo rolando e some atrás de qualquer tela — menu, pausa, fim de
fase e parabéns. Num aparelho de dedo ela dá lugar aos **botões de toque**, que
ficam exatamente ali.

## No celular e no tablet

No vidro não existe seta nem barra de espaço, então os controles vêm para a
tela: a **cruzeta** (◀ ▶) no canto de baixo à esquerda e o **▲ pular** no de
baixo à direita — um para cada polegar, com o aparelho segurado nas duas mãos.

| Botão | O que faz |
|---|---|
| **◀** / **▶** | andar, igualzinho às setas |
| **▲** | pular |

Eles aparecem **só em aparelho de dedo** e ocupam o lugar da caixa de controles
— um cartaz falando de teclas não serve para quem não tem teclado, e ainda
ficaria bem debaixo do botão de pular. Quem decide é o navegador, pela pergunta
`(pointer: coarse)`: "quem aponta nesta tela é um dedo?". Se ele não souber
responder (navegador antigo, ou um notebook com tela sensível que só se revela
quando alguém encosta), o **primeiro toque** na página liga os botões assim
mesmo.

O que o dedo sabe fazer:

- **Dois polegares ao mesmo tempo.** Correr e pular são dois dedos, cada um no
  seu botão — não é preciso soltar um para apertar o outro.
- **Dois dedos no mesmo botão.** Tirar um não solta o botão; só o último solta.
- **Arrastar de um botão para o outro** sem tirar o dedo da tela: o ◀ apaga e o
  ▶ acende na hora, que é como se vira o herói correndo.
- **Nada de rolagem, zoom ou seleção** por baixo dos botões (`touch-action:
  none` neles e no palco, mais o `user-scalable=no` da página).

E o que ele **não** pode fazer é deixar o herói correndo sozinho. Larga tudo
quando: o jogo é **pausado**, alguma tela sobe por cima (fim de fase, parabéns),
a **aba perde o foco**, o toque é **cancelado** pelo aparelho (uma ligação
chegando) ou o aparelho é **girado** — girar costuma comer o "levantei o dedo"
do sistema.

Os botões escrevem no **mesmo** lugar que o teclado escreve, então a física, a
pausa e o multijogador não ficam sabendo de nada: para eles "direita apertada" é
"direita apertada", venha de onde vier. Num aparelho híbrido as duas coisas
convivem — tirar o dedo de um botão não solta a seta que a outra mão está
segurando.

## Jogar com amigos

O menu tem dois caminhos:

| Botão | O que faz |
|---|---|
| **JOGAR SOLO** | a corrida das 3 fases sozinho. Se você estava numa sala, ele sai dela |
| **JOGAR COM AMIGOS** | abre o **lobby da Central** |

O botão dos amigos **só aparece quando a Central está no ar**. Ele vem do
`/plataforma/sdk.js`, que é carregado com caminho absoluto: abrindo o
`index.html` direto do disco (dois cliques no arquivo), o SDK não carrega, o
`window.Plataforma` não existe, o botão continua escondido e o jogo inteiro
funciona igual, do menu até o PARABÉNS. Se o SDK carregar mas o servidor de
salas estiver fora do ar, dá na mesma: fica só o "Jogar solo".

O lobby é da plataforma, inteiro — o jogo não desenha nada dele:

1. Quem começa clica em **Criar sala** e ganha um **código de 4 letras** (sem
   `O`, `0`, `I` nem `1`, para a criança do lado conseguir copiar da tela).
2. Os amigos digitam esse código — ou clicam na sala na lista de **salas
   abertas aqui perto**, que aparece sozinha para quem está no mesmo wi-fi.
3. Todo mundo marca **Pronto** e o **anfitrião** (quem criou) aperta
   **Começar!**.
4. As telas de todos vão juntas para a fase 1, com o **código da sala no HUD**.

A sala vai de **1 a 8 jogadores**, é competitiva e quem simula é o anfitrião —
tudo declarado no `jogo.json`, no bloco `plataforma`.

Durante a partida em grupo, **JOGAR SOLO** larga a sala e continua a corrida
sozinho; **RECOMEÇAR** e **JOGAR NOVAMENTE** não largam nada, só recomeçam a
corrida. Se o anfitrião fechar a aba no meio, a plataforma avisa todo mundo: os
convidados voltam ao menu com o recado na tela, sem ninguém preso numa fase que
acabou.

### Quem manda no mundo

Começada a sala, existe **um mundo só** e quem roda ele é o **anfitrião**: o
mapa, as moedas, os blocos, os bichos, as plataformas e o corpo de *todos* os
jogadores. Vinte vezes por segundo ele manda para a sala um retrato desse mundo
em números inteiros — os convidados mandam de volta só as três teclas que estão
apertando.

### A previsão do convidado

Esperar o retrato para sair do lugar deixaria o controle **molenga**: entre
apertar a seta e ver o herói andar teria o vai-e-volta da rede inteiro. Então o
convidado **adivinha**. Ele roda a mesma física de sempre no próprio corpo, com
as teclas que acabou de mandar, e já sai andando no quadro em que o dedo
aperta — só o corpo dele, mais nada.

Adivinhar erra um pouquinho, porque o retrato que chega foi tirado há alguns
quadros. Quando ele chega, a posição adivinhada é **puxada para a oficial**:

| Erro | O que acontece |
|---|---|
| até **90 px** | anda **25% do caminho**, e o resto vem nos retratos seguintes — o olho não vê |
| acima de 90 px | **encaixa de uma vez**: o convidado tinha adivinhado outra história (caiu num buraco, levou um pisão, voltou ao checkpoint, mudou de fase) |

São os números da regra 4.1.2 do `AGENTS.md`. Na prática, com uns 6 quadros de
atraso de cada lado o erro fica na casa dos 25 px e some em menos de dez
retratos — meio segundo.

O que o convidado **não** adivinha: moeda, bloco quebrado, pisão em bicho,
checkpoint aceso e coração perdido. Isso daria ponto que o anfitrião não deu —
ele só fica sabendo pelo retrato, e é do retrato que saem as faíscas na tela.

### Um mundo só, uma câmera para cada um

As moedas, os blocos quebráveis e os bichos **não são de cada jogador: são do
mundo**. Quem encosta numa moeda tira ela da fase de todo mundo — na tela dos
outros ela some no retrato seguinte, com a mesma faísca — e os **+10 ficam só
com quem pegou**. Vale igual para o bloco que alguém quebra (some da tela de
todos e deixa de ser sólido para todos) e para o bicho que alguém pisa (some ou
vira casco para todos, e os +20 são de quem pulou em cima).

O que é de cada um continua sendo de cada um: os **pontos** e os **corações**.
Cair num buraco é problema de quem caiu — perde um coração e volta ao
checkpoint, e o mundo dos outros não é mexido: as moedas já pegas continuam
pegas e os bichos não voltam para o ninho. Quem fica sem corações, numa sala,
**recomeça sozinho** no checkpoint do grupo, com os corações cheios: a fase
inteira não recomeça, senão um tropeço de um jogador estragaria a partida dos
outros.

| Sozinho | Numa sala |
|---|---|
| Sem corações, a fase inteira recomeça (placar zerado) | Sem corações, só ele volta ao checkpoint do grupo, com o placar dele |
| Ao renascer, os bichos vivos voltam ao ninho | Os bichos são de todos: ninguém os move de lugar |
| O checkpoint aceso é seu | O checkpoint aceso é da sala inteira |

A **câmera é de cada aparelho**. O mundo é um só — o mapa, as posições e as
medidas são as do anfitrião, e o canvas tem sempre 960×540 por dentro em
qualquer tela, então as contas batem em todos os aparelhos —, mas cada um olha
a fase pela sua janela, **centrada no próprio personagem**. Quem está no meio
do mapa se vê no meio da tela; nas pontas a câmera trava para não mostrar o
lado de fora.

Os **outros jogadores aparecem quando entram no campo de visão**, cada um com a
**cor que a sala deu** (o macacão muda de cor; o resto do herói é igual). Quem
está longe demais simplesmente não é desenhado — e o jogador de casa é pintado
por último, para nunca ficar escondido atrás de outro.

### A bandeira e o checkpoint são da sala

A bandeira é **do grupo**: o **primeiro que encostar nela** — o anfitrião ou um
convidado do outro lado do mapa, tanto faz — fecha a fase **para todo mundo ao
mesmo tempo**. O quadro de fim de fase sobe na tela de todos, cada um com os
pontos que *ele* fez mais o bônus de +50, e diz o nome de quem chegou primeiro
("**Bento** chegou na bandeira primeiro 🚩"), para ninguém ficar sem entender
por que a fase acabou. Quem vira a página é o **anfitrião**, no botão **IR PARA
A FASE N** — nos convidados esse botão fica desligado e a fase nova entra
sozinha, no retrato seguinte.

O **checkpoint** funciona igual: o mastro que um jogador acende **acende para
todos** e vira o lugar onde a sala renasce. Ele viaja no mesmo retrato do mundo
(a lista de mastros acesos é a mesma em todas as linhas do placar), e a faísca
verde aparece na tela de quem estiver perto o bastante para ver.

| Quem faz | O que acontece com os outros |
|---|---|
| Encosta na **bandeira** | a fase acaba para todos, e o anfitrião leva a sala para a próxima |
| Acende um **checkpoint** | o mastro fica aceso para todos e passa a ser o nascedouro do grupo |
| Pega uma **moeda** / quebra um **bloco** / pisa num **bicho** | some para todos, mas os pontos são só de quem fez |
| **Cai** num buraco | ninguém mais é afetado: o mundo não recomeça |

### O placar de todos, em tempo real

Com uma sala aberta, o canto de cima à esquerda da tela ganha a **mini-lista do
placar**: a turma inteira, do primeiro para o último, com a **cor de cada um** e
os pontos que ele já fez. Ela anda sozinha — quem pega uma moeda do outro lado
do mapa aparece subindo na sua tela — e **a sua linha vem destacada**, para a
criança se achar no meio de oito nomes. No jogo solo essa lista não existe: lá o
placar é o do HUD.

O número da mini-lista é o **total da corrida**, e não só o da fase: as fases já
vencidas (com o bônus de +50 de cada bandeira) mais o que está sendo feito
agora. É esse o número que diz quem está ganhando de verdade numa disputa de
três fases — e ele viaja junto com o resto do mundo, no mesmo retrato que o
anfitrião manda 20 vezes por segundo.

### O ranking do fim

Quando a bandeira da **fase 3** cai, a corrida acaba para a sala inteira. O
anfitrião manda o último retrato (para todos verem a bandeira) e pede à Central
que **encerre a partida**, com o placar junto; o servidor devolve **o mesmo
placar para todo mundo, ao mesmo tempo**, e cada tela monta com ele o **RANKING
DA SALA** dentro da tela de PARABÉNS.

A lista vai do **pior para o melhor**: ela sobe degrau por degrau e termina no
campeão, que fecha o quadro em amarelo com o 🥇. O subtítulo fala com cada
criança ("Você foi o campeão da sala!", "Você ficou em 3º lugar na sala") e
quem empata em pontos divide o mesmo lugar.

Se a Central **não confirmar o fim em ~3 segundos** (a rede engasgou), cada tela
mostra o placar que ela mesma tem em vez de ficar esperando para sempre — e ele
bate com o das outras, porque o total de cada jogador já vinha viajando no
retrato. Terminada a partida, a sala volta ao lobby na Central: por isso o botão
da tela de fim vira **VOLTAR AO LOBBY**, de onde o anfitrião pode começar outra
corrida com a turma inteira.

### Quando a rede dá errado

Uma partida com oito crianças na rede de casa dá errado de quatro jeitos
conhecidos — e nenhum deles pode deixar alguém olhando para uma tela parada:

| O que aconteceu | O que o jogo faz |
|---|---|
| **Alguém sai no meio** (fechou a aba, o wi-fi caiu, clicou em *Jogar solo*) | a Central manda o aviso e cada aparelho tira aquela linha do mundo e do placar. A partida **continua** para quem ficou, com um jogador a menos |
| **O anfitrião cai** | era a máquina dele que simulava o mundo, então a partida **aborta**: todo mundo volta ao menu com o motivo na tarja vermelha e já pode jogar solo ou abrir o lobby de novo (a Central escolhe um anfitrião novo para a sala) |
| **Chega um pacote atrasado depois do fim** | vai para o lixo, sem barulho — aplicá-lo mexeria no mundo que ficou congelado atrás do ranking |
| **Mais de 2 segundos sem notícia da sala** | sobe a tarja **⚠ CONEXÃO INSTÁVEL** no alto do palco, e ela some sozinha no primeiro pacote que chegar |

Quem sai **some do placar na hora**: a mini-lista encolhe nas telas de todos e,
se sobrou uma pessoa só na sala, ela nem aparece mais — placar de sala é coisa
de grupo. O anfitrião deixa de simular aquele personagem no mesmo quadro, então
ele também para de viajar no retrato do mundo: ninguém fica com um boneco parado
no meio da fase.

Se o anfitrião cair **depois** da bandeira da fase 3, quando a única coisa que
faltava era o placar oficial, a tela de PARABÉNS não volta para o menu: ela
fecha com o **ranking daqui mesmo** (que bate com o dos outros, porque o total
de cada um viajava no retrato) e o motivo aparece na tarja. Ficar para sempre
num "juntando o placar da sala…" seria o pior dos mundos.

A tarja de conexão vale para os **dois lados**: o convidado espera o retrato do
anfitrião 20 vezes por segundo, e o anfitrião espera as teclas dos convidados na
mesma toada — dois segundos de silêncio já são muito. Numa sala de uma pessoa só
não há o que vigiar, e no jogo solo a tarja não existe. Um aviso: quem **pausa**
para de mandar pacote, então uma pausa longa de um amigo pode fazer a tarja
subir na tela dos outros — ela some assim que ele volta.

## As plataformas móveis (fase 3)

São pontes de ferro que andam sozinhas pelo trilho desenhado no mapa: **1 px
por quadro**, e param **24 quadros** (uns 0,4 s) em cada ponta antes de voltar.
A paradinha é de propósito — é ela que dá tempo de subir e de descer com calma.

Nas três **pontes deitadas** o trilho vai de ponta a ponta do vão, então numa
extremidade a plataforma fica rente ao chão de trás e na outra rente ao chão da
frente: dá para entrar e sair andando, sem pulo nenhum. O **elevador** sobe de
um poço até o alto de um paredão que não tem como ser pulado — é o único
caminho para o outro lado.

Quem está em cima **vai junto**: a física marca em qual plataforma o herói
pousou e, no quadro seguinte, ele é deslocado o mesmo tanto que ela andou antes
de dar o próprio passo. Nessa ordem o chão nunca escapa debaixo dos pés, nem
quando a plataforma desce.

## Como o herói se move

Os números são em **pixels por quadro**, num relógio fixo de **60 quadros por
segundo** — a física anda igual em qualquer aparelho, o que vai ser importante
quando o anfitrião simular o mundo para todo mundo no multijogador.

| Coisa | Valor |
|---|---|
| Andar | 3 px por quadro, para os dois lados |
| Parar | na hora que solta a tecla (sem inércia, sem derrapar) |
| Impulso do pulo | 15 px no primeiro quadro |
| Gravidade | 0,6 px por quadro, a cada quadro |
| Altura máxima do pulo | 120 px |
| Pulo duplo | não existe: só pula quem está com os pés no chão |

O impulso de 15 com gravidade 0,6 subiria bem mais que 120 px sozinho. Como nos
platformers clássicos, a subida é **cortada no teto do pulo**: o controle
responde na hora (impulso forte) e a altura fica exatamente na medida. Segurar a
tecla também não faz o herói ficar quicando — cada pulo precisa de um toque novo.

## A fase, desenhada em texto

O mapa é um tilemap: quadrados de 32×32 px escritos como texto dentro do
`game.js`, uma letra por quadrado.

| Letra | O que é |
|---|---|
| `.` | vazio |
| `#` | terra (o chão e os degraus) |
| `=` | plataforma solta |
| `o` | moeda (fica no meio do quadrado, 16×24 px) |
| `?` | bloco quebrável (tem um cristal dentro) |
| `C` | checkpoint (o herói renasce nele depois de aceso) |
| `g` | goomba (patrulha a plataforma abaixo da letra) |
| `t` | turtle (mesma coisa, mas vira casco quando é pisada) |
| `M` | plataforma móvel deitada (o trilho dela é o rastro de `-`) |
| `N` | elevador (o trilho dele é o rastro de barras verticais) |
| `P` | onde o herói nasce |
| `F` | a bandeira do fim |

Uma plataforma móvel é a **fileira** de `M` (ou de `N`) desenhada no mapa: ela
mede o tanto de quadrados que a fileira tem, e o rastro de trilho colado nela é
o trecho que ela percorre. Trilho e rastro são marcas de desenho — nenhum dos
dois é sólido.

`Mapa.ler()` transforma esse desenho nos retângulos sólidos que a física usa —
quadrados vizinhos da mesma linha viram **um** retângulo só, o que deixa a
colisão curta e barata. Os blocos quebráveis são a exceção: cada um fica sozinho
numa lista à parte, porque precisa poder sumir sem levar os vizinhos junto. A
fase 1 tem 120 colunas (3840 px, umas quatro telas), a fase 2 tem 128 e a fase
3 tem 140.

Os números do percurso saem direto da física: subindo 120 px o herói passa uns
31 quadros no ar e anda no máximo ~93 px na horizontal. Por isso os buracos têm
**2 quadrados** (64 px) e os degraus sobem **2 quadrados** — tudo com folga,
como uma fase fácil pede. Um teste confere que o maior buraco do mapa tem
mesmo 2 quadrados, e um piloto automático atravessa a fase inteira sem cair. Os
vãos maiores que isso — os das fases 2 e 3 — ou têm plataformas soltas formando
ponte, ou têm uma plataforma móvel atravessando; um teste confere que nenhum vão
grande ficou sem travessia.

A câmera é lateral: anda só na horizontal, centrada no herói, e trava nas duas
pontas do mundo. O fundo (nuvens e morros) anda pela metade da velocidade da
câmera, para dar sensação de distância.

## Decisões técnicas

- **Sem imagem nenhuma.** Tudo é desenhado no Canvas 2D com retângulos: o herói
  é um sprite de 16×16 quadradinhos de 2 px (ou seja, 32×32 px na tela), escrito
  como texto no próprio `game.js`. Paleta 8-bit chapada, sem desfoque nem
  degradê, com `image-rendering: pixelated`.
- **Herói genérico.** Nada de personagem de marca: é um aventureiro de boné
  vermelho e macacão azul, no clima dos consoles antigos.
- **Os dedos também são um estado puro** (`Toque`): um mapa "id do dedo" → ação
  mais um contador por ação. É dele que saem de graça os dois polegares ao mesmo
  tempo, os dois dedos no mesmo botão e o arrasto de um botão para o outro — e,
  sendo puro, ele é testado sem DOM nenhum.
- **Um caderno para cada mão, somados no fim.** O teclado escreve num `teclado`,
  os dedos no `Toque`, e `entrada` é a **soma** dos dois. Se um escrevesse por
  cima do outro, tirar o dedo de um botão soltaria a seta que a outra mão estava
  segurando — que é justamente o que acontece num notebook com tela sensível.
- **Eventos de ponteiro (`pointer*`), não `touch*` nem `mouse*`.** Um caminho só
  para dedo, caneta e mouse. Com um detalhe: no `pointerdown` o jogo **solta a
  captura implícita** que o navegador põe no botão — sem isso o dedo ficaria
  preso no primeiro botão em que encostou e arrastar para o vizinho não valeria.
  E por isso o "apertado" é uma classe posta pelo jogo, e não o `:active` do
  navegador, que fica preso do mesmo jeito.
- **Botões de 72 px (88 px o de pular).** Bem acima dos 44 px que se toma como
  mínimo confortável: aqui o dedo é de criança e o botão é apertado correndo.
- **ES5, IIFE, `'use strict'`, zero dependências, sem build** — o mesmo padrão
  da Galinha Feliz. O `index.html` abre direto no navegador, sem servidor.
- **A física mora em funções puras.** Os módulos `Fisica`, `Mapa`, `Itens` e
  `Camera` não tocam em DOM: recebem um corpo, o que está apertado e os limites
  do mundo, e devolvem um corpo novo. É o que os testes em Node exercitam, e é
  o que o convidado usa para prever o próprio personagem no multijogador: os
  dois lados rodam exatamente o mesmo `Fisica.passo()`.
- **Colisão AABB, resolvendo X e depois Y.** O jeito clássico: anda na
  horizontal e sai de dentro das paredes, depois anda na vertical e pousa na
  superfície mais alta que os pés cruzaram (ou bate a cabeça, se estava
  subindo). Mesmo caindo na velocidade máxima ninguém atravessa o chão.
- **O que existe no mundo é um estado à parte.** O mapa diz *onde* cada moeda e
  cada bloco estão (isso nunca muda); o estado dos itens diz *quais* ainda
  existem. `Itens.passo()` recebe esse estado e devolve um **novo**, mais o
  resumo do que aconteceu (moedas pegas, bloco quebrado, pontos). Quando nada
  acontece devolve o mesmo objeto, sem alocar nada. É esse desenho que vai
  deixar o anfitrião mandar o mundo pronto para os convidados no multijogador.
- **Os inimigos são mais um estado puro** (`Inimigos`), no mesmo molde: o mapa
  diz onde cada bicho nasceu, o estado diz onde ele está agora e como está
  (`vivo`, `casco` ou `morto`). `Inimigos.passo()` faz a patrulha e resolve o
  contato de uma vez, devolvendo um estado novo mais o resumo (quem foi
  derrotado, quantos pontos, se houve dano, se o herói quica).
- **Pisão é decidido pela altura dos pés, não pela direção da colisão:** vale
  como pisão quando o herói vinha descendo *e* os pés dele estavam, no quadro
  anterior, acima da metade do bicho. É a regra clássica, e é ela que evita o
  caso chato de "matei o goomba encostando de lado".
- **As vidas e os checkpoints também são um estado à parte** (`Progresso`), com
  as mesmas regras: `tocar()` acende o checkpoint em que o herói encostou e
  `perderVida()` diz se é para renascer no checkpoint ou recomeçar a fase. Puras
  as duas, e sem saber nada de tela — quando o anfitrião simular oito heróis de
  uma vez, cada um vai ser só mais um desses estados.
- **As plataformas móveis também são um estado puro** (`Moveis`), e o carregar
  é explícito: `Fisica.passo()` devolve em `apoio` o índice da plataforma em que
  o herói pousou, e `Moveis.carregar()` usa esse índice para somar no herói o
  quanto ela andou. Sem isso, uma plataforma descendo escapa debaixo dos pés e o
  herói fica "flutuando" atrás dela — o bug clássico de elevador.
- **A dificuldade é tempero de fase, não código novo:** cada fase declara
  `velInimigo` e `espertos`, e é isso que muda a velocidade da patrulha e liga a
  perseguição. O mesmo `Inimigos` roda nas três.
- **A corrida é mais um estado puro** (`Corrida`): um caderninho com uma linha
  por fase concluída (`{ numero, pontos, bonus, total }`), o total e qual é a
  próxima. Ele só anda para a frente — a regra "não dá para voltar de fase" mora
  aí, numa função pura, e não espalhada pelos botões da tela.
- **O bônus da bandeira é fixo (+50) e some do HUD:** o placar do HUD é o da
  fase, o bônus entra na conta na hora em que a fase é fechada. Assim quem
  repete uma fase depois de perder as vidas não acumula bônus de graça.
- **O checkpoint e a bandeira são o mesmo formato de "mastro"**: um retângulo de
  uma coluna que vai da letra até o primeiro chão abaixo dela. Assim dá para
  encostar neles andando pelo chão ou passando por cima, sem casos especiais.
- **O HUD é HTML, não canvas.** Pontos, vidas e fase ficam fora da tela do jogo:
  crescem junto com a página, continuam legíveis no celular e só são reescritos
  quando o número muda (nada de mexer no DOM 60 vezes por segundo).
- **Relógio fixo de 60 passos/s** no laço do jogo, com acumulador, para a
  simulação não depender da taxa de quadros da tela.
- **A pausa é um freio no `atualizar()`, não no laço:** o `requestAnimationFrame`
  continua rodando e desenhando; o que para é o passo da simulação. Assim a fase
  fica visível atrás do quadro de pausa e voltar não custa um "salto" — o
  acumulador de tempo é zerado enquanto está pausado, senão o jogo engoliria
  todos os quadros parados de uma vez ao continuar.
- **O `ESC` só pausa; quem tira da pausa é o botão ou o `P`.** Em tela cheia o
  `ESC` é do navegador (é ele que sai do fullscreen), então usá-lo para os dois
  lados deixaria a tecla imprevisível.
- **A tela cheia é pedida para o `<html>`**, e não para o `#palco`: é o que
  funciona igual com o jogo aberto direto e dentro do iframe do catálogo. O
  estado do botão vem do evento `fullscreenchange` do navegador, nunca de um
  palpite nosso — assim sair pelo `ESC` também acerta o ícone.
- **Quem sai é removido do mundo em todos os aparelhos, não só no anfitrião.**
  A Central manda o mesmo aviso para a sala inteira, e cada tela apaga aquela
  linha por conta própria: assim o retrato do mundo continua sendo só posição e
  pontos, sem precisar carregar a lista de quem está na sala 20 vezes por
  segundo.
- **Partida encerrada é encerrada:** depois que o ranking sobe, qualquer pacote
  que ainda estivesse a caminho — inclusive um `fim` atrasado da própria
  Central — é descartado e contado, e nada mais mexe no mundo. Sem isso, um
  retrato perdido podia trocar a fase (ou o placar) debaixo do nariz de quem
  está lendo o ranking.
- **A tarja de recado do palco é o último filho do `#palco`**, e por isso é
  pintada por cima até das telas de fim de fase e de parabéns: é ali que aparece
  o "conexão instável" e o motivo de uma partida que acabou no meio — os dois
  recados que valem mais do que a tela que estiver na frente.
- **O convidado prevê o corpo, nunca o placar.** A previsão local roda só o
  `Fisica.passo()` (e o passo das plataformas móveis, que são previsíveis): não
  pega moeda, não quebra bloco, não pisa em bicho, não acende checkpoint e não
  perde vida. Adivinhar isso daria ponto que o anfitrião não deu, e no primeiro
  desencontro dois jogadores achariam que pegaram a mesma moeda.
- **Correção de 25%, encaixe acima de 90 px** (regra 4.1.2 do `AGENTS.md`): o
  erro normal — o retrato é sempre alguns quadros mais velho que o dedo — some
  aos poucos e ninguém vê teleporte; o erro grande só acontece quando as duas
  simulações contaram histórias diferentes (morte, respawn, troca de fase), e aí
  disfarçar seria pior do que encaixar. Abaixo de meio pixel o corpo encosta de
  vez, para o resto do arredondamento não ficar arrastando para sempre.
- **No encaixe, `pularPreso` continua sendo o de casa.** É o único pedaço do
  corpo que o anfitrião não tem como saber melhor que o próprio aparelho: ele
  diz se a tecla de pular *já estava* apertada. Trocá-lo pelo do retrato faria o
  herói pular sozinho por estar com o espaço segurado.
- **A caixa de controles usa as setas (`← →`) no lugar das palavras
  "esquerda/direita":** ocupa menos canto de tela e é mais fácil de ler para
  quem ainda está aprendendo a ler. Ela é `pointer-events: none`, para nunca
  roubar um toque do jogo no tablet.
- **Manifesto pronto para a plataforma** (`jogo.json`): sala de 1 a 8 jogadores,
  modo competitivo, autoridade do anfitrião, estado 20×/s.
- **Toda a rede mora num módulo só** (`Rede`), e o resto do `game.js` não sabe
  que ela existe. O arquivo inteiro só entra nesse caminho no último pedaço, com
  `window.Plataforma ? ... : null` — é o que garante que o jogo aberto direto do
  disco (ou com o servidor fora do ar) continue sendo exatamente o mesmo jogo.
- **O lobby é o da plataforma, não o nosso.** Criar sala, código de 4 letras,
  lista de salas abertas, "pronto" e "começar" já vêm prontos no
  `/plataforma/sdk.js`; o jogo só diz o que fazer nos quatro momentos que
  interessam a ele (`aoComecar`, `aoReceber`, `aoTerminar`, `aoAbortar`). E vai
  com `voltarAoLobby: false`: depois da partida quem manda na tela é o jogo.
- **"Recomeçar" não larga a sala.** Só o "Jogar solo" sai — é o botão que a
  criança clica quando quer voltar a jogar sozinha, e é o único lugar em que
  sair da sala é o que ela pediu.
- **A bandeira é de quem chegar primeiro, e o anfitrião é quem confere.** O
  toque na bandeira é testado para *todos* os jogadores dentro do
  `simularMundo()` — que só o anfitrião roda —, e não na tela de cada um: assim
  não há duas fases acabando ao mesmo tempo com histórias diferentes. Se duas
  pessoas encostam no mesmo quadro, vale a primeira da lista (a ordem do
  `indice`, que é igual em todos os aparelhos). O retrato leva `q` (a fase
  acabou) e `w` (quem chegou), e é dali que sai o nome no quadro de fim de fase.
- **O checkpoint compartilhado é o mesmo `Progresso` de sempre, repetido.**
  `compartilhar()` acende o mastro na conta de quem *não* encostou nele, e o
  anfitrião chama isso para os outros jogadores no mesmo quadro
  (`acenderNoGrupo`). A lista de acesos fica idêntica em todas as linhas, então
  ela continua viajando no campo que já existia no retrato — nenhum byte novo — e
  o solo, que tem uma linha só, não muda em nada.
- **Quem fica sem corações numa sala não perde os mastros do grupo**
  (`renovarVidas`): eles são da *fase*, não dele. Apagá-los mandaria um jogador
  sozinho de volta a um começo que a sala inteira já deixou para trás.
- **O placar da sala é o total da corrida, não o da fase.** Cada jogador carrega
  dois números: `pontos` (o que ele fez nesta fase — é o número do HUD) e `total`
  (as fases já fechadas, com o bônus de +50 de cada bandeira). A mini-lista e o
  ranking somam os dois; quem fecha essa conta é sempre o anfitrião, e o `total`
  viaja no retrato do mundo. É por isso que o placar local de um convidado dá o
  mesmo resultado do oficial quando a Central demora a responder.
- **Quem encerra a partida é o anfitrião, pela plataforma.** Ele manda o último
  retrato *antes* de chamar `terminar(placar)`, para os convidados verem a
  bandeira cair; o placar oficial volta pelo `aoTerminar` de todo mundo, e é ele
  que vira ranking. Assim ninguém monta uma lista diferente da do vizinho.
- **~3 segundos de espera e o placar local entra** (regra da tabela 4.5). A tela
  de PARABÉNS sobe na hora, com o resumo da corrida; o que fica esperando é só o
  bloco do ranking, e ele nunca fica esperando para sempre.
- **O ranking vai do pior para o melhor.** É uma lista para criança ler em voz
  alta: ela sobe degrau por degrau e termina no campeão, em vez de entregar o
  vencedor na primeira linha e transformar o resto num consolo.
- **As linhas do placar são montadas com `textContent`, nunca com HTML.** O
  apelido vem da rede: ele entra na tela como texto e mais nada.

## Testes

Sem framework e sem nada novo no `package.json`: são scripts em Node que rodam o
`game.js` num `vm` com um DOM de mentira.

```bash
node --check jogos/super_adventure/game.js          # sintaxe
node testes/super_adventure/fase1.test.mjs          # física pura + manifesto
node testes/super_adventure/fase1-tela.test.mjs     # o jogo ligado, sem navegador
node testes/super_adventure/fase2.test.mjs          # tilemap, colisão, câmera, bandeira
node testes/super_adventure/fase2-tela.test.mjs     # a fase 1 percorrida até a bandeira
node testes/super_adventure/fase3.test.mjs          # moedas, blocos quebráveis, pontos
node testes/super_adventure/fase3-tela.test.mjs     # o placar e o HUD em tempo real
node testes/super_adventure/fase4.test.mjs          # checkpoints e vidas
node testes/super_adventure/fase4-tela.test.mjs     # cair, perder vida, voltar ao checkpoint
node testes/super_adventure/fase5.test.mjs          # patrulha, pisão e dano dos bichos
node testes/super_adventure/fase5-tela.test.mjs     # os inimigos dentro da partida
node testes/super_adventure/fase6a.test.mjs         # as 3 fases e as plataformas móveis
node testes/super_adventure/fase6a-tela.test.mjs    # as fases 2 e 3 até a bandeira
node testes/super_adventure/fase6b.test.mjs         # o caderno da corrida (pontos por fase)
node testes/super_adventure/fase6b-tela.test.mjs    # uma corrida inteira, fase 1 → 2 → 3
node testes/super_adventure/fase7-tela.test.mjs    # pausa, recomeçar, tela cheia e controles
node testes/super_adventure/fase8.test.mjs         # o jogo sem a Central (e a fiação do SDK)
node testes/super_adventure/fase8-tela.test.mjs    # 3 abas numa sala, por WebSocket de verdade
node testes/super_adventure/fase9.test.mjs         # o mundo único do anfitrião, com 3 jogadores
node testes/super_adventure/fase10.test.mjs        # a previsão do convidado, com latência
node testes/super_adventure/fase11.test.mjs        # o mundo compartilhado e a câmera de cada um
node testes/super_adventure/fase12.test.mjs        # a bandeira e o checkpoint da sala inteira
node testes/super_adventure/fase13.test.mjs        # o placar de todos e o ranking do fim
node testes/super_adventure/fase13-tela.test.mjs   # o ranking passando pela Central de verdade
node testes/super_adventure/fase14.test.mjs        # quem sai, quem cai e a rede que engasga
node testes/super_adventure/fase14-tela.test.mjs   # a sala se desmanchando de verdade
node testes/super_adventure/fasen1.test.mjs        # o caderninho dos dedos (módulo Toque)
node testes/super_adventure/fasen1-tela.test.mjs   # os botões de toque no palco
```

O `fasen1-tela.test.mjs` roda o jogo inteiro num DOM de mentira que **finge ser
um tablet** (o `matchMedia('(pointer: coarse)')` responde que sim) e dirige os
botões com os mesmos eventos que o navegador manda, um `pointerId` por dedo.
Assim dá para conferir sem aparelho nenhum que dois polegares correm e pulam
juntos, que dois dedos no mesmo botão não se atrapalham, que o arrasto de um
botão para o outro funciona — o DOM de mentira **não deixa** arrastar enquanto a
captura implícita estiver presa, então o teste falharia se o jogo esquecesse de
soltá-la — e que pausar, girar o aparelho, perder o foco ou trocar de tela
largam os dedos. No fim, duas cópias sem o `{ toque: true }` garantem que num
computador comum nada mudou.

O `fase8-tela.test.mjs` sobe o **servidor das salas de verdade** dentro do teste
(o mesmo `montarWebSocket()` e o mesmo `salas.js` do `server/src/plataforma/`,
numa porta sorteada) e abre três "abas": cada uma tem o seu canal WebSocket e a
sua cópia do jogo rodando no DOM de mentira. Uma cria a sala, as outras entram
pelo código, todas marcam pronto, a anfitriã começa — e as três caem na tela do
jogo. O lobby em si (que é HTML desenhado pelo SDK) fica de fora: o que o teste
usa é o miolo do SDK, com as mesmas mensagens e os mesmos ganchos.

O `fase11.test.mjs` põe três abas no mesmo mundo e confere as duas metades da
etapa: a moeda que um convidado pega some para todos (e os +10 são só dele), o
bloco que ele quebra sai dos sólidos de todo mundo, o bicho pisado não volta
para ninguém, um tombo não mexe no mundo dos outros — e, do outro lado, cada aba
tem a **sua** câmera: a geometria comparada é idêntica nas três, mas cada uma
pinta o pedaço do mapa que está debaixo do seu jogador, com os vizinhos
aparecendo (na cor da sala) só quando entram no campo de visão.

O `fase12.test.mjs` continua com as três abas e fecha as duas regras da sala. No
checkpoint: o mastro que **Bento** acende aparece aceso nas três abas e para os
três jogadores, e é lá que **Caio** — que nunca encostou nele — renasce quando
cai, inclusive depois de ficar sem corações (aí ele volta com os 3 ❤️ e o mastro
ainda aceso). Na bandeira: quem encosta primeiro é um **convidado**, e mesmo
assim a fase fecha nas três telas, cada uma com os seus pontos + 50, dizendo o
nome de quem chegou; o convidado não consegue virar a página sozinho e, quando a
anfitriã clica em "Ir para a fase 2", as três vão juntas — com os checkpoints
apagados de novo na fase nova. No fim, um teste sozinho confere que nada disso
mudou o jogo solo.

O `fase13.test.mjs` fecha o placar. Primeiro sem DOM nenhum, no módulo
`Placar`: a ordem (do melhor para o pior e ao contrário), o empate dividindo o
mesmo lugar, o que viaja para a plataforma e o que volta dela. Depois com as
três abas: a mini-lista aparece só em grupo, mostra os três com a cor da sala,
reordena quando alguém passa na frente e sobrevive à troca de fase (os pontos da
fase zeram, o total da corrida não). No fim das três fases, a anfitriã chama
`terminar()` com o placar do pior para o melhor, as três telas montam o mesmo
ranking com as medalhas, cada uma marcando a sua linha — e, num segundo teste
com a plataforma emudecida de propósito, as três desistem de esperar depois de
~3 segundos e mostram o placar local, que dá exatamente o mesmo resultado.

O `fase13-tela.test.mjs` repete o fim da partida com o **servidor de verdade** no
meio: o `terminar()` do jogo vira um `t: 'fim'` no canal, o `salas.js` devolve o
placar para a sala inteira e as três abas montam o ranking a partir dele. No fim,
a sala volta a aparecer na lista de salas abertas — é para lá que o botão da tela
de fim leva a criançada.

O `fase10.test.mjs` põe uma Central de mentira **com latência** entre as abas —
cada mensagem fica seis quadros na fila antes de ser entregue, nos dois
sentidos. É o que faz a previsão local aparecer: o convidado anda no quadro em
que a tecla é apertada, o erro contra o anfitrião chega a uns 25 px e desaparece
em menos de dez retratos, sem nenhum encaixe seco. Um erro plantado de 200 px
força o encaixe, como manda a regra dos 90 px.
