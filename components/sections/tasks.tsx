"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatDate, generateId, today } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect } from "@/components/nitia-ui"
import type { Task } from "@/lib/types"
import { Plus, Trash2, Pencil, Search, FileSpreadsheet, ChevronDown, ChevronUp, Calendar, ExternalLink } from "lucide-react"

export function Tasks() {
  const { data, addRow, updateRow, deleteRow, setSection, setSelectedProjectId } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState("active")
  const [filterProject, setFilterProject] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterAssigned, setFilterAssigned] = useState("")
  const [searchQ, setSearchQ] = useState("")
  const [editingInline, setEditingInline] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"priority" | "date" | "status">("priority")

  const allTasks = data.tasks
  const assignees = [...new Set(allTasks.map(t => t.assigned_to || t.assignee).filter(Boolean))] as string[]

  const tasks = useMemo(() => {
    let list = allTasks
      .filter(t => {
        if (filterStatus === "active") return t.status !== "completada"
        if (filterStatus === "all") return true
        return t.status === filterStatus
      })
      .filter(t => !filterProject || t.project_id === filterProject)
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !filterAssigned || (t.assigned_to || t.assignee) === filterAssigned)
      .filter(t => !searchQ || t.title.toLowerCase().includes(searchQ.toLowerCase()))

    list.sort((a, b) => {
      if (sortBy === "priority") {
        const p: Record<string, number> = { alta: 0, media: 1, baja: 2 }
        return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
      }
      if (sortBy === "date") {
        return new Date(a.due_date || "2099-12-31").getTime() - new Date(b.due_date || "2099-12-31").getTime()
      }
      const s: Record<string, number> = { pendiente: 0, "en-curso": 1, "en_progreso": 1, completada: 2 }
      return (s[a.status] ?? 0) - (s[b.status] ?? 0)
    })
    return list
  }, [allTasks, filterStatus, filterProject, filterPriority, filterAssigned, searchQ, sortBy])

  const prioColor = (p: string) => p === "alta" ? "red" : p === "media" ? "yellow" : "gray"
  const statusColor = (s: string) => s === "completada" ? "green" : s === "en-curso" || s === "en_progreso" ? "blue" : "amber"
  const statusLabel = (s: string) => s === "en-curso" || s === "en_progreso" ? "En curso" : s === "completada" ? "Completada" : "Pendiente"

  const pendingCount = allTasks.filter(t => t.status === "pendiente").length
  const inProgressCount = allTasks.filter(t => t.status === "en-curso" || t.status === "en_progreso").length
  const completedCount = allTasks.filter(t => t.status === "completada").length

  const handleExport = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const sheet = tasks.map(t => ({
        Tarea: t.title, Proyecto: data.projects.find(p => p.id === t.project_id)?.name || "",
        "Fecha límite": t.due_date || "", Prioridad: t.priority, Estado: statusLabel(t.status),
        Asignado: t.assigned_to || t.assignee || "",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Tareas")
      XLSX.writeFile(wb, `tareas_${today()}.xlsx`)
    } catch {}
  }

  const cycleStatus = async (task: Task) => {
    const next: Record<string, string> = { pendiente: "en-curso", "en-curso": "completada", "en_progreso": "completada", completada: "pendiente" }
    await updateRow("task_items", task.id, { status: next[task.status] || "pendiente" }, "tasks")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Tareas</h1>
          <p className="text-sm text-[#76746A] mt-1">Gestión de tareas por proyecto</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn onClick={() => { setEditingTask(null); setShowNew(true) }}><Plus size={14} className="mr-1 inline" />Nueva Tarea</Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm">
        <button onClick={() => setFilterStatus("pendiente")} className={`px-3 py-1.5 rounded-lg ${filterStatus === "pendiente" ? "bg-amber-100 text-amber-800" : "bg-[#F0EDE4] text-[#76746A]"}`}>
          Pendientes ({pendingCount})
        </button>
        <button onClick={() => setFilterStatus("en-curso")} className={`px-3 py-1.5 rounded-lg ${filterStatus === "en-curso" ? "bg-blue-100 text-blue-800" : "bg-[#F0EDE4] text-[#76746A]"}`}>
          En curso ({inProgressCount})
        </button>
        <button onClick={() => setFilterStatus("completada")} className={`px-3 py-1.5 rounded-lg ${filterStatus === "completada" ? "bg-green-100 text-green-800" : "bg-[#F0EDE4] text-[#76746A]"}`}>
          Completadas ({completedCount})
        </button>
        <button onClick={() => setFilterStatus("active")} className={`px-3 py-1.5 rounded-lg ${filterStatus === "active" ? "bg-[#5F5A46] text-white" : "bg-[#F0EDE4] text-[#76746A]"}`}>
          Activas
        </button>
        <button onClick={() => setFilterStatus("all")} className={`px-3 py-1.5 rounded-lg ${filterStatus === "all" ? "bg-[#5F5A46] text-white" : "bg-[#F0EDE4] text-[#76746A]"}`}>
          Todas
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar tareas..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        </div>
        <FormSelect value={filterProject} onChange={setFilterProject}
          options={[{ value: "", label: "Todos los proyectos" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
        <FormSelect value={filterPriority} onChange={setFilterPriority}
          options={[{ value: "", label: "Todas las prioridades" }, { value: "alta", label: "Alta" }, { value: "media", label: "Media" }, { value: "baja", label: "Baja" }]} />
        {assignees.length > 0 && <FormSelect value={filterAssigned} onChange={setFilterAssigned}
          options={[{ value: "", label: "Todos" }, ...assignees.map(a => ({ value: a, label: a }))]} />}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white">
          <option value="priority">Ordenar: Prioridad</option>
          <option value="date">Ordenar: Fecha</option>
          <option value="status">Ordenar: Estado</option>
        </select>
      </div>

      {/* Tasks Cards (mobile-friendly) */}
      <div className="space-y-2">
        {tasks.map(task => {
          const projName = data.projects.find(p => p.id === task.project_id)?.name
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completada"
          return (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4 group hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                {/* Status toggle */}
                <button onClick={() => cycleStatus(task)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    task.status === "completada" ? "bg-green-600 border-green-600 text-white" :
                    task.status === "en-curso" || task.status === "en_progreso" ? "border-blue-400 bg-blue-50" : "border-[#E0DDD0]"
                  }`}>
                  {task.status === "completada" && <span className="text-xs">✓</span>}
                  {(task.status === "en-curso" || task.status === "en_progreso") && <span className="text-xs text-blue-600">●</span>}
                </button>

                <div className="flex-1 min-w-0">
                  {editingInline === task.id ? (
                    <InlineEdit task={task} onSave={async (u) => { await updateRow("task_items", task.id, u, "tasks"); setEditingInline(null) }}
                      onCancel={() => setEditingInline(null)} projects={data.projects} />
                  ) : (
                    <>
                      <p className={`text-sm font-medium ${task.status === "completada" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {projName && (
                          <button onClick={() => { setSelectedProjectId(task.project_id!); setSection("projects") }}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            {projName}<ExternalLink size={8} />
                          </button>
                        )}
                        {task.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            <Calendar size={10} />{formatDate(task.due_date)}{isOverdue && " ⚠"}
                          </span>
                        )}
                        <Tag label={task.priority} color={prioColor(task.priority)} />
                        <Tag label={statusLabel(task.status)} color={statusColor(task.status)} />
                        {(task.assigned_to || task.assignee) && <span className="text-xs text-muted-foreground">→ {task.assigned_to || task.assignee}</span>}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100">
                  <button onClick={() => setEditingInline(editingInline === task.id ? null : task.id)}
                    className="p-1.5 hover:bg-accent rounded"><Pencil size={14} className="text-muted-foreground" /></button>
                  <button onClick={() => { setEditingTask(task); setShowNew(true) }}
                    className="p-1.5 hover:bg-accent rounded"><ChevronDown size={14} className="text-muted-foreground" /></button>
                  <button onClick={() => deleteRow("task_items", task.id, "tasks")}
                    className="p-1.5 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-600" /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {tasks.length === 0 && <Empty title="Sin tareas" description={filterStatus !== "all" ? "Probá con otro filtro" : undefined}
        action={<Btn onClick={() => setShowNew(true)}>Crear tarea</Btn>} />}

      {showNew && <TaskModal task={editingTask} projects={data.projects}
        onClose={() => { setShowNew(false); setEditingTask(null) }}
        onSave={async (task) => {
          if (editingTask) await updateRow("task_items", task.id, task, "tasks")
          else await addRow("task_items", task, "tasks")
          setShowNew(false); setEditingTask(null)
        }} />}
    </div>
  )
}

// =================== INLINE EDIT ===================
function InlineEdit({ task, onSave, onCancel, projects }: {
  task: Task; onSave: (u: Partial<Task>) => void; onCancel: () => void; projects: any[]
}) {
  const [title, setTitle] = useState(task.title)
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? "")
  const [status, setStatus] = useState(task.status)

  return (
    <div className="space-y-2">
      <input value={title} onChange={e => setTitle(e.target.value)}
        className="w-full px-2 py-1 rounded border border-[#E0DDD0] text-sm" autoFocus />
      <div className="flex flex-wrap gap-2">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="px-2 py-1 rounded border border-[#E0DDD0] text-xs" />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="px-2 py-1 rounded border border-[#E0DDD0] text-xs">
          <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-2 py-1 rounded border border-[#E0DDD0] text-xs">
          <option value="pendiente">Pendiente</option><option value="en-curso">En curso</option><option value="completada">Completada</option>
        </select>
        <Btn size="sm" onClick={() => onSave({ title, priority, due_date: dueDate || null, status })}>Guardar</Btn>
        <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  )
}

// =================== TASK MODAL ===================
function TaskModal({ task, projects, onClose, onSave }: {
  task: Task | null; projects: { id: string; name: string }[]; onClose: () => void; onSave: (t: Task) => void
}) {
  const [title, setTitle] = useState(task?.title ?? ""); const [projectId, setProjectId] = useState(task?.project_id ?? "")
  const [dueDate, setDueDate] = useState(task?.due_date ?? today()); const [priority, setPriority] = useState(task?.priority ?? "media")
  const [status, setStatus] = useState(task?.status ?? "pendiente"); const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  return (
    <Modal isOpen={true} title={task ? "Editar Tarea" : "Nueva Tarea"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: task?.id ?? generateId(), title, description: description || null, project_id: projectId || null,
        due_date: dueDate, priority, status, assigned_to: assignedTo || null, assignee: assignedTo || undefined,
      })}} className="space-y-4">
        <FormInput label="Título" value={title} onChange={setTitle} />
        <FormInput label="Descripción (opcional)" value={description} onChange={setDescription} />
        <FormSelect label="Proyecto" value={projectId || ""} onChange={setProjectId}
          options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FormInput label="Fecha límite" type="date" value={dueDate} onChange={setDueDate} />
          <FormSelect label="Prioridad" value={priority} onChange={setPriority}
            options={[{ value: "alta", label: "Alta" }, { value: "media", label: "Media" }, { value: "baja", label: "Baja" }]} />
          <FormSelect label="Estado" value={status} onChange={setStatus}
            options={[{ value: "pendiente", label: "Pendiente" }, { value: "en-curso", label: "En curso" }, { value: "completada", label: "Completada" }]} />
        </div>
        <FormInput label="Asignado a" value={assignedTo} onChange={setAssignedTo} placeholder="Nombre" />
        <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!title}>{task ? "Guardar" : "Crear"}</Btn></div>
      </form>
    </Modal>
  )
}
