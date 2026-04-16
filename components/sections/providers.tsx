"use client"

import { useState, useRef, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatUSD, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormMoneyInput, FormSelect, FormTextarea, EditableSelect, HR, Stat, PeriodFilter, type PeriodValue } from "@/components/nitia-ui"
import type { Provider, ProviderDocument, Movement } from "@/lib/types"
import { Plus, Phone, Mail, ArrowLeft, Trash2, Pencil, Upload, FileText, Download, Search, FolderOpen, Eye, FileSpreadsheet, ExternalLink, MapPin } from "lucide-react"

function formatAmount(m: { amount: number; medio_pago?: string | null }) {
  if (m.medio_pago === "USD") return `U$D ${new Intl.NumberFormat("es-AR").format(m.amount)}`
  return formatCurrency(m.amount)
}

export function Providers() {
  const { data, addRow, updateRow, deleteRow, getCategoriesFor, addCategory, deleteCategory, selectedProviderId, setSelectedProviderId } = useApp()
  const selectedId = selectedProviderId
  const setSelectedId = setSelectedProviderId
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
        const movs = data.movements.filter(m => m.provider_id === p.id && m.type === "egreso")
        const paidARS = movs.filter(m => m.medio_pago !== "USD").reduce((s, m) => s + m.amount, 0)
        const paidUSD = movs.filter(m => m.medio_pago === "USD").reduce((s, m) => s + m.amount, 0)
        return { Nombre: p.name, Categoría: p.category, Zona: p.zone || "", Teléfono: p.phone || "", Email: p.email || "", CBU: p.cbu || "", Alias: p.alias || "", "Seña %": p.advance_percent || "", "Pagado ARS": paidARS, "Pagado USD": paidUSD || "" }
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
          const provMovs = data.movements.filter(m => m.provider_id === prov.id && m.type === "egreso")
          const paidARS = provMovs.filter(m => m.medio_pago !== "USD").reduce((s, m) => s + m.amount, 0)
          const paidUSD = provMovs.filter(m => m.medio_pago === "USD").reduce((s, m) => s + m.amount, 0)
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
              {paidARS > 0 && <p className="text-sm text-red-600 mt-2 font-medium">Pagado: {formatCurrency(paidARS)}</p>}
              {paidUSD > 0 && <p className="text-sm text-red-600 font-medium">Pagado: {formatUSD(paidUSD)}</p>}
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
  const { data, updateRow, addRow, deleteRow, deleteMovement, uploadFile, getCategoriesFor, addCategory, deleteCategory, setSection, setSelectedProjectId } = useApp()
  const [showEdit, setShowEdit] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [searchDoc, setSearchDoc] = useState("")
  const [filterDocType, setFilterDocType] = useState("")
  const [paySearchQ, setPaySearchQ] = useState("")
  const [payFilterType, setPayFilterType] = useState<"all"|"egreso"|"ingreso">("all")
  const [payPeriod, setPayPeriod] = useState<PeriodValue>("all")
  const [payCustomStart, setPayCustomStart] = useState("")
  const [payCustomEnd, setPayCustomEnd] = useState("")
  // Inline editing for movements
  const [editingMov, setEditingMov] = useState<{ id: string; field: string } | null>(null)
  const [editMovValue, setEditMovValue] = useState("")
  const [editingMovModal, setEditingMovModal] = useState<Movement | null>(null)
  const startEditMov = (id: string, field: string, value: string) => { setEditingMov({ id, field }); setEditMovValue(value) }
  const saveEditMov = async (movId: string) => {
    if (!editingMov) return
    const updates: Record<string, any> = {}
    if (editingMov.field === "description") updates.description = editMovValue
    else if (editingMov.field === "amount") updates.amount = parseFloat(editMovValue) || 0
    else if (editingMov.field === "date") updates.date = editMovValue
    await updateRow("movements", movId, updates, "movements")
    setEditingMov(null)
  }
  const deleteMov = async (id: string) => { if (confirm("¿Eliminar este movimiento?")) await deleteMovement(id) }

  const docs = data.providerDocuments.filter(d => d.provider_id === provider.id)
  const filteredDocs = docs
    .filter(d => !searchDoc || d.name.toLowerCase().includes(searchDoc.toLowerCase()))
    .filter(d => !filterDocType || d.type === filterDocType)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  const docTypes = [...new Set(docs.map(d => d.type).filter(Boolean))]

  const movements = data.movements.filter(m => m.provider_id === provider.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const isSeñaEgreso = (m: any) => m.type === "egreso" && (m.category === "Seña proveedor" || m.category === "Aporte propio seña" || m.category === "Diferencia seña" || (m.concepto === "seña" && m.type === "egreso"))
  const isUSD = (m: any) => m.medio_pago === "USD"
  const totalPaidSinSeña = movements.filter(m => m.type === "egreso" && !isSeñaEgreso(m) && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const totalPaidUSD = movements.filter(m => m.type === "egreso" && !isSeñaEgreso(m) && isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const señaPagada = movements.filter(m => isSeñaEgreso(m) && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
  const señaPagadaUSD = movements.filter(m => isSeñaEgreso(m) && isUSD(m)).reduce((s, m) => s + m.amount, 0)

  // Saldo por proyecto
  const balanceByProject = useMemo(() => {
    const projectIds = [...new Set(data.projectItems.filter(i => i.provider_id === provider.id).map(i => i.project_id))]
    return projectIds.map(pid => {
      const project = data.projects.find(p => p.id === pid)
      if (!project) return null
      const pItems = data.projectItems.filter(i => i.project_id === pid && i.provider_id === provider.id)
      const pQuotes = data.quoteComparisons.filter(q => q.project_id === pid && q.provider_id === provider.id && q.selected)
      const itemsCostARS = pItems.filter(i => i.currency !== "USD").reduce((s, i) => s + i.cost, 0)
      const itemsCostUSD = pItems.filter(i => i.currency === "USD").reduce((s, i) => s + i.cost, 0)
      const quotesCostARS = pQuotes.filter(q => q.currency !== "USD").reduce((s, q) => s + q.cost, 0)
      const quotesCostUSD = pQuotes.filter(q => q.currency === "USD").reduce((s, q) => s + q.cost, 0)
      const totalOwed = itemsCostARS + quotesCostARS
      const totalOwedUSD = itemsCostUSD + quotesCostUSD
      const paid = movements.filter(m => m.project_id === pid && m.type === "egreso" && !isSeñaEgreso(m) && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
      const paidUSD = movements.filter(m => m.project_id === pid && m.type === "egreso" && !isSeñaEgreso(m) && isUSD(m)).reduce((s, m) => s + m.amount, 0)
      const seña = movements.filter(m => m.project_id === pid && isSeñaEgreso(m) && !isUSD(m)).reduce((s, m) => s + m.amount, 0)
      const señaUSD = movements.filter(m => m.project_id === pid && isSeñaEgreso(m) && isUSD(m)).reduce((s, m) => s + m.amount, 0)
      const pending = totalOwed - paid - seña
      const pendingUSD = totalOwedUSD - paidUSD - señaUSD
      return { project, totalOwed, totalOwedUSD, paid, paidUSD, pending, pendingUSD, seña, señaUSD }
    }).filter(Boolean) as { project: any; totalOwed: number; totalOwedUSD: number; paid: number; paidUSD: number; pending: number; pendingUSD: number; seña: number; señaUSD: number }[]
  }, [data.projectItems, data.quoteComparisons, movements, provider.id, data.projects])

  const isImage = (mime?: string | null) => mime?.startsWith("image/")
  const isPDF = (mime?: string | null) => mime === "application/pdf"
  const [previewDoc, setPreviewDoc] = useState<any>(null)

  const totalDebt = balanceByProject.reduce((s, bp) => s + Math.max(0, bp.pending), 0)
  const totalDebtUSD = balanceByProject.reduce((s, bp) => s + Math.max(0, bp.pendingUSD), 0)
  const totalOwedAll = balanceByProject.reduce((s, bp) => s + bp.totalOwed, 0)
  const totalOwedAllUSD = balanceByProject.reduce((s, bp) => s + bp.totalOwedUSD, 0)

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
        Moneda: m.medio_pago === "USD" ? "USD" : "ARS",
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
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Pagado: {formatCurrency(totalPaidSinSeña)}{señaPagada > 0 ? ` (seña ${formatCurrency(señaPagada)})` : ""}</span>
                <span>Total: {formatCurrency(totalOwedAll)}</span>
              </div>
              {(totalPaidUSD > 0 || totalOwedAllUSD > 0) && <div className="flex justify-between text-blue-700">
                {totalPaidUSD > 0 && <span>Pagado: {formatUSD(totalPaidUSD)}</span>}
                {totalOwedAllUSD > 0 && <span>Total: {formatUSD(totalOwedAllUSD)}</span>}
              </div>}
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${totalOwedAll > 0 ? Math.min(((totalPaidSinSeña + señaPagada) / totalOwedAll) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{totalOwedAll > 0 ? (((totalPaidSinSeña + señaPagada) / totalOwedAll) * 100).toFixed(0) : 0}% pagado</p>
          </div>
          {/* Deuda destacada */}
          <div className={`text-center p-3 rounded-lg ${totalDebt > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
            <p className="text-xs text-muted-foreground mb-0.5">{totalDebt > 0 ? "Falta pagar" : "Estado"}</p>
            {totalDebt > 0 && <p className="text-xl font-bold text-red-700">{formatCurrency(totalDebt)}</p>}
            {totalDebtUSD > 0 && <p className="text-lg font-bold text-red-700">{formatUSD(totalDebtUSD)}</p>}
            {totalDebt <= 0 && totalDebtUSD <= 0 && <p className="text-xl font-bold text-green-700">Al día ✓</p>}
          </div>
          {(señaPagada > 0 || señaPagadaUSD > 0) && (
            <div className="flex justify-between items-center px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs text-purple-700 font-medium">Seña pagada</span>
              <div className="text-right">
                <span className="text-sm font-bold text-purple-700">{formatCurrency(señaPagada)}</span>
                {señaPagadaUSD > 0 && <span className="text-sm font-bold text-purple-700 ml-2">{formatUSD(señaPagadaUSD)}</span>}
              </div>
            </div>
          )}
          {provider.advance_percent && (
            <div className="flex justify-between items-center px-2 text-xs text-muted-foreground">
              <span>Seña requerida ({provider.advance_percent}%)</span>
              <div className="text-right">
                <span>{formatCurrency(totalOwedAll * (provider.advance_percent / 100))}</span>
                {totalOwedAllUSD > 0 && <span className="text-blue-700 ml-2">{formatUSD(totalOwedAllUSD * (provider.advance_percent / 100))}</span>}
              </div>
            </div>
          )}
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
                <div className="text-sm space-y-0.5 text-right">
                  {/* ARS row */}
                  <div className="flex items-center gap-3 justify-end flex-wrap">
                    <span className="text-muted-foreground">Comp: {formatCurrency(bp.totalOwed)}</span>
                    <span className="text-green-600">Pagado: {formatCurrency(bp.paid)}</span>
                    {bp.seña > 0 && <span className="text-purple-600">Seña: {formatCurrency(bp.seña)}</span>}
                    <span className={`font-bold ${bp.pending > 0 ? "text-red-600" : "text-green-600"}`}>
                      {bp.pending > 0 ? `Pend: ${formatCurrency(bp.pending)}` : "✓"}
                    </span>
                  </div>
                  {/* USD row */}
                  {(bp.totalOwedUSD > 0 || bp.paidUSD > 0) && <div className="flex items-center gap-3 justify-end flex-wrap text-blue-700">
                    <span>Comp: {formatUSD(bp.totalOwedUSD)}</span>
                    <span>Pagado: {formatUSD(bp.paidUSD)}</span>
                    {bp.señaUSD > 0 && <span className="text-purple-600">Seña: {formatUSD(bp.señaUSD)}</span>}
                    <span className={`font-bold ${bp.pendingUSD > 0 ? "text-red-600" : "text-green-600"}`}>
                      {bp.pendingUSD > 0 ? `Pend: ${formatUSD(bp.pendingUSD)}` : "✓"}
                    </span>
                  </div>}
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
        {filteredMovements.length > 0 ? filteredMovements.map(mov => {
          const project = data.projects.find(p => p.id === mov.project_id)
          const account = data.accounts.find(a => a.id === mov.account_id)
          const isSeña = mov.concepto === "seña" || mov.concepto?.startsWith("seña")
          const isSeñaProv = mov.category === "Seña proveedor"
          // Parse item IDs from concepto like "seña:id1,id2"
          const señaItemIds = mov.concepto?.startsWith("seña:") ? mov.concepto.split(":")[1]?.split(",") || [] : []
          const señaItems = señaItemIds.length > 0
            ? data.projectItems.filter(i => señaItemIds.includes(i.id)).map(i => i.description)
                .concat(data.quoteComparisons.filter(q => señaItemIds.includes(q.id)).map(q => q.item))
            : []
          return (
            <div key={mov.id} className={`py-3 border-b border-border last:border-0 text-sm group ${isSeña || isSeñaProv ? "bg-purple-50/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${mov.type === "egreso" ? "bg-red-500" : "bg-green-500"}`}></span>
                    {editingMov?.id === mov.id && editingMov.field === "description" ? (
                      <input value={editMovValue} onChange={e => setEditMovValue(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveEditMov(mov.id); if (e.key === "Escape") setEditingMov(null) }}
                        onBlur={() => saveEditMov(mov.id)}
                        className="px-2 py-0.5 border border-border rounded text-sm bg-white font-medium flex-1" />
                    ) : (
                      <span className="font-medium cursor-pointer hover:underline" onDoubleClick={() => startEditMov(mov.id, "description", mov.description)}>{mov.description}</span>
                    )}
                    {(isSeña || isSeñaProv) && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">{isSeñaProv ? "Seña prov." : "Seña"}</span>}
                    {mov.category && !isSeñaProv && mov.category !== "Diferencia seña" && mov.category !== "Aporte propio seña" && <span className="text-[10px] px-1.5 py-0.5 bg-[#F0EDE4] text-[#76746A] rounded">{mov.category}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1 ml-4">
                    {editingMov?.id === mov.id && editingMov.field === "date" ? (
                      <input type="date" value={editMovValue} onChange={e => setEditMovValue(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveEditMov(mov.id); if (e.key === "Escape") setEditingMov(null) }}
                        onBlur={() => saveEditMov(mov.id)}
                        className="px-1 py-0.5 border border-border rounded text-xs bg-white" />
                    ) : (
                      <span className="cursor-pointer hover:underline" onDoubleClick={() => startEditMov(mov.id, "date", mov.date)}>{formatDate(mov.date)}</span>
                    )}
                    {project && <button onClick={() => { setSelectedProjectId(project.id); setSection("projects") }} className="text-blue-600 font-medium hover:underline">{project.name}</button>}
                    {account && <span>Cuenta: {account.name}</span>}
                    {mov.sena_real_pct != null && <span className="text-purple-600">Prov {mov.sena_real_pct}%</span>}
                    {mov.sena_cliente_pct != null && <span className="text-purple-600">Cli {mov.sena_cliente_pct}%</span>}
                    {mov.medio_pago === "USD" && <span className="text-blue-600 font-medium">USD</span>}
                  </div>
                  {señaItems.length > 0 && (
                    <div className="ml-4 mt-1 flex flex-wrap gap-1">
                      {señaItems.map((name, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-200">{name}</span>
                      ))}
                    </div>
                  )}
                  {account && (
                    <span className="ml-4 text-[10px] text-[#76746A]">Cuenta: {account.name}{account.type === "dolares" ? " (USD)" : " (Pesos)"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingMov?.id === mov.id && editingMov.field === "amount" ? (
                    <input type="number" value={editMovValue} onChange={e => setEditMovValue(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") saveEditMov(mov.id); if (e.key === "Escape") setEditingMov(null) }}
                      onBlur={() => saveEditMov(mov.id)}
                      className="w-28 px-2 py-0.5 border border-border rounded text-sm bg-white text-right font-bold" />
                  ) : (
                    <span className={`font-bold cursor-pointer hover:underline ${mov.type === "egreso" ? "text-red-600" : "text-green-600"}`}
                      onDoubleClick={() => startEditMov(mov.id, "amount", String(mov.amount))}>
                      {mov.type === "egreso" ? "-" : "+"}{formatAmount(mov)}
                    </span>
                  )}
                  {mov.medio_pago === "USD" && <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">USD</span>}
                  <button onClick={() => setEditingMovModal(mov)} className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12} /></button>
                  <button onClick={() => deleteMov(mov.id)} className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} className="text-red-500" /></button>
                </div>
              </div>
            </div>
          )
        }) : <Empty title="Sin pagos registrados" />}
      </div>

      {/* Modals */}
      {showEdit && <ProviderFormModal provider={provider}
        categories={getCategoriesFor("proveedor")} onAddCategory={n => addCategory("proveedor", n)} onDeleteCategory={deleteCategory}
        onClose={() => setShowEdit(false)}
        onSave={async (p) => { await updateRow("providers", provider.id, p, "providers"); setShowEdit(false) }}
        onDelete={async () => { await deleteRow("providers", provider.id, "providers"); onBack() }} />}

      {editingMovModal && <ProvEditMovModal movement={editingMovModal} onClose={() => setEditingMovModal(null)}
        onSave={async (u) => { await updateRow("movements", editingMovModal.id, u, "movements"); setEditingMovModal(null) }} />}

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

// =================== PROVIDER EDIT MOVEMENT MODAL ===================
function ProvEditMovModal({ movement, onClose, onSave }: { movement: Movement; onClose: () => void; onSave: (u: Partial<Movement>) => void }) {
  const { data, uploadFile, addMovement } = useApp()
  const [date, setDate] = useState(movement.date)
  const [desc, setDesc] = useState(movement.description)
  const [amt, setAmt] = useState(String(movement.amount))
  const [type, setType] = useState(movement.type)
  const [aid, setAid] = useState(movement.account_id ?? "")
  const [pid, setPid] = useState(movement.provider_id ?? "")
  const [projId, setProjId] = useState(movement.project_id ?? "")
  const [currency, setCurrency] = useState<"ARS" | "USD">(movement.medio_pago === "USD" ? "USD" : "ARS")
  const [concepto, setConcepto] = useState(movement.concepto ?? "")
  const [autoSplit, setAutoSplit] = useState(movement.auto_split ?? false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [existingReceipt, setExistingReceipt] = useState(movement.receipt_url || "")
  const [coversOther, setCoversOther] = useState(!!(movement.covers_usd && movement.covers_usd > 0))
  const [coversAmt, setCoversAmt] = useState(movement.covers_usd ? String(movement.covers_usd) : "")
  const [coversTc, setCoversTc] = useState(movement.covers_tc ? String(movement.covers_tc) : "")
  // Desglose
  const [desglosar, setDesglosar] = useState(false)
  const [desgloseLines, setDesgloseLines] = useState<{ accountId: string; providerId: string; amount: string }[]>([])

  const editAmount = parseFloat(amt) || 0
  const accounts = data.accounts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let receiptUrl = existingReceipt || null
    let receiptPath = movement.receipt_path || null
    if (receiptFile) {
      const result = await uploadFile("documents", `receipts/edit/${Date.now()}_${receiptFile.name}`, receiptFile)
      if (result) { receiptUrl = result.url; receiptPath = result.path }
    }

    // Desglose: líneas con proveedor → egreso, sin proveedor → ganancia (impacta cuenta + finanzas personales)
    if (desglosar && desgloseLines.length > 0 && type === "ingreso") {
      for (const line of desgloseLines) {
        const lineAmt = parseFloat(line.amount) || 0
        if (lineAmt <= 0) continue
        const lineAcct = line.accountId ? accounts.find(a => a.id === line.accountId) : null
        const lineProv = line.providerId ? data.providers.find(p => p.id === line.providerId) : null

        if (line.providerId) {
          // Con proveedor → EGRESO al proveedor
          const destLabel = [lineAcct?.name, lineProv?.name].filter(Boolean).join(" / ") || "sin destino"
          await addMovement({
            id: generateId(), date, description: `[Desglose pago] ${desc} → ${destLabel}`,
            amount: lineAmt, type: "egreso" as const, project_id: projId || null,
            account_id: line.accountId || null, provider_id: line.providerId,
            category: "Desglose proveedor", auto_split: false, split_percentage: 0,
            concepto: concepto || null, medio_pago: currency === "USD" ? "USD" : null,
          } as Movement)
        } else {
          // Sin proveedor → GANANCIA: ingreso a la cuenta + finanzas personales
          const projName = data.projects.find(p => p.id === projId)?.name || ""
          await addMovement({
            id: generateId(), date, description: `[Ganancia] ${desc} → ${lineAcct?.name || "sin cuenta"}`,
            amount: lineAmt, type: "ingreso" as const, project_id: projId || null,
            account_id: line.accountId || null, provider_id: null,
            category: "Ganancia desglose", auto_split: false, split_percentage: 0,
            concepto: concepto || null, medio_pago: currency === "USD" ? "USD" : null,
          } as Movement)
          if (lineAcct?.owner && lineAcct.owner !== "nitia") {
            await addRow("personal_finance_movements", {
              id: generateId(), owner: lineAcct.owner, date,
              description: `[Ganancia] ${desc}${projName ? ` — ${projName}` : ""}`,
              amount: lineAmt, type: "ingreso", category: "Ingreso Nitia", is_fixed: false, active: true,
              medio_pago: currency === "USD" ? "USD" : null, created_by: lineAcct.owner,
            } as any, "personalFinanceMovements")
          }
        }
      }
    }

    onSave({
      date, description: desc, amount: editAmount, type,
      account_id: aid || null, provider_id: pid || null, project_id: projId || null,
      medio_pago: currency === "USD" ? "USD" : null,
      concepto: concepto || null,
      auto_split: type === "ingreso" ? autoSplit : false,
      receipt_url: receiptUrl, receipt_path: receiptPath,
      covers_usd: coversOther ? (parseFloat(coversAmt) || null) : null,
      covers_tc: coversOther ? (parseFloat(coversTc) || null) : null,
    })
  }

  return (<Modal isOpen={true} title="Editar Movimiento" onClose={onClose} size="lg">
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)} options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
      </div>
      <FormInput label="Descripción" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-4">
        <FormMoneyInput label="Monto" value={amt} onChange={setAmt} />
        <FormSelect label="Cuenta" value={aid} onChange={setAid}
          options={[{ value: "", label: "Sin cuenta" }, ...accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type === "dolares" ? "Dólares" : "Pesos"})` }))]} />
      </div>
      <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
        <button type="button" onClick={() => setCurrency("ARS")} className={`px-4 py-1.5 text-sm font-medium ${currency === "ARS" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>$ ARS</button>
        <button type="button" onClick={() => setCurrency("USD")} className={`px-4 py-1.5 text-sm font-medium ${currency === "USD" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A]"}`}>U$D</button>
      </div>
      {/* Cobertura otra moneda */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${coversOther ? "bg-blue-50" : "bg-[#F7F5ED]"}`}>
        <input type="checkbox" checked={coversOther} onChange={e => { setCoversOther(e.target.checked); if (!e.target.checked) setCoversAmt("") }} className="w-4 h-4" />
        <p className={`text-sm font-medium ${coversOther ? "text-blue-800" : "text-muted-foreground"}`}>
          Cubre presupuesto en {currency === "ARS" ? "U$D" : "$ ARS"}
        </p>
      </div>
      {coversOther && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-blue-700 block mb-1">{currency === "ARS" ? "U$D que cubre" : "$ ARS que cubre"}</label>
              <input type="number" value={coversAmt} onChange={e => {
                setCoversAmt(e.target.value)
                const v = parseFloat(e.target.value) || 0
                if (v > 0 && editAmount > 0) setCoversTc(String(currency === "ARS" ? +(editAmount / v).toFixed(2) : +(v / editAmount).toFixed(2)))
              }} className="w-full px-3 py-1.5 rounded border border-blue-200 text-sm bg-white" inputMode="decimal" />
            </div>
            <div>
              <label className="text-xs font-medium text-blue-700 block mb-1">TC</label>
              <input type="number" value={coversTc} onChange={e => {
                setCoversTc(e.target.value)
                const tc = parseFloat(e.target.value) || 0
                if (tc > 0 && editAmount > 0) setCoversAmt(String(currency === "ARS" ? +(editAmount / tc).toFixed(2) : +(editAmount * tc).toFixed(0)))
              }} className="w-full px-3 py-1.5 rounded border border-blue-200 text-sm bg-white" inputMode="decimal" />
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Concepto" value={concepto} onChange={setConcepto}
          options={[{ value: "", label: "Sin especificar" }, { value: "mano_de_obra", label: "Mano de obra" }, { value: "mobiliario", label: "Mobiliario" }, { value: "material", label: "Materiales" }, { value: "honorarios", label: "Honorarios" }, { value: "varios", label: "Varios" }, { value: "seña", label: "Seña" }]} />
        <FormSelect label="Proyecto" value={projId} onChange={setProjId}
          options={[{ value: "", label: "Sin proyecto" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
      </div>
      {type === "egreso" && (
        <FormSelect label="Proveedor" value={pid} onChange={setPid}
          options={[{ value: "", label: "Sin proveedor" }, ...data.providers.map(p => ({ value: p.id, label: p.name }))]} />
      )}
      {type === "ingreso" && (<>
        <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
          <input type="checkbox" checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} className="w-4 h-4" />
          <p className="text-sm font-medium text-green-800">Distribuir 50/50 entre socias</p>
        </div>
        {/* Desglose */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${desglosar ? "bg-orange-50" : "bg-[#F7F5ED]"}`}>
          <input type="checkbox" checked={desglosar} onChange={e => { setDesglosar(e.target.checked); if (!e.target.checked) setDesgloseLines([]) }} className="w-4 h-4" />
          <div>
            <p className={`text-sm font-medium ${desglosar ? "text-orange-800" : "text-muted-foreground"}`}>Desglosar ingreso</p>
            {!desglosar && <p className="text-xs text-muted-foreground">Separar pago a proveedor y ganancia</p>}
          </div>
        </div>
        {desglosar && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
            <p className="text-[10px] text-orange-600 -mt-1">Con proveedor = pago (egreso) · Sin proveedor = ganancia socias</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-700">Monto total: <strong>{formatCurrency(editAmount)}</strong></p>
              <button type="button" onClick={() => {
                const paulaAcct = accounts.find(a => a.owner === "paula")
                const camiAcct = accounts.find(a => a.owner === "cami")
                if (paulaAcct && camiAcct) {
                  const half = String(Math.round(editAmount / 2))
                  setDesgloseLines([
                    { accountId: paulaAcct.id, providerId: "", amount: half },
                    { accountId: camiAcct.id, providerId: "", amount: half },
                  ])
                }
              }} className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded font-medium hover:bg-green-200">50/50 socias</button>
            </div>
            {desgloseLines.map((line, idx) => (
              <div key={idx} className="space-y-1.5 bg-white/60 rounded-lg p-2.5">
                <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                  <FormSelect label={idx === 0 ? "Cuenta" : ""} value={line.accountId} onChange={v => {
                    const lines = [...desgloseLines]; lines[idx].accountId = v; setDesgloseLines(lines)
                  }} options={[{ value: "", label: "Sin cuenta" }, ...accounts.map(a => ({ value: a.id, label: `${a.name}${a.type === "dolares" ? " (U$D)" : ""}` }))]} />
                  <FormMoneyInput label={idx === 0 ? "Monto" : ""} value={line.amount} onChange={v => {
                    const lines = [...desgloseLines]; lines[idx].amount = v; setDesgloseLines(lines)
                  }} />
                  <button type="button" onClick={() => setDesgloseLines(desgloseLines.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded mb-0.5">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><FormSelect label="" value={line.providerId} onChange={v => {
                    const lines = [...desgloseLines]; lines[idx].providerId = v; setDesgloseLines(lines)
                  }} options={[{ value: "", label: "Sin proveedor (ganancia)" }, ...data.providers.map(p => ({ value: p.id, label: p.name }))]} /></div>
                  {line.providerId
                    ? <span className="text-[10px] text-red-600 font-medium whitespace-nowrap">→ Egreso</span>
                    : <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">→ Ganancia</span>}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setDesgloseLines([...desgloseLines, { accountId: accounts[0]?.id ?? "", providerId: "", amount: "" }])}
              className="text-xs text-orange-700 font-medium hover:underline">+ Agregar línea</button>
            {(() => {
              const totalDesglose = desgloseLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
              const diff = editAmount - totalDesglose
              return totalDesglose > 0 && (
                <div className={`text-xs font-semibold ${Math.abs(diff) < 1 ? "text-green-700" : "text-red-600"}`}>
                  Asignado: {formatCurrency(totalDesglose)} {Math.abs(diff) >= 1 && `(${diff > 0 ? "falta" : "excede"}: ${formatCurrency(Math.abs(diff))})`}
                  {Math.abs(diff) < 1 && " ✓"}
                </div>
              )
            })()}
          </div>
        )}
      </>)}
      {/* Comprobante */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comprobante</label>
        {existingReceipt && !receiptFile && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
            {/\.(jpg|jpeg|png|gif|webp)$/i.test(existingReceipt)
              ? <img src={existingReceipt} alt="Comprobante" className="w-16 h-16 object-cover rounded" />
              : <span className="text-sm text-amber-700">📎 Comprobante adjunto</span>}
            <a href={existingReceipt} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-1">Ver</a>
            <button type="button" onClick={() => setExistingReceipt("")} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        )}
        {receiptFile ? (
          <div className="flex items-center gap-2 bg-[#F0EDE4] rounded-lg px-3 py-2">
            <span className="text-sm flex-1 truncate">{receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)</span>
            <button type="button" onClick={() => setReceiptFile(null)} className="text-xs text-red-600 hover:underline">Quitar</button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-[#E0DDD0] rounded-lg px-3 py-2.5 cursor-pointer hover:border-[#5F5A46] transition-colors">
            <span className="text-sm text-muted-foreground">{existingReceipt ? "Cambiar archivo..." : "Adjuntar archivo..."}</span>
            <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setReceiptFile(f) }} />
          </label>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-4"><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn type="submit" disabled={!desc || !amt}>Guardar</Btn></div>
    </form>
  </Modal>)
}
