"use client";

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This page has been moved to /contracts.
// This component will redirect any users who land here.
export default function DeprecatedContractsPage() {
  useEffect(() => {
    redirect('/contracts');
  }, []);
  
  return null;
}
