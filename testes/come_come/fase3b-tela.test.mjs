/* ==========================================================================
   Come-Come - Fase 3b: os humores dos fantasmas dentro da partida
   --------------------------------------------------------------------------
   Rodar:  node testes/come_come/fase3b-tela.test.mjs

   O `fase3b.test.mjs` cuida dos modulos puros. Aqui o game.js roda com a tela
   de mentira e o jogo ligado de verdade: a partida abre no respiro da
   dispersao, o relogio dos humores vira sozinho no quadro certo, os quatro dao
   meia-volta na virada, na dispersao cada um sai para o SEU canto e na caca os
   quatro convergem para o come-come - tudo isso sem que ninguem entre numa
   parede e sem atrapalhar nada do que as fases 1, 2 e 3a ja faziam.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('come_come');
const { Mapa, Fantasmas, Ciclos, Personalidades, mundo } = dom.api;
const mapa = dom.api.mapas[0];

const jogo = () => dom.api.jogo;
const fantasmas = () => dom.api.jogo.fantasmas.lista;
const onde = (corpo) => ({ c: Mapa.coluna(corpo.x), l: Mapa.linha(corpo.y) });

/** A distancia (ao quadrado) de um fantasma ate um quadrado qualquer. */
const distanciaAte = (f, p) => {
  const q = onde(f.corpo);
  return Fantasmas.distancia(q.c, q.l, p.c, p.l);
};

/** Roda quadros ate `condicao` dar certo (ou desiste depois de `limite`). */
function avancarAte(condicao, limite = 3000) {
  for (let q = 0; q < limite; q++) {
    if (condicao()) return q;
    dom.avancarQuadros(1);
  }
  assert.fail(`nao aconteceu em ${limite} quadros`);
}

console.log('Come-Come - fase 3b (tela)\n');

// ------------------------------------------------------------- O comeco ----
teste('a partida abre no respiro: os quatro comecam dispersando', () => {
  dom.avancarQuadros(1);       // o primeiro quadro de todos so acerta o relogio

  assert.equal(jogo().ciclo.modo, 'dispersar', 'a tabela comeca na dispersao');
  assert.equal(jogo().ciclo.etapa, 0);
  assert.equal(jogo().ciclo.relogio, jogo().relogio,
    'o relogio dos humores anda no mesmo compasso do mundo');
  assert.equal(jogo().miras.semente, mundo.SEMENTE_PADRAO,
    'a semente do sorteio e a combinada (numa sala vem da Central)');
});

teste('o alvo do vermelho na dispersao e o canto dele, e nao o come-come', () => {
  const mira = Personalidades.passo(jogo().miras, jogo().fantasmas, mapa, {
    modo: jogo().ciclo.modo,
    come: { c: Mapa.coluna(jogo().come.x), l: Mapa.linha(jogo().come.y), dir: jogo().come.dir }
  });
  assert.equal(JSON.stringify(mira.alvos[0]),
    JSON.stringify(Personalidades.cantoDe(mapa, 'perseguidor')));
});

// --------------------------------------------------- A virada do relogio ---
teste('o ciclo vira sozinho no quadro da tabela, e todos dao meia-volta', () => {
  const virada = Ciclos.TABELA[0].quadros;      // 420 quadros = 7 segundos
  avancarAte(() => jogo().relogio === virada - 1);

  const antes = fantasmas().map((f) => (f.etapa === 'livre' ? f.corpo.dir : null));
  assert.ok(antes.filter(Boolean).length >= 3, 'quase todos ja estao na rua');

  dom.avancarQuadros(1);

  assert.equal(jogo().relogio, virada);
  assert.equal(jogo().ciclo.trocou, true, 'a tabela virou neste quadro');
  assert.equal(jogo().ciclo.modo, 'cacar', 'e agora e caca');

  fantasmas().forEach((f, i) => {
    if (!antes[i]) return;
    assert.notEqual(f.corpo.dir, antes[i],
      `${f.nome} seguiu reto em '${antes[i]}' em vez de dar meia-volta`);
  });
});

teste('fora da virada, o aviso de troca fica quieto', () => {
  for (let q = 0; q < 120; q++) {
    dom.avancarQuadros(1);
    assert.equal(jogo().ciclo.trocou, false, `trocou de novo no quadro ${jogo().relogio}`);
    assert.equal(jogo().ciclo.modo, 'cacar');
  }
});

// ------------------------------------------------------------ A dispersao --
teste('na dispersao cada um se espalha para o SEU canto', () => {
  assert.equal(Fantasmas.todosNaRua(jogo().fantasmas), true, 'os quatro estao na rua');

  /* O jogo esta em caca, e cada um foi parar num lugar. Aqui o humor e
     segurado na dispersao (o relogio da tabela zera a cada quadro) por bem
     mais que os 7 segundos do respiro: e o tempo de atravessar o labirinto de
     ponta a ponta e cada um chegar ao seu quadrante - de onde ja nao sai,
     porque o canto e parede e ninguem alcanca. */
  for (let q = 0; q < 700; q++) {
    jogo().ciclo = Ciclos.novoEstado();
    dom.avancarQuadros(1);
  }
  assert.equal(jogo().ciclo.modo, 'dispersar');

  const cantos = new Set();
  fantasmas().forEach((f) => {
    const meu = Personalidades.cantoDe(mapa, f.chave);
    cantos.add(`${meu.c},${meu.l}`);
    const minha = distanciaAte(f, meu);
    Fantasmas.TIPOS.forEach((t) => {
      if (t.chave === f.chave) return;
      const outro = Personalidades.cantoDe(mapa, t.chave);
      assert.ok(minha < distanciaAte(f, outro),
        `${f.nome} parou em ${JSON.stringify(onde(f.corpo))}, mais perto do canto do ${t.nome}`);
    });
  });
  assert.equal(cantos.size, 4, 'quatro cantos diferentes, um por fantasma');
});

