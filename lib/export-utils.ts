// Export utilities — CSV + XLSX
// Requires: npm install xlsx

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
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
  triggerDownload(blob, `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadXLSX(sheets: { name: string; data: Record<string, any>[] }[], filename: string) {
  try {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    for (const sheet of sheets) {
      if (sheet.data.length === 0) continue
      const ws = XLSX.utils.json_to_sheet(sheet.data)
      // Auto-width columns
      const colWidths = Object.keys(sheet.data[0]).map(key => {
        const maxLen = Math.max(key.length, ...sheet.data.map(r => String(r[key] ?? "").length))
        return { wch: Math.min(maxLen + 2, 40) }
      })
      ws["!cols"] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31))
    }
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`)
  } catch {
    // Fallback to CSV if xlsx not available
    for (const sheet of sheets) {
      downloadCSV(sheet.data, `${filename}_${sheet.name}`)
    }
  }
}

// =================== PROJECT EXPORTS ===================

export function exportProjectDesgloseXLSX(
  projectName: string,
  items: { type: string; description: string; cost: number; clientPrice: number; ganancia: number; provider?: string }[],
  quotes: { category: string; item: string; provider: string; cost: number; clientPrice: number; ganancia: number }[],
  summary: { label: string; value: number }[]
) {
  const itemsData = items.map(i => ({
    Tipo: i.type === "mano_de_obra" ? "Mano de Obra" : i.type === "material" ? "Material" : "Mobiliario",
    Descripción: i.description,
    Costo: i.cost,
    "Precio Cliente": i.clientPrice,
    Ganancia: i.ganancia,
    Proveedor: i.provider || "",
  }))

  const quotesData = quotes.map(q => ({
    Categoría: q.category,
    Ítem: q.item,
    Proveedor: q.provider,
    Costo: q.cost,
    "Precio Cliente": q.clientPrice,
    Ganancia: q.ganancia,
  }))

  const summaryData = summary.map(s => ({ Concepto: s.label, Monto: s.value }))

  const sheets = [
    { name: "Desglose", data: [...itemsData, ...quotesData] },
    { name: "Resumen Financiero", data: summaryData },
  ]

  downloadXLSX(sheets, `desglose_${projectName.replace(/\s+/g, "_")}`)
}

export function exportProjectMovementsXLSX(
  projectName: string,
  movements: { date: string; description: string; amount: number; type: string; category?: string; provider?: string; medio_pago?: string | null }[]
) {
  const data = movements.map(m => ({
    Fecha: m.date,
    Descripción: m.description,
    Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
    Moneda: m.medio_pago === "USD" ? "USD" : "ARS",
    Monto: m.amount,
    Categoría: m.category || "",
    Proveedor: m.provider || "",
  }))

  downloadXLSX([{ name: "Movimientos", data }], `movimientos_${projectName.replace(/\s+/g, "_")}`)
}

export function exportComparadorXLSX(
  projectName: string,
  quotes: { category: string; item: string; type: string; provider: string; cost: number; priceX14: number; priceX16: number; gananciaX14: number; gananciaX16: number; selected: boolean }[]
) {
  const data = quotes.map(q => ({
    Categoría: q.category,
    Ítem: q.item,
    Tipo: q.type === "mano_de_obra" ? "Mano de Obra" : q.type === "material" ? "Material" : "Mobiliario",
    Proveedor: q.provider,
    Costo: q.cost,
    "Precio x1.4": q.type === "material" ? q.cost : q.priceX14,
    "Precio x1.6": q.type === "material" ? q.cost : q.priceX16,
    "Ganancia x1.4": q.type === "material" ? 0 : q.gananciaX14,
    "Ganancia x1.6": q.type === "material" ? 0 : q.gananciaX16,
    Seleccionado: q.selected ? "✓" : "",
  }))

  downloadXLSX([{ name: "Comparador", data }], `comparador_${projectName.replace(/\s+/g, "_")}`)
}

// =================== LEGACY CSV EXPORTS ===================

export function exportCuentas(accounts: { name: string; type?: string; balance: number; owner?: string }[]) {
  downloadCSV(accounts.map(a => ({ Nombre: a.name, Tipo: a.type || "", Saldo: a.balance, Titular: a.owner || "nitia" })), "cuentas")
}

export function exportMovimientosCuenta(movements: { date: string; description: string; amount: number; type: string; category?: string }[], label: string) {
  downloadCSV(movements.map(m => ({ Fecha: m.date, Descripcion: m.description, Monto: m.amount, Tipo: m.type, Categoria: m.category || "" })), `movimientos_${label}`)
}

export function exportCostosFijos(costs: { description: string; amount: number; category?: string; active: boolean }[]) {
  downloadCSV(costs.map(c => ({ Descripcion: c.description, Monto: c.amount, Categoria: c.category || "", Activo: c.active ? "Si" : "No" })), "costos_fijos")
}

export function exportProveedores(providers: { name: string; category: string; phone?: string; email?: string }[]) {
  downloadCSV(providers.map(p => ({ Nombre: p.name, Categoria: p.category, Telefono: p.phone || "", Email: p.email || "" })), "proveedores")
}

export function exportProyectos(projects: { name: string; client: string; status?: string }[]) {
  downloadCSV(projects.map(p => ({ Nombre: p.name, Cliente: p.client, Estado: p.status || "activo" })), "proyectos")
}

export function exportFinanzasPersonales(movements: { date: string; description: string; amount: number; type: string; category?: string; medio_pago?: string | null }[], owner: string) {
  downloadCSV(movements.map(m => ({ Fecha: m.date, Descripcion: m.description, Tipo: m.type, Moneda: m.medio_pago === "USD" ? "USD" : "ARS", Categoria: m.category || "", Monto: m.amount })), `finanzas_${owner}`)
}

export function exportProjectMovements(movements: { date: string; description: string; amount: number; type: string }[], projectName: string) {
  downloadCSV(movements.map(m => ({ Fecha: m.date, Descripcion: m.description, Monto: m.amount, Tipo: m.type })), `movimientos_${projectName.replace(/\s+/g, "_")}`)
}

export function exportProjectDesglose(items: { type: string; description: string; cost: number; client_price: number }[], projectName: string) {
  downloadCSV(items.map(i => ({ Tipo: i.type, Descripcion: i.description, Costo: i.cost, PrecioCliente: i.client_price })), `desglose_${projectName.replace(/\s+/g, "_")}`)
}

export function exportCotizaciones(quotes: { category: string; item: string; provider_name: string; cost: number; price_x14: number; price_x16: number; selected: boolean }[]) {
  downloadCSV(quotes.map(q => ({
    Categoria: q.category, Item: q.item, Proveedor: q.provider_name,
    Costo: q.cost, PrecioX14: q.price_x14, PrecioX16: q.price_x16,
    Seleccionado: q.selected ? "Si" : "No"
  })), "cotizaciones")
}

export function exportTareas(tasks: { title: string; status: string; priority: string; due_date?: string }[]) {
  downloadCSV(tasks.map(t => ({ Titulo: t.title, Estado: t.status, Prioridad: t.priority, FechaLimite: t.due_date || "" })), "tareas")
}
