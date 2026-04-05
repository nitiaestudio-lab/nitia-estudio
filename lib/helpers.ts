import type { Project, ProjectItem, Movement, QuoteComparison } from "./types"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

export const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export const generateId = (): string => crypto.randomUUID()

// Project item helpers
export const getProjectItems = (items: ProjectItem[], projectId: string, type?: string) =>
  items.filter(i => i.project_id === projectId && (!type || i.type === type))

export const getProjectMovements = (movements: Movement[], projectId: string) =>
  movements.filter(m => m.project_id === projectId)

// Get selected quotes for project as "virtual items"
export const getSelectedQuotes = (quotes: QuoteComparison[], projectId: string): QuoteComparison[] =>
  quotes.filter(q => q.project_id === projectId && q.selected)

// Calculate client price for a quote based on type and selected multiplier
export const quoteClientPrice = (q: QuoteComparison): number => {
  if (q.type === "material") return q.cost
  const mult = q.selected_multiplier || 1.4
  return q.cost * mult
}

export const quoteGanancia = (q: QuoteComparison): number => {
  if (q.type === "material") return 0
  return quoteClientPrice(q) - q.cost
}

// Currency-aware type
export type CurrencyAmount = { ars: number; usd: number }

const isUSDItem = (i: { currency?: string }) => i.currency === "USD"
const isARSItem = (i: { currency?: string }) => i.currency !== "USD"

// Currency-aware totals
export const projectCostByCurrency = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): CurrencyAmount => {
  const pItems = items.filter(i => i.project_id === project.id)
  const pQuotes = getSelectedQuotes(quotes, project.id)
  return {
    ars: (project.honorarios_currency === "USD" ? 0 : (project.honorarios_cost ?? 0)) + pItems.filter(isARSItem).reduce((s, i) => s + i.cost, 0) + pQuotes.filter(isARSItem).reduce((s, q) => s + q.cost, 0),
    usd: (project.honorarios_currency === "USD" ? (project.honorarios_cost ?? 0) : 0) + pItems.filter(isUSDItem).reduce((s, i) => s + i.cost, 0) + pQuotes.filter(isUSDItem).reduce((s, q) => s + q.cost, 0),
  }
}

export const projectClientPriceByCurrency = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): CurrencyAmount => {
  const pItems = items.filter(i => i.project_id === project.id)
  const pQuotes = getSelectedQuotes(quotes, project.id)
  return {
    ars: (project.honorarios_currency === "USD" ? 0 : (project.honorarios_client_price ?? 0)) + pItems.filter(isARSItem).reduce((s, i) => s + i.client_price, 0) + pQuotes.filter(isARSItem).reduce((s, q) => s + quoteClientPrice(q), 0),
    usd: (project.honorarios_currency === "USD" ? (project.honorarios_client_price ?? 0) : 0) + pItems.filter(isUSDItem).reduce((s, i) => s + i.client_price, 0) + pQuotes.filter(isUSDItem).reduce((s, q) => s + quoteClientPrice(q), 0),
  }
}

export const projectGananciaByCurrency = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): CurrencyAmount => {
  const pItems = items.filter(i => i.project_id === project.id)
  const pQuotes = getSelectedQuotes(quotes, project.id)
  const gan = (i: ProjectItem) => i.type === "material" ? 0 : i.client_price - i.cost
  return {
    ars: (project.honorarios_currency === "USD" ? 0 : ((project.honorarios_client_price ?? 0) - (project.honorarios_cost ?? 0))) + pItems.filter(isARSItem).reduce((s, i) => s + gan(i), 0) + pQuotes.filter(isARSItem).reduce((s, q) => s + quoteGanancia(q), 0),
    usd: (project.honorarios_currency === "USD" ? ((project.honorarios_client_price ?? 0) - (project.honorarios_cost ?? 0)) : 0) + pItems.filter(isUSDItem).reduce((s, i) => s + gan(i), 0) + pQuotes.filter(isUSDItem).reduce((s, q) => s + quoteGanancia(q), 0),
  }
}

// Format helper for currency amounts
export const formatUSD = (n: number): string => `U$D ${new Intl.NumberFormat("es-AR").format(n)}`
export const formatCurrencyAmount = (ca: CurrencyAmount): string => {
  const parts = [formatCurrency(ca.ars)]
  if (ca.usd > 0) parts.push(formatUSD(ca.usd))
  return parts.join(" + ")
}

// Smart dual currency display — treats both currencies equally
export const dualAmount = (ars: number, usd: number): string => {
  if (ars !== 0 && usd !== 0) return `${formatCurrency(ars)} + ${formatUSD(usd)}`
  if (usd !== 0) return formatUSD(usd)
  return formatCurrency(ars)
}

