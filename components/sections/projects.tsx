"use client"

import { useState, useRef, useMemo } from "react"
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
import type { Project, ProjectItem, ProjectFile, Movement, QuoteComparison } from "@/lib/types"
import {
  Plus, ArrowLeft, Trash2, Pencil, Download, Upload, FileText, Check,
  Search, FolderOpen, Eye, Star, X, FileSpreadsheet, ChevronDown, ChevronUp,
} from "lucide-react"

// =================== TAB TYPES ===================
type ProjectTab = "desglose" | "comparador" | "movimientos" | "archivos"
const TAB_LABELS: Record<ProjectTab, string> = {
  desglose: "Desglose", comparador: "Comparador", movimientos: "Movimientos", archivos: "Archivos",
}

const TYPE_LABELS: Record<string, string> = {
  mano_de_obra: "Mano de Obra", material: "Material", mobiliario: "Mobiliario",
}

// =================== PROJECTS LIST ===================
export function Projects() {
  const { role, data, addRow, selectedProjectId, setSelectedProjectId } = useApp()
  const isFull = canSee(role)
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const projects = data.projects.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (selectedProjectId) {
    const project = data.projects.find(p => p.id === selectedProjectId)
    if (project) return <ProjectDetail project={project} onBack={() => setSelectedProjectId(null)} isFull={isFull} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proyectos</h1>
          <p className="text-sm text-[#76746A] mt-1">Gestión de proyectos del estudio</p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Proyecto</Btn>
      </div>

      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        placeholder="Buscar proyectos..." className="max-w-md w-full px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />

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
          return (
            <div key={project.id} onClick={() => setSelectedProjectId(project.id)}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : project.status === "pausado" ? "yellow" : "gray"} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{project.client}</p>
              {isFull && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Presup: {formatCurrency(totalClient)}</span>
                  <span className="text-green-600">Cobrado: {formatCurrency(income)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {projects.length === 0 && <Empty title="Sin proyectos" description="Creá tu primer proyecto" action={<Btn onClick={() => setShowNew(true)}>Crear</Btn>} />}

      {showNew && <ProjectFormModal onClose={() => setShowNew(false)} onSave={async (p) => {
        await addRow("projects", p, "projects"); setShowNew(false)
      }} />}
    </div>
  )
}

// =================== PROJECT DETAIL ===================
function ProjectDetail({ project, onBack, isFull }: { project: Project; onBack: () => void; isFull: boolean }) {
  const { data, updateRow, addRow, deleteRow, addMovement, deleteMovement, uploadFile } = useApp()
  const [tab, setTab] = useState<ProjectTab>("desglose")
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteProject, setShowDeleteProject] = useState(false)

  const items = data.projectItems.filter(i => i.project_id === project.id)
  const selectedQuotes = getSelectedQuotes(data.quoteComparisons, project.id)
  const totalCost = projectTotalCost(project, data.projectItems, data.quoteComparisons)
  const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
  const totalGanancia = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
  const income = projectIncome(data.movements, project.id)
  const expenses = projectExpenses(data.movements, project.id)
  const partnerCount = project.partner_count ?? 2

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
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
          <Btn variant="soft" size="sm" onClick={() => setShowEdit(true)}><Pencil size={14} className="mr-1 inline" />Editar</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowDeleteProject(true)}><Trash2 size={14} className="text-red-500" /></Btn>
        </div>
      </div>

      {/* Stats */}
      {isFull && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Presupuesto" value={formatCurrency(totalClient)} />
          <Stat label="Ganancia" value={formatCurrency(totalGanancia)} sub={`${totalClient > 0 ? ((totalGanancia / totalClient) * 100).toFixed(0) : 0}% margen`} highlight />
          <Stat label="Cobrado" value={formatCurrency(income)} sub={formatCurrency(totalClient - income) + " pendiente"} />
          <Stat label="Pagado proveedores" value={formatCurrency(expenses)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {(Object.keys(TAB_LABELS) as ProjectTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-[#5F5A46] text-[#1C1A12]" : "border-transparent text-[#76746A] hover:text-[#1C1A12]"
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "desglose" && <DesgloseTab project={project} items={items} selectedQuotes={selectedQuotes} isFull={isFull} />}
      {tab === "comparador" && <ComparadorTab project={project} />}
      {tab === "movimientos" && <MovimientosTab project={project} />}
      {tab === "archivos" && <ArchivosTab project={project} />}

      {/* Modals */}
      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} onSave={async (p) => {
        await updateRow("projects", project.id, p, "projects"); setShowEdit(false)
      }} />}
      {showDeleteProject && <ConfirmDeleteModal message={`¿Eliminar el proyecto "${project.name}"?`}
        onConfirm={async () => { await deleteRow("projects", project.id, "projects"); onBack() }}
        onCancel={() => setShowDeleteProject(false)} />}
    </div>
  )
}

// =================== TAB: DESGLOSE ===================
function DesgloseTab({ project, items, selectedQuotes, isFull }: {
  project: Project; items: ProjectItem[]; selectedQuotes: QuoteComparison[]; isFull: boolean
}) {
  const { data, updateRow, addRow, deleteRow, deleteMovement } = useApp()
  const [showAddItem, setShowAddItem] = useState<"mano_de_obra" | "material" | "mobiliario" | null>(null)
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null)

  const manoDeObra = items.filter(i => i.type === "mano_de_obra")
  const materiales = items.filter(i => i.type === "material")
  const mobiliario = items.filter(i => i.type === "mobiliario")

  // Quotes selected grouped by type
  const quoteMano = selectedQuotes.filter(q => q.type === "mano_de_obra")
  const quoteMat = selectedQuotes.filter(q => q.type === "material")
  const quoteMob = selectedQuotes.filter(q => q.type === "mobiliario")

  const totalCost = projectTotalCost(project, data.projectItems, data.quoteComparisons)
  const totalClient = projectTotalClientPrice(project, data.projectItems, data.quoteComparisons)
  const totalGanancia = projectTotalGanancia(project, data.projectItems, data.quoteComparisons)
  const partnerCount = project.partner_count ?? 2
  const ivaClientePct = project.iva_cliente_pct ?? 21
  const ivaGananciaPct = project.iva_ganancia_pct ?? 10.5
  const senaProvPct = project.sena_proveedor_pct ?? 60
  const senaCliPct = project.sena_cliente_pct ?? 50

  const ivaCliente = calcIVACliente(totalClient, ivaClientePct)
  const ivaGanancia = calcIVAGanancia(totalGanancia, ivaGananciaPct)
  const senaProveedor = calcSenaProveedor(totalCost, senaProvPct)
  const senaCliente = calcSenaCliente(totalClient, senaCliPct)
  const gananciaIndiv = calcGananciaIndividual(totalGanancia, partnerCount)

  const handleExportXLSX = () => {
    const allItems = items.map(i => ({
      type: i.type, description: i.description, cost: i.cost,
      clientPrice: i.client_price, ganancia: i.type === "material" ? 0 : i.client_price - i.cost,
      provider: data.providers.find(p => p.id === i.provider_id)?.name,
    }))
    const allQuotes = selectedQuotes.map(q => ({
      category: q.category, item: q.item, provider: q.provider_name,
      cost: q.cost, clientPrice: quoteClientPrice(q), ganancia: quoteGanancia(q),
    }))
    const summary = [
      { label: "Total Costo", value: totalCost },
      { label: "Total Precio Cliente", value: totalClient },
      { label: "Total Ganancia", value: totalGanancia },
      { label: `IVA ${ivaClientePct}% s/Precio Cliente`, value: ivaCliente },
      { label: `IVA ${ivaGananciaPct}% s/Ganancia (RI)`, value: ivaGanancia },
      { label: "Precio c/IVA", value: totalClient + ivaCliente },
      { label: `Seña Proveedor (${senaProvPct}%)`, value: senaProveedor },
      { label: `Seña Cliente (${senaCliPct}%)`, value: senaCliente },
      { label: "Diferencia Seña", value: senaCliente - senaProveedor },
      { label: `Ganancia Individual (÷${partnerCount})`, value: gananciaIndiv },
    ]
    exportProjectDesgloseXLSX(project.name, allItems, allQuotes, summary)
  }

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Btn variant="soft" size="sm" onClick={handleExportXLSX}>
          <FileSpreadsheet size={14} className="mr-1 inline" />Exportar XLSX
        </Btn>
      </div>

      {/* Honorarios */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Honorarios</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Costo</label>
            <input type="number" value={project.honorarios_cost || 0}
              onChange={e => updateRow("projects", project.id, { honorarios_cost: parseFloat(e.target.value) || 0 }, "projects")}
              className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Precio cliente</label>
            <input type="number" value={project.honorarios_client_price || 0}
              onChange={e => updateRow("projects", project.id, { honorarios_client_price: parseFloat(e.target.value) || 0 }, "projects")}
              className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" />
          </div>
        </div>
      </div>

      {/* Items sections */}
      {(["mano_de_obra", "material", "mobiliario"] as const).map(type => {
        const typeItems = items.filter(i => i.type === type)
        const typeQuotes = selectedQuotes.filter(q => q.type === type)
        const isMaterial = type === "material"
        return (
          <div key={type} className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">{TYPE_LABELS[type]}</h4>
              <Btn size="sm" variant="soft" onClick={() => setShowAddItem(type)}>
                <Plus size={12} className="mr-1 inline" />Agregar
              </Btn>
            </div>

            {/* Direct items */}
            {typeItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-2">Descripción</th>
                      <th className="text-right py-2 px-2">Costo</th>
                      {!isMaterial && <th className="text-right py-2 px-2 hidden sm:table-cell">Mult</th>}
                      <th className="text-right py-2 px-2">Precio Cli</th>
                      {!isMaterial && <th className="text-right py-2 px-2 hidden sm:table-cell">Ganancia</th>}
                      <th className="w-16 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeItems.map(item => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0 group">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            {item.paid && <Check size={12} className="text-green-600 shrink-0" />}
                            <span className={`${item.paid ? "line-through text-muted-foreground" : ""} truncate max-w-[200px]`}>{item.description}</span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">{formatCurrency(item.cost)}</td>
                        {!isMaterial && <td className="text-right py-2 px-2 hidden sm:table-cell text-muted-foreground">x{item.multiplier}</td>}
                        <td className="text-right py-2 px-2 font-medium">{formatCurrency(item.client_price)}</td>
                        {!isMaterial && <td className="text-right py-2 px-2 text-green-600 hidden sm:table-cell">{formatCurrency(item.client_price - item.cost)}</td>}
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 sm:opacity-100">
                            <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                            <button onClick={() => deleteRow("project_items", item.id, "projectItems")}
                              className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected quotes for this type */}
            {typeQuotes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Desde Comparador:</p>
                {typeQuotes.map(q => (
                  <div key={q.id} className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Star size={12} className="text-amber-500 shrink-0" />
                      <span className="truncate">{q.item}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({q.provider_name})</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground">{formatCurrency(q.cost)}</span>
                      <span className="font-medium">{formatCurrency(quoteClientPrice(q))}</span>
                      {!isMaterial && <span className="text-green-600 hidden sm:inline">{formatCurrency(quoteGanancia(q))}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {typeItems.length === 0 && typeQuotes.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin ítems</p>
            )}

            {/* Subtotal */}
            {(typeItems.length > 0 || typeQuotes.length > 0) && (
              <div className="flex justify-between pt-3 mt-2 border-t border-border text-sm">
                <span className="font-semibold text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(
                    typeItems.reduce((s, i) => s + i.client_price, 0) +
                    typeQuotes.reduce((s, q) => s + quoteClientPrice(q), 0)
                  )}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Financial Summary */}
      {isFull && (
        <div className="bg-[#F0EDE4] rounded-xl p-4 sm:p-6 space-y-3">
          <h4 className="text-sm font-semibold uppercase text-[#5F5A46]">Resumen Financiero</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <SummaryRow label="Total Costo" value={totalCost} />
            <SummaryRow label="Total Precio Cliente" value={totalClient} bold />
            <SummaryRow label="Total Ganancia" value={totalGanancia} color="green" bold />
            <SummaryRow label={`Ganancia Individual (÷${partnerCount})`} value={gananciaIndiv} color="green" />
            <HR />
            <SummaryRow label={`IVA ${ivaClientePct}% s/Precio`} value={ivaCliente} />
            <SummaryRow label="Precio c/IVA" value={totalClient + ivaCliente} bold />
            <SummaryRow label={`IVA ${ivaGananciaPct}% s/Ganancia (RI)`} value={ivaGanancia} />
            <SummaryRow label="Ganancia Neta (post IVA)" value={totalGanancia - ivaGanancia} color="green" bold />
            <HR />
            <SummaryRow label={`Seña Proveedor (${senaProvPct}%)`} value={senaProveedor} />
            <SummaryRow label={`Seña Cliente (${senaCliPct}%)`} value={senaCliente} />
            <SummaryRow label="Diferencia Seña" value={senaCliente - senaProveedor} color={senaCliente - senaProveedor >= 0 ? "green" : "red"} bold />
            <SummaryRow label={`IVA ${ivaClientePct}% s/Seña Cliente`} value={calcIVACliente(senaCliente, ivaClientePct)} />
            <SummaryRow label="Seña Cliente c/IVA" value={senaCliente + calcIVACliente(senaCliente, ivaClientePct)} bold />
          </div>

          {/* Editable config */}
          <details className="mt-4">
            <summary className="text-xs text-[#76746A] cursor-pointer hover:text-[#5F5A46]">Configuración financiera</summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <MiniInput label="IVA Cliente %" value={ivaClientePct} onChange={v => updateRow("projects", project.id, { iva_cliente_pct: v }, "projects")} />
              <MiniInput label="IVA Ganancia %" value={ivaGananciaPct} onChange={v => updateRow("projects", project.id, { iva_ganancia_pct: v }, "projects")} />
              <MiniInput label="Seña Prov %" value={senaProvPct} onChange={v => updateRow("projects", project.id, { sena_proveedor_pct: v }, "projects")} />
              <MiniInput label="Seña Cli %" value={senaCliPct} onChange={v => updateRow("projects", project.id, { sena_cliente_pct: v }, "projects")} />
              <MiniInput label="Socias" value={partnerCount} onChange={v => updateRow("projects", project.id, { partner_count: v }, "projects")} />
            </div>
          </details>
        </div>
      )}

      {/* Modals */}
      {showAddItem && (
        <AddItemModal type={showAddItem} defaultMultiplier={project.margin || 1.4} providers={data.providers}
          onClose={() => setShowAddItem(null)}
          onSave={async (item) => {
            await addRow("project_items", { ...item, project_id: project.id }, "projectItems")
            setShowAddItem(null)
          }} />
      )}
      {editingItem && (
        <EditItemModal item={editingItem} providers={data.providers}
          onClose={() => setEditingItem(null)}
          onSave={async (updates) => {
            await updateRow("project_items", editingItem.id, updates, "projectItems")
            setEditingItem(null)
          }} />
      )}
    </div>
  )
}

// =================== TAB: COMPARADOR ===================
function ComparadorTab({ project }: { project: Project }) {
  const { data, addRow, updateRow, deleteRow } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const partnerCount = project.partner_count ?? 2

  const quotes = data.quoteComparisons.filter(q => q.project_id === project.id)
  const filtered = quotes.filter(q =>
    !searchQ || q.item.toLowerCase().includes(searchQ.toLowerCase()) ||
    q.category.toLowerCase().includes(searchQ.toLowerCase()) ||
    q.provider_name.toLowerCase().includes(searchQ.toLowerCase())
  )

  // Group by category::item
  const grouped = useMemo(() => {
    const acc: Record<string, QuoteComparison[]> = {}
    for (const q of filtered) {
      const key = `${q.category}::${q.item}`
      if (!acc[key]) acc[key] = []
      acc[key].push(q)
    }
    return acc
  }, [filtered])

  const toggleSelect = async (q: QuoteComparison, multiplier: number) => {
    // Deselect others in same group
    const groupQuotes = quotes.filter(x => x.category === q.category && x.item === q.item)
    for (const gq of groupQuotes) {
      if (gq.id === q.id) {
        const newSelected = !gq.selected
        await updateRow("quote_comparisons", gq.id, {
          selected: newSelected, selected_multiplier: newSelected ? multiplier : null
        }, "quoteComparisons")
      } else if (gq.selected) {
        await updateRow("quote_comparisons", gq.id, { selected: false, selected_multiplier: null }, "quoteComparisons")
      }
    }
  }

  const handleExport = () => {
    exportComparadorXLSX(project.name, quotes.map(q => ({
      category: q.category, item: q.item, type: q.type,
      provider: q.provider_name, cost: q.cost,
      priceX14: q.price_x14, priceX16: q.price_x16,
      gananciaX14: q.ganancia_x14, gananciaX16: q.ganancia_x16,
      selected: q.selected,
    })))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar ítems, categorías, proveedores..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        </div>
        <div className="flex gap-2">
          <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn size="sm" onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Cotización</Btn>
        </div>
      </div>

      {/* Grouped items */}
      {Object.entries(grouped).map(([key, items]) => {
        const [category, item] = key.split("::")
        const isMaterial = items[0]?.type === "material"
        return (
          <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F0EDE4] border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{category}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-sm">{item}</span>
                <Tag label={TYPE_LABELS[items[0]?.type || "mobiliario"]} color={isMaterial ? "blue" : "green"} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF9]">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    {!isMaterial && (
                      <>
                        <th className="px-3 py-2 text-right">P. x1.4</th>
                        <th className="px-3 py-2 text-right">P. x1.6</th>
                        <th className="px-3 py-2 text-right hidden md:table-cell">G. x1.4</th>
                        <th className="px-3 py-2 text-right hidden md:table-cell">G. x1.6</th>
                        <th className="px-3 py-2 text-right hidden lg:table-cell">G.Indiv x1.4</th>
                        <th className="px-3 py-2 text-right hidden lg:table-cell">G.Indiv x1.6</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-center">Elegir</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(q => (
                    <tr key={q.id} className={`border-b last:border-0 ${q.selected ? "bg-green-50" : "hover:bg-[#FAFAF9]"}`}>
                      <td className="px-3 py-2.5">
                        {q.selected && <Check size={14} className="text-green-600" />}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{q.provider_name}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(q.cost)}</td>
                      {!isMaterial && (
                        <>
                          <td className="px-3 py-2.5 text-right">{formatCurrency(q.price_x14)}</td>
                          <td className="px-3 py-2.5 text-right">{formatCurrency(q.price_x16)}</td>
                          <td className="px-3 py-2.5 text-right text-green-600 hidden md:table-cell">{formatCurrency(q.ganancia_x14)}</td>
                          <td className="px-3 py-2.5 text-right text-green-600 hidden md:table-cell">{formatCurrency(q.ganancia_x16)}</td>
                          <td className="px-3 py-2.5 text-right text-green-700 hidden lg:table-cell">{formatCurrency(q.ganancia_x14 / partnerCount)}</td>
                          <td className="px-3 py-2.5 text-right text-green-700 hidden lg:table-cell">{formatCurrency(q.ganancia_x16 / partnerCount)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-center">
                        {isMaterial ? (
                          <button onClick={() => toggleSelect(q, 1)}
                            className={`px-3 py-1 rounded text-xs font-medium ${q.selected ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                            {q.selected ? "✓" : "Elegir"}
                          </button>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => toggleSelect(q, 1.4)}
                              className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.4 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                              x1.4
                            </button>
                            <button onClick={() => toggleSelect(q, 1.6)}
                              className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.6 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                              x1.6
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => deleteRow("quote_comparisons", q.id, "quoteComparisons")}
                          className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Summary */}
      {quotes.filter(q => q.selected).length > 0 && (
        <div className="bg-[#F0EDE4] rounded-xl p-4 text-sm">
          <h4 className="font-semibold mb-2">Seleccionados — Total</h4>
          <div className="flex flex-wrap gap-4">
            <span>Costo: <strong>{formatCurrency(quotes.filter(q => q.selected).reduce((s, q) => s + q.cost, 0))}</strong></span>
            <span>Precio: <strong>{formatCurrency(quotes.filter(q => q.selected).reduce((s, q) => s + quoteClientPrice(q), 0))}</strong></span>
            <span className="text-green-700">Ganancia: <strong>{formatCurrency(quotes.filter(q => q.selected).reduce((s, q) => s + quoteGanancia(q), 0))}</strong></span>
          </div>
        </div>
      )}

      {quotes.length === 0 && <Empty title="Sin cotizaciones" description="Agregá cotizaciones para comparar proveedores" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {showNew && <QuoteModal projectId={project.id} providers={data.providers}
        onClose={() => setShowNew(false)}
        onSave={async (q) => { await addRow("quote_comparisons", q, "quoteComparisons"); setShowNew(false) }} />}
    </div>
  )
}

// =================== TAB: MOVIMIENTOS ===================
function MovimientosTab({ project }: { project: Project }) {
  const { data, addMovement, deleteMovement, updateRow } = useApp()
  const [showAddMovement, setShowAddMovement] = useState(false)
  const [editingMov, setEditingMov] = useState<Movement | null>(null)
  const [movPeriod, setMovPeriod] = useState<PeriodValue>("all")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [searchQ, setSearchQ] = useState("")

  const allMovements = data.movements.filter(m => m.project_id === project.id)
  const dateFiltered = filterByDateRange(allMovements, movPeriod, customStart, customEnd)
  const movements = dateFiltered
    .filter(m => !searchQ || m.description.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleExport = () => {
    exportProjectMovementsXLSX(project.name, movements.map(m => ({
      date: m.date, description: m.description, amount: m.amount,
      type: m.type, category: m.category || undefined,
      provider: data.providers.find(p => p.id === m.provider_id)?.name,
    })))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar movimientos..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodFilter value={movPeriod} onChange={setMovPeriod}
            onCustomRange={(s, e) => { setCustomStart(s); setCustomEnd(e) }} />
          <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn size="sm" onClick={() => setShowAddMovement(true)}><Plus size={14} className="mr-1 inline" />Movimiento</Btn>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {movements.length > 0 ? (
          <div className="divide-y divide-border">
            {movements.map(mov => (
              <div key={mov.id} className="flex items-center justify-between px-4 py-3 group hover:bg-[#FAFAF9]">
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-medium ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}>{mov.description}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatDate(mov.date)}</span>
                  {mov.category && <span className="text-xs text-muted-foreground ml-2">· {mov.category}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-medium text-sm ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                    {mov.type === "ingreso" ? "+" : "-"}{formatCurrency(mov.amount)}
                  </span>
                  <button onClick={() => setEditingMov(mov)}
                    className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 sm:opacity-100"><Pencil size={12} /></button>
                  <button onClick={() => deleteMovement(mov.id)}
                    className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 sm:opacity-100"><Trash2 size={12} className="text-red-600" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty title="Sin movimientos" description={movPeriod !== "all" ? "Probá con otro rango de fechas" : undefined} />}
      </div>

      {/* Totals */}
      {movements.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-green-700">Ingresos: <strong>{formatCurrency(movements.filter(m => m.type === "ingreso").reduce((s, m) => s + m.amount, 0))}</strong></span>
          <span className="text-red-700">Egresos: <strong>{formatCurrency(movements.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0))}</strong></span>
        </div>
      )}

      {showAddMovement && (
        <AddProjectMovementModal project={project} accounts={data.accounts} providers={data.providers}
          onClose={() => setShowAddMovement(false)}
          onSave={async (mov) => { await addMovement(mov); setShowAddMovement(false) }} />
      )}
      {editingMov && (
        <EditMovementModal movement={editingMov} accounts={data.accounts} providers={data.providers}
          onClose={() => setEditingMov(null)}
          onSave={async (updates) => {
            await updateRow("movements", editingMov.id, updates, "movements")
            setEditingMov(null)
          }} />
      )}
    </div>
  )
}

// =================== TAB: ARCHIVOS ===================
function ArchivosTab({ project }: { project: Project }) {
  const { data, addRow, deleteRow, uploadFile } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)

  const files = data.projectFiles.filter(f => f.project_id === project.id)
  const filtered = files.filter(f => {
    if (filterCat && f.category !== filterCat) return false
    if (searchQ && !f.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const categories = [...new Set(files.map(f => f.category))].sort()

  const isImage = (mime?: string | null) => mime?.startsWith("image/")
  const isPDF = (mime?: string | null) => mime === "application/pdf"

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        </div>
        <div className="flex gap-2">
          {categories.length > 0 && (
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <Btn size="sm" onClick={() => setShowUpload(true)}>
            <Upload size={14} className="mr-1 inline" />Subir
          </Btn>
        </div>
      </div>

      {/* Category folders view */}
      {!filterCat && categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-[#F0EDE4] text-sm">
              <FolderOpen size={16} className="text-[#5F5A46]" />
              <span>{cat}</span>
              <span className="text-xs text-muted-foreground">({files.filter(f => f.category === cat).length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Files grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg group">
              {isImage(file.mime_type) && file.url ? (
                <img src={file.url} alt={file.name} className="w-10 h-10 rounded object-cover shrink-0 cursor-pointer"
                  onClick={() => setPreviewFile(file)} />
              ) : (
                <FileText size={20} className="text-[#5F5A46] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.category}
                  {file.file_size && ` · ${(file.file_size / 1024 / 1024).toFixed(1)} MB`}
                  {file.created_at && ` · ${formatDate(file.created_at.split("T")[0])}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {file.url && (
                  <button onClick={() => setPreviewFile(file)} className="p-1 hover:bg-accent rounded"><Eye size={14} /></button>
                )}
                {file.url && (
                  <a href={file.url} target="_blank" rel="noopener" className="p-1 hover:bg-accent rounded"><Download size={14} /></a>
                )}
                <button onClick={() => deleteRow("project_files", file.id, "projectFiles")}
                  className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 sm:opacity-100">
                  <Trash2 size={12} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : <Empty title="Sin archivos" />}

      {/* File Preview Modal */}
      {previewFile && (
        <Modal isOpen={true} title={previewFile.name} onClose={() => setPreviewFile(null)} size="xl">
          {isImage(previewFile.mime_type) && previewFile.url ? (
            <img src={previewFile.url} alt={previewFile.name} className="w-full rounded-lg" />
          ) : isPDF(previewFile.mime_type) && previewFile.url ? (
            <iframe src={previewFile.url} className="w-full h-[60vh] rounded-lg border" />
          ) : (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Vista previa no disponible</p>
              {previewFile.url && (
                <a href={previewFile.url} target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  Abrir en nueva pestaña
                </a>
              )}
            </div>
          )}
        </Modal>
      )}

      {showUpload && (
        <UploadFileModal projectId={project.id} onClose={() => setShowUpload(false)}
          onUpload={async (file, meta) => {
            const result = await uploadFile("documents", `projects/${project.id}/${Date.now()}_${file.name}`, file)
            if (result) {
              await addRow("project_files", {
                id: generateId(), project_id: project.id,
                name: meta.name || file.name, category: meta.category,
                description: meta.description, url: result.url,
                storage_path: result.path, file_size: file.size,
                mime_type: file.type,
              }, "projectFiles")
            }
            setShowUpload(false)
          }} />
      )}
    </div>
  )
}

// =================== HELPER COMPONENTS ===================
function SummaryRow({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  const colorCls = color === "green" ? "text-green-700" : color === "red" ? "text-red-700" : "text-[#1C1A12]"
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#5F5A46]">{label}</span>
      <span className={`${colorCls} ${bold ? "font-bold" : "font-medium"}`}>{formatCurrency(value)}</span>
    </div>
  )
}

function MiniInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-[#76746A]">{label}</label>
      <input type="number" value={value} step="0.5"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 rounded border border-[#E0DDD0] text-sm bg-white" />
    </div>
  )
}

// =================== MODALS ===================
function ProjectFormModal({ project, onClose, onSave }: {
  project?: Project; onClose: () => void; onSave: (p: Project) => void
}) {
  const [name, setName] = useState(project?.name ?? "")
  const [client, setClient] = useState(project?.client ?? "")
  const [address, setAddress] = useState(project?.address ?? "")
  const [type, setType] = useState(project?.type ?? "interiorismo")
  const [status, setStatus] = useState(project?.status ?? "activo")
  const [margin, setMargin] = useState(String(project?.margin ?? "1.4"))
  const [clientEmail, setClientEmail] = useState(project?.client_email ?? "")
  const [clientPhone, setClientPhone] = useState(project?.client_phone ?? "")
  const [partnerCount, setPartnerCount] = useState(String(project?.partner_count ?? "2"))

  return (
    <Modal isOpen={true} title={project ? "Editar Proyecto" : "Nuevo Proyecto"} onClose={onClose} size="lg">
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: project?.id ?? generateId(), name, client, address, type, status,
        margin: parseFloat(margin) || 1.4, client_email: clientEmail || null,
        client_phone: clientPhone || null, partner_count: parseInt(partnerCount) || 2,
        iva_cliente_pct: project?.iva_cliente_pct ?? 21,
        iva_ganancia_pct: project?.iva_ganancia_pct ?? 10.5,
        sena_proveedor_pct: project?.sena_proveedor_pct ?? 60,
        sena_cliente_pct: project?.sena_cliente_pct ?? 50,
        created_at: project?.created_at ?? new Date().toISOString(),
      })}} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Nombre del proyecto" value={name} onChange={setName} />
          <FormInput label="Cliente" value={client} onChange={setClient} />
        </div>
        <FormInput label="Dirección" value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FormSelect label="Tipo" value={type || ""} onChange={setType}
            options={[{ value: "arquitectura", label: "Arquitectura" }, { value: "interiorismo", label: "Interiorismo" }, { value: "ambos", label: "Ambos" }]} />
          <FormSelect label="Estado" value={status || ""} onChange={setStatus}
            options={[{ value: "activo", label: "Activo" }, { value: "pausado", label: "Pausado" }, { value: "finalizado", label: "Finalizado" }]} />
          <FormInput label="Multiplicador" type="number" value={margin} onChange={setMargin} step="0.1" />
          <FormInput label="Socias" type="number" value={partnerCount} onChange={setPartnerCount} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Email cliente" type="email" value={clientEmail} onChange={setClientEmail} />
          <FormInput label="Teléfono cliente" value={clientPhone} onChange={setClientPhone} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!name || !client}>{project ? "Guardar" : "Crear"}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function AddItemModal({ type, defaultMultiplier, providers, onClose, onSave }: {
  type: string; defaultMultiplier: number; providers: { id: string; name: string }[]
  onClose: () => void; onSave: (item: ProjectItem) => void
}) {
  const isMaterial = type === "material"
  const [description, setDescription] = useState("")
  const [cost, setCost] = useState("")
  const [multiplier, setMultiplier] = useState(isMaterial ? "1" : String(defaultMultiplier))
  const [providerId, setProviderId] = useState("")

  const costNum = parseFloat(cost) || 0
  const multNum = isMaterial ? 1 : (parseFloat(multiplier) || defaultMultiplier)
  const clientPrice = costNum * multNum

  return (
    <Modal isOpen={true} title={`Agregar ${TYPE_LABELS[type] || type}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), project_id: "", type: type as any,
        description, cost: costNum, client_price: isMaterial ? costNum : clientPrice,
        multiplier: multNum, provider_id: providerId || null,
        paid: false, sort_order: 0,
      })}} className="space-y-4">
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <FormSelect label="Proveedor (opcional)" value={providerId} onChange={setProviderId}
          options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Costo proveedor" type="number" value={cost} onChange={setCost} inputMode="decimal" />
          {!isMaterial && <FormInput label="Multiplicador" type="number" value={multiplier} onChange={setMultiplier} step="0.1" inputMode="decimal" />}
        </div>
        <div className="bg-[#F0EDE4] rounded-lg p-4">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Precio al cliente:</span>
            <span className="text-lg font-semibold">{formatCurrency(clientPrice)}</span></div>
          {!isMaterial && <p className="text-xs text-muted-foreground mt-1">Ganancia: {formatCurrency(clientPrice - costNum)}</p>}
          {isMaterial && <p className="text-xs text-muted-foreground mt-1">Materiales no generan ganancia</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !cost}>Agregar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function EditItemModal({ item, providers, onClose, onSave }: {
  item: ProjectItem; providers: { id: string; name: string }[]
  onClose: () => void; onSave: (updates: Partial<ProjectItem>) => void
}) {
  const isMaterial = item.type === "material"
  const [description, setDescription] = useState(item.description)
  const [cost, setCost] = useState(String(item.cost))
  const [multiplier, setMultiplier] = useState(String(item.multiplier))
  const [providerId, setProviderId] = useState(item.provider_id ?? "")
  const [paid, setPaid] = useState(item.paid)

  const costNum = parseFloat(cost) || 0
  const multNum = isMaterial ? 1 : (parseFloat(multiplier) || 1.4)
  const clientPrice = costNum * multNum

  return (
    <Modal isOpen={true} title={`Editar ${TYPE_LABELS[item.type]}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        description, cost: costNum,
        client_price: isMaterial ? costNum : clientPrice,
        multiplier: multNum, provider_id: providerId || null, paid,
      })}} className="space-y-4">
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <FormSelect label="Proveedor" value={providerId} onChange={setProviderId}
          options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" />
          {!isMaterial && <FormInput label="Multiplicador" type="number" value={multiplier} onChange={setMultiplier} step="0.1" inputMode="decimal" />}
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="w-4 h-4" />
          <label className="text-sm">Pagado al proveedor</label>
        </div>
        <div className="bg-[#F0EDE4] rounded-lg p-4">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Precio al cliente:</span>
            <span className="text-lg font-semibold">{formatCurrency(clientPrice)}</span></div>
          {!isMaterial && <p className="text-xs text-muted-foreground mt-1">Ganancia: {formatCurrency(clientPrice - costNum)}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !cost}>Guardar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function QuoteModal({ projectId, providers, onClose, onSave }: {
  projectId: string; providers: any[]; onClose: () => void; onSave: (q: QuoteComparison) => void
}) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [category, setCategory] = useState("")
  const [item, setItem] = useState("")
  const [itemType, setItemType] = useState<"mano_de_obra" | "material" | "mobiliario">("mobiliario")
  const [providerName, setProviderName] = useState("")
  const [providerId, setProviderId] = useState("")
  const [cost, setCost] = useState("")

  const costNum = parseFloat(cost) || 0
  const isMaterial = itemType === "material"

  const quoteCats = getCategoriesFor("quote_category")

  return (
    <Modal isOpen={true} title="Nueva Cotización" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), date: today(), project_id: projectId,
        category, item, type: itemType,
        provider_id: providerId || null,
        provider_name: providerName || providers.find(p => p.id === providerId)?.name || "",
        cost: costNum,
        price_x14: costNum * 1.4, price_x16: costNum * 1.6,
        ganancia_x14: costNum * 0.4, ganancia_x16: costNum * 0.6,
        selected: false, selected_multiplier: null,
      })}} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={quoteCats.map(c => ({ value: c.name, label: c.name }))}
            onAddNew={(name) => addCategory("quote_category", name)}
            onDelete={(name) => deleteCategory(name)}
            placeholder="Ej: Carpintería" />
          <FormInput label="Ítem" value={item} onChange={setItem} placeholder="Ej: Mueble de TV" />
        </div>
        <FormSelect label="Tipo de ítem" value={itemType} onChange={v => setItemType(v as any)}
          options={[
            { value: "mobiliario", label: "Mobiliario (con multiplicador)" },
            { value: "mano_de_obra", label: "Mano de Obra (con multiplicador)" },
            { value: "material", label: "Material (sin ganancia)" },
          ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Proveedor" value={providerId} onChange={v => {
            setProviderId(v); setProviderName(providers.find(p => p.id === v)?.name || "")
          }} options={providers.map(p => ({ value: p.id, label: p.name }))} />
          <FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" />
        </div>
        {costNum > 0 && (
          <div className="bg-[#F0EDE4] rounded-lg p-4 text-sm">
            {isMaterial ? (
              <p className="text-muted-foreground">Material — Precio = Costo ({formatCurrency(costNum)}), sin ganancia</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">x1.4:</span> <span className="font-semibold">{formatCurrency(costNum * 1.4)}</span> <span className="text-green-600">(+{formatCurrency(costNum * 0.4)})</span></div>
                <div><span className="text-muted-foreground">x1.6:</span> <span className="font-semibold">{formatCurrency(costNum * 1.6)}</span> <span className="text-green-600">(+{formatCurrency(costNum * 0.6)})</span></div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!item || !cost || !category}>Agregar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function AddProjectMovementModal({ project, accounts, providers, onClose, onSave }: {
  project: Project; accounts: any[]; providers: any[]
  onClose: () => void; onSave: (m: Movement) => void
}) {
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso")
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "")
  const [providerId, setProviderId] = useState("")
  const [autoSplit, setAutoSplit] = useState(true)

  return (
    <Modal isOpen={true} title="Movimiento del Proyecto" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), date, description, amount: parseFloat(amount),
        type, project_id: project.id, account_id: accountId || null,
        provider_id: providerId || null, category: "Proyecto",
        auto_split: type === "ingreso" ? autoSplit : false, split_percentage: 50,
      })}} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso (cobro)" }, { value: "egreso", label: "Egreso (pago)" }]} />
        </div>
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
            options={accounts.map(a => ({ value: a.id, label: a.name }))} />
        </div>
        {type === "egreso" && (
          <FormSelect label="Proveedor (si aplica)" value={providerId} onChange={setProviderId}
            options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        )}
        {type === "ingreso" && (
          <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
            <input type="checkbox" checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-green-800">Distribuir 50/50 a socias</p>
              <p className="text-xs text-green-600">Se calculará automáticamente en Finanzas Personales</p>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount}>Registrar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function EditMovementModal({ movement, accounts, providers, onClose, onSave }: {
  movement: Movement; accounts: any[]; providers: any[]
  onClose: () => void; onSave: (updates: Partial<Movement>) => void
}) {
  const [date, setDate] = useState(movement.date)
  const [description, setDescription] = useState(movement.description)
  const [amount, setAmount] = useState(String(movement.amount))
  const [type, setType] = useState(movement.type)
  const [accountId, setAccountId] = useState(movement.account_id ?? "")
  const [providerId, setProviderId] = useState(movement.provider_id ?? "")

  return (
    <Modal isOpen={true} title="Editar Movimiento" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        date, description, amount: parseFloat(amount) || 0,
        type, account_id: accountId || null, provider_id: providerId || null,
      })}} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
        </div>
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
            options={[{ value: "", label: "Sin cuenta" }, ...accounts.map(a => ({ value: a.id, label: a.name }))]} />
        </div>
        {type === "egreso" && (
          <FormSelect label="Proveedor" value={providerId} onChange={setProviderId}
            options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount}>Guardar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function UploadFileModal({ projectId, onClose, onUpload }: {
  projectId: string; onClose: () => void
  onUpload: (file: File, meta: { name: string; category: string; description: string }) => void
}) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("otro")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fileCats = getCategoriesFor("file_category")
  const defaultCats = [
    { value: "contrato", label: "Contrato" }, { value: "plano", label: "Plano" },
    { value: "presupuesto", label: "Presupuesto" }, { value: "factura", label: "Factura" },
    { value: "foto", label: "Foto" }, { value: "render", label: "Render" }, { value: "otro", label: "Otro" },
  ]
  const allCats = [...defaultCats, ...fileCats.filter(c => !defaultCats.some(d => d.value === c.name)).map(c => ({ value: c.name, label: c.name }))]

  return (
    <Modal isOpen={true} title="Subir Archivo" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (file) onUpload(file, { name: name || file.name, category, description }) }} className="space-y-4">
        <div className="border-2 border-dashed border-[#E0DDD0] rounded-lg p-6 text-center cursor-pointer hover:border-[#5F5A46]"
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); if (!name) setName(f.name) }
          }} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" />
          {file ? <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
            : <p className="text-sm text-muted-foreground">Click para seleccionar archivo</p>}
        </div>
        <FormInput label="Nombre" value={name} onChange={setName} />
        <EditableSelect label="Categoría" value={category} onChange={setCategory}
          options={allCats}
          onAddNew={(name) => addCategory("file_category", name)}
          onDelete={(name) => deleteCategory(name)} />
        <FormInput label="Descripción (opcional)" value={description} onChange={setDescription} />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!file}>Subir</Btn>
        </div>
      </form>
    </Modal>
  )
}
