import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Biarkan public path lewat
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cek session cookie (kita set ini saat login)
  // Karena kita pakai sessionStorage (client-only), middleware pakai cookie sebagai sinyal
  const isLoggedIn = request.cookies.get("trinova_session")?.value === "1";

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Proteksi semua route kecuali static files dan api
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
