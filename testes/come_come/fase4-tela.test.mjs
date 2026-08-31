/* ==========================================================================
   Come-Come - Fase 4: a pastilha de poder dentro da partida
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase4-tela.test.mjs

   O `fase4.test.mjs` cuida dos modulos puros. Aqui o game.js roda com a tela
   de mentira e o jogo ligado de verdade, com um PILOTO AUTOMATICO que caca
   fantasma em vez de pastilha (a mesma busca em largura do piloto da fase 2,
   com outro alvo). O que se prova:

     - morder a bolota liga o feitico, deixa os quatro azuis na TELA e faz
       quem estava na rua dar meia-volta
     - comer dois fantasmas soma 200 + 400 no HUD, na ordem
     - o comido vira olhos (o corpo dele some do desenho), volta para casa e
       renasce
     - o aviso pisca so no fim, o feitico acaba na hora e todos voltam as
       cores deles
     - enquanto o feitico vale, o relogio dispersar/cacar fica parado - e
       depois retoma exatamente de onde estava
     - encostar num fantasma que NAO esta assustado nao rende ponto nenhum:
       aquele nao se come (o que ele faz e derrubar - e assunto do fase5)
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
// Desde a fase 7 o jogo abre no MENU: quem comeca a partida e o botao JOGAR.
dom.comecarPartida();
const { Mapa, Movimento, Fantasmas, Ciclos, mundo } = dom.api;
const mapa = dom.api.mapas[0];

const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const fantasmas = () => dom.api.jogo.fantasmas.lista;
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

const COR_ASSUSTADO = '#2121de';
const COR_AVISO = '#f8f8f8';

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDa = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

/** Poe o come-come no centro de um quadrado, olhando para onde o teste quer. */
function porNoQuadrado(c, l, dir) {
  const corpo = come();
  const meio = Mapa.centro(c, l);
  corpo.x = meio.x;
  corpo.y = meio.y;
  corpo.dir = dir;
  corpo.desejada = dir;
  corpo.parado = false;
  dom.api.entrada.desejada = dir;
}

/** Roda quadros ate `condicao` dar certo (ou desiste depois de `limite`). */
function avancarAte(condicao, limite = 3000) {
  for (let q = 0; q < limite; q++) {
    if (condicao()) return q;
    dom.avancarQuadros(1);
  }
  assert.fail(`nao aconteceu em ${limite} quadros`);
}

/* --------------------------------------------------------------------------
   O piloto automatico da fase 4: uma busca em largura do quadrado do
   come-come ate o fantasma COMESTIVEL mais perto, devolvendo a primeira
   direcao do caminho. E o que uma crianca faria com o feitico valendo.
   -------------------------------------------------------------------------- */
function direcaoParaOFantasmaMaisPerto() {
  const presas = new Set(
    fantasmas()
      .filter((f) => Fantasmas.comestivel(f) && f.etapa === 'livre')
      .map((f) => {
        const p = onde(f.corpo);
        return `${p.c},${p.l}`;
      }),
  );
  if (!presas.size) return null;

  const c0 = Mapa.coluna(come().x);
  const l0 = Mapa.linha(come().y);
  const chave = (c, l) => `${c},${l}`;
  const veio = new Map([[chave(c0, l0), null]]);
  const fila = [{ c: c0, l: l0 }];

  for (let i = 0; i < fila.length; i++) {
    const aqui = fila[i];
    if (presas.has(chave(aqui.c, aqui.l))) {
      let passo = veio.get(chave(aqui.c, aqui.l));
      if (!passo) continue;                       // ja estamos em cima dele
      while (veio.get(chave(passo.c, passo.l))) {
        passo = veio.get(chave(passo.c, passo.l));
      }
      return passo.dir;
    }
    for (const dir of Movimento.DIRECOES) {
      if (!Mapa.podeIr(mapa, aqui.c, aqui.l, dir)) continue;
      const v = Mapa.vizinho(mapa, aqui.c, aqui.l, dir);
      if (veio.has(chave(v.c, v.l))) continue;
      veio.set(chave(v.c, v.l), { c: aqui.c, l: aqui.l, dir });
      fila.push(v);
    }
  }
  return null;
}

