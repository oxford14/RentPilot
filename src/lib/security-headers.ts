/**
 * Shared HTTP security headers for Next.js and Firebase Hosting.
 * PayMongo uses hosted redirect checkout — no third-party payment scripts required in CSP.
 */

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://placehold.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebasestorage.googleapis.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

function buildContentSecurityPolicy(): string {
  return CSP_DIRECTIVES.join('; ');
}

export type SecurityHeader = { key: string; value: string };

export function getSecurityHeaders(): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
  ];

  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
}

/** Flat key/value map for Firebase Hosting firebase.json headers array. */
export function getSecurityHeadersRecord(): Record<string, string> {
  return Object.fromEntries(
    getSecurityHeaders().map(({ key, value }) => [key, value])
  );
}
