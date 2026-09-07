import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');

const num = (valor, padrao) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
};

const titulo = process.env.TITULO || 'Central de Jogos';

/** O nome curto, para debaixo do icone do app: cabe em ~12 letras. */
const tituloCurto = (texto) => (texto.length <= 12 ? texto : texto.split(/\s+/)[0].slice(0, 12));

export const config = {
  porta: num(process.env.PORTA, 3000),

  // Porta que aparece no navegador (só para o log mostrar o endereço certo)
  portaPublica: num(process.env.PORTA_PUBLICA, 0),

  // HTTPS opcional, numa segunda porta: é o que o Android exige para instalar
  // a Central como app. Só liga se os dois arquivos forem informados.
  portaHttps: num(process.env.PORTA_HTTPS, 3443),
  portaHttpsPublica: num(process.env.PORTA_HTTPS_PUBLICA, 0),
  httpsCert: process.env.HTTPS_CERT || '',
  httpsChave: process.env.HTTPS_CHAVE || '',

  // Pastas
  pastaJogos: path.resolve(process.env.PASTA_JOGOS || path.join(raiz, '..', 'jogos')),
  pastaTemp: path.resolve(process.env.PASTA_TEMP || path.join(raiz, 'tmp')),
  pastaPublica: path.join(raiz, 'public'),

  // Admin
  senhaAdmin: process.env.ADMIN_SENHA || 'trocar-esta-senha',
  segredoSessao: process.env.SESSAO_SEGREDO || '',
  horasSessao: num(process.env.SESSAO_HORAS, 12),

  // Limites de upload / seguranca contra "zip bomb"
  maxZipMB: num(process.env.MAX_ZIP_MB, 200),
  maxDescompactadoMB: num(process.env.MAX_DESCOMPACTADO_MB, 600),
  maxArquivosZip: num(process.env.MAX_ARQUIVOS_ZIP, 5000),

  // Nome mostrado no topo do catalogo (e o nome do app, quando instalado)
  titulo,
  tituloCurto: process.env.TITULO_CURTO || tituloCurto(titulo),
};

config.maxZipBytes = config.maxZipMB * 1024 * 1024;
config.maxDescompactadoBytes = config.maxDescompactadoMB * 1024 * 1024;
