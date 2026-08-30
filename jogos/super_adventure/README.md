# 🍄 Super Adventure

Um platformer retrô, de 8 bits, para as crianças: corra, pule, junte moedas e
chegue na bandeira. São 3 fases fixas e dá para jogar sozinho ou com até 8
amigos na mesma fase, cada um no seu aparelho.

> **Estado: em construção.** Esta é a **fase 3** do plano — já dá para
> atravessar a fase 1 inteira juntando as 100 moedas e quebrando os blocos, com
> o placar subindo no HUD. Checkpoints, vidas de verdade, inimigos, as fases 2 e
> 3 e o multijogador chegam nas próximas etapas.

## Como jogar

| Tecla | O que faz |
|---|---|
| **←** **→** (ou **A** / **D**) | andar |
| **ESPAÇO** (ou **↑** / **W**) | pular |

Clique em **JOGAR SOLO**, corra para a direita, junte moedas e chegue na
bandeira. Cair num buraco recomeça a fase do zero — herói no começo, moedas e
blocos de volta no lugar e placar zerado (perder vida e voltar ao checkpoint é
assunto da próxima etapa; por isso os ❤️ do HUD ficam sempre em 3).

## Pontuação

| O que | Vale |
|---|---|
| Encostar numa moeda | **+10** pontos |
| Quebrar um bloco | solta o cristal (enfeite); pontos, só os das moedas |

A fase 1 tem **100 moedas** — 1000 pontos se você pegar todas. Cada moeda some
de vez: uma vez pega, não volta mais durante a tentativa. O HUD no topo mostra
os pontos, os ❤️ e em que fase você está, e o número dos pontos sobe na hora em
que a moeda é encostada.

## Os blocos quebráveis

São 10 na fase 1, roxos e com um cristal piscando dentro. Eles são **sólidos
enquanto estão de pé**: dá para pousar em cima e a cabeça bate na base deles.
Bater por baixo (ou pousar em cima) quebra o bloco — o cristal sai voando junto
com os cacos e o caminho abre, porque o bloco sai da lista de sólidos na mesma
hora. Vários deles têm uma moeda escondida logo abaixo: a cabeçada pega as duas
coisas de uma vez.

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
| `P` | onde o herói nasce |
| `F` | a bandeira do fim |

`Mapa.ler()` transforma esse desenho nos retângulos sólidos que a física usa —
quadrados vizinhos da mesma linha viram **um** retângulo só, o que deixa a
colisão curta e barata. Os blocos quebráveis são a exceção: cada um fica sozinho
numa lista à parte, porque precisa poder sumir sem levar os vizinhos junto. A
fase 1 tem 120 colunas (3840 px, umas quatro telas).

Os números do percurso saem direto da física: subindo 120 px o herói passa uns
31 quadros no ar e anda no máximo ~93 px na horizontal. Por isso os buracos têm
**2 quadrados** (64 px) e os degraus sobem **2 quadrados** — tudo com folga,
como uma fase fácil pede. Um teste confere que o maior buraco do mapa tem
mesmo 2 quadrados, e um piloto automático atravessa a fase inteira sem cair.

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
- **ES5, IIFE, `'use strict'`, zero dependências, sem build** — o mesmo padrão
  da Galinha Feliz. O `index.html` abre direto no navegador, sem servidor.
- **A física mora em funções puras.** Os módulos `Fisica`, `Mapa`, `Itens` e
  `Camera` não tocam em DOM: recebem um corpo, o que está apertado e os limites
  do mundo, e devolvem um corpo novo. É o que os testes em Node exercitam, e é o que o
  convidado vai usar para prever o próprio personagem no multijogador.
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
- **O HUD é HTML, não canvas.** Pontos, vidas e fase ficam fora da tela do jogo:
  crescem junto com a página, continuam legíveis no celular e só são reescritos
  quando o número muda (nada de mexer no DOM 60 vezes por segundo).
- **Relógio fixo de 60 passos/s** no laço do jogo, com acumulador, para a
  simulação não depender da taxa de quadros da tela.
- **Manifesto pronto para a plataforma** (`jogo.json`): sala de 1 a 8 jogadores,
  modo competitivo, autoridade do anfitrião, estado 20×/s. A rede em si entra
  nas fases seguintes — por enquanto o jogo é 100% solo e nem carrega o SDK.

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
```
