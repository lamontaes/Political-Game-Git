/** Offline acquisition receipt; this does not compile a gameplay corpus. */
import { readFileSync } from "node:fs";
import { parseDelimited } from "../../../src/source/core/index";
import type { ArtifactLock } from "../../../src/source/core/index";
import { verifyLock } from "../verify-artifacts";

const lock = JSON.parse(
  readFileSync("data/source/judiciary-calibration/artifact-lock.json", "utf8"),
) as ArtifactLock;
const results = verifyLock(lock);
for (const result of results) console.log(result);
if (results.some((result) => result.outcome !== "verified")) {
  throw new Error(
    "Every judiciary original must be present and match its lock",
  );
}
for (const artifact of lock.artifacts) {
  if (artifact.mediaType !== "text/csv" || !artifact.localPath) continue;
  const bytes = readFileSync(artifact.localPath);
  const header = parseDelimited(bytes, {
    delimiter: ",",
    hasHeaderRow: true,
  }).header;
  if (!header?.length)
    throw new Error(`${artifact.artifactId}: missing header`);
  const parsed = parseDelimited(bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    expectedFieldCount: header.length,
  });
  if (parsed.defects.length) throw new Error(JSON.stringify(parsed.defects));
  console.log(
    JSON.stringify({
      artifactId: artifact.artifactId,
      rows: parsed.rows.length,
      columns: header,
      sha256: artifact.bytes.sha256,
    }),
  );
}
