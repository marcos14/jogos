# Come-Come 🟡

Um labirinto de fliperama no clima dos consoles de 8 bits: corra pelos
corredores, coma todas as pastilhas e escape dos quatro fantasmas. Três
labirintos, cada um mais difícil que o anterior — sozinho ou com até 5 amigos
na mesma sala.

> **Estado de hoje: fase 9 do plano.** A **partida solo está inteira, com a
> moldura toda**, e o menu já tem as **duas portas**: *JOGAR SOZINHO* e *JOGAR
> COM AMIGOS*, que abre o lobby da Central e leva a turma para **um labirinto
> só, com um come-come por pessoa** — o mundo é o do anfitrião, e é ele quem
> simula todos. O jogo
> abre num **menu** (nome do jogo, campo do nome e os dois botões),
> tem **pausa** (botão do HUD, `P` ou `ESC`) que congela o mundo
> e oferece continuar ou recomeçar, **tela cheia** (botão do HUD ou `F`) e um
> **cartaz com o lembrete dos controles** no canto do labirinto. Dentro dela,
> os três labirintos vêm em fila, cada um limpo abrindo o seguinte, e limpar o
> terceiro fecha a corrida numa tela de **PARABÉNS** com o que cada fase rendeu
> e o total. Pelo caminho: os **quatro fantasmas** moram na casa do centro,
> saem um a um pela porta e caçam cada um do seu jeito, alternando com os
> respiros de dispersão pelos cantos; a **pastilha de poder** vira o jogo do
> avesso — os quatro ficam azuis, fogem em meia velocidade e podem ser comidos
> por 200, 400, 800 e 1600; **o jogo machuca** — encostar num fantasma que não
> está assustado custa uma vida, e quando as três acabam a partida termina numa
> tela de fim de jogo; e cada labirinto é **mais difícil que o anterior**, por
> uma tabela de dificuldade que mora num lugar só. Em grupo, falta as
> **pastilhas serem disputadas** (hoje o labirinto reage ao come-come de quem
> hospeda) e o **placar da sala** — as fases 11 a 13.

---

## Como se joga

Digite o seu nome na tela inicial e clique em **JOGAR SOZINHO** (o `Enter` no
campo faz o mesmo). O nome fica guardado no aparelho: da próxima vez ele já vem
escrito.

