"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { canSee } from "@/lib/seed-data"
import {
  formatCurrency,
  formatDate,
  totalClientPrice,
  totalCost,
  totalIncome,
  totalExpenses,
  generateId,
  today,
} from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea, Stat, HR, ExportButton, PeriodFilter, type PeriodValue, getDateRangeForPeriod, ConfirmDeleteModal } from "@/components/nitia-ui"
import type { Project, Movement, Provider, QuoteComparison, Task } from "@/lib/types"
import { Plus, ArrowLeft, FileText, Upload, Trash2, Pencil, Download, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { exportProjectMovements, exportProjectDesglose, exportCotizaciones, exportTareas, exportProyectos } from "@/lib/export-utils"

export function Projects() {
  const { role, data, selectedProjectId, setSelectedProjectId, addProject, updateProject } = useApp()
  const isFull = canSee(role)

  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewMovement, setShowNewMovement] = useState(false)

  const selectedProject = selectedProjectId
    ? data.projects.find((p) => p.id === selectedProjectId)
    : null

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProjectId(null)}
        onAddMovement={() => setShowNewMovement(true)}
        isFull={isFull}
        showNewMovement={showNewMovement}
        setShowNewMovement={setShowNewMovement}
        updateProject={updateProject}
        providers={data.providers}
      />
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
<div>
  <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proyectos</h1>
  <p className="text-sm text-[#76746A] mt-1">
  Gestion de proyectos de arquitectura e interiorismo
  </p>
  </div>
  <div className="flex gap-2">
    {isFull && (
      <ExportButton 
        onClick={() => exportProyectos(data.projects.map(p => ({
          name: p.name,
          client: p.client,
          type: p.type,
          status: p.status,
          startDate: p.startDate,
          budget: p.budget,
        })))}
        disabled={data.projects.length === 0}
      />
    )}
    <Btn onClick={() => setShowNewProject(true)}>
      <Plus size={14} className="mr-1.5 inline" />
      Nuevo Proyecto
    </Btn>
  </div>
      </div>

      {/* Projects List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Proyecto
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Cliente
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Tipo
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Estado
              </th>
              {isFull && (
                <>
                  <th className="hidden md:table-cell text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                    Presupuesto
                  </th>
                  <th className="hidden md:table-cell text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                    Cobrado
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {project.name}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {project.client}
                </td>
                <td className="px-4 py-3">
                  <Tag
                    label={project.type}
                    color={project.type === "arquitectura" ? "blue" : "olive"}
                  />
                </td>
                <td className="px-4 py-3">
                  <Tag
                    label={project.status}
                    color={
                      project.status === "activo"
                        ? "green"
                        : project.status === "pausado"
                        ? "amber"
                        : "gray"
                    }
                  />
                </td>
                {isFull && (
                  <>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-right text-foreground">
                      {formatCurrency(totalClientPrice(project))}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-right text-muted-foreground">
                      {formatCurrency(totalIncome(project))}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.projects.length === 0 && (
          <Empty
            title="No hay proyectos"
            description="Crea tu primer proyecto para comenzar"
            action={
              <Btn onClick={() => setShowNewProject(true)}>Crear Proyecto</Btn>
            }
          />
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSave={(project) => {
            addProject(project)
            setShowNewProject(false)
          }}
        />
      )}
    </div>
  )
}

// Project Detail Component
function ProjectDetail({
  project,
  onBack,
  onAddMovement,
  isFull,
  showNewMovement,
  setShowNewMovement,
  updateProject,
  providers,
}: {
  project: Project
  onBack: () => void
  onAddMovement: () => void
  isFull: boolean
  showNewMovement: boolean
  setShowNewMovement: (show: boolean) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  providers: Provider[]
}) {
  const [showAddFile, setShowAddFile] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [editingMovement, setEditingMovement] = useState<string | null>(null)
  const [showAddManoDeObra, setShowAddManoDeObra] = useState(false)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [showAddMobiliario, setShowAddMobiliario] = useState(false)
  const [showAddCotizacion, setShowAddCotizacion] = useState(false)
  const [showAddTarea, setShowAddTarea] = useState(false)

  const { data, addQuoteComparison, toggleQuoteSelection, addTask, updateTask, deleteTask } = useApp()
  
  // Cotizaciones de este proyecto
  const projectQuotes = data.quoteComparisons.filter((q) => q.projectId === project.id)
  
  // Tareas de este proyecto
  const projectTasks = data.tasks.filter((t) => t.projectId === project.id)
  
  const presupuesto = totalClientPrice(project)
  const costos = totalCost(project)
  const cobrado = totalIncome(project)
  const pagado = totalExpenses(project)
  const ganancia = presupuesto - costos
  const balance = cobrado - pagado

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[#76746A] hover:text-[#1C1A12] mb-2"
          >
            <ArrowLeft size={16} />
            Volver a proyectos
          </button>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">{project.name}</h1>
          <p className="text-sm text-[#76746A] mt-1">
            {project.client} - {project.address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tag
            label={project.type}
            color={project.type === "arquitectura" ? "blue" : "olive"}
          />
          <Tag
            label={project.status}
            color={
              project.status === "activo"
                ? "green"
                : project.status === "pausado"
                ? "amber"
                : "gray"
            }
          />
          <Btn variant="soft" size="sm" onClick={() => setEditingProject(true)}>
            <Pencil size={12} className="mr-1 inline" />
            Editar
          </Btn>
        </div>
      </div>

      {/* Stats */}
      {isFull && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Presupuesto Cliente" value={formatCurrency(presupuesto)} />
          <Stat label="Costo Total" value={formatCurrency(costos)} />
          <Stat
            label="Ganancia Estimada"
            value={formatCurrency(ganancia)}
            sub={`${((ganancia / presupuesto) * 100 || 0).toFixed(0)}% margen`}
            highlight
          />
          <Stat
            label="Balance"
            value={formatCurrency(balance)}
            sub={`${formatCurrency(cobrado)} cobrado`}
          />
        </div>
      )}

      {/* Datos del Cliente */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead n="0" title="Datos del Cliente" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">Cliente</p>
            <p className="text-sm text-foreground">{project.client}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">Contacto</p>
            <p className="text-sm text-foreground">{project.clientContact || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">Direccion</p>
            <p className="text-sm text-foreground">{project.address}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">Email</p>
            {project.clientEmail ? (
              <a href={`mailto:${project.clientEmail}`} className="text-sm text-[#5F5A46] hover:underline">
                {project.clientEmail}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-1">Telefono</p>
            {project.clientPhone ? (
              <a href={`tel:${project.clientPhone}`} className="text-sm text-[#5F5A46] hover:underline">
                {project.clientPhone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* INGRESOS DEL ESTUDIO - Honorarios + Mano de obra */}
        <div className="bg-[#E6F2E0] border border-[#B8D4A8] rounded-xl p-6">
          <SecHead 
            n="1" 
            title="Ingresos del Estudio" 
            right={
              <Btn variant="ghost" size="sm" onClick={() => exportProjectDesglose(project)}>
                <Download size={12} className="mr-1 inline" />
                Excel
              </Btn>
            }
          />
          <p className="text-xs text-[#295E29] mb-4">Honorarios y mano de obra generan ganancia</p>

          {/* Honorarios */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-2 bg-white/60 rounded-lg px-3">
              <span className="text-sm font-medium text-foreground">Honorarios</span>
              {isFull ? (
                <span className="text-sm font-semibold text-[#295E29]">
                  {formatCurrency(project.honorarios.clientPrice)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>

          <HR />

          {/* Mano de obra */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide uppercase text-[#295E29]">
                Mano de Obra
              </p>
              {isFull && (
                <button
                  onClick={() => setShowAddManoDeObra(true)}
                  className="text-xs text-[#295E29] hover:text-[#1C1A12] flex items-center gap-1"
                >
                  <Plus size={12} /> Agregar
                </button>
              )}
            </div>
            {project.manoDeObra.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 group bg-white/40 rounded px-2 mb-1">
                <span className="text-sm text-foreground">{item.description}</span>
                <div className="flex items-center gap-2">
                  {isFull && (
                    <span className="text-sm font-medium text-[#295E29]">
                      {formatCurrency(item.clientPrice)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const updated = project.manoDeObra.filter(i => i.id !== item.id)
                      updateProject(project.id, { manoDeObra: updated })
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {project.manoDeObra.length === 0 && (
              <p className="text-sm text-[#76746A]">Sin items de mano de obra</p>
            )}
          </div>

          {/* Total Ingresos */}
          {isFull && (
            <div className="mt-4 pt-4 border-t border-[#B8D4A8]">
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#295E29]">Total Ingresos Estudio</span>
                <span className="text-lg font-bold text-[#295E29]">
                  {formatCurrency(
                    project.honorarios.clientPrice +
                    project.manoDeObra.reduce((sum, i) => sum + i.clientPrice, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MATERIALES Y MOBILIARIO - Informativos, sin ganancia */}
        <div className="bg-[#F7F5ED] border border-[#E0DDD0] rounded-xl p-6">
          <SecHead n="2" title="Materiales y Mobiliario" />
          <p className="text-xs text-[#76746A] mb-4">Solo seguimiento, no generan ganancia para el estudio</p>

          {/* Materiales */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Materiales
              </p>
              {isFull && (
                <button
                  onClick={() => setShowAddMaterial(true)}
                  className="text-xs text-[#5F5A46] hover:text-[#1C1A12] flex items-center gap-1"
                >
                  <Plus size={12} /> Agregar
                </button>
              )}
            </div>
            {project.materiales.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 group">
                <span className="text-sm text-foreground">{item.description}</span>
                <div className="flex items-center gap-2">
                  {isFull && (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.clientPrice)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const updated = project.materiales.filter(i => i.id !== item.id)
                      updateProject(project.id, { materiales: updated })
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {project.materiales.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin materiales</p>
            )}
          </div>

          <HR />

          {/* Mobiliario */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Mobiliario
              </p>
              {isFull && (
                <button
                  onClick={() => setShowAddMobiliario(true)}
                  className="text-xs text-[#5F5A46] hover:text-[#1C1A12] flex items-center gap-1"
                >
                  <Plus size={12} /> Agregar
                </button>
              )}
            </div>
            {project.mobiliario.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 group">
                <span className="text-sm text-foreground">{item.description}</span>
                <div className="flex items-center gap-2">
                  {isFull && (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(item.clientPrice)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const updated = project.mobiliario.filter(i => i.id !== item.id)
                      updateProject(project.id, { mobiliario: updated })
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {project.mobiliario.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin mobiliario</p>
            )}
          </div>

          {/* Total Materiales/Mobiliario */}
          {isFull && (
            <div className="mt-4 pt-4 border-t border-[#E0DDD0]">
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#76746A]">Total Materiales + Mobiliario</span>
                <span className="text-lg font-medium text-[#76746A]">
                  {formatCurrency(
                    project.materiales.reduce((sum, i) => sum + i.clientPrice, 0) +
                    project.mobiliario.reduce((sum, i) => sum + i.clientPrice, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Movements with multi-select and historical filter */}
        <MovementsSection 
          project={project}
          onAddMovement={onAddMovement}
          updateProject={updateProject}
          isFull={isFull}
        />
      </div>

      {/* Files */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead 
          n="4" 
          title="Archivos Adjuntos" 
          right={
            <Btn variant="soft" size="sm" onClick={() => setShowAddFile(true)}>
              <Upload size={12} className="mr-1 inline" />
              Adjuntar
            </Btn>
          }
        />
        <div className="space-y-3">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="flex items-start justify-between p-4 bg-[#FAFAF9] border border-border rounded-lg"
            >
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-[#5F5A46] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag label={file.category} color="olive" />
                    <span className="text-xs text-muted-foreground">{formatDate(file.date)}</span>
                  </div>
                  {file.description && (
                    <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  const updatedFiles = project.files.filter(f => f.id !== file.id)
                  updateProject(project.id, { files: updatedFiles })
                }}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {project.files.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin archivos adjuntos</p>
          )}
        </div>
      </div>

      {/* Cotizaciones del Proyecto */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead 
          n="5" 
          title="Cotizaciones" 
          right={
            <div className="flex gap-2">
              {projectQuotes.length > 0 && (
                <Btn variant="ghost" size="sm" onClick={() => exportCotizaciones(projectQuotes, project.name)}>
                  <Download size={12} className="mr-1 inline" />
                  Excel
                </Btn>
              )}
              <Btn variant="soft" size="sm" onClick={() => setShowAddCotizacion(true)}>
                <Plus size={12} className="mr-1 inline" />
                Nueva
              </Btn>
            </div>
          }
        />
        {projectQuotes.length > 0 ? (
          <div className="space-y-3">
            {/* Agrupar por item */}
            {Object.entries(
              projectQuotes.reduce((acc, q) => {
                const key = `${q.category}|${q.item}`
                if (!acc[key]) acc[key] = []
                acc[key].push(q)
                return acc
              }, {} as Record<string, typeof projectQuotes>)
            ).map(([key, quotes]) => {
              const [category, item] = key.split("|")
              const selectedQuote = quotes.find((q) => q.selected)
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-[#F0EDE4] px-4 py-3 flex items-center justify-between">
                    <div>
                      <Tag label={category} color="olive" />
                      <span className="ml-2 font-medium text-sm">{item}</span>
                    </div>
                    <span className="text-xs text-[#76746A]">{quotes.length} opciones</span>
                  </div>
                  <div className="divide-y divide-border">
                    {quotes.sort((a, b) => a.cost - b.cost).map((q, idx) => (
                      <div 
                        key={q.id} 
                        className={`px-4 py-3 flex items-center justify-between ${q.selected ? "bg-[#E6F2E0]" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {idx === 0 && <Tag label="Mejor precio" color="green" />}
                          <span className="text-sm">{q.providerName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(q.cost)}</p>
                            <p className="text-xs text-[#76746A]">x1.4: {formatCurrency(q.priceX14)}</p>
                          </div>
                          <button
                            onClick={() => toggleQuoteSelection(q.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              q.selected
                                ? "bg-[#295E29] text-white"
                                : "bg-[#F0EDE4] text-[#5F5A46] hover:bg-[#E0DDD0]"
                            }`}
                          >
                            {q.selected ? "Seleccionada" : "Seleccionar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Sin cotizaciones para este proyecto</p>
        )}
      </div>

      {/* Tareas del Proyecto */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead 
          n="6" 
          title="Tareas" 
          right={
            <div className="flex gap-2">
              {projectTasks.length > 0 && (
                <Btn variant="ghost" size="sm" onClick={() => exportTareas(projectTasks, project.name)}>
                  <Download size={12} className="mr-1 inline" />
                  Excel
                </Btn>
              )}
              <Btn variant="soft" size="sm" onClick={() => setShowAddTarea(true)}>
                <Plus size={12} className="mr-1 inline" />
                Nueva
              </Btn>
            </div>
          }
        />
        {projectTasks.length > 0 ? (
          <div className="space-y-2">
            {projectTasks.map((task) => (
              <div 
                key={task.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  task.status === "completada" 
                    ? "bg-[#E6F2E0]/50 border-[#B8D4A8]" 
                    : task.status === "en-curso"
                    ? "bg-[#FEF3C7]/50 border-[#FCD34D]"
                    : "bg-white border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {task.status === "completada" ? (
                    <CheckCircle size={18} className="text-[#295E29]" />
                  ) : task.status === "en-curso" ? (
                    <Clock size={18} className="text-[#D97706]" />
                  ) : (
                    <AlertCircle size={18} className="text-[#76746A]" />
                  )}
                  <div>
                    <p className={`text-sm ${task.status === "completada" ? "line-through text-[#76746A]" : ""}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag 
                        label={task.priority} 
                        color={task.priority === "alta" ? "red" : task.priority === "media" ? "amber" : "gray"} 
                      />
                      <span className="text-xs text-[#76746A]">{task.assignee}</span>
                      {task.dueDate && (
                        <span className="text-xs text-[#76746A]">Vence: {formatDate(task.dueDate)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateTask(task.id, { status: e.target.value as "pendiente" | "en-curso" | "completada" })}
                    className="text-xs bg-transparent border border-border rounded px-2 py-1"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en-curso">En curso</option>
                    <option value="completada">Completada</option>
                  </select>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Sin tareas para este proyecto</p>
        )}
      </div>

      {/* New Movement Modal */}
      {showNewMovement && (
        <NewMovementModal
          onClose={() => setShowNewMovement(false)}
          onSave={(movement) => {
            updateProject(project.id, {
              movements: [...project.movements, movement],
            })
            setShowNewMovement(false)
          }}
          providers={providers}
        />
      )}

      {/* Add File Modal */}
      {showAddFile && (
        <AddFileModal
          projectId={project.id}
          onClose={() => setShowAddFile(false)}
          onSave={(file) => {
            updateProject(project.id, {
              files: [...project.files, file],
            })
            setShowAddFile(false)
          }}
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSave={(updates) => {
            updateProject(project.id, updates)
            setEditingProject(false)
          }}
        />
      )}

      {/* Add Mano de Obra Modal */}
      {showAddManoDeObra && (
        <AddDesgloseItemModal
          title="Agregar Mano de Obra"
          onClose={() => setShowAddManoDeObra(false)}
          onSave={(item) => {
            updateProject(project.id, {
              manoDeObra: [...project.manoDeObra, item],
            })
            setShowAddManoDeObra(false)
          }}
          margin={project.margin}
        />
      )}

      {/* Add Material Modal */}
      {showAddMaterial && (
        <AddDesgloseItemModal
          title="Agregar Material"
          onClose={() => setShowAddMaterial(false)}
          onSave={(item) => {
            updateProject(project.id, {
              materiales: [...project.materiales, item],
            })
            setShowAddMaterial(false)
          }}
          margin={project.margin}
        />
      )}

      {/* Add Mobiliario Modal */}
      {showAddMobiliario && (
        <AddDesgloseItemModal
          title="Agregar Mobiliario"
          onClose={() => setShowAddMobiliario(false)}
          onSave={(item) => {
            updateProject(project.id, {
              mobiliario: [...project.mobiliario, item],
            })
            setShowAddMobiliario(false)
          }}
          margin={project.margin}
        />
      )}

      {/* Add Cotizacion Modal */}
      {showAddCotizacion && (
        <AddProjectQuoteModal
          projectId={project.id}
          providers={providers}
          onClose={() => setShowAddCotizacion(false)}
          onSave={(quote) => {
            addQuoteComparison(quote)
            setShowAddCotizacion(false)
          }}
        />
      )}

      {/* Add Tarea Modal */}
      {showAddTarea && (
        <AddProjectTaskModal
          projectId={project.id}
          onClose={() => setShowAddTarea(false)}
          onSave={(task) => {
            addTask(task)
            setShowAddTarea(false)
          }}
        />
      )}
    </div>
  )
}

// New Project Modal
function NewProjectModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (project: Project) => void
}) {
  const [name, setName] = useState("")
  const [client, setClient] = useState("")
  const [address, setAddress] = useState("")
  const [type, setType] = useState<"arquitectura" | "interiorismo">("arquitectura")
  const [margin, setMargin] = useState("1.4")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const project: Project = {
      id: generateId(),
      name,
      client,
      address,
      type,
      status: "activo",
      createdAt: today(),
      margin: parseFloat(margin),
      honorarios: { cost: 0, clientPrice: 0 },
      manoDeObra: [],
      materiales: [],
      mobiliario: [],
      movements: [],
      files: [],
      quotes: [],
    }
    onSave(project)
  }

  return (
    <Modal title="Nuevo Proyecto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Nombre del proyecto" value={name} onChange={setName} />
        <FormInput label="Cliente" value={client} onChange={setClient} />
        <FormInput label="Direccion" value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Tipo"
            value={type}
            onChange={(v) => setType(v as "arquitectura" | "interiorismo")}
            options={[
              { value: "arquitectura", label: "Arquitectura" },
              { value: "interiorismo", label: "Interiorismo" },
            ]}
          />
          <FormInput
            label="Multiplicador de ganancia"
            type="number"
            value={margin}
            onChange={setMargin}
            placeholder="Ej: 1.4 = 40% de ganancia"
            inputMode="decimal"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!name || !client}>
            Crear Proyecto
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// Movements Section with multi-select and historical filter
function MovementsSection({
  project,
  onAddMovement,
  updateProject,
  isFull,
}: {
  project: Project
  onAddMovement: () => void
  updateProject: (p: Project) => void
  isFull: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [period, setPeriod] = useState<PeriodValue>("all")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Filter movements by period
  const { start, end } = getDateRangeForPeriod(period)
  const filteredMovements = project.movements.filter((mov) => {
    if (period === "all") return true
    const movDate = new Date(mov.date)
    return movDate >= start && movDate <= end
  })
  
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }
  
  const selectAll = () => {
    setSelectedIds(new Set(filteredMovements.map((m) => m.id)))
  }
  
  const clearSelection = () => {
    setSelectedIds(new Set())
  }
  
  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const newMovements = project.movements.filter((m) => !selectedIds.has(m.id))
      updateProject({ ...project, movements: newMovements })
      clearSelection()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error("Error deleting movements:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <SecHead
        n="3"
        title="Movimientos"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            {filteredMovements.length > 0 && (
              <Btn variant="ghost" size="sm" onClick={() => exportProjectMovements(filteredMovements, project.name)}>
                <Download size={12} className="mr-1 inline" />
                Excel
              </Btn>
            )}
            <Btn variant="soft" size="sm" onClick={onAddMovement}>
              <Plus size={12} className="mr-1 inline" />
              Agregar
            </Btn>
          </div>
        }
      />
      
      {filteredMovements.length > 0 && isFull && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[#76746A]">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredMovements.length && filteredMovements.length > 0}
            onChange={() => selectedIds.size === filteredMovements.length ? clearSelection() : selectAll()}
            className="w-4 h-4 rounded border-[#E0DDD0] text-[#5F5A46] focus:ring-[#5F5A46]/30 cursor-pointer"
          />
          <span>
            {selectedIds.size > 0 
              ? `${selectedIds.size} de ${filteredMovements.length} seleccionados`
              : "Seleccionar todo"
            }
          </span>
        </div>
      )}
      
      <div className="space-y-2">
        {filteredMovements.map((mov) => {
          const conceptoLabel = mov.conceptoIngreso === "mano-de-obra" ? "Mano de obra" 
            : mov.conceptoIngreso === "senal-mobiliario" ? "Señal mobiliario"
            : mov.conceptoIngreso === "honorarios" ? "Honorarios"
            : mov.conceptoIngreso === "otro" ? "Otro"
            : null
          
          const cuentaLabel = mov.cuentaDestino === "paula" ? "Cta. Paula"
            : mov.cuentaDestino === "cami" ? "Cta. Cami"
            : mov.cuentaDestino === "efectivo" ? "Efectivo"
            : mov.cuentaDestino === "dolares" ? "Dólares"
            : null

          const isSelected = selectedIds.has(mov.id)

          return (
            <div
              key={mov.id}
              className={`flex items-center gap-3 py-3 px-3 rounded-lg border transition-all ${
                isSelected 
                  ? "border-[#5F5A46] bg-[#5F5A46]/5" 
                  : mov.type === "ingreso" 
                    ? "bg-[#E6F2E0]/30 border-transparent" 
                    : "bg-[#FEE2E2]/30 border-transparent"
              }`}
            >
              {isFull && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(mov.id)}
                  className="w-4 h-4 rounded border-[#E0DDD0] text-[#5F5A46] focus:ring-[#5F5A46]/30 cursor-pointer flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{mov.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatDate(mov.date)}</span>
                  <Tag label={mov.category} color={mov.type === "ingreso" ? "green" : "red"} />
                  {mov.type === "ingreso" && conceptoLabel && (
                    <Tag label={conceptoLabel} color="blue" />
                  )}
                  {mov.type === "ingreso" && cuentaLabel && (
                    <span className="text-xs bg-[#F0EDE4] px-2 py-0.5 rounded text-[#5F5A46]">
                      {cuentaLabel}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-sm font-semibold flex-shrink-0 ${
                  mov.type === "ingreso" ? "text-[#295E29]" : "text-[#8B2323]"
                }`}
              >
                {mov.type === "ingreso" ? "+" : "-"}
                {formatCurrency(mov.amount)}
              </span>
            </div>
          )
        })}
        {filteredMovements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {period === "all" ? "Sin movimientos" : "Sin movimientos en este período"}
          </p>
        )}
      </div>
      
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1A12] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}</span>
          <div className="w-px h-4 bg-white/30" />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm font-medium text-[#FCA5A5] hover:text-[#F87171] transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
          <button
            onClick={clearSelection}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
      
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title="Eliminar movimientos"
          message="¿Estás seguro de que deseas eliminar los movimientos seleccionados? Esta acción no se puede deshacer."
          itemCount={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}

// New Movement Modal
function NewMovementModal({
  onClose,
  onSave,
  providers,
}: {
  onClose: () => void
  onSave: (movement: Movement) => void
  providers: Provider[]
}) {
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso")
  const [category, setCategory] = useState("Honorarios")
  const [providerId, setProviderId] = useState("")
  const [medioPago, setMedioPago] = useState<"efectivo" | "transferencia" | "cheque" | "tarjeta" | "dolares">("transferencia")
  // Nuevos campos para ingresos
  const [conceptoIngreso, setConceptoIngreso] = useState<"mano-de-obra" | "senal-mobiliario" | "honorarios" | "otro">("honorarios")
  const [cuentaDestino, setCuentaDestino] = useState<"paula" | "cami" | "efectivo" | "dolares">("paula")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const movement: Movement = {
      id: generateId(),
      date,
      description,
      amount: parseFloat(amount),
      type,
      category,
      providerId: providerId || null,
      medioPago,
      // Solo agregar estos campos si es ingreso
      ...(type === "ingreso" && {
        conceptoIngreso,
        cuentaDestino,
      }),
    }
    onSave(movement)
  }

  return (
    <Modal title="Nuevo Movimiento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect
            label="Tipo"
            value={type}
            onChange={(v) => setType(v as "ingreso" | "egreso")}
            options={[
              { value: "ingreso", label: "Ingreso" },
              { value: "egreso", label: "Egreso" },
            ]}
          />
        </div>
        <FormInput label="Descripcion" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Importe"
            type="number"
            value={amount}
            onChange={setAmount}
          />
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={[
              { value: "Honorarios", label: "Honorarios" },
              { value: "Mano de obra", label: "Mano de obra" },
              { value: "Materiales", label: "Materiales" },
              { value: "Mobiliario", label: "Mobiliario" },
              { value: "Varios", label: "Varios" },
            ]}
          />
        </div>
        <FormSelect
          label="Medio de Pago"
          value={medioPago}
          onChange={(v) => setMedioPago(v as typeof medioPago)}
          options={[
            { value: "transferencia", label: "Transferencia" },
            { value: "efectivo", label: "Efectivo" },
            { value: "cheque", label: "Cheque" },
            { value: "tarjeta", label: "Tarjeta" },
            { value: "dolares", label: "Dolares" },
          ]}
        />
        {type === "egreso" && (
          <FormSelect
            label="Proveedor (opcional)"
            value={providerId}
            onChange={setProviderId}
            options={[
              { value: "", label: "Sin proveedor" },
              ...providers.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}

        {/* Campos adicionales para ingresos */}
        {type === "ingreso" && (
          <div className="space-y-4 p-4 bg-[#E6F2E0] rounded-lg border border-[#B8D4A8]">
            <p className="text-xs font-semibold text-[#295E29] uppercase tracking-wide">Detalles del Cobro</p>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Concepto del cobro"
                value={conceptoIngreso}
                onChange={(v) => setConceptoIngreso(v as typeof conceptoIngreso)}
                options={[
                  { value: "honorarios", label: "Honorarios" },
                  { value: "mano-de-obra", label: "Mano de obra" },
                  { value: "senal-mobiliario", label: "Senal mobiliario" },
                  { value: "otro", label: "Otro" },
                ]}
              />
              <FormSelect
                label="Cuenta destino"
                value={cuentaDestino}
                onChange={(v) => setCuentaDestino(v as typeof cuentaDestino)}
                options={[
                  { value: "paula", label: "Cuenta Paula" },
                  { value: "cami", label: "Cuenta Cami" },
                  { value: "efectivo", label: "Efectivo" },
                  { value: "dolares", label: "Dolares" },
                ]}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!description || !amount}>
            Agregar Movimiento
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// File Upload Modal with real upload to Supabase Storage
function AddFileModal({
  onClose,
  onSave,
  projectId,
}: {
  onClose: () => void
  onSave: (file: import("@/lib/types").ProjectFile) => void
  projectId: string
}) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<"contrato" | "plano" | "presupuesto" | "render" | "foto" | "otro">("presupuesto")
  const [folder, setFolder] = useState("")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (PDF, images, common docs)
      const validTypes = [
        "application/pdf", 
        "image/jpeg", 
        "image/png", 
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ]
      if (!validTypes.includes(file.type)) {
        setUploadError("Solo se permiten archivos PDF, imágenes (JPG, PNG, WEBP) o documentos (DOC, DOCX, XLS, XLSX)")
        return
      }
      // Validate size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        setUploadError("El archivo no puede exceder 25MB")
        return
      }
      setSelectedFile(file)
      setUploadError("")
      // Auto-fill name if empty
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !selectedFile) {
      setUploadError("Selecciona un archivo y ponle un nombre")
      return
    }
    
    setIsUploading(true)
    setUploadError("")
    setUploadProgress(10)
    
    try {
      // Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("projectId", projectId)
      formData.append("category", category)
      formData.append("folder", folder)
      
      setUploadProgress(30)
      
      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      })
      
      setUploadProgress(70)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al subir archivo")
      }
      
      const result = await response.json()
      setUploadProgress(100)
      
      onSave({
        id: generateId(),
        name,
        category,
        date,
        url: result.url,
        description: description || undefined,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error al subir archivo")
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <Modal title="Adjuntar Archivo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#76746A] mb-2">
            Archivo
          </label>
          <div className="border-2 border-dashed border-[#E0DDD0] rounded-xl p-6 text-center hover:border-[#5F5A46] transition-colors cursor-pointer"
               onClick={() => document.getElementById('file-input')?.click()}>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-[#5F5A46]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1C1A12]">{selectedFile.name}</p>
                  <p className="text-xs text-[#76746A]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-[#76746A] mb-2" />
                <p className="text-sm text-[#76746A]">Haz clic o arrastra un archivo aquí</p>
                <p className="text-xs text-[#B5B2A2] mt-1">PDF, imágenes o documentos (máx 25MB)</p>
              </>
            )}
          </div>
        </div>
        
        <FormInput
          label="Nombre del archivo"
          value={name}
          onChange={setName}
          placeholder="Ej: Plano planta baja v2"
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Categoría"
            value={category}
            onChange={(v) => setCategory(v as typeof category)}
            options={[
              { value: "contrato", label: "Contrato" },
              { value: "plano", label: "Plano" },
              { value: "presupuesto", label: "Presupuesto" },
              { value: "render", label: "Render" },
              { value: "foto", label: "Foto" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <FormInput 
            label="Carpeta (opcional)" 
            value={folder} 
            onChange={setFolder}
            placeholder="Ej: Etapa 1"
          />
        </div>
        
        <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        
        <FormTextarea
          label="Descripción (opcional)"
          value={description}
          onChange={setDescription}
          placeholder="Detalle del archivo..."
        />
        
        {uploadError && (
          <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
            <p className="text-sm text-[#8B2323]">{uploadError}</p>
          </div>
        )}
        
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#76746A]">
              <span>Subiendo archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#E0DDD0] rounded-full h-2">
              <div 
                className="bg-[#5F5A46] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!name || !selectedFile || isUploading}>
            {isUploading ? "Subiendo..." : "Guardar Archivo"}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// Edit Project Modal
function EditProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project
  onClose: () => void
  onSave: (updates: Partial<Project>) => void
}) {
  const [name, setName] = useState(project.name)
  const [client, setClient] = useState(project.client)
  const [clientEmail, setClientEmail] = useState(project.clientEmail || "")
  const [clientPhone, setClientPhone] = useState(project.clientPhone || "")
  const [clientContact, setClientContact] = useState(project.clientContact || "")
  const [address, setAddress] = useState(project.address)
  const [type, setType] = useState(project.type)
  const [status, setStatus] = useState(project.status)
  const [margin, setMargin] = useState(String(project.margin))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      client,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      clientContact: clientContact || undefined,
      address,
      type,
      status,
      margin: parseFloat(margin),
    })
  }

  return (
    <Modal title="Editar Proyecto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Nombre del proyecto" value={name} onChange={setName} />
        
        {/* Datos del Cliente */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Datos del Cliente
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Nombre del cliente" value={client} onChange={setClient} />
              <FormInput label="Persona de contacto" value={clientContact} onChange={setClientContact} placeholder="Ej: Juan Perez" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Email" type="email" value={clientEmail} onChange={setClientEmail} placeholder="cliente@email.com" />
              <FormInput label="Telefono" value={clientPhone} onChange={setClientPhone} placeholder="011-1234-5678" />
            </div>
            <FormInput label="Direccion" value={address} onChange={setAddress} />
          </div>
        </div>

        {/* Configuracion del Proyecto */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Configuracion del Proyecto
          </p>
          <div className="grid grid-cols-3 gap-4">
            <FormSelect
              label="Tipo"
              value={type}
              onChange={(v) => setType(v as "arquitectura" | "interiorismo")}
              options={[
                { value: "arquitectura", label: "Arquitectura" },
                { value: "interiorismo", label: "Interiorismo" },
              ]}
            />
            <FormSelect
              label="Estado"
              value={status}
              onChange={(v) => setStatus(v as "activo" | "pausado" | "finalizado")}
              options={[
                { value: "activo", label: "Activo" },
                { value: "pausado", label: "Pausado" },
                { value: "finalizado", label: "Finalizado" },
              ]}
            />
            <FormInput
              label="Multiplicador de ganancia"
              type="number"
              value={margin}
              onChange={setMargin}
              placeholder="Ej: 1.4 = 40% de ganancia"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!name || !client}>
            Guardar Cambios
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// Add Desglose Item Modal (for Mano de Obra, Materiales, Mobiliario)
function AddDesgloseItemModal({
  title,
  onClose,
  onSave,
  margin,
}: {
  title: string
  onClose: () => void
  onSave: (item: { id: string; description: string; cost: number; clientPrice: number; providerId?: string }) => void
  margin: number
}) {
  const { data } = useApp()
  const [description, setDescription] = useState("")
  const [cost, setCost] = useState("")
  const [providerId, setProviderId] = useState("")
  const [customMargin, setCustomMargin] = useState(String(margin))

  const costNum = parseFloat(cost) || 0
  const marginNum = parseFloat(customMargin) || margin
  const clientPrice = costNum * marginNum

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !cost) return
    onSave({
      id: generateId(),
      description,
      cost: costNum,
      clientPrice,
      providerId: providerId || undefined,
    })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Descripcion"
          value={description}
          onChange={setDescription}
          placeholder="Ej: Pintura interior living"
          required
        />
        <FormSelect
          label="Proveedor (opcional)"
          value={providerId}
          onChange={setProviderId}
          options={[
            { value: "", label: "Sin proveedor" },
            ...data.providers.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Costo proveedor"
            type="number"
            value={cost}
            onChange={setCost}
            placeholder="0"
            required
            inputMode="decimal"
          />
          <FormInput
            label="Multiplicador"
            type="number"
            value={customMargin}
            onChange={setCustomMargin}
            placeholder="1.4"
            inputMode="decimal"
          />
        </div>
        <div className="bg-[#F0EDE4] rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#76746A]">Precio al cliente:</span>
            <span className="text-lg font-semibold text-[#1C1A12]">
              {formatCurrency(clientPrice)}
            </span>
          </div>
          <p className="text-xs text-[#76746A] mt-1">
            Ganancia: {formatCurrency(clientPrice - costNum)}
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!description || !cost}>
            Agregar Item
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// Add Project Quote Modal
const QUOTE_CATEGORIES = ["Mobiliario", "Materiales", "Mano de obra", "Equipamiento", "Decoracion", "Iluminacion", "Textiles", "Otro"]

function AddProjectQuoteModal({
  projectId,
  providers,
  onClose,
  onSave,
}: {
  projectId: string
  providers: Provider[]
  onClose: () => void
  onSave: (quote: QuoteComparison) => void
}) {
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState(QUOTE_CATEGORIES[0])
  const [item, setItem] = useState("")
  const [providerId, setProviderId] = useState("")
  const [providerName, setProviderName] = useState("")
  const [cost, setCost] = useState("")

  const handleProviderChange = (value: string) => {
    setProviderId(value)
    const provider = providers.find((p) => p.id === value)
    setProviderName(provider?.name || "")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !cost) return
    const costNum = parseFloat(cost)
    onSave({
      id: generateId(),
      date,
      projectId,
      category,
      item,
      providerId,
      providerName: providerName || "Proveedor manual",
      cost: costNum,
      priceX14: costNum * 1.4,
      priceX16: costNum * 1.6,
      gananciaX14: costNum * 0.4,
      gananciaX16: costNum * 0.6,
      selected: false,
    })
  }

  return (
    <Modal title="Nueva Cotizacion" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={QUOTE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>
        <FormInput
          label="Item / Descripcion"
          value={item}
          onChange={setItem}
          placeholder="Ej: Mueble TV roble 180cm"
          required
        />
        <FormSelect
          label="Proveedor"
          value={providerId}
          onChange={handleProviderChange}
          options={[
            { value: "", label: "Seleccionar proveedor..." },
            ...providers.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        {!providerId && (
          <FormInput
            label="O ingrese nombre manualmente"
            value={providerName}
            onChange={setProviderName}
            placeholder="Nombre del proveedor"
          />
        )}
        <FormInput
          label="Costo proveedor"
          type="number"
          value={cost}
          onChange={setCost}
          placeholder="0"
          required
        />
        {cost && (
          <div className="bg-[#F0EDE4] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#76746A]">Precio x1.4:</span>
              <span className="font-medium">{formatCurrency(parseFloat(cost) * 1.4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#76746A]">Precio x1.6:</span>
              <span className="font-medium">{formatCurrency(parseFloat(cost) * 1.6)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!item || !cost || (!providerId && !providerName)}>
            Agregar Cotizacion
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

// Add Project Task Modal
function AddProjectTaskModal({
  projectId,
  onClose,
  onSave,
}: {
  projectId: string
  onClose: () => void
  onSave: (task: Task) => void
}) {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<"baja" | "media" | "alta">("media")
  const [dueDate, setDueDate] = useState("")
  const [assignee, setAssignee] = useState("Paula")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    onSave({
      id: generateId(),
      projectId,
      title,
      status: "pendiente",
      priority,
      dueDate: dueDate || undefined,
      assignee,
    })
  }

  return (
    <Modal title="Nueva Tarea" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Titulo de la tarea"
          value={title}
          onChange={setTitle}
          placeholder="Ej: Confirmar medidas con cliente"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Prioridad"
            value={priority}
            onChange={(v) => setPriority(v as typeof priority)}
            options={[
              { value: "baja", label: "Baja" },
              { value: "media", label: "Media" },
              { value: "alta", label: "Alta" },
            ]}
          />
          <FormSelect
            label="Asignar a"
            value={assignee}
            onChange={setAssignee}
            options={[
              { value: "Paula", label: "Paula" },
              { value: "Cami", label: "Cami" },
              { value: "Empleada", label: "Empleada" },
            ]}
          />
        </div>
        <FormInput
          label="Fecha de vencimiento (opcional)"
          type="date"
          value={dueDate}
          onChange={setDueDate}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!title}>
            Crear Tarea
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
