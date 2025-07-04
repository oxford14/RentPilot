
'use client';

import { redirect } from 'next/navigation';

// This file is a workaround to resolve a Next.js build error caused by conflicting dynamic routes.
// The primary route is at /contract/view/[tenantId]/page.tsx.
// This page immediately redirects to the root to prevent any usage.
export default function DeprecatedContractViewPage() {
  redirect('/');
  return null;
}
