// middleware.js – Next.js Middleware (la convención «proxy» de Next 16 no la despliega Vercel todavía)
// Verifica la sesión de Supabase (cookie) para proteger las páginas del curso y
// aplica el nivel de acceso del alumno a cada módulo.
//
// La estructura del curso y los niveles viven en public/curso-data.js (única
// fuente de verdad, compartida con la home y las páginas de clase).
//
// VERIFICACIÓN DEL TOKEN
// El proyecto firma los JWT con claves asimétricas (ES256) y publica su clave
// pública en /auth/v1/.well-known/jwks.json, así que la firma se comprueba aquí
// mismo con Web Crypto: sin llamada a Supabase en cada navegación y sin poder
// falsificar una cookie. El JWKS se cachea en memoria del edge (10 min) y se
// vuelve a pedir si aparece un `kid` desconocido (rotación de claves).
// Si el token viniera firmado con el secreto compartido antiguo (HS256), que
// aquí no se puede comprobar, se cae al plan B: preguntar a /auth/v1/user.
//
// Configuración por variables de entorno (Vercel → Settings → Environment
// Variables). Cada una tiene un valor por defecto para que un typo nunca deje a
// nadie fuera del curso:
//   - SUPABASE_PROJECT_REF : el "ref" del proyecto (subdominio de supabase.co)
//   - SUPABASE_URL         : URL de la API (por defecto se deriva del ref)
//   - SUPABASE_ANON_KEY    : clave pública (anon / publishable)
//
// Nivel de acceso: user_metadata.access_level en el JWT
//   ('completo' | 'diseno' | 'marketing' | 'finanzas'; sin valor = completo).
//   Se edita en Supabase → Authentication → Users → User Metadata.

import CURSO from './public/curso-data.js';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ndtoqnpomhtubcygkwlh';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_TWDLiIP8n-EwF8ULmqDm0w_9uv5nBsS';

// Nombre de la cookie de sesión de Supabase: sb-<project-ref>-auth-token
const COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

// Rutas públicas (sin sesión)
const PUBLIC_PATHS = ['/login.html', '/api/login', '/api/logout'];

const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const JWKS_TTL_MS = 10 * 60 * 1000;

/* ── utilidades base64url ──────────────────────────────────────────────── */
function b64urlToBytes(s) {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
function b64urlToJSON(s) {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

/** Decodifica el payload de un JWT SIN comprobar la firma (solo para leer `kid`/`alg`). */
function decodeJWTPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return b64urlToJSON(parts[1]);
    } catch {
        return null;
    }
}

/* ── JWKS con caché por instancia del edge ─────────────────────────────── */
let jwksCache = { keys: null, at: 0 };
let jwksInFlight = null;

async function getJWKS(force) {
    const fresh = jwksCache.keys && Date.now() - jwksCache.at < JWKS_TTL_MS;
    if (fresh && !force) return jwksCache.keys;
    if (jwksInFlight) return jwksInFlight;
    jwksInFlight = fetch(JWKS_URL, { headers: { apikey: SUPABASE_ANON_KEY } })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
            jwksInFlight = null;
            if (j && Array.isArray(j.keys)) { jwksCache = { keys: j.keys, at: Date.now() }; return j.keys; }
            return jwksCache.keys;
        })
        .catch(() => { jwksInFlight = null; return jwksCache.keys; });
    return jwksInFlight;
}

const ALGS = {
    ES256: { importAlg: { name: 'ECDSA', namedCurve: 'P-256' }, verifyAlg: { name: 'ECDSA', hash: 'SHA-256' } },
    ES512: { importAlg: { name: 'ECDSA', namedCurve: 'P-521' }, verifyAlg: { name: 'ECDSA', hash: 'SHA-512' } },
    RS256: { importAlg: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, verifyAlg: { name: 'RSASSA-PKCS1-v1_5' } },
};

const keyCache = new Map(); // kid -> CryptoKey

async function importKey(jwk, alg) {
    const cached = keyCache.get(jwk.kid);
    if (cached) return cached;
    const spec = ALGS[alg];
    if (!spec) return null;
    const key = await crypto.subtle.importKey('jwk', { ...jwk, ext: true }, spec.importAlg, false, ['verify']);
    keyCache.set(jwk.kid, key);
    return key;
}

/**
 * Comprueba la firma del JWT con la clave pública del proyecto.
 * Devuelve el payload si la firma es válida, null si no lo es y
 * 'unsupported' si el algoritmo no se puede verificar aquí (HS256).
 */
