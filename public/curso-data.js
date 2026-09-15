/* ============================================================================
   [m].seny /academy — curso-data.js
   FUENTE DE VERDAD ÚNICA de la estructura del curso: módulos, clases, niveles
   de acceso y helpers puros. La cargan index.html, las páginas de clase
   (window.CURSO) y middleware.js (import). Aquí NO vive contenido lectivo.

   Cómo añadir una clase: añade el objeto en `classes` del módulo, en orden.
   Cómo publicar un módulo vacío: rellena `classes` (visible = tiene clases).
   Cómo cambiar qué ve cada nivel: edita `levels`.
   ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CURSO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var modules = [
    {
      id: 'm1', num: 1, title: 'El Paisaje de los LLMs', short: 'LLMs',
      quote: '«Ya no programamos las reglas; le damos al ordenador los datos y dejamos que él mismo aprenda las reglas.»', quoteSrc: 'M1 · El nuevo paradigma',
      desc: 'Una inmersión comparativa en los principales modelos de lenguaje. No se trata de usar todos, sino de saber cuál usar para cada tarea específica (codificación, análisis, creatividad).',
      classes: [
        { id: 'm1c1', file: 'modulo1.html', num: 1, kind: 'módulo completo', duration: '1,5–2 h', topic: 'Estrategia de modelos',
          title: 'El Paisaje de los LLMs', short: 'El Paisaje de los LLMs',
          tools: ['Claude', 'Gemini', 'ChatGPT', 'Grok', 'Perplexity'] }
      ]
    },
    {
      id: 'm2', num: 2, title: 'Glosario y Fundamentos', short: 'Fundamentos',
      quote: '«En 2026, el analfabetismo técnico en Inteligencia Artificial ya no es solo una barrera para la productividad; es una vulnerabilidad de ciberseguridad corporativa.»', quoteSrc: 'M2 · Desmitificando la caja negra',
      desc: 'Fundamentos esenciales para comunicarse con equipos técnicos y entender las limitaciones reales de la tecnología (alucinaciones, tokens, ventana de contexto).',
      classes: [
        { id: 'm2c1', file: 'modulo2.html', num: 1, kind: 'módulo completo', duration: '1,5 h', topic: 'Glosario ejecutivo',
          title: 'Glosario y Fundamentos', short: 'Glosario y Fundamentos',
          tools: ['Perplexity', 'Gemini', 'Gems', 'NotebookLM', 'Google AI Studio', 'ChatGPT'] }
      ]
    },
    {
      id: 'm3', num: 3, title: 'Estudio Creativo IA (Imagen)', short: 'Imagen',
      quote: '«En la era visual, el texto informa, pero la imagen convierte.»', quoteSrc: 'M3 · C1 — Los titanes del píxel',
      desc: 'Creación de activos visuales profesionales para marketing, prototipado de productos y contenido social sin necesidad de un departamento de diseño externo.',
      classes: [
        { id: 'm3c1', file: 'modulo3-clase1.html', num: 1, kind: 'teórica', duration: '1 h', topic: 'Fotografía y mockups',
          title: 'Estudio creativo IA: los titanes del píxel', short: 'Los titanes del píxel',
          tools: ['Gemini Nano Banana 2', 'ChatGPT Images 2.0', 'Mixboard'] },
        { id: 'm3c2', file: 'modulo3-clase2.html', num: 2, kind: 'teórica', duration: '1 h', topic: 'Flujo de trabajo avanzado',
          title: 'Estudio creativo IA: composición y tiempo real', short: 'Composición y tiempo real',
          tools: ['Krea AI', 'Pomelli', 'Genspark', 'Higgsfield'] },
        { id: 'm3c3', file: 'modulo3-clase3.html', num: 3, kind: 'práctica', duration: 'Teoría 45 min · Práctica 60 min', topic: 'Suite de edición',
          title: 'Magnific AI: el ecosistema total', short: 'Magnific AI: el ecosistema total',
          tools: ['Magnific AI', 'Freepik'] }
      ]
    },
    {
      id: 'm4', num: 4, title: 'Estudio Creativo IA (Automatización)', short: 'Automatización',
      quote: '«La IA no falla por falta de talento, sino por falta de vocabulario.»', quoteSrc: 'M4 · C2 — El prompt como objetivo',
      desc: 'De generar una imagen a producir un catálogo: nodos encadenados que trabajan en lote y prompts de grado profesional que repiten el mismo resultado tantas veces como haga falta.',
      classes: [
        { id: 'm4c1', file: 'modulo4-clase1.html', num: 1, kind: 'práctica', duration: '45 min', topic: 'Procesamiento en lote',
          title: 'Freepik Spaces: la anatomía de los nodos', short: 'Freepik Spaces: la anatomía de los nodos',
          tools: ['Freepik Spaces', 'Magnific AI'] },
        { id: 'm4c2', file: 'modulo4-clase2.html', num: 2, kind: 'teórica', duration: '90 min', topic: 'Fotorrealismo y moda',
          title: 'El prompt como objetivo: fotografía profesional con IA', short: 'El prompt como objetivo',
          tools: ['PromptHero', 'Lexica', 'Civitai', 'PromptBase', 'Freepik / Pikaso', 'Midjourney Explore'] }
      ]
    },

    /* M5 — hueco libre. Cuando haya contenido, añade aquí el módulo con num: 5
       y sus clases; aparece en la web con solo rellenar `classes`. */

    {
      id: 'm6', num: 6, title: 'Claude suite', short: 'Claude suite',
      quote: '«La jerarquía de complejidad va desde una simple instrucción (Skill) hasta la conexión con aplicaciones externas (Connector).»', quoteSrc: 'M6 · C2 — Claude Cowork',
      desc: 'Claude como socio de trabajo: la app, Cowork y Claude Code. De la conversación suelta a un sistema con instrucciones, memoria y agentes que ejecutan.',
      classes: [
        { id: 'm6c1', file: 'modulo6-clase1.html', num: 1, kind: 'teórica', duration: 'Teoría 40 min · Práctica 50 min', topic: 'Claude como socio de trabajo',
          title: 'Claude: el asistente de IA como socio de trabajo', short: 'Claude: el asistente de IA como socio de trabajo',
          tools: ['claude.ai', 'Claude Cowork', 'Claude Code', 'Claude Design'] },
        { id: 'm6c2', file: 'modulo6-clase2.html', num: 2, kind: 'referencia', duration: '45 min', topic: 'Skills, agentes y hooks',
          title: 'Claude Cowork: guía de referencia', short: 'Claude Cowork: guía de referencia',
          tools: ['Claude Cowork'] },
        { id: 'm6c3', file: 'modulo6-clase3.html', num: 3, kind: 'práctica', duration: 'Teoría 30 min · Práctica 30 min', topic: 'Pipelines multi-agente',
          title: 'Orquestación avanzada: pipelines multi-agente', short: 'Orquestación avanzada: pipelines multi-agente',
          tools: ['Claude Code', 'Claude Cowork', 'MCP'] }
      ]
    },
    {
      id: 'm7', num: 7, title: 'Cerebros de IA', short: 'Cerebros IA',
      quote: '«El Vault guarda, el Vectorizador entiende y El Tejedor conecta.»', quoteSrc: 'M7 · C3 — El cerebro que se teje solo',
      desc: 'Tu conocimiento convertido en un cerebro consultable: ingesta local y privada a Obsidian, estructura para toda la empresa y búsqueda por significado que se enlaza sola.',
      classes: [
        { id: 'm7c1', file: 'modulo7-clase1.html', num: 1, kind: 'práctica', duration: '50 min', topic: 'Ingesta local a Obsidian',
          title: 'El cerebro local autónomo: ingesta segura a Obsidian', short: 'El cerebro local autónomo',
          tools: ['Obsidian', 'Claude Code', 'MarkItDown', 'Tesseract OCR', 'Python'] },
        { id: 'm7c2', file: 'modulo7-clase2.html', num: 2, kind: 'teórica', duration: '1 h 15 min', topic: 'Agentes, departamentos y plugins',
          title: 'El cerebro de empresa: agentes, departamentos y plugins', short: 'El cerebro de empresa',
          tools: ['Obsidian', 'Obsidian Sync', 'Git'] },
        { id: 'm7c3', file: 'modulo7-clase3.html', num: 3, kind: 'teórica', duration: '45 min', topic: 'Búsqueda semántica y auto-enlaces',
          title: 'El cerebro que se busca y se teje solo', short: 'El cerebro que se busca y se teje solo',
          tools: ['Obsidian', 'Claude Code', 'Smart Connections', 'Graphify', 'LanceDB', 'bge-m3'] }
      ]
    },
    {
      id: 'm8', num: 8, title: 'Desarrollo de software', short: 'Software',
      quote: '«El portal es la puerta bonita del cerebro: el panel lo muestra, el kanban lo mueve y la ingesta lo alimenta.»', quoteSrc: 'M8 · C1 — El portal de mando',
      desc: 'La puerta de entrada al cerebro: una web interna con paneles, tablero e ingesta de documentos que le encargas a Claude con el vocabulario correcto.',
      classes: [
        { id: 'm8c1', file: 'modulo8-clase1.html', num: 1, kind: 'teórica', duration: '1 h 20 min', topic: 'Tu software sobre el cerebro',
          title: 'Tu software propio: el portal de mando', short: 'Tu software propio: el portal de mando',
          tools: ['Claude', 'Claude Code', 'API de Claude', 'Next.js', 'Tailwind CSS', 'Obsidian'] }
      ]
    },
    {
      id: 'm9', num: 9, title: 'MVP Empresarial (PFC)', short: 'PFC Final', locked: true,
      quote: '«No es un dashboard. Es un sistema de razonamiento automatizado sobre datos de negocio.»', quoteSrc: 'M9 · C1 — AI Decision Hub',
      desc: 'Aplicación transversal. Simulación de lanzamiento de una línea de negocio: desde el naming y logo hasta la estrategia de go-to-market.',
      classes: [
        { id: 'm9c1', file: 'pfc-marketing.html', num: 1, kind: 'práctica', duration: '20 min', topic: 'Plan técnico y curricular',
          title: 'AI Decision Hub: plan técnico y curricular', short: 'AI Decision Hub: plan técnico y curricular',
          tools: ['FastAPI', 'LangChain', 'Next.js', 'Supabase', 'Claude', 'Gemini'] }
      ]
    }
  ];

  /* Niveles de acceso. El nivel del alumno viaja en el JWT de Supabase como
     user_metadata.access_level. Se edita en Supabase, en Authentication >
     Users > User Metadata.
     Nota: m9 lleva `locked: true`, así que hoy no entra nadie aunque figure en
     la lista de un nivel. */
  var levels = {
    completo:  { label: 'Acceso completo', modules: '*' },
    diseno:    { label: 'Diseño',    modules: ['m1', 'm2', 'm3', 'm4'] },
    marketing: { label: 'Marketing', modules: ['m1', 'm2', 'm6', 'm7', 'm8'] },
    /* Finanzas abre por goteo: hoy solo M1, y Marc va sumando módulos a esta
       lista a medida que avanza el curso. */
    finanzas:  { label: 'Finanzas',  modules: ['m1', 'm2'] },
    /* Red de seguridad, no un nivel que se reparta. Si a alguien se le olvida
       el access_level en Supabase, cae aquí y ve el mínimo, no el curso entero.
       Antes el defecto era 'completo' y un alta sin nivel regalaba todo. */
    sin_asignar: { label: 'Sin nivel asignado', modules: ['m1'] }
  };

  var DEFAULT_LEVEL = 'sin_asignar';

  /* ── helpers puros (sin DOM) ─────────────────────────────────────────── */
  function published(m) { return m.classes.length > 0; }
  function visibleModules() { return modules.filter(published); }
  function levelFromPayload(payload) {
    var meta = (payload && payload.user_metadata) || {};
    var lv = meta.access_level;
    if (lv && levels[lv]) return lv;
    return DEFAULT_LEVEL;
  }
  /* Dos preguntas distintas. `inLevel` decide si el módulo se le enseña al
     alumno: lo que queda fuera de su nivel no aparece en el temario, ni
     bloqueado ni de ninguna otra forma. `canAccess` decide si además puede
     abrirlo ahora, y es la que usa el middleware. Un módulo con `locked` sigue
     a la vista de quien lo tiene en su nivel, pero todavía no se abre. */
  function inLevel(level, moduleId) {
    var m = moduleById(moduleId);
    if (!m) return false;
    var lv = levels[level] || levels[DEFAULT_LEVEL];
    return lv.modules === '*' || lv.modules.indexOf(moduleId) !== -1;
  }
  function canAccess(level, moduleId) {
    var m = moduleById(moduleId);
    if (!m || m.locked) return false;
    return inLevel(level, moduleId);
  }
  function moduleById(id) { for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return modules[i]; return null; }
  function classById(id) {
    for (var i = 0; i < modules.length; i++) for (var j = 0; j < modules[i].classes.length; j++)
      if (modules[i].classes[j].id === id) return withModule(modules[i].classes[j], modules[i]);
    return null;
  }
  function classByFile(file) {
    var f = String(file || '').split('/').pop().split('?')[0].split('#')[0];
    for (var i = 0; i < modules.length; i++) for (var j = 0; j < modules[i].classes.length; j++)
      if (modules[i].classes[j].file === f) return withModule(modules[i].classes[j], modules[i]);
    return null;
  }
  function withModule(c, m) { var o = {}; for (var k in c) o[k] = c[k]; o.module = m; o.total = m.classes.length; return o; }
  /* Todas las clases accesibles para un nivel, en orden de temario */
  function orderedClasses(level) {
    var out = [];
    visibleModules().forEach(function (m) {
      if (!canAccess(level, m.id)) return;
      m.classes.forEach(function (c) { out.push(withModule(c, m)); });
    });
    return out;
  }
  /* Anterior / siguiente dentro de lo accesible (salta módulos sin acceso) */
  function prevNext(classId, level) {
    var list = orderedClasses(level), idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === classId) { idx = i; break; }
    return { prev: idx > 0 ? list[idx - 1] : null, next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null, index: idx, list: list };
  }
  /* Módulo al que pertenece un archivo protegido; null si el archivo no es una clase */
  function moduleOfFile(file) { var c = classByFile(file); return c ? c.module : null; }
  function toolsOf(m) {
    var seen = {}, out = [];
    m.classes.forEach(function (c) { (c.tools || []).forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } }); });
    return out;
  }

  return {
    modules: modules, levels: levels, DEFAULT_LEVEL: DEFAULT_LEVEL,
    published: published, visibleModules: visibleModules, levelFromPayload: levelFromPayload,
    inLevel: inLevel, canAccess: canAccess, moduleById: moduleById, classById: classById, classByFile: classByFile,
    orderedClasses: orderedClasses, prevNext: prevNext, moduleOfFile: moduleOfFile, toolsOf: toolsOf
  };
});
