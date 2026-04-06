"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { generateId, today } from "@/lib/helpers"
import { Modal, FormInput, FormMoneyInput, FormSelect, Btn, EditableSelect } from "@/components/nitia-ui"
import type { Movement } from "@/lib/types"

export function GlobalMovementModal({ onClose }: { onClose: () => void }) {
  const { data, addMovement, uploadFile, getCategoriesFor, addCategory, deleteCategory } = useApp()
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">("egreso")
  const [category, setCategory] = useState("")
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? "")
  const [projectId, setProjectId] = useState("")
  const [providerId, setProviderId] = useState("")
  const [medioPago, setMedioPago] = useState("")
  const [autoSplit, setAutoSplit] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let receiptUrl: string | null = null
    let receiptPath: string | null = null
    if (receiptFile) {
      const result = await uploadFile("documents", `receipts/general/${Date.now()}_${receiptFile.name}`, receiptFile)
      if (result) { receiptUrl = result.url; receiptPath = result.path }
    }
    const movement: Movement = {
      id: generateId(), date, description,
      amount: parseFloat(amount), type, category: category || null,
      account_id: accountId || null, project_id: projectId || null,
      provider_id: providerId || null, medio_pago: medioPago || null,
      auto_split: type === "ingreso" ? autoSplit : false,
      split_percentage: 50,
      receipt_url: receiptUrl,
      receipt_path: receiptPath,
      created_at: new Date().toISOString(),
    }
    await addMovement(movement)
    onClose()
  }

  return (
    <Modal isOpen={true} title="Nuevo Movimiento" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
          <FormSelect label="Tipo" value={type} onChange={v => setType(v as any)}
            options={[{ value: "ingreso", label: "Ingreso" }, { value: "egreso", label: "Egreso" }]} />
        </div>
        <FormInput label="Descripción" value={description} onChange={setDescription} />
        <div className="grid grid-cols-2 gap-3">
          <FormMoneyInput label="Monto" value={amount} onChange={setAmount} />
          <FormSelect label="Cuenta" value={accountId} onChange={setAccountId}
            options={data.accounts.map(a => ({ value: a.id, label: `${a.name}${a.type === "dolares" ? " (U$D)" : ""}` }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <EditableSelect label="Categoría" value={category} onChange={setCategory}
            options={getCategoriesFor("movimiento_cuenta").map(c => ({ value: c.name, label: c.name }))}
            onAddNew={n => addCategory("movimiento_cuenta", n)} onDelete={deleteCategory} />
          <FormSelect label="Medio de pago" value={medioPago} onChange={setMedioPago}
            options={[{ value: "", label: "—" }, { value: "efectivo", label: "Efectivo" }, { value: "transferencia", label: "Transferencia" },
              { value: "cheque", label: "Cheque" }, { value: "tarjeta", label: "Tarjeta" }, { value: "mercadopago", label: "Mercado Pago" }]} />
        </div>
        <FormSelect label="Proyecto (opcional)" value={projectId} onChange={setProjectId}
          options={[{ value: "", label: "Sin proyecto" }, ...data.projects.map(p => ({ value: p.id, label: p.name }))]} />
        <FormSelect label="Proveedor (opcional)" value={providerId} onChange={setProviderId}
          options={[{ value: "", label: "Sin proveedor" }, ...data.providers.map(p => ({ value: p.id, label: p.name }))]} />
        {type === "ingreso" && (
          <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
            <input type="checkbox" checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-green-800">Distribuir 50/50 a socias</p>
              <p className="text-xs text-green-600">Se calculará en Finanzas Personales</p>
            </div>
          </div>
        )}
        {/* Adjuntar comprobante */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comprobante (opcional)</label>
          {receiptFile ? (
            <div className="flex items-center gap-2 bg-[#F0EDE4] rounded-lg px-3 py-2">
              <span className="text-sm flex-1 truncate">{receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)</span>
              <button type="button" onClick={() => setReceiptFile(null)} className="text-xs text-red-600 hover:underline">Quitar</button>
            </div>
          ) : (
            <label className="flex items-center gap-2 border border-dashed border-[#E0DDD0] rounded-lg px-3 py-2.5 cursor-pointer hover:border-[#5F5A46] transition-colors">
              <span className="text-sm text-muted-foreground">Adjuntar archivo...</span>
              <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setReceiptFile(f) }} />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!description || !amount}>Registrar</Btn>
        </div>
      </form>
    </Modal>
  )
}
