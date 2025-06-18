
import type { Metadata, Viewport } from 'next'; // Import Viewport
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
  icons: {
    icon: '/favicon.ico',
  },
  // themeColor: '#6699CC', // Removed from here
};

export const viewport: Viewport = { // Added viewport export
  themeColor: '#6699CC',
};

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
