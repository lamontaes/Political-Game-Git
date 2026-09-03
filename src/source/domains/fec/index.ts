/**
 * The FEC domain's public API.
 *
 * Two of 30A's three findings against #68 are structurally impossible here
 * rather than merely fixed. There is no compile timestamp because tracked
 * source output carries no wall clock at all, and there is no mislabelled
 * bounded sample because the corpus is every row of all three bulk files —
 * sampling is the mechanism that produced the mislabelling, so this domain does
 * not sample.
 *
 * Nothing in this corpus reaches gameplay. The FEC adapter is gated on Stage 7
 * authorisation and does not exist.
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
  CANDIDATE_ARTIFACT,
  CANDIDATE_HEADER_ARTIFACT,
  CANDIDATE_MEMBER,
  COMMITTEE_ARTIFACT,
  COMMITTEE_HEADER_ARTIFACT,
  COMMITTEE_MEMBER,
  LINKAGE_ARTIFACT,
  LINKAGE_HEADER_ARTIFACT,
  LINKAGE_MEMBER,
  fecAcquisition,
} from "./acquisition";
import { parseFecBulk, parseFecHeader } from "./parse";
import { normalizeCandidates, normalizeCommittees, normalizeLinkages } from "./normalize";
import { validateFecCorpus } from "./validate";
import type { FecRecord } from "./types";

export type {
  FecCandidateRecord,
  FecCommitteeRecord,
  FecLinkageRecord,
  FecRecord,
} from "./types";
export {
  OFFICIAL_FEC_CANDIDATE_VECTORS,
  OFFICIAL_FEC_COMMITTEE_VECTORS,
} from "./identity";
export {
  EXPECTED_CANDIDATE_COUNT,
  EXPECTED_COMMITTEE_COUNT,
  EXPECTED_LINKAGE_COUNT,
} from "./validate";

export const FEC_COMPILER_VERSION = "1.0.0";
export const FEC_PARSER_VERSION = "1.0.0";

/**
 * The 2023-2024 election cycle's close. It is the cycle the product covers,
 * declared as an input, not the day this corpus happened to be built.
 */
export const FEC_CORPUS_AS_OF = "2024-12-31";

type FecRole =
  | "candidates"
  | "committees"
  | "linkages"
  | "candidateHeader"
  | "committeeHeader"
  | "linkageHeader";

export type FecArtifacts = OpenedArtifacts<FecRole>;

/** Compile the FEC identity corpus from locked publisher bytes. */
export function compileFec(
  input: ProductionInput<FecArtifacts> | FixtureInput<FecArtifacts>,
): CompiledCorpus<FecRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const a = input.artifacts;

  const candidateColumns = parseFecHeader(a.candidateHeader.bytes);
  const committeeColumns = parseFecHeader(a.committeeHeader.bytes);
  const linkageColumns = parseFecHeader(a.linkageHeader.bytes);

  const candidateRows = parseFecBulk(
    readZipMember(a.candidates.bytes, a.candidates.artifact.container?.memberPath ?? CANDIDATE_MEMBER),
    candidateColumns,
  );
  const committeeRows = parseFecBulk(
    readZipMember(a.committees.bytes, a.committees.artifact.container?.memberPath ?? COMMITTEE_MEMBER),
    committeeColumns,
  );
  const linkageRows = parseFecBulk(
    readZipMember(a.linkages.bytes, a.linkages.artifact.container?.memberPath ?? LINKAGE_MEMBER),
    linkageColumns,
  );

  const candidates = normalizeCandidates(
    candidateRows.rows,
    candidateColumns,
    a.candidates.artifact.artifactId,
  );
  const committees = normalizeCommittees(
    committeeRows.rows,
    committeeColumns,
    a.committees.artifact.artifactId,
  );
  const linkages = normalizeLinkages(
    linkageRows.rows,
    linkageColumns,
    a.linkages.artifact.artifactId,
  );

  const defects = [
    ...candidateRows.defects,
    ...committeeRows.defects,
    ...linkageRows.defects,
    ...candidates.defects,
    ...committees.defects,
    ...linkages.defects,
  ];
  if (defects.length > 0) {
    throw new Error(
      `The FEC bulk files produced ${defects.length} parse defects, the first being: ${defects[0]?.message}`,
    );
  }

  const records: FecRecord[] = [
    ...candidates.records,
    ...committees.records,
    ...linkages.records,
  ].sort((left, right) => (left.recordId < right.recordId ? -1 : left.recordId > right.recordId ? 1 : 0));

  return {
    corpus: {
      corpusId: "fec",
      compiler: { name: "fec", version: FEC_COMPILER_VERSION },
      parser: { name: "fec-pipe-delimited", version: FEC_PARSER_VERSION },
      inputs: [
        { artifactId: a.candidates.artifact.artifactId, sha256: a.candidates.artifact.bytes.sha256 },
        { artifactId: a.committees.artifact.artifactId, sha256: a.committees.artifact.bytes.sha256 },
        { artifactId: a.linkages.artifact.artifactId, sha256: a.linkages.artifact.bytes.sha256 },
        {
          artifactId: a.candidateHeader.artifact.artifactId,
          sha256: a.candidateHeader.artifact.bytes.sha256,
        },
        {
          artifactId: a.committeeHeader.artifact.artifactId,
          sha256: a.committeeHeader.artifact.bytes.sha256,
        },
        {
          artifactId: a.linkageHeader.artifact.artifactId,
          sha256: a.linkageHeader.artifact.bytes.sha256,
        },
      ],
      asOf: FEC_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every row of the Federal Election Commission's 2024 candidate master, committee master and candidate-committee linkage bulk files. No sampling is applied.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<FecRecord>;
}

export function openFecProduction(lock: ArtifactLock): ProductionInput<FecArtifacts> {
  return openProductionArtifacts<FecRole>("fec", lock, {
    candidates: CANDIDATE_ARTIFACT,
    committees: COMMITTEE_ARTIFACT,
    linkages: LINKAGE_ARTIFACT,
    candidateHeader: CANDIDATE_HEADER_ARTIFACT,
    committeeHeader: COMMITTEE_HEADER_ARTIFACT,
    linkageHeader: LINKAGE_HEADER_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<FecRecord> = {
  domain: "fec",
  compilerVersion: FEC_COMPILER_VERSION,
  acquisitionPlan: fecAcquisition,
  lockPath: "data/source/fec/artifact-lock.json",
  compileProduction(lock: ArtifactLock): CompiledCorpus<FecRecord, "production"> {
    return compileFec(openFecProduction(lock)) as CompiledCorpus<FecRecord, "production">;
  },
  validateCorpus(corpus: CompiledCorpus<FecRecord>): ValidationReport {
    return validateFecCorpus(corpus);
  },
};
