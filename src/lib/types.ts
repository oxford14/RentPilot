
export type ClientUserRole = 'admin' | 'user';

export interface User { // For AuthContext user
  username: string;
  isSuperAdmin?: boolean;
  clientId?: string;
  role?: ClientUserRole; 
}

export interface ManagedUser { // For client-specific users managed by SuperAdmin or ClientAdmin
  id: string;
  username: string;
  email: string;
  clientId: string;
  password?: string;
  role: ClientUserRole; 
}

export interface SuperAdminUser {
  id: string;
  username: string;
  password?: string; // Optional because we might not always fetch/store it post-creation for security
}


export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  monthlyRentalRate: number;
  status: 'active' | 'inactive';
  joinDate: string;
  clientId?: string;
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Other';

export interface Payment {
  id: string;
  tenantId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  discountApplied?: number; // New field for discount
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
  logoUrl?: string;
}

export type ExpenseCategory = 
  | 'Maintenance' 
  | 'Utilities' 
  | 'Administrative' 
  | 'Marketing' 
  | 'Supplies' 
  | 'Repairs' 
  | 'Taxes & Fees' 
  | 'Other';

export const expenseCategories: ExpenseCategory[] = [
  'Maintenance', 
  'Utilities', 
  'Administrative', 
  'Marketing', 
  'Supplies', 
  'Repairs', 
  'Taxes & Fees', 
  'Other'
];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  category: ExpenseCategory;
  clientId?: string;
}

// Navigation item types
interface AppNavSubItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean; // Keep for potential future use if needed in sub-items
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
}

interface AppNavGroup {
  isGroup: true;
  label: string;
  icon: React.ElementType; // Icon for the group itself
  items: AppNavSubItem[];
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
}

interface AppTopLevelNavItem {
  isGroup: false;
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
}

export type AppSidebarNavItem = AppTopLevelNavItem | AppNavGroup;


export interface AppState {
  rawTenants: Tenant[];
  rawPayments: Payment[];
  clients: Client[];
  rawManagedUsers: ManagedUser[];
  rawSuperAdminUsers: SuperAdminUser[];
  rawExpenses: Expense[];
  viewingAsClientId: string | null;
  systemTimezone: string | null;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (
    usernameInput: string,
    passwordInput: string,
    allManagedUsers: ManagedUser[],
    allClients: Client[],
    allSuperAdminUsers: SuperAdminUser[]
  ) => Promise<void>;
  logout: () => void;
}

export type AttemptDeleteTenantResult = {
  success: boolean;
  message: string;
  action: 'deleted' | 'inactivated' | 'not_found' | 'error';
};

export interface AppContextType {
  tenants: Tenant[];
  payments: Payment[];
  clients: Client[];
  managedUsers: ManagedUser[];
  rawSuperAdminUsers: SuperAdminUser[];
  expenses: Expense[]; 
  expenseCategories: ExpenseCategory[];
  viewingAsClientId: string | null;
  systemTimezone: string | null;

  setViewMode: (clientId: string | null) => void;
  updateSystemTimezone: (timezone: string) => void;

  addTenant: (tenant: Omit<Tenant, 'id' | 'clientId'>) => void;
  updateTenant: (tenant: Tenant) => void;
  attemptDeleteTenant: (tenantId: string) => AttemptDeleteTenantResult;


  addPayment: (payment: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number }) => void;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;

  addManagedUser: (userData: Omit<ManagedUser, 'id'>) => void;
  updateManagedUser: (user: ManagedUser) => void;
  deleteManagedUser: (userId: string) => void;

  addSuperAdminUser: (userData: Omit<SuperAdminUser, 'id'>) => void;
  updateSuperAdminUser: (user: SuperAdminUser) => void;
  deleteSuperAdminUser: (userId: string) => void;

  addExpense: (expenseData: Omit<Expense, 'id' | 'clientId'>) => void; 
  updateExpense: (expense: Expense) => void; 
  deleteExpense: (expenseId: string) => void; 

  rawManagedUsers: ManagedUser[];
  rawExpenses: Expense[]; 
}
