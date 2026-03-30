"use client"

import { useState } from "react"
import { useInlineEdit } from "@/hooks/use-inline-edit"

interface InlineEditFieldProps {
  value: string | number
  onSave: (value: string | number) => Promise<void>
  type?: "text" | "number"
  placeholder?: string
  className?: string
  fieldName?: string
}

export function InlineEditField({
  value,
  onSave,
  type = "text",
  placeholder = "Editar...",
  className = "",
  fieldName = "Field",
}: InlineEditFieldProps) {
  const { value: editValue, setValue, isEditing, setIsEditing, isSaving, error, handleSave, handleCancel } = useInlineEdit({
    initialValue: value,
    onSave,
    fieldName,
  })

  if (isEditing) {
    return (
      <div className="flex gap-1 items-center">
        <input
          type={type}
          value={editValue}
          onChange={(e) => setValue(type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className={`h-8 px-2 text-sm border border-[#E0DDD0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5F5A46] ${className}`}
          disabled={isSaving}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") handleCancel()
          }}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-[#295E29] hover:text-[#1B5E1B] disabled:opacity-50"
          title="Guardar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 text-[#8B2323] hover:text-[#6B1B1B] disabled:opacity-50"
          title="Cancelar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer px-2 py-1 rounded-md hover:bg-[#F0EDE4] transition-colors ${className}`}
      title="Click para editar"
    >
      {value || placeholder}
    </div>
  )
}

interface InlineToggleProps {
  value: boolean
  onSave: (value: boolean) => Promise<void>
  className?: string
  fieldName?: string
}

export function InlineToggle({
  value,
  onSave,
  className = "",
  fieldName = "Toggle",
}: InlineToggleProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    try {
      setError(null)
      setIsSaving(true)
      await onSave(!value)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al guardar"
      setError(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isSaving}
      className={`
        relative inline-flex items-center h-6 w-11 rounded-full transition-colors
        ${value ? "bg-[#295E29]" : "bg-[#E0DDD0]"}
        ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}
        ${className}
      `}
      title={`Click para ${value ? "desactivar" : "activar"}`}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${value ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  )
}
