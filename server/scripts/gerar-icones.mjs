/* ==========================================================================
   Gera os PNG de server/public/icones/ a partir de icone.html
   --------------------------------------------------------------------------
   Roda uma vez, na maquina de quem desenvolve (os PNG ficam no repositorio;
   a Central em si nao precisa disto). Usa o Chrome ou o Edge que ja estiver
   instalado, em modo headless, tirando uma "foto" do icone em cada tamanho -
   e o jeito de ter o emoji colorido num PNG sem colocar dependencia nenhuma
   no package.json.

   Rodar:  node server/scripts/gerar-icones.mjs
           CHROME="/caminho/do/chrome" node server/scripts/gerar-icones.mjs
   ========================================================================== */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fonte = path.join(aqui, 'icone.html');
const destino = path.resolve(aqui, '..', 'public', 'icones');

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

// Os cinco que o manifesto e o <link rel="apple-touch-icon"> apontam.
const ICONES = [
  { arquivo: 'icone-192.png',          tamanho: 192, modo: 'normal' },
  { arquivo: 'icone-512.png',          tamanho: 512, modo: 'normal' },
  { arquivo: 'icone-maskable-192.png', tamanho: 192, modo: 'maskable' },
  { arquivo: 'icone-maskable-512.png', tamanho: 512, modo: 'maskable' },
  { arquivo: 'apple-touch-icon.png',   tamanho: 180, modo: 'apple' },
];

const navegador = CANDIDATOS.find((c) => fs.existsSync(c));
if (!navegador) {
  console.error('Não achei o Chrome nem o Edge. Aponte o caminho: CHROME="/onde/esta/chrome" node server/scripts/gerar-icones.mjs');
  process.exit(1);
}

fs.mkdirSync(destino, { recursive: true });

for (const { arquivo, tamanho, modo } of ICONES) {
  const saida = path.join(destino, arquivo);
  const url = `${pathToFileURL(fonte).href}?tamanho=${tamanho}&modo=${modo}`;
  const resultado = spawnSync(navegador, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',   // fora do quadrado fica transparente
    '--virtual-time-budget=1000',
    `--window-size=${tamanho},${tamanho}`,
    `--screenshot=${saida}`,
    url,
  ], { stdio: 'ignore' });

  if (resultado.status !== 0 || !fs.existsSync(saida)) {
    console.error(`Falhou ao gerar ${arquivo} (código ${resultado.status}).`);
    process.exit(1);
  }
  const png = fs.readFileSync(saida);
  console.log(`${arquivo.padEnd(24)} ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}  ${(png.length / 1024).toFixed(0)} KB`);
}
