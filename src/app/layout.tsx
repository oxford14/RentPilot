
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

const iconUrl = "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(1).png?alt=media&token=459e8311-68ad-477a-8b52-32408db386ea";

export const metadata: Metadata = {
  title: 'RentPilot - Rental Management',
  description: 'Manage tenants, payments, and reports efficiently.',
  themeColor: '#6699CC',
  icons: {
    icon: iconUrl,
    apple: iconUrl,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6699CC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased bg-background">
        <AuthProvider>
          <AppProvider>
            <ProtectedLayout>
              {children}
            </ProtectedLayout>
          </AppProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
