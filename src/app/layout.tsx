import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';

// Initialize Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Define CSS variable
  display: 'swap',
});

const iconUrl = "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/Whisk_storyboard1c1ee4a7bebe492d87191d51%20(2).png?alt=media&token=d8fdb3e6-1585-46ef-bd7a-a631f6b78299";

export const metadata: Metadata = {
  title: {
    default: 'RentPilot',
    template: '%s | RentPilot',
  },
  description: 'Efficiently manage tenants, payments, and reports.',
  icons: {
    icon: iconUrl,
    apple: iconUrl,
  },
  manifest: '/manifest.json',
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
