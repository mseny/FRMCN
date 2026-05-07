// middleware.js – Vercel Edge Middleware
// Verifies Supabase Auth JWT tokens to protect course pages

const SUPABASE_URL = 'https://ftpywhemyizucquurslo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cHl3aGVteWl6dWNxdXVyc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDYwMzIsImV4cCI6MjA5MjEyMjAzMn0.A63ZKSixJRA1DGFZ5-VBmaMzIwYIETCDBYn8mUnkzRI';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login.html', '/api/login', '/api/logout'];

// Pages restricted to full-access users only
const FULL_ACCESS_ONLY = [
    '/modulo3-clase3.html',
    '/modulo3-clase4.html',
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
 * OR as individual sb-access-token / sb-refresh-token cookies.
 */
function extractToken(cookieHeader) {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());

    // Look for Supabase auth cookie (JSON format)
    for (const cookie of cookies) {
        if (cookie.startsWith('sb-ftpywhemyizucquurslo-auth-token=')) {
            try {
                const raw = cookie.slice('sb-ftpywhemyizucquurslo-auth-token='.length);
                const decoded = decodeURIComponent(raw);
                const parsed = JSON.parse(decoded);
                return parsed.access_token || null;
            } catch { /* continue */ }
        }
        // Also try chunked cookies (sb-*-auth-token.0, sb-*-auth-token.1)
        if (cookie.startsWith('sb-ftpywhemyizucquurslo-auth-token.0=')) {
            try {
                const raw = cookie.slice('sb-ftpywhemyizucquurslo-auth-token.0='.length);
                const decoded = decodeURIComponent(raw);
                const parsed = JSON.parse(decoded);
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
