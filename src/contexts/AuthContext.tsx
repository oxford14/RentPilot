
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, ManagedUser, Client, AuthContextType, SuperAdminUser } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'rentPilotAuth'; // Keep this for client-side session persistence

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect still tries to load persisted auth state from localStorage
    // to maintain session across page reloads for the same browser.
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
      localStorage.removeItem(AUTH_STORAGE_KEY); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (
    usernameInput: string,
    passwordInput: string,
    // These parameters are no longer needed as we fetch from Firestore
    _allManagedUsers_unused?: ManagedUser[], 
    _allClients_unused?: Client[],
    _allSuperAdminUsers_unused?: SuperAdminUser[]
  ) => {
    setIsLoading(true);
    try {
      // 1. Check primary hardcoded super admin (local fallback or initial admin)
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

      // 2. Check additional super admin users from Firestore
      const superAdminQuery = query(
        collection(db, 'superAdminUsers'),
        where('username', '==', usernameInput),
        where('password', '==', passwordInput) // WARNING: Plain text password
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

      // 3. Check managed client users from Firestore
      const managedUserQuery = query(
        collection(db, 'managedUsers'),
        where('username', '==', usernameInput),
        where('password', '==', passwordInput) // WARNING: Plain text password
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
        
        // Fetch client name for toast
        let clientName = 'your organization';
        if (managedUserDocData.clientId) {
            const clientQuery = query(collection(db, 'clients'), where('id', '==', managedUserDocData.clientId));
            const clientSnapshot = await getDocs(clientQuery);
            if (!clientSnapshot.empty) {
                 clientName = (clientSnapshot.docs[0].data() as Client).name || clientName;
            } else { // If client ID is present but client doc not found, try to get client by ID from Firestore
                 const clientDocSnapshot = await getDocs(query(collection(db, "clients"), where("__name__", "==", managedUserDocData.clientId)));
                 if(!clientDocSnapshot.empty){
                    clientName = (clientDocSnapshot.docs[0].data() as Client).name || clientName;
                 }
            }
        }

        const roleName = managedUserDocData.role.charAt(0).toUpperCase() + managedUserDocData.role.slice(1);
        toast({ title: "Login Successful", description: `Welcome back, ${roleName} ${managedUserDocData.username} from ${clientName}!` });
        router.push('/');
        setIsLoading(false);
        return;
      }
      
      // If no match
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid username or password." });
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
