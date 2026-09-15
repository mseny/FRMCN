# Curso IA Generativa · [m].seny /academy

Web del alumno del curso «IA Generativa» de [m].seny. Páginas HTML planas en `public/` servidas por Next.js en Vercel, con login por Supabase y un Edge Middleware que protege las clases y aplica el nivel de acceso de cada alumno. Piel: design system [m].seny, sub-marca `/academy` (tinta / papel / lima, Bricolage Grotesque + Instrument Sans + Chivo Mono, motivo `[ ]`).

## Estructura

| Ruta | Qué es |
|---|---|
| `public/index.html` | Home: panel del alumno (progreso, «Continuar», temario con las clases por módulo). |
| `public/login.html` | Acceso con Supabase (usuario → `usuario@cursoia.local`). |
| `public/modulo*.html`, `public/pfc-marketing.html` | Las clases. Cada una es HTML plano con `<body data-class="…">`. |
| `public/theme.css` | Tokens y utilidades del design system (fuentes en `public/fonts/`). No se toca salvo para re-tematizar. |
| `public/curso.css` | Componentes de clase, home y login. |
| `public/curso.js` | Comportamiento común: sesión y nivel desde el JWT, progreso en Supabase con caché local, top bar, chips de secciones con scroll-spy, hero, nav inferior, copiar, test, tabs, checklist, home. |
| `public/curso-data.js` | **Fuente de verdad** de módulos, clases, duraciones, herramientas y niveles de acceso. La usan la home, las clases y `middleware.js`. |
| `middleware.js` | Middleware de Next: exige sesión y aplica `curso-data.js` (nivel de acceso por módulo; M9 bloqueado mientras `locked:true`). |
| `docs/plantilla-clase.html` | Esqueleto canónico de una clase con todos los componentes. |
| `docs/brief-migracion.md` | Reglas para migrar o crear una clase. |
| `tools/parity.mjs` | Test de paridad de contenido entre `git HEAD` y el árbol de trabajo (`node tools/parity.mjs public/x.html`, `--all`). |
| `supabase/migrations/` | SQL de la tabla `academy_progress` (progreso y notas por alumno). Se aplica desde el SQL Editor de Supabase. |
| `design_handoff_curso_mseny/` | Handoff de diseño (prototipos, tokens, plan y mockup del temario). No se sirve. |
| `_archivo/` | Material antiguo fuera de `public/` (ignorado por git). |

## Módulos

| Módulo | Clases | Archivos |
|---|---|---|
| M1 · El Paisaje de los LLMs | 1 | `modulo1.html` |
| M2 · Glosario y Fundamentos | 1 | `modulo2.html` |
| M3 · Estudio Creativo IA (Imagen) | 3 | `modulo3-clase1..3.html` |
| M4 · Estudio Creativo IA (Automatización) | 2 | `modulo4-clase1..2.html` |
| M5 | — | hueco libre para contenido futuro |
| M6 · Claude suite | 3 | `modulo6-clase1..3.html` |
| M7 · Cerebros de IA | 3 | `modulo7-clase1..3.html` |
| M8 · Desarrollo de software | 1 | `modulo8-clase1.html` |
| M9 · MVP Empresarial (PFC) | 1 | `pfc-marketing.html` (bloqueado) |

Un módulo aparece en la web en cuanto su lista `classes` de `curso-data.js` tiene contenido; sin clases, no se pinta.

## Niveles de acceso

El nivel viaja en el JWT de Supabase como `user_metadata.access_level` y se edita en Supabase → Authentication → Users → *User Metadata*.

| `access_level` | Ve los módulos |
|---|---|
| `completo` | todos |
| `diseno` | M1, M2, M3, M4 |
| `marketing` | M1, M2, M6, M7, M8 |
| `finanzas` | M1, M2 (se le abren más módulos según avanza el curso) |
| *(sin valor)* | M1 — red de seguridad, ver abajo |

**Da siempre un `access_level` al crear un usuario.** Quien no lo lleve cae en `sin_asignar` y solo ve M1. Es deliberado: antes el valor por defecto era `completo` y un alta sin nivel regalaba el curso entero.

Qué módulos ve cada nivel se define en `levels` dentro de `public/curso-data.js`; es el único sitio que hay que tocar, porque de ahí beben la home, las páginas de clase y el middleware. Un módulo fuera de tu nivel **no aparece** en el temario: no se muestra bloqueado, sencillamente no está. M9 lleva además `locked: true`, así que sí se ve —para quien lo tenga en su nivel— pero todavía no se abre.

Son dos preguntas distintas y conviene no mezclarlas: `inLevel()` decide qué se enseña y `canAccess()` decide qué se puede abrir. El middleware usa `canAccess()`, de modo que esconder un módulo es una mejora de presentación, no la barrera: la barrera sigue estando en el borde.

## Añadir o editar una clase

1. Copia `docs/plantilla-clase.html` a `public/` y sigue `docs/brief-migracion.md`.
2. Da de alta la clase en `public/curso-data.js` (id, archivo, título, duración, herramientas). La home, la top bar, los chips, el «Clase X de Y» y el anterior/siguiente salen de ahí.
3. Comprueba: `node tools/parity.mjs public/<archivo>` si vienes de una versión anterior, y `npx next build`.

## Desarrollo

```bash
npm install
npx next dev        # http://localhost:3000 (con middleware y login reales)
```

Para ver las páginas sin login (solo piel): `python tools/serve.py 8766 public` (manda `no-store`, así el navegador no se queda con un CSS viejo). Sin sesión y solo en `localhost`, `curso.js` trata al visitante como `completo` para que se puedan abrir todas las clases; en producción ese atajo no actúa y la barrera sigue siendo el middleware.

## Variables de entorno (Vercel)

`SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (todas con valor por defecto en `middleware.js`; la anon key es pública por diseño).
