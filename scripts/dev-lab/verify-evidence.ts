import type { FullConfig } from "@playwright/test";
import {
  sourceIdentity,
  assertIdentity,
  type SourceIdentity,
} from "./identity";
import { historicalEvidenceHashes } from "./historical-evidence";
export default async function verifyEvidence(config: FullConfig) {
  assertIdentity(
    config.metadata.expectedIdentity as SourceIdentity,
    sourceIdentity(),
  );
  const before = config.metadata.historicalEvidence;
  const after = historicalEvidenceHashes();
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Ordinary browser tests modified historical evidence");
}
