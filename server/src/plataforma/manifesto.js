/* ==========================================================================
   O contrato da plataforma: o bloco "plataforma" do jogo.json.
   --------------------------------------------------------------------------
   Todo jogo declara aqui do que precisa. O servidor le, normaliza e passa a
   valer como regra: se o jogo diz "max: 5", ninguem entra em sexto na sala.
   Jogo sem esse bloco continua funcionando - so nao ganha nada da plataforma.
   ========================================================================== */

export const VERSAO_PLATAFORMA = 1;

/** Teto duro da plataforma, independente do que o jogo pedir. */
export const MAX_JOGADORES_ABSOLUTO = 8;

const MODOS = ['competitivo', 'cooperativo'];
const AUTORIDADES = ['anfitriao'];          // por ora so o modelo "anfitriao manda"
const ORDENS = ['desc', 'asc'];

const inteiro = (valor, padrao, min, max) => {
  const n = Math.trunc(Number(valor));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

const texto = (valor, limite) =>
  (typeof valor === 'string' ? valor.trim().slice(0, limite) : '');

const umDe = (valor, lista, padrao) => (lista.includes(valor) ? valor : padrao);

/**
 * Normaliza o bloco "plataforma" de um jogo.json.
 * Devolve sempre um objeto completo, com `problemas` listando o que foi
 * corrigido - o admin ve isso e o dono do jogo conserta.
 */
export function lerManifestoPlataforma(bruto) {
  const problemas = [];
  const m = bruto && typeof bruto === 'object' ? bruto : {};

  if (bruto !== undefined && (typeof bruto !== 'object' || bruto === null)) {
    problemas.push('"plataforma" precisa ser um objeto.');
  }
  if (m.versao !== undefined && inteiro(m.versao, 0, 0, 99) !== VERSAO_PLATAFORMA) {
    problemas.push(`Este servidor fala a versao ${VERSAO_PLATAFORMA} da plataforma.`);
  }

  // ---------------------------------------------------------- multijogador --
  let multijogador = null;
  if (m.multijogador) {
    const mj = typeof m.multijogador === 'object' ? m.multijogador : {};
    const max = inteiro(mj.max, 2, 2, MAX_JOGADORES_ABSOLUTO);
    const min = inteiro(mj.min, 2, 1, max);

    if (inteiro(mj.max, 0, 0, 999) > MAX_JOGADORES_ABSOLUTO) {
      problemas.push(`A plataforma limita salas a ${MAX_JOGADORES_ABSOLUTO} jogadores.`);
    }

    multijogador = {
      min,
      max,
      modo: umDe(mj.modo, MODOS, 'competitivo'),
      autoridade: umDe(mj.autoridade, AUTORIDADES, 'anfitriao'),
      // Quantas vezes por segundo o anfitriao manda o estado do mundo.
      taxaEstado: inteiro(mj.taxaEstado, 15, 5, 30),
      // Salas aparecem na lista de "salas abertas" da rede local?
      listarSalas: mj.listarSalas !== false,
    };
  }

  // ---------------------------------------------------------------- ranking --
  let ranking = null;
  if (m.ranking) {
    const r = typeof m.ranking === 'object' ? m.ranking : {};
    ranking = {
      metrica: texto(r.metrica, 24) || 'pontos',
      rotulo: texto(r.rotulo, 24) || 'Pontos',
      ordem: umDe(r.ordem, ORDENS, 'desc'),
      tamanho: inteiro(r.tamanho, 10, 3, 50),
    };
  }

  // -------------------------------------------------- classificacao etaria --
  const c = m.classificacao && typeof m.classificacao === 'object' ? m.classificacao : {};
  const classificacao = {
    idadeMinima: inteiro(c.idadeMinima, 0, 0, 18),
    conteudo: Array.isArray(c.conteudo)
      ? c.conteudo.map((t) => texto(t, 24)).filter(Boolean).slice(0, 8)
      : [],
    // Jogo adulto exige confirmacao antes de abrir. Vale a idade declarada.
    exigeConfirmacao: inteiro(c.idadeMinima, 0, 0, 18) >= 18,
  };

  // ------------------------------------------------------------ privacidade --
  const p = m.privacidade && typeof m.privacidade === 'object' ? m.privacidade : {};
  const privacidade = {
    // O que o jogo guarda sobre quem joga. "apelido" e o padrao de todo mundo.
    coleta: Array.isArray(p.coleta)
      ? p.coleta.map((t) => texto(t, 24)).filter(Boolean).slice(0, 10)
      : ['apelido'],
    // Guarda so no navegador de quem joga, ou manda para o servidor?
    guardaLocal: p.guardaLocal !== false,
    guardaServidor: p.guardaServidor === true,
    politicaUrl: texto(p.politicaUrl, 200),
  };

  return {
    versao: VERSAO_PLATAFORMA,
    declarado: Boolean(bruto),
    multijogador,
    ranking,
    classificacao,
    privacidade,
    problemas,
  };
}

/** Resumo curtinho para o cartao do catalogo. */
export function selosDoManifesto(plataforma) {
  const selos = [];
  if (plataforma.multijogador) {
    selos.push({ tipo: 'multijogador', texto: `👥 até ${plataforma.multijogador.max}` });
  }
  if (plataforma.classificacao.idadeMinima >= 18) {
    selos.push({ tipo: 'adulto', texto: '18+' });
  }
  return selos;
}
