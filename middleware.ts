import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase credentials are not configured, allow request to proceed
    return response;
  }

  // Create Server Client to inspect and refresh auth cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Protect the /admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Must be logged in
    if (userError || !user || !user.email) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', '/admin');
      return NextResponse.redirect(loginUrl);
    }

    // Must have role 'president' or 'coach' in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .ilike('email', user.email)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      (profile.role !== 'president' && profile.role !== 'coach')
    ) {
      // Redirect anyone without authorized privileges back to the home page (/)
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ or public assets (.png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
