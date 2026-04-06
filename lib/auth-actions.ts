"use server"

// Auth Actions v2.0.0 - Security hardening: bcrypt PINs, server-side rate limiting, token validation

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as speakeasy from "speakeasy"
import bcrypt from "bcryptjs"
import { createSession, destroySession } from "./session"

const BCRYPT_ROUNDS = 10
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 1

// In-memory rate limiting (per serverless instance — good enough for low traffic)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

// Lazy initialization
let _supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Supabase not configured: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  _supabaseClient = createClient(url, key)
  return _supabaseClient
}

// --- Rate limiting helpers ---
function checkRateLimit(identifier: string): { blocked: boolean; remainingMs?: number } {
  const entry = loginAttempts.get(identifier)
  if (!entry) return { blocked: false }

  if (entry.lockedUntil > Date.now()) {
    return { blocked: true, remainingMs: entry.lockedUntil - Date.now() }
  }

  // Lockout expired, reset
  if (entry.lockedUntil > 0 && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(identifier)
    return { blocked: false }
  }

  return { blocked: false }
}

function recordFailedAttempt(identifier: string) {
  const entry = loginAttempts.get(identifier) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000
  }
  loginAttempts.set(identifier, entry)
}

function clearAttempts(identifier: string) {
  loginAttempts.delete(identifier)
}

