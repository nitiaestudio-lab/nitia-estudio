// Nitia Estudio - Types

export type RoleKey = "paula" | "cami" | "empleada"

export interface Role {
  name: string
  label: string
  pin: string
  full: boolean
  partner: RoleKey | null
}

export interface Movement {
  id: string
  date: string
  description: string
  amount: number
  type: "ingreso" | "egreso"
  category: string
  providerId?: string | null
  // Medio de pago (obligatorio)
  medioPago?: "efectivo" | "transferencia" | "cheque" | "tarjeta" | "dolares"
  // Nuevos campos para ingresos
  conceptoIngreso?: "mano-de-obra" | "senal-mobiliario" | "honorarios" | "otro"
  cuentaDestino?: "paula" | "cami" | "efectivo" | "dolares"
  // Quién creó este movimiento
  createdBy?: "paula" | "cami" | "empleada"
}

export interface ProjectFile {
  id: string
  name: string
  category: "contrato" | "plano" | "presupuesto" | "factura" | "foto" | "render" | "otro"
  date: string
  url: string
  description?: string
}

export interface ManoDeObra {
  id: string
  description: string
  cost: number
  clientPrice: number
  paid: boolean
}

export interface Material {
  id: string
  description: string
  cost: number
  clientPrice: number
  category: string
}

export interface Mobiliario {
  id: string
  item: string
  description?: string
  cost: number
  clientPrice: number
}

export interface QuoteOption {
  providerName: string
  amount: number
}

export interface Quote {
  id: string
  item: string
  margin: number
  selectedIndex: number
  options: QuoteOption[]
}

export interface Project {
  id: string
  name: string
  client: string
  clientEmail?: string
  clientPhone?: string
  clientContact?: string // Persona de contacto
  address: string
  type: "arquitectura" | "interiorismo"
  status: "activo" | "pausado" | "finalizado"
  createdAt: string
  startDate?: string
  budget?: number
  margin: number
  honorarios: {
    cost: number
    clientPrice: number
  }
  manoDeObra: ManoDeObra[]
  materiales: Material[]
  mobiliario: Mobiliario[]
  movements: Movement[]
  files: ProjectFile[]
  quotes: Quote[]
}

export interface ProviderPayment {
  id: string
  date: string
  description: string
  amount: number
  projectId: string
}

export interface ProviderQuoteHistory {
  id: string
  date: string
  projectId: string
  projectName: string
  category: string
  item: string
  costProvider: number
  priceClient: number
  ganancia: number
}

export interface ProviderDocument {
  id: string
  type: "presupuesto" | "contrato" | "factura" | "comprobante" | "foto"
  name: string
  date: string
  url: string
  description?: string
}

export interface ProviderPaymentDetail {
  id: string
  projectId: string
  projectName: string
  date: string
  budgetAmount: number
  advancePercentage: number
  advanceAmount: number
  balanceAmount: number
  status: "pendiente" | "anticipo-pagado" | "pagado-completo"
  description: string
  amount: number
}

export interface Provider {
  id: string
  name: string
  category: string
  subcategory?: string
  zone: string
  phone: string
  email: string
  cbu?: string
  alias?: string
  advancePercent: number
  notes: string
  payments: ProviderPaymentDetail[]
  quoteHistory: ProviderQuoteHistory[]
  documents: ProviderDocument[]
  projectIds: string[]
  createdAt?: string
  contact?: string
  website?: string
}

export interface Account {
  id: string
  name: string
  balance: number
  color: string
  type?: string
  owner?: string
}

export interface AccountMovement {
  id: string
  accountId: string
  date: string
  description: string
  amount: number
  type: "ingreso" | "egreso"
  category: string
}

export interface Task {
  id: string
  title: string
  projectId: string
  dueDate?: string
  priority: "alta" | "media" | "baja"
  status: "pendiente" | "en-curso" | "completada"
  assignee: string
}

export interface FixedExpense {
  id: string
  description: string
  amount: number
  category: string
  active: boolean
}

export interface VariableExpense {
  id: string
  date: string
  description: string
  amount: number
  category: string
}

export interface NitiaIncome {
  id: string
  date: string
  description: string
  amount: number
  note: string
}

export interface PersonalFinance {
  fixedExpenses: FixedExpense[]
  variableExpenses: VariableExpense[]
  nitiaIncome: NitiaIncome[]
}

export interface AppData {
  projects: Project[]
  providers: Provider[]
  accounts: Account[]
  accountMovements: AccountMovement[]
  tasks: Task[]
  personalFinance: {
    paula: PersonalFinance
    cami: PersonalFinance
  }
  nitiaFixedCosts: FixedExpense[]
  globalMovements: GlobalMovement[]
  quoteComparisons: QuoteComparison[]
  partnerCount: number // numero de socias para calcular ganancia individual
}

export type Section =
  | "dashboard"
  | "projects"
  | "providers"
  | "accounts"
  | "tasks"
  | "personal"
  | "nitia-costs"
  | "quotes"
  | "settings"

// Quote comparison types
export interface QuoteComparison {
  id: string
  date: string
  projectId: string // Asociado a un proyecto
  category: string
  item: string
  providerId: string
  providerName: string
  cost: number
  priceX14: number
  priceX16: number
  gananciaX14: number
  gananciaX16: number
  selected: boolean
}

// Global movement type that links everything
export interface GlobalMovement {
  id: string
  date: string
  description: string
  amount: number
  type: "ingreso" | "egreso"
  category: string
  projectId?: string | null
  providerId?: string | null
  accountId?: string | null
  quoteId?: string | null
}
