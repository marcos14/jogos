/* ==========================================================================
   Super Adventure - Fase 5 (tela): os inimigos com o jogo ligado
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fase5-tela.test.mjs

   Aqui o jogo roda de verdade (menu, teclado, laco de quadros e desenho) num
   DOM de mentira, e o que se confere e a fase 5 dentro da partida:
     - a partida comeca com os quatro bichos vivos, patrulhando sozinhos
     - eles aparecem na tela quando a camera chega neles
     - pisar em cima soma 20 no HUD, quica o heroi e o goomba some do desenho
     - a turtle pisada vira casco: continua na tela, parada, e nao machuca mais
     - bicho derrotado nao volta - nem com o tempo, nem quando o heroi renasce
     - esbarrar de frente custa um coracao, devolve o heroi ao checkpoint e
       poe os bichos VIVOS de volta no lugar em que nasceram
     - sem coracoes, a fase inteira recomeca com os quatro de pe outra vez
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogoComTela, teste, fim } from './harness.mjs';

const dom = carregarJogoComTela('super_adventure');
const { Fisica, Inimigos, fase } = dom.api;
const M = Fisica.medidas;
const T = M.TILE;

const jogo = dom.api.jogo;
const heroi = () => jogo.heroi;
const bicho = (i) => jogo.inimigos.lista[i];
const texto = (id) => dom.elementos[id].textContent;

/* O jogo roda dentro de um `vm`: os arrays que ele devolve tem outro
   prototipo, entao `deepEqual` reclama. Comparar o texto resolve. */
const igual = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

const avisos = [];
dom.api.aoEvento((ev) => avisos.push(ev.tipo));
const contar = (tipo) => avisos.filter((t) => t === tipo).length;

function soltarTudo() {
  ['ArrowLeft', 'ArrowRight', ' '].forEach((t) => dom.tecla(t, false));
}

/** Quantos retangulos daquela cor foram pintados no ultimo quadro. */
const pintadosDaCor = (cor) => dom.pintados.filter((p) => p.cor === cor).length;

// As cores que so os bichos usam (a paleta do game.js).
const COR_GOOMBA = '#c07038';       // o cogumelo do goomba
const COR_CASCO = '#58d854';        // o verde do casco (turtle de pe ou casco)
const COR_CABECA = '#f8b800';       // a cabeca e as patas: so a turtle de pe

/* O placar tem duas fontes (moeda 10, bicho 20) e o heroi passa por cima de
   moedas o tempo todo. `marcar()` guarda o placar e as moedas do momento;
   `deBicho()` desconta as moedas pegas desde entao e devolve so o que veio de
   bicho - que e o numero que esta em teste aqui. */
function marcar() {
  return { pontos: jogo.pontos, moedas: contar('moeda') };
}

function deBicho(marca) {
  return jogo.pontos - marca.pontos - (contar('moeda') - marca.moedas) * 10;
}

/** Poe o heroi de pe (ou no ar) exatamente em (x, y). */
function porHeroiEm(x, y) {
  jogo.heroi = Fisica.novoCorpo(x, y);
}

/** Deixa o heroi cair em cima do bicho `i` e espera a derrota. */
function pisarNoBicho(i, maxQuadros = 90) {
  const alvo = bicho(i);
  const derrotasAntes = contar('inimigo-derrotado');
  porHeroiEm(alvo.x, alvo.y - 40);            // uns 40px acima da cabeca dele

  let quadros = 0;
  while (contar('inimigo-derrotado') === derrotasAntes && quadros < maxQuadros) {
    dom.avancarQuadros(1);
    quadros++;
  }
  assert.equal(contar('inimigo-derrotado'), derrotasAntes + 1,
    `nao pisou no bicho ${i} em ${quadros} quadros`);
}

/** Anda para a direita ate esbarrar de frente no bicho `i`. */
function esbarrarNoBicho(i, maxQuadros = 200) {
  const alvo = bicho(i);
  const danosAntes = contar('dano');
  porHeroiEm(alvo.x - 3 * T, alvo.y);         // no mesmo chao, uns passos atras

  dom.tecla('ArrowRight', true);
  let quadros = 0;
  while (contar('dano') === danosAntes && quadros < maxQuadros) {
    dom.avancarQuadros(1);
    quadros++;
  }
  soltarTudo();
  assert.equal(contar('dano'), danosAntes + 1,
    `nao esbarrou no bicho ${i} em ${quadros} quadros`);
}

console.log('Super Adventure - fase 5 (tela)\n');

