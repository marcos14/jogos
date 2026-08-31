# Come-Come 🟡

Um labirinto de fliperama no clima dos consoles de 8 bits: corra pelos
corredores, coma todas as pastilhas e escape dos quatro fantasmas. Três
labirintos, cada um mais difícil que o anterior — sozinho ou com até 5 amigos
na mesma sala.

> **Estado de hoje: fase 4 do plano.** Já dá para correr pelo labirinto 1
> comendo todas as pastilhas, ver o placar subir no HUD e limpar o labirinto;
> os **quatro fantasmas** moram na casa do centro, saem um a um pela porta e
> caçam cada um do seu jeito, alternando com os respiros de dispersão pelos
> cantos; e a **pastilha de poder** agora vira o jogo do avesso — os quatro
> ficam azuis, fogem em meia velocidade e podem ser comidos por 200, 400, 800
> e 1600. Encostar num fantasma que **não** está assustado ainda não machuca
> (fase 5), o labirinto ainda é um só (fase 6a) e a partida ainda entra direto
> no jogo, sem menu (fase 7).

---

## Como se joga

| Tecla | O que faz |
|---|---|
| `←` `→` `↑` `↓` | virar para aquele lado |
| `A` `D` `W` `S` | a mesma coisa |

O pedido **fica guardado**: dá para apertar a seta um pouco antes da esquina
que a curva sai certinha quando o corredor abrir. É assim nos fliperamas, e é
assim aqui.

Os dois lados da linha do meio são o **túnel**: quem sai por uma ponta entra
pela outra sem parar de andar.

O objetivo é **limpar o labirinto**: comer todas as 244 pastilhas. Quando a
última some, a fase acabou.

As quatro **bolotas grandes** dos cantos são as pastilhas de poder: morder uma
deixa os fantasmas azuis e comestíveis por 8 segundos. Enquanto elas piscam
azul, corra atrás deles; quando começarem a **piscar em branco**, o feitiço
está acabando — largue a caça e volte a comer pastilha.

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

Cada pastilha conta **uma vez só**: o come-come come a que estiver debaixo dos
pés dele, ela some da tela e o quadrado fica limpo para sempre — voltar por
cima não rende mais nada.

A **escada dos fantasmas zera a cada pastilha de poder nova**: comer dois numa
bolota e dois na seguinte rende 200 + 400 duas vezes (1 200), e não os 3 000 de
comer os quatro na mesma. Vale a pena esperar todos se aproximarem antes de
morder a bolota.

Encostar num fantasma que **não** está assustado ainda não custa vida nenhuma
— o tombo é a próxima etapa do plano.

O HUD, em cima do labirinto, mostra quatro números:

| Caixa | O que é |
|---|---|
| **Pontos** | o que a fase rendeu até agora |
| **Vidas** | 🟡🟡🟡 — três, como no fliperama (ainda não há como perder) |
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
| `Poder` | o cronômetro da pastilha de poder: quanto o feitiço ainda dura, quando o aviso começa a piscar e quanto vale o próximo fantasma na escada 200/400/800/1600 |
| `Personalidades` | de quem é o alvo: o quadrado do come-come, quatro casas à frente dele, a coragem que depende da distância, o lugar sorteado — ou, na dispersão, o canto de cada um |
| `Sorteio` | o gerador de bolso com semente: a mesma semente dá a mesma sequência em qualquer aparelho |
| `Ciclos` | o relógio dos humores: em que linha da tabela dispersar↔caçar a partida está, e o aviso do quadro exato em que ela vira |

Nenhum deles sabe o que é DOM, e todos são funções puras: recebem um estado e
devolvem um estado **novo**, sem mexer no que receberam. Isso vale por dois
motivos — os testes em Node exercitam o jogo inteiro sem abrir navegador, e
mais adiante o convidado de uma sala vai prever o próprio corpo com
**exatamente a mesma função** que o anfitrião roda, enquanto quem decide qual
pastilha sumiu para todos é o `Pastilhas` rodando só no aparelho do anfitrião.

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
quem foi comido, e a metade do medo feita pulando quadros em vez de andar 1px.
Nenhuma exceção — uma velocidade que não divide o quadrado tira o corpo dos
centros, e um corpo fora dos centros não vira nas esquinas nem enxerga parede.

**A geometria é sempre a mesma.** O canvas tem 448×496 por dentro em qualquer
aparelho; o CSS só decide de que tamanho ele *aparece*, mantendo a proporção.
As contas do jogo acontecem sempre nos mesmos pixels — que é o que vai deixar
anfitrião e convidado batendo certo quando o multijogador entrar.

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
```

O `fase2-tela.test.mjs` põe um **piloto automático** no volante: a cada centro
de quadrado ele procura a pastilha inteira mais perto (uma busca em largura
pelo labirinto, com o túnel e tudo) e aperta a seta daquele lado. Assim o
labirinto inteiro é percorrido até ficar limpo, e o teste confere os 2 600
pontos no HUD e a fase dada por concluída.

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