/**
 * Caca fantasma ate comer `quantos` (ou o feitico acabar). Devolve o que cada
 * mordida rendeu no placar, na ordem - que e o que o teste quer conferir.
 */
function cacarFantasmas(quantos) {
  const premios = [];
  let comidos = jogo().poder.comidos;

  while (premios.length < quantos && jogo().poder.ativo) {
    if (Movimento.noCentro(come())) {
      const dir = direcaoParaOFantasmaMaisPerto();
      if (dir) dom.api.entrada.desejada = dir;
    }
    dom.avancarQuadros(1);

    // Cada degrau novo da escada e um fantasma que acabou de ser comido.
    for (let i = comidos; i < jogo().poder.comidos; i++) {
      premios.push(mundo.PREMIOS[Math.min(i, mundo.PREMIOS.length - 1)]);
    }
    comidos = jogo().poder.comidos;
  }
  return premios;
}

console.log('Come-Come - fase 4 (tela)\n');

// ------------------------------------------------------------- O comeco ----
teste('a partida abre sem feitico nenhum e com os quatro nas cores deles', () => {
  dom.avancarQuadros(1);       // o primeiro quadro de todos so acerta o relogio

  assert.equal(jogo().poder.ativo, false);
  assert.equal(jogo().poder.comidos, 0);
  fantasmas().forEach((f) => assert.equal(f.assustado, false, `${f.nome} esta calmo`));
  assert.equal(pintadosDa(COR_ASSUSTADO), 0, 'ninguem azul de medo na tela');
});

teste('com os quatro na rua, a bolota do canto assusta todo mundo', () => {
  avancarAte(() => Fantasmas.todosNaRua(jogo().fantasmas));

  const antes = fantasmas().map((f) => f.corpo.dir);
  const indice = mapa.poderes[0];
  const bolota = mapa.pastilhas[indice];
  const pontos = jogo().pontos;

  porNoQuadrado(bolota.c, bolota.l, 'direita');
  dom.avancarQuadros(1);

  assert.equal(jogo().pontos, pontos + mundo.PONTOS_PODER, 'a bolota tambem vale 50');
  assert.equal(jogo().poder.ativo, true, 'o feitico comecou');
  assert.equal(jogo().poder.restam, mapa.duracaoPoder - 1, 'com a duracao do labirinto');
  assert.equal(jogo().poder.comidos, 0, 'e a escada zerada');

  fantasmas().forEach((f, i) => {
    assert.equal(f.assustado, true, `${f.nome} ficou com medo`);
    assert.equal(f.corpo.dir, Movimento.oposta(antes[i]),
      `${f.nome} deu meia-volta na hora`);
  });
});

teste('e na tela eles estao azuis, os quatro', () => {
  // Cada fantasma sai em ~16 pinceladas: quatro corpos azuis dao bem mais que
  // as poucas do rosto.
  assert.ok(pintadosDa(COR_ASSUSTADO) >= 40,
    `os quatro corpos estao azuis (${pintadosDa(COR_ASSUSTADO)} pinceladas)`);
  Fantasmas.TIPOS.forEach((t) => {
    assert.equal(pintadosDa(t.cor), 0, `a cor do ${t.nome} sumiu enquanto ele foge`);
  });
});

// ------------------------------------------------------ 200 e depois 400 ---
teste('comer dois fantasmas soma 200 + 400 no HUD', () => {
  const antes = jogo().pontos;
  const premios = cacarFantasmas(2);

  assert.equal(premios.length, 2, `comeu dois antes de o feitico acabar (${premios})`);
  assert.deepEqual(premios, [200, 400], 'a escada comeca no 200 e dobra');

  // O HUD e o placar contam a mesma historia - descontadas as pastilhas que o
  // come-come pisou no caminho, que sao sempre multiplos de 10.
  const ganho = jogo().pontos - antes;
  assert.ok(ganho >= 600, `o placar subiu pelo menos 600 (subiu ${ganho})`);
  assert.equal((ganho - 600) % 10, 0, 'o resto e pastilha comum do caminho');
  assert.equal(dom.texto('hud-pontos'), String(jogo().pontos), 'o HUD acompanhou');
  assert.equal(jogo().poder.comidos, 2);
});

