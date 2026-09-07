# AGENTS.md — instruções para quem (ou o que) cria jogos aqui

Este arquivo é para agentes de IA e pessoas que vão **criar ou alterar um jogo**
nesta Central de Jogos. Leia antes de escrever a primeira linha.

O detalhe completo da plataforma está em [PLATAFORMA.md](PLATAFORMA.md); aqui
está o que fazer, na ordem, e o que será cobrado no final.

---

## 1. Em uma frase

Um jogo é uma pasta em `jogos/<slug>/` com um `index.html` que funciona
**sozinho, sem build e sem dependência**. Se ele também declarar o bloco
`plataforma` no `jogo.json` e carregar o SDK, ganha multijogador (e, mais
adiante, ranking, privacidade e portão de idade) sem escrever essa parte.

---

## 2. Receita rápida — jogo novo

```
jogos/meu-jogo/
├── index.html      obrigatório
├── jogo.json       recomendado (cartão do catálogo + plataforma)
├── style.css
├── game.js
├── capa.png        opcional (vira a capa no catálogo)
└── README.md       recomendado (como se joga, decisões técnicas)
```

Regras que **não** são negociáveis:

| Regra | Por quê |
|---|---|
| O `slug` da pasta bate com `^[a-z0-9][a-z0-9_-]{0,59}$` | é validado pelo servidor; fora disso o jogo não é servido |
| Todos os caminhos internos são **relativos** (`href="style.css"`) | o jogo é servido em `/jogos/<slug>/`, não na raiz |
| Sem `npm install`, sem bundler, sem framework | nenhum jogo tem passo de build; abrir o `index.html` tem que funcionar |
| Sem chamada para fora da rede local (CDN, fonte, analytics) | é rede de casa, muitas vezes sem internet; e é jogo de criança |
| O jogo continua jogável **sem** a plataforma | `if (window.Plataforma)` — nunca assuma que ela existe |
| Funciona no dedo e no teclado, em pé e deitado | metade dos aparelhos da casa é tablet |
| Os controles são **translúcidos e ficam em volta do palco**, nunca roubando espaço dele | no celular cada pixel de altura é jogo — veja a seção 7 |

O único caminho absoluto permitido é o do SDK: `/plataforma/sdk.js`.

### `jogo.json` mínimo

```json
{
  "nome": "Meu Jogo",
  "descricao": "Uma frase para a criança saber do que se trata.",
  "emoji": "🎲",
  "cor": "#7bc4ff",
  "tags": ["arcade", "2 jogadores"],
  "idade": "3+",
  "visivel": true
}
```

`visivel: false` esconde do catálogo sem apagar — use enquanto o jogo está pela
metade.

---

## 3. Entrar na plataforma

### 3.1 Declarar no `jogo.json`

```json
"plataforma": {
  "versao": 1,
  "multijogador":  { "min": 2, "max": 5, "modo": "competitivo",
                     "autoridade": "anfitriao", "taxaEstado": 20, "listarSalas": true },
  "ranking":       { "metrica": "pontos", "rotulo": "Pontos", "ordem": "desc", "tamanho": 10 },
  "classificacao": { "idadeMinima": 0, "conteudo": [] },
  "privacidade":   { "coleta": ["apelido"], "guardaLocal": true, "guardaServidor": false }
}
```

Defaults e limites (o servidor corrige o que estiver fora e mostra o problema no
`/admin`):

| Campo | Padrão | Limite |
|---|---|---|
| `multijogador.max` | 2 | **8** (teto da plataforma) |
| `multijogador.min` | 2 | 1 … `max` |
| `multijogador.modo` | `competitivo` | `competitivo` \| `cooperativo` |
| `multijogador.autoridade` | `anfitriao` | só existe este modelo hoje |
| `multijogador.taxaEstado` | 15 | 5 … 30 pacotes/s |
| `ranking.ordem` | `desc` | `desc` \| `asc` |
| `classificacao.idadeMinima` | 0 | 0 … 18 (18 marca o jogo como adulto) |

**Declare os quatro blocos mesmo assim.** Hoje só o multijogador está ligado; os
outros três já são validados e passam a funcionar sozinhos quando entrarem no ar.
Confira o que está disponível em tempo de execução, nunca chute:

```js
if (P.ranking.disponivel) { /* … */ } else { /* guarda no localStorage */ }
```

### 3.2 Carregar o SDK

```html
<script src="/plataforma/sdk.js" charset="utf-8"></script>
<script src="game.js" charset="utf-8"></script>
```

### 3.3 Ligar no jogo

