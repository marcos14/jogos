# Come-Come 🟡

Um labirinto de fliperama no clima dos consoles de 8 bits: corra pelos
corredores, coma todas as pastilhas e escape dos quatro fantasmas. Três
labirintos, cada um mais difícil que o anterior — sozinho ou com até 5 amigos
na mesma sala.

> **Estado de hoje: fase 1 do plano.** O que já funciona é o chão de tudo o
> resto: o labirinto 1 desenhado, o come-come andando na grade, virando nas
> esquinas e atravessando o túnel lateral. As pastilhas ainda não somem quando
> ele passa por cima (fase 2), os fantasmas ainda não existem (fase 3), e a
> partida ainda entra direto no jogo, sem menu (fase 7).

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

Nenhum dos dois sabe o que é DOM, e `Movimento.passo()` é função pura: recebe
um corpo e devolve um corpo novo. Isso vale por dois motivos — os testes em
Node exercitam o jogo inteiro sem abrir navegador, e mais adiante o convidado
de uma sala vai prever o próprio corpo com **exatamente a mesma função** que o
anfitrião roda.

**A grade é honesta.** O come-come anda 2px por quadro, num relógio fixo de 60
quadros por segundo: são 8 quadros para atravessar um quadrado de 16px, então
ele chega **exatamente** no centro de cada célula. É nesses centros que ele
decide se vira, e é neles que ele para diante de uma parede — nada de meio
pixel sobrando. Entre um centro e o outro só cabe uma mudança: a meia-volta,
porque a célula de trás acabou de ser visitada e está livre com certeza.

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
```
