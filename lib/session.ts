"use server"

import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const SESSION_COOKIE = "nitia_session"
const SESSION_EXPIRY_HOURS = 8

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("No SESSION_SECRET configured")
  return new TextEncoder().encode(secret)
}

export async function createSession(role: string, permissions: Record<string, boolean> = {}) {
  const token = await new SignJWT({ role, permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_HOURS}h`)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
  })

  return token
}

export async function verifySession(): Promise<{ role: string; permissions: Record<string, boolean> } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    return {
      role: payload.role as string,
      permissions: (payload.permissions as Record<string, boolean>) || {},
    }
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// For middleware (Edge runtime compatible)
export async function verifySessionToken(token: string): Promise<{ role: string; permissions: Record<string, boolean> } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      role: payload.role as string,
      permissions: (payload.permissions as Record<string, boolean>) || {},
    }
  } catch {
    return null
  }
}
