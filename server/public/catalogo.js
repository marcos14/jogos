/* Catálogo: busca a lista em /api/jogos e desenha os cartões. */
(() => {
  const grade = document.getElementById('grade');
  const vazio = document.getElementById('vazio');
  const vazioTexto = document.getElementById('vazio-texto');
  const aviso = document.getElementById('aviso');
  const busca = document.getElementById('busca');

  let jogos = [];

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
    const selos = (jogo.selos || []).length
      ? `<div class="selos">${jogo.selos
          .map((s) => `<span class="selo ${escapar(s.tipo)}">${escapar(s.texto)}</span>`).join('')}</div>`
      : '';
    const tags = jogo.tags.length
      ? `<div class="tags">${jogo.tags.map((t) => `<span class="tag">${escapar(t)}</span>`).join('')}</div>`
      : '';

    return `
      <li>
        <a class="cartao" href="/jogar/${encodeURIComponent(jogo.slug)}">
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
      }

      jogos = lista.jogos || [];
      desenhar();
    } catch (erro) {
      aviso.textContent = `Não consegui carregar os jogos: ${erro.message}`;
    }
  }

  busca.addEventListener('input', desenhar);

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
