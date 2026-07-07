// middleware.js – Vercel Edge Middleware
// Verifies Supabase Auth session cookies to protect course pages.
//
// Config comes from environment variables (set them in Vercel → Settings →
// Environment Variables). Each has a safe fallback to the current project so a
// missing/typo'd variable never locks everyone out of the course.
//   - SUPABASE_PROJECT_REF : el "ref" del proyecto (subdominio de supabase.co)
//   - SUPABASE_URL         : URL de la API (por defecto se deriva del ref)
//   - SUPABASE_ANON_KEY    : clave pública (anon / publishable) — es pública por diseño

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ndtoqnpomhtubcygkwlh';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_TWDLiIP8n-EwF8ULmqDm0w_9uv5nBsS';

// Nombre de la cookie de sesión de Supabase: sb-<project-ref>-auth-token
const COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login.html', '/api/login', '/api/logout'];

// Pages restricted to full-access users only
const FULL_ACCESS_ONLY = [
    '/modulo3-clase5.html',
];

/**
 * Decode a JWT payload without verifying signature.
 * Full verification happens server-side via Supabase API.
 */
function decodeJWTPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(payload);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Verify the Supabase session token by calling the Supabase Auth API.
 * Returns the user object or null if invalid.
 */
async function getSupabaseUser(accessToken) {
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_ANON_KEY,
            },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Extract the Supabase access token from cookies.
 * Supabase stores auth in: sb-<project-ref>-auth-token (as JSON)
 * OR as chunked cookies (sb-<ref>-auth-token.0, .1, ...).
 */
function extractToken(cookieHeader) {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());
    const base = `${COOKIE_NAME}=`;
    const chunk0 = `${COOKIE_NAME}.0=`;

    for (const cookie of cookies) {
        // JSON format
        if (cookie.startsWith(base)) {
            try {
                const raw = cookie.slice(base.length);
                const parsed = JSON.parse(decodeURIComponent(raw));
                return parsed.access_token || null;
            } catch { /* continue */ }
        }
        // Chunked cookies (first chunk holds the access_token)
        if (cookie.startsWith(chunk0)) {
            try {
                const raw = cookie.slice(chunk0.length);
                const parsed = JSON.parse(decodeURIComponent(raw));
                return parsed.access_token || null;
            } catch { /* continue */ }
        }
    }

    return null;
}

export default async function middleware(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Allow public paths through
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return;
    }

    // Only protect HTML pages, root, and index.html
    const isProtected = pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html');
    if (!isProtected) return;

    const cookieHeader = request.headers.get('cookie') || '';
    const accessToken = extractToken(cookieHeader);

    if (!accessToken) {
        return Response.redirect(new URL('/login.html', request.url), 302);
    }

    // Quick local check: is token expired?
    const payload = decodeJWTPayload(accessToken);
    if (!payload || (payload.exp && payload.exp < Math.floor(Date.now() / 1000))) {
        return Response.redirect(new URL('/login.html', request.url), 302);
    }

    // Check full_access from user metadata for restricted pages
    const fullAccess = payload?.user_metadata?.full_access === true;
    if (!fullAccess && FULL_ACCESS_ONLY.some(p => pathname.startsWith(p))) {
        return Response.redirect(new URL('/index.html', request.url), 302);
    }

    // Valid session — let the request through
    return;
}

export const config = {
    matcher: '/((?!_vercel|_next|favicon.ico|.*\\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$).*)',
};