```js
if (window.Plataforma) {
  window.Plataforma.iniciar({ jogo: 'meu-jogo', apelido: campoNome.value })
    .then(function (P) {
      if (!P.multijogador.disponivel) return;      // servidor fora do ar: segue sozinho
      botaoAmigos.classList.remove('hidden');
      botaoAmigos.addEventListener('click', function () {
        P.perfil.definirApelido(campoNome.value);
        P.multijogador.abrirLobby({
          aoComecar:  comecarPartida,   // (sala)  → monta os jogadores e começa
          aoReceber:  receber,          // ({de,d}) → mensagem de outro jogador
          aoTerminar: terminar,         // ({placar,sala}) → tela de fim
          aoAbortar:  abortar,          // ({motivo,sala}) → o anfitrião caiu
          voltarAoLobby: false          // o jogo controla a tela de fim
        });
      });
    })
    .catch(function () { /* sem plataforma: jogo de um jogador só */ });
}
```

`abrirLobby()` já desenha a sala inteira (criar, código de 4 letras, lista de
salas abertas na rede, quem chegou, botão de começar). **Não escreva essa tela
de novo.**

---

## 4. O contrato do multijogador

### 4.1 O modelo: o anfitrião manda

```
 CONVIDADO                    ANFITRIÃO                     CONVIDADO
 "quero ir ali"  ─────────▶  simula o mundo  ─────────────▶  desenha
 (~20x/s)                    (o jogo inteiro)   (~20x/s)     e prevê
```

Um só lugar decide o que aconteceu. Sem isso, dois jogadores acham que pegaram a
mesma coisa.

**As cinco regras:**

1. **Convidado não simula.** Ele manda o que apertou e desenha o que chega.
2. **Convidado prevê a própria posição** para o controle não ficar molenga, e
   corrige de leve quando o pacote chega (`erro > 90px` → pula; senão 25% por
   pacote).
3. **Efeito é local.** Som, partícula e texto flutuante o convidado refaz a
   partir de *avisos* curtos que viajam junto com o estado — nunca mande pixel.
4. **A geometria é a do anfitrião.** Se o tabuleiro muda de forma no
   retrato/paisagem, o convidado usa a forma do anfitrião; senão as posições não
   batem entre os aparelhos.
5. **Estado inteiro, não diferença.** Mande o mundo completo a cada pacote
   (numerado, campos curtos, inteiros). É mais simples e perdoa pacote perdido.

### 4.2 API

| Chamada | Vai para |
|---|---|
| `P.multijogador.enviar(d)` | todos menos você — **o anfitrião usa esta** |
| `P.multijogador.paraAnfitriao(d)` | só o anfitrião — **os convidados usam esta** |
| `P.multijogador.paraJogador(id, d)` | um jogador |
| `P.multijogador.terminar(placar)` | encerra a partida; todos caem em `aoTerminar` |
| `P.multijogador.sair()` | sai da sala (volta a ser jogo de um jogador) |
| `P.multijogador.em(evento, fn)` | `sala`, `inicio`, `fim`, `abortou`, `saiu`, `msg`, `erro`, `online`, `offline` |

O servidor **não olha** o conteúdo de `d` — o formato é assunto do jogo, dos
dois lados. Ele só limita tamanho (64 KB) e frequência (90 msg/s).

### 4.3 O que chega em `aoComecar(sala)`

```js
{
  codigo: 'AB12', estado: 'jogando', modo: 'competitivo',
  max: 5, min: 2, taxaEstado: 20, semente: 1042942333,
  eu: 'a1b2c3', souAnfitriao: true, anfitriao: 'a1b2c3',
  jogadores: [ { id, apelido, cor, indice, pronto, anfitriao }, … ]
}
```

- `indice` — posição fixa do jogador na partida. **Use-o como identidade dentro
  do jogo** (cabe em um byte no pacote); `id` é para falar com a plataforma.
- `cor` — pinte cada jogador com ela, sempre igual nos cinco aparelhos.
- `semente` — igual para todos, para sorteio sincronizado.

### 4.4 Formato de pacote que funciona

Arrays de números, campos de uma letra. Referência real (Galinha Feliz, 5
jogadores, **577 bytes** a 20 Hz):

```js
// anfitrião → todos
{ k:'e', n:seq, c:colunas, f:fase, tl:tempo*10|0, el:progresso, mt:meta,
  g:[[indice,x,y,dir,andando,fracao,…], …],   // um por jogador
  o:[[celula,fracao,…,dono], …],              // objetos do mundo
  s:[[indice,pontos,…], …],                   // placar
  ev:[[tipo,x,y,indice,valor], …] }           // avisos p/ som e partícula

// convidado → anfitrião
{ k:'i', ax:alvoX, ay:alvoY, dx:-1|0|1, dy:-1|0|1, tem:0|1 }
```

