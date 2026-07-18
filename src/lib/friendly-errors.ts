/**
 * Converts raw errors (especially Firebase Auth/Firestore/Storage errors) into
 * clear, user-friendly messages. Technical details are logged elsewhere; users
 * should never see Firebase codes, stack traces, or internal jargon.
 */

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/** Known Firebase (and related) error codes mapped to plain-language messages. */
const FRIENDLY_BY_CODE: Record<string, string> = {
  // Auth
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'We couldn’t find an account with those details.',
  'auth/wrong-password': 'The username or password is incorrect.',
  'auth/invalid-credential': 'The username or password is incorrect.',
  'auth/invalid-login-credentials': 'The username or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/email-already-exists': 'An account with this email already exists.',
  'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
  'auth/id-token-expired': 'Your session has expired. Please sign in again.',
  'auth/session-cookie-expired': 'Your session has expired. Please sign in again.',
  'auth/uid-already-exists': 'An account with these details already exists.',

  // Firestore
  'permission-denied': 'You don’t have permission to do this.',
  'unauthenticated': 'Please sign in to continue.',
  'not-found': 'The requested item could not be found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'We’re a bit busy right now. Please try again shortly.',
  'failed-precondition': 'This action can’t be completed right now.',
  'aborted': 'The action was interrupted. Please try again.',
  'unavailable': 'The service is temporarily unavailable. Please try again shortly.',
  'deadline-exceeded': 'The request took too long. Please try again.',
  'cancelled': 'The request was cancelled. Please try again.',
  'data-loss': 'Something went wrong while processing your request. Please try again.',
  'unknown': GENERIC_FALLBACK,
  'internal': GENERIC_FALLBACK,

  // Storage
  'storage/unauthorized': 'You don’t have permission to upload this file.',
  'storage/canceled': 'The upload was cancelled.',
  'storage/object-not-found': 'The file could not be found.',
  'storage/quota-exceeded': 'Storage limit reached. Please contact support.',
  'storage/unauthenticated': 'Please sign in to upload files.',
  'storage/retry-limit-exceeded': 'The upload timed out. Please try again.',
};

/** Extracts a Firebase-style error code from an unknown error, if present. */
function extractCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) {
      // Firestore codes sometimes arrive as a bare number for HTTP status; skip those.
      return code;
    }
  }

  // Fall back to sniffing the message, e.g. "Firebase: ... (auth/wrong-password)."
  const message = getRawMessage(error);
  const match = message.match(/((?:auth|storage|firestore|functions|app)\/[a-z-]+)/i);
  if (match) return match[1];
  if (/permission[-_ ]denied/i.test(message)) return 'permission-denied';
  if (/\bunauthenticated\b/i.test(message)) return 'unauthenticated';
  if (/\bunavailable\b/i.test(message)) return 'unavailable';
  return undefined;
}

function getRawMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/** Heuristic: does this message look like internal/technical text we should hide? */
function looksTechnical(message: string): boolean {
  if (!message) return true;
  return /firebase|firestore|\bcode\b|\/[a-z-]+\)|PERMISSION_DENIED|UNAVAILABLE|INTERNAL|at\s.+:\d+:\d+|https?:\/\/|undefined|null\b|TypeError|ReferenceError|\bquery\b|index/i.test(
    message
  );
}

/**
 * Returns a user-friendly error message.
 *
 * - Known Firebase/Firestore/Storage codes map to plain-language text.
 * - Custom app errors with human-readable messages are passed through.
 * - Anything technical falls back to the provided fallback (or a generic message).
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback: string = GENERIC_FALLBACK
): string {
  const code = extractCode(error);
  if (code && FRIENDLY_BY_CODE[code]) {
    return FRIENDLY_BY_CODE[code];
  }

  const raw = getRawMessage(error).trim();
  if (raw && !looksTechnical(raw)) {
    // Our own thrown errors (e.g. "Username is already taken.") are safe to show.
    return raw;
  }

  return fallback;
}
