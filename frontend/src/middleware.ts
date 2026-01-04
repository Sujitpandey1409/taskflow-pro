import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;

  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // 🔒 Not logged in → block dashboard
  if (!accessToken && isDashboardRoute) {
    const url = new URL("/login", req.url);
    // Add redirect param to help with debugging
    console.log("Redirecting to login from dashboard, no access token found.");
    // alert("Redirecting to login from dashboard, no access token found.");
    url.searchParams.set("redirected", "true");
    return NextResponse.redirect(url);
  }

  // 🚫 Logged in → block auth pages
  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ✅ Allow the request to continue
  return NextResponse.next();
}

// Apply middleware only to these routes
export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
  ],
};