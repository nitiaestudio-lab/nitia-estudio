"use server"

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { verifySession } from "./session"

let _sb: SupabaseClient | null = null

function getSb(): SupabaseClient {
  if (_sb) return _sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase not configured")
  _sb = createClient(url, key)
  return _sb
}

async function requireAuth() {
  const session = await verifySession()
  if (!session) throw new Error("No autorizado")
  return session
}

// =================== LOAD ALL DATA ===================
export async function loadAllData() {
  await requireAuth()
  const sb = getSb()

  const [
    projectsR, itemsR, filesR, providersR, provDocsR,
    accountsR, movementsR, tasksR, pfR, fixedR, fcpR,
    quotesR, catsR, dollarR,
  ] = await Promise.all([
    sb.from("projects").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    sb.from("project_items").select("*").order("sort_order"),
    sb.from("project_files").select("*").order("created_at", { ascending: false }),
    sb.from("providers").select("*").is("deleted_at", null).order("name"),
    sb.from("provider_documents").select("*").order("created_at", { ascending: false }),
    sb.from("accounts").select("*").order("name"),
    sb.from("movements").select("*").order("date", { ascending: false }),
    sb.from("task_items").select("*").order("created_at", { ascending: false }),
    sb.from("personal_finance_movements").select("*").order("date", { ascending: false }),
    sb.from("nitia_fixed_costs").select("*").order("description"),
    sb.from("fixed_cost_payments").select("*"),
    sb.from("quote_comparisons").select("*").order("date", { ascending: false }),
    sb.from("categories").select("*").eq("active", true).order("sort_order"),
    sb.from("app_settings").select("value").eq("key", "dollar_blue").single(),
  ])

  return {
    projects: projectsR.data ?? [],
    projectItems: itemsR.data ?? [],
    projectFiles: filesR.data ?? [],
    providers: providersR.data ?? [],
    providerDocuments: provDocsR.data ?? [],
    accounts: accountsR.data ?? [],
    movements: movementsR.data ?? [],
    tasks: tasksR.data ?? [],
    personalFinanceMovements: pfR.data ?? [],
    nitiaFixedCosts: fixedR.data ?? [],
    fixedCostPayments: fcpR.data ?? [],
    quoteComparisons: quotesR.data ?? [],
    categories: catsR.data ?? [],
    dollarRate: dollarR.data?.value ?? null,
  }
}

// =================== GENERIC CRUD ===================
export async function serverAddRow(table: string, row: any) {
  await requireAuth()
  const sb = getSb()
  const { error } = await sb.from(table).insert(row)
  if (error) {
    console.error(`Error adding to ${table}:`, error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function serverUpdateRow(table: string, id: string, updates: any) {
  await requireAuth()
  const sb = getSb()
  const { error } = await sb.from(table).update(updates).eq("id", id)
  if (error) {
    console.error(`Error updating ${table}:`, error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function serverDeleteRow(table: string, id: string) {
  await requireAuth()
  const sb = getSb()
  const { error } = await sb.from(table).delete().eq("id", id)
  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function serverDeleteRows(table: string, ids: string[]) {
  await requireAuth()
  const sb = getSb()
  const { error } = await sb.from(table).delete().in("id", ids)
  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// =================== MOVEMENT (with account balance update) ===================
export async function serverAddMovement(movement: any) {
  await requireAuth()
  const sb = getSb()
  const { error } = await sb.from("movements").insert(movement)
  if (error) {
    console.error("Error adding movement:", error)
    return { success: false, error: error.message }
  }

  // Update account balance
  if (movement.account_id) {
    const delta = movement.type === "ingreso" ? movement.amount : -movement.amount
    const { data: account } = await sb.from("accounts").select("balance").eq("id", movement.account_id).single()
    if (account) {
      await sb.from("accounts").update({ balance: account.balance + delta }).eq("id", movement.account_id)
    }
  }

  return { success: true }
}

export async function serverDeleteMovement(id: string) {
  await requireAuth()
  const sb = getSb()

  // Get movement first to know amount/type for balance reversal
  const { data: mov } = await sb.from("movements").select("*").eq("id", id).single()
  if (!mov) return { success: false, error: "Movimiento no encontrado" }

  const { error } = await sb.from("movements").delete().eq("id", id)
  if (error) {
    console.error("Error deleting movement:", error)
    return { success: false, error: error.message }
  }

  // Reverse account balance
  if (mov.account_id) {
    const delta = mov.type === "ingreso" ? -mov.amount : mov.amount
    const { data: account } = await sb.from("accounts").select("balance").eq("id", mov.account_id).single()
    if (account) {
      await sb.from("accounts").update({ balance: account.balance + delta }).eq("id", mov.account_id)
    }
  }

  return { success: true }
}

// =================== FILE UPLOAD ===================
export async function serverUploadFile(bucket: string, path: string, fileData: ArrayBuffer, contentType: string) {
  await requireAuth()
  const sb = getSb()

  const { data, error } = await sb.storage.from(bucket).upload(path, fileData, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  })
  if (error) {
    console.error("Upload error:", error)
    return { success: false, error: error.message }
  }

  // Use signed URL (1 hour expiry)
  const { data: urlData } = await sb.storage.from(bucket).createSignedUrl(data.path, 3600)
  return { success: true, url: urlData?.signedUrl || "", path: data.path }
}
