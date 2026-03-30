"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { generateId, today } from "@/lib/helpers"
import { Modal, FormInput, FormSelect, Btn } from "@/components/nitia-ui"
import type { GlobalMovement } from "@/lib/types"

interface GlobalMovementModalProps {
  onClose: () => void
  defaultProjectId?: string | null
  defaultProviderId?: string | null
  defaultAccountId?: string | null
  defaultType?: "ingreso" | "egreso"
}

export function GlobalMovementModal({
  onClose,
  defaultProjectId = null,
  defaultProviderId = null,
  defaultAccountId = null,
  defaultType = "egreso",
}: GlobalMovementModalProps) {
  const { data, addGlobalMovement } = useApp()

  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"ingreso" | "egreso">(defaultType)
  const [category, setCategory] = useState("Materiales")
  const [projectId, setProjectId] = useState(defaultProjectId || "")
  const [providerId, setProviderId] = useState(defaultProviderId || "")
  const [accountId, setAccountId] = useState(defaultAccountId || data.accounts[0]?.id || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const movement: GlobalMovement = {
      id: generateId(),
      date,
      description,
      amount: parseFloat(amount),
      type,
      category,
      projectId: projectId || null,
      providerId: providerId || null,
      accountId: accountId || null,
      quoteId: null,
    }
    addGlobalMovement(movement)
    onClose()
  }

  const categories = [
    { value: "Honorarios", label: "Honorarios" },
    { value: "Mano de obra", label: "Mano de obra" },
    { value: "Materiales", label: "Materiales" },
    { value: "Mobiliario", label: "Mobiliario" },
    { value: "Proveedor", label: "Pago a proveedor" },
    { value: "Servicios", label: "Servicios" },
    { value: "Varios", label: "Varios" },
  ]

  return (
    <Modal title="Nuevo Movimiento" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo y Fecha */}
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Tipo de movimiento"
            value={type}
            onChange={(v) => setType(v as "ingreso" | "egreso")}
            options={[
              { value: "ingreso", label: "Ingreso (+)" },
              { value: "egreso", label: "Egreso (-)" },
            ]}
          />
          <FormInput label="Fecha" type="date" value={date} onChange={setDate} />
        </div>

        {/* Descripcion */}
        <FormInput
          label="Descripcion"
          value={description}
          onChange={setDescription}
          placeholder="Ej: Pago anticipo materiales"
        />

        {/* Monto y Categoria */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Importe ($)"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="0"
            inputMode="decimal"
          />
          <FormSelect
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={categories}
          />
        </div>

        {/* Relaciones */}
        <div className="p-4 bg-[#F7F5ED] rounded-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#76746A]">
            Vincular a (opcional)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Proyecto */}
            <FormSelect
              label="Proyecto"
              value={projectId}
              onChange={setProjectId}
              options={[
                { value: "", label: "Sin proyecto" },
                ...data.projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            {/* Proveedor */}
            <FormSelect
              label="Proveedor"
              value={providerId}
              onChange={setProviderId}
              options={[
                { value: "", label: "Sin proveedor" },
                ...data.providers.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            {/* Cuenta */}
            <FormSelect
              label="Cuenta"
              value={accountId}
              onChange={setAccountId}
              options={[
                { value: "", label: "Sin cuenta" },
                ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-[#76746A] space-y-1">
          <p>
            Este movimiento se registrara en:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-0.5">
            {projectId && (
              <li>
                Proyecto:{" "}
                <span className="font-medium text-[#1C1A12]">
                  {data.projects.find((p) => p.id === projectId)?.name}
                </span>
              </li>
            )}
            {providerId && type === "egreso" && (
              <li>
                Proveedor:{" "}
                <span className="font-medium text-[#1C1A12]">
                  {data.providers.find((p) => p.id === providerId)?.name}
                </span>{" "}
                (como pago)
              </li>
            )}
            {accountId && (
              <li>
                Cuenta:{" "}
                <span className="font-medium text-[#1C1A12]">
                  {data.accounts.find((a) => a.id === accountId)?.name}
                </span>{" "}
                ({type === "ingreso" ? "suma" : "resta"} al saldo)
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!description || !amount}>
            Registrar Movimiento
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
