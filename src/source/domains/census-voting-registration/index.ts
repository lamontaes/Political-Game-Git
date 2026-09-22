import {
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  SourceDomainModule,
  ProductionInput,
  FixtureInput,
  OpenedArtifacts,
  CompiledCorpus,
  ArtifactLock,
} from "../../core/index";
import { censusVotingAcquisition } from "./acquisition";
import { parseCpsTable } from "./parse";
import { validateCpsVoting } from "./validate";
import type { CpsVotingRecord } from "./types";
export type { CpsVotingRecord, CpsVotingCell, CpsMetricKey } from "./types";
export { readCpsCell, parseCpsTable } from "./parse";

type CpsArtifacts = OpenedArtifacts<
  "4a" | "4b" | "4c" | "methodology" | "release"
>;
export function compileCpsVoting(
  input: ProductionInput<CpsArtifacts> | FixtureInput<CpsArtifacts>,
): CompiledCorpus<CpsVotingRecord> {
  const releaseText = input.artifacts.release.bytes.toString("utf8");
  if (
    !releaseText.includes("2025-04-30") &&
    !releaseText.includes("APRIL 30, 2025")
  )
    throw new Error(
      "CPS table publication date is not supported by the locked release page",
    );
  const records = [
    ...parseCpsTable(
      input.artifacts["4a"].bytes,
      "4a",
      input.artifacts["4a"].artifact.artifactId,
    ),
    ...parseCpsTable(
      input.artifacts["4b"].bytes,
      "4b",
      input.artifacts["4b"].artifact.artifactId,
    ),
    ...parseCpsTable(
      input.artifacts["4c"].bytes,
      "4c",
      input.artifacts["4c"].artifact.artifactId,
    ),
  ].sort((a, b) =>
    a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0,
  );
  return {
    corpus: {
      corpusId: "census-voting-registration",
      compiler: { name: "census-voting-registration", version: "1.0.0" },
      parser: { name: "census-cps-vote-2024-xlsx", version: "1.0.0" },
      inputs: Object.values(input.artifacts)
        .map((a) => ({
          artifactId: a.artifact.artifactId,
          sha256: a.artifact.bytes.sha256,
        }))
        .sort((a, b) => a.artifactId.localeCompare(b.artifactId)),
      asOf: "2025-04-30",
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "lock" in input ? "production" : "fixture",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Published November 2024 CPS tables 4a, 4b and 4c: United States, 50 states and District of Columbia, with published total, sex, race/Hispanic-origin and age groups.",
        boundedSampleReason:
          "One survey reference period and three published tables. Reported estimates of civilian noninstitutionalized adults; not administrative voter rolls, legal eligibility, party registration or simulated residents.",
      },
    },
    records,
  };
}
export function openCpsVoting(
  lock: ArtifactLock,
): ProductionInput<CpsArtifacts> {
  return openProductionArtifacts("census-voting-registration", lock, {
    "4a": "cps-2024-vote04a",
    "4b": "cps-2024-vote04b",
    "4c": "cps-2024-vote04c",
    methodology: "cps-2024-methodology",
    release: "cps-2024-release",
  });
}
export const sourceDomain: SourceDomainModule<CpsVotingRecord> = {
  domain: "census-voting-registration",
  compilerVersion: "1.0.0",
  acquisitionPlan: censusVotingAcquisition,
  lockPath: "data/source/census-voting-registration/artifact-lock.json",
  compileProduction(lock) {
    return compileCpsVoting(openCpsVoting(lock)) as CompiledCorpus<
      CpsVotingRecord,
      "production"
    >;
  },
  validateCorpus: validateCpsVoting,
};
