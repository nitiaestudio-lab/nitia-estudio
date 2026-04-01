"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatDate, generateId, today } from "@/lib/helpers"
import { Tag, Btn, Empty, Modal, FormInput, FormSelect } from "@/components/nitia-ui"
import type { Task } from "@/lib/types"
import { Plus, CheckCircle, Circle, Clock, Download, Info } from "lucide-react"
import { exportTareas } from "@/lib/export-utils"
import { useSelection } from "@/hooks/use-selection"
import { SelectionBar } from "@/components/selection-bar"
import { SearchInput } from "@/components/search-input"
import { TableCheckbox, TableHeaderCheckbox } from "@/components/table-checkbox"
import { InlineEditField } from "@/components/inline-edit-field"

export function Tasks() {
  const { data, addTask, updateTask, deleteTask, deleteTasks } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "pendiente" | "en-curso" | "completada">("all")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter by search, project, and status
  const filteredTasks = data.tasks.filter((t) => {
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProject || t.projectId === selectedProject
    const matchesStatus = filter === "all" || t.status === filter
    return matchesSearch && matchesProject && matchesStatus
  })

  // Hook de selección masiva
  const selection = useSelection({ items: filteredTasks })

  // Group tasks by project for the sidebar
  const tasksByProject = data.projects.map((project) => ({
    project,
    tasks: data.tasks.filter((t) => t.projectId === project.id),
    pendingCount: data.tasks.filter((t) => t.projectId === project.id && t.status !== "completada").length,
  }))

  const editingTask = editingId ? data.tasks.find((t) => t.id === editingId) : null

  const getProjectName = (projectId: string) => {
    return data.projects.find((p) => p.id === projectId)?.name ?? "Sin proyecto"
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completada":
        return <CheckCircle size={16} className="text-[var(--green)]" />
      case "en-curso":
        return <Clock size={16} className="text-blue-600" />
      default:
        return <Circle size={16} className="text-muted-foreground" />
    }
  }

  const toggleStatus = async (task: Task) => {
    const nextStatus: Record<Task["status"], Task["status"]> = {
      pendiente: "en-curso",
      "en-curso": "completada",
      completada: "pendiente",
    }
    await updateTask(task.id, { status: nextStatus[task.status] })
  }

  // Handler para eliminar seleccionados
  const handleDeleteSelected = async () => {
    await deleteTasks(selection.selectedIds)
    selection.clearSelection()
  }

  // Handler para exportar seleccionados
  const handleExportSelected = () => {
    const selectedTasks = selection.selectedItems
    exportTareas(selectedTasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority || "media",
      dueDate: t.dueDate,
      assignee: getProjectName(t.projectId),
    })), "seleccionadas")
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Tareas</h1>
          <p className="text-sm text-[#76746A] mt-1">
            Vista general de todas las tareas. Gestionalas dentro de cada proyecto.
          </p>
        </div>
        <div className="flex gap-2">
          {data.tasks.length > 0 && (
            <Btn variant="ghost" onClick={() => exportTareas(data.tasks.map(t => ({
              title: t.title,
              status: t.status,
              priority: t.priority || "media",
              dueDate: t.dueDate,
              assignee: getProjectName(t.projectId),
            })), "todas")}>
              <Download size={14} className="mr-1.5 inline" />
              Excel
            </Btn>
          )}
          <Btn onClick={() => setShowNew(true)}>
            <Plus size={14} className="mr-1.5 inline" />
            Nueva Tarea
          </Btn>
        </div>
      </div>

      {/* Búsqueda */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por título o asignada a..."
        className="max-w-md"
      />

      {/* Info Note */}
      <div className="bg-[#E0F2FE] border border-[#7DD3FC] rounded-lg p-4 flex items-start gap-3">
        <Info size={18} className="text-[#0284C7] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-[#0369A1]">
            <strong>Tip:</strong> Las tareas ahora se gestionan dentro de cada proyecto. 
            Ve a <strong>Proyectos → [Proyecto] → Tareas</strong> para agregar y gestionar tareas de ese cliente.
          </p>
        </div>
      </div>

      {/* Project Filter */}
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Por Proyecto</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProject(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !selectedProject
                ? "bg-[#5F5A46] text-white"
                : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
            }`}
          >
            Todos ({data.tasks.length})
          </button>
          {tasksByProject.map(({ project, pendingCount }) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedProject === project.id
                  ? "bg-[#5F5A46] text-white"
                  : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
              }`}
            >
              {project.name} {pendingCount > 0 && <span className="ml-1 text-red-600">({pendingCount})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Por Estado</p>
        <div className="flex gap-2">
          {(["all", "pendiente", "en-curso", "completada"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-colors ${
                filter === status
                  ? "bg-[#2A4A6A] text-white"
                  : "bg-card border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {status === "all" ? "Todas" : status === "en-curso" ? "En curso" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List con selección */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10 px-4 py-3">
                <TableHeaderCheckbox
                  isAllSelected={selection.isAllSelected}
                  isSomeSelected={selection.isSomeSelected}
                  onToggleAll={selection.toggleAll}
                />
              </th>
              <th className="w-10 px-4 py-3" />
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Tarea
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Proyecto
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Vencimiento
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Prioridad
              </th>
              <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-4 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className={`border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${
                  selection.isSelected(task.id) ? "bg-[#F7F5ED]" : ""
                }`}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <TableCheckbox
                    checked={selection.isSelected(task.id)}
                    onChange={() => selection.toggleItem(task.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(task)}
                    className="hover:scale-110 transition-transform"
                  >
                    {getStatusIcon(task.status)}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  <InlineEditField
                    value={task.title}
                    onSave={async (value) => {
                      await updateTask(task.id, { title: String(value) })
                    }}
                    fieldName="título"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {getProjectName(task.projectId)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {task.dueDate ? formatDate(task.dueDate) : "Sin fecha"}
                </td>
                <td className="px-4 py-3">
                  <Tag
                    label={task.priority}
                    color={
                      task.priority === "alta"
                        ? "red"
                        : task.priority === "media"
                        ? "amber"
                        : "gray"
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Tag
                    label={task.status === "en-curso" ? "En curso" : task.status}
                    color={
                      task.status === "completada"
                        ? "green"
                        : task.status === "en-curso"
                        ? "blue"
                        : "gray"
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <Empty
            title="No hay tareas"
            description={filter !== "all" || searchQuery ? "Cambia el filtro o búsqueda" : "Crea tu primera tarea"}
            action={filter === "all" && !searchQuery && <Btn onClick={() => setShowNew(true)}>Crear Tarea</Btn>}
          />
        )}
      </div>

      {/* Barra de selección masiva */}
      <SelectionBar
        selectedCount={selection.selectedCount}
        onDelete={handleDeleteSelected}
        onExport={handleExportSelected}
        onClear={selection.clearSelection}
        itemName="tarea"
      />

      {/* New Task Modal */}
      {showNew && (
        <TaskModal
          projects={data.projects}
          onClose={() => setShowNew(false)}
          onSave={async (task) => {
            await addTask(task)
            setShowNew(false)
          }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          projects={data.projects}
          onClose={() => setEditingId(null)}
          onSave={async (task) => {
            await updateTask(task.id, task)
            setEditingId(null)
          }}
          onDelete={async () => {
            await deleteTask(editingTask.id)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

// Task Modal
function TaskModal({
  task,
  projects,
  onClose,
  onSave,
  onDelete,
}: {
  task?: Task
  projects: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (task: Task) => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? "")
  const [dueDate, setDueDate] = useState(task?.dueDate ?? today())
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "media")
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "pendiente")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Task = {
      id: task?.id ?? generateId(),
      title,
      projectId,
      dueDate,
      priority,
      status,
      assignee: task?.assignee ?? "",
    }
    onSave(data)
  }

  return (
    <Modal isOpen={true} title={task ? "Editar Tarea" : "Nueva Tarea"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Titulo" value={title} onChange={setTitle} />
        <FormSelect
          label="Proyecto"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha limite" type="date" value={dueDate} onChange={setDueDate} />
          <FormSelect
            label="Prioridad"
            value={priority}
            onChange={(v) => setPriority(v as Task["priority"])}
            options={[
              { value: "alta", label: "Alta" },
              { value: "media", label: "Media" },
              { value: "baja", label: "Baja" },
            ]}
          />
        </div>
        {task && (
          <FormSelect
            label="Estado"
            value={status}
            onChange={(v) => setStatus(v as Task["status"])}
            options={[
              { value: "pendiente", label: "Pendiente" },
              { value: "en-curso", label: "En curso" },
              { value: "completada", label: "Completada" },
            ]}
          />
        )}
        <div className="flex justify-between pt-4">
          <div>
            {onDelete && (
              <Btn variant="danger" onClick={onDelete}>
                Eliminar
              </Btn>
            )}
          </div>
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn type="submit" disabled={!title || !projectId}>
              {task ? "Guardar" : "Crear"}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}
