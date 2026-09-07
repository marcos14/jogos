/* ==========================================================================
   Central - o contrato de celular (moldura, orientacao e controles)
   --------------------------------------------------------------------------
   Rodar:  node testes/central/celular.test.mjs

   Nada aqui abre navegador: sao conferencias estaticas do que a pagina de
   jogar e os tres jogos prometem para um aparelho de dedo. O que um celular
   de verdade faz com isso (a trava de orientacao, a tela cheia) so da para
   ver no aparelho - ou nas fotos de `node server/scripts/fotografar.mjs`.

     - a pagina de jogar (jogar.html) tenta deitar o celular, pede para girar
       quando nao consegue, solta a trava ao sair, e poe a barra por cima do
       jogo como pilulas translucidas quando a altura e o que falta;
     - cada jogo tem o mesmo desenho: HUD translucido que nao rouba o toque,
       coluna do lado quando deitado (com a faixa `--banda` que o JS le), a
       folga e a largura do palco lidas do CSS de verdade, telas e controles
       que se adaptam ao dedo, e o botao de tela cheia que some onde ela nao
       existe;
     - o Come-Come tem cruzeta e deslize; o Super Adventure tem os botoes
       presos aos cantos da tela; a Galinha ganhou tela cheia.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ler = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');

let passaram = 0;
let falharam = 0;

function teste(nome, fn) {
  try {
    fn();
    passaram++;
    console.log(`  ok      ${nome}`);
  } catch (erro) {
    falharam++;
    console.log(`  FALHOU  ${nome}\n          ${erro.message.split('\n')[0]}`);
  }
}

console.log('Central - o contrato de celular\n');

// ------------------------------------------------------ A pagina de jogar --
const jogar = ler('server', 'public', 'jogar.html');

teste('a pagina de jogar tenta deitar o celular e solta a trava ao sair', () => {
  assert.ok(jogar.includes("screen.orientation.lock('landscape')"), 'a trava de paisagem');
  assert.ok(jogar.includes('screen.orientation.unlock()'), 'e o destravar');
  assert.ok(/addEventListener\('pagehide',\s*destravar\)/.test(jogar), 'destrava ao sair da pagina');
  assert.ok(jogar.includes("addEventListener('fullscreenchange'"), 'tenta de novo a cada tela cheia');
  assert.ok(/Math\.min\(screen\.width,\s*screen\.height\)\s*<\s*600/.test(jogar),
    'celular = aparelho de dedo com o lado menor abaixo de 600px');
});

teste('quando nao consegue girar, pede - e nunca prende a crianca', () => {
  for (const trecho of ['id="girar"', 'id="btn-girar"', 'id="btn-em-pe"', 'Gire o celular',
                        'Jogar em pé mesmo', 'role="dialog"']) {
    assert.ok(jogar.includes(trecho), `faltou ${trecho}`);
  }
  assert.ok(/id="girar" hidden/.test(jogar), 'o aviso nasce escondido');
  assert.ok(/if \(!emPe\.matches\) dispensado = true/.test(jogar),
    'deitou uma vez: o aviso nao volta a incomodar na mesma partida');
  assert.ok(jogar.includes('btnGirar.hidden = !podeTelaCheia'),
    'sem tela cheia (iPhone) o botao de girar some e fica so o pedido');
});

teste('a barra vira pilulas translucidas por cima do jogo quando a altura falta', () => {
  const compacta = jogar.slice(jogar.indexOf('#palco.compacta #barra {'), jogar.indexOf('#palco:fullscreen #barra:hover'));
  assert.ok(/position:\s*absolute/.test(compacta), 'a barra sai do fluxo');
  assert.ok(/right:\s*max\(6px, env\(safe-area-inset-right\)\)/.test(compacta), 'no canto de cima a direita');
  assert.ok(/rgba\(20, 16, 30, \.45\)/.test(compacta), 'translucida');
  assert.ok(/opacity:\s*\.55/.test(compacta), 'e discreta ate o dedo chegar perto');
  assert.ok(jogar.includes("(deDedo.matches && !emPe.matches) || baixinha.matches"),
    'compacta = dedo deitado, ou qualquer janela baixinha');
  assert.ok(jogar.includes("palco.classList.toggle('magra'"), 'em pe, so mais magra');
  assert.ok(jogar.includes('btnTela.hidden = !podeTelaCheia'), 'o botao de tela cheia some onde ela nao existe');
});

// --------------------------------------------------------------- Os jogos --
const JOGOS = [
  { slug: 'come_come', hud: '#hud{', botao: '.botao-icone{', palco: '#palco{' },
  { slug: 'super_adventure', hud: '#hud{', botao: '.botao-icone{', palco: '#palco{' },
  { slug: 'galinha_feliz', hud: '#hud{', botao: '.icon-btn{', palco: '#stage{' },
];

for (const jogo of JOGOS) {
  const css = ler('jogos', jogo.slug, 'style.css');
  const js = ler('jogos', jogo.slug, 'game.js');
  const html = ler('jogos', jogo.slug, 'index.html');
  const bloco = (inicio) => {
    const i = css.indexOf(inicio);
    assert.ok(i >= 0, `faltou ${inicio} no style.css`);
    return css.slice(i, css.indexOf('}', i));
  };

  teste(`${jogo.slug}: o HUD e translucido e nao rouba o toque`, () => {
    assert.ok(/--vidro:\s*rgba\([^)]*,\s*\.\d+\)/.test(css), 'o "vidro" e translucido');
    assert.ok(/\.hud-box\{[^}]*var\(--vidro\)/.test(css), 'as caixas do HUD sao feitas dele');
    assert.ok(/pointer-events:\s*none/.test(bloco(jogo.hud)), 'as caixas deixam o dedo passar');
    assert.ok(/pointer-events:\s*auto/.test(bloco(jogo.botao)), 'e so os botoes recebem clique');
  });

  teste(`${jogo.slug}: deitado o HUD vira coluna do lado, em pe fica em cima`, () => {
    const deitado = css.slice(css.indexOf('@media (orientation: landscape)'));
    assert.ok(deitado.length > 0, 'ha regra para deitado');
    assert.ok(/#hud\{[^}]*position:\s*absolute/.test(deitado), 'deitado, o HUD sai do fluxo');
    assert.ok(/#hud\{[^}]*flex-direction:\s*column/.test(deitado), 'em coluna');
    assert.ok(/var\(--palco-l\)/.test(deitado), 'encostado no palco pela largura que o JS publica');
    assert.ok(/--banda:\s*\d+px/.test(css), 'com a faixa reservada declarada');
    assert.ok(css.includes('@media (pointer: coarse)'), 'e o aparelho de dedo tem regra propria');
    assert.ok(css.includes('@media (max-height: 520px)'), 'e a tela baixinha tambem');
  });

  teste(`${jogo.slug}: o JS le a folga e a faixa do CSS e publica a largura do palco`, () => {
    assert.ok(js.includes("getPropertyValue('--banda')"), 'le --banda');
    assert.ok(js.includes("setProperty('--palco-l'"), 'escreve --palco-l');
    assert.ok(/function folgaVertical\(\)/.test(js), 'a folga vem do padding de verdade');
    assert.ok(/paddingTop/.test(js) && /paddingBottom/.test(js));
    assert.ok(!/innerHeight - sobra - 16|innerHeight - others - 24/.test(js), 'nada de folga chutada');
  });

  teste(`${jogo.slug}: o botao de tela cheia some onde ela nao existe`, () => {
    assert.ok(/function telaCheiaDisponivel\(\)/.test(js));
    assert.ok(js.includes('document.fullscreenEnabled'), 'pergunta ao navegador');
    assert.ok(js.includes('telaCheiaDisponivel()'), 'e usa a resposta no botao');
    assert.ok(/id="btn-(tela-cheia|fullscreen)"/.test(html), 'o botao existe');
  });

  teste(`${jogo.slug}: o palco reage ao dedo, nao a pagina`, () => {
    assert.ok(/touch-action:\s*none/.test(bloco(jogo.palco)) || /#game\{[^}]*touch-action:\s*none/.test(css),
      'arrastar no palco e jogo, nunca rolagem');
    assert.ok(/user-scalable=no/.test(html), 'sem zoom de dois dedos');
    assert.ok(/viewport-fit=cover/.test(html), 'ate a borda do recorte da camera');
  });
}

// ------------------------------------------------------ Cada jogo, o seu --
teste('Come-Come: cruzeta e deslize no dedo, cartaz de teclas so no teclado', () => {
  const css = ler('jogos', 'come_come', 'style.css');
  const html = ler('jogos', 'come_come', 'index.html');
  const js = ler('jogos', 'come_come', 'game.js');
  for (const id of ['toque-cima', 'toque-baixo', 'toque-esquerda', 'toque-direita']) {
    assert.ok(html.includes(`id="${id}"`), `faltou a seta ${id}`);
  }
  assert.ok(js.includes('direcaoDoDeslize'), 'o deslize existe');
  assert.ok(/\.ajuda \.teclado\{\s*display:\s*none/.test(css), 'sem teclado na ajuda do dedo');
  const deitadoDedo = css.slice(css.indexOf('@media (pointer: coarse) and (orientation: landscape)'));
  assert.ok(/--banda:\s*196px/.test(deitadoDedo), 'deitado no dedo, a faixa da cruzeta e maior');
});

teste('Super Adventure: no dedo os botoes ficam presos aos cantos da tela', () => {
  const css = ler('jogos', 'super_adventure', 'style.css');
  const dedo = css.slice(css.indexOf('@media (pointer: coarse)'), css.indexOf('@media (max-height: 520px)'));
  assert.ok(/#toque\{[^}]*position:\s*fixed/.test(dedo), 'a moldura dos botoes e presa a tela');
  assert.ok(/safe-area-inset/.test(dedo), 'longe do recorte da camera');
  assert.ok(/\.toque-botao\{[^}]*var\(--vidro-claro\)/.test(css), 'e os botoes sao translucidos');
});

teste('Galinha Feliz: ganhou tela cheia (botao e tecla F), e o nome sai na tela baixinha', () => {
  const html = ler('jogos', 'galinha_feliz', 'index.html');
  const js = ler('jogos', 'galinha_feliz', 'game.js');
  const css = ler('jogos', 'galinha_feliz', 'style.css');
  assert.ok(html.includes('id="btn-fullscreen"'));
  assert.ok(js.includes("ev.code === 'KeyF'"), 'a tecla F');
  assert.ok(js.includes('if (ev.target === el.input) return;'), 'digitar o nome nao dispara atalho');
  const baixinha = css.slice(css.indexOf('@media (max-height: 520px)'));
  assert.ok(/\.hud-box\.name-box\{\s*display:\s*none/.test(baixinha), 'o jogador ja sabe o proprio nome');
});

teste('a ferramenta de fotos existe e nao traz dependencia nenhuma', () => {
  const script = ler('server', 'scripts', 'fotografar.mjs');
  assert.ok(script.includes('new WebSocket('), 'usa o WebSocket do proprio Node');
  assert.ok(!/from ['"](puppeteer|playwright|ws)['"]/.test(script), 'sem pacote novo');
  const pacote = JSON.parse(ler('server', 'package.json'));
  assert.deepEqual(Object.keys(pacote.dependencies).sort(), ['adm-zip', 'express', 'multer']);
});

console.log(`\nCentral (celular): ${passaram}/${passaram + falharam} passaram.`);
process.exit(falharam ? 1 : 0);
