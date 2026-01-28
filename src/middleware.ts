import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as any;

  // Public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/obrigado") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/payments/create") ||
    pathname.startsWith("/api/payments/status") ||
    pathname.startsWith("/api/payments/stripe-intent") ||
    pathname.startsWith("/api/coupons/validate") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }

  // Protected routes - require auth
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based access
  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/dashboard") && !["admin", "producer"].includes(user.role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/member") && !["admin", "customer"].includes(user.role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/member/:path*",
    "/login",
    "/checkout/:path*",
    "/obrigado/:path*",
    "/api/webhooks/:path*",
    "/api/payments/:path*",
  ],
};
