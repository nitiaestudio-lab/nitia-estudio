"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatUSD, generateId, today } from "@/lib/helpers"
import { Stat, SecHead, Btn, Empty, Modal, FormInput, HR, EditableSelect, PeriodFilter, type PeriodValue } from "@/components/nitia-ui"
import type { FixedExpense } from "@/lib/types"
import { Plus, Pencil, Check, X, FileSpreadsheet, History } from "lucide-react"

export function NitiaCosts() {
  const { data, addRow, updateRow, deleteRow, addMovement, deleteMovement, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [payingCostId, setPayingCostId] = useState<string | null>(null)
  const [payAccountId, setPayAccountId] = useState("")
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const costs = data.nitiaFixedCosts
  const activeCosts = costs.filter(c => c.active)
  const inactiveCosts = costs.filter(c => !c.active)
  const totalActiveARS = activeCosts.filter(c => c.currency !== "USD").reduce((s, c) => s + c.amount, 0)
  const totalActiveUSD = activeCosts.filter(c => c.currency === "USD").reduce((s, c) => s + c.amount, 0)
  const totalActive = totalActiveARS
  const editingCost = editingId ? costs.find(c => c.id === editingId) : null

  // Payment tracking for selected month
  const yearNum = parseInt(viewMonth.split("-")[0])
  const monthNum = parseInt(viewMonth.split("-")[1])
  const monthPayments = data.fixedCostPayments.filter(p => p.year === yearNum && p.month === monthNum)

  const isMonthPaid = (costId: string) => monthPayments.some(p => p.fixed_cost_id === costId && p.paid)

  const unpayMonth = async (costId: string) => {
    const existing = monthPayments.find(p => p.fixed_cost_id === costId)
    if (existing) {
      if (existing.movement_id) {
        try { await deleteMovement(existing.movement_id) } catch {}
      }
      await deleteRow("fixed_cost_payments", existing.id, "fixedCostPayments")
    }
  }

  const confirmPayCost = async (costId: string, accountId: string) => {
    if (isMonthPaid(costId)) return
    const cost = activeCosts.find(c => c.id === costId)
    if (!cost) return
    const m = parseInt(viewMonth.split("-")[1])
    const y = parseInt(viewMonth.split("-")[0])
    const movId = generateId()
    try {
      await addMovement({
        id: movId, date: today(),
        description: `[Costo fijo Nitia] ${cost.description}`,
        amount: cost.amount, type: "egreso" as const,
        category: cost.category || "Costo fijo", account_id: accountId || null,
        medio_pago: cost.currency === "USD" ? "USD" : null,
        fixed_cost_id: costId,
      } as any)
      await addRow("fixed_cost_payments", {
        id: generateId(), fixed_cost_id: costId, movement_id: movId,
        month: m, year: y, paid: true,
        paid_date: today(),
        paid_amount: cost.amount,
      }, "fixedCostPayments")
    } catch (err) {
      console.error("Error paying cost:", err)
    }
    setPayingCostId(null)
    setPayAccountId("")
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
        Descripción: c.description, Monto: c.amount, Moneda: c.currency || "ARS", Categoría: c.category || "",
        "Día Vencimiento": c.due_day || 1, Activo: c.active ? "Sí" : "No",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costsSheet), "Costos Fijos")
      const paymentsSheet = data.fixedCostPayments.map(p => {
        const cost = costs.find(c => c.id === p.fixed_cost_id)
        return { Costo: cost?.description || "", Mes: p.month, Año: p.year, Pagado: p.paid ? "Sí" : "No", "Fecha Pago": p.paid_date || "", Monto: p.paid_amount || cost?.amount || "" }
      }).sort((a: any, b: any) => b.Año - a.Año || b.Mes - a.Mes)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsSheet), "Historial Pagos")
      const today = today()
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
        <Stat label="Total Mensual" ars={totalActive} usd={totalActiveUSD} highlight />
        <Stat label="Costos Activos" value={String(activeCosts.length)} />
        <Stat label="Pagados este mes" value={`${paidCount}/${activeCosts.length}`} sub={formatCurrency(paidTotal)} />
        <Stat label="Por Socia (50%)" ars={totalActive / 2} usd={totalActiveUSD / 2} />
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
                    <span className="text-xs text-muted-foreground ml-2">{cost.currency === "USD" ? formatUSD(cost.amount) : formatCurrency(cost.amount)}</span>
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

      {/* Costos Fijos - Cards */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Gastos Fijos del Estudio</h3>
            <p className="text-xs text-muted-foreground">{viewMonth.split("-").reverse().join("/")} — {paidCount}/{activeCosts.length} pagados</p>
          </div>
        </div>
        {activeCosts.length > 0 && (
          <div className="mb-4">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${(paidCount / activeCosts.length) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeCosts.map(cost => {
            const paid = isMonthPaid(cost.id)
            const payment = monthPayments.find(p => p.fixed_cost_id === cost.id && p.paid)
            return (
              <div key={cost.id} className={`relative border rounded-xl p-4 transition-all group ${paid ? "bg-green-50 border-green-200" : "bg-white border-border hover:border-[#5F5A46]"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => {
                    if (paid) { unpayMonth(cost.id) }
                    else { setPayingCostId(cost.id); setPayAccountId(data.accounts[0]?.id || "") }
                  }}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paid ? "bg-green-600 border-green-600 text-white" : "border-[#E0DDD0] hover:border-[#5F5A46]"}`}>
                    {paid && <Check size={12} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${paid ? "line-through text-muted-foreground" : ""}`}>{cost.description}</p>
                    <p className="text-xs text-muted-foreground">{cost.category || "Sin categoria"}{cost.due_day ? ` · Vence dia ${cost.due_day}` : ""}</p>
                    <p className={`text-base font-bold mt-1 ${paid ? "text-green-600" : "text-foreground"}`}>
                      {cost.currency === "USD" ? formatUSD(cost.amount) : formatCurrency(cost.amount)}
                      {cost.currency === "USD" && <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded ml-1">USD</span>}
                    </p>
                    {paid && payment?.paid_date && (
                      <p className="text-xs text-green-600 mt-0.5">Pagado: {new Date(payment.paid_date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</p>
                    )}
                    {paid && (() => {
                      const p = monthPayments.find(pp => pp.fixed_cost_id === cost.id && pp.paid)
                      const mov = p?.movement_id ? data.movements.find(mm => mm.id === p.movement_id) : null
                      const acc = mov?.account_id ? data.accounts.find(a => a.id === mov.account_id) : null
                      return acc ? <p className="text-[10px] text-green-600">Cuenta: {acc.name}</p> : null
                    })()}
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button onClick={() => setEditingId(cost.id)}
                    className="p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                </div>
              </div>
            )
          })}
          {activeCosts.length === 0 && <div className="col-span-full"><Empty title="Sin costos fijos" description="Agrega los gastos fijos del estudio" /></div>}
        </div>
        <HR />
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-muted-foreground">Total mensual</span>
          <div className="text-right">
            <p className="font-bold">{formatCurrency(totalActive)}</p>
            {totalActiveUSD > 0 && <p className="font-bold text-blue-700">{formatUSD(totalActiveUSD)}</p>}
          </div>
        </div>
      </div>

      {payingCostId && <PayCostModal
        cost={activeCosts.find(c => c.id === payingCostId)!}
        accounts={data.accounts}
        dollarRate={data.dollarRate}
        onClose={() => setPayingCostId(null)}
        onConfirm={(accountId) => confirmPayCost(payingCostId, accountId)}
      />}

      {inactiveCosts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 opacity-60">
          <SecHead title="Costos Inactivos" />
          {inactiveCosts.map(cost => (
            <div key={cost.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground line-through">{cost.description}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{cost.currency === "USD" ? formatUSD(cost.amount) : formatCurrency(cost.amount)}</span>
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
  const [currency, setCurrency] = useState<"ARS" | "USD">(cost?.currency ?? "ARS")
  const [active, setActive] = useState(cost?.active ?? true)
  const [dueDay, setDueDay] = useState(String(cost?.due_day ?? "1"))

  return (
    <Modal isOpen={true} title={cost ? "Editar Costo" : "Nuevo Costo"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: cost?.id ?? generateId(), description,
        amount: parseFloat(amount), category, currency, active, due_day: parseInt(dueDay) || 1,
      })}} className="space-y-4">
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto mensual" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
            onAddNew={onAddCategory} onDelete={onDeleteCategory} />
        </div>
        <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
          <button type="button" onClick={() => setCurrency("ARS")} className={`flex-1 px-4 py-1.5 text-sm font-medium ${currency === "ARS" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>$ ARS</button>
          <button type="button" onClick={() => setCurrency("USD")} className={`flex-1 px-4 py-1.5 text-sm font-medium ${currency === "USD" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>U$D</button>
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

// =================== PAY COST MODAL (with currency mismatch handling) ===================
function PayCostModal({ cost, accounts, dollarRate, onClose, onConfirm }: {
  cost: FixedExpense; accounts: any[]; dollarRate: any
  onClose: () => void; onConfirm: (accountId: string) => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "")
  const [tcBlue, setTcBlue] = useState(String(dollarRate?.sell || ""))

  if (!cost) return null
  const selectedAccount = accounts.find((a: any) => a.id === accountId)
  const isCostUSD = cost.currency === "USD"
  const isAccountUSD = selectedAccount?.type === "dolares"
  const hasMismatch = accountId && ((isCostUSD && !isAccountUSD) || (!isCostUSD && isAccountUSD))
  const tcNum = parseFloat(tcBlue) || 0
  const convertedAmount = hasMismatch && tcNum > 0 ? (isCostUSD ? cost.amount * tcNum : cost.amount / tcNum) : 0

  return (
    <Modal isOpen={true} title={`Pagar: ${cost.description}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Monto: <strong className="text-foreground">{cost.currency === "USD" ? formatUSD(cost.amount) : formatCurrency(cost.amount)}</strong></p>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">¿Con qué cuenta se paga? <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white">
            <option value="">Sin cuenta específica</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type === "dolares" ? "Dólares" : "Pesos"}) — {a.type === "dolares" ? formatUSD(a.balance) : formatCurrency(a.balance)}
              </option>
            ))}
          </select>
        </div>
        {hasMismatch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-blue-800">
              ⚠️ Moneda distinta a la cuenta ({isAccountUSD ? "Dólares" : "Pesos"})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-1">TC Blue (Infobae)</label>
                <input type="number" value={tcBlue} onChange={e => setTcBlue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white" inputMode="decimal" />
              </div>
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-1">Se debitará</label>
                <p className="text-base font-bold text-blue-900">
                  {isAccountUSD ? formatUSD(convertedAmount) : formatCurrency(convertedAmount)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-blue-600">
              {isCostUSD
                ? `U$D ${cost.amount.toLocaleString("es-AR")} × $${tcNum.toLocaleString("es-AR")} = ${formatCurrency(convertedAmount)}`
                : `$${cost.amount.toLocaleString("es-AR")} ÷ $${tcNum.toLocaleString("es-AR")} = U$D ${convertedAmount.toFixed(2)}`
              }
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onConfirm(accountId)}>Confirmar Pago</Btn>
        </div>
      </div>
    </Modal>
  )
}
