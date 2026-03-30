"use server"

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Lazy initialization
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase not configured")
  return createClient(url, key)
}

// Obtener token del usuario actual
async function getUserToken() {
  const cookieStore = await cookies()
  return cookieStore.get("sb-access-token")?.value
}

// Obtener el rol del usuario desde el token
async function getUserRole() {
  const token = await getUserToken()
  if (!token) return null

  try {
    // Decodificar JWT para obtener el rol del usuario
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
    return payload.user_metadata?.role || null
  } catch {
    return null
  }
}

// Obtener movimientos del proyecto (solo si el usuario tiene acceso)
export async function getProjectMovements(projectId: string) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("movements")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("date", { ascending: false })

  if (error) throw error
  return data
}

// Obtener todas las cuentas personales (solo para el usuario actual)
export async function getPersonalAccounts(role: string) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner", role)
    .is("deleted_at", null)

  if (error) throw error
  return data
}

// Crear un movimiento (Soft Delete: INSERT nuevo movimiento)
export async function createMovement(movement: {
  project_id: string
  date: string
  description: string
  amount: number
  type: "ingreso" | "egreso"
  category: string
  concepto_ingreso?: string
  cuenta_destino?: string
}) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("movements")
    .insert([
      {
        ...movement,
        created_by: userRole,
        created_at: new Date().toISOString(),
      },
    ])
    .select()

  if (error) throw error
  return data?.[0]
}

// Soft delete - marcar como eliminado en vez de DELETE
export async function softDeleteMovement(movementId: string) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("movements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Soft delete para proyectos
export async function softDeleteProject(projectId: string) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Soft delete para proveedores
export async function softDeleteProvider(providerId: string) {
  const userRole = await getUserRole()
  if (!userRole) {
    throw new Error("No autorizado")
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("providers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", providerId)
    .select()

  if (error) throw error
  return data?.[0]
}

// ========== FUNCIONES DE UPDATE REAL EN SUPABASE ==========

// Actualizar proyecto
export async function updateProject(projectId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("projects")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar proveedor
export async function updateProvider(providerId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("providers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", providerId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar movimiento
export async function updateMovement(movementId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("movements")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar tarea
export async function updateTask(taskId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("task_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar cuenta
export async function updateAccount(accountId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("accounts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar costo fijo
export async function updateFixedCost(costId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("nitia_fixed_costs")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", costId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar movimiento de finanzas personales
export async function updatePersonalFinanceMovement(movementId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("personal_finance_movements")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return result?.[0]
}

// Actualizar cotización
export async function updateQuote(quoteId: string, data: Record<string, unknown>) {
  const supabase = getSupabase()
  const { data: result, error } = await supabase
    .from("quote_comparisons")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", quoteId)
    .select()

  if (error) throw error
  return result?.[0]
}

// ========== ELIMINACIÓN MASIVA ==========

// Eliminar múltiples movimientos
export async function deleteMultipleMovements(ids: string[]) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("movements")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)

  if (error) throw error
  return { success: true, count: ids.length }
}

// Eliminar múltiples tareas
export async function deleteMultipleTasks(ids: string[]) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("task_items")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)

  if (error) throw error
  return { success: true, count: ids.length }
}

// Eliminar múltiples proveedores
export async function deleteMultipleProviders(ids: string[]) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("providers")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)

  if (error) throw error
  return { success: true, count: ids.length }
}

// ========== EDICIÓN INLINE Y PERSISTENCIA ==========

// Actualizar campo individual de Costos Nitia con persistencia
export async function updateNitiaFixedCostField(costId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const updateData: Record<string, unknown> = {
    [field]: value,
    updated_at: new Date().toISOString(),
  }
  
  const { data, error } = await supabase
    .from("nitia_fixed_costs")
    .update(updateData)
    .eq("id", costId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Toggle activo/inactivo en costos
export async function toggleNitiaFixedCostActive(costId: string, currentActive: boolean) {
  return updateNitiaFixedCostField(costId, "active", !currentActive)
}

// Actualizar campo individual de Proyectos
export async function updateProjectField(projectId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("projects")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Proveedores
export async function updateProviderField(providerId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("providers")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Tareas
export async function updateTaskField(taskId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("task_items")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Cuentas
export async function updateAccountField(accountId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("accounts")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Movimientos de Cuenta
export async function updateAccountMovementField(movementId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("account_movements")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Movimientos de Proyecto
export async function updateProjectMovementField(movementId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("project_movements")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Finanzas Personales
export async function updatePersonalFinanceField(movementId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("personal_finance_movements")
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", movementId)
    .select()

  if (error) throw error
  return data?.[0]
}

// Actualizar campo individual de Cotizaciones
export async function updateQuoteField(quoteId: string, field: string, value: unknown) {
  const supabase = getSupabase()
  const updateData: Record<string, unknown> = {
    [field]: value,
    updated_at: new Date().toISOString(),
  }
  
  // Si se actualiza el costo, recalcular precios y ganancias
  if (field === "cost" && typeof value === "number") {
    updateData.priceX14 = value * 1.4
    updateData.priceX16 = value * 1.6
    updateData.gananciaX14 = value * 0.4
    updateData.gananciaX16 = value * 0.6
  }
  
  const { data, error } = await supabase
    .from("quote_comparisons")
    .update(updateData)
    .eq("id", quoteId)
    .select()

  if (error) throw error
  return data?.[0]
}

// ========== OBTENER DATOS CON FILTROS ==========

// Obtener costos Nitia por período
export async function getNitiaFixedCostsByPeriod(startDate: string, endDate: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("nitia_fixed_costs")
    .select("*")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

// Obtener todos los costos Nitia activos
export async function getActiveNitiaFixedCosts() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("nitia_fixed_costs")
    .select("*")
    .eq("active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

// Soft delete para costo Nitia
export async function softDeleteNitiaFixedCost(costId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("nitia_fixed_costs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", costId)
    .select()

  if (error) throw error
  return data?.[0]
}
