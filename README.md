# 🎮 Central de Jogos

Um catálogo caseiro de jogos HTML5 para as crianças. Cada pasta dentro de
`jogos/` vira um cartão no catálogo; um painel de admin permite publicar jogos
novos enviando um `.zip`.

```
docker-compose.yml   sobe tudo com um comando
.env                 senha do admin e configurações (você cria a partir do .env.example)
AGENTS.md            leia antes de criar um jogo novo — o passo a passo e o checklist
PLATAFORMA.md        o padrão que os jogos seguem (multijogador, ranking, privacidade)
jogos/               é aqui que os jogos moram — uma pasta por jogo
  galinha_feliz/     o jogo que já existia, agora no padrão
certificados/        (opcional) certificado do HTTPS — só para instalar como app no Android
server/              o servidor (Node + Express) e as páginas do catálogo/admin
  src/plataforma/    salas multijogador, WebSocket e validação do manifesto
testes/              testes dos jogos e da Central, sem framework (node testes/…)
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
| <https://localhost:8443/> | a mesma Central em HTTPS — só se você ligar (veja [Instalar no celular](#instalar-no-celular-e-no-tablet)) |

Nos tablets e celulares da casa, troque `localhost` pelo IP do computador
(`ipconfig` no Windows), por exemplo `http://192.168.0.10:8099/`.

Se a porta 8099 já estiver ocupada, mude `PORTA_HOST` no `.env`.

Comandos do dia a dia:

```bash
docker compose logs -f     # ver o que está acontecendo
docker compose restart     # reiniciar
docker compose down        # desligar (os jogos continuam em jogos/)
```

## Instalar no celular e no tablet

A Central é um **app instalável** (PWA): na tela inicial ela ganha ícone
próprio, abre sem a barra do navegador e os jogos que já foram jogados
continuam abrindo mesmo com o Wi-Fi fora. Não tem loja nem download — é o
próprio site, guardado no aparelho.

| Aparelho | Como instalar |
|---|---|
| **iPhone / iPad** | no Safari, **Compartilhar** → **Adicionar à Tela de Início**. Funciona direto, mesmo em `http://`. |
| **Android** | toque em **📲 Instalar** no topo do catálogo. O Chrome só oferece isso num endereço **https** — veja abaixo. |
| **Computador** | Chrome ou Edge: **📲 Instalar** no catálogo, ou o ícone de instalar na barra de endereço. |

O botão **📲 Instalar** sabe em que aparelho está: no Android/Chrome abre o
pedido nativo; no iPhone mostra o passo a passo do Safari; num endereço `http`
explica as duas saídas abaixo, já com o endereço certo para copiar. Ele some
quando a Central já está aberta como app.

Toque longo no ícone do app abre **atalhos** direto para os jogos (os quatro
primeiros do catálogo).

### O Android exige HTTPS

Em `http://192.168.0.10:8099` o Chrome do Android não instala nada e não liga o
modo sem rede: ele só confia em `https://` (e em `localhost`). Duas saídas:

**A. Ligar o HTTPS da Central** — recomendado, vale para todos os aparelhos.

1. Gere um certificado para o IP do computador (troque `192.168.0.10`):

   ```bash
   openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
     -keyout certificados/chave.pem -out certificados/cert.pem \
     -subj "/CN=Central de Jogos" \
     -addext "subjectAltName=IP:192.168.0.10,DNS:localhost"
   ```

   No Git Bash do Windows, comece o comando com `MSYS_NO_PATHCONV=1` (senão
   ele troca o `/CN=` por um caminho de pasta). Os `.pem` ficam fora do git.

2. No `.env`, descomente e confira:

   ```
   HTTPS_CERT=/app/certificados/cert.pem
   HTTPS_CHAVE=/app/certificados/chave.pem
   PORTA_HTTPS_HOST=8443
   ```

   e rode `docker compose up -d`. A Central passa a responder também em
   `https://192.168.0.10:8443/`, salas multijogador inclusive (o SDK troca
   `ws://` por `wss://` sozinho). O `http` continua no ar.

3. Como o certificado é seu, cada aparelho precisa **confiar nele uma vez**.
   Mande o `cert.pem` para o aparelho (e-mail, WhatsApp, cabo) e:
   - **Android:** Configurações → Segurança → Criptografia e credenciais →
     Instalar um certificado → **Certificado CA** → escolha o arquivo.
   - **iPhone/iPad:** abra o arquivo e instale o perfil em Ajustes; depois
     Ajustes → Geral → Sobre → Ajustes de Confiança de Certificado → ative.

4. Abra `https://192.168.0.10:8443/` e toque em **📲 Instalar**.

