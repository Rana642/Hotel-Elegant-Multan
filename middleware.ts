import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Middleware only handles the fast "am I logged in?" check. Role-based
// path-level enforcement is done in lib/auth.ts + page-level guards so we
// don't have to pull the admin_users row on every /admin request (which
// would need a service key call from middleware — heavier than we want).

export async function middleware(request: NextRequest) {
  // Inject the pathname as a header on the request forwarded to the app.
  // Server layouts/pages have no direct access to the URL in Next 15, so we
  // set it here and read it back with `headers().get('x-pathname')`.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/admin/login');

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // If already logged in, bounce off the login page. We can't tell role from
  // just the auth session, so we send everyone to /admin/dashboard — the
  // dashboard's own guard will forward receptionists on to /admin/bookings.
  if (user && request.nextUrl.pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*'],
};
