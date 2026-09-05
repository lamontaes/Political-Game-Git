/**
 * Matrix rows into judicial-office records.
 *
 * Two disciplines are kept throughout. Nothing is promoted: a scalar the source
 * left open becomes an UNKNOWN with no value, and a provision read and found
 * silent becomes NO_REQUIREMENT_FOUND, never a zero or an empty string. And
 * nothing is retrieved: a fixture's authority is carried with its retrieval and
 * verification exactly as authored, so a row that names a real constitution
 * still says, in the data, that this repository did not go and get it.
 *
 * Selection is decomposed, not flattened. Each pipeline is an ordered list of
 * atomic mechanisms with the body that performs each one; the normalizer refuses
 * a mechanism it does not know rather than coercing it toward a nearest match.
 */

import {
  SourceValidationError,
  known,
  noRequirementFound,
  notApplicable,
  unknown,
} from "../../core/index";
import type { Evidence, ParseDefect, Sourced } from "../../core/index";
import { matrixField } from "./parse";
import type { DelimitedRow } from "../../core/index";
import type {
  CourtLevel,
  JudicialCitedAuthority,
  JudicialOfficeRecord,
  RetentionMethod,
  RetrievalStatus,
  SelectionMechanism,
  SelectionStage,
  TenureKind,
  VerificationStatus,
} from "./types";

const COURT_LEVELS: readonly CourtLevel[] = [
  "COURT_OF_LAST_RESORT",
  "INTERMEDIATE_APPELLATE",
  "GENERAL_JURISDICTION_TRIAL",
  "LIMITED_JURISDICTION_TRIAL",
];

const TENURE_KINDS: readonly TenureKind[] = ["GOOD_BEHAVIOR", "FIXED_TERM"];

const RETENTION_METHODS: readonly RetentionMethod[] = [
  "RETENTION_ELECTION",
  "REELECTION_PARTISAN",
  "REELECTION_NONPARTISAN",
  "LEGISLATIVE_REELECTION",
  "GUBERNATORIAL_REAPPOINTMENT",
  "NONE",
];

const SELECTION_MECHANISMS: readonly SelectionMechanism[] = [
  "EXECUTIVE_APPOINTMENT",
  "EXECUTIVE_NOMINATION",
  "LEGISLATIVE_CONFIRMATION",
  "LEGISLATIVE_ELECTION",
  "MERIT_COMMISSION_SHORTLIST",
  "PARTISAN_ELECTION",
  "NONPARTISAN_ELECTION",
  "RETENTION_ELECTION",
];

export interface JudicialNormalizeResult {
  readonly records: readonly JudicialOfficeRecord[];
  readonly defects: readonly ParseDefect[];
}

/** A stable, join-safe slug for an office title. */
export function courtSlug(officeTitle: string): string {
  return officeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse an ordered selection pipeline.
 *
 * Format is `MECHANISM@Actor>MECHANISM@Actor`, `>` between stages and `@` before
 * the performing body. An empty pipeline is returned as an empty list; the
 * caller decides whether that is allowed (it is, for an interim mechanism the
 * source did not resolve; it is not, for how an office is first filled).
 */
export function parseSelectionPipeline(raw: string): {
  readonly stages: readonly SelectionStage[];
  readonly unknownMechanisms: readonly string[];
} {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "UNKNOWN" || trimmed === "NONE") {
    return { stages: [], unknownMechanisms: [] };
  }
  const stages: SelectionStage[] = [];
  const unknownMechanisms: string[] = [];
  const parts = trimmed.split(">");
  for (const [index, part] of parts.entries()) {
    const atIndex = part.indexOf("@");
    const mechanismText = (
      atIndex === -1 ? part : part.slice(0, atIndex)
    ).trim();
    const actorText = atIndex === -1 ? "" : part.slice(atIndex + 1).trim();
    const mechanism = SELECTION_MECHANISMS.find((m) => m === mechanismText);
    if (!mechanism) {
      unknownMechanisms.push(mechanismText);
      continue;
    }
    stages.push({
      order: index + 1,
      mechanism,
      actor: actorText === "" ? null : actorText,
    });
  }
  return { stages, unknownMechanisms };
}

/**
 * Read one scalar cell into a sourced value.
 *
 * Tokens: `UNKNOWN`, `NO_REQUIREMENT_FOUND`, `NOT_APPLICABLE`, or
 * `KNOWN:<value>@<YYYY-MM-DD>`. Only KNOWN carries a value, and only KNOWN needs
 * a date — a requirement that took effect on some day cannot be present truth
 * without one, and dating it from the compile would invent the fact that
 * matters most.
 */
