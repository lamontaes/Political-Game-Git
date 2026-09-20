import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  corpusCanonicalDigest,
  toCanonicalJson,
  writeText,
} from "../../src/source/core/index";
import type {
  ArtifactLock,
  NormalizedCorpus,
} from "../../src/source/core/index";
import type { CpsVotingRecord } from "../../src/source/domains/census-voting-registration/types";
import { CPS_STATE_NAMES } from "../../src/presentation/state-voting-context";
import type {
  StateVotingManifest,
  StateVotingShard,
} from "../../src/presentation/state-voting-context";
import { validateCpsVoting } from "../../src/source/domains/census-voting-registration/validate";
import { REPO_ROOT } from "./registry";

/** Deterministic lazy export from the admitted corpus, not a second source store. */
export function exportStateVotingContext(
  output = resolve(REPO_ROOT, "public/data/state-voting/v1"),
): void {
  const root = resolve(REPO_ROOT, "data/source/census-voting-registration");
  const records = JSON.parse(
    readFileSync(resolve(root, "corpus.json"), "utf8"),
  ) as CpsVotingRecord[];
  const corpus = JSON.parse(
    readFileSync(resolve(root, "corpus-manifest.json"), "utf8"),
  ) as NormalizedCorpus;
  const lock = JSON.parse(
    readFileSync(resolve(root, "artifact-lock.json"), "utf8"),
  ) as ArtifactLock;
  if (
    corpus.inputClass !== "production" ||
    corpus.inputs.some(
      (input) =>
        !lock.artifacts.some(
          (a) =>
            a.artifactId === input.artifactId &&
            a.bytes.sha256 === input.sha256,
        ),
    ) ||
    corpusCanonicalDigest(records) !== corpus.canonicalSha256 ||
    validateCpsVoting({ corpus, records }).findings.some(
      (f) => f.severity === "error",
    )
  )
    throw new Error("State voting export requires a valid production corpus");
  const states: Record<string, string> = {};
  for (const [stateUsps, stateName] of Object.entries(CPS_STATE_NAMES)) {
    const rows = records.filter(
      (r) =>
        r.geographyName === stateName.toUpperCase() &&
        r.geographyLevel === "state-or-district",
    );
    if (rows.length !== 18)
      throw new Error(`Incomplete CPS state ${stateUsps}`);
    const shard: StateVotingShard = {
      schemaVersion: "1",
      stateUsps,
      stateName,
      records: rows,
    };
    const file = `${stateUsps}.json`;
    states[stateUsps] = file;
    writeText(resolve(output, file), toCanonicalJson(shard) + "\n");
  }
  const manifest: StateVotingManifest = {
    schemaVersion: "1",
    inputClass: "production",
    corpusSha256: corpus.canonicalSha256,
    releaseDate: "2025-04-30",
    states,
    sources: lock.artifacts.map((a) => ({
      artifactId: a.artifactId,
      sha256: a.bytes.sha256,
      url: a.retrieval.url,
      retrievedAt: a.retrieval.retrievedAt,
      releaseDate: a.publisher.releaseDate,
    })),
  };
  writeText(resolve(output, "manifest.json"), toCanonicalJson(manifest) + "\n");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  exportStateVotingContext(process.argv[2]);
  console.log("State voting browser context exported");
}
