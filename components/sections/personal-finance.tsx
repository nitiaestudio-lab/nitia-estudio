"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { Stat, SecHead, Btn, Empty, Modal, FormInput, HR, PeriodFilter, type PeriodValue, EditableSelect, ConfirmDeleteModal } from "@/components/nitia-ui"
import { Plus, Pencil, Trash2, FileSpreadsheet, Search, Check, ArrowUpDown, ChevronDown, ChevronUp, X, Filter } from "lucide-react"
import type { PersonalFinanceMovement } from "@/lib/types"

export function PersonalFinance() {
  const { role, data, addRow, updateRow, deleteRow, deleteMovement, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const isAdmin = role === "paula" || role === "cami"
  const ownTab = role === "cami" ? "cami" : "paula"

  const effectiveTab = isAdmin ? ownTab : ownTab
  const [period, setPeriod] = useState<PeriodValue>("mes")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<PersonalFinanceMovement | null>(null)
  const [addType, setAddType] = useState<"fixed" | "variable" | "income">("variable")
  const [searchQ, setSearchQ] = useState("")
  const [filterType, setFilterType] = useState<"all" | "ingreso" | "egreso" | "fijo">("all")
  const [sortField, setSortField] = useState<"date" | "amount" | "description">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const ownerData = data.personalFinanceMovements.filter(m => m.owner === effectiveTab)

  // Fixed costs (always show, not filtered by period)
  const fixedExpenses = ownerData.filter(m => m.type === "egreso" && m.is_fixed && m.active !== false)

  // All movements (variable + incomes) filtered by period
  const periodFiltered = filterByDateRange(
    ownerData.filter(m => !m.is_fixed),
    period, customStart, customEnd
  )

  // Auto-calculate income from projects (50% split)
  const projectIncomes = data.movements
    .filter(m => m.type === "ingreso" && m.auto_split && m.project_id)
    .map(m => ({
      id: `proj_${m.id}`,
      description: `Proyecto: ${data.projects.find(p => p.id === m.project_id)?.name || "—"}`,
      amount: m.amount * ((m.split_percentage || 50) / 100),
      date: m.date,
      type: "ingreso" as const,
      category: "Proyecto",
      medio_pago: m.medio_pago,
      isAuto: true,
    }))
  const periodProjectIncomes = filterByDateRange(
    projectIncomes, period, customStart, customEnd
  )

  // Unified movements list
  const allMovements = useMemo(() => {
    let items = [
      ...periodFiltered.map(m => ({ ...m, isAuto: false })),
      ...periodProjectIncomes,
    ]
    if (searchQ) {
      const q = searchQ.toLowerCase()
      items = items.filter(m => m.description.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q))
    }
    if (filterType === "ingreso") items = items.filter(m => m.type === "ingreso")
    else if (filterType === "egreso") items = items.filter(m => m.type === "egreso")
    // sort
    items.sort((a, b) => {
      let cmp = 0
      if (sortField === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortField === "amount") cmp = a.amount - b.amount
      else cmp = a.description.localeCompare(b.description)
      return sortDir === "asc" ? cmp : -cmp
    })
    return items
  }, [periodFiltered, periodProjectIncomes, searchQ, filterType, sortField, sortDir])

  const isUSD = (m: any) => m.medio_pago === "USD"
  const totalFixed = fixedExpenses.filter(m => !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalFixedUSD = fixedExpenses.filter(m => isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalVariable = periodFiltered.filter(m => m.type === "egreso" && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalVariableUSD = periodFiltered.filter(m => m.type === "egreso" && isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalIncome = periodFiltered.filter(m => m.type === "ingreso" && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalIncomeUSD = periodFiltered.filter(m => m.type === "ingreso" && isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalProjectIncome = periodProjectIncomes.filter(m => !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalProjectIncomeUSD = periodProjectIncomes.filter(m => isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const balance = totalIncome + totalProjectIncome - totalFixed - totalVariable
  const balanceUSD = totalIncomeUSD + totalProjectIncomeUSD - totalFixedUSD - totalVariableUSD
  const fmtUSD = (n: number) => `U$D ${new Intl.NumberFormat("es-AR").format(n)}`
  const dollarSell = data.dollarRate?.sell || 0
  const totalFixedEstARS = totalFixed + (dollarSell > 0 ? totalFixedUSD * dollarSell : 0)
  const totalEstARS = (totalIncome + totalProjectIncome + (dollarSell > 0 ? (totalIncomeUSD + totalProjectIncomeUSD) * dollarSell : 0))
    - totalFixedEstARS - totalVariable - (dollarSell > 0 ? totalVariableUSD * dollarSell : 0)

  const saveItem = async (item: PersonalFinanceMovement) => {
    if (editingItem) {
      await updateRow("personal_finance_movements", item.id, item, "personalFinanceMovements")
    } else {
      await addRow("personal_finance_movements", item, "personalFinanceMovements")
    }
    setShowAddDialog(false); setEditingItem(null)
  }

  const deleteItem = async (id: string) => {
    if (confirm("¿Eliminar este movimiento?")) {
      await deleteRow("personal_finance_movements", id, "personalFinanceMovements")
    }
  }

  const toggleSort = (field: "date" | "amount" | "description") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir(field === "amount" ? "desc" : "asc") }
  }

  const SortHeader = ({ field, label, className }: { field: "date" | "amount" | "description"; label: string; className?: string }) => (
    <th className={`px-3 py-2.5 text-left cursor-pointer hover:bg-[#E0DDD0]/50 select-none ${className || ""}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
        {label}
        {sortField === field ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-30" />}
      </div>
    </th>
  )

  // Fixed cost payment tracking (month is 1-indexed: January=1, April=4)
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const isFixedPaid = (fixedId: string) => {
    return data.fixedCostPayments?.some(p =>
      p.fixed_cost_id === fixedId && p.month === currentMonth && p.year === currentYear && p.paid
    ) || false
  }
  const getFixedPaymentDate = (fixedId: string) => {
    const payment = data.fixedCostPayments?.find(p =>
      p.fixed_cost_id === fixedId && p.month === currentMonth && p.year === currentYear && p.paid
    )
    return payment?.paid_date || null
  }

  const unpayFixed = async (item: PersonalFinanceMovement) => {
    const payment = data.fixedCostPayments?.find(p =>
      p.fixed_cost_id === item.id && p.month === currentMonth && p.year === currentYear
    )
    if (payment) {
      // Remove linked personal_finance_movements record
      const pfId = payment.pf_movement_id
      if (pfId) {
        try { await deleteRow("personal_finance_movements", pfId, "personalFinanceMovements") } catch {}
      } else {
        // Fallback: search by description match for old records without pf_movement_id
        const pfMov = data.personalFinanceMovements.find(m =>
          m.description === `[Gasto fijo] ${item.description}` && m.type === "egreso"
        )
        if (pfMov) {
          try { await deleteRow("personal_finance_movements", pfMov.id, "personalFinanceMovements") } catch {}
        }
      }
      // Remove legacy global movement if exists (from old payments)
      if (payment.movement_id) {
        try { await deleteMovement(payment.movement_id) } catch {}
      }
      await deleteRow("fixed_cost_payments", payment.id, "fixedCostPayments")
    }
  }

  const confirmPayFixed = async (item: PersonalFinanceMovement) => {
    // Check if already paid this month (prevent duplicates)
    if (isFixedPaid(item.id)) return
    const pfMovId = generateId()
    // Only create personal_finance_movements record (NO global movement)
    await addRow("personal_finance_movements", {
      id: pfMovId, date: today(), description: `[Gasto fijo] ${item.description}`,
      amount: item.amount, type: "egreso" as const,
      category: item.category || "Gasto fijo",
      medio_pago: item.medio_pago || null,
      owner: effectiveTab, is_fixed: false, active: true,
    } as any, "personalFinanceMovements")
    // Create payment record (no movement_id since no global movement)
    await addRow("fixed_cost_payments", {
      id: generateId(),
      fixed_cost_id: item.id,
      movement_id: null,
      pf_movement_id: pfMovId,
      month: currentMonth,
      year: currentYear,
      paid: true,
      paid_date: today(),
      paid_amount: item.amount,
    }, "fixedCostPayments")
  }

  const [editingPayDate, setEditingPayDate] = useState<string | null>(null)
  const [payDateValue, setPayDateValue] = useState("")

  const savePayDate = async (fixedId: string) => {
    const payment = data.fixedCostPayments?.find(p =>
      p.fixed_cost_id === fixedId && p.month === currentMonth && p.year === currentYear
    )
    if (payment) {
      await updateRow("fixed_cost_payments", payment.id, { paid_date: payDateValue }, "fixedCostPayments")
    }
    setEditingPayDate(null)
  }

  const handleExportXLSX = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const allItems = [...fixedExpenses, ...periodFiltered].map(m => ({
        Fecha: m.date, Descripción: m.description, Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
        Categoría: m.category || "", Monto: m.amount, Fijo: m.is_fixed ? "Sí" : "No",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allItems), "Finanzas Personales")
      const td = today()
      XLSX.writeFile(wb, `finanzas_${effectiveTab}_${td}.xlsx`)
    } catch {}
  }

  const paidCount = fixedExpenses.filter(f => isFixedPaid(f.id)).length
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const startEdit = (id: string, field: string, value: string) => { setEditingCell({ id, field }); setEditValue(value) }
  const saveEdit = async (movId: string) => {
    if (!editingCell) return
    const updates: Record<string, any> = {}
    if (editingCell.field === "description") updates.description = editValue
    else if (editingCell.field === "amount") updates.amount = parseFloat(editValue) || 0
    else if (editingCell.field === "date") updates.date = editValue
    await updateRow("personal_finance_movements", movId, updates, "personalFinanceMovements")
    setEditingCell(null)
  }
  const cancelEdit = () => setEditingCell(null)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Finanzas Personales</h1>
          <p className="text-sm text-[#76746A] mt-1">{ownTab === "paula" ? "Paula" : "Cami"} — Control de gastos e ingresos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="soft" size="sm" onClick={handleExportXLSX}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <PeriodFilter value={period} onChange={setPeriod} onCustomRange={(s,e) => { setCustomStart(s); setCustomEnd(e) }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ingresos" ars={totalIncome + totalProjectIncome} usd={totalIncomeUSD + totalProjectIncomeUSD} />
        <Stat label="Gastos Fijos" ars={totalFixed} usd={totalFixedUSD} />
        <Stat label="Gastos Variables" ars={totalVariable} usd={totalVariableUSD} />
        <Stat label="Balance" ars={balance} usd={balanceUSD} sub={dollarSell > 0 && balanceUSD !== 0 ? `≈ ${formatCurrency(totalEstARS)}` : undefined} highlight={balance >= 0} />
      </div>

      {/* ============ COSTOS FIJOS - Cards checkables ============ */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Gastos Fijos Mensuales</h3>
            <p className="text-xs text-muted-foreground">{monthNames[currentMonth - 1]} {currentYear} — {paidCount}/{fixedExpenses.length} pagados</p>
          </div>
          <Btn size="sm" onClick={() => { setEditingItem(null); setAddType("fixed"); setShowAddDialog(true) }}>
            <Plus size={14} className="mr-1 inline" />Agregar
          </Btn>
        </div>

        {/* Progress bar */}
        {fixedExpenses.length > 0 && (
          <div className="mb-4">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${fixedExpenses.length > 0 ? (paidCount / fixedExpenses.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fixedExpenses.map(item => {
            const paid = isFixedPaid(item.id)
            const payDate = getFixedPaymentDate(item.id)
            return (
              <div key={item.id} className={`relative border rounded-xl p-4 transition-all group ${paid ? "bg-green-50 border-green-200" : "bg-white border-border hover:border-[#5F5A46]"}`}>
                {/* Checkbox */}
                <div className="flex items-start gap-3">
                  <button onClick={() => {
                    if (paid) { unpayFixed(item) }
                    else { confirmPayFixed(item) }
                  }}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paid ? "bg-green-600 border-green-600 text-white" : "border-[#E0DDD0] hover:border-[#5F5A46]"}`}>
                    {paid && <Check size={12} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${paid ? "line-through text-muted-foreground" : ""}`}>{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <p className={`text-base font-bold mt-1 ${paid ? "text-green-600" : "text-foreground"}`}>{formatCurrency(item.amount)}</p>
                    {/* Fecha de pago */}
                    {paid && (
                      <div className="mt-1">
                        {editingPayDate === item.id ? (
                          <div className="flex items-center gap-1">
                            <input type="date" value={payDateValue} onChange={e => setPayDateValue(e.target.value)}
                              className="text-xs px-1.5 py-0.5 border border-green-300 rounded bg-white" autoFocus
                              onKeyDown={e => { if (e.key === "Enter") savePayDate(item.id); if (e.key === "Escape") setEditingPayDate(null) }} />
                            <button onClick={() => savePayDate(item.id)} className="text-green-600 p-0.5"><Check size={12} /></button>
                            <button onClick={() => setEditingPayDate(null)} className="text-red-500 p-0.5"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingPayDate(item.id); setPayDateValue(payDate || today()) }}
                            className="text-xs text-green-600 hover:underline">
                            Pagado: {payDate ? formatDate(payDate) : "hoy"} ✎
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Edit/Delete */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button onClick={() => { setEditingItem(item); setAddType("fixed"); setShowAddDialog(true) }}
                    className="p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                  <button onClick={() => deleteItem(item.id)}
                    className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                </div>
              </div>
            )
          })}
          {fixedExpenses.length === 0 && <div className="col-span-full"><Empty title="Sin gastos fijos" description="Agregá tus gastos fijos mensuales" /></div>}
        </div>
        <HR />
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-muted-foreground">Total mensual</span>
          <div className="text-right">
            <p className="font-bold">{formatCurrency(totalFixed)}</p>
            {totalFixedUSD > 0 && <p className="font-bold text-blue-700">{fmtUSD(totalFixedUSD)}</p>}
            {totalFixedUSD > 0 && dollarSell > 0 && <p className="text-xs text-muted-foreground">≈ {formatCurrency(totalFixedEstARS)} total</p>}
          </div>
        </div>
      </div>

      {/* ============ MOVIMIENTOS - Tabla tipo Excel ============ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar movimientos..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" /></div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
              {(["all", "ingreso", "egreso"] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium ${filterType === t ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A] hover:bg-[#F0EDE4]"}`}>
                  {t === "all" ? "Todos" : t === "ingreso" ? "Ingresos" : "Egresos"}
                </button>
              ))}
            </div>
            <Btn size="sm" variant="soft" onClick={() => { setEditingItem(null); setAddType("variable"); setShowAddDialog(true) }}>
              <Plus size={14} className="mr-1 inline" />Gasto
            </Btn>
            <Btn size="sm" onClick={() => { setEditingItem(null); setAddType("income"); setShowAddDialog(true) }}>
              <Plus size={14} className="mr-1 inline" />Ingreso
            </Btn>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {allMovements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F0EDE4]">
                  <tr>
                    <SortHeader field="date" label="Fecha" className="w-28" />
                    <SortHeader field="description" label="Descripción" />
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Categoría</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-20">Tipo</th>
                    <SortHeader field="amount" label="Monto" className="w-32" />
                    <th className="px-3 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {allMovements.map(mov => (
                    <tr key={mov.id} className={`group hover:bg-[#FAFAF9] transition-colors ${mov.isAuto ? "bg-green-50/30" : ""}`}>
                      <td className="px-3 py-2.5">
                        {editingCell?.id === mov.id && editingCell.field === "date" ? (
                          <input type="date" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-xs border border-[#5F5A46] rounded bg-white" />
                        ) : (
                          <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" onDoubleClick={() => !mov.isAuto && startEdit(mov.id, "date", mov.date)}>
                            {formatDate(mov.date)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingCell?.id === mov.id && editingCell.field === "description" ? (
                          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-sm border border-[#5F5A46] rounded bg-white" />
                        ) : (
                          <>
                            <span className={`font-medium cursor-pointer hover:underline ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}
                              onDoubleClick={() => !mov.isAuto && startEdit(mov.id, "description", mov.description)}>
                              {mov.description}
                            </span>
                            {mov.isAuto && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded">auto</span>}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {mov.category && <span className="text-xs px-1.5 py-0.5 bg-[#F0EDE4] text-[#76746A] rounded">{mov.category}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mov.type === "ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {editingCell?.id === mov.id && editingCell.field === "amount" ? (
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-sm border border-[#5F5A46] rounded bg-white text-right" />
                        ) : (
                          <>
                            <span className={`font-semibold cursor-pointer hover:underline ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}
                              onDoubleClick={() => !mov.isAuto && startEdit(mov.id, "amount", String(mov.amount))}>
                              {mov.type === "ingreso" ? "+" : "-"}{(mov as any).medio_pago === "USD" ? `U$D ${new Intl.NumberFormat("es-AR").format(mov.amount)}` : formatCurrency(mov.amount)}
                            </span>
                            {(mov as any).medio_pago === "USD" && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">USD</span>}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {!mov.isAuto && (
                          <div className="flex gap-1 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                            <button onClick={() => {
                              const orig = ownerData.find(m => m.id === mov.id)
                              if (orig) {
                                setEditingItem(orig)
                                setAddType(orig.type === "ingreso" ? "income" : "variable")
                                setShowAddDialog(true)
                              }
                            }} className="p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                            <button onClick={() => deleteItem(mov.id)}
                              className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F0EDE4] font-semibold text-sm">
                    <td className="px-3 py-3" colSpan={4}>
                      <span className="text-muted-foreground">{allMovements.length} movimiento{allMovements.length !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {(() => {
                        const isUSD = (m: any) => m.medio_pago === "USD"
                        const ingARS = allMovements.filter(m => m.type === "ingreso" && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
                        const ingUSD = allMovements.filter(m => m.type === "ingreso" && isUSD(m)).reduce((s, m) => s + m.amount, 0)
                        const egrARS = allMovements.filter(m => m.type === "egreso" && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
                        const egrUSD = allMovements.filter(m => m.type === "egreso" && isUSD(m)).reduce((s, m) => s + m.amount, 0)
                        return <>
                          <span className="text-green-700">+{formatCurrency(ingARS)}</span>
                          {ingUSD > 0 && <span className="text-green-600 text-[10px] ml-1">+U$D {new Intl.NumberFormat("es-AR").format(ingUSD)}</span>}
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-red-700">-{formatCurrency(egrARS)}</span>
                          {egrUSD > 0 && <span className="text-red-600 text-[10px] ml-1">-U$D {new Intl.NumberFormat("es-AR").format(egrUSD)}</span>}
                        </>
                      })()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : <Empty title="Sin movimientos" description="Agregá gastos o ingresos" />}
          <p className="text-xs text-muted-foreground px-3 py-2">Doble click en fecha, descripcion o monto para editar inline</p>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <FinanceItemModal
          item={editingItem} type={addType} owner={effectiveTab}
          categories={getCategoriesFor(addType === "fixed" ? "gasto_fijo_personal" : addType === "variable" ? "gasto_variable_personal" : "ingreso_personal")}
          onAddCategory={n => addCategory(addType === "fixed" ? "gasto_fijo_personal" : addType === "variable" ? "gasto_variable_personal" : "ingreso_personal", n)}
          onDeleteCategory={deleteCategory}
          onClose={() => { setShowAddDialog(false); setEditingItem(null) }}
          onSave={saveItem}
        />
      )}
    </div>
  )
}

function FinanceItemModal({ item, type, owner, categories, onAddCategory, onDeleteCategory, onClose, onSave }: {
  item: PersonalFinanceMovement | null; type: "fixed" | "variable" | "income"; owner: string
  categories: { id: string; name: string }[]; onAddCategory: (n: string) => void; onDeleteCategory: (n: string) => void
  onClose: () => void; onSave: (item: PersonalFinanceMovement) => void
}) {
  const titles = { fixed: "Gasto Fijo", variable: "Gasto Variable", income: "Ingreso" }
  const [description, setDescription] = useState(item?.description ?? "")
  const [amount, setAmount] = useState(String(item?.amount ?? ""))
  const [category, setCategory] = useState(item?.category ?? "")
  const [date, setDate] = useState(item?.date ?? today())
  const [note, setNote] = useState(item?.note ?? "")
  const [currency, setCurrency] = useState<"ARS" | "USD">(item?.medio_pago === "USD" ? "USD" : "ARS")

  return (
    <Modal isOpen={true} title={`${item ? "Editar" : "Nuevo"} ${titles[type]}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: item?.id ?? generateId(), owner, date,
        description, amount: parseFloat(amount),
        type: type === "income" ? "ingreso" : "egreso",
        category, is_fixed: type === "fixed", active: true,
        medio_pago: currency === "USD" ? "USD" : null,
        note, created_at: item?.created_at ?? new Date().toISOString(),
      })}} className="space-y-4">
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>
        <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
          <button type="button" onClick={() => setCurrency("ARS")} className={`flex-1 px-4 py-1.5 text-sm font-medium transition-colors ${currency === "ARS" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>$ ARS</button>
          <button type="button" onClick={() => setCurrency("USD")} className={`flex-1 px-4 py-1.5 text-sm font-medium transition-colors ${currency === "USD" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>U$D</button>
        </div>
        <EditableSelect label="Categoría" value={category} onChange={setCategory}
          options={categories.map(c => ({ value: c.name, label: c.name }))} onAddNew={onAddCategory} onDelete={onDeleteCategory} />
        <FormInput label="Nota (opcional)" value={note} onChange={setNote} />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount}>{item ? "Guardar" : "Agregar"}</Btn>
        </div>
      </form>
    </Modal>
  )
}
