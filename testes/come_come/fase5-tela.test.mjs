/* ==========================================================================
   Come-Come - Fase 5: o tombo dentro da partida
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase5-tela.test.mjs

   O `fase5.test.mjs` cuida do modulo puro. Aqui o game.js roda com a tela de
   mentira e o jogo ligado de verdade. O que se prova:

     - encostar num cacador tira uma vida, e o HUD perde um come-come amarelo
     - durante a pausa o mundo inteiro congela (nem o relogio anda), os
       fantasmas somem da tela e o come-come vai abrindo a boca ate sumir
     - passada a pausa, todo mundo volta para o lugar de comeco - e o labirinto
       continua do jeito que estava, com as pastilhas ja comidas comidas
     - o cerco dos quatro custa UMA vida, e nao tres
     - com o feitico valendo, encostar rende pontos em vez de tombo
     - as tres vidas acabando, sobe a tela de FIM DE JOGO com os pontos, e dali
       o mundo nao anda mais
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Mapa, Movimento, Fantasmas, Pastilhas, Poder, Rodada, mundo } = dom.api;
const mapa = dom.api.mapas[0];

const jogo = () => dom.api.jogo;
const come = () => dom.api.jogo.come;
const fantasmas = () => dom.api.jogo.fantasmas.lista;
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

const COR_COME = '#fcd800';
const COR_ASSUSTADO = '#2121de';

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDa = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

/** Quantas pinceladas de fantasma (de qualquer cor deles) saíram na tela. */
const pintadosDeFantasma = () => Fantasmas.TIPOS
  .reduce((total, t) => total + pintadosDa(t.cor), 0);

/* Quantos PIXELS daquela cor foram pintados. Contar pinceladas nao serviria
   para medir a boca abrindo: quando a fatia da boca entra pelo meio do bicho,
   uma linha vira DUAS pinceladas - e o total sobe justo quando ele encolhe. */
const pixelsDa = (cor) => dom.pintados
  .filter((p) => p.cor === cor)
  .reduce((total, p) => total + p.l * p.a, 0);

/** Roda quadros ate `condicao` dar certo (ou desiste depois de `limite`). */
function avancarAte(condicao, limite = 3000) {
  for (let q = 0; q < limite; q++) {
    if (condicao()) return q;
    dom.avancarQuadros(1);
  }
  assert.fail(`nao aconteceu em ${limite} quadros`);
}

/* Aquele quadrado ainda tem uma bolota de poder de pe? Encostar num fantasma
   em cima de uma seria o contrario do que este arquivo quer provar: a bolota
   assustaria os quatro no mesmo quadro, e o tombo viraria banquete. */
function temBolota(corpo) {
  const i = Mapa.pastilhaEm(mapa, Mapa.coluna(corpo.x), Mapa.linha(corpo.y));
  return i >= 0 && mapa.pastilhas[i].poder && Pastilhas.existe(jogo().pastilhas, i);
}

/**
 * Poe o come-come em cima de um cacador solto na rua e roda um quadro: e o
 * jeito mais curto de provocar um tombo sem depender de o fantasma achar a
 * crianca sozinho. Se naquele quadro nao deu (o feitico estava valendo, os
 * quatro estavam na casa, o encontro escapou por um pixel), tenta no seguinte.
 * Devolve o indice de quem pegou.
 */
function encostarNumCacador(limite = 1200) {
  for (let q = 0; q < limite; q++) {
    const alvo = fantasmas().find(
      (f) => Rodada.cacador(f) && f.etapa === 'livre' && !temBolota(f.corpo),
    );
    if (!alvo) { dom.avancarQuadros(1); continue; }

    /* A direcao vai junto de proposito: o `Movimento.passo` alinha o corpo no
       meio do corredor no eixo em que ele anda, e um come-come deitado em cima
       de um fantasma em pe seria jogado ate meio quadrado para o lado antes da
       conferencia. Com os dois na mesma direcao eles andam colados. */
    come().x = alvo.corpo.x;
    come().y = alvo.corpo.y;
    come().dir = alvo.corpo.dir;
    come().desejada = alvo.corpo.dir;
    come().parado = false;
    dom.api.entrada.desejada = null;
    dom.avancarQuadros(1);

    if (Rodada.parado(jogo().rodada)) return alvo.indice;
  }
  assert.fail(`nao consegui encostar num cacador em ${limite} quadros`);
}

console.log('Come-Come - fase 5 (tela)\n');

