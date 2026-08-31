/* ==========================================================================
   Come-Come - Fase 4: a pastilha de poder e os fantasmas comestiveis
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase4.test.mjs

   Os modulos puros da virada do jogo, sem tela nenhuma:

     - `Poder`: quanto o feitico dura (e que a duracao sai do LABIRINTO),
       quando o aviso comeca a piscar, em que quadro exato ele acaba, e a
       escada 200/400/800/1600 - que zera a cada pastilha nova
     - `Fantasmas.assustar`: todos ficam azuis, os da rua dao meia-volta
     - o fantasma assustado FOGE (a saida que mais afasta do come-come) e anda
       em meia velocidade, sem sair da grade
     - `Fantasmas.acalmar`: o feitico passa e ninguem da meia-volta
     - `Fantasmas.comido`: ele vira olhos, corre para casa por qualquer canto
       do labirinto, desce pela porta e renasce - no ciclo que estiver valendo
     - `Fantasmas.encostou`: quem esta em cima de quem, inclusive pelo tunel
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Mapa, Movimento, Fantasmas, Poder, Ciclos, Personalidades, mapas, mundo } =
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

console.log('Come-Come - fase 4\n');

// ------------------------------------------------------- Quanto ele dura ---
teste('a duracao do feitico sai do labirinto, e nao de um numero solto', () => {
  assert.equal(mapa.duracaoPoder, 8 * 60, 'oito segundos no labirinto 1');
  assert.equal(Poder.duracaoDe(mapa), 8 * 60);

  // E o que vai deixar os labirintos 2 e 3 mais dificeis: so o desenho muda.
  const curto = Mapa.ler(mapa.grade, { poder: 3 * 60 });
  assert.equal(Poder.duracaoDe(curto), 180, 'um labirinto pode encurtar o feitico');
  assert.equal(Poder.ligar(Poder.novoEstado(), curto).restam, 180);

  // Sem dizer nada, vale o padrao.
  assert.equal(Poder.duracaoDe(Mapa.ler(mapa.grade)), mundo.PODER_QUADROS);
  assert.equal(Poder.duracaoDe(null), mundo.PODER_QUADROS);
});

teste('o jogo comeca sem feitico nenhum valendo', () => {
  const zero = Poder.novoEstado();
  assert.equal(zero.ativo, false);
  assert.equal(zero.restam, 0);
  assert.equal(zero.comidos, 0);
  assert.equal(Poder.avisando(zero), false);
  assert.equal(Poder.piscando(zero), false);
});

// -------------------------------------------- Comeca, pisca e acaba na hora -
teste('o feitico comeca cheio e acaba no quadro exato da duracao', () => {
  const duracao = Poder.duracaoDe(mapa);
  let estado = Poder.ligar(Poder.novoEstado(), mapa);

  assert.equal(estado.ativo, true);
  assert.equal(estado.restam, duracao);
  assert.equal(estado.duracao, duracao);

  let acabouNo = -1;
  for (let q = 1; q <= duracao + 60; q++) {
    const tique = Poder.passo(estado);
    estado = tique.estado;
    if (tique.acabou) {
      assert.equal(acabouNo, -1, `avisou duas vezes (${acabouNo} e ${q})`);
      acabouNo = q;
    }
  }

  assert.equal(acabouNo, duracao, 'o aviso de fim cai no ultimo quadro');
  assert.equal(estado.ativo, false);
  assert.equal(estado.restam, 0);
});

teste('depois de acabado, o cronometro fica quieto para sempre', () => {
  let estado = Poder.ligar(Poder.novoEstado(), mapa);
  for (let q = 0; q < Poder.duracaoDe(mapa); q++) estado = Poder.passo(estado).estado;

  for (let q = 0; q < 600; q++) {
    const tique = Poder.passo(estado);
    assert.equal(tique.acabou, false, `avisou de novo no quadro ${q}`);
    assert.equal(tique.estado, estado, 'e nem estado novo ele gasta');
  }
});

teste('o aviso pisca so nos ultimos dois segundos, e alternando', () => {
  const duracao = Poder.duracaoDe(mapa);
  let estado = Poder.ligar(Poder.novoEstado(), mapa);
  const acesos = [];
  let avisouNo = -1;

  for (let q = 1; q <= duracao; q++) {
    estado = Poder.passo(estado).estado;
    if (Poder.avisando(estado) && avisouNo < 0) avisouNo = q;
    if (avisouNo > 0 && estado.ativo) acesos.push(Poder.piscando(estado) ? 1 : 0);
  }

  assert.equal(mundo.AVISO_PODER, 120, 'dois segundos de aviso');
  assert.equal(avisouNo, duracao - mundo.AVISO_PODER,
    'o aviso comeca faltando exatamente dois segundos');

  // Alterna aceso/apagado a cada meio ciclo, sem ficar preso num dos dois.
  const trocas = acesos.filter((a, i) => i > 0 && a !== acesos[i - 1]).length;
  assert.ok(trocas >= 10, `piscou de verdade (${trocas} trocas em ${acesos.length} quadros)`);
  assert.ok(acesos.indexOf(1) >= 0 && acesos.indexOf(0) >= 0, 'acende e apaga');

  // Antes do aviso, nada de piscar: o feitico esta no auge.
  let cedo = Poder.ligar(Poder.novoEstado(), mapa);
  for (let q = 0; q < duracao - mundo.AVISO_PODER; q++) {
    assert.equal(Poder.piscando(cedo), false, `piscou cedo demais (faltavam ${cedo.restam})`);
    cedo = Poder.passo(cedo).estado;
  }
});

teste('Poder.passo() e puro: nao mexe no estado que recebeu', () => {
  const antes = Poder.ligar(Poder.novoEstado(), mapa);
  const copia = JSON.parse(JSON.stringify(antes));
  const depois = Poder.passo(antes);
  assert.equal(JSON.stringify(antes), copia && JSON.stringify(copia));
  assert.notEqual(depois.estado, antes);
  assert.equal(depois.estado.restam, antes.restam - 1);
});

// -------------------------------------------------------------- A escada ---
teste('a escada e 200, 400, 800 e 1600 dentro da mesma pastilha', () => {
  igual(mundo.PREMIOS, [200, 400, 800, 1600]);

  let estado = Poder.ligar(Poder.novoEstado(), mapa);
  const premios = [];
  for (let i = 0; i < 4; i++) {
    assert.equal(Poder.proximoPremio(estado), mundo.PREMIOS[i], `o degrau ${i}`);
    const mordida = Poder.comer(estado);
    premios.push(mordida.pontos);
    estado = mordida.estado;
  }

  igual(premios, [200, 400, 800, 1600]);
  assert.equal(premios.reduce((a, b) => a + b, 0), 3000, 'os quatro valem 3000');
  assert.equal(estado.comidos, 4);
});

teste('do quinto em diante o degrau nao passa de 1600', () => {
  let estado = Poder.ligar(Poder.novoEstado(), mapa);
  for (let i = 0; i < 4; i++) estado = Poder.comer(estado).estado;
  assert.equal(Poder.comer(estado).pontos, 1600, 'o teto da escada');
});

teste('a escada zera a cada pastilha de poder nova', () => {
  let estado = Poder.ligar(Poder.novoEstado(), mapa);
  estado = Poder.comer(estado).estado;
  estado = Poder.comer(estado).estado;
  assert.equal(estado.comidos, 2);
  assert.equal(Poder.proximoPremio(estado), 800);

  // Outra bolota, mesmo com o feitico ainda valendo: tudo recomeca.
  const daCapo = Poder.ligar(estado, mapa);
  assert.equal(daCapo.comidos, 0, 'a escada recomecou');
  assert.equal(daCapo.restam, Poder.duracaoDe(mapa), 'e o relogio tambem');
  assert.equal(Poder.comer(daCapo).pontos, 200);
});

teste('sem feitico valendo nao ha premio nenhum', () => {
  const zero = Poder.novoEstado();
  const mordida = Poder.comer(zero);
  assert.equal(mordida.pontos, 0, 'fantasma que nao esta assustado nao se come');
  assert.equal(mordida.estado, zero);
});

// ------------------------------------------------------------ O susto -----
teste('a pastilha assusta todo mundo e vira quem esta na rua', () => {
  const antes = estadoCom([
    solto('perseguidor', 6, 8, 'baixo'),
    solto('emboscador', 13, 11, 'esquerda'),
    solto('timido', 13, 14, 'cima', { etapa: 'casa', espera: 90 }),
    solto('aleatorio', 13, 14, 'cima', { etapa: 'saindo' }),
  ]);
  const depois = Fantasmas.assustar(antes);

  depois.lista.forEach((f, i) => {
    assert.equal(f.assustado, true, `${f.nome} tomou o susto`);
    assert.equal(f.etapa, antes.lista[i].etapa, 'e continua na etapa em que estava');
  });

  // Meia-volta so para quem esta na rua: a rota da porta nao tem meia-volta.
  igual(depois.lista.map((f) => f.corpo.dir), ['cima', 'direita', 'cima', 'cima']);
  depois.lista.slice(0, 2).forEach((f, i) => {
    assert.equal(f.corpo.dir, Movimento.oposta(antes.lista[i].corpo.dir));
    assert.equal(f.corpo.desejada, f.corpo.dir, 'a desejada acompanha a meia-volta');
    igual(onde(f.corpo), onde(antes.lista[i].corpo), 'sem sair do lugar');
  });
});

teste('quem ja e so olhos nao se assusta com pastilha nenhuma', () => {
  const antes = estadoCom([solto('perseguidor', 6, 8, 'baixo', { etapa: 'olhos' })]);
  const depois = Fantasmas.assustar(antes);
  assert.equal(depois.lista[0], antes.lista[0], 'aquele ja foi comido');
  assert.equal(depois.lista[0].assustado, false);
});

teste('assustar() e acalmar() sao puros', () => {
  const antes = estadoCom([solto('perseguidor', 6, 8, 'baixo')]);
  const copia = JSON.parse(JSON.stringify(antes));
  Fantasmas.acalmar(Fantasmas.assustar(antes));
  assert.equal(JSON.stringify(antes), JSON.stringify(copia));
});

teste('quando o feitico passa, ninguem da meia-volta', () => {
  const assustados = Fantasmas.assustar(estadoCom([
    solto('perseguidor', 6, 8, 'baixo'),
    solto('emboscador', 13, 11, 'esquerda'),
  ]));
  const calmos = Fantasmas.acalmar(assustados);

  calmos.lista.forEach((f, i) => {
    assert.equal(f.assustado, false, `${f.nome} voltou ao normal`);
    assert.equal(f.corpo.dir, assustados.lista[i].corpo.dir,
      'a direcao e a mesma: eles retomam o ciclo em que estavam');
    igual(onde(f.corpo), onde(assustados.lista[i].corpo));
  });
});

// -------------------------------------------------------------- A fuga ----
teste('assustado, ele pega a saida que mais AFASTA do come-come', () => {
  // O cruzamento de prova da fase 3a: (6, 8) tem tres saidas.
  const saidas = Mapa.saidas(mapa, 6, 8);
  assert.ok(saidas.length >= 3, `o cruzamento tem ${saidas.length} saidas`);

  const come = { c: 6, l: 20 };                   // bem la embaixo
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'direita', come, false), 'baixo',
    'cacando, ele desce atras do come-come');
  assert.equal(Fantasmas.escolher(mapa, 6, 8, 'direita', come, true), 'cima',
    'fugindo, ele sobe - a mesma conta, o sinal trocado');
});

teste('num corredor sem escolha, fugir ou cacar da no mesmo', () => {
  // O tunel: so da para seguir em frente, tenha ele medo ou nao.
  const alvo = { c: 13, l: 23 };
  assert.equal(Fantasmas.escolher(mapa, 1, 14, 'esquerda', alvo, false), 'esquerda');
  assert.equal(Fantasmas.escolher(mapa, 1, 14, 'esquerda', alvo, true), 'esquerda');
});

teste('assustado ele anda na metade da velocidade, e sem sair da grade', () => {
  const come = { c: 13, l: 23 };
  let calmo = solto('perseguidor', 6, 8, 'baixo');
  let medroso = Fantasmas.assustar(estadoCom([solto('perseguidor', 6, 8, 'baixo')])).lista[0];

  const andou = (f) => Math.abs(f.corpo.y - Mapa.centro(6, 8).y)
                     + Math.abs(f.corpo.x - Mapa.centro(6, 8).x);

  for (let q = 0; q < 64; q++) {
    calmo = Fantasmas.passoDeUm(calmo, mapa, come, { fuga: come });
    medroso = Fantasmas.passoDeUm(medroso, mapa, come, { fuga: come });

    // Em qualquer quadro, o corpo continua no meio de um corredor.
    assert.ok(medroso.corpo.x % mundo.TILE === mundo.TILE / 2
           || medroso.corpo.y % mundo.TILE === mundo.TILE / 2,
      `desalinhou em (${medroso.corpo.x}, ${medroso.corpo.y}) no quadro ${q}`);
    assert.equal(medroso.corpo.x % 2, 0, 'e sempre numa coordenada par');
    assert.equal(medroso.corpo.y % 2, 0);
  }

  assert.equal(andou(medroso) * 2, andou(calmo),
    `o medroso andou metade do caminho (${andou(medroso)} de ${andou(calmo)})`);
});

teste('fugindo por muito tempo, ele nao entra em parede nem trava', () => {
  const come = { c: 13, l: 23, dir: 'esquerda' };
  let estado = Fantasmas.assustar(estadoCom([
    solto('perseguidor', 6, 8, 'baixo'),
    solto('emboscador', 21, 8, 'cima'),
    solto('timido', 12, 20, 'direita'),
    solto('aleatorio', 1, 14, 'esquerda'),
  ]));

  for (let q = 0; q < 3000; q++) {
    estado = Fantasmas.passo(estado, mapa, null, { fuga: come });
    estado.lista.forEach((f) => {
      const p = onde(f.corpo);
      assert.equal(Mapa.parede(mapa, p.c, p.l), false,
        `${f.nome} entrou na parede (${p.c}, ${p.l}) no quadro ${q}`);
      assert.equal(f.corpo.parado, false, `${f.nome} travou no quadro ${q}`);
      assert.equal(f.assustado, true, 'e continua com medo');
    });
  }
});

teste('o feitico acabando, o corpo volta a cair nos centros dos quadrados', () => {
  /* E a razao de a meia velocidade ser "um quadro sim, um nao": com 1px por
     quadro o corpo pararia numa coordenada impar e, de volta aos 2px, nunca
     mais acertaria um centro - deixaria de virar e sairia atravessando
     parede. Aqui o feitico acaba num quadro qualquer, de proposito. */
  const come = { c: 13, l: 23 };
  let estado = Fantasmas.assustar(estadoCom([solto('perseguidor', 6, 8, 'baixo')]));

  for (let q = 0; q < 37; q++) estado = Fantasmas.passo(estado, mapa, null, { fuga: come });
  estado = Fantasmas.acalmar(estado);

  let centrou = false;
  for (let q = 0; q < 600; q++) {
    estado = Fantasmas.passo(estado, mapa, come);
    const f = estado.lista[0];
    if (Movimento.noCentro(f.corpo)) centrou = true;
    const p = onde(f.corpo);
    assert.equal(Mapa.parede(mapa, p.c, p.l), false,
      `entrou na parede (${p.c}, ${p.l}) no quadro ${q}`);
  }
  assert.equal(centrou, true, 'ele voltou a encaixar na grade');
});

