# 🐔 Galinha Feliz

Réplica jogável do "Galinha Feliz" (*Happy Mrs Chicken*), o joguinho de
computador que a Peppa Pig joga no desenho. HTML + CSS + JavaScript puros,
sem dependências e sem build: é só abrir o `index.html` no navegador.

```
index.html   telas (nome, HUD, fase, fim de jogo) e o canvas
style.css    visual "Peppa": cores chapadas, contorno grosso, tudo arredondado
game.js      todo o jogo (loop, regras, desenho no canvas, sons, ranking, rede)
jogo.json    dados do catalogo + o bloco "plataforma" (multijogador ate 5)
```

Sozinho ele roda solto, so abrindo o `index.html`. Servido pela Central de
Jogos, ele tambem carrega `/plataforma/sdk.js` e ganha o modo em grupo.

## Como se joga

1. Digite seu nome e clique em **Jogar!**
2. Mova a galinha com o **mouse**, o **dedo** ou as **setas / WASD**.
3. O anel dourado embaixo dela mostra quando o próximo ovo vai sair. Ela bota
   o ovo **no quadradinho onde estiver**.
4. Só conta ovo em quadradinho **vazio** — se o lugar já tiver ovo, aparece
   "Ops!" e o combo zera. O objetivo é espalhar ovos por lugares diferentes.
5. Os ovos **chocam sozinhos e viram pintinhos** (como no desenho), liberando
   o quadradinho de novo e valendo pontos extras.
6. **100 ovos** = próxima fase. Se o tempo da fase acabar, é fim de jogo e o
   placar entra no ranking.

## Jogando com amigos (até 5)

Servido pela Central de Jogos, aparece o botão **👥 Jogar com amigos**: um cria
a sala, os outros entram pelo código de 4 letras (ou tocando na sala que aparece
sozinha na lista). Todo mundo bota ovo **no mesmo terreiro**, então é uma corrida
pelos quadradinhos vazios.

- Cada jogador tem uma **cor**: o tapetinho embaixo da galinha, a plaquinha com
  o nome e a fitinha do ovo que ela botou.
- Os pontos são de **quem botou o ovo** — inclusive quando ele choca (+5) e
  quando a raposa rouba (−25 de quem era o ovo).
- A meta da fase vira **60 ovos por jogador** (120 em dois, 300 em cinco).
- No fim aparece o **placar da sala**, e não o ranking de um jogador só — placar
  de partida em grupo não é comparável com o de quem jogou sozinho.
- Não dá para pausar em grupo: o terreiro é de todo mundo.

Como isso funciona por dentro (e como colocar noutro jogo) está em
[PLATAFORMA.md](../../PLATAFORMA.md).

## Pontuação

| Ação | Pontos |
|---|---|
| Botar um ovo em lugar novo | 10 × combo |
| Ovo que choca e vira pintinho | +5 |
| Enxotar a raposa | +30 |
| Raposa rouba um ovo | −25 e −1 ovo da fase |
| Ovos no terreiro na troca de fase | +5 cada (bônus) |

O **combo** sobe a cada 10 ovos seguidos sem errar (até ×5) e zera quando você
tenta botar em lugar ocupado ou a raposa rouba.

## Progressão das fases

| Fase | Intervalo entre ovos | Tempo para chocar | Tempo da fase |
|---|---|---|---|
| 1 | 0,78 s | 9,0 s | 130 s |
| 2 | 0,69 s | 8,5 s | 123 s |
| 3 | 0,60 s | 7,9 s | 116 s |
| … | −12 % por fase (mín. 0,22 s) | −0,55 s (mín. 3,5 s) | −7 s (mín. 75 s) |

A galinha também fica mais veloz a cada fase. A **raposa** entra em cena a
partir da fase 3: ela caminha até um ovo para roubá-lo — encoste nela para
enxotar antes que consiga.

## Controles

| Tecla | Ação |
|---|---|
| Mouse / toque | move a galinha |
| Setas ou WASD | move a galinha |
| P ou Esc | pausar |
| M | ligar/desligar o som |

## No celular

Funciona com o dedo, em pé ou deitado:

- **Arraste o dedo** pelo terreiro para levar a galinha. Ela anda um pouco
  **acima do toque**, senão o próprio dedo esconderia o que está acontecendo.
- **Em pé** o tabuleiro fica 8 × 13 e **deitado** 13 × 8 — sempre os mesmos 104
  lugares. Como um é a transposta do outro, girar o aparelho no meio da partida
  não perde nada: ovos, pintinhos, raposa e placar são transpostos junto.
- O palco é dimensionado por JavaScript a cada `resize`/`orientationchange`
  para ocupar o máximo de tela sem distorcer.
- O HUD encolhe para duas linhas no celular em pé (o nome do jogador some, as
  barras dividem uma linha) e para uma linha só quando a tela é baixa.
- Sem zoom por duplo toque, sem puxar-para-atualizar e sem seleção de texto
  atrapalhando o arrasto.

## Detalhes técnicos

- Tabuleiro de **104 lugares** de 66 px, num canvas lógico de 938 × 608
  (ou 608 × 938 em pé), escalado por JavaScript e por `devicePixelRatio` —
  fica nítido em telas retina.
- Todos os desenhos (galinha, ovos, pintinhos, raposa, grama, cerca) são
  feitos com `Canvas 2D` no próprio `game.js` — nenhuma imagem externa.
- Sons gerados na hora com **Web Audio API** (osciladores), sem arquivos.
- Ranking dos 10 melhores guardado em `localStorage`
  (`galinhaFeliz.ranking.v1`) — só das partidas de um jogador.
- **Multijogador**: o anfitrião roda o `update()` de sempre e manda o terreiro
  inteiro 20x por segundo (~200 bytes por pacote); os convidados mandam só para
  onde querem ir, preveem a própria galinha e deslizam as outras até a posição
  que chegou. Som e poeirinha o convidado refaz a partir dos avisos que vêm
  junto com o estado. Em grupo, o tabuleiro (13×8 ou 8×13) é o do anfitrião —
  senão os quadradinhos não bateriam entre os aparelhos.
