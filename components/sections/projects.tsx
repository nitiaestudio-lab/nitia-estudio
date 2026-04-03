"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import {
  formatCurrency, formatDate, generateId, today,
  projectTotalClientPrice, projectTotalCost, projectTotalGanancia,
  projectIncome, projectExpenses, filterByDateRange,
  calcIVACliente, calcIVAGanancia, calcSenaProveedor, calcSenaCliente,
  calcGananciaIndividual, quoteClientPrice, quoteGanancia, getSelectedQuotes,
} from "@/lib/helpers"
import {
  exportProjectDesgloseXLSX, exportProjectMovementsXLSX, exportComparadorXLSX,
} from "@/lib/export-utils"
import {
  SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea,
  Stat, HR, PeriodFilter, type PeriodValue, ConfirmDeleteModal, EditableSelect,
} from "@/components/nitia-ui"
import { canSee } from "@/lib/seed-data"
import type { Project, ProjectItem, ProjectFile, Movement, QuoteComparison, Category } from "@/lib/types"
import {
  Plus, ArrowLeft, Trash2, Pencil, Download, Upload, FileText, Check,
  Search, FolderOpen, Eye, Star, X, FileSpreadsheet, ChevronDown, ChevronUp,
  Lightbulb, ToggleLeft, ToggleRight, TrendingUp, AlertCircle, CheckCircle2,
  Settings2, ArrowUpDown, Info, Save, XCircle,
} from "lucide-react"

type ProjectTab = "movimientos" | "desglose" | "comparador" | "archivos" | "tareas"
const TAB_LABELS: Record<ProjectTab, string> = {
  movimientos: "Movimientos", desglose: "Desglose", comparador: "Comparador", archivos: "Archivos", tareas: "Tareas",
}

// =================== PROJECTS LIST ===================
export function Projects() {
  const { role, data, addRow, selectedProjectId, setSelectedProjectId, userPermissions } = useApp()
  const isFull = canSee(role, userPermissions)
  const isAdmin = role === "paula" || role === "cami"
  const canSeeGanancias = isAdmin || userPermissions?.ver_ganancias === true
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const projects = data.projects.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  )
  if (selectedProjectId) {
    const project = data.projects.find(p => p.id === selectedProjectId)
    if (project) return <ProjectDetail project={project} onBack={() => setSelectedProjectId(null)} isFull={isFull} canSeeGanancias={canSeeGanancias} />
  }
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proyectos</h1>
        <p className="text-sm text-[#76746A] mt-1">Gestión de proyectos del estudio</p></div>
        <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Proyecto</Btn>
      </div>
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar proyectos..." className="max-w-md w-full px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Proyectos Activos" value={data.projects.filter(p => p.status === "activo").length} />
        <Stat label="Total Presupuestado" value={formatCurrency(data.projects.reduce((s, p) => s + projectTotalClientPrice(p, data.projectItems, data.quoteComparisons), 0))} highlight />
        <Stat label="Total Cobrado" value={formatCurrency(data.movements.filter(m => m.project_id && m.type === "ingreso").reduce((s, m) => s + m.amount, 0))} />
        <Stat label="Pausados" value={data.projects.filter(p => p.status === "pausado").length} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
          const income = projectIncome(data.movements, project.id)
          return (<div key={project.id} onClick={() => setSelectedProjectId(project.id)}
            className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
              <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : project.status === "pausado" ? "yellow" : "gray"} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{project.client}</p>
            {isFull && <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Presup: {formatCurrency(totalClient)}</span>
              <span className="text-green-600">Cobrado: {formatCurrency(income)}</span>
            </div>}
          </div>)
        })}
      </div>
      {projects.length === 0 && <Empty title="Sin proyectos" description="Creá tu primer proyecto" action={<Btn onClick={() => setShowNew(true)}>Crear</Btn>} />}
      {showNew && <ProjectFormModal onClose={() => setShowNew(false)} onSave={async (p) => { await addRow("projects", p, "projects"); setShowNew(false) }} />}
    </div>
  )
}

// =================== PROJECT DETAIL ===================
function ProjectDetail({ project, onBack, isFull, canSeeGanancias }: { project: Project; onBack: () => void; isFull: boolean; canSeeGanancias: boolean }) {
  const { data, updateRow, deleteRow, addRow } = useApp()
  const [tab, setTab] = useState<ProjectTab>("movimientos")
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteProject, setShowDeleteProject] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetValue, setBudgetValue] = useState(String(project.budget_final ?? ""))
  const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
  const totalGanancia = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
  const income = projectIncome(data.movements, project.id)
  const expenses = projectExpenses(data.movements, project.id)
  const budgetFinal = project.budget_final ?? null
  const projectTasks = data.tasks.filter(t => t.project_id === project.id)
  const pendingProjectTasks = projectTasks.filter(t => t.status !== "completada")
    .sort((a, b) => { const p: Record<string, number> = { alta: 0, media: 1, baja: 2 }; return (p[a.priority] ?? 1) - (p[b.priority] ?? 1) })

  const saveBudgetFinal = async () => {
    const val = parseFloat(budgetValue) || null
    await updateRow("projects", project.id, { budget_final: val }, "projects")
    setEditingBudget(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg self-start"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-xl sm:text-2xl font-light text-[#1C1A12] truncate">{project.name}</h1>
            <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : "yellow"} />
          </div>
          <p className="text-sm text-[#76746A] truncate">{project.client} {project.address && `— ${project.address}`}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Btn variant="soft" size="sm" onClick={() => setShowProfile(true)}><Info size={14} className="mr-1 inline" />Perfil</Btn>
          <Btn variant="soft" size="sm" onClick={() => setShowEdit(true)}><Pencil size={14} className="mr-1 inline" />Editar</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowDeleteProject(true)}><Trash2 size={14} className="text-red-500" /></Btn>
        </div>
      </div>

      {/* Stats */}
      {isFull && <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <input type="number" value={budgetValue} onChange={e => setBudgetValue(e.target.value)}
                  className="w-full px-2 py-1 text-lg font-bold border border-border rounded bg-white" autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveBudgetFinal(); if (e.key === "Escape") setEditingBudget(false) }} />
                <button onClick={saveBudgetFinal} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                <button onClick={() => setEditingBudget(false)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
              </div>
            ) : (
              <p className="text-lg font-bold cursor-pointer hover:text-[#5F5A46]" onClick={() => { setBudgetValue(String(budgetFinal ?? totalClient)); setEditingBudget(true) }}>
                {formatCurrency(budgetFinal || totalClient)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {budgetFinal ? `Sugerido: ${formatCurrency(totalClient)}` : "Click para editar"}
            </p>
          </div>
          <Stat label="Cobrado" value={formatCurrency(income)} sub={formatCurrency((budgetFinal || totalClient) - income) + " pendiente"} />
          <Stat label="Pagado proveedores" value={formatCurrency(expenses)} />
          {canSeeGanancias && <Stat label="Ganancia" value={formatCurrency(totalGanancia)} sub={`${totalClient > 0 ? ((totalGanancia / totalClient) * 100).toFixed(0) : 0}% margen`} highlight />}
        </div>
      </div>}

      {/* Tareas pendientes */}
      {pendingProjectTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-amber-800">{pendingProjectTasks.length} tarea(s) pendiente(s)</p>
            <button onClick={() => setTab("tareas")} className="text-xs text-amber-700 hover:underline">Ver todas</button>
          </div>
          <div className="space-y-1">
            {pendingProjectTasks.slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.priority === "alta" ? "bg-red-500" : t.priority === "media" ? "bg-yellow-500" : "bg-gray-400"}`} />
                <span className="text-amber-900 truncate">{t.title}</span>
                {t.due_date && <span className="text-xs text-amber-600 shrink-0">{new Date(t.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {(Object.keys(TAB_LABELS) as ProjectTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? "border-[#5F5A46] text-[#1C1A12]" : "border-transparent text-[#76746A] hover:text-[#1C1A12]"}`}>
            {TAB_LABELS[t]}{t === "tareas" && projectTasks.length > 0 ? ` (${projectTasks.length})` : ""}
          </button>
        ))}
      </div>
      {tab === "desglose" && <DesgloseTab project={project} isFull={isFull} canSeeGanancias={canSeeGanancias} />}
      {tab === "comparador" && <ComparadorTab project={project} />}
      {tab === "movimientos" && <MovimientosTab project={project} />}
      {tab === "archivos" && <ArchivosTab project={project} />}
      {tab === "tareas" && <TareasTab project={project} />}
      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} onSave={async (p) => { await updateRow("projects", project.id, p, "projects"); setShowEdit(false) }} />}
      {showDeleteProject && <ConfirmDeleteModal message={`¿Eliminar "${project.name}"?`} onConfirm={async () => { await deleteRow("projects", project.id, "projects"); onBack() }} onCancel={() => setShowDeleteProject(false)} />}
      {showProfile && <ProjectProfileModal project={project} isFull={isFull} canSeeGanancias={canSeeGanancias} onClose={() => setShowProfile(false)} onEdit={() => { setShowProfile(false); setShowEdit(true) }} />}
    </div>
  )
}

