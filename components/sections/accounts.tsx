"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { Stat, SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, PeriodFilter, type PeriodValue } from "@/components/nitia-ui"
import type { Movement, Account } from "@/lib/types"
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Pencil } from "lucide-react"

export function Accounts() {
  const { data, addMovement, deleteMovement, addRow, updateRow, deleteRow } = useApp()
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [period, setPeriod] = useState<PeriodValue>("mes")
  const [searchQuery, setSearchQuery] = useState("")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  // Filter movements by account (all movements that have an account_id)
  const accountMovements = data.movements.filter(m => m.account_id)
  const filtered = filterByDateRange(accountMovements, period, customStart, customEnd)
    .filter(m => !searchQuery ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getAccountName = (id: string | null | undefined) =>
    data.accounts.find(a => a.id === id)?.name ?? "—"

  const totalBalance = data.accounts.reduce((s, a) => s + (a.balance || 0), 0)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Cuentas</h1>
          <p className="text-sm text-[#76746A] mt-1">Gesti{"\u00f3"}n de cuentas y movimientos del estudio</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodFilter value={period} onChange={setPeriod}
            onCustomRange={(s, e) => { setCustomStart(s); setCustomEnd(e) }} />
          <Btn variant="soft" size="sm" onClick={() => setShowNewAccount(true)}>
            <Plus size={14} className="mr-1 inline" />Cuenta
          </Btn>
          <Btn onClick={() => setShowNewMovement(true)}>
            <Plus size={14} className="mr-1 inline" />Movimiento
          </Btn>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {data.accounts.map(account => (
          <div key={account.id} className="bg-card border border-border rounded-xl p-5 group relative">
            <button onClick={() => setEditingAccount(account)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all">
              <Pencil size={14} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: account.color || "#5F5A46" }} />
              <span className="text-sm font-medium">{account.name}</span>
              {account.type && <Tag label={account.type} color="gray" />}
            </div>
            <p className="text-2xl font-medium text-foreground tracking-tight">{formatCurrency(account.balance)}</p>
          </div>
        ))}
        <div className="bg-[#5F5A46] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 rounded-full bg-white/30" />
            <span className="text-sm font-medium text-white/70">Total</span>
          </div>
          <p className="text-2xl font-medium text-white tracking-tight">{formatCurrency(totalBalance)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder={"Buscar movimientos por descripci\u00f3n o categor\u00eda..."}
          className="w-full px-4 py-2 rounded-lg border border-[#E0DDD0] text-sm bg-white" />
      </div>

      {/* Movements Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <SecHead title={`Movimientos (${filtered.length})`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0EDE4] border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Descripci{"\u00f3"}n</th>
                <th className="px-4 py-3 text-left font-medium">Cuenta</th>
                <th className="px-4 py-3 text-left font-medium">Categor{"\u00ed"}a</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mov => (
                <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 text-[#76746A]">{formatDate(mov.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                        mov.type === "ingreso" ? "bg-green-50" : "bg-red-50"}`}>
                        {mov.type === "ingreso" ? <ArrowDownLeft size={12} className="text-green-600" /> : <ArrowUpRight size={12} className="text-red-600" />}
                      </div>
                      {mov.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#76746A]">{getAccountName(mov.account_id)}</td>
                  <td className="px-4 py-3">{mov.category && <Tag label={mov.category} color="gray" />}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${mov.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                      {mov.type === "ingreso" ? "+" : "-"}{formatCurrency(mov.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteMovement(mov.id)}
                      className="p-1.5 text-[#76746A] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <Empty title="Sin movimientos" description="Registr\u00e1 tu primer movimiento" />}
      </div>

      {/* New Movement Modal */}
      {showNewMovement && (
        <NewMovementModal
          accounts={data.accounts}
          projects={data.projects}
          providers={data.providers}
          onClose={() => setShowNewMovement(false)}
          onSave={async (mov) => { await addMovement(mov); setShowNewMovement(false) }}
        />
      )}

      {/* New/Edit Account Modal */}
      {(showNewAccount || editingAccount) && (
        <AccountModal
          account={editingAccount}
          onClose={() => { setShowNewAccount(false); setEditingAccount(null) }}
          onSave={async (acc) => {
            if (editingAccount) {
              await updateRow("accounts", acc.id, acc, "accounts")
            } else {
              await addRow("accounts", acc, "accounts")
            }
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

function NewMovementModal({ accounts, projects, providers, onClose, onSave }: {
  accounts: Account[]; projects: any[]; providers: any[]
  onClose: () => void; onSave: (m: Movement) => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso")
  const [category, setCategory] = useState("")
  const [projectId, setProjectId] = useState("")
  const [providerId, setProviderId] = useState("")
  const [medioPago, setMedioPago] = useState("")

  return (
    <Modal isOpen={true} title="Nuevo Movimiento" onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault()
        onSave({
          id: generateId(), date, description,
          amount: parseFloat(amount), type, category: category || null,
          account_id: accountId || null, project_id: projectId || null,
          provider_id: providerId || null, medio_pago: medioPago || null,
          created_at: new Date().toISOString(),
        })
      }} className="space-y-4">
        <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
          options={accounts.map(a => ({ value: a.id, label: a.name }))} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
        </div>
        <FormInput label="Descripci\u00f3n" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Importe" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <FormSelect label="Categor\u00eda" value={category} onChange={setCategory}
            options={[
              { value: "Proyecto", label: "Proyecto" }, { value: "Honorarios", label: "Honorarios" },
              { value: "Proveedor", label: "Proveedor" }, { value: "Gastos fijos", label: "Gastos fijos" },
              { value: "Varios", label: "Varios" },
            ]} />
        </div>
        {category === "Proyecto" && (
          <FormSelect label="Proyecto" value={projectId} onChange={setProjectId}
            options={projects.map(p => ({ value: p.id, label: p.name }))} />
        )}
        {category === "Proveedor" && (
          <FormSelect label="Proveedor" value={providerId} onChange={setProviderId}
            options={providers.map(p => ({ value: p.id, label: p.name }))} />
        )}
        <FormSelect label="Medio de pago" value={medioPago} onChange={setMedioPago}
          options={[
            { value: "efectivo", label: "Efectivo" }, { value: "transferencia", label: "Transferencia" },
            { value: "cheque", label: "Cheque" }, { value: "tarjeta", label: "Tarjeta" },
            { value: "mercadopago", label: "Mercado Pago" },
          ]} />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount || !accountId}>Agregar</Btn>
        </div>
      </form>
    </Modal>
  )
}

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
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label="Tipo" value={type || ""} onChange={setType}
            options={[
              { value: "banco", label: "Banco" }, { value: "efectivo", label: "Efectivo" },
              { value: "mercadopago", label: "Mercado Pago" }, { value: "dolares", label: "D\u00f3lares" },
              { value: "otro", label: "Otro" },
            ]} />
          <FormInput label="Saldo inicial" type="number" value={balance} onChange={setBalance} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border" />
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
