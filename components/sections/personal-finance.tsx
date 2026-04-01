"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, formatDate, generateId, today, filterByDateRange } from "@/lib/helpers"
import { Stat, SecHead, Btn, Empty, Modal, FormInput, HR, PeriodFilter, type PeriodValue, EditableSelect } from "@/components/nitia-ui"
import { Plus, Pencil, Trash2 } from "lucide-react"
import type { PersonalFinanceMovement } from "@/lib/types"

export function PersonalFinance() {
  const { role, data, addRow, updateRow, deleteRow, getCategoriesFor, addCategory } = useApp()
  const [activeTab, setActiveTab] = useState<"paula" | "cami">(role === "cami" ? "cami" : "paula")
  const [period, setPeriod] = useState<PeriodValue>("mes")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [showFixedDialog, setShowFixedDialog] = useState(false)
  const [showVariableDialog, setShowVariableDialog] = useState(false)
  const [showIncomeDialog, setShowIncomeDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<PersonalFinanceMovement | null>(null)

  const ownerData = data.personalFinanceMovements.filter(m => m.owner === activeTab)
  const fixedExpenses = ownerData.filter(m => m.type === "egreso" && m.is_fixed && m.active !== false)
  const variableExpenses = filterByDateRange(
    ownerData.filter(m => m.type === "egreso" && !m.is_fixed), period, customStart, customEnd
  )
  const incomes = filterByDateRange(
    ownerData.filter(m => m.type === "ingreso"), period, customStart, customEnd
  )

  // Auto-calculate income from projects (50% split)
  const projectIncomes = data.movements
    .filter(m => m.type === "ingreso" && m.auto_split && m.project_id)
    .map(m => ({
      description: `Proyecto: ${data.projects.find(p => p.id === m.project_id)?.name || "—"}`,
      amount: m.amount * ((m.split_percentage || 50) / 100),
      date: m.date,
    }))

  const totalFixed = fixedExpenses.reduce((s, m) => s + m.amount, 0)
  const totalVariable = variableExpenses.reduce((s, m) => s + m.amount, 0)
  const totalIncome = incomes.reduce((s, m) => s + m.amount, 0)
  const totalProjectIncome = projectIncomes.reduce((s, m) => s + m.amount, 0)
  const balance = totalIncome + totalProjectIncome - totalFixed - totalVariable

  const saveItem = async (item: PersonalFinanceMovement) => {
    if (editingItem) {
      await updateRow("personal_finance_movements", item.id, item, "personalFinanceMovements")
    } else {
      await addRow("personal_finance_movements", item, "personalFinanceMovements")
    }
    setShowFixedDialog(false); setShowVariableDialog(false); setShowIncomeDialog(false); setEditingItem(null)
  }

  const deleteItem = async (id: string) => {
    await deleteRow("personal_finance_movements", id, "personalFinanceMovements")
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Finanzas Personales</h1>
          <p className="text-sm text-[#76746A] mt-1">Control de gastos e ingresos personales</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} onCustomRange={(s,e) => { setCustomStart(s); setCustomEnd(e) }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["paula", "cami"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-[#5F5A46] text-white" : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
            }`}>{tab === "paula" ? "Paula" : "Cami"}</button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Ingresos" value={formatCurrency(totalIncome + totalProjectIncome)} />
        <Stat label="Gastos Fijos" value={formatCurrency(totalFixed)} />
        <Stat label="Gastos Variables" value={formatCurrency(totalVariable)} />
        <Stat label="Balance" value={formatCurrency(balance)} highlight={balance >= 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gastos Fijos */}
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead n="1" title="Gastos Fijos Mensuales" right={
            <Btn size="sm" onClick={() => { setEditingItem(null); setShowFixedDialog(true) }}>
              <Plus size={14} className="mr-1 inline" />Agregar
            </Btn>
          } />
          {fixedExpenses.length > 0 ? fixedExpenses.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 group">
              <div>
                <span className="text-sm">{item.description}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                <button onClick={() => { setEditingItem(item); setShowFixedDialog(true) }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                <button onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
              </div>
            </div>
          )) : <Empty title="Sin gastos fijos" />}
          <HR />
          <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-muted-foreground">Total Mensual</span>
            <span className="text-sm font-semibold">{formatCurrency(totalFixed)}</span></div>
        </div>

        {/* Gastos Variables */}
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead n="2" title="Gastos Variables" right={
            <Btn size="sm" onClick={() => { setEditingItem(null); setShowVariableDialog(true) }}>
              <Plus size={14} className="mr-1 inline" />Agregar
            </Btn>
          } />
          {variableExpenses.length > 0 ? variableExpenses.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 group">
              <div>
                <span className="text-sm">{item.description}</span>
                <span className="text-xs text-muted-foreground ml-2">{formatDate(item.date)} - {item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                <button onClick={() => { setEditingItem(item); setShowVariableDialog(true) }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
                <button onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
              </div>
            </div>
          )) : <Empty title="Sin gastos variables" />}
          <HR />
          <div className="flex justify-between"><span className="text-xs font-semibold uppercase text-muted-foreground">Total</span>
            <span className="text-sm font-semibold">{formatCurrency(totalVariable)}</span></div>
        </div>
      </div>

      {/* Ingresos */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead n="3" title="Ingresos" right={
          <Btn size="sm" onClick={() => { setEditingItem(null); setShowIncomeDialog(true) }}>
            <Plus size={14} className="mr-1 inline" />Agregar
          </Btn>
        } />
        {/* Auto from projects */}
        {projectIncomes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Desde Proyectos (autom{"\u00e1"}tico)</p>
            {projectIncomes.map((pi, i) => (
              <div key={i} className="flex justify-between py-1.5 text-sm">
                <span className="text-green-700">{pi.description}</span>
                <span className="font-medium text-green-700">{formatCurrency(pi.amount)}</span>
              </div>
            ))}
            <HR />
          </div>
        )}
        {/* Manual incomes */}
        {incomes.length > 0 ? incomes.map(item => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 group">
            <div>
              <span className="text-sm">{item.description}</span>
              <span className="text-xs text-muted-foreground ml-2">{formatDate(item.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-700">{formatCurrency(item.amount)}</span>
              <button onClick={() => { setEditingItem(item); setShowIncomeDialog(true) }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded"><Pencil size={12} /></button>
              <button onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
            </div>
          </div>
        )) : !projectIncomes.length && <Empty title="Sin ingresos registrados" />}
      </div>

      {/* Dialogs */}
      {showFixedDialog && (
        <FinanceItemModal
          item={editingItem} type="fixed" owner={activeTab}
          categories={getCategoriesFor("gasto_fijo_personal")}
          onAddCategory={n => addCategory("gasto_fijo_personal", n)}
          onClose={() => { setShowFixedDialog(false); setEditingItem(null) }}
          onSave={saveItem}
        />
      )}
      {showVariableDialog && (
        <FinanceItemModal
          item={editingItem} type="variable" owner={activeTab}
          categories={getCategoriesFor("gasto_variable_personal")}
          onAddCategory={n => addCategory("gasto_variable_personal", n)}
          onClose={() => { setShowVariableDialog(false); setEditingItem(null) }}
          onSave={saveItem}
        />
      )}
      {showIncomeDialog && (
        <FinanceItemModal
          item={editingItem} type="income" owner={activeTab}
          categories={getCategoriesFor("ingreso_personal")}
          onAddCategory={n => addCategory("ingreso_personal", n)}
          onClose={() => { setShowIncomeDialog(false); setEditingItem(null) }}
          onSave={saveItem}
        />
      )}
    </div>
  )
}

function FinanceItemModal({ item, type, owner, categories, onAddCategory, onClose, onSave }: {
  item: PersonalFinanceMovement | null; type: "fixed" | "variable" | "income"; owner: string
  categories: { id: string; name: string }[]; onAddCategory: (n: string) => void
  onClose: () => void; onSave: (item: PersonalFinanceMovement) => void
}) {
  const titles = { fixed: "Gasto Fijo", variable: "Gasto Variable", income: "Ingreso" }
  const [description, setDescription] = useState(item?.description ?? "")
  const [amount, setAmount] = useState(String(item?.amount ?? ""))
  const [category, setCategory] = useState(item?.category ?? "")
  const [date, setDate] = useState(item?.date ?? today())
  const [note, setNote] = useState(item?.note ?? "")

  return (
    <Modal isOpen={true} title={`${item ? "Editar" : "Nuevo"} ${titles[type]}`} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: item?.id ?? generateId(), owner, date,
        description, amount: parseFloat(amount),
        type: type === "income" ? "ingreso" : "egreso",
        category, is_fixed: type === "fixed", active: true,
        note, created_at: item?.created_at ?? new Date().toISOString(),
      })}} className="space-y-4">
        <FormInput label="Descripci\u00f3n" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Monto" type="number" value={amount} onChange={setAmount} inputMode="decimal" />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>
        <EditableSelect label="Categor\u00eda" value={category} onChange={setCategory}
          options={categories.map(c => ({ value: c.name, label: c.name }))} onAddNew={onAddCategory} />
        {type === "income" && <FormInput label="Nota" value={note} onChange={setNote} />}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount}>{item ? "Guardar" : "Agregar"}</Btn>
        </div>
      </form>
    </Modal>
  )
}
