/* ==========================================================================
   Fotografa os jogos da Central como um celular, um tablet e um computador
   --------------------------------------------------------------------------
   Roda na maquina de quem desenvolve, com a Central no ar. Dirige o Chrome
   (ou o Edge) em modo headless pelo protocolo do DevTools - o WebSocket que
   o Node ja tem, sem dependencia nenhuma - fingindo cada aparelho: tamanho
   da tela, ponteiro de dedo (`pointer: coarse`) e orientacao. Em cada foto o
   jogo e aberto pela pagina de jogar (/jogar/<slug>), o "Jogar" e clicado
   dentro do iframe e a tela e capturada com o jogo rolando.

   E o jeito de conferir o layout de celular sem ter o celular na mao: a
   trava de orientacao e a tela cheia nao dao para testar aqui (o navegador
   so as libera num toque de verdade), mas o resto - HUD em coluna, cruzeta,
   aviso de girar, palco no tamanho certo - aparece nas fotos.

   Rodar:  cd server && PORTA=4123 ADMIN_SENHA=teste node src/server.js
           node server/scripts/fotografar.mjs                (todas as fotos)
           node server/scripts/fotografar.mjs come_come celEmPe   (so as que casam)
           BASE=http://127.0.0.1:8099 SAIDA=fotos node server/scripts/fotografar.mjs
           CHROME="/caminho/do/chrome" node server/scripts/fotografar.mjs

   As fotos vao para a pasta SAIDA (padrao: server/tmp/fotos), uma por
   combinacao de jogo e aparelho; ao lado de cada nome sai o que a pagina
   respondeu (ponteiro, orientacao, tamanho do palco, aviso de girar).
   ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:4123';
const SAIDA = path.resolve(process.env.SAIDA || path.join(aqui, '..', 'tmp', 'fotos'));
const PORTA_CDP = Number(process.env.PORTA_CDP || 9333);
const filtros = process.argv.slice(2);

const CANDIDATOS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/** Os aparelhos fingidos: largura x altura em px CSS, e se sao de dedo. */
const APARELHOS = {
  celDeitado:  { width: 844,  height: 390,  mobile: true,  touch: true },
  celEmPe:     { width: 390,  height: 844,  mobile: true,  touch: true },
  celPequeno:  { width: 740,  height: 360,  mobile: true,  touch: true },
  tablet:      { width: 1024, height: 768,  mobile: true,  touch: true },
  tabletEmPe:  { width: 768,  height: 1024, mobile: true,  touch: true },
  desktop:     { width: 1280, height: 720,  mobile: false, touch: false },
  desktopAlto: { width: 1000, height: 900,  mobile: false, touch: false },
};

/** Como se comeca uma partida em cada jogo, dentro do iframe da Central. */
const COMECAR = {
  come_come: (d) => { d.getElementById('campo-apelido').value = 'Bia'; d.getElementById('btn-jogar').click(); },
  super_adventure: (d) => { d.getElementById('btn-solo').click(); },
  galinha_feliz: (d) => { d.getElementById('input-name').value = 'Bia'; d.getElementById('btn-play').click(); },
};

// Roda dentro da pagina de jogar: `fn` recebe o documento do jogo.
const noJogo = (fn) => `(${fn.toString()})(document.getElementById('quadro').contentDocument)`;
const DISPENSAR = `(() => { const b = document.getElementById('btn-em-pe'); if (b) b.click(); })()`;
const PRONTO = `(() => { const q = document.getElementById('quadro'); const d = q && q.contentDocument;
  return !!(d && d.readyState === 'complete' && d.getElementById('app') && d.querySelector('#hud')); })()`;
const ESTADO = `(() => {
  const q = document.getElementById('quadro'); const d = q.contentDocument; const w = q.contentWindow;
  const palco = d.getElementById('palco') || d.getElementById('stage');
  const r = palco.getBoundingClientRect(); const h = d.getElementById('hud').getBoundingClientRect();
  return JSON.stringify({
    ponteiro: w.matchMedia('(pointer: coarse)').matches ? 'dedo' : 'mouse',
    orientacao: w.matchMedia('(orientation: landscape)').matches ? 'deitado' : 'em pe',
    palco: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    hud: [Math.round(h.left), Math.round(h.top), Math.round(h.width), Math.round(h.height)],
    banda: getComputedStyle(d.getElementById('app')).getPropertyValue('--banda').trim(),
    avisoGirar: !document.getElementById('girar').hidden,
    barra: document.getElementById('palco').className || 'normal',
  }); })()`;

