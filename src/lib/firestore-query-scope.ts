import {
  collection,
  documentId,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

const CLIENT_SCOPED_COLLECTIONS = new Set([
  'tenants',
  'payments',
  'managedUsers',
  'expenses',
  'companyFundsExpenses',
  'additionalDues',
  'businesses',
  'weeklyIncomes',
  'contractTemplates',
  'vehicles',
  'vehicleBookings',
  'vehicleCategories',
  'techSupportRequests',
]);

const SUPER_ADMIN_ONLY_COLLECTIONS = new Set([
  'superAdminUsers',
  'deletedClients',
  'chatSessions',
  'demoRequests',
]);

/**
 * Builds a Firestore query scoped to the authenticated user's role.
 * Returns null when the user should not subscribe to a collection.
 */
export function buildScopedCollectionQuery(
  collName: string,
  authUser: User
): Query | null {
  if (authUser.isSuperAdmin) {
    return query(collection(db, collName));
  }

  if (SUPER_ADMIN_ONLY_COLLECTIONS.has(collName)) {
    return null;
  }

  if (collName === 'clients') {
    if (!authUser.clientId) return null;
    return query(
      collection(db, 'clients'),
      where(documentId(), '==', authUser.clientId)
    );
  }

  if (authUser.role === 'tenant') {
    if (collName === 'tenants' && authUser.tenantId) {
      return query(
        collection(db, 'tenants'),
        where(documentId(), '==', authUser.tenantId)
      );
    }
    if (collName === 'payments' && authUser.tenantId) {
      return query(
        collection(db, 'payments'),
        where('tenantId', '==', authUser.tenantId)
      );
    }
    if (collName === 'additionalDues' && authUser.tenantId) {
      return query(
        collection(db, 'additionalDues'),
        where('tenantId', '==', authUser.tenantId)
      );
    }
    if (collName === 'announcements' && authUser.clientId) {
      return query(
        collection(db, 'announcements'),
        where('scope', 'in', [authUser.clientId, 'global'])
      );
    }
    if (collName === 'techSupportRequests' && authUser.tenantId) {
      return query(
        collection(db, 'techSupportRequests'),
        where('subscriberId', '==', authUser.tenantId)
      );
    }
    return null;
  }

  if (authUser.role === 'technician') {
    if (collName === 'techSupportRequests' && authUser.id) {
      return query(
        collection(db, 'techSupportRequests'),
        where('assignedTechnicianId', '==', authUser.id)
      );
    }
    if (CLIENT_SCOPED_COLLECTIONS.has(collName) && authUser.clientId) {
      return query(
        collection(db, collName),
        where('clientId', '==', authUser.clientId)
      );
    }
    if (collName === 'announcements' && authUser.clientId) {
      return query(
        collection(db, 'announcements'),
        where('scope', 'in', [authUser.clientId, 'global'])
      );
    }
    return null;
  }

  if (CLIENT_SCOPED_COLLECTIONS.has(collName) && authUser.clientId) {
    return query(
      collection(db, collName),
      where('clientId', '==', authUser.clientId)
    );
  }

  if (collName === 'announcements' && authUser.clientId) {
    return query(
      collection(db, 'announcements'),
      where('scope', 'in', [authUser.clientId, 'global'])
    );
  }

  return null;
}

export function shouldListenToSystemSettings(authUser: User): boolean {
  return Boolean(authUser.isSuperAdmin);
}
