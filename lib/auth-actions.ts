"use server"

// Auth Actions v1.1.0 - TOTP with speakeasy

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as speakeasy from "speakeasy"

// Lazy initialization - cliente se crea solo cuando se necesita
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

export async function validatePinLogin(pin: string) {
  try {
    const supabase = getSupabaseClient()
    console.log("[v0] Validating PIN login")

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role, pin, totp_enabled, totp_secret, permissions, can_see_financials")
      .eq("pin", pin)
      .single()

    if (error) {
      console.error("[v0] Login query error:", error)
      if (error.code === "PGRST116") {
        return { success: false, error: "PIN incorrecto" }
      }
      return { success: false, error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
    }

    if (user) {
      console.log("[v0] PIN valid, totp_enabled:", user.totp_enabled)
      return { 
        success: true, 
        role: user.role,
        totp_enabled: user.totp_enabled || false,
        totp_secret: user.totp_enabled ? user.totp_secret : null,
        permissions: user.permissions || {},
      }
    }

    return { success: false, error: "PIN incorrecto" }
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return { success: false, error: "Error al conectar. Verifica tu conexion e intenta de nuevo." }
  }
}

export async function sendPasswordResetEmail(email: string) {
  try {
    const supabase = getSupabaseClient()
    // Verificar que el email exista en la tabla users
    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (queryError || !user) {
      // No revelar si el email existe (security best practice)
      return { success: true, message: "Si el email existe, recibirás un link de recuperación" }
    }

    // Enviar magic link usando Supabase Auth
    // IMPORTANTE: La URL de redirect debe estar en la lista permitida de Supabase Dashboard > Authentication > URL Configuration
    // FIX: Corregir precedencia de operadores
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.nitiaestudio.com")
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${siteUrl}/reset-pin?email=${encodeURIComponent(email)}`,
        shouldCreateUser: false, // No crear usuario si no existe
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

export async function resetPin(email: string, newPin: string) {
  try {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return { success: false, error: "PIN debe ser 4 dígitos numéricos" }
    }

    const supabase = getSupabaseClient()
    // Actualizar el PIN para este email
    const { error } = await supabase
      .from("users")
      .update({ pin: newPin, updated_at: new Date().toISOString() })
      .eq("email", email)

    if (error) {
      console.error("Reset PIN error:", error)
      return { success: false, error: "Error al actualizar PIN" }
    }

    return { success: true, message: "PIN actualizado exitosamente" }
  } catch (error) {
    console.error("Reset PIN error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function createEmployeeUser(name: string, pin: string, permissions?: Record<string, boolean>) {
  try {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return { success: false, error: "PIN debe ser 4 dígitos numéricos" }
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        pin,
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
    if (pin) updates.pin = pin
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
      .maybeSingle() // No lanza error si no encuentra ninguno

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

// Nueva función: obtener todos los usuarios disponibles
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
    return { success: true }
  } catch (error) {
    console.error("Logout error:", error)
    return { success: false, error: "Error al cerrar sesion" }
  }
}

// Obtener datos del usuario actual por rol
export async function getCurrentUserData(role: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role")
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

// Cambiar PIN del usuario
export async function changeUserPin(role: string, currentPin: string, newPin: string) {
  try {
    const supabase = getSupabaseClient()
    
    // Verificar PIN actual
    const { data: user, error: verifyError } = await supabase
      .from("users")
      .select("id, pin")
      .eq("role", role)
      .single()

    if (verifyError || !user) {
      return { success: false, error: "Usuario no encontrado" }
    }

    if (user.pin !== currentPin) {
      return { success: false, error: "PIN actual incorrecto" }
    }

    // Validar nuevo PIN
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return { success: false, error: "PIN debe ser 4 digitos numericos" }
    }

    // Actualizar PIN
    const { error: updateError } = await supabase
      .from("users")
      .update({ pin: newPin, updated_at: new Date().toISOString() })
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

// Actualizar perfil de usuario (nombre, email)
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

// Enviar email para cambiar PIN
export async function requestPinChangeEmail(email: string) {
  try {
    const supabase = getSupabaseClient()
    
    // Verificar que el email exista
    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .single()

    if (queryError || !user) {
      return { success: false, error: "Email no encontrado" }
    }

    // Enviar magic link para reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://app.nitiaestudio.com"}/reset-pin?email=${encodeURIComponent(email)}`,
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

// Configurar TOTP (2FA)
export async function setupTOTP(role: string) {
  try {
    // Generar secret en formato base32 (solo letras A-Z y 2-7)
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    let secret = ""
    for (let i = 0; i < 16; i++) {
      secret += base32Chars[array[i] % 32]
    }
    
    // Crear URL para el QR code (formato estándar otpauth)
    const issuer = "Nitia Estudio"
    const label = role === "paula" ? "Paula" : role === "cami" ? "Cami" : "Empleada"
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

    // Guardar el secret temporalmente (sin activar aún)
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

// Verificar código TOTP y activar 2FA
export async function verifyAndEnableTOTP(role: string, code: string) {
  try {
    const supabase = getSupabaseClient()
    console.log("[v0] Verificando TOTP para role:", role)
    
    // Obtener el secret guardado
    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("totp_secret, totp_enabled")
      .eq("role", role)
      .single()

    console.log("[v0] Query result:", { user, queryError })
    
    if (queryError || !user?.totp_secret) {
      console.error("[v0] No secret found:", queryError)
      return { success: false, error: "2FA no configurado" }
    }

    // Verificar el código TOTP
    const isValid = verifyTOTPCode(user.totp_secret, code)
    console.log("[v0] TOTP validation result:", isValid)
    
    if (!isValid) {
      return { success: false, error: "Código incorrecto" }
    }

    // Activar 2FA
    console.log("[v0] Activating 2FA for role:", role)
    const { data: updateResult, error } = await supabase
      .from("users")
      .update({ 
        totp_enabled: true,
        updated_at: new Date().toISOString() 
      })
      .eq("role", role)
      .select()

    console.log("[v0] Update result:", { updateResult, error })
    
    if (error) {
      console.error("[v0] Enable TOTP error:", error)
      return { success: false, error: "Error al activar 2FA" }
    }

    console.log("[v0] 2FA successfully enabled")
    return { success: true }
  } catch (error) {
    console.error("[v0] Verify TOTP error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

// Desactivar 2FA
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

// Verificar TOTP durante el login (sin cambiar totp_enabled)
export async function verifyTOTPForLogin(role: string, code: string) {
  try {
    const supabase = getSupabaseClient()
    console.log("[v0] Verifying TOTP for login, role:", role)
    
    // Obtener el secret
    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("totp_secret")
      .eq("role", role)
      .single()

    if (queryError || !user?.totp_secret) {
      console.error("[v0] No TOTP secret found:", queryError)
      return { success: false, error: "2FA no configurado" }
    }

    // Verificar el código TOTP
    const isValid = verifyTOTPCode(user.totp_secret, code)
    console.log("[v0] TOTP verification for login result:", isValid)
    
    if (!isValid) {
      return { success: false, error: "Código incorrecto" }
    }

    console.log("[v0] TOTP login verification successful")
    return { success: true }
  } catch (error) {
    console.error("[v0] TOTP login error:", error)
    return { success: false, error: "Error al verificar código" }
  }
}

// Helper: Verificar código TOTP usando speakeasy
function verifyTOTPCode(secret: string, code: string): boolean {
  try {
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: code,
      window: 2, // Aceptar ±60 segundos de margen (2 ventanas de 30 segundos)
    })
    return isValid === true
  } catch (error) {
    console.error("TOTP verification error:", error)
    return false
  }
}

// Helper: Generar código TOTP para demo/test (no usado en producción)
function generateTOTP(secret: string, counter: number): string {
  try {
    const token = speakeasy.totp({
      secret: secret,
      encoding: "base32",
      step: 30,
    })
    return token
  } catch {
    return ""
  }
}

export async function updateSupabaseConfig(config: {
  url: string
  anonKey: string
  serviceRoleKey: string
  jwtSecret: string
}) {
  try {
    // Validar que los valores sean válidos
    if (!config.url || !config.anonKey || !config.serviceRoleKey || !config.jwtSecret) {
      return { success: false, error: "Todos los campos son requeridos" }
    }

    if (!config.url.includes("supabase.co")) {
      return { success: false, error: "URL de Supabase inválida" }
    }

    // En desarrollo, guardar en localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "supabase_config",
        JSON.stringify({
          url: config.url,
          anonKey: config.anonKey,
          serviceRoleKey: config.serviceRoleKey,
          jwtSecret: config.jwtSecret,
          updatedAt: new Date().toISOString(),
        })
      )
    }

    return {
      success: true,
      message: "Configuración actualizada. Recarga la página para aplicar los cambios.",
    }
  } catch (error) {
    console.error("Error updating Supabase config:", error)
    return { success: false, error: "Error al actualizar configuración" }
  }
}
