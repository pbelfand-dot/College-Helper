import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two request-time concerns that pages cannot handle themselves.
 *
 * First, the desktop build's front door. The landing page is prerendered at
 * build time, so it cannot decide at runtime that this copy is the desktop app
 * and there is nothing to sign up for; middleware runs per request and can.
 *
 * Second, refreshing the Supabase session cookie on navigation. Server
 * components cannot write cookies, so without this a session would expire
 * mid-visit and the student would be bounced to the login page. In demo and
 * desktop mode there is nothing to refresh.
 *
 * Neither of these is authorisation — every page and action re-checks the
 * session itself. Treating middleware as the only gate would be a mistake.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const fileStorage = process.env.APPLYPILOT_STORAGE === 'file';

  if (fileStorage) {
    // A desktop app opens into the product. There is no marketing page to read
    // and no account to sign in to, so those two routes are not destinations.
    const { pathname } = request.nextUrl;
    if (pathname === '/' || pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (fileStorage || process.env.DEMO_MODE === 'true' || !url || !anonKey) return response;

  const { createServerClient } = await import('@supabase/ssr');

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Revalidates the token with Supabase and rotates the cookie when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never need
     * a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
