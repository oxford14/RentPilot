import type { User } from '@/lib/types';

export type FirebaseAuthClaims = {
  isSuperAdmin: boolean;
  clientId: string | null;
  role: string | null;
  tenantId: string | null;
  docId: string | null;
};

/** Stable Firebase Auth UID mapped from app user identity. */
export function getFirebaseUid(user: User): string {
  if (user.isSuperAdmin && user.id) {
    return `sa_${user.id}`;
  }
  if (user.role === 'tenant' && user.tenantId) {
    return `t_${user.tenantId}`;
  }
  if (user.id) {
    return `mu_${user.id}`;
  }
  throw new Error('Cannot derive Firebase UID from user session.');
}

export function getFirebaseAuthClaims(user: User): FirebaseAuthClaims {
  return {
    isSuperAdmin: Boolean(user.isSuperAdmin),
    clientId: user.clientId ?? null,
    role: user.role ?? null,
    tenantId: user.tenantId ?? null,
    docId: user.isSuperAdmin
      ? user.id ?? null
      : user.role === 'tenant'
        ? user.tenantId ?? null
        : user.id ?? null,
  };
}
