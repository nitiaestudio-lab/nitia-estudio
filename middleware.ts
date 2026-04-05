import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "nitia_session"

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't need auth
  if (
    pathname === "/" ||
    pathname === "/reset-pin" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // API routes and server actions need session validation
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = getSecret()

  if (!token || !secret) {
    // For API routes, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    // For page routes, redirect to login
    return NextResponse.redirect(new URL("/", request.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Invalid/expired token
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión expirada" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/", request.url))
  }
}

export const config = {
  matcher: ["/api/:path*"],
}
