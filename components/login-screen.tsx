"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { type RoleKey } from "@/lib/types"
import { validatePinLogin, sendPasswordResetEmail, getAvailableUsers, verifyTOTPForLogin } from "@/lib/auth-actions"
import Image from "next/image"

export function LoginScreen() {
  const { setRole } = useApp()
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPin, setShowForgotPin] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: RoleKey; email: string | null }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [connectionError, setConnectionError] = useState("")
  
  // 2FA states
  const [show2FAPrompt, setShow2FAPrompt] = useState(false)
  const [totp2FACode, setTotp2FACode] = useState("")
  const [pendingRole, setPendingRole] = useState<RoleKey | null>(null)

  // Cargar usuarios disponibles cuando monta el componente
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true)
      setConnectionError("")
      const result = await getAvailableUsers()
      if (result.success) {
        setAvailableUsers(result.users as typeof availableUsers)
      } else {
        setConnectionError(result.error || "Error al conectar. Verifica tu conexion e intenta de nuevo.")
      }
      setIsLoadingUsers(false)
    }
    loadUsers()
  }, [])

  // Rate limiting helpers
  const checkRateLimited = (): boolean => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem("nitia_login_attempts")
    if (!stored) return false
    const { count, timestamp } = JSON.parse(stored)
    const fiveMinutes = 5 * 60 * 1000
    if (Date.now() - timestamp > fiveMinutes) {
      localStorage.removeItem("nitia_login_attempts")
      return false
    }
    return count >= 5
  }

  const recordFailedAttempt = () => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("nitia_login_attempts")
    const fiveMinutes = 5 * 60 * 1000
    if (stored) {
      const { count, timestamp } = JSON.parse(stored)
      if (Date.now() - timestamp > fiveMinutes) {
        localStorage.setItem("nitia_login_attempts", JSON.stringify({ count: 1, timestamp: Date.now() }))
      } else {
        localStorage.setItem("nitia_login_attempts", JSON.stringify({ count: count + 1, timestamp }))
      }
    } else {
      localStorage.setItem("nitia_login_attempts", JSON.stringify({ count: 1, timestamp: Date.now() }))
    }
  }

  const clearRateLimit = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("nitia_login_attempts")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checkRateLimited()) {
      setError("Demasiados intentos. Intenta de nuevo en 5 minutos.")
      return
    }
    if (!selectedRole) {
      setError("Selecciona un perfil")
      return
    }
    if (!pin || pin.length !== 4) {
      setError("PIN debe tener 4 digitos")
      return
    }

    setIsLoading(true)
    try {
      const result = await validatePinLogin(pin)
      if (result.success) {
        console.log("[v0] PIN validated, totp_enabled:", result.totp_enabled)
        
        if (result.totp_enabled) {
          // Mostrar prompt para 2FA
          setPendingRole(result.role as RoleKey)
          setShow2FAPrompt(true)
          setIsLoading(false)
        } else {
          // Sin 2FA, login directo
          clearRateLimit()
          setRole(result.role as RoleKey)
          await new Promise((r) => setTimeout(r, 400))
        }
      } else {
        recordFailedAttempt()
        setError(result.error || "PIN incorrecto")
        setPin("")
        setIsLoading(false)
      }
    } catch (err) {
      setError("Error desconocido")
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!totp2FACode || totp2FACode.length !== 6) {
      setError("Código debe tener 6 digitos")
      return
    }
    
    if (!pendingRole) {
      setError("Error: role no disponible")
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyTOTPForLogin(pendingRole, totp2FACode)
      if (result.success) {
        clearRateLimit()
        setRole(pendingRole)
        setShow2FAPrompt(false)
        await new Promise((r) => setTimeout(r, 400))
      } else {
        recordFailedAttempt()
        setError(result.error || "Código incorrecto")
        setTotp2FACode("")
        setIsLoading(false)
      }
    } catch (err) {
      setError("Error verificando código")
      setIsLoading(false)
    }
  }

  const handlePinChange = (digit: string) => {
    if (checkRateLimited()) {
      setError("Demasiados intentos. Intenta de nuevo en 5 minutos.")
      return
    }
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      setError("")
      
      if (newPin.length === 4 && selectedRole) {
        setTimeout(async () => {
          setIsLoading(true)
          try {
            const result = await validatePinLogin(newPin)
            if (result.success) {
              console.log("[v0] PIN validated via keypad, totp_enabled:", result.totp_enabled)
              
              if (result.totp_enabled) {
                // Mostrar prompt para 2FA
                setPendingRole(result.role as RoleKey)
                setShow2FAPrompt(true)
                setIsLoading(false)
              } else {
                // Sin 2FA, login directo
                clearRateLimit()
                setRole(result.role as RoleKey)
                await new Promise((r) => setTimeout(r, 400))
              }
            } else {
              recordFailedAttempt()
              setError(result.error || "PIN incorrecto")
              setPin("")
              setIsLoading(false)
            }
          } catch (err) {
            recordFailedAttempt()
            setError("Error al autenticar")
            setPin("")
            setIsLoading(false)
          }
        }, 150)
      }
    }
  }

  const handleForgotPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setResetMessage("Ingresa tu email")
      return
    }
    
    setIsLoading(true)
    try {
      const result = await sendPasswordResetEmail(resetEmail)
      setResetMessage(result.message || "")
      if (result.success) {
        setTimeout(() => {
          setShowForgotPin(false)
          setResetEmail("")
          setResetMessage("")
        }, 3000)
      }
    } catch (err) {
      setResetMessage("Error al procesar solicitud")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
    setError("")
  }

  if (showForgotPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED] p-6" suppressHydrationWarning>
        <div className="fixed inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
        </div>

        <div className="relative w-full max-w-[340px]" suppressHydrationWarning>
          <div className="text-center mb-8" suppressHydrationWarning>
            <h1 className="text-2xl font-light text-[#1C1A12] mb-2">Recuperar PIN</h1>
            <p className="text-sm text-[#76746A]">Te enviaremos un link a tu email para que establezcas un nuevo PIN</p>
          </div>

          <form onSubmit={handleForgotPin} className="space-y-6" suppressHydrationWarning>
            <div className="space-y-2" suppressHydrationWarning>
              <label className="block text-xs font-semibold tracking-wide uppercase text-[#76746A]">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#E0DDD0] text-sm placeholder:text-[#B0ADA0] focus:outline-none focus:border-[#5F5A46]"
                disabled={isLoading}
              />
            </div>

            {resetMessage && (
              <div className={`text-center text-sm py-3 px-4 rounded-lg ${
                resetMessage.includes("exitosamente") 
                  ? "bg-[#E6F2E0] text-[#295E29]"
                  : "bg-[#FEE2E2] text-[#8B2323]"
              }`}>
                {resetMessage}
              </div>
            )}

            <div className="flex gap-3" suppressHydrationWarning>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPin(false)
                  setResetEmail("")
                  setResetMessage("")
                }}
                className="flex-1 py-3 rounded-xl bg-[#F0EDE4] text-[#76746A] text-xs font-semibold uppercase tracking-wide hover:bg-[#E8E5D8]"
                disabled={isLoading}
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#5F5A46] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#4A4639]"
                disabled={isLoading || !resetEmail}
              >
                {isLoading ? "Enviando..." : "Enviar Link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED] p-6" suppressHydrationWarning>
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
      </div>

      <div className="relative w-full max-w-[340px]" suppressHydrationWarning>
        {/* Logo */}
        <div className="text-center mb-12" suppressHydrationWarning>
          <div className="relative w-24 h-24 mx-auto" suppressHydrationWarning>
            <Image
              src="/images/nitia-logo.png"
              alt="Nitia Estudio"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" suppressHydrationWarning>
          {/* Role Selection */}
          <div className="space-y-3" suppressHydrationWarning>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#76746A] text-center">
              Seleccionar perfil
            </label>
            <div className="grid grid-cols-3 gap-2" suppressHydrationWarning>
              {isLoadingUsers ? (
                <div className="col-span-3 text-center py-4 text-sm text-[#76746A]">Cargando...</div>
              ) : availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(user.role)
                      setError("")
                    }}
                    className={`
                      py-3.5 px-2 rounded-xl text-[11px] font-semibold tracking-wide uppercase transition-all duration-200
                      ${
                        selectedRole === user.role
                          ? "bg-[#5F5A46] text-white shadow-lg shadow-[#5F5A46]/20"
                          : "bg-white text-[#76746A] border border-[#E0DDD0] hover:border-[#5F5A46]/40 hover:text-[#5F5A46]"
                      }
                    `}
                  >
                    {user.name}
                  </button>
                ))
              ) : connectionError ? (
                <div className="col-span-3 text-center py-4">
                  <p className="text-sm text-[#8B2323] mb-2">{connectionError}</p>
                  <button 
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-xs text-[#5F5A46] underline hover:no-underline"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <div className="col-span-3 text-center py-4 text-sm text-[#8B2323]">No hay usuarios disponibles</div>
              )}
            </div>
          </div>

          {/* PIN Display with keyboard input */}
          <div className="space-y-3" suppressHydrationWarning>
            <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#76746A] text-center">
              Ingresar PIN
            </label>
            {/* Hidden input for keyboard typing */}
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                if (checkRateLimited()) {
                  setError("Demasiados intentos. Intenta de nuevo en 5 minutos.")
                  return
                }
                setPin(value)
                setError("")
                if (value.length === 4 && selectedRole) {
                  setTimeout(async () => {
                    setIsLoading(true)
                    try {
                      const result = await validatePinLogin(value)
                      if (result.success) {
                        console.log("[v0] PIN validated via input, totp_enabled:", result.totp_enabled)
                        
                        if (result.totp_enabled) {
                          // Mostrar prompt para 2FA
                          setPendingRole(result.role as RoleKey)
                          setShow2FAPrompt(true)
                          setIsLoading(false)
                        } else {
                          // Sin 2FA, login directo
                          clearRateLimit()
                          setRole(result.role as RoleKey)
                          await new Promise((r) => setTimeout(r, 400))
                        }
                      } else {
                        recordFailedAttempt()
                        setError(result.error || "PIN incorrecto")
                        setPin("")
                        setIsLoading(false)
                      }
                    } catch (err) {
                      recordFailedAttempt()
                      setError("Error al autenticar")
                      setPin("")
                      setIsLoading(false)
                    }
                  }, 150)
                }
              }}
              className="sr-only"
              autoComplete="off"
              id="pin-input"
            />
            <div 
              className="flex justify-center gap-3 cursor-pointer" 
              suppressHydrationWarning
              onClick={() => document.getElementById('pin-input')?.focus()}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  suppressHydrationWarning
                  className={`
                    w-14 h-14 rounded-xl flex items-center justify-center text-xl font-medium transition-all duration-200
                    ${
                      pin.length > i
                        ? "bg-[#5F5A46] text-white shadow-lg shadow-[#5F5A46]/20"
                        : pin.length === i
                        ? "bg-white border-2 border-[#5F5A46] text-[#5F5A46]"
                        : "bg-white border border-[#E0DDD0] text-[#76746A]"
                    }
                  `}
                >
                  {pin[i] ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  ) : (
                    ""
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#B5B2A2] text-center">Toca los cuadros o escribe desde el teclado</p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-center">
              <p className="text-sm text-[#8B2323] bg-[#FAEBEB] py-2 px-4 rounded-lg inline-block">
                {error}
              </p>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto" suppressHydrationWarning>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
              (digit, i) => {
                if (digit === "") return <div key={i} suppressHydrationWarning />
                if (digit === "del") {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={handleDelete}
                      disabled={pin.length === 0}
                      className="py-4 rounded-xl bg-[#F0EDE4] text-[#76746A] text-xs font-semibold uppercase tracking-wide hover:bg-[#E8E5D8] active:scale-95 transition-all disabled:opacity-30"
                    >
                      Borrar
                    </button>
                  )
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePinChange(digit)}
                    disabled={pin.length >= 4}
                    className="py-4 rounded-xl bg-white border border-[#E0DDD0] text-[#1C1A12] text-lg font-medium hover:bg-[#F7F5ED] hover:border-[#5F5A46]/30 active:scale-95 transition-all disabled:opacity-30"
                  >
                    {digit}
                  </button>
                )
              }
            )}
          </div>

          {/* Submit - hidden, auto-submit on PIN complete */}
          <button
            type="submit"
            disabled={pin.length !== 4 || !selectedRole || isLoading}
            className={`
              w-full py-3.5 rounded-xl text-xs font-semibold tracking-[0.15em] uppercase transition-all duration-200
              ${
                isLoading
                  ? "bg-[#5F5A46] text-white"
                  : pin.length === 4 && selectedRole
                  ? "bg-[#5F5A46] text-white hover:bg-[#4A4639] shadow-lg shadow-[#5F5A46]/20"
                  : "bg-[#E0DDD0] text-[#76746A] cursor-not-allowed"
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ingresando...
              </span>
            ) : (
              "Ingresar"
            )}
          </button>

          {/* Forgot PIN Link */}
          <button
            type="button"
            onClick={() => setShowForgotPin(true)}
            className="w-full text-center text-xs text-[#5F5A46] hover:text-[#4A4639] font-medium hover:underline"
          >
            ¿Olvidaste tu PIN?
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#76746A]/60 mt-10 tracking-wide">
          Arquitectura e Interiorismo
        </p>
      </div>

      {/* 2FA Modal */}
      {show2FAPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-semibold text-[#1C1A12] mb-4">Verificar Autenticación en Dos Pasos</h2>
            <p className="text-sm text-[#76746A] mb-6">Ingresa el código de 6 dígitos de tu aplicación de autenticación.</p>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp2FACode}
                  onChange={(e) => setTotp2FACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E0DDD0] text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-[#5F5A46]"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-center">
                  <p className="text-sm text-[#8B2323] bg-[#FAEBEB] py-2 px-4 rounded-lg inline-block">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FAPrompt(false)
                    setTotp2FACode("")
                    setPendingRole(null)
                    setPin("")
                    setError("")
                    setIsLoading(false)
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#F7F5ED] text-[#5F5A46] text-sm font-semibold uppercase tracking-wide hover:bg-[#E0DDD0]"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#5F5A46] text-white text-sm font-semibold uppercase tracking-wide hover:bg-[#4A4639] disabled:opacity-50"
                  disabled={isLoading || totp2FACode.length !== 6}
                >
                  {isLoading ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
