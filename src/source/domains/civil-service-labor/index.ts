import {
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  OpenedArtifact,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  CIVIL_SERVICE_LABOR_ACQUISITION,
  CIVIL_SERVICE_LABOR_AS_OF,
  CIVIL_SERVICE_LABOR_SOURCES,
} from "./acquisition";
import { compileProfiles } from "./profiles";
import { applyVerifiedFacts } from "./facts";
import type { CivilServiceLaborRecord } from "./types";
import { validateCivilServiceLaborCorpus } from "./validate";

export * from "./acquisition";
export * from "./profiles";
export * from "./types";
export * from "./validate";

export const CIVIL_SERVICE_LABOR_COMPILER_VERSION = "1.0.0";

function requireDigest(lock: ArtifactLock, artifactId: string): string {
  const found = lock.artifacts.find(
    (artifact) => artifact.artifactId === artifactId,
  );
  if (!found) throw new Error(`Missing locked artifact ${artifactId}.`);
  return found.bytes.sha256;
}

export function compileCivilServiceLabor(
  input: ProductionInput<Record<string, OpenedArtifact>>,
): CompiledCorpus<CivilServiceLaborRecord, "production"> {
  const records = applyVerifiedFacts(compileProfiles(), input.artifacts);
  return {
    corpus: {
      corpusId: "civil-service-labor",
      compiler: {
        name: "civil-service-labor",
        version: CIVIL_SERVICE_LABOR_COMPILER_VERSION,
      },
      parser: { name: "literal-statutory-transcription", version: "1.0.0" },
      inputs: CIVIL_SERVICE_LABOR_SOURCES.map((source) => ({
        artifactId: source.artifactId,
        sha256: requireDigest(input.lock, source.artifactId),
      })),
      asOf: CIVIL_SERVICE_LABOR_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "The United States federal government and fifty states, each carrying separate civil-service and labor-bargaining profiles. Field coverage is intentionally partial and unsupported facts remain UNKNOWN.",
        boundedSampleReason: null,
      },
    },
    records,
  };
}

export function openCivilServiceLaborArtifacts(lock: ArtifactLock) {
  const byRole = Object.fromEntries(
    CIVIL_SERVICE_LABOR_SOURCES.map((source) => [
      source.artifactId,
      source.artifactId,
    ]),
  );
  return openProductionArtifacts("civil-service-labor", lock, byRole);
}

export const sourceDomain: SourceDomainModule<CivilServiceLaborRecord> = {
  domain: "civil-service-labor",
  compilerVersion: CIVIL_SERVICE_LABOR_COMPILER_VERSION,
  acquisitionPlan: CIVIL_SERVICE_LABOR_ACQUISITION,
  lockPath: "data/source/civil-service-labor/artifact-lock.json",
  compileProduction(lock) {
    return compileCivilServiceLabor(openCivilServiceLaborArtifacts(lock));
  },
  validateCorpus(corpus): ValidationReport {
    return validateCivilServiceLaborCorpus(corpus);
  },
};