// ------------------------------------------------------------- O comeco ----
teste('a partida abre com as tres vidas no HUD e ninguem caido', () => {
  dom.avancarQuadros(1);       // o primeiro quadro de todos so acerta o relogio

  assert.equal(jogo().vidas, 3);
  assert.equal(jogo().rodada.vidas, 3, 'quem manda nas vidas e a rodada');
  assert.equal(jogo().rodada.pausa, 0);
  assert.equal(dom.texto('hud-vidas'), '🟡🟡🟡');
  assert.equal(dom.escondido('tela-fim'), true, 'a tela de fim de jogo esta guardada');
});

// -------------------------------------------------------------- O tombo ----
teste('encostar num cacador custa uma vida, e o HUD perde um come-come', () => {
  avancarAte(() => Fantasmas.todosNaRua(jogo().fantasmas));

  // Come uma pastilha antes do tombo: ela nao pode voltar depois.
  const comidasAntes = jogo().pastilhas.comidas;
  assert.ok(comidasAntes > 0, 'ele ja comeu alguma coisa pelo caminho');

  const quem = encostarNumCacador();

  assert.equal(jogo().vidas, 2, 'exatamente uma vida');
  assert.equal(jogo().rodada.vidas, 2);
  assert.equal(jogo().rodada.pego, quem, 'ficou guardado quem pegou');
  assert.equal(jogo().rodada.acabou, false, 'ainda sobram duas');
  assert.equal(dom.texto('hud-vidas'), '🟡🟡', 'o HUD acompanhou');
  assert.equal(jogo().tela, 'jogando', 'a partida nao acabou por causa de um tombo');
});

teste('durante a pausa o mundo inteiro congela', () => {
  const relogio = jogo().relogio;
  const parados = fantasmas().map((f) => `${f.corpo.x},${f.corpo.y}`);
  const ondeEle = { x: come().x, y: come().y };
  const pontos = jogo().pontos;

  dom.tecla('ArrowLeft');                 // e nem a seta tira ninguem do lugar
  dom.avancarQuadros(20);

  assert.equal(jogo().relogio, relogio, 'nenhum passo de mundo a mais');
  assert.equal(come().x, ondeEle.x, 'o come-come ficou onde caiu');
  assert.equal(come().y, ondeEle.y);
  assert.equal(fantasmas().map((f) => `${f.corpo.x},${f.corpo.y}`).join(' | '),
    parados.join(' | '), 'e os quatro tambem');
  assert.equal(jogo().pontos, pontos, 'o placar nao mexeu');
  assert.equal(jogo().rodada.pausa, mundo.PAUSA_TOMBO - 20, 'so a pausa andou');
});

teste('na tela, os fantasmas somem e o come-come vai embora abrindo a boca', () => {
  assert.equal(pintadosDeFantasma(), 0, 'nenhum fantasma na tela durante o tombo');
  assert.ok(pintadosDa(COR_COME) > 0, 'o come-come ainda esta indo embora');

  // Ele encolhe: quanto mais a pausa anda, menos amarelo sobra na tela.
  const antes = pixelsDa(COR_COME);
  dom.avancarQuadros(20);
  const depois = pixelsDa(COR_COME);
  assert.ok(depois < antes, `a boca abriu mais (${antes} -> ${depois} pixels)`);

  // No fim da pausa nao sobra nada dele: o labirinto fica vazio.
  avancarAte(() => Rodada.fatia(jogo().rodada) >= 2 / 3, mundo.PAUSA_TOMBO);
  dom.avancarQuadros(1);
  assert.equal(pintadosDa(COR_COME), 0, 'o come-come sumiu de vez');
  assert.ok(dom.pintados.length > 200, 'mas o labirinto continua sendo pintado');
});

