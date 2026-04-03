"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { resetPin } from "@/lib/auth-actions"
import Image from "next/image"

function ResetPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromParams = searchParams.get("email") || ""
  
  const [email, setEmail] = useState(emailFromParams)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(!!emailFromParams)

  // Extract email from JWT in hash if not in query params
  useEffect(() => {
    if (!emailFromParams && typeof window !== "undefined") {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const token = params.get("access_token")
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          if (payload.email) setEmail(payload.email)
        } catch {}
      }
    }
    setReady(true)
  }, [emailFromParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pin || pin.length !== 4) {
      setError("PIN debe tener 4 dígitos numéricos")
      return
    }

    if (pin !== confirmPin) {
      setError("Los PINs no coinciden")
      return
    }

    if (!/^\d+$/.test(pin)) {
      setError("PIN debe contener solo dígitos")
      return
    }

    setIsLoading(true)
    try {
      const result = await resetPin(email, pin)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push("/"), 3000)
      } else {
        setError(result.error || "Error al actualizar PIN")
      }
    } catch (err) {
      setError("Error al procesar solicitud")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (field: "pin" | "confirm", digit: string) => {
    const currentPin = field === "pin" ? pin : confirmPin
    if (currentPin.length < 4) {
      if (field === "pin") {
        setPin(currentPin + digit)
      } else {
        setConfirmPin(currentPin + digit)
      }
      setError("")
    }
  }

  const handleDelete = (field: "pin" | "confirm") => {
    if (field === "pin") {
      setPin(pin.slice(0, -1))
    } else {
      setConfirmPin(confirmPin.slice(0, -1))
    }
    setError("")
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED]"><p className="text-sm text-[#76746A]">Cargando...</p></div>
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED] p-6">
        <div className="text-center max-w-[340px]">
          <h1 className="text-2xl font-light text-[#1C1A12] mb-4">Link inválido</h1>
          <p className="text-sm text-[#76746A] mb-6">Por favor, solicita un nuevo link de recuperación</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 rounded-lg bg-[#5F5A46] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#4A4639]"
          >
            Volver al Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED] p-6">
        <div className="text-center max-w-[340px]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E6F2E0] flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-light text-[#1C1A12] mb-2">¡PIN actualizado!</h1>
          <p className="text-sm text-[#76746A] mb-6">Tu nuevo PIN ha sido guardado correctamente. Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED] p-6" suppressHydrationWarning>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#5F5A46]/[0.03] rounded-full blur-3xl" suppressHydrationWarning />
      </div>

      <div className="relative w-full max-w-[340px]" suppressHydrationWarning>
        <div className="text-center mb-8" suppressHydrationWarning>
          <div className="relative w-24 h-24 mx-auto mb-4" suppressHydrationWarning>
            <Image
              src="/images/nitia-logo.png"
              alt="Nitia Estudio"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-light text-[#1C1A12]">Nuevo PIN</h1>
          <p className="text-sm text-[#76746A] mt-1">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" suppressHydrationWarning>
          {/* New PIN */}
          <div className="space-y-3" suppressHydrationWarning>
            <label className="block text-xs font-semibold tracking-wide uppercase text-[#76746A]">
              Nuevo PIN
            </label>
            <div className="flex justify-center gap-3" suppressHydrationWarning>
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
          </div>

          {/* Confirm PIN */}
          <div className="space-y-3" suppressHydrationWarning>
            <label className="block text-xs font-semibold tracking-wide uppercase text-[#76746A]">
              Confirmar PIN
            </label>
            <div className="flex justify-center gap-3" suppressHydrationWarning>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  suppressHydrationWarning
                  className={`
                    w-14 h-14 rounded-xl flex items-center justify-center text-xl font-medium transition-all duration-200
                    ${
                      confirmPin.length > i
                        ? "bg-[#5F5A46] text-white shadow-lg shadow-[#5F5A46]/20"
                        : confirmPin.length === i
                        ? "bg-white border-2 border-[#5F5A46] text-[#5F5A46]"
                        : "bg-white border border-[#E0DDD0] text-[#76746A]"
                    }
                  `}
                >
                  {confirmPin[i] ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-current" />
                  ) : (
                    ""
                  )}
                </div>
              ))}
            </div>
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
                      onClick={() => handleDelete(pin.length > confirmPin.length ? "pin" : "confirm")}
                      disabled={pin.length === 0 && confirmPin.length === 0}
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
                    onClick={() => {
                      if (pin.length < 4) {
                        handlePinChange("pin", digit)
                      } else if (confirmPin.length < 4) {
                        handlePinChange("confirm", digit)
                      }
                    }}
                    disabled={pin.length >= 4 && confirmPin.length >= 4}
                    className="py-4 rounded-xl bg-white border border-[#E0DDD0] text-[#1C1A12] text-lg font-medium hover:bg-[#F7F5ED] hover:border-[#5F5A46]/30 active:scale-95 transition-all disabled:opacity-30"
                  >
                    {digit}
                  </button>
                )
              }
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={pin.length !== 4 || confirmPin.length !== 4 || isLoading}
            className={`
              w-full py-3.5 rounded-xl text-xs font-semibold tracking-[0.15em] uppercase transition-all duration-200
              ${
                isLoading
                  ? "bg-[#5F5A46] text-white"
                  : pin.length === 4 && confirmPin.length === 4
                  ? "bg-[#5F5A46] text-white hover:bg-[#4A4639] shadow-lg shadow-[#5F5A46]/20"
                  : "bg-[#E0DDD0] text-[#76746A] cursor-not-allowed"
              }
            `}
          >
            {isLoading ? "Actualizando..." : "Actualizar PIN"}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#76746A]/60 mt-10 tracking-wide">
          Arquitectura e Interiorismo
        </p>
      </div>
    </div>
  )
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5ED]">
        <p className="text-[#76746A]">Cargando...</p>
      </div>
    }>
      <ResetPinContent />
    </Suspense>
  )
}