// ----------------------------------------------------- Comido: os olhos ----
teste('comido, ele vira olhos encaixados no centro do quadrado', () => {
  let estado = Fantasmas.assustar(estadoCom([solto('perseguidor', 6, 8, 'baixo')]));
  const come = { c: 13, l: 23 };
  for (let q = 0; q < 5; q++) estado = Fantasmas.passo(estado, mapa, null, { fuga: come });

  const meio = onde(estado.lista[0].corpo);
  const depois = Fantasmas.comido(estado, 0);
  const f = depois.lista[0];

  assert.equal(f.etapa, 'olhos');
  assert.equal(f.assustado, false, 'olhos nao tem medo - e nem se comem de novo');
  assert.equal(Fantasmas.comestivel(f), false);
  assert.equal(f.corpo.x, Mapa.centro(meio.c, meio.l).x, 'encaixado no centro');
  assert.equal(f.corpo.y, Mapa.centro(meio.c, meio.l).y);
  assert.equal(estado.lista[0].etapa, 'livre', 'e o estado de antes ficou intacto');
});

teste('comer duas vezes o mesmo fantasma nao faz nada', () => {
  const estado = Fantasmas.comido(
    Fantasmas.assustar(estadoCom([solto('perseguidor', 6, 8, 'baixo')])), 0,
  );
  assert.equal(Fantasmas.comido(estado, 0), estado, 'ja e um par de olhos');
  assert.equal(Fantasmas.comido(estado, 7), estado, 'e fantasma que nao existe, idem');
});