Se o jogo estiver aberto **pela Central** (e não direto do arquivo), aparece
também o botão **JOGAR COM AMIGOS** — é ele que abre a sala. Veja a seção
[Jogar com amigos](#jogar-com-amigos) mais abaixo.

| Tecla | O que faz |
|---|---|
| `←` `→` `↑` `↓` | virar para aquele lado |
| `A` `D` `W` `S` | a mesma coisa |
| `P` ou `ESC` | pausar |
| `F` | tela cheia |

A **pausa** congela o labirinto inteiro — o come-come, os fantasmas e o relógio
do feitiço ficam exatamente onde estavam — e traz dois caminhos: *CONTINUAR*,
que volta do mesmo ponto, e *RECOMEÇAR*, que joga a corrida fora e devolve o
jogo ao labirinto 1. Sair da aba (ou o tablet apagar a tela) **pausa sozinho**,
para ninguém voltar e encontrar as três vidas gastas. Girar o aparelho não
pausa nada: só refaz a conta do tamanho da tela.

O `ESC` só pausa, nunca despausa: em tela cheia ele é do navegador, e sair
dela não pode largar o jogo andando sem ninguém ter mandado.

### No celular e no tablet

No vidro não existe seta, então a curva é pedida com o dedo, de dois jeitos:

| Gesto | O que faz |
|---|---|
| **Deslizar** o dedo em cima do labirinto | pede a curva na direção do gesto (vale o eixo em que o dedo andou mais; um tremor de menos de 24px não conta) |
| Encostar numa seta da **cruzeta** (▲ ◀ ▶ ▼) | pede a curva daquele lado — não precisa segurar |

A cruzeta aparece **só em aparelho de dedo**, no lugar do cartaz das teclas.
Deitado ela fica na faixa à direita do labirinto, na altura do polegar; em pé,
logo abaixo dele. Dá para arrastar o polegar de uma seta para a outra sem
levantar, e dá para mudar de ideia no meio de um deslize: a conta recomeça de
onde o dedo está. Quem decide se o aparelho é de dedo é a pergunta
`(pointer: coarse)` ao navegador — e, se ele não souber responder, o primeiro
toque de verdade na página liga a cruzeta assim mesmo.

O pedido do dedo vai para o **mesmo lugar** que o da seta (`entrada.desejada`),
então a física, a pausa e a sala não ficam sabendo de onde veio. No menu, na
pausa e nas telas de fim nenhum toque guarda pedido nenhum. Os controles são
translúcidos e o HUD não rouba o toque: só os botões recebem clique. Aberto
pela Central, o celular é deitado sozinho quando o navegador deixa, e quando
não deixa a Central pede para girar.

O pedido **fica guardado**: dá para apertar a seta um pouco antes da esquina
que a curva sai certinha quando o corredor abrir. É assim nos fliperamas, e é
assim aqui.

Uma das linhas do labirinto é o **túnel**: quem sai por uma ponta dela entra
pela outra sem parar de andar. Cada labirinto tem o seu, e em cada um ele passa
por um lugar diferente.

O objetivo é **limpar o labirinto**: comer todas as pastilhas (244 no primeiro,
284 no segundo, 292 no terceiro). Quando a última some, a fase acabou — e o
botão do quadro *LABIRINTO LIMPO* leva para o próximo. Limpar os três fecha a
corrida na tela de **PARABÉNS**, com o resumo fase a fase e o botão de jogar de
novo, que recomeça tudo do labirinto 1.

As quatro **bolotas grandes** são as pastilhas de poder: morder uma deixa os
fantasmas azuis e comestíveis — por 8 segundos no labirinto 1, 6 no 2 e só 4
no 3. Enquanto elas piscam azul, corra atrás deles; quando começarem a
**piscar em branco**, o feitiço está acabando — largue a caça e volte a comer
pastilha.

Fora do feitiço, **encostar num fantasma custa uma vida**. São três: quando a
última se vai, o jogo acaba.

---

## A pontuação

| O que | Quanto vale |
|---|---|
| pastilha comum (`.`) | **10** pontos |
| pastilha de poder (`o`) | **50** pontos |
| 1º fantasma comido na mesma pastilha de poder | **200** pontos |
| 2º | **400** pontos |
| 3º | **800** pontos |
| 4º | **1 600** pontos |
| os quatro na mesma pastilha | **3 000** — mais que 300 pastilhas comuns |
| **as pastilhas do labirinto 1** | **2 600** (240 × 10 + 4 × 50) |
| **as pastilhas do labirinto 2** | **3 000** (280 × 10 + 4 × 50) |
| **as pastilhas do labirinto 3** | **3 080** (288 × 10 + 4 × 50) |
| **bônus por limpar um labirinto** | **500** — meia centena de pastilhas de presente |

Cada pastilha conta **uma vez só**: o come-come come a que estiver debaixo dos
pés dele, ela some da tela e o quadrado fica limpo para sempre — voltar por
cima não rende mais nada.

A **escada dos fantasmas zera a cada pastilha de poder nova**: comer dois numa
bolota e dois na seguinte rende 200 + 400 duas vezes (1 200), e não os 3 000 de
comer os quatro na mesma. Vale a pena esperar todos se aproximarem antes de
morder a bolota.

Perder uma vida **não tira ponto nenhum**: o que a criança já comeu é dela, e
continua no placar até o fim da partida.

O **total da corrida** é a soma das três fases mais os três bônus — uma partida
perfeita, sem comer fantasma nenhum, dá 2 600 + 3 000 + 3 080 + 3 × 500 =
**10 180 pontos**. Ele aparece nas telas de fim: na de PARABÉNS, com uma linha
por labirinto, e na de fim de jogo, com o que a corrida rendeu até o tombo
final.

O HUD, em cima do labirinto, mostra quatro números:

| Caixa | O que é |
|---|---|
| **Pontos** | o que a **fase** rendeu até agora (o total da corrida só aparece no fim) |
| **Vidas** | 🟡🟡🟡 — três, como no fliperama; some uma a cada tombo |
| **Fase** | qual dos três labirintos está em jogo |
| **Faltam** | quantas pastilhas ainda estão de pé; zerou, a fase acabou |

---

## Os quatro fantasmas

No centro do labirinto há uma casa, e dentro dela moram quatro fantasmas — cada
um com a sua cor e o seu tempo de espera:

| Fantasma | Cor | Sai depois de |
|---|---|---|
| Vermelho (`perseguidor`) | 🔴 | já começa na rua |
| Rosa (`emboscador`) | 🌸 | 2 segundos |
| Azul (`tímido`) | 🔵 | 4 segundos |
| Laranja (`aleatório`) | 🟠 | 6 segundos |

Quem espera **balança no lugar**. Chegada a hora, o fantasma anda até a coluna
da porta, sobe por ela e cai na rua. A porta é o **único lugar do desenho que
só eles atravessam** — e mesmo assim só de dentro para fora: já solto no
labirinto, ele usa as regras normais, e para elas a porta é parede como
qualquer outra. Ninguém volta para casa por vontade própria.

Na rua, a decisão é a do fliperama e cabe em três linhas: em **cada centro de
quadrado**, olhe as saídas, **jogue fora a meia-volta** e fique com a que deixa
o vizinho mais perto do **alvo**. Empatou, vence a ordem `cima`, `esquerda`,
`baixo`, `direita`. Repare no que essa regra faz sozinha: num corredor comprido
sobra uma saída só, então não há escolha nenhuma — e é assim que eles entram no
túnel e saem do outro lado sem uma linha de código a mais.

O **alvo chega de fora**, de propósito: o `Fantasmas` sabe *andar* até um alvo,
e não de quem o alvo é. Quem calcula o alvo de cada um é o `Personalidades`,
logo abaixo.

Cada um é desenhado com a cúpula redonda rasterizada na mão, a saia balançando
em pés de 4px (a onda troca de lugar a cada 8 quadros, e é o que faz ele
parecer que flutua) e dois olhos com a **pupila correndo para o lado em que ele
anda** — que é o único jeito de a criança saber, de longe, para onde o fantasma
vai.

---

## Cada um caça do seu jeito

O que faz o jogo ser jogo é que os quatro **não pensam igual**. Na caça, cada
personalidade mira um lugar diferente:

| Fantasma | Onde ele mira | O que se sente jogando |
|---|---|---|
| Vermelho — `perseguidor` | o quadrado em que o come-come **está** | é a sombra: se você parar, ele chega |
| Rosa — `emboscador` | **4 quadrados à frente** do come-come, na direção em que ele anda | aparece pela esquina de lá, cortando o caminho |
| Azul — `tímido` | de **longe** (mais de 8 quadrados) ele caça junto; de perto, se acanha e volta para o canto dele | o cerco quase fecha e afrouxa |
| Laranja — `aleatório` | um lugar **sorteado** do labirinto, trocado a cada meio segundo | é o imprevisível: às vezes salva, às vezes atrapalha |

## Dispersar e caçar

Os fantasmas não caçam a partida inteira. A tabela do fliperama alterna
**dispersão** (o respiro) e **caça**:

| Ordem | Humor | Quanto dura |
|---|---|---|
| 1ª | dispersar | 7 s |
| 2ª | caçar | 20 s |
| 3ª | dispersar | 7 s |
| 4ª | caçar | 20 s |
| 5ª | dispersar | 5 s |
| 6ª | caçar | 20 s |
| 7ª | dispersar | 5 s |
| 8ª | caçar | **para sempre** |

Na dispersão ninguém mira o come-come: cada um vai para o **seu canto** — o
vermelho para cima à direita, o rosa para cima à esquerda, o azul para baixo à
direita e o laranja para baixo à esquerda. O canto fica na **parede da borda**,
onde ninguém chega: é justamente por isso que o fantasma acaba dando voltas
pelo quadrante dele em vez de estacionar em algum lugar.

E o detalhe que a criança percebe sem ninguém explicar: **na virada do humor,
todos que estão na rua dão meia-volta na hora**, no meio do corredor mesmo. É o
aviso de que eles mudaram de ideia — e a brecha para escapar de um cerco.

O sorteio do laranja não usa `Math.random()`: usa um gerador de bolso com
**semente** (`Sorteio`). O motivo aparece no multijogador — numa sala, os cinco
aparelhos precisam ver o laranja andar exatamente igual, e para isso o sorteio
tem que sair de um número combinado, que é a semente que a Central manda no
começo da partida. Sozinho, a semente é um número fixo do jogo.

---

## A pastilha de poder

As quatro bolotas grandes (`o` no desenho) ficam nos cantos, longe umas das
outras de propósito: cada uma é uma chance de virar o jogo, e gastá-las de
qualquer jeito é o erro mais comum.

Morder uma faz **quatro coisas ao mesmo tempo**:

1. os quatro fantasmas ficam **azuis**, de cara boba — inclusive os que ainda
   estão dentro da casa;
2. quem está na rua **dá meia-volta na hora**, como na virada do humor;
3. eles passam a andar em **meia velocidade** e, em vez de caçar, escolhem em
   cada esquina a saída que mais **afasta** do come-come;
4. o **relógio dispersar↔caçar para**. Acabado o feitiço, os quatro voltam
   exatamente ao ciclo em que estavam — e sem meia-volta nenhuma, como no
   fliperama.

O feitiço dura **8 segundos no labirinto 1**. Nos últimos **2 segundos** eles
piscam entre o azul e o branco: é o aviso, e o único que a criança precisa.
A duração é uma propriedade **do labirinto** (`poder`, na lista de labirintos),
e não um número solto no meio do código — é assim que os labirintos 2 e 3 vão
encurtar o feitiço sem que nada mais mude.

Encostar num fantasma azul o **come**: ele vale o próximo degrau da escada
(200, 400, 800, 1600 dentro da mesma bolota), vira um **par de olhos** e corre
de volta para casa — mais rápido do que qualquer fantasma anda, pela mesma
regra de esquina de sempre, só que com a porta da casa como alvo. Chegando lá
ele desce pela porta, espera um segundinho e **renasce inteiro**, já no humor
que estiver valendo. Olhos não se comem duas vezes, e olhos não se assustam com
bolota nenhuma.

Um detalhe que parece bobagem e não é: a meia velocidade do medo é feita
andando **um quadro sim, um não** — e não com 1px por quadro. Com 1px o corpo
pararia numa coordenada ímpar e, quando o feitiço acabasse e a velocidade
voltasse a 2px, ele nunca mais acertaria o centro de um quadrado: deixaria de
virar nas esquinas e sairia atravessando parede. Pelo mesmo motivo, o fantasma
comido é **encaixado no centro** do quadrado na hora em que vira olhos, que
correm a 4px por quadro.

---

## O tombo, as vidas e o reinício da rodada

Fora do feitiço da pastilha de poder, os quatro são **caçadores**: encostar num
deles custa uma vida. Assustado, nunca — aquele se come, e vale a escada. E um
par de olhos voltando para casa não é nem uma coisa nem outra: ele só quer
chegar.

Pego, o mundo inteiro **para por um segundo e meio**. Nos primeiros dois terços
dessa pausa o come-come vai abrindo a boca até não sobrar nada dele — o adeus
dos fliperamas —, e os fantasmas somem da tela na hora: o que a criança precisa
ver ali é ela mesma indo embora, e não quem a pegou. No terço final o labirinto
fica vazio, o respiro antes de todo mundo voltar.

Passada a pausa, **volta tudo para o lugar de começo**: o come-come no `P` do
desenho, os quatro na casa com os mesmos tempos de saída de sempre (6 segundos
até o último pisar na rua), o relógio dispersar↔caçar do zero e nenhum feitiço
valendo. O que **não** volta é o labirinto: cada pastilha já comida continua
comida, e os pontos continuam no placar. Sem isso o tombo apagaria a fase
inteira, e ninguém chegaria ao fim de um labirinto de 244 pastilhas.

Uma regra pequena que faz toda a diferença: **uma vida por rodada**. Enquanto a
pausa corre, encostar de novo não tira nada — sem isso o cerco dos quatro
custaria as três vidas no mesmo quadro, e a criança não entenderia por quê.

Zerando as vidas no jogo solo, sobe a tela de **FIM DE JOGO** com os pontos e a
fase em que a partida parou. Em grupo, quem zera as vidas vira espectador:
some do labirinto, continua vendo a partida e volta com as vidas cheias no
labirinto seguinte. Se todo mundo cair antes da última pastilha, a corrida da
sala termina ali.

---

## Os três labirintos

| # | Nome | Pastilhas | Túnel | O que muda |
|---|---|---|---|---|
| 1 | **Praça Redonda** | 244 | na linha do meio, atravessando a casa | corredores largos e muita volta para dar |
| 2 | **Vila Estreita** | 284 | na rua **debaixo** da casa | quarteirões pequenos: a esquina de fuga está sempre um passo mais longe |
| 3 | **Avenida Longa** | 292 | na rua **em frente à porta** da casa | quarteirões grandes, de corredor comprido — e corredor comprido é onde quem corre mais alcança |

E a **tabela de dificuldade**, que mora num lugar só no `game.js` (a lista
`DIFICULDADE`, uma linha por fase):

| | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| a pastilha de poder dura | 8 s | 6 s | 4 s |
| pressa dos fantasmas (vermelho, rosa, azul, laranja) | 0, 0, 0, 0 | 1, 1, 0, 0 | 1, 1, 1, 1 |
| eles saem da casa em | 0, 2, 4, 6 s | 0, 1½, 3, 4½ s | 0, 1, 2, 3 s |
| tempo total dispersando | 24 s | 18 s | 14 s |
| tempo total caçando (antes da caça sem fim) | 60 s | 75 s | 90 s |

A **pressa** é o degrau de velocidade, e é o oposto exato da meia velocidade do
medo: em vez de *pular* um quadro, o fantasma anda **duas vezes** num quadro,
de 16 em 16 quadros. Pressa 1 são 106% da velocidade do come-come. É o único
jeito de correr mais sem sair da grade de 2px — com 3px por quadro o corpo
nunca mais acertaria o centro de um quadrado, e um corpo fora dos centros não
vira nas esquinas nem enxerga parede. Ninguém passa disso: um fantasma bem mais
rápido que o come-come não é dificuldade, é beco sem saída.

---

## O labirinto, escrito como texto

Cada labirinto do jogo é um desenho em texto dentro do `game.js`, uma letra por
quadrado de 16×16 pixels. Todos têm 28 colunas por 31 linhas — 448×496 pixels,
que é o tamanho de dentro do canvas.

| Letra | O que é |
|---|---|
| `#` | parede |
| `.` | pastilha |
| `o` | pastilha de poder |
| `-` | a porta da casa dos fantasmas (parede para o come-come) |
| `P` | onde o come-come nasce |
| `T` | a boca do túnel — uma em cada ponta da mesma linha |
| (espaço) | chão vazio, sem pastilha nenhuma |

Trecho do labirinto 1:

```
#o..##.......P .......##..o#
###.##.##.########.##.##.###
```

A **linha do túnel** é a que começa e termina com `T`. Nela, o vizinho da ponta
esquerda é a ponta direita — e `Mapa.vizinho()` já devolve o vizinho com essa
volta feita, de modo que o resto do jogo não precisa saber do assunto.

A **casa dos fantasmas** também sai do desenho sozinha, e nenhum labirinto
precisa apontá-la à mão: `Mapa.ler()` acha o `-` mais em cima, vê de que lado
dele está a rua (o outro é o miolo), enche a casa a partir de dentro — a porta
não é chão, então a água nunca vaza — e daí saem o retângulo da casa e os
quatro lugares dos fantasmas: a rua diante da porta, onde o primeiro já nasce,
e três pontos na linha do meio do miolo.

Ler o desenho também monta a tabela `quadrado → pastilha dali`, que é o que
`Mapa.pastilhaEm()` consulta. É a pergunta que o come-come faz **a cada
quadro** ("tem comida debaixo dos meus pés?"), então ela é uma consulta direta,
e não uma varredura nas 244.

Como tudo sai do desenho — a casa, a porta, o nascimento, as bolotas e a linha
do túnel —, **um labirinto novo é um texto novo, e nada mais**. A linha da
tabela de dificuldade viaja grudada no mapa (`mapa.dificuldade`), então quem
carrega um labirinto carrega junto as regras dele: `irParaFase(n)` troca o
desenho, repõe as pastilhas e recomeça a rodada já com o feitiço, a pressa, os
tempos de saída e os ciclos daquela fase.

---

## Jogar com amigos

O botão **JOGAR COM AMIGOS** só existe quando o jogo é servido pela Central: o
`index.html` carrega o `/plataforma/sdk.js` — o **único caminho absoluto** do
jogo — e, aberto direto do disco, esse arquivo simplesmente não existe. Sem
ele, `window.Plataforma` é `undefined`, o botão continua escondido e o jogo é
exatamente o de sempre, inteiro, do menu ao PARABÉNS.

Com a Central no ar, clicar nele abre o **lobby da plataforma** — que o jogo
não redesenha: o nome, o botão de criar sala, o código de 4 letras, a lista de
salas abertas na rede de casa, quem já chegou e o botão de começar são todos
dela. O nome digitado no menu vira o apelido da sala (campo vazio não apaga o
nome que já estava guardado — o próprio lobby tem um campo para isso).

Começada a sala, as telas viram a página juntas: todo mundo cai no **labirinto
1**, com o **código da sala no HUD** e cada aparelho sabendo se é `anfitriao`
ou `convidado`. Daí em diante o jogo tem sempre por onde sair, porque ninguém
pode ficar preso numa tela parada:

| O que aconteceu | O que o jogo faz |
|---|---|
| **JOGAR SOZINHO**, a qualquer momento | larga a sala (`sair()`) e recomeça a corrida de um jogador só |
| A Central encerra a partida (`aoTerminar`) | todos voltam ao menu com o recado na tarja |
| O anfitrião cai (`aoAbortar`) | todos voltam ao menu com o **motivo** na tarja vermelha, prontos para jogar sozinhos ou abrir outra sala |
| Chega pacote de uma sala que já acabou | é ignorado, sem barulho |

Apelido, cor e motivo **vêm de outro aparelho**: são dados, não código. Tudo o
que vem de fora entra na tela por `textContent`, nunca por `innerHTML` — e a
cor passa antes por um `corSegura()` que só deixa passar `#rgb` de verdade
(`/^#[0-9a-fA-F]{3,8}$/`). Uma cor recusada não vira `style` nem pincel: sobra
a paleta de casa, na ordem do `indice`.

### Um labirinto só, e ele é o do anfitrião

Começada a sala, o labirinto é **um só** e tem **um come-come por pessoa**:
cada um nasce num canto diferente e é pintado com a **cor que a Central
escolheu para ele** — a mesma que o lobby já mostrava na lista de quem chegou,
e a mesma nos cinco aparelhos. A identidade de cada um dentro da partida é o
`indice` da sala; sem sala (ou com uma cor estranha no meio do caminho) sobra a
paleta de casa, cujo primeiro é o amarelo de sempre, o do jogo sozinho. O HUD
ganha, em grupo, uma caixa **VOCÊ É** com o seu nome escrito nessa cor: é o que
faz a criança achar o come-come dela num relance no meio de cinco. Onde cada um
nasce sai de uma conta sem sorteio nenhum: o primeiro no `P` do desenho e, daí
em diante, o corredor **mais longe** de todos os já escolhidos. Quem faz o
mundo andar é o **anfitrião**, sozinho:

```
 CONVIDADO                 ANFITRIÃO                  CONVIDADO
 a direção  ------------->  simula o mundo  -------->  desenha
 (20x/s)                    inteiro, com todos         (20x/s)
```

O convidado manda **só a direção que quer** (`{ k:'i', n, d }` — três campos) e
não simula nada; o anfitrião roda o mesmo `atualizar()` de sempre, agora com a
lista inteira de come-comes dentro, e manda 20 vezes por segundo o **retrato
completo** do mundo: onde está cada pessoa, os quatro fantasmas, quais
pastilhas já sumiram (em bits), o feitiço da bolota, a rodada e a fila curta de
**avisos**. Com a sala cheia dá **278 bytes**, e 458 no pior caso imaginável (o
labirinto quase limpo e a fila de avisos no teto) — bem abaixo dos 2 KB que o
[AGENTS.md](../../AGENTS.md) pede.

Três decisões que valem por todas:

- **Estado inteiro, nunca diferença.** Cada pacote é o mundo completo e
  numerado. Um que se perde no caminho não desalinha nada: o próximo já traz
  tudo de novo — e um que chega fora de ordem vai para o lixo.
- **A geometria é a do anfitrião.** Se ele vira a página para o labirinto
  seguinte, o número da fase vem no retrato e as outras telas viram junto,
  antes de ler qualquer posição — senão as pastilhas seriam lidas com o desenho
  errado.
- **Efeito é local.** Nenhum pixel viaja: o que viaja é o *aviso* ("fulano
  mordeu a bolota aqui", "comeu um fantasma ali, por 400"), e cada aparelho
  solta a mesma faísca no mesmo lugar, na cor de quem fez a jogada.

### O controle responde na hora: a previsão local

Esperar o retrato do anfitrião para sair do lugar deixaria o controle
"molenga" — e num labirinto isso não é um detalhe: é a diferença entre virar a
esquina e bater na parede. Por isso o convidado **adivinha o próprio
come-come**, rodando a mesmíssima `Movimento.passo()` que o anfitrião roda, com
a direção que ele acabou de pedir. A esquina dobra **no quadro em que a tecla é
apertada**.

Ele adivinha **só o corpo dele**. Pastilha, fantasma, poder, vida e ponto são do
anfitrião — passar por cima de uma pastilha na tela do convidado não some com
ela nem dá ponto nenhum: ela some quando o retrato disser que sumiu. Adivinhar
isso seria duas telas contando histórias diferentes, que é justamente o que o
modelo do anfitrião existe para evitar.

Quando o retrato chega, o `Previsao` casa o que foi adivinhado com o que veio:

| Situação | O que acontece |
|---|---|
| erro de até 90px, **no mesmo corredor** | anda 25% do caminho, e o resto vem nos retratos seguintes — ninguém vê teleporte |
| erro maior, ou **em outro corredor** | encaixa de uma vez |

Os 25% e os 90px são a regra 4.1.2 do [AGENTS.md](../../AGENTS.md). O "mesmo
corredor" é o que o labirinto acrescenta a ela, e vale explicar:

- **Não existe meio caminho entre dois corredores.** Puxar o come-come 25% na
  diagonal o poria dentro da parede que separa um do outro. Quando o anfitrião
  dobrou uma esquina que a previsão daqui não dobrou, o único ajuste honesto é
  o encaixe seco — e ele é pequeno, porque duas esquinas vizinhas são perto.
- **A grade tem que continuar honesta.** Uma correção de 1,5px tiraria o corpo
  do trilho de 2 em 2 pixels para sempre: ele nunca mais acertaria o centro de
  um quadrado, e nunca mais viraria uma esquina. Por isso a correção anda em
  passos **inteiros** de 2px, e só no eixo em que o corpo está indo — o eixo de
  travessia não é uma dimensão livre num labirinto, é o corredor.

Junto com isso, a **direção nova não espera a batida da taxa**: ela sobe no
quadro em que a tecla é apertada, e não até três quadros depois. Sem isso o
anfitrião perderia a esquina que a previsão daqui já dobrou, e o retrato
seguinte mandaria o come-come de volta. Custa pouco — só a *mudança* sobe fora
de hora, nunca duas vezes seguidas.

O que a correção não desfaz é a **idade do retrato**: ele conta onde o
come-come estava há alguns quadros, então a previsão assenta um tiquinho atrás
do anfitrião — tantos pixels quanto a rede demorar. Na rede de casa, que é onde
este jogo roda, é um ou dois pixels; é o preço de não carregar histórico
nenhum, e é barato perto do que se ganha.

### O labirinto é um só, e é disputado

Um mundo só quer dizer **uma pastilha só**: a que alguém come some na mesma
hora nas cinco telas, e não volta. Mas os **pontos ficam com quem chegou
primeiro** — é o `modo: competitivo` do manifesto. Quem passar por cima do
quadrado depois não ganha nada, porque não há mais nada ali.

| O que é | De quem é |
|---|---|
| a pastilha comida (e o contador do que falta) | do **labirinto**: some para todos, na mesma hora |
| os 10 (ou os 50 da bolota) que ela rendeu | de **quem a comeu**, e de mais ninguém |
| o feitiço da bolota — os quatro azuis, o relógio, o piscar do aviso | da **sala inteira**: uma bolota assusta os fantasmas para todo mundo |
| a escada 200 / 400 / 800 / 1600 | de **cada pessoa**: dois caçando ao mesmo tempo ganham 200 cada, e não 200 e 400 |
| o fantasma azul em si | do **labirinto**: quem chegar primeiro leva, e para os outros ele já é um par de olhos correndo para casa |

A escada por pessoa mora no próprio `Poder`: além do `comidos` (o total da
sala) ele guarda um `escada`, um degrau por `indice`, que zera para todo mundo
a cada bolota nova. Esses números viajam no retrato do mundo (`p[4 + indice]`),
senão a tela do convidado contaria 400 num fantasma que, para o anfitrião,
ainda valia 200.

E os fantasmas passam a ter de quem cuidar: cada um mira o **come-come mais
perto dele**, sem largar a personalidade — o vermelho continua indo em cima, o
rosa continua cortando quatro casas à frente, o azul continua se acanhando de
perto e o laranja continua sorteando. Assim os quatro se repartem pelo labirinto
em vez de cercarem uma pessoa só enquanto as outras comem em paz; assustado,
cada um foge exatamente de quem estava cuidando. Empate de distância resolve
pela ordem do `indice`, que é a mesma nos cinco aparelhos — o mundo do anfitrião
tem que dar o mesmo filme quando outra tela precisar recontar a história.

As regras da sala já valem para a corrida: a última pastilha fecha a fase para
todo mundo, só o anfitrião abre o próximo labirinto, quem zera as vidas assiste
até a fase seguinte e ninguém pausa o mundo dos outros. O placar completo da
sala fica para a fase 13.

---

## Decisões técnicas

**Sem build, sem dependência, sem imagem.** O `index.html` abre sozinho, direto
do disco. O `game.js` é ES5 dentro de uma IIFE com `'use strict'` — roda em
tablet velho. Tudo o que aparece na tela é retângulo pintado no Canvas 2D:
as paredes são blocos com um brilho de 2px nas beiradas que dão para o
corredor, as pastilhas são quadradinhos, e o come-come é um círculo de 16px
**rasterizado na mão**, linha por linha, com uma fatia tirada fora — a boca —
apontando para onde ele anda.

**O miolo do jogo mora em módulos puros**, publicados em `window.ComeCome`:

| Módulo | O que faz |
|---|---|
| `Mapa` | lê o desenho em texto e devolve a grade (paredes, pastilhas, poderes, porta da casa, nascimento e as linhas de túnel) |
| `Movimento` | um quadro de movimento na grade: direção atual + direção desejada, parada na parede, alinhamento no meio do corredor e a volta do túnel |
| `Pastilhas` | o caderninho do labirinto: quais pastilhas ainda estão de pé, o que rende comer a do quadrado em que o come-come está, e quantas faltam |
| `Fantasmas` | os quatro corpos: a espera na casa, a rota da porta, a escolha da saída que mais aproxima do alvo recebido (ou que mais afasta, fugindo), a meia-volta de todos na virada do humor, o susto da pastilha de poder e a volta para casa de quem foi comido |
| `Poder` | o cronômetro da pastilha de poder: quanto o feitiço ainda dura (o mesmo para a sala inteira), quando o aviso começa a piscar e quanto vale o próximo fantasma na escada 200/400/800/1600 **de cada pessoa** |
| `Rodada` | as vidas e o tombo: quem machuca, quem encostou, a pausa curta que congela o mundo e o reinício que repõe as posições **sem** repor as pastilhas |
| `Personalidades` | de quem é o alvo: primeiro **qual** come-come (o mais perto deste fantasma), depois o quadrado dele, quatro casas à frente, a coragem que depende da distância, o lugar sorteado — ou, na dispersão, o canto de cada um |
| `Sorteio` | o gerador de bolso com semente: a mesma semente dá a mesma sequência em qualquer aparelho |
| `Ciclos` | o relógio dos humores: em que linha da tabela dispersar↔caçar a partida está, e o aviso do quadro exato em que ela vira |
| `Corrida` | o caderninho da partida solo: quanto cada labirinto rendeu, o bônus por limpar, o total e qual é o próximo — e a regra de que ela **só anda para a frente** |
| `Pacote` | o tradutor da rede: o mundo do anfitrião virando números inteiros (pessoas, fantasmas, pastilhas em bits, poder, rodada e a fila de avisos) e de volta, do lado do convidado |
| `Previsao` | o encontro entre o corpo que o convidado adivinhou e o que o anfitrião mandou: 25% do erro por retrato dentro do mesmo corredor (em passos inteiros da grade), encaixe seco acima de 90px ou em corredor diferente |

Nenhum deles sabe o que é DOM, e todos são funções puras: recebem um estado e
devolvem um estado **novo**, sem mexer no que receberam. Isso vale por dois
motivos — os testes em Node exercitam o jogo inteiro sem abrir navegador, e o
convidado de uma sala prevê o próprio corpo com **exatamente a mesma função**
que o anfitrião roda, enquanto quem decide qual pastilha sumiu para todos é o
`Pastilhas` rodando só no aparelho do anfitrião.

**Comer é uma pergunta por quadro, e uma resposta só.** O come-come come a
pastilha do quadrado em que ele *está* — a 2px por quadro ele passa 8 quadros
dentro do mesmo quadrado, e nos 7 seguintes a resposta é "aqui já está limpo".
É assim que a mesma pastilha nunca conta duas vezes, sem nenhum controle
extra.

**A grade é honesta.** O come-come anda 2px por quadro, num relógio fixo de 60
quadros por segundo: são 8 quadros para atravessar um quadrado de 16px, então
ele chega **exatamente** no centro de cada célula. É nesses centros que ele
decide se vira, e é neles que ele para diante de uma parede — nada de meio
pixel sobrando. Entre um centro e o outro só cabe uma mudança: a meia-volta,
porque a célula de trás acabou de ser visitada e está livre com certeza.

**A grade também manda na dificuldade.** Toda velocidade do jogo divide os 16px
do quadrado: 2px para o come-come e para os fantasmas, 4px para os olhos de
quem foi comido, a metade do medo feita pulando quadros em vez de andar 1px e a
pressa das fases 2 e 3 feita andando duas vezes num quadro. Nenhuma exceção —
uma velocidade que não divide o quadrado tira o corpo dos centros, e um corpo
fora dos centros não vira nas esquinas nem enxerga parede.

**A geometria é sempre a mesma.** O canvas tem 448×496 por dentro em qualquer
aparelho; o CSS só decide de que tamanho ele *aparece*, mantendo a proporção.
As contas do jogo acontecem sempre nos mesmos pixels — que é o que vai deixar
anfitrião e convidado batendo certo quando o multijogador entrar.

**A moldura não sabe simular.** Menu, pausa, tela cheia e o cartaz dos
controles não encostam em uma linha do mundo: o que eles fazem é decidir
*quando* ele anda. O laço de quadros só chama `atualizar()` com a tela em
`'jogando'` e sem pausa — mas continua **desenhando sempre**, e é por isso que
o labirinto fica ali paradinho atrás do quadro de pausa em vez de sumir. Como o
mundo inteiro (inclusive o relógio, que é o mesmo dos fantasmas e do feitiço)
mora nesse `atualizar()`, pausar é literalmente não chamá-lo: nada precisa ser
salvo nem restaurado na volta.

**Começar uma partida é um caminho só.** O `JOGAR SOZINHO` do menu, o
`RECOMEÇAR` da pausa, os dois `JOGAR DE NOVO` (o do fim de jogo e o do
PARABÉNS) e a sala que começa passam todos pelo mesmo `comecarPartida()`, que
zera o caderno da corrida, enche as vidas e carrega o labirinto 1. Não existem
duas maneiras diferentes de recomeçar — e por isso não existe uma que esqueça
de zerar alguma coisa. Quem entra e quem sai de uma **sala** é outro pedaço (o
`Rede`): `comecarPartida()` não encosta nela.

**A tela cheia é do navegador, e o botão obedece a ele.** O pedido é feito para
o documento inteiro (`documentElement`), que é o que funciona tanto com o
`index.html` aberto direto quanto dentro do iframe do catálogo. Quem redesenha
o botão é o evento `fullscreenchange`, nunca o clique: assim sair pelo `ESC` —
que não passa pelo jogo — também acerta o ícone.

**O campo do nome não briga com o teclado do jogo.** Enquanto o dedo está no
`<input>`, o atalho global desiste (`ev.target === el.campoApelido`): senão
digitar *Pedro* pausaria o jogo no "p" e *Ana* viraria o come-come no "a". É a
única coisa que fica guardada no aparelho (`localStorage`), exatamente o que o
`jogo.json` declara em `privacidade.coleta`.

**O palco manda na tela, e o resto é translúcido em volta dele.** O CSS tem
dois desenhos: deitado, o HUD vira uma coluna encostada no labirinto pela
esquerda (e a cruzeta fica na faixa da direita); em pé, o HUD é uma faixa em
cima e a cruzeta uma faixa embaixo. O `ajustarPalco()` não chuta mais folga
nenhuma: lê o padding de verdade do `body`, lê a faixa que o CSS reserva de
cada lado (`--banda`, para nada ficar por cima das pastilhas) e devolve a
largura escolhida em `--palco-l`, que é por onde o HUD encosta no palco. Quando
a coluna não cabe na altura (sala cheia, celular baixinho) ela quebra para a
**esquerda** (`direction: rtl` no contêiner), nunca por cima do labirinto. O
canto de cima à direita da tela é da Central: o botão Voltar dela mora ali
quando o aparelho está deitado.

**O deslize é geometria pura, e a cruzeta é fiação.** O módulo `Toque` só sabe
responder "este (dx, dy) já é um pedido de curva, e para que lado?"; quem
conta dedos são os eventos de ponteiro (`pointer*`, que valem para dedo,
caneta e mouse de uma vez). A cruzeta solta a captura implícita do navegador
no `pointerdown`, que é o que deixa o polegar escorregar de uma seta para a
outra. Nenhum dos dois toca em `entrada.desejada` diretamente: os dois passam
por `pedirDirecao()`, o mesmo portão da seta do teclado, que recusa pedidos
fora do labirinto rolando.

---

## Testes

```bash
node --check jogos/come_come/game.js
node testes/come_come/fase1.test.mjs        # o mapa e o movimento, puros
node testes/come_come/fase1-tela.test.mjs   # o jogo ligado, sem navegador
node testes/come_come/fase2.test.mjs        # as pastilhas e a pontuação, puras
node testes/come_come/fase2-tela.test.mjs   # o labirinto percorrido até ficar limpo
node testes/come_come/fase3a.test.mjs       # a casa, a saída e a escolha da esquina
node testes/come_come/fase3a-tela.test.mjs  # os quatro fantasmas dentro da partida
node testes/come_come/fase3b.test.mjs       # as personalidades, o sorteio e os ciclos
node testes/come_come/fase3b-tela.test.mjs  # dispersar e caçar dentro da partida
node testes/come_come/fase4.test.mjs        # o poder, o susto, a escada e os olhos
node testes/come_come/fase4-tela.test.mjs   # a bolota e os 200 + 400 no HUD
node testes/come_come/fase5.test.mjs        # as vidas, o tombo e o reinício
node testes/come_come/fase5-tela.test.mjs   # perder as três vidas até o fim de jogo
node testes/come_come/fase6a.test.mjs       # os três desenhos e a tabela de dificuldade
node testes/come_come/fase6a-tela.test.mjs  # os labirintos 2 e 3 percorridos até ficarem limpos
node testes/come_come/fase6b.test.mjs       # a corrida das três fases e o bônus
node testes/come_come/fase6b-tela.test.mjs  # uma partida inteira, 1 → 2 → 3, até o PARABÉNS
node testes/come_come/fase7-tela.test.mjs   # menu, pausa, recomeçar, tela cheia e controles
node testes/come_come/fase8.test.mjs        # o jogo sem a Central, e a fiação do SDK
node testes/come_come/fase8-tela.test.mjs   # 3 abas numa sala, pelo servidor de verdade
node testes/come_come/fase9.test.mjs        # o mundo único do anfitrião, com três abas
node testes/come_come/fase10.test.mjs       # a previsão local do convidado, com latência
node testes/come_come/fase11.test.mjs       # o labirinto disputado: pastilha, poder e cor da sala
node testes/come_come/fase15.test.mjs       # a geometria do deslize (o módulo Toque)
node testes/come_come/fase15-tela.test.mjs  # a cruzeta e o deslize, num tablet de mentira
```

O `fase2-tela.test.mjs` põe um **piloto automático** no volante: a cada centro
de quadrado ele procura a pastilha inteira mais perto (uma busca em largura
pelo labirinto, com o túnel e tudo) e aperta a seta daquele lado — desviando
dos quadrados em que um caçador está encostado, que é o que uma criança faz
desde que o tombo entrou no jogo. Assim o labirinto inteiro é percorrido até
ficar limpo **sem perder uma vida**, e o teste confere os 2 600 pontos no HUD e
a fase dada por concluída.

O `fase3a.test.mjs` solta os quatro fantasmas por **6 000 quadros** com um alvo
que passeia pelos cantos e confere, quadro a quadro, que nenhum deles entra
numa parede, sai do alinhamento do corredor ou dá meia-volta; a escolha da
esquina é conferida à mão no cruzamento `(6, 8)`, inclusive o empate.

O `fase3b.test.mjs` monta cenas à mão para cada personalidade (o tímido a nove,
a oito e a sete quadrados do come-come, por exemplo), confere que a tabela de
ciclos vira exatamente nos quadros `420, 1620, 2040, …` e que depois da última
linha ela não vira nunca mais, e roda os três módulos juntos por **4 000
quadros** — com as meias-voltas acontecendo — sem que ninguém entre numa
parede. O `fase3b-tela.test.mjs` faz o mesmo dentro da partida: mede que na
dispersão cada fantasma fica **mais perto do próprio canto do que do canto dos
outros três**, e que na caça os quatro se aproximam de um come-come parado
(o vermelho chega em cima dele).

O `fase4.test.mjs` faz a prova pesada da pastilha de poder: um fantasma comido
em **cada quadrado do labirinto**, olhando para cada um dos quatro lados —
1 000 e poucas viagens de volta para casa, para garantir que a regra da esquina
nunca deixa um par de olhos rodando em círculo (o pior caminho leva menos de
300 quadros). Confere também que o feitiço acaba no quadro exato da duração,
que o aviso pisca só nos últimos dois segundos e que a escada zera a cada
bolota nova. O `fase4-tela.test.mjs` põe outro **piloto automático** no
volante — este caça fantasma em vez de pastilha — e mede os **200 + 400** no
HUD, o corpo do comido sumindo do desenho, o azul dos quatro na tela e o
relógio dispersar↔caçar retomando de onde parou.

O `fase5.test.mjs` monta as cenas do tombo à mão: o cerco dos quatro custando
uma vida só, a pausa avisando no quadro exato de todo mundo voltar, as três
vidas caindo uma a uma até o fim de jogo, e o reinício repondo as posições sem
repor as pastilhas. O `fase5-tela.test.mjs` faz isso dentro da partida — o HUD
perdendo um 🟡 por tombo, o mundo congelado durante a pausa (nem o relógio
anda), os fantasmas sumindo da tela e o come-come encolhendo até desaparecer —
e fecha com o caminho mais honesto de todos: um jogo **deixado sozinho**, sem
uma seta apertada, que perde as três vidas e chega à tela de fim de jogo por
conta própria.

O `fase6a.test.mjs` prova que os **três desenhos são válidos**, e não só
parecidos com um labirinto: 28×31 quadrados, só as letras da legenda, a borda
fechada menos as duas bocas do túnel, um nascimento fora da casa, quatro
bolotas, a casa com a porta virada para a rua — e, o que interessa mesmo, uma
busca em largura a partir do `P` mostrando que **toda pastilha é alcançável**,
que **nenhuma célula fica solta**, que **não existe beco sem saída** (a regra
"descarte a meia-volta" dos fantasmas conta com isso) e que o miolo da casa não
vaza para a rua. Confere também que a tabela de dificuldade **cresce fase a
fase** nas quatro colunas e que ela chega inteira no labirinto.

O `fase6a-tela.test.mjs` põe o piloto automático da fase 2 no volante e
percorre os labirintos **2 e 3** até deixá-los limpos, contando os passos do
vermelho para ver a pressa da tabela chegar no mundo. Ali o come-come é
imortal, como no `fase3b-tela`: nas fases 2 e 3 os fantasmas andam mais rápido
do que ele, e o assunto deste arquivo é **percorrer** os labirintos novos —
quem prova o tombo e as vidas é o `fase5-tela`.

O `fase6b.test.mjs` confere o caderninho sem DOM nenhum: a linha de cada fase
com o bônus, o total fechando pelas duas contas (a soma das linhas e a soma dos
pontos + 3 × 500), a ordem que **só anda para a frente** (1 → 2 → 3 → 3, nunca
uma fase 4) e a pureza de `concluir()`, que não encosta no estado que recebe.
Ele também confronta o `index.html` com o `game.js`: todo `$('id')` procurado
pelo jogo tem de existir no HTML, e as três telas de fim nascem escondidas.

O `fase6b-tela.test.mjs` joga a **partida inteira**: o piloto limpa os três
labirintos em fila, e o teste confere cada quadro de fim de fase (pontos, bônus
e para onde o botão aponta), o mundo congelado atrás dele, o PARABÉNS com uma
linha por fase e o total, que o botão de próximo labirinto **não** anda no meio
da fase nem depois do PARABÉNS, e que "Jogar de novo" devolve tudo ao começo —
caderno em branco, vidas cheias, labirinto 1 cheio. No fim ele larga a
imortalidade e prova a outra saída da corrida: perdendo as vidas no labirinto
2, a tela de fim de jogo mostra os pontos da **corrida inteira**, e não só os
daquela fase.

O `fase8.test.mjs` cobre o lado que mais importa da plataforma: o jogo **sem
ela**. Sem `window.Plataforma` o botão dos amigos fica escondido, `rede.ligada`
é falso e o piloto automático atravessa a corrida inteira, do menu ao PARABÉNS,
sem esbarrar em nada; com o SDK na página mas o multijogador fora do ar é a
mesma coisa; e o SDK falhando em `iniciar()` também não derruba nada. Ele
confere ainda que o `game.js` toca em `window.Plataforma` **em um lugar só** (o
portão da última linha do arquivo), que `iniciar()` leva o slug e o apelido
guardado, e que o lobby é aberto com os quatro ganchos e `voltarAoLobby:
false`. Com uma Central de mentira, ele percorre cada gancho: a sala começando
(labirinto 1, código no HUD, papel certo), o anfitrião caindo e a partida
terminando — os dois devolvendo todo mundo ao menu com o recado.

O `fase8-tela.test.mjs` sobe o **servidor de salas de verdade** (o mesmo
`salas.js` e o mesmo WebSocket escrito à mão do `server/src/plataforma/`) numa
porta sorteada e põe **três abas** conversando com ele: Ana cria a sala, Bento
e Caio entram pelo código de 4 letras, os três marcam pronto, a anfitriã começa
e as três caem no labirinto 1 — com o código no HUD, o papel de cada uma e o
cano de mensagens aberto nos dois sentidos. No fim ele desmancha a sala: Caio
sai pelo *JOGAR SOZINHO* e continua jogando, e a anfitriã fecha a aba, o que
devolve os outros ao menu com o motivo na tarja — jogáveis na hora, sem
recarregar nada.

O `fase10.test.mjs` põe duas abas (a anfitriã e um convidado) numa Central de
mentira **com latência**: cada mensagem fica seis quadros na fila antes de ser
entregue, que é a única razão de a previsão local existir. Ele prova que o
convidado vira a esquina **no quadro da tecla** (e que o resultado é
exatamente o da mesma `Movimento.passo()`), que um erro plantado de 40px
encolhe para zero em poucos retratos **sem nenhum encaixe seco** e sem que
nenhum retrato mexa o corpo mais do que os 25%, e que um erro de quase 100px
encaixa de uma vez — guardando o pedido de direção do dedo daqui. Confere ainda
o que a fase mais tem de próprio: a correção sempre em múltiplos de 2px (com
os 44 tamanhos de erro possíveis), a curva que continua saindo depois dela, o
encaixe seco quando os dois estão em corredores diferentes ou com parede no
meio, a volta do túnel não virando um erro de labirinto inteiro, e que passar
por cima de uma pastilha na tela do convidado **não** some com ela nem dá
ponto.

O `fase15-tela.test.mjs` liga o jogo num DOM que **finge ser um tablet** (o
`matchMedia('(pointer: coarse)')` responde que sim) e faz o que um dedo faz:
encosta nas setas da cruzeta, arrasta de uma para a outra, desliza em cima do
labirinto (reto, torto e mudando de ideia no meio) e confere que tudo isso
escreve o mesmo `entrada.desejada` da seta do teclado — e que na pausa, no menu
e nas telas de fim nenhum toque vira nada. Também prova que num computador
nada muda, e que o primeiro toque de verdade liga a cruzeta mesmo assim.
