"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type {
  AppData, RoleKey, Section, Project, ProjectItem, ProjectFile,
  Provider, ProviderDocument, Movement, Account, Task,
  FixedExpense, FixedCostPayment, PersonalFinanceMovement,
  QuoteComparison, Category, DollarRate
} from "./types"
import { createClient } from "./supabase/client"
import { toast } from "sonner"

const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000

const EMPTY_DATA: AppData = {
  projects: [], projectItems: [], projectFiles: [],
  providers: [], providerDocuments: [],
  accounts: [], movements: [], tasks: [],
  personalFinanceMovements: [], nitiaFixedCosts: [],
  fixedCostPayments: [], quoteComparisons: [], categories: [],
  dollarRate: null,
}

interface AppContextType {
  role: RoleKey | null
  setRole: (role: RoleKey | null) => void
  userPermissions: Record<string, boolean>
  setUserPermissions: (p: Record<string, boolean>) => void
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  section: Section
  setSection: (section: Section) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  selectedProviderId: string | null
  setSelectedProviderId: (id: string | null) => void
  isLoading: boolean
  isSyncing: boolean

  // Generic CRUD
  addRow: (table: string, row: any, dataKey: keyof AppData) => Promise<void>
  updateRow: (table: string, id: string, updates: any, dataKey: keyof AppData) => Promise<void>
  deleteRow: (table: string, id: string, dataKey: keyof AppData) => Promise<void>
  deleteRows: (table: string, ids: string[], dataKey: keyof AppData) => Promise<void>

  // Movement helpers (auto-update account balance)
  addMovement: (movement: Movement) => Promise<void>
  deleteMovement: (id: string) => Promise<void>

  // Upload files
  uploadFile: (bucket: string, path: string, file: File) => Promise<{ url: string; path: string } | null>

  // Refresh
  refreshData: () => Promise<void>

  // Dollar rate
  fetchDollarRate: () => Promise<void>
  setManualDollarRate: (buy: number, sell: number) => Promise<void>
  clearDollarOverride: () => Promise<void>

