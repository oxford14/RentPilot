

export type BusinessType = 'Standard' | 'PC_Rental' | 'ISP_Subscription' | 'Vehicle_Rental';

export type ClientUserRole = 'admin' | 'user' | 'hub-admin';
export type UserRole = ClientUserRole | 'tenant';

export interface User { // For AuthContext user
  username: string;
  isSuperAdmin?: boolean;
  clientId?: string; // Firestore document ID of the client
  role?: UserRole;
  tenantId?: string; // Firestore document ID of the tenant if user is a tenant
  email?: string; // Add email to user object
  canApplyDiscount?: boolean;
  temporaryPassword?: boolean; // NEW: flag for forced password change
}

export interface ManagedUser { // For client-specific users managed by SuperAdmin or ClientAdmin
  id: string; // Firestore document ID
  username: string;
  email: string;
  clientId: string; // Firestore document ID of the client
  password?: string; // WARNING: Stored in plain text. Use Firebase Auth in production.
  role: ClientUserRole;
  canApplyDiscount?: boolean;
}

export interface SuperAdminUser {
  id: string; // Firestore document ID
  username: string;
  password?: string; // WARNING: Stored in plain text. Use Firebase Auth in production.
}

export interface RentHistoryEntry {
  rate: number;
  startDate: string; // ISO String
  endDate: string | null; // ISO String or null for current
}

