/* Catálogo: busca a lista em /api/jogos e desenha os cartões. */
(() => {
  const grade = document.getElementById('grade');
  const vazio = document.getElementById('vazio');
  const vazioTexto = document.getElementById('vazio-texto');
  const aviso = document.getElementById('aviso');
  const busca = document.getElementById('busca');

  let jogos = [];

  // Sem rede, só os jogos já abertos neste aparelho funcionam (o service
  // worker guarda cada um na primeira vez que é jogado). Os outros ganham um
  // aviso no cartão, para a criança não tocar num jogo que não vai abrir.
  const guardados = new Set();

  const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const semAcento = (texto) => String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function cartao(jogo) {
    const capa = jogo.capa
      ? `<img src="${escapar(jogo.capa)}" alt="" loading="lazy">`
      : `<span aria-hidden="true">${escapar(jogo.emoji)}</span>`;

    const idade = jogo.idade ? `<span class="idade">${escapar(jogo.idade)}</span>` : '';
    const descricao = jogo.descricao ? `<p>${escapar(jogo.descricao)}</p>` : '';
    // Selos vêm da plataforma (multijogador, 18+…), não do texto do jogo.
    const semRede = !navigator.onLine && !guardados.has(jogo.slug);
    const etiquetas = (jogo.selos || [])
      .map((s) => `<span class="selo ${escapar(s.tipo)}">${escapar(s.texto)}</span>`);
    if (semRede) etiquetas.push('<span class="selo rede">📴 precisa de conexão</span>');
    const selos = etiquetas.length ? `<div class="selos">${etiquetas.join('')}</div>` : '';
    const tags = jogo.tags.length
      ? `<div class="tags">${jogo.tags.map((t) => `<span class="tag">${escapar(t)}</span>`).join('')}</div>`
      : '';

    return `
      <li>
        <a class="cartao${semRede ? ' sem-rede' : ''}" href="/jogar/${encodeURIComponent(jogo.slug)}">
          <div class="capa" style="--cor:${escapar(jogo.cor)}">${capa}${idade}${selos}</div>
          <div class="corpo">
            <h2>${escapar(jogo.nome)}</h2>
            ${descricao}
            ${tags}
          </div>
        </a>
      </li>`;
  }

  function desenhar() {
    const termo = semAcento(busca.value.trim());
    const visiveis = termo
      ? jogos.filter((j) => semAcento(`${j.nome} ${j.descricao} ${j.tags.join(' ')}`).includes(termo))
      : jogos;

    grade.innerHTML = visiveis.map(cartao).join('');
    vazio.hidden = visiveis.length > 0;

    if (!visiveis.length) {
      vazioTexto.textContent = jogos.length
        ? `Nenhum jogo com "${busca.value.trim()}".`
        : 'Nenhum jogo por aqui ainda.';
    }
  }

  async function carregar() {
    try {
      const [config, lista] = await Promise.all([
        fetch('/api/config').then((r) => r.json()).catch(() => ({})),
        fetch('/api/jogos').then((r) => {
          if (!r.ok) throw new Error('Falha ao carregar a lista.');
          return r.json();
        }),
      ]);

      if (config.titulo) {
        document.getElementById('titulo').textContent = config.titulo;
        document.title = config.titulo;
        // O nome que o iPhone escreve debaixo do ícone ao adicionar à tela de início.
        const nomeDoApp = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (nomeDoApp) nomeDoApp.content = config.titulo;
      }

      jogos = lista.jogos || [];
      desenhar();
      conferirGuardados();
    } catch (erro) {
      aviso.textContent = `Não consegui carregar os jogos: ${erro.message}`;
    }
  }

  // Pergunta ao cache do service worker quais jogos já estão neste aparelho.
  // Só existe em https (ou localhost); fora disso, nada a marcar.
  async function conferirGuardados() {
    if (!window.caches) return;
    await Promise.all(jogos.map(async (jogo) => {
      try {
        if (await caches.match(jogo.entrada)) guardados.add(jogo.slug);
      } catch { /* cache indisponível: segue sem marcar */ }
    }));
    if (!navigator.onLine) desenhar();
  }

  busca.addEventListener('input', desenhar);
  window.addEventListener('online', desenhar);
  window.addEventListener('offline', desenhar);

  // "/" foca a busca, Esc limpa.
  document.addEventListener('keydown', (evento) => {
    if (evento.key === '/' && document.activeElement !== busca) {
      evento.preventDefault();
      busca.focus();
    } else if (evento.key === 'Escape' && document.activeElement === busca) {
      busca.value = '';
      desenhar();
    }
  });

  carregar();
})();