// --- PIN validation ---
export async function validatePinLogin(pin: string) {
  try {
    // Server-side rate limiting by PIN attempt
    const rlKey = `pin_global`
    const rl = checkRateLimit(rlKey)
    if (rl.blocked) {
      const mins = Math.ceil((rl.remainingMs || 0) / 60000)
      return { success: false, error: `Demasiados intentos. Intentá de nuevo en ${mins} minutos.` }
    }

    const supabase = getSupabaseClient()

    // Fetch all users and compare PINs with bcrypt
    const { data: users, error } = await supabase
      .from("users")
      .select("id, role, pin, totp_enabled, totp_secret, permissions, can_see_financials")

    if (error) {
      console.error("[auth] Login query error:", error)
      return { success: false, error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
    }

    // Try each user's PIN hash
    let matchedUser = null
    for (const user of users || []) {
      // Support both hashed and plaintext PINs (for migration)
      const isHashed = user.pin?.startsWith("$2")
      const match = isHashed
        ? await bcrypt.compare(pin, user.pin)
        : user.pin === pin
      if (match) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      recordFailedAttempt(rlKey)
      return { success: false, error: "PIN incorrecto" }
    }

    clearAttempts(rlKey)

    // Create server-side session (httpOnly cookie)
    // If TOTP is enabled, session will be created after TOTP verification
    if (!matchedUser.totp_enabled) {
      await createSession(matchedUser.role, matchedUser.permissions || {})
    }

    return {
      success: true,
      role: matchedUser.role,
      totp_enabled: matchedUser.totp_enabled || false,
      totp_secret: matchedUser.totp_enabled ? matchedUser.totp_secret : null,
      permissions: matchedUser.permissions || {},
    }
  } catch (error) {
    console.error("[auth] Auth error:", error)
    return { success: false, error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
  }
}

// --- Password reset ---
export async function sendPasswordResetEmail(email: string) {
  try {
    const supabase = getSupabaseClient()
    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (queryError || !user) {
      // No revelar si el email existe
      return { success: true, message: "Si el email existe, recibirás un link de recuperación" }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.nitiaestudio.com")

    // Generate a secure random reset token
    const resetToken = crypto.randomUUID()

    // Store token in DB with expiry (30 minutes)
    await supabase.from("app_settings").upsert({
      key: `reset_token_${resetToken}`,
      value: { email, expires: Date.now() + 30 * 60 * 1000 },
      updated_at: new Date().toISOString(),
    })

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/reset-pin?token=${resetToken}`,
        shouldCreateUser: false,
      },
    })

    if (error) {
      console.error("Reset email error:", error)
      return { success: false, error: "Error al enviar email" }
    }

    return { success: true, message: "Email enviado. Revisa tu inbox." }
  } catch (error) {
    console.error("Reset email error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

// Validate reset token server-side
export async function validateResetToken(token: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", `reset_token_${token}`)
      .single()

    if (error || !data?.value) {
      return { valid: false, email: null }
    }

    const { email, expires } = data.value as { email: string; expires: number }

    if (Date.now() > expires) {
      // Token expired, clean up
      await supabase.from("app_settings").delete().eq("key", `reset_token_${token}`)
      return { valid: false, email: null }
    }

    return { valid: true, email }
  } catch {
    return { valid: false, email: null }
  }
}

export async function resetPin(token: string, newPin: string) {
  try {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return { success: false, error: "PIN debe ser 4 dígitos numéricos" }
    }

    // Validate the token server-side
    const { valid, email } = await validateResetToken(token)
    if (!valid || !email) {
      return { success: false, error: "Link expirado o inválido. Solicitá uno nuevo." }
    }

    const supabase = getSupabaseClient()

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, BCRYPT_ROUNDS)

    const { error } = await supabase
      .from("users")
      .update({ pin: hashedPin, updated_at: new Date().toISOString() })
      .eq("email", email)

    if (error) {
      console.error("Reset PIN error:", error)
      return { success: false, error: "Error al actualizar PIN" }
    }

    // Consume the token
    await supabase.from("app_settings").delete().eq("key", `reset_token_${token}`)

    return { success: true, message: "PIN actualizado exitosamente" }
  } catch (error) {
    console.error("Reset PIN error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

// --- Employee management ---
export async function createEmployeeUser(name: string, pin: string, permissions?: Record<string, boolean>) {
  try {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return { success: false, error: "PIN debe ser 4 dígitos numéricos" }
    }

    const supabase = getSupabaseClient()
    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS)

    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        pin: hashedPin,
        role: "agente",
        can_see_financials: permissions?.ver_finanzas ?? false,
        permissions: permissions ?? {},
      })
      .select()

    if (error) {
      console.error("Create employee error:", error)
      return { success: false, error: "Error al crear usuario" }
    }

    return { success: true, data: data?.[0], message: "Usuario creado exitosamente" }
  } catch (error) {
    console.error("Create employee error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function updateEmployeeUser(name: string, pin: string, userId?: string, permissions?: Record<string, boolean>) {
  try {
    if (pin && (pin.length !== 4 || !/^\d+$/.test(pin))) {
      return { success: false, error: "PIN debe ser 4 dígitos numéricos" }
    }

    const supabase = getSupabaseClient()
    const updates: any = { name, updated_at: new Date().toISOString() }
    if (pin) updates.pin = await bcrypt.hash(pin, BCRYPT_ROUNDS)
    if (permissions !== undefined) {
      updates.permissions = permissions
      updates.can_see_financials = permissions?.ver_finanzas ?? false
    }

    let query = supabase.from("users").update(updates)
    if (userId) {
      query = query.eq("id", userId)
    } else {
      query = query.eq("role", "agente")
    }
    const { data, error } = await query.select()

    if (error) {
      console.error("Update employee error:", error)
      return { success: false, error: "Error al actualizar usuario" }
    }

    return { success: true, data: data?.[0] }
  } catch (error) {
    console.error("Update employee error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function deleteEmployeeUser(userId?: string) {
  try {
    const supabase = getSupabaseClient()
    let query = supabase.from("users").delete()
    if (userId) {
      query = query.eq("id", userId)
    } else {
      query = query.eq("role", "agente")
    }
    const { error } = await query

    if (error) {
      console.error("Delete employee error:", error)
      return { success: false, error: "Error al eliminar empleada" }
    }

    return { success: true, message: "Empleada eliminada exitosamente" }
  } catch (error) {
    console.error("Delete employee error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function getEmployeeUser() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "empleada")
      .maybeSingle()

    if (error) {
      console.error("Get employee error:", error)
      return { success: false, error: "Error al obtener empleada", data: null }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error("Get employee error:", error)
    return { success: false, error: "Error al procesar solicitud", data: null }
  }
}

export async function getAvailableUsers() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, name, role, email, permissions, can_see_financials")
      .order("role", { ascending: false })

    if (error) {
      console.error("Get users error:", error)
      return { success: false, users: [], error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
    }

    return { success: true, users: data || [] }
  } catch (error) {
    console.error("Get users error:", error)
    return { success: false, users: [], error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
  }
}

export async function logout() {
  try {
    await destroySession()
    return { success: true }
  } catch (error) {
    console.error("Logout error:", error)
    return { success: false, error: "Error al cerrar sesion" }
  }
}

export async function getCurrentUserData(role: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, totp_enabled")
      .eq("role", role)
      .maybeSingle()

    if (error) {
      console.error("Get current user error:", error)
      return { success: false, error: "Error al obtener datos", data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Get current user error:", error)
    return { success: false, error: "Error al procesar solicitud", data: null }
  }
}

// --- Change PIN ---
export async function changeUserPin(role: string, currentPin: string, newPin: string) {
  try {
    const supabase = getSupabaseClient()

    const { data: user, error: verifyError } = await supabase
      .from("users")
      .select("id, pin")
      .eq("role", role)
      .single()

    if (verifyError || !user) {
      return { success: false, error: "Usuario no encontrado" }
    }

    // Support both hashed and plaintext PINs (migration)
    const isHashed = user.pin?.startsWith("$2")
    const pinMatch = isHashed
      ? await bcrypt.compare(currentPin, user.pin)
      : user.pin === currentPin

    if (!pinMatch) {
      return { success: false, error: "PIN actual incorrecto" }
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return { success: false, error: "PIN debe ser 4 digitos numericos" }
    }

    const hashedPin = await bcrypt.hash(newPin, BCRYPT_ROUNDS)

    const { error: updateError } = await supabase
      .from("users")
      .update({ pin: hashedPin, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (updateError) {
      console.error("Update PIN error:", updateError)
      return { success: false, error: "Error al actualizar PIN" }
    }

    return { success: true, message: "PIN actualizado exitosamente" }
  } catch (error) {
    console.error("Change PIN error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function updateUserProfile(role: string, name: string, email: string | null) {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from("users")
      .update({
        name,
        email,
        updated_at: new Date().toISOString()
      })
      .eq("role", role)

    if (error) {
      console.error("Update profile error:", error)
      return { success: false, error: "Error al actualizar perfil" }
    }

    return { success: true }
  } catch (error) {
    console.error("Update profile error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function requestPinChangeEmail(email: string) {
  try {
    const supabase = getSupabaseClient()

    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .single()

    if (queryError || !user) {
      return { success: false, error: "Email no encontrado" }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.nitiaestudio.com"

    // Generate secure reset token
    const resetToken = crypto.randomUUID()
    await supabase.from("app_settings").upsert({
      key: `reset_token_${resetToken}`,
      value: { email, expires: Date.now() + 30 * 60 * 1000 },
      updated_at: new Date().toISOString(),
    })

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/reset-pin?token=${resetToken}`,
        shouldCreateUser: false,
      },
    })

    if (error) {
      console.error("Send reset email error:", error)
      return { success: false, error: "Error al enviar email" }
    }

    return { success: true }
  } catch (error) {
    console.error("Request PIN change error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

// --- TOTP (2FA) ---
export async function setupTOTP(role: string) {
  try {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    let secret = ""
    for (let i = 0; i < 16; i++) {
      secret += base32Chars[array[i] % 32]
    }

    const issuer = "Nitia Estudio"
    const label = role === "paula" ? "Paula" : role === "cami" ? "Cami" : "Empleada"
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("users")
      .update({
        totp_secret: secret,
        updated_at: new Date().toISOString()
      })
      .eq("role", role)

    if (error) {
      console.error("Setup TOTP error:", error)
      return { success: false, error: "Error al configurar 2FA" }
    }

    return {
      success: true,
      secret: secret,
      otpauthUrl: otpauthUrl
    }
  } catch (error) {
    console.error("Setup TOTP error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function verifyAndEnableTOTP(role: string, code: string) {
  try {
    const supabase = getSupabaseClient()

    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("totp_secret, totp_enabled")
      .eq("role", role)
      .single()

    if (queryError || !user?.totp_secret) {
      return { success: false, error: "2FA no configurado" }
    }

    const isValid = verifyTOTPCode(user.totp_secret, code)

    if (!isValid) {
      return { success: false, error: "Código incorrecto" }
    }

    const { error } = await supabase
      .from("users")
      .update({
        totp_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq("role", role)

    if (error) {
      console.error("Enable TOTP error:", error)
      return { success: false, error: "Error al activar 2FA" }
    }

    return { success: true }
  } catch (error) {
    console.error("Verify TOTP error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function disableTOTP(role: string) {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from("users")
      .update({
        totp_enabled: false,
        totp_secret: null,
        updated_at: new Date().toISOString()
      })
      .eq("role", role)

    if (error) {
      console.error("Disable TOTP error:", error)
      return { success: false, error: "Error al desactivar 2FA" }
    }

    return { success: true }
  } catch (error) {
    console.error("Disable TOTP error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function verifyTOTPForLogin(role: string, code: string, permissions?: Record<string, boolean>) {
  try {
    const supabase = getSupabaseClient()

    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("totp_secret, permissions")
      .eq("role", role)
      .single()

    if (queryError || !user?.totp_secret) {
      return { success: false, error: "2FA no configurado" }
    }

    const isValid = verifyTOTPCode(user.totp_secret, code)

    if (!isValid) {
      return { success: false, error: "Código incorrecto" }
    }

    // Create session after successful 2FA
    await createSession(role, permissions || user.permissions || {})

    return { success: true }
  } catch (error) {
    console.error("TOTP login error:", error)
    return { success: false, error: "Error al verificar código" }
  }
}

// Helper: Verify TOTP code
function verifyTOTPCode(secret: string, code: string): boolean {
  try {
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: code,
      window: 2, // ±60 seconds
    })
    return isValid === true
  } catch (error) {
    console.error("TOTP verification error:", error)
    return false
  }
}

// --- Migration: hash existing plaintext PINs ---
export async function migrateAllPinsToHash() {
  try {
    const supabase = getSupabaseClient()
    const { data: users, error } = await supabase.from("users").select("id, pin")
    if (error || !users) return { success: false, error: "Error fetching users" }

    let migrated = 0
    for (const user of users) {
      // Skip already hashed PINs
      if (user.pin?.startsWith("$2")) continue

      const hashed = await bcrypt.hash(user.pin, BCRYPT_ROUNDS)
      await supabase.from("users").update({ pin: hashed }).eq("id", user.id)
      migrated++
    }

    return { success: true, migrated }
  } catch (error) {
    return { success: false, error: "Migration failed" }
  }
}
