/**
 * The state-legislatures domain's public API.
 *
 * The smallest fact a resident of any Census place needs about the seats above
 * them: that their state has a legislature, how many chambers it sits in, what
 * those chambers are called, how large they are, and whether their members are
 * elected. Fifty records, one per state, and every one of them present whether
 * or not this substrate managed to read that state's constitution — a state it
 * could not read carries UNKNOWN and a gap naming the obstacle, never a
 * plausible-looking guess.
 *
 * This is deliberately not `LegislativeRulePack` coverage and must not grow
 * into it. Five states have a rule pack because five chambers' worth of bill
 * procedure was read. Knowing that Ohio has a general assembly of two chambers
 * is a far smaller claim than knowing how an Ohio bill is referred, reported
 * and concurred in, and conflating the two is what confines candidacy to five
 * jurisdictions today.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  STATE_LEGISLATURE_ACQUISITION,
  STATE_LEGISLATURE_SOURCES,
} from "./acquisition";
import {
  STATE_DECLARATIONS,
  STATE_LEGISLATURES_CORPUS_AS_OF,
} from "./declarations";
import { artifactTextLookup, normalizeStateLegislatures } from "./normalize";
import { validateStateLegislatureCorpus } from "./validate";
import type { StateLegislatureIdentity } from "./types";

export type {
  ChamberIdentity,
  LegislatureStructure,
  StateLegislatureIdentity,
  UnresolvedGap,
} from "./types";
export { recordCitedArtifacts } from "./types";
export type {
  Declared,
  DeclaredFact,
  DeclaredUnknown,
  StateDeclaration,
  Transcription,
} from "./declarations";
export {
  isDeclaredFact,
  STATE_DECLARATIONS,
  STATE_LEGISLATURES_CORPUS_AS_OF,
} from "./declarations";
export { STATE_LEGISLATURE_SOURCES } from "./acquisition";
export { containsExcerpt, normalizeRetrievedText } from "./text";
export {
  artifactTextLookup,
  normalizeStateLegislatures,
  numeralSpellings,
} from "./normalize";
export {
  FIFTY_STATE_KEYS,
  FORBIDDEN_FIELDS,
  REJECTED_PROVENANCE,
  validateStateLegislatureCorpus,
} from "./validate";
export {
  buildCoverageReport,
  renderCoverageMarkdown,
  PROCEDURAL_PACK_STATES,
} from "./coverage";
export type { CoverageReport, StateCoverage } from "./coverage";

export const STATE_LEGISLATURES_COMPILER_VERSION = "1.0.0";
export const STATE_LEGISLATURES_PARSER_VERSION = "1.0.0";

type ArtifactRole = string;

/** Compile the fifty state records from the locked state instruments. */
export function compileStateLegislatures(
  input: ProductionInput<Record<ArtifactRole, { readonly bytes: Buffer }>>,
  corpusAsOf: string = STATE_LEGISLATURES_CORPUS_AS_OF,
): CompiledCorpus<StateLegislatureIdentity, "production"> {
  const bytesById = new Map<string, Uint8Array>();
  for (const [artifactId, opened] of Object.entries(input.artifacts)) {
    bytesById.set(artifactId, opened.bytes);
  }

  const { records, defects } = normalizeStateLegislatures(
    artifactTextLookup(bytesById),
    corpusAsOf,
  );
  if (defects.length > 0) {
    throw new Error(
      `The state-legislatures compile produced ${defects.length} defect(s), the first being: ${defects[0]?.stateUsps} — ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "state-legislatures",
      compiler: {
        name: "state-legislatures",
        version: STATE_LEGISLATURES_COMPILER_VERSION,
      },
      parser: {
        name: "state-instrument-transcription",
        version: STATE_LEGISLATURES_PARSER_VERSION,
      },
      inputs: STATE_LEGISLATURE_SOURCES.map((spec) => ({
        artifactId: spec.artifactId,
        sha256: requireDigest(input.lock, spec.artifactId),
      })),
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        /*
         * Complete as a universe of states, incomplete as a body of facts, and
         * those are different claims. Every state has a record; many of those
         * records are mostly UNKNOWN, which the record itself says and the
         * coverage report counts.
         */
        isCompleteUniverse: true,
        universeDescription:
          "The fifty United States, one identity record each. Facts inside a record are KNOWN only where a locked state instrument states them; a state whose authority could not be retrieved carries UNKNOWN values and a gap naming the obstacle.",
        boundedSampleReason: null,
      },
    },
    records,
  };
}

function requireDigest(lock: ArtifactLock, artifactId: string): string {
  const found = lock.artifacts.find(
    (artifact) => artifact.artifactId === artifactId,
  );
  if (!found) {
    throw new Error(
      `Artifact "${artifactId}" is not in the state-legislatures lock. Run: npm run source:acquire -- --domain state-legislatures`,
    );
  }
  return found.bytes.sha256;
}

/** Open every locked state instrument through the capability boundary. */
export function openStateLegislatureArtifacts(
  lock: ArtifactLock,
): ProductionInput<Record<string, { readonly bytes: Buffer }>> {
  const byRole: Record<string, string> = {};
  for (const spec of STATE_LEGISLATURE_SOURCES) {
    byRole[spec.artifactId] = spec.artifactId;
  }
  return openProductionArtifacts("state-legislatures", lock, byRole);
}

export const sourceDomain: SourceDomainModule<StateLegislatureIdentity> = {
  domain: "state-legislatures",
  compilerVersion: STATE_LEGISLATURES_COMPILER_VERSION,
  acquisitionPlan: STATE_LEGISLATURE_ACQUISITION,
  lockPath: "data/source/state-legislatures/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<StateLegislatureIdentity, "production"> {
    return compileStateLegislatures(openStateLegislatureArtifacts(lock));
  },
  validateCorpus(
    corpus: CompiledCorpus<StateLegislatureIdentity>,
  ): ValidationReport {
    return validateStateLegislatureCorpus(corpus);
  },
};

/** The declared states, so a caller can count them without compiling. */
export const DECLARED_STATE_COUNT = STATE_DECLARATIONS.length;
