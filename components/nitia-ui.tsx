"use client"

import { forwardRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X, Download, Calendar } from "lucide-react"

// =================== TAG ===================
const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
  olive: "bg-[#F5F5DC] text-[#6B6B3D] border-[#D4D4A0]",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
}

export function Tag({ label, color = "blue", onRemove }: {
  label: string; color?: string; onRemove?: () => void
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium", colorMap[color] || colorMap.gray)}>
      {label}
      {onRemove && <button onClick={onRemove} className="ml-1 hover:opacity-70"><X size={12} /></button>}
    </span>
  )
}

// =================== BUTTON ===================
export function Btn({ variant = "primary", size = "md", type = "button", onClick, disabled, children, className }: {
  variant?: "primary" | "soft" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  type?: "button" | "submit" | "reset"
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  const variants: Record<string, string> = {
    primary: "bg-[#5F5A46] text-white hover:bg-[#4A4639] disabled:opacity-50",
    soft: "bg-[#F7F5ED] text-[#5F5A46] hover:bg-[#E0DDD0] disabled:opacity-50",
    ghost: "text-[#5F5A46] hover:bg-[#F7F5ED] disabled:opacity-50",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  }
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-3 text-lg",
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn("font-medium rounded-lg transition-colors", variants[variant], sizes[size], className)}>
      {children}
    </button>
  )
}