teste('os olhos correm mais que qualquer fantasma', () => {
  assert.equal(mundo.VEL_OLHOS, 4);
  assert.ok(mundo.VEL_OLHOS > mundo.VEL_FANTASMA, 'e mais rapido que o normal');
  assert.equal(mundo.TILE % mundo.VEL_OLHOS, 0, 'e divide o quadrado, senao sai da grade');
});

teste('de qualquer canto do labirinto, os olhos acham a casa e renascem', () => {
  /* A prova pesada da fase: um fantasma comido em CADA quadrado do labirinto,
     olhando para cada um dos quatro lados. Se a regra da esquina deixasse
     algum deles rodando em circulo, e aqui que apareceria. */
  let pior = 0;
  const travados = [];

  mapa.chao.forEach((p) => {
    Movimento.DIRECOES.forEach((dir) => {
      let f = solto('perseguidor', p.c, p.l, dir, { etapa: 'olhos' });
      let q = 0;
      for (; q < 2000; q++) {
        f = Fantasmas.passoDeUm(f, mapa, null, {});
        if (f.etapa === 'casa') break;

        const aqui = onde(f.corpo);
        if (f.etapa === 'olhos') {
          assert.equal(Mapa.parede(mapa, aqui.c, aqui.l), false,
            `os olhos entraram na parede (${aqui.c}, ${aqui.l})`);
        }
      }
      if (f.etapa !== 'casa') travados.push(`(${p.c}, ${p.l}) indo para ${dir}`);
      else pior = Math.max(pior, q);
    });
  });

  assert.equal(travados.length, 0, `olhos perdidos: ${travados.slice(0, 5).join('; ')}`);
  assert.ok(pior < 300, `o pior caminho de volta leva ${pior} quadros`);
});

