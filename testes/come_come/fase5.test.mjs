/* ==========================================================================
   Come-Come - Fase 5: as vidas, o tombo e o reinicio da rodada
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase5.test.mjs

   O modulo `Rodada`, sem tela nenhuma - o outro lado da mordida da fase 4:

     - `cacador()`: quem machuca e quem nao machuca, e por que ele e o espelho
       exato do `Fantasmas.comestivel()`
     - `pegou()`: qual dos quatro encostou no come-come neste quadro (com o
       tunel no meio, como manda a fase 4)
     - `perder()`: o contato em caca tira EXATAMENTE uma vida - e uma so por
       rodada, ainda que os quatro estejam em cima dele
     - `passo()`: a pausa curta correndo, e o aviso de que e hora de todo mundo
       voltar para o lugar (ou, sem vidas, de acabar a partida)
     - `reiniciar()`: as posicoes repostas SEM repor as pastilhas
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Mapa, Movimento, Fantasmas, Pastilhas, Poder, Ciclos, Rodada, mapas, mundo } =
  carregarJogo('come_come');
const mapa = mapas[0];

/* Os objetos nascem dentro do `vm`, e por isso os prototipos deles nao sao os
   deste arquivo: comparar o texto evita que o `deepEqual` estrito reclame de
   coisas iguaizinhas. */
const igual = (a, b, oque) => assert.equal(JSON.stringify(a), JSON.stringify(b), oque);

/** O quadrado (coluna, linha) em que um corpo esta. */
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

/** Um fantasma montado a mao, solto no labirinto - para testar uma cena so. */
function solto(chave, c, l, dir, trocas) {
  const f = {
    indice: 0, chave, nome: chave, cor: '#fff',
    etapa: 'livre', espera: 0,
    casaY: Mapa.centro(c, l).y,
    assustado: false, descanso: false,
    corpo: Movimento.novoCorpo(c, l, dir),
  };
  return Object.assign(f, trocas || {});
}

/** Um estado de fantasmas montado a mao a partir de uma lista. */
const estadoCom = (lista) => ({ lista, relogio: 0 });

console.log('Come-Come - fase 5\n');

// ------------------------------------------------------------- O comeco ----
teste('a partida abre com as tres vidas, sem pausa e sem ninguem pego', () => {
  const zero = Rodada.novoEstado();
  assert.equal(zero.vidas, 3);
  assert.equal(zero.vidas, mundo.VIDAS_INICIAIS);
  assert.equal(zero.pausa, 0);
  assert.equal(zero.pego, -1);
  assert.equal(zero.acabou, false);
  assert.equal(Rodada.parado(zero), false);
});

teste('da para comecar com outro tanto de vidas (a sala vai querer isso)', () => {
  assert.equal(Rodada.novoEstado(5).vidas, 5);
  assert.equal(Rodada.novoEstado(1).vidas, 1);
  assert.equal(Rodada.novoEstado(0).vidas, 3, 'zero nao e um pedido: e o padrao');
  assert.equal(Rodada.novoEstado(null).vidas, 3);
});

// ----------------------------------------------------------- Quem machuca --
teste('cacador() e o espelho exato de comestivel()', () => {
  const bravo = solto('perseguidor', 6, 8, 'baixo');
  const medroso = Fantasmas.assustar(estadoCom([solto('emboscador', 6, 8, 'baixo')])).lista[0];
  const olhos = Fantasmas.comido(estadoCom([medroso]), 0).lista[0];
  const voltando = { ...olhos, etapa: 'entrando' };

  assert.equal(Rodada.cacador(bravo), true, 'em caca ele machuca');
  assert.equal(Fantasmas.comestivel(bravo), false);

  assert.equal(Rodada.cacador(medroso), false, 'assustado nunca machuca');
  assert.equal(Fantasmas.comestivel(medroso), true);

  // Um par de olhos nao e nem uma coisa nem outra: ele so quer chegar em casa.
  assert.equal(Rodada.cacador(olhos), false);
  assert.equal(Fantasmas.comestivel(olhos), false);
  assert.equal(Rodada.cacador(voltando), false);
  assert.equal(Fantasmas.comestivel(voltando), false);
});