Arredonde (`x|0`), corte casas decimais e limite a fila de avisos. Se o pacote
passar de ~2 KB com o máximo de jogadores, está mandando coisa demais.

### 4.5 O que o jogo tem que tratar

| Situação | O que fazer |
|---|---|
| Jogador sai no meio (`em('saiu')`) | tirar do mundo e do placar, partida continua |
| Anfitrião cai (`aoAbortar`) | voltar para a sala com o aviso; **nunca** travar a tela |
| A plataforma não confirma o fim | mostrar o placar local depois de ~3 s |
| Pacote atrasado chega depois do fim | ignorar (`if (tela !== 'jogando') return`) |
| Ficou sem pacote por > 2 s | avisar "conexão instável" na tela |
| Em grupo, alguém pede pausa | não pausar — o mundo é de todos |
| Fim de partida em grupo | mostrar o **placar da sala**, não o ranking de um jogador só |

### 4.6 Segurança

Apelido, cor e pontos **vêm de outro aparelho**: são dados, não código.

```js
li.textContent = jogador.apelido;                    // certo
li.innerHTML = '…' + jogador.apelido + '…';          // ERRADO
var cor = /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#fff' // valide antes de usar em style
```

---

## 5. Estilo de código deste repositório

| Onde | Como |
|---|---|
| `jogos/*/` (jogos) | ES5: `var`, IIFE com `'use strict'`, sem `import` — roda em tablet velho |
| `server/src/` | ESM moderno: `import`, `const`/`let`, `async/await` |
| Nomes | **português** (`listarJogos`, `pastaDoJogo`, `galinhas`, `anfitriao`) |
| Comentários | português, explicando **por quê**, não o quê; sem acento dentro de comentário longo é aceitável, texto de tela sempre com acento |
| Texto para a criança | português, curto e gentil ("Ops! Já tem ovo", "Peça para os amigos digitarem esse código") |
| Dependências | **nenhuma nova**, nem no servidor nem no jogo — o WebSocket foi escrito à mão justamente por isso |

---

## 6. Antes de dizer que terminou

```bash
# 1. sintaxe de tudo que mexeu
node --check jogos/meu-jogo/game.js

# 2. servidor de pé numa porta de teste
cd server && PORTA=4123 ADMIN_SENHA=teste node src/server.js

# 3. o catálogo enxerga o jogo, sem "problema" e com os selos certos
curl -s http://127.0.0.1:4123/api/jogos | grep -o '"slug":"meu-jogo"[^}]*'
curl -s http://127.0.0.1:4123/api/jogos/meu-jogo | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d).jogo;console.log({problema:j.problema,selos:j.selos,mj:j.plataforma.multijogador})})"

# 4. a plataforma está ligada
curl -s http://127.0.0.1:4123/api/plataforma
```

Checklist:

- [ ] `node --check` passa em todo `.js` alterado.
- [ ] `problema` do jogo vem `null` na API (isso pega `jogo.json` inválido,
      `index.html` faltando e manifesto fora dos limites).
- [ ] O jogo abre em `/jogar/meu-jogo` **e** direto em `/jogos/meu-jogo/`.
- [ ] Com o servidor **desligado**, o `index.html` ainda abre e joga.
- [ ] Multijogador testado **de verdade com 2 abas** (uma cria, a outra entra
      pelo código): os dois veem o mesmo placar, o mesmo relógio e o mesmo mundo.
- [ ] Testado com o **máximo de jogadores declarado**, não só com dois.
- [ ] Fechar a aba do anfitrião no meio devolve os outros para a sala.
- [ ] Funciona no dedo, e girar o aparelho não quebra a partida.
- [ ] Segue o contrato da tela (seção 7): HUD translúcido em volta do palco,
      controles de toque só no dedo, e `node server/scripts/fotografar.mjs`
      mostra o jogo inteiro no celular deitado.
- [ ] `README.md` do jogo diz como se joga, a pontuação e as decisões técnicas.
- [ ] Nada de novo em `package.json`.

Para testar sem navegador (dois jogos conversando de verdade), o caminho que
funciona é carregar o `game.js` num contexto `vm` do Node com um DOM de mentira
(`getElementById` devolvendo stubs, `getContext('2d')` num `Proxy` que engole
todo método de desenho, `requestAnimationFrame` chamado à mão) e ligar o
`enviar` de uma instância no `aoReceber` da outra. Dá para rodar 5 jogadores e
uma fase inteira em segundos — foi assim que o multijogador da Galinha Feliz foi
verificado. Esse arnês não está no repositório.