teste('os olhos param no miolo da casa, e nao em cima da porta', () => {
  let f = solto('perseguidor', 6, 8, 'baixo', { etapa: 'olhos' });
  const etapas = [];
  for (let q = 0; q < 400 && f.etapa !== 'casa'; q++) {
    f = Fantasmas.passoDeUm(f, mapa, null, {});
    if (etapas[etapas.length - 1] !== f.etapa) etapas.push(f.etapa);
  }

  igual(etapas, ['olhos', 'entrando', 'casa'], 'a rota da porta, de tras para a frente');
  igual(onde(f.corpo), mapa.casa.dentro, 'ele para no primeiro quadrado do miolo');
  assert.equal(f.corpo.x, mapa.casa.saidaX);
  assert.equal(f.corpo.y, mapa.casa.voltaY);
  assert.equal(f.espera, mundo.RENASCER, 'e espera um segundinho para renascer');
});

teste('depois de esperar, ele sai pela porta e volta a cacar', () => {
  let f = solto('perseguidor', 6, 8, 'baixo', { etapa: 'olhos' });
  const alvo = { c: 6, l: 26 };                 // um quadrado de chao la embaixo
  const etapas = [];

  for (let q = 0; q < 900 && f.etapa !== 'livre'; q++) {
    f = Fantasmas.passoDeUm(f, mapa, alvo, {});
    if (etapas[etapas.length - 1] !== f.etapa) etapas.push(f.etapa);
  }

  igual(etapas, ['olhos', 'entrando', 'casa', 'saindo', 'livre'], 'a volta inteira');
  assert.equal(f.assustado, false, 'ele renasce inteiro, e nao com medo');
  igual(onde(f.corpo), mapa.casa.fora, 'de volta na rua diante da porta');

  // E dali em diante ele obedece o alvo que o ciclo mandar, como qualquer um.
  let menor = Infinity;
  for (let q = 0; q < 600; q++) {
    f = Fantasmas.passoDeUm(f, mapa, alvo, {});
    const p = onde(f.corpo);
    menor = Math.min(menor, Fantasmas.distancia(p.c, p.l, alvo.c, alvo.l));
  }
  assert.equal(menor, 0, `voltou a cacar e chegou no alvo (chegou a ${menor})`);
});

