
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
  // clientId?: string; // To be added when implementing full multi-tenancy
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Other';

export interface Payment {
  id: string;
  tenantId: string;
  date: string; // Store as ISO string
  amount: number;
  paymentMethod: PaymentMethod;
  // clientId?: string; // To be added when implementing full multi-tenancy
}

export interface Client {
  id: string;
  name: string;
  // other client-specific details can be added here
}

export interface AppState {
  tenants: Tenant[];
  payments: Payment[];
  clients: Client[];
}

export interface AppContextType extends AppState {
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  updateTenant: (tenant: Tenant) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  addClient: (clientData: Omit<Client, 'id'>) => void;
  updateClient?: (client: Client) => void; // Optional for future
  deleteClient?: (clientId: string) => void; // Optional for future
}
