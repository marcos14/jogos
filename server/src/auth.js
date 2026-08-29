import crypto from 'node:crypto';
import { config } from './config.js';

const COOKIE = 'cdj_sessao';

const segredo = config.segredoSessao
  ? Buffer.from(config.segredoSessao)
  : crypto.createHash('sha256').update('central-de-jogos:' + config.senhaAdmin).digest();

const assinar = (texto) =>
  crypto.createHmac('sha256', segredo).update(texto).digest('base64url');

function comparar(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function senhaConfere(senha) {
  return comparar(senha ?? '', config.senhaAdmin);
}

export function criarToken() {
  const expira = Date.now() + config.horasSessao * 3600_000;
  const corpo = String(expira);
  return `${corpo}.${assinar(corpo)}`;
}

export function tokenValido(token) {
  if (typeof token !== 'string') return false;
  const corte = token.lastIndexOf('.');
  if (corte < 1) return false;
  const corpo = token.slice(0, corte);
  const assinatura = token.slice(corte + 1);
  if (!comparar(assinatura, assinar(corpo))) return false;
  const expira = Number(corpo);
  return Number.isFinite(expira) && Date.now() < expira;
}

function lerCookies(cabecalho = '') {
  const saida = {};
  for (const parte of cabecalho.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    saida[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return saida;
}

export function darSessao(res) {
  const maxIdade = config.horasSessao * 3600;
  res.setHeader('Set-Cookie',
    `${COOKIE}=${criarToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxIdade}`);
}

export function tirarSessao(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function estaLogado(req) {
  return tokenValido(lerCookies(req.headers.cookie || '')[COOKIE]);
}

/** Middleware: bloqueia rotas /api/admin/* para quem nao tem sessao. */
export function exigirLogin(req, res, next) {
  if (estaLogado(req)) return next();
  res.status(401).json({ erro: 'Faça login para continuar.' });
}

// --- Freio simples contra tentativa de adivinhar a senha (por IP, em memoria) ---
const tentativas = new Map();
const JANELA_MS = 10 * 60_000;
const MAX_TENTATIVAS = 10;

export function podeTentar(ip) {
  const registro = tentativas.get(ip);
  if (!registro || Date.now() > registro.ate) return true;
  return registro.contagem < MAX_TENTATIVAS;
}

export function registrarFalha(ip) {
  const agora = Date.now();
  const registro = tentativas.get(ip);
  if (!registro || agora > registro.ate) tentativas.set(ip, { contagem: 1, ate: agora + JANELA_MS });
  else registro.contagem += 1;
}

export function limparTentativas(ip) {
  tentativas.delete(ip);
}
