"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type {
  AppData, RoleKey, Section, Project, ProjectItem, ProjectFile,
  Provider, ProviderDocument, Movement, Account, Task,
  FixedExpense, FixedCostPayment, PersonalFinanceMovement,
  QuoteComparison, Category, DollarRate
} from "./types"
import { loadAllData, serverAddRow, serverUpdateRow, serverDeleteRow, serverDeleteRows, serverAddMovement, serverDeleteMovement, serverUploadFile } from "./data-actions"
import { logout as serverLogout } from "./auth-actions"
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
      // Destroy server-side session
      serverLogout().catch(() => {})
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

  // Load ALL data via server action (authenticated)
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await loadAllData()
      setData({
        projects: result.projects as Project[],
        projectItems: result.projectItems as ProjectItem[],
        projectFiles: result.projectFiles as ProjectFile[],
        providers: result.providers as Provider[],
        providerDocuments: result.providerDocuments as ProviderDocument[],
        accounts: result.accounts as Account[],
        movements: result.movements as Movement[],
        tasks: result.tasks as Task[],
        personalFinanceMovements: result.personalFinanceMovements as PersonalFinanceMovement[],
        nitiaFixedCosts: result.nitiaFixedCosts as FixedExpense[],
        fixedCostPayments: result.fixedCostPayments as FixedCostPayment[],
        quoteComparisons: result.quoteComparisons as QuoteComparison[],
        categories: result.categories as Category[],
        dollarRate: (result.dollarRate as DollarRate) ?? null,
      })
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (role) loadData() }, [role, loadData])

  // Auto-fetch dollar rate on load and every 4 hours (only when logged in)
  useEffect(() => {
    if (!role) return
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
  }, [role])

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

  // =================== GENERIC CRUD (via server actions) ===================
  const addRow = useCallback(async (
    table: string, row: any, dataKey: keyof AppData
  ) => {
    setData(prev => ({ ...prev, [dataKey]: [row, ...(prev[dataKey] as any[])] }))
    setIsSyncing(true)
    try {
      const result = await serverAddRow(table, row)
      if (!result.success) {
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
      const result = await serverUpdateRow(table, id, updates)
      if (!result.success) {
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
      const result = await serverDeleteRow(table, id)
      if (!result.success) {
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
      const result = await serverDeleteRows(table, ids)
      if (!result.success) {
        setData(p => ({ ...p, [dataKey]: [...(p[dataKey] as any[]), ...prevItems] }))
        toast.error("Error al eliminar")
      } else { toast.success(`${ids.length} eliminado(s)`) }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data])

  // =================== MOVEMENTS (via server actions) ===================
  const addMovement = useCallback(async (movement: Movement) => {
    setData(prev => {
      const newData = { ...prev, movements: [movement, ...prev.movements] }
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
      const result = await serverAddMovement(movement)
      if (!result.success) {
        setData(prev => ({
          ...prev,
          movements: prev.movements.filter(m => m.id !== movement.id)
        }))
        toast.error("Error al registrar movimiento")
      } else {
        toast.success("Movimiento registrado")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [])

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
      const result = await serverDeleteMovement(id)
      if (!result.success) {
        toast.error("Error al eliminar movimiento")
        await loadData()
      } else {
        toast.success("Movimiento eliminado")
      }
    } catch { toast.error("Error de conexion") }
    finally { setIsSyncing(false) }
  }, [data.movements, data.accounts, loadData])

  // =================== FILE UPLOAD (via server action) ===================
  const uploadFile = useCallback(async (bucket: string, path: string, file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const result = await serverUploadFile(bucket, path, buffer, file.type)
      if (!result.success) {
        toast.error("Error al subir archivo")
        return null
      }
      return { url: result.url!, path: result.path! }
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