teste('quem espera na casa (ou sobe a porta) ainda e um cacador', () => {
  // Ele nao alcanca ninguem la dentro - a casa e fechada para o come-come -,
  // mas na porta, subindo, ele e perigo como qualquer outro.
  assert.equal(Rodada.cacador(solto('timido', 13, 14, 'cima', { etapa: 'casa' })), true);
  assert.equal(Rodada.cacador(solto('timido', 13, 11, 'cima', { etapa: 'saindo' })), true);
});

// -------------------------------------------------------------- Quem pega --
teste('pegou() acha o cacador que encostou, e so ele', () => {
  const bravo = solto('perseguidor', 6, 8, 'baixo');
  const longe = solto('emboscador', 21, 20, 'cima');
  const estado = estadoCom([longe, bravo]);
  const meio = Mapa.centro(6, 8);

  assert.equal(Rodada.pegou(estado, { x: meio.x, y: meio.y }, mapa), 1,
    'o segundo da lista e quem esta em cima dele');
  assert.equal(Rodada.pegou(estado, Mapa.centro(13, 23), mapa), -1,
    'do outro lado do labirinto ninguem pega ninguem');
});

teste('fantasma assustado nunca pega - e um par de olhos, muito menos', () => {
  const meio = Mapa.centro(6, 8);
  const corpo = { x: meio.x, y: meio.y };

  const bravos = estadoCom([solto('perseguidor', 6, 8, 'baixo')]);
  assert.equal(Rodada.pegou(bravos, corpo, mapa), 0, 'em caca, pega');

  const medrosos = Fantasmas.assustar(bravos);
  assert.equal(Rodada.pegou(medrosos, corpo, mapa), -1, 'com medo, nao pega');

  const olhos = Fantasmas.comido(medrosos, 0);
  assert.equal(Rodada.pegou(olhos, corpo, mapa), -1, 'comido, muito menos');
});

teste('na boca do tunel o cacador tambem alcanca', () => {
  // A mesma conta da fase 4: pelo tunel os dois estao a um passo, e nao a um
  // labirinto de distancia.
  const f = solto('perseguidor', 0, 14, 'esquerda');
  f.corpo.x = 2;
  const doOutroLado = { x: mapa.largura - 2, y: Mapa.centro(0, 14).y };

  assert.equal(Rodada.pegou(estadoCom([f]), doOutroLado, mapa), 0, 'pegou pelo tunel');
  assert.equal(Rodada.pegou(estadoCom([f]), doOutroLado), -1,
    'sem o mapa a conta e a linha reta - e por isso o jogo sempre passa o mapa');
});

teste('sem fantasma nenhum, pegou() nao inventa ninguem', () => {
  assert.equal(Rodada.pegou(estadoCom([]), Mapa.centro(6, 8), mapa), -1);
  assert.equal(Rodada.pegou(null, Mapa.centro(6, 8), mapa), -1);
});

// --------------------------------------------------------------- O tombo ---
teste('o contato em caca tira exatamente uma vida e para o mundo', () => {
  const antes = Rodada.novoEstado();
  const tombo = Rodada.perder(antes, 2);

  assert.equal(tombo.perdeu, true);
  assert.equal(tombo.acabou, false, 'ainda sobram duas');
  assert.equal(tombo.estado.vidas, 2, 'uma vida, nem duas nem nenhuma');
  assert.equal(tombo.estado.pausa, mundo.PAUSA_TOMBO);
  assert.equal(tombo.estado.pego, 2, 'e ficou guardado quem pegou');
  assert.equal(Rodada.parado(tombo.estado), true);

  assert.equal(antes.vidas, 3, 'e o estado de antes ficou intacto');
  assert.equal(antes.pausa, 0);
});

