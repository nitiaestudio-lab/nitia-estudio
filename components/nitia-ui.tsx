"use client"

// Nitia Design System - UI Components v1.1.0

import { forwardRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X, Download } from "lucide-react"

// Tag component
interface TagProps {
  label: string
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray"
  onRemove?: () => void
}

const colorMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
}

export function Tag({ label, color = "blue", onRemove }: TagProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium", colorMap[color])}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:opacity-70">
          <X size={12} />
        </button>
      )}
    </span>
  )
}

// Button component
interface BtnProps {
  variant?: "primary" | "soft" | "ghost"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}

export function Btn({
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  children,
  className,
}: BtnProps) {
  const baseClasses = "font-medium rounded-lg transition-colors"
  const variantClasses = {
    primary: "bg-[#5F5A46] text-white hover:bg-[#4A4639] disabled:opacity-50",
    soft: "bg-[#F7F5ED] text-[#5F5A46] hover:bg-[#E0DDD0] disabled:opacity-50",
    ghost: "text-[#5F5A46] hover:bg-[#F7F5ED] disabled:opacity-50",
  }
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </button>
  )
}

// Empty state component
interface EmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-4xl opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action && (
        <Btn onClick={action.onClick} variant="soft" size="sm">
          {action.label}
        </Btn>
      )}
    </div>
  )
}

// Modal component
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: { label: string; onClick: () => void; variant?: "primary" | "soft" | "ghost" }[]
}

export function Modal({ isOpen, onClose, title, children, actions }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">{children}</div>

        {actions && (
          <div className="flex gap-2 justify-end">
            {actions.map((action) => (
              <Btn key={action.label} variant={action.variant || "soft"} onClick={action.onClick}>
                {action.label}
              </Btn>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Form Input
interface FormInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  error?: string
}

export function FormInput({ label, value, onChange, type = "text", placeholder, error }: FormInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 rounded-lg border text-sm",
          error ? "border-red-300 bg-red-50" : "border-[#E0DDD0] bg-white"
        )}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// Form Select
interface FormSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
}

export function FormSelect({ label, value, onChange, options, error }: FormSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("w-full px-3 py-2 rounded-lg border text-sm", error ? "border-red-300" : "border-[#E0DDD0]")}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// Form Textarea
interface FormTextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  rows?: number
}

export function FormTextarea({ label, value, onChange, placeholder, error, rows = 3 }: FormTextareaProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full px-3 py-2 rounded-lg border text-sm resize-none",
          error ? "border-red-300" : "border-[#E0DDD0]"
        )}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// Stats/Cards
interface StatProps {
  label: string
  value: string | number
  change?: string
  changeType?: "up" | "down"
}

export function Stat({ label, value, change, changeType }: StatProps) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <p className={cn("text-xs mt-2", changeType === "up" ? "text-green-600" : "text-red-600")}>
          {changeType === "up" ? "↑" : "↓"} {change}
        </p>
      )}
    </div>
  )
}

// Horizontal Rule
export function HR() {
  return <hr className="border-border my-4" />
}

// Section Header
interface SecHeadProps {
  n?: string
  title: string
  right?: ReactNode
}

export function SecHead({ n, title, right }: SecHeadProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {n && <span className="text-2xl font-bold text-[#5F5A46]">{n}</span>}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

// Export Button
interface ExportButtonProps {
  data: unknown[]
  filename: string
  children: ReactNode
}

export function ExportButton({ data, filename, children }: ExportButtonProps) {
  const handleExport = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Btn variant="ghost" size="sm" onClick={handleExport}>
      <Download size={12} className="mr-1 inline" />
      {children}
    </Btn>
  )
}

// Period Filter for historical data
export type PeriodValue = "hoy" | "semana" | "mes" | "3meses" | "ano" | "all"

interface PeriodFilterProps {
  value: PeriodValue
  onChange: (period: PeriodValue) => void
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const periods: { label: string; value: PeriodValue }[] = [
    { label: "Hoy", value: "hoy" },
    { label: "Esta semana", value: "semana" },
    { label: "Este mes", value: "mes" },
    { label: "Últimos 3 meses", value: "3meses" },
    { label: "Este año", value: "ano" },
    { label: "Todos", value: "all" },
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodValue)}
      className="px-3 py-1.5 text-sm rounded-lg border border-[#E0DDD0] bg-white"
    >
      {periods.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  )
}

// Get date range for period filter
export function getDateRangeForPeriod(period: PeriodValue) {
  const today = new Date()
  let start = new Date(today)

  switch (period) {
    case "hoy":
      start = new Date(today.setHours(0, 0, 0, 0))
      break
    case "semana":
      start = new Date(today.setDate(today.getDate() - today.getDay()))
      break
    case "mes":
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case "3meses":
      start = new Date(today.setMonth(today.getMonth() - 3))
      break
    case "ano":
      start = new Date(today.getFullYear(), 0, 1)
      break
    case "all":
      start = new Date("2000-01-01")
      break
  }

  return { start, end: new Date() }
}

// Selectable Row for bulk actions
interface SelectableRowProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
}

export const SelectableRow = forwardRef<HTMLDivElement, SelectableRowProps>(
  ({ checked, onChange, children, disabled }, ref) => (
    <div ref={ref} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F5ED]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-[#E0DDD0]"
      />
      <div className="flex-1">{children}</div>
    </div>
  )
)
SelectableRow.displayName = "SelectableRow"

// Bulk Actions Bar
interface BulkActionsBarProps {
  selectedCount: number
  onDelete: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({ selectedCount, onDelete, onClearSelection }: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1A12] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50">
      <span className="text-sm">{selectedCount} seleccionado{selectedCount > 1 ? "s" : ""}</span>
      <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-300">
        Eliminar
      </button>
      <button onClick={onClearSelection} className="text-sm text-gray-400 hover:text-gray-300">
        Cancelar
      </button>
    </div>
  )
}

// Confirm Delete Modal
interface ConfirmDeleteModalProps {
  title?: string
  message: string
  itemCount?: number
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmDeleteModal({
  title = "Confirmar eliminación",
  message,
  itemCount,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-[#1C1A12] mb-4">{title}</h3>
        <p className="text-sm text-[#76746A] mb-6">
          {message}
          {itemCount && itemCount > 1 && (
            <span className="block mt-2 font-medium text-[#DC2626]">Se eliminarán {itemCount} elementos.</span>
          )}
        </p>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-[#76746A]">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-[#DC2626] text-white rounded-lg"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
