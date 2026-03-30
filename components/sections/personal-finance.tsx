"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { partnerKey } from "@/lib/seed-data"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { Stat, SecHead, HR, ExportButton, PeriodFilter, getDateRangeForPeriod, type PeriodValue } from "@/components/nitia-ui"
import type { RoleKey } from "@/lib/types"
import { exportFinanzasPersonales } from "@/lib/export-utils"

export function PersonalFinance() {
  const { role, data } = useApp()
  const partner = partnerKey(role)
  const [activeTab, setActiveTab] = useState<"paula" | "cami">(partner ?? "paula")
  const [period, setPeriod] = useState<PeriodValue>("month")

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
          <SecHead n="1" title="Gastos Fijos Mensuales" />
          <div className="space-y-2">
            {financeData.fixedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      expense.active ? "bg-[var(--green)]" : "bg-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-foreground">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category}</p>
                  </div>
                </div>
                <span className="text-sm text-foreground">
                  {formatCurrency(expense.amount)}
                </span>
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
          <SecHead n="2" title="Gastos Variables" />
          <div className="space-y-2">
            {financeData.variableExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm text-foreground">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.date)} - {expense.category}
                  </p>
                </div>
                <span className="text-sm text-foreground">
                  {formatCurrency(expense.amount)}
                </span>
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
        <SecHead n="3" title="Ingresos desde Nitia" />
        <div className="space-y-2">
          {financeData.nitiaIncome.map((income) => (
            <div
              key={income.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm text-foreground">{income.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(income.date)}
                  {income.note && ` - ${income.note}`}
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--green)]">
                +{formatCurrency(income.amount)}
              </span>
            </div>
          ))}
          {financeData.nitiaIncome.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin ingresos registrados
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
