"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatUSD, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { Stat, SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, PeriodFilter, type PeriodValue, EditableSelect, ConfirmDeleteModal } from "@/components/nitia-ui"
import type { Movement, Account } from "@/lib/types"
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Download, ArrowUpDown, X, ExternalLink, Filter, ChevronDown, ChevronUp } from "lucide-react"

// =================== MAIN COMPONENT ===================
export function Accounts() {
  const { data, addMovement, deleteMovement, updateRow, addRow, deleteRow, getCategoriesFor, addCategory, deleteCategory } = useApp()
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
    items.sort((a, b) => {
      const va = sortField === "date" ? new Date(a.date).getTime() : a.amount
      const vb = sortField === "date" ? new Date(b.date).getTime() : b.amount
      return sortDir === "desc" ? vb - va : va - vb
    })
    return items
  }, [data.movements, period, customStart, customEnd, searchQuery, filterAccount, filterCategory, filterType, filterProject, filterProvider, sortField, sortDir])

  const getAccountName = (id: string | null | undefined) => data.accounts.find(a => a.id === id)?.name ?? "—"
  const getProjectName = (id: string | null | undefined) => data.projects.find(p => p.id === id)?.name ?? ""
  const getProviderName = (id: string | null | undefined) => data.providers.find(p => p.id === id)?.name ?? ""

  // Balance calculations
  const pesoAccounts = data.accounts.filter(a => a.type !== "dolares")
  const usdAccounts = data.accounts.filter(a => a.type === "dolares")
  const totalPesos = pesoAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalUSD = usdAccounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalEstimado = totalPesos + (dolarRate ? totalUSD * dolarRate : 0)
  const hasActiveFilters = filterAccount || filterCategory || filterType || filterProject || filterProvider
  const categories = [...new Set(data.movements.map(m => m.category).filter(Boolean))]

  const clearFilters = () => {
    setFilterAccount(""); setFilterCategory(""); setFilterType("")
    setFilterProject(""); setFilterProvider(""); setSearchQuery("")
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
            <Filter size={14} className="mr-1 inline" />Filtros{hasActiveFilters ? " ●" : ""}
          </Btn>
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
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-left font-medium">Cuenta</th>
                <th className="px-4 py-3 text-left font-medium">Categoría</th>
                <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mov => {
                const acct = data.accounts.find(a => a.id === mov.account_id)
                const isUSD = acct?.type === "dolares"
                const projName = getProjectName(mov.project_id)
                return (
                  <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9] flex flex-col sm:table-row p-3 sm:p-0">
                    {/* Mobile: stacked layout */}
                    <td className="px-4 py-1 sm:py-3 text-[#76746A] text-xs sm:text-sm">
                      <span className="sm:hidden font-medium text-foreground mr-2">📅</span>
                      {formatDate(mov.date)}
                    </td>
                    <td className="px-4 py-1 sm:py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                          mov.type === "ingreso" ? "bg-green-50" : "bg-red-50"}`}>
                          {mov.type === "ingreso" ? <ArrowDownLeft size={12} className="text-green-600" /> : <ArrowUpRight size={12} className="text-red-600" />}
                        </div>
                        <span className="truncate">{mov.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1 sm:py-3 text-[#76746A] text-xs sm:text-sm">
                      {getAccountName(mov.account_id)}
                    </td>
                    <td className="px-4 py-1 sm:py-3">{mov.category && <Tag label={mov.category} color="gray" />}</td>
                    <td className="px-4 py-1 sm:py-3">
                      {projName && (
                        <button onClick={() => { /* navigate to project */ }}
                          className="text-xs text-[#5F5A46] hover:underline flex items-center gap-1">
                          {projName}<ExternalLink size={10} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-1 sm:py-3 text-right">
                      <span className={`font-medium ${mov.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                        {mov.type === "ingreso" ? "+" : "-"}{isUSD ? formatUSD(mov.amount) : formatCurrency(mov.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-1 sm:py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditingMovement(mov)}
                          className="p-1.5 text-[#76746A] hover:text-[#5F5A46] hover:bg-accent rounded transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteMovement(mov.id)}
                          className="p-1.5 text-[#76746A] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
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

  return (
    <Modal isOpen={true} title={movement ? "Editar Movimiento" : "Nuevo Movimiento"} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault()
        onSave({
          id: movement?.id ?? generateId(), date, description,
          amount: parseFloat(amount), type, category: category || null,
          account_id: accountId || null, project_id: projectId || null,
          provider_id: providerId || null, medio_pago: medioPago || null,
          auto_split: type === "ingreso" ? autoSplit : false,
          split_percentage: 50,
          created_at: movement?.created_at ?? new Date().toISOString(),
        })
      }} className="space-y-4">
        <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
          options={accounts.map(a => ({ value: a.id, label: `${a.name}${a.type === "dolares" ? " (U$D)" : ""}` }))} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
        </div>
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Monto" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
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
        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Tipo" value={type || ""} onChange={setType}
            options={[
              { value: "banco", label: "Banco" }, { value: "efectivo", label: "Efectivo" },
              { value: "mercadopago", label: "Mercado Pago" }, { value: "dolares", label: "Dólares (U$D)" },
              { value: "otro", label: "Otro" },
            ]} />
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
