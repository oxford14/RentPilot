
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is a fallback to resolve a build conflict and should redirect.
export default function DeprecatedContractView() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main dashboard or another appropriate page.
    router.replace('/');
  }, [router]);

  return null; // Render nothing while redirecting
}