// Returns which currency is the "main" one for display purposes
export const mainCurrency = (ars: number, usd: number): "ARS" | "USD" | "dual" => {
  if (ars !== 0 && usd !== 0) return "dual"
  if (usd !== 0) return "USD"
  return "ARS"
}

// Legacy functions (return combined ARS total for backward compat)
export const projectTotalCost = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): number => {
  const honorarios = project.honorarios_cost ?? 0
  const itemsTotal = items.filter(i => i.project_id === project.id).reduce((s, i) => s + i.cost, 0)
  const quotesTotal = getSelectedQuotes(quotes, project.id).reduce((s, q) => s + q.cost, 0)
  return honorarios + itemsTotal + quotesTotal
}

export const projectTotalClientPrice = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): number => {
  const honorarios = project.honorarios_client_price ?? 0
  const itemsTotal = items.filter(i => i.project_id === project.id).reduce((s, i) => s + i.client_price, 0)
  const quotesTotal = getSelectedQuotes(quotes, project.id).reduce((s, q) => s + quoteClientPrice(q), 0)
  return honorarios + itemsTotal + quotesTotal
}

export const projectTotalGanancia = (project: Project, items: ProjectItem[], quotes: QuoteComparison[] = []): number => {
  const honorariosGan = (project.honorarios_client_price ?? 0) - (project.honorarios_cost ?? 0)
  const itemsGan = items.filter(i => i.project_id === project.id)
    .reduce((s, i) => s + (i.type === "material" ? 0 : i.client_price - i.cost), 0)
  const quotesGan = getSelectedQuotes(quotes, project.id).reduce((s, q) => s + quoteGanancia(q), 0)
  return honorariosGan + itemsGan + quotesGan
}

export const projectIncome = (movements: Movement[], projectId: string): number =>
  movements.filter(m => m.project_id === projectId && m.type === "ingreso").reduce((s, m) => s + m.amount, 0)

export const projectExpenses = (movements: Movement[], projectId: string): number =>
  movements.filter(m => m.project_id === projectId && m.type === "egreso").reduce((s, m) => s + m.amount, 0)

// IVA calculations
export const calcIVACliente = (totalClientPrice: number, ivaPct: number = 21): number =>
  totalClientPrice * (ivaPct / 100)

export const calcIVAGanancia = (totalGanancia: number, ivaPct: number = 10.5): number =>
  totalGanancia * (ivaPct / 100)

// Seña calculations
export const calcSenaProveedor = (totalCost: number, pct: number = 60): number =>
  totalCost * (pct / 100)

export const calcSenaCliente = (totalClientPrice: number, pct: number = 50): number =>
  totalClientPrice * (pct / 100)

// Ganancia individual
export const calcGananciaIndividual = (ganancia: number, partnerCount: number = 2): number =>
  partnerCount > 0 ? ganancia / partnerCount : ganancia

// Status helpers
export const statusLabel = (status: string | null | undefined): string => {
  const labels: Record<string, string> = { activo: "Activo", pausado: "Pausado", finalizado: "Finalizado", cancelado: "Cancelado" }
  return labels[status ?? "activo"] ?? status ?? "Activo"
}

export const statusColor = (status: string | null | undefined): string => {
  const colors: Record<string, string> = { activo: "green", pausado: "yellow", finalizado: "gray", cancelado: "red" }
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
    case "hoy": start.setHours(0, 0, 0, 0); break
    case "semana": { const day = now.getDay(); const diff = day === 0 ? 6 : day - 1; start.setDate(now.getDate() - diff); start.setHours(0, 0, 0, 0); break }
    case "mes": start = new Date(now.getFullYear(), now.getMonth(), 1); break
    case "3meses": start = new Date(now.getFullYear(), now.getMonth() - 3, 1); break
    case "ano": start = new Date(now.getFullYear(), 0, 1); break
    default: start = new Date("2020-01-01")
  }
  return { start, end }
}

export function filterByDateRange<T extends { date?: string | null }>(
  items: T[], period: string, customStart?: string, customEnd?: string
): T[] {
  if (period === "all") return items
  let start: Date, end: Date
  if (period === "custom" && customStart && customEnd) {
    start = new Date(customStart + "T00:00:00")
    end = new Date(customEnd + "T23:59:59")
  } else {
    const range = getDateRange(period)
    start = range.start
    end = range.end
  }
  return items.filter(item => {
    if (!item.date) return true
    const d = new Date(item.date + "T12:00:00")
    return d >= start && d <= end
  })
}

export function calculateAccountBalance(initialBalance: number, movements: Movement[], accountId: string): number {
  const delta = movements.filter(m => m.account_id === accountId)
    .reduce((sum, m) => sum + (m.type === "ingreso" ? m.amount : -m.amount), 0)
  return initialBalance + delta
}
