import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ─── Protection des routes admin ──────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'admin' && token?.role !== 'employe') {
        // Redirige vers la page de connexion avec un message
        const url = req.nextUrl.clone();
        url.pathname = '/connexion';
        url.searchParams.set('callbackUrl', pathname);
        url.searchParams.set('error', 'AccessDenied');
        return NextResponse.redirect(url);
      }
    }

    // ─── Protection des routes client ─────────────────────────────────────────
    if (pathname.startsWith('/compte')) {
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/connexion';
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Le middleware s'exécute uniquement si un token existe (ou tente d'accéder à une route protégée)
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith('/admin') || pathname.startsWith('/compte')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

// Routes sur lesquelles le middleware s'applique
export const config = {
  matcher: ['/admin/:path*', '/compte/:path*'],
};
