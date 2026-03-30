"use client"

import { useState, useCallback, useMemo } from "react"

interface UseSelectionOptions<T> {
  items: T[]
  idField?: keyof T
}

export function useSelection<T extends { id: string }>({ 
  items,
  idField = "id" as keyof T 
}: UseSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allIds = useMemo(() => items.map(item => String(item[idField])), [items, idField])
  
  const isAllSelected = useMemo(() => 
    items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  )
  
  const isSomeSelected = useMemo(() => 
    selectedIds.size > 0 && selectedIds.size < items.length,
    [selectedIds.size, items.length]
  )

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [isAllSelected, allIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds))
  }, [allIds])

  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.has(String(item[idField]))),
    [items, selectedIds, idField]
  )

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    selectedItems,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    selectAll,
    hasSelection: selectedIds.size > 0,
  }
}
