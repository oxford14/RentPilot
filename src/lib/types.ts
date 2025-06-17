
export interface User { // Extended from AuthContext User
  username: string;
  isSuperAdmin?: boolean;
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
  // other client-specific details can be added here
}

export interface AppState {
  rawTenants: Tenant[];
  rawPayments: Payment[];
  clients: Client[];
  viewingAsClientId: string | null;
}

export interface AppContextType {
  tenants: Tenant[]; // Filtered view based on viewingAsClientId
  payments: Payment[]; // Filtered view based on viewingAsClientId
  clients: Client[];
  viewingAsClientId: string | null;
  
  setViewMode: (clientId: string | null) => void;
  
  // For addTenant and addPayment, clientId is handled internally if viewingAsClientId is set.
  addTenant: (tenant: Omit<Tenant, 'id' | 'clientId'>) => void;
  updateTenant: (tenant: Tenant) => void; // Operates on rawTenants
  
  addPayment: (payment: Omit<Payment, 'id' | 'clientId'>) => void;
  
  addClient: (clientData: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void; 
  deleteClient: (clientId: string) => void;
}
