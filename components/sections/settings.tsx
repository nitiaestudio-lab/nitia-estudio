"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { SecHead, Btn, Modal, FormInput, FormSelect, HR } from "@/components/nitia-ui"
import { changeUserPin, getCurrentUserData, setupTOTP, verifyAndEnableTOTP, disableTOTP, getAvailableUsers, createEmployeeUser, updateEmployeeUser, deleteEmployeeUser } from "@/lib/auth-actions"
import { Shield, Key, Users, Plus, Trash2, Pencil } from "lucide-react"

export function Settings() {
  const { role, setRole } = useApp()
  const [userData, setUserData] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [showChangePin, setShowChangePin] = useState(false)
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const [userRes, usersRes] = await Promise.all([
        role ? getCurrentUserData(role) : Promise.resolve({ data: null }),
        getAvailableUsers(),
      ])
      if (userRes.data) setUserData(userRes.data)
      if (usersRes.success) setAllUsers(usersRes.users || [])
      setIsLoading(false)
    }
    load()
  }, [role])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-light text-[#1C1A12]">Configuraci{"ó"}n</h1>
        <p className="text-sm text-[#76746A] mt-1">Gesti{"ó"}n de usuarios y seguridad</p>
      </div>

      {/* Current User */}
      {userData && (
        <div className="bg-card border border-border rounded-xl p-6">
          <SecHead title="Mi Perfil" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{userData.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm">{userData.email || "No configurado"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rol</span>
              <span className="text-sm capitalize">{userData.role}</span>
            </div>
            <HR />
            <div className="flex gap-3">
              <Btn variant="soft" size="sm" onClick={() => setShowChangePin(true)}>
                <Key size={14} className="mr-1 inline" />Cambiar PIN
              </Btn>
              <Btn variant="soft" size="sm" onClick={() => setShowSetup2FA(true)}>
                <Shield size={14} className="mr-1 inline" />
                {userData.totp_enabled ? "Gestionar 2FA" : "Activar 2FA"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Gestión de Usuarios" right={
          <Btn size="sm" onClick={() => setShowAddUser(true)}>
            <Plus size={14} className="mr-1 inline" />Agregar Usuario
          </Btn>
        } />
        <div className="space-y-3">
          {allUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role} {user.email && `• ${user.email}`}</p>
              </div>
              <div className="flex gap-2">
                {user.role !== "paula" && user.role !== "cami" && (
                  <>
                    <button onClick={() => setEditingUser(user)}
                      className="p-1.5 hover:bg-accent rounded"><Pencil size={14} className="text-muted-foreground" /></button>
                    <button onClick={async () => {
                      if (confirm("¿Eliminar este usuario?")) {
                        await deleteEmployeeUser()
                        setAllUsers(prev => prev.filter(u => u.id !== user.id))
                      }
                    }} className="p-1.5 hover:bg-red-50 rounded"><Trash2 size={14} className="text-red-600" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SecHead title="Sesión" />
        <Btn variant="danger" onClick={() => setRole(null)}>Cerrar Sesión</Btn>
      </div>

      {/* Change PIN Modal */}
      {showChangePin && <ChangePinModal role={role!} onClose={() => setShowChangePin(false)} />}

      {/* 2FA Modal */}
      {showSetup2FA && <Setup2FAModal role={role!} isEnabled={userData?.totp_enabled}
        onClose={() => { setShowSetup2FA(false); /* reload */ getCurrentUserData(role!).then(r => { if (r.data) setUserData(r.data) }) }} />}

      {/* Add/Edit User Modal */}
      {(showAddUser || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowAddUser(false); setEditingUser(null) }}
          onSave={async (name, pin) => {
            if (editingUser) {
              await updateEmployeeUser(name, pin)
            } else {
              await createEmployeeUser(name, pin)
            }
            const res = await getAvailableUsers()
            if (res.success) setAllUsers(res.users || [])
            setShowAddUser(false); setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}

function ChangePinModal({ role, onClose }: { role: string; onClose: () => void }) {
  const [current, setCurrent] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirm) { setError("Los PINs no coinciden"); return }
    const result = await changeUserPin(role, current, newPin)
    if (result.success) { setSuccess(true); setTimeout(onClose, 2000) }
    else setError(result.error || "Error")
  }

  return (
    <Modal isOpen={true} title="Cambiar PIN" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="PIN actual" type="password" value={current} onChange={setCurrent} inputMode="numeric" />
        <FormInput label="Nuevo PIN (4 dígitos)" type="password" value={newPin} onChange={setNewPin} inputMode="numeric" />
        <FormInput label="Confirmar nuevo PIN" type="password" value={confirm} onChange={setConfirm} inputMode="numeric" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">PIN actualizado correctamente</p>}
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={current.length !== 4 || newPin.length !== 4 || confirm.length !== 4}>Cambiar</Btn>
        </div>
      </form>
    </Modal>
  )
}

function Setup2FAModal({ role, isEnabled, onClose }: { role: string; isEnabled: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"choice" | "setup" | "verify">(isEnabled ? "choice" : "setup")
  const [secret, setSecret] = useState("")
  const [otpauthUrl, setOtpauthUrl] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    const result = await setupTOTP(role)
    if (result.success && result.secret) {
      setSecret(result.secret)
      setOtpauthUrl(result.otpauthUrl || "")
      setStep("verify")
    } else setError(result.error || "Error")
    setLoading(false)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await verifyAndEnableTOTP(role, code)
    if (result.success) onClose()
    else { setError(result.error || "Código incorrecto"); setCode("") }
    setLoading(false)
  }

  const handleDisable = async () => {
    setLoading(true)
    await disableTOTP(role)
    onClose()
  }

  return (
    <Modal isOpen={true} title="Autenticación en Dos Pasos" onClose={onClose}>
      {step === "choice" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">La autenticación en dos pasos está activa.</p>
          <div className="flex gap-3">
            <Btn variant="danger" onClick={handleDisable} disabled={loading}>Desactivar 2FA</Btn>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          </div>
        </div>
      )}
      {step === "setup" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Configurá una app de autenticación (Google Authenticator, Authy) para mayor seguridad.</p>
          <Btn onClick={handleSetup} disabled={loading}>{loading ? "Configurando..." : "Configurar 2FA"}</Btn>
        </div>
      )}
      {step === "verify" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-muted-foreground">Escaneá este código QR con tu app de autenticación:</p>
          <div className="bg-[#F7F5ED] p-4 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-2">O ingresá manualmente:</p>
            <code className="text-sm font-mono bg-white px-3 py-1 rounded border select-all">{secret}</code>
          </div>
          <FormInput label="Código de verificación (6 dígitos)" value={code} onChange={setCode} inputMode="numeric" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit" disabled={code.length !== 6 || loading}>Verificar y Activar</Btn>
          </div>
        </form>
      )}
    </Modal>
  )
}

function UserModal({ user, onClose, onSave }: {
  user: any; onClose: () => void; onSave: (name: string, pin: string) => void
}) {
  const [name, setName] = useState(user?.name ?? "")
  const [pin, setPin] = useState("")

  return (
    <Modal isOpen={true} title={user ? "Editar Usuario" : "Agregar Usuario"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(name, pin) }} className="space-y-4">
        <FormInput label="Nombre" value={name} onChange={setName} />
        <FormInput label="PIN (4 dígitos)" type="password" value={pin} onChange={setPin} inputMode="numeric" />
        <div className="flex justify-end gap-3 pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={!name || pin.length !== 4}>{user ? "Guardar" : "Crear"}</Btn>
        </div>
      </form>
    </Modal>
  )
}