// =================== BALANCE PANEL ===================
function BalancePanel({ project }: { project: Project }) {
  const { data } = useApp()
  const totalCost = projectTotalCost(project, data.projectItems, data.quoteComparisons)
  const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
  const totalGanancia = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
  const income = projectIncome(data.movements, project.id)
  const expenses = projectExpenses(data.movements, project.id)
  const pc = project.partner_count ?? 2
  const ivaCli = project.iva_cliente_pct ?? 21
  const ivaGan = project.iva_ganancia_pct ?? 10.5
  const sProvPct = project.sena_proveedor_pct ?? 60
  const sCliPct = project.sena_cliente_pct ?? 50

  const ivaCliente = calcIVACliente(totalClient, ivaCli)
  const totalConIVA = totalClient + ivaCliente
  const clienteDebe = totalConIVA - income
  const provDebe = totalCost - expenses
  const ivaGanancia = calcIVAGanancia(totalGanancia, ivaGan)
  const gananciaNeta = totalGanancia - ivaGanancia
  const gananciaIndiv = calcGananciaIndividual(gananciaNeta, pc)
  const sProv = calcSenaProveedor(totalCost, sProvPct)
  const sCli = calcSenaCliente(totalClient, sCliPct)
  const sCliIVA = sCli + calcIVACliente(sCli, ivaCli)

  // Real seña amounts from movements
  const señaMovs = data.movements.filter(m => m.project_id === project.id && (m.concepto === "seña" || m.concepto?.startsWith("seña") || m.category === "Seña proveedor" || m.category === "Aporte propio seña"))
  const señaCobradaCli = señaMovs.filter(m => m.type === "ingreso").reduce((s, m) => s + m.amount, 0)
  const señaPagadaProv = señaMovs.filter(m => m.type === "egreso" && m.category === "Seña proveedor").reduce((s, m) => s + m.amount, 0)
  const señaAportePropio = señaMovs.filter(m => m.category === "Aporte propio seña").reduce((s, m) => s + m.amount, 0)

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
    const c: Record<string, string> = { green: "bg-green-500", red: "bg-red-500", amber: "bg-amber-500" }
    return <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${c[color]||c.green}`} style={{ width: `${pct}%` }} /></div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          {clienteDebe > 0 ? <AlertCircle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-green-600" />}
          <h4 className="font-semibold text-sm">Balance Cliente</h4>
        </div>
        <Bar value={income} max={totalConIVA} color={income >= totalConIVA ? "green" : "amber"} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Total c/IVA:</span> <span className="font-medium">{formatCurrency(totalConIVA)}</span></div>
          <div><span className="text-muted-foreground">Cobrado:</span> <span className="font-medium text-green-600">{formatCurrency(income)}</span></div>
        </div>
        <div className={`text-sm font-bold ${clienteDebe > 0 ? "text-amber-600" : "text-green-600"}`}>
          {clienteDebe > 0 ? `Cliente debe: ${formatCurrency(clienteDebe)}` : clienteDebe < 0 ? `Cobrado de más: ${formatCurrency(Math.abs(clienteDebe))}` : "Al día ✓"}
        </div>
        <div className="border-t border-border pt-2 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>Seña esperada ({sCliPct}% c/IVA):</span><span className="font-medium text-foreground">{formatCurrency(sCliIVA)}</span></div>
          <div className="flex justify-between"><span>Seña cobrada:</span><span className={`font-medium ${señaCobradaCli > 0 ? "text-green-600" : "text-foreground"}`}>{formatCurrency(señaCobradaCli)}</span></div>
          {señaCobradaCli > 0 && <div className="flex justify-between"><span>Restante s/seña:</span><span className="font-medium text-foreground">{formatCurrency(totalConIVA - señaCobradaCli)}</span></div>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          {provDebe > 0 ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle2 size={18} className="text-green-600" />}
          <h4 className="font-semibold text-sm">Balance Proveedores</h4>
        </div>
        <Bar value={expenses} max={totalCost} color={expenses >= totalCost ? "green" : "red"} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Total costo:</span> <span className="font-medium">{formatCurrency(totalCost)}</span></div>
          <div><span className="text-muted-foreground">Pagado:</span> <span className="font-medium text-red-600">{formatCurrency(expenses)}</span></div>
        </div>
        <div className={`text-sm font-bold ${provDebe > 0 ? "text-red-600" : "text-green-600"}`}>
          {provDebe > 0 ? `Debemos a proveedores: ${formatCurrency(provDebe)}` : provDebe < 0 ? `Pagado de más: ${formatCurrency(Math.abs(provDebe))}` : "Al día ✓"}
        </div>
        <div className="border-t border-border pt-2 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>Seña esperada ({sProvPct}%):</span><span className="font-medium text-foreground">{formatCurrency(sProv)}</span></div>
          <div className="flex justify-between"><span>Seña pagada:</span><span className={`font-medium ${señaPagadaProv > 0 ? "text-red-600" : "text-foreground"}`}>{formatCurrency(señaPagadaProv)}</span></div>
          {señaAportePropio > 0 && <div className="flex justify-between"><span>Aporte propio (diferencia %):</span><span className="font-medium text-amber-600">{formatCurrency(señaAportePropio)}</span></div>}
          {señaPagadaProv > 0 && <div className="flex justify-between"><span>Restante s/seña:</span><span className="font-medium text-foreground">{formatCurrency(totalCost - señaPagadaProv)}</span></div>}
        </div>
      </div>

      <div className="bg-[#295E29] text-white rounded-xl p-4 space-y-2 lg:col-span-2">
        <h4 className="font-semibold text-sm text-white/80">Ganancia Neta</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-xs text-white/60">Bruta</p><p className="text-lg font-bold">{formatCurrency(totalGanancia)}</p></div>
          <div><p className="text-xs text-white/60">IVA {ivaGan}% (RI)</p><p className="text-lg font-bold">-{formatCurrency(ivaGanancia)}</p></div>
          <div><p className="text-xs text-white/60">Neta</p><p className="text-xl font-bold">{formatCurrency(gananciaNeta)}</p></div>
          <div><p className="text-xs text-white/60">Por socia (÷{pc})</p><p className="text-xl font-bold">{formatCurrency(gananciaIndiv)}</p></div>
        </div>
        <div className="flex justify-between text-xs text-white/50 pt-2 border-t border-white/20">
          <span>Margen: {totalClient > 0 ? ((totalGanancia / totalClient) * 100).toFixed(1) : 0}%</span>
          <span>Dif. seña (cli - prov): {formatCurrency(sCli - sProv)}</span>
        </div>
      </div>
    </div>
  )
}

// =================== TAB: DESGLOSE ===================
function DesgloseTab({ project, isFull, canSeeGanancias }: { project: Project; isFull: boolean; canSeeGanancias: boolean }) {
  const { data, updateRow, addRow, deleteRow, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [showAddItem, setShowAddItem] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null)
  const [showManageSections, setShowManageSections] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionMult, setNewSectionMult] = useState(true)
  const [searchItems, setSearchItems] = useState("")

  const allItems = data.projectItems.filter(i => i.project_id === project.id)
  const items = searchItems ? allItems.filter(i => i.description.toLowerCase().includes(searchItems.toLowerCase())) : allItems
  const selectedQuotes = getSelectedQuotes(data.quoteComparisons, project.id)
  const itemTypeCats = getCategoriesFor("item_type")
  const sections = itemTypeCats.length > 0 ? itemTypeCats.sort((a, b) => a.sort_order - b.sort_order)
    : [{ id: "d1", type: "item_type", name: "Mano de Obra", active: true, sort_order: 1, has_multiplier: true },
       { id: "d2", type: "item_type", name: "Material", active: true, sort_order: 2, has_multiplier: false },
       { id: "d3", type: "item_type", name: "Mobiliario", active: true, sort_order: 3, has_multiplier: true }]

  const handleExport = () => {
    const tc = projectTotalCost(project, data.projectItems, data.quoteComparisons)
    const tp = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
    const tg = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
    const pc = project.partner_count ?? 2
    exportProjectDesgloseXLSX(project.name,
      items.map(i => ({ type: i.type, description: i.description, cost: i.cost, clientPrice: i.client_price, ganancia: i.client_price - i.cost, provider: data.providers.find(p => p.id === i.provider_id)?.name })),
      selectedQuotes.map(q => ({ category: q.category, item: q.item, provider: q.provider_name, cost: q.cost, clientPrice: quoteClientPrice(q), ganancia: quoteGanancia(q) })),
      [{ label: "Total Costo", value: tc }, { label: "Precio Cliente", value: tp }, { label: "Ganancia", value: tg }, { label: `Indiv (÷${pc})`, value: tg / pc }])
  }

  return (
    <div className="space-y-6">
      {canSeeGanancias && <BalancePanel project={project} />}
      {/* Seguimiento de Señas */}
      {(() => {
        const señaMovs = data.movements.filter(m => m.project_id === project.id && (m.concepto === "seña" || m.concepto?.startsWith("seña") || m.category === "Seña proveedor" || m.category === "Aporte propio seña" || m.category === "Diferencia seña"))
        if (señaMovs.length === 0) return null
        const señaIngresos = señaMovs.filter(m => m.type === "ingreso")
        const señaEgresos = señaMovs.filter(m => m.type === "egreso" && (m.category === "Seña proveedor"))
        const señaDiffs = señaMovs.filter(m => m.category === "Aporte propio seña" || m.category === "Diferencia seña")
        return (
          <div className="bg-gradient-to-r from-purple-50 to-purple-50/50 border border-purple-200 rounded-xl p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Seguimiento de Señas
            </h4>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-purple-600 mb-1">Cobrado de clientes</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(señaIngresos.reduce((s, m) => s + m.amount, 0))}</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-purple-600 mb-1">Pagado a proveedores</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(señaEgresos.reduce((s, m) => s + m.amount, 0))}</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-1">Aporte propio</p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(señaDiffs.reduce((s, m) => s + m.amount, 0))}</p>
              </div>
            </div>
            <div className="space-y-2">
              {señaMovs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => {
                const prov = data.providers.find(p => p.id === m.provider_id)
                const acc = data.accounts.find(a => a.id === m.account_id)
                const isSeñaDiff = m.category === "Diferencia seña" || m.category === "Aporte propio seña"
                const isSeñaProv = m.category === "Seña proveedor"
                return (
                  <div key={m.id} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${isSeñaDiff ? "bg-amber-50/80" : m.type === "ingreso" ? "bg-green-50/80" : "bg-red-50/80"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSeñaDiff ? "bg-amber-500" : m.type === "ingreso" ? "bg-green-500" : "bg-red-500"}`}></span>
                      <span className="font-medium truncate">{m.description}</span>
                      {prov && <span className="text-[10px] px-1.5 py-0.5 bg-white rounded text-purple-600 shrink-0">{prov.name}</span>}
                      {isSeñaDiff && acc && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 rounded text-amber-700 shrink-0">Cuenta: {acc.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.sena_real_pct != null && <span className="text-[10px] text-purple-600">Prov {m.sena_real_pct}%</span>}
                      {m.sena_cliente_pct != null && <span className="text-[10px] text-purple-600">Cli {m.sena_cliente_pct}%</span>}
                      <span className={`font-bold ${isSeñaDiff ? "text-amber-700" : m.type === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                        {m.type === "ingreso" ? "+" : "-"}{formatCurrency(m.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchItems} onChange={e => setSearchItems(e.target.value)} placeholder="Buscar ítems..."
              className="pl-9 pr-4 py-1.5 rounded-lg border border-[#E0DDD0] text-sm bg-white w-48" /></div>
          <Btn variant="soft" size="sm" onClick={() => setShowManageSections(true)}><Settings2 size={14} className="mr-1 inline" />Secciones</Btn>
        </div>
        <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />Exportar XLSX</Btn>
      </div>

      {/* Honorarios */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Honorarios</h4>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-muted-foreground">Costo</label>
            <input type="number" value={project.honorarios_cost || 0} onChange={e => updateRow("projects", project.id, { honorarios_cost: parseFloat(e.target.value) || 0 }, "projects")} className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" /></div>
          <div><label className="text-xs text-muted-foreground">Precio cliente</label>
            <input type="number" value={project.honorarios_client_price || 0} onChange={e => updateRow("projects", project.id, { honorarios_client_price: parseFloat(e.target.value) || 0 }, "projects")} className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" /></div>
        </div>
      </div>

      {/* Dynamic Sections */}
      {sections.map(sec => {
        const si = items.filter(i => i.type === sec.name || i.type?.toLowerCase().replace(/[_ ]/g, '') === sec.name.toLowerCase().replace(/[_ ]/g, ''))
        const sq = selectedQuotes.filter(q => q.type === sec.name)
        const hm = sec.has_multiplier !== false
        return (
          <div key={sec.id} className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-muted-foreground uppercase">{sec.name}</h4>
                {!hm && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">sin ganancia</span>}
              </div>
              <Btn size="sm" variant="soft" onClick={() => setShowAddItem(sec.name)}><Plus size={12} className="mr-1 inline" />Agregar</Btn>
            </div>
            {si.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-2">Descripción</th><th className="text-right py-2 px-2">Costo</th>
              {hm && <th className="text-right py-2 px-2 hidden sm:table-cell">Mult</th>}
              <th className="text-right py-2 px-2">Precio</th>{hm && <th className="text-right py-2 px-2 hidden sm:table-cell">Ganancia</th>}
              <th className="w-16 py-2"></th></tr></thead>
              <tbody>{si.map(item => (
                <tr key={item.id} className="border-b border-border/50 last:border-0 group">
                  <td className="py-2 pr-2"><div className="flex items-center gap-1.5">
                    {item.paid && <Check size={12} className="text-green-600 shrink-0" />}
                    <span className={`${item.paid ? "line-through text-muted-foreground" : ""} truncate max-w-[200px]`}>{item.description}</span>
                  </div></td>
                  <td className="text-right py-2 px-2">{formatCurrency(item.cost)}</td>
                  {hm && <td className="text-right py-2 px-2 hidden sm:table-cell text-muted-foreground">x{item.multiplier}</td>}
                  <td className="text-right py-2 px-2 font-medium">{formatCurrency(item.client_price)}</td>
                  {hm && <td className="text-right py-2 px-2 text-green-600 hidden sm:table-cell">{formatCurrency(item.client_price - item.cost)}</td>}
                  <td className="py-2 text-right"><div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 sm:opacity-100">
                    <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                    <button onClick={() => deleteRow("project_items", item.id, "projectItems")} className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                  </div></td>
                </tr>))}</tbody></table></div>}
            {sq.length > 0 && <div className="mt-2"><p className="text-xs text-muted-foreground mb-1">Desde Comparador:</p>
              {sq.map(q => (<div key={q.id} className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2 min-w-0"><Star size={12} className="text-amber-500 shrink-0" /><span className="truncate">{q.item}</span>
                  <span className="text-xs text-muted-foreground shrink-0">({q.provider_name})</span></div>
                <div className="flex items-center gap-3 shrink-0"><span className="text-muted-foreground">{formatCurrency(q.cost)}</span><span className="font-medium">{formatCurrency(quoteClientPrice(q))}</span></div>
              </div>))}</div>}
            {si.length === 0 && sq.length === 0 && <p className="text-sm text-muted-foreground">Sin ítems</p>}
            {(si.length > 0 || sq.length > 0) && <div className="flex justify-between pt-3 mt-2 border-t border-border text-sm">
              <span className="font-semibold text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(si.reduce((s, i) => s + i.client_price, 0) + sq.reduce((s, q) => s + quoteClientPrice(q), 0))}</span>
            </div>}
          </div>
        )
      })}

      {/* Config financiera */}
      {canSeeGanancias && <details className="bg-[#F0EDE4] rounded-xl p-4">
        <summary className="text-sm font-semibold text-[#5F5A46] cursor-pointer">Configuración financiera</summary>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          {[["IVA Cliente %", project.iva_cliente_pct ?? 21, "iva_cliente_pct"], ["IVA Ganancia %", project.iva_ganancia_pct ?? 10.5, "iva_ganancia_pct"],
            ["Seña Prov %", project.sena_proveedor_pct ?? 60, "sena_proveedor_pct"], ["Seña Cli %", project.sena_cliente_pct ?? 50, "sena_cliente_pct"],
            ["Socias", project.partner_count ?? 2, "partner_count"]].map(([l, v, k]) => (
            <div key={k as string}><label className="text-xs text-[#76746A]">{l as string}</label>
              <input type="number" value={v as number} step="0.5" onChange={e => updateRow("projects", project.id, { [k as string]: parseFloat(e.target.value) || 0 }, "projects")}
                className="w-full px-2 py-1 rounded border border-[#E0DDD0] text-sm bg-white" /></div>))}
        </div>
      </details>}

      {/* Manage Sections Modal */}
      {showManageSections && <Modal isOpen={true} title="Gestionar Secciones" onClose={() => setShowManageSections(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Agregá, eliminá o configurá las secciones de ítems.</p>
          <div className="space-y-2">{sections.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-[#F7F5ED] rounded-lg">
              <div className="flex items-center gap-3"><span className="font-medium text-sm">{s.name}</span>
                <button onClick={() => { const cat = data.categories.find(c => c.id === s.id); if (cat) updateRow("categories", cat.id, { has_multiplier: !s.has_multiplier }, "categories") }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {s.has_multiplier !== false ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                  {s.has_multiplier !== false ? "Con ganancia" : "Sin ganancia"}</button></div>
              <button onClick={() => deleteCategory(s.name)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-500" /></button>
            </div>))}</div>
          <div className="flex gap-2">
            <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="Nueva sección..." className="flex-1 px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm" />
            <button onClick={() => setNewSectionMult(!newSectionMult)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E0DDD0] text-xs">
              {newSectionMult ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} />}Ganancia</button>
            <Btn size="sm" onClick={async () => { if (newSectionName.trim()) { await addCategory("item_type", newSectionName.trim(), newSectionMult); setNewSectionName("") } }} disabled={!newSectionName.trim()}>Agregar</Btn>
          </div>
        </div>
      </Modal>}

      {showAddItem && <AddItemModal type={showAddItem} hasMultiplier={sections.find(s => s.name === showAddItem)?.has_multiplier !== false}
        defaultMultiplier={project.margin || 1} providers={data.providers} onClose={() => setShowAddItem(null)}
        onSave={async (item) => { await addRow("project_items", { ...item, project_id: project.id }, "projectItems"); setShowAddItem(null) }} />}
      {editingItem && <EditItemModal item={editingItem} hasMultiplier={sections.find(s => s.name === editingItem.type)?.has_multiplier !== false}
        providers={data.providers} onClose={() => setEditingItem(null)}
        onSave={async (u) => { await updateRow("project_items", editingItem.id, u, "projectItems"); setEditingItem(null) }} />}
    </div>
  )
}

// =================== TAB: COMPARADOR ===================
function ComparadorTab({ project }: { project: Project }) {
  const { data, addRow, updateRow, deleteRow, getCategoriesFor } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const [viewMode, setViewMode] = useState<"item" | "proveedor">("item")
  const [showSuggestion, setShowSuggestion] = useState(false)
  const pc = project.partner_count ?? 2
  const quotes = data.quoteComparisons.filter(q => q.project_id === project.id)
  const filtered = quotes.filter(q => !searchQ || q.item.toLowerCase().includes(searchQ.toLowerCase()) || q.category.toLowerCase().includes(searchQ.toLowerCase()) || q.provider_name.toLowerCase().includes(searchQ.toLowerCase()))
  const itemTypeCats = getCategoriesFor("item_type")
  const secHasMult = (t: string) => { const c = itemTypeCats.find(x => x.name === t); return c ? c.has_multiplier !== false : t !== "Material" && t !== "material" }

  const groupedByItem = useMemo(() => { const a: Record<string, QuoteComparison[]> = {}; for (const q of filtered) { const k = `${q.category}::${q.item}`; if (!a[k]) a[k] = []; a[k].push(q) }; return a }, [filtered])
  const groupedByProv = useMemo(() => { const a: Record<string, QuoteComparison[]> = {}; for (const q of filtered) { if (!a[q.provider_name]) a[q.provider_name] = []; a[q.provider_name].push(q) }; return a }, [filtered])

  // Optimization algorithm
  const optimization = useMemo(() => {
    const ig: Record<string, QuoteComparison[]> = {}
    for (const q of quotes) { const k = `${q.category}::${q.item}`; if (!ig[k]) ig[k] = []; ig[k].push(q) }
    const bestPicks: { item: string; category: string; best: QuoteComparison; mult: number; gan: number }[] = []
    for (const [, group] of Object.entries(ig)) {
      let best: QuoteComparison | null = null, bm = 1.4, bg = 0
      for (const q of group) {
        if (!secHasMult(q.type || "mobiliario")) {
          if (q.cost < (best?.cost ?? Infinity)) { best = q; bm = 1; bg = 0 }
        } else {
          // Pick cheapest cost (best deal), default x1.4
          if (!best || q.cost < best.cost) { best = q; bm = 1.4; bg = q.cost * 0.4 }
        }
      }
      if (best) bestPicks.push({ item: best.item, category: best.category, best, mult: bm, gan: bg })
    }
    const provs = [...new Set(quotes.map(q => q.provider_name))]
    const byProv = provs.map(p => {
      let t = 0; for (const [, g] of Object.entries(ig)) { const q = g.find(x => x.provider_name === p); if (q && secHasMult(q.type || "mobiliario")) t += q.cost * 0.4 }
      return { provider: p, ganancia: t }
    }).sort((a, b) => b.ganancia - a.ganancia)
    return { bestPicks, byProv, optTotal: bestPicks.reduce((s, p) => s + p.gan, 0) }
  }, [quotes, itemTypeCats])

  const toggleSelect = async (q: QuoteComparison, m: number) => {
    const gq = quotes.filter(x => x.category === q.category && x.item === q.item)
    for (const g of gq) {
      if (g.id === q.id) { const ns = !g.selected; await updateRow("quote_comparisons", g.id, { selected: ns, selected_multiplier: ns ? m : null }, "quoteComparisons") }
      else if (g.selected) await updateRow("quote_comparisons", g.id, { selected: false, selected_multiplier: null }, "quoteComparisons")
    }
  }

  const applySuggestion = async () => {
    for (const p of optimization.bestPicks) {
      const gq = quotes.filter(q => q.category === p.category && q.item === p.item)
      for (const g of gq) {
        if (g.id === p.best.id) await updateRow("quote_comparisons", g.id, { selected: true, selected_multiplier: p.mult }, "quoteComparisons")
        else if (g.selected) await updateRow("quote_comparisons", g.id, { selected: false, selected_multiplier: null }, "quoteComparisons")
      }
    }
    setShowSuggestion(false)
  }

  const SelBtns = ({ q, hm }: { q: QuoteComparison; hm: boolean }) => hm ? (
    <div className="flex gap-1 justify-center">
      <button onClick={() => toggleSelect(q, 1.4)} className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.4 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>x1.4</button>
      <button onClick={() => toggleSelect(q, 1.6)} className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.6 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>x1.6</button>
    </div>
  ) : <button onClick={() => toggleSelect(q, 1)} className={`px-3 py-1 rounded text-xs font-medium ${q.selected ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>{q.selected ? "✓" : "Elegir"}</button>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" /></div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
            <button onClick={() => setViewMode("item")} className={`px-3 py-1.5 text-sm ${viewMode === "item" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>Por Ítem</button>
            <button onClick={() => setViewMode("proveedor")} className={`px-3 py-1.5 text-sm ${viewMode === "proveedor" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>Por Proveedor</button>
          </div>
          {quotes.length > 1 && <Btn variant="soft" size="sm" onClick={() => setShowSuggestion(true)}><Lightbulb size={14} className="mr-1 inline" />Sugerir óptimo</Btn>}
          <Btn variant="soft" size="sm" onClick={() => exportComparadorXLSX(project.name, quotes.map(q => ({ category: q.category, item: q.item, type: q.type || "mobiliario", provider: q.provider_name, cost: q.cost, priceX14: q.price_x14, priceX16: q.price_x16, gananciaX14: q.ganancia_x14, gananciaX16: q.ganancia_x16, selected: q.selected })))}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn size="sm" onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Cotización</Btn>
        </div>
      </div>

      {/* By Item */}
      {viewMode === "item" && Object.entries(groupedByItem).map(([key, its]) => {
        const [cat, itm] = key.split("::"); const hm = secHasMult(its[0]?.type || "mobiliario")
        return (<div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F0EDE4] border-b border-border"><span className="font-semibold text-sm">{cat} — {itm}</span>
            {!hm && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">sin ganancia</span>}</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#FAFAF9]"><tr className="text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left w-8"></th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-right">Costo</th>
            {hm && <><th className="px-3 py-2 text-right">P.x1.4</th><th className="px-3 py-2 text-right">P.x1.6</th>
            <th className="px-3 py-2 text-right hidden md:table-cell">G.x1.4</th><th className="px-3 py-2 text-right hidden md:table-cell">G.x1.6</th>
            <th className="px-3 py-2 text-right hidden lg:table-cell">Indiv x1.4</th><th className="px-3 py-2 text-right hidden lg:table-cell">Indiv x1.6</th></>}
            <th className="px-3 py-2 text-center">Elegir</th><th className="px-3 py-2 w-10"></th>
          </tr></thead><tbody>{its.map(q => (
            <tr key={q.id} className={`border-b last:border-0 ${q.selected ? "bg-green-50" : "hover:bg-[#FAFAF9]"}`}>
              <td className="px-3 py-2.5">{q.selected && <Check size={14} className="text-green-600" />}</td>
              <td className="px-3 py-2.5 font-medium">{q.provider_name}</td><td className="px-3 py-2.5 text-right">{formatCurrency(q.cost)}</td>
              {hm && <><td className="px-3 py-2.5 text-right">{formatCurrency(q.price_x14)}</td><td className="px-3 py-2.5 text-right">{formatCurrency(q.price_x16)}</td>
              <td className="px-3 py-2.5 text-right text-green-600 hidden md:table-cell">{formatCurrency(q.ganancia_x14)}</td>
              <td className="px-3 py-2.5 text-right text-green-600 hidden md:table-cell">{formatCurrency(q.ganancia_x16)}</td>
              <td className="px-3 py-2.5 text-right text-green-700 hidden lg:table-cell">{formatCurrency(q.ganancia_x14 / pc)}</td>
              <td className="px-3 py-2.5 text-right text-green-700 hidden lg:table-cell">{formatCurrency(q.ganancia_x16 / pc)}</td></>}
              <td className="px-3 py-2.5 text-center"><SelBtns q={q} hm={hm} /></td>
              <td className="px-3 py-2.5"><button onClick={() => deleteRow("quote_comparisons", q.id, "quoteComparisons")} className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button></td>
            </tr>))}</tbody></table></div></div>)
      })}

      {/* By Provider */}
      {viewMode === "proveedor" && Object.entries(groupedByProv).map(([pn, pqs]) => {
        const tc = pqs.reduce((s, q) => s + q.cost, 0)
        const tg14 = pqs.reduce((s, q) => s + (secHasMult(q.type || "mobiliario") ? q.ganancia_x14 : 0), 0)
        const tg16 = pqs.reduce((s, q) => s + (secHasMult(q.type || "mobiliario") ? q.ganancia_x16 : 0), 0)
        return (<div key={pn} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F0EDE4] border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">{pn}</span>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Costo: <strong className="text-foreground">{formatCurrency(tc)}</strong></span>
              <span>G.x1.4: <strong className="text-green-600">{formatCurrency(tg14)}</strong></span>
              <span className="hidden sm:inline">G.x1.6: <strong className="text-green-600">{formatCurrency(tg16)}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#FAFAF9]"><tr className="text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left w-8"></th><th className="px-3 py-2 text-left">Ítem</th><th className="px-3 py-2 text-right">Costo</th>
            <th className="px-3 py-2 text-right">P.x1.4</th><th className="px-3 py-2 text-right hidden md:table-cell">G.x1.4</th>
            <th className="px-3 py-2 text-right hidden md:table-cell">G.x1.6</th><th className="px-3 py-2 text-center">Elegir</th>
          </tr></thead><tbody>{pqs.map(q => { const hm = secHasMult(q.type || "mobiliario"); return (
            <tr key={q.id} className={`border-b last:border-0 ${q.selected ? "bg-green-50" : "hover:bg-[#FAFAF9]"}`}>
              <td className="px-3 py-2">{q.selected && <Check size={14} className="text-green-600" />}</td>
              <td className="px-3 py-2"><span className="font-medium">{q.item}</span><span className="text-xs text-muted-foreground ml-1">({q.category})</span></td>
              <td className="px-3 py-2 text-right">{formatCurrency(q.cost)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(hm ? q.price_x14 : q.cost)}</td>
              <td className="px-3 py-2 text-right text-green-600 hidden md:table-cell">{formatCurrency(hm ? q.ganancia_x14 : 0)}</td>
              <td className="px-3 py-2 text-right text-green-600 hidden md:table-cell">{formatCurrency(hm ? q.ganancia_x16 : 0)}</td>
              <td className="px-3 py-2 text-center"><SelBtns q={q} hm={hm} /></td>
            </tr>) })}</tbody></table></div></div>)
      })}

      {quotes.length === 0 && <Empty title="Sin cotizaciones" description="Agregá cotizaciones para comparar proveedores" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {/* Suggestion Modal */}
      {showSuggestion && <Modal isOpen={true} title="Sugerencia Óptima" onClose={() => setShowSuggestion(false)} size="lg">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Lightbulb size={18} className="text-green-600" /><h4 className="font-semibold text-green-800">Mix Óptimo — Ganancia máxima</h4></div>
            <p className="text-2xl font-bold text-green-700 mb-3">{formatCurrency(optimization.optTotal)}</p>
            <div className="space-y-1.5">{optimization.bestPicks.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-white/60 rounded px-3 py-1.5">
                <span><strong>{p.item}</strong> <span className="text-muted-foreground">→ {p.best.provider_name}</span></span>
                <span className="text-green-600 font-medium">{p.gan > 0 ? `+${formatCurrency(p.gan)} (x${p.mult})` : "Sin ganancia"}</span>
              </div>))}</div>
          </div>
          {optimization.byProv.length > 1 && <div><h4 className="font-semibold text-sm mb-2">Todo con un solo proveedor</h4>
            <div className="space-y-2">{optimization.byProv.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#F7F5ED] rounded-lg">
                <span className="font-medium text-sm">{p.provider}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${i === 0 ? "text-green-600" : "text-muted-foreground"}`}>{formatCurrency(p.ganancia)}</span>
                  {p.ganancia < optimization.optTotal && <span className="text-xs text-red-500">-{formatCurrency(optimization.optTotal - p.ganancia)}</span>}
                </div>
              </div>))}</div></div>}
          <div className="flex justify-end gap-3 pt-2"><Btn variant="ghost" onClick={() => setShowSuggestion(false)}>Cerrar</Btn>
            <Btn onClick={applySuggestion}><Check size={14} className="mr-1 inline" />Aplicar sugerencia</Btn></div>
        </div>
      </Modal>}

      {showNew && <QuoteModal projectId={project.id} providers={data.providers} onClose={() => setShowNew(false)}
        onSave={async (q) => { await addRow("quote_comparisons", q, "quoteComparisons"); setShowNew(false) }} />}
    </div>
  )
}

// =================== TAB: MOVIMIENTOS ===================
type SortField = "date" | "description" | "amount" | "type" | "provider"
type SortDir = "asc" | "desc"

function MovimientosTab({ project }: { project: Project }) {
  const { data, addMovement, deleteMovement, updateRow } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [movPeriod, setMovPeriod] = useState<PeriodValue>("all"); const [cStart, setCStart] = useState(""); const [cEnd, setCEnd] = useState("")
  const [searchQ, setSearchQ] = useState("")
  const [filterType, setFilterType] = useState<"all" | "ingreso" | "egreso">("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")

  const all = data.movements.filter(m => m.project_id === project.id)
  const df = filterByDateRange(all, movPeriod, cStart, cEnd)
  const movs = useMemo(() => {
    let filtered = df.filter(m => {
      if (searchQ && !m.description.toLowerCase().includes(searchQ.toLowerCase())) return false
      if (filterType !== "all" && m.type !== filterType) return false
      return true
    })
    return filtered.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "date": cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break
        case "description": cmp = a.description.localeCompare(b.description); break
        case "amount": cmp = a.amount - b.amount; break
        case "type": cmp = a.type.localeCompare(b.type); break
        case "provider": {
          const pa = data.providers.find(p => p.id === a.provider_id)?.name || ""
          const pb = data.providers.find(p => p.id === b.provider_id)?.name || ""
          cmp = pa.localeCompare(pb); break
        }
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [df, searchQ, filterType, sortField, sortDir, data.providers])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir(field === "amount" ? "desc" : "asc") }
  }

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-2.5 text-left cursor-pointer hover:bg-[#E0DDD0]/50 select-none ${className || ""}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
        {label}
        {sortField === field ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-30" />}
      </div>
    </th>
  )

  const startEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field }); setEditValue(value)
  }
  const saveEdit = async (movId: string) => {
    if (!editingCell) return
    const updates: Record<string, any> = {}
    if (editingCell.field === "description") updates.description = editValue
    else if (editingCell.field === "amount") updates.amount = parseFloat(editValue) || 0
    else if (editingCell.field === "date") updates.date = editValue
    await updateRow("movements", movId, updates, "movements")
    setEditingCell(null)
  }
  const cancelEdit = () => setEditingCell(null)

  const arsMovs = movs.filter(m => m.medio_pago !== "USD")
  const totalIngresos = arsMovs.filter(m => m.type === "ingreso").reduce((s, m) => s + m.amount, 0)
  const totalEgresos = arsMovs.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)
  const balance = totalIngresos - totalEgresos
  const usdMovs = movs.filter(m => m.medio_pago === "USD")
  const usdIngresos = usdMovs.filter(m => m.type === "ingreso").reduce((s, m) => s + m.amount, 0)
  const usdEgresos = usdMovs.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)
  const usdBalance = usdIngresos - usdEgresos

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xs text-green-600 mb-1">Ingresos</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totalIngresos)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 mb-1">Egresos</p>
          <p className="text-lg font-bold text-red-700">{formatCurrency(totalEgresos)}</p>
        </div>
        <div className={`${balance >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"} border rounded-xl p-3 text-center`}>
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className={`text-lg font-bold ${balance >= 0 ? "text-blue-700" : "text-amber-700"}`}>{formatCurrency(balance)}</p>
        </div>
      </div>
      {usdMovs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Ingresos U$D</p>
            <p className="text-lg font-bold text-green-700">U$D {new Intl.NumberFormat("es-AR").format(usdIngresos)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 mb-1">Egresos U$D</p>
            <p className="text-lg font-bold text-red-700">U$D {new Intl.NumberFormat("es-AR").format(usdEgresos)}</p>
          </div>
          <div className={`${usdBalance >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"} border rounded-xl p-3 text-center`}>
            <p className="text-xs text-muted-foreground mb-1">Balance U$D</p>
            <p className={`text-lg font-bold ${usdBalance >= 0 ? "text-blue-700" : "text-amber-700"}`}>U$D {new Intl.NumberFormat("es-AR").format(usdBalance)}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar movimientos..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" /></div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
            {(["all", "ingreso", "egreso"] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium ${filterType === t ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A] hover:bg-[#F0EDE4]"}`}>
                {t === "all" ? "Todos" : t === "ingreso" ? "Ingresos" : "Egresos"}
              </button>
            ))}
          </div>
          <PeriodFilter value={movPeriod} onChange={setMovPeriod} onCustomRange={(s, e) => { setCStart(s); setCEnd(e) }} />
          <Btn variant="soft" size="sm" onClick={() => exportProjectMovementsXLSX(project.name, movs.map(m => ({ date: m.date, description: m.description, amount: m.amount, type: m.type, category: m.category || undefined, provider: data.providers.find(p => p.id === m.provider_id)?.name })))}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn size="sm" onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1 inline" />Movimiento</Btn>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {movs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0EDE4]">
                <tr>
                  <SortHeader field="date" label="Fecha" className="w-28" />
                  <SortHeader field="description" label="Descripción" />
                  <SortHeader field="provider" label="Proveedor" className="hidden md:table-cell" />
                  <SortHeader field="type" label="Tipo" className="w-24" />
                  <SortHeader field="amount" label="Monto" className="w-32" />
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Cuenta</th>
                  <th className="px-3 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {movs.map(mov => {
                  const provName = data.providers.find(p => p.id === mov.provider_id)?.name
                  const accName = data.accounts.find(a => a.id === mov.account_id)?.name
                  const isEditing = (field: string) => editingCell?.id === mov.id && editingCell?.field === field
                  return (
                    <tr key={mov.id} className="group hover:bg-[#FAFAF9] transition-colors">
                      {/* Date */}
                      <td className="px-3 py-2.5">
                        {isEditing("date") ? (
                          <input type="date" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-xs border border-[#5F5A46] rounded bg-white" />
                        ) : (
                          <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" onDoubleClick={() => startEdit(mov.id, "date", mov.date)}>
                            {formatDate(mov.date)}
                          </span>
                        )}
                      </td>
                      {/* Description */}
                      <td className="px-3 py-2.5">
                        {isEditing("description") ? (
                          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-sm border border-[#5F5A46] rounded bg-white" />
                        ) : (
                          <span className={`font-medium cursor-pointer hover:underline ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}
                            onDoubleClick={() => startEdit(mov.id, "description", mov.description)}>
                            {mov.description}
                          </span>
                        )}
                        {mov.category && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#F0EDE4] text-[#76746A] rounded">{mov.category}</span>}
                        {mov.concepto === "seña" || mov.concepto?.startsWith("seña") ? (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">Seña</span>
                        ) : mov.concepto ? (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{mov.concepto}</span>
                        ) : null}
                        {mov.sena_real_pct != null && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">Prov {mov.sena_real_pct}%</span>}
                        {mov.sena_cliente_pct != null && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">Cli {mov.sena_cliente_pct}%</span>}
                        {(mov.category === "Diferencia seña" || mov.category === "Aporte propio seña") && (
                          <p className="text-[10px] text-amber-600 mt-0.5">Aporte propio — Cuenta: {accName || "sin cuenta"}</p>
                        )}
                        {mov.category === "Seña proveedor" && (
                          <p className="text-[10px] text-purple-600 mt-0.5">Pago seña a {provName || "proveedor"} — Cuenta: {accName || "sin cuenta"}</p>
                        )}
                      </td>
                      {/* Provider */}
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{provName || "—"}</span>
                      </td>
                      {/* Type */}
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mov.type === "ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {mov.type === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      {/* Amount */}
                      <td className="px-3 py-2.5 text-right">
                        {isEditing("amount") ? (
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            onBlur={() => saveEdit(mov.id)} onKeyDown={e => { if (e.key === "Enter") saveEdit(mov.id); if (e.key === "Escape") cancelEdit() }}
                            className="w-full px-1.5 py-0.5 text-sm border border-[#5F5A46] rounded bg-white text-right" />
                        ) : (
                          <>
                            <span className={`font-semibold cursor-pointer hover:underline ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}
                              onDoubleClick={() => startEdit(mov.id, "amount", String(mov.amount))}>
                              {mov.type === "ingreso" ? "+" : "-"}{mov.medio_pago === "USD" ? `U$D ${new Intl.NumberFormat("es-AR").format(mov.amount)}` : formatCurrency(mov.amount)}
                            </span>
                            {mov.medio_pago === "USD" && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">USD</span>}
                          </>
                        )}
                      </td>
                      {/* Account */}
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{accName || "—"}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 sm:opacity-100">
                          <button onClick={() => deleteMovement(mov.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-[#F0EDE4] font-semibold text-sm">
                  <td className="px-3 py-3" colSpan={4}>
                    <span className="text-muted-foreground">{movs.length} movimiento{movs.length !== 1 ? "s" : ""}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    <span className="text-green-700">+{formatCurrency(totalIngresos)}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="text-red-700">-{formatCurrency(totalEgresos)}</span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <Empty title="Sin movimientos" description="Registrá el primer movimiento del proyecto" action={<Btn onClick={() => setShowAdd(true)}>+ Movimiento</Btn>} />}
      </div>

      <p className="text-xs text-muted-foreground">Doble click en fecha, descripción o monto para editar inline</p>

      {showAdd && <AddMovModal project={project} accounts={data.accounts} providers={data.providers} onClose={() => setShowAdd(false)} onSave={async (m) => { await addMovement(m); setShowAdd(false) }} />}
    </div>
  )
}

// =================== TAB: ARCHIVOS ===================
function ArchivosTab({ project }: { project: Project }) {
  const { data, addRow, deleteRow, uploadFile, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [showUpload, setShowUpload] = useState(false); const [searchQ, setSearchQ] = useState(""); const [filterCat, setFilterCat] = useState(""); const [preview, setPreview] = useState<ProjectFile | null>(null)
  const files = data.projectFiles.filter(f => f.project_id === project.id)
  const filtered = files.filter(f => { if (filterCat && f.category !== filterCat) return false; if (searchQ && !f.name.toLowerCase().includes(searchQ.toLowerCase())) return false; return true })
  const cats = [...new Set(files.map(f => f.category))].sort()
  const isImg = (m?: string | null) => m?.startsWith("image/"); const isPDF = (m?: string | null) => m === "application/pdf"
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar archivos..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" /></div>
        <div className="flex gap-2">{cats.length > 0 && <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white">
          <option value="">Todas</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>}
          <Btn size="sm" onClick={() => setShowUpload(true)}><Upload size={14} className="mr-1 inline" />Subir</Btn></div>
      </div>
      {!filterCat && cats.length > 1 && <div className="flex flex-wrap gap-2">{cats.map(c => <button key={c} onClick={() => setFilterCat(c)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-[#F0EDE4] text-sm"><FolderOpen size={16} className="text-[#5F5A46]" />{c} <span className="text-xs text-muted-foreground">({files.filter(f => f.category === c).length})</span></button>)}</div>}
      {filtered.length > 0 ? <div className="grid sm:grid-cols-2 gap-3">{filtered.map(f => (
        <div key={f.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg group">
          {isImg(f.mime_type) && f.url ? <img src={f.url} alt={f.name} className="w-10 h-10 rounded object-cover shrink-0 cursor-pointer" onClick={() => setPreview(f)} /> : <FileText size={20} className="text-[#5F5A46] shrink-0" />}
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-muted-foreground">{f.category}{f.file_size && ` · ${(f.file_size / 1024 / 1024).toFixed(1)} MB`}</p></div>
          <div className="flex gap-1 shrink-0">{f.url && <button onClick={() => setPreview(f)} className="p-1 hover:bg-accent rounded"><Eye size={14} /></button>}
            {f.url && <a href={f.url} target="_blank" rel="noopener" className="p-1 hover:bg-accent rounded"><Download size={14} /></a>}
            <button onClick={() => deleteRow("project_files", f.id, "projectFiles")} className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 sm:opacity-100"><Trash2 size={12} className="text-red-600" /></button></div>
        </div>))}</div> : <Empty title="Sin archivos" />}
      {preview && <Modal isOpen={true} title={preview.name} onClose={() => setPreview(null)} size="xl">
        {isImg(preview.mime_type) && preview.url ? <img src={preview.url} alt={preview.name} className="w-full rounded-lg" />
          : isPDF(preview.mime_type) && preview.url ? <iframe src={preview.url} className="w-full h-[60vh] rounded-lg border" />
          : <div className="text-center py-8"><FileText size={48} className="mx-auto text-muted-foreground mb-4" /><p className="text-sm text-muted-foreground">Vista previa no disponible</p>
            {preview.url && <a href={preview.url} target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Abrir</a>}</div>}
      </Modal>}
      {showUpload && <UploadModal projectId={project.id} onClose={() => setShowUpload(false)} onUpload={async (file, meta) => {
        const r = await uploadFile("documents", `projects/${project.id}/${Date.now()}_${file.name}`, file)
        if (r) await addRow("project_files", { id: generateId(), project_id: project.id, name: meta.name || file.name, category: meta.category, description: meta.description, url: r.url, storage_path: r.path, file_size: file.size, mime_type: file.type }, "projectFiles")
        setShowUpload(false)
      }} />}
    </div>
  )
}

// =================== PROJECT PROFILE MODAL ===================
function ProjectProfileModal({ project, isFull, canSeeGanancias, onClose, onEdit }: { project: Project; isFull: boolean; canSeeGanancias: boolean; onClose: () => void; onEdit: () => void }) {
  const { data } = useApp()
  const totalCost = projectTotalCost(project, data.projectItems, data.quoteComparisons)
  const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
  const totalGanancia = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
  const income = projectIncome(data.movements, project.id)
  const expenses = projectExpenses(data.movements, project.id)
  const projectMoves = data.movements.filter(m => m.project_id === project.id)
  const projectItems = data.projectItems.filter(i => i.project_id === project.id)
  const projectTsk = data.tasks.filter(t => t.project_id === project.id)
  const projectFls = data.projectFiles.filter(f => f.project_id === project.id)
  const budgetFinal = project.budget_final ?? totalClient

  const InfoRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="flex justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${color || ""}`}>{value}</span>
    </div>
  )

  return (
    <Modal isOpen={true} title="" onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center pb-4 border-b border-border">
          <h2 className="font-serif text-2xl font-light text-[#1C1A12]">{project.name}</h2>
          <p className="text-sm text-[#76746A] mt-1">{project.client}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : project.status === "pausado" ? "yellow" : "gray"} />
            {project.type && <Tag label={project.type} color="gray" />}
          </div>
        </div>

        {/* Client info */}
        <div className="bg-[#F7F5ED] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Datos del Cliente</h4>
          <InfoRow label="Cliente" value={project.client} />
          {project.client_email && <InfoRow label="Email" value={project.client_email} />}
          {project.client_phone && <InfoRow label="Teléfono" value={project.client_phone} />}
          {project.address && <InfoRow label="Dirección" value={project.address} />}
          {project.type && <InfoRow label="Tipo" value={project.type} />}
          {project.start_date && <InfoRow label="Inicio" value={formatDate(project.start_date)} />}
          {project.end_date && <InfoRow label="Fin" value={formatDate(project.end_date)} />}
        </div>

        {/* Financial summary */}
        {isFull && <div className="bg-[#F7F5ED] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Resumen Financiero</h4>
          <InfoRow label="Presupuesto" value={formatCurrency(budgetFinal)} />
          <InfoRow label="Cobrado" value={formatCurrency(income)} color="text-green-600" />
          <InfoRow label="Pendiente de cobro" value={formatCurrency(budgetFinal - income)} color={budgetFinal - income > 0 ? "text-amber-600" : "text-green-600"} />
          <InfoRow label="Pagado a proveedores" value={formatCurrency(expenses)} color="text-red-600" />
          {canSeeGanancias && <>
            <InfoRow label="Costo total" value={formatCurrency(totalCost)} />
            <InfoRow label="Ganancia bruta" value={formatCurrency(totalGanancia)} color="text-green-700" />
            <InfoRow label="Margen" value={`${totalClient > 0 ? ((totalGanancia / totalClient) * 100).toFixed(1) : 0}%`} />
          </>}
        </div>}

        {/* Activity summary */}
        <div className="bg-[#F7F5ED] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Actividad</h4>
          <InfoRow label="Movimientos" value={String(projectMoves.length)} />
          <InfoRow label="Ítems presupuesto" value={String(projectItems.length)} />
          <InfoRow label="Tareas" value={`${projectTsk.filter(t => t.status !== "completada").length} pendientes / ${projectTsk.length} total`} />
          <InfoRow label="Archivos" value={String(projectFls.length)} />
          {project.created_at && <InfoRow label="Creado" value={formatDate(project.created_at.split("T")[0])} />}
        </div>

        {project.notes && <div className="bg-[#F7F5ED] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notas</h4>
          <p className="text-sm text-foreground whitespace-pre-wrap">{project.notes}</p>
        </div>}

        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
          <Btn variant="soft" onClick={onEdit}><Pencil size={14} className="mr-1 inline" />Editar Proyecto</Btn>
        </div>
      </div>
    </Modal>
  )
}

// =================== MODALS ===================
function ProjectFormModal({ project, onClose, onSave }: { project?: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [name, setName] = useState(project?.name ?? ""); const [client, setClient] = useState(project?.client ?? ""); const [address, setAddress] = useState(project?.address ?? "")
  const [type, setType] = useState(project?.type ?? "interiorismo"); const [status, setStatus] = useState(project?.status ?? "activo")
  const [email, setEmail] = useState(project?.client_email ?? ""); const [phone, setPhone] = useState(project?.client_phone ?? ""); const [pc, setPc] = useState(String(project?.partner_count ?? "2"))
  return (<Modal isOpen={true} title={project ? "Editar Proyecto" : "Nuevo Proyecto"} onClose={onClose} size="lg">
    <form onSubmit={e => { e.preventDefault(); onSave({ id: project?.id ?? generateId(), name, client, address, type, status, margin: project?.margin ?? 1.4,
      client_email: email || null, client_phone: phone || null, partner_count: parseInt(pc) || 2,
      iva_cliente_pct: project?.iva_cliente_pct ?? 21, iva_ganancia_pct: project?.iva_ganancia_pct ?? 10.5,
      sena_proveedor_pct: project?.sena_proveedor_pct ?? 60, sena_cliente_pct: project?.sena_cliente_pct ?? 50,
      created_at: project?.created_at ?? new Date().toISOString() })}} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormInput label="Nombre" value={name} onChange={setName} /><FormInput label="Cliente" value={client} onChange={setClient} /></div>
      <FormInput label="Dirección" value={address} onChange={setAddress} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <FormSelect label="Tipo" value={type || ""} onChange={setType} options={[{ value: "arquitectura", label: "Arquitectura" }, { value: "interiorismo", label: "Interiorismo" }, { value: "ambos", label: "Ambos" }]} />
        <FormSelect label="Estado" value={status || ""} onChange={setStatus} options={[{ value: "activo", label: "Activo" }, { value: "pausado", label: "Pausado" }, { value: "finalizado", label: "Finalizado" }]} />
        <FormInput label="Socias" type="number" value={pc} onChange={setPc} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormInput label="Email" type="email" value={email} onChange={setEmail} /><FormInput label="Teléfono" value={phone} onChange={setPhone} /></div>
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!name || !client}>{project ? "Guardar" : "Crear"}</Btn></div>
    </form>
  </Modal>)
}

function AddItemModal({ type, hasMultiplier, defaultMultiplier, providers, onClose, onSave }: {
  type: string; hasMultiplier: boolean; defaultMultiplier: number; providers: { id: string; name: string }[]; onClose: () => void; onSave: (item: ProjectItem) => void
}) {
  const [desc, setDesc] = useState(""); const [cost, setCost] = useState(""); const [mult, setMult] = useState(hasMultiplier ? String(defaultMultiplier) : "1"); const [prov, setProv] = useState("")
  const c = parseFloat(cost) || 0; const m = hasMultiplier ? (parseFloat(mult) || defaultMultiplier) : 1; const cp = c * m
  return (<Modal isOpen={true} title={`Agregar ${type}`} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onSave({ id: generateId(), project_id: "", type: type as any, description: desc, cost: c, client_price: hasMultiplier ? cp : c, multiplier: m, provider_id: prov || null, paid: false, sort_order: 0 })}} className="space-y-4">
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <FormSelect label="Proveedor" value={prov} onChange={setProv} options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
      <div className="grid grid-cols-2 gap-4"><FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" />{hasMultiplier && <FormInput label="Multiplicador" type="number" value={mult} onChange={setMult} step="0.1" />}</div>
      <div className="bg-[#F0EDE4] rounded-lg p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Precio cliente:</span><span className="text-lg font-semibold">{formatCurrency(cp)}</span></div>
        {hasMultiplier ? <p className="text-xs text-muted-foreground mt-1">Ganancia: {formatCurrency(cp - c)}</p> : <p className="text-xs text-muted-foreground mt-1">Sin ganancia</p>}</div>
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!desc || !cost}>Agregar</Btn></div>
    </form>
  </Modal>)
}

function EditItemModal({ item, hasMultiplier, providers, onClose, onSave }: {
  item: ProjectItem; hasMultiplier: boolean; providers: { id: string; name: string }[]; onClose: () => void; onSave: (u: Partial<ProjectItem>) => void
}) {
  const [desc, setDesc] = useState(item.description); const [cost, setCost] = useState(String(item.cost)); const [mult, setMult] = useState(String(item.multiplier))
  const [prov, setProv] = useState(item.provider_id ?? ""); const [paid, setPaid] = useState(item.paid)
  const c = parseFloat(cost) || 0; const m = hasMultiplier ? (parseFloat(mult) || 1.4) : 1; const cp = c * m
  return (<Modal isOpen={true} title={`Editar ${item.type}`} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onSave({ description: desc, cost: c, client_price: hasMultiplier ? cp : c, multiplier: m, provider_id: prov || null, paid })}} className="space-y-4">
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <FormSelect label="Proveedor" value={prov} onChange={setProv} options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
      <div className="grid grid-cols-2 gap-4"><FormInput label="Costo" type="number" value={cost} onChange={setCost} />{hasMultiplier && <FormInput label="Mult" type="number" value={mult} onChange={setMult} step="0.1" />}</div>
      <div className="flex items-center gap-3"><input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="w-4 h-4" /><label className="text-sm">Pagado</label></div>
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!desc || !cost}>Guardar</Btn></div>
    </form>
  </Modal>)
}

function QuoteModal({ projectId, providers, onClose, onSave }: { projectId: string; providers: any[]; onClose: () => void; onSave: (q: QuoteComparison) => void }) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [cat, setCat] = useState(""); const [item, setItem] = useState(""); const [pn, setPn] = useState(""); const [pid, setPid] = useState(""); const [cost, setCost] = useState("")
  const itcs = getCategoriesFor("item_type"); const [it, setIt] = useState(itcs[0]?.name || "Mobiliario")
  const hm = itcs.find(c => c.name === it)?.has_multiplier !== false; const cn = parseFloat(cost) || 0; const qcs = getCategoriesFor("quote_category")
  return (<Modal isOpen={true} title="Nueva Cotización" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onSave({ id: generateId(), date: today(), project_id: projectId, category: cat, item, type: it as any,
      provider_id: pid || null, provider_name: pn || providers.find(p => p.id === pid)?.name || "", cost: cn,
      price_x14: cn * 1.4, price_x16: cn * 1.6, ganancia_x14: cn * 0.4, ganancia_x16: cn * 0.6, selected: false, selected_multiplier: null })}} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EditableSelect label="Categoría" value={cat} onChange={setCat} options={qcs.map(c => ({ value: c.name, label: c.name }))} onAddNew={n => addCategory("quote_category", n)} onDelete={n => deleteCategory(n)} placeholder="Ej: Carpintería" />
        <FormInput label="Ítem" value={item} onChange={setItem} placeholder="Ej: Mueble de TV" /></div>
      <FormSelect label="Sección" value={it} onChange={setIt} options={itcs.map(c => ({ value: c.name, label: `${c.name} ${c.has_multiplier !== false ? "(con ganancia)" : "(sin ganancia)"}` }))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect label="Proveedor" value={pid} onChange={v => { setPid(v); setPn(providers.find(p => p.id === v)?.name || "") }} options={providers.map(p => ({ value: p.id, label: p.name }))} />
        <FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" /></div>
      {cn > 0 && <div className="bg-[#F0EDE4] rounded-lg p-4 text-sm">{!hm ? <p className="text-muted-foreground">Sin ganancia</p>
        : <div className="grid grid-cols-2 gap-3"><div>x1.4: <strong>{formatCurrency(cn * 1.4)}</strong> <span className="text-green-600">+{formatCurrency(cn * 0.4)}</span></div>
          <div>x1.6: <strong>{formatCurrency(cn * 1.6)}</strong> <span className="text-green-600">+{formatCurrency(cn * 0.6)}</span></div></div>}</div>}
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!item || !cost || !cat}>Agregar</Btn></div>
    </form>
  </Modal>)
}

function AddMovModal({ project, accounts, providers, onClose, onSave }: { project: Project; accounts: any[]; providers: any[]; onClose: () => void; onSave: (m: Movement) => void }) {
  const { data, addRow, addMovement: addMov } = useApp()
  const [date, setDate] = useState(today()); const [desc, setDesc] = useState(""); const [amt, setAmt] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso"); const [aid, setAid] = useState(accounts[0]?.id ?? ""); const [pid, setPid] = useState(""); const [split, setSplit] = useState(true)
  const [pagoDirecto, setPagoDirecto] = useState(false); const [pagoProvId, setPagoProvId] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS")
  // Seña tracking
  const [esSeña, setEsSeña] = useState(false)
  const [señaClientePct, setSeñaClientePct] = useState(String(project.sena_cliente_pct ?? 50))
  const [señaProvPct, setSeñaProvPct] = useState(String(project.sena_proveedor_pct ?? 60))
  const [señaPagadaProv, setSeñaPagadaProv] = useState(false)
  const [señaProvIdLocal, setSeñaProvIdLocal] = useState("") // proveedor de seña si no hay uno en egreso/pago directo
  const [señaItemIds, setSeñaItemIds] = useState<string[]>([]) // productos seleccionados para la seña

  // Provider debt for this project
  const activeProvId = type === "egreso" ? pid : pagoProvId
  const selectedProv = activeProvId ? providers.find((p: any) => p.id === activeProvId) : null
  const provItems = activeProvId ? data.projectItems.filter(i => i.project_id === project.id && i.provider_id === activeProvId) : []
  const provQuotes = activeProvId ? data.quoteComparisons.filter(q => q.project_id === project.id && q.provider_id === activeProvId && q.selected) : []
  const provOwed = provItems.reduce((s, i) => s + i.cost, 0) + provQuotes.reduce((s, q) => s + q.cost, 0)
  const provPaid = activeProvId ? data.movements.filter(m => m.project_id === project.id && m.provider_id === activeProvId && m.type === "egreso").reduce((s, m) => s + m.amount, 0) : 0
  const provDebt = provOwed - provPaid

  // Seña calculations
  const señaActiveProvId = activeProvId || señaProvIdLocal
  // Pre-populate seña % from provider's saved advance_percent
  useEffect(() => {
    if (señaActiveProvId) {
      const prov = providers.find((p: any) => p.id === señaActiveProvId)
      if (prov?.advance_percent != null) setSeñaProvPct(String(prov.advance_percent))
    }
  }, [señaActiveProvId, providers])
  const señaCliPctNum = parseFloat(señaClientePct) || 0
  const señaProvPctNum = parseFloat(señaProvPct) || 0
  const amount = parseFloat(amt) || 0
  // Si hay items seleccionados, calcular sobre esos; sino sobre todo lo del proveedor
  const señaOwedForCalc = señaItemIds.length > 0
    ? data.projectItems.filter(i => señaItemIds.includes(i.id)).reduce((s, i) => s + i.cost, 0)
      + data.quoteComparisons.filter(q => señaItemIds.includes(q.id)).reduce((s, q) => s + q.cost, 0)
    : (señaActiveProvId
      ? data.projectItems.filter(i => i.project_id === project.id && i.provider_id === señaActiveProvId).reduce((s, i) => s + i.cost, 0)
        + data.quoteComparisons.filter(q => q.project_id === project.id && q.provider_id === señaActiveProvId && q.selected).reduce((s, q) => s + q.cost, 0)
      : provOwed)
  const señaDiff = esSeña && señaProvPctNum > señaCliPctNum ? ((señaProvPctNum - señaCliPctNum) / 100) * señaOwedForCalc : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const concepto = esSeña ? `seña` : undefined
    const mainMov: Movement = {
      id: generateId(), date, description: desc, amount, type, project_id: project.id,
      account_id: aid || null, provider_id: type === "egreso" ? (pid || null) : (esSeña && señaActiveProvId ? señaActiveProvId : null),
      category: "Proyecto", auto_split: type === "ingreso" ? split : false, split_percentage: 50,
      concepto: concepto || null,
      sena_real_pct: esSeña ? señaProvPctNum : null,
      sena_cliente_pct: esSeña ? señaCliPctNum : null,
      medio_pago: currency === "USD" ? "USD" : null,
    }
    onSave(mainMov)

    // Pago directo: create egreso for provider
    if (type === "ingreso" && pagoDirecto && pagoProvId) {
      await addMov({
        id: generateId(), date, description: `[Pago directo] ${desc}`, amount, type: "egreso" as const,
        project_id: project.id, account_id: aid || null, provider_id: pagoProvId, category: "Pago directo",
        auto_split: false, split_percentage: 0,
        concepto: selectedItemId ? `item:${selectedItemId}` : null,
        medio_pago: currency === "USD" ? "USD" : null,
      } as Movement)
    }

    // Seña: create provider payment egreso
    if (esSeña && señaPagadaProv && señaActiveProvId) {
      const señaProvAmount = (señaProvPctNum / 100) * señaOwedForCalc
      const itemNames = señaItemIds.length > 0
        ? data.projectItems.filter(i => señaItemIds.includes(i.id)).map(i => i.description)
            .concat(data.quoteComparisons.filter(q => señaItemIds.includes(q.id)).map(q => q.item))
            .join(", ")
        : ""
      const provName = providers.find((p: any) => p.id === señaActiveProvId)?.name || ""
      // Egreso: pago de seña al proveedor (monto completo del proveedor)
      await addMov({
        id: generateId(), date,
        description: `[Seña a proveedor] ${provName} — ${señaProvPctNum}%${itemNames ? ` → ${itemNames}` : ""}`,
        amount: señaProvAmount, type: "egreso" as const,
        project_id: project.id, account_id: aid || null, provider_id: señaActiveProvId,
        category: "Seña proveedor", auto_split: false, split_percentage: 0,
        concepto: señaItemIds.length > 0 ? `seña:${señaItemIds.join(",")}` : "seña",
        sena_real_pct: señaProvPctNum,
        sena_cliente_pct: señaCliPctNum,
        medio_pago: currency === "USD" ? "USD" : null,
      } as Movement)
      // If provider% > client%, also register the difference from own funds
      if (señaDiff > 0) {
        await addMov({
          id: generateId(), date,
          description: `[Aporte propio seña] ${provName} (${señaProvPctNum}% prov - ${señaCliPctNum}% cli)${itemNames ? ` → ${itemNames}` : ""}`,
          amount: señaDiff, type: "egreso" as const,
          project_id: project.id, account_id: aid || null, provider_id: señaActiveProvId,
          category: "Aporte propio seña", auto_split: false, split_percentage: 0,
          concepto: señaItemIds.length > 0 ? `seña:${señaItemIds.join(",")}` : "seña",
          medio_pago: currency === "USD" ? "USD" : null,
        } as Movement)
      }
    }
  }

  const ProviderDebtPanel = ({ provId }: { provId: string }) => {
    const prov = providers.find((p: any) => p.id === provId)
    const items = data.projectItems.filter(i => i.project_id === project.id && i.provider_id === provId)
    const quotes = data.quoteComparisons.filter(q => q.project_id === project.id && q.provider_id === provId && q.selected)
    const owed = items.reduce((s, i) => s + i.cost, 0) + quotes.reduce((s, q) => s + q.cost, 0)
    const paid = data.movements.filter(m => m.project_id === project.id && m.provider_id === provId && m.type === "egreso").reduce((s, m) => s + m.amount, 0)
    const debt = owed - paid
    if (!prov) return null
    return (
      <div className="bg-[#F7F5ED] rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Deuda con {prov.name}</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Comprometido: {formatCurrency(owed)}</span>
          <span className="text-green-600">Pagado: {formatCurrency(paid)}</span>
        </div>
        <p className={`text-sm font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>
          {debt > 0 ? `Pendiente: ${formatCurrency(debt)}` : "Al día ✓"}
        </p>
        {(items.length > 0 || quotes.length > 0) && (
          <div className="border-t border-border pt-2 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Ítems de este proveedor:</p>
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                  {type === "egreso" && <input type="radio" name="targetItem" value={item.id}
                    checked={selectedItemId === item.id} onChange={() => setSelectedItemId(item.id)}
                    className="w-3 h-3" />}
                  <span className="truncate">{item.description}</span>
                </label>
                <span className="font-medium shrink-0">{formatCurrency(item.cost)}</span>
              </div>
            ))}
            {quotes.map(q => (
              <div key={q.id} className="flex items-center justify-between text-xs gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                  {type === "egreso" && <input type="radio" name="targetItem" value={q.id}
                    checked={selectedItemId === q.id} onChange={() => setSelectedItemId(q.id)}
                    className="w-3 h-3" />}
                  <span className="truncate">{q.item} <span className="text-muted-foreground">(cotización)</span></span>
                </label>
                <span className="font-medium shrink-0">{formatCurrency(q.cost)}</span>
              </div>
            ))}
            {type === "egreso" && selectedItemId && (
              <button type="button" onClick={() => setSelectedItemId("")} className="text-[10px] text-blue-600 hover:underline">No especificar ítem</button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (<Modal isOpen={true} title="Movimiento" onClose={onClose} size="lg">
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4"><FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)} options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} /></div>
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-4"><FormInput label="Monto" type="number" value={amt} onChange={setAmt} inputMode="decimal" />
        <FormSelect label="Cuenta" value={aid} onChange={setAid} options={accounts.map(a => ({ value: a.id, label: a.name }))} /></div>
      <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
        <button type="button" onClick={() => setCurrency("ARS")} className={`px-4 py-1.5 text-sm font-medium ${currency === "ARS" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>$ ARS</button>
        <button type="button" onClick={() => setCurrency("USD")} className={`px-4 py-1.5 text-sm font-medium ${currency === "USD" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>U$D</button>
      </div>

      {/* Egreso: provider + item selection */}
      {type === "egreso" && <>
        <FormSelect label="Proveedor" value={pid} onChange={v => { setPid(v); setSelectedItemId("") }}
          options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        {pid && <ProviderDebtPanel provId={pid} />}
      </>}

      {/* Ingreso options */}
      {type === "ingreso" && <>
        <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg"><input type="checkbox" checked={split} onChange={e => setSplit(e.target.checked)} className="w-4 h-4" /><p className="text-sm font-medium text-green-800">Distribuir 50/50 entre socias</p></div>
        <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg"><input type="checkbox" checked={pagoDirecto} onChange={e => setPagoDirecto(e.target.checked)} className="w-4 h-4" /><p className="text-sm font-medium text-blue-800">Pago directo a proveedor</p></div>
        {pagoDirecto && <>
          <FormSelect label="Proveedor" value={pagoProvId} onChange={v => { setPagoProvId(v); setSelectedItemId("") }}
            options={[{ value: "", label: "Seleccionar proveedor..." }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
          {pagoProvId && <ProviderDebtPanel provId={pagoProvId} />}
        </>}
      </>}

      {/* Seña tracking */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${esSeña ? "bg-purple-50" : "bg-[#F7F5ED]"}`}>
        <input type="checkbox" checked={esSeña} onChange={e => setEsSeña(e.target.checked)} className="w-4 h-4" />
        <div>
          <p className={`text-sm font-medium ${esSeña ? "text-purple-800" : "text-muted-foreground"}`}>Es seña / anticipo</p>
          {!esSeña && <p className="text-xs text-muted-foreground">Marcar si es un pago de seña</p>}
        </div>
      </div>
      {esSeña && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          {/* Proveedor de la seña - si no hay uno seleccionado arriba */}
          {!activeProvId && (
            <FormSelect label="¿A qué proveedor va esta seña?" value={señaProvIdLocal} onChange={v => { setSeñaProvIdLocal(v); setSeñaItemIds([]) }}
              options={[{ value: "", label: "Seleccionar proveedor..." }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
          )}

          {/* Productos del proveedor - elegir a cuáles aplica la seña */}
          {señaActiveProvId && (() => {
            const sItems = data.projectItems.filter(i => i.project_id === project.id && i.provider_id === señaActiveProvId)
            const sQuotes = data.quoteComparisons.filter(q => q.project_id === project.id && q.provider_id === señaActiveProvId && q.selected)
            const provName = providers.find((p: any) => p.id === señaActiveProvId)?.name || ""
            const totalSeñaProv = sItems.filter(i => señaItemIds.includes(i.id)).reduce((s, i) => s + i.cost, 0)
              + sQuotes.filter(q => señaItemIds.includes(q.id)).reduce((s, q) => s + q.cost, 0)
            const totalAllProv = sItems.reduce((s, i) => s + i.cost, 0) + sQuotes.reduce((s, q) => s + q.cost, 0)
            return (sItems.length > 0 || sQuotes.length > 0) ? (
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-purple-700 uppercase">Productos de {provName}</p>
                  <button type="button" onClick={() => {
                    if (señaItemIds.length === sItems.length + sQuotes.length) setSeñaItemIds([])
                    else setSeñaItemIds([...sItems.map(i => i.id), ...sQuotes.map(q => q.id)])
                  }} className="text-[10px] text-purple-600 hover:underline">
                    {señaItemIds.length === sItems.length + sQuotes.length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>
                {sItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={señaItemIds.includes(item.id)}
                      onChange={e => setSeñaItemIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(x => x !== item.id))}
                      className="w-3.5 h-3.5 accent-purple-600" />
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="font-medium shrink-0">{formatCurrency(item.cost)}</span>
                  </label>
                ))}
                {sQuotes.map(q => (
                  <label key={q.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={señaItemIds.includes(q.id)}
                      onChange={e => setSeñaItemIds(prev => e.target.checked ? [...prev, q.id] : prev.filter(x => x !== q.id))}
                      className="w-3.5 h-3.5 accent-purple-600" />
                    <span className="flex-1 truncate">{q.item} <span className="text-muted-foreground">(cotización)</span></span>
                    <span className="font-medium shrink-0">{formatCurrency(q.cost)}</span>
                  </label>
                ))}
                {señaItemIds.length > 0 && (
                  <div className="border-t border-purple-200 pt-2 mt-1 flex justify-between text-xs font-semibold text-purple-700">
                    <span>Seña aplica sobre:</span>
                    <span>{formatCurrency(totalSeñaProv)} de {formatCurrency(totalAllProv)}</span>
                  </div>
                )}
              </div>
            ) : null
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-purple-700">Seña cliente %</label>
              <input type="number" value={señaClientePct} onChange={e => setSeñaClientePct(e.target.value)} step="1"
                className="w-full px-3 py-1.5 rounded border border-purple-300 text-sm bg-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700">Seña proveedor %</label>
              <input type="number" value={señaProvPct} onChange={e => setSeñaProvPct(e.target.value)} step="1"
                className="w-full px-3 py-1.5 rounded border border-purple-300 text-sm bg-white mt-1" />
            </div>
          </div>
          {/* Resumen de montos */}
          {señaOwedForCalc > 0 && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-purple-600">Cliente paga ({señaCliPctNum}%):</span> <strong className="text-green-700">{formatCurrency((señaCliPctNum / 100) * señaOwedForCalc)}</strong></div>
                <div><span className="text-purple-600">Proveedor cobra ({señaProvPctNum}%):</span> <strong className="text-red-700">{formatCurrency((señaProvPctNum / 100) * señaOwedForCalc)}</strong></div>
              </div>
              {señaProvPctNum > señaCliPctNum && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <p className="text-xs font-medium text-amber-800">
                    Aporte propio: {señaProvPctNum - señaCliPctNum}% = {formatCurrency(señaDiff)}
                  </p>
                </div>
              )}
              {señaProvPctNum <= señaCliPctNum && (
                <p className="text-xs text-green-600">La seña del cliente cubre la del proveedor.</p>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-purple-200">
                <input type="checkbox" checked={señaPagadaProv} onChange={e => setSeñaPagadaProv(e.target.checked)} className="w-4 h-4" />
                <span className="text-xs text-purple-700 font-medium">Ya le pagué la seña al proveedor (registrar egreso de {formatCurrency((señaProvPctNum / 100) * señaOwedForCalc)})</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!desc || !amt}>Registrar</Btn></div>
    </form>
  </Modal>)
}

function EditMovModal({ movement, accounts, providers, onClose, onSave }: { movement: Movement; accounts: any[]; providers: any[]; onClose: () => void; onSave: (u: Partial<Movement>) => void }) {
  const [date, setDate] = useState(movement.date); const [desc, setDesc] = useState(movement.description); const [amt, setAmt] = useState(String(movement.amount))
  const [type, setType] = useState(movement.type); const [aid, setAid] = useState(movement.account_id ?? ""); const [pid, setPid] = useState(movement.provider_id ?? "")
  return (<Modal isOpen={true} title="Editar Movimiento" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onSave({ date, description: desc, amount: parseFloat(amt) || 0, type, account_id: aid || null, provider_id: pid || null })}} className="space-y-4">
      <div className="grid grid-cols-2 gap-4"><FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)} options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} /></div>
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-4"><FormInput label="Monto" type="number" value={amt} onChange={setAmt} />
        <FormSelect label="Cuenta" value={aid} onChange={setAid} options={[{ value: "", label: "Sin cuenta" }, ...accounts.map(a => ({ value: a.id, label: a.name }))]} /></div>
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!desc || !amt}>Guardar</Btn></div>
    </form>
  </Modal>)
}

function UploadModal({ projectId, onClose, onUpload }: { projectId: string; onClose: () => void; onUpload: (file: File, meta: { name: string; category: string; description: string }) => void }) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [name, setName] = useState(""); const [cat, setCat] = useState("otro"); const [desc, setDesc] = useState(""); const [file, setFile] = useState<File | null>(null); const ref = useRef<HTMLInputElement>(null)
  const fcs = getCategoriesFor("file_category")
  const dcs = [{ value: "contrato", label: "Contrato" }, { value: "plano", label: "Plano" }, { value: "presupuesto", label: "Presupuesto" }, { value: "factura", label: "Factura" }, { value: "foto", label: "Foto" }, { value: "render", label: "Render" }, { value: "otro", label: "Otro" }]
  const acs = [...dcs, ...fcs.filter(c => !dcs.some(d => d.value === c.name)).map(c => ({ value: c.name, label: c.name }))]
  return (<Modal isOpen={true} title="Subir Archivo" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); if (file) onUpload(file, { name: name || file.name, category: cat, description: desc }) }} className="space-y-4">
      <div className="border-2 border-dashed border-[#E0DDD0] rounded-lg p-6 text-center cursor-pointer hover:border-[#5F5A46]" onClick={() => ref.current?.click()}>
        <input ref={ref} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!name) setName(f.name) } }} />
        {file ? <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p> : <p className="text-sm text-muted-foreground">Click para seleccionar</p>}</div>
      <FormInput label="Nombre" value={name} onChange={setName} />
      <EditableSelect label="Categoría" value={cat} onChange={setCat} options={acs} onAddNew={n => addCategory("file_category", n)} onDelete={n => deleteCategory(n)} />
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!file}>Subir</Btn></div>
    </form>
  </Modal>)
}

// =================== TAREAS TAB ===================
function TareasTab({ project }: { project: Project }) {
  const { data, addRow, updateRow, deleteRow } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const tasks = data.tasks.filter(t => t.project_id === project.id)
    .sort((a, b) => {
      const prio: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      const stat: Record<string, number> = { pendiente: 0, "en-curso": 1, completada: 2 }
      return (stat[a.status] ?? 1) - (stat[b.status] ?? 1) || (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1)
    })

  const pendientes = tasks.filter(t => t.status === "pendiente").length
  const enCurso = tasks.filter(t => t.status === "en-curso").length
  const completadas = tasks.filter(t => t.status === "completada").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-yellow-600 font-medium">{pendientes} pendientes</span>
          <span className="text-blue-600 font-medium">{enCurso} en curso</span>
          <span className="text-green-600 font-medium">{completadas} completadas</span>
        </div>
        <Btn size="sm" onClick={() => { setEditingTask(null); setShowNew(true) }}>
          <Plus size={14} className="mr-1 inline" />Nueva Tarea
        </Btn>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg group ${task.status === "completada" ? "opacity-50" : ""}`}>
              <button onClick={async () => {
                const next: Record<string, string> = { pendiente: "en-curso", "en-curso": "completada", completada: "pendiente" }
                await updateRow("task_items", task.id, { status: next[task.status] || "pendiente" }, "tasks")
              }} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                task.status === "completada" ? "bg-green-600 border-green-600 text-white" : task.status === "en-curso" ? "border-blue-500 bg-blue-50" : "border-[#E0DDD0]"
              }`}>
                {task.status === "completada" && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "completada" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <Tag label={task.priority} color={task.priority === "alta" ? "red" : task.priority === "media" ? "yellow" : "gray"} />
                  {task.due_date && <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>}
                  {task.assigned_to && <span className="text-xs text-muted-foreground">→ {task.assigned_to}</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100">
                <button onClick={() => { setEditingTask(task); setShowNew(true) }} className="p-1.5 hover:bg-accent rounded"><Pencil size={12} /></button>
                <button onClick={async () => { if (confirm("¿Eliminar tarea?")) await deleteRow("task_items", task.id, "tasks") }}
                  className="p-1.5 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Sin tareas" description="Agregá tareas para este proyecto" action={
          <Btn onClick={() => setShowNew(true)}>Nueva Tarea</Btn>
        } />
      )}

      {showNew && (
        <Modal isOpen={true} title={editingTask ? "Editar Tarea" : "Nueva Tarea"} onClose={() => { setShowNew(false); setEditingTask(null) }}>
          <TaskForm task={editingTask} projectId={project.id}
            onSave={async (t) => {
              if (editingTask) await updateRow("task_items", t.id, t, "tasks")
              else await addRow("task_items", t, "tasks")
              setShowNew(false); setEditingTask(null)
            }}
            onClose={() => { setShowNew(false); setEditingTask(null) }}
          />
        </Modal>
      )}
    </div>
  )
}