teste('o comido vira olhos: o corpo dele some do desenho', () => {
  // O primeiro dos dois pode ja ter chegado em casa enquanto a crianca corria
  // atras do segundo - os olhos sao rapidos. O recem-comido esta sempre la.
  const comidos = fantasmas().filter((f) => f.etapa === 'olhos' || f.etapa === 'entrando');
  assert.ok(comidos.length >= 1, 'o recem-comido esta voltando para casa');

  dom.avancarQuadros(1);
  comidos.forEach((f) => {
    assert.equal(pintadosDa(f.cor), 0, `o corpo do ${f.nome} nao e mais pintado`);
    assert.equal(f.assustado, false, `e o ${f.nome} nao se come de novo`);
  });
  assert.ok(pintadosDa('#ffffff') >= 4, 'mas os olhos continuam na tela');
});

teste('os olhos chegam em casa e o fantasma renasce inteiro', () => {
  const voltando = fantasmas().find((f) => f.etapa === 'olhos' || f.etapa === 'entrando');
  const indice = voltando.indice;

  avancarAte(() => fantasmas()[indice].etapa === 'casa', 600);
  const emCasa = fantasmas()[indice];
  assert.deepEqual(onde(emCasa.corpo), { c: mapa.casa.dentro.c, l: mapa.casa.dentro.l },
    'ele para no miolo da casa');
  assert.equal(emCasa.espera > 0, true, 'e espera a vez de sair');

  avancarAte(() => fantasmas()[indice].etapa === 'livre', 600);
  const renascido = fantasmas()[indice];
  assert.equal(renascido.assustado, false, 'renasce inteiro, nao com medo');
  assert.equal(Fantasmas.comestivel(renascido), false);
  assert.deepEqual(onde(renascido.corpo), { c: mapa.casa.fora.c, l: mapa.casa.fora.l },
    'de volta na rua diante da porta');
});

// -------------------------------------------------------------- O aviso ----
teste('o aviso pisca so no fim, e o feitico acaba na hora certa', () => {
  // Recomeca o feitico numa bolota nova, para medir do zero.
  const bolota = mapa.pastilhas[mapa.poderes[1]];
  porNoQuadrado(bolota.c, bolota.l, 'direita');
  dom.api.entrada.desejada = null;
  dom.avancarQuadros(1);
  assert.equal(jogo().poder.ativo, true, 'a segunda bolota religou o feitico');
  assert.equal(jogo().poder.comidos, 0, 'com a escada zerada de novo');

  const duracao = mapa.duracaoPoder;
  let brancos = 0, azuis = 0, piscadas = 0, antes = null;

  for (let q = 1; q < duracao; q++) {
    dom.avancarQuadros(1);
    const temBranco = pintadosDa(COR_AVISO) > 0;
    const restam = jogo().poder.restam;

    if (restam > mundo.AVISO_PODER) {
      assert.equal(temBranco, false, `piscou cedo demais (faltavam ${restam})`);
      assert.ok(pintadosDa(COR_ASSUSTADO) > 0, 'e continua azul');
    } else {
      if (temBranco) brancos++; else azuis++;
      if (antes !== null && temBranco !== antes) piscadas++;
      antes = temBranco;
    }
  }

  assert.ok(brancos > 0 && azuis > 0, `alternou branco e azul (${brancos}/${azuis})`);
  assert.ok(piscadas >= 5, `piscou varias vezes no aviso (${piscadas})`);

  dom.avancarQuadros(1);
  assert.equal(jogo().poder.ativo, false, 'o feitico acabou no quadro da duracao');
  fantasmas().forEach((f) => assert.equal(f.assustado, false, `${f.nome} se acalmou`));
  assert.equal(pintadosDa(COR_ASSUSTADO), 0, 'ninguem mais azul');
  assert.ok(pintadosDa(Fantasmas.TIPOS[0].cor) > 0, 'o vermelho voltou a ser vermelho');
});

