"use client"

import { useApp } from "@/lib/app-context"
import { formatCurrency, projectTotalClientPrice, projectTotalCost } from "@/lib/helpers"
import { Stat, SecHead, Tag, HR } from "@/components/nitia-ui"
import { canSee } from "@/lib/seed-data"
import { TrendingUp, FolderOpen, Users, DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react"

export function Dashboard() {
  const { role, data, setSection, setSelectedProjectId } = useApp()
  const isFull = canSee(role)

  const activeProjects = data.projects.filter(p => p.status === "activo")
  const totalBudget = data.projects.reduce((s, p) => s + projectTotalClientPrice(p, data.projectItems), 0)
  const totalIncome = data.movements.filter(m => m.type === "ingreso").reduce((s, m) => s + m.amount, 0)
  const totalExpenses = data.movements.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)
  const totalBalance = data.accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const pendingTasks = data.tasks.filter(t => t.status === "pendiente").length
  const inProgressTasks = data.tasks.filter(t => t.status === "en-curso").length
  const completedTasks = data.tasks.filter(t => t.status === "completada").length

  const fixedCostsTotal = data.nitiaFixedCosts.filter(c => c.active).reduce((s, c) => s + c.amount, 0)

  // Recent movements (last 10)
  const recentMovements = [...data.movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Dashboard</h1>
        <p className="text-sm text-[#76746A] mt-1">Resumen general del estudio</p>
      </div>

      {/* Main Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setSection("projects")} className="cursor-pointer">
          <Stat label="Proyectos Activos" value={activeProjects.length} sub={`de ${data.projects.length} totales`} />
        </div>
        {isFull && <>
          <Stat label="Presupuesto Total" value={formatCurrency(totalBudget)} highlight />
          <Stat label="Ingresos" value={formatCurrency(totalIncome)} sub={`${formatCurrency(totalExpenses)} en egresos`} />
          <div onClick={() => setSection("accounts")} className="cursor-pointer">
            <Stat label="Saldo en Cuentas" value={formatCurrency(totalBalance)} />
          </div>
        </>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        {isFull && (
          <div className="bg-card border border-border rounded-xl p-6">
            <SecHead title={"\u00DAltimos Movimientos"} right={
              <button onClick={() => setSection("accounts")} className="text-sm text-[#5F5A46] hover:underline">Ver todos</button>
            } />
            {recentMovements.length > 0 ? recentMovements.map(mov => (
              <div key={mov.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <span>{mov.description}</span>
                  {mov.project_id && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {data.projects.find(p => p.id === mov.project_id)?.name}
                    </span>
                  )}
                </div>
                <span className={`font-medium ${mov.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                  {mov.type === "ingreso" ? "+" : "-"}{formatCurrency(mov.amount)}
                </span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos</p>}
          </div>
        )}

        {/* Tasks Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title="Tareas" right={
            <button onClick={() => setSection("tasks")} className="text-sm text-[#5F5A46] hover:underline">Ver todas</button>
          } />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{pendingTasks}</p>
              <p className="text-xs text-yellow-600">Pendientes</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{inProgressTasks}</p>
              <p className="text-xs text-blue-600">En curso</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
              <p className="text-xs text-green-600">Completadas</p>
            </div>
          </div>

          {/* Recent tasks */}
          {data.tasks.filter(t => t.status !== "completada").slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <div className="flex items-center gap-2">
                {task.status === "pendiente" ? <Clock size={14} className="text-yellow-600" /> : <AlertCircle size={14} className="text-blue-600" />}
                <span>{task.title}</span>
              </div>
              <Tag label={task.priority} color={task.priority === "alta" ? "red" : task.priority === "media" ? "yellow" : "gray"} />
            </div>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Proyectos" right={
          <button onClick={() => setSection("projects")} className="text-sm text-[#5F5A46] hover:underline">Ver todos</button>
        } />
        <div className="space-y-3">
          {data.projects.slice(0, 5).map(project => {
            const total = projectTotalClientPrice(project, data.projectItems)
            return (
              <div key={project.id} onClick={() => { setSelectedProjectId(project.id); setSection("projects") }}
                className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-[#F7F5ED] -mx-2 px-2 rounded">
                <div>
                  <h4 className="font-medium">{project.name}</h4>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isFull && <span className="text-sm font-medium">{formatCurrency(total)}</span>}
                  <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : "yellow"} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Costos fijos */}
      {isFull && fixedCostsTotal > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title="Costos Fijos Mensuales" right={
            <button onClick={() => setSection("nitia-costs")} className="text-sm text-[#5F5A46] hover:underline">Gestionar</button>
          } />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total mensual</span>
            <span className="text-xl font-bold">{formatCurrency(fixedCostsTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
