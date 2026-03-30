"use client"

import { Check, Minus } from "lucide-react"

interface TableCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  disabled?: boolean
  className?: string
}

export function TableCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  className = "",
}: TableCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={`
        w-4 h-4 rounded border flex items-center justify-center transition-all
        ${checked || indeterminate 
          ? "bg-[#5F5A46] border-[#5F5A46] text-white" 
          : "bg-white border-[#D0CEC4] hover:border-[#5F5A46]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {checked && !indeterminate && <Check size={12} strokeWidth={3} />}
      {indeterminate && <Minus size={12} strokeWidth={3} />}
    </button>
  )
}

// Componente para el header de la tabla con checkbox de seleccionar todo
interface TableHeaderCheckboxProps {
  isAllSelected: boolean
  isSomeSelected: boolean
  onToggleAll: () => void
  disabled?: boolean
}

export function TableHeaderCheckbox({
  isAllSelected,
  isSomeSelected,
  onToggleAll,
  disabled = false,
}: TableHeaderCheckboxProps) {
  return (
    <TableCheckbox
      checked={isAllSelected}
      indeterminate={isSomeSelected}
      onChange={onToggleAll}
      disabled={disabled}
    />
  )
}
