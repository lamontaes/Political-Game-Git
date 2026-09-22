export interface ClientProvenance {
  sourceRevision: string;
  treeSha256: string;
  profile: string;
  dirty?: boolean;
  stampedAt?: string;
}
export function hashClientTree(clientDir: string): string;
export function assertProvenanceMatches(input: {
  clientDir: string;
  expectedRevision: string;
  expectedDirty: boolean;
}): { provenance: ClientProvenance; treeSha256: string };