export function readScalar<T extends string | number>(
  token: string,
  evidence: Evidence,
  authority: JudicialCitedAuthority,
  coerce: (raw: string) => T,
): { readonly value: Sourced<T>; readonly bad: string | null } {
  const trimmed = token.trim();
  if (trimmed === "" || trimmed === "UNKNOWN") {
    return {
      value: unknown(
        "The source did not resolve this requirement for this office.",
        [evidence],
      ),
      bad: null,
    };
  }
  if (trimmed === "NO_REQUIREMENT_FOUND") {
    return {
      value: noRequirementFound(
        [evidence],
        `${authority.exactSource} ${authority.legalLocator}, read and stating no such requirement for this office.`,
      ),
      bad: null,
    };
  }
  if (trimmed === "NOT_APPLICABLE") {
    return {
      value: notApplicable(
        [evidence],
        `The field is meaningless for this office, per ${authority.legalLocator}.`,
      ),
      bad: null,
    };
  }
  const match = /^KNOWN:(.+)@(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
  if (match) {
    return {
      value: known(
        coerce(match[1] as string),
        [evidence],
        "FINAL",
        match[2] as string,
      ),
      bad: null,
    };
  }
  return {
    value: unknown(
      `The source cell "${trimmed}" is not a recognized value token.`,
      [evidence],
    ),
    bad: trimmed,
  };
}

const NUMBER = (raw: string): number => {
  const n = Number(raw.trim());
  if (Number.isNaN(n)) {
    throw new SourceValidationError(`"${raw}" is not a number.`);
  }
  return n;
};
const STRING = (raw: string): string => raw.trim();

function authorityFrom(row: DelimitedRow): {
  readonly authority: JudicialCitedAuthority;
  readonly badRetrieval: string | null;
  readonly badVerification: string | null;
} {
  const retrievalRaw = matrixField(row, "retrieval").trim();
  const verificationRaw = matrixField(row, "verification").trim();
  const retrieval: RetrievalStatus =
    retrievalRaw === "RETRIEVED" ? "RETRIEVED" : "NOT_RETRIEVED";
  const verification: VerificationStatus =
    verificationRaw === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
  const unresolvedRaw = matrixField(row, "unresolved_fields");
  return {
    authority: {
      authorityType: matrixField(row, "authority_type"),
      exactSource: matrixField(row, "exact_source"),
      legalLocator: matrixField(row, "legal_locator"),
      authorityUrl: matrixField(row, "authority_url"),
      referenceDate: matrixField(row, "reference_date"),
      retrieval,
      verification,
      // A comma-separated in-cell list, read without splitting on the
      // delimiter: the domain reads delimited *rows* through the core parser,
      // and matches the non-comma runs here rather than reintroducing a split.
      unresolvedFields: (unresolvedRaw.match(/[^,]+/g) ?? [])
        .map((field) => field.trim())
        .filter((field) => field !== ""),
    },
    badRetrieval:
      retrievalRaw === "RETRIEVED" || retrievalRaw === "NOT_RETRIEVED"
        ? null
        : retrievalRaw,
    badVerification:
      verificationRaw === "VERIFIED" || verificationRaw === "UNVERIFIED"
        ? null
        : verificationRaw,
  };
}

export function normalizeJudicialOffices(
  rows: readonly DelimitedRow[],
  artifactId: string,
): JudicialNormalizeResult {
  const records: JudicialOfficeRecord[] = [];
  const defects: ParseDefect[] = [];

  const fail = (line: number, message: string): void => {
    defects.push({ kind: "unparsable-record", line, message });
  };

  for (const row of rows) {
    const jurisdictionId = matrixField(row, "jurisdiction").trim();
    const officeTitle = matrixField(row, "office_title").trim();
    if (!/^us-[a-z-]+$/.test(jurisdictionId)) {
      fail(
        row.line,
        `Line ${row.line}: "${jurisdictionId}" is not a jurisdiction id (expected "us-federal" or "us-<state>").`,
      );
      continue;
    }
    if (officeTitle === "") {
      fail(
        row.line,
        `Line ${row.line}: an office row carries no office title.`,
      );
      continue;
    }

    const courtLevel = COURT_LEVELS.find(
      (level) => level === matrixField(row, "court_level").trim(),
    );
    if (!courtLevel) {
      fail(
        row.line,
        `Line ${row.line}: "${matrixField(row, "court_level")}" is not a court level.`,
      );
      continue;
    }
    const tenureKind = TENURE_KINDS.find(
      (kind) => kind === matrixField(row, "tenure_kind").trim(),
    );
    if (!tenureKind) {
      fail(
        row.line,
        `Line ${row.line}: "${matrixField(row, "tenure_kind")}" is not a tenure kind.`,
      );
      continue;
    }
    const retentionMethod = RETENTION_METHODS.find(
      (method) => method === matrixField(row, "retention_method").trim(),
    );
    if (!retentionMethod) {
      fail(
        row.line,
        `Line ${row.line}: "${matrixField(row, "retention_method")}" is not a retention method.`,
      );
      continue;
    }

    const initial = parseSelectionPipeline(
      matrixField(row, "initial_selection"),
    );
    if (initial.unknownMechanisms.length > 0) {
      fail(
        row.line,
        `Line ${row.line}: unknown selection mechanism(s) ${initial.unknownMechanisms.join(", ")}.`,
      );
      continue;
    }
    if (initial.stages.length === 0) {
      fail(
        row.line,
        `Line ${row.line}: an office must state how it is first filled; the initial-selection pipeline is empty.`,
      );
      continue;
    }
    const interim = parseSelectionPipeline(matrixField(row, "interim_vacancy"));
    if (interim.unknownMechanisms.length > 0) {
      fail(
        row.line,
        `Line ${row.line}: unknown interim selection mechanism(s) ${interim.unknownMechanisms.join(", ")}.`,
      );
      continue;
    }

    const { authority, badRetrieval, badVerification } = authorityFrom(row);
    if (badRetrieval) {
      fail(
        row.line,
        `Line ${row.line}: retrieval "${badRetrieval}" is neither RETRIEVED nor NOT_RETRIEVED.`,
      );
      continue;
    }
    if (badVerification) {
      fail(
        row.line,
        `Line ${row.line}: verification "${badVerification}" is neither VERIFIED nor UNVERIFIED.`,
      );
      continue;
    }

    const slug = courtSlug(officeTitle);
    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "legal-section",
        artifactId,
        citation: authority.legalLocator,
        pageOrSection: `${jurisdictionId}/${slug}`,
      },
    };

    const term = readScalar(
      matrixField(row, "term_length"),
      evidence,
      authority,
      NUMBER,
    );
    const retire = readScalar(
      matrixField(row, "mandatory_retirement"),
      evidence,
      authority,
      NUMBER,
    );
    const professional = readScalar(
      matrixField(row, "professional_qualification"),
      evidence,
      authority,
      STRING,
    );
    const minAge = readScalar(
      matrixField(row, "minimum_age"),
      evidence,
      authority,
      NUMBER,
    );
    const residency = readScalar(
      matrixField(row, "residency"),
      evidence,
      authority,
      STRING,
    );
    const bar = readScalar(
      matrixField(row, "bar_requirement"),
      evidence,
      authority,
      STRING,
    );
    const badTokens = [term, retire, professional, minAge, residency, bar]
      .map((r) => r.bad)
      .filter((b): b is string => b !== null);
    if (badTokens.length > 0) {
      fail(
        row.line,
        `Line ${row.line}: unrecognized value token(s) ${badTokens.join(", ")}.`,
      );
      continue;
    }

    const joinKeyRaw = matrixField(row, "court_join_key").trim();
    records.push({
      recordId: `${jurisdictionId}:${slug}`,
      jurisdictionId,
      courtLevel,
      officeTitleFamily: officeTitle,
      courtSourceJoinKey:
        joinKeyRaw === "" || joinKeyRaw === "NONE" ? null : joinKeyRaw,
      initialSelection: initial.stages,
      interimVacancyFilling: interim.stages,
      tenureKind,
      retentionMethod,
      termLengthYears: term.value,
      mandatoryRetirementAge: retire.value,
      professionalQualification: professional.value,
      minimumAge: minAge.value,
      residencyRequirement: residency.value,
      barMembershipRequirement: bar.value,
      citedAuthority: authority,
      evidence,
    });
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      throw new SourceValidationError(
        `The judicial-office matrix yields "${record.recordId}" twice; one jurisdiction cannot carry one office twice.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}