**B. Só neste aparelho, sem certificado.** No Chrome do Android, abra
`chrome://flags/#unsafely-treat-insecure-origin-as-secure`, cole
`http://192.168.0.10:8099`, marque *Enabled* e reinicie o Chrome. A partir daí
esse endereço vale como seguro só nesse aparelho — e o **📲 Instalar** passa a
funcionar.

### Como o app funciona por dentro

- `/manifest.webmanifest` — o nome (o `TITULO` do `.env`), as cores, os ícones
  e os atalhos dos jogos. É montado na hora pelo servidor.
- `/sw.js` — o *service worker*, com uma regra só: **rede primeiro, cache
  depois**. Com a rede de casa no ar, tudo vem fresco do servidor (um jogo
  republicado aparece na hora, e anfitrião e convidados nunca ficam com
  versões diferentes). Sem rede, vem o que foi guardado da última vez; o que
  nunca foi aberto cai numa página de "sem conexão", e o catálogo marca esses
  jogos com **📴 precisa de conexão**.
- O admin, o login e a API das salas **nunca** passam pelo cache.
- Os ícones ficam em `server/public/icones/` e saem de
  `node server/scripts/gerar-icones.mjs` (o Chrome da máquina, em modo
  headless, fotografa o 🎮 sobre o gradiente do logo).

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

## Jogar em grupo

Jogos que seguem a plataforma podem ser jogados por várias pessoas ao mesmo
tempo, cada uma no seu aparelho, todos na mesma rede de casa. Na Galinha Feliz
são até **5 no mesmo terreiro**:

1. Um abre o jogo e clica em **👥 Jogar com amigos** → **Criar sala**.
2. Aparece um código de 4 letras (por exemplo `RU5L`).
3. Os outros abrem o mesmo jogo, clicam em **👥 Jogar com amigos** e ou digitam
   o código, ou só tocam na sala que já aparece na lista de *salas abertas aqui
   perto*.
4. Quem criou a sala clica em **Começar!**.

Se a conexão cair ou quem criou a sala fechar a aba, todo mundo volta para a
sala e um novo anfitrião assume — ninguém fica preso numa tela parada.

Para colocar multijogador (e, mais para a frente, ranking e políticas) num jogo
novo, comece por [AGENTS.md](AGENTS.md) — é o passo a passo com o checklist do
que será cobrado. O detalhe da plataforma está em [PLATAFORMA.md](PLATAFORMA.md).

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

Um bloco opcional `"plataforma"` liga o jogo no multijogador (e, mais adiante,
no ranking e nas políticas) — está tudo em [PLATAFORMA.md](PLATAFORMA.md).

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
| `TITULO` | `Central de Jogos` | nome no topo do catálogo e do app instalado |
| `TITULO_CURTO` | 1ª palavra do `TITULO` | nome debaixo do ícone do app (até 12 letras) |
| `HTTPS_CERT` / `HTTPS_CHAVE` | — | certificado e chave (PEM) para ligar o HTTPS; sem eles, só `http` |
| `PORTA_HTTPS_HOST` | `8443` | porta do HTTPS no navegador |
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

Para o HTTPS sem Docker, passe `HTTPS_CERT` e `HTTPS_CHAVE` com o caminho dos
arquivos (e `PORTA_HTTPS`, padrão `3443`).

Os testes não têm framework — cada arquivo roda sozinho e sai com código 1 se
algo falhar (`node testes/central/pwa.test.mjs` confere o app; os dos jogos
estão em `testes/<jogo>/`).

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `server/src/server.js` | rotas HTTP (catálogo, jogos, API do admin) |
| `server/src/catalogo.js` | lê a pasta `jogos/` e monta os dados de cada jogo |
| `server/src/instalarZip.js` | valida e instala o `.zip` enviado |
| `server/src/auth.js` | senha, cookie de sessão e freio de tentativas |
| `server/src/plataforma/` | salas multijogador, WebSocket e o manifesto dos jogos |
| `server/src/pwa.js` | o manifesto do app (montado na hora) e a rota do service worker |
| `server/public/` | catálogo, página de jogar e painel do admin |
| `server/public/sw.js` | o service worker: rede primeiro, cache depois |
| `server/public/pwa.js` | registra o service worker e cuida do botão **📲 Instalar** |
| `server/public/plataforma/sdk.js` | o `window.Plataforma` que os jogos carregam |
| `server/scripts/gerar-icones.mjs` | gera os PNG de `public/icones/` com o Chrome headless |

A rota `/jogar/<pasta>` abre o jogo num `iframe` com uma barrinha de *Voltar* e
*Tela cheia*; `/jogos/<pasta>/` serve os arquivos do jogo direto.
