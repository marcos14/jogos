import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const MANIFESTOS = ['jogo.json', 'game.json'];
const CAPAS = ['capa.png', 'capa.jpg', 'capa.jpeg', 'capa.webp', 'capa.gif',
               'cover.png', 'cover.jpg', 'cover.jpeg', 'cover.webp', 'cover.gif'];

/** Transforma qualquer texto num nome de pasta seguro: "Meu Jogo Legal!" -> "meu-jogo-legal" */
export function paraSlug(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Slug -> titulo legivel: "galinha_feliz" -> "Galinha Feliz" */
function tituloDoSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Garante que o slug e' um unico segmento de pasta, sem "..", sem barras. */
export function slugValido(slug) {
  return typeof slug === 'string'
    && /^[a-z0-9][a-z0-9_-]{0,59}$/.test(slug)
    && !slug.includes('..');
}

/** Caminho absoluto da pasta do jogo, so' se o slug for seguro. */
export function pastaDoJogo(slug) {
  if (!slugValido(slug)) return null;
  const alvo = path.join(config.pastaJogos, slug);
  const dentro = path.resolve(alvo);
  if (dentro !== path.join(path.resolve(config.pastaJogos), slug)) return null;
  return dentro;
}

async function existe(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function lerManifesto(pasta) {
  for (const nome of MANIFESTOS) {
    const arquivo = path.join(pasta, nome);
    if (!(await existe(arquivo))) continue;
    try {
      const dados = JSON.parse(await fs.readFile(arquivo, 'utf8'));
      return { dados: dados && typeof dados === 'object' ? dados : {}, arquivo: nome };
    } catch {
      return { dados: {}, arquivo: nome, erro: 'jogo.json inválido (JSON malformado)' };
    }
  }
  return { dados: {}, arquivo: null };
}

export async function salvarManifesto(slug, dados) {
  const pasta = pastaDoJogo(slug);
  if (!pasta) throw new Error('Slug inválido');
  const { arquivo } = await lerManifesto(pasta);
  const destino = path.join(pasta, arquivo || 'jogo.json');
  await fs.writeFile(destino, JSON.stringify(dados, null, 2) + '\n', 'utf8');
}

/** Procura o index.html: na raiz da pasta ou um nivel abaixo. */
async function acharEntrada(pasta) {
  if (await existe(path.join(pasta, 'index.html'))) return 'index.html';
  let itens = [];
  try { itens = await fs.readdir(pasta, { withFileTypes: true }); } catch { return null; }
  for (const item of itens) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;
    if (await existe(path.join(pasta, item.name, 'index.html'))) return `${item.name}/index.html`;
  }
  return null;
}

async function acharCapa(pasta, manifesto) {
  if (typeof manifesto.capa === 'string' && manifesto.capa && !manifesto.capa.includes('..')) {
    if (await existe(path.join(pasta, manifesto.capa))) return manifesto.capa;
  }
  for (const nome of CAPAS) {
    if (await existe(path.join(pasta, nome))) return nome;
  }
  return null;
}

/** Soma o tamanho de tudo dentro da pasta (para mostrar no admin). */
export async function tamanhoDaPasta(pasta) {
  let total = 0;
  const pilha = [pasta];
  while (pilha.length) {
    const atual = pilha.pop();
    let itens = [];
    try { itens = await fs.readdir(atual, { withFileTypes: true }); } catch { continue; }
    for (const item of itens) {
      const p = path.join(atual, item.name);
      if (item.isDirectory()) pilha.push(p);
      else {
        try { total += (await fs.stat(p)).size; } catch { /* ignora */ }
      }
    }
  }
  return total;
}

const CORES_PADRAO = ['#ff8fb8', '#7bc4ff', '#ffd166', '#8ce99a', '#c9a7ff', '#ffa07a', '#5fd6c8', '#ff9f6e'];

function corPadrao(slug) {
  let soma = 0;
  for (const c of slug) soma = (soma + c.charCodeAt(0)) % 9973;
  return CORES_PADRAO[soma % CORES_PADRAO.length];
}

/** Le uma pasta e devolve os dados do jogo para o catalogo. */
export async function lerJogo(slug) {
  const pasta = pastaDoJogo(slug);
  if (!pasta) return null;

  let info;
  try { info = await fs.stat(pasta); } catch { return null; }
  if (!info.isDirectory()) return null;

  const { dados: m, erro } = await lerManifesto(pasta);
  const entrada = await acharEntrada(pasta);
  const capa = await acharCapa(pasta, m);

  const tags = Array.isArray(m.tags)
    ? m.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    slug,
    nome: (typeof m.nome === 'string' && m.nome.trim()) || (typeof m.name === 'string' && m.name.trim()) || tituloDoSlug(slug),
    descricao: (typeof m.descricao === 'string' && m.descricao.trim()) || (typeof m.description === 'string' && m.description.trim()) || '',
    emoji: (typeof m.emoji === 'string' && [...m.emoji].slice(0, 2).join('')) || '🎮',
    cor: /^#[0-9a-fA-F]{3,8}$/.test(m.cor || '') ? m.cor : corPadrao(slug),
    tags,
    idade: typeof m.idade === 'string' ? m.idade.slice(0, 12) : '',
    visivel: m.visivel !== false,
    capa: capa ? `/jogos/${slug}/${capa}` : null,
    entrada: entrada ? `/jogos/${slug}/${entrada}` : null,
    jogavel: Boolean(entrada),
    atualizadoEm: info.mtime.toISOString(),
    problema: erro || (entrada ? null : 'Nenhum index.html encontrado nesta pasta'),
  };
}

/** Lista todos os jogos da pasta. incluirOcultos=true e' usado pelo admin. */
export async function listarJogos({ incluirOcultos = false } = {}) {
  let itens = [];
  try {
    itens = await fs.readdir(config.pastaJogos, { withFileTypes: true });
  } catch {
    return [];
  }

  const slugs = itens
    .filter((i) => i.isDirectory() && !i.name.startsWith('.') && !i.name.startsWith('_'))
    .map((i) => i.name)
    .filter(slugValido);

  const jogos = (await Promise.all(slugs.map((s) => lerJogo(s)))).filter(Boolean);

  return jogos
    .filter((j) => incluirOcultos || (j.visivel && j.jogavel))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
