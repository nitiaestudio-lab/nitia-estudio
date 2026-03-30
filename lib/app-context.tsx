"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { AppData, RoleKey, Section, Project, Provider, Task, AccountMovement, FixedExpense, GlobalMovement, QuoteComparison, Account, VariableExpense, NitiaIncome } from "./types"
import { SEED_DATA } from "./seed-data"
import { createClient } from "./supabase/client"
import { toast } from "sonner"

// Session expiration: 8 hours
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000

interface AppContextType {
  role: RoleKey | null
  setRole: (role: RoleKey | null) => void
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  section: Section
  setSection: (section: Section) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  isLoading: boolean
  isSyncing: boolean
  lastSyncError: string | null

  // Helper functions - all persist to Supabase
  getProject: (id: string) => Project | undefined
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  addProject: (project: Project) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  deleteProjects: (ids: string[]) => Promise<void>

  getProvider: (id: string) => Provider | undefined
  updateProvider: (id: string, updates: Partial<Provider>) => Promise<void>
  addProvider: (provider: Provider) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  deleteProviders: (ids: string[]) => Promise<void>

  addTask: (task: Task) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteTasks: (ids: string[]) => Promise<void>

  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>
  addAccountMovement: (movement: AccountMovement) => Promise<void>
  deleteAccountMovement: (id: string) => Promise<void>
  deleteAccountMovements: (ids: string[]) => Promise<void>

  updateNitiaFixedCost: (id: string, updates: Partial<FixedExpense>) => Promise<void>
  addNitiaFixedCost: (cost: FixedExpense) => Promise<void>
  deleteNitiaFixedCost: (id: string) => Promise<void>
  deleteNitiaFixedCosts: (ids: string[]) => Promise<void>

  // Global movements
  addGlobalMovement: (movement: GlobalMovement) => Promise<void>
  updateGlobalMovement: (id: string, updates: Partial<GlobalMovement>) => Promise<void>
  deleteGlobalMovement: (id: string) => Promise<void>
  deleteGlobalMovements: (ids: string[]) => Promise<void>

  // Quote comparisons
  addQuoteComparison: (quote: QuoteComparison) => Promise<void>
  updateQuoteComparison: (id: string, updates: Partial<QuoteComparison>) => Promise<void>
  deleteQuoteComparison: (id: string) => Promise<void>
  deleteQuoteComparisons: (ids: string[]) => Promise<void>
  selectQuote: (id: string) => Promise<void>
  toggleQuoteSelection: (id: string) => Promise<void>

  // Personal Finance
  addPersonalFinanceVariable: (partner: RoleKey, expense: VariableExpense) => Promise<void>
  updatePersonalFinanceVariable: (id: string, updates: Partial<VariableExpense>) => Promise<void>
  deletePersonalFinanceVariable: (id: string) => Promise<void>
  addPersonalFinanceFixed: (partner: RoleKey, expense: FixedExpense) => Promise<void>
  updatePersonalFinanceFixed: (id: string, updates: Partial<FixedExpense>) => Promise<void>
  deletePersonalFinanceFixed: (id: string) => Promise<void>
  addPersonalFinanceIncome: (partner: RoleKey, income: NitiaIncome) => Promise<void>
  updatePersonalFinanceIncome: (id: string, updates: Partial<NitiaIncome>) => Promise<void>
  deletePersonalFinanceIncome: (id: string) => Promise<void>

