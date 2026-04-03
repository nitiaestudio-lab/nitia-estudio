"use client"

import { useState, useRef, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea, EditableSelect, HR, Stat, PeriodFilter, type PeriodValue } from "@/components/nitia-ui"
import type { Provider, ProviderDocument } from "@/lib/types"
import { Plus, Phone, Mail, ArrowLeft, Trash2, Pencil, Upload, FileText, Download, Search, FolderOpen, Eye, FileSpreadsheet, ExternalLink, MapPin } from "lucide-react"

export function Providers() {
  const { data, addRow, updateRow, deleteRow, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [searchQ, setSearchQ] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterZone, setFilterZone] = useState("")

  const categories = [...new Set(data.providers.map(p => p.category).filter(Boolean))]
  const zones = [...new Set(data.providers.map(p => p.zone).filter(Boolean))] as string[]
  const providers = data.providers
    .filter(p => !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()))
    .filter(p => !filterCategory || p.category === filterCategory)
    .filter(p => !filterZone || p.zone === filterZone)

  const selected = selectedId ? data.providers.find(p => p.id === selectedId) : null
  if (selected) return <ProviderDetail provider={selected} onBack={() => setSelectedId(null)} />

  const handleExport = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const sheet = providers.map(p => {
        const paid = data.movements.filter(m => m.provider_id === p.id && m.type === "egreso").reduce((s, m) => s + m.amount, 0)
        return { Nombre: p.name, Categoría: p.category, Zona: p.zone || "", Teléfono: p.phone || "", Email: p.email || "", CBU: p.cbu || "", Alias: p.alias || "", "Seña %": p.advance_percent || "", "Total Pagado": paid }
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Proveedores")
      XLSX.writeFile(wb, `proveedores_${today()}.xlsx`)
    } catch {}
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proveedores</h1>
          <p className="text-sm text-[#76746A] mt-1">Gestión de proveedores del estudio</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nuevo Proveedor</Btn>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar proveedores..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
        </div>
        <FormSelect value={filterCategory} onChange={setFilterCategory}
          options={[{ value: "", label: "Todas las categorías" }, ...categories.map(c => ({ value: c, label: c }))]} />
        {zones.length > 0 && <FormSelect value={filterZone} onChange={setFilterZone}
          options={[{ value: "", label: "Todas las zonas" }, ...zones.map(z => ({ value: z, label: z }))]} />}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(prov => {
          const paid = data.movements.filter(m => m.provider_id === prov.id && m.type === "egreso").reduce((s, m) => s + m.amount, 0)
          return (
            <div key={prov.id} onClick={() => setSelectedId(prov.id)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold truncate">{prov.name}</h3>
                <Tag label={prov.category} color="blue" />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {prov.zone && <p className="flex items-center gap-1"><MapPin size={10} />{prov.zone}</p>}
                {prov.phone && <p className="flex items-center gap-1"><Phone size={10} />{prov.phone}</p>}
                {prov.advance_percent && <p>Seña: {prov.advance_percent}%</p>}
              </div>
              {paid > 0 && <p className="text-sm text-red-600 mt-2 font-medium">Pagado: {formatCurrency(paid)}</p>}
            </div>
          )
        })}
      </div>

      {providers.length === 0 && <Empty title="Sin proveedores" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {showNew && <ProviderFormModal categories={getCategoriesFor("proveedor")}
        onAddCategory={n => addCategory("proveedor", n)} onDeleteCategory={deleteCategory}
        onClose={() => setShowNew(false)} onSave={async (p) => { await addRow("providers", p, "providers"); setShowNew(false) }} />}
    </div>
  )
}