teste('espalhados, eles ocupam quadrantes diferentes do labirinto', () => {
  const quadrante = (f) => {
    const p = onde(f.corpo);
    return (p.c < mapa.colunas / 2 ? 'E' : 'D') + (p.l < mapa.linhas / 2 ? 'C' : 'B');
  };
  const cantos = new Set(fantasmas().map(quadrante));
  assert.equal(cantos.size, 4,
    `um em cada canto da tela (${fantasmas().map(quadrante).join(', ')})`);
});

// ---------------------------------------------------------------- A caca ---
teste('na caca os quatro convergem para o come-come', () => {
  // O come-come esta encostado numa parede desde o comeco (ninguem apertou
  // seta nenhuma): um alvo parado, e o jeito mais limpo de medir a convergencia.
  const come = onde(jogo().come);
  assert.equal(jogo().come.parado, true, 'ele esta parado, esperando');

  const longe = fantasmas().map((f) => distanciaAte(f, come));
  jogo().ciclo = { etapa: 1, relogio: 0, modo: 'cacar', trocou: false };

  const menor = [Infinity, Infinity, Infinity, Infinity];
  for (let q = 0; q < 600; q++) {
    dom.avancarQuadros(1);
    fantasmas().forEach((f, i) => { menor[i] = Math.min(menor[i], distanciaAte(f, come)); });
  }

  assert.equal(jogo().ciclo.modo, 'cacar');
  assert.equal(menor[0], 0, 'o vermelho chega em cima dele');
  menor.forEach((d, i) => {
    assert.ok(d < longe[i],
      `${fantasmas()[i].nome} se aproximou (de ${longe[i]} para ${d})`);
    assert.ok(d <= 100,
      `${fantasmas()[i].nome} chegou perto do come-come (${d})`);
  });
});

teste('o come-come continua onde estava: fantasma ainda nao machuca', () => {
  assert.equal(jogo().vidas, 3);
  assert.equal(jogo().tela, 'jogando');
});

// ------------------------------------------------------- Andando em paz ----
teste('com o humor trocando, ninguem entra em parede nem trava', () => {
  const setas = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  jogo().ciclo = Ciclos.novoEstado();
  let viradas = 0;

  for (let q = 0; q < 2400; q++) {
    if (q % 41 === 0) dom.tecla(setas[(q / 41) % setas.length]);
    dom.avancarQuadros(1);
    if (jogo().ciclo.trocou) viradas++;

    fantasmas().forEach((f) => {
      const p = onde(f.corpo);
      assert.ok(f.corpo.x % mundo.TILE === mundo.TILE / 2
             || f.corpo.y % mundo.TILE === mundo.TILE / 2,
        `${f.nome} desalinhou em (${f.corpo.x}, ${f.corpo.y})`);
      if (f.etapa !== 'livre') return;
      assert.equal(Mapa.parede(mapa, p.c, p.l), false,
        `${f.nome} entrou na parede (${p.c}, ${p.l})`);
      assert.equal(f.corpo.parado, false, `${f.nome} travou em (${p.c}, ${p.l})`);
    });
  }
  assert.ok(viradas >= 2, `o humor virou mais de uma vez (${viradas})`);
});

// ----------------------------------------------------- O mundo parado ----
teste('a fase acabada congela tambem o relogio dos humores', () => {
  // Limpa o labirinto na marra e deixa uma pastilha debaixo dos pes dele.
  const p = mapa.pastilhas[0];
  const meio = Mapa.centro(p.c, p.l);
  jogo().come.x = meio.x;
  jogo().come.y = meio.y;
  jogo().pastilhas = {
    restam: mapa.pastilhas.map((_, i) => i === 0),
    faltam: 1,
    comidas: mapa.totalPastilhas - 1
  };

  dom.avancarQuadros(2);
  assert.equal(jogo().tela, 'fase', 'a ultima pastilha fechou a fase');

  const parado = JSON.stringify(jogo().ciclo);
  dom.avancarQuadros(60);
  assert.equal(JSON.stringify(jogo().ciclo), parado, 'o humor ficou onde estava');
});

// -------------------------------------------------------- O mesmo filme ----
teste('dois jogos recem-abertos dao exatamente o mesmo filme', () => {
  const filme = () => {
    const outro = carregarJogoComTela('come_come');
    outro.avancarQuadros(600);
    return JSON.stringify({
      ciclo: outro.api.jogo.ciclo,
      miras: outro.api.jogo.miras,
      fantasmas: outro.api.jogo.fantasmas.lista.map((f) => f.corpo)
    });
  };
  assert.equal(filme(), filme(),
    'a semente combinada faz o laranja andar igual nos dois aparelhos');
});

teste('um jogo recem-aberto comeca dispersando e com a semente no lugar', () => {
  const novo = carregarJogoComTela('come_come');
  novo.avancarQuadros(1);
  assert.equal(novo.api.jogo.ciclo.modo, 'dispersar');
  assert.equal(novo.api.jogo.ciclo.etapa, 0);
  assert.equal(novo.api.jogo.miras.semente, mundo.SEMENTE_PADRAO);
  assert.ok(novo.api.jogo.miras.sorteado === null
         || typeof novo.api.jogo.miras.sorteado.c === 'number');
});

await fim('Fase 3b (tela)');
