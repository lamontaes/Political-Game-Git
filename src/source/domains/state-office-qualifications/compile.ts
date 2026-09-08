/**
 * Compiling qualifications from authorities this repository actually read.
 *
 * 31F §8 left production compilation gated behind a choice: retrieve the state
 * authorities the research cites, or widen the substrate to admit a declared
 * secondary tier. This takes the first path, so nothing here relaxes the
 * contract that gate exists to protect. Every record below carries evidence
 * pointing at bytes fetched from a state's own publisher and hashed, and its
 * value had to be found in the enacted text cut from those bytes before it
 * became a record.
 *
 * The research corpora are the *claim list*, not the evidence. They say which
 * facts to go and check; `transcription.ts` says where each one is written; the
 * artifacts say what is written there. A row nothing checks is not compiled,
 * and the caller gets it back as a refusal with a reason rather than a silence.
 *
 * Three refusals matter enough to name. A claim whose cited provision this
 * domain never retrieved is refused — the compiler does not go looking for a
 * provision that would fit. A claim whose citation names a provision that turns
 * out not to carry it is refused, not repaired. And a claim whose value cannot
 * be found in the words of the provision it cites is refused however plausible
 * it looks, which is the whole difference between this and PR #72.
 */

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  corpusCanonicalDigest,
  extractEnactedText,
  sha256Hex,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  Evidence,
  ProductionInput,
  RawArtifact,
} from "../../core/index";
import { openProductionArtifacts } from "../../core/index";
import { QUALIFICATION_SOURCES, qualificationSource } from "./acquisition";
import type { QualificationSourceSpec } from "./acquisition";
import { matrixField, parseQualificationMatrix } from "./parse";
import type { QualificationMatrixSchema } from "./parse";
import { readRequirement } from "./normalize";
import {
  QUALIFICATION_TRANSCRIPTIONS,
  locatorNames,
  unsupportedFindingFor,
} from "./transcription";
import type { ReviewedTranscription } from "./transcription";
import type {
  CitedAuthority,
  OfficeExistence,
  OfficeFamily,
  QualificationClaim,
  QualificationField,
  QualificationRecord,
} from "./types";
import { known, notYetOperative, unknown } from "../../core/index";
import type { Sourced } from "../../core/index";

/** The committed research corpora this domain compiles claims out of. */
export interface ResearchMatrixSpec {
  readonly matrixId: string;
  readonly batch: "31C" | "31D";
  readonly path: string;
  /** What the batch covers, for the corpus's own coverage statement. */
  readonly description: string;
}

export const RESEARCH_MATRICES: readonly ResearchMatrixSpec[] = [
  {
    matrixId: "31F-compiler-ready-claims",
    batch: "31C",
    path: "docs/research/31F-compiler-ready-claims.tsv",
    description:
      "The 118 claims 31F marked compiler-ready, drawn from research batch 31C (MA MI MN MO MS MT NE NH NJ NV).",
  },
  {
    matrixId: "31D-recovered-claims",
    batch: "31D",
    path: "docs/research/31D-recovered-claims.tsv",
    description:
      "The 601 claims recovered losslessly from research batch 31D (NM NY NC ND OH OK OR PA RI SC) after its delimiters were found intact.",
  },
];

/** Why one research row did not become a record. */
export type QualificationRefusalKind =
  | "no-transcription"
  | "authority-read-claim-unsupported"
  | "authority-not-retrieved"
  | "citation-does-not-name-provision"
  | "excerpt-absent-from-provision"
  | "office-family-not-modelled"
  | "field-not-modelled";

export interface QualificationRefusal {
  readonly batch: "31C" | "31D";
  readonly stateUsps: string;
  readonly officeFamily: string;
  readonly field: string;
  readonly status: string;
  readonly citedLocator: string;
  readonly citedUrl: string;
  readonly kind: QualificationRefusalKind;
  readonly reason: string;
}

export interface QualificationCompileResult {
  readonly corpus: CompiledCorpus<QualificationRecord, "production">;
  /** Every research row that did not become a record, and why. */
  readonly refusals: readonly QualificationRefusal[];
  /** Every research row considered, compiled or not. */
  readonly rowsConsidered: number;
}

