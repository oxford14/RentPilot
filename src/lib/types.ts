

export type ClientUserRole = 'admin' | 'user';

export interface User { // For AuthContext user
  username: string;
  isSuperAdmin?: boolean;
  clientId?: string;
  role?: ClientUserRole; // Added for client user roles
}

export interface ManagedUser { // For client-specific users managed by SuperAdmin or ClientAdmin
  id: string;
  username: string;
  email: string;
  clientId: string;
  password?: string;
  role: ClientUserRole; // Added: 'admin' or 'user' for client context
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
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
}

export interface AppState {
  rawTenants: Tenant[];
  rawPayments: Payment[];
  clients: Client[];
  rawManagedUsers: ManagedUser[];
  viewingAsClientId: string | null;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (
    usernameInput: string,
    passwordInput: string,
    allManagedUsers: ManagedUser[],
    allClients: Client[]
  ) => Promise<void>;
  logout: () => void;
}


export interface AppContextType {
  tenants: Tenant[];
  payments: Payment[];
  clients: Client[];
  managedUsers: ManagedUser[];
  viewingAsClientId: string | null;

  setViewMode: (clientId: string | null) => void;

  addTenant: (tenant: Omit<Tenant, 'id' | 'clientId'>) => void;
  updateTenant: (tenant: Tenant) => void;

  addPayment: (payment: Omit<Payment, 'id' | 'clientId'>) => void;

  addClient: (clientData: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;

  addManagedUser: (userData: Omit<ManagedUser, 'id'>) => void;
  updateManagedUser: (user: ManagedUser) => void;
  deleteManagedUser: (userId: string) => void;

  rawManagedUsers: ManagedUser[];
}
