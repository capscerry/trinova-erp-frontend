import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];
const ROLE_REDIRECTS: Record<string, string> = {
  admin: "/dashboard",
  penjualan: "/penjualan",
  pembelian: "/pembelian",
  procurement_manager: "/pembelian",
  persediaan: "/persediaan",
};

function getAllowedRoles(pathname: string) {
  if (pathname === "/dashboard") return ["admin"];
  if (pathname.startsWith("/user")) return ["admin"];
  if (pathname.startsWith("/penjualan")) return ["admin", "penjualan"];
  if (pathname.startsWith("/pembelian")) return ["admin", "pembelian", "procurement_manager"];
  if (pathname.startsWith("/persediaan")) return ["admin", "persediaan"];

  return ["admin", "penjualan", "pembelian", "persediaan", "procurement_manager"];
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Biarkan public path lewat
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cek session cookie (kita set ini saat login)
  // Karena kita pakai sessionStorage (client-only), middleware pakai cookie sebagai sinyal
  const isLoggedIn = request.cookies.get("trinova_session")?.value === "1";
  const role = request.cookies.get("trinova_role")?.value;

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!role || !getAllowedRoles(pathname).includes(role)) {
    const redirectUrl = new URL(ROLE_REDIRECTS[role ?? ""] ?? "/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Proteksi semua route kecuali static files dan api
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
