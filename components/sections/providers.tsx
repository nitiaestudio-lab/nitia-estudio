"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { formatCurrency, generateId } from "@/lib/helpers"
import { SecHead, Tag, Btn, Empty, Modal, FormInput, FormSelect, FormTextarea, ExportButton } from "@/components/nitia-ui"
import type { Provider, ProviderPaymentDetail } from "@/lib/types"
import { exportProveedores } from "@/lib/export-utils"
import { Plus, Phone, Mail, ChevronDown, AlertCircle, CheckCircle, Clock, FileText, Upload, Trash2, ArrowLeft } from "lucide-react"
import { useSelection } from "@/hooks/use-selection"
import { SelectionBar } from "@/components/selection-bar"
import { SearchInput } from "@/components/search-input"
import { TableCheckbox, TableHeaderCheckbox } from "@/components/table-checkbox"
import { InlineEditField } from "@/components/inline-edit-field"

// Categorías y subcategorías
const PROVIDER_CATALOG = {
  "Mobiliario": ["Carpintería", "Muebles a medida", "Sillas"],
  "Construcción": ["Corralones", "Herrería", "Vidrios"],
  "Sanitarios": ["Griferías", "Cerámicos", "Accesorios"],
  "Iluminación": ["Iluminación técnica", "Lámparas"],
  "Decoración": ["Cortinas", "Papel tapiz", "Pintura"],
  "Servicios": ["Transporte", "Mano de obra", "Instalación"],
}

const ZONES = ["Zona Norte", "Zona Oeste", "Zona Sur", "CABA", "Recoleta", "Palermo", "Belgrano", "San Isidro"]