teste('uma vida por rodada: o cerco dos quatro custa uma so', () => {
  let estado = Rodada.novoEstado();
  estado = Rodada.perder(estado, 0).estado;

  // Os outros tres, no mesmo quadro e nos quadros seguintes da pausa.
  for (let i = 1; i < 4; i++) {
    const outro = Rodada.perder(estado, i);
    assert.equal(outro.perdeu, false, `o fantasma ${i} nao cobrou de novo`);
    assert.equal(outro.estado, estado, 'e nem estado novo ele gasta');
  }
  for (let q = 0; q < 30; q++) {
    estado = Rodada.passo(estado).estado;
    assert.equal(Rodada.perder(estado, 1).perdeu, false, `cobrou no quadro ${q} da pausa`);
  }
  assert.equal(estado.vidas, 2, 'uma vida, e so');
});

teste('a pausa dura o que o jogo mandar, e o padrao e um segundo e meio', () => {
  assert.equal(mundo.PAUSA_TOMBO, 90);
  assert.equal(Rodada.PAUSA, mundo.PAUSA_TOMBO);
  assert.equal(Rodada.perder(Rodada.novoEstado(), 0, { pausa: 30 }).estado.pausa, 30);
});

teste('a pausa anda ate o fim e avisa no quadro exato de voltar', () => {
  let estado = Rodada.perder(Rodada.novoEstado(), 0).estado;
  let voltouNo = -1;

  for (let q = 1; q <= mundo.PAUSA_TOMBO + 60; q++) {
    const tique = Rodada.passo(estado);
    estado = tique.estado;
    if (tique.voltou) {
      assert.equal(voltouNo, -1, `avisou duas vezes (${voltouNo} e ${q})`);
      voltouNo = q;
    }
    assert.equal(tique.acabou, false, 'ainda ha vidas: ninguem acabou nada');
  }

  assert.equal(voltouNo, mundo.PAUSA_TOMBO, 'o aviso cai no ultimo quadro da pausa');
  assert.equal(estado.pausa, 0);
  assert.equal(estado.pego, -1, 'e ninguem fica marcado como pego');
  assert.equal(Rodada.parado(estado), false, 'o mundo voltou a andar');
});

teste('sem pausa correndo, passo() fica quieto para sempre', () => {
  const estado = Rodada.novoEstado();
  for (let q = 0; q < 300; q++) {
    const tique = Rodada.passo(estado);
    assert.equal(tique.voltou, false);
    assert.equal(tique.acabou, false);
    assert.equal(tique.estado, estado, 'e nem estado novo ele gasta');
  }
});

teste('perder() e passo() sao puros', () => {
  const antes = Rodada.novoEstado();
  const copia = JSON.stringify(antes);
  const tombo = Rodada.perder(antes, 1);
  Rodada.passo(tombo.estado);

  assert.equal(JSON.stringify(antes), copia, 'o novo estado nao mexeu no velho');
  assert.notEqual(tombo.estado, antes);
  igual(Rodada.perder(Rodada.novoEstado(), 1).estado, tombo.estado,
    'mesmo estado + mesmo fantasma = mesmo resultado');
});

// -------------------------------------------------------------- Sem vidas --
teste('a terceira vida acaba a partida solo', () => {
  let estado = Rodada.novoEstado();
  const restaram = [];

  for (let i = 0; i < 3; i++) {
    const tombo = Rodada.perder(estado, 0);
    estado = tombo.estado;
    restaram.push(estado.vidas);
    assert.equal(tombo.acabou, i === 2, `o fim so na terceira (tombo ${i + 1})`);
    // Passa a pausa inteira para o proximo tombo poder acontecer.
    for (let q = 0; q < mundo.PAUSA_TOMBO; q++) estado = Rodada.passo(estado).estado;
  }

  igual(restaram, [2, 1, 0], 'as vidas cairam uma a uma');
  assert.equal(estado.acabou, true);
});

