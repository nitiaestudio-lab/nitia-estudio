import { createClient } from "./client"
import type {
  Project,
  Provider,
  Account,
  Task,
  GlobalMovement,
  QuoteComparison,
  AccountMovement,
  FixedExpense,
} from "@/lib/types"

const supabase = createClient()

// Projects
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*")
  if (error) throw error
  return data || []
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()
  if (error && error.code !== "PGRST116") throw error
  return data || null
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  const { data, error } = await supabase.from("projects").insert(project).select().single()
  if (error) throw error
  return data
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Providers
export async function getProviders(): Promise<Provider[]> {
  const { data, error } = await supabase.from("providers").select("*")
  if (error) throw error
  return data || []
}

export async function createProvider(provider: Omit<Provider, "id">): Promise<Provider> {
  const { data, error } = await supabase.from("providers").insert(provider).select().single()
  if (error) throw error
  return data
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from("accounts").select("*")
  if (error) throw error
  return data || []
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from("task_items").select("*")
  if (error) throw error
  return data || []
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const { data, error } = await supabase.from("task_items").insert(task).select().single()
  if (error) throw error
  return data
}

// Account Movements
export async function createAccountMovement(
  movement: Omit<AccountMovement, "id">
): Promise<AccountMovement> {
  const { data, error } = await supabase
    .from("account_movements")
    .insert(movement)
    .select()
    .single()
  if (error) throw error
  return data
}

// Global Movements
export async function getGlobalMovements(): Promise<GlobalMovement[]> {
  const { data, error } = await supabase.from("global_movements").select("*")
  if (error) throw error
  return data || []
}

export async function createGlobalMovement(
  movement: Omit<GlobalMovement, "id">
): Promise<GlobalMovement> {
  const { data, error } = await supabase
    .from("global_movements")
    .insert(movement)
    .select()
    .single()
  if (error) throw error
  return data
}

// Quote Comparisons
export async function getQuoteComparisons(): Promise<QuoteComparison[]> {
  const { data, error } = await supabase.from("quote_comparisons").select("*")
  if (error) throw error
  return data || []
}

export async function createQuoteComparison(
  quote: Omit<QuoteComparison, "id">
): Promise<QuoteComparison> {
  const { data, error } = await supabase
    .from("quote_comparisons")
    .insert(quote)
    .select()
    .single()
  if (error) throw error
  return data
}

// Fixed Costs
export async function getNitiaFixedCosts(): Promise<FixedExpense[]> {
  const { data, error } = await supabase.from("nitia_fixed_costs").select("*")
  if (error) throw error
  return data || []
}

export async function createNitiaFixedCost(
  cost: Omit<FixedExpense, "id">
): Promise<FixedExpense> {
  const { data, error } = await supabase
    .from("nitia_fixed_costs")
    .insert(cost)
    .select()
    .single()
  if (error) throw error
  return data
}

// Settings
export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single()
  if (error && error.code !== "PGRST116") throw error
  return data?.value || null
}
