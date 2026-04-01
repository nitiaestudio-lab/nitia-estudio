"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId, today } from "@/lib/helpers"
import { SecHead, Btn, Modal, FormInput, FormSelect, Tag, Empty } from "@/components/nitia-ui"
import type { QuoteComparison } from "@/lib/types"
import { Plus, TrendingUp, Check, Trash2, Calculator, DollarSign, Award, Download, Info } from "lucide-react"
import { exportCotizaciones } from "@/lib/export-utils"
import { useSelection } from "@/hooks/use-selection"
import { SelectionBar } from "@/components/selection-bar"
import { SearchInput } from "@/components/search-input"
import { TableCheckbox, TableHeaderCheckbox } from "@/components/table-checkbox"
import { InlineEditField } from "@/components/inline-edit-field"

const CATEGORIES = [
  "Mueble TV",
  "Mueble recibidor",
  "Mueble escritorio",
  "Mueble dormitorio",
  "Mueble bano",
  "Sillon Living",
  "Mesa comedor",
  "Sillas",
  "Cortinas",
  "Iluminacion",
  "Alfombras",
  "Otro",
]

export function Quotes() {
  const { data, setData, addQuoteComparison, updateQuoteComparison, deleteQuoteComparison, deleteQuoteComparisons, selectQuote, toggleQuoteSelection } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter quotes by search
  const searchFilteredQuotes = useMemo(() => {
    if (!searchQuery) return data.quoteComparisons
    return data.quoteComparisons.filter((q) => 
      q.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [data.quoteComparisons, searchQuery])

  // Hook de selección masiva
  const selection = useSelection({ items: searchFilteredQuotes })

  // Group quotes by project first, then by category + item
  const quotesByProject = useMemo(() => {
    const byProject: Record<string, QuoteComparison[]> = {}
    searchFilteredQuotes.forEach((q) => {
      const projectId = q.projectId || "sin-proyecto"
      if (!byProject[projectId]) byProject[projectId] = []
      byProject[projectId].push(q)
    })
    return byProject
  }, [searchFilteredQuotes])

  // Get quotes for selected project grouped by category + item
  const groupedQuotes = useMemo(() => {
    const quotes = selectedProject ? quotesByProject[selectedProject] || [] : searchFilteredQuotes
    const groups: Record<string, QuoteComparison[]> = {}
    quotes.forEach((q) => {
      const key = `${q.category}|${q.item}`
      if (!groups[key]) groups[key] = []
      groups[key].push(q)
    })
    // Sort each group by cost (lowest first)
    Object.values(groups).forEach((g) => g.sort((a, b) => a.cost - b.cost))
    return groups
  }, [searchFilteredQuotes, quotesByProject, selectedProject])

  // Get unique categories from existing quotes
  const existingCategories = useMemo(() => {
    const quotes = selectedProject ? quotesByProject[selectedProject] || [] : searchFilteredQuotes
    return [...new Set(quotes.map((q) => q.category))]
  }, [searchFilteredQuotes, quotesByProject, selectedProject])

  // Filter by selected category
  const filteredGroups = useMemo(() => {
    if (!selectedCategory) return groupedQuotes
    return Object.fromEntries(
      Object.entries(groupedQuotes).filter(([key]) => key.startsWith(selectedCategory + "|"))
    )
  }, [groupedQuotes, selectedCategory])

  const getProjectName = (projectId: string) => {
    if (projectId === "sin-proyecto") return "Sin proyecto"
    return data.projects.find((p) => p.id === projectId)?.name ?? "Proyecto eliminado"
  }

  // Get best quote for simulation panel
  const getBestQuote = (category: string) => {
    const quotes = searchFilteredQuotes.filter((q) => q.category === category)
    if (quotes.length === 0) return null
    // Best = lowest cost
    return quotes.reduce((best, q) => (q.cost < best.cost ? q : best))
  }

  const partnerCount = data.partnerCount || 2

  // Handler para eliminar seleccionados
  const handleDeleteSelected = async () => {
    await deleteQuoteComparisons(selection.selectedIds)
    selection.clearSelection()
  }

  // Handler para exportar seleccionados
  const handleExportSelected = () => {
    const selectedQuotes = selection.selectedItems
    exportCotizaciones(selectedQuotes, "seleccionadas")
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">
            Comparador de Cotizaciones
          </h1>
          <p className="text-sm text-[#76746A] mt-1">
            Vista general de todas las cotizaciones. Gestionalas dentro de cada proyecto.
          </p>
        </div>
        <div className="flex gap-2">
          {data.quoteComparisons.length > 0 && (
            <Btn variant="ghost" onClick={() => exportCotizaciones(data.quoteComparisons, "todas")}>
              <Download size={14} className="mr-1.5 inline" />
              Excel
            </Btn>
          )}
          <Btn onClick={() => setShowNew(true)}>
            <Plus size={14} className="mr-1.5 inline" />
            Nueva Cotizacion
          </Btn>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-[#E0F2FE] border border-[#7DD3FC] rounded-lg p-4 flex items-start gap-3">
        <Info size={18} className="text-[#0284C7] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-[#0369A1]">
            <strong>Tip:</strong> Las cotizaciones ahora se gestionan dentro de cada proyecto. 
            Ve a <strong>Proyectos → [Proyecto] → Cotizaciones</strong> para agregar y comparar cotizaciones de ese cliente.
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por item, proveedor o categoría..."
        className="max-w-md"
      />

      {/* Main Content - Two Columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Filter */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Por Proyecto</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProject(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  !selectedProject
                    ? "bg-[#5F5A46] text-white"
                    : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
                }`}
              >
                Todos
              </button>
              {data.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedProject === project.id
                      ? "bg-[#5F5A46] text-white"
                      : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {existingCategories.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Por Categoria</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    !selectedCategory
                      ? "bg-[#2A4A6A] text-white"
                      : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
                  }`}
                >
                  Todas
                </button>
                {existingCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      selectedCategory === cat
                        ? "bg-[#2A4A6A] text-white"
                        : "bg-[#F0EDE4] text-[#76746A] hover:bg-[#E0DDD0]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quotes Groups */}
          {Object.entries(filteredGroups).length === 0 ? (
            <Empty
              title="No hay cotizaciones"
              description="Agrega tu primera cotizacion para comenzar a comparar"
              action={<Btn onClick={() => setShowNew(true)}>Agregar Cotizacion</Btn>}
            />
          ) : (
            Object.entries(filteredGroups).map(([key, quotes]) => {
              const [category, item] = key.split("|")
              const bestCost = Math.min(...quotes.map((q) => q.cost))
              const bestMargin = Math.max(...quotes.map((q) => q.gananciaX14))

              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-[#E0DDD0] overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="p-4 lg:p-5 border-b border-[#E0DDD0] bg-[#FAFAF9]">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Tag label={category} color="olive" />
                          {quotes[0]?.projectId && (
                            <span className="text-xs bg-[#2A4A6A]/10 text-[#2A4A6A] px-2 py-0.5 rounded">
                              {getProjectName(quotes[0].projectId)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-medium text-[#1C1A12] mt-2">{item}</h3>
                      </div>
                      <div className="text-right text-xs text-[#76746A]">
                        {quotes.length} cotizacion{quotes.length > 1 ? "es" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E0DDD0] bg-[#F7F5ED]">
                          <th className="text-left text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            Proveedor
                          </th>
                          <th className="text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            Costo
                          </th>
                          <th className="text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            x1.4
                          </th>
                          <th className="text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            x1.6
                          </th>
                          <th className="text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            Ganancia
                          </th>
                          <th className="text-right text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            x socia
                          </th>
                          <th className="text-center text-[9px] font-semibold tracking-[0.1em] uppercase text-[#76746A] px-4 py-2.5">
                            Accion
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map((quote) => {
                          const isBestCost = quote.cost === bestCost
                          const isBestMargin = quote.gananciaX14 === bestMargin
                          const gananciaIndividual = quote.gananciaX14 / partnerCount

                          return (
                            <tr
                              key={quote.id}
                              className={`border-b border-[#E0DDD0] last:border-0 ${
                                quote.selected ? "bg-[#E6F2E0]" : "hover:bg-[#F7F5ED]"
                              } transition-colors`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[#1C1A12]">
                                    {quote.providerName}
                                  </span>
                                  {isBestCost && (
                                    <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 bg-[#2A4A6A]/10 text-[#2A4A6A] rounded">
                                      Mejor precio
                                    </span>
                                  )}
                                  {isBestMargin && !isBestCost && (
                                    <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 bg-[#295E29]/10 text-[#295E29] rounded">
                                      Mejor margen
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-[#1C1A12] tabular-nums">
                                {formatCurrency(quote.cost)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-[#76746A] tabular-nums">
                                {formatCurrency(quote.priceX14)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-[#76746A] tabular-nums">
                                {formatCurrency(quote.priceX16)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-[#295E29] tabular-nums">
                                {formatCurrency(quote.gananciaX14)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-[#76746A] tabular-nums">
                                {formatCurrency(gananciaIndividual)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {quote.selected ? (
                                    <span className="text-[10px] font-semibold uppercase text-[#295E29] flex items-center gap-1">
                                      <Check size={14} />
                                      Elegido
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => selectQuote(quote.id)}
                                      className="text-xs text-[#5F5A46] hover:text-[#1C1A12] underline"
                                    >
                                      Seleccionar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteQuoteComparison(quote.id)}
                                    className="ml-2 text-[#76746A] hover:text-[#8B2323] p-1"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right: Simulation Panel */}
        <div className="space-y-4">
          {/* Partner Count Config */}
          <div className="bg-white rounded-2xl border border-[#E0DDD0] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#5F5A46]/10 flex items-center justify-center">
                <Calculator size={16} className="text-[#5F5A46]" />
              </div>
              <h3 className="font-serif text-lg font-light text-[#1C1A12]">Configuracion</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#76746A]">Numero de socias</span>
              <select
                value={partnerCount}
                onChange={(e) =>
                  setData((prev: any) => ({ ...prev, partnerCount: parseInt(e.target.value) }))
                }
                className="text-sm border border-[#E0DDD0] rounded-lg px-3 py-1.5 bg-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>

          {/* Best by Category */}
          <div className="bg-white rounded-2xl border border-[#E0DDD0] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#295E29]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#295E29]" />
              </div>
              <h3 className="font-serif text-lg font-light text-[#1C1A12]">Mejor Opcion</h3>
            </div>
            <p className="text-xs text-[#76746A] mb-4">Por categoria</p>

            <div className="space-y-4">
              {existingCategories.map((category) => {
                const best = getBestQuote(category)
                if (!best) return null
                const gananciaIndividual = best.gananciaX14 / partnerCount

                return (
                  <div
                    key={category}
                    className="p-3 bg-[#F7F5ED] rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Tag label={category} color="olive" />
                      {best.selected && (
                        <Award size={14} className="text-[#295E29]" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#1C1A12] mb-1">
                      {best.providerName}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <p className="text-[#76746A]">Costo</p>
                        <p className="font-medium text-[#1C1A12]">{formatCurrency(best.cost)}</p>
                      </div>
                      <div>
                        <p className="text-[#76746A]">Precio cliente</p>
                        <p className="font-medium text-[#1C1A12]">{formatCurrency(best.priceX14)}</p>
                      </div>
                      <div>
                        <p className="text-[#76746A]">Ganancia</p>
                        <p className="font-medium text-[#295E29]">{formatCurrency(best.gananciaX14)}</p>
                      </div>
                      <div>
                        <p className="text-[#76746A]">x socia</p>
                        <p className="font-medium text-[#295E29]">{formatCurrency(gananciaIndividual)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {existingCategories.length === 0 && (
                <p className="text-sm text-[#76746A] text-center py-4">
                  Agrega cotizaciones para ver recomendaciones
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          {data.quoteComparisons.filter((q) => q.selected).length > 0 && (
            <div className="bg-[#295E29] text-white rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
                <h3 className="font-serif text-lg font-light">Resumen Seleccion</h3>
              </div>
              {(() => {
                const selected = data.quoteComparisons.filter((q) => q.selected)
                const totalCost = selected.reduce((sum, q) => sum + q.cost, 0)
                const totalPrice = selected.reduce((sum, q) => sum + q.priceX14, 0)
                const totalGanancia = selected.reduce((sum, q) => sum + q.gananciaX14, 0)
                const gananciaIndividual = totalGanancia / partnerCount

                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="opacity-70">Total costo</span>
                      <span className="font-medium tabular-nums">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-70">Precio cliente</span>
                      <span className="font-medium tabular-nums">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="h-px bg-white/20" />
                    <div className="flex justify-between text-base">
                      <span>Ganancia total</span>
                      <span className="font-bold tabular-nums">{formatCurrency(totalGanancia)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-70">Por socia ({partnerCount})</span>
                      <span className="font-medium tabular-nums">{formatCurrency(gananciaIndividual)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Barra de selección masiva */}
      <SelectionBar
        selectedCount={selection.selectedCount}
        onDelete={handleDeleteSelected}
        onExport={handleExportSelected}
        onClear={selection.clearSelection}
        itemName="cotización"
      />

      {/* New Quote Modal */}
      {showNew && (
        <NewQuoteModal
          onClose={() => setShowNew(false)}
          onSave={async (quote) => {
            await addQuoteComparison(quote)
            setShowNew(false)
          }}
          providers={data.providers}
          projects={data.projects}
        />
      )}
    </div>
  )
}

// New Quote Modal
function NewQuoteModal({
  onClose,
  onSave,
  providers,
  projects,
}: {
  onClose: () => void
  onSave: (quote: QuoteComparison) => void
  providers: Array<{ id: string; name: string; category: string }>
  projects: Array<{ id: string; name: string }>
}) {
  const [date, setDate] = useState(today())
  const [projectId, setProjectId] = useState(projects[0]?.id || "")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [item, setItem] = useState("")
  const [providerId, setProviderId] = useState("")
  const [providerName, setProviderName] = useState("")
  const [cost, setCost] = useState("")

  const handleProviderChange = (id: string) => {
    setProviderId(id)
    if (id) {
      const provider = providers.find((p) => p.id === id)
      setProviderName(provider?.name || "")
    } else {
      setProviderName("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const costNum = parseFloat(cost)
    const quote: QuoteComparison = {
      id: generateId(),
      date,
      projectId,
      category,
      item,
      providerId,
      providerName: providerName || "Proveedor manual",
      cost: costNum,
      priceX14: costNum * 1.4,
      priceX16: costNum * 1.6,
      gananciaX14: costNum * 0.4,
      gananciaX16: costNum * 0.6,
      selected: false,
    }
    onSave(quote)
  }

  return (
    <Modal isOpen={true} title="Nueva Cotizacion" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSelect
          label="Proyecto"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>

        <FormInput
          label="Item / Descripcion"
          value={item}
          onChange={setItem}
          placeholder="Ej: Mueble TV roble 180cm"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Proveedor (del directorio)"
            value={providerId}
            onChange={handleProviderChange}
            options={[
              { value: "", label: "Seleccionar o escribir..." },
              ...providers.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <FormInput
            label="O nombre manual"
            value={providerName}
            onChange={setProviderName}
            placeholder="Nombre del proveedor"
          />
        </div>

        <FormInput
          label="Costo del proveedor ($)"
          type="number"
          value={cost}
          onChange={setCost}
          placeholder="0"
          inputMode="decimal"
        />

        {cost && parseFloat(cost) > 0 && (
          <div className="p-4 bg-[#E6F2E0] rounded-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#295E29] mb-3">
              Calculo automatico
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#76746A]">Precio x1.4</p>
                <p className="font-medium text-[#1C1A12]">
                  {formatCurrency(parseFloat(cost) * 1.4)}
                </p>
              </div>
              <div>
                <p className="text-[#76746A]">Precio x1.6</p>
                <p className="font-medium text-[#1C1A12]">
                  {formatCurrency(parseFloat(cost) * 1.6)}
                </p>
              </div>
              <div>
                <p className="text-[#76746A]">Ganancia x1.4</p>
                <p className="font-medium text-[#295E29]">
                  {formatCurrency(parseFloat(cost) * 0.4)}
                </p>
              </div>
              <div>
                <p className="text-[#76746A]">Ganancia x1.6</p>
                <p className="font-medium text-[#295E29]">
                  {formatCurrency(parseFloat(cost) * 0.6)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!item || !cost || (!providerId && !providerName) || !projectId}>
            Agregar Cotizacion
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
