import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
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

// Expressive display/marketing font
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Rental Pilot',
    template: '%s | Rental Pilot',
  },
  description: 'Efficiently manage tenants, payments, and reports.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico?v=4', sizes: 'any' },
      { url: '/icon-192.png?v=4', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png?v=4', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png?v=4',
    shortcut: '/favicon.ico?v=4',
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
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
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
