// Nitia Estudio - No more seed data, everything comes from Supabase
import type { RoleKey } from "./types"

// Role visibility check
export function canSee(role: RoleKey | null, permissions?: Record<string, boolean>): boolean {
  if (role === "paula" || role === "cami") return true
  if (permissions?.ver_finanzas) return true
  return false
}

export const ROLES: Record<string, { name: string; label: string; full: boolean; partner: string | null }> = {
  paula: { name: "paula", label: "Paula", full: true, partner: "cami" },
  cami: { name: "cami", label: "Cami", full: true, partner: "paula" },
}

export const partnerKey = (r: RoleKey | null): "paula" | "cami" | null => {
  if (r === "paula" || r === "cami") return r
  return null
}
