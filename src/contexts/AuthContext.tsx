
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, ManagedUser, Client, AuthContextType, ClientUserRole } from '@/lib/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'tenantTrackerAuth';

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
    allManagedUsers: ManagedUser[],
    allClients: Client[]
  ) => {
    if (usernameInput === 'admin' && passwordInput === 'password123') {
      const userData: User = { username: usernameInput, isSuperAdmin: true };
      setIsAuthenticated(true);
      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
      toast({ title: "Login Successful", description: `Welcome back, Super Admin ${usernameInput}!` });
      router.push('/');
      return;
    }

    const matchedUser = allManagedUsers.find(
      (mu) => mu.username === usernameInput && mu.password === passwordInput
    );

    if (matchedUser) {
      const userData: User = {
        username: matchedUser.username,
        clientId: matchedUser.clientId,
        isSuperAdmin: false,
        role: matchedUser.role, // Store the role
      };
      setIsAuthenticated(true);
      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: userData }));
      const clientName = allClients.find(c => c.id === matchedUser.clientId)?.name || 'your organization';
      const roleName = matchedUser.role.charAt(0).toUpperCase() + matchedUser.role.slice(1);
      toast({ title: "Login Successful", description: `Welcome back, ${roleName} ${usernameInput} from ${clientName}!` });
      router.push('/');
    } else {
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid username or password." });
    }
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
