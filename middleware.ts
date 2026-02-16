import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail } from "./lib/auth/ownerEmail";

// Protected routes – auth required
const PROTECTED_ROUTES = [
  "/dashboard",
  "/feed",
  "/opportunities",
  "/alerts",
  "/saved",
  "/inbox",
  "/news",
  "/analytics",
  "/ops",
  "/settings",
  "/onboarding",
];

// Public routes – never require auth
const PUBLIC_ROUTES = ["/", "/landing", "/product", "/pricing", "/faq", "/auth", "/legal", "/401", "/403"];

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isProtected(pathname);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("callbackUrl", pathname + (request.nextUrl.search || ""));
    return NextResponse.redirect(authUrl);
  }

  // Redirect authed user away from /auth -> /dashboard
  if (user && pathname.startsWith("/auth") && !pathname.startsWith("/auth/callback")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Owner email: force to ops
  if (user && isOwnerEmail(user.email)) {
    if (pathname.startsWith("/ops")) {
      return response;
    }
    return NextResponse.redirect(new URL("/ops", request.url));
  }

  // Non-operator cannot access /ops
  if (user && pathname.startsWith("/ops")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "operator") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
