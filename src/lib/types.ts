
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  monthlyRentalRate: number;
  status: 'active' | 'inactive';
  joinDate: string; // Store as ISO string for simplicity
}

export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Other';

export interface Payment {
  id: string;
  tenantId: string;
  date: string; // Store as ISO string
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface AppState {
  tenants: Tenant[];
  payments: Payment[];
}

export interface AppContextType extends AppState {
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  updateTenant: (tenant: Tenant) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  // deleteTenant and deletePayment can be added if needed
}
