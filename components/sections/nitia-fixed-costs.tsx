"use client"

import { useState } from "react"
import { PeriodFilter, type PeriodValue, getDateRangeForPeriod, ConfirmDeleteModal } from "@/components/nitia-ui"
import { InlineEditField, InlineToggle } from "@/components/inline-edit-field"
import {
  updateNitiaFixedCostField,
  toggleNitiaFixedCostActive,
  softDeleteNitiaFixedCost,
  getNitiaFixedCostsByPeriod,
} from "@/lib/database-actions"
import { formatCurrency } from "@/lib/helpers"

interface FixedCost {
  id: string
  description: string
  amount: number
  category: string
  active: boolean
  created_at: string
  updated_at?: string
}

interface NitiaFixedCostsSectionProps {
  costs: FixedCost[]
  onRefresh: () => Promise<void>
}

export function NitiaFixedCostsSection({ costs, onRefresh }: NitiaFixedCostsSectionProps) {
  const [period, setPeriod] = useState<PeriodValue>("thisMonth")
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [costToDelete, setCostToDelete] = useState<FixedCost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter costs by period
  const { start, end } = getDateRangeForPeriod(period)
  const filteredCosts = costs.filter((cost) => {
    const costDate = new Date(cost.created_at)
    return costDate >= start && costDate <= end
  })

  // Calculate total
  const total = filteredCosts.reduce((sum, cost) => sum + (cost.active ? cost.amount : 0), 0)

  const handleUpdateDescription = async (costId: string, newDescription: string) => {
    try {
      setIsLoading(true)
      await updateNitiaFixedCostField(costId, "description", newDescription)
      await onRefresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateAmount = async (costId: string, newAmount: number) => {
    try {
      setIsLoading(true)
      await updateNitiaFixedCostField(costId, "amount", newAmount)
      await onRefresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (costId: string, currentActive: boolean) => {
    try {
      setIsLoading(true)
      await toggleNitiaFixedCostActive(costId, currentActive)
      await onRefresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (cost: FixedCost) => {
    setCostToDelete(cost)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!costToDelete) return
    try {
      setIsDeleting(true)
      await softDeleteNitiaFixedCost(costToDelete.id)
      await onRefresh()
      setShowDeleteConfirm(false)
      setCostToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Costos Fijos de Nitia</h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Total badge */}
      <div className="mb-4 inline-block bg-[#5F5A46]/10 px-4 py-2 rounded-lg">
        <p className="text-sm text-[#76746A]">Total del período</p>
        <p className="text-xl font-semibold text-[#5F5A46]">{formatCurrency(total)}</p>
      </div>

      {/* Costs list */}
      <div className="space-y-3">
        {filteredCosts.map((cost) => (
          <div
            key={cost.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              cost.active
                ? "border-[#E0DDD0] bg-[#F7F5ED]"
                : "border-[#E0DDD0]/50 bg-[#F7F5ED]/50 opacity-60"
            }`}
          >
            <div className="flex-1 min-w-0 space-y-2">
              {/* Description - editable */}
              <InlineEditField
                value={cost.description}
                onSave={(value) => handleUpdateDescription(cost.id, String(value))}
                placeholder="Descripción..."
                fieldName="Descripción"
              />

              {/* Amount - editable */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#76746A]">Monto:</span>
                <InlineEditField
                  value={cost.amount}
                  onSave={(value) => handleUpdateAmount(cost.id, Number(value))}
                  type="number"
                  placeholder="0"
                  fieldName="Monto"
                  className="inline-block"
                />
              </div>

              {/* Category */}
              <span className="inline-block text-xs bg-[#5F5A46]/10 px-2 py-1 rounded text-[#5F5A46]">
                {cost.category}
              </span>
            </div>

            <div className="flex items-center gap-4 ml-4 flex-shrink-0">
              {/* Active toggle */}
              <InlineToggle
                value={cost.active}
                onSave={(value) => handleToggleActive(cost.id, cost.active)}
                fieldName="Activo"
              />

              {/* Delete button */}
              <button
                onClick={() => handleDeleteClick(cost)}
                className="p-2 text-[#8B2323] hover:text-[#6B1B1B] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                title="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {filteredCosts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {period === "all" ? "Sin costos registrados" : "Sin costos en este período"}
          </p>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && costToDelete && (
        <ConfirmDeleteModal
          title="Eliminar costo"
          message={`¿Estás seguro de que deseas eliminar "${costToDelete.description}"? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setCostToDelete(null)
          }}
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}
