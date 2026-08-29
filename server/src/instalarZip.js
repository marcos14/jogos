import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { config } from './config.js';
import { pastaDoJogo, slugValido, lerJogo } from './catalogo.js';

const BARRAS = /\\/g;
const LIXO = [/^__MACOSX\//, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/i, /(^|\/)desktop\.ini$/i];

export class ErroDeUpload extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

/** Normaliza o caminho de dentro do zip e recusa qualquer coisa que escape da pasta. */
function caminhoSeguro(nomeBruto) {
  const nome = String(nomeBruto).replace(BARRAS, '/');
  if (!nome || nome.startsWith('/') || /^[a-zA-Z]:/.test(nome)) return null;
  const partes = [];
  for (const parte of nome.split('/')) {
    if (!parte || parte === '.') continue;
    if (parte === '..') return null;
    if (parte.includes('\0')) return null;
    partes.push(parte);
  }
  return partes.length ? partes.join('/') : null;
}

/**
 * Se TODO o conteúdo estiver dentro de uma única pasta ("MeuJogo/index.html"),
 * remove esse nível. Repete enquanto continuar aninhado.
 */
function tirarPastaEnvolvente(arquivos) {
  let atual = arquivos;
  for (let volta = 0; volta < 5; volta++) {
    const raizes = new Set(atual.map((a) => a.caminho.split('/')[0]));
    const temArquivoSolto = atual.some((a) => !a.caminho.includes('/'));
    if (raizes.size !== 1 || temArquivoSolto) break;
    const prefixo = [...raizes][0] + '/';
    atual = atual.map((a) => ({ ...a, caminho: a.caminho.slice(prefixo.length) }));
  }
  return atual;
}

/** Lê o zip, valida tudo e devolve a lista de arquivos já normalizada. */
function lerConteudo(caminhoZip) {
  let zip;
  try {
    zip = new AdmZip(caminhoZip);
  } catch {
    throw new ErroDeUpload('Não consegui abrir o arquivo. Ele é mesmo um .zip?');
  }

  let entradas;
  try {
    entradas = zip.getEntries();
  } catch {
    throw new ErroDeUpload('O .zip parece estar corrompido.');
  }

  const arquivos = [];
  let totalBytes = 0;

  for (const entrada of entradas) {
    if (entrada.isDirectory) continue;
    const bruto = String(entrada.entryName).replace(BARRAS, '/');
    if (LIXO.some((re) => re.test(bruto))) continue;

    const caminho = caminhoSeguro(bruto);
    if (!caminho) {
      throw new ErroDeUpload(`O .zip tem um caminho suspeito e foi recusado: "${bruto}"`);
    }

    totalBytes += entrada.header.size || 0;
    if (arquivos.length >= config.maxArquivosZip) {
      throw new ErroDeUpload(`O .zip tem arquivos demais (limite: ${config.maxArquivosZip}).`);
    }
    if (totalBytes > config.maxDescompactadoBytes) {
      throw new ErroDeUpload(`O conteúdo descompactado passa de ${config.maxDescompactadoMB} MB.`);
    }
    arquivos.push({ caminho, entrada });
  }

  if (!arquivos.length) throw new ErroDeUpload('O .zip está vazio.');

  const limpos = tirarPastaEnvolvente(arquivos);

  if (!limpos.some((a) => a.caminho.toLowerCase() === 'index.html')) {
    const exemplos = limpos.slice(0, 6).map((a) => a.caminho).join(', ');
    throw new ErroDeUpload(
      'Não achei um index.html na raiz do jogo. O .zip precisa ter o index.html direto na raiz ' +
      `ou dentro de uma única pasta. Encontrei: ${exemplos}`
    );
  }

  return limpos;
}

async function escreverArquivos(destino, arquivos) {
  const raiz = path.resolve(destino);
  for (const { caminho, entrada } of arquivos) {
    const alvo = path.resolve(raiz, caminho);
    if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
      throw new ErroDeUpload(`Caminho inválido no .zip: "${caminho}"`);
    }
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    await fs.writeFile(alvo, entrada.getData());
  }
}

