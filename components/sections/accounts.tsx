"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatUSD, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { Stat, SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, PeriodFilter, type PeriodValue, EditableSelect, ConfirmDeleteModal } from "@/components/nitia-ui"
import type { Movement, Account } from "@/lib/types"
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Download, ArrowUpDown, X, ExternalLink, Filter, ChevronDown, ChevronUp } from "lucide-react"

// =================== MAIN COMPONENT ===================
export function Accounts() {
  const { data, addMovement, deleteMovement, updateRow, addRow, deleteRow, getCategoriesFor, addCategory, deleteCategory, setSection, setSelectedProjectId } = useApp()
  const dolarRate = data.dollarRate?.sell || null

  // UI state
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [period, setPeriod] = useState<PeriodValue>("mes")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAccount, setFilterAccount] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [filterProvider, setFilterProvider] = useState("")
  const [filterOrigin, setFilterOrigin] = useState("")
  const [sortField, setSortField] = useState<"date" | "amount">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Filtered & sorted movements
  const filtered = useMemo(() => {
    let items = [...data.movements]
    items = filterByDateRange(items, period, customStart, customEnd)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(m => m.description.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q))
    }
    if (filterAccount) items = items.filter(m => m.account_id === filterAccount)
    if (filterCategory) items = items.filter(m => m.category === filterCategory)
    if (filterType) items = items.filter(m => m.type === filterType)
    if (filterProject) items = items.filter(m => m.project_id === filterProject)
    if (filterProvider) items = items.filter(m => m.provider_id === filterProvider)
    if (filterOrigin === "costo_fijo") items = items.filter(m => m.description.startsWith("[Costo fijo Nitia]"))
    else if (filterOrigin === "proyecto") items = items.filter(m => m.project_id)
    else if (filterOrigin === "seña") items = items.filter(m => m.description.startsWith("[Seña") || m.description.startsWith("[Aporte propio seña]") || m.description.startsWith("[Diferencia seña]"))
    else if (filterOrigin === "manual") items = items.filter(m => !m.description.startsWith("["))
    items.sort((a, b) => {
      const va = sortField === "date" ? new Date(a.date).getTime() : a.amount
      const vb = sortField === "date" ? new Date(b.date).getTime() : b.amount
      return sortDir === "desc" ? vb - va : va - vb
    })
    return items
  }, [data.movements, period, customStart, customEnd, searchQuery, filterAccount, filterCategory, filterType, filterProject, filterProvider, filterOrigin, sortField, sortDir])

  const getAccountName = (id: string | null | undefined) => data.accounts.find(a => a.id === id)?.name ?? "—"
  const getAccountDisplay = (id: string | null | undefined) => {
    const a = data.accounts.find(a => a.id === id)
    if (!a) return { name: "—", isUSD: false }
    return { name: a.name, isUSD: a.type === "dolares" }
  }
  const getProjectName = (id: string | null | undefined) => data.projects.find(p => p.id === id)?.name ?? ""
  const getProviderName = (id: string | null | undefined) => data.providers.find(p => p.id === id)?.name ?? ""

  // Balance calculations
  const pesoAccounts = data.accounts.filter(a => a.type !== "dolares")
  const usdAccounts = data.accounts.filter(a => a.type === "dolares")
  const totalPesos = pesoAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalUSD = usdAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalEstimado = totalPesos + (dolarRate ? totalUSD * dolarRate : 0)
  const hasActiveFilters = filterAccount || filterCategory || filterType || filterProject || filterProvider || filterOrigin
  const categories = [...new Set(data.movements.map(m => m.category).filter(Boolean))]

  const clearFilters = () => {
    setFilterAccount(""); setFilterCategory(""); setFilterType("")
    setFilterProject(""); setFilterProvider(""); setFilterOrigin(""); setSearchQuery("")
  }

  // XLSX export
  const handleExportXLSX = async () => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const movData = filtered.map(m => ({
        Fecha: m.date,
        Descripción: m.description,
        Tipo: m.type === "ingreso" ? "Ingreso" : "Egreso",
        Monto: m.amount,
        Cuenta: getAccountName(m.account_id),
        Categoría: m.category || "",
        Proyecto: getProjectName(m.project_id),
        Proveedor: getProviderName(m.provider_id),
        "Medio de pago": m.medio_pago || "",
      }))
      const ws = XLSX.utils.json_to_sheet(movData)
      ws["!cols"] = Object.keys(movData[0] || {}).map(k => ({ wch: Math.min(Math.max(k.length, 12), 30) }))
      XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
      // Accounts sheet
      const accData = data.accounts.map(a => ({
        Nombre: a.name, Tipo: a.type || "", Saldo: a.balance,
        ...(a.type === "dolares" && dolarRate ? { "Estimado ARS": a.balance * dolarRate } : {})
      }))
      const ws2 = XLSX.utils.json_to_sheet(accData)
      XLSX.utils.book_append_sheet(wb, ws2, "Cuentas")
      XLSX.writeFile(wb, `cuentas_movimientos_${today()}.xlsx`)
    } catch { /* fallback already in export-utils */ }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Cuentas</h1>
          <p className="text-sm text-[#76746A] mt-1">Gestión de cuentas y movimientos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} onCustomRange={(s, e) => { setCustomStart(s); setCustomEnd(e) }} />
          <Btn variant="ghost" size="sm" onClick={handleExportXLSX}><Download size={14} className="mr-1 inline" />Excel</Btn>
          <Btn variant="soft" size="sm" onClick={() => setShowNewAccount(true)}><Plus size={14} className="mr-1 inline" />Cuenta</Btn>
          <Btn size="sm" onClick={() => setShowNewMovement(true)}><Plus size={14} className="mr-1 inline" />Movimiento</Btn>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.accounts.map(account => {
          const isUSD = account.type === "dolares"
          return (
            <div key={account.id} className="bg-card border border-border rounded-xl p-4 group relative">
              <button onClick={() => setEditingAccount(account)}
                className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 hover:bg-accent rounded transition-all">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || "#5F5A46" }} />
                <span className="text-sm font-medium truncate">{account.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${isUSD ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{isUSD ? "USD" : "ARS"}</span>
              </div>
              <p className="text-xl sm:text-2xl font-medium tracking-tight">
                {isUSD ? formatUSD(account.balance) : formatCurrency(account.balance)}
              </p>
              {isUSD && dolarRate && (
                <p className="text-xs text-muted-foreground mt-1">≈ {formatCurrency(account.balance * dolarRate)} <span className="text-[10px]">(blue ${dolarRate})</span></p>
              )}
            </div>
          )
        })}
        {/* Total */}
        <div className="bg-[#5F5A46] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <span className="text-sm font-medium text-white/70">Total en pesos</span>
          </div>
          <p className="text-xl sm:text-2xl font-medium text-white tracking-tight">{formatCurrency(totalPesos)}</p>
          {totalUSD > 0 && (
            <>
              <p className="text-sm text-white/70 mt-1">{formatUSD(totalUSD)}</p>
              {dolarRate && <p className="text-xs text-white/50 mt-0.5">Total estimado: {formatCurrency(totalEstimado)}</p>}
            </>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por descripción o categoría..."
              className="w-full px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white pr-8" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <Btn variant={hasActiveFilters ? "primary" : "ghost"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} className="mr-1 inline" />{hasActiveFilters ? "Filtros ●" : "Más filtros"}
          </Btn>
        </div>

        {/* Quick origin filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "", label: "Todos" },
            { value: "costo_fijo", label: "Costos fijos Nitia" },
            { value: "proyecto", label: "De proyectos" },
            { value: "seña", label: "Señas" },
            { value: "manual", label: "Manuales" },
          ].map(o => (
            <button key={o.value} onClick={() => setFilterOrigin(o.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterOrigin === o.value ? "bg-[#5F5A46] text-white border-[#5F5A46]" : "bg-white border-[#E0DDD0] text-[#76746A] hover:border-[#5F5A46]"}`}>
              {o.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="bg-[#F7F5ED] rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FormSelect label="Cuenta" value={filterAccount} onChange={setFilterAccount}
              options={[{ value: "", label: "Todas" }, ...data.accounts.map(a => ({ value: a.id, label: a.name }))]} />
            <FormSelect label="Tipo" value={filterType} onChange={setFilterType}
              options={[{ value: "", label: "Todos" }, { value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
            <FormSelect label="Categoría" value={filterCategory} onChange={setFilterCategory}
              options={[{ value: "", label: "Todas" }, ...categories.map(c => ({ value: c as string, label: c as string }))]} />
            <FormSelect label="Proyecto" value={filterProject} onChange={setFilterProject}
              options={[{ value: "", label: "Todos" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
            <FormSelect label="Proveedor" value={filterProvider} onChange={setFilterProvider}
              options={[{ value: "", label: "Todos" }, ...data.providers.map(p => ({ value: p.id, label: p.name }))]} />
            {hasActiveFilters && (
              <div className="col-span-full">
                <Btn variant="ghost" size="sm" onClick={clearFilters}><X size={12} className="mr-1 inline" />Limpiar filtros</Btn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
          <SecHead title={`Movimientos (${filtered.length})`} />
          <div className="flex items-center gap-2">
            <button onClick={() => { setSortField("date"); setSortDir(d => d === "desc" ? "asc" : "desc") }}
              className={`text-xs px-2 py-1 rounded ${sortField === "date" ? "bg-[#5F5A46] text-white" : "bg-[#F0EDE4]"}`}>
              Fecha {sortField === "date" && (sortDir === "desc" ? "↓" : "↑")}
            </button>
            <button onClick={() => { setSortField("amount"); setSortDir(d => d === "desc" ? "asc" : "desc") }}
              className={`text-xs px-2 py-1 rounded ${sortField === "amount" ? "bg-[#5F5A46] text-white" : "bg-[#F0EDE4]"}`}>
              Monto {sortField === "amount" && (sortDir === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0EDE4] border-b border-border hidden sm:table-header-group">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-xs w-20">Fecha</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs">Descripción</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs w-28">Cuenta</th>
                <th className="px-3 py-2.5 text-right font-medium text-xs w-32">Importe</th>
                <th className="px-3 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mov => {
                const acct = data.accounts.find(a => a.id === mov.account_id)
                const isUSD = mov.medio_pago === "USD" || acct?.type === "dolares"
                const projName = getProjectName(mov.project_id)
                const providerName = getProviderName(mov.provider_id)
                const medioPagoLabel: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transf.", cheque: "Cheque", tarjeta: "Tarjeta", mercadopago: "MP", USD: "Dólares" }
                return (
                  <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9] flex flex-col sm:table-row p-3 sm:p-0">
                    <td className="px-3 py-1 sm:py-2.5 text-[#76746A] text-xs">
                      {formatDate(mov.date)}
                    </td>
                    <td className="px-3 py-1 sm:py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          mov.type === "ingreso" ? "bg-green-50" : "bg-red-50"}`}>
                          {mov.type === "ingreso" ? <ArrowDownLeft size={10} className="text-green-600" /> : <ArrowUpRight size={10} className="text-red-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm truncate block">{mov.description}</span>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {providerName && <span className="text-[10px] text-[#76746A]">Prov: {providerName}</span>}
                            {providerName && (projName || mov.category) && <span className="text-[10px] text-[#76746A]">·</span>}
                            {projName && mov.project_id && <button onClick={() => { setSelectedProjectId(mov.project_id!); setSection("projects") }} className="text-[10px] text-[#5F5A46] font-medium hover:underline">{projName}</button>}
                            {projName && mov.category && <span className="text-[10px] text-[#76746A]">·</span>}
                            {mov.category && <span className="text-[10px] px-1 py-0 bg-[#F0EDE4] text-[#76746A] rounded">{mov.category}</span>}
                            {mov.medio_pago && mov.medio_pago !== "USD" && <span className="text-[10px] text-[#76746A]">· {medioPagoLabel[mov.medio_pago] || mov.medio_pago}</span>}
                            {mov.receipt_url && <a href={mov.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" onClick={e => e.stopPropagation()}>📎</a>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1 sm:py-2.5 text-xs">
                      {acct ? (
                        <div>
                          <span className="block text-[#1C1A12] truncate">{acct.name}</span>
                          <span className={`text-[10px] font-medium ${acct.type === "dolares" ? "text-blue-600" : "text-[#76746A]"}`}>
                            {acct.type === "dolares" ? "Dólares" : "Pesos"}
                          </span>
                        </div>
                      ) : <span className="text-[#76746A]">—</span>}
                    </td>
                    <td className="px-3 py-1 sm:py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`font-semibold ${mov.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                          {mov.type === "ingreso" ? "+" : "-"}{isUSD ? formatUSD(mov.amount) : formatCurrency(mov.amount)}
                        </span>
                        <span className={`text-[9px] font-bold px-1 py-0 rounded ${isUSD ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                          {isUSD ? "USD" : "ARS"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1 sm:py-2.5">
                      <div className="flex gap-0.5 justify-end">
                        <button onClick={() => setEditingMovement(mov)}
                          className="p-1 text-[#76746A] hover:text-[#5F5A46] hover:bg-accent rounded transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteMovement(mov.id)}
                          className="p-1 text-[#76746A] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <Empty title="Sin movimientos" description="Registrá tu primer movimiento o ajustá los filtros" />}
      </div>

      {/* Modals */}
      {showNewMovement && (
        <MovementModal
          accounts={data.accounts} projects={data.projects} providers={data.providers}
          categories={getCategoriesFor("movimiento_cuenta")}
          onAddCategory={n => addCategory("movimiento_cuenta", n)}
          onDeleteCategory={deleteCategory}
          onClose={() => setShowNewMovement(false)}
          onSave={async (mov) => { await addMovement(mov); setShowNewMovement(false) }}
        />
      )}

      {editingMovement && (
        <MovementModal
          movement={editingMovement}
          accounts={data.accounts} projects={data.projects} providers={data.providers}
          categories={getCategoriesFor("movimiento_cuenta")}
          onAddCategory={n => addCategory("movimiento_cuenta", n)}
          onDeleteCategory={deleteCategory}
          onClose={() => setEditingMovement(null)}
          onSave={async (mov) => {
            await updateRow("movements", mov.id, mov, "movements")
            setEditingMovement(null)
          }}
        />
      )}

      {(showNewAccount || editingAccount) && (
        <AccountModal
          account={editingAccount}
          onClose={() => { setShowNewAccount(false); setEditingAccount(null) }}
          onSave={async (acc) => {
            if (editingAccount) await updateRow("accounts", acc.id, acc, "accounts")
            else await addRow("accounts", acc, "accounts")
            setShowNewAccount(false); setEditingAccount(null)
          }}
          onDelete={editingAccount ? async () => {
            await deleteRow("accounts", editingAccount.id, "accounts")
            setEditingAccount(null)
          } : undefined}
        />
      )}
    </div>
  )
}

// =================== MOVEMENT MODAL (create + edit) ===================
function MovementModal({ movement, accounts, projects, providers, categories, onAddCategory, onDeleteCategory, onClose, onSave }: {
  movement?: Movement | null
  accounts: Account[]; projects: any[]; providers: any[]
  categories: { id: string; name: string }[]
  onAddCategory: (n: string) => void; onDeleteCategory: (n: string) => void
  onClose: () => void; onSave: (m: Movement) => void
}) {
  const { data } = useApp()
  const dolarRate = data.dollarRate
  const [accountId, setAccountId] = useState(movement?.account_id ?? accounts[0]?.id ?? "")
  const [date, setDate] = useState(movement?.date ?? today())
  const [description, setDescription] = useState(movement?.description ?? "")
  const [amount, setAmount] = useState(movement ? String(movement.amount) : "")
  const [type, setType] = useState<"ingreso" | "egreso">(movement?.type ?? "egreso")
  const [category, setCategory] = useState(movement?.category ?? "")
  const [projectId, setProjectId] = useState(movement?.project_id ?? "")
  const [providerId, setProviderId] = useState(movement?.provider_id ?? "")
  const [medioPago, setMedioPago] = useState(movement?.medio_pago ?? "")
  const [autoSplit, setAutoSplit] = useState(movement?.auto_split ?? false)
  const [tcBlue, setTcBlue] = useState(String(dolarRate?.sell || ""))

  // Currency mismatch detection
  const selectedAccount = accounts.find(a => a.id === accountId)
  const isPaymentUSD = medioPago === "USD"
  const isAccountUSD = selectedAccount?.type === "dolares"
  const hasMismatch = accountId && medioPago && ((isPaymentUSD && !isAccountUSD) || (!isPaymentUSD && isAccountUSD))
  const tcNum = parseFloat(tcBlue) || 0
  const amtNum = parseFloat(amount) || 0
  const convertedAmount = hasMismatch && tcNum > 0 ? (isPaymentUSD ? amtNum * tcNum : amtNum / tcNum) : 0

  return (
    <Modal isOpen={true} title={movement ? "Editar Movimiento" : "Nuevo Movimiento"} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault()
        // If currency mismatch, debit the converted amount in account's currency
        const finalAmount = hasMismatch && tcNum > 0 ? convertedAmount : parseFloat(amount)
        const finalMedioPago = hasMismatch ? (isAccountUSD ? "USD" : null) : (medioPago || null)
        onSave({
          id: movement?.id ?? generateId(), date, description,
          amount: finalAmount, type, category: category || null,
          account_id: accountId || null, project_id: projectId || null,
          provider_id: providerId || null, medio_pago: finalMedioPago,
          auto_split: type === "ingreso" ? autoSplit : false,
          split_percentage: 50,
          created_at: movement?.created_at ?? new Date().toISOString(),
        })
      }} className="space-y-4">
        <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
          options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.type === "dolares" ? "Dólares" : "Pesos"})` }))} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
        </div>
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label={`Monto${isPaymentUSD ? " (U$D)" : medioPago ? " ($)" : ""}`} type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
            onAddNew={onAddCategory} onDelete={onDeleteCategory} />
        </div>
        <FormSelect label="Proyecto (opcional)" value={projectId || ""} onChange={setProjectId}
          options={[{ value: "", label: "Sin proyecto" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
        <FormSelect label="Proveedor (opcional)" value={providerId || ""} onChange={setProviderId}
          options={[{ value: "", label: "Sin proveedor" }, ...providers.map(p => ({ value: p.id, label: p.name }))]} />
        <FormSelect label="Medio de pago" value={medioPago || ""} onChange={setMedioPago}
          options={[{ value: "", label: "—" }, { value: "efectivo", label: "Efectivo" }, { value: "transferencia", label: "Transferencia" },
            { value: "cheque", label: "Cheque" }, { value: "tarjeta", label: "Tarjeta" }, { value: "mercadopago", label: "Mercado Pago" }, { value: "USD", label: "Dólares (U$D)" }]} />
        {/* Currency mismatch: show TC blue conversion */}
        {hasMismatch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-blue-800">
              ⚠️ Moneda distinta a la cuenta ({isAccountUSD ? "Dólares" : "Pesos"})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="TC Blue (Infobae)" type="number" value={tcBlue} onChange={setTcBlue} inputMode="decimal" />
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-1">Se debitará</label>
                <p className="text-base font-bold text-blue-900">
                  {isAccountUSD ? formatUSD(convertedAmount) : formatCurrency(convertedAmount)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-blue-600">
              {isPaymentUSD
                ? `U$D ${amtNum.toLocaleString("es-AR")} × $${tcNum.toLocaleString("es-AR")} = ${formatCurrency(convertedAmount)}`
                : `$${amtNum.toLocaleString("es-AR")} ÷ $${tcNum.toLocaleString("es-AR")} = U$D ${convertedAmount.toFixed(2)}`
              }
            </p>
          </div>
        )}
        {type === "ingreso" && (
          <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
            <input type="checkbox" checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-green-800">Distribuir 50/50 a socias</p>
              <p className="text-xs text-green-600">Se calculará en Finanzas Personales</p>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount || !accountId}>{movement ? "Guardar" : "Agregar"}</Btn>
        </div>
      </form>
    </Modal>
  )
}

// =================== ACCOUNT MODAL ===================
function AccountModal({ account, onClose, onSave, onDelete }: {
  account: Account | null; onClose: () => void
  onSave: (a: Account) => void; onDelete?: () => void
}) {
  const [name, setName] = useState(account?.name ?? "")
  const [type, setType] = useState(account?.type ?? "banco")
  const [balance, setBalance] = useState(String(account?.balance ?? "0"))
  const [color, setColor] = useState(account?.color ?? "#5F5A46")

  return (
    <Modal isOpen={true} title={account ? "Editar Cuenta" : "Nueva Cuenta"} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault()
        onSave({ id: account?.id ?? generateId(), name, type, balance: parseFloat(balance) || 0, color })
      }} className="space-y-4">
        <FormInput label="Nombre" value={name} onChange={setName} placeholder="Ej: Cuenta Santander" />
        {/* Moneda */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Moneda de la cuenta</label>
          <div className="flex rounded-lg border border-[#E0DDD0] overflow-hidden">
            <button type="button" onClick={() => { if (type === "dolares") setType("banco") }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${type !== "dolares" ? "bg-[#5F5A46] text-white" : "bg-white text-[#76746A] hover:bg-[#F0EDE4]"}`}>
              $ Pesos (ARS)
            </button>
            <button type="button" onClick={() => setType("dolares")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${type === "dolares" ? "bg-blue-600 text-white" : "bg-white text-[#76746A] hover:bg-[#F0EDE4]"}`}>
              U$D Dólares
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {type !== "dolares" ? (
            <FormSelect label="Tipo" value={type || ""} onChange={setType}
              options={[
                { value: "banco", label: "Banco" }, { value: "efectivo", label: "Efectivo" },
                { value: "mercadopago", label: "Mercado Pago" }, { value: "otro", label: "Otro" },
              ]} />
          ) : (
            <FormSelect label="Tipo" value="dolares" onChange={() => {}}
              options={[{ value: "dolares", label: "Cuenta en dólares" }]} />
          )}
          <FormInput label={type === "dolares" ? "Saldo (U$D)" : "Saldo ($)"} type="number" value={balance} onChange={setBalance} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
        </div>
        <div className="flex justify-between pt-4">
          {onDelete && <Btn variant="danger" onClick={onDelete}>Eliminar</Btn>}
          <div className="flex gap-3 ml-auto">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" disabled={!name}>{account ? "Guardar" : "Crear"}</Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}