const OFFICE_FAMILY_BY_MATRIX_NAME: Readonly<Record<string, OfficeFamily>> = {
  GOVERNOR: "GOVERNOR",
  LIEUTENANT_GOVERNOR: "LIEUTENANT_GOVERNOR",
  LT_GOVERNOR: "LIEUTENANT_GOVERNOR",
  ATTORNEY_GENERAL: "ATTORNEY_GENERAL",
  SECRETARY_OF_STATE: "SECRETARY_OF_STATE",
  UPPER_CHAMBER: "UPPER_CHAMBER",
  UPPER_LEGISLATOR: "UPPER_CHAMBER",
  LOWER_CHAMBER: "LOWER_CHAMBER",
  LOWER_LEGISLATOR: "LOWER_CHAMBER",
  UNICAMERAL_CHAMBER: "UNICAMERAL_CHAMBER",
  NEBRASKA_UNICAMERAL: "UNICAMERAL_CHAMBER",
};

const FIELD_BY_MATRIX_NAME: Readonly<
  Record<string, QualificationField | "OFFICE_EXISTENCE">
> = {
  "Office Existence": "OFFICE_EXISTENCE",
  office_existence: "OFFICE_EXISTENCE",
  "Minimum Age": "MINIMUM_AGE",
  min_age: "MINIMUM_AGE",
  "U.S. Citizenship Duration": "US_CITIZENSHIP",
  us_citizenship: "US_CITIZENSHIP",
  "State Residence Duration": "STATE_RESIDENCE",
  state_residence_years: "STATE_RESIDENCE",
  "District Residence Duration": "DISTRICT_RESIDENCE",
  district_residence: "DISTRICT_RESIDENCE",
  "Elector Requirement": "ELECTOR_REQUIREMENT",
  elector_required: "ELECTOR_REQUIREMENT",
  "Term Length": "TERM_LENGTH",
  term_length_years: "TERM_LENGTH",
  "Term Limit Rule": "TERM_LIMIT",
  term_limit: "TERM_LIMIT",
  "Professional Qualifications": "PROFESSIONAL_QUALIFICATION",
  professional_qualification: "PROFESSIONAL_QUALIFICATION",
  "Selection Mechanism": "SELECTION_MECHANISM",
  selection_type: "SELECTION_MECHANISM",
};

function repoRoot(): string {
  return resolve(new URL("../../../..", import.meta.url).pathname);
}

function readRepositoryFile(path: string): Buffer {
  return readFileSync(isAbsolute(path) ? path : resolve(repoRoot(), path));
}

/**
 * The enacted text of each declared provision, keyed `artifactId::locator`.
 *
 * The capability layer hands back the declared regions joined by a newline, and
 * the normalizer this substrate uses collapses every whitespace run to a single
 * space — so a region can never contain a newline, and splitting on one returns
 * the regions in the order they were declared. Provision *n* of the spec is
 * therefore line *n* of the extract, checked here rather than assumed.
 */
function provisionTexts(
  spec: QualificationSourceSpec,
  artifact: RawArtifact,
  bytes: Buffer,
): ReadonlyMap<string, string> {
  const regions = extractEnactedText(spec.artifactId, bytes, {
    boundaryKind: "normalized-text-regions",
    regions: spec.provisions.map((provision) => provision.region),
    extracted: spec.enacted,
  }).split("\n");
  if (regions.length !== spec.provisions.length) {
    throw new Error(
      `Artifact "${spec.artifactId}" declares ${spec.provisions.length} provisions but its enacted text cut into ${regions.length} spans.`,
    );
  }
  const byLocator = new Map<string, string>();
  for (const [index, provision] of spec.provisions.entries()) {
    byLocator.set(`${spec.artifactId}::${provision.locator}`, regions[index]!);
  }
  void artifact;
  return byLocator;
}

/** Open every declared authority. Roles are artifact ids; there is no aliasing. */
export function openQualificationArtifacts(
  lock: ArtifactLock,
): ProductionInput<Record<string, { artifact: RawArtifact; bytes: Buffer }>> {
  const roles = Object.fromEntries(
    QUALIFICATION_SOURCES.map((spec) => [spec.artifactId, spec.artifactId]),
  );
  return openProductionArtifacts(
    "state-office-qualifications",
    lock,
    roles,
  ) as unknown as ProductionInput<
    Record<string, { artifact: RawArtifact; bytes: Buffer }>
  >;
}

function authorityFrom(
  row: { fields: readonly string[]; line: number },
  schema: QualificationMatrixSchema,
): CitedAuthority {
  return {
    authorityType: matrixField(row, "authority_type", schema),
    legalLocator: matrixField(row, "legal_locator", schema),
    authorityUrl: matrixField(row, "authority_url", schema),
    effectiveDate: matrixField(row, "effective_date", schema),
    derivation:
      matrixField(row, "direct_derived", schema) === "DERIVED"
        ? "DERIVED"
        : "DIRECT",
    derivationChain: matrixField(row, "derivation_chain", schema) || null,
    paraphrase: matrixField(row, "paraphrase", schema),
    notes: matrixField(row, "notes", schema) || null,
  };
}

