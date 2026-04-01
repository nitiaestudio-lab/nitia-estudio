"use client"

import { useState, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea, EditableSelect } from "@/components/nitia-ui"
import type { Provider, ProviderDocument } from "@/lib/types"
import { Plus, Phone, Mail, ArrowLeft, Trash2, Pencil, Upload, FileText, Download } from "lucide-react"

export function Providers() {
  const { data, addRow, updateRow, deleteRow, getCategoriesFor, addCategory, selectedProjectId } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  const providers = data.providers
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => !filterCategory || p.category === filterCategory)

  const categories = [...new Set(data.providers.map(p => p.category).filter(Boolean))]
  const selected = selectedId ? data.providers.find(p => p.id === selectedId) : null

  if (selected) return <ProviderDetail provider={selected} onBack={() => setSelectedId(null)} />

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proveedores</h1>
          <p className="text-sm text-[#76746A] mt-1">Gesti{"\u00f3"}n de proveedores del estudio</p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Proveedor</Btn>
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar proveedores..." className="px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        <FormSelect value={filterCategory} onChange={setFilterCategory}
          options={[{ value: "", label: "Todas las categor\u00edas" }, ...categories.map(c => ({ value: c, label: c }))]} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(prov => {
          const provMovements = data.movements.filter(m => m.provider_id === prov.id)
          const totalPaid = provMovements.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)
          return (
            <div key={prov.id} onClick={() => setSelectedId(prov.id)}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{prov.name}</h3>
                <Tag label={prov.category} color="blue" />
              </div>
              {prov.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{prov.phone}</p>}
              {totalPaid > 0 && <p className="text-sm text-muted-foreground mt-2">Pagado: {formatCurrency(totalPaid)}</p>}
            </div>
          )
        })}
      </div>

      {providers.length === 0 && <Empty title="Sin proveedores" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {showNew && <ProviderFormModal
        categories={getCategoriesFor("proveedor")}
        onAddCategory={n => addCategory("proveedor", n)}
        onClose={() => setShowNew(false)}
        onSave={async (p) => { await addRow("providers", p, "providers"); setShowNew(false) }}
      />}
    </div>
  )
}

