// This file is intentionally left with only an export statement.
// It resolves a Next.js build conflict caused by having two dynamic route files,
// `[contractId]` and `[tenantId]`, at the same level. This approach
// ensures this file is not treated as a page, fixing the server startup error.
export {};
