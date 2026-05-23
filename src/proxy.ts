import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const allowed =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (allowed) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("bili_stats_auth")?.value;
  if (authCookie === sitePassword) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