function ProviderDetail({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const { data, updateRow, addRow, deleteRow, uploadFile, addMovement, getCategoriesFor, addCategory } = useApp()
  const [showEdit, setShowEdit] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const docs = data.providerDocuments.filter(d => d.provider_id === provider.id)
  const movements = data.movements.filter(m => m.provider_id === provider.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const totalPaid = movements.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-light">{provider.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Tag label={provider.category} color="blue" />
            {provider.zone && <span className="text-sm text-muted-foreground">{provider.zone}</span>}
          </div>
        </div>
        <Btn variant="soft" onClick={() => setShowEdit(true)}><Pencil size={14} className="mr-1 inline" />Editar</Btn>
      </div>

      {/* Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <SecHead title="Contacto" />
          {provider.phone && <p className="text-sm flex items-center gap-2"><Phone size={14} />{provider.phone}</p>}
          {provider.email && <p className="text-sm flex items-center gap-2"><Mail size={14} />{provider.email}</p>}
          {provider.cbu && <p className="text-sm"><span className="text-muted-foreground">CBU:</span> {provider.cbu}</p>}
          {provider.alias && <p className="text-sm"><span className="text-muted-foreground">Alias:</span> {provider.alias}</p>}
          {provider.notes && <p className="text-sm text-muted-foreground">{provider.notes}</p>}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <SecHead title="Resumen Financiero" />
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total pagado</span>
              <span className="text-sm font-semibold">{formatCurrency(totalPaid)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Movimientos</span>
              <span className="text-sm">{movements.length}</span></div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SecHead title="Documentos" right={
          <Btn size="sm" variant="soft" onClick={() => setShowUpload(true)}><Upload size={12} className="mr-1 inline" />Subir</Btn>
        } />
        {docs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#F7F5ED] rounded-lg group">
                <FileText size={20} className="text-[#5F5A46]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.type}</p>
                </div>
                {doc.url && <a href={doc.url} target="_blank" className="p-1 hover:bg-accent rounded"><Download size={14} /></a>}
                <button onClick={() => deleteRow("provider_documents", doc.id, "providerDocuments")}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
              </div>
            ))}
          </div>
        ) : <Empty title="Sin documentos" />}
      </div>

      {/* Movements history */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SecHead title="Historial de Pagos" />
        {movements.length > 0 ? movements.map(mov => (
          <div key={mov.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
            <div>
              <span>{mov.description}</span>
              <span className="text-xs text-muted-foreground ml-2">{formatDate(mov.date)}</span>
              {mov.project_id && <Tag label={data.projects.find(p => p.id === mov.project_id)?.name || ""} color="blue" />}
            </div>
            <span className={`font-medium ${mov.type === "egreso" ? "text-red-600" : "text-green-600"}`}>
              {mov.type === "egreso" ? "-" : "+"}{formatCurrency(mov.amount)}
            </span>
          </div>
        )) : <Empty title="Sin pagos registrados" />}
      </div>

      {showEdit && <ProviderFormModal provider={provider}
        categories={getCategoriesFor("proveedor")}
        onAddCategory={n => addCategory("proveedor", n)}
        onClose={() => setShowEdit(false)}
        onSave={async (p) => { await updateRow("providers", provider.id, p, "providers"); setShowEdit(false) }}
        onDelete={async () => { await deleteRow("providers", provider.id, "providers"); onBack() }}
      />}

      {showUpload && <UploadDocModal providerId={provider.id} onClose={() => setShowUpload(false)}
        onUpload={async (file, meta) => {
          const result = await uploadFile("documents", `providers/${provider.id}/${Date.now()}_${file.name}`, file)
          if (result) {
            await addRow("provider_documents", {
              id: generateId(), provider_id: provider.id,
              name: meta.name || file.name, type: meta.type,
              description: meta.description, url: result.url,
              storage_path: result.path,
            }, "providerDocuments")
          }
          setShowUpload(false)
        }}
      />}
    </div>
  )
}

function ProviderFormModal({ provider, categories, onAddCategory, onClose, onSave, onDelete }: {
  provider?: Provider; categories: { id: string; name: string }[]
  onAddCategory: (n: string) => void
  onClose: () => void; onSave: (p: Provider) => void; onDelete?: () => void
}) {
  const [name, setName] = useState(provider?.name ?? "")
  const [category, setCategory] = useState(provider?.category ?? "")
  const [phone, setPhone] = useState(provider?.phone ?? "")
  const [email, setEmail] = useState(provider?.email ?? "")
  const [zone, setZone] = useState(provider?.zone ?? "")
  const [cbu, setCbu] = useState(provider?.cbu ?? "")
  const [alias, setAlias] = useState(provider?.alias ?? "")
  const [notes, setNotes] = useState(provider?.notes ?? "")

  return (
    <Modal isOpen={true} title={provider ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={onClose} size="lg">
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: provider?.id ?? generateId(), name, category, phone, email, zone, cbu, alias, notes,
      })}} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Nombre" value={name} onChange={setName} />
          <EditableSelect label="Categor\u00eda" value={category} onChange={setCategory}
            options={categories.map(c => ({ value: c.name, label: c.name }))} onAddNew={onAddCategory} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Tel\u00e9fono" value={phone} onChange={setPhone} />
          <FormInput label="Email" type="email" value={email} onChange={setEmail} />
        </div>
        <FormInput label="Zona" value={zone} onChange={setZone} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="CBU" value={cbu} onChange={setCbu} />
          <FormInput label="Alias" value={alias} onChange={setAlias} />
        </div>
        <FormTextarea label="Notas" value={notes} onChange={setNotes} />
        <div className="flex justify-between pt-4">
          {onDelete && <Btn variant="danger" onClick={onDelete}>Eliminar</Btn>}
          <div className="flex gap-3 ml-auto">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" disabled={!name || !category}>{provider ? "Guardar" : "Crear"}</Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function UploadDocModal({ providerId, onClose, onUpload }: {
  providerId: string; onClose: () => void
  onUpload: (file: File, meta: { name: string; type: string; description: string }) => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState("presupuesto")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <Modal isOpen={true} title="Subir Documento" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (file) onUpload(file, { name: name || file.name, type, description }) }} className="space-y-4">
        <div className="border-2 border-dashed border-[#E0DDD0] rounded-lg p-6 text-center cursor-pointer hover:border-[#5F5A46]"
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if (f) { setFile(f); if (!name) setName(f.name) }
          }} />
          {file ? <p className="text-sm font-medium">{file.name}</p> : <p className="text-sm text-muted-foreground">Click para seleccionar</p>}
        </div>
        <FormInput label="Nombre" value={name} onChange={setName} />
        <FormSelect label="Tipo" value={type} onChange={setType}
          options={[{ value: "presupuesto", label: "Presupuesto" }, { value: "contrato", label: "Contrato" },
            { value: "factura", label: "Factura" }, { value: "comprobante", label: "Comprobante" }, { value: "foto", label: "Foto" }, { value: "otro", label: "Otro" }]} />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!file}>Subir</Btn>
        </div>
      </form>
    </Modal>
  )
}
