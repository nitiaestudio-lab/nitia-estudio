"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatUSD, projectTotalClientPrice, projectTotalCost, projectIncome, projectClientPriceByCurrency } from "@/lib/helpers"
import { Stat, SecHead, Tag, HR, Dual } from "@/components/nitia-ui"
import { canSee } from "@/lib/seed-data"
import { TrendingUp, FolderOpen, Users, DollarSign, CheckCircle, Clock, AlertCircle, CalendarClock, RefreshCw, Pencil, X } from "lucide-react"

export function Dashboard() {
  const { role, data, setSection, setSelectedProjectId, userPermissions, fetchDollarRate, setManualDollarRate, clearDollarOverride } = useApp()
  const isFull = canSee(role, userPermissions)

  const activeProjects = data.projects.filter(p => p.status === "activo")
  const totalBudgetBC = data.projects.reduce((s, p) => { const bc = projectClientPriceByCurrency(p, data.projectItems, data.quoteComparisons); return { ars: s.ars + bc.ars, usd: s.usd + bc.usd } }, { ars: 0, usd: 0 })
  const totalBudget = totalBudgetBC.ars
  const totalBalanceARS = data.accounts.filter(a => a.type !== "dolares").reduce((s, a) => s + (a.balance || 0), 0)
  const totalBalanceUSD = data.accounts.filter(a => a.type === "dolares").reduce((s, a) => s + (a.balance || 0), 0)
  const totalCollectedARS = data.movements.filter(m => m.type === "ingreso" && m.project_id && m.medio_pago !== "USD").reduce((s, m) => s + m.amount, 0)
  const totalCollectedUSD = data.movements.filter(m => m.type === "ingreso" && m.project_id && m.medio_pago === "USD").reduce((s, m) => s + m.amount, 0)
  const estimatedPending = totalBudget - totalCollectedARS  // Presupuesto siempre en ARS, restar solo cobros ARS

  const pendingTasks = data.tasks.filter(t => t.status === "pendiente").length
  const inProgressTasks = data.tasks.filter(t => t.status === "en-curso").length
  const completedTasks = data.tasks.filter(t => t.status === "completada").length
  const activeFixedCosts = data.nitiaFixedCosts.filter(c => c.active)
  const fixedCostsTotal = activeFixedCosts.filter(c => c.currency !== "USD").reduce((s, c) => s + c.amount, 0)
  const fixedCostsTotalUSD = activeFixedCosts.filter(c => c.currency === "USD").reduce((s, c) => s + c.amount, 0)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()
  const monthPayments = data.fixedCostPayments.filter(p => p.year === currentYear && p.month === currentMonth && p.paid)
  const unpaidFixedCosts = data.nitiaFixedCosts
    .filter(c => c.active && !monthPayments.some(p => p.fixed_cost_id === c.id))
    .sort((a, b) => (a.due_day || 1) - (b.due_day || 1))

  const partnerKey = role === "cami" ? "cami" : "paula"
  const personalMovements = data.personalFinanceMovements.filter(m => m.owner === partnerKey)
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  const personalFixed = personalMovements.filter(m => m.type === "egreso" && m.is_fixed && m.active !== false).reduce((s, m) => s + m.amount, 0)
  const personalVariable = personalMovements.filter(m => m.type === "egreso" && !m.is_fixed && m.date?.startsWith(monthPrefix)).reduce((s, m) => s + m.amount, 0)
  const personalIncome = personalMovements.filter(m => m.type === "ingreso" && m.date?.startsWith(monthPrefix)).reduce((s, m) => s + m.amount, 0)
  const personalBalance = personalIncome - personalFixed - personalVariable

  const recentMovements = [...data.movements]
    .filter(m => !m.description?.startsWith("[Gasto fijo]"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Dashboard</h1>
        <p className="text-sm text-[#76746A] mt-1">Resumen general del estudio</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setSection("projects")} className="cursor-pointer">
          <Stat label="Proyectos Activos" value={activeProjects.length} sub={`de ${data.projects.length} totales`} />
        </div>
        {isFull && <>
          <Stat label="Presupuesto Total" ars={totalBudget} usd={totalBudgetBC.usd} highlight />
          <div onClick={() => setSection("accounts")} className="cursor-pointer">
            <Stat label="Saldo en Cuentas" ars={totalBalanceARS} usd={totalBalanceUSD} />
          </div>
          <Stat label="Estimado por Cobrar" ars={Math.max(0, estimatedPending)} usd={totalCollectedUSD > 0 ? 0 : undefined} sub={(() => {
            const parts = [formatCurrency(totalCollectedARS)]
            if (totalCollectedUSD > 0) parts.push(formatUSD(totalCollectedUSD))
            return `${parts.join(" · ")} cobrado`
          })()} />
        </>}
      </div>

      {isFull && <DollarRateWidget />}

      {isFull && unpaidFixedCosts.length > 0 && (
        <div className="bg-card border border-amber-200 rounded-xl p-6">
          <SecHead title="Costos Fijos Pendientes Este Mes" right={
            <button onClick={() => setSection("nitia-costs")} className="text-sm text-[#5F5A46] hover:underline">Gestionar</button>
          } />
          <div className="space-y-2">
            {unpaidFixedCosts.slice(0, 8).map(cost => {
              const isOverdue = (cost.due_day || 1) < currentDay
              return (
                <div key={cost.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    {isOverdue ? <AlertCircle size={14} className="text-red-500" /> : <CalendarClock size={14} className="text-amber-500" />}
                    <span>{cost.description}</span>
                    <span className="text-xs text-muted-foreground">Vence día {cost.due_day || 1}</span>
                  </div>
                  <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>{formatCurrency(cost.amount)}</span>
                </div>
              )
            })}
          </div>
          <HR />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{unpaidFixedCosts.length} pendiente(s)</span>
            <span className="font-semibold">{formatCurrency(unpaidFixedCosts.reduce((s, c) => s + c.amount, 0))}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {isFull && (
          <div className="bg-card border border-border rounded-xl p-6">
            <SecHead title={"Últimos Movimientos"} right={
              <button onClick={() => setSection("accounts")} className="text-sm text-[#5F5A46] hover:underline">Ver todos</button>
            } />
            {recentMovements.length > 0 ? recentMovements.map(mov => (
              <div key={mov.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <span>{mov.description}</span>
                  {mov.project_id && <span className="text-xs text-muted-foreground ml-2">{data.projects.find(p => p.id === mov.project_id)?.name}</span>}
                </div>
                <span className={`font-medium ${mov.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                  {mov.type === "ingreso" ? "+" : "-"}{mov.medio_pago === "USD" ? formatUSD(mov.amount) : formatCurrency(mov.amount)}
                </span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos</p>}
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title="Tareas Pendientes" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg"><p className="text-2xl font-bold text-yellow-700">{pendingTasks}</p><p className="text-xs text-yellow-600">Pendientes</p></div>
            <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{inProgressTasks}</p><p className="text-xs text-blue-600">En curso</p></div>
            <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-700">{completedTasks}</p><p className="text-xs text-green-600">Completadas</p></div>
          </div>
          {data.tasks.filter(t => t.status !== "completada").sort((a, b) => {
            const prio: Record<string, number> = { alta: 0, media: 1, baja: 2 }
            return (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1)
          }).slice(0, 8).map(task => {
            const proj = data.projects.find(p => p.id === task.project_id)
            return (
              <div key={task.id} onClick={() => { if (proj) { setSelectedProjectId(proj.id); setSection("projects") } }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm cursor-pointer hover:bg-[#F7F5ED] -mx-2 px-2 rounded">
                <div className="flex items-center gap-2 min-w-0">
                  {task.status === "pendiente" ? <Clock size={14} className="text-yellow-600 shrink-0" /> : <AlertCircle size={14} className="text-blue-600 shrink-0" />}
                  <span className="truncate">{task.title}</span>
                  {proj && <span className="text-xs text-muted-foreground shrink-0">· {proj.name}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && <span className="text-xs text-muted-foreground">{new Date(task.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span>}
                  <Tag label={task.priority} color={task.priority === "alta" ? "red" : task.priority === "media" ? "yellow" : "gray"} />
                </div>
              </div>
            )
          })}
          {data.tasks.filter(t => t.status !== "completada").length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin tareas pendientes</p>
          )}
        </div>
      </div>

      {isFull && (
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title={`Mi Resumen Personal (${partnerKey === "paula" ? "Paula" : "Cami"})`} right={
            <button onClick={() => setSection("personal")} className="text-sm text-[#5F5A46] hover:underline">Ver detalle</button>
          } />
          <div className="grid md:grid-cols-4 gap-4">
            <Stat label="Ingresos del Mes" value={formatCurrency(personalIncome)} />
            <Stat label="Gastos Fijos" value={formatCurrency(personalFixed)} />
            <Stat label="Gastos Variables" value={formatCurrency(personalVariable)} />
            <Stat label="Balance" value={formatCurrency(personalBalance)} highlight={personalBalance >= 0} />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Proyectos" right={<button onClick={() => setSection("projects")} className="text-sm text-[#5F5A46] hover:underline">Ver todos</button>} />
        <div className="space-y-3">
          {data.projects.slice(0, 5).map(project => {
            const totalBC = projectClientPriceByCurrency(project, data.projectItems, data.quoteComparisons)
            const total = totalBC.ars
            return (
              <div key={project.id} onClick={() => { setSelectedProjectId(project.id); setSection("projects") }}
                className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-[#F7F5ED] -mx-2 px-2 rounded">
                <div><h4 className="font-medium">{project.name}</h4><p className="text-sm text-muted-foreground">{project.client}</p></div>
                <div className="flex items-center gap-3">
                  {isFull && <div className="text-right">
                    {total > 0 && <p className="text-sm font-medium">{formatCurrency(total)}</p>}
                    {totalBC.usd > 0 && <p className="text-sm font-medium text-blue-700">{formatUSD(totalBC.usd)}</p>}
                  </div>}
                  <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : "yellow"} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isFull && (fixedCostsTotal > 0 || fixedCostsTotalUSD > 0) && (
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title="Costos Fijos Mensuales" right={<button onClick={() => setSection("nitia-costs")} className="text-sm text-[#5F5A46] hover:underline">Gestionar</button>} />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total mensual</span>
            <div className="text-right">
              {fixedCostsTotal > 0 && <p className="text-xl font-bold">{formatCurrency(fixedCostsTotal)}</p>}
              {fixedCostsTotalUSD > 0 && <p className="text-xl font-bold text-blue-700">{formatUSD(fixedCostsTotalUSD)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DollarRateWidget() {
  const { data, fetchDollarRate, setManualDollarRate, clearDollarOverride } = useApp()
  const [editing, setEditing] = useState(false)
  const [manualBuy, setManualBuy] = useState("")
  const [manualSell, setManualSell] = useState("")
  const [loading, setLoading] = useState(false)
  const dr = data.dollarRate

  const handleFetch = async () => { setLoading(true); await fetchDollarRate(); setLoading(false) }
  const handleSaveManual = async () => {
    const b = parseFloat(manualBuy) || 0; const s = parseFloat(manualSell) || 0
    if (s <= 0) return
    setLoading(true); await setManualDollarRate(b, s); setLoading(false); setEditing(false)
  }
  const handleClear = async () => { setLoading(true); await clearDollarOverride(); setLoading(false) }

  const lastUpdate = dr?.last_api_fetch ? new Date(dr.last_api_fetch) : dr?.manual_override ? new Date(dr.manual_override) : null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#F7F5ED] border border-[#E0DDD0] rounded-lg">
      <div className="flex items-center gap-2">
        <DollarSign size={14} className="text-blue-600 shrink-0" />
        {dr && dr.sell > 0 ? (
          <span className="text-xs text-[#5F5A46]">
            <span className="font-semibold">Blue ${new Intl.NumberFormat("es-AR").format(dr.sell)}</span>
            <span className="text-muted-foreground ml-1">/ compra ${new Intl.NumberFormat("es-AR").format(dr.buy)}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Dólar blue: sin cargar</span>
        )}
        {dr?.source === "manual" && <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">Manual</span>}
        {lastUpdate && <span className="text-[9px] text-muted-foreground hidden sm:inline">· {lastUpdate.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input type="number" placeholder="Compra" value={manualBuy} onChange={e => setManualBuy(e.target.value)} className="w-16 px-1.5 py-0.5 rounded border border-[#E0DDD0] text-xs" />
            <input type="number" placeholder="Venta" value={manualSell} onChange={e => setManualSell(e.target.value)} className="w-16 px-1.5 py-0.5 rounded border border-[#E0DDD0] text-xs" />
            <button onClick={handleSaveManual} disabled={loading} className="px-2 py-0.5 bg-[#5F5A46] text-white rounded text-[10px] font-medium hover:bg-[#4A4536] disabled:opacity-50">OK</button>
            <button onClick={() => setEditing(false)} className="p-0.5 hover:bg-[#E0DDD0] rounded"><X size={12} className="text-muted-foreground" /></button>
          </div>
        ) : (
          <>
            <button onClick={handleFetch} disabled={loading} className="p-1 hover:bg-[#E0DDD0] rounded" title="Actualizar desde API">
              <RefreshCw size={12} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => { setManualBuy(String(dr?.buy || "")); setManualSell(String(dr?.sell || "")); setEditing(true) }} className="p-1 hover:bg-[#E0DDD0] rounded" title="Poner valor manual">
              <Pencil size={11} className="text-muted-foreground" />
            </button>
            {dr?.source === "manual" && (
              <button onClick={handleClear} disabled={loading} className="text-[9px] text-muted-foreground hover:text-foreground hover:underline">API</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
