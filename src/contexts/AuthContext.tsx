
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, ManagedUser, Client, AuthContextType, SuperAdminUser, Tenant } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'rentPilotAuth'; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const parsedAuth = JSON.parse(storedAuth);
        if (parsedAuth.isAuthenticated && parsedAuth.user) {
          setIsAuthenticated(true);
          setUser(parsedAuth.user);
        }
      }
    } catch (error) {
      console.error("Failed to load auth state from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY); 
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (
    usernameInput: string, // Can be username or email
    passwordInput: string,
  ) => {
    setIsLoading(true);
    try {
      // 1. Check primary hardcoded super admin
      if (usernameInput === 'admin' && passwordInput === 'password123') {
        const userData: User = { username: usernameInput, isSuperAdmin: true };
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
        toast({ title: "Login Successful", description: `Welcome back, Super Admin ${usernameInput}!` });
        router.push('/');
        setIsLoading(false);
        return;
      }

      // 2. Check additional super admin users
      const superAdminQuery = query(
        collection(db, 'superAdminUsers'),
        where('username', '==', usernameInput),
        where('password', '==', passwordInput) 
      );
      const superAdminSnapshot = await getDocs(superAdminQuery);

      if (!superAdminSnapshot.empty) {
        const superAdminDoc = superAdminSnapshot.docs[0].data() as SuperAdminUser;
        const userData: User = { username: superAdminDoc.username, isSuperAdmin: true };
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
        toast({ title: "Login Successful", description: `Welcome back, Super Admin ${superAdminDoc.username}!` });
        router.push('/');
        setIsLoading(false);
        return;
      }

      // 3. Check managed client users
      const managedUserQuery = query(
        collection(db, 'managedUsers'),
        where('username', '==', usernameInput),
        where('password', '==', passwordInput) 
      );
      const managedUserSnapshot = await getDocs(managedUserQuery);

      if (!managedUserSnapshot.empty) {
        const managedUserDocData = managedUserSnapshot.docs[0].data() as ManagedUser;
        const userData: User = {
          username: managedUserDocData.username,
          clientId: managedUserDocData.clientId,
          isSuperAdmin: false,
          role: managedUserDocData.role,
        };

        setIsAuthenticated(true); 
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
        
        let clientNameForToast = 'your organization';
        if (managedUserDocData.clientId) {
          const clientDocRef = doc(db, "clients", managedUserDocData.clientId);
          const clientDocSnap = await getDoc(clientDocRef);
          if (clientDocSnap.exists()) {
            clientNameForToast = (clientDocSnap.data() as Client).name || clientNameForToast;
          }
        }
        
        const roleName = managedUserDocData.role.charAt(0).toUpperCase() + managedUserDocData.role.slice(1);
        toast({ title: "Login Successful", description: `Welcome, ${roleName} ${managedUserDocData.username} from ${clientNameForToast}!` });
        
        router.push('/');
        setIsLoading(false);
        return;
      }

      // 4. Check tenants (using email as username)
      const tenantQuery = query(
        collection(db, 'tenants'),
        where('email', '==', usernameInput),
        where('password', '==', passwordInput)
      );
      const tenantSnapshot = await getDocs(tenantQuery);

      if (!tenantSnapshot.empty) {
        const tenantDoc = tenantSnapshot.docs[0];
        const tenantData = tenantDoc.data() as Tenant;

        if (!tenantData.hasAccount) {
          toast({ variant: "destructive", title: "Login Failed", description: "Account not activated. Please use the invitation link." });
          setIsLoading(false);
          return;
        }

        const userData: User = {
          username: tenantData.name,
          email: tenantData.email,
          tenantId: tenantDoc.id,
          isSuperAdmin: false,
          role: 'tenant',
          clientId: tenantData.clientId,
        };

        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
        toast({ title: "Login Successful", description: `Welcome back, ${tenantData.name}!` });
        router.push('/');
        setIsLoading(false);
        return;
      }
      
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid username/email or password." });
    } catch (error) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Login Error", description: "An unexpected error occurred during login." });
    }
    setIsLoading(false);
  }, [router, toast]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
