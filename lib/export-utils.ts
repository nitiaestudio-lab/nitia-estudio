// Export utilities - generic CSV/JSON export

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ""
      const str = String(val)
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(","))
  ]
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportCuentas(accounts: { name: string; type?: string; balance: number; owner?: string }[]) {
  downloadCSV(accounts.map(a => ({
    Nombre: a.name, Tipo: a.type || "", Saldo: a.balance, Titular: a.owner || "nitia"
  })), "cuentas")
}

export function exportMovimientosCuenta(movements: { date: string; description: string; amount: number; type: string; category?: string }[], label: string) {
  downloadCSV(movements.map(m => ({
    Fecha: m.date, Descripcion: m.description, Monto: m.amount, Tipo: m.type, Categoria: m.category || ""
  })), `movimientos_${label}`)
}

export function exportCostosFijos(costs: { description: string; amount: number; category?: string; active: boolean }[]) {
  downloadCSV(costs.map(c => ({
    Descripcion: c.description, Monto: c.amount, Categoria: c.category || "", Activo: c.active ? "Si" : "No"
  })), "costos_fijos")
}

export function exportProveedores(providers: { name: string; category: string; phone?: string; email?: string }[]) {
  downloadCSV(providers.map(p => ({
    Nombre: p.name, Categoria: p.category, Telefono: p.phone || "", Email: p.email || ""
  })), "proveedores")
}

export function exportProyectos(projects: { name: string; client: string; status?: string }[]) {
  downloadCSV(projects.map(p => ({
    Nombre: p.name, Cliente: p.client, Estado: p.status || "activo"
  })), "proyectos")
}

export function exportFinanzasPersonales(movements: { date: string; description: string; amount: number; type: string; category?: string }[], owner: string) {
  downloadCSV(movements.map(m => ({
    Fecha: m.date, Descripcion: m.description, Tipo: m.type, Categoria: m.category || "", Monto: m.amount
  })), `finanzas_${owner}`)
}

export function exportProjectMovements(movements: { date: string; description: string; amount: number; type: string }[], projectName: string) {
  downloadCSV(movements.map(m => ({
    Fecha: m.date, Descripcion: m.description, Monto: m.amount, Tipo: m.type
  })), `movimientos_${projectName.replace(/\s+/g, "_")}`)
}

export function exportProjectDesglose(items: { type: string; description: string; cost: number; client_price: number }[], projectName: string) {
  downloadCSV(items.map(i => ({
    Tipo: i.type, Descripcion: i.description, Costo: i.cost, PrecioCliente: i.client_price
  })), `desglose_${projectName.replace(/\s+/g, "_")}`)
}

export function exportCotizaciones(quotes: { category: string; item: string; provider_name: string; cost: number; price_x14: number; price_x16: number; selected: boolean }[]) {
  downloadCSV(quotes.map(q => ({
    Categoria: q.category, Item: q.item, Proveedor: q.provider_name,
    Costo: q.cost, PrecioX14: q.price_x14, PrecioX16: q.price_x16,
    Seleccionado: q.selected ? "Si" : "No"
  })), "cotizaciones")
}

export function exportTareas(tasks: { title: string; status: string; priority: string; due_date?: string }[]) {
  downloadCSV(tasks.map(t => ({
    Titulo: t.title, Estado: t.status, Prioridad: t.priority, FechaLimite: t.due_date || ""
  })), "tareas")
}