---

## 7. Celular e tablet: o contrato da tela

A Central abre todo jogo num `iframe` (`/jogar/<slug>`) e, num **celular**
(aparelho de dedo com o lado menor abaixo de 600px), faz três coisas sem o
jogo saber: tenta **deitar a tela** (`screen.orientation.lock('landscape')`,
que o navegador só aceita em tela cheia ou com a Central instalada como app),
**pede para girar** quando não consegue (com um botão que entra em tela cheia
e gira de uma vez), e põe a própria barra por cima do jogo como **pílulas
translúcidas no canto de cima à direita** sempre que a altura é o que falta
(dedo deitado, ou qualquer janela baixinha). Em pé, a barra fica no fluxo, só
mais magra.

O que o jogo tem que fazer da parte dele — os três jogos do repositório são o
modelo, e `jogos/come_come/style.css` é o mais comentado:

| Regra | Como |
|---|---|
| O **palco manda na tela** | `ajustarPalco()` escolhe o maior tamanho que couber, lendo a folga de verdade do `body` (`getComputedStyle`), nunca um número chutado |
| Tudo o que não é jogo é **translúcido** e **não rouba o toque** | HUD com `pointer-events: none` e só os botões com `auto`; fundos `rgba(...)` |
| **Deitado**, o HUD vira coluna do lado; **em pé**, faixa em cima | `@media (orientation: landscape)` põe o HUD `position: absolute` em coluna, encostado no palco por `--palco-l` (largura que o JS publica); em pé ele fica em fluxo |
| Se não pode cobrir o jogo, **reserve a faixa** | `--banda: <px>` no `#app` (o JS desconta dos dois lados). Zero quando cobrir a borda não atrapalha (o céu do Super Adventure) |
| Se a coluna não cabe na altura, ela quebra **para fora**, nunca por cima do palco | `flex-wrap: wrap` com `max-height: 100%` e `direction: rtl` no contêiner (filhos `ltr`) |
| Controles de toque **só em aparelho de dedo**, e no lugar do cartaz de teclas | `matchMedia('(pointer: coarse)')` mais a rede de segurança do primeiro `pointerdown` de `pointerType === 'touch'` |
| Botões de dedo com **44px ou mais**, `touch-action: none`, e a captura implícita solta no `pointerdown` | assim o polegar escorrega de um botão para o outro |
| O toque escreve no **mesmo lugar** que o teclado | a física, a pausa e a rede não podem saber de onde veio o pedido |
| Ajuda e cartaz **sem teclado** no dedo | linhas de tecla com `class="teclado"` (somem em `pointer: coarse`), a do dedo com `class="so-toque"` |
| O botão de **tela cheia some** onde ela não existe | `document.fullscreenEnabled` (o iPhone não tem, um iframe sem `allowfullscreen` também não) |
| O **canto de cima à direita** da tela é da Central | deitado, o Voltar dela mora ali; placares e avisos do jogo ficam abaixo (`top: 56px`) |
| Telas (menu, pausa, fim) por cima da **janela inteira** quando ela é baixinha | `@media (max-height: 520px){ .tela{ position: fixed } }` — dentro do palco elas não caberiam |

Para conferir sem aparelho: `node server/scripts/fotografar.mjs` fotografa
cada jogo como celular (em pé e deitado), tablet e computador, com o jogo
rolando. Não substitui um toque de verdade (a trava de orientação e a tela
cheia só existem no aparelho), mas mostra o layout inteiro.

## 8. Onde olhar quando travar

| Quero… | Vá para |
|---|---|
| entender a plataforma inteira | [PLATAFORMA.md](PLATAFORMA.md) |
| ver um jogo completo e no padrão | `jogos/galinha_feliz/` (multijogador de 5, ~1700 linhas) |
| ver os controles de toque e o layout de celular | `jogos/come_come/` (cruzeta e deslize) e `jogos/super_adventure/` (botões de correr e pular) |
| ver o contrato do `jogo.json` | `server/src/plataforma/manifesto.js` |
| ver salas, anfitrião e repasse | `server/src/plataforma/salas.js` |
| ver a API que o jogo usa | `server/public/plataforma/sdk.js` |
| publicar / esconder / apagar jogo | `/admin` (senha no `.env`) |

**Não mexa** em `server/src/plataforma/websocket.js` sem necessidade real: é
RFC 6455 escrito à mão e testado (handshake, máscara, fragmento, ping/pong,
fechamento limpo e abrupto). Um erro ali derruba o multijogador de todos os
jogos.
