"use client"

import { useState, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today, projectTotalClientPrice, projectTotalCost, projectIncome, projectExpenses, filterByDateRange } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea, Stat, HR, PeriodFilter, type PeriodValue, ConfirmDeleteModal, EditableSelect } from "@/components/nitia-ui"
import { canSee } from "@/lib/seed-data"
import type { Project, ProjectItem, ProjectFile, Movement } from "@/lib/types"
import { Plus, ArrowLeft, Trash2, Pencil, Download, Upload, FileText, Check } from "lucide-react"

export function Projects() {
  const { role, data, addRow, updateRow, deleteRow, selectedProjectId, setSelectedProjectId } = useApp()
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
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proyectos</h1>
          <p className="text-sm text-[#76746A] mt-1">Gesti{"\u00f3"}n de proyectos del estudio</p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Proyecto</Btn>
      </div>

      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        placeholder="Buscar proyectos..." className="max-w-md w-full px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Proyectos Activos" value={data.projects.filter(p => p.status === "activo").length} />
        <Stat label="Total Presupuestado" value={formatCurrency(data.projects.reduce((s, p) => s + projectTotalClientPrice(p, data.projectItems), 0))} highlight />
        <Stat label="Total Cobrado" value={formatCurrency(data.movements.filter(m => m.project_id && m.type === "ingreso").reduce((s, m) => s + m.amount, 0))} />
        <Stat label="Pausados" value={data.projects.filter(p => p.status === "pausado").length} />
      </div>

      {/* Project Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const totalClient = projectTotalClientPrice(project, data.projectItems)
          const income = projectIncome(data.movements, project.id)
          return (
            <div key={project.id} onClick={() => setSelectedProjectId(project.id)}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">{project.name}</h3>
                <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : project.status === "pausado" ? "yellow" : "gray"} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{project.client}</p>
              {isFull && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Presupuesto: {formatCurrency(totalClient)}</span>
                  <span className="text-green-600">Cobrado: {formatCurrency(income)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {projects.length === 0 && <Empty title="Sin proyectos" description="Cre\u00e1 tu primer proyecto" action={<Btn onClick={() => setShowNew(true)}>Crear</Btn>} />}

      {showNew && <ProjectFormModal onClose={() => setShowNew(false)} onSave={async (p) => {
        await addRow("projects", p, "projects"); setShowNew(false)
      }} />}
    </div>
  )
}

// =================== PROJECT DETAIL ===================
function ProjectDetail({ project, onBack, isFull }: { project: Project; onBack: () => void; isFull: boolean }) {
  const { data, updateRow, addRow, deleteRow, addMovement, deleteMovement, uploadFile } = useApp()
  const [showAddItem, setShowAddItem] = useState<"mano_de_obra" | "material" | "mobiliario" | null>(null)
  const [showAddMovement, setShowAddMovement] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [movPeriod, setMovPeriod] = useState<PeriodValue>("all")

  const items = data.projectItems.filter(i => i.project_id === project.id)
  const manoDeObra = items.filter(i => i.type === "mano_de_obra")
  const materiales = items.filter(i => i.type === "material")
  const mobiliario = items.filter(i => i.type === "mobiliario")
  const files = data.projectFiles.filter(f => f.project_id === project.id)
  const movements = filterByDateRange(
    data.movements.filter(m => m.project_id === project.id), movPeriod
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalClient = projectTotalClientPrice(project, data.projectItems)
  const totalCost = projectTotalCost(project, data.projectItems)
  const ganancia = totalClient - totalCost
  const income = projectIncome(data.movements, project.id)
  const expenses = projectExpenses(data.movements, project.id)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-light text-[#1C1A12]">{project.name}</h1>
            <Tag label={project.status || "activo"} color={project.status === "activo" ? "green" : "yellow"} />
          </div>
          <p className="text-sm text-[#76746A]">{project.client} {project.address && `\u2014 ${project.address}`}</p>
        </div>
        <Btn variant="soft" onClick={() => setShowEdit(true)}><Pencil size={14} className="mr-1 inline" />Editar</Btn>
      </div>

      {/* Stats */}
      {isFull && (
        <div className="grid md:grid-cols-4 gap-4">
          <Stat label="Presupuesto Cliente" value={formatCurrency(totalClient)} />
          <Stat label="Ganancia Estimada" value={formatCurrency(ganancia)} sub={`${totalClient > 0 ? ((ganancia / totalClient) * 100).toFixed(0) : 0}% margen`} highlight />
          <Stat label="Cobrado" value={formatCurrency(income)} sub={formatCurrency(totalClient - income) + " pendiente"} />
          <Stat label="Pagado a proveedores" value={formatCurrency(expenses)} />
        </div>
      )}

      {/* Desglose */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Desglose del Proyecto" />

        {/* Honorarios */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">Honorarios</h4>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Costo</label>
              <input type="number" value={project.honorarios_cost || 0}
                onChange={e => updateRow("projects", project.id, { honorarios_cost: parseFloat(e.target.value) || 0 }, "projects")}
                className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Precio cliente</label>
              <input type="number" value={project.honorarios_client_price || 0}
                onChange={e => updateRow("projects", project.id, { honorarios_client_price: parseFloat(e.target.value) || 0 }, "projects")}
                className="w-full px-3 py-1.5 rounded border border-[#E0DDD0] text-sm" />
            </div>
          </div>
        </div>

        <HR />

        {/* Items sections */}
        {(["mano_de_obra", "material", "mobiliario"] as const).map(type => {
          const typeItems = items.filter(i => i.type === type)
          const labels = { mano_de_obra: "Mano de Obra", material: "Materiales", mobiliario: "Mobiliario" }
          return (
            <div key={type} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">{labels[type]}</h4>
                <Btn size="sm" variant="soft" onClick={() => setShowAddItem(type)}>
                  <Plus size={12} className="mr-1 inline" />Agregar
                </Btn>
              </div>
              {typeItems.length > 0 ? (
                <div className="space-y-1">
                  {typeItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1.5 group text-sm">
                      <div className="flex items-center gap-2">
                        {item.paid && <Check size={12} className="text-green-600" />}
                        <span className={item.paid ? "line-through text-muted-foreground" : ""}>{item.description}</span>
                        <span className="text-xs text-muted-foreground">x{item.multiplier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{formatCurrency(item.cost)}</span>
                        <span className="font-medium">{formatCurrency(item.client_price)}</span>
                        <button onClick={() => deleteRow("project_items", item.id, "projectItems")}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded">
                          <Trash2 size={12} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-border text-sm">
                    <span className="font-semibold text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(typeItems.reduce((s, i) => s + i.client_price, 0))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin items</p>
              )}
              <HR />
            </div>
          )
        })}
      </div>

      {/* Movements */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Movimientos" right={
          <div className="flex items-center gap-2">
            <PeriodFilter value={movPeriod} onChange={setMovPeriod} />
            <Btn size="sm" onClick={() => setShowAddMovement(true)}><Plus size={12} className="mr-1 inline" />Movimiento</Btn>
          </div>
        } />
        {movements.length > 0 ? (
          <div className="space-y-2">
            {movements.map(mov => (
              <div key={mov.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 group text-sm">
                <div>
                  <span className={mov.type === "ingreso" ? "text-green-700" : "text-red-700"}>{mov.description}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatDate(mov.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${mov.type === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                    {mov.type === "ingreso" ? "+" : "-"}{formatCurrency(mov.amount)}
                  </span>
                  <button onClick={() => deleteMovement(mov.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded">
                    <Trash2 size={12} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty title="Sin movimientos" />}
      </div>

      {/* Files */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Archivos" right={
          <Btn size="sm" variant="soft" onClick={() => setShowUpload(true)}>
            <Upload size={12} className="mr-1 inline" />Subir archivo
          </Btn>
        } />
        {files.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-[#F7F5ED] rounded-lg group">
                <FileText size={20} className="text-[#5F5A46]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.category} {file.created_at && `\u2022 ${formatDate(file.created_at.split("T")[0])}`}</p>
                </div>
                {file.url && <a href={file.url} target="_blank" rel="noopener" className="p-1 hover:bg-accent rounded"><Download size={14} /></a>}
                <button onClick={() => deleteRow("project_files", file.id, "projectFiles")}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
              </div>
            ))}
          </div>
        ) : <Empty title="Sin archivos" />}
      </div>

      {/* Modals */}
      {showAddItem && (
        <AddItemModal
          type={showAddItem}
          defaultMultiplier={project.margin || 1.4}
          providers={data.providers}
          onClose={() => setShowAddItem(null)}
          onSave={async (item) => {
            await addRow("project_items", { ...item, project_id: project.id }, "projectItems")
            setShowAddItem(null)
          }}
        />
      )}

      {showAddMovement && (
        <AddProjectMovementModal
          project={project}
          accounts={data.accounts}
          providers={data.providers}
          onClose={() => setShowAddMovement(false)}
          onSave={async (mov) => { await addMovement(mov); setShowAddMovement(false) }}
        />
      )}

      {showUpload && (
        <UploadFileModal
          projectId={project.id}
          onClose={() => setShowUpload(false)}
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
          }}
        />
      )}

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} onSave={async (p) => {
        await updateRow("projects", project.id, p, "projects"); setShowEdit(false)
      }} />}
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

  return (
    <Modal isOpen={true} title={project ? "Editar Proyecto" : "Nuevo Proyecto"} onClose={onClose} size="lg">
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: project?.id ?? generateId(), name, client, address, type, status,
        margin: parseFloat(margin) || 1.4, client_email: clientEmail || null,
        client_phone: clientPhone || null, created_at: project?.created_at ?? new Date().toISOString(),
      })}} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Nombre del proyecto" value={name} onChange={setName} />
          <FormInput label="Cliente" value={client} onChange={setClient} />
        </div>
        <FormInput label="Direcci\u00f3n" value={address} onChange={setAddress} />
        <div className="grid grid-cols-3 gap-4">
          <FormSelect label="Tipo" value={type || ""} onChange={setType}
            options={[{ value: "arquitectura", label: "Arquitectura" }, { value: "interiorismo", label: "Interiorismo" }, { value: "ambos", label: "Ambos" }]} />
          <FormSelect label="Estado" value={status || ""} onChange={setStatus}
            options={[{ value: "activo", label: "Activo" }, { value: "pausado", label: "Pausado" }, { value: "finalizado", label: "Finalizado" }]} />
          <FormInput label="Multiplicador base" type="number" value={margin} onChange={setMargin} step="0.1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Email cliente" type="email" value={clientEmail} onChange={setClientEmail} />
          <FormInput label="Tel\u00e9fono cliente" value={clientPhone} onChange={setClientPhone} />
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
  const labels: Record<string, string> = { mano_de_obra: "Mano de Obra", material: "Material", mobiliario: "Mobiliario" }
  const [description, setDescription] = useState("")
  const [cost, setCost] = useState("")
  const [multiplier, setMultiplier] = useState(String(defaultMultiplier))
  const [providerId, setProviderId] = useState("")

  const costNum = parseFloat(cost) || 0
  const multNum = parseFloat(multiplier) || defaultMultiplier
  const clientPrice = costNum * multNum

  return (
    <Modal isOpen={true} title={`Agregar ${labels[type] || type}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), project_id: "", type: type as any,
        description, cost: costNum, client_price: clientPrice,
        multiplier: multNum, provider_id: providerId || null,
        paid: false, sort_order: 0,
      })}} className="space-y-4">
        <FormInput label="Descripci\u00f3n" value={description} onChange={setDescription} />
        <FormSelect label="Proveedor (opcional)" value={providerId} onChange={setProviderId}
          options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Costo proveedor" type="number" value={cost} onChange={setCost} inputMode="decimal" />
          <FormInput label="Multiplicador" type="number" value={multiplier} onChange={setMultiplier} step="0.1" inputMode="decimal" />
        </div>
        <div className="bg-[#F0EDE4] rounded-lg p-4">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Precio al cliente:</span>
            <span className="text-lg font-semibold">{formatCurrency(clientPrice)}</span></div>
          <p className="text-xs text-muted-foreground mt-1">Ganancia: {formatCurrency(clientPrice - costNum)}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !cost}>Agregar</Btn>
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
        auto_split: type === "ingreso" ? autoSplit : false,
        split_percentage: 50,
      })}} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso (cobro)" }, { value: "egreso", label: "Egreso (pago)" }]} />
        </div>
        <FormInput label="Descripci\u00f3n" value={description} onChange={setDescription} />
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
              <p className="text-xs text-green-600">Se calcular\u00e1 autom\u00e1ticamente en Finanzas Personales</p>
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

function UploadFileModal({ projectId, onClose, onUpload }: {
  projectId: string; onClose: () => void
  onUpload: (file: File, meta: { name: string; category: string; description: string }) => void
}) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("otro")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
            : <p className="text-sm text-muted-foreground">Click para seleccionar archivo (PDF, im\u00e1genes, Office - m\u00e1x 25MB)</p>}
        </div>
        <FormInput label="Nombre" value={name} onChange={setName} />
        <FormSelect label="Categor\u00eda" value={category} onChange={setCategory}
          options={[{ value: "contrato", label: "Contrato" }, { value: "plano", label: "Plano" },
            { value: "presupuesto", label: "Presupuesto" }, { value: "factura", label: "Factura" },
            { value: "foto", label: "Foto" }, { value: "render", label: "Render" }, { value: "otro", label: "Otro" }]} />
        <FormInput label="Descripci\u00f3n (opcional)" value={description} onChange={setDescription} />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!file}>Subir</Btn>
        </div>
      </form>
    </Modal>
  )
}
