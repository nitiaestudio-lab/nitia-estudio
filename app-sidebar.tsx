"use client"

import { useApp } from "@/lib/app-context"
import { canSee } from "@/lib/seed-data"
import type { Section } from "@/lib/types"
import Image from "next/image"
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Wallet,
  User,
  Building2,
  LogOut,
  Menu,
  X,
  Settings,
  CheckSquare,
} from "lucide-react"
import { useState, useEffect } from "react"

interface NavItem {
  id: Section
  label: string
  icon: React.ReactNode
  requiresFull?: boolean
  perm?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { id: "projects", label: "Proyectos", icon: <FolderKanban size={20} />, perm: "ver_proyectos" },
  { id: "providers", label: "Proveedores", icon: <Users size={20} />, perm: "ver_proveedores" },
  { id: "tasks", label: "Tareas", icon: <CheckSquare size={20} />, perm: "ver_tareas" },
  { id: "accounts", label: "Cuentas", icon: <Wallet size={20} />, requiresFull: true, perm: "ver_finanzas" },
  { id: "personal", label: "Finanzas Personal", icon: <User size={20} />, requiresFull: true, perm: "ver_finanzas_personales" },
  { id: "nitia-costs", label: "Costos Nitia", icon: <Building2 size={20} />, requiresFull: true, perm: "ver_costos_nitia" },
  { id: "settings", label: "Configuración", icon: <Settings size={20} />, requiresFull: true },
]

export function AppSidebar() {
  const { role, setRole, section, setSection, setSelectedProjectId, userPermissions } = useApp()
  const isFull = canSee(role, userPermissions)
  const isAdmin = role === "paula" || role === "cami"
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => {
    if (isAdmin) return true
    if (item.id === "dashboard") return true
    if (item.id === "settings") return false
    if (item.perm) return userPermissions[item.perm] === true
    if (item.requiresFull && !isFull) return false
    return true
  })

  // Close mobile menu on section change
  useEffect(() => {
    setMobileOpen(false)
  }, [section])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const handleNavClick = (item: NavItem) => {
    setSection(item.id)
    setSelectedProjectId(null)
  }

  const handleLogout = () => {
    setRole(null)
    setSection("dashboard")
    setSelectedProjectId(null)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-[#E0DDD0]">
        <div className="relative w-12 h-12 mx-auto">
          <Image
            src="/images/nitia-logo.png"
            alt="Nitia"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = section === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-[#5F5A46] text-white shadow-lg shadow-[#5F5A46]/15"
                    : "text-[#76746A] hover:bg-[#F0EDE4] hover:text-[#1C1A12]"
                }
              `}
            >
              <span className={isActive ? "text-white/90" : "text-[#76746A]"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-5 border-t border-[#E0DDD0] bg-[#FAFAF9]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5F5A46]/10 flex items-center justify-center">
              <User size={16} className="text-[#5F5A46]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1A12] capitalize">{role}</p>
              <p className="text-[10px] text-[#76746A] uppercase tracking-wide">
                {isFull ? "Acceso completo" : "Acceso limitado"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-[#76746A] hover:bg-[#FAEBEB] hover:text-[#8B2323] transition-all duration-200"
            title="Cerrar sesion"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#FAFAF9] border-b border-[#E0DDD0] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="relative w-10 h-10">
            <Image
              src="/images/nitia-logo.png"
              alt="Nitia"
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-[#5F5A46] hover:bg-[#F0EDE4] transition-colors"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#FAFAF9] flex flex-col transform transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#FAFAF9] border-r border-[#E0DDD0] flex-col sticky top-0">
        <SidebarContent />
      </aside>
    </>
  )
}