teste('comido durante o feitico, ele renasce ja no ciclo da vez', () => {
  /* "Renascer no ciclo correto": quem manda no alvo e o `Personalidades` com o
     modo do `Ciclos` - o fantasma que voltou nao carrega nada da pastilha que
     o comeu. Aqui o feitico acaba enquanto ele ainda esta voltando. */
  let fantasmas = Fantasmas.assustar(estadoCom([solto('timido', 6, 8, 'baixo')]));
  let poder = Poder.ligar(Poder.novoEstado(), mapa);
  const come = { c: 13, l: 23, dir: 'esquerda' };

  fantasmas = Fantasmas.comido(fantasmas, 0);
  for (let q = 0; q < 900; q++) {
    const tique = Poder.passo(poder);
    poder = tique.estado;
    if (tique.acabou) fantasmas = Fantasmas.acalmar(fantasmas);
    const mira = Personalidades.passo(
      Personalidades.novoEstado(1), fantasmas, mapa, { modo: 'dispersar', come },
    );
    fantasmas = Fantasmas.passo(fantasmas, mapa, mira.alvos, { fuga: come });
  }

  const f = fantasmas.lista[0];
  assert.equal(poder.ativo, false, 'o feitico ja tinha acabado');
  assert.equal(f.etapa, 'livre', 'ele renasceu e esta na rua');
  assert.equal(f.assustado, false);

  // Dispersando, o timido tem que estar indo para o canto dele.
  const canto = Personalidades.cantoDe(mapa, 'timido');
  const p = onde(f.corpo);
  Fantasmas.TIPOS.forEach((t) => {
    if (t.chave === 'timido') return;
    const outro = Personalidades.cantoDe(mapa, t.chave);
    assert.ok(Fantasmas.distancia(p.c, p.l, canto.c, canto.l)
            < Fantasmas.distancia(p.c, p.l, outro.c, outro.l),
      `ele foi parar perto do canto do ${t.nome}, e nao do dele`);
  });
});

