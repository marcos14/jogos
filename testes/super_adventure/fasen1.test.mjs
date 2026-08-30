/* ==========================================================================
   Super Adventure - Fase n1: o caderninho dos dedos (modulo `Toque`)
   --------------------------------------------------------------------------
   Rodar:  node testes/super_adventure/fasen1.test.mjs

   Aqui nao ha tela nenhuma: e so o modulo puro que conta os dedos em cima do
   vidro. Ele existe porque, num tablet, tres coisas acontecem o tempo todo e
   nenhuma delas o teclado conhece:

     - DOIS BOTOES AO MESMO TEMPO (correr e pular sao dois polegares);
     - DOIS DEDOS NO MESMO BOTAO (tirar um nao pode soltar o botao);
     - ARRASTAR o dedo de um botao para o outro sem tirar da tela.

   Como todo modulo deste jogo, ele e puro: cada funcao devolve um estado NOVO
   e nao encosta no que recebeu.
   ========================================================================== */

import assert from 'node:assert/strict';
import { carregarJogo, teste, fim } from './harness.mjs';

const { Toque } = carregarJogo();

/** Uma foto do estado, para conferir que nada foi mexido por baixo do pano. */
const foto = (estado) => JSON.stringify(estado);

console.log('Super Adventure - fase n1 (o toque)\n');

// ------------------------------------------------------------ O comeco -----
teste('um estado novo nao tem dedo nenhum', () => {
  const estado = Toque.novoEstado();

  assert.equal(Toque.dedos(estado), 0);
  for (const acao of Toque.ACOES) {
    assert.equal(Toque.apertada(estado, acao), false, `${acao} nasce solta`);
  }
});

teste('as tres acoes sao as mesmas que o teclado ja escrevia', () => {
  // `Array.from` traz a lista para este lado do `vm`: comparar direto o array
  // do outro contexto falharia so por causa do prototipo.
  assert.deepEqual(Array.from(Toque.ACOES).sort(), ['direita', 'esquerda', 'pular']);
});

// --------------------------------------------------------- Um dedo so ------
teste('um dedo num botao aperta so aquela acao', () => {
  const estado = Toque.encostar(Toque.novoEstado(), 7, 'direita');

  assert.equal(Toque.apertada(estado, 'direita'), true);
  assert.equal(Toque.apertada(estado, 'esquerda'), false);
  assert.equal(Toque.apertada(estado, 'pular'), false);
  assert.equal(Toque.dedos(estado), 1);
});

teste('tirar o dedo solta o botao', () => {
  const apertado = Toque.encostar(Toque.novoEstado(), 7, 'direita');
  const solto = Toque.soltar(apertado, 7);

  assert.equal(Toque.apertada(solto, 'direita'), false);
  assert.equal(Toque.dedos(solto), 0);
});

teste('o id do dedo e o mesmo venha ele como numero ou como texto', () => {
  const apertado = Toque.encostar(Toque.novoEstado(), 3, 'pular');
  const solto = Toque.soltar(apertado, '3');

  assert.equal(Toque.apertada(solto, 'pular'), false, 'o 3 e o "3" sao o mesmo dedo');
});

// ------------------------------------------------------- Dois dedos --------
teste('dois dedos, dois botoes: da para correr e pular junto', () => {
  let estado = Toque.novoEstado();
  estado = Toque.encostar(estado, 1, 'direita');
  estado = Toque.encostar(estado, 2, 'pular');

  assert.equal(Toque.apertada(estado, 'direita'), true);
  assert.equal(Toque.apertada(estado, 'pular'), true);
  assert.equal(Toque.dedos(estado), 2);

  estado = Toque.soltar(estado, 2);
  assert.equal(Toque.apertada(estado, 'pular'), false, 'o polegar do pulo saiu');
  assert.equal(Toque.apertada(estado, 'direita'), true, 'e o da corrida ficou');
});

