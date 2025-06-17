
import type {Metadata} from 'next';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Toaster } from "@/components/ui/toaster";


export const metadata: Metadata = {
  title: 'RentPilot - Rental Management',
  description: 'Manage tenants, payments, and reports efficiently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider> {/* AuthProvider is the outer provider */}
          <AppProvider> {/* AppProvider is the inner provider, allowing it to use useAuth() */}
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
