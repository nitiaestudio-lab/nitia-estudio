"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface UseInlineEditProps {
  initialValue: string | number
  onSave: (value: string | number) => Promise<void>
  fieldName?: string
}

export function useInlineEdit({ initialValue, onSave, fieldName = "field" }: UseInlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSave = useCallback(async () => {
    try {
      setError(null)
      setIsSaving(true)
      await onSave(value)
      setIsEditing(false)
      toast({ description: `${fieldName} actualizado correctamente` })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al guardar"
      setError(errorMsg)
      setValue(initialValue) // Revert on error
      toast({ 
        description: errorMsg, 
        variant: "destructive" 
      })
    } finally {
      setIsSaving(false)
    }
  }, [value, onSave, fieldName, initialValue, toast])

  const handleCancel = useCallback(() => {
    setValue(initialValue)
    setIsEditing(false)
    setError(null)
  }, [initialValue])

  return {
    value,
    setValue,
    isEditing,
    setIsEditing,
    isSaving,
    error,
    handleSave,
    handleCancel,
  }
}
