/**
 * The federal courts domain's public API.
 *
 * #70's audited factual content is re-homed here onto first-party statutory
 * bytes. Two deliberate differences from that donor are worth naming: the
 * corpus records 142 statutory divisions rather than 317, because 317 is the
 * Administrative Office's operational division list, which is a different fact
 * with a different authority; and it records no constitutional basis, because the sections
 * establishing these courts do not state one.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  readZipMember,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  TITLE_28_ARTIFACT,
  TITLE_28_MEMBER,
  TITLE_48_ARTIFACT,
  TITLE_48_MEMBER,
  USC_RELEASE_POINT,
  federalCourtsAcquisition,
} from "./acquisition";
import {
  DISTRICT_SECTION_NUMBERS,
  assignCircuits,
  designateBankruptcyCourts,
  normalizeCircuits,
  normalizeStateDistricts,
  normalizeTerritorialDistricts,
} from "./normalize";
import { validateFederalCourtCorpus } from "./validate";
import type { FederalCourtRecord } from "./types";

export type { FederalCourtRecord, JudicialDivision } from "./types";
export {
  EXPECTED_CIRCUIT_COUNT,
  EXPECTED_DISTRICT_COURT_COUNT,
  EXPECTED_STATUTORY_DIVISION_COUNT,
  EXPECTED_TERRITORIAL_DISTRICT_COUNT,
} from "./validate";
export { readSection, splitStatutoryList, textOf } from "./parse";

export const COURTS_COMPILER_VERSION = "1.0.0";
export const COURTS_PARSER_VERSION = "1.0.0";

/**
 * The corpus is as of the release point's own currency, which is the date the
 * Office of the Law Revision Counsel states the title is current through. It is
 * an input, not a clock read.
 */
export const COURTS_CORPUS_AS_OF = "2026-07-23";

type CourtRole = "title28" | "title48";
export type FederalCourtArtifacts = OpenedArtifacts<CourtRole>;

/** Compile the federal court corpus from locked statutory bytes. */
export function compileFederalCourts(
  input:
    | ProductionInput<FederalCourtArtifacts>
    | FixtureInput<FederalCourtArtifacts>,
): CompiledCorpus<FederalCourtRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const title28Opened = input.artifacts.title28;
  const title48Opened = input.artifacts.title48;

  const title28 = readZipMember(
    title28Opened.bytes,
    title28Opened.artifact.container?.memberPath ?? TITLE_28_MEMBER,
  ).toString("utf-8");
  const title48 = readZipMember(
    title48Opened.bytes,
    title48Opened.artifact.container?.memberPath ?? TITLE_48_MEMBER,
  ).toString("utf-8");

  const circuits = normalizeCircuits(
    title28,
    title28Opened.artifact.artifactId,
  );

  const statutoryDistricts: FederalCourtRecord[] = [];
  for (const sectionNumber of DISTRICT_SECTION_NUMBERS) {
    statutoryDistricts.push(
      ...normalizeStateDistricts(
        title28,
        sectionNumber,
        title28Opened.artifact.artifactId,
      ),
    );
  }
  statutoryDistricts.push(
    ...normalizeTerritorialDistricts(
      title48,
      title48Opened.artifact.artifactId,
    ),
  );

  const districts = assignCircuits(statutoryDistricts, circuits);
  const bankruptcyCourts = designateBankruptcyCourts(
    districts,
    title28Opened.artifact.artifactId,
  );

  const records = [...circuits, ...districts, ...bankruptcyCourts].sort(
    (left, right) =>
      left.courtId < right.courtId ? -1 : left.courtId > right.courtId ? 1 : 0,
  );

  return {
    corpus: {
      corpusId: "federal-courts",
      compiler: { name: "federal-courts", version: COURTS_COMPILER_VERSION },
      parser: { name: "uslm-xml", version: COURTS_PARSER_VERSION },
      inputs: [
        {
          artifactId: title28Opened.artifact.artifactId,
          sha256: title28Opened.artifact.bytes.sha256,
        },
        {
          artifactId: title48Opened.artifact.artifactId,
          sha256: title48Opened.artifact.bytes.sha256,
        },
      ],
      asOf: COURTS_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription: `Every United States court of appeals constituted by 28 U.S.C. § 41, every judicial district established by 28 U.S.C. ch. 5 and by the Title 48 organic acts, the statutory divisions those sections create, and the bankruptcy court 28 U.S.C. § 151 designates in each district, as the U.S. Code stands at release point ${USC_RELEASE_POINT}.`,
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<FederalCourtRecord>;
}

export function openFederalCourtProduction(
  lock: ArtifactLock,
): ProductionInput<FederalCourtArtifacts> {
  return openProductionArtifacts<CourtRole>("federal-courts", lock, {
    title28: TITLE_28_ARTIFACT,
    title48: TITLE_48_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<FederalCourtRecord> = {
  domain: "federal-courts",
  compilerVersion: COURTS_COMPILER_VERSION,
  acquisitionPlan: federalCourtsAcquisition,
  lockPath: "data/source/federal-courts/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<FederalCourtRecord, "production"> {
    return compileFederalCourts(
      openFederalCourtProduction(lock),
    ) as CompiledCorpus<FederalCourtRecord, "production">;
  },
  validateCorpus(corpus: CompiledCorpus<FederalCourtRecord>): ValidationReport {
    return validateFederalCourtCorpus(corpus);
  },
};
