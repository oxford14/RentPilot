
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, Client, AuthContextType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { serverVerifyCredentials } from '@/actions/user-actions';

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
    usernameInput: string,
    passwordInput: string,
  ) => {
    setIsLoading(true);
    try {
        const validatedUser = await serverVerifyCredentials(usernameInput, passwordInput);

        if (validatedUser) {
            setIsAuthenticated(true);
            setUser(validatedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: validatedUser }));
            
            let toastDescription = `Welcome back, ${validatedUser.username}!`;
            if (validatedUser.isSuperAdmin) {
                toastDescription = `Welcome back, Super Admin ${validatedUser.username}!`;
            } else if (validatedUser.role === 'tenant') {
                toastDescription = `Welcome back, ${validatedUser.username}!`;
            } else if (validatedUser.clientId) {
                try {
                    const clientDocRef = doc(db, "clients", validatedUser.clientId);
                    const clientDocSnap = await getDoc(clientDocRef);
                    const clientName = clientDocSnap.exists() ? (clientDocSnap.data() as Client).name : 'your organization';
                    const roleName = validatedUser.role ? validatedUser.role.charAt(0).toUpperCase() + validatedUser.role.slice(1) : 'User';
                    toastDescription = `Welcome, ${roleName} ${validatedUser.username} from ${clientName}!`;
                } catch (e) {
                    // Could fail if client is deleted but user still exists. Fallback.
                    console.error("Could not fetch client name for login toast:", e);
                }
            }

            toast({ title: "Login Successful", description: toastDescription });
            
            if (validatedUser.isSuperAdmin) {
                router.push('/admin');
            } else {
                router.push('/');
            }
        } else {
            toast({ variant: "destructive", title: "Login Failed", description: "Invalid username/email or password." });
        }
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
