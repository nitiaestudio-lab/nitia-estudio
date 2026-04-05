"use client"

import { useState, useMemo } from "react"
import { Calendar, ChevronDown } from "lucide-react"

const formatDateLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export type PeriodType = "this_month" | "last_month" | "this_year" | "last_year" | "all" | "custom"

interface PeriodOption {
  value: PeriodType
  label: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes anterior" },
  { value: "this_year", label: "Este año" },
  { value: "last_year", label: "Año anterior" },
  { value: "all", label: "Todo" },
  { value: "custom", label: "Personalizado" },
]

interface DateRange {
  start: Date | null
  end: Date | null
}

interface PeriodSelectorProps {
  value: PeriodType
  onChange: (period: PeriodType) => void
  customRange?: DateRange
  onCustomRangeChange?: (range: DateRange) => void
  className?: string
}

export function PeriodSelector({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
  className = "",
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const selectedLabel = PERIOD_OPTIONS.find(o => o.value === value)?.label || "Seleccionar"

  const handleSelect = (period: PeriodType) => {
    onChange(period)
    if (period === "custom") {
      setShowCustomPicker(true)
    } else {
      setShowCustomPicker(false)
    }
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#E0DDD0] bg-white hover:bg-[#F7F5ED] transition-colors"
      >
        <Calendar size={14} className="text-[#76746A]" />
        <span className="text-[#1C1A12]">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-[#76746A] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E0DDD0] rounded-lg shadow-lg py-1 min-w-[160px]">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-[#F7F5ED] transition-colors
                  ${value === option.value ? "bg-[#F0EDE4] text-[#5F5A46] font-medium" : "text-[#1C1A12]"}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}

      {showCustomPicker && value === "custom" && onCustomRangeChange && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={customRange?.start ? formatDateLocal(customRange.start) : ""}
            onChange={(e) => onCustomRangeChange({ 
              ...customRange, 
              start: e.target.value ? new Date(e.target.value) : null 
            } as DateRange)}
            className="px-2 py-1.5 text-sm border border-[#E0DDD0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5F5A46]"
          />
          <span className="text-sm text-[#76746A]">a</span>
          <input
            type="date"
            value={customRange?.end ? formatDateLocal(customRange.end) : ""}
            onChange={(e) => onCustomRangeChange({ 
              ...customRange, 
              end: e.target.value ? new Date(e.target.value) : null 
            } as DateRange)}
            className="px-2 py-1.5 text-sm border border-[#E0DDD0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5F5A46]"
          />
        </div>
      )}
    </div>
  )
}

// Hook para calcular el rango de fechas basado en el período
export function usePeriodFilter<T extends { date?: string; createdAt?: string }>(
  items: T[],
  period: PeriodType,
  customRange?: DateRange,
  dateField: "date" | "createdAt" = "date"
) {
  const filteredItems = useMemo(() => {
    if (period === "all") return items

    const now = new Date()
    let start: Date
    let end: Date

    switch (period) {
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        break
      case "last_year":
        start = new Date(now.getFullYear() - 1, 0, 1)
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
        break
      case "custom":
        if (!customRange?.start || !customRange?.end) return items
        start = customRange.start
        end = customRange.end
        break
      default:
        return items
    }

    return items.filter(item => {
      const itemDate = item[dateField]
      if (!itemDate) return false
      const date = new Date(itemDate)
      return date >= start && date <= end
    })
  }, [items, period, customRange, dateField])

  return filteredItems
}

// Helper para obtener el nombre del período en formato legible
export function getPeriodLabel(period: PeriodType): string {
  const now = new Date()
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  
  switch (period) {
    case "this_month":
      return `${months[now.getMonth()]} ${now.getFullYear()}`
    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return `${months[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`
    case "this_year":
      return `${now.getFullYear()}`
    case "last_year":
      return `${now.getFullYear() - 1}`
    case "all":
      return "Todo el tiempo"
    case "custom":
      return "Período personalizado"
    default:
      return ""
  }
}