teste('passada a pausa, todo mundo volta para o lugar de comeco', () => {
  const comidas = jogo().pastilhas.comidas;
  const faltavam = Pastilhas.faltam(jogo().pastilhas);
  const pontos = jogo().pontos;

  avancarAte(() => !Rodada.parado(jogo().rodada), mundo.PAUSA_TOMBO);

  assert.deepEqual(onde(come()), { c: mapa.nascimento.c, l: mapa.nascimento.l },
    'o come-come renasceu no P do desenho');
  assert.equal(come().passos, 0, 'e a boca dele recomecou');
  assert.equal(jogo().rodada.pego, -1, 'ninguem mais marcado como pego');

  // O `join` e de proposito: as listas nascem dentro do `vm`, e o `deepEqual`
  // estrito reclamaria do prototipo mesmo com o conteudo igualzinho.
  assert.equal(fantasmas().map((f) => f.etapa).join(' '), 'livre casa casa casa',
    'os quatro voltaram para a casa, como no comeco da partida');
  fantasmas().forEach((f) => assert.equal(f.assustado, false, `${f.nome} volta sem medo`));

  assert.equal(jogo().ciclo.modo, 'dispersar', 'o relogio dos humores recomecou no respiro');
  assert.equal(jogo().ciclo.relogio, 0);
  assert.equal(jogo().poder.ativo, false, 'e nenhum feitico sobrou');

  // O labirinto NAO se refaz: o que ela comeu continua comido.
  assert.equal(jogo().pastilhas.comidas, comidas, 'nenhuma pastilha voltou');
  assert.equal(Pastilhas.faltam(jogo().pastilhas), faltavam);
  assert.equal(dom.texto('hud-faltam'), String(faltavam));
  assert.equal(jogo().pontos, pontos, 'e os pontos continuam sendo dela');
});

teste('e o mundo volta a andar no quadro seguinte', () => {
  const relogio = jogo().relogio;
  const ondeEle = { x: come().x, y: come().y };
  dom.avancarQuadros(10);

  assert.equal(jogo().relogio, relogio + 10, 'dez passos de mundo');
  assert.notEqual(`${come().x},${come().y}`, `${ondeEle.x},${ondeEle.y}`,
    'ele voltou a andar (esquerda, como no comeco)');
  assert.ok(pintadosDeFantasma() > 0, 'e os fantasmas estao de volta na tela');
});

// ------------------------------------------------------------- O cerco -----
teste('o cerco dos quatro custa UMA vida, e nao tres', () => {
  const vidas = jogo().vidas;

  // Os quatro exatamente em cima dele, no mesmo quadro.
  avancarAte(() => Fantasmas.todosNaRua(jogo().fantasmas));
  fantasmas().forEach((f) => {
    f.corpo.x = come().x;
    f.corpo.y = come().y;
    f.corpo.dir = come().dir;
    f.corpo.desejada = come().dir;
  });
  dom.api.entrada.desejada = null;
  dom.avancarQuadros(1);

  assert.equal(jogo().vidas, vidas - 1, 'uma vida, ainda que os quatro estejam la');
  assert.equal(jogo().rodada.pausa > 0, true, 'o tombo comecou');

  // E nem durante a pausa, com todos colados, sai outra.
  dom.avancarQuadros(mundo.PAUSA_TOMBO - 1);
  assert.equal(jogo().vidas, vidas - 1, 'a pausa inteira, e uma vida so');
});

// ------------------------------------------------ Assustado nao machuca ----
teste('com o feitico valendo, encostar rende pontos em vez de tombo', () => {
  avancarAte(() => !Rodada.parado(jogo().rodada), mundo.PAUSA_TOMBO + 10);
  avancarAte(() => Fantasmas.todosNaRua(jogo().fantasmas));

  // Morde uma bolota e vai para cima do primeiro assustado que aparecer.
  const bolota = mapa.pastilhas[mapa.poderes[0]];
  const centro = Mapa.centro(bolota.c, bolota.l);
  come().x = centro.x;
  come().y = centro.y;
  dom.api.entrada.desejada = null;
  dom.avancarQuadros(1);
  assert.equal(jogo().poder.ativo, true, 'o feitico comecou');

  const vidas = jogo().vidas;
  const pontos = jogo().pontos;
  const presa = fantasmas().find((f) => Fantasmas.comestivel(f));
  assert.ok(presa, 'ha um assustado na rua');

  come().x = presa.corpo.x;
  come().y = presa.corpo.y;
  dom.avancarQuadros(1);

  assert.equal(jogo().vidas, vidas, 'assustado nunca machuca');
  assert.equal(jogo().rodada.pausa, 0, 'e nao houve tombo nenhum');
  assert.equal(jogo().poder.comidos, 1, 'ele e que foi comido');
  assert.equal(jogo().pontos - pontos >= Poder.PREMIOS[0], true,
    `valeu pelo menos 200 (rendeu ${jogo().pontos - pontos})`);
  assert.ok(pintadosDa(COR_ASSUSTADO) >= 0);
});

