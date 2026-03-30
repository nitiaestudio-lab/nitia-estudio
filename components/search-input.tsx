"use client"

import { Search, X } from "lucide-react"
import { useState, useEffect, useMemo } from "react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search 
        size={16} 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#76746A]" 
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-[#E0DDD0] bg-white focus:outline-none focus:ring-1 focus:ring-[#5F5A46] focus:border-[#5F5A46] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#F0EDE4] text-[#76746A] hover:text-[#1C1A12] transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// Hook para filtrar items con búsqueda
export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  debounceMs: number = 150
) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [query, debounceMs])

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return items

    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field]
        if (value == null) return false
        return String(value).toLowerCase().includes(normalizedQuery)
      })
    })
  }, [items, searchFields, debouncedQuery])

  return {
    query,
    setQuery,
    filteredItems,
    isFiltering: query !== debouncedQuery,
    hasResults: filteredItems.length > 0,
    resultCount: filteredItems.length,
  }
}