// =================== PROVIDER DETAIL ===================
function ProviderDetail({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const { data, updateRow, addRow, deleteRow, uploadFile, getCategoriesFor, addCategory, deleteCategory, setSection, setSelectedProjectId } = useApp()
  const [showEdit, setShowEdit] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [searchDoc, setSearchDoc] = useState("")
  const [filterDocType, setFilterDocType] = useState("")
  const [paySearchQ, setPaySearchQ] = useState("")
  const [payFilterType, setPayFilterType] = useState<"all"|"egreso"|"ingreso">("all")
  const [payPeriod, setPayPeriod] = useState<PeriodValue>("all")
  const [payCustomStart, setPayCustomStart] = useState("")
  const [payCustomEnd, setPayCustomEnd] = useState("")

  const docs = data.providerDocuments.filter(d => d.provider_id === provider.id)
  const filteredDocs = docs
    .filter(d => !searchDoc || d.name.toLowerCase().includes(searchDoc.toLowerCase()))
    .filter(d => !filterDocType || d.type === filterDocType)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  const docTypes = [...new Set(docs.map(d => d.type).filter(Boolean))]

  const movements = data.movements.filter(m => m.provider_id === provider.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const totalPaid = movements.filter(m => m.type === "egreso").reduce((s, m) => s + m.amount, 0)

  // Saldo por proyecto
  const balanceByProject = useMemo(() => {
    const projectIds = [...new Set(data.projectItems.filter(i => i.provider_id === provider.id).map(i => i.project_id))]
    return projectIds.map(pid => {
      const project = data.projects.find(p => p.id === pid)
      if (!project) return null
      const itemsCost = data.projectItems.filter(i => i.project_id === pid && i.provider_id === provider.id).reduce((s, i) => s + i.cost, 0)
      const quotesCost = data.quoteComparisons.filter(q => q.project_id === pid && q.provider_id === provider.id && q.selected).reduce((s, q) => s + q.cost, 0)
      const totalOwed = itemsCost + quotesCost
      const paid = movements.filter(m => m.project_id === pid && m.type === "egreso").reduce((s, m) => s + m.amount, 0)
      const pending = totalOwed - paid
      return { project, totalOwed, paid, pending }
    }).filter(Boolean) as { project: any; totalOwed: number; paid: number; pending: number }[]
  }, [data.projectItems, data.quoteComparisons, movements, provider.id, data.projects])

  const isImage = (mime?: string | null) => mime?.startsWith("image/")
  const isPDF = (mime?: string | null) => mime === "application/pdf"
  const [previewDoc, setPreviewDoc] = useState<any>(null)

  const totalDebt = balanceByProject.reduce((s, bp) => s + Math.max(0, bp.pending), 0)
  const totalOwedAll = balanceByProject.reduce((s, bp) => s + bp.totalOwed, 0)

  const filteredMovements = useMemo(() => {
    let items = movements
    items = filterByDateRange(items, payPeriod, payCustomStart, payCustomEnd)
    if (paySearchQ) items = items.filter(m => m.description.toLowerCase().includes(paySearchQ.toLowerCase()))
    if (payFilterType !== "all") items = items.filter(m => m.type === payFilterType)
    return items
  }, [movements, payPeriod, payCustomStart, payCustomEnd, paySearchQ, payFilterType])

  const handleExportPayments = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const sheet = movements.map(m => ({
        Fecha: m.date, Descripción: m.description, Tipo: m.type === "egreso" ? "Pago" : "Ingreso",
        Monto: m.amount, Proyecto: data.projects.find(p => p.id === m.project_id)?.name || "",
        "Seña Real %": m.sena_real_pct || "", "Seña Cliente %": m.sena_cliente_pct || "",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Pagos")
      XLSX.writeFile(wb, `pagos_${provider.name.replace(/\s+/g, "_")}_${today()}.xlsx`)
    } catch {}
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg self-start"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-light truncate">{provider.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Tag label={provider.category} color="blue" />
            {provider.zone && <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin size={12} />{provider.zone}</span>}
            {provider.advance_percent && <Tag label={`Seña ${provider.advance_percent}%`} color="amber" />}
          </div>
        </div>
        <Btn variant="soft" size="sm" onClick={() => setShowEdit(true)}><Pencil size={14} className="mr-1 inline" />Editar</Btn>
      </div>

      {/* Info + Finance */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <SecHead title="Contacto" />
          {provider.phone && <p className="text-sm flex items-center gap-2"><Phone size={14} />{provider.phone}</p>}
          {provider.email && <p className="text-sm flex items-center gap-2"><Mail size={14} />{provider.email}</p>}
          {provider.contact && <p className="text-sm"><span className="text-muted-foreground">Contacto:</span> {provider.contact}</p>}
          {provider.cbu && <p className="text-sm"><span className="text-muted-foreground">CBU:</span> <code className="text-xs bg-[#F0EDE4] px-1 py-0.5 rounded">{provider.cbu}</code></p>}
          {provider.alias && <p className="text-sm"><span className="text-muted-foreground">Alias:</span> {provider.alias}</p>}
          {provider.notes && <p className="text-sm text-muted-foreground mt-2">{provider.notes}</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <SecHead title="Resumen Financiero" />
          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pagado: {formatCurrency(totalPaid)}</span>
              <span>Total: {formatCurrency(totalOwedAll)}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${totalOwedAll > 0 ? Math.min((totalPaid / totalOwedAll) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{totalOwedAll > 0 ? ((totalPaid / totalOwedAll) * 100).toFixed(0) : 0}% pagado</p>
          </div>
          {/* Deuda destacada */}
          <div className={`text-center p-3 rounded-lg ${totalDebt > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
            <p className="text-xs text-muted-foreground mb-0.5">{totalDebt > 0 ? "Falta pagar" : "Estado"}</p>
            <p className={`text-xl font-bold ${totalDebt > 0 ? "text-red-700" : "text-green-700"}`}>
              {totalDebt > 0 ? formatCurrency(totalDebt) : "Al día ✓"}
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-center">{movements.length} movimiento{movements.length !== 1 ? "s" : ""} registrado{movements.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Saldo por Proyecto */}
      {balanceByProject.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <SecHead title="Saldo por Proyecto" />
          <div className="space-y-2">
            {balanceByProject.map(bp => (
              <div key={bp.project.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <button onClick={() => { setSelectedProjectId(bp.project.id); setSection("projects") }}
                  className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                  {bp.project.name}<ExternalLink size={10} />
                </button>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Comprometido: {formatCurrency(bp.totalOwed)}</span>
                  <span className="text-green-600">Pagado: {formatCurrency(bp.paid)}</span>
                  <span className={`font-bold ${bp.pending > 0 ? "text-red-600" : "text-green-600"}`}>
                    {bp.pending > 0 ? `Pendiente: ${formatCurrency(bp.pending)}` : "Al día ✓"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SecHead title="Documentos" right={
          <Btn size="sm" variant="soft" onClick={() => setShowUpload(true)}><Upload size={12} className="mr-1 inline" />Subir</Btn>
        } />
        {docs.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex-1 min-w-[150px] relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchDoc} onChange={e => setSearchDoc(e.target.value)} placeholder="Buscar..."
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E0DDD0] text-xs bg-white" />
            </div>
            {docTypes.length > 1 && <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-[#E0DDD0] text-xs bg-white">
              <option value="">Todos</option>{docTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>}
          </div>
        )}
        {/* Carpetas por tipo */}
        {!filterDocType && docTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {docTypes.map(t => (
              <button key={t} onClick={() => setFilterDocType(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F5ED] rounded-lg hover:bg-[#F0EDE4] text-xs">
                <FolderOpen size={14} className="text-[#5F5A46]" />{t} ({docs.filter(d => d.type === t).length})
              </button>
            ))}
          </div>
        )}
        {filteredDocs.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#F7F5ED] rounded-lg group">
                {isImage(doc.mime_type) && doc.url
                  ? <img src={doc.url} alt={doc.name} className="w-10 h-10 rounded object-cover shrink-0 cursor-pointer" onClick={() => setPreviewDoc(doc)} />
                  : <FileText size={18} className="text-[#5F5A46] shrink-0" />}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => doc.url && (isImage(doc.mime_type) || isPDF(doc.mime_type)) && setPreviewDoc(doc)}>
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.type}{doc.date ? ` · ${formatDate(doc.date)}` : ""}{doc.file_size ? ` · ${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ""}</p>
                </div>
                {doc.url && (
                  <button onClick={() => setPreviewDoc(doc)} className="p-1 hover:bg-accent rounded"><Eye size={14} /></button>
                )}
                {doc.url && <a href={doc.url} target="_blank" rel="noopener" className="p-1 hover:bg-accent rounded"><Download size={14} /></a>}
                <button onClick={() => deleteRow("provider_documents", doc.id, "providerDocuments")}
                  className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 sm:opacity-100"><Trash2 size={12} className="text-red-600" /></button>
              </div>
            ))}
          </div>
        ) : <Empty title="Sin documentos" />}
      </div>

      {/* Payments History */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SecHead title="Historial de Pagos" right={
          movements.length > 0 ? <Btn variant="soft" size="sm" onClick={handleExportPayments}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn> : undefined
        } />
        {movements.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex-1 min-w-[150px] relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={paySearchQ} onChange={e => setPaySearchQ(e.target.value)} placeholder="Buscar pagos..."
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E0DDD0] text-xs bg-white" />
            </div>
            <select value={payFilterType} onChange={e => setPayFilterType(e.target.value as "all"|"egreso"|"ingreso")}
              className="px-2 py-1.5 rounded-lg border border-[#E0DDD0] text-xs bg-white">
              <option value="all">Todos</option>
              <option value="egreso">Pagos</option>
              <option value="ingreso">Ingresos</option>
            </select>
            <PeriodFilter value={payPeriod} onChange={setPayPeriod}
              customStart={payCustomStart} customEnd={payCustomEnd}
              onCustomStartChange={setPayCustomStart} onCustomEndChange={setPayCustomEnd} />
          </div>
        )}
        {filteredMovements.length > 0 ? filteredMovements.map(mov => (
          <div key={mov.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm group">
            <div className="min-w-0 flex-1">
              <span className="font-medium">{mov.description}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{formatDate(mov.date)}</span>
                {mov.project_id && (
                  <button onClick={() => { setSelectedProjectId(mov.project_id!); setSection("projects") }}
                    className="text-blue-600 hover:underline flex items-center gap-0.5">
                    {data.projects.find(p => p.id === mov.project_id)?.name}<ExternalLink size={8} />
                  </button>
                )}
                {mov.sena_real_pct && <span>Seña real: {mov.sena_real_pct}%</span>}
                {mov.sena_cliente_pct && <span>Seña cli: {mov.sena_cliente_pct}%</span>}
              </div>
            </div>
            <span className={`font-medium shrink-0 ${mov.type === "egreso" ? "text-red-600" : "text-green-600"}`}>
              {mov.type === "egreso" ? "-" : "+"}{formatCurrency(mov.amount)}
            </span>
          </div>
        )) : <Empty title="Sin pagos registrados" />}
      </div>

      {/* Modals */}
      {showEdit && <ProviderFormModal provider={provider}
        categories={getCategoriesFor("proveedor")} onAddCategory={n => addCategory("proveedor", n)} onDeleteCategory={deleteCategory}
        onClose={() => setShowEdit(false)}
        onSave={async (p) => { await updateRow("providers", provider.id, p, "providers"); setShowEdit(false) }}
        onDelete={async () => { await deleteRow("providers", provider.id, "providers"); onBack() }} />}

      {showUpload && <UploadDocModal providerId={provider.id} onClose={() => setShowUpload(false)}
        onUpload={async (file, meta) => {
          const result = await uploadFile("documents", `providers/${provider.id}/${Date.now()}_${file.name}`, file)
          if (result) {
            await addRow("provider_documents", {
              id: generateId(), provider_id: provider.id, name: meta.name || file.name,
              type: meta.type, description: meta.description, date: meta.date || null,
              url: result.url, storage_path: result.path, file_size: file.size, mime_type: file.type,
            }, "providerDocuments")
          }
          setShowUpload(false)
        }} />}

      {/* File Preview Modal */}
      {previewDoc && previewDoc.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewDoc(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm flex items-center gap-1">
              Cerrar ✕
            </button>
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-medium truncate">{previewDoc.name}</p>
                <a href={previewDoc.url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Download size={12} />Descargar
                </a>
              </div>
              <div className="max-h-[80vh] overflow-auto">
                {isImage(previewDoc.mime_type)
                  ? <img src={previewDoc.url} alt={previewDoc.name} className="w-full h-auto" />
                  : isPDF(previewDoc.mime_type)
                    ? <iframe src={previewDoc.url} className="w-full h-[75vh]" title={previewDoc.name} />
                    : <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewDoc.url)}&embedded=true`} className="w-full h-[75vh]" title={previewDoc.name} />
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =================== MODALS ===================
function ProviderFormModal({ provider, categories, onAddCategory, onDeleteCategory, onClose, onSave, onDelete }: {
  provider?: Provider; categories: { id: string; name: string }[]
  onAddCategory: (n: string) => void; onDeleteCategory: (n: string) => void
  onClose: () => void; onSave: (p: Provider) => void; onDelete?: () => void
}) {
  const [name, setName] = useState(provider?.name ?? ""); const [category, setCategory] = useState(provider?.category ?? "")
  const [phone, setPhone] = useState(provider?.phone ?? ""); const [email, setEmail] = useState(provider?.email ?? "")
  const [zone, setZone] = useState(provider?.zone ?? ""); const [contact, setContact] = useState(provider?.contact ?? "")
  const [cbu, setCbu] = useState(provider?.cbu ?? ""); const [alias, setAlias] = useState(provider?.alias ?? "")
  const [advancePct, setAdvancePct] = useState(String(provider?.advance_percent ?? ""))
  const [notes, setNotes] = useState(provider?.notes ?? "")
  return (
    <Modal isOpen={true} title={provider ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={onClose} size="lg">
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: provider?.id ?? generateId(), name, category, phone, email, zone, contact, cbu, alias, notes,
        advance_percent: parseFloat(advancePct) || undefined,
      })}} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Nombre" value={name} onChange={setName} />
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={categories.map(c => ({ value: c.name, label: c.name }))} onAddNew={onAddCategory} onDelete={onDeleteCategory} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Teléfono" value={phone} onChange={setPhone} />
          <FormInput label="Email" type="email" value={email} onChange={setEmail} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Zona" value={zone} onChange={setZone} placeholder="Ej: CABA, Zona Norte" />
          <FormInput label="Contacto (persona)" value={contact} onChange={setContact} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormInput label="CBU" value={cbu} onChange={setCbu} />
          <FormInput label="Alias" value={alias} onChange={setAlias} />
          <FormInput label="Seña %" type="number" value={advancePct} onChange={setAdvancePct} placeholder="Ej: 50" />
        </div>
        <FormTextarea label="Notas" value={notes} onChange={setNotes} />
        <div className="flex justify-between pt-4">
          {onDelete && <Btn variant="danger" onClick={onDelete}>Eliminar</Btn>}
          <div className="flex gap-3 ml-auto"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" disabled={!name || !category}>{provider ? "Guardar" : "Crear"}</Btn></div>
        </div>
      </form>
    </Modal>
  )
}

function UploadDocModal({ providerId, onClose, onUpload }: {
  providerId: string; onClose: () => void
  onUpload: (file: File, meta: { name: string; type: string; description: string; date: string }) => void
}) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [name, setName] = useState(""); const [type, setType] = useState("presupuesto")
  const [description, setDescription] = useState(""); const [date, setDate] = useState(today())
  const [file, setFile] = useState<File | null>(null); const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Modal isOpen={true} title="Subir Documento" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (file) onUpload(file, { name: name || file.name, type, description, date }) }} className="space-y-4">
        <div className="border-2 border-dashed border-[#E0DDD0] rounded-lg p-6 text-center cursor-pointer hover:border-[#5F5A46]"
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" capture="environment" onChange={e => {
            const f = e.target.files?.[0]; if (f) { setFile(f); if (!name) setName(f.name) }
          }} />
          {file ? <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p> : <p className="text-sm text-muted-foreground">Click para seleccionar</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Nombre" value={name} onChange={setName} />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>
        <FormSelect label="Tipo" value={type} onChange={setType}
          options={[{ value: "presupuesto", label: "Presupuesto" }, { value: "contrato", label: "Contrato" },
            { value: "factura", label: "Factura" }, { value: "comprobante", label: "Comprobante" },
            { value: "foto", label: "Foto" }, { value: "otro", label: "Otro" }]} />
        <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!file}>Subir</Btn></div>
      </form>
    </Modal>
  )
}
