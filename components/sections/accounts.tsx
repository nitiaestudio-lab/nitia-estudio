"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today } from "@/lib/helpers"
import { Stat, SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, ExportButton, PeriodFilter, getDateRangeForPeriod, type PeriodValue } from "@/components/nitia-ui"
import type { AccountMovement } from "@/lib/types"
import { exportCuentas, exportMovimientosCuenta } from "@/lib/export-utils"
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react"
import { useSelection } from "@/hooks/use-selection"
import { SelectionBar } from "@/components/selection-bar"
import { SearchInput } from "@/components/search-input"
import { TableCheckbox, TableHeaderCheckbox } from "@/components/table-checkbox"
import { InlineEditField } from "@/components/inline-edit-field"

export function Accounts() {
  const { data, addAccountMovement, deleteAccountMovement, deleteAccountMovements, updateAccount } = useApp()
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [period, setPeriod] = useState<PeriodValue>("month")
  const [searchQuery, setSearchQuery] = useState("")

  const totalBalance = data.accounts.reduce((sum, a) => sum + a.balance, 0)
  
  // Filter movements by period and search
  const { start, end } = getDateRangeForPeriod(period)
  const filteredMovements = data.accountMovements.filter((m) => {
    const date = new Date(m.date)
    const matchesPeriod = date >= start && date <= end
    const matchesSearch = !searchQuery || 
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesPeriod && matchesSearch
  })
  
  const sortedMovements = [...filteredMovements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Hook de selecciÃ³n masiva
  const selection = useSelection({ items: sortedMovements })

  const getAccountName = (id: string) => {
    return data.accounts.find((a) => a.id === id)?.name ?? "Desconocida"
  }

  // Handler para eliminar seleccionados
  const handleDeleteSelected = async () => {
    await deleteAccountMovements(selection.selectedIds)
    selection.clearSelection()
  }

  // Handler para exportar seleccionados
  const handleExportSelected = () => {
    const selectedMovs = selection.selectedItems
    exportMovimientosCuenta(selectedMovs.map(m => ({
      date: m.date,
      description: m.description,
      amount: m.amount,
      type: m.type,
      category: m.category,
    })), "seleccionados")
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Cuentas</h1>
          <p className="text-sm text-[#76746A] mt-1">
            GestiÃ³n de cuentas y movimientos del estudio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <div className="flex gap-2">
            <ExportButton 
              onClick={() => exportCuentas(data.accounts.map(a => ({
                name: a.name,
                type: a.type,
                balance: a.balance,
                owner: a.owner || "nitia",
              })))}
              label="Cuentas"
              disabled={data.accounts.length === 0}
            />
            <ExportButton 
              onClick={() => exportMovimientosCuenta(filteredMovements.map(m => ({
                date: m.date,
                description: m.description,
                amount: m.amount,
                type: m.type,
                category: m.category,
              })), "todas")}
              label="Movimientos"
              disabled={filteredMovements.length === 0}
            />
            <Btn onClick={() => setShowNewMovement(true)}>
              <Plus size={14} className="mr-1.5 inline" />
              Nuevo Movimiento
            </Btn>
          </div>
        </div>
      </div>

      {/* Accounts Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {data.accounts.map((account) => (
          <div
            key={account.id}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: account.color }}
              />
              <InlineEditField
                value={account.name}
                onSave={async (value) => {
                  await updateAccount(account.id, { name: String(value) })
                }}
                fieldName="nombre"
                className="text-sm font-medium"
              />
            </div>
            <p className="text-2xl font-medium text-foreground tracking-tight">
              {formatCurrency(account.balance)}
            </p>
          </div>
        ))}
        <div className="bg-primary border border-primary rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 rounded-full bg-primary-foreground/30" />
            <span className="text-sm font-medium text-primary-foreground/70">Total</span>
          </div>
          <p className="text-2xl font-medium text-primary-foreground tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {/* BÃºsqueda */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar movimientos por descripciÃ³n o categorÃ­a..."
        className="max-w-md"
      />

      {/* Movements Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <SecHead n="1" title={`Movimientos (${sortedMovements.length})`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0EDE4] border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <TableHeaderCheckbox
                    isAllSelected={selection.isAllSelected}
                    isSomeSelected={selection.isSomeSelected}
                    onToggleAll={selection.toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#1C1A12]">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-[#1C1A12]">DescripciÃ³n</th>
                <th className="px-4 py-3 text-left font-medium text-[#1C1A12]">Cuenta</th>
                <th className="px-4 py-3 text-left font-medium text-[#1C1A12]">CategorÃ­a</th>
                <th className="px-4 py-3 text-right font-medium text-[#1C1A12]">Importe</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sortedMovements.map((mov) => (
                <tr 
                  key={mov.id}
                  className={`border-b border-border last:border-0 hover:bg-[#FAFAF9] transition-colors ${
                    selection.isSelected(mov.id) ? "bg-[#F7F5ED]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <TableCheckbox
                      checked={selection.isSelected(mov.id)}
                      onChange={() => selection.toggleItem(mov.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-[#76746A]">
                    {formatDate(mov.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                          mov.type === "ingreso" ? "bg-[var(--green-light)]" : "bg-[var(--red-light)]"
                        }`}
                      >
                        {mov.type === "ingreso" ? (
                          <ArrowDownLeft size={12} className="text-[var(--green)]" />
                        ) : (
                          <ArrowUpRight size={12} className="text-[var(--red)]" />
                        )}
                      </div>
                      <InlineEditField
                        value={mov.description}
                        onSave={async (value) => {
                          // Actualizar descripciÃ³n del movimiento
                          const updated = { ...mov, description: String(value) }
                          await deleteAccountMovement(mov.id)
                          await addAccountMovement(updated)
                        }}
                        fieldName="descripciÃ³n"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#76746A]">
                    {getAccountName(mov.accountId)}
                  </td>
                  <td className="px-4 py-3">
                    <Tag label={mov.category} color="gray" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      mov.type === "ingreso" ? "text-[var(--green)]" : "text-[var(--red)]"
                    }`}>
                      {mov.type === "ingreso" ? "+" : "-"}
                      {formatCurrency(mov.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteAccountMovement(mov.id)}
                      className="p-1.5 text-[#76746A] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedMovements.length === 0 && (
          <Empty
            title="Sin movimientos"
            description={searchQuery ? "Intenta con otra bÃºsqueda" : "Registra tu primer movimiento"}
            action={!searchQuery && <Btn onClick={() => setShowNewMovement(true)}>Agregar</Btn>}
          />
        )}
      </div>

      {/* Barra de selecciÃ³n masiva */}
      <SelectionBar
        selectedCount={selection.selectedCount}
        onDelete={handleDeleteSelected}
        onExport={handleExportSelected}
        onClear={selection.clearSelection}
        itemName="movimiento"
      />

      {/* New Movement Modal */}
      {showNewMovement && (
        <AccountMovementModal
          accounts={data.accounts}
          onClose={() => setShowNewMovement(false)}
          onSave={async (movement) => {
            await addAccountMovement(movement)
            setShowNewMovement(false)
          }}
        />
      )}
    </div>
  )
}

// Account Movement Modal
function AccountMovementModal({
  accounts,
  onClose,
  onSave,
}: {
  accounts: typeof import("@/lib/types").Account[]
  onClose: () => void
  onSave: (movement: AccountMovement) => void
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso")
  const [category, setCategory] = useState("Proyecto")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const movement: AccountMovement = {
      id: generateId(),
      accountId,
      date,
      description,
      amount: parseFloat(amount),
      type,
      category,
    }
    onSave(movement)
  }

  return (
    <Modal isOpen={true} title="Nuevo Movimiento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Cuenta"
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect
            label="Tipo"
            value={type}
            onChange={(v) => setType(v as "ingreso" | "egreso")}
            options={[
              { value: "ingreso", label: "Ingreso" },
              { value: "egreso", label: "Egreso" },
            ]}
          />
        </div>
        <FormInput label="Descripcion" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Importe"
            type="number"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
          />
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={[
              { value: "Proyecto", label: "Proyecto" },
              { value: "Honorarios", label: "Honorarios" },
              { value: "Gastos fijos", label: "Gastos fijos" },
              { value: "Varios", label: "Varios" },
            ]}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!description || !amount || !accountId}>
            Agregar Movimiento
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
