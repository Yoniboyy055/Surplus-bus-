import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail } from "./lib/auth/ownerEmail";
import { checkSlidingWindowRateLimit, getClientIp } from "./lib/security/ipRateLimit";

const protectedRoutes = ["/dashboard", "/operator", "/buyer", "/referrer"];

function apiRatePolicy(pathname: string) {
  if (pathname.startsWith("/api/beta-signups")) {
    return { windowMs: 60_000, maxHits: 10, scope: "public-strict" };
  }

  if (
    pathname.startsWith("/api/opportunities/recompute-scores") ||
    pathname.startsWith("/api/agents/listing")
  ) {
    return { windowMs: 60_000, maxHits: 30, scope: "sensitive" };
  }

  return { windowMs: 60_000, maxHits: 120, scope: "default" };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith("/api/");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isApiRoute) {
    const ip = getClientIp(request);
    const policy = apiRatePolicy(pathname);
    const rl = checkSlidingWindowRateLimit({
      key: `${policy.scope}:${pathname}:${ip}`,
      windowMs: policy.windowMs,
      maxHits: policy.maxHits,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retry_after_ms: rl.resetMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "fatal_env_missing" }, { status: 500 });
    }

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
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && isOwnerEmail(user.email)) {
    if (pathname.startsWith("/buyer") || pathname.startsWith("/referrer")) {
      return NextResponse.redirect(new URL("/operator", request.url));
    }
    if (pathname.startsWith("/operator")) {
      return response;
    }
  }

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (profile) {
      if (pathname.startsWith("/operator") && profile.role !== "operator") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (pathname.startsWith("/buyer") && profile.role !== "buyer") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (pathname.startsWith("/referrer") && profile.role !== "referrer") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
