import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail } from "./lib/auth/ownerEmail";

const protectedRoutes = ["/dashboard", "/operator", "/buyer", "/referrer"];

export async function middleware(request: NextRequest) {
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

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
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && isOwnerEmail(user.email)) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/buyer") || path.startsWith("/referrer")) {
      return NextResponse.redirect(new URL("/operator", request.url));
    }
    if (path.startsWith("/operator")) {
      return response;
    }
  }

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (profile) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/operator") && profile.role !== "operator") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (path.startsWith("/buyer") && profile.role !== "buyer") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (path.startsWith("/referrer") && profile.role !== "referrer") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
