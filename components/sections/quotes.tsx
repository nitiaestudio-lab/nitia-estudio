"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId, today, quoteClientPrice, quoteGanancia } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, Stat, HR, EditableSelect } from "@/components/nitia-ui"
import { exportComparadorXLSX } from "@/lib/export-utils"
import type { QuoteComparison } from "@/lib/types"
import { Plus, Trash2, Check, Star, FileSpreadsheet, ExternalLink } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  mano_de_obra: "Mano de Obra", material: "Material", mobiliario: "Mobiliario",
}

export function Quotes() {
  const { data, addRow, updateRow, deleteRow, setSection, setSelectedProjectId } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [filterProject, setFilterProject] = useState("")

  const quotes = data.quoteComparisons.filter(q => !filterProject || q.project_id === filterProject)

  const grouped = useMemo(() => {
    const acc: Record<string, QuoteComparison[]> = {}
    for (const q of quotes) {
      const key = `${q.category}::${q.item}`
      if (!acc[key]) acc[key] = []
      acc[key].push(q)
    }
    return acc
  }, [quotes])

  const selectedQuotes = quotes.filter(q => q.selected)
  const totalCost = selectedQuotes.reduce((s, q) => s + q.cost, 0)
  const totalClient = selectedQuotes.reduce((s, q) => s + quoteClientPrice(q), 0)
  const totalGanancia = selectedQuotes.reduce((s, q) => s + quoteGanancia(q), 0)

  const toggleSelect = async (q: QuoteComparison, multiplier: number) => {
    const groupQuotes = quotes.filter(x => x.category === q.category && x.item === q.item)
    for (const gq of groupQuotes) {
      if (gq.id === q.id) {
        const newSel = !gq.selected
        await updateRow("quote_comparisons", gq.id, { selected: newSel, selected_multiplier: newSel ? multiplier : null }, "quoteComparisons")
      } else if (gq.selected) {
        await updateRow("quote_comparisons", gq.id, { selected: false, selected_multiplier: null }, "quoteComparisons")
      }
    }
  }

  const goToProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setSection("projects")
  }

  const handleExport = () => {
    exportComparadorXLSX("global", quotes.map(q => ({
      category: q.category, item: q.item, type: q.type || "mobiliario",
      provider: q.provider_name, cost: q.cost,
      priceX14: q.price_x14, priceX16: q.price_x16,
      gananciaX14: q.ganancia_x14, gananciaX16: q.ganancia_x16,
      selected: q.selected,
    })))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Cotizaciones</h1>
          <p className="text-sm text-[#76746A] mt-1">Comparación global de presupuestos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormSelect value={filterProject} onChange={setFilterProject}
            options={[{ value: "", label: "Todos los proyectos" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
          <Btn variant="soft" size="sm" onClick={handleExport}><FileSpreadsheet size={14} className="mr-1 inline" />XLSX</Btn>
          <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nueva</Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Costo Seleccionados" value={formatCurrency(totalCost)} />
        <Stat label="Precio Cliente" value={formatCurrency(totalClient)} />
        <Stat label="Ganancia" value={formatCurrency(totalGanancia)} highlight />
      </div>

      {/* Grouped quotes */}
      {Object.entries(grouped).map(([key, items]) => {
        const [category, item] = key.split("::")
        const isMaterial = items[0]?.type === "material"
        const projectName = items[0]?.project_id ? data.projects.find(p => p.id === items[0].project_id)?.name : null

        return (
          <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F0EDE4] border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{category} — {item}</span>
                <Tag label={TYPE_LABELS[items[0]?.type || "mobiliario"]} color={isMaterial ? "blue" : "green"} />
              </div>
              {projectName && items[0]?.project_id && (
                <button onClick={() => goToProject(items[0].project_id!)}
                  className="text-xs text-[#5F5A46] hover:underline flex items-center gap-1">
                  {projectName} <ExternalLink size={10} />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF9]">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    {!isMaterial && (
                      <>
                        <th className="px-3 py-2 text-right">x1.4</th>
                        <th className="px-3 py-2 text-right">x1.6</th>
                        <th className="px-3 py-2 text-right hidden md:table-cell">Ganancia x1.4</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-center">Elegir</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(q => (
                    <tr key={q.id} className={`border-b last:border-0 ${q.selected ? "bg-green-50" : "hover:bg-[#FAFAF9]"}`}>
                      <td className="px-3 py-2">{q.selected && <Check size={14} className="text-green-600" />}</td>
                      <td className="px-3 py-2 font-medium">{q.provider_name}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(q.cost)}</td>
                      {!isMaterial && (
                        <>
                          <td className="px-3 py-2 text-right">{formatCurrency(q.price_x14)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(q.price_x16)}</td>
                          <td className="px-3 py-2 text-right text-green-600 hidden md:table-cell">{formatCurrency(q.ganancia_x14)}</td>
                        </>
                      )}
                      <td className="px-3 py-2 text-center">
                        {isMaterial ? (
                          <button onClick={() => toggleSelect(q, 1)}
                            className={`px-3 py-1 rounded text-xs font-medium ${q.selected ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                            {q.selected ? "✓" : "Elegir"}
                          </button>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => toggleSelect(q, 1.4)}
                              className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.4 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                              x1.4
                            </button>
                            <button onClick={() => toggleSelect(q, 1.6)}
                              className={`px-2 py-1 rounded text-xs font-medium ${q.selected && q.selected_multiplier === 1.6 ? "bg-green-600 text-white" : "bg-[#F0EDE4] hover:bg-[#E0DDD0]"}`}>
                              x1.6
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => deleteRow("quote_comparisons", q.id, "quoteComparisons")}
                          className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-600" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {quotes.length === 0 && <Empty title="Sin cotizaciones" description="Las cotizaciones se crean desde el comparador de cada proyecto" />}

      {showNew && <GlobalQuoteModal projects={data.projects} providers={data.providers}
        onClose={() => setShowNew(false)}
        onSave={async (q) => { await addRow("quote_comparisons", q, "quoteComparisons"); setShowNew(false) }} />}
    </div>
  )
}

function GlobalQuoteModal({ projects, providers, onClose, onSave }: {
  projects: any[]; providers: any[]; onClose: () => void; onSave: (q: QuoteComparison) => void
}) {
  const { getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [category, setCategory] = useState("")
  const [item, setItem] = useState("")
  const [itemType, setItemType] = useState<"mano_de_obra" | "material" | "mobiliario">("mobiliario")
  const [providerName, setProviderName] = useState("")
  const [providerId, setProviderId] = useState("")
  const [cost, setCost] = useState("")

  const costNum = parseFloat(cost) || 0
  const isMaterial = itemType === "material"
  const quoteCats = getCategoriesFor("quote_category")

  return (
    <Modal isOpen={true} title="Nueva Cotización" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), date: today(), project_id: projectId || null,
        category, item, type: itemType,
        provider_id: providerId || null,
        provider_name: providerName || providers.find(p => p.id === providerId)?.name || "",
        cost: costNum,
        price_x14: costNum * 1.4, price_x16: costNum * 1.6,
        ganancia_x14: costNum * 0.4, ganancia_x16: costNum * 0.6,
        selected: false, selected_multiplier: null,
      })}} className="space-y-4">
        <FormSelect label="Proyecto" value={projectId} onChange={setProjectId}
          options={projects.map(p => ({ value: p.id, label: p.name }))} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={quoteCats.map(c => ({ value: c.name, label: c.name }))}
            onAddNew={(name) => addCategory("quote_category", name)}
            onDelete={(name) => deleteCategory(name)}
            placeholder="Ej: Carpintería" />
          <FormInput label="Ítem" value={item} onChange={setItem} placeholder="Ej: Mueble de TV" />
        </div>
        <FormSelect label="Tipo" value={itemType} onChange={v => setItemType(v as any)}
          options={[
            { value: "mobiliario", label: "Mobiliario (con multiplicador)" },
            { value: "mano_de_obra", label: "Mano de Obra (con multiplicador)" },
            { value: "material", label: "Material (sin ganancia)" },
          ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Proveedor" value={providerId} onChange={v => {
            setProviderId(v); setProviderName(providers.find(p => p.id === v)?.name || "")
          }} options={providers.map(p => ({ value: p.id, label: p.name }))} />
          <FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" />
        </div>
        {costNum > 0 && !isMaterial && (
          <div className="bg-[#F0EDE4] rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">x1.4:</span> <span className="font-semibold">{formatCurrency(costNum * 1.4)}</span></div>
            <div><span className="text-muted-foreground">x1.6:</span> <span className="font-semibold">{formatCurrency(costNum * 1.6)}</span></div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!item || !cost || !category}>Agregar</Btn>
        </div>
      </form>
    </Modal>
  )
}
