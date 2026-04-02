"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId } from "@/lib/helpers"
import { Stat, SecHead, Btn, Empty, Modal, FormInput, HR, EditableSelect, PeriodFilter, type PeriodValue } from "@/components/nitia-ui"
import type { FixedExpense } from "@/lib/types"
import { Plus, Pencil, Check, X, FileSpreadsheet, History } from "lucide-react"

export function NitiaCosts() {
  const { data, addRow, updateRow, deleteRow, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const costs = data.nitiaFixedCosts
  const activeCosts = costs.filter(c => c.active)
  const inactiveCosts = costs.filter(c => !c.active)
  const totalActive = activeCosts.reduce((s, c) => s + c.amount, 0)
  const editingCost = editingId ? costs.find(c => c.id === editingId) : null

  // Payment tracking for selected month
  const [monthNum, yearNum] = viewMonth.split("-").map(Number).reverse()
  const monthPayments = data.fixedCostPayments.filter(p => p.year === yearNum && p.month === (monthNum || parseInt(viewMonth.split("-")[1])))

  const isMonthPaid = (costId: string) => monthPayments.some(p => p.fixed_cost_id === costId && p.paid)

  const toggleMonthPaid = async (costId: string) => {
    const existing = monthPayments.find(p => p.fixed_cost_id === costId)
    const m = parseInt(viewMonth.split("-")[1])
    const y = parseInt(viewMonth.split("-")[0])
    if (existing) {
      await updateRow("fixed_cost_payments", existing.id, { paid: !existing.paid, paid_date: !existing.paid ? new Date().toISOString().split("T")[0] : null }, "fixedCostPayments")
    } else {
      await addRow("fixed_cost_payments", {
        id: generateId(), fixed_cost_id: costId,
        month: m, year: y, paid: true,
        paid_date: new Date().toISOString().split("T")[0],
      }, "fixedCostPayments")
    }
  }

  const byCategory = activeCosts.reduce((acc, cost) => {
    const cat = cost.category || "Otro"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(cost)
    return acc
  }, {} as Record<string, FixedExpense[]>)

  const paidCount = activeCosts.filter(c => isMonthPaid(c.id)).length
  const paidTotal = activeCosts.filter(c => isMonthPaid(c.id)).reduce((s, c) => s + c.amount, 0)

  const handleExportXLSX = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const costsSheet = activeCosts.map(c => ({
        Descripción: c.description, Monto: c.amount, Categoría: c.category || "",
        "Día Vencimiento": c.due_day || 1, Activo: c.active ? "Sí" : "No",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costsSheet), "Costos Fijos")
      const paymentsSheet = data.fixedCostPayments.map(p => {
        const cost = costs.find(c => c.id === p.fixed_cost_id)
        return { Costo: cost?.description || "", Mes: p.month, Año: p.year, Pagado: p.paid ? "Sí" : "No", "Fecha Pago": p.paid_date || "", Monto: p.paid_amount || cost?.amount || "" }
      }).sort((a: any, b: any) => b.Año - a.Año || b.Mes - a.Mes)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsSheet), "Historial Pagos")
      const today = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `costos_fijos_nitia_${today}.xlsx`)
    } catch {}
  }

  const historyMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }) }
  })

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Costos Fijos Nitia</h1>
          <p className="text-sm text-[#76746A] mt-1">Gastos fijos mensuales del estudio</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-[#76746A]">Mes:</label>
          <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[#E0DDD0] bg-white" />
          <Btn variant="soft" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History size={14} className="mr-1 inline" />{showHistory ? "Vista Actual" : "Historial"}
          </Btn>
          <Btn variant="soft" size="sm" onClick={handleExportXLSX}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Costo</Btn>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Total Mensual" value={formatCurrency(totalActive)} highlight />
        <Stat label="Costos Activos" value={String(activeCosts.length)} />
        <Stat label="Pagados este mes" value={`${paidCount}/${activeCosts.length}`} sub={formatCurrency(paidTotal)} />
        <Stat label="Por Socia (50%)" value={formatCurrency(totalActive / 2)} />
      </div>

      {/* Costs by Category with payment checkboxes */}
      {/* Historial Mensual */}
      {showHistory && (
        <div className="bg-card border border-border rounded-xl p-6 overflow-x-auto">
          <SecHead title="Historial Mensual (últimos 6 meses)" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Costo</th>
                {historyMonths.map(hm => (
                  <th key={`${hm.year}-${hm.month}`} className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground capitalize">{hm.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeCosts.map(cost => (
                <tr key={cost.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-medium">{cost.description}</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatCurrency(cost.amount)}</span>
                  </td>
                  {historyMonths.map(hm => {
                    const payment = data.fixedCostPayments.find(
                      p => p.fixed_cost_id === cost.id && p.year === hm.year && p.month === hm.month && p.paid
                    )
                    return (
                      <td key={`${hm.year}-${hm.month}`} className="text-center py-2 px-2">
                        {payment ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700"><Check size={14} /></span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400"><X size={14} /></span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Costs by Category */}
      <div className="grid lg:grid-cols-2 gap-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="bg-card border border-border rounded-xl p-6">
            <SecHead title={category} />
            <div className="space-y-2">
              {items.map(cost => (
                <div key={cost.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 group">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleMonthPaid(cost.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isMonthPaid(cost.id) ? "bg-green-600 border-green-600 text-white" : "border-[#E0DDD0] hover:border-[#5F5A46]"
                      }`}>
                      {isMonthPaid(cost.id) && <Check size={12} />}
                    </button>
                    <span className={`text-sm ${isMonthPaid(cost.id) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {cost.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatCurrency(cost.amount)}</span>
                    <button onClick={() => setEditingId(cost.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <HR />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold">{formatCurrency(items.reduce((s, c) => s + c.amount, 0))}</span>
            </div>
          </div>
        ))}
      </div>

      {inactiveCosts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 opacity-60">
          <SecHead title="Costos Inactivos" />
          {inactiveCosts.map(cost => (
            <div key={cost.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground line-through">{cost.description}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{formatCurrency(cost.amount)}</span>
                <button onClick={() => setEditingId(cost.id)} className="p-1 hover:bg-accent rounded">
                  <Pencil size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {costs.length === 0 && <Empty title="Sin costos fijos" description="Agregá los gastos fijos del estudio" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {(showNew || editingCost) && (
        <CostModal
          cost={editingCost ?? undefined}
          categories={getCategoriesFor("gasto_fijo_nitia")}
          onAddCategory={(name) => addCategory("gasto_fijo_nitia", name)}
          onDeleteCategory={deleteCategory}
          onClose={() => { setShowNew(false); setEditingId(null) }}
          onSave={async (cost) => {
            if (editingCost) await updateRow("nitia_fixed_costs", cost.id, cost, "nitiaFixedCosts")
            else await addRow("nitia_fixed_costs", cost, "nitiaFixedCosts")
            setShowNew(false); setEditingId(null)
          }}
          onDelete={editingCost ? async () => {
            await deleteRow("nitia_fixed_costs", editingCost.id, "nitiaFixedCosts")
            setEditingId(null)
          } : undefined}
        />
      )}
    </div>
  )
}

function CostModal({ cost, categories, onAddCategory, onDeleteCategory, onClose, onSave, onDelete }: {
  cost?: FixedExpense; categories: { id: string; name: string }[]
  onAddCategory: (name: string) => void
  onDeleteCategory: (name: string) => void
  onClose: () => void; onSave: (c: FixedExpense) => void; onDelete?: () => void
}) {
  const [description, setDescription] = useState(cost?.description ?? "")
  const [amount, setAmount] = useState(String(cost?.amount ?? ""))
  const [category, setCategory] = useState(cost?.category ?? "")
  const [active, setActive] = useState(cost?.active ?? true)
  const [dueDay, setDueDay] = useState(String(cost?.due_day ?? "1"))

  return (
    <Modal isOpen={true} title={cost ? "Editar Costo" : "Nuevo Costo"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: cost?.id ?? generateId(), description,
        amount: parseFloat(amount), category, active, due_day: parseInt(dueDay) || 1,
      })}} className="space-y-4">
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto mensual" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
            onAddNew={onAddCategory} onDelete={onDeleteCategory} />
        </div>
        <FormInput label="Día de vencimiento (1-31)" type="number" value={dueDay} onChange={setDueDay} min="1" max="31" />
        <div className="flex items-center gap-3">
          <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-border" />
          <label htmlFor="active" className="text-sm">Costo activo</label>
        </div>
        <div className="flex justify-between pt-4">
          {onDelete && <Btn variant="danger" onClick={onDelete}>Eliminar</Btn>}
          <div className="flex gap-3 ml-auto">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" disabled={!description || !amount}>{cost ? "Guardar" : "Crear"}</Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}
