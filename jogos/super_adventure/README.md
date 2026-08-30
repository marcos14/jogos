# 🍄 Super Adventure

Um platformer retrô, de 8 bits, para as crianças: corra, pule, junte moedas e
chegue na bandeira. São 3 fases fixas e dá para jogar sozinho ou com até 8
amigos na mesma fase, cada um no seu aparelho.

> **Estado: em construção.** Esta é a **fase 2** do plano — já dá para
> atravessar a fase 1 inteira: plataformas sólidas, buracos, câmera lateral e a
> bandeira do fim. Moedas, blocos quebráveis, checkpoints, vidas, inimigos, as
> fases 2 e 3 e o multijogador chegam nas próximas etapas.

## Como jogar

| Tecla | O que faz |
|---|---|
| **←** **→** (ou **A** / **D**) | andar |
| **ESPAÇO** (ou **↑** / **W**) | pular |

Clique em **JOGAR SOLO**, corra para a direita e chegue na bandeira. Cair num
buraco devolve o herói para o começo da fase (perder vida e voltar ao
checkpoint é assunto da próxima etapa).

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
| `P` | onde o herói nasce |
| `F` | a bandeira do fim |

`Mapa.ler()` transforma esse desenho nos retângulos sólidos que a física usa —
quadrados vizinhos da mesma linha viram **um** retângulo só, o que deixa a
colisão curta e barata. A fase 1 tem 120 colunas (3840 px, umas quatro telas).

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
- **A física mora em funções puras.** Os módulos `Fisica`, `Mapa` e `Camera`
  não tocam em DOM: recebem um corpo, o que está apertado e os limites do mundo,
  e devolvem um corpo novo. É o que os testes em Node exercitam, e é o que o
  convidado vai usar para prever o próprio personagem no multijogador.
- **Colisão AABB, resolvendo X e depois Y.** O jeito clássico: anda na
  horizontal e sai de dentro das paredes, depois anda na vertical e pousa na
  superfície mais alta que os pés cruzaram (ou bate a cabeça, se estava
  subindo). Mesmo caindo na velocidade máxima ninguém atravessa o chão.
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
```