export function Providers() {
  const { data, addProvider, updateProvider, deleteProvider, deleteProviders } = useApp()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [showNewProvider, setShowNewProvider] = useState(false)
  const [filterCategory, setFilterCategory] = useState("")
  const [filterZone, setFilterZone] = useState("")
  const [filterSearch, setFilterSearch] = useState("")

  // Filtrar proveedores
  const filteredProviders = data.providers.filter((p) => {
    const matchCategory = !filterCategory || p.category === filterCategory
    const matchZone = !filterZone || p.zone === filterZone
    const matchSearch = !filterSearch || 
      p.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.contact?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.zone?.toLowerCase().includes(filterSearch.toLowerCase())
    return matchCategory && matchZone && matchSearch
  })

  // Hook de selección masiva
  const selection = useSelection({ items: filteredProviders })

  // Calcular deuda total con proveedores
  const calculateProviderDebt = (provider: Provider) => {
    return (provider.payments || [])
      .filter(p => p.status !== "pagado-completo")
      .reduce((sum, p) => sum + (p.balanceAmount || 0), 0)
  }
  
  const totalDebt = data.providers.reduce((sum, p) => sum + calculateProviderDebt(p), 0)
  const providersWithDebt = data.providers.filter(p => calculateProviderDebt(p) > 0)

  // Handler para eliminar seleccionados
  const handleDeleteSelected = async () => {
    await deleteProviders(selection.selectedIds)
    selection.clearSelection()
  }

  // Handler para exportar seleccionados
  const handleExportSelected = () => {
    const selectedProviders = selection.selectedItems
    exportProveedores(selectedProviders.map(p => ({
      name: p.name,
      category: p.category,
      phone: p.phone,
      email: p.email,
      cbu: p.cbu,
      alias: p.alias,
      zone: p.zone,
    })))
  }

  if (selectedProvider) {
    const provider = data.providers.find((p) => p.id === selectedProvider)
    if (!provider) return null
    return (
      <ProviderDetail
        provider={provider}
        onBack={() => setSelectedProvider(null)}
        onUpdate={(updated) => {
          updateProvider(provider.id, updated)
        }}
        onAddPayment={(payment) => {
          updateProvider(provider.id, {
            ...provider,
            payments: [...(provider.payments || []), payment],
          })
        }}
        onDelete={async () => {
          await deleteProvider(provider.id)
          setSelectedProvider(null)
        }}
      />
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Proveedores</h1>
          <p className="text-sm text-[#76746A] mt-1">Base de datos centralizada de proveedores</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            onClick={() => exportProveedores(filteredProviders.map(p => ({
              name: p.name,
              category: p.category,
              phone: p.phone,
              email: p.email,
              cbu: p.cbu,
              alias: p.alias,
              zone: p.zone,
            })))}
            disabled={filteredProviders.length === 0}
          />
          <Btn onClick={() => setShowNewProvider(true)}>
            <Plus size={14} className="mr-1.5 inline" />
            Nuevo Proveedor
          </Btn>
        </div>
      </div>

      {/* Deuda Total */}
      {totalDebt > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Deuda Total con Proveedores</h3>
                <p className="text-sm text-red-600">{providersWithDebt.length} proveedores con saldo pendiente</p>
              </div>
            </div>
            <div className="text-2xl font-semibold text-red-700">{formatCurrency(totalDebt)}</div>
          </div>
        </div>
      )}

      {/* Filtros mejorados */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={filterSearch}
          onChange={setFilterSearch}
          placeholder="Buscar por nombre, categoría, zona..."
          className="flex-1"
        />
        <FormSelect
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: "", label: "Todas categorías" },
            ...Object.keys(PROVIDER_CATALOG).map((c) => ({ value: c, label: c })),
          ]}
        />
        <FormSelect
          value={filterZone}
          onChange={setFilterZone}
          options={[
            { value: "", label: "Todas zonas" },
            ...ZONES.map((z) => ({ value: z, label: z })),
          ]}
        />
      </div>

      {/* Tabla de Proveedores con selección */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0EDE4] border-b border-border">
              <tr>
                <th className="px-4 py-4 text-left w-10">
                  <TableHeaderCheckbox
                    isAllSelected={selection.isAllSelected}
                    isSomeSelected={selection.isSomeSelected}
                    onToggleAll={selection.toggleAll}
                  />
                </th>
                <th className="px-4 py-4 text-left font-medium text-[#1C1A12]">Proveedor</th>
                <th className="px-4 py-4 text-left font-medium text-[#1C1A12]">Categoría</th>
                <th className="px-4 py-4 text-left font-medium text-[#1C1A12]">Zona</th>
                <th className="px-4 py-4 text-left font-medium text-[#1C1A12]">Contacto</th>
                <th className="px-4 py-4 text-center font-medium text-[#1C1A12]">Proyectos</th>
                <th className="px-4 py-4 text-right font-medium text-[#1C1A12]">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map((provider) => (
                <tr
                  key={provider.id}
                  className={`border-b border-border hover:bg-[#FAFAF9] transition-colors cursor-pointer ${
                    selection.isSelected(provider.id) ? "bg-[#F7F5ED]" : ""
                  }`}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <TableCheckbox
                      checked={selection.isSelected(provider.id)}
                      onChange={() => selection.toggleItem(provider.id)}
                    />
                  </td>
                  <td className="px-4 py-4" onClick={() => setSelectedProvider(provider.id)}>
                    <InlineEditField
                      value={provider.name}
                      onSave={async (value) => {
                        await updateProvider(provider.id, { name: String(value) })
                      }}
                      fieldName="nombre"
                    />
                  </td>
                  <td className="px-4 py-4" onClick={() => setSelectedProvider(provider.id)}>
                    <Tag label={provider.category} color="olive" />
                  </td>
                  <td className="px-4 py-4 text-[#76746A]" onClick={() => setSelectedProvider(provider.id)}>
                    <InlineEditField
                      value={provider.zone || ""}
                      onSave={async (value) => {
                        await updateProvider(provider.id, { zone: String(value) })
                      }}
                      placeholder="Agregar zona"
                      fieldName="zona"
                    />
                  </td>
                  <td className="px-4 py-4" onClick={() => setSelectedProvider(provider.id)}>
                    <div className="text-xs text-[#76746A] space-y-1">
                      {provider.phone && (
                        <InlineEditField
                          value={provider.phone}
                          onSave={async (value) => {
                            await updateProvider(provider.id, { phone: String(value) })
                          }}
                          placeholder="Teléfono"
                          fieldName="teléfono"
                        />
                      )}
                      {provider.email && (
                        <InlineEditField
                          value={provider.email}
                          onSave={async (value) => {
                            await updateProvider(provider.id, { email: String(value) })
                          }}
                          placeholder="Email"
                          fieldName="email"
                        />
                      )}
                      {!provider.phone && !provider.email && (
                        <span className="text-[#B5B2A2] italic">Sin contacto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-medium text-[#1C1A12]" onClick={() => setSelectedProvider(provider.id)}>
                    {provider.projectIds?.length || 0}
                  </td>
                  <td className="px-4 py-4 text-right" onClick={() => setSelectedProvider(provider.id)}>
                    {calculateProviderDebt(provider) > 0 ? (
                      <span className="font-medium text-red-600">{formatCurrency(calculateProviderDebt(provider))}</span>
                    ) : (
                      <span className="text-green-600 text-xs">Sin deuda</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProviders.length === 0 && (
        <Empty
          title="No hay proveedores"
          description={filterSearch ? "Intenta con otra búsqueda" : "Agrega tu primer proveedor"}
          action={!filterSearch && <Btn onClick={() => setShowNewProvider(true)}>Agregar Proveedor</Btn>}
        />
      )}

      {/* Barra de selección masiva */}
      <SelectionBar
        selectedCount={selection.selectedCount}
        onDelete={handleDeleteSelected}
        onExport={handleExportSelected}
        onClear={selection.clearSelection}
        itemName="proveedor"
      />

      {/* New Provider Modal */}
      {showNewProvider && (
        <ProviderModal
          onClose={() => setShowNewProvider(false)}
          onSave={async (provider) => {
            await addProvider(provider)
            setShowNewProvider(false)
          }}
        />
      )}
    </div>
  )
}

// Provider Detail View
function ProviderDetail({
  provider,
  onBack,
  onUpdate,
  onAddPayment,
}: {
  provider: Provider
  onBack: () => void
  onUpdate: (provider: Provider) => void
  onAddPayment: (payment: ProviderPaymentDetail) => void
}) {
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const { data } = useApp()
  
  // Calcular deuda de este proveedor
  const providerDebt = (provider.payments || [])
    .filter(p => p.status !== "pagado-completo")
    .reduce((sum, p) => sum + (p.balanceAmount || 0), 0)

  const linkedProjects = data.projects.filter((p) => provider.projectIds.includes(p.id))

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[#76746A] hover:text-[#1C1A12] mb-2"
          >
            <ChevronDown size={16} className="rotate-90" />
            Volver a proveedores
          </button>
          <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">{provider.name}</h1>
          <p className="text-sm text-[#76746A] mt-1">{provider.category} • {provider.zone}</p>
        </div>
      </div>

      {/* Info General */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-[#1C1A12] mb-4">Información</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-[#76746A]">Categoría</span>
              <div className="font-medium text-[#1C1A12]">{provider.category}</div>
            </div>
            {provider.subcategory && (
              <div>
                <span className="text-[#76746A]">Subcategoría</span>
                <div className="font-medium text-[#1C1A12]">{provider.subcategory}</div>
              </div>
            )}
            <div>
              <span className="text-[#76746A]">Zona</span>
              <div className="font-medium text-[#1C1A12]">{provider.zone}</div>
            </div>
            <div>
              <span className="text-[#76746A]">Porcentaje Seña</span>
              <div className="font-medium text-[#1C1A12]">{provider.advancePercent}%</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-[#1C1A12] mb-4">Contacto</h3>
          <div className="space-y-3 text-sm">
            {provider.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#76746A]" />
                <span className="font-medium text-[#1C1A12]">{provider.phone}</span>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#76746A]" />
                <span className="font-medium text-[#1C1A12]">{provider.email}</span>
              </div>
            )}
            {!provider.phone && !provider.email && (
              <span className="text-[#76746A]">Sin contacto registrado</span>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Cotizaciones */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-medium text-[#1C1A12] mb-4">Historial de Cotizaciones</h3>
        {provider.quoteHistory && provider.quoteHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 text-[#76746A]">Fecha</th>
                  <th className="text-left py-3 text-[#76746A]">Proyecto</th>
                  <th className="text-left py-3 text-[#76746A]">Ítem</th>
                  <th className="text-right py-3 text-[#76746A]">Costo</th>
                  <th className="text-right py-3 text-[#76746A]">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {provider.quoteHistory.map((quote) => (
                  <tr key={quote.id} className="border-b border-[#E0DDD0]">
                    <td className="py-3 text-[#1C1A12]">{quote.date}</td>
                    <td className="py-3 text-[#76746A]">{quote.projectName}</td>
                    <td className="py-3 text-[#76746A]">{quote.item}</td>
                    <td className="py-3 text-right text-[#1C1A12]">${quote.costProvider}</td>
                    <td className="py-3 text-right font-medium text-green-600">${quote.ganancia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#76746A] text-sm">Sin cotizaciones registradas</p>
        )}
      </div>

      {/* Proyectos Asociados */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-medium text-[#1C1A12] mb-4">Proyectos Asociados ({linkedProjects.length})</h3>
        {linkedProjects.length > 0 ? (
          <div className="space-y-3">
            {linkedProjects.map((project) => (
              <div key={project.id} className="flex items-between justify-between py-3 border-b border-[#E0DDD0]">
                <div>
                  <div className="font-medium text-[#1C1A12]">{project.name}</div>
                  <p className="text-xs text-[#76746A]">{project.client}</p>
                </div>
                <Tag label={project.status} color={project.status === "activo" ? "green" : "olive"} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#76746A] text-sm">Sin proyectos asociados</p>
        )}
      </div>

      {/* Gestión de Pagos */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#1C1A12]">Pagos</h3>
          <Btn size="sm" onClick={() => setShowEditPayment(true)}>
            <Plus size={12} className="mr-1" />
            Nuevo Pago
          </Btn>
        </div>
        {provider.payments && provider.payments.length > 0 ? (
          <div className="space-y-3">
            {provider.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </div>
        ) : (
          <p className="text-[#76746A] text-sm">Sin pagos registrados</p>
        )}
        {showEditPayment && (
          <PaymentModal
            onClose={() => setShowEditPayment(false)}
            onSave={(payment) => {
              onAddPayment(payment)
              setShowEditPayment(false)
            }}
            provider={provider}
          />
        )}
      </div>

      {/* Deuda con este proveedor */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-medium text-[#1C1A12] mb-4">Estado de Cuenta</h3>
        {providerDebt > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Saldo pendiente de pago</p>
              <p className="text-xs text-red-500 mt-1">Basado en anticipos y pagos pendientes</p>
            </div>
            <div className="text-2xl font-semibold text-red-700">{formatCurrency(providerDebt)}</div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Sin deudas pendientes</p>
              <p className="text-xs text-green-500 mt-1">Todos los pagos al dia</p>
            </div>
            <CheckCircle size={24} className="text-green-600" />
          </div>
        )}
      </div>

      {/* Documentos Adjuntos */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[#1C1A12]">Documentos Adjuntos</h3>
          <Btn size="sm" onClick={() => setShowAddDocument(true)}>
            <Upload size={12} className="mr-1" />
            Adjuntar
          </Btn>
        </div>
        {provider.documents && provider.documents.length > 0 ? (
          <div className="space-y-3">
            {provider.documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between py-3 px-4 bg-[#FAFAF9] rounded-lg">
                <div className="flex items-start gap-3">
                  <FileText size={18} className="text-[#5F5A46] mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1C1A12]">{doc.name}</span>
                      <Tag label={doc.type} color="olive" />
                    </div>
                    {doc.description && <p className="text-xs text-[#76746A] mt-0.5">{doc.description}</p>}
                    <p className="text-xs text-[#76746A] mt-1">{doc.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const updatedDocs = provider.documents.filter(d => d.id !== doc.id)
                    onUpdate({ ...provider, documents: updatedDocs })
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#76746A] text-sm">Sin documentos adjuntos</p>
        )}
        
        {showAddDocument && (
          <DocumentModal
            onClose={() => setShowAddDocument(false)}
            providerId={provider.id}
            onSave={(doc) => {
              const updatedDocs = [...(provider.documents || []), doc]
              onUpdate({ ...provider, documents: updatedDocs })
              setShowAddDocument(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Document Modal with real upload
function DocumentModal({
  onClose,
  onSave,
  providerId,
}: {
  onClose: () => void
  onSave: (doc: { id: string; type: string; name: string; date: string; url: string; description?: string }) => void
  providerId: string
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState("presupuesto")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = [
        "application/pdf", 
        "image/jpeg", 
        "image/png", 
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ]
      if (!validTypes.includes(file.type)) {
        setUploadError("Solo se permiten archivos PDF, imágenes o documentos Office")
        return
      }
      if (file.size > 25 * 1024 * 1024) {
        setUploadError("El archivo no puede exceder 25MB")
        return
      }
      setSelectedFile(file)
      setUploadError("")
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !selectedFile) {
      setUploadError("Selecciona un archivo y ponle un nombre")
      return
    }
    
    setIsUploading(true)
    setUploadError("")
    setUploadProgress(10)
    
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("projectId", `provider-${providerId}`)
      formData.append("category", type)
      formData.append("folder", "")
      
      setUploadProgress(30)
      
      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      })
      
      setUploadProgress(70)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al subir archivo")
      }
      
      const result = await response.json()
      setUploadProgress(100)
      
      onSave({
        id: generateId(),
        type,
        name,
        description,
        date,
        url: result.url,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error al subir archivo")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal isOpen={true} title="Adjuntar Documento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#76746A] mb-2">
            Archivo
          </label>
          <div 
            className="border-2 border-dashed border-[#E0DDD0] rounded-xl p-6 text-center hover:border-[#5F5A46] transition-colors cursor-pointer"
            onClick={() => document.getElementById('provider-file-input')?.click()}
          >
            <input
              id="provider-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-[#5F5A46]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1C1A12]">{selectedFile.name}</p>
                  <p className="text-xs text-[#76746A]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-[#76746A] mb-2" />
                <p className="text-sm text-[#76746A]">Haz clic o arrastra un archivo</p>
                <p className="text-xs text-[#B5B2A2] mt-1">PDF, imágenes o documentos (máx 25MB)</p>
              </>
            )}
          </div>
        </div>

        <FormInput 
          label="Nombre del archivo" 
          value={name} 
          onChange={setName} 
          placeholder="Ej: Cotización muebles cocina"
          required 
        />
        <FormSelect
          label="Tipo de documento"
          value={type}
          onChange={setType}
          options={[
            { value: "presupuesto", label: "Presupuesto" },
            { value: "contrato", label: "Contrato" },
            { value: "factura", label: "Factura" },
            { value: "comprobante", label: "Comprobante" },
            { value: "foto", label: "Foto" },
          ]}
        />
        <FormInput 
          label="Fecha" 
          value={date} 
          onChange={setDate} 
          type="date"
          required 
        />
        <FormTextarea 
          label="Descripción (opcional)" 
          value={description} 
          onChange={setDescription} 
          placeholder="Detalle del documento..."
        />
        
        {uploadError && (
          <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
            <p className="text-sm text-[#8B2323]">{uploadError}</p>
          </div>
        )}
        
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[#76746A]">
              <span>Subiendo archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#E0DDD0] rounded-full h-2">
              <div 
                className="bg-[#5F5A46] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!name || !selectedFile || isUploading}>
            {isUploading ? "Subiendo..." : "Guardar Documento"}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function PaymentRow({ payment }: { payment: ProviderPaymentDetail }) {
  const statusIcon =
    payment.status === "pagado-completo" ? (
      <CheckCircle size={16} className="text-green-600" />
    ) : payment.status === "anticipo-pagado" ? (
      <Clock size={16} className="text-yellow-600" />
    ) : (
      <AlertCircle size={16} className="text-red-600" />
    )

  return (
    <div className="flex items-start justify-between py-3 px-3 bg-[#FAFAF9] rounded-lg">
      <div className="flex items-start gap-3 flex-1">
        {statusIcon}
        <div className="flex-1">
          <div className="font-medium text-[#1C1A12]">{payment.projectName}</div>
          <p className="text-xs text-[#76746A]">{payment.date}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium text-[#1C1A12]">${payment.amount}</div>
        <p className="text-xs text-[#76746A] capitalize">{payment.status.replace("-", " ")}</p>
      </div>
    </div>
  )
}

// Provider Modal
function ProviderModal({
  provider,
  onClose,
  onSave,
  onDelete,
}: {
  provider?: Provider
  onClose: () => void
  onSave: (provider: Provider) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(provider?.name ?? "")
  const [category, setCategory] = useState(provider?.category ?? "Mobiliario")
  const [subcategory, setSubcategory] = useState(provider?.subcategory ?? "")
  const [zone, setZone] = useState(provider?.zone ?? ZONES[0])
  const [phone, setPhone] = useState(provider?.phone ?? "")
  const [email, setEmail] = useState(provider?.email ?? "")
  const [contact, setContact] = useState(provider?.contact ?? "")
  const [cbu, setCbu] = useState(provider?.cbu ?? "")
  const [alias, setAlias] = useState(provider?.alias ?? "")
  const [advancePercent, setAdvancePercent] = useState(String(provider?.advancePercent ?? 50))
  const [notes, setNotes] = useState(provider?.notes ?? "")

  const subcategories = PROVIDER_CATALOG[category as keyof typeof PROVIDER_CATALOG] || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Provider = {
      id: provider?.id ?? generateId(),
      name,
      category,
      subcategory,
      zone,
      phone,
      email,
      contact,
      cbu,
      alias,
      advancePercent: parseInt(advancePercent),
      notes,
      payments: provider?.payments ?? [],
      quoteHistory: provider?.quoteHistory ?? [],
      documents: provider?.documents ?? [],
      projectIds: provider?.projectIds ?? [],
    }
    onSave(data)
  }

  return (
    <Modal isOpen={true} title={provider ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Nombre" value={name} onChange={setName} required />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Categoría"
            value={category}
            onChange={setCategory}
            options={Object.keys(PROVIDER_CATALOG).map((c) => ({ value: c, label: c }))}
          />
          {subcategories.length > 0 && (
            <FormSelect
              label="Subcategoría"
              value={subcategory}
              onChange={setSubcategory}
              options={[{ value: "", label: "Seleccionar..." }, ...subcategories.map((s) => ({ value: s, label: s }))]}
            />
          )}
        </div>
        <FormSelect
          label="Zona"
          value={zone}
          onChange={setZone}
          options={ZONES.map((z) => ({ value: z, label: z }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Teléfono" value={phone} onChange={setPhone} type="tel" />
          <FormInput label="Email" value={email} onChange={setEmail} type="email" />
        </div>
        <FormInput label="Contacto (nombre)" value={contact} onChange={setContact} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="CBU" value={cbu} onChange={setCbu} placeholder="22 digitos" />
          <FormInput label="Alias" value={alias} onChange={setAlias} placeholder="ej: miempresa.mp" />
        </div>
        <FormInput
          label="Porcentaje de seña"
          value={advancePercent}
          onChange={setAdvancePercent}
          type="number"
          min="0"
          max="100"
          inputMode="decimal"
        />
        <FormTextarea label="Notas" value={notes} onChange={setNotes} />
        <div className="flex justify-between pt-4">
          <div>
            {onDelete && (
              <Btn variant="danger" onClick={onDelete}>
                Eliminar
              </Btn>
            )}
          </div>
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn type="submit" disabled={!name}>
              {provider ? "Guardar" : "Crear"}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// Payment Modal
function PaymentModal({
  onClose,
  onSave,
  provider,
}: {
  onClose: () => void
  onSave: (payment: ProviderPaymentDetail) => void
  provider: Provider
}) {
  const { data } = useApp()
  const [projectId, setProjectId] = useState("")
  const [budgetAmount, setBudgetAmount] = useState("")
  const [advancePercentage, setAdvancePercentage] = useState(String(provider.advancePercent))
  const [status, setStatus] = useState("pendiente")

  const project = projectId ? data.projects.find((p) => p.id === projectId) : null
  const budgetNum = parseFloat(budgetAmount) || 0
  const advanceAmount = (budgetNum * parseFloat(advancePercentage)) / 100
  const balanceAmount = budgetNum - advanceAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !budgetAmount) return

    const payment: ProviderPaymentDetail = {
      id: generateId(),
      projectId,
      projectName: project?.name || "",
      date: new Date().toISOString().split("T")[0],
      budgetAmount: budgetNum,
      advancePercentage: parseFloat(advancePercentage),
      advanceAmount,
      balanceAmount,
      status: status as "pendiente" | "anticipo-pagado" | "pagado-completo",
      description: "",
      amount: advanceAmount,
    }
    onSave(payment)
  }

  const projects = data.projects.filter((p) => provider.projectIds.includes(p.id))

  return (
    <Modal isOpen={true} title="Registrar Pago" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Proyecto"
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          required
        />
        <FormInput
          label="Monto Presupuesto"
          value={budgetAmount}
          onChange={setBudgetAmount}
          type="number"
          required
          inputMode="decimal"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="% Anticipo"
            value={advancePercentage}
            onChange={setAdvancePercentage}
            type="number"
            inputMode="decimal"
          />
          <FormSelect
            label="Estado"
            value={status}
            onChange={setStatus}
            options={[
              { value: "pendiente", label: "Pendiente" },
              { value: "anticipo-pagado", label: "Anticipo Pagado" },
              { value: "pagado-completo", label: "Pagado Completo" },
            ]}
          />
        </div>

        {budgetNum > 0 && (
          <div className="bg-[#F0EDE4] p-3 rounded-lg text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[#76746A]">Monto anticipo:</span>
              <span className="font-medium">${advanceAmount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#76746A]">Saldo pendiente:</span>
              <span className="font-medium">${balanceAmount.toFixed(0)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn type="submit" disabled={!projectId || !budgetAmount}>
            Registrar Pago
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