teste('sem vidas, a pausa termina em fim de jogo - e nao em volta ao lugar', () => {
  let estado = Rodada.novoEstado(1);
  estado = Rodada.perder(estado, 0).estado;
  assert.equal(estado.acabou, true, 'era a ultima');

  let acabouNo = -1;
  for (let q = 1; q <= mundo.PAUSA_TOMBO; q++) {
    const tique = Rodada.passo(estado);
    estado = tique.estado;
    assert.equal(tique.voltou, false, 'ninguem volta para o lugar: acabou');
    if (tique.acabou) acabouNo = q;
  }
  assert.equal(acabouNo, mundo.PAUSA_TOMBO, 'a tela de fim sobe no fim da pausa');
});

teste('depois do fim, encostar de novo nao tira o que nao existe', () => {
  let estado = Rodada.novoEstado(1);
  estado = Rodada.perder(estado, 0).estado;
  for (let q = 0; q < mundo.PAUSA_TOMBO; q++) estado = Rodada.passo(estado).estado;

  const depois = Rodada.perder(estado, 3);
  assert.equal(depois.perdeu, false);
  assert.equal(depois.acabou, true);
  assert.equal(depois.estado.vidas, 0, 'as vidas nao ficam negativas');
});

// ------------------------------------------------------------- O sumico ----
teste('fatia() conta a pausa de 0 (o susto) a 1 (a hora de voltar)', () => {
  let estado = Rodada.perder(Rodada.novoEstado(), 0).estado;
  assert.equal(Rodada.fatia(estado), 0, 'no primeiro quadro nada sumiu ainda');

  const vistas = [];
  for (let q = 0; q < mundo.PAUSA_TOMBO; q++) {
    vistas.push(Rodada.fatia(estado));
    estado = Rodada.passo(estado).estado;
  }

  vistas.forEach((v, i) => {
    assert.ok(v >= 0 && v < 1, `a fatia ${i} esta entre 0 e 1 (${v})`);
    if (i > 0) assert.ok(v > vistas[i - 1], 'e cresce sempre');
  });
  assert.equal(Rodada.fatia(estado), 1, 'passada a pausa, o sumico esta completo');
});

// ------------------------------------------------------------ O reinicio ---
teste('reiniciar() poe todo mundo de volta no lugar de comeco', () => {
  const novo = Rodada.reiniciar(mapa);

  igual(onde(novo.come), mapa.nascimento, 'o come-come volta para o P do desenho');
  assert.equal(novo.come.x, Mapa.centro(mapa.nascimento.c, mapa.nascimento.l).x);
  assert.equal(novo.come.parado, false);
  assert.equal(novo.come.passos, 0, 'ate a boca dele recomeca');

  // Os quatro voltam para a casa, com os tempos de saida de sempre.
  igual(novo.fantasmas.lista.map((f) => f.etapa),
    ['livre', 'casa', 'casa', 'casa'], 'o primeiro ja nasce na rua, como no comeco');
  novo.fantasmas.lista.forEach((f, i) => {
    assert.equal(f.assustado, false, `${f.nome} volta sem medo`);
    assert.equal(f.espera, mundo.SAIDAS[i], 'e com o tempo de saida de sempre');
  });

  // O relogio dos humores do zero e nenhum feitico valendo.
  igual(novo.ciclo, Ciclos.novoEstado(), 'a tabela recomeca no respiro');
  assert.equal(novo.ciclo.modo, 'dispersar');
  igual(novo.poder, Poder.novoEstado(), 'e nenhum feitico sobrou da rodada passada');
});

teste('o reinicio NAO repoe as pastilhas ja comidas', () => {
  // Come metade do labirinto e derruba o come-come: o que sumiu continua sumido.
  let comidas = Pastilhas.novoEstado(mapa);
  for (let i = 0; i < 120; i++) {
    const p = mapa.pastilhas[i];
    comidas = Pastilhas.comer(comidas, mapa, p.c, p.l).estado;
  }
  const antes = JSON.stringify(comidas);

  const novo = Rodada.reiniciar(mapa);
  assert.equal(novo.pastilhas, undefined, 'o reinicio nem fala em pastilha');
  assert.equal(JSON.stringify(comidas), antes, 'e o caderninho ficou intacto');
  assert.equal(Pastilhas.faltam(comidas), mapa.totalPastilhas - 120);
});

