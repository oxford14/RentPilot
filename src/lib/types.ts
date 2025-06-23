
export type ClientUserRole = 'admin' | 'user';
export type UserRole = ClientUserRole | 'tenant';

export interface User { // For AuthContext user
  username: string;
  isSuperAdmin?: boolean;
  clientId?: string; // Firestore document ID of the client
  role?: UserRole; 
  tenantId?: string; // Firestore document ID of the tenant if user is a tenant
  email?: string; // Add email to user object
}

export interface ManagedUser { // For client-specific users managed by SuperAdmin or ClientAdmin
  id: string; // Firestore document ID
  username: string;
  email: string;
  clientId: string; // Firestore document ID of the client
  password?: string; // WARNING: Stored in plain text. Use Firebase Auth in production.
  role: ClientUserRole; 
}

export interface SuperAdminUser {
  id: string; // Firestore document ID
  username: string;
  password?: string; // WARNING: Stored in plain text. Use Firebase Auth in production.
}


export interface Tenant {
  id: string; // Firestore document ID
  name: string;
  email?: string;
  phone?: string;
  monthlyRentalRate: number;
  status: 'active' | 'inactive';
  joinDate: string; // ISO string
  clientId?: string; // Firestore document ID of the client, or undefined/null for global tenants
  password?: string; // For tenant login
  hasAccount?: boolean; // To track if tenant has created a login
  invitationToken?: string; // For signup link
  invitationTokenExpires?: number; // Timestamp for token expiry
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Gcash' | 'Other';

export interface Payment {
  id: string; // Firestore document ID
  tenantId: string; // Firestore document ID of the tenant
  date: string; // ISO string
  amount: number;
  paymentMethod?: PaymentMethod;
  discountApplied?: number;
  discountDescription?: string; 
  clientId?: string; // Firestore document ID of the client, or undefined/null for global payments
}

export interface Client {
  id: string; // Firestore document ID
  name: string;
  logoUrl?: string | null;
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionEndDate?: string; // ISO string
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
  id: string; // Firestore document ID
  description: string;
  amount: number;
  date: string; // ISO string
  category: ExpenseCategory;
  clientId?: string; // Firestore document ID of the client, or undefined/null for global expenses
}

export interface BreakdownRule {
  id: string; // uuid for local state management
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface Business {
  id: string; // Firestore document ID
  name: string;
  clientId: string;
  breakdownConfig?: BreakdownRule[];
}

export interface WeeklyIncome {
  id: string; // Firestore document ID
  businessId: string;
  clientId: string;
  weekOf: string; // ISO string for the Friday of that week
  income: number;
  breakdown: { [key: string]: number };
  remainingMoney: number;
}


// Navigation item types
interface AppNavSubItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
  clientOnly?: boolean;
}

interface AppNavGroup {
  isGroup: true;
  label: string;
  icon: React.ElementType;
  items: AppNavSubItem[];
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
  clientOnly?: boolean;
}

interface AppTopLevelNavItem {
  isGroup: false;
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  clientAdminOnly?: boolean;
  superAdminOnly?: boolean;
  clientOnly?: boolean;
}

export type AppSidebarNavItem = AppTopLevelNavItem | AppNavGroup;

// AppState is no longer used for localStorage persistence of main data
// export interface AppState { ... }


export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (
    usernameInput: string,
    passwordInput: string
  ) => Promise<void>; // Removed unused parameters
  logout: () => void;
}

export type AttemptDeleteTenantResult = {
  success: boolean;
  message: string;
  action: 'deleted' | 'inactivated' | 'not_found' | 'error';
};

// AppContextType now reflects that CRUD operations are async (return Promise)
export interface AppContextType {
  tenants: Tenant[];
  payments: Payment[];
  clients: Client[];
  managedUsers: ManagedUser[]; // Filtered for current client context if applicable
  rawSuperAdminUsers: SuperAdminUser[]; // Full list for super admins
  expenses: Expense[]; 
  expenseCategories: ExpenseCategory[];
  viewingAsClientId: string | null;
  systemTimezone: string | null;
  businesses: Business[];
  weeklyIncomes: WeeklyIncome[];

  setViewMode: (clientId: string | null) => void;
  updateSystemTimezone: (timezone: string) => void;

  addTenant: (tenant: Omit<Tenant, 'id' | 'clientId'>) => Promise<void>;
  updateTenant: (tenant: Tenant) => Promise<void>;
  attemptDeleteTenant: (tenantId: string) => Promise<AttemptDeleteTenantResult>;

  addPayment: (payment: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number; discountDescription?: string; paymentMethod?: PaymentMethod }) => Promise<void>;
  
  addClient: (clientData: Partial<Omit<Client, 'id'>>, logoFile?: File | Blob | null) => Promise<void>;
  updateClient: (client: Client, logoFile?: File | Blob | null) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  addManagedUser: (userData: Omit<ManagedUser, 'id'>) => Promise<void>;
  updateManagedUser: (user: ManagedUser) => Promise<void>;
  deleteManagedUser: (userId: string) => Promise<void>;

  addSuperAdminUser: (userData: Omit<SuperAdminUser, 'id'>) => Promise<void>;
  updateSuperAdminUser: (user: SuperAdminUser) => Promise<void>;
  deleteSuperAdminUser: (userId: string) => Promise<void>;

  addExpense: (expenseData: Omit<Expense, 'id' | 'clientId'>) => Promise<void>; 
  updateExpense: (expense: Expense) => Promise<void>; 
  deleteExpense: (expenseId: string) => Promise<void>; 
  
  addBusiness: (businessName: string) => Promise<void>;
  updateBusiness: (business: Business) => Promise<void>;
  deleteBusiness: (businessId: string) => Promise<void>;
  addWeeklyIncome: (incomeEntry: Omit<WeeklyIncome, 'id' | 'clientId'>) => Promise<void>;
  deleteWeeklyIncome: (weeklyIncomeId: string) => Promise<void>;

  rawManagedUsers: ManagedUser[]; // Exposing raw list for components like AdminUsersPage
  rawTenants: Tenant[];
  rawPayments: Payment[];
  rawExpenses: Expense[];
  
  rawBusinesses: Business[];
  rawWeeklyIncomes: WeeklyIncome[];

  // Tenant Portal
  generateTenantInvitation: (tenantId: string) => Promise<string>;
  completeTenantSignup: (token: string, password: string) => Promise<{success: boolean, message: string}>;
  cleanClientData: (clientId: string) => Promise<{ success: boolean; message: string; }>;
  restoreDataFromBackup: (backupData: any) => Promise<{ success: boolean; message: string; }>;
}
