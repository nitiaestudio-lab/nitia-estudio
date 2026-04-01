"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { partnerKey } from "@/lib/seed-data"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { Stat, SecHead, HR, ExportButton, PeriodFilter, getDateRangeForPeriod, type PeriodValue } from "@/components/nitia-ui"
import type { RoleKey, VariableExpense, FixedExpense, NitiaIncome } from "@/lib/types"
import { exportFinanzasPersonales } from "@/lib/export-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, Edit2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

export function PersonalFinance() {
  const { role, data, addPersonalFinanceVariable, updatePersonalFinanceVariable, deletePersonalFinanceVariable,
    addPersonalFinanceFixed, updatePersonalFinanceFixed, deletePersonalFinanceFixed,
    addPersonalFinanceIncome, updatePersonalFinanceIncome, deletePersonalFinanceIncome } = useApp()
  const partner = partnerKey(role)
  const [activeTab, setActiveTab] = useState<"paula" | "cami">((partner === "paula" || partner === "cami") ? partner : "paula")
  const [period, setPeriod] = useState<PeriodValue>("hoy")

  // Dialog states
  const [showFixedDialog, setShowFixedDialog] = useState(false)
  const [showVariableDialog, setShowVariableDialog] = useState(false)
  const [showIncomeDialog, setShowIncomeDialog] = useState(false)
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null)
  const [editingVariable, setEditingVariable] = useState<VariableExpense | null>(null)
  const [editingIncome, setEditingIncome] = useState<NitiaIncome | null>(null)

  // Form states
  const [fixedForm, setFixedForm] = useState({ description: "", amount: "", category: "", active: true })
  const [variableForm, setVariableForm] = useState({ description: "", amount: "", category: "", date: "" })
  const [incomeForm, setIncomeForm] = useState({ description: "", amount: "", date: "", note: "" })

  // Only show if user is a partner
  if (!partner) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No tienes acceso a esta seccion</p>
      </div>
    )
  }

  const financeData = data.personalFinance[activeTab]
  const { start, end } = getDateRangeForPeriod(period)

  // Filter by period
  const filteredVariableExpenses = financeData.variableExpenses.filter((e) => {
    const date = new Date(e.date)
    return date >= start && date <= end
  })
  const filteredNitiaIncome = financeData.nitiaIncome.filter((i) => {
    const date = new Date(i.date)
    return date >= start && date <= end
  })

  const totalFixedExpenses = financeData.fixedExpenses
    .filter((e) => e.active)
    .reduce((sum, e) => sum + e.amount, 0)

  const totalVariableExpenses = filteredVariableExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  )

  const totalNitiaIncome = filteredNitiaIncome.reduce((sum, i) => sum + i.amount, 0)

  const balance = totalNitiaIncome - totalFixedExpenses - totalVariableExpenses

  // Fixed Expense handlers
  const handleAddFixedExpense = async () => {
    if (!fixedForm.description || !fixedForm.amount || !fixedForm.category) {
      alert("Por favor completa todos los campos")
      return
    }

    const expense: FixedExpense = {
      id: uuidv4(),
      description: fixedForm.description,
      amount: parseFloat(fixedForm.amount),
      category: fixedForm.category,
      active: fixedForm.active,
    }

    await addPersonalFinanceFixed(activeTab, expense)
    setFixedForm({ description: "", amount: "", category: "", active: true })
    setShowFixedDialog(false)
  }

  const handleEditFixedExpense = async () => {
    if (!editingFixed || !fixedForm.description || !fixedForm.amount || !fixedForm.category) {
      alert("Por favor completa todos los campos")
      return
    }

    await updatePersonalFinanceFixed(editingFixed.id, {
      description: fixedForm.description,
      amount: parseFloat(fixedForm.amount),
      category: fixedForm.category,
      active: fixedForm.active,
    })
    setEditingFixed(null)
    setFixedForm({ description: "", amount: "", category: "", active: true })
    setShowFixedDialog(false)
  }

  const handleDeleteFixedExpense = async (id: string) => {
    if (!confirm("Estás seguro que querés eliminar este gasto fijo?")) return
    await deletePersonalFinanceFixed(id)
  }

  // Variable Expense handlers
  const handleAddVariableExpense = async () => {
    if (!variableForm.description || !variableForm.amount || !variableForm.category || !variableForm.date) {
      alert("Por favor completa todos los campos")
      return
    }

    const expense: VariableExpense = {
      id: uuidv4(),
      description: variableForm.description,
      amount: parseFloat(variableForm.amount),
      category: variableForm.category,
      date: variableForm.date,
    }

    await addPersonalFinanceVariable(activeTab, expense)
    setVariableForm({ description: "", amount: "", category: "", date: "" })
    setShowVariableDialog(false)
  }

  const handleEditVariableExpense = async () => {
    if (!editingVariable || !variableForm.description || !variableForm.amount || !variableForm.category || !variableForm.date) {
      alert("Por favor completa todos los campos")
      return
    }

    await updatePersonalFinanceVariable(editingVariable.id, {
      description: variableForm.description,
      amount: parseFloat(variableForm.amount),
      category: variableForm.category,
      date: variableForm.date,
    })
    setEditingVariable(null)
    setVariableForm({ description: "", amount: "", category: "", date: "" })
    setShowVariableDialog(false)
  }

  const handleDeleteVariableExpense = async (id: string) => {
    if (!confirm("Estás seguro que querés eliminar este gasto variable?")) return
    await deletePersonalFinanceVariable(id)
  }

  // Income handlers
  const handleAddIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount || !incomeForm.date) {
      alert("Por favor completa todos los campos")
      return
    }

    const income: NitiaIncome = {
      id: uuidv4(),
      description: incomeForm.description,
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date,
      note: incomeForm.note,
    }

    await addPersonalFinanceIncome(activeTab, income)
    setIncomeForm({ description: "", amount: "", date: "", note: "" })
    setShowIncomeDialog(false)
  }

  const handleEditIncome = async () => {
    if (!editingIncome || !incomeForm.description || !incomeForm.amount || !incomeForm.date) {
      alert("Por favor completa todos los campos")
      return
    }

    await updatePersonalFinanceIncome(editingIncome.id, {
      description: incomeForm.description,
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date,
      note: incomeForm.note,
    })
    setEditingIncome(null)
    setIncomeForm({ description: "", amount: "", date: "", note: "" })
    setShowIncomeDialog(false)
  }

  const handleDeleteIncome = async (id: string) => {
    if (!confirm("Estás seguro que querés eliminar este ingreso?")) return
    await deletePersonalFinanceIncome(id)
  }

  const openFixedDialog = (expense?: FixedExpense) => {
    if (expense) {
      setEditingFixed(expense)
      setFixedForm({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        active: expense.active,
      })
    } else {
      setFixedForm({ description: "", amount: "", category: "", active: true })
      setEditingFixed(null)
    }
    setShowFixedDialog(true)
  }

  const openVariableDialog = (expense?: VariableExpense) => {
    if (expense) {
      setEditingVariable(expense)
      setVariableForm({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: expense.date,
      })
    } else {
      setVariableForm({ description: "", amount: "", category: "", date: "" })
      setEditingVariable(null)
    }
    setShowVariableDialog(true)
  }

  const openIncomeDialog = (income?: NitiaIncome) => {
    if (income) {
      setEditingIncome(income)
      setIncomeForm({
        description: income.description,
        amount: income.amount.toString(),
        date: income.date,
        note: income.note,
      })
    } else {
      setIncomeForm({ description: "", amount: "", date: "", note: "" })
      setEditingIncome(null)
    }
    setShowIncomeDialog(true)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Finanzas Personales</h1>
          <p className="text-sm text-[#76746A] mt-1">
            Control de gastos e ingresos personales
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ExportButton
            onClick={() => {
              const movements = [
                ...financeData.fixedExpenses.map(e => ({
                  date: new Date().toISOString().split("T")[0],
                  description: e.description,
                  amount: e.amount,
                  type: "egreso" as const,
                  category: "Gasto Fijo",
                })),
                ...filteredVariableExpenses.map(e => ({
                  date: e.date,
                  description: e.description,
                  amount: e.amount,
                  type: "egreso" as const,
                  category: e.category,
                })),
                ...filteredNitiaIncome.map(i => ({
                  date: i.date,
                  description: i.description,
                  amount: i.amount,
                  type: "ingreso" as const,
                  category: "Ingreso Nitia",
                })),
              ]
              exportFinanzasPersonales(movements, activeTab)
            }}
            label="Exportar"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["paula", "cami"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            disabled={partner !== key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : partner === key
                ? "bg-card border border-border text-muted-foreground hover:bg-accent"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            {key === "paula" ? "Paula" : "Cami"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Ingresos Nitia" value={formatCurrency(totalNitiaIncome)} />
        <Stat label="Gastos Fijos" value={formatCurrency(totalFixedExpenses)} />
        <Stat label="Gastos Variables" value={formatCurrency(totalVariableExpenses)} />
        <Stat
          label="Balance"
          value={formatCurrency(balance)}
          highlight={balance >= 0}
        />
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fixed Expenses */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <SecHead n="1" title="Gastos Fijos Mensuales" />
            <Button size="sm" onClick={() => openFixedDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {financeData.fixedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      expense.active ? "bg-[var(--green)]" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openFixedDialog(expense)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteFixedExpense(expense.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <HR />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total mensual
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(totalFixedExpenses)}
            </span>
          </div>
        </div>

        {/* Variable Expenses */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <SecHead n="2" title="Gastos Variables" />
            <Button size="sm" onClick={() => openVariableDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {financeData.variableExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 group"
              >
                <div className="flex-1">
                  <p className="text-sm text-foreground">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.date)} - {expense.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openVariableDialog(expense)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteVariableExpense(expense.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {financeData.variableExpenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin gastos variables
              </p>
            )}
          </div>
          <HR />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(totalVariableExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Nitia Income */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <SecHead n="3" title="Ingresos desde Nitia" />
          <Button size="sm" onClick={() => openIncomeDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {financeData.nitiaIncome.map((income) => (
            <div
              key={income.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0 group"
            >
              <div className="flex-1">
                <p className="text-sm text-foreground">{income.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(income.date)}
                  {income.note && ` - ${income.note}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--green)]">
                  +{formatCurrency(income.amount)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openIncomeDialog(income)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteIncome(income.id)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {financeData.nitiaIncome.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin ingresos registrados
            </p>
          )}
        </div>
      </div>

      {/* Fixed Expense Dialog */}
      <Dialog open={showFixedDialog} onOpenChange={setShowFixedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFixed ? "Editar Gasto Fijo" : "Agregar Gasto Fijo"}</DialogTitle>
            <DialogDescription>Gestiona tus gastos fijos mensuales</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fixed-description">Descripción</Label>
              <Input
                id="fixed-description"
                value={fixedForm.description}
                onChange={(e) => setFixedForm({ ...fixedForm, description: e.target.value })}
                placeholder="Ej: Alquiler, Servicios..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fixed-amount">Monto</Label>
                <Input
                  id="fixed-amount"
                  type="number"
                  value={fixedForm.amount}
                  onChange={(e) => setFixedForm({ ...fixedForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fixed-category">Categoría</Label>
                <Select value={fixedForm.category} onValueChange={(value) => setFixedForm({ ...fixedForm, category: value })}>
                  <SelectTrigger id="fixed-category">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vivienda">Vivienda</SelectItem>
                    <SelectItem value="Salud">Salud</SelectItem>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Seguros">Seguros</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="fixed-active"
                checked={fixedForm.active}
                onCheckedChange={(checked) => setFixedForm({ ...fixedForm, active: checked as boolean })}
              />
              <Label htmlFor="fixed-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFixedDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={editingFixed ? handleEditFixedExpense : handleAddFixedExpense}>
              {editingFixed ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variable Expense Dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariable ? "Editar Gasto Variable" : "Agregar Gasto Variable"}</DialogTitle>
            <DialogDescription>Registra tus gastos variables</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="var-description">Descripción</Label>
              <Input
                id="var-description"
                value={variableForm.description}
                onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                placeholder="Ej: Supermercado, Nafta..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="var-amount">Monto</Label>
                <Input
                  id="var-amount"
                  type="number"
                  value={variableForm.amount}
                  onChange={(e) => setVariableForm({ ...variableForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="var-category">Categoría</Label>
                <Select value={variableForm.category} onValueChange={(value) => setVariableForm({ ...variableForm, category: value })}>
                  <SelectTrigger id="var-category">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alimentacion">Alimentación</SelectItem>
                    <SelectItem value="Transporte">Transporte</SelectItem>
                    <SelectItem value="Compras">Compras</SelectItem>
                    <SelectItem value="Diversión">Diversión</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="var-date">Fecha</Label>
              <Input
                id="var-date"
                type="date"
                value={variableForm.date}
                onChange={(e) => setVariableForm({ ...variableForm, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariableDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={editingVariable ? handleEditVariableExpense : handleAddVariableExpense}>
              {editingVariable ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIncome ? "Editar Ingreso" : "Agregar Ingreso"}</DialogTitle>
            <DialogDescription>Registra tus ingresos desde Nitia</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="income-description">Descripción</Label>
              <Input
                id="income-description"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                placeholder="Ej: Distribución mensual, Proyecto X..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="income-amount">Monto</Label>
                <Input
                  id="income-amount"
                  type="number"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="income-date">Fecha</Label>
                <Input
                  id="income-date"
                  type="date"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="income-note">Nota (opcional)</Label>
              <Textarea
                id="income-note"
                value={incomeForm.note}
                onChange={(e) => setIncomeForm({ ...incomeForm, note: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={editingIncome ? handleEditIncome : handleAddIncome}>
              {editingIncome ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
