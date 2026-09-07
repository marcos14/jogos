import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';

import { config } from './config.js';
import {
  listarJogos, lerJogo, paraSlug, slugValido, pastaDoJogo,
  salvarManifesto, tamanhoDaPasta,
} from './catalogo.js';
import { instalarZip, ErroDeUpload } from './instalarZip.js';
import {
  exigirLogin, estaLogado, senhaConfere, darSessao, tirarSessao,
  podeTentar, registrarFalha, limparTentativas,
} from './auth.js';
import { montarRotas as montarPlataforma, montarWebSocket } from './plataforma/index.js';
import { montarPwa } from './pwa.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

await fs.mkdir(config.pastaJogos, { recursive: true });
await fs.mkdir(config.pastaTemp, { recursive: true });

// --------------------------------------------------------------- Upload (zip)
const armazenamento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.pastaTemp),
  filename: (_req, _file, cb) => cb(null, `envio-${crypto.randomBytes(8).toString('hex')}.zip`),
});

const receberZip = multer({
  storage: armazenamento,
  limits: { fileSize: config.maxZipBytes, files: 1, fields: 20 },
  fileFilter: (_req, file, cb) => {
    const ehZip = /\.zip$/i.test(file.originalname)
      || ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'].includes(file.mimetype);
    cb(ehZip ? null : new ErroDeUpload('Envie um arquivo .zip.'), ehZip);
  },
}).single('arquivo');

// ------------------------------------------------------------- Rotas públicas
app.get('/api/saude', (_req, res) => res.json({ ok: true }));

app.get('/api/config', (req, res) => {
  res.json({ titulo: config.titulo, logado: estaLogado(req) });
});

app.get('/api/jogos', async (_req, res) => {
  res.json({ jogos: await listarJogos() });
});

app.get('/api/jogos/:slug', async (req, res) => {
  const jogo = await lerJogo(req.params.slug);
  if (!jogo || !jogo.visivel) return res.status(404).json({ erro: 'Jogo não encontrado.' });
  res.json({ jogo });
});

// ------------------------------------------- Plataforma (salas, SDK, etc.)
montarPlataforma(app);

// --------------------------------------- A Central como app (PWA)
// Manifesto montado na hora e o service worker sem cache HTTP. Precisa vir
// antes do express.static, que senão entregaria o sw.js com cache.
montarPwa(app);

// ---------------------------------------------------------- Sessão do admin
app.get('/api/sessao', (req, res) => res.json({ logado: estaLogado(req) }));

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'desconhecido';
  if (!podeTentar(ip)) {
    return res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' });
  }
  if (!senhaConfere(req.body?.senha)) {
    registrarFalha(ip);
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  limparTentativas(ip);
  darSessao(res);
  res.json({ ok: true });
});

app.post('/api/logout', (_req, res) => {
  tirarSessao(res);
  res.json({ ok: true });
});

// ------------------------------------------------------------- Rotas do admin
const admin = express.Router();
admin.use(exigirLogin);

admin.get('/jogos', async (_req, res) => {
  const jogos = await listarJogos({ incluirOcultos: true });
  const comTamanho = await Promise.all(jogos.map(async (j) => ({
    ...j,
    bytes: await tamanhoDaPasta(pastaDoJogo(j.slug)),
  })));
  res.json({ jogos: comTamanho });
});

