// Nitia Estudio - Types v3.0

export type RoleKey = string

export interface User {
  id: string
  name: string
  role: string
  pin?: string
  email?: string | null
  permissions?: Record<string, boolean>
  profit_split?: number
  totp_enabled?: boolean
  totp_secret?: string | null
  can_see_financials?: boolean
}

export interface Category {
  id: string
  type: string
  name: string
  active: boolean
  sort_order: number
  has_multiplier?: boolean
}

export interface Project {
  id: string
  name: string
  client: string
  client_email?: string | null
  client_phone?: string | null
  client_contact?: string | null
  address?: string | null
  type?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  budget?: number
  margin?: number
  honorarios_cost?: number
  honorarios_client_price?: number
  iva_cliente_pct?: number
  iva_ganancia_pct?: number
  sena_proveedor_pct?: number
  sena_cliente_pct?: number
  partner_count?: number
  budget_final?: number | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectItem {
  id: string
  project_id: string
  type: 'mano_de_obra' | 'material' | 'mobiliario'
  description: string
  cost: number
  client_price: number
  multiplier: number
  category?: string | null
  provider_id?: string | null
  paid: boolean
  sort_order: number
  created_at?: string
}

export interface ProjectFile {
  id: string
  project_id: string
  name: string
  category: string
  description?: string | null
  storage_path?: string | null
  url?: string | null
  file_size?: number | null
  mime_type?: string | null
  uploaded_by?: string | null
  created_at?: string
}

export interface Provider {
  id: string
  name: string
  category: string
  subcategory?: string | null
  zone?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  cbu?: string | null
  alias?: string | null
  contact?: string | null
  website?: string | null
  advance_percent?: number
  notes?: string | null
  created_at?: string
}

export interface ProviderDocument {
  id: string
  provider_id: string
  name: string
  type: string
  description?: string | null
  storage_path?: string | null
  url?: string | null
  file_size?: number | null
  mime_type?: string | null
  date?: string | null
  created_at?: string
}

export interface Movement {
  id: string
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'egreso'
  category?: string | null
  project_id?: string | null
  provider_id?: string | null
  account_id?: string | null
  medio_pago?: string | null
  concepto?: string | null
  fixed_cost_id?: string | null
  auto_split?: boolean
  split_percentage?: number
  created_by?: string | null
  sena_real_pct?: number | null
  sena_cliente_pct?: number | null
  created_at?: string
}

export interface Account {
  id: string
  name: string
  type?: string | null
  balance: number
  color?: string
  owner?: string | null
}

export interface Task {
  id: string
  project_id?: string | null
  title: string
  description?: string | null
  status: string
  priority: string
  due_date?: string | null
  assignee?: string
  assigned_to?: string | null
  created_at?: string
}

export interface FixedExpense {
  id: string
  description: string
  amount: number
  category?: string | null
  active: boolean
  due_day?: number
  notes?: string | null
  created_at?: string
}

export interface FixedCostPayment {
  id: string
  fixed_cost_id: string
  movement_id?: string | null
  month: number
  year: number
  paid: boolean
  paid_date?: string | null
  paid_amount?: number | null
}

export interface PersonalFinanceMovement {
  id: string
  owner: string
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'egreso'
  category?: string | null
  is_fixed?: boolean
  active?: boolean
  note?: string | null
  created_by?: string | null
  created_at?: string
}

export interface QuoteComparison {
  id: string
  date: string
  project_id?: string | null
  category: string
  item: string
  type: 'mano_de_obra' | 'material' | 'mobiliario'
  provider_id?: string | null
  provider_name: string
  cost: number
  price_x14: number
  price_x16: number
  ganancia_x14: number
  ganancia_x16: number
  selected: boolean
  selected_multiplier?: number | null
}

export interface AppData {
  projects: Project[]
  projectItems: ProjectItem[]
  projectFiles: ProjectFile[]
  providers: Provider[]
  providerDocuments: ProviderDocument[]
  accounts: Account[]
  movements: Movement[]
  tasks: Task[]
  personalFinanceMovements: PersonalFinanceMovement[]
  nitiaFixedCosts: FixedExpense[]
  fixedCostPayments: FixedCostPayment[]
  quoteComparisons: QuoteComparison[]
  categories: Category[]
}

export type Section =
  | 'dashboard'
  | 'projects'
  | 'providers'
  | 'accounts'
  | 'tasks'
  | 'personal'
  | 'nitia-costs'
  | 'quotes'
  | 'settings'