  // Categories
  getCategoriesFor: (type: string) => Category[]
  addCategory: (type: string, name: string, has_multiplier?: boolean) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleInternal] = useState<RoleKey | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({})
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [section, setSection] = useState<Section>("dashboard")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const setRole = useCallback((newRole: RoleKey | null) => {
    if (newRole) {
      localStorage.setItem("nitia_session_start", Date.now().toString())
      localStorage.setItem("nitia_role", newRole)
    } else {
      localStorage.removeItem("nitia_session_start")
      localStorage.removeItem("nitia_role")
      localStorage.removeItem("nitia_permissions")
      setUserPermissions({})
    }
    setRoleInternal(newRole)
  }, [])

  // Session expiry
  useEffect(() => {
    const check = () => {
      const start = localStorage.getItem("nitia_session_start")
      const saved = localStorage.getItem("nitia_role")
      if (start && saved) {
        if (Date.now() - parseInt(start, 10) > SESSION_EXPIRY_MS) {
          localStorage.removeItem("nitia_session_start")
          localStorage.removeItem("nitia_role")
          localStorage.removeItem("nitia_permissions")
          setRoleInternal(null)
          setUserPermissions({})
          toast.error("Tu sesion ha expirado.")
        } else if (!role) {
          setRoleInternal(saved)
          try {
            const savedPerms = localStorage.getItem("nitia_permissions")
            if (savedPerms) setUserPermissions(JSON.parse(savedPerms))
          } catch {}
        }
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [role])

  // Load ALL data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const sb = createClient()
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

      setData({
        projects: (projectsR.data ?? []) as Project[],
        projectItems: (itemsR.data ?? []) as ProjectItem[],
        projectFiles: (filesR.data ?? []) as ProjectFile[],
        providers: (providersR.data ?? []) as Provider[],
        providerDocuments: (provDocsR.data ?? []) as ProviderDocument[],
        accounts: (accountsR.data ?? []) as Account[],
        movements: (movementsR.data ?? []) as Movement[],
        tasks: (tasksR.data ?? []) as Task[],
        personalFinanceMovements: (pfR.data ?? []) as PersonalFinanceMovement[],
        nitiaFixedCosts: (fixedR.data ?? []) as FixedExpense[],
        fixedCostPayments: (fcpR.data ?? []) as FixedCostPayment[],
        quoteComparisons: (quotesR.data ?? []) as QuoteComparison[],
        categories: (catsR.data ?? []) as Category[],
        dollarRate: (dollarR.data?.value as DollarRate) ?? null,
      })
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-fetch dollar rate on load and every 4 hours
  useEffect(() => {
    const checkAndFetch = async () => {
      try {
        const res = await fetch("/api/dollar-rate")
        const json = await res.json()
        const dr = json.data
        if (!dr || !dr.last_api_fetch || (Date.now() - new Date(dr.last_api_fetch).getTime() > 4 * 60 * 60 * 1000)) {
          // Stale or never fetched — auto refresh from API (unless manual override)
          if (!dr?.manual_override) {
            const r2 = await fetch("/api/dollar-rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fetch" }) })
            const j2 = await r2.json()
            if (j2.ok) setData(prev => ({ ...prev, dollarRate: j2.data }))
          }
        }
      } catch {}
    }
    checkAndFetch()
    const interval = setInterval(checkAndFetch, 4 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const refreshData = useCallback(async () => { await loadData() }, [loadData])

  // Dollar rate helpers
  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "x-nitia-role": role || "",
  }), [role])

  const fetchDollarRate = useCallback(async () => {
    try {
      const res = await fetch("/api/dollar-rate", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "fetch" }) })
      const json = await res.json()
      if (json.ok) setData(prev => ({ ...prev, dollarRate: json.data }))
      else toast.error("No se pudo obtener cotización del dólar")
    } catch { toast.error("Error al consultar dólar blue") }
  }, [authHeaders])

  const setManualDollarRate = useCallback(async (buy: number, sell: number) => {
    try {
      const res = await fetch("/api/dollar-rate", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "manual", buy, sell }) })
      const json = await res.json()
      if (json.ok) { setData(prev => ({ ...prev, dollarRate: json.data })); toast.success("Cotización actualizada") }
    } catch { toast.error("Error al guardar cotización") }
  }, [authHeaders])

  const clearDollarOverride = useCallback(async () => {
    try {
      const res = await fetch("/api/dollar-rate", { method: "POST", headers: authHeaders(), body: JSON.stringify({ action: "clear_override" }) })
      const json = await res.json()
      if (json.ok) { setData(prev => ({ ...prev, dollarRate: json.data })); toast.success("Cotización actualizada desde API") }
    } catch { toast.error("Error al actualizar") }
  }, [authHeaders])

  // =================== GENERIC CRUD ===================
  const addRow = useCallback(async (
    table: string, row: any, dataKey: keyof AppData
  ) => {
    // Optimistic
    setData(prev => ({ ...prev, [dataKey]: [row, ...(prev[dataKey] as any[])] }))
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from(table).insert(row)
      if (error) {
        console.error(`Error adding to ${table}:`, error)
        setData(prev => ({
          ...prev,
          [dataKey]: (prev[dataKey] as any[]).filter((r: any) => r.id !== row.id)
        }))
        toast.error("Error al guardar")
      } else {
        toast.success("Guardado")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [])

  const updateRow = useCallback(async (
    table: string, id: string, updates: any, dataKey: keyof AppData
  ) => {
    const prev = (data[dataKey] as any[]).find((r: any) => r.id === id)
    setData(p => ({
      ...p,
      [dataKey]: (p[dataKey] as any[]).map((r: any) => r.id === id ? { ...r, ...updates } : r)
    }))
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from(table).update(updates).eq("id", id)
      if (error) {
        console.error(`Error updating ${table}:`, error)
        if (prev) setData(p => ({
          ...p, [dataKey]: (p[dataKey] as any[]).map((r: any) => r.id === id ? prev : r)
        }))
        toast.error("Error al actualizar")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data])

  const deleteRow = useCallback(async (table: string, id: string, dataKey: keyof AppData) => {
    const prev = (data[dataKey] as any[]).find((r: any) => r.id === id)
    setData(p => ({
      ...p, [dataKey]: (p[dataKey] as any[]).filter((r: any) => r.id !== id)
    }))
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from(table).delete().eq("id", id)
      if (error) {
        if (prev) setData(p => ({ ...p, [dataKey]: [...(p[dataKey] as any[]), prev] }))
        toast.error("Error al eliminar")
      } else { toast.success("Eliminado") }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data])

  const deleteRows = useCallback(async (table: string, ids: string[], dataKey: keyof AppData) => {
    const prevItems = (data[dataKey] as any[]).filter((r: any) => ids.includes(r.id))
    setData(p => ({
      ...p, [dataKey]: (p[dataKey] as any[]).filter((r: any) => !ids.includes(r.id))
    }))
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from(table).delete().in("id", ids)
      if (error) {
        setData(p => ({ ...p, [dataKey]: [...(p[dataKey] as any[]), ...prevItems] }))
        toast.error("Error al eliminar")
      } else { toast.success(`${ids.length} eliminado(s)`) }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data])

  // =================== MOVEMENTS (auto-update account balance) ===================
  const addMovement = useCallback(async (movement: Movement) => {
    setData(prev => {
      const newData = { ...prev, movements: [movement, ...prev.movements] }
      // Update account balance in-memory
      if (movement.account_id) {
        const delta = movement.type === "ingreso" ? movement.amount : -movement.amount
        newData.accounts = prev.accounts.map(a =>
          a.id === movement.account_id ? { ...a, balance: a.balance + delta } : a
        )
      }
      return newData
    })
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from("movements").insert(movement)
      if (error) {
        setData(prev => ({
          ...prev,
          movements: prev.movements.filter(m => m.id !== movement.id)
        }))
        toast.error("Error al registrar movimiento")
      } else {
        // Update account balance in DB
        if (movement.account_id) {
          const delta = movement.type === "ingreso" ? movement.amount : -movement.amount
          // Update account balance directly
          const account = data.accounts.find(a => a.id === movement.account_id)
          if (account) {
            await sb.from("accounts").update({ balance: account.balance + delta }).eq("id", movement.account_id)
          }
        }
        toast.success("Movimiento registrado")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data.accounts])

  const deleteMovement = useCallback(async (id: string) => {
    const mov = data.movements.find(m => m.id === id)
    if (!mov) return
    
    setData(prev => {
      const newData = { ...prev, movements: prev.movements.filter(m => m.id !== id) }
      if (mov.account_id) {
        const delta = mov.type === "ingreso" ? -mov.amount : mov.amount
        newData.accounts = prev.accounts.map(a =>
          a.id === mov.account_id ? { ...a, balance: a.balance + delta } : a
        )
      }
      return newData
    })
    setIsSyncing(true)
    try {
      const sb = createClient()
      const { error } = await sb.from("movements").delete().eq("id", id)
      if (error) {
        toast.error("Error al eliminar movimiento")
        await loadData() // Reload to sync
      } else {
        if (mov.account_id) {
          const delta = mov.type === "ingreso" ? -mov.amount : mov.amount
          const account = data.accounts.find(a => a.id === mov.account_id)
          if (account) {
            await sb.from("accounts").update({ balance: account.balance + delta }).eq("id", mov.account_id)
          }
        }
        toast.success("Movimiento eliminado")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data.movements, data.accounts, loadData])

  // =================== FILE UPLOAD ===================
  const uploadFile = useCallback(async (bucket: string, path: string, file: File) => {
    try {
      const sb = createClient()
      const { data: uploadData, error } = await sb.storage.from(bucket).upload(path, file, {
        cacheControl: "3600", upsert: false,
      })
      if (error) {
        console.error("Upload error:", error)
        toast.error("Error al subir archivo")
        return null
      }
      // Use signed URL (1 hour expiry) instead of public URL
      const { data: urlData } = await sb.storage.from(bucket).createSignedUrl(uploadData.path, 3600)
      return { url: urlData?.signedUrl || "", path: uploadData.path }
    } catch {
      toast.error("Error al subir archivo")
      return null
    }
  }, [])

  // =================== CATEGORIES ===================
  const getCategoriesFor = useCallback((type: string) => {
    return data.categories.filter(c => c.type === type && c.active)
  }, [data.categories])

  const addCategory = useCallback(async (type: string, name: string, has_multiplier?: boolean) => {
    const maxOrder = data.categories
      .filter(c => c.type === type)
      .reduce((max, c) => Math.max(max, c.sort_order), 0)
    const cat: Category = {
      id: crypto.randomUUID(),
      type, name, active: true,
      sort_order: maxOrder + 1,
      has_multiplier: has_multiplier ?? true,
    }
    await addRow("categories", cat as any, "categories")
  }, [data.categories, addRow])

  const deleteCategory = useCallback(async (name: string) => {
    const cat = data.categories.find(c => c.name === name)
    if (cat) {
      await updateRow("categories", cat.id, { active: false }, "categories")
    }
  }, [data.categories, updateRow])

  return (
    <AppContext.Provider value={{
      role, setRole, userPermissions, setUserPermissions, data, setData, section, setSection,
      selectedProjectId, setSelectedProjectId,
      selectedProviderId, setSelectedProviderId,
      isLoading, isSyncing,
      addRow, updateRow, deleteRow, deleteRows,
      addMovement, deleteMovement,
      uploadFile, refreshData,
      fetchDollarRate, setManualDollarRate, clearDollarOverride,
      getCategoriesFor, addCategory, deleteCategory,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

export function canSee(role: RoleKey | null, permissions?: Record<string, boolean>): boolean {
  if (role === "paula" || role === "cami") return true
  if (permissions?.ver_finanzas) return true
  return false
}