admin.post('/upload', (req, res) => {
  receberZip(req, res, async (erroUpload) => {
    const caminhoZip = req.file?.path;
    const limpar = async () => {
      if (caminhoZip) await fs.rm(caminhoZip, { force: true }).catch(() => {});
    };

    try {
      if (erroUpload) {
        if (erroUpload.code === 'LIMIT_FILE_SIZE') {
          throw new ErroDeUpload(`O arquivo passa do limite de ${config.maxZipMB} MB.`);
        }
        throw erroUpload instanceof ErroDeUpload
          ? erroUpload
          : new ErroDeUpload(erroUpload.message || 'Falha ao receber o arquivo.');
      }
      if (!req.file) throw new ErroDeUpload('Nenhum arquivo foi enviado.');

      const corpo = req.body || {};
      const nome = (corpo.nome || '').trim();
      const slug = paraSlug(corpo.pasta || nome || req.file.originalname.replace(/\.zip$/i, ''));
      if (!slug) throw new ErroDeUpload('Não consegui montar um nome de pasta. Preencha o campo "pasta".');

      const resultado = await instalarZip({
        caminhoZip: req.file.path,
        slug,
        sobrescrever: corpo.substituir === 'true' || corpo.substituir === 'on',
        metadados: {
          nome,
          descricao: corpo.descricao,
          emoji: corpo.emoji,
          cor: corpo.cor,
          idade: corpo.idade,
          tags: (corpo.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        },
      });

      console.log(`[upload] ${resultado.substituiu ? 'substituiu' : 'instalou'} "${slug}" (${resultado.arquivos} arquivos)`);
      res.json({ ok: true, ...resultado });
    } catch (erro) {
      const status = erro instanceof ErroDeUpload ? erro.status : 500;
      if (status === 500) console.error('[upload] erro inesperado:', erro);
      res.status(status).json({ erro: erro.message || 'Erro ao instalar o jogo.' });
    } finally {
      await limpar();
    }
  });
});

admin.patch('/jogos/:slug', async (req, res) => {
  const { slug } = req.params;
  const jogo = await lerJogo(slug);
  if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado.' });

  const pasta = pastaDoJogo(slug);
  let manifesto = {};
  for (const nome of ['jogo.json', 'game.json']) {
    try {
      const lido = JSON.parse(await fs.readFile(path.join(pasta, nome), 'utf8'));
      if (lido && typeof lido === 'object') manifesto = lido;
      break;
    } catch { /* segue */ }
  }

  const corpo = req.body || {};
  const texto = (valor, limite) => (typeof valor === 'string' ? valor.trim().slice(0, limite) : undefined);

  if (texto(corpo.nome, 60)) manifesto.nome = texto(corpo.nome, 60);
  if (corpo.descricao !== undefined) manifesto.descricao = texto(corpo.descricao, 400) ?? '';
  if (texto(corpo.emoji, 8)) manifesto.emoji = [...texto(corpo.emoji, 8)].slice(0, 2).join('');
  if (typeof corpo.cor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(corpo.cor)) manifesto.cor = corpo.cor;
  if (corpo.idade !== undefined) manifesto.idade = texto(corpo.idade, 12) ?? '';
  if (Array.isArray(corpo.tags)) {
    manifesto.tags = corpo.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
  }
  if (typeof corpo.visivel === 'boolean') manifesto.visivel = corpo.visivel;

  await salvarManifesto(slug, manifesto);
  res.json({ ok: true, jogo: await lerJogo(slug) });
});

admin.delete('/jogos/:slug', async (req, res) => {
  const { slug } = req.params;
  const pasta = pastaDoJogo(slug);
  if (!pasta) return res.status(400).json({ erro: 'Nome de pasta inválido.' });

  try {
    if (!(await fs.stat(pasta)).isDirectory()) throw new Error('não é pasta');
  } catch {
    return res.status(404).json({ erro: 'Jogo não encontrado.' });
  }

  await fs.rm(pasta, { recursive: true, force: true });
  console.log(`[admin] apagou "${slug}"`);
  res.json({ ok: true });
});

app.use('/api/admin', admin);

// ------------------------------------------------- Arquivos estáticos do jogo
// Bloqueia as pastas internas (_tmp-*, _antigo-*) e slugs malformados.
app.use('/jogos/:slug', (req, res, next) => {
  if (!slugValido(req.params.slug)) return res.status(404).send('Jogo não encontrado.');
  next();
});

app.use('/jogos', express.static(config.pastaJogos, {
  index: 'index.html',
  dotfiles: 'ignore',
  etag: true,
  maxAge: 0,
  redirect: true,
}));

// ------------------------------------------------------------- Páginas do site
app.get('/jogar/:slug', async (req, res) => {
  const jogo = await lerJogo(req.params.slug);
  if (!jogo || !jogo.jogavel) return res.redirect('/');
  res.sendFile(path.join(config.pastaPublica, 'jogar.html'));
});

app.get('/admin', (_req, res) => res.sendFile(path.join(config.pastaPublica, 'admin.html')));

app.use(express.static(config.pastaPublica, { index: 'index.html', maxAge: 0 }));

app.use((_req, res) => res.status(404).sendFile(path.join(config.pastaPublica, '404.html')));

app.use((erro, _req, res, _next) => {
  const status = erro.status || erro.statusCode || 500;
  if (status >= 500) console.error('[erro]', erro);
  res.status(status).json({
    erro: status >= 500 ? 'Erro interno no servidor.' : (erro.message || 'Requisição inválida.'),
  });
});

const SENHAS_FRACAS = ['trocar-esta-senha', 'troque-esta-senha', 'senha', '123456', 'admin'];

const servidor = app.listen(config.porta, '0.0.0.0', () => {
  const porta = config.portaPublica || config.porta;
  console.log(`
  ${config.titulo}
  ---------------------------------------------
  Catálogo : http://localhost:${porta}/
  Admin    : http://localhost:${porta}/admin
  Jogos em : ${config.pastaJogos}
  Salas    : ws://localhost:${porta}/plataforma/ws
  `);
  if (SENHAS_FRACAS.includes(config.senhaAdmin.toLowerCase())) {
    console.warn('  ATENÇÃO: ADMIN_SENHA ainda é a senha de exemplo. Troque no arquivo .env!\n');
  }
});

// O canal das salas mora no mesmo servidor HTTP (mesma porta, mesma origem).
montarWebSocket(servidor);

// ------------------------------------------------------- HTTPS (opcional)
// O Android só instala a Central como app (e só liga o service worker) num
// endereço https. Com HTTPS_CERT e HTTPS_CHAVE apontando para um certificado,
// a mesma Central sobe também numa segunda porta, segura — salas inclusive
// (o SDK troca ws:// por wss:// sozinho). O http continua no ar: é o que o
// healthcheck do Docker e os atalhos antigos usam.
async function subirHttps() {
  if (!config.httpsCert && !config.httpsChave) return;

  let seguro;
  try {
    seguro = https.createServer({
      cert: await fs.readFile(config.httpsCert),
      key: await fs.readFile(config.httpsChave),
    }, app);
  } catch (erro) {
    console.warn(`  HTTPS desligado: não consegui usar o certificado (${erro.message}).
`);
    return;
  }

  seguro.on('error', (erro) => {
    console.warn(`  HTTPS desligado: ${erro.code === 'EADDRINUSE' ? `a porta ${config.portaHttps} já está ocupada` : erro.message}.
`);
  });

  seguro.listen(config.portaHttps, '0.0.0.0', () => {
    const porta = config.portaHttpsPublica || config.portaHttps;
    console.log(`  HTTPS    : https://localhost:${porta}/   (é por aqui que se instala como app)
`);
  });
  montarWebSocket(seguro);
}

subirHttps();
