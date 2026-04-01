import type { Project, ProjectItem, Movement } from "./types"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export const today = (): string => {
  return new Date().toISOString().split("T")[0]
}

export const generateId = (): string => {
  return crypto.randomUUID()
}

// Project calculations using normalized items
export const getProjectItems = (items: ProjectItem[], projectId: string, type?: string) => {
  return items.filter(i => i.project_id === projectId && (!type || i.type === type))
}

export const getProjectMovements = (movements: Movement[], projectId: string) => {
  return movements.filter(m => m.project_id === projectId)
}

export const projectTotalClientPrice = (project: Project, items: ProjectItem[]): number => {
  const honorarios = project.honorarios_client_price ?? 0
  const itemsTotal = items
    .filter(i => i.project_id === project.id)
    .reduce((sum, i) => sum + i.client_price, 0)
  return honorarios + itemsTotal
}

export const projectTotalCost = (project: Project, items: ProjectItem[]): number => {
  const honorarios = project.honorarios_cost ?? 0
  const itemsTotal = items
    .filter(i => i.project_id === project.id)
    .reduce((sum, i) => sum + i.cost, 0)
  return honorarios + itemsTotal
}

export const projectIncome = (movements: Movement[], projectId: string): number => {
  return movements
    .filter(m => m.project_id === projectId && m.type === "ingreso")
    .reduce((sum, m) => sum + m.amount, 0)
}

export const projectExpenses = (movements: Movement[], projectId: string): number => {
  return movements
    .filter(m => m.project_id === projectId && m.type === "egreso")
    .reduce((sum, m) => sum + m.amount, 0)
}

export const statusLabel = (status: string | null | undefined): string => {
  const labels: Record<string, string> = {
    activo: "Activo",
    pausado: "Pausado",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  }
  return labels[status ?? "activo"] ?? status ?? "Activo"
}

export const statusColor = (status: string | null | undefined): string => {
  const colors: Record<string, string> = {
    activo: "green",
    pausado: "yellow",
    finalizado: "gray",
    cancelado: "red",
  }
  return colors[status ?? "activo"] ?? "gray"
}

export const priorityColor = (p: string): string => {
  if (p === "alta") return "red"
  if (p === "media") return "yellow"
  return "gray"
}

export const taskStatusColor = (s: string): string => {
  if (s === "completada") return "green"
  if (s === "en-curso") return "blue"
  return "gray"
}

// Date range filter
export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date()
  let start = new Date()

  switch (period) {
    case "hoy":
      start.setHours(0, 0, 0, 0)
      break
    case "semana":
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      break
    case "mes":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "3meses":
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case "ano":
      start = new Date(now.getFullYear(), 0, 1)
      break
    case "all":
      start = new Date("2020-01-01")
      break
    case "custom":
      // handled externally
      start = new Date("2020-01-01")
      break
    default:
      start = new Date("2020-01-01")
  }
  return { start, end }
}

export function filterByDateRange<T extends { date?: string | null }>(
  items: T[],
  period: string,
  customStart?: string,
  customEnd?: string
): T[] {
  if (period === "all") return items
  
  let start: Date, end: Date
  if (period === "custom" && customStart && customEnd) {
    start = new Date(customStart)
    end = new Date(customEnd + "T23:59:59")
  } else {
    const range = getDateRange(period)
    start = range.start
    end = range.end
  }

  return items.filter(item => {
    if (!item.date) return true
    const d = new Date(item.date)
    return d >= start && d <= end
  })
}

// Account balance calculated from movements
export function calculateAccountBalance(
  initialBalance: number,
  movements: Movement[],
  accountId: string
): number {
  const delta = movements
    .filter(m => m.account_id === accountId)
    .reduce((sum, m) => sum + (m.type === "ingreso" ? m.amount : -m.amount), 0)
  return initialBalance + delta
}