export interface Tenant {
  id: string; // Firestore document ID
  name: string;
  email: string;
  phone: string;
  monthlyRentalRate: number; // Always the CURRENT rate for easy display
  rent_history: RentHistoryEntry[];
  securityDeposit?: number;
  status: 'active' | 'inactive';
  joinDate: string; // ISO string
  monthlyDueDay?: number;
  username?: string; // NEW
  password?: string; // For tenant login
  temporaryPassword?: boolean; // NEW: flag for forced password change
  hasAccount?: boolean; // To track if tenant has created a login
  rentAdjustmentDate?: string;
  signedContractUrl?: string;
  contractEndDate?: string;
  pcNumber?: number;
  clientId?: string;
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Gcash' | 'Check' | 'From Deposit' | 'From Credit' | 'Security Deposit' | 'Other';

export interface Payment {
  id: string; // Firestore document ID
  tenantId: string; // Firestore document ID of the tenant
  date: string; // ISO string
  amount: number;
  paymentMethod?: PaymentMethod;
  checkNumber?: string;
  discountApplied?: number;
  discountDescription?: string; 
  clientId?: string; // Firestore document ID of the client, or undefined/null for global payments
}

export interface PcIssue {
  [componentName: string]: string; // e.g. { "Monitor": "Adapter broken", "Keyboard": "" }
}

export interface Client {
  id: string; // Firestore document ID
  name: string;
  logoUrl?: string | null;
  businessType?: BusinessType;
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionEndDate?: string; // ISO string
  subscriptionPlanName?: string;
  subscriptionRate?: number;
  pcCount?: number;
  pcIssues?: Record<number, PcIssue>; // Updated from Record<number, string>
  companyFundsStartingBalance?: number;
  companyFundsStartDate?: string;
  timezone?: string;
}

export interface DeletedClientBackup {
    id: string;
    clientData: Client;
    backupData: Record<string, any[]>;
    deletedAt: string; // ISO string
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

export interface CompanyFundsExpense {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  date: string; // ISO string
}


export type AdditionalDueType = 'Water Bill' | 'Electricity Bill' | 'CUSA' | 'Other';
export const additionalDueTypes: AdditionalDueType[] = ['Water Bill', 'Electricity Bill', 'CUSA', 'Other'];

export interface AdditionalDue {
  id: string;
  tenantId: string;
  clientId?: string;
  type: AdditionalDueType;
  amount: number;
  notes?: string;
  dueDate: string; // ISO string
  status: 'paid' | 'unpaid';
  createdAt: string; // ISO string
  creditApplied?: number;
}


export interface BreakdownRule {
  id: string; // uuid for local state management
  name: string;
  type: 'percentage' | 'fixed' | 'manual_input';
  value: number;
}

export interface Business {
  id: string; // Firestore document ID
  name: string;
  clientId: string;
  breakdownConfig?: BreakdownRule[];
  trackingFrequency?: 'daily' | 'weekly' | 'monthly' | 'bi-monthly';
  weeklyDay?: number; // 0 for Sunday, 6 for Saturday
  dayOfMonth?: number; // 1-31
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

export interface ChatSession {
  id: string; // Firestore document ID
  visitorId: string; // A unique ID stored in localStorage for the visitor
  status: 'open' | 'closed';
  createdAt: string; // ISO string
  lastMessageAt: string; // ISO string
  lastMessageSnippet: string;
  adminUnread: boolean;
  visitorUnread: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'admin' | 'visitor';
  text: string;
  timestamp: string; // ISO string
}

export interface DemoRequest {
  id: string; // Firestore document ID
  requesterType: 'individual' | 'company';
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  preferredDate: string; // Will store the full UTC ISO string of the selected slot
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string; // ISO string
  visitorTimezone?: string;
}

export interface BackupScheduleSettings {
  isScheduleEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly';
  weeklyDay?: number;
  dayOfMonth?: number;
  backupTime?: string;
}

export interface Announcement {
  id: string; // Firestore document ID
  title: string;
  content: string;
  createdAt: string; // ISO string
  scope: 'global' | string; // 'global' for super admin, clientId for client admin
  audience: 'client-admin' | 'tenant';
  senderId: string;
  senderName: string;
  readBy: string[]; // Array of usernames who have read it
  recipientId?: string; // NEW: Firestore document ID of the specific tenant recipient
  recipientUsername?: string; // NEW: username of the specific tenant recipient
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


export interface MonitoredTenant {
  tenant: Tenant;
  balance: number;
  daysUntilDue?: number;
}

export interface BalanceBreakdown {
  rentDue: number; // Will only hold positive due amounts
  rentDueDetails: { month: string; rate: number }[];
  unpaidDues: AdditionalDue[];
  creditBalance: number; // Will hold any credit amount
  total: number; // The final, net balance
}

export interface AllocatedRentPayment {
  month: string;
  amount: number;
}

export interface AllocatedDuePayment {
  due: AdditionalDue;
  amountPaid: number;
  status: 'Paid' | 'Partially Paid';
}

export interface PaymentAllocation {
  payment: Payment;
  paidRent: AllocatedRentPayment[];
  paidDues: AllocatedDuePayment[];
  unallocatedAmount: number; // Credit created by this payment
}


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
  companyFundsExpenses: CompanyFundsExpense[];
  expenseCategories: ExpenseCategory[];
  additionalDues: AdditionalDue[];
  viewingAsClientId: string | null;
  systemTimezone: string | null;
  businesses: Business[];
  weeklyIncomes: WeeklyIncome[];
  backupScheduleSettings: BackupScheduleSettings | null;
  announcements: Announcement[];
  terminology: { single: string; plural: string };
  
  // Chat
  chatSessions: ChatSession[];
  startChatSession: (visitorId: string, initialMessage: { text: string }) => Promise<string>;
  sendChatMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp'>) => Promise<void>;
  markSessionAsRead: (sessionId: string, userType: 'visitor' | 'admin') => Promise<void>;
  closeChatSession: (sessionId: string) => Promise<void>;

  setViewMode: (clientId: string | null) => void;
  updateSystemTimezone: (timezone: string) => void;
  updateBackupScheduleSettings: (settings: BackupScheduleSettings) => Promise<void>;

