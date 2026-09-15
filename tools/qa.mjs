#!/usr/bin/env node
/* ============================================================================
   tools/qa.mjs — QA final de la web del curso.
   Uso: node tools/qa.mjs
   Comprueba, sobre public/:
   - restos de la piel antigua (Tailwind, Font Awesome, alert, execCommand, fade-in, [labs]…);
   - que cada clase de curso-data.js existe como archivo y cada página de clase tiene
     <body data-class> con un id que existe en curso-data.js;
   - estructura mínima de cada clase: un <h1>, <main>, .hero, .content, secciones .sec[id],
     scripts curso-data.js y curso.js, ningún header/footer/nav propio, ningún <link> a CDN;
   - enlaces y recursos internos (href/src que empiezan por / o son relativos) apuntan a
     archivos existentes en public/;
   - quiz: si hay .quiz[data-quiz] existe el array del mismo nombre;
   - la sección práctica (última) lleva sec-dark salvo excepciones declaradas.
   Sale con código 1 si hay errores.
   ========================================================================== */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PUB = join(ROOT, 'public');
const CURSO = require(join(PUB, 'curso-data.js'));
const NO_DARK = new Set(['m6c2', 'm9c1']); // sin sección práctica

const errors = [], warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);

const LEFTOVERS = /tailwindcss|font-awesome|fa-solid|fa-regular|fa-brands|\balert\(|execCommand|fade-in-on-scroll|\[labs\]|hidden md:flex|hidden lg:flex|text-brand|bg-brand|rounded-(?:lg|xl|2xl|full)\b|class="w-|cdn\.jsdelivr\.net\/npm\/chart|marked\.min\.js|fonts\.googleapis/i;

const htmlFiles = readdirSync(PUB).filter(f => f.endsWith('.html'));
const classFiles = new Map(CURSO.modules.flatMap(m => m.classes.map(c => [c.file, c.id])));

for (const [file, id] of classFiles) if (!existsSync(join(PUB, file))) err(file, `declarada en curso-data.js (${id}) pero no existe`);

for (const file of htmlFiles) {
  const html = readFileSync(join(PUB, file), 'utf8');
  const isClass = classFiles.has(file);
  const m = html.match(LEFTOVERS);
  if (m) err(file, `resto de la piel antigua: «${m[0]}»`);
  if (/<link[^>]+href="https?:\/\//i.test(html)) err(file, 'link a CSS externo');
  if (/<script[^>]+src="https?:\/\//i.test(html) && file !== 'login.html') err(file, 'script externo');

  // enlaces y recursos internos
  const refs = [...html.matchAll(/(?:href|src)="([^"#?][^"]*)"/g)].map(x => x[1]).filter(u => !/^(https?:|mailto:|tel:|data:|javascript:)/i.test(u));
  for (const u of new Set(refs)) {
    const path = u.startsWith('/') ? join(PUB, u) : join(PUB, u);
    if (!existsSync(path) || !statSync(path).isFile()) err(file, `enlace/recurso interno roto: ${u}`);
  }

  if (!isClass) {
    if (file === 'index.html' && !/data-page="home"/.test(html)) err(file, 'sin data-page="home"');
    continue;
  }
  const id = classFiles.get(file);
  const dc = html.match(/<body[^>]*data-class="([^"]+)"/);
  if (!dc) err(file, 'sin <body data-class>'); else if (dc[1] !== id) err(file, `data-class="${dc[1]}" pero curso-data.js dice ${id}`);
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) err(file, `${h1} <h1> (debe ser 1)`);
  if (!/<main\b/.test(html)) err(file, 'sin <main>');
  if (!/class="hero(?: escena)?"/.test(html)) err(file, 'sin header.hero');
  if (!/class="content"/.test(html)) err(file, 'sin div.content');
  if (!/src="\/curso-data\.js"/.test(html) || !/src="\/curso\.js"/.test(html)) err(file, 'faltan curso-data.js / curso.js');
  if (/<(header|footer|nav)\b(?![^>]*class="(hero|navfoot|topbar|src))/i.test(html)) {
    const tag = html.match(/<(header|footer|nav)\b[^>]*>/i)[0];
    if (!/class="hero(?: escena)?"/.test(tag)) err(file, `elemento propio que genera curso.js: ${tag.slice(0, 60)}`);
  }
  const secs = [...html.matchAll(/<section\s+class="sec([^"]*)"\s+id="([^"]+)"/g)];
  if (!secs.length) err(file, 'sin <section class="sec" id>');
  const last = secs[secs.length - 1];
  if (last) {
    const dark = / sec-dark/.test(last[1]);
    if (!dark && !NO_DARK.has(id)) warn(file, `la última sección (#${last[2]}) no lleva sec-dark`);
    if (dark && NO_DARK.has(id)) warn(file, `la última sección lleva sec-dark pero ${id} está en la lista sin práctica`);
  }
  const darkCount = (html.match(/class="sec sec-dark/g) || []).length;
  if (darkCount > 1) err(file, `${darkCount} secciones sec-dark (máximo 1)`);
  for (const q of html.matchAll(/class="quiz"[^>]*data-quiz="([^"]+)"/g)) {
    if (!new RegExp(`(?:const|let|var)\\s+${q[1]}\\s*=`).test(html)) err(file, `quiz "${q[1]}" sin array de datos`);
  }
  if (/<img/.test(html) && !/media-duotone|class="figure"|class="esc-fig"|class="dp-stage"|class="serie"/.test(html)) warn(file, 'imagen sin figure/duotono');
  const emoji = html.replace(/<script[\s\S]*?<\/script>/g, '').match(/(?![©®™✓✔↔↕⇄→←↑↓])\p{Extended_Pictographic}/u);
  if (emoji) warn(file, `emoji en el markup: ${emoji[0]}`);
}

console.log(`QA · ${htmlFiles.length} páginas · ${classFiles.size} clases en curso-data.js`);
for (const w of warns) console.log('  ⚠ ' + w);
for (const e of errors) console.log('  ✗ ' + e);
console.log(errors.length ? `✗ ${errors.length} errores, ${warns.length} avisos` : `✓ sin errores, ${warns.length} avisos`);
process.exit(errors.length ? 1 : 0);
