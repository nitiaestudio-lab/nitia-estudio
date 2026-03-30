"use client"

import { useState, useEffect } from "react"
import { 
  getEmployeeUser, 
  createEmployeeUser, 
  updateEmployeeUser, 
  deleteEmployeeUser, 
  changeUserPin, 
  getCurrentUserData,
  updateUserProfile,
  requestPinChangeEmail,
  setupTOTP,
  verifyAndEnableTOTP,
  disableTOTP
} from "@/lib/auth-actions"
import { useApp } from "@/lib/app-context"
import { Btn, Modal, FormInput, SecHead, Tag, ConfirmDeleteModal } from "@/components/nitia-ui"
import { Plus, Trash2, Pencil, User, Shield, Check, X, Mail, Smartphone, QrCode, Copy, Eye, EyeOff } from "lucide-react"

interface Employee {
  id: string
  name: string
  pin: string
  role: string
  can_see_financials: boolean
}

interface UserData {
  id: string
  name: string
  email: string | null
  role: string
  totp_enabled?: boolean
}

export function Settings() {
  const { role } = useApp()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [employeeName, setEmployeeName] = useState("")
  const [employeePin, setEmployeePin] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Edit Profile states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")
  
  // Change PIN states
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmNewPin, setConfirmNewPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [pinSuccess, setPinSuccess] = useState("")
  const [showPinValues, setShowPinValues] = useState(false)
  
  // Request PIN change via email
  const [showRequestPinEmailModal, setShowRequestPinEmailModal] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  
  // 2FA / TOTP states
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [totpSecret, setTotpSecret] = useState("")
  const [totpQRCode, setTotpQRCode] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [totpError, setTotpError] = useState("")
  const [totpSuccess, setTotpSuccess] = useState("")
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false)
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false)

  // Solo Paula y Cami pueden ver finanzas y gestionar empleada
  const canSeeFinancials = role === "paula" || role === "cami"
  const isEmpleada = role === "empleada"

  useEffect(() => {
    loadData()
  }, [role])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load current user data
      if (role) {
        const userResult = await getCurrentUserData(role)
        if (userResult.success && userResult.data) {
          setCurrentUser(userResult.data as UserData)
        }
      }
      
      // Load employee only if can manage
      if (canSeeFinancials) {
        const result = await getEmployeeUser()
        if (result.success && result.data) {
          setEmployee(result.data as Employee)
        }
      }
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Profile Edit handlers
  const handleOpenEditProfile = () => {
    setEditName(currentUser?.name || "")
    setEditEmail(currentUser?.email || "")
    setProfileError("")
    setProfileSuccess("")
    setShowEditProfileModal(true)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError("")
    setProfileSuccess("")
    
    if (!editName.trim()) {
      setProfileError("El nombre es requerido")
      return
    }

    try {
      const result = await updateUserProfile(role!, editName.trim(), editEmail.trim() || null)
      if (result.success) {
        setProfileSuccess("Perfil actualizado exitosamente")
        setCurrentUser(prev => prev ? { ...prev, name: editName.trim(), email: editEmail.trim() || null } : null)
        setTimeout(() => {
          setShowEditProfileModal(false)
          setProfileSuccess("")
        }, 1500)
      } else {
        setProfileError(result.error || "Error al actualizar perfil")
      }
    } catch (err) {
      setProfileError("Error al procesar solicitud")
    }
  }

  // Request PIN change via email
  const handleRequestPinEmail = async () => {
    if (!currentUser?.email) {
      setEmailError("No tienes un email configurado. Edita tu perfil primero.")
      return
    }
    
    setEmailError("")
    try {
      const result = await requestPinChangeEmail(currentUser.email)
      if (result.success) {
        setEmailSent(true)
      } else {
        setEmailError(result.error || "Error al enviar email")
      }
    } catch (err) {
      setEmailError("Error al procesar solicitud")
    }
  }

  // 2FA handlers
  const handleSetup2FA = async () => {
    setTotpError("")
    setIsSettingUp2FA(true)
    
    try {
      const result = await setupTOTP(role!)
      if (result.success && result.secret && result.otpauthUrl) {
        setTotpSecret(result.secret)
        
        // Generar QR code localmente usando nuestra API
        const qrResponse = await fetch("/api/generate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: result.otpauthUrl }),
        })
        
        if (qrResponse.ok) {
          const { qrCode } = await qrResponse.json()
          setTotpQRCode(qrCode)
        } else {
          setTotpError("Error al generar código QR")
        }
      } else {
        setTotpError(result.error || "Error al configurar 2FA")
      }
    } catch (err) {
      setTotpError("Error al procesar solicitud")
    } finally {
      setIsSettingUp2FA(false)
    }
  }

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setTotpError("")
    
    if (totpCode.length !== 6) {
      setTotpError("El codigo debe tener 6 digitos")
      return
    }

    try {
      const result = await verifyAndEnableTOTP(role!, totpCode)
      if (result.success) {
        setTotpSuccess("Autenticacion en dos pasos activada")
        setCurrentUser(prev => prev ? { ...prev, totp_enabled: true } : null)
        setTimeout(() => {
          setShow2FAModal(false)
          setTotpSecret("")
          setTotpQRCode("")
          setTotpCode("")
          setTotpSuccess("")
        }, 2000)
      } else {
        setTotpError(result.error || "Codigo incorrecto")
      }
    } catch (err) {
      setTotpError("Error al verificar codigo")
    }
  }

  const handleDisable2FA = async () => {
    try {
      const result = await disableTOTP(role!)
      if (result.success) {
        setCurrentUser(prev => prev ? { ...prev, totp_enabled: false } : null)
        setSuccess("Autenticacion en dos pasos desactivada")
        setShowDisable2FAConfirm(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al desactivar 2FA")
      }
    } catch (err) {
      setError("Error al procesar solicitud")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setTotpSuccess("Copiado al portapapeles")
    setTimeout(() => setTotpSuccess(""), 2000)
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!employeeName.trim()) {
      setError("El nombre es requerido")
      return
    }
    
    if (employeePin.length !== 4 || !/^\d+$/.test(employeePin)) {
      setError("PIN debe ser 4 digitos numericos")
      return
    }

    try {
      const result = await createEmployeeUser(employeeName, employeePin)
      if (result.success) {
        setEmployee(result.data as Employee)
        setSuccess("Empleada creada exitosamente")
        setShowModal(false)
        setEmployeeName("")
        setEmployeePin("")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al crear empleada")
      }
    } catch (err) {
      setError("Error al procesar solicitud")
    }
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!employeeName.trim()) {
      setError("El nombre es requerido")
      return
    }
    
    if (employeePin.length !== 4 || !/^\d+$/.test(employeePin)) {
      setError("PIN debe ser 4 digitos numericos")
      return
    }

    try {
      const result = await updateEmployeeUser(employeeName, employeePin)
      if (result.success) {
        setEmployee(result.data as Employee)
        setSuccess("Empleada actualizada exitosamente")
        setShowModal(false)
        setEmployeeName("")
        setEmployeePin("")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al actualizar empleada")
      }
    } catch (err) {
      setError("Error al procesar solicitud")
    }
  }

  const handleDeleteEmployee = async () => {
    try {
      const result = await deleteEmployeeUser()
      if (result.success) {
        setEmployee(null)
        setSuccess("Empleada eliminada exitosamente")
        setShowDeleteConfirm(false)
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(result.error || "Error al eliminar empleada")
      }
    } catch (err) {
      setError("Error al procesar solicitud")
    }
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError("")
    setPinSuccess("")
    
    if (currentPin.length !== 4 || !/^\d+$/.test(currentPin)) {
      setPinError("PIN actual debe ser 4 digitos")
      return
    }
    
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError("PIN nuevo debe ser 4 digitos")
      return
    }
    
    if (newPin !== confirmNewPin) {
      setPinError("Los PINs no coinciden")
      return
    }
    
    if (currentPin === newPin) {
      setPinError("El PIN nuevo debe ser diferente al actual")
      return
    }

    try {
      const result = await changeUserPin(role!, currentPin, newPin)
      if (result.success) {
        setPinSuccess("PIN actualizado exitosamente")
        setCurrentPin("")
        setNewPin("")
        setConfirmNewPin("")
        setTimeout(() => {
          setShowChangePinModal(false)
          setPinSuccess("")
        }, 2000)
      } else {
        setPinError(result.error || "Error al cambiar PIN")
      }
    } catch (err) {
      setPinError("Error al procesar solicitud")
    }
  }

  const openCreateModal = () => {
    setModalMode("create")
    setEmployeeName("")
    setEmployeePin("")
    setError("")
    setShowModal(true)
  }

  const openEditModal = () => {
    setModalMode("edit")
    setEmployeeName(employee?.name || "")
    setEmployeePin("")
    setError("")
    setShowModal(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#76746A]">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Configuración</h1>
        <p className="text-sm text-[#76746A] mt-1">Gestionar perfil, seguridad y preferencias</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-[#E6F2E0] border border-[#B8D4A8] rounded-lg p-4 text-[#295E29] text-sm">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-4 text-[#8B2323] text-sm">
          {error}
        </div>
      )}

      {/* Mi Perfil */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead 
          n="1" 
          title="Mi Perfil"
          right={
            <Btn variant="soft" size="sm" onClick={handleOpenEditProfile}>
              <Pencil size={12} className="mr-1 inline" />
              Editar
            </Btn>
          }
        />

        <div className="bg-[#F7F5ED] rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#5F5A46] flex items-center justify-center text-white font-semibold text-xl">
              {currentUser?.name?.charAt(0).toUpperCase() || role?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-lg font-medium text-[#1C1A12]">{currentUser?.name || role}</p>
              {currentUser?.email ? (
                <p className="text-sm text-[#76746A] flex items-center gap-1">
                  <Mail size={12} />
                  {currentUser.email}
                </p>
              ) : (
                <p className="text-sm text-[#B5B2A2] italic">Sin email configurado</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Tag 
                  label={role === "empleada" ? "Empleada" : role === "paula" ? "Paula" : "Cami"} 
                  color={role === "empleada" ? "gray" : "green"} 
                />
                {currentUser?.totp_enabled && (
                  <Tag label="2FA Activo" color="blue" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead n="2" title="Seguridad" />

        <div className="space-y-4">
          {/* Cambiar PIN */}
          <div className="flex items-center justify-between p-4 bg-[#F7F5ED] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5F5A46]/10 flex items-center justify-center">
                <Shield size={18} className="text-[#5F5A46]" />
              </div>
              <div>
                <p className="font-medium text-[#1C1A12]">Cambiar PIN</p>
                <p className="text-xs text-[#76746A]">
                  {currentUser?.totp_enabled 
                    ? "Verificación por código 2FA" 
                    : currentUser?.email 
                      ? "Se enviará un email de confirmación"
                      : "Actualiza tu PIN de acceso"
                  }
                </p>
              </div>
            </div>
            <Btn variant="soft" size="sm" onClick={() => {
              if (currentUser?.totp_enabled) {
                // Si tiene 2FA, pedir código 2FA para autorizar cambio
                setShowChangePinModal(true)
              } else if (currentUser?.email) {
                // Si tiene email, enviar link de confirmación
                setShowRequestPinEmailModal(true)
              } else {
                // Sin email ni 2FA, cambio directo
                setShowChangePinModal(true)
              }
            }}>
              Cambiar PIN
            </Btn>
          </div>

          {/* Autenticación en dos pasos */}
          <div className="flex items-center justify-between p-4 bg-[#F7F5ED] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5F5A46]/10 flex items-center justify-center">
                <Smartphone size={18} className="text-[#5F5A46]" />
              </div>
              <div>
                <p className="font-medium text-[#1C1A12]">Autenticación en dos pasos (2FA)</p>
                <p className="text-xs text-[#76746A]">
                  {currentUser?.totp_enabled 
                    ? "Activada - Tu cuenta tiene protección adicional" 
                    : "Agrega una capa extra de seguridad con Google Authenticator"}
                </p>
              </div>
            </div>
            {currentUser?.totp_enabled ? (
              <Btn 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDisable2FAConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                Desactivar
              </Btn>
            ) : (
              <Btn variant="soft" size="sm" onClick={() => { setShow2FAModal(true); handleSetup2FA(); }}>
                <QrCode size={12} className="mr-1 inline" />
                Activar
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Gestión de Empleada - Solo para Paula y Cami */}
      {canSeeFinancials && (
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead 
            n="3" 
            title="Gestión de Empleada"
            right={
              !employee ? (
                <Btn variant="soft" size="sm" onClick={openCreateModal}>
                  <Plus size={12} className="mr-1 inline" />
                  Crear
                </Btn>
              ) : (
                <div className="flex gap-2">
                  <Btn variant="soft" size="sm" onClick={openEditModal}>
                    <Pencil size={12} className="mr-1 inline" />
                    Editar
                  </Btn>
                  <Btn variant="soft" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={12} className="mr-1 inline" />
                    Eliminar
                  </Btn>
                </div>
              )
            }
          />

          {employee ? (
            <div className="bg-[#F7F5ED] rounded-lg p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-[#76746A] mb-1">Nombre</p>
                <p className="text-lg font-medium text-[#1C1A12]">{employee.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Tag label="empleada" color="gray" />
                <span className="text-xs text-[#76746A]">Sin acceso a finanzas</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#76746A] mb-4">No hay empleada registrada</p>
              <Btn variant="soft" onClick={openCreateModal}>
                <Plus size={14} className="mr-1 inline" />
                Crear Empleada
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* Tabla de Permisos */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead n={canSeeFinancials ? "4" : "3"} title="Permisos por Rol" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-[#1C1A12]">Sección</th>
                <th className="text-center py-3 px-4 font-semibold text-[#1C1A12]">Paula / Cami</th>
                <th className="text-center py-3 px-4 font-semibold text-[#1C1A12]">Empleada</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-[#5F5A46]">Proyectos</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /> Todo</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /> Solo tareas</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-[#5F5A46]">Finanzas</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /></td>
                <td className="py-3 px-4 text-center"><X size={16} className="inline text-red-500" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-[#5F5A46]">Cuentas</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /></td>
                <td className="py-3 px-4 text-center"><X size={16} className="inline text-red-500" /></td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-[#5F5A46]">Proveedores</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /></td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /> Solo ver</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-[#5F5A46]">Configuración</td>
                <td className="py-3 px-4 text-center"><Check size={16} className="inline text-green-600" /></td>
                <td className="py-3 px-4 text-center"><X size={16} className="inline text-red-500" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Perfil */}
      {showEditProfileModal && (
        <Modal
          title="Editar Perfil"
          onClose={() => setShowEditProfileModal(false)}
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <FormInput
              label="Nombre"
              value={editName}
              onChange={setEditName}
              placeholder="Tu nombre"
            />
            
            <FormInput
              label="Email"
              type="email"
              value={editEmail}
              onChange={setEditEmail}
              placeholder="tu@email.com"
            />

            {profileError && (
              <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
                <p className="text-sm text-[#8B2323]">{profileError}</p>
              </div>
            )}

            {profileSuccess && (
              <div className="bg-[#E6F2E0] border border-[#B8D4A8] rounded-lg p-3">
                <p className="text-sm text-[#295E29]">{profileSuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Btn variant="ghost" onClick={() => setShowEditProfileModal(false)}>
                Cancelar
              </Btn>
              <Btn type="submit" disabled={!editName.trim()}>
                Guardar Cambios
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Empleada */}
      {showModal && (
        <Modal
          title={modalMode === "create" ? "Nueva Empleada" : "Editar Empleada"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={modalMode === "create" ? handleCreateEmployee : handleUpdateEmployee} className="space-y-4">
            <FormInput
              label="Nombre"
              value={employeeName}
              onChange={setEmployeeName}
              placeholder="Ej: Maria"
            />
            
            <FormInput
              label="PIN (4 dígitos)"
              type="password"
              value={employeePin}
              onChange={(v) => setEmployeePin(v.slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
            />

            {error && (
              <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
                <p className="text-sm text-[#8B2323]">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Btn variant="ghost" onClick={() => setShowModal(false)}>
                Cancelar
              </Btn>
              <Btn type="submit" disabled={!employeeName || employeePin.length !== 4}>
                {modalMode === "create" ? "Crear Empleada" : "Guardar Cambios"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cambiar PIN */}
      {showChangePinModal && (
        <Modal
          title="Cambiar PIN"
          onClose={() => {
            setShowChangePinModal(false)
            setCurrentPin("")
            setNewPin("")
            setConfirmNewPin("")
            setPinError("")
            setPinSuccess("")
          }}
        >
          <form onSubmit={handleChangePin} className="space-y-4">
            <div className="relative">
              <FormInput
                label="PIN actual"
                type={showPinValues ? "text" : "password"}
                value={currentPin}
                onChange={(v) => setCurrentPin(v.replace(/\D/g, "").slice(0, 4))}
                placeholder="****"
                inputMode="numeric"
              />
            </div>
            
            <FormInput
              label="PIN nuevo"
              type={showPinValues ? "text" : "password"}
              value={newPin}
              onChange={(v) => setNewPin(v.replace(/\D/g, "").slice(0, 4))}
              placeholder="****"
              inputMode="numeric"
            />
            
            <FormInput
              label="Confirmar PIN nuevo"
              type={showPinValues ? "text" : "password"}
              value={confirmNewPin}
              onChange={(v) => setConfirmNewPin(v.replace(/\D/g, "").slice(0, 4))}
              placeholder="****"
              inputMode="numeric"
            />

            <label className="flex items-center gap-2 text-sm text-[#76746A] cursor-pointer">
              <input
                type="checkbox"
                checked={showPinValues}
                onChange={(e) => setShowPinValues(e.target.checked)}
                className="rounded"
              />
              Mostrar PINs
            </label>

            {pinError && (
              <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
                <p className="text-sm text-[#8B2323]">{pinError}</p>
              </div>
            )}

            {pinSuccess && (
              <div className="bg-[#E6F2E0] border border-[#B8D4A8] rounded-lg p-3">
                <p className="text-sm text-[#295E29]">{pinSuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Btn variant="ghost" onClick={() => setShowChangePinModal(false)}>
                Cancelar
              </Btn>
              <Btn type="submit" disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmNewPin.length !== 4}>
                Guardar PIN
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Request PIN via Email */}
      {showRequestPinEmailModal && (
        <Modal
          title="Cambiar PIN por Email"
          onClose={() => {
            setShowRequestPinEmailModal(false)
            setEmailSent(false)
            setEmailError("")
          }}
        >
          {emailSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E6F2E0] flex items-center justify-center">
                <Mail size={32} className="text-[#295E29]" />
              </div>
              <h3 className="text-lg font-medium text-[#1C1A12] mb-2">Email enviado</h3>
              <p className="text-sm text-[#76746A] mb-4">
                Revisa tu bandeja de entrada en <strong>{currentUser?.email}</strong> para cambiar tu PIN.
              </p>
              <Btn onClick={() => setShowRequestPinEmailModal(false)}>Entendido</Btn>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#76746A]">
                Te enviaremos un enlace a <strong>{currentUser?.email}</strong> para que puedas cambiar tu PIN de forma segura.
              </p>
              
              {emailError && (
                <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#8B2323]">{emailError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Btn variant="ghost" onClick={() => setShowRequestPinEmailModal(false)}>
                  Cancelar
                </Btn>
                <Btn onClick={handleRequestPinEmail}>
                  <Mail size={14} className="mr-1 inline" />
                  Enviar Email
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal 2FA Setup */}
      {show2FAModal && (
        <Modal
          title="Configurar Autenticación en Dos Pasos"
          onClose={() => {
            setShow2FAModal(false)
            setTotpSecret("")
            setTotpQRCode("")
            setTotpCode("")
            setTotpError("")
            setTotpSuccess("")
          }}
        >
          {isSettingUp2FA ? (
            <div className="text-center py-8">
              <p className="text-[#76746A]">Generando código QR...</p>
            </div>
          ) : totpQRCode ? (
            <form onSubmit={handleVerifyAndEnable2FA} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-[#76746A] mb-4">
                  Escanea este código QR con Google Authenticator o cualquier app de autenticación:
                </p>
                <div className="bg-white p-4 rounded-xl inline-block border border-border">
                  <img src={totpQRCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div className="bg-[#F7F5ED] rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#76746A] mb-2">
                  O ingresa este código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border border-border break-all">
                    {totpSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(totpSecret)}
                    className="p-2 rounded-lg hover:bg-[#E0DDD0] transition-colors"
                  >
                    <Copy size={16} className="text-[#5F5A46]" />
                  </button>
                </div>
              </div>

              <FormInput
                label="Código de verificación (6 dígitos)"
                value={totpCode}
                onChange={(v) => setTotpCode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
              />

              {totpError && (
                <div className="bg-[#FAEBEB] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#8B2323]">{totpError}</p>
                </div>
              )}

              {totpSuccess && (
                <div className="bg-[#E6F2E0] border border-[#B8D4A8] rounded-lg p-3">
                  <p className="text-sm text-[#295E29]">{totpSuccess}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Btn variant="ghost" onClick={() => setShow2FAModal(false)}>
                  Cancelar
                </Btn>
                <Btn type="submit" disabled={totpCode.length !== 6}>
                  Activar 2FA
                </Btn>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#8B2323]">Error al generar código QR. Intenta de nuevo.</p>
              <Btn variant="soft" onClick={handleSetup2FA} className="mt-4">
                Reintentar
              </Btn>
            </div>
          )}
        </Modal>
      )}

      {/* Confirm Disable 2FA */}
      <ConfirmDeleteModal
        isOpen={showDisable2FAConfirm}
        title="Desactivar 2FA"
        message="¿Estás seguro de desactivar la autenticación en dos pasos? Tu cuenta será menos segura."
        onConfirm={handleDisable2FA}
        onCancel={() => setShowDisable2FAConfirm(false)}
      />

      {/* Confirm Delete Employee */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Eliminar Empleada"
        message="Esta acción no se puede deshacer. La empleada perderá acceso al sistema."
        itemName={employee?.name}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
