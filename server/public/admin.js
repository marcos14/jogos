/* Painel do admin: login, upload de .zip e gestão dos jogos instalados. */
(() => {
  const $ = (id) => document.getElementById(id);

  const aviso = $('aviso');
  const painelLogin = $('painel-login');
  const painelUpload = $('painel-upload');
  const painelLista = $('painel-lista');
  const lista = $('lista');
  const listaVazia = $('lista-vazia');
  const contagem = $('contagem');
  const btnSair = $('btn-sair');
  const modal = $('modal-editar');

  let jogos = [];
  let editando = null;

  // ------------------------------------------------------------ utilidades
  const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const paraSlug = (texto) => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  function tamanho(bytes) {
    if (!bytes) return '0 KB';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${unidades[i]}`;
  }

  function mostrar(texto, tipo = 'ok') {
    aviso.textContent = texto;
    aviso.className = `aviso ${tipo === 'ok' ? 'ok' : 'ruim'}`;
    if (texto) aviso.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const limparAviso = () => { aviso.textContent = ''; aviso.className = 'aviso'; };

  async function api(caminho, opcoes = {}) {
    const resposta = await fetch(caminho, {
      headers: opcoes.body ? { 'Content-Type': 'application/json' } : {},
      ...opcoes,
    });
    let dados = {};
    try { dados = await resposta.json(); } catch { /* resposta sem corpo */ }
    if (resposta.status === 401 && caminho.startsWith('/api/admin/')) {
      entrarModoLogin();
      throw new Error('Sessão expirada. Entre de novo.');
    }
    if (!resposta.ok) throw new Error(dados.erro || `Erro ${resposta.status}`);
    return dados;
  }

  // ------------------------------------------------------------- telas
  function entrarModoLogin() {
    painelLogin.hidden = false;
    painelUpload.hidden = true;
    painelLista.hidden = true;
    btnSair.hidden = true;
    $('senha').focus();
  }

  function entrarModoAdmin() {
    painelLogin.hidden = true;
    painelUpload.hidden = false;
    painelLista.hidden = false;
    btnSair.hidden = false;
    carregarLista();
  }

  // ------------------------------------------------------------- lista
  function desenharLista() {
    contagem.textContent = jogos.length;
    listaVazia.hidden = jogos.length > 0;

    lista.innerHTML = jogos.map((jogo) => {
      const selos = [
        jogo.visivel ? '' : '<span class="selo">oculto</span>',
        jogo.problema ? `<span class="selo alerta">${escapar(jogo.problema)}</span>` : '',
      ].join(' ');

      const jogar = jogo.jogavel
        ? `<a class="botao claro" href="/jogar/${encodeURIComponent(jogo.slug)}" target="_blank" rel="noopener">▶️ Testar</a>`
        : '';

      return `
        <li class="item ${jogo.visivel ? '' : 'oculto'}">
          <span class="icone" style="--cor:${escapar(jogo.cor)}">${escapar(jogo.emoji)}</span>
          <span class="info">
            <strong>${escapar(jogo.nome)} ${selos}</strong>
            <small>jogos/${escapar(jogo.slug)} · ${tamanho(jogo.bytes)} ·
              ${new Date(jogo.atualizadoEm).toLocaleDateString('pt-BR')}</small>
          </span>
          <span class="acoes">
            ${jogar}
            <button class="botao claro" data-acao="editar" data-slug="${escapar(jogo.slug)}">✏️ Editar</button>
            <button class="botao claro" data-acao="visibilidade" data-slug="${escapar(jogo.slug)}">
              ${jogo.visivel ? '🙈 Ocultar' : '👁️ Mostrar'}
            </button>
            <button class="botao perigo" data-acao="apagar" data-slug="${escapar(jogo.slug)}">🗑️ Apagar</button>
          </span>
        </li>`;
    }).join('');
  }

  async function carregarLista() {
    try {
      const dados = await api('/api/admin/jogos');
      jogos = dados.jogos || [];
      desenharLista();
    } catch (erro) {
      mostrar(erro.message, 'ruim');
    }
  }

  lista.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;

    const jogo = jogos.find((j) => j.slug === botao.dataset.slug);
    if (!jogo) return;

    if (botao.dataset.acao === 'editar') return abrirEdicao(jogo);

    if (botao.dataset.acao === 'visibilidade') {
      try {
        await api(`/api/admin/jogos/${encodeURIComponent(jogo.slug)}`, {
          method: 'PATCH',
          body: JSON.stringify({ visivel: !jogo.visivel }),
        });
        mostrar(`"${jogo.nome}" agora está ${jogo.visivel ? 'oculto' : 'visível'}.`);
        carregarLista();
      } catch (erro) { mostrar(erro.message, 'ruim'); }
      return;
    }

    if (botao.dataset.acao === 'apagar') {
      const certeza = confirm(
        `Apagar "${jogo.nome}" de vez?\n\nA pasta jogos/${jogo.slug} vai ser removida do disco.`
      );
      if (!certeza) return;
      try {
        await api(`/api/admin/jogos/${encodeURIComponent(jogo.slug)}`, { method: 'DELETE' });
        mostrar(`"${jogo.nome}" foi apagado.`);
        carregarLista();
      } catch (erro) { mostrar(erro.message, 'ruim'); }
    }
  });

  // ------------------------------------------------------------- edição
  function abrirEdicao(jogo) {
    editando = jogo.slug;
    $('editar-slug').textContent = `pasta: jogos/${jogo.slug}`;
    $('e-nome').value = jogo.nome;
    $('e-emoji').value = jogo.emoji;
    $('e-cor').value = /^#[0-9a-fA-F]{6}$/.test(jogo.cor) ? jogo.cor : '#ff8fb8';
    $('e-idade').value = jogo.idade || '';
    $('e-descricao').value = jogo.descricao || '';
    $('e-tags').value = (jogo.tags || []).join(', ');
    $('e-visivel').checked = jogo.visivel;
    modal.showModal();
  }

  $('btn-cancelar').addEventListener('click', () => modal.close());

  $('form-editar').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    try {
      await api(`/api/admin/jogos/${encodeURIComponent(editando)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome: $('e-nome').value,
          emoji: $('e-emoji').value,
          cor: $('e-cor').value,
          idade: $('e-idade').value,
          descricao: $('e-descricao').value,
          tags: $('e-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
          visivel: $('e-visivel').checked,
        }),
      });
      modal.close();
      mostrar('Alterações salvas.');
      carregarLista();
    } catch (erro) {
      mostrar(erro.message, 'ruim');
    }
  });

  // ------------------------------------------------------------- login
  $('form-login').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparAviso();
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ senha: $('senha').value }) });
      $('senha').value = '';
      entrarModoAdmin();
    } catch (erro) {
      mostrar(erro.message, 'ruim');
    }
  });

  btnSair.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    limparAviso();
    entrarModoLogin();
  });

  // ------------------------------------------------------------- upload
  const campoNome = $('nome');
  const campoPasta = $('pasta');
  const campoArquivo = $('arquivo');
  let pastaEditadaAMao = false;

  campoPasta.addEventListener('input', () => { pastaEditadaAMao = true; });

  function sugerirPasta() {
    if (pastaEditadaAMao) return;
    const base = campoNome.value || (campoArquivo.files[0]?.name || '').replace(/\.zip$/i, '');
    campoPasta.value = paraSlug(base);
    $('dica-pasta').innerHTML = campoPasta.value
      ? `Vai ficar em <code>/jogos/${escapar(campoPasta.value)}/</code>`
      : 'Vira <code>/jogos/…</code>';
  }

  campoNome.addEventListener('input', sugerirPasta);
  campoArquivo.addEventListener('change', () => {
    sugerirPasta();
    if (!campoNome.value && campoArquivo.files[0]) {
      campoNome.value = campoArquivo.files[0].name.replace(/\.zip$/i, '').replace(/[-_]+/g, ' ').trim();
      sugerirPasta();
    }
  });

  $('form-upload').addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparAviso();

    if (!campoArquivo.files[0]) return mostrar('Escolha um arquivo .zip.', 'ruim');

    const dados = new FormData();
    dados.append('arquivo', campoArquivo.files[0]);
    dados.append('nome', campoNome.value);
    dados.append('pasta', campoPasta.value || paraSlug(campoNome.value));
    dados.append('emoji', $('emoji').value);
    dados.append('cor', $('cor').value);
    dados.append('idade', $('idade').value);
    dados.append('descricao', $('descricao').value);
    dados.append('tags', $('tags').value);
    dados.append('substituir', $('substituir').checked ? 'true' : 'false');

    const botao = $('btn-enviar');
    const progresso = $('progresso');
    const barra = progresso.firstElementChild;

    botao.disabled = true;
    botao.textContent = '⏳ Enviando…';
    progresso.hidden = false;
    barra.style.width = '0%';

    const requisicao = new XMLHttpRequest();
    requisicao.open('POST', '/api/admin/upload');

    requisicao.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) barra.style.width = `${(e.loaded / e.total) * 100}%`;
    });

    const terminar = () => {
      botao.disabled = false;
      botao.textContent = '⬆️ Publicar jogo';
      progresso.hidden = true;
    };

    requisicao.addEventListener('load', () => {
      terminar();
      let resposta = {};
      try { resposta = JSON.parse(requisicao.responseText); } catch { /* sem corpo */ }

      if (requisicao.status === 401) return entrarModoLogin();
      if (requisicao.status >= 400) {
        return mostrar(resposta.erro || `Erro ${requisicao.status} ao publicar.`, 'ruim');
      }

      mostrar(
        `${resposta.substituiu ? 'Atualizado' : 'Publicado'}: "${resposta.jogo?.nome || resposta.slug}" ` +
        `(${resposta.arquivos} arquivos) em /jogos/${resposta.slug}/`
      );
      evento.target.reset();
      pastaEditadaAMao = false;
      $('dica-pasta').innerHTML = 'Vira <code>/jogos/…</code>';
      carregarLista();
    });

    requisicao.addEventListener('error', () => {
      terminar();
      mostrar('A conexão caiu durante o envio.', 'ruim');
    });

    requisicao.send(dados);
  });

  // ------------------------------------------------------------- início
  api('/api/sessao')
    .then(({ logado }) => (logado ? entrarModoAdmin() : entrarModoLogin()))
    .catch(() => entrarModoLogin());
})();
