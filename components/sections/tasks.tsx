"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatDate, generateId, today } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect } from "@/components/nitia-ui"
import type { Task } from "@/lib/types"
import { Plus, Trash2, Pencil } from "lucide-react"

export function Tasks() {
  const { data, addRow, updateRow, deleteRow, deleteRows } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterProject, setFilterProject] = useState("all")

  const tasks = data.tasks
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => filterProject === "all" || t.project_id === filterProject)
    .sort((a, b) => {
      const prio = { alta: 0, media: 1, baja: 2 }
      return (prio[a.priority as keyof typeof prio] ?? 1) - (prio[b.priority as keyof typeof prio] ?? 1)
    })

  const getProjectName = (id?: string | null) =>
    data.projects.find(p => p.id === id)?.name ?? "Sin proyecto"

  const prioColor = (p: string) => p === "alta" ? "red" : p === "media" ? "yellow" : "gray"
  const statusColor = (s: string) => s === "completada" ? "green" : s === "en-curso" ? "blue" : "gray"

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Tareas</h1>
          <p className="text-sm text-[#76746A] mt-1">Gesti{"ó"}n de tareas por proyecto</p>
        </div>
        <Btn onClick={() => { setEditingTask(null); setShowNew(true) }}>
          <Plus size={14} className="mr-1 inline" />Nueva Tarea
        </Btn>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FormSelect value={filterStatus} onChange={setFilterStatus}
          options={[{ value: "all", label: "Todos los estados" }, { value: "pendiente", label: "Pendiente" },
            { value: "en-curso", label: "En curso" }, { value: "completada", label: "Completada" }]} />
        <FormSelect value={filterProject} onChange={setFilterProject}
          options={[{ value: "all", label: "Todos los proyectos" },
            ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
      </div>

      {/* Tasks Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0EDE4] border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tarea</th>
                <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                <th className="px-4 py-3 text-left font-medium">Fecha l{"í"}mite</th>
                <th className="px-4 py-3 text-left font-medium">Prioridad</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getProjectName(task.project_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.due_date ? formatDate(task.due_date) : "—"}</td>
                  <td className="px-4 py-3"><Tag label={task.priority} color={prioColor(task.priority)} /></td>
                  <td className="px-4 py-3">
                    <select value={task.status} onChange={e => updateRow("task_items", task.id, { status: e.target.value }, "tasks")}
                      className="text-xs px-2 py-1 rounded border border-[#E0DDD0]">
                      <option value="pendiente">Pendiente</option>
                      <option value="en-curso">En curso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingTask(task); setShowNew(true) }}
                        className="p-1.5 hover:bg-accent rounded"><Pencil size={14} className="text-muted-foreground" /></button>
                      <button onClick={() => deleteRow("task_items", task.id, "tasks")}
                        className="p-1.5 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tasks.length === 0 && <Empty title="Sin tareas" action={<Btn onClick={() => setShowNew(true)}>Crear tarea</Btn>} />}
      </div>

      {showNew && (
        <TaskModal
          task={editingTask}
          projects={data.projects}
          onClose={() => { setShowNew(false); setEditingTask(null) }}
          onSave={async (task) => {
            if (editingTask) await updateRow("task_items", task.id, task, "tasks")
            else await addRow("task_items", task, "tasks")
            setShowNew(false); setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}

function TaskModal({ task, projects, onClose, onSave }: {
  task: Task | null; projects: { id: string; name: string }[]
  onClose: () => void; onSave: (t: Task) => void
}) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [projectId, setProjectId] = useState(task?.project_id ?? "")
  const [dueDate, setDueDate] = useState(task?.due_date ?? today())
  const [priority, setPriority] = useState(task?.priority ?? "media")
  const [status, setStatus] = useState(task?.status ?? "pendiente")

  return (
    <Modal isOpen={true} title={task ? "Editar Tarea" : "Nueva Tarea"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: task?.id ?? generateId(), title, project_id: projectId || null,
        due_date: dueDate, priority, status, assignee: task?.assignee ?? "",
      })}} className="space-y-4">
        <FormInput label="Título" value={title} onChange={setTitle} />
        <FormSelect label="Proyecto" value={projectId || ""} onChange={setProjectId}
          options={projects.map(p => ({ value: p.id, label: p.name }))} />
        <div className="grid grid-cols-3 gap-4">
          <FormInput label="Fecha límite" type="date" value={dueDate} onChange={setDueDate} />
          <FormSelect label="Prioridad" value={priority} onChange={setPriority}
            options={[{ value: "alta", label: "Alta" }, { value: "media", label: "Media" }, { value: "baja", label: "Baja" }]} />
          <FormSelect label="Estado" value={status} onChange={setStatus}
            options={[{ value: "pendiente", label: "Pendiente" }, { value: "en-curso", label: "En curso" }, { value: "completada", label: "Completada" }]} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!title}>{task ? "Guardar" : "Crear"}</Btn>
        </div>
      </form>
    </Modal>
  )
}
