
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Toaster } from "@/components/ui/toaster";

// Initialize Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Define CSS variable
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RentPilot - Rental Management',
  description: 'Manage tenants, payments, and reports efficiently.',
  manifest: '/manifest.json',
  themeColor: '#6699CC',
};

// Viewport export removed

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased">
        <AuthProvider>
          <AppProvider>
            <ProtectedLayout>
              {children}
            </ProtectedLayout>
            <Toaster />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

    