const limparTexto = (valor, limite) =>
  typeof valor === 'string' ? valor.trim().slice(0, limite) : '';

/** Monta o jogo.json final: o que veio dentro do zip + o que foi digitado no formulário. */
async function gravarManifesto(pasta, dadosDoForm) {
  let atual = {};
  for (const nome of ['jogo.json', 'game.json']) {
    try {
      const lido = JSON.parse(await fs.readFile(path.join(pasta, nome), 'utf8'));
      if (lido && typeof lido === 'object') atual = lido;
      break;
    } catch { /* não tem, ou está inválido: segue com o padrão */ }
  }

  const final = { ...atual };
  if (dadosDoForm.nome) final.nome = dadosDoForm.nome;
  if (dadosDoForm.descricao) final.descricao = dadosDoForm.descricao;
  if (dadosDoForm.emoji) final.emoji = dadosDoForm.emoji;
  if (dadosDoForm.cor) final.cor = dadosDoForm.cor;
  if (dadosDoForm.idade) final.idade = dadosDoForm.idade;
  if (dadosDoForm.tags?.length) final.tags = dadosDoForm.tags;
  if (final.visivel === undefined) final.visivel = true;

  await fs.writeFile(path.join(pasta, 'jogo.json'), JSON.stringify(final, null, 2) + '\n', 'utf8');
}

async function apagarSemDrama(alvo) {
  try { await fs.rm(alvo, { recursive: true, force: true }); } catch { /* ignora */ }
}

/**
 * Instala o jogo: extrai numa pasta temporária dentro de /jogos e só então troca pela
 * definitiva. Se algo falhar no meio, o jogo que já estava no ar continua intacto.
 */
export async function instalarZip({ caminhoZip, slug, sobrescrever = false, metadados = {} }) {
  if (!slugValido(slug)) {
    throw new ErroDeUpload('Nome de pasta inválido. Use letras, números, "-" e "_".');
  }

  const destino = pastaDoJogo(slug);
  if (!destino) throw new ErroDeUpload('Nome de pasta inválido.');

  let jaExiste = false;
  try {
    jaExiste = (await fs.stat(destino)).isDirectory();
  } catch { /* ainda não existe */ }

  if (jaExiste && !sobrescrever) {
    throw new ErroDeUpload(`Já existe um jogo na pasta "${slug}". Marque "substituir" para trocar.`, 409);
  }

  const arquivos = lerConteudo(caminhoZip);

  await fs.mkdir(config.pastaJogos, { recursive: true });
  const sufixo = crypto.randomBytes(4).toString('hex');
  const temporaria = path.join(config.pastaJogos, `_tmp-${slug}-${sufixo}`);
  const antiga = path.join(config.pastaJogos, `_antigo-${slug}-${Date.now()}`);

  try {
    await fs.mkdir(temporaria, { recursive: true });
    await escreverArquivos(temporaria, arquivos);
    await gravarManifesto(temporaria, {
      nome: limparTexto(metadados.nome, 60),
      descricao: limparTexto(metadados.descricao, 400),
      emoji: [...limparTexto(metadados.emoji, 8)].slice(0, 2).join(''),
      cor: /^#[0-9a-fA-F]{3,8}$/.test(metadados.cor || '') ? metadados.cor : '',
      idade: limparTexto(metadados.idade, 12),
      tags: Array.isArray(metadados.tags) ? metadados.tags.slice(0, 8) : [],
    });

    if (jaExiste) await fs.rename(destino, antiga);
    try {
      await fs.rename(temporaria, destino);
    } catch (erro) {
      if (jaExiste) await fs.rename(antiga, destino).catch(() => {});
      throw erro;
    }
    await apagarSemDrama(antiga);
  } catch (erro) {
    await apagarSemDrama(temporaria);
    throw erro;
  }

  return { slug, substituiu: jaExiste, arquivos: arquivos.length, jogo: await lerJogo(slug) };
}
