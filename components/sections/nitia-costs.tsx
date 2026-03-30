"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId } from "@/lib/helpers"
import { Stat, SecHead, Btn, Empty, Modal, FormInput, FormSelect, HR, ExportButton } from "@/components/nitia-ui"
import type { FixedExpense } from "@/lib/types"
import { exportCostosFijos } from "@/lib/export-utils"
import { Plus, Pencil, Trash2 } from "lucide-react"

const CATEGORIES = ["Personal", "Software", "Web", "Servicios", "Oficina", "Marketing", "Otro"]

export function NitiaCosts() {
  const { data, addNitiaFixedCost, updateNitiaFixedCost, deleteNitiaFixedCost } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeCosts = data.nitiaFixedCosts.filter((c) => c.active)
  const inactiveCosts = data.nitiaFixedCosts.filter((c) => !c.active)

  const totalActive = activeCosts.reduce((sum, c) => sum + c.amount, 0)

  const editingCost = editingId
    ? data.nitiaFixedCosts.find((c) => c.id === editingId)
    : null

  // Group by category
  const byCategory = activeCosts.reduce((acc, cost) => {
    if (!acc[cost.category]) acc[cost.category] = []
    acc[cost.category].push(cost)
    return acc
  }, {} as Record<string, FixedExpense[]>)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Costos Fijos Nitia</h1>
          <p className="text-sm text-[#76746A] mt-1">
            Gastos fijos mensuales del estudio
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            onClick={() => exportCostosFijos(data.nitiaFixedCosts.map(c => ({
              description: c.description,
              amount: c.amount,
              category: c.category,
              active: c.active,
            })))}
            disabled={data.nitiaFixedCosts.length === 0}
          />
          <Btn onClick={() => setShowNew(true)}>
            <Plus size={14} className="mr-1.5 inline" />
            Nuevo Costo
          </Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Total Mensual" value={formatCurrency(totalActive)} highlight />
        <Stat label="Costos Activos" value={String(activeCosts.length)} />
        <Stat
          label="Por Socia"
          value={formatCurrency(totalActive / 2)}
          sub="Division 50/50"
        />
      </div>

      {/* Costs by Category */}
      <div className="grid lg:grid-cols-2 gap-6">
        {Object.entries(byCategory).map(([category, costs]) => (
          <div
            key={category}
            className="bg-card border border-border rounded-xl p-6"
          >
            <SecHead title={category} />
            <div className="space-y-2">
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 group"
                >
                  <span className="text-sm text-foreground">{cost.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(cost.amount)}
                    </span>
                    <button
                      onClick={() => setEditingId(cost.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                    >
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <HR />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subtotal
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(costs.reduce((sum, c) => sum + c.amount, 0))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive Costs */}
      {inactiveCosts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 opacity-60">
          <SecHead title="Costos Inactivos" />
          <div className="space-y-2">
            {inactiveCosts.map((cost) => (
              <div
                key={cost.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm text-muted-foreground line-through">
                  {cost.description}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(cost.amount)}
                  </span>
                  <button
                    onClick={() => setEditingId(cost.id)}
                    className="p-1 hover:bg-accent rounded"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.nitiaFixedCosts.length === 0 && (
        <Empty
          title="Sin costos fijos"
          description="Agrega los gastos fijos del estudio"
          action={<Btn onClick={() => setShowNew(true)}>Agregar Costo</Btn>}
        />
      )}

      {/* New Cost Modal */}
      {showNew && (
        <CostModal
          onClose={() => setShowNew(false)}
          onSave={(cost) => {
            addNitiaFixedCost(cost)
            setShowNew(false)
          }}
        />
      )}

      {/* Edit Cost Modal */}
      {editingCost && (
        <CostModal
          cost={editingCost}
          onClose={() => setEditingId(null)}
          onSave={(cost) => {
            updateNitiaFixedCost(cost.id, cost)
            setEditingId(null)
          }}
          onDelete={() => {
            deleteNitiaFixedCost(editingCost.id)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

// Cost Modal
function CostModal({
  cost,
  onClose,
  onSave,
  onDelete,
}: {
  cost?: FixedExpense
  onClose: () => void
  onSave: (cost: FixedExpense) => void
  onDelete?: () => void
}) {
  const [description, setDescription] = useState(cost?.description ?? "")
  const [amount, setAmount] = useState(String(cost?.amount ?? ""))
  const [category, setCategory] = useState(cost?.category ?? CATEGORIES[0])
  const [active, setActive] = useState(cost?.active ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: FixedExpense = {
      id: cost?.id ?? generateId(),
      description,
      amount: parseFloat(amount),
      category,
      active,
    }
    onSave(data)
  }

  return (
    <Modal title={cost ? "Editar Costo" : "Nuevo Costo"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Descripcion" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Monto mensual"
            type="number"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
          />
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="active" className="text-sm text-foreground">
            Costo activo
          </label>
        </div>
        <div className="flex justify-between pt-4">
          <div>
            {onDelete && (
              <Btn variant="danger" onClick={onDelete}>
                Eliminar
              </Btn>
            )}
          </div>
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn type="submit" disabled={!description || !amount}>
              {cost ? "Guardar" : "Crear"}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}