// ------------------------------------------------------------ O encontro ---
teste('encostou() enxerga o encontro entre os centros, e nao so no quadrado', () => {
  const f = solto('perseguidor', 6, 8, 'baixo');
  const meio = Mapa.centro(6, 8);
  const corpo = (dx, dy) => ({ x: meio.x + dx, y: meio.y + dy });

  assert.equal(mundo.RAIO_TOQUE, 8, 'meio quadrado');
  assert.equal(Fantasmas.encostou(f, corpo(0, 0), mapa), true, 'em cima');
  assert.equal(Fantasmas.encostou(f, corpo(0, 6), mapa), true, 'quase em cima');
  assert.equal(Fantasmas.encostou(f, corpo(0, 8), mapa), true, 'no limite');
  assert.equal(Fantasmas.encostou(f, corpo(0, 10), mapa), false, 'longe demais');
  assert.equal(Fantasmas.encostou(f, corpo(6, 6), mapa), false, 'na diagonal, idem');
});

teste('na boca do tunel os dois estao a um passo, e nao a um labirinto', () => {
  // Ele saindo pela ponta esquerda, ela entrando pela direita: na tela sao
  // dois pixels de distancia, em linha reta e o labirinto inteiro.
  const f = solto('perseguidor', 0, 14, 'esquerda');
  f.corpo.x = 2;
  const doOutroLado = { x: mapa.largura - 2, y: Mapa.centro(0, 14).y };

  assert.equal(Fantasmas.encostou(f, doOutroLado, mapa), true, 'pelo tunel, colados');
  assert.equal(Fantasmas.encostou(f, doOutroLado), false,
    'sem o mapa, a conta e a linha reta - e por isso o jogo sempre passa o mapa');
});

