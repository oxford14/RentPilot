
import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Import Inter
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
  manifest: '/manifest.json', // Add manifest path
  icons: { // Add icons
    icon: '/favicon.ico', // Standard favicon
    // apple: '/icons/apple-touch-icon.png', // Keep commented if file doesn't exist or not used
  },
  themeColor: '#6699CC', // Add theme color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}> {/* Apply Inter font CSS variable to html tag */}
      {/* Manual <head> tag removed. Next.js handles this via metadata. */}
      <body className="font-body antialiased"> {/* Tailwind's font-body will use var(--font-inter) */}
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