// =================== EMPTY ===================
export function Empty({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-4xl opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// =================== MODAL ===================
export function Modal({ isOpen, onClose, title, children, size = "md", actions }: {
  isOpen: boolean; onClose: () => void; title: string; children: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  actions?: { label: string; onClick: () => void; variant?: string }[]
}) {
  if (!isOpen) return null
  const sizeMap: Record<string, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cn("bg-white rounded-2xl p-6 w-full mx-4 max-h-[90vh] overflow-y-auto", sizeMap[size])}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="mb-6">{children}</div>
        {actions && (
          <div className="flex gap-2 justify-end">
            {actions.map(a => (
              <Btn key={a.label} variant={(a.variant as any) || "soft"} onClick={a.onClick}>{a.label}</Btn>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =================== FORM INPUTS ===================
export function FormInput({ label, value, onChange, type = "text", placeholder, error, inputMode, required, min, max, step, className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
  placeholder?: string; error?: string; inputMode?: string
  required?: boolean; min?: string | number; max?: string | number; step?: string | number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode as any} required={required}
        min={min} max={max} step={step}
        className={cn("w-full px-3 py-2 rounded-lg border text-sm", error ? "border-red-300 bg-red-50" : "border-[#E0DDD0] bg-white")} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function FormSelect({ label, value, onChange, options, error, required, className }: {
  label?: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; error?: string; required?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} required={required}
        className={cn("w-full px-3 py-2 rounded-lg border text-sm", error ? "border-red-300" : "border-[#E0DDD0]")}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function FormTextarea({ label, value, onChange, placeholder, error, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; rows?: number
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={cn("w-full px-3 py-2 rounded-lg border text-sm resize-none", error ? "border-red-300" : "border-[#E0DDD0]")} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// =================== STAT ===================
export function Stat({ label, value, change, changeType, highlight, sub }: {
  label: string; value: string | number; change?: string; changeType?: "up" | "down"
  highlight?: boolean; sub?: string
}) {
  return (
    <div className={cn("p-4 rounded-lg border", highlight ? "bg-[#295E29] text-white border-[#295E29]" : "bg-card border-border")}>
      <p className={cn("text-sm mb-2", highlight ? "text-white/70" : "text-muted-foreground")}>{label}</p>
      <p className={cn("text-2xl font-bold", highlight ? "text-white" : "text-foreground")}>{value}</p>
      {sub && <p className={cn("text-xs mt-1", highlight ? "text-white/60" : "text-muted-foreground")}>{sub}</p>}
      {change && <p className={cn("text-xs mt-2", changeType === "up" ? "text-green-600" : "text-red-600")}>{change}</p>}
    </div>
  )
}

// =================== SECTION HEADER ===================
export function SecHead({ n, title, right }: { n?: string; title: string; right?: ReactNode }) {
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

export function HR() { return <hr className="border-border my-4" /> }

// =================== EXPORT BUTTON ===================
export function ExportButton({ data, filename, children, onClick, label, disabled }: {
  data?: unknown[]; filename?: string; children?: ReactNode
  onClick?: () => void; label?: string; disabled?: boolean
}) {
  const handleExport = () => {
    if (onClick) { onClick(); return }
    if (data && filename) {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url; link.download = `${filename}.json`; link.click()
      URL.revokeObjectURL(url)
    }
  }
  return (
    <Btn variant="ghost" size="sm" onClick={handleExport} disabled={disabled}>
      <Download size={12} className="mr-1 inline" />{children || label || "Exportar"}
    </Btn>
  )
}

// =================== PERIOD FILTER (con fechas personalizadas) ===================
export type PeriodValue = "hoy" | "semana" | "mes" | "3meses" | "ano" | "all" | "custom"

export function PeriodFilter({ value, onChange, onCustomRange }: {
  value: PeriodValue; onChange: (p: PeriodValue) => void
  onCustomRange?: (start: string, end: string) => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const periods = [
    { label: "Hoy", value: "hoy" as PeriodValue },
    { label: "Esta semana", value: "semana" as PeriodValue },
    { label: "Este mes", value: "mes" as PeriodValue },
    { label: "3 meses", value: "3meses" as PeriodValue },
    { label: "Este a\u00f1o", value: "ano" as PeriodValue },
    { label: "Todos", value: "all" as PeriodValue },
    { label: "Personalizado", value: "custom" as PeriodValue },
  ]

  return (
    <div className="flex items-center gap-2">
      <select value={value} onChange={e => {
        const v = e.target.value as PeriodValue
        onChange(v)
        if (v === "custom") setShowCustom(true)
        else setShowCustom(false)
      }} className="px-3 py-1.5 text-sm rounded-lg border border-[#E0DDD0] bg-white">
        {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => {
            setCustomStart(e.target.value)
            if (customEnd && onCustomRange) onCustomRange(e.target.value, customEnd)
          }} className="px-2 py-1 text-sm rounded-lg border border-[#E0DDD0]" />
          <span className="text-sm text-muted-foreground">a</span>
          <input type="date" value={customEnd} onChange={e => {
            setCustomEnd(e.target.value)
            if (customStart && onCustomRange) onCustomRange(customStart, e.target.value)
          }} className="px-2 py-1 text-sm rounded-lg border border-[#E0DDD0]" />
        </div>
      )}
    </div>
  )
}

// =================== CONFIRM DELETE MODAL ===================
export function ConfirmDeleteModal({ isOpen = true, title = "Confirmar", message, itemCount, onConfirm, onCancel, isLoading = false }: {
  isOpen?: boolean; title?: string; message: string; itemCount?: number
  onConfirm: () => void; onCancel: () => void; isLoading?: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-[#1C1A12] mb-4">{title}</h3>
        <p className="text-sm text-[#76746A] mb-6">
          {message}
          {itemCount && itemCount > 1 && <span className="block mt-2 font-medium text-red-600">Se eliminar\u00e1n {itemCount} elementos.</span>}
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-[#76746A]">Cancelar</button>
          <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {isLoading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// =================== EDITABLE SELECT (with "add new" option) ===================
export function EditableSelect({ label, value, onChange, options, onAddNew, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
  onAddNew?: (name: string) => void; placeholder?: string
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")

  if (adding) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={placeholder || "Nueva categoria..."} autoFocus
            className="flex-1 px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm" />
          <Btn size="sm" onClick={() => {
            if (newName.trim() && onAddNew) { onAddNew(newName.trim()); onChange(newName.trim()) }
            setAdding(false); setNewName("")
          }}>OK</Btn>
          <Btn size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName("") }}>X</Btn>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <select value={value} onChange={e => {
        if (e.target.value === "__add_new__") { setAdding(true); return }
        onChange(e.target.value)
      }} className="w-full px-3 py-2 rounded-lg border border-[#E0DDD0] text-sm">
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        {onAddNew && <option value="__add_new__">+ Agregar nuevo...</option>}
      </select>
    </div>
  )
}
