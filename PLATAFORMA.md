# 🕹️ A Plataforma — o padrão que todo jogo segue

Cada jogo aqui é uma pasta com um `index.html`. Isso continua valendo: um jogo
que não sabe nada da plataforma **continua funcionando**. O que a plataforma faz
é oferecer, de graça, o que todo jogo acaba precisando e ninguém quer escrever
de novo:

| Recurso | Estado hoje |
|---|---|
| 👥 **Multijogador** (salas, até 8 pessoas) | **funcionando** |
| 🏆 **Ranking** central por jogo | contrato pronto, servidor ainda não |
| 🔒 **Privacidade** (o que o jogo guarda de quem joga) | contrato pronto, painel ainda não |
| 🔞 **Classificação etária** (portão para 18+) | contrato pronto, portão ainda não |

Os quatro já podem ser **declarados** no `jogo.json`. O servidor valida tudo
desde já — quando cada peça entrar no ar, os jogos que declararam certo passam a
funcionar sem mudar uma linha.

---

## 1. Declarar: o bloco `plataforma` do `jogo.json`

```json
{
  "nome": "Galinha Feliz",
  "emoji": "🐔",

  "plataforma": {
    "versao": 1,

    "multijogador": {
      "min": 2,
      "max": 5,
      "modo": "competitivo",
      "autoridade": "anfitriao",
      "taxaEstado": 20,
      "listarSalas": true
    },

    "ranking":       { "metrica": "pontos", "rotulo": "Pontos", "ordem": "desc", "tamanho": 10 },
    "classificacao": { "idadeMinima": 0, "conteudo": [] },
    "privacidade":   { "coleta": ["apelido"], "guardaLocal": true, "guardaServidor": false }
  }
}
```

| Campo | Padrão | O que faz |
|---|---|---|
| `multijogador.min` / `.max` | 2 / 2 | quantos jogadores a sala aceita (teto da plataforma: **8**) |
| `multijogador.modo` | `competitivo` | `competitivo` ou `cooperativo` — o jogo decide o que fazer com isso |
| `multijogador.autoridade` | `anfitriao` | quem simula o jogo (hoje só existe este modelo) |
| `multijogador.taxaEstado` | 15 | quantas vezes por segundo o anfitrião manda o mundo (5 a 30) |
| `multijogador.listarSalas` | `true` | a sala aparece na lista de "salas abertas aqui perto" |
| `ranking.metrica` / `.rotulo` / `.ordem` / `.tamanho` | pontos / Pontos / desc / 10 | como o placar é comparado |
| `classificacao.idadeMinima` | 0 | 18 marca o jogo como adulto (selo 18+ no catálogo) |
| `privacidade.coleta` | `["apelido"]` | o que o jogo guarda de quem joga |
| `privacidade.guardaLocal` / `.guardaServidor` | `true` / `false` | onde esses dados ficam |

O servidor **normaliza** e nunca confia no que está escrito: pedir `"max": 99`
vira 8 e o problema aparece no painel do admin. Um jogo sem o bloco `plataforma`
é um jogo de um jogador só — e está tudo certo.

---

## 2. Usar: o SDK no jogo

```html
<script src="/plataforma/sdk.js"></script>
<script src="game.js"></script>
```

```js
if (window.Plataforma) {
  Plataforma.iniciar({ jogo: 'meu-jogo' }).then(function (P) {
    if (!P.multijogador.disponivel) return;         // servidor fora do ar: segue sozinho

    botaoAmigos.hidden = false;
    botaoAmigos.onclick = function () {
      P.multijogador.abrirLobby({
        aoComecar:  function (sala) { comecarPartida(sala); },
        aoReceber:  function (msg)  { trataMensagem(msg.de, msg.d); },
        aoTerminar: function (fim)  { mostraPlacar(fim.placar); },
        aoAbortar:  function (a)    { avisa(a.motivo); },
        voltarAoLobby: false        // o jogo controla a tela de fim
      });
    };
  });
}
```

`abrirLobby()` já desenha a tela de sala inteira: nome do jogador, **criar sala**,
**entrar com código de 4 letras**, lista de salas abertas na rede, quem já chegou
e o botão de começar. O jogo não precisa escrever nada disso.

### O que chega em `aoComecar(sala)`

```js
{
  codigo: 'AB12', estado: 'jogando', modo: 'competitivo',
  max: 5, min: 2, taxaEstado: 20, semente: 1042942333,
  eu: 'a1b2c3', souAnfitriao: true, anfitriao: 'a1b2c3',
  jogadores: [ { id, apelido, cor, indice, pronto, anfitriao }, … ]
}
```

`indice` é a posição fixa do jogador na partida — use-o como identidade dentro do
jogo, e `cor` para pintar cada jogador. `semente` é igual para todos, para quem
quiser sorteio sincronizado.

### Mandar e receber

