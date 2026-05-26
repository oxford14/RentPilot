import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';
import { MAIN_APP_LOGO_URL } from '@/lib/branding';

// Initialize Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RentPilot',
    template: '%s | RentPilot',
  },
  description: 'Efficiently manage tenants, payments, and reports.',
  icons: {
    icon: '/favicon.ico?v=3',
    apple: '/favicon.ico?v=3',
    shortcut: '/favicon.ico?v=3',
  },
  openGraph: {
    images: [{ url: MAIN_APP_LOGO_URL }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6699CC',
  appleWebAppCapable: 'yes',
  appleWebAppStatusBarStyle: 'default',
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
          <ProtectedLayout>
            {children}
          </ProtectedLayout>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