/**
 * Compile every research claim whose words were found in a retrieved authority.
 *
 * `corpusAsOf` dates the corpus. It is the date the compiled values are
 * evaluated against, and NOT_YET_OPERATIVE is defined against it.
 */
export function compileQualifications(
  input: ProductionInput<
    Record<string, { artifact: RawArtifact; bytes: Buffer }>
  >,
  corpusAsOf: string,
): QualificationCompileResult {
  const opened = (
    input as unknown as {
      artifacts: Record<string, { artifact: RawArtifact; bytes: Buffer }>;
    }
  ).artifacts;

  const provisionByKey = new Map<string, string>();
  for (const spec of QUALIFICATION_SOURCES) {
    const held = opened[spec.artifactId];
    if (!held) continue;
    for (const [key, text] of provisionTexts(
      spec,
      held.artifact,
      held.bytes,
    )) {
      provisionByKey.set(key, text);
    }
  }

  const records: QualificationRecord[] = [];
  const refusals: QualificationRefusal[] = [];
  const matrixInputs: { artifactId: string; sha256: string }[] = [];
  let rowsConsidered = 0;

  for (const matrix of RESEARCH_MATRICES) {
    const bytes = readRepositoryFile(matrix.path);
    matrixInputs.push({
      artifactId: matrix.matrixId,
      sha256: sha256Hex(bytes),
    });
    const table = parseQualificationMatrix(bytes);

    for (const row of table.rows) {
      rowsConsidered += 1;
      const stateUsps = matrixField(row, "state", table.schema).toUpperCase();
      const officeRaw = matrixField(
        row,
        "office_family",
        table.schema,
      ).toUpperCase();
      const fieldRaw = matrixField(row, "fact_field", table.schema);
      const status = matrixField(row, "status", table.schema);
      const value = matrixField(row, "value", table.schema);
      const authority = authorityFrom(row, table.schema);

      const refuse = (
        kind: QualificationRefusalKind,
        reason: string,
      ): void => {
        refusals.push({
          batch: matrix.batch,
          stateUsps,
          officeFamily: officeRaw,
          field: fieldRaw,
          status,
          citedLocator: authority.legalLocator,
          citedUrl: authority.authorityUrl,
          kind,
          reason,
        });
      };

      const officeFamily = OFFICE_FAMILY_BY_MATRIX_NAME[officeRaw];
      if (!officeFamily) {
        refuse(
          "office-family-not-modelled",
          `"${officeRaw}" is not an office family this domain models.`,
        );
        continue;
      }
      const field = FIELD_BY_MATRIX_NAME[fieldRaw];
      if (!field) {
        refuse(
          "field-not-modelled",
          `"${fieldRaw}" is not a qualification field this domain models.`,
        );
        continue;
      }

      const transcription: ReviewedTranscription | undefined =
        QUALIFICATION_TRANSCRIPTIONS.find(
          (entry) =>
            entry.batch === matrix.batch &&
            entry.stateUsps === stateUsps &&
            entry.officeFamily === officeFamily &&
            entry.field === field,
        );
      if (!transcription) {
        const finding = unsupportedFindingFor(
          matrix.batch,
          stateUsps,
          officeFamily,
          field,
        );
        if (finding) {
          /*
           * A negative finding is checked before it is published.
           *
           * "This provision does not say X" is a claim about the bytes, and it
           * is checked against them: if the word turns up after all, the
           * finding is wrong and the compile fails rather than shipping a
           * confident falsehood about a state's constitution.
           */
          const examined = provisionByKey.get(
            `${finding.artifactId}::${finding.locator}`,
          );
          if (examined === undefined) {
            throw new Error(
              `An unsupported-claim finding names provision "${finding.locator}" of "${finding.artifactId}", which was not opened for production.`,
            );
          }
          if (
            finding.absentTerm !== undefined &&
            examined.toLowerCase().includes(finding.absentTerm.toLowerCase())
          ) {
            throw new Error(
              `The finding for ${stateUsps} ${officeFamily} ${field} says "${finding.absentTerm}" is absent from ${finding.locator}, but it is present. The finding is wrong.`,
            );
          }
          refuse("authority-read-claim-unsupported", finding.finding);
          continue;
        }
        refuse(
          "no-transcription",
          `No reviewed transcription checks this claim against a retrieved authority. The research cites ${authority.authorityUrl || "no URL"}; this domain has not read it.`,
        );
        continue;
      }

      const spec = qualificationSource(transcription.artifactId);
      if (!spec) {
        refuse(
          "authority-not-retrieved",
          `The transcription names artifact "${transcription.artifactId}", which this domain does not declare.`,
        );
        continue;
      }
      if (spec.jurisdictionKey !== `US-${stateUsps}`) {
        refuse(
          "authority-not-retrieved",
          `The claim is about ${stateUsps} but "${transcription.artifactId}" publishes the law of ${spec.jurisdictionKey}.`,
        );
        continue;
      }
      if (!locatorNames(authority.legalLocator, transcription.locator)) {
        refuse(
          "citation-does-not-name-provision",
          `The research cites "${authority.legalLocator}"; the provision read is "${transcription.locator}". A citation is not repaired here.`,
        );
        continue;
      }
      const provisionText = provisionByKey.get(
        `${transcription.artifactId}::${transcription.locator}`,
      );
      if (provisionText === undefined) {
        refuse(
          "authority-not-retrieved",
          `Provision "${transcription.locator}" of "${transcription.artifactId}" was not opened for production.`,
        );
        continue;
      }
      if (!provisionText.includes(transcription.excerpt)) {
        refuse(
          "excerpt-absent-from-provision",
          `The transcribed words are not in the enacted text of "${transcription.locator}".`,
        );
        continue;
      }

      const evidence: Evidence = {
        artifactId: transcription.artifactId,
        locator: {
          kind: "legal-section",
          artifactId: transcription.artifactId,
          citation: transcription.locator,
          pageOrSection: transcription.excerpt,
        },
      };

      if (field === "OFFICE_EXISTENCE") {
        const dated = /^\d{4}-\d{2}-\d{2}$/.test(authority.effectiveDate);
        const exists: Sourced<boolean> = !dated
          ? unknown(
              `The research recorded office existence as "${status}" but supplied no effective date.`,
              [evidence],
            )
          : status === "OFFICE_DOES_NOT_EXIST"
            ? known(false, [evidence], "FINAL", authority.effectiveDate)
            : status === "CREATED_NOT_YET_OPERATIVE" ||
                status === "NOT_YET_OPERATIVE"
              ? notYetOperative(
                  true,
                  [evidence],
                  authority.effectiveDate,
                  corpusAsOf,
                )
              : status === "KNOWN"
                ? known(
                    value !== "false",
                    [evidence],
                    "FINAL",
                    authority.effectiveDate,
                  )
                : unknown(
                    `The research recorded office existence as "${status}".`,
                    [evidence],
                  );
        records.push({
          recordId: `${stateUsps}:${officeFamily}:EXISTENCE`,
          stateUsps,
          officeFamily,
          exists,
          dutiesPerformedBy: null,
          citedAuthority: authority,
          evidence,
        } satisfies OfficeExistence);
        continue;
      }

      records.push({
        recordId: `${stateUsps}:${officeFamily}:${field}`,
        stateUsps,
        officeFamily,
        field,
        requirement: readRequirement(
          status,
          value,
          evidence,
          authority,
          corpusAsOf,
        ),
        citedAuthority: authority,
        normalizationReviewRequired:
          matrixField(row, "review_required", table.schema) === "true",
        evidence,
      } satisfies QualificationClaim);
    }
  }

  records.sort((left, right) =>
    left.recordId < right.recordId ? -1 : left.recordId > right.recordId ? 1 : 0,
  );

  const sourcedStates = [
    ...new Set(records.map((record) => record.stateUsps)),
  ].sort();

  return {
    rowsConsidered,
    refusals,
    corpus: {
      records,
      corpus: {
        corpusId: "state-office-qualifications",
        compiler: { name: "state-office-qualifications", version: "2.0.0" },
        parser: { name: "qualification-matrix-tsv", version: "2.0.0" },
        inputs: [
          ...matrixInputs,
          ...QUALIFICATION_SOURCES.map((spec) => ({
            artifactId: spec.artifactId,
            sha256: opened[spec.artifactId]
              ? sha256Hex(opened[spec.artifactId]!.bytes)
              : spec.enacted.sha256,
          })),
        ],
        asOf: corpusAsOf,
        recordCount: records.length,
        canonicalSha256: corpusCanonicalDigest(records),
        inputClass: "production",
        coverage: {
          isCompleteUniverse: false,
          universeDescription: `Office qualifications for ${sourcedStates.join(", ")}, compiled only where a research claim's words were found in an authority this repository retrieved and hashed.`,
          boundedSampleReason:
            "A bounded set of states, not a national corpus. The other forty-odd states are absent because their authorities were not retrieved in this pass, which is a fact about this repository and never a fact about those states. docs/research/qualification-source-ledger.md accounts for every research row.",
        },
      },
    },
  };
}
