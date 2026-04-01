"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId, today } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, Stat, HR, EditableSelect } from "@/components/nitia-ui"
import type { QuoteComparison } from "@/lib/types"
import { Plus, Trash2, Check, Star } from "lucide-react"

export function Quotes() {
  const { data, addRow, updateRow, deleteRow } = useApp()
  const [showNew, setShowNew] = useState(false)
  const [filterProject, setFilterProject] = useState("")

  const quotes = data.quoteComparisons
    .filter(q => !filterProject || q.project_id === filterProject)

  // Group by category+item
  const grouped = quotes.reduce((acc, q) => {
    const key = `${q.category}::${q.item}`
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {} as Record<string, QuoteComparison[]>)

  const selectedQuotes = quotes.filter(q => q.selected)
  const totalSelected = selectedQuotes.reduce((s, q) => s + q.cost, 0)
  const totalClient14 = selectedQuotes.reduce((s, q) => s + q.price_x14, 0)
  const totalClient16 = selectedQuotes.reduce((s, q) => s + q.price_x16, 0)

  const toggleSelect = async (id: string) => {
    const q = quotes.find(x => x.id === id)
    if (!q) return
    // Deselect others in same group, select this one
    const groupQuotes = quotes.filter(x => x.category === q.category && x.item === q.item)
    for (const gq of groupQuotes) {
      if (gq.id === id) await updateRow("quote_comparisons", gq.id, { selected: !gq.selected }, "quoteComparisons")
      else if (gq.selected) await updateRow("quote_comparisons", gq.id, { selected: false }, "quoteComparisons")
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Cotizaciones</h1>
          <p className="text-sm text-[#76746A] mt-1">Comparaci{"\u00f3"}n de presupuestos de proveedores</p>
        </div>
        <div className="flex gap-2">
          <FormSelect value={filterProject} onChange={setFilterProject}
            options={[{ value: "", label: "Todos los proyectos" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
          <Btn onClick={() => setShowNew(true)}><Plus size={14} className="mr-1 inline" />Nueva Cotizaci{"\u00f3"}n</Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Costo Seleccionados" value={formatCurrency(totalSelected)} />
        <Stat label="Precio x1.4" value={formatCurrency(totalClient14)} />
        <Stat label="Precio x1.6" value={formatCurrency(totalClient16)} highlight />
      </div>

      {/* Grouped quotes */}
      {Object.entries(grouped).map(([key, items]) => {
        const [category, item] = key.split("::")
        return (
          <div key={key} className="bg-card border border-border rounded-xl p-6">
            <SecHead title={`${category} \u2014 ${item}`} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F0EDE4]">
                  <tr>
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    <th className="px-3 py-2 text-right">x1.4</th>
                    <th className="px-3 py-2 text-right">x1.6</th>
                    <th className="px-3 py-2 text-right">Ganancia x1.4</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(q => (
                    <tr key={q.id} className={`border-b last:border-0 ${q.selected ? "bg-green-50" : "hover:bg-[#FAFAF9]"}`}>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleSelect(q.id)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            q.selected ? "bg-green-600 border-green-600 text-white" : "border-[#E0DDD0]"}`}>
                          {q.selected && <Check size={12} />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium">{q.provider_name}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(q.cost)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(q.price_x14)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(q.price_x16)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(q.ganancia_x14)}</td>
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

      {quotes.length === 0 && <Empty title="Sin cotizaciones" action={<Btn onClick={() => setShowNew(true)}>Agregar</Btn>} />}

      {showNew && <QuoteModal projects={data.projects} providers={data.providers}
        onClose={() => setShowNew(false)}
        onSave={async (q) => { await addRow("quote_comparisons", q, "quoteComparisons"); setShowNew(false) }}
      />}
    </div>
  )
}

function QuoteModal({ projects, providers, onClose, onSave }: {
  projects: any[]; providers: any[]; onClose: () => void; onSave: (q: QuoteComparison) => void
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [category, setCategory] = useState("")
  const [item, setItem] = useState("")
  const [providerName, setProviderName] = useState("")
  const [providerId, setProviderId] = useState("")
  const [cost, setCost] = useState("")

  const costNum = parseFloat(cost) || 0

  return (
    <Modal isOpen={true} title="Nueva Cotizaci\u00f3n" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({
        id: generateId(), date: today(), project_id: projectId || null,
        category, item, provider_id: providerId || null,
        provider_name: providerName || providers.find(p => p.id === providerId)?.name || "",
        cost: costNum, price_x14: costNum * 1.4, price_x16: costNum * 1.6,
        ganancia_x14: costNum * 0.4, ganancia_x16: costNum * 0.6, selected: false,
      })}} className="space-y-4">
        <FormSelect label="Proyecto" value={projectId} onChange={setProjectId}
          options={projects.map(p => ({ value: p.id, label: p.name }))} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Categor\u00eda" value={category} onChange={setCategory} placeholder="Ej: Pisos" />
          <FormInput label="\u00cdtem" value={item} onChange={setItem} placeholder="Ej: Porcelanato 60x60" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label="Proveedor" value={providerId} onChange={v => {
            setProviderId(v); setProviderName(providers.find(p => p.id === v)?.name || "")
          }} options={providers.map(p => ({ value: p.id, label: p.name }))} />
          <FormInput label="Costo" type="number" value={cost} onChange={setCost} inputMode="decimal" />
        </div>
        {costNum > 0 && (
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
