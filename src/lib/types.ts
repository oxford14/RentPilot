

export type ClientUserRole = 'admin' | 'user';
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
  clientId?: string; // Firestore document ID of the client, or undefined/null for global tenants
  username?: string; // NEW
  password?: string; // For tenant login
  temporaryPassword?: boolean; // NEW: flag for forced password change
  hasAccount?: boolean; // To track if tenant has created a login
  invitationToken?: string; // DEPRECATED
  invitationTokenExpires?: number; // DEPRECATED
  contractUrl?: string | null;
  activeContractId?: string | null;
  contractEndDate?: string | null;
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

export interface Client {
  id: string; // Firestore document ID
  name: string;
  logoUrl?: string | null;
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionEndDate?: string; // ISO string
  subscriptionPlanName?: string;
  subscriptionRate?: number;
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

export interface ContractTemplate {
  id: string;
  clientId: string;
  name: string;
  body: string; // The Handlebars template string
  createdAt: string;
}

export interface SignedContract {
    id: string;
    clientId: string;
    tenantId: string;
    templateId: string;
    contractBody: string; // The final, rendered contract text
    status: 'pending' | 'signed';
    initiatedAt: string;
    signedAt?: string;
    signedByIp?: string; // For audit purposes
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
  additionalDues: AdditionalDue[];
  viewingAsClientId: string | null;
  systemTimezone: string | null;
  businesses: Business[];
  weeklyIncomes: WeeklyIncome[];
  backupScheduleSettings: BackupScheduleSettings | null;
  announcements: Announcement[];
  contractTemplates: ContractTemplate[];
  signedContracts: SignedContract[];
  
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
  uploadContract: (tenantId: string, file: File) => Promise<void>;
  deleteContract: (tenantId: string) => Promise<void>;
  generateTenantAccount: (tenantId: string) => Promise<{success: boolean, username?: string, password?: string, message?: string}>;
  resetTenantPassword: (tenantId: string) => Promise<{success: boolean, password?: string, message?: string}>;
  forceChangeTenantPassword: (tenantId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;

  addPayment: (payment: Omit<Payment, 'id' | 'clientId'> & { discountApplied?: number; discountDescription?: string; paymentMethod?: PaymentMethod }) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  applySecurityDeposit: (tenantId: string, amountToApply: number) => Promise<void>;
  
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
  
  addAdditionalDue: (dueData: Omit<AdditionalDue, 'id' | 'clientId' | 'createdAt'>) => Promise<void>;
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

  // Contracts
  addContractTemplate: (template: Omit<ContractTemplate, 'id' | 'clientId' | 'createdAt'>) => Promise<void>;
  updateContractTemplate: (template: ContractTemplate) => Promise<void>;
  deleteContractTemplate: (templateId: string) => Promise<void>;
  initiateContract: (tenantId: string, templateId: string) => Promise<void>;
  signContract: (contractId: string, signatureDataUrl: string, manualInputs?: string[]) => Promise<void>;
  finalizeInPersonSignature: (tenant: Tenant, templateId: string, generatedBody: string, signatureDataUrl: string) => Promise<void>;

  rawManagedUsers: ManagedUser[]; // Exposing raw list for components like AdminUsersPage
  rawTenants: Tenant[];
  rawPayments: Payment[];
  rawExpenses: Expense[];
  rawAdditionalDues: AdditionalDue[];
  rawDemoRequests: DemoRequest[];
  
  rawBusinesses: Business[];
  rawWeeklyIncomes: WeeklyIncome[];

  addDemoRequest: (request: Omit<DemoRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateDemoRequestStatus: (requestId: string, status: DemoRequest['status']) => Promise<void>;
  deleteDemoRequest: (requestId: string) => Promise<void>;

  // Tenant Portal
  cleanClientData: (clientId: string) => Promise<{ success: boolean; message: string; }>;
  restoreDataFromBackup: (backupData: any) => Promise<{ success: boolean; message: string; }>;
}