  // Reload data from DB
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleInternal] = useState<RoleKey | null>(null)
  const [data, setData] = useState<AppData>(SEED_DATA)
  const [section, setSection] = useState<Section>("dashboard")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)

  // Handle role changes with session expiry
  const setRole = useCallback((newRole: RoleKey | null) => {
    if (newRole) {
      if (typeof window !== "undefined") {
        localStorage.setItem("nitia_session_start", Date.now().toString())
        localStorage.setItem("nitia_role", newRole)
      }
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nitia_session_start")
        localStorage.removeItem("nitia_role")
      }
    }
    setRoleInternal(newRole)
  }, [])

  // Check session expiry on mount and periodically
  useEffect(() => {
    const checkSessionExpiry = () => {
      if (typeof window === "undefined") return
      const sessionStart = localStorage.getItem("nitia_session_start")
      const savedRole = localStorage.getItem("nitia_role") as RoleKey | null
      
      if (sessionStart && savedRole) {
        const elapsed = Date.now() - parseInt(sessionStart, 10)
        if (elapsed > SESSION_EXPIRY_MS) {
          localStorage.removeItem("nitia_session_start")
          localStorage.removeItem("nitia_role")
          setRoleInternal(null)
          toast.error("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.")
        } else if (!role) {
          // Restore role from localStorage on mount
          setRoleInternal(savedRole)
        }
      }
    }

    checkSessionExpiry()
    const interval = setInterval(checkSessionExpiry, 60 * 1000)
    return () => clearInterval(interval)
  }, [role])

  // Load data from Supabase on mount
  const loadDataFromSupabase = useCallback(async () => {
    setIsLoading(true)
    setLastSyncError(null)

    try {
      const supabase = createClient()

      // Load all data in parallel
      const [
        projectsRes,
        providersRes,
        accountsRes,
        tasksRes,
        globalMovementsRes,
        quoteComparisonsRes,
        fixedCostsRes,
        accountMovementsRes,
        personalFinanceRes,
      ] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("providers").select("*").order("name"),
        supabase.from("accounts").select("*"),
        supabase.from("task_items").select("*").order("created_at", { ascending: false }),
        supabase.from("global_movements").select("*").order("date", { ascending: false }),
        supabase.from("quote_comparisons").select("*").order("date", { ascending: false }),
        supabase.from("nitia_fixed_costs").select("*"),
        supabase.from("account_movements").select("*").order("date", { ascending: false }),
        supabase.from("personal_finance_movements").select("*").order("date", { ascending: false }),
      ])

      // Check for errors
      const errors = [
        projectsRes.error,
        providersRes.error,
        accountsRes.error,
        tasksRes.error,
        globalMovementsRes.error,
        quoteComparisonsRes.error,
        fixedCostsRes.error,
        accountMovementsRes.error,
        personalFinanceRes.error,
      ].filter(Boolean)

      if (errors.length > 0) {
        console.error("Errors loading data:", errors)
        setLastSyncError("Error al cargar datos. Algunos datos pueden estar desactualizados.")
      }

      // Process personal finance data
      const personalFinanceMovements = (personalFinanceRes.data || []) as Array<any>
      const personalFinanceByPartner: Record<string, any> = {
        paula: {
          fixedExpenses: [],
          variableExpenses: [],
          nitiaIncome: [],
        },
        cami: {
          fixedExpenses: [],
          variableExpenses: [],
          nitiaIncome: [],
        },
      }

      personalFinanceMovements.forEach((movement) => {
        const partner = movement.owner as "paula" | "cami"
        if (!partner || !personalFinanceByPartner[partner]) return

        if (movement.type === "egreso" && movement.is_fixed) {
          personalFinanceByPartner[partner].fixedExpenses.push({
            id: movement.id,
            description: movement.description,
            amount: movement.amount,
            category: movement.category,
            active: movement.active,
          })
        } else if (movement.type === "egreso") {
          personalFinanceByPartner[partner].variableExpenses.push({
            id: movement.id,
            date: movement.date,
            description: movement.description,
            amount: movement.amount,
            category: movement.category,
          })
        } else if (movement.type === "ingreso") {
          personalFinanceByPartner[partner].nitiaIncome.push({
            id: movement.id,
            date: movement.date,
            description: movement.description,
            amount: movement.amount,
            note: movement.note || "",
          })
        }
      })

      setData(prev => ({
        ...prev,
        projects: (projectsRes.data || []) as Project[],
        providers: (providersRes.data || []) as Provider[],
        accounts: (accountsRes.data || []) as Account[],
        tasks: (tasksRes.data || []) as Task[],
        globalMovements: (globalMovementsRes.data || []) as GlobalMovement[],
        quoteComparisons: (quoteComparisonsRes.data || []) as QuoteComparison[],
        nitiaFixedCosts: (fixedCostsRes.data || []) as FixedExpense[],
        accountMovements: (accountMovementsRes.data || []) as AccountMovement[],
        personalFinance: personalFinanceByPartner as any,
      }))

    } catch (error) {
      console.error("Error loading data from Supabase:", error)
      setLastSyncError("Error de conexión. Usando datos locales.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadDataFromSupabase()
  }, [loadDataFromSupabase])

  const refreshData = useCallback(async () => {
    await loadDataFromSupabase()
  }, [loadDataFromSupabase])

  // ==================== PROJECTS ====================
  const getProject = useCallback(
    (id: string) => data.projects.find((p) => p.id === id),
    [data.projects]
  )

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    // 1. Optimistic update
    const previousData = data.projects.find(p => p.id === id)
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))

    // 2. Persist to Supabase
    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("projects").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating project:", error)
        // Revert on error
        if (previousData) {
          setData((prev) => ({
            ...prev,
            projects: prev.projects.map((p) => (p.id === id ? previousData : p)),
          }))
        }
        toast.error("Error al guardar proyecto. Recargá la página.")
      }
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error("Error de conexión al guardar.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.projects])

  const addProject = useCallback(async (project: Project) => {
    // 1. Optimistic update
    setData((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
    }))

    // 2. Persist to Supabase
    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("projects").insert(project)
      
      if (error) {
        console.error("Error adding project:", error)
        // Revert on error
        setData((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== project.id),
        }))
        toast.error("Error al crear proyecto. Recargá la página.")
      } else {
        toast.success("Proyecto creado")
      }
    } catch (error) {
      console.error("Error adding project:", error)
      toast.error("Error de conexión al crear proyecto.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    // 1. Optimistic update
    const previousProject = data.projects.find(p => p.id === id)
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }))

    // 2. Persist to Supabase
    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("projects").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting project:", error)
        // Revert on error
        if (previousProject) {
          setData((prev) => ({
            ...prev,
            projects: [...prev.projects, previousProject],
          }))
        }
        toast.error("Error al eliminar proyecto.")
      } else {
        toast.success("Proyecto eliminado")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error("Error de conexión al eliminar.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.projects])

  const deleteProjects = useCallback(async (ids: string[]) => {
    // 1. Optimistic update
    const previousProjects = data.projects.filter(p => ids.includes(p.id))
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => !ids.includes(p.id)),
    }))

    // 2. Persist to Supabase
    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("projects").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting projects:", error)
        setData((prev) => ({
          ...prev,
          projects: [...prev.projects, ...previousProjects],
        }))
        toast.error("Error al eliminar proyectos.")
      } else {
        toast.success(`${ids.length} proyecto(s) eliminado(s)`)
      }
    } catch (error) {
      console.error("Error deleting projects:", error)
      toast.error("Error de conexión al eliminar.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.projects])

  // ==================== PROVIDERS ====================
  const getProvider = useCallback(
    (id: string) => data.providers.find((p) => p.id === id),
    [data.providers]
  )

  const updateProvider = useCallback(async (id: string, updates: Partial<Provider>) => {
    const previousData = data.providers.find(p => p.id === id)
    setData((prev) => ({
      ...prev,
      providers: prev.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("providers").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating provider:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            providers: prev.providers.map((p) => (p.id === id ? previousData : p)),
          }))
        }
        toast.error("Error al guardar proveedor.")
      }
    } catch (error) {
      console.error("Error updating provider:", error)
      toast.error("Error de conexión al guardar.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.providers])

  const addProvider = useCallback(async (provider: Provider) => {
    setData((prev) => ({
      ...prev,
      providers: [...prev.providers, provider],
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("providers").insert(provider)
      
      if (error) {
        console.error("Error adding provider:", error)
        setData((prev) => ({
          ...prev,
          providers: prev.providers.filter((p) => p.id !== provider.id),
        }))
        toast.error("Error al crear proveedor.")
      } else {
        toast.success("Proveedor creado")
      }
    } catch (error) {
      console.error("Error adding provider:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const deleteProvider = useCallback(async (id: string) => {
    const previousProvider = data.providers.find(p => p.id === id)
    setData((prev) => ({
      ...prev,
      providers: prev.providers.filter((p) => p.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("providers").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting provider:", error)
        if (previousProvider) {
          setData((prev) => ({
            ...prev,
            providers: [...prev.providers, previousProvider],
          }))
        }
        toast.error("Error al eliminar proveedor.")
      } else {
        toast.success("Proveedor eliminado")
      }
    } catch (error) {
      console.error("Error deleting provider:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.providers])

  const deleteProviders = useCallback(async (ids: string[]) => {
    const previousProviders = data.providers.filter(p => ids.includes(p.id))
    setData((prev) => ({
      ...prev,
      providers: prev.providers.filter((p) => !ids.includes(p.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("providers").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting providers:", error)
        setData((prev) => ({
          ...prev,
          providers: [...prev.providers, ...previousProviders],
        }))
        toast.error("Error al eliminar proveedores.")
      } else {
        toast.success(`${ids.length} proveedor(es) eliminado(s)`)
      }
    } catch (error) {
      console.error("Error deleting providers:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.providers])

  // ==================== TASKS ====================
  const addTask = useCallback(async (task: Task) => {
    setData((prev) => ({
      ...prev,
      tasks: [task, ...prev.tasks],
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("task_items").insert(task)
      
      if (error) {
        console.error("Error adding task:", error)
        setData((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== task.id),
        }))
        toast.error("Error al crear tarea.")
      } else {
        toast.success("Tarea creada")
      }
    } catch (error) {
      console.error("Error adding task:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const previousData = data.tasks.find(t => t.id === id)
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("task_items").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating task:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === id ? previousData : t)),
          }))
        }
        toast.error("Error al actualizar tarea.")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.tasks])

  const deleteTask = useCallback(async (id: string) => {
    const previousTask = data.tasks.find(t => t.id === id)
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("task_items").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting task:", error)
        if (previousTask) {
          setData((prev) => ({
            ...prev,
            tasks: [...prev.tasks, previousTask],
          }))
        }
        toast.error("Error al eliminar tarea.")
      } else {
        toast.success("Tarea eliminada")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.tasks])

  const deleteTasks = useCallback(async (ids: string[]) => {
    const previousTasks = data.tasks.filter(t => ids.includes(t.id))
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => !ids.includes(t.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("task_items").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting tasks:", error)
        setData((prev) => ({
          ...prev,
          tasks: [...prev.tasks, ...previousTasks],
        }))
        toast.error("Error al eliminar tareas.")
      } else {
        toast.success(`${ids.length} tarea(s) eliminada(s)`)
      }
    } catch (error) {
      console.error("Error deleting tasks:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.tasks])

  // ==================== ACCOUNTS ====================
  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    const previousData = data.accounts.find(a => a.id === id)
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("accounts").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating account:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            accounts: prev.accounts.map((a) => (a.id === id ? previousData : a)),
          }))
        }
        toast.error("Error al actualizar cuenta.")
      }
    } catch (error) {
      console.error("Error updating account:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.accounts])

  const addAccountMovement = useCallback(async (movement: AccountMovement) => {
    setData((prev) => ({
      ...prev,
      accountMovements: [movement, ...prev.accountMovements],
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("account_movements").insert(movement)
      
      if (error) {
        console.error("Error adding account movement:", error)
        setData((prev) => ({
          ...prev,
          accountMovements: prev.accountMovements.filter((m) => m.id !== movement.id),
        }))
        toast.error("Error al registrar movimiento.")
      }
    } catch (error) {
      console.error("Error adding account movement:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const deleteAccountMovement = useCallback(async (id: string) => {
    const previousMovement = data.accountMovements.find(m => m.id === id)
    setData((prev) => ({
      ...prev,
      accountMovements: prev.accountMovements.filter((m) => m.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("account_movements").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting account movement:", error)
        if (previousMovement) {
          setData((prev) => ({
            ...prev,
            accountMovements: [...prev.accountMovements, previousMovement],
          }))
        }
        toast.error("Error al eliminar movimiento.")
      }
    } catch (error) {
      console.error("Error deleting account movement:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.accountMovements])

  const deleteAccountMovements = useCallback(async (ids: string[]) => {
    const previousMovements = data.accountMovements.filter(m => ids.includes(m.id))
    setData((prev) => ({
      ...prev,
      accountMovements: prev.accountMovements.filter((m) => !ids.includes(m.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("account_movements").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting account movements:", error)
        setData((prev) => ({
          ...prev,
          accountMovements: [...prev.accountMovements, ...previousMovements],
        }))
        toast.error("Error al eliminar movimientos.")
      } else {
        toast.success(`${ids.length} movimiento(s) eliminado(s)`)
      }
    } catch (error) {
      console.error("Error deleting account movements:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.accountMovements])

  // ==================== NITIA FIXED COSTS ====================
  const updateNitiaFixedCost = useCallback(async (id: string, updates: Partial<FixedExpense>) => {
    const previousData = data.nitiaFixedCosts.find(c => c.id === id)
    setData((prev) => ({
      ...prev,
      nitiaFixedCosts: prev.nitiaFixedCosts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("nitia_fixed_costs").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating fixed cost:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            nitiaFixedCosts: prev.nitiaFixedCosts.map((c) => (c.id === id ? previousData : c)),
          }))
        }
        toast.error("Error al actualizar costo fijo.")
      }
    } catch (error) {
      console.error("Error updating fixed cost:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.nitiaFixedCosts])

  const addNitiaFixedCost = useCallback(async (cost: FixedExpense) => {
    setData((prev) => ({
      ...prev,
      nitiaFixedCosts: [...prev.nitiaFixedCosts, cost],
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("nitia_fixed_costs").insert(cost)
      
      if (error) {
        console.error("Error adding fixed cost:", error)
        setData((prev) => ({
          ...prev,
          nitiaFixedCosts: prev.nitiaFixedCosts.filter((c) => c.id !== cost.id),
        }))
        toast.error("Error al crear costo fijo.")
      } else {
        toast.success("Costo fijo agregado")
      }
    } catch (error) {
      console.error("Error adding fixed cost:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const deleteNitiaFixedCost = useCallback(async (id: string) => {
    const previousCost = data.nitiaFixedCosts.find(c => c.id === id)
    setData((prev) => ({
      ...prev,
      nitiaFixedCosts: prev.nitiaFixedCosts.filter((c) => c.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("nitia_fixed_costs").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting fixed cost:", error)
        if (previousCost) {
          setData((prev) => ({
            ...prev,
            nitiaFixedCosts: [...prev.nitiaFixedCosts, previousCost],
          }))
        }
        toast.error("Error al eliminar costo fijo.")
      } else {
        toast.success("Costo fijo eliminado")
      }
    } catch (error) {
      console.error("Error deleting fixed cost:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.nitiaFixedCosts])

  const deleteNitiaFixedCosts = useCallback(async (ids: string[]) => {
    const previousCosts = data.nitiaFixedCosts.filter(c => ids.includes(c.id))
    setData((prev) => ({
      ...prev,
      nitiaFixedCosts: prev.nitiaFixedCosts.filter((c) => !ids.includes(c.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("nitia_fixed_costs").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting fixed costs:", error)
        setData((prev) => ({
          ...prev,
          nitiaFixedCosts: [...prev.nitiaFixedCosts, ...previousCosts],
        }))
        toast.error("Error al eliminar costos fijos.")
      } else {
        toast.success(`${ids.length} costo(s) fijo(s) eliminado(s)`)
      }
    } catch (error) {
      console.error("Error deleting fixed costs:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.nitiaFixedCosts])

  // ==================== GLOBAL MOVEMENTS ====================
  const addGlobalMovement = useCallback(async (movement: GlobalMovement & { createdBy?: RoleKey }) => {
    setData((prev) => {
      const newData = {
        ...prev,
        globalMovements: [movement, ...prev.globalMovements],
      }
      // Update account balance if accountId is provided
      if (movement.accountId) {
        const delta = movement.type === "ingreso" ? movement.amount : -movement.amount
        newData.accounts = prev.accounts.map((a) =>
          a.id === movement.accountId ? { ...a, balance: a.balance + delta } : a
        )
      }
      return newData
    })

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("global_movements").insert(movement)
      
      if (error) {
        console.error("Error adding global movement:", error)
        setData((prev) => ({
          ...prev,
          globalMovements: prev.globalMovements.filter((m) => m.id !== movement.id),
        }))
        toast.error("Error al registrar movimiento.")
      } else {
        toast.success("Movimiento registrado")
      }
    } catch (error) {
      console.error("Error adding global movement:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updateGlobalMovement = useCallback(async (id: string, updates: Partial<GlobalMovement>) => {
    const previousData = data.globalMovements.find(m => m.id === id)
    setData((prev) => ({
      ...prev,
      globalMovements: prev.globalMovements.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("global_movements").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating global movement:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            globalMovements: prev.globalMovements.map((m) => (m.id === id ? previousData : m)),
          }))
        }
        toast.error("Error al actualizar movimiento.")
      }
    } catch (error) {
      console.error("Error updating global movement:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.globalMovements])

  const deleteGlobalMovement = useCallback(async (id: string) => {
    const previousMovement = data.globalMovements.find(m => m.id === id)
    setData((prev) => ({
      ...prev,
      globalMovements: prev.globalMovements.filter((m) => m.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("global_movements").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting global movement:", error)
        if (previousMovement) {
          setData((prev) => ({
            ...prev,
            globalMovements: [...prev.globalMovements, previousMovement],
          }))
        }
        toast.error("Error al eliminar movimiento.")
      } else {
        toast.success("Movimiento eliminado")
      }
    } catch (error) {
      console.error("Error deleting global movement:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.globalMovements])

  const deleteGlobalMovements = useCallback(async (ids: string[]) => {
    const previousMovements = data.globalMovements.filter(m => ids.includes(m.id))
    setData((prev) => ({
      ...prev,
      globalMovements: prev.globalMovements.filter((m) => !ids.includes(m.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("global_movements").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting global movements:", error)
        setData((prev) => ({
          ...prev,
          globalMovements: [...prev.globalMovements, ...previousMovements],
        }))
        toast.error("Error al eliminar movimientos.")
      } else {
        toast.success(`${ids.length} movimiento(s) eliminado(s)`)
      }
    } catch (error) {
      console.error("Error deleting global movements:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.globalMovements])

  // ==================== QUOTE COMPARISONS ====================
  const addQuoteComparison = useCallback(async (quote: QuoteComparison) => {
    setData((prev) => ({
      ...prev,
      quoteComparisons: [quote, ...prev.quoteComparisons],
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("quote_comparisons").insert(quote)
      
      if (error) {
        console.error("Error adding quote comparison:", error)
        setData((prev) => ({
          ...prev,
          quoteComparisons: prev.quoteComparisons.filter((q) => q.id !== quote.id),
        }))
        toast.error("Error al agregar cotización.")
      } else {
        toast.success("Cotización agregada")
      }
    } catch (error) {
      console.error("Error adding quote comparison:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updateQuoteComparison = useCallback(async (id: string, updates: Partial<QuoteComparison>) => {
    const previousData = data.quoteComparisons.find(q => q.id === id)
    
    // If cost is being updated, recalculate derived values
    if (updates.cost !== undefined) {
      updates.priceX14 = updates.cost * 1.4
      updates.priceX16 = updates.cost * 1.6
      updates.gananciaX14 = updates.cost * 0.4
      updates.gananciaX16 = updates.cost * 0.6
    }
    
    setData((prev) => ({
      ...prev,
      quoteComparisons: prev.quoteComparisons.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("quote_comparisons").update(updates).eq("id", id)
      
      if (error) {
        console.error("Error updating quote comparison:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            quoteComparisons: prev.quoteComparisons.map((q) => (q.id === id ? previousData : q)),
          }))
        }
        toast.error("Error al actualizar cotización.")
      }
    } catch (error) {
      console.error("Error updating quote comparison:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.quoteComparisons])

  const deleteQuoteComparison = useCallback(async (id: string) => {
    const previousQuote = data.quoteComparisons.find(q => q.id === id)
    setData((prev) => ({
      ...prev,
      quoteComparisons: prev.quoteComparisons.filter((q) => q.id !== id),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("quote_comparisons").delete().eq("id", id)
      
      if (error) {
        console.error("Error deleting quote comparison:", error)
        if (previousQuote) {
          setData((prev) => ({
            ...prev,
            quoteComparisons: [...prev.quoteComparisons, previousQuote],
          }))
        }
        toast.error("Error al eliminar cotización.")
      } else {
        toast.success("Cotización eliminada")
      }
    } catch (error) {
      console.error("Error deleting quote comparison:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.quoteComparisons])

  const deleteQuoteComparisons = useCallback(async (ids: string[]) => {
    const previousQuotes = data.quoteComparisons.filter(q => ids.includes(q.id))
    setData((prev) => ({
      ...prev,
      quoteComparisons: prev.quoteComparisons.filter((q) => !ids.includes(q.id)),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("quote_comparisons").delete().in("id", ids)
      
      if (error) {
        console.error("Error deleting quote comparisons:", error)
        setData((prev) => ({
          ...prev,
          quoteComparisons: [...prev.quoteComparisons, ...previousQuotes],
        }))
        toast.error("Error al eliminar cotizaciones.")
      } else {
        toast.success(`${ids.length} cotización(es) eliminada(s)`)
      }
    } catch (error) {
      console.error("Error deleting quote comparisons:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.quoteComparisons])

  const selectQuote = useCallback(async (id: string) => {
    const quote = data.quoteComparisons.find((q) => q.id === id)
    if (!quote) return

    // Deselect others in the same category/item
    const previousQuotes = data.quoteComparisons.filter(
      q => q.category === quote.category && q.item === quote.item
    )
    
    setData((prev) => ({
      ...prev,
      quoteComparisons: prev.quoteComparisons.map((q) =>
        q.category === quote.category && q.item === quote.item
          ? { ...q, selected: q.id === id }
          : q
      ),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      
      // Deselect all in same category/item
      await supabase
        .from("quote_comparisons")
        .update({ selected: false })
        .eq("category", quote.category)
        .eq("item", quote.item)
      
      // Select the chosen one
      const { error } = await supabase
        .from("quote_comparisons")
        .update({ selected: true })
        .eq("id", id)
      
      if (error) {
        console.error("Error selecting quote:", error)
        setData((prev) => ({
          ...prev,
          quoteComparisons: prev.quoteComparisons.map(q => {
            const prevQuote = previousQuotes.find(pq => pq.id === q.id)
            return prevQuote ? prevQuote : q
          }),
        }))
        toast.error("Error al seleccionar cotización.")
      }
    } catch (error) {
      console.error("Error selecting quote:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.quoteComparisons])

  const toggleQuoteSelection = useCallback(async (id: string) => {
    const quote = data.quoteComparisons.find((q) => q.id === id)
    if (!quote) return

    const newSelected = !quote.selected
    
    setData((prev) => ({
      ...prev,
      quoteComparisons: prev.quoteComparisons.map((q) =>
        q.id === id ? { ...q, selected: newSelected } : q
      ),
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("quote_comparisons")
        .update({ selected: newSelected })
        .eq("id", id)
      
      if (error) {
        console.error("Error toggling quote selection:", error)
        setData((prev) => ({
          ...prev,
          quoteComparisons: prev.quoteComparisons.map((q) =>
            q.id === id ? { ...q, selected: quote.selected } : q
          ),
        }))
        toast.error("Error al actualizar selección.")
      }
    } catch (error) {
      console.error("Error toggling quote selection:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.quoteComparisons])

  // ==================== PERSONAL FINANCE ====================
  const addPersonalFinanceVariable = useCallback(async (partner: RoleKey, expense: VariableExpense) => {
    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner as "paula" | "cami"],
          variableExpenses: [expense, ...prev.personalFinance[partner as "paula" | "cami"].variableExpenses],
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").insert({
        id: expense.id,
        owner: partner,
        type: "egreso",
        is_fixed: false,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        active: true,
        note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error adding variable expense:", error)
        setData((prev) => ({
          ...prev,
          personalFinance: {
            ...prev.personalFinance,
            [partner]: {
              ...prev.personalFinance[partner as "paula" | "cami"],
              variableExpenses: prev.personalFinance[partner as "paula" | "cami"].variableExpenses.filter(
                (e) => e.id !== expense.id
              ),
            },
          },
        }))
        toast.error("Error al agregar gasto variable.")
      } else {
        toast.success("Gasto variable agregado")
      }
    } catch (error) {
      console.error("Error adding variable expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updatePersonalFinanceVariable = useCallback(async (id: string, updates: Partial<VariableExpense>) => {
    const previousData = data.personalFinance.paula.variableExpenses.find((e) => e.id === id) ||
      data.personalFinance.cami.variableExpenses.find((e) => e.id === id)

    // Find which partner owns this expense
    let partner: "paula" | "cami" = "paula"
    if (data.personalFinance.cami.variableExpenses.find((e) => e.id === id)) {
      partner = "cami"
    }

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          variableExpenses: prev.personalFinance[partner].variableExpenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").update(updates).eq("id", id)

      if (error) {
        console.error("Error updating variable expense:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                variableExpenses: prev.personalFinance[partner].variableExpenses.map((e) =>
                  e.id === id ? previousData : e
                ),
              },
            },
          }))
        }
        toast.error("Error al actualizar gasto variable.")
      }
    } catch (error) {
      console.error("Error updating variable expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  const deletePersonalFinanceVariable = useCallback(async (id: string) => {
    // Find which partner owns this expense
    let partner: "paula" | "cami" = "paula"
    const previousExpense = data.personalFinance.paula.variableExpenses.find((e) => e.id === id)
    if (!previousExpense && data.personalFinance.cami.variableExpenses.find((e) => e.id === id)) {
      partner = "cami"
    }

    const actualPreviousExpense = previousExpense || data.personalFinance.cami.variableExpenses.find((e) => e.id === id)

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          variableExpenses: prev.personalFinance[partner].variableExpenses.filter((e) => e.id !== id),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").delete().eq("id", id)

      if (error) {
        console.error("Error deleting variable expense:", error)
        if (actualPreviousExpense) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                variableExpenses: [...prev.personalFinance[partner].variableExpenses, actualPreviousExpense],
              },
            },
          }))
        }
        toast.error("Error al eliminar gasto variable.")
      } else {
        toast.success("Gasto variable eliminado")
      }
    } catch (error) {
      console.error("Error deleting variable expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  const addPersonalFinanceFixed = useCallback(async (partner: RoleKey, expense: FixedExpense) => {
    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner as "paula" | "cami"],
          fixedExpenses: [expense, ...prev.personalFinance[partner as "paula" | "cami"].fixedExpenses],
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").insert({
        id: expense.id,
        owner: partner,
        type: "egreso",
        is_fixed: true,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: new Date().toISOString().split("T")[0],
        active: expense.active,
        note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error adding fixed expense:", error)
        setData((prev) => ({
          ...prev,
          personalFinance: {
            ...prev.personalFinance,
            [partner]: {
              ...prev.personalFinance[partner as "paula" | "cami"],
              fixedExpenses: prev.personalFinance[partner as "paula" | "cami"].fixedExpenses.filter(
                (e) => e.id !== expense.id
              ),
            },
          },
        }))
        toast.error("Error al agregar gasto fijo.")
      } else {
        toast.success("Gasto fijo agregado")
      }
    } catch (error) {
      console.error("Error adding fixed expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updatePersonalFinanceFixed = useCallback(async (id: string, updates: Partial<FixedExpense>) => {
    const previousData = data.personalFinance.paula.fixedExpenses.find((e) => e.id === id) ||
      data.personalFinance.cami.fixedExpenses.find((e) => e.id === id)

    // Find which partner owns this expense
    let partner: "paula" | "cami" = "paula"
    if (data.personalFinance.cami.fixedExpenses.find((e) => e.id === id)) {
      partner = "cami"
    }

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          fixedExpenses: prev.personalFinance[partner].fixedExpenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").update(updates).eq("id", id)

      if (error) {
        console.error("Error updating fixed expense:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                fixedExpenses: prev.personalFinance[partner].fixedExpenses.map((e) =>
                  e.id === id ? previousData : e
                ),
              },
            },
          }))
        }
        toast.error("Error al actualizar gasto fijo.")
      }
    } catch (error) {
      console.error("Error updating fixed expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  const deletePersonalFinanceFixed = useCallback(async (id: string) => {
    // Find which partner owns this expense
    let partner: "paula" | "cami" = "paula"
    const previousExpense = data.personalFinance.paula.fixedExpenses.find((e) => e.id === id)
    if (!previousExpense && data.personalFinance.cami.fixedExpenses.find((e) => e.id === id)) {
      partner = "cami"
    }

    const actualPreviousExpense = previousExpense || data.personalFinance.cami.fixedExpenses.find((e) => e.id === id)

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          fixedExpenses: prev.personalFinance[partner].fixedExpenses.filter((e) => e.id !== id),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").delete().eq("id", id)

      if (error) {
        console.error("Error deleting fixed expense:", error)
        if (actualPreviousExpense) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                fixedExpenses: [...prev.personalFinance[partner].fixedExpenses, actualPreviousExpense],
              },
            },
          }))
        }
        toast.error("Error al eliminar gasto fijo.")
      } else {
        toast.success("Gasto fijo eliminado")
      }
    } catch (error) {
      console.error("Error deleting fixed expense:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  const addPersonalFinanceIncome = useCallback(async (partner: RoleKey, income: NitiaIncome) => {
    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner as "paula" | "cami"],
          nitiaIncome: [income, ...prev.personalFinance[partner as "paula" | "cami"].nitiaIncome],
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").insert({
        id: income.id,
        owner: partner,
        type: "ingreso",
        is_fixed: false,
        category: "Ingreso",
        description: income.description,
        amount: income.amount,
        date: income.date,
        active: true,
        note: income.note,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error adding income:", error)
        setData((prev) => ({
          ...prev,
          personalFinance: {
            ...prev.personalFinance,
            [partner]: {
              ...prev.personalFinance[partner as "paula" | "cami"],
              nitiaIncome: prev.personalFinance[partner as "paula" | "cami"].nitiaIncome.filter(
                (i) => i.id !== income.id
              ),
            },
          },
        }))
        toast.error("Error al agregar ingreso.")
      } else {
        toast.success("Ingreso agregado")
      }
    } catch (error) {
      console.error("Error adding income:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const updatePersonalFinanceIncome = useCallback(async (id: string, updates: Partial<NitiaIncome>) => {
    const previousData = data.personalFinance.paula.nitiaIncome.find((i) => i.id === id) ||
      data.personalFinance.cami.nitiaIncome.find((i) => i.id === id)

    // Find which partner owns this income
    let partner: "paula" | "cami" = "paula"
    if (data.personalFinance.cami.nitiaIncome.find((i) => i.id === id)) {
      partner = "cami"
    }

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          nitiaIncome: prev.personalFinance[partner].nitiaIncome.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").update(updates).eq("id", id)

      if (error) {
        console.error("Error updating income:", error)
        if (previousData) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                nitiaIncome: prev.personalFinance[partner].nitiaIncome.map((i) =>
                  i.id === id ? previousData : i
                ),
              },
            },
          }))
        }
        toast.error("Error al actualizar ingreso.")
      }
    } catch (error) {
      console.error("Error updating income:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  const deletePersonalFinanceIncome = useCallback(async (id: string) => {
    // Find which partner owns this income
    let partner: "paula" | "cami" = "paula"
    const previousIncome = data.personalFinance.paula.nitiaIncome.find((i) => i.id === id)
    if (!previousIncome && data.personalFinance.cami.nitiaIncome.find((i) => i.id === id)) {
      partner = "cami"
    }

    const actualPreviousIncome = previousIncome || data.personalFinance.cami.nitiaIncome.find((i) => i.id === id)

    setData((prev) => ({
      ...prev,
      personalFinance: {
        ...prev.personalFinance,
        [partner]: {
          ...prev.personalFinance[partner],
          nitiaIncome: prev.personalFinance[partner].nitiaIncome.filter((i) => i.id !== id),
        },
      },
    }))

    setIsSyncing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("personal_finance_movements").delete().eq("id", id)

      if (error) {
        console.error("Error deleting income:", error)
        if (actualPreviousIncome) {
          setData((prev) => ({
            ...prev,
            personalFinance: {
              ...prev.personalFinance,
              [partner]: {
                ...prev.personalFinance[partner],
                nitiaIncome: [...prev.personalFinance[partner].nitiaIncome, actualPreviousIncome],
              },
            },
          }))
        }
        toast.error("Error al eliminar ingreso.")
      } else {
        toast.success("Ingreso eliminado")
      }
    } catch (error) {
      console.error("Error deleting income:", error)
      toast.error("Error de conexión.")
    } finally {
      setIsSyncing(false)
    }
  }, [data.personalFinance])

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        data,
        setData,
        section,
        setSection,
        selectedProjectId,
        setSelectedProjectId,
        isLoading,
        isSyncing,
        lastSyncError,
        getProject,
        updateProject,
        addProject,
        deleteProject,
        deleteProjects,
        getProvider,
        updateProvider,
        addProvider,
        deleteProvider,
        deleteProviders,
        addTask,
        updateTask,
        deleteTask,
        deleteTasks,
        updateAccount,
        addAccountMovement,
        deleteAccountMovement,
        deleteAccountMovements,
        updateNitiaFixedCost,
        addNitiaFixedCost,
        deleteNitiaFixedCost,
        deleteNitiaFixedCosts,
        addGlobalMovement,
        updateGlobalMovement,
        deleteGlobalMovement,
        deleteGlobalMovements,
        addQuoteComparison,
        updateQuoteComparison,
        deleteQuoteComparison,
        deleteQuoteComparisons,
        selectQuote,
        toggleQuoteSelection,
        addPersonalFinanceVariable,
        updatePersonalFinanceVariable,
        deletePersonalFinanceVariable,
        addPersonalFinanceFixed,
        updatePersonalFinanceFixed,
        deletePersonalFinanceFixed,
        addPersonalFinanceIncome,
        updatePersonalFinanceIncome,
        deletePersonalFinanceIncome,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
