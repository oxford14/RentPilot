
"use client";

import type { Tenant, Payment, AppContextType, AppState } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialTenants: Tenant[] = [
  { id: uuidv4(), name: 'Alice Wonderland', email: 'alice@example.com', phone: '123-456-7890', monthlyRentalRate: 1200, status: 'active', joinDate: new Date(2023, 0, 15).toISOString() },
  { id: uuidv4(), name: 'Bob The Builder', email: 'bob@example.com', phone: '987-654-3210', monthlyRentalRate: 950, status: 'active', joinDate: new Date(2022, 5, 1).toISOString() },
  { id: uuidv4(), name: 'Charlie Brown', email: 'charlie@example.com', phone: '555-555-5555', monthlyRentalRate: 1500, status: 'inactive', joinDate: new Date(2023, 2, 10).toISOString() },
];

const initialPayments: Payment[] = [
  { id: uuidv4(), tenantId: initialTenants[0].id, date: new Date(2024, 0, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer' },
  { id: uuidv4(), tenantId: initialTenants[0].id, date: new Date(2024, 1, 5).toISOString(), amount: 1200, paymentMethod: 'Bank Transfer' },
  { id: uuidv4(), tenantId: initialTenants[1].id, date: new Date(2024, 0, 1).toISOString(), amount: 950, paymentMethod: 'Credit Card' },
  { id: uuidv4(), tenantId: initialTenants[1].id, date: new Date(2024, 1, 3).toISOString(), amount: 500, paymentMethod: 'Credit Card' }, // Partial payment
];

const LOCAL_STORAGE_KEY = 'tenantTrackerData';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only on the client after hydration
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      try {
        const parsedData: AppState = JSON.parse(storedData);
        setTenants(parsedData.tenants || initialTenants);
        setPayments(parsedData.payments || initialPayments);
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        // Fallback to initial data if parsing fails
        setTenants(initialTenants);
        setPayments(initialPayments);
      }
    } else {
      // Initialize with sample data if nothing in local storage
      setTenants(initialTenants);
      setPayments(initialPayments);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // This effect saves to localStorage only on client and after initial load
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ tenants, payments }));
    }
  }, [tenants, payments, isLoaded]);


  const addTenant = (tenantData: Omit<Tenant, 'id'>) => {
    const newTenant = { ...tenantData, id: uuidv4() };
    setTenants(prev => [...prev, newTenant]);
  };

  const updateTenant = (updatedTenant: Tenant) => {
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
  };

  const addPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPayment = { ...paymentData, id: uuidv4() };
    setPayments(prev => [...prev, newPayment]);
  };

  return (
    <AppContext.Provider value={{ tenants, payments, addTenant, updateTenant, addPayment }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
