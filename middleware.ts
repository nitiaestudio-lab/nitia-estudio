import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Middleware simple - la autenticación se maneja en el cliente con el contexto
  // La protección de rutas se hace a nivel de componentes con el hook useApp
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
