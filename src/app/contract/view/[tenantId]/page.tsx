// This file is intentionally left blank to resolve a routing conflict.
// The primary contract viewer is located at /contract/view/[contractId]/page.tsx.
// It uses the ID from the URL, which is a tenant ID, but names the param "contractId" to match the folder.
export default function ConflictingTenantIdViewPage() {
  return null;
}