// --------------------------------------------------------- A patrulha ------
teste('a partida comeca com os quatro bichos vivos, cada um no seu lugar', () => {
  dom.clicar('btn-solo');

  assert.equal(jogo.inimigos.lista.length, 4);
  assert.equal(Inimigos.quantos(jogo.inimigos), 4, 'todos vivos');
  jogo.inimigos.lista.forEach((ini, i) => {
    assert.equal(ini.x, fase.inimigos[i].x, `o bicho ${i} nasceu no lugar`);
    assert.equal(ini.y, fase.inimigos[i].y);
    assert.equal(ini.tipo, fase.inimigos[i].tipo);
  });
});

teste('eles patrulham sozinhos, 2px por quadro, sem ninguem por perto', () => {
  dom.avancarQuadros(1);                       // so para o relogio pegar no tranco
  const passos = [];
  let antes = jogo.inimigos.lista.map((i) => i.x);

  for (let q = 0; q < 10; q++) {
    dom.avancarQuadros(1);
    const agora = jogo.inimigos.lista.map((i) => i.x);
    passos.push(agora.map((x, i) => x - antes[i]));
    antes = agora;
  }

  // Todo quadro e um passo de 2px - menos o quadro em que o bicho vira, que
  // ele gasta parado, trocando de sentido sem sair do lugar.
  passos.forEach((quadro, q) => {
    quadro.forEach((passo, i) => {
      assert.ok(Math.abs(passo) === 2 || passo === 0,
        `o bicho ${i} andou ${passo}px no quadro ${q}`);
    });
  });
  jogo.inimigos.lista.forEach((ini, i) => {
    const parados = passos.filter((quadro) => quadro[i] === 0).length;
    assert.ok(parados <= 1, `o bicho ${i} ficou parado ${parados} quadros`);
    assert.equal(ini.estado, 'vivo', 'ninguem morreu de graca');
  });
  assert.equal(passos.reduce((s, quadro) => s + quadro[0], 0), -20,
    'o goomba do trecho livre andou os 10 quadros sem virar');
  assert.equal(jogo.vidas, 3, 'o heroi esta longe: nao levou dano');
});

teste('o bicho aparece na tela quando a camera chega nele', () => {
  const goomba = bicho(0);
  porHeroiEm(goomba.x - 2 * T, goomba.y);
  dom.avancarQuadros(1);

  assert.ok(pintadosDaCor(COR_GOOMBA) > 0, 'o goomba esta pintado na tela');
});

// ----------------------------------------------------------- O pisao -------
teste('pisar num goomba soma 20 pontos no HUD e quica o heroi', () => {
  const marca = marcar();
  pisarNoBicho(0);

  assert.equal(deBicho(marca), 20, 'o pisao vale 20');
  assert.equal(texto('hud-pontos'), String(jogo.pontos), 'e o HUD acompanha');
  assert.equal(contar('inimigo-derrotado'), 1, 'avisou uma vez');
  assert.equal(bicho(0).estado, 'morto');
  assert.ok(heroi().vy < 0, 'o heroi quicou para cima');
  assert.equal(jogo.vidas, 3, 'quem pisa nao se machuca');
  assert.ok(jogo.efeitos.some((f) => f.tipo === 'inimigo'), 'soltou o efeito');
});

teste('o goomba derrotado some do desenho', () => {
  dom.avancarQuadros(1);
  assert.equal(pintadosDaCor(COR_GOOMBA), 0, 'nao e mais pintado');
});

teste('e ele nao volta: 300 quadros depois continua morto e sem dar ponto', () => {
  const pontosAntes = jogo.pontos;
  const onde = bicho(0).x;
  porHeroiEm(fase.spawn.x, fase.spawn.y);      // longe, para nao atrapalhar
  dom.avancarQuadros(300);

  assert.equal(bicho(0).estado, 'morto');
  assert.equal(bicho(0).x, onde, 'nem sai do lugar');
  assert.equal(jogo.pontos, pontosAntes, 'e nao rende ponto de novo');
  assert.equal(contar('inimigo-derrotado'), 1, 'nem avisa de novo');
});

teste('pisar na turtle nao mata: ela vira casco e fica na tela, quietinha', () => {
  const marca = marcar();
  pisarNoBicho(1);

  assert.equal(deBicho(marca), 20, 'vale os mesmos 20 pontos');
  assert.equal(bicho(1).estado, 'casco');
  assert.equal(bicho(1).vx, 0, 'o casco nao anda mais');

  const onde = bicho(1).x;
  dom.avancarQuadros(60);
  assert.equal(bicho(1).x, onde, 'continua parado no mesmo lugar');
  assert.equal(bicho(1).estado, 'casco', 'e continua casco');
});