function TaskForm({ task, projectId, onSave, onClose }: { task: any; projectId: string; onSave: (t: any) => void; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [desc, setDesc] = useState(task?.description ?? "")
  const [status, setStatus] = useState(task?.status ?? "pendiente")
  const [priority, setPriority] = useState(task?.priority ?? "media")
  const [dueDate, setDueDate] = useState(task?.due_date ?? "")
  const [assignee, setAssignee] = useState(task?.assigned_to ?? "")

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({
      id: task?.id ?? generateId(), project_id: projectId, title, description: desc || null,
      status, priority, due_date: dueDate || null, assigned_to: assignee || null,
      created_at: task?.created_at ?? new Date().toISOString(),
    })}} className="space-y-4">
      <FormInput label="Título" value={title} onChange={setTitle} />
      <FormInput label="Descripción (opcional)" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Estado" value={status} onChange={setStatus} options={[
          { value: "pendiente", label: "Pendiente" }, { value: "en-curso", label: "En Curso" }, { value: "completada", label: "Completada" }
        ]} />
        <FormSelect label="Prioridad" value={priority} onChange={setPriority} options={[
          { value: "alta", label: "Alta" }, { value: "media", label: "Media" }, { value: "baja", label: "Baja" }
        ]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Fecha límite" type="date" value={dueDate} onChange={setDueDate} />
        <FormInput label="Asignada a" value={assignee} onChange={setAssignee} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn type="submit" disabled={!title}>{task ? "Guardar" : "Crear"}</Btn>
      </div>
    </form>
  )
}
