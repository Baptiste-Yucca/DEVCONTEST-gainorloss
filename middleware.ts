import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Vérifier si la page existe
  try {
    // Si la route est la page d'accueil ou une page qui existe, continuer normalement
    if (request.nextUrl.pathname === '/' || 
        request.nextUrl.pathname === '/dashboard' || 
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next();
    }
    
    // Sinon, rediriger vers la page d'accueil
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    // En cas d'erreur, rediriger également vers la page d'accueil
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// Configurer le middleware pour s'exécuter sur toutes les routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 