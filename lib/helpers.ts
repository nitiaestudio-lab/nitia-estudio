import type { Project } from "./types"

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
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
  return Math.random().toString(36).substring(2, 9)
}

// Project calculations
export const totalClientPrice = (project: Project): number => {
  const honorarios = project.honorarios?.clientPrice ?? 0
  const manoDeObra = project.manoDeObra.reduce((sum, m) => sum + m.clientPrice, 0)
  const materiales = project.materiales.reduce((sum, m) => sum + m.clientPrice, 0)
  const mobiliario = project.mobiliario.reduce((sum, m) => sum + m.clientPrice, 0)
  return honorarios + manoDeObra + materiales + mobiliario
}

export const totalCost = (project: Project): number => {
  const honorarios = project.honorarios?.cost ?? 0
  const manoDeObra = project.manoDeObra.reduce((sum, m) => sum + m.cost, 0)
  const materiales = project.materiales.reduce((sum, m) => sum + m.cost, 0)
  const mobiliario = project.mobiliario.reduce((sum, m) => sum + m.cost, 0)
  return honorarios + manoDeObra + materiales + mobiliario
}

export const totalIncome = (project: Project): number => {
  return project.movements
    .filter((m) => m.type === "ingreso")
    .reduce((sum, m) => sum + m.amount, 0)
}

export const totalExpenses = (project: Project): number => {
  return project.movements
    .filter((m) => m.type === "egreso")
    .reduce((sum, m) => sum + m.amount, 0)
}

export const projectProfit = (project: Project): number => {
  return totalClientPrice(project) - totalCost(project)
}

export const projectBalance = (project: Project): number => {
  return totalIncome(project) - totalExpenses(project)
}

export const statusLabel = (status: Project["status"]): string => {
  const labels: Record<Project["status"], string> = {
    activo: "Activo",
    pausado: "Pausado",
    finalizado: "Finalizado",
  }
  return labels[status]
}

export const statusColor = (status: Project["status"]): "green" | "amber" | "gray" => {
  const colors: Record<Project["status"], "green" | "amber" | "gray"> = {
    activo: "green",
    pausado: "amber",
    finalizado: "gray",
  }
  return colors[status]
}

export const priorityLabel = (priority: "alta" | "media" | "baja"): string => {
  const labels: Record<string, string> = {
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  }
  return labels[priority]
}

export const priorityColor = (priority: "alta" | "media" | "baja"): "red" | "amber" | "gray" => {
  const colors: Record<string, "red" | "amber" | "gray"> = {
    alta: "red",
    media: "amber",
    baja: "gray",
  }
  return colors[priority]
}

export const taskStatusLabel = (status: "pendiente" | "en-curso" | "completada"): string => {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    "en-curso": "En curso",
    completada: "Completada",
  }
  return labels[status]
}

export const taskStatusColor = (status: "pendiente" | "en-curso" | "completada"): "gray" | "blue" | "green" => {
  const colors: Record<string, "gray" | "blue" | "green"> = {
    pendiente: "gray",
    "en-curso": "blue",
    completada: "green",
  }
  return colors[status]
}
