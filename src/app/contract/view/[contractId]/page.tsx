'use server';

// This file is intentionally not a page component to resolve a routing conflict
// with /contract/view/[tenantId]. Exporting a server action or any non-component
// export prevents Next.js from treating this as a page.

export async function dummyAction() {
  return { status: 'ok' };
}
