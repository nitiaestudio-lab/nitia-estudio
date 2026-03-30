"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { canSee } from "@/lib/seed-data"
import {
  formatCurrency,
  totalClientPrice,
  totalCost,
  totalIncome,
  totalExpenses,
} from "@/lib/helpers"
import {
  TrendingUp,
  FolderKanban,
  Wallet,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
} from "lucide-react"

type PeriodType = "thisMonth" | "lastMonth" | "thisYear"

export function Dashboard() {
  const { role, data, setSection, setSelectedProjectId } = useApp()
  const isFull = canSee(role)
  const [period, setPeriod] = useState<PeriodType>("thisMonth")

  // Helper para obtener rango de fechas segun periodo
  const getDateRange = (p: PeriodType) => {
    const now = new Date()
    let start: Date
    let end: Date
    
    switch (p) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        break
    }
    return { start, end }
  }

  const { start: periodStart, end: periodEnd } = getDateRange(period)
  const { start: lastPeriodStart, end: lastPeriodEnd } = getDateRange(
    period === "thisMonth" ? "lastMonth" : period === "lastMonth" ? "thisMonth" : "thisYear"
  )

  // Calcular ingresos y egresos del periodo actual
  const getMovementsInRange = (start: Date, end: Date) => {
    let ingresos = 0
    let egresos = 0
    
    data.projects.forEach(project => {
      project.movements?.forEach(mov => {
        const movDate = new Date(mov.date)
        if (movDate >= start && movDate <= end) {
          if (mov.type === "ingreso") {
            ingresos += mov.amount
          } else {
            egresos += mov.amount
          }
        }
      })
    })
    
    return { ingresos, egresos }
  }

  const currentPeriod = getMovementsInRange(periodStart, periodEnd)
  const previousPeriod = getMovementsInRange(lastPeriodStart, lastPeriodEnd)

  // Calcular cambios porcentuales
  const ingresosChange = previousPeriod.ingresos > 0 
    ? ((currentPeriod.ingresos - previousPeriod.ingresos) / previousPeriod.ingresos * 100).toFixed(0)
    : currentPeriod.ingresos > 0 ? "+100" : "0"
  const egresosChange = previousPeriod.egresos > 0 
    ? ((currentPeriod.egresos - previousPeriod.egresos) / previousPeriod.egresos * 100).toFixed(0)
    : currentPeriod.egresos > 0 ? "+100" : "0"

  const balanceNeto = currentPeriod.ingresos - currentPeriod.egresos

  // Calculate totals
  const activeProjects = data.projects.filter((p) => p.status === "activo")
  const totalPresupuesto = data.projects.reduce((sum, p) => sum + totalClientPrice(p), 0)
  const totalCostos = data.projects.reduce((sum, p) => sum + totalCost(p), 0)
  const totalCobrado = data.projects.reduce((sum, p) => sum + totalIncome(p), 0)
  const totalPagado = data.projects.reduce((sum, p) => sum + totalExpenses(p), 0)
  const gananciaEstimada = totalPresupuesto - totalCostos
  const balanceTotal = totalCobrado - totalPagado

  const totalCuentas = data.accounts.reduce((sum, a) => sum + a.balance, 0)
  const pendingTasks = data.tasks.filter((t) => t.status !== "completada")

  const nitiaFixedTotal = data.nitiaFixedCosts
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.amount, 0)

  const margen = totalPresupuesto > 0 ? ((gananciaEstimada / totalPresupuesto) * 100).toFixed(0) : 0

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">
            Dashboard
          </h1>
          <p className="text-sm text-[#76746A] mt-1">
            Resumen general de Nitia Estudio
          </p>
        </div>
        <p className="text-xs text-[#76746A] uppercase tracking-wide">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Monthly Summary - Only for full access */}
      {isFull && (
        <div className="bg-gradient-to-br from-[#5F5A46] to-[#3D3A2E] rounded-2xl p-5 lg:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="font-serif text-lg font-light">Resumen Financiero</h2>
              <p className="text-xs text-white/60 mt-1">
                {periodStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} - {periodEnd.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="inline-flex bg-white/10 rounded-lg p-1 gap-1">
              <button
                onClick={() => setPeriod("thisMonth")}
                className={`px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase rounded-md transition-all ${
                  period === "thisMonth" ? "bg-white text-[#5F5A46]" : "text-white/70 hover:text-white"
                }`}
              >
                Este mes
              </button>
              <button
                onClick={() => setPeriod("lastMonth")}
                className={`px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase rounded-md transition-all ${
                  period === "lastMonth" ? "bg-white text-[#5F5A46]" : "text-white/70 hover:text-white"
                }`}
              >
                Mes anterior
              </button>
              <button
                onClick={() => setPeriod("thisYear")}
                className={`px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase rounded-md transition-all ${
                  period === "thisYear" ? "bg-white text-[#5F5A46]" : "text-white/70 hover:text-white"
                }`}
              >
                Este año
              </button>
            </div>
          </div>
          
          {/* Explicación */}
          <p className="text-xs text-white/50 mb-4 border-b border-white/10 pb-3">
            Suma de todos los movimientos registrados en proyectos durante el período seleccionado
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {/* Ingresos */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={16} className="text-[#86EFAC]" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Ingresos (cobros)</span>
              </div>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums">{formatCurrency(currentPeriod.ingresos)}</p>
              <p className="text-xs text-white/40 mt-1">Pagos recibidos de clientes</p>
              <div className="flex items-center gap-1 mt-2">
                {Number(ingresosChange) >= 0 ? (
                  <ArrowUpRight size={12} className="text-[#86EFAC]" />
                ) : (
                  <ArrowDownRight size={12} className="text-[#FCA5A5]" />
                )}
                <span className={`text-xs ${Number(ingresosChange) >= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"}`}>
                  {ingresosChange}% vs período anterior
                </span>
              </div>
            </div>
            
            {/* Egresos */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight size={16} className="text-[#FCA5A5]" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Egresos (pagos)</span>
              </div>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums">{formatCurrency(currentPeriod.egresos)}</p>
              <p className="text-xs text-white/40 mt-1">Pagos a proveedores</p>
              <div className="flex items-center gap-1 mt-2">
                {Number(egresosChange) <= 0 ? (
                  <ArrowDownRight size={12} className="text-[#86EFAC]" />
                ) : (
                  <ArrowUpRight size={12} className="text-[#FCA5A5]" />
                )}
                <span className={`text-xs ${Number(egresosChange) <= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"}`}>
                  {egresosChange}% vs período anterior
                </span>
              </div>
            </div>
            
            {/* Balance Neto */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className={balanceNeto >= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Balance Neto</span>
              </div>
              <p className={`text-2xl lg:text-3xl font-semibold tabular-nums ${balanceNeto >= 0 ? "text-[#86EFAC]" : "text-[#FCA5A5]"}`}>
                {formatCurrency(balanceNeto)}
              </p>
              <p className="text-xs text-white/40 mt-1">Ingresos - Egresos</p>
              <p className="text-xs text-white/50 mt-2">
                {balanceNeto >= 0 ? "Ganancia del período" : "Pérdida del período"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          icon={<FolderKanban size={20} />}
          label="Proyectos Activos"
          value={String(activeProjects.length)}
          sub={`de ${data.projects.length} totales`}
          color="#5F5A46"
        />
        {isFull && (
          <>
            <StatCard
              icon={<Wallet size={20} />}
              label="Presupuesto Total"
              value={formatCurrency(totalPresupuesto)}
              color="#2A4A6A"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Ganancia Estimada"
              value={formatCurrency(gananciaEstimada)}
              sub={`${margen}% margen`}
              color="#295E29"
              highlight
            />
            <StatCard
              icon={<CircleDot size={20} />}
              label="Balance Actual"
              value={formatCurrency(balanceTotal)}
              sub={`${formatCurrency(totalCobrado)} cobrado`}
              color={balanceTotal >= 0 ? "#295E29" : "#8B2323"}
            />
          </>
        )}
        {!isFull && (
          <StatCard
            icon={<CheckSquare size={20} />}
            label="Tareas Pendientes"
            value={String(pendingTasks.length)}
            sub="por completar"
            color="#5F5A46"
          />
        )}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Projects */}
        <div className="bg-white rounded-2xl border border-[#E0DDD0] overflow-hidden">
          <div className="flex items-center justify-between p-4 lg:p-5 border-b border-[#E0DDD0]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#5F5A46]/10 flex items-center justify-center">
                <FolderKanban size={16} className="text-[#5F5A46]" />
              </div>
              <h2 className="font-serif text-lg font-light text-[#1C1A12]">Proyectos</h2>
            </div>
            <button
              onClick={() => setSection("projects")}
              className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#5F5A46] hover:text-[#1C1A12] transition-colors flex items-center gap-1"
            >
              Ver todos
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#E0DDD0]">
            {data.projects.slice(0, 4).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F7F5ED] transition-colors"
                onClick={() => {
                  setSelectedProjectId(project.id)
                  setSection("projects")
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1C1A12] truncate">{project.name}</p>
                  <p className="text-xs text-[#76746A] truncate">{project.client}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>
            ))}
            {data.projects.length === 0 && (
              <div className="p-8 text-center text-sm text-[#76746A]">
                No hay proyectos
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-[#E0DDD0] overflow-hidden">
          <div className="flex items-center justify-between p-4 lg:p-5 border-b border-[#E0DDD0]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#5F5A46]/10 flex items-center justify-center">
                <CheckSquare size={16} className="text-[#5F5A46]" />
              </div>
              <h2 className="font-serif text-lg font-light text-[#1C1A12]">Tareas Pendientes</h2>
            </div>
            <button
              onClick={() => setSection("tasks")}
              className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#5F5A46] hover:text-[#1C1A12] transition-colors flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#E0DDD0]">
            {pendingTasks.slice(0, 5).map((task) => {
              const project = data.projects.find((p) => p.id === task.projectId)
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1C1A12] truncate">{task.title}</p>
                    <p className="text-xs text-[#76746A] truncate">{project?.name}</p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              )
            })}
            {pendingTasks.length === 0 && (
              <div className="p-8 text-center text-sm text-[#76746A]">
                No hay tareas pendientes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row - only for full access */}
      {isFull && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Accounts */}
          <div className="bg-white rounded-2xl border border-[#E0DDD0] p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#295E29]/10 flex items-center justify-center">
                <Wallet size={16} className="text-[#295E29]" />
              </div>
              <h2 className="font-serif text-lg font-light text-[#1C1A12]">Cuentas</h2>
            </div>
            <div className="space-y-3">
              {data.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="text-sm text-[#1C1A12]">{account.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[#1C1A12] tabular-nums">
                    {formatCurrency(account.balance)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E0DDD0]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#76746A]">
                  Total
                </span>
                <span className="text-base font-semibold text-[#1C1A12] tabular-nums">
                  {formatCurrency(totalCuentas)}
                </span>
              </div>
            </div>
          </div>

          {/* Providers Summary */}
          <div className="bg-white rounded-2xl border border-[#E0DDD0] p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#5F5A46]/10 flex items-center justify-center">
                <span className="text-xs font-bold text-[#5F5A46]">{data.providers.length}</span>
              </div>
              <h2 className="font-serif text-lg font-light text-[#1C1A12]">Proveedores</h2>
            </div>
            <div className="space-y-3">
              {data.providers.slice(0, 4).map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#1C1A12] truncate">{provider.name}</p>
                    <p className="text-xs text-[#76746A] truncate">{provider.category}</p>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#76746A] bg-[#F0EDE4] px-2 py-1 rounded-md">
                    {provider.zone}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Nitia Fixed Costs */}
          <div className="bg-white rounded-2xl border border-[#E0DDD0] p-4 lg:p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#8B2323]/10 flex items-center justify-center">
                <ArrowDownRight size={16} className="text-[#8B2323]" />
              </div>
              <h2 className="font-serif text-lg font-light text-[#1C1A12]">Costos Fijos</h2>
            </div>
            <div className="space-y-3">
              {data.nitiaFixedCosts.filter(c => c.active).slice(0, 4).map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-[#1C1A12] truncate">{cost.description}</span>
                  <span className="text-sm text-[#76746A] tabular-nums">
                    {formatCurrency(cost.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E0DDD0]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#76746A]">
                  Total mensual
                </span>
                <span className="text-base font-semibold text-[#8B2323] tabular-nums">
                  {formatCurrency(nitiaFixedTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
  highlight?: boolean
}) {
  return (
    <div
      className={`
        rounded-2xl p-4 lg:p-5 transition-all
        ${highlight ? "bg-[#295E29] text-white" : "bg-white border border-[#E0DDD0]"}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-xl flex items-center justify-center mb-3
          ${highlight ? "bg-white/20" : ""}
        `}
        style={highlight ? {} : { backgroundColor: `${color}15` }}
      >
        <span style={highlight ? { color: "white" } : { color }}>{icon}</span>
      </div>
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 ${
          highlight ? "text-white/70" : "text-[#76746A]"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xl lg:text-2xl font-semibold tabular-nums ${
          highlight ? "text-white" : "text-[#1C1A12]"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs mt-1 ${
            highlight ? "text-white/60" : "text-[#76746A]"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    activo: "bg-[#E6F2E0] text-[#295E29]",
    pausado: "bg-[#FEF3C7] text-[#92400E]",
    finalizado: "bg-[#F0EDE4] text-[#76746A]",
  }
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg ${
        styles[status] || styles.finalizado
      }`}
    >
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    alta: "bg-[#FAEBEB] text-[#8B2323]",
    media: "bg-[#FEF3C7] text-[#92400E]",
    baja: "bg-[#F0EDE4] text-[#76746A]",
  }
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg ${
        styles[priority] || styles.baja
      }`}
    >
      {priority}
    </span>
  )
}
