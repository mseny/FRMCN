/* ============================================================================
   [m].seny /academy — curso.js
   Comportamiento común de la web del curso. Requiere curso-data.js antes.
   - Sesión: lee la cookie de Supabase, decodifica el JWT, refresca el token
     cuando caduca, expone nombre y nivel de acceso, logout único.
   - Progreso: tabla academy_progress en Supabase (REST) + caché en localStorage.
   - Página de clase (<body data-class="m3c1">): top bar, chips de secciones con
     scroll-spy, barra de lectura, eyebrow y meta del hero, numeración de
     secciones, nav inferior desde los datos, copiar, cuestionario, tabs,
     checklist y marcado de clase vista.
   - Home (<body data-page="home">): panel de alumno.
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CURSO;
  if (!C) { console.error('curso-data.js debe cargarse antes que curso.js'); return; }

  /* ── Configuración Supabase (mismos valores que login.html y middleware.js) ── */
  var REF = 'ndtoqnpomhtubcygkwlh';
  var SUPABASE_URL = 'https://' + REF + '.supabase.co';
  var ANON_KEY = 'sb_publishable_TWDLiIP8n-EwF8ULmqDm0w_9uv5nBsS';
  var COOKIE = 'sb-' + REF + '-auth-token';
  var COOKIE_DAYS = 7;

  /* ── utilidades ─────────────────────────────────────────────────────────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plural(n, s, p) { return n === 1 ? s : p; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ls(get, key, val) {
    try { if (get) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* ── sesión ─────────────────────────────────────────────────────────────── */
  function readCookie(name) {
    var m = document.cookie.split('; ').filter(function (r) { return r.indexOf(name + '=') === 0; })[0];
    if (!m) return null;
    try { return decodeURIComponent(m.slice(name.length + 1)); } catch (e) { return null; }
  }
  function session() {
    var raw = readCookie(COOKIE);
    if (!raw) return null;
    try { var s = JSON.parse(raw); return s && s.access_token ? s : null; } catch (e) { return null; }
  }
  function decodeJWT(token) {
    try { var p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p)))); }
    catch (e) { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e2) { return null; } }
  }
  function writeCookie(s) {
    var v = encodeURIComponent(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at }));
    document.cookie = COOKIE + '=' + v + ';path=/;max-age=' + (60 * 60 * 24 * COOKIE_DAYS) + ';SameSite=Lax';
  }
  var refreshing = null;
  /* Devuelve una sesión válida; si el access_token caduca en < 5 min, lo refresca y reescribe la cookie */
  function ensureSession() {
    var s = session();
    if (!s) return Promise.resolve(null);
    var now = Math.floor(Date.now() / 1000);
    var exp = s.expires_at || (decodeJWT(s.access_token) || {}).exp || 0;
    if (exp - now > 300 || !s.refresh_token) return Promise.resolve(s);
    if (refreshing) return refreshing;
    refreshing = fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      refreshing = null;
      if (j && j.access_token) { writeCookie(j); return j; }
      return s;
    }).catch(function () { refreshing = null; return s; });
    return refreshing;
  }
  function nameFromEmail(email) {
    var local = String(email || '').split('@')[0];
    var first = local.split(/[._-]/)[0] || 'alumno';
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  function user() {
    var s = session();
    var p = s ? decodeJWT(s.access_token) : null;
    var level = C.levelFromPayload(p);
    /* vista previa estática en local sin sesión: la barrera real la impone middleware.js */
    if (p === null && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) level = 'completo';
    return {
      sub: p && p.sub ? p.sub : 'anon',
      email: p && p.email ? p.email : '',
      name: p && p.email ? nameFromEmail(p.email) : 'alumno',
      level: level,
      payload: p
    };
  }
  function logout(ev) {
    if (ev) ev.preventDefault();
    document.cookie = COOKIE + '=;path=/;max-age=0';
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sb-') === 0) localStorage.removeItem(k); }); } catch (e) {}
    window.location.href = '/login.html';
  }

  /* ── progreso (Supabase REST + caché local) ─────────────────────────────── */
  var TABLE = 'academy_progress';
  var Progress = {
    sub: 'anon', seen: {}, scores: {}, synced: false, listeners: [],
    key: function () { return 'academy.progress.v1:' + this.sub; },
    init: function (sub) {
      this.sub = sub || 'anon';
      try { var c = JSON.parse(ls(true, this.key()) || 'null'); if (c) { this.seen = c.seen || {}; this.scores = c.scores || {}; } } catch (e) {}
    },
    save: function () { ls(false, this.key(), JSON.stringify({ seen: this.seen, scores: this.scores })); this.listeners.forEach(function (f) { f(); }); },
    onChange: function (f) { this.listeners.push(f); },
    isSeen: function (id) { return !!this.seen[id]; },
    headers: function (s) { return { apikey: ANON_KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }; },
    /* Descarga el progreso del alumno y lo fusiona con la caché (gana lo más reciente / lo visto) */
    sync: function () {
      var self = this;
      return ensureSession().then(function (s) {
        if (!s || self.sub === 'anon') return false;
        return fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?select=class_id,seen_at,score,score_total&user_id=eq.' + encodeURIComponent(self.sub), { headers: self.headers(s) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (rows) {
            if (!rows) return false;
            var changed = false;
            rows.forEach(function (r) {
              if (r.seen_at && !self.seen[r.class_id]) { self.seen[r.class_id] = r.seen_at; changed = true; }
              if (r.score != null) {
                var cur = self.scores[r.class_id];
                if (!cur || r.score > cur.score) { self.scores[r.class_id] = { score: r.score, total: r.score_total }; changed = true; }
              }
            });
            self.synced = true;
            /* sube lo que solo existía en local */
            var pending = Object.keys(self.seen).filter(function (id) { return !rows.some(function (r) { return r.class_id === id && r.seen_at; }); });
            if (pending.length) self.push(pending.map(function (id) { return self.row(id); }));
            if (changed) self.save();
            return true;
          }).catch(function () { return false; });
      });
    },
    row: function (id) {
      var sc = this.scores[id] || {};
      return { user_id: this.sub, class_id: id, seen_at: this.seen[id] || null, score: sc.score != null ? sc.score : null, score_total: sc.total != null ? sc.total : null };
    },
    push: function (rows) {
      var self = this;
      return ensureSession().then(function (s) {
        if (!s || self.sub === 'anon') return false;
        var h = self.headers(s); h.Prefer = 'resolution=merge-duplicates,return=minimal';
        return fetch(SUPABASE_URL + '/rest/v1/' + TABLE, { method: 'POST', headers: h, body: JSON.stringify(rows), keepalive: true })
          .then(function (r) { return r.ok; }).catch(function () { return false; });
      });
    },
    markSeen: function (id) {
      if (this.seen[id]) return;
      this.seen[id] = new Date().toISOString();
      this.save();
      this.push([this.row(id)]);
    },
    unmarkSeen: function (id) {
      if (!this.seen[id]) return;
      delete this.seen[id];
      this.save();
      var self = this;
      ensureSession().then(function (s) {
        if (!s || self.sub === 'anon') return;
        var h = self.headers(s); h.Prefer = 'return=minimal';
        fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?user_id=eq.' + encodeURIComponent(self.sub) + '&class_id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: h, body: JSON.stringify({ seen_at: null }) }).catch(function () {});
      });
    },
    saveScore: function (id, score, total) {
      var cur = this.scores[id];
      if (!cur || score > cur.score) { this.scores[id] = { score: score, total: total }; this.save(); this.push([this.row(id)]); }
    },
    /* Primera clase no vista en orden de temario, dentro del nivel */
    nextClass: function (level) {
      var list = C.orderedClasses(level);
      for (var i = 0; i < list.length; i++) if (!this.seen[list[i].id]) return list[i];
      return null;
    }
  };

  /* ── copiar al portapapeles ─────────────────────────────────────────────── */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); res(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }
  function textToCopy(btn) {
    var src = btn.getAttribute('data-copy-source');
    var node = src ? $(src) : (btn.closest('.code') ? $('pre', btn.closest('.code')) : null);
    if (!node) node = btn.closest('.formula') ? $('.example pre', btn.closest('.formula')) : null;
    if (!node) return '';
    var text = node.innerText != null ? node.innerText : node.textContent;
    var mode = btn.getAttribute('data-copy-mode') || '';
    if (mode.indexOf('strip-chevron') !== -1) text = text.replace(/^>\s?/gm, '');
    if (mode.indexOf('csv-tabs') !== -1) text = text.replace(/;/g, '\t');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }
  function wireCopy(root) {
    $$('[data-copy]', root).forEach(function (btn) {
      if (btn.__wired) return; btn.__wired = true;
      btn.addEventListener('click', function () {
        var old = btn.textContent;
        copyText(textToCopy(btn)).then(function () { btn.textContent = '[✓] Copiado'; }, function () { btn.textContent = '[ ! ] No se pudo copiar'; });
        setTimeout(function () { btn.textContent = old; }, 2000);
      });
    });
  }

  /* ── cuestionario largo ─────────────────────────────────────────────────── */
  /* data: [{ q:'…', opts:['…'], a:0, why:'…' }] · container: .quiz[data-quiz="nombreDeVariable"] */
  function renderQuiz(container, data, classId) {
    var title = container.getAttribute('data-title') || 'Test de conocimientos';
    var intro = container.getAttribute('data-intro') || ('Responde a las ' + data.length + ' preguntas y valida al final. La correcta se revela al validar.');
    var state = { picks: data.map(function () { return null; }), done: false };
    function render() {
      var html = '<span class="k">[ ' + esc(title) + ' · ' + data.length + ' ' + plural(data.length, 'pregunta', 'preguntas') + ' ]</span><p class="intro">' + esc(intro) + '</p>';
      data.forEach(function (item, qi) {
        html += '<div class="q" data-q="' + qi + '"><div class="qn"><span class="n">' + pad2(qi + 1) + '</span><p>' + esc(item.q) + '</p></div><div class="opts">';
        item.opts.forEach(function (o, oi) {
          var cls = 'opt', mark = '[ ]', pressed = state.picks[qi] === oi;
          if (state.done) {
            if (oi === item.a) { cls += ' correct'; mark = '[✓]'; }
            else if (pressed) { cls += ' wrong'; mark = '[×]'; }
          } else if (pressed) { mark = '[·]'; }
          html += '<button type="button" class="' + cls + '" data-q="' + qi + '" data-o="' + oi + '" aria-pressed="' + (pressed && !state.done) + '"' + (state.done ? ' disabled' : '') + '><span class="m" aria-hidden="true">' + mark + '</span><span>' + esc(o) + '</span></button>';
        });
        html += '</div>';
        if (state.done && item.why) html += '<p class="why">' + (state.picks[qi] === item.a ? '[Correcto.] ' : '') + esc(item.why) + '</p>';
        html += '</div>';
      });
      if (!state.done) {
        html += '<div class="actions"><button type="button" class="btn-ink" data-validate>Validar respuestas <span aria-hidden="true">→</span></button><span class="msg" data-msg></span></div>';
      } else {
        var ok = data.filter(function (it, i) { return state.picks[i] === it.a; }).length;
        var pct = Math.round(ok / data.length * 100);
        var msg = pct === 100 ? 'Perfecto. Dominas los conceptos de esta clase.' : pct >= 70 ? 'Bien. Repasa las preguntas marcadas con [×] antes de seguir.' : pct >= 40 ? 'Vas por buen camino. Conviene releer las secciones de las preguntas falladas.' : 'Vuelve a leer la clase con calma y repite el test.';
        html += '<div class="result"><span class="score">' + ok + ' <small>/ ' + data.length + '</small></span><p>' + esc(msg) + '</p><button type="button" class="btn-ghost" data-retry>Reintentar <span aria-hidden="true">→</span></button></div>';
        if (classId) Progress.saveScore(classId, ok, data.length);
      }
      container.innerHTML = html;
    }
    container.addEventListener('click', function (e) {
      var opt = e.target.closest('.opt');
      if (opt && !state.done) { state.picks[+opt.dataset.q] = +opt.dataset.o; render(); return; }
      if (e.target.closest('[data-validate]')) {
        var missing = state.picks.filter(function (p) { return p === null; }).length;
        if (missing) { $('[data-msg]', container).textContent = '[ ! ] Te ' + plural(missing, 'falta', 'faltan') + ' ' + missing + ' ' + plural(missing, 'pregunta', 'preguntas') + ' por responder.'; return; }
        state.done = true; render();
        var first = $('.result', container); if (first) first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      if (e.target.closest('[data-retry]')) { state = { picks: data.map(function () { return null; }), done: false }; render(); container.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
    });
    render();
  }
  function wireQuizzes(classId) {
    $$('.quiz[data-quiz]').forEach(function (q) {
      var name = q.getAttribute('data-quiz');
      var data = window[name];
      /* const/let globales no cuelgan de window: se resuelven por el registro léxico global */
      if (!data) { try { data = Function('return typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined')(); } catch (e) { data = null; } }
      if (!Array.isArray(data)) { console.warn('quiz sin datos:', name); return; }
      renderQuiz(q, data, classId);
    });
  }

  /* ── tabs ───────────────────────────────────────────────────────────────── */
  function wireTabs() {
    $$('.tabs').forEach(function (t) {
      var tabs = $$('[role=tab]', t), panels = $$('[role=tabpanel]', t);
      function show(i) {
        tabs.forEach(function (b, j) { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
        panels.forEach(function (p, j) { p.hidden = i !== j; });
      }
      tabs.forEach(function (b, i) {
        b.addEventListener('click', function () { show(i); });
        b.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return; e.preventDefault(); var n = (i + d + tabs.length) % tabs.length; show(n); tabs[n].focus();
        });
      });
      show(Math.max(0, tabs.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true'; })));
    });
  }

  /* ── despiece ────────────────────────────────────────────────────────────
     La pieza se queda quieta y el texto la va anotando. Cada .dp-step lleva
     data-capa="n"; dentro de .dp-media se encienden los .dp-capa[data-capa]
     que coinciden. Es scroll, no animación: con prefers-reduced-motion el
     contenido sigue entero, solo desaparecen las transiciones. Un paso puede
     traer data-cap="…" para reescribir el pie de la pieza. */
  function wireDespiece(root) {
    $$('[data-despiece]', root || document).forEach(function (dp) {
      var steps = $$('.dp-step[data-capa]', dp);
      if (!steps.length) return;
      var media = $('.dp-media', dp) || dp;
      var capas = $$('.dp-capa[data-capa]', media);
      var btns = $$('.dp-nav button[data-go]', dp);
      var cap = $('.dp-cap', media);
      var capBase = cap ? cap.textContent : '';
      var orden = {};
      steps.forEach(function (s, i) { orden[s.getAttribute('data-capa')] = i; });
      var frags = $$('.dp-tira .frag[data-capa]', dp);
      var cuenta = $('[data-dp-cuenta]', dp);
      var actual = null;
      function activar(step) {
        if (!step || step === actual) return;
        actual = step;
        var key = step.getAttribute('data-capa');
        capas.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-capa') === key); });
        steps.forEach(function (s) { s.classList.toggle('on', s === step); });
        btns.forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-go') === key)); });
        var n = orden[key];
        frags.forEach(function (f) { f.classList.toggle('on', orden[f.getAttribute('data-capa')] <= n); });
        if (cuenta) cuenta.textContent = String(n + 1);
        if (cap) cap.textContent = step.getAttribute('data-cap') || capBase;
      }
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var t = steps.filter(function (s) { return s.getAttribute('data-capa') === b.getAttribute('data-go'); })[0];
          if (!t) return;
          window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3, behavior: reduced ? 'auto' : 'smooth' });
        });
      });
      activar(steps[0]);
      if (!window.IntersectionObserver) return;
      var vistos = [];
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var i = steps.indexOf(e.target), at = vistos.indexOf(i);
          if (e.isIntersecting && at < 0) vistos.push(i);
          if (!e.isIntersecting && at >= 0) vistos.splice(at, 1);
        });
        if (vistos.length) activar(steps[Math.min.apply(Math, vistos)]);
      }, { rootMargin: '-40% 0px -45% 0px' });
      steps.forEach(function (s) { obs.observe(s); });
    });
  }

  /* ── checklist persistente ──────────────────────────────────────────────── */
  function wireChecklists(sub, classId) {
    $$('.checklist input[type=checkbox]').forEach(function (cb, i) {
      var key = 'academy.check:' + sub + ':' + classId + ':' + (cb.id || i);
      cb.checked = ls(true, key) === '1';
      cb.addEventListener('change', function () { ls(false, key, cb.checked ? '1' : '0'); });
    });
  }

  /* ── página de clase ────────────────────────────────────────────────────── */
  function initClass(classId) {
    var cls = C.classById(classId);
    if (!cls) { console.error('Clase desconocida en curso-data.js:', classId); return; }
    var u = user();
    Progress.init(u.sub);
    var mod = cls.module;
    if (!C.canAccess(u.level, mod.id)) { window.location.replace('/index.html#' + mod.id); return; }
    var pn = C.prevNext(cls.id, u.level);
    var single = cls.kind === 'módulo completo';

    /* título del documento */
    document.title = (single ? 'M' + mod.num : 'M' + mod.num + ' · Clase ' + cls.num) + ' — ' + cls.short + ' · [m].seny /academy';

    /* secciones: numeración antes de construir los chips de la cabecera */
    var secs = $$('.sec[id]');
    var n = 0;
    secs.forEach(function (s) {
      var numEl = $('.sec-num', s);
      if (s.getAttribute('data-num') === 'none') { if (numEl) numEl.remove(); return; }
      n += 1;
      if (numEl) numEl.textContent = pad2(n);
      s.setAttribute('data-n', pad2(n));
    });

    /* cabecera única: logotipo + chips de secciones + navegación, sticky */
    var chips = secs.filter(function (s) { return s.getAttribute('data-toc') !== 'none'; }).map(function (s) {
      var label = s.getAttribute('data-label') || ($('h2', s) ? $('h2', s).textContent.replace(/\.$/, '') : s.id);
      var num = s.getAttribute('data-n');
      return '<a href="#' + s.id + '">' + (num ? num + ' ' : '') + esc(label) + '</a>';
    }).join('');
    var top = el(
      '<header class="topbar"><div class="read" aria-hidden="true"><i></i></div>' +
      '<span class="tb-l"><a class="wm" href="/index.html#' + mod.id + '"><span><b>[m]</b>.seny</span><span class="sub">/academy</span></a>' +
      '<span class="tb-meta">' + (single ? 'Módulo ' + mod.num : 'M' + mod.num + ' · Clase ' + cls.num) + '</span></span>' +
      '<nav class="tb-c" aria-label="Secciones de la clase">' + chips + '</nav>' +
      '<nav class="tb-r"><a href="/index.html#' + mod.id + '">Temario</a><a href="/login.html" data-logout>Salir</a></nav></header>'
    );
    document.body.insertBefore(top, document.body.firstChild);
    var toc = $('.tb-c', top);
    var readBar = $('.read i', top);

    /* la cabecera ya no mide una altura fija: se publica como variable CSS */
    var headerH = 64;
    function measureHeader() {
      headerH = top.offsetHeight || headerH;
      document.documentElement.style.setProperty('--header-h', headerH + 'px');
    }
    measureHeader();
    window.addEventListener('resize', measureHeader);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);

    toc.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      var target = $(a.getAttribute('href'));
      if (target) { window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - (headerH + 12), behavior: reduced ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); }
    });

    /* hero */
    var hero = $('.hero');
    if (hero) {
      if (!$('.eyebrow', hero)) hero.insertBefore(el('<p class="eyebrow brackets-ink"> ' + (single ? 'Módulo ' + mod.num + ' · ' + esc(cls.kind) : 'Módulo ' + mod.num + ' · Clase ' + cls.num) + ' </p>'), hero.firstChild);
      if (!$('.meta', hero)) {
        var parts = [];
        if (cls.duration) parts.push(esc(cls.duration));
        if (cls.topic) parts.push(esc(cls.topic));
        hero.appendChild(el('<p class="meta">' + parts.map(function (p) { return '<span>' + p + '</span>'; }).join('<span aria-hidden="true">·</span>') + '</p>'));
      }
    }

    /* nav inferior + pie */
    var main = $('main') || document.body;
    var pos = single ? 'Módulo ' + mod.num + ' · ' + cls.total + ' ' + plural(cls.total, 'clase', 'clases') : 'Clase ' + cls.num + ' de ' + cls.total;
    var prevHtml = pn.prev ? '<a class="btn-ghost" href="' + pn.prev.file + '" data-nav-prev>← ' + esc(pn.prev.module.id === mod.id ? 'Clase anterior' : 'Módulo anterior') + '</a>' : '<a class="btn-ghost" href="/index.html#' + mod.id + '">← Volver al temario</a>';
    var nextHtml = pn.next ? '<a class="btn-accent" href="' + pn.next.file + '" data-nav-next>' + esc(pn.next.module.id === mod.id ? 'Siguiente clase' : 'Siguiente: M' + pn.next.module.num) + ' <span aria-hidden="true">→</span></a>' : '<a class="btn-accent" href="/index.html#' + mod.id + '">Volver al temario <span aria-hidden="true">→</span></a>';
    var nav = el('<nav class="navfoot" aria-label="Navegación entre clases"><div class="row">' + prevHtml + '<span class="pos">' + esc(pos) + '</span>' + nextHtml + '</div><div class="seen"><button type="button" data-seen aria-pressed="false">[ ] Marcar como vista</button></div></nav>');
    main.appendChild(nav);
    main.appendChild(el('<p class="footline">[m].seny /academy · Material de apoyo formativo · © ' + new Date().getFullYear() + '</p>'));

    /* clase vista */
    var seenBtn = $('[data-seen]', nav);
    function paintSeen() {
      var s = Progress.isSeen(cls.id);
      seenBtn.setAttribute('aria-pressed', String(s));
      seenBtn.textContent = s ? '[✓] Clase vista' : '[ ] Marcar como vista';
    }
    seenBtn.addEventListener('click', function () { Progress.isSeen(cls.id) ? Progress.unmarkSeen(cls.id) : Progress.markSeen(cls.id); paintSeen(); });
    Progress.onChange(paintSeen);
    paintSeen();
    var t0 = Date.now(), deep = false;
    $$('[data-nav-next],[data-nav-prev]', nav).forEach(function (a) { a.addEventListener('click', function () { Progress.markSeen(cls.id); }); });

    /* scroll: spy + lectura + vista automática (≥90 % y ≥30 s) */
    var links = $$('a', toc);
    function onScroll() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pr = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      readBar.style.width = (pr * 100) + '%';
      var active = -1;
      secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < headerH + 80) active = i; });
      var activeId = active >= 0 ? secs[active].id : null;
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + activeId; a.classList.toggle('active', on); if (on && a.scrollIntoView && toc.scrollWidth > toc.clientWidth) a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' }); });
      if (pr >= 0.9 && !deep) { deep = true; }
      if (deep && Date.now() - t0 >= 30000 && !Progress.isSeen(cls.id)) { Progress.markSeen(cls.id); paintSeen(); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(onScroll, 0);
    setInterval(function () { if (deep) onScroll(); }, 5000);

    /* widgets */
    wireCopy(document);
    wireQuizzes(cls.id);
    wireTabs();
    wireDespiece(document);
    wireChecklists(u.sub, cls.id);
    $$('[data-logout]').forEach(function (a) { a.addEventListener('click', logout); });

    Progress.sync();
  }

  /* ── home ───────────────────────────────────────────────────────────────── */
  var MARK = { done: '[✓]', current: '→', pending: '[ ]', locked: '[ – ]', viewed: '[✓]', next: '→' };
  /* La fila de clase usa su propio juego: el chip lleva ya la flecha, así que la
     siguiente se marca con [·] y no se repiten dos → en la misma fila. */
  var ROWMARK = { viewed: '[✓]', next: '[·]', pending: '[ ]', locked: '[ – ]' };
  var TOOLS_MAX = 12;   /* pills visibles antes de cortar con «+N más» */
  function initHome() {
    var u = user();
    Progress.init(u.sub);
    var levelLabel = (C.levels[u.level] || {}).label || '';
    $('#alumno').textContent = u.name;
    var lv = $('#rail .level'); if (lv) lv.textContent = levelLabel ? 'Acceso · ' + levelLabel : '';

    function model() {
      var mods = C.visibleModules().filter(function (m) { return C.inLevel(u.level, m.id); });
      var accessible = function (m) { return C.canAccess(u.level, m.id); };
      var classes = C.orderedClasses(u.level);
      var next = Progress.nextClass(u.level);
      var done = classes.filter(function (c) { return Progress.isSeen(c.id); }).length;
      var out = mods.map(function (m) {
        var total = m.classes.length, seen = m.classes.filter(function (c) { return Progress.isSeen(c.id); }).length;
        var state = !accessible(m) ? 'locked' : (total && seen === total) ? 'done' : (next && next.module.id === m.id) ? 'current' : 'pending';
        var rows = m.classes.map(function (c) {
          var st = state === 'locked' ? 'locked' : Progress.isSeen(c.id) ? 'viewed' : (next && next.id === c.id) ? 'next' : 'pending';
          var o = {}; for (var k in c) o[k] = c[k]; o.st = st; return o;
        });
        var o = {}; for (var k in m) o[k] = m[k];
        o.quote = m.quote; o.quoteSrc = m.quoteSrc; o.total = total; o.seen = seen; o.state = state; o.pct = total ? Math.round(seen / total * 100) : 0; o.rows = rows; o.tools = C.toolsOf(m);
        return o;
      });
      return { mods: out, classes: classes, next: next, done: done, total: classes.length, pct: classes.length ? Math.round(done / classes.length * 100) : 0 };
    }
    function modMeta(m) {
      if (m.state === 'done') return m.total + ' ' + plural(m.total, 'clase', 'clases') + ' · Completado [✓]';
      if (m.state === 'locked') return m.total + ' ' + plural(m.total, 'clase', 'clases') + ' · Se abre al final del curso [ – ]';
      return (m.state === 'current' ? 'En curso · ' : '') + m.total + ' ' + plural(m.total, 'clase', 'clases') + (m.seen ? ' · ' + m.seen + '/' + m.total : '');
    }
    function rowHtml(c) {
      var meta = c.st === 'locked' ? 'Bloqueada' : [c.kind, c.duration].filter(Boolean).join(' · ');
      var inner =
        '<span class="idx" aria-hidden="true"><span class="mark">' + ROWMARK[c.st] + '</span><span class="num">C' + c.num + '</span></span>' +
        '<span class="body"><span class="name">' + esc(c.short) + (c.st === 'next' ? '<span class="pill">En curso</span>' : '') + '</span>' +
        '<span class="meta">' + esc(meta) + '</span></span>' +
        '<span class="go" aria-hidden="true">' + (c.st === 'locked' ? '–' : '→') + '</span>';
      if (c.st === 'locked') return '<li><span class="clase locked" aria-disabled="true">' + inner + '</span></li>';
      return '<li><a class="clase ' + c.st + '" href="' + c.file + '" aria-label="Clase ' + c.num + ': ' + esc(c.short) +
        (c.st === 'viewed' ? ' (vista)' : '') + '"' + (c.st === 'next' ? ' aria-current="true"' : '') + '>' + inner + '</a></li>';
    }
    /* Frase clave del módulo: le da carácter sin sumar ruido. */
    function quoteHtml(m) {
      if (!m.quote) return '';
      return '<blockquote class="mod-quote"><p>' + esc(m.quote) + '</p>' + (m.quoteSrc ? '<cite>' + esc(m.quoteSrc) + '</cite>' : '') + '</blockquote>';
    }
    /* Colofón: las herramientas del módulo como pills, con la caja original del
       nombre de producto («bge-m3», «claude.ai»). Nunca son clicables. */
    function toolsHtml(m) {
      var t = m.tools || [];
      if (!t.length) return '';
      var shown = t.length > TOOLS_MAX ? t.slice(0, TOOLS_MAX) : t;
      var rest = t.length - shown.length;
      return '<div class="mod-tools"><p class="k">[ Herramientas ]</p><ul class="pills">' +
        shown.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
        (rest ? '<li class="more">+' + rest + ' más</li>' : '') + '</ul></div>';
    }
    function render() {
      var M = model();
      $('#prog-n').textContent = M.done;
      $('#prog-total').textContent = M.total;
      $('#prog-fill').style.width = M.pct + '%';
      $('#prog-pct').textContent = M.pct + '% DEL CURSO PUBLICADO';
      $('#rail-nav').innerHTML = M.mods.map(function (m) {
        return '<a href="#' + m.id + '" class="' + m.state + '" data-open="' + m.id + '"><span aria-hidden="true">' + MARK[m.state] + '</span><span>M' + m.num + ' · ' + esc(m.short) + '</span><span class="c">' + ((m.state === 'pending' || m.state === 'current') && m.seen ? m.seen + '/' + m.total : '') + '</span></a>';
      }).join('');

      var cont = $('#continue'), nx = M.next;
      if (nx) {
        var left = nx.module.classes.filter(function (c) { return !Progress.isSeen(c.id); }).length;
        $('#headline').textContent = M.done ? 'Sigue donde lo dejaste.' : 'Empieza por el principio.';
        $('#cont-k').textContent = (nx.kind === 'módulo completo' ? 'M' + nx.module.num : 'M' + nx.module.num + ' · Clase ' + nx.num) + ' — ' + (M.done ? 'En curso' : 'Primera clase');
        $('#cont-title').textContent = nx.short;
        $('#cont-sub').textContent = left > 1 ? 'Te quedan ' + left + ' clases de este módulo.' : 'Última clase de este módulo.';
        $('#cont-cta').innerHTML = (M.done ? 'Continuar' : 'Empezar') + ' <span aria-hidden="true">→</span>';
        $('#cont-cta').href = nx.file;
        cont.classList.remove('all-done');
      } else {
        $('#headline').textContent = 'Has completado el curso.';
        $('#cont-k').textContent = M.total + ' / ' + M.total + ' · Completado [✓]';
        $('#cont-title').textContent = 'Has visto las ' + M.total + ' clases.';
        $('#cont-sub').textContent = 'Puedes repasar cualquier clase desde el temario.';
        $('#cont-cta').innerHTML = 'Repasar desde el principio <span aria-hidden="true">→</span>';
        $('#cont-cta').href = M.classes[0] ? M.classes[0].file : '#';
        cont.classList.add('all-done');
      }
      $('#temario-count').textContent = M.mods.length + ' ' + plural(M.mods.length, 'módulo', 'módulos') + ' · ' + M.total + ' ' + plural(M.total, 'clase', 'clases');

      var openIds = {};
      $$('details.mod[open]').forEach(function (d) { openIds[d.dataset.mod] = 1; });
      var first = !$('details.mod');
      var hashMod = (location.hash || '').slice(1);
      /* Orden del panel: descripción -> frase clave -> (banda) -> clases -> herramientas.
         Todos los módulos se abren igual, sea cual sea su estado o tu nivel de acceso. */
      $('#mods').innerHTML = M.mods.map(function (m) {
        var open = first ? (hashMod ? m.id === hashMod : m.state === 'current') : !!openIds[m.id];
        var body = m.total ? '<ol class="clases">' + m.rows.map(rowHtml).join('') + '</ol>' : '<p class="empty">Este módulo aún no tiene clases publicadas.</p>';
        var band = m.state === 'locked' ? '<p class="band">[ ! ] Este módulo se abre al final del curso, cuando el resto esté completado.</p>' : '';
        var panel = '<div class="mod-panel">' + (m.desc ? '<p class="mod-desc">' + esc(m.desc) + '</p>' : '') + quoteHtml(m) + band + body + toolsHtml(m) + '</div>';
        return '<details class="mod ' + m.state + '" id="' + m.id + '" data-mod="' + m.id + '"' + (open ? ' open' : '') + '>' +
          '<summary class="mod-head"><span class="mod-num"><span class="g" aria-hidden="true">' + MARK[m.state] + '</span><span>M' + m.num + '</span></span>' +
          '<span class="mod-body"><h3 class="mod-title">' + esc(m.title) + '</h3><p class="mod-meta">' + esc(modMeta(m)) + '</p></span>' +
          '<span class="mod-bar" aria-hidden="true"><i style="width:' + m.pct + '%"></i></span>' +
          '<span class="mod-toggle" aria-hidden="true">+</span></summary>' + panel + '</details>';
      }).join('');
    }
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-open]');
      if (nav) { e.preventDefault(); var d = document.getElementById(nav.dataset.open); if (d) { d.open = true; history.replaceState(null, '', '#' + nav.dataset.open); d.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); } }
    });
    $$('[data-logout]').forEach(function (a) { a.addEventListener('click', logout); });
    Progress.onChange(render);
    render();
    if (location.hash) { var d0 = document.getElementById(location.hash.slice(1)); if (d0) d0.scrollIntoView({ block: 'start' }); }
    Progress.sync().then(function (ok) { if (ok) render(); });
  }

  /* ── arranque ───────────────────────────────────────────────────────────── */
  window.Academy = { user: user, session: session, ensureSession: ensureSession, logout: logout, Progress: Progress, copyText: copyText, renderQuiz: renderQuiz };
  function boot() {
    var b = document.body;
    if (b.dataset.class) initClass(b.dataset.class);
    else if (b.dataset.page === 'home') initHome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