const FOTOS = [];
for (const jogo of Object.keys(COMECAR)) {
  const comecar = noJogo(COMECAR[jogo]);
  FOTOS.push({ nome: `${jogo}-celDeitado-menu`, jogo, aparelho: 'celDeitado', acoes: [] });
  FOTOS.push({ nome: `${jogo}-celEmPe-aviso`, jogo, aparelho: 'celEmPe', acoes: [] });
  for (const aparelho of Object.keys(APARELHOS)) {
    FOTOS.push({ nome: `${jogo}-${aparelho}`, jogo, aparelho, acoes: [DISPENSAR, comecar] });
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = CANDIDATOS.find((c) => fs.existsSync(c));
if (!navegador) {
  console.error('Não achei o Chrome nem o Edge. Aponte o caminho: CHROME="/onde/esta/chrome" node server/scripts/fotografar.mjs');
  process.exit(1);
}
try {
  await fetch(`${BASE}/api/plataforma`);
} catch {
  console.error(`A Central não respondeu em ${BASE}. Suba o servidor antes (ou passe BASE=...).`);
  process.exit(1);
}

fs.mkdirSync(SAIDA, { recursive: true });
const perfil = path.join(SAIDA, '.perfil');
const chrome = spawn(navegador, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, 'about:blank',
], { stdio: 'ignore' });

let versao = null;
for (let i = 0; i < 50 && !versao; i++) {
  try { versao = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`)).json(); } catch { await dormir(200); }
}
if (!versao) {
  console.error('O navegador não abriu a porta do DevTools.');
  chrome.kill();
  process.exit(1);
}

/** Uma aba nova, ligada direto no WebSocket dela. */
async function novaAba() {
  const alvo = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((resolver, rejeitar) => { ws.onopen = resolver; ws.onerror = rejeitar; });

  let seq = 0;
  const pendentes = new Map();
  const ouvintes = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { resolver, rejeitar } = pendentes.get(m.id);
      pendentes.delete(m.id);
      if (m.error) rejeitar(new Error(m.error.message)); else resolver(m.result);
    } else if (m.method) {
      ouvintes.forEach((fn) => fn(m));
    }
  };

  const mandar = (method, params = {}) => new Promise((resolver, rejeitar) => {
    const id = ++seq;
    pendentes.set(id, { resolver, rejeitar });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const esperarEvento = (nome, ms = 8000) => new Promise((resolver) => {
    const t = setTimeout(() => resolver(null), ms);
    ouvintes.push((m) => { if (m.method === nome) { clearTimeout(t); resolver(m.params); } });
  });
  const avaliar = async (expressao) => (await mandar('Runtime.evaluate', {
    expression: expressao, awaitPromise: true, returnByValue: true,
  })).result.value;
  const fechar = async () => {
    try { await fetch(`http://127.0.0.1:${PORTA_CDP}/json/close/${alvo.id}`); } catch { /* ja fechou */ }
    ws.close();
  };
  return { mandar, esperarEvento, avaliar, fechar };
}

let tiradas = 0;
for (const foto of FOTOS) {
  if (filtros.length && !filtros.some((f) => foto.nome.includes(f))) continue;
  const ap = APARELHOS[foto.aparelho];
  const aba = await novaAba();
  try {
    await aba.mandar('Page.enable');
    await aba.mandar('Runtime.enable');
    await aba.mandar('Emulation.setDeviceMetricsOverride', {
      width: ap.width, height: ap.height, deviceScaleFactor: 1, mobile: ap.mobile,
      screenWidth: ap.width, screenHeight: ap.height,
    });
    await aba.mandar('Emulation.setTouchEmulationEnabled',
      ap.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });

    const carregou = aba.esperarEvento('Page.loadEventFired');
    await aba.mandar('Page.navigate', { url: `${BASE}/jogar/${foto.jogo}` });
    await carregou;
    for (let i = 0; i < 40 && !(await aba.avaliar(PRONTO)); i++) await dormir(150);
    await dormir(300);
    for (const acao of foto.acoes) { await aba.avaliar(acao); await dormir(250); }
    await dormir(500);

    const estado = await aba.avaliar(ESTADO);
    const png = (await aba.mandar('Page.captureScreenshot', { format: 'png' })).data;
    fs.writeFileSync(path.join(SAIDA, `${foto.nome}.png`), Buffer.from(png, 'base64'));
    tiradas++;
    console.log(`${foto.nome.padEnd(34)} ${estado}`);
  } catch (erro) {
    console.log(`${foto.nome.padEnd(34)} ERRO: ${erro.message}`);
  } finally {
    await aba.fechar();
  }
}

chrome.kill();
console.log(`\n${tiradas} foto(s) em ${SAIDA}`);
