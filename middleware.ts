import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookie on navigation.
 *
 * Server components cannot write cookies, so without this a session would
 * expire mid-visit and the student would be bounced to the login page. In demo
 * mode there is nothing to refresh and the middleware is a pass-through.
 *
 * This does not perform authorisation — every page and action re-checks the
 * session itself. Treating middleware as the only gate would be a mistake.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || process.env.DEMO_MODE === 'true') return response;

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