| Chamada | Vai para |
|---|---|
| `P.multijogador.enviar(d)` | todo mundo menos você (o anfitrião usa esta) |
| `P.multijogador.paraAnfitriao(d)` | só o anfitrião (os convidados usam esta) |
| `P.multijogador.paraJogador(id, d)` | um jogador |
| `P.multijogador.terminar(placar)` | encerra a partida — todos caem em `aoTerminar` |

O servidor **não olha** o conteúdo de `d`: quem entende é o jogo, dos dois lados.
Só o tamanho (64 KB) e a frequência (90 msg/s) são controlados.

### O modelo: o anfitrião manda

```
 CONVIDADO                    ANFITRIÃO                     CONVIDADO
 "quero ir ali"  ─────────▶  simula o mundo  ─────────────▶  desenha
 (~20x/s)                    (o jogo inteiro)   (~20x/s)     e prevê
```

Existe **um só lugar** que decide o que aconteceu, então nunca acontece de dois
jogadores acharem que pegaram a mesma coisa. Se o anfitrião cair no meio da
partida, a plataforma avisa todo mundo (`aoAbortar`) e devolve a sala ao lobby
com um novo anfitrião.

Regras de bolso para o jogo:

1. **Convidado não simula.** Ele manda o que apertou e desenha o que chega.
2. **Convidado pode adivinhar a própria posição** para o controle não ficar
   "molenga" — e corrigir de leve quando o pacote do anfitrião chegar.
3. **Efeito é local.** Som, poeirinha e textinho o convidado refaz sozinho a
   partir dos avisos que vêm junto com o estado — não precisa mandar pixel.
4. **O tabuleiro é o do anfitrião.** Se o jogo muda de forma no retrato/paisagem,
   o convidado tem que usar a forma do anfitrião, senão as posições não batem.

---

## 3. Por dentro

| Arquivo | Papel |
|---|---|
| `server/src/plataforma/manifesto.js` | lê e valida o bloco `plataforma` do `jogo.json` |
| `server/src/plataforma/salas.js` | salas, códigos, anfitrião, repasse de mensagens |
| `server/src/plataforma/websocket.js` | WebSocket (RFC 6455) escrito à mão, sem dependência |
| `server/src/plataforma/index.js` | liga tudo no Express e no servidor HTTP |
| `server/public/plataforma/sdk.js` | `window.Plataforma` — o SDK e a tela de lobby |

| Endereço | O que é |
|---|---|
| `GET /api/plataforma` | versão, o que está disponível, quantas salas abertas |
| `GET /api/plataforma/salas?jogo=<slug>` | salas abertas daquele jogo |
| `GET /plataforma/sdk.js` | o SDK |
| `ws://…/plataforma/ws` | o canal das salas |

Mensagens do canal (JSON, sempre com `t`):

| Cliente → servidor | Servidor → cliente |
|---|---|
| `criar`, `entrar`, `sair` | `ola`, `entrei`, `sala`, `saiu`, `anfitriao` |
| `pronto`, `iniciar`, `fim` | `inicio`, `fim`, `abortou` |
| `msg` (repasse) | `msg`, `erro` |

### Limites e freios

- Máximo de **8** jogadores por sala (o jogo pode pedir menos).
- Mensagem de até **64 KB**, **90 por segundo** por conexão — quem passa disso
  é desconectado.
- Sala vazia é apagada na hora; sala parada, depois de 20 minutos.
- Código de sala não usa `O`, `0`, `I` nem `1` — criança digita olhando a tela
  do amigo.
- Ninguém entra numa sala que já começou nem numa sala cheia.
- O apelido é cortado em 14 letras e, se repetir, vira "Ana 2".

### Isto roda na rede de casa

A plataforma não tem login nem senha: quem está na mesma rede e sabe o código
entra na sala. É de propósito — é o mesmo nível de confiança do resto da Central
de Jogos. Para expor na internet, coloque um proxy com HTTPS na frente (o SDK já
troca `ws://` por `wss://` sozinho) e trate a rede como pública. O HTTPS da
própria Central (`HTTPS_CERT`/`HTTPS_CHAVE`, no README) também serve as salas.

---

## 4. O que vem depois

- **Ranking**: `POST /api/plataforma/ranking/<jogo>` guardando placar por jogo no
  disco, com o `ranking.metrica` do manifesto mandando na ordenação.
- **Privacidade**: uma página `/privacidade` montada a partir do que cada jogo
  declara em `privacidade.coleta`, e um botão de apagar meus dados.
- **Classificação etária**: `/jogar/<slug>` para antes de abrir quando
  `classificacao.idadeMinima >= 18`, com a confirmação ficando no navegador.

Os três já têm contrato e já são validados. Quando entrarem, `capacidades` em
`GET /api/plataforma` vira `disponivel: true` e os jogos que declararam
corretamente passam a usá-los sem mudar código.