async function verifyLocally(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let header;
    try { header = b64urlToJSON(parts[0]); } catch { return null; }
    if (!ALGS[header.alg]) return 'unsupported';

    let keys = await getJWKS(false);
    if (!keys || !keys.length) return 'unsupported';   // JWKS caído: que valide Supabase, no cerrar la puerta
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {                              // ¿clave rotada? se pide el JWKS otra vez
        keys = await getJWKS(true);
        if (!keys || !keys.length) return 'unsupported';
        jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) return null;

    try {
        const key = await importKey(jwk, header.alg);
        if (!key) return null;
        const ok = await crypto.subtle.verify(
            ALGS[header.alg].verifyAlg,
            key,
            b64urlToBytes(parts[2]),
            new TextEncoder().encode(parts[0] + '.' + parts[1])
        );
        return ok ? b64urlToJSON(parts[1]) : null;
    } catch {
        return null;
    }
}

/** Plan B para tokens HS256: que Supabase valide el token y devuelva el usuario. */
const remoteCache = new Map(); // token -> { until, payload }
async function verifyRemotely(token, payload) {
    const hit = remoteCache.get(token);
    if (hit && hit.until > Date.now()) return hit.payload;
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        });
        if (!res.ok) { remoteCache.set(token, { until: Date.now() + 30_000, payload: null }); return null; }
        const user = await res.json();
        // El nivel de acceso se lee de la respuesta de Supabase, no del token.
        const checked = { ...payload, sub: user.id, email: user.email, user_metadata: user.user_metadata || {} };
        if (remoteCache.size > 500) remoteCache.clear();
        remoteCache.set(token, { until: Date.now() + 60_000, payload: checked });
        return checked;
    } catch {
        return null;   // ante un fallo de red, no se abre la puerta
    }
}

/** Extrae el access_token de la cookie (JSON o troceada en .0, .1, …). */
function extractToken(cookieHeader) {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const base = `${COOKIE_NAME}=`;
    const chunk0 = `${COOKIE_NAME}.0=`;
    for (const cookie of cookies) {
        if (cookie.startsWith(base)) {
            try {
                const parsed = JSON.parse(decodeURIComponent(cookie.slice(base.length)));
                return parsed.access_token || null;
            } catch { /* continue */ }
        }
        if (cookie.startsWith(chunk0)) {
            try {
                const parsed = JSON.parse(decodeURIComponent(cookie.slice(chunk0.length)));
                return parsed.access_token || null;
            } catch { /* continue */ }
        }
    }
    return null;
}

export default async function middleware(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;

    // Solo se protegen las páginas HTML, la raíz y el index
    const isProtected = pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html');
    if (!isProtected) return;

    const toLogin = () => Response.redirect(new URL('/login.html', request.url), 302);

    const accessToken = extractToken(request.headers.get('cookie') || '');
    if (!accessToken) return toLogin();

    // Descarte rápido y barato: token mal formado o caducado.
    const claims = decodeJWTPayload(accessToken);
    const now = Math.floor(Date.now() / 1000);
    if (!claims || !claims.exp || claims.exp < now) return toLogin();

    // Firma. Local si el proyecto usa claves asimétricas; si no, contra Supabase.
    // Cuando la comprobación local no da el visto bueno se pregunta a Supabase
    // antes de rechazar: un token falsificado lo tumba igual la API, y así ningún
    // caso raro de firma deja a un alumno fuera del curso.
    let payload = await verifyLocally(accessToken);
    if (!payload || payload === 'unsupported') payload = await verifyRemotely(accessToken, claims);
    if (!payload) return toLogin();

    // Emisor y audiencia, ya con la firma comprobada.
    if (payload.iss && payload.iss !== ISSUER) return toLogin();
    if (payload.aud && payload.aud !== 'authenticated' && !(Array.isArray(payload.aud) && payload.aud.includes('authenticated'))) return toLogin();
    if (payload.exp && payload.exp < now) return toLogin();

    // Nivel de acceso por clase: un nivel puede tener módulos enteros o clases
    // sueltas (M9 está bloqueado para todos mientras locked:true)
    const cls = CURSO.classByFile(pathname);
    if (cls) {
        const level = CURSO.levelFromPayload(payload);
        if (!CURSO.canAccess(level, cls.module.id, cls.id)) {
            return Response.redirect(new URL(`/index.html#${cls.module.id}`, request.url), 302);
        }
    }

    // Sesión válida
    return;
}

export const config = {
    matcher: '/((?!_vercel|_next|favicon.ico|.*\\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$).*)',
};
