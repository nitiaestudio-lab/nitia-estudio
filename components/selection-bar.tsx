"use client"

import { Trash2, Download, X } from "lucide-react"
import { Btn, ConfirmDeleteModal } from "./nitia-ui"
import { useState } from "react"

interface SelectionBarProps {
  selectedCount: number
  onDelete?: () => Promise<void>
  onExport?: () => void
  onClear: () => void
  itemName?: string // "proyecto", "proveedor", etc.
  deleteConfirmMessage?: string
}

export function SelectionBar({
  selectedCount,
  onDelete,
  onExport,
  onClear,
  itemName = "elemento",
  deleteConfirmMessage,
}: SelectionBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (selectedCount === 0) return null

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      onClear()
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const pluralName = selectedCount === 1 ? itemName : `${itemName}s`

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
        <div className="bg-[#1C1A12] text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} {pluralName} seleccionado{selectedCount !== 1 ? "s" : ""}
          </span>
          
          <div className="h-4 w-px bg-white/20" />
          
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <Download size={14} />
                Exportar
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}
          </div>
          
          <div className="h-4 w-px bg-white/20" />
          
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Limpiar selección"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title={`Eliminar ${selectedCount} ${pluralName}`}
        message={deleteConfirmMessage || `¿Estás seguro de eliminar ${selectedCount} ${pluralName}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
