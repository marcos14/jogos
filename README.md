# 🎮 Central de Jogos

Um catálogo caseiro de jogos HTML5 para as crianças. Cada pasta dentro de
`jogos/` vira um cartão no catálogo; um painel de admin permite publicar jogos
novos enviando um `.zip`.

```
docker-compose.yml   sobe tudo com um comando
.env                 senha do admin e configurações (você cria a partir do .env.example)
jogos/               é aqui que os jogos moram — uma pasta por jogo
  galinha_feliz/     o jogo que já existia, agora no padrão
server/              o servidor (Node + Express) e as páginas do catálogo/admin
```

## Como subir

```bash
cp .env.example .env      # no PowerShell: copy .env.example .env
# edite o .env e troque o ADMIN_SENHA
docker compose up -d --build
```

Pronto:

| Endereço | O que é |
|---|---|
| <http://localhost:8099/> | o catálogo — é este que as crianças abrem |
| <http://localhost:8099/admin> | painel para publicar/editar/apagar jogos |
| <http://localhost:8099/jogos/galinha_feliz/> | o jogo servido direto, sem a moldura |

Nos tablets e celulares da casa, troque `localhost` pelo IP do computador
(`ipconfig` no Windows), por exemplo `http://192.168.0.10:8099/`.

Se a porta 8099 já estiver ocupada, mude `PORTA_HOST` no `.env`.

Comandos do dia a dia:

```bash
docker compose logs -f     # ver o que está acontecendo
docker compose restart     # reiniciar
docker compose down        # desligar (os jogos continuam em jogos/)
```

## Publicando um jogo

**Pelo admin (o jeito normal):** entre em `/admin` com a senha do `.env`,
escolha o `.zip`, preencha nome/emoji/descrição e clique em *Publicar jogo*.

**Na unha:** copie a pasta do jogo para dentro de `jogos/`. O catálogo
percebe sozinho — não precisa reiniciar nada.

### O que o `.zip` precisa ter

Um `index.html`, na raiz do zip **ou** dentro de uma única pasta — os dois
formatos abaixo funcionam, porque o nível extra é removido automaticamente:

```
meu-jogo.zip                 meu-jogo.zip
├── index.html               └── Meu Jogo/
├── style.css                     ├── index.html
└── img/…                         └── style.css
```

Use sempre caminhos **relativos** dentro do jogo (`href="style.css"`, e não
`href="/style.css"`), já que ele é servido em `/jogos/<pasta>/`.

## O arquivo `jogo.json`

Opcional. Fica dentro da pasta do jogo e controla como o cartão aparece no
catálogo. O admin escreve esse arquivo para você, mas dá para editar à mão:

```json
{
  "nome": "Galinha Feliz",
  "descricao": "Uma frase para a criança saber do que se trata.",
  "emoji": "🐔",
  "cor": "#ff8fb8",
  "tags": ["arcade", "1 jogador"],
  "idade": "3+",
  "visivel": true
}
```

Sem `jogo.json`, o nome vem do nome da pasta e o cartão ganha um emoji e uma
cor padrão. Se existir uma imagem chamada `capa.png` (ou `.jpg`/`.webp`) na
pasta, ela é usada como capa no lugar do emoji.

`"visivel": false` esconde o jogo do catálogo sem apagá-lo — útil para deixar
algo pela metade sem que as crianças achem.

## Configuração (`.env`)

| Variável | Padrão | Para que serve |
|---|---|---|
| `ADMIN_SENHA` | — | **obrigatória**; senha do painel `/admin` |
| `SESSAO_SEGREDO` | derivado da senha | assina o cookie de login; se mudar, todos os logins caem |
| `PORTA_HOST` | `8099` | porta no navegador |
| `TITULO` | `Central de Jogos` | nome no topo do catálogo |
| `SESSAO_HORAS` | `12` | por quanto tempo o login continua valendo |
| `MAX_ZIP_MB` | `200` | tamanho máximo do `.zip` enviado |
| `MAX_DESCOMPACTADO_MB` | `600` | tamanho máximo depois de descompactar |

O `.zip` recebido fica num `tmpfs` de 512 MB (memória) e é apagado assim que
termina a instalação — se aumentar o `MAX_ZIP_MB` acima disso, aumente também
o `size=` do `tmpfs` no `docker-compose.yml`.

## Sobre segurança

Isto foi feito para rodar **na rede de casa**, não na internet aberta:

- O upload só aceita `.zip` e recusa caminhos que tentem escapar da pasta do
  jogo (`../`, caminhos absolutos), além de limitar tamanho e quantidade de
  arquivos.
- A instalação é feita numa pasta temporária e só troca pela definitiva no
  final: se der erro no meio, o jogo que já estava no ar continua intacto.
- O login usa um cookie assinado (HttpOnly) e trava depois de 10 tentativas
  erradas em 10 minutos.
- Jogos são HTML/JS servidos na mesma origem do painel — só publique jogos em
  que você confia.

Para expor na internet, coloque um proxy com HTTPS na frente e use uma senha
de verdade.

## Rodando sem Docker

```bash
cd server
npm install
ADMIN_SENHA=algumasenha npm start     # http://localhost:3000
```

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `server/src/server.js` | rotas HTTP (catálogo, jogos, API do admin) |
| `server/src/catalogo.js` | lê a pasta `jogos/` e monta os dados de cada jogo |
| `server/src/instalarZip.js` | valida e instala o `.zip` enviado |
| `server/src/auth.js` | senha, cookie de sessão e freio de tentativas |
| `server/public/` | catálogo, página de jogar e painel do admin |

A rota `/jogar/<pasta>` abre o jogo num `iframe` com uma barrinha de *Voltar* e
*Tela cheia*; `/jogos/<pasta>/` serve os arquivos do jogo direto.