  addTenant: (tenant: Omit<Tenant, 'id' | 'clientId' | 'rent_history'>) => Promise<void>;
  updateTenant: (tenant: Tenant, rentAdjustmentDate?: string) => Promise<void>;
  attemptDeleteTenant: (tenantId: string) => Promise<AttemptDeleteTenantResult>;
  generateTenantAccount: (tenantId: string) => Promise<{success: boolean, username?: string, password?: string, message?: string}>;
  resetTenantPassword: (tenantId: string) => Promise<{success: boolean, password?: string, message?: string}>;
  forceChangeTenantPassword: (tenantId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  uploadSignedContract: (tenantId: string, file: File, contractEndDate: string) => Promise<void>;
  renewSignedContract: (tenantId: string, file: File, newContractEndDate: string) => Promise<void>;
  deleteSignedContract: (tenantId: string) => Promise<void>;
  updateClientPcCount: (clientId: string, count: number) => Promise<void>;
  assignTenantToPc: (tenantId: string, pcNumber: number) => Promise<void>;
  unassignTenantFromPc: (tenantId: string) => Promise<void>;
  updateClientPcIssue: (clientId: string, pcNumber: number, newIssues: PcIssue) => Promise<void>;

  addPayment: (payment: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number; discountDescription?: string; paymentMethod?: PaymentMethod }) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  applySecurityDeposit: (tenantId: string, amountToApply: number) => Promise<void>;
  calculatePaymentAllocation: (paymentId: string) => Promise<PaymentAllocation | null>;
  
  addClient: (clientData: Partial<Omit<Client, 'id'>>, logoFile?: File | Blob | null) => Promise<void>;
  updateClient: (client: Client, logoFile?: File | Blob | null) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  restoreClient: (backupId: string) => Promise<void>;
  permanentlyDeleteClientBackup: (backupId: string) => Promise<void>;

  addManagedUser: (userData: Omit<ManagedUser, 'id'>) => Promise<void>;
  updateManagedUser: (user: ManagedUser) => Promise<void>;
  deleteManagedUser: (userId: string) => Promise<void>;

  addSuperAdminUser: (userData: Omit<SuperAdminUser, 'id'>) => Promise<void>;
  updateSuperAdminUser: (user: SuperAdminUser) => Promise<void>;
  deleteSuperAdminUser: (userId: string) => Promise<void>;

  addExpense: (expenseData: Omit<Expense, 'id' | 'clientId'>) => Promise<void>; 
  updateExpense: (expense: Expense) => Promise<void>; 
  deleteExpense: (expenseId: string) => Promise<void>; 
  
  addAdditionalDue: (dueData: Omit<AdditionalDue, 'id' | 'clientId' | 'createdAt' | 'creditApplied'>) => Promise<void>;
  updateAdditionalDue: (updatedDue: AdditionalDue) => Promise<void>;
  deleteAdditionalDue: (dueId: string) => Promise<void>;

  addBusiness: (businessName: string) => Promise<void>;
  updateBusiness: (business: Business) => Promise<void>;
  deleteBusiness: (businessId: string) => Promise<void>;
  addWeeklyIncome: (incomeEntry: Omit<WeeklyIncome, 'id' | 'clientId'>) => Promise<void>;
  deleteWeeklyIncome: (weeklyIncomeId: string) => Promise<void>;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;
  markAnnouncementAsRead: (announcementId: string, userId: string) => Promise<void>;

  addCompanyFundsExpense: (expenseData: Omit<CompanyFundsExpense, 'id' | 'clientId'>) => Promise<void>;
  updateCompanyFundsExpense: (expense: CompanyFundsExpense) => Promise<void>;
  deleteCompanyFundsExpense: (expenseId: string) => Promise<void>;

  rawManagedUsers: ManagedUser[]; // Exposing raw list for components like AdminUsersPage
  rawTenants: Tenant[];
  rawPayments: Payment[];
  rawExpenses: Expense[];
  rawAdditionalDues: AdditionalDue[];
  rawDemoRequests: DemoRequest[];
  rawDeletedClients: DeletedClientBackup[];
  
  rawBusinesses: Business[];
  rawWeeklyIncomes: WeeklyIncome[];
  
  addDemoRequest: (request: Omit<DemoRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateDemoRequestStatus: (requestId: string, status: DemoRequest['status']) => Promise<void>;
  deleteDemoRequest: (requestId: string) => Promise<void>;
  
  restoreFromBackup: (backupData: any) => Promise<{ success: boolean; message: string; }>;

  // Tenant Portal
  cleanClientData: (clientId: string) => Promise<{ success: boolean; message: string; }>;
}