teste('so o assustado se come; cacador e olhos, nao', () => {
  const cacador = solto('perseguidor', 6, 8, 'baixo');
  const medroso = Fantasmas.assustar(estadoCom([cacador])).lista[0];
  const olhos = Fantasmas.comido(estadoCom([medroso]), 0).lista[0];

  assert.equal(Fantasmas.comestivel(cacador), false, 'em caca ele machuca (fase 5)');
  assert.equal(Fantasmas.comestivel(medroso), true);
  assert.equal(Fantasmas.comestivel(olhos), false);
});

// -------------------------------------------------- Os modulos juntos ------
teste('uma pastilha inteira: susto, quatro comidos, 3000 pontos e a calma', () => {
  const come = { c: 13, l: 23, dir: 'esquerda' };
  let fantasmas = Fantasmas.assustar(estadoCom([
    solto('perseguidor', 6, 8, 'baixo'),
    solto('emboscador', 21, 8, 'cima'),
    solto('timido', 12, 20, 'direita'),
    solto('aleatorio', 6, 26, 'esquerda'),
  ]));
  let poder = Poder.ligar(Poder.novoEstado(), mapa);
  let pontos = 0;

  // A crianca alcanca os quatro, um a um, dentro da mesma pastilha.
  for (let i = 0; i < 4; i++) {
    const mordida = Poder.comer(poder);
    poder = mordida.estado;
    pontos += mordida.pontos;
    fantasmas = Fantasmas.comido(fantasmas, i);
  }

  assert.equal(pontos, 3000, '200 + 400 + 800 + 1600');
  assert.equal(poder.comidos, 4);
  fantasmas.lista.forEach((f) => assert.equal(f.etapa, 'olhos'));

  // O feitico corre ate o fim com os quatro voltando para casa.
  for (let q = 0; q < Poder.duracaoDe(mapa); q++) {
    const tique = Poder.passo(poder);
    poder = tique.estado;
    if (tique.acabou) fantasmas = Fantasmas.acalmar(fantasmas);
    fantasmas = Fantasmas.passo(fantasmas, mapa, null, { fuga: come });
  }

  assert.equal(poder.ativo, false, 'o feitico terminou');
  fantasmas.lista.forEach((f) => {
    assert.equal(f.assustado, false, `${f.nome} nao esta mais azul`);
    assert.ok(['casa', 'saindo', 'livre'].indexOf(f.etapa) >= 0,
      `${f.nome} ja voltou para a vida (${f.etapa})`);
  });
});

teste('com o feitico valendo, o relogio dos humores fica parado', () => {
  /* E o que faz eles "voltarem ao ciclo em que estavam": o jogo simplesmente
     nao anda a tabela enquanto a pastilha vale. */
  let ciclo = Ciclos.novoEstado();
  let poder = Poder.ligar(Poder.novoEstado(), mapa);

  for (let q = 0; q < 200; q++) ciclo = Ciclos.passo(ciclo);
  const congelado = JSON.stringify(ciclo);

  for (let q = 0; q < Poder.duracaoDe(mapa); q++) poder = Poder.passo(poder).estado;
  assert.equal(JSON.stringify(ciclo), congelado, 'a tabela nao andou um quadro');

  ciclo = Ciclos.passo(ciclo);
  assert.equal(ciclo.relogio, 201, 'e retoma exatamente de onde parou');
  assert.equal(ciclo.modo, 'dispersar');
});

await fim('Fase 4');
