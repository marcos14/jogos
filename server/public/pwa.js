/* ==========================================================================
   A Central como app (PWA), do lado do navegador
   --------------------------------------------------------------------------
   Duas tarefas:
     1. registrar o service worker (/sw.js), que guarda a casca da Central e
        os jogos ja abertos para tudo continuar funcionando sem rede;
     2. cuidar do botao "Instalar" do catalogo. O Chrome e o Edge avisam
        quando podem instalar (beforeinstallprompt) e ai o botao abre o
        pedido nativo. O iPhone e o iPad nunca avisam: precisam do passo a
        passo do Safari. E num endereco http (o normal na rede de casa) o
        Android nem oferece a instalacao: a caixa explica os dois jeitos de
        resolver.
   Carregado pelo catalogo (index.html) e pela pagina de jogar (jogar.html).
   ========================================================================== */
(() => {
  'use strict';

  const noCatalogo = document.body.dataset.pwa === 'catalogo';
  const comoApp = matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: fullscreen)').matches
    || navigator.standalone === true;
  const ehIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ------------------------------------------------------ service worker --
  // Em http (fora do localhost) o navegador nem expoe navigator.serviceWorker;
  // ai a Central segue como site comum, sem cache e sem "sem conexao".
  if ('serviceWorker' in navigator) {
    const tinhaControlador = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register('/sw.js').catch(() => { /* segue sem */ });

    // Quando uma versao nova assume, o catalogo recarrega uma vez para pegar a
    // casca nova. Dentro de um jogo, nunca: seria cortar a partida no meio.
    if (noCatalogo && tinhaControlador) {
      let recarregou = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recarregou) return;
        recarregou = true;
        location.reload();
      });
    }
  }

  // ------------------------------------------------------ botao Instalar --
  const botao = document.getElementById('btn-instalar');
  const dialogo = document.getElementById('dialogo-instalar');
  if (!botao || !dialogo || comoApp) return;

  let pedido = null;   // o beforeinstallprompt guardado para o clique

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    pedido = evento;
    botao.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    pedido = null;
    botao.hidden = true;
  });

  botao.hidden = false;

  botao.addEventListener('click', async () => {
    if (pedido) {
      const atual = pedido;
      pedido = null;               // o prompt() so vale uma vez por evento
      atual.prompt();
      const escolha = await atual.userChoice.catch(() => ({ outcome: 'dismissed' }));
      if (escolha.outcome === 'accepted') botao.hidden = true;
      return;
    }
    if (ehIOS) abrirDialogo('ios');
    else if (!window.isSecureContext) abrirDialogo('inseguro');
    else abrirDialogo('manual');
  });

  function abrirDialogo(modo) {
    dialogo.querySelectorAll('[data-modo]').forEach((bloco) => {
      bloco.hidden = bloco.dataset.modo !== modo;
    });
    const endereco = dialogo.querySelector('.endereco');
    if (endereco) endereco.value = location.origin;
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }

  function fecharDialogo() {
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
  }

  dialogo.querySelectorAll('.fechar').forEach((b) => b.addEventListener('click', fecharDialogo));

  // Toque no endereco seleciona tudo: e para copiar e colar na flag do Chrome.
  const endereco = dialogo.querySelector('.endereco');
  if (endereco) endereco.addEventListener('focus', () => endereco.select());
})();