teste('reiniciar() e puro: dois reinicios seguidos dao o mesmo comeco', () => {
  igual(Rodada.reiniciar(mapa), Rodada.reiniciar(mapa));
});

// --------------------------------------------------- Os modulos juntos -----
teste('com o feitico valendo, o encontro rende pontos e nao tira vida', () => {
  const meio = Mapa.centro(6, 8);
  const corpo = { x: meio.x, y: meio.y };
  let fantasmas = Fantasmas.assustar(estadoCom([solto('perseguidor', 6, 8, 'baixo')]));
  let poder = Poder.ligar(Poder.novoEstado(), mapa);
  let rodada = Rodada.novoEstado();

  assert.equal(Rodada.pegou(fantasmas, corpo, mapa), -1, 'assustado nao pega');
  assert.equal(Fantasmas.comestivel(fantasmas.lista[0]), true, 'ele e que e comido');

  const mordida = Poder.comer(poder);
  poder = mordida.estado;
  fantasmas = Fantasmas.comido(fantasmas, 0);

  assert.equal(mordida.pontos, 200, 'o primeiro degrau da escada');
  assert.equal(rodada.vidas, 3, 'e nenhuma vida foi embora');
  assert.equal(Rodada.pegou(fantasmas, corpo, mapa), -1, 'agora e um par de olhos');

  // Passado o feitico, o MESMO fantasma no MESMO lugar volta a machucar.
  const bravo = Fantasmas.acalmar(estadoCom([solto('perseguidor', 6, 8, 'baixo')]));
  assert.equal(Rodada.pegou(bravo, corpo, mapa), 0);
  rodada = Rodada.perder(rodada, 0).estado;
  assert.equal(rodada.vidas, 2, 'aquele custou uma vida');
});

teste('uma rodada inteira: tombo, pausa, volta ao lugar e a vida seguinte', () => {
  /* O filme completo, so com os modulos puros: os quatro andando, o come-come
     parado no meio do labirinto, o tombo, a pausa e o reinicio - e o labirinto
     continuando do jeito que estava. */
  let fantasmas = Fantasmas.novoEstado(mapa);
  let rodada = Rodada.novoEstado();
  let pastilhas = Pastilhas.novoEstado(mapa);
  let come = Movimento.novoCorpo(mapa.casa.fora.c, mapa.casa.fora.l + 1, 'cima');

  // Come uma pastilha para provar, la no fim, que ela nao volta.
  const marcada = Mapa.pastilhaEm(mapa, mapa.pastilhas[0].c, mapa.pastilhas[0].l);
  pastilhas = Pastilhas.comer(pastilhas, mapa, mapa.pastilhas[0].c, mapa.pastilhas[0].l).estado;

  let tombouNo = -1;
  for (let q = 0; q < 600; q++) {
    if (Rodada.parado(rodada)) {
      const espera = Rodada.passo(rodada);
      rodada = espera.estado;
      if (espera.voltou) {
        const novo = Rodada.reiniciar(mapa);
        come = novo.come;
        fantasmas = novo.fantasmas;
        break;
      }
      continue;
    }

    fantasmas = Fantasmas.passo(fantasmas, mapa, { c: 13, l: 23 });
    const quem = Rodada.pegou(fantasmas, come, mapa);
    if (quem >= 0) {
      const tombo = Rodada.perder(rodada, quem);
      if (tombo.perdeu) tombouNo = q;
      rodada = tombo.estado;
    }
  }

  assert.ok(tombouNo > 0, 'um dos quatro alcancou o come-come parado');
  assert.equal(rodada.vidas, 2, 'custou uma vida');
  assert.equal(rodada.pausa, 0, 'e a pausa ja passou');
  igual(onde(come), mapa.nascimento, 'ele renasceu no P do desenho');
  assert.equal(Pastilhas.existe(pastilhas, marcada), false,
    'a pastilha comida antes do tombo continua comida');
  assert.equal(Pastilhas.faltam(pastilhas), mapa.totalPastilhas - 1);
});

await fim('Fase 5');