teste('acabado o feitico, o mesmo fantasma volta a machucar', () => {
  // Deixa o feitico correr ate o fim, longe de todo mundo.
  const canto = Mapa.centro(1, 1);
  avancarAte(() => {
    come().x = canto.x;
    come().y = canto.y;
    return !jogo().poder.ativo;
  }, mapa.duracaoPoder + 60);

  avancarAte(() => fantasmas().some((f) => Rodada.cacador(f) && f.etapa === 'livre'), 900);
  const vidas = jogo().vidas;
  encostarNumCacador();
  assert.equal(jogo().vidas, vidas - 1, 'de volta ao normal, ele derruba de novo');
});

// -------------------------------------------------------- Fim de jogo ------
teste('as tres vidas acabando, sobe a tela de FIM DE JOGO com os pontos', () => {
  // Gasta o que sobrou das vidas, uma a uma.
  let voltas = 0;
  while (jogo().vidas > 0 && voltas < 6) {
    voltas++;
    avancarAte(() => !Rodada.parado(jogo().rodada), mundo.PAUSA_TOMBO + 10);
    avancarAte(() => fantasmas().some((f) => Rodada.cacador(f) && f.etapa === 'livre'), 900);
    encostarNumCacador();
  }

  assert.equal(jogo().vidas, 0, 'as tres se foram');
  assert.equal(jogo().rodada.acabou, true);
  assert.equal(jogo().tela, 'jogando', 'a tela de fim so sobe no fim da pausa');

  const pontos = jogo().pontos;
  dom.avancarQuadros(mundo.PAUSA_TOMBO);

  assert.equal(jogo().tela, 'fim');
  assert.equal(dom.escondido('tela-fim'), false, 'a tela de fim de jogo subiu');
  assert.equal(dom.texto('fim-pontos'), String(pontos), 'com os pontos da partida');
  assert.equal(dom.texto('fim-fase'), '1', 'e a fase em que ela parou');
  assert.equal(dom.texto('hud-vidas'), '—', 'o HUD ficou sem come-come nenhum');
});

teste('com o jogo acabado o mundo nao anda mais, mas a tela continua viva', () => {
  const relogio = jogo().relogio;
  const pontos = jogo().pontos;
  const ondeEle = { x: come().x, y: come().y };

  dom.tecla('ArrowRight');
  dom.avancarQuadros(60);

  assert.equal(jogo().relogio, relogio, 'nenhum passo de mundo a mais');
  assert.equal(jogo().pontos, pontos, 'e o placar parou onde parou');
  assert.equal(come().x, ondeEle.x);
  assert.equal(come().y, ondeEle.y);
  assert.ok(dom.pintados.length > 200, 'o laco de desenho nao parou');
});

// ------------------------------------------------------ Um jogo novo em paz -
teste('um jogo recem-aberto nasce com as tres vidas de volta', () => {
  const novo = carregarJogoComTela('come_come');
  novo.avancarQuadros(1);

  assert.equal(novo.api.jogo.vidas, 3);
  assert.equal(novo.api.jogo.rodada.pausa, 0);
  assert.equal(novo.api.jogo.rodada.acabou, false);
  assert.equal(novo.texto('hud-vidas'), '🟡🟡🟡');
  assert.equal(novo.escondido('tela-fim'), true);
});

teste('deixado sozinho, o jogo sabe acabar sem ninguem tocar em nada', () => {
  /* A partida inteira sem uma seta apertada: o come-come anda para a esquerda,
     bate na parede e espera. Os fantasmas fazem o resto - e no fim das tres
     vidas a tela de fim de jogo sobe sozinha. E o caminho que uma crianca que
     largou o tablet percorreria. */
  const novo = carregarJogoComTela('come_come');
  const dele = () => novo.api.jogo;

  for (let q = 0; q < 6000 && dele().tela === 'jogando'; q++) novo.avancarQuadros(1);

  assert.equal(dele().tela, 'fim', 'a partida terminou sozinha');
  assert.equal(dele().vidas, 0);
  assert.equal(novo.escondido('tela-fim'), false);
  assert.equal(novo.texto('fim-pontos'), String(dele().pontos));
});

teste('dois jogos deixados sozinhos dao exatamente o mesmo filme', () => {
  const filme = () => {
    const outro = carregarJogoComTela('come_come');
    outro.avancarQuadros(1200);
    return JSON.stringify({
      rodada: outro.api.jogo.rodada,
      tela: outro.api.jogo.tela,
      pontos: outro.api.jogo.pontos,
      come: outro.api.jogo.come,
    });
  };
  assert.equal(filme(), filme(), 'a fase 5 nao trouxe sorteio escondido nenhum');
});

await fim('Fase 5 (tela)');
