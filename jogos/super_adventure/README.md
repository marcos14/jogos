# 🍄 Super Adventure

Um platformer retrô, de 8 bits, para as crianças: corra, pule, junte moedas e
chegue na bandeira. São 3 fases fixas e dá para jogar sozinho ou com até 8
amigos na mesma fase, cada um no seu aparelho.

> **Estado: em construção.** Esta é a **fase 1** do plano — o esqueleto do jogo:
> menu, HUD provisório e o herói andando e pulando numa tela de treino.
> Plataformas, moedas, inimigos, checkpoints, as 3 fases e o multijogador
> chegam nas próximas etapas.

## Como jogar

| Tecla | O que faz |
|---|---|
| **←** **→** (ou **A** / **D**) | andar |
| **ESPAÇO** (ou **↑** / **W**) | pular |

Clique em **JOGAR SOLO** e experimente o pulo.

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

## Decisões técnicas

- **Sem imagem nenhuma.** Tudo é desenhado no Canvas 2D com retângulos: o herói
  é um sprite de 16×16 quadradinhos de 2 px (ou seja, 32×32 px na tela), escrito
  como texto no próprio `game.js`. Paleta 8-bit chapada, sem desfoque nem
  degradê, com `image-rendering: pixelated`.
- **Herói genérico.** Nada de personagem de marca: é um aventureiro de boné
  vermelho e macacão azul, no clima dos consoles antigos.
- **ES5, IIFE, `'use strict'`, zero dependências, sem build** — o mesmo padrão
  da Galinha Feliz. O `index.html` abre direto no navegador, sem servidor.
- **A física mora em funções puras.** O módulo `Fisica` (`novoCorpo`,
  `velocidadeHorizontal`, `passo`) não toca em DOM: recebe um corpo e o que está
  apertado, e devolve um corpo novo. É o que os testes em Node exercitam, e é o
  que o convidado vai usar para prever o próprio personagem no multijogador.
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
```
