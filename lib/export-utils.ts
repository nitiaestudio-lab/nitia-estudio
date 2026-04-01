// Utilidades para exportar datos a Excel/CSV

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escapar comillas y envolver en comillas si contiene coma
          const stringValue = String(value ?? "")
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(",")
    ),
  ].join("\n")

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function exportProjectMovements(
  movements: { date: string; description: string; amount: number; type: string; category: string; conceptoIngreso?: string; cuentaDestino?: string }[],
  projectName: string
) {
  const data = movements.map((m) => ({
    Fecha: m.date,
    Descripcion: m.description,
    Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
    Categoria: m.category,
    Concepto: m.conceptoIngreso || "",
    Cuenta: m.cuentaDestino || "",
    Monto: m.amount,
  }))
  exportToCSV(data, `movimientos_${projectName.replace(/\s+/g, "_")}`)
}

export function exportProjectDesglose(
  project: {
    name: string
    honorarios: { clientPrice: number }
    manoDeObra: { description: string; cost: number; clientPrice: number }[]
    materiales: { description: string; cost: number; clientPrice: number }[]
    mobiliario: { item?: string; description?: string; cost: number; clientPrice: number }[]
  }
) {
  const data = [
    { Categoria: "Honorarios", Descripcion: "Honorarios del proyecto", Costo: 0, PrecioCliente: project.honorarios.clientPrice },
    ...project.manoDeObra.map((i) => ({
      Categoria: "Mano de Obra",
      Descripcion: i.description,
      Costo: i.cost,
      PrecioCliente: i.clientPrice,
    })),
    ...project.materiales.map((i) => ({
      Categoria: "Materiales",
      Descripcion: i.description,
      Costo: i.cost,
      PrecioCliente: i.clientPrice,
    })),
    ...project.mobiliario.map((i) => ({
      Categoria: "Mobiliario",
      Descripcion: i.description || i.item || "",
      Costo: i.cost,
      PrecioCliente: i.clientPrice,
    })),
  ]
  exportToCSV(data, `desglose_${project.name.replace(/\s+/g, "_")}`)
}

export function exportCotizaciones(
  cotizaciones: { date: string; item: string; category: string; providerName: string; cost: number; priceX14: number; priceX16: number; selected: boolean }[],
  projectName: string
) {
  const data = cotizaciones.map((c) => ({
    Fecha: c.date,
    Categoria: c.category,
    Item: c.item,
    Proveedor: c.providerName,
    Costo: c.cost,
    PrecioX14: c.priceX14,
    PrecioX16: c.priceX16,
    Seleccionada: c.selected ? "Si" : "No",
  }))
  exportToCSV(data, `cotizaciones_${projectName.replace(/\s+/g, "_")}`)
}

export function exportTareas(
  tareas: { title: string; status: string; priority: string; dueDate?: string; assignee: string }[],
  projectName: string
) {
  const data = tareas.map((t) => ({
    Tarea: t.title,
    Estado: t.status,
    Prioridad: t.priority,
    Vencimiento: t.dueDate || "",
    Asignado: t.assignee,
  }))
  exportToCSV(data, `tareas_${projectName.replace(/\s+/g, "_")}`)
}

// Exportar proveedores
export function exportProveedores(
  proveedores: { name: string; category: string; phone?: string; email?: string; cbu?: string; alias?: string; address?: string }[]
) {
  const data = proveedores.map((p) => ({
    Nombre: p.name,
    Categoria: p.category,
    Telefono: p.phone || "",
    Email: p.email || "",
    CBU: p.cbu || "",
    Alias: p.alias || "",
    Direccion: p.address || "",
  }))
  exportToCSV(data, "proveedores")
}

// Exportar cuentas
export function exportCuentas(
  cuentas: { name: string; type: string; balance: number; owner: string }[]
) {
  const data = cuentas.map((c) => ({
    Nombre: c.name,
    Tipo: c.type,
    Saldo: c.balance,
    Propietario: c.owner,
  }))
  exportToCSV(data, "cuentas")
}

// Exportar movimientos de cuentas
export function exportMovimientosCuenta(
  movimientos: { date: string; description: string; amount: number; type: string; category?: string }[],
  accountName: string
) {
  const data = movimientos.map((m) => ({
    Fecha: m.date,
    Descripcion: m.description,
    Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
    Categoria: m.category || "",
    Monto: m.amount,
  }))
  exportToCSV(data, `movimientos_${accountName.replace(/\s+/g, "_")}`)
}

// Exportar finanzas personales
export function exportFinanzasPersonales(
  movimientos: { date: string; description: string; amount: number; type: string; category?: string }[],
  owner: string
) {
  const data = movimientos.map((m) => ({
    Fecha: m.date,
    Descripcion: m.description,
    Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
    Categoria: m.category || "",
    Monto: m.amount,
  }))
  exportToCSV(data, `finanzas_${owner}`)
}

// Exportar costos fijos de Nitia
export function exportCostosFijos(
  costos: { description: string; amount: number; category?: string; active: boolean }[]
) {
  const data = costos.map((c) => ({
    Descripcion: c.description,
    Monto: c.amount,
    Categoria: c.category || "",
    Activo: c.active ? "Si" : "No",
  }))
  exportToCSV(data, "costos_fijos_nitia")
}

// Exportar proyectos
export function exportProyectos(
  proyectos: { name: string; client: string; type: string; status: string; startDate?: string; budget?: number }[]
) {
  const data = proyectos.map((p) => ({
    Nombre: p.name,
    Cliente: p.client,
    Tipo: p.type,
    Estado: p.status,
    FechaInicio: p.startDate || "",
    Presupuesto: p.budget || 0,
  }))
  exportToCSV(data, "proyectos")
}

// Exportar movimientos globales
export function exportMovimientosGlobales(
  movimientos: { date: string; description: string; amount: number; type: string; category?: string; projectName?: string; providerName?: string }[]
) {
  const data = movimientos.map((m) => ({
    Fecha: m.date,
    Descripcion: m.description,
    Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
    Categoria: m.category || "",
    Proyecto: m.projectName || "",
    Proveedor: m.providerName || "",
    Monto: m.amount,
  }))
  exportToCSV(data, "movimientos_globales")
}