teste('o casco continua pintado, mas sem a cabeca da turtle de pe', () => {
  porHeroiEm(bicho(1).x - 2 * T, bicho(1).y);
  dom.avancarQuadros(1);

  assert.ok(pintadosDaCor(COR_CASCO) > 0, 'o verde do casco esta na tela');
  assert.equal(pintadosDaCor(COR_CABECA), 0, 'a cabeca e as patas sumiram');
});

teste('encostar num casco nao custa vida nem da ponto', () => {
  const marca = marcar();
  porHeroiEm(bicho(1).x, bicho(1).y);          // em cima dele, de proposito
  dom.avancarQuadros(30);

  assert.equal(jogo.vidas, 3, 'o casco e so enfeite');
  assert.equal(deBicho(marca), 0, 'e nao rende ponto nenhum');
  assert.equal(contar('dano'), 0, 'nenhum dano ate agora');
});

// -------------------------------------------------------- O esbarrao -------
teste('esbarrar de frente custa um coracao e devolve o heroi ao comeco', () => {
  const marca = marcar();
  esbarrarNoBicho(2);                          // o goomba do meio da fase

  assert.equal(jogo.vidas, 2, 'foi-se um coracao');
  assert.equal(texto('hud-vidas'), '❤️❤️', 'o HUD acompanha na hora');
  assert.equal(contar('vida-perdida'), 1);
  assert.equal(jogo.quedas, 0, 'nao foi queda: foi bicho');
  assert.equal(deBicho(marca), 0, 'esbarrar nao tira nem da ponto');
  assert.equal(heroi().x, fase.spawn.x, 'sem checkpoint aceso, volta ao comeco');
  assert.equal(heroi().y, fase.spawn.y);
});

teste('os bichos vivos voltam para o ninho, mas os derrotados continuam la', () => {
  assert.equal(bicho(0).estado, 'morto', 'o goomba pisado continua morto');
  assert.equal(bicho(1).estado, 'casco', 'e a turtle continua casco');

  [2, 3].forEach((i) => {
    assert.equal(bicho(i).estado, 'vivo');
    assert.equal(bicho(i).x, fase.inimigos[i].x, `o bicho ${i} voltou ao ninho`);
    assert.equal(bicho(i).y, fase.inimigos[i].y);
  });
  assert.equal(Inimigos.quantos(jogo.inimigos), 2, 'so dois ainda vivos');
});

teste('com um checkpoint aceso, o esbarrao devolve o heroi a ELE', () => {
  const cp = fase.checkpoints[0];
  porHeroiEm(cp.x, cp.y + cp.a - M.HEROI_A);   // encosta no primeiro checkpoint
  dom.avancarQuadros(1);
  assert.equal(jogo.progresso.ativos[0], true, 'o checkpoint acendeu');

  esbarrarNoBicho(2);

  assert.equal(jogo.vidas, 1, 'foi-se o segundo coracao');
  assert.equal(heroi().x, cp.x, 'renasceu no checkpoint, nao no comeco');
  assert.equal(heroi().y, cp.y + cp.a - M.HEROI_A);
  igual(jogo.progresso.ativos, [true, false, false], 'o checkpoint continua aceso');
});

teste('sem coracoes, a fase recomeca com os quatro bichos de pe de novo', () => {
  esbarrarNoBicho(2);                          // o terceiro esbarrao

  assert.equal(contar('fase-reiniciada'), 1, 'a tentativa acabou');
  assert.equal(jogo.tentativas, 2);
  assert.equal(jogo.vidas, 3, 'coracoes cheios de novo');
  assert.equal(texto('hud-vidas'), '❤️❤️❤️');
  assert.equal(jogo.pontos, 0, 'e o placar zerado');
  assert.equal(texto('hud-pontos'), '0');

  assert.equal(Inimigos.quantos(jogo.inimigos), 4, 'os quatro de pe outra vez');
  jogo.inimigos.lista.forEach((ini, i) => {
    igual([ini.tipo, ini.x, ini.y, ini.estado],
      [fase.inimigos[i].tipo, fase.inimigos[i].x, fase.inimigos[i].y, 'vivo'],
      `o bicho ${i} voltou inteiro`);
  });
});

teste('"Jogar de novo" tambem devolve os quatro bichos', () => {
  pisarNoBicho(0);
  assert.equal(Inimigos.quantos(jogo.inimigos), 3, 'um foi derrotado');

  dom.clicar('btn-de-novo');
  assert.equal(Inimigos.quantos(jogo.inimigos), 4, 'partida nova, bichos novos');
  assert.equal(jogo.pontos, 0);
  assert.equal(heroi().x, fase.spawn.x);
});

await fim('Fase 5 (tela)');
