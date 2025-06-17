

export interface User { // For AuthContext user
  username: string;
  isSuperAdmin?: boolean;
}

export interface ManagedUser { // For client-specific users managed by SuperAdmin
  id: string;
  username: string;
  email: string;
  clientId: string;
  password?: string; // Optional: for creation/update, not always displayed/stored in plaintext long-term
  // role?: 'client-admin' | 'client-viewer'; // Future enhancement
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  monthlyRentalRate: number;
  status: 'active' | 'inactive';
  joinDate: string; // Store as ISO string for simplicity
  clientId?: string; 
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Other';

export interface Payment {
  id: string;
  tenantId: string;
  date: string; // Store as ISO string
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
  rawManagedUsers: ManagedUser[]; // Added for client users
  viewingAsClientId: string | null;
}

export interface AppContextType {
  tenants: Tenant[]; 
  payments: Payment[]; 
  clients: Client[];
  managedUsers: ManagedUser[]; // Added for client users
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
}

