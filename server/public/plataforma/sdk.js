/* ==========================================================================
   SDK DA PLATAFORMA  -  window.Plataforma
   --------------------------------------------------------------------------
   E isto que um jogo precisa saber para virar multijogador:

     <script src="/plataforma/sdk.js"></script>

     const p = await Plataforma.iniciar({ jogo: 'meu-jogo' });
     if (p.multijogador.disponivel) {
       p.multijogador.abrirLobby({
         aoComecar(sala)  { ... comeca a partida ... },
         aoReceber(msg)   { ... mensagem de outro jogador ... },
         aoTerminar(fim)  { ... voltou para o lobby ... },
       });
     }

   O anfitriao ("sala.souAnfitriao") roda a simulacao e manda o estado:
     p.multijogador.enviar({ tipo: 'estado', ... });
   Os convidados mandam so o que apertaram:
     p.multijogador.paraAnfitriao({ tipo: 'entrada', ... });

   O SDK cuida de: conexao, reconexao, lobby na tela, apelido, identidade,
   e degrada sozinho - se o servidor da plataforma nao responder, o jogo
   continua rodando de um jogador so.
   ========================================================================== */
(function () {
  'use strict';

  var VERSAO_SDK = 1;
  var CHAVE_APELIDO = 'plataforma.apelido';
  var CHAVE_ID = 'plataforma.jogadorId';

  // ------------------------------------------------------------ utilidades --
  function guardar(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch (e) { /* modo privado */ }
  }
  function ler(chave) {
    try { return localStorage.getItem(chave); } catch (e) { return null; }
  }
  function idDoJogador() {
    var id = ler(CHAVE_ID);
    if (!id) {
      id = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      guardar(CHAVE_ID, id);
    }
    return id;
  }
  function escapar(texto) {
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Emissor de eventos minusculo (o SDK inteiro roda em cima dele).
  function Eventos() {
    var ouvintes = {};
    return {
      em: function (nome, fn) {
        (ouvintes[nome] = ouvintes[nome] || []).push(fn);
        return this;
      },
      fora: function (nome, fn) {
        if (ouvintes[nome]) ouvintes[nome] = ouvintes[nome].filter(function (f) { return f !== fn; });
        return this;
      },
      solta: function (nome, dado) {
        (ouvintes[nome] || []).forEach(function (fn) {
          try { fn(dado); } catch (e) { console.error('[plataforma] ouvinte de "' + nome + '":', e); }
        });
        (ouvintes['*'] || []).forEach(function (fn) {
          try { fn(nome, dado); } catch (e) { /* ignora */ }
        });
      }
    };
  }

  // ====================================================== canal (WebSocket) ==
  function Canal(caminho) {
    var eventos = Eventos();
    var ws = null;
    var fila = [];
    var querConectar = false;
    var tentativas = 0;
    var timerReconexao = null;

    function endereco() {
      var protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return protocolo + '//' + location.host + caminho;
    }

    function conectar() {
      querConectar = true;
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;

      try { ws = new WebSocket(endereco()); } catch (e) {
        return agendarReconexao();
      }

      ws.onopen = function () {
        tentativas = 0;
        eventos.solta('aberto');
        var pendentes = fila; fila = [];
        pendentes.forEach(enviar);
      };

      ws.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg && msg.t) eventos.solta(msg.t, msg);
      };

      ws.onclose = function () {
        ws = null;
        eventos.solta('fechado');
        agendarReconexao();
      };

      ws.onerror = function () { /* o onclose vem logo atras */ };
    }

    function agendarReconexao() {
      if (!querConectar || timerReconexao) return;
      var espera = Math.min(8000, 400 * Math.pow(1.8, tentativas++));
      timerReconexao = setTimeout(function () {
        timerReconexao = null;
        if (querConectar) conectar();
      }, espera);
    }

    function enviar(objeto) {
      if (!ws || ws.readyState !== 1) {
        if (fila.length < 40) fila.push(objeto);
        return false;
      }
      try { ws.send(JSON.stringify(objeto)); return true; } catch (e) { return false; }
    }

    function desligar() {
      querConectar = false;
      clearTimeout(timerReconexao); timerReconexao = null;
      fila = [];
      if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    }

    return {
      em: eventos.em, fora: eventos.fora,
      conectar: conectar, enviar: enviar, desligar: desligar,
      conectado: function () { return Boolean(ws && ws.readyState === 1); }
    };
  }

  // ======================================================= multijogador =====
  function Multijogador(app, capacidade) {
    var eventos = Eventos();
    var canal = null;
    var sala = null;          // ultimo estado da sala vindo do servidor
    var meuId = null;
    var lobby = null;         // interface pronta (opcional)
    var ganchos = {};

    function souAnfitriao() {
      return Boolean(sala && meuId && sala.anfitriao === meuId);
    }

    function meuJogador() {
      if (!sala || !meuId) return null;
      for (var i = 0; i < sala.jogadores.length; i++) {
        if (sala.jogadores[i].id === meuId) return sala.jogadores[i];
      }
      return null;
    }

    function instantaneo() {
      if (!sala) return null;
      return {
        codigo: sala.codigo,
        estado: sala.estado,
        modo: sala.modo,
        max: sala.max,
        min: sala.min,
        taxaEstado: sala.taxaEstado,
        eu: meuId,
        souAnfitriao: souAnfitriao(),
        anfitriao: sala.anfitriao,
        jogadores: sala.jogadores.slice(),
        semente: sala.semente || 0
      };
    }

    function garantirCanal() {
      if (canal) return canal;
      canal = Canal(capacidade.caminho || '/plataforma/ws');

      canal.em('entrei', function (m) {
        meuId = m.eu;
        sala = m.sala;
        eventos.solta('sala', instantaneo());
      });
      canal.em('sala', function (m) {
        sala = m.sala;
        eventos.solta('sala', instantaneo());
      });
      canal.em('anfitriao', function (m) {
        if (sala) sala.anfitriao = m.id;
        eventos.solta('sala', instantaneo());
      });
      canal.em('inicio', function (m) {
        if (sala) { sala = m.sala; sala.semente = m.semente; }
        eventos.solta('inicio', instantaneo());
      });
      canal.em('fim', function (m) {
        if (m.sala) sala = m.sala;
        eventos.solta('fim', { placar: m.placar || [], sala: instantaneo() });
      });
      canal.em('abortou', function (m) {
        eventos.solta('abortou', { motivo: m.motivo, sala: instantaneo() });
      });
      canal.em('saiu', function (m) {
        eventos.solta('saiu', m.jogador);
      });
      canal.em('msg', function (m) {
        eventos.solta('msg', { de: m.de, d: m.d });
      });
      canal.em('erro', function (m) {
        eventos.solta('erro', m.msg || 'Algo deu errado.');
      });
      canal.em('fechado', function () { eventos.solta('offline'); });
      canal.em('aberto', function () { eventos.solta('online'); });

      canal.conectar();
      return canal;
    }

    var api = {
      disponivel: Boolean(capacidade && capacidade.disponivel),
      max: (capacidade && capacidade.maxJogadores) || 0,

      em: eventos.em,
      fora: eventos.fora,

      sala: instantaneo,
      souAnfitriao: souAnfitriao,
      eu: meuJogador,

      conectar: function () { garantirCanal(); return api; },

      criar: function (opcoes) {
        garantirCanal().enviar({
          t: 'criar', jogo: app.jogo, apelido: app.perfil.apelido, opcoes: opcoes || {}
        });
        return api;
      },

      entrar: function (codigo) {
        garantirCanal().enviar({
          t: 'entrar', codigo: String(codigo || '').toUpperCase().trim(), apelido: app.perfil.apelido
        });
        return api;
      },

      pronto: function (valor) {
        garantirCanal().enviar({ t: 'pronto', valor: valor !== false });
        return api;
      },

      comecar: function () { garantirCanal().enviar({ t: 'iniciar' }); return api; },

      terminar: function (placar) { garantirCanal().enviar({ t: 'fim', placar: placar }); return api; },

      sair: function () {
        if (canal) canal.enviar({ t: 'sair' });
        sala = null; meuId = null;
        return api;
      },

      desligar: function () {
        if (canal) { canal.enviar({ t: 'sair' }); canal.desligar(); canal = null; }
        sala = null; meuId = null;
        return api;
      },

      /** Manda para todo mundo menos eu (o normal do anfitriao). */
      enviar: function (dados) {
        if (!canal) return false;
        return canal.enviar({ t: 'msg', para: 'outros', d: dados });
      },

      paraAnfitriao: function (dados) {
        if (!canal) return false;
        return canal.enviar({ t: 'msg', para: 'anfitriao', d: dados });
      },

      paraJogador: function (id, dados) {
        if (!canal) return false;
        return canal.enviar({ t: 'msg', para: id, d: dados });
      },

      listarSalas: function () {
        return fetch('/api/plataforma/salas?jogo=' + encodeURIComponent(app.jogo))
          .then(function (r) { return r.json(); })
          .then(function (d) { return d.salas || []; })
          .catch(function () { return []; });
      },

      /** Lobby pronto: cria/entra em sala, mostra quem chegou e comeca. */
      abrirLobby: function (opcoes) {
        ganchos = opcoes || {};
        if (!lobby) lobby = criarLobby(app, api, eventos, function () { return ganchos; });
        lobby.abrir();
        return api;
      },

      fecharLobby: function () { if (lobby) lobby.fechar(); return api; }
    };

    // Os ganchos do lobby tambem funcionam para quem nao usa o lobby.
    eventos.em('inicio', function (s) { if (ganchos.aoComecar) ganchos.aoComecar(s); });
    eventos.em('msg', function (m) { if (ganchos.aoReceber) ganchos.aoReceber(m); });
    eventos.em('fim', function (f) { if (ganchos.aoTerminar) ganchos.aoTerminar(f); });
    eventos.em('abortou', function (a) { if (ganchos.aoAbortar) ganchos.aoAbortar(a); });

    return api;
  }

  // ====================================================== lobby (interface) ==
  var CSS_LOBBY = [
    '.pf-fundo{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;',
    'background:rgba(18,16,26,.72);backdrop-filter:blur(3px);padding:16px;',
    'font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#3a2b26}',
    '.pf-fundo[hidden]{display:none}',
    '.pf-caixa{background:#fffdf7;border:4px solid #3a2b26;border-radius:22px;box-shadow:0 10px 0 rgba(0,0,0,.25);',
    'width:min(440px,100%);max-height:min(90vh,720px);overflow:auto;padding:20px}',
    '.pf-caixa h2{margin:0 0 4px;font-size:1.35rem}',
    '.pf-sub{margin:0 0 14px;opacity:.7;font-size:.9rem}',
    '.pf-linha{display:flex;gap:8px;margin:10px 0}',
    '.pf-btn{flex:1;padding:12px 14px;border-radius:14px;border:3px solid #3a2b26;background:#ffd23f;',
    'font-weight:800;font-size:1rem;cursor:pointer;font-family:inherit;color:#3a2b26}',
    '.pf-btn:hover{filter:brightness(1.05)}',
    '.pf-btn:disabled{opacity:.45;cursor:not-allowed}',
    '.pf-btn.pf-claro{background:#fff}',
    '.pf-btn.pf-verde{background:#8ce99a}',
    '.pf-campo{flex:1;padding:12px;border-radius:14px;border:3px solid #3a2b26;font-size:1rem;',
    'font-family:inherit;min-width:0;background:#fff;color:#3a2b26}',
    '.pf-codigo{text-transform:uppercase;letter-spacing:.28em;text-align:center;font-weight:800}',
    '.pf-cod-grande{font-size:2.1rem;font-weight:900;letter-spacing:.3em;text-align:center;',
    'background:#fff3c4;border:3px dashed #3a2b26;border-radius:16px;padding:10px;margin:10px 0}',
    '.pf-jogadores{list-style:none;margin:10px 0;padding:0;display:grid;gap:6px}',
    '.pf-jogadores li{display:flex;align-items:center;gap:10px;background:#fff;border:3px solid #3a2b26;',
    'border-radius:14px;padding:8px 12px;font-weight:700}',
    '.pf-bolinha{width:18px;height:18px;border-radius:50%;border:3px solid #3a2b26;flex:none}',
    '.pf-quem{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pf-marca{font-size:.75rem;background:#3a2b26;color:#fffdf7;border-radius:999px;padding:2px 8px}',
    '.pf-vazio{opacity:.45;border-style:dashed!important;font-weight:600}',
    '.pf-aviso{background:#ffd3e3;border:3px solid #3a2b26;border-radius:12px;padding:8px 12px;',
    'margin:10px 0;font-weight:700;font-size:.9rem}',
    '.pf-aviso[hidden]{display:none}',
    '.pf-salas{list-style:none;margin:8px 0;padding:0;display:grid;gap:6px}',
    '.pf-salas button{width:100%;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;',
    'border:3px solid #3a2b26;background:#fff;font-weight:800;cursor:pointer;font-family:inherit;color:#3a2b26}',
    '.pf-salas .pf-vagas{margin-left:auto;font-weight:600;opacity:.7;font-size:.85rem}',
    '.pf-sep{margin:16px 0 8px;font-weight:800;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;opacity:.55}',
    '.pf-x{float:right;border:none;background:none;font-size:1.5rem;cursor:pointer;line-height:1;color:#3a2b26}',
    '@media (max-width:420px){.pf-caixa{padding:14px}.pf-cod-grande{font-size:1.7rem}}'
  ].join('');

  function criarLobby(app, mj, eventos, pegarGanchos) {
    var raiz = document.createElement('div');
    raiz.className = 'pf-fundo';
    raiz.hidden = true;

    var estilo = document.createElement('style');
    estilo.textContent = CSS_LOBBY;
    document.head.appendChild(estilo);

    raiz.innerHTML = [
      '<div class="pf-caixa">',
      '  <button class="pf-x" data-acao="fechar" title="Fechar">×</button>',
      '  <h2>Jogar com amigos</h2>',
      '  <p class="pf-sub" data-campo="sub">Todo mundo na mesma rede (o mesmo wi-fi).</p>',
      '  <div class="pf-aviso" data-campo="aviso" hidden></div>',

      '  <div data-tela="entrada">',
      '    <div class="pf-linha">',
      '      <input class="pf-campo" data-campo="apelido" maxlength="14" placeholder="Seu nome">',
      '    </div>',
      '    <div class="pf-linha">',
      '      <button class="pf-btn pf-verde" data-acao="criar">Criar sala</button>',
      '    </div>',
      '    <div class="pf-linha">',
      '      <input class="pf-campo pf-codigo" data-campo="codigo" maxlength="4" placeholder="CÓDIGO">',
      '      <button class="pf-btn pf-claro" data-acao="entrar">Entrar</button>',
      '    </div>',
      '    <div class="pf-sep">Salas abertas aqui perto</div>',
      '    <ul class="pf-salas" data-campo="salas"><li class="pf-vazio">Procurando…</li></ul>',
      '  </div>',

      '  <div data-tela="sala" hidden>',
      '    <div class="pf-cod-grande" data-campo="codigoGrande">----</div>',
      '    <p class="pf-sub" data-campo="dica">Peça para os amigos digitarem esse código.</p>',
      '    <ul class="pf-jogadores" data-campo="jogadores"></ul>',
      '    <div class="pf-linha">',
      '      <button class="pf-btn pf-claro" data-acao="sair">Sair</button>',
      '      <button class="pf-btn pf-verde" data-acao="comecar">Começar!</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(raiz);

    var q = function (nome) { return raiz.querySelector('[data-campo="' + nome + '"]'); };
    var tela = function (nome) { return raiz.querySelector('[data-tela="' + nome + '"]'); };
    var campos = {
      sub: q('sub'), aviso: q('aviso'), apelido: q('apelido'), codigo: q('codigo'),
      salas: q('salas'), codigoGrande: q('codigoGrande'), jogadores: q('jogadores'), dica: q('dica')
    };
    var btnComecar = raiz.querySelector('[data-acao="comecar"]');
    var timerSalas = null;

    campos.apelido.value = app.perfil.apelido;

    function avisar(texto) {
      campos.aviso.textContent = texto || '';
      campos.aviso.hidden = !texto;
      if (texto) clearTimeout(avisar._t), avisar._t = setTimeout(function () { campos.aviso.hidden = true; }, 6000);
    }

    function guardarApelido() {
      var nome = campos.apelido.value.trim().replace(/\s+/g, ' ');
      if (nome) app.perfil.definirApelido(nome);
      return app.perfil.apelido;
    }

    function mostrarSala(s) {
      var naSala = Boolean(s);
      tela('entrada').hidden = naSala;
      tela('sala').hidden = !naSala;
      if (!naSala) return;

      campos.codigoGrande.textContent = s.codigo;
      campos.jogadores.innerHTML = '';

      s.jogadores.forEach(function (j) {
        var li = document.createElement('li');
        li.innerHTML =
          '<span class="pf-bolinha" style="background:' + escapar(j.cor) + '"></span>' +
          '<span class="pf-quem"></span>' +
          (j.anfitriao ? '<span class="pf-marca">anfitrião</span>' : '') +
          (j.id === s.eu ? '<span class="pf-marca">você</span>' : '');
        li.querySelector('.pf-quem').textContent = j.apelido;
        campos.jogadores.appendChild(li);
      });

      for (var i = s.jogadores.length; i < s.max; i++) {
        var vaga = document.createElement('li');
        vaga.className = 'pf-vazio';
        vaga.textContent = 'esperando jogador…';
        campos.jogadores.appendChild(vaga);
      }

      var faltam = s.min - s.jogadores.length;
      btnComecar.hidden = !s.souAnfitriao;
      btnComecar.disabled = faltam > 0;
      btnComecar.textContent = faltam > 0
        ? (faltam === 1 ? 'Falta 1 jogador' : 'Faltam ' + faltam + ' jogadores')
        : 'Começar!';
      campos.dica.textContent = s.souAnfitriao
        ? 'Peça para os amigos digitarem esse código. Você começa a partida.'
        : 'Esperando o anfitrião começar…';
    }

    function atualizarSalas() {
      mj.listarSalas().then(function (lista) {
        campos.salas.innerHTML = '';
        if (!lista.length) {
          campos.salas.innerHTML = '<li class="pf-vazio">Nenhuma sala aberta. Crie a sua!</li>';
          return;
        }
        lista.forEach(function (s) {
          var li = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span>' + escapar(s.codigo) + '</span>' +
            '<span class="pf-quem"></span>' +
            '<span class="pf-vagas">' + s.jogadores + '/' + s.max + '</span>';
          b.querySelector('.pf-quem').textContent = 'sala de ' + s.anfitriao;
          b.addEventListener('click', function () {
            guardarApelido();
            mj.entrar(s.codigo);
          });
          li.appendChild(b);
          campos.salas.appendChild(li);
        });
      });
    }

    raiz.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('[data-acao]');
      if (!alvo) {
        if (ev.target === raiz) fechar();
        return;
      }
      var acao = alvo.dataset.acao;
      if (acao === 'fechar') return fechar();
      if (acao === 'criar') { guardarApelido(); return mj.criar(); }
      if (acao === 'entrar') {
        var codigo = campos.codigo.value.trim();
        if (codigo.length < 4) return avisar('Digite o código de 4 letras.');
        guardarApelido();
        return mj.entrar(codigo);
      }
      if (acao === 'sair') { mj.sair(); mostrarSala(null); atualizarSalas(); return; }
      if (acao === 'comecar') return mj.comecar();
    });

    campos.codigo.addEventListener('input', function () {
      campos.codigo.value = campos.codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    eventos.em('sala', function (s) { if (!raiz.hidden) mostrarSala(s); });
    eventos.em('erro', function (m) { if (!raiz.hidden) avisar(m); });
    eventos.em('offline', function () { if (!raiz.hidden) avisar('Sem conexão com o servidor. Tentando de novo…'); });
    eventos.em('inicio', function () { fechar(); });
    eventos.em('abortou', function (a) {
      abrir();
      mostrarSala(mj.sala());
      avisar(a.motivo);
    });
    eventos.em('fim', function () {
      var ganchos = pegarGanchos();
      if (ganchos.voltarAoLobby === false) return;
      abrir();
      mostrarSala(mj.sala());
    });

    function abrir() {
      raiz.hidden = false;
      campos.apelido.value = app.perfil.apelido;
      mj.conectar();
      mostrarSala(mj.sala());
      if (!mj.sala()) {
        atualizarSalas();
        clearInterval(timerSalas);
        timerSalas = setInterval(atualizarSalas, 4000);
      }
    }

    function fechar() {
      raiz.hidden = true;
      clearInterval(timerSalas); timerSalas = null;
      var ganchos = pegarGanchos();
      if (ganchos.aoFechar) ganchos.aoFechar();
    }

    return { abrir: abrir, fechar: fechar };
  }

  // =============================================================== fachada ==
  var perfil = {
    id: idDoJogador(),
    apelido: ler(CHAVE_APELIDO) || '',
    definirApelido: function (nome) {
      perfil.apelido = String(nome || '').trim().slice(0, 14);
      guardar(CHAVE_APELIDO, perfil.apelido);
      return perfil.apelido;
    }
  };

  var Plataforma = {
    versao: VERSAO_SDK,
    perfil: perfil,
    pronta: false,
    capacidades: null,

    /**
     * Liga o jogo na plataforma. Sempre resolve - se o servidor nao responder,
     * volta com tudo "disponivel: false" e o jogo segue sozinho.
     */
    iniciar: function (opcoes) {
      var app = {
        jogo: (opcoes && opcoes.jogo) || slugDaUrl(),
        perfil: perfil
      };
      if (opcoes && opcoes.apelido && !perfil.apelido) perfil.definirApelido(opcoes.apelido);

      return fetch('/api/plataforma', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('sem plataforma')); })
        .catch(function () { return { versao: 0, capacidades: {} }; })
        .then(function (info) {
          var caps = info.capacidades || {};
          Plataforma.capacidades = caps;
          Plataforma.jogo = app.jogo;
          Plataforma.pronta = true;
          Plataforma.multijogador = Multijogador(app, caps.multijogador || { disponivel: false });

          // Ainda nao ligados no servidor - o contrato ja existe no jogo.json.
          Plataforma.ranking = recursoFuturo(caps.ranking, 'ranking');
          Plataforma.privacidade = recursoFuturo(caps.privacidade, 'privacidade');
          Plataforma.classificacao = recursoFuturo(caps.classificacao, 'classificacao');

          return Plataforma;
        });
    }
  };

  function recursoFuturo(capacidade, nome) {
    var cap = capacidade || { disponivel: false };
    return {
      disponivel: Boolean(cap.disponivel),
      motivo: cap.motivo || '',
      indisponivel: function () {
        console.info('[plataforma] "' + nome + '" ainda nao esta ligada: ' + (cap.motivo || 'sem servidor'));
        return Promise.resolve(null);
      }
    };
  }

  function slugDaUrl() {
    var partes = location.pathname.split('/').filter(Boolean);
    var i = partes.indexOf('jogos');
    return i >= 0 && partes[i + 1] ? decodeURIComponent(partes[i + 1]) : '';
  }

  window.Plataforma = Plataforma;
}());