// --------------------------------------------------- O relogio dos humores -
teste('enquanto o feitico vale, o relogio dispersar/cacar fica parado', () => {
  const bolota = mapa.pastilhas[mapa.poderes[2]];
  porNoQuadrado(bolota.c, bolota.l, 'direita');
  dom.api.entrada.desejada = null;
  dom.avancarQuadros(1);
  assert.equal(jogo().poder.ativo, true);

  const congelado = JSON.stringify(jogo().ciclo);
  dom.avancarQuadros(mapa.duracaoPoder - 2);
  assert.equal(jogo().poder.ativo, true, 'o feitico ainda vale');
  assert.equal(JSON.stringify(jogo().ciclo), congelado,
    'a tabela nao andou um quadro sequer');

  // Acabado o feitico, o relogio retoma de onde estava - e nao do zero.
  dom.avancarQuadros(2);
  assert.equal(jogo().poder.ativo, false, 'o feitico terminou');

  const relogioAntes = jogo().ciclo.relogio;
  assert.equal(relogioAntes, JSON.parse(congelado).relogio + 1,
    'o primeiro quadro sem feitico ja anda a tabela de onde ela parou');

  // Poucos quadros, e sem esbarrar na proxima linha da tabela: o que se quer
  // ver e o relogio CONTINUANDO, nao a troca de humor.
  const faltam = Ciclos.faltam(jogo().ciclo);
  const passos = faltam < 0 ? 10 : Math.min(10, faltam - 1);
  assert.ok(passos > 0, `havia espaco antes da proxima troca (faltavam ${faltam})`);
  dom.avancarQuadros(passos);
  assert.equal(jogo().ciclo.relogio, relogioAntes + passos, 'e segue andando');
});

// ----------------------------------------------- Fantasma que nao se come --
teste('encostar num fantasma sem medo nao rende ponto nenhum', () => {
  assert.equal(jogo().poder.ativo, false, 'sem feitico valendo');

  const alvo = fantasmas().find((f) => f.etapa === 'livre');
  const pontos = jogo().pontos;

  // Coloca o come-come exatamente em cima dele, num quadrado sem pastilha.
  come().x = alvo.corpo.x;
  come().y = alvo.corpo.y;
  dom.api.entrada.desejada = null;
  dom.avancarQuadros(1);

  assert.equal(jogo().poder.comidos, 0, 'ninguem foi comido');
  assert.ok(jogo().pontos - pontos <= mundo.PONTOS_PODER,
    'o placar so pode ter mexido por pastilha do chao');
  fantasmas().forEach((f) => {
    assert.notEqual(f.etapa, 'olhos', `${f.nome} continua inteiro`);
  });

  /* O que esse encontro faz e derrubar o come-come - a regra que a fase 5
     trouxe. Aqui basta ver que o tombo comecou (o mundo parou e uma vida foi
     embora); a prova completa dele esta no `fase5-tela.test.mjs`. */
  assert.equal(jogo().vidas, mundo.VIDAS_INICIAIS - 1, 'custou uma vida');
  assert.equal(jogo().rodada.pausa > 0, true, 'e o mundo parou para o tombo');
});

// ------------------------------------------------------- Um jogo em paz ----
teste('um jogo recem-aberto nasce sem feitico e com todo mundo calmo', () => {
  const novo = carregarJogoComTela('come_come');
  novo.comecarPartida();
  novo.avancarQuadros(1);

  assert.equal(novo.api.jogo.poder.ativo, false);
  assert.equal(novo.api.jogo.poder.comidos, 0);
  assert.equal(novo.api.jogo.pontos, 0);
  novo.api.jogo.fantasmas.lista.forEach((f) => {
    assert.equal(f.assustado, false);
    assert.equal(f.descanso, false);
  });
  assert.equal(
    novo.pintados.filter((p) => p.cor === COR_ASSUSTADO).length, 0,
    'nenhum azul de medo na tela',
  );
});

teste('dois jogos recem-abertos continuam dando o mesmo filme', () => {
  const filme = () => {
    const outro = carregarJogoComTela('come_come');
    outro.comecarPartida();
    outro.avancarQuadros(400);
    return JSON.stringify({
      poder: outro.api.jogo.poder,
      fantasmas: outro.api.jogo.fantasmas.lista.map((f) => [f.etapa, f.assustado, f.corpo]),
    });
  };
  assert.equal(filme(), filme(), 'a fase 4 nao trouxe sorteio escondido nenhum');
});

await fim('Fase 4 (tela)');
