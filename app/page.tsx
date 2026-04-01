"use client"

import { useState } from "react"
import { AppProvider, useApp, canSee } from "@/lib/app-context"
import { LoginScreen } from "@/components/login-screen"
import { AppSidebar } from "@/components/app-sidebar"
import { GlobalMovementModal } from "@/components/global-movement-modal"
import { Dashboard } from "@/components/sections/dashboard"
import { Projects } from "@/components/sections/projects"
import { Providers } from "@/components/sections/providers"
import { Tasks } from "@/components/sections/tasks"
import { Accounts } from "@/components/sections/accounts"
import { PersonalFinance } from "@/components/sections/personal-finance"
import { NitiaCosts } from "@/components/sections/nitia-costs"
import { Quotes } from "@/components/sections/quotes"
import { Settings } from "@/components/sections/settings"
import { Plus } from "lucide-react"

function AppContent() {
  const { role, section } = useApp()
  const [showGlobalMovement, setShowGlobalMovement] = useState(false)
  const isFull = canSee(role)

  if (!role) return <LoginScreen />

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <Dashboard />
      case "projects": return <Projects />
      case "providers": return <Providers />
      case "quotes": return <Quotes />
      case "tasks": return <Tasks />
      case "accounts": return <Accounts />
      case "personal": return <PersonalFinance />
      case "nitia-costs": return <NitiaCosts />
      case "settings": return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F7F5ED]">
      <AppSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="min-h-full">{renderSection()}</div>
      </main>
      {isFull && (
        <button onClick={() => setShowGlobalMovement(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#5F5A46] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#4A4639] transition-all hover:scale-105 active:scale-95"
          title="Nuevo movimiento">
          <Plus size={24} />
        </button>
      )}
      {showGlobalMovement && <GlobalMovementModal onClose={() => setShowGlobalMovement(false)} />}
    </div>
  )
}

export default function Home() {
  return <AppProvider><AppContent /></AppProvider>
}