teste('dois dedos no MESMO botao: tirar um nao solta o botao', () => {
  let estado = Toque.novoEstado();
  estado = Toque.encostar(estado, 1, 'direita');
  estado = Toque.encostar(estado, 2, 'direita');
  assert.equal(Toque.dedos(estado), 2);

  estado = Toque.soltar(estado, 1);
  assert.equal(Toque.apertada(estado, 'direita'), true, 'ainda ha um dedo em cima');

  estado = Toque.soltar(estado, 2);
  assert.equal(Toque.apertada(estado, 'direita'), false, 'agora sim, o ultimo saiu');
});

// --------------------------------------------------------- O arrasto -------
teste('arrastar o dedo de um botao para o outro troca de acao', () => {
  let estado = Toque.encostar(Toque.novoEstado(), 4, 'esquerda');
  estado = Toque.encostar(estado, 4, 'direita');

  assert.equal(Toque.apertada(estado, 'esquerda'), false, 'o botao velho apagou');
  assert.equal(Toque.apertada(estado, 'direita'), true, 'e o novo acendeu');
  assert.equal(Toque.dedos(estado), 1, 'continua sendo um dedo so');
});

teste('arrastar de volta para o botao em que o dedo ja esta nao muda nada', () => {
  const estado = Toque.encostar(Toque.novoEstado(), 4, 'direita');
  const igual = Toque.encostar(estado, 4, 'direita');

  assert.equal(igual, estado, 'nem estado novo foi feito');
});

teste('arrastar um dedo nao mexe no botao que o OUTRO esta segurando', () => {
  let estado = Toque.novoEstado();
  estado = Toque.encostar(estado, 1, 'esquerda');
  estado = Toque.encostar(estado, 2, 'esquerda');
  estado = Toque.encostar(estado, 2, 'pular');

  assert.equal(Toque.apertada(estado, 'esquerda'), true, 'o dedo 1 nao saiu de la');
  assert.equal(Toque.apertada(estado, 'pular'), true);
});

// ------------------------------------------------------- Largar tudo -------
teste('largarTudo devolve a tela limpa', () => {
  let estado = Toque.novoEstado();
  estado = Toque.encostar(estado, 1, 'esquerda');
  estado = Toque.encostar(estado, 2, 'pular');

  const limpo = Toque.largarTudo(estado);
  assert.equal(Toque.dedos(limpo), 0);
  for (const acao of Toque.ACOES) assert.equal(Toque.apertada(limpo, acao), false);
});

// ------------------------------------------------- O que nao pode dar ------
teste('soltar um dedo que nunca encostou nao muda nada', () => {
  const estado = Toque.encostar(Toque.novoEstado(), 1, 'direita');
  const igual = Toque.soltar(estado, 99);

  assert.equal(igual, estado, 'devolveu o mesmo estado, sem copia atoa');
});

teste('um botao que nao existe e ignorado', () => {
  const estado = Toque.novoEstado();
  const igual = Toque.encostar(estado, 1, 'dancar');

  assert.equal(igual, estado);
  assert.equal(Toque.dedos(igual), 0);
});

teste('nenhuma conta fica negativa por soltar duas vezes', () => {
  let estado = Toque.encostar(Toque.novoEstado(), 1, 'pular');
  estado = Toque.soltar(estado, 1);
  estado = Toque.soltar(estado, 1);
  estado = Toque.encostar(estado, 1, 'pular');

  assert.equal(Toque.apertada(estado, 'pular'), true, 'o botao volta a acender');
  assert.equal(Toque.dedos(estado), 1);
});

// ------------------------------------------------------------ A pureza -----
teste('encostar e soltar nao mexem no estado que receberam', () => {
  const estado = Toque.encostar(Toque.novoEstado(), 1, 'direita');
  const antes = foto(estado);

  Toque.encostar(estado, 2, 'pular');
  Toque.encostar(estado, 1, 'esquerda');
  Toque.soltar(estado, 1);
  Toque.largarTudo(estado);

  assert.equal(foto(estado), antes, 'o estado de entrada ficou intacto');
});

await fim('Fase n1');
