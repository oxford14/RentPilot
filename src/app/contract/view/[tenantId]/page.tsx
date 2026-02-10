
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated. The link in the tenants table now opens the PDF directly in a new tab.
// This component remains to prevent 404 errors from any old, cached links.
export default function DeprecatedViewContractPage() {
  const router = useRouter();
  
  React.useEffect(() => {
    // Redirect users back to the tenants page.
    router.replace('/tenants');
  }, [router]);

  return null; // Render nothing as the redirect is handled.
}
