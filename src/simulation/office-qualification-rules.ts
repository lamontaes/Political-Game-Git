/**
 * What the law requires of a candidate here, and whether this character meets
 * it.
 *
 * The game has had a candidacy offer for as long as it has had accepted
 * legislative rule packs, and every qualification on it has been `unknown`,
 * with one honest sentence standing in for all of them: no accepted source says
 * who may stand, so the game applies its own adult rule and admits that it is
 * the game's. That sentence is still correct for most of the country and is
 * still what a character in most states is told.
 *
 * For the five states whose constitutions and statutes this repository has now
 * retrieved, hashed and read, it is no longer correct, and this module is where
 * that difference lands. A Nebraskan is turned away from the Legislature at
 * twenty because Neb. Const. art. III, § 8 says twenty-one, not because the
 * game prefers twenty-one, and the sentence they read names the provision.
 *
 * Three distinctions are load-bearing and none of them collapses here.
 *
 * A rule the game has not read is not a rule that does not exist. Kentucky is
 * absent from the corpus because this repository has not retrieved Kentucky's
 * constitution, which is a fact about the repository; a Kentuckian is told the
 * game has not read the rule, and the game's own adult floor still applies.
 *
 * A rule the game has read is not a rule the game can apply. Nevada requires an
 * Attorney General to be a member of the State Bar, and the world models no bar
 * admission, so the requirement is reported with its citation and explicitly
 * not evaluated. Reporting it as satisfied would be an invented eligibility,
 * and reporting it as failed would be an invented disqualification.
 *
 * A rule that says "there is none" is a rule. NO_REQUIREMENT_FOUND means an
 * authority was read and imposes nothing, and that must never be read as
 * UNKNOWN — the difference is the difference between a governor with no term
 * limit and a governor whose term limit nobody has looked up.
 *
 * This module is pure and reads only the generated seam. It decides nothing
 * about municipal offices, which belong to their own owner, and it mutates
 * nothing.
 */

import { ageOnDate } from "./dates";
import {
  OFFICE_QUALIFICATIONS_META,
  OFFICE_QUALIFICATION_ROWS,
} from "./office-qualifications.generated";
import { knownRule, notApplicableRule, unknownRule } from "./legislature-rules";
import type { RuleSourceRef, RuleValue } from "./legislature-rules";
import type { IsoDate, Person } from "./types";

/** The office families the qualification corpus covers. */
export type QualificationOfficeFamily =
  | "GOVERNOR"
  | "LIEUTENANT_GOVERNOR"
  | "ATTORNEY_GENERAL"
  | "SECRETARY_OF_STATE"
  | "UPPER_CHAMBER"
  | "LOWER_CHAMBER"
  | "UNICAMERAL_CHAMBER";

/** The source layer's epistemic states, carried across the seam unflattened. */
export type QualificationSourceState =
  | "KNOWN"
  | "HISTORICAL"
  | "NOT_YET_OPERATIVE"
  | "CONFLICTING"
  | "NOT_APPLICABLE"
  | "NO_REQUIREMENT_FOUND"
  | "SUPPRESSED"
  | "UNKNOWN";

export type QualificationFieldName =
  | "OFFICE_EXISTENCE"
  | "MINIMUM_AGE"
  | "US_CITIZENSHIP"
  | "STATE_RESIDENCE"
  | "DISTRICT_RESIDENCE"
  | "ELECTOR_REQUIREMENT"
  | "TERM_LENGTH"
  | "TERM_LIMIT"
  | "PROFESSIONAL_QUALIFICATION"
  | "SELECTION_MECHANISM";

export interface SourcedQualification {
  readonly stateUsps: string;
  readonly officeFamily: QualificationOfficeFamily;
  readonly field: QualificationFieldName;
  readonly sourceState: QualificationSourceState;
  /** Present only where the source layer carries one. Never a fallback. */
  readonly value: string | number | null;
  readonly citation: string;
  readonly authorityType: string;
  /** Exact research-transport cell; retained for audit, not applied as law. */
  readonly researchReportedEffectiveDate: string;
  readonly provisionValidity:
    | {
        readonly state: "EXACT_INTERVAL";
        readonly validFrom: string;
        readonly validThrough: string | null;
        readonly basisArtifactId: string;
        readonly basisLocator: string;
        readonly basisExcerpt: string;
        readonly amendmentAnnotations: readonly string[];
      }
    | {
        readonly state: "CURRENT_OBSERVATION";
        readonly observedOn: string;
        readonly reason: string;
        readonly amendmentAnnotations: readonly string[];
      }
    | {
        readonly state: "UNKNOWN";
        readonly reason: string;
        readonly amendmentAnnotations: readonly string[];
      };
  readonly sourceRetrievedAt: string | null;
  readonly sourceStatedVintage: string | null;
  readonly authorityUrl: string;
  readonly researchBatch: string | null;
  readonly researchArtifactId: string | null;
  readonly researchArtifactSha256: string | null;
  readonly derivation: string;
  readonly derivationChain: string | null;
  readonly notes: string | null;
}

const ROWS: readonly SourcedQualification[] = JSON.parse(
  OFFICE_QUALIFICATION_ROWS,
) as readonly SourcedQualification[];

export { OFFICE_QUALIFICATIONS_META };

export type QualificationTemporalApplicability =
  | { readonly state: "SUPPORTED" }
  | { readonly state: "UNKNOWN"; readonly reason: string };

export interface DateBoundQualification extends SourcedQualification {
  readonly temporalApplicability: QualificationTemporalApplicability;
}

/** Whether the acquired evidence supports applying this row on one date. */
export function qualificationTemporalApplicability(
  row: SourcedQualification,
  onDate: string,
): QualificationTemporalApplicability {
  const validity = row.provisionValidity;
  if (validity.state === "EXACT_INTERVAL") {
    if (onDate < validity.validFrom) {
      return {
        state: "UNKNOWN",
        reason: `${row.citation} is supported from ${validity.validFrom}; its applicability on ${onDate} is not established by the acquired evidence.`,
      };
    }
    if (validity.validThrough !== null && onDate > validity.validThrough) {
      return {
        state: "UNKNOWN",
        reason: `${row.citation} is supported only through ${validity.validThrough}; its applicability on ${onDate} is not established by the acquired evidence.`,
      };
    }
    return { state: "SUPPORTED" };
  }
  if (validity.state === "CURRENT_OBSERVATION") {
    if (onDate < validity.observedOn) {
      return {
        state: "UNKNOWN",
        reason: `${row.citation} was observed in current source text on ${validity.observedOn}; that later observation does not establish the rule on ${onDate}.`,
      };
    }
    return { state: "SUPPORTED" };
  }
  return { state: "UNKNOWN", reason: validity.reason };
}

/** Every state whose authorities this repository has read, as `US-XX`. */
export const QUALIFICATION_SOURCED_STATE_KEYS: readonly string[] = [
  ...new Set(ROWS.map((row) => `US-${row.stateUsps}`)),
].sort();

/**
 * Which office family a legislative chamber is, by the pack's own chamber key.
 *
 * Declared rather than inferred from a display name. "Assembly" is Nevada's
 * lower chamber and "Legislature" is Nebraska's only one, and a rule that
 * guessed from the word would eventually meet a state that uses it differently.
 */
const OFFICE_FAMILY_BY_CHAMBER_KEY: Readonly<
  Record<string, QualificationOfficeFamily>
> = {
  house: "LOWER_CHAMBER",
  assembly: "LOWER_CHAMBER",
  senate: "UPPER_CHAMBER",
  legislature: "UNICAMERAL_CHAMBER",
};

export function officeFamilyForChamberKey(
  chamberKey: string,
): QualificationOfficeFamily | null {
  return OFFICE_FAMILY_BY_CHAMBER_KEY[chamberKey] ?? null;
}

/** True where this repository has read any authority for the state. */
export function stateQualificationsAreSourced(
  stateJurisdictionKey: string | null,
): boolean {
  if (stateJurisdictionKey === null) return false;
  return QUALIFICATION_SOURCED_STATE_KEYS.includes(stateJurisdictionKey);
}

/** Every verified fact about one office in one state. */
export function officeQualifications(
  stateJurisdictionKey: string | null,
  officeFamily: QualificationOfficeFamily,
  onDate: string,
): readonly DateBoundQualification[] {
  if (stateJurisdictionKey === null) return [];
  const usps = stateJurisdictionKey.replace(/^US-/, "");
  return ROWS.filter(
    (row) => row.stateUsps === usps && row.officeFamily === officeFamily,
  ).map((row) => ({
    ...row,
    temporalApplicability: qualificationTemporalApplicability(row, onDate),
  }));
}

/** One field, or nothing. */
export function officeQualification(
  stateJurisdictionKey: string | null,
  officeFamily: QualificationOfficeFamily,
  field: QualificationFieldName,
  onDate: string,
): DateBoundQualification | null {
  return (
    officeQualifications(stateJurisdictionKey, officeFamily, onDate).find(
      (row) => row.field === field,
    ) ?? null
  );
}

/** The citation a player-facing sentence should carry for one fact. */
export function qualificationSourceRef(
  row: SourcedQualification,
): RuleSourceRef {
  return {
    authority:
      row.authorityType.toLowerCase().includes("constitution") ||
      row.citation.toLowerCase().includes("const.")
        ? "constitution"
        : "statute",
    citation: row.citation,
    sourceTitle: row.authorityType || "Retrieved state authority",
    sourceUrl: row.authorityUrl || null,
    retrievedAt: row.sourceRetrievedAt,
    verification: "verified",
    note: null,
  };
}

/**
 * One qualification as a rule value the candidacy pack can carry.
 *
 * KNOWN becomes a known rule with its citation. NO_REQUIREMENT_FOUND becomes
 * not-applicable carrying the fact that an authority was read and imposes
 * nothing — which is a different sentence from unknown, and the pack's own
 * three-state algebra already draws that line. Everything else stays unknown,
 * because it is.
 */
export function qualificationRuleValue(
  row: DateBoundQualification | null,
  unreadNote: string,
): RuleValue<string | number> {
  if (row === null) return unknownRule(unreadNote);
  if (row.temporalApplicability.state === "UNKNOWN") {
    return unknownRule(row.temporalApplicability.reason);
  }
  if (row.sourceState === "KNOWN" && row.value !== null) {
    return knownRule(row.value, qualificationSourceRef(row));
  }
  if (row.sourceState === "NO_REQUIREMENT_FOUND") {
    return notApplicableRule(
      `${row.citation} was read and imposes no such requirement.`,
    );
  }
  if (row.sourceState === "NOT_APPLICABLE") {
    return notApplicableRule(
      `${row.citation} does not reach this office for this requirement.`,
    );
  }
  return unknownRule(
    `${row.citation} was read but left this unresolved (${row.sourceState}).`,
  );
}

// ---------------------------------------------------------------------------
// Applying the rules to a character
// ---------------------------------------------------------------------------

export type QualificationVerdict = "meets" | "fails" | "not-evaluated";

export interface QualificationAssessment {
  readonly field: QualificationFieldName;
  readonly verdict: QualificationVerdict;
  /** The sentence a player should read. Whole, plain, and citing the law. */
  readonly reason: string;
  /** The rule this came from, where one was read. */
  readonly source: SourcedQualification | null;
}

/** A minimum age stated in years, or null where the value is not one. */
function ageInYears(row: SourcedQualification): number | null {
  if (typeof row.value === "number") return row.value;
  if (typeof row.value === "string") {
    const match = /^(\d+)\s*years?$/i.exec(row.value.trim());
    if (match) return Number(match[1]);
  }
  return null;
}

/** A duration in whole years, or null. Months are not rounded into years. */
function durationYears(row: SourcedQualification): number | null {
  if (typeof row.value === "number") return row.value;
  if (typeof row.value === "string") {
    const match = /^(\d+)\s*years?$/i.exec(row.value.trim());
    if (match) return Number(match[1]);
  }
  return null;
}

export interface QualificationAssessmentInput {
  readonly person: Person;
  readonly stateJurisdictionKey: string | null;
  readonly officeFamily: QualificationOfficeFamily;
  /** Earliest active residence in this exact state, or null when unproved. */
  readonly stateResidenceSince: IsoDate | null;
  /** Earliest active residence in this exact district, or null when unproved. */
  readonly districtResidenceSince: IsoDate | null;
  readonly onDate: IsoDate;
}

/**
 * Assess every verified requirement for one office against one character.
 *
 * The order is the order a person would ask them in, and every entry carries a
 * sentence rather than a code. A requirement the world cannot check is
 * `not-evaluated` and says so; it never silently becomes `meets`.
 */
export function assessOfficeQualifications(
  input: QualificationAssessmentInput,
): readonly QualificationAssessment[] {
  const rows = officeQualifications(
    input.stateJurisdictionKey,
    input.officeFamily,
    input.onDate,
  );
  const assessments: QualificationAssessment[] = [];

  for (const row of rows) {
    if (row.field === "SELECTION_MECHANISM" || row.field === "TERM_LENGTH") {
      continue;
    }

    if (row.temporalApplicability.state === "UNKNOWN") {
      assessments.push({
        field: row.field,
        verdict: "not-evaluated",
        reason: row.temporalApplicability.reason,
        source: row,
      });
      continue;
    }

    if (row.field === "OFFICE_EXISTENCE") {
      if (row.sourceState === "KNOWN" && row.value === "false") {
        assessments.push({
          field: row.field,
          verdict: "fails",
          reason: `${row.citation} establishes no such office in this state, so there is no seat to stand for.`,
          source: row,
        });
      }
      continue;
    }

    if (row.sourceState === "NO_REQUIREMENT_FOUND") {
      assessments.push({
        field: row.field,
        verdict: "meets",
        reason: `${row.citation} imposes no such requirement here.`,
        source: row,
      });
      continue;
    }

    if (row.sourceState === "NOT_APPLICABLE") {
      assessments.push({
        field: row.field,
        verdict: "meets",
        reason: `${row.citation} does not apply this requirement to the office.`,
        source: row,
      });
      continue;
    }

    if (row.sourceState !== "KNOWN") {
      assessments.push({
        field: row.field,
        verdict: "not-evaluated",
        reason: `${row.citation} was read but leaves this unresolved.`,
        source: row,
      });
      continue;
    }

    if (row.field === "MINIMUM_AGE") {
      const required = ageInYears(row);
      if (required === null) {
        assessments.push({
          field: row.field,
          verdict: "not-evaluated",
          reason: `${row.citation} states a minimum age the game cannot read as a number.`,
          source: row,
        });
        continue;
      }
      const age = ageOnDate(input.person.birthDate, input.onDate);
      assessments.push({
        field: row.field,
        verdict: age >= required ? "meets" : "fails",
        reason:
          age >= required
            ? `Old enough: ${row.citation} sets the minimum at ${required}.`
            : `Too young to stand: ${row.citation} sets the minimum at ${required}, and this character is ${age}.`,
        source: row,
      });
      continue;
    }

    if (row.field === "STATE_RESIDENCE" || row.field === "DISTRICT_RESIDENCE") {
      const required = durationYears(row);
      const residenceSince =
        row.field === "STATE_RESIDENCE"
          ? input.stateResidenceSince
          : input.districtResidenceSince;
      const held =
        residenceSince === null
          ? null
          : ageOnDate(residenceSince, input.onDate);
      if (required === null || held === null) {
        assessments.push({
          field: row.field,
          verdict: "not-evaluated",
          reason:
            held === null
              ? `${row.citation} requires ${String(row.value)} of residence. The game has not recorded when this character came to live here, so it will not guess whether they qualify.`
              : `${row.citation} states a residence requirement the game cannot read as a number of years.`,
          source: row,
        });
        continue;
      }
      assessments.push({
        field: row.field,
        verdict: held >= required ? "meets" : "fails",
        reason:
          held >= required
            ? `Resident long enough: ${row.citation} requires ${required} year${required === 1 ? "" : "s"}.`
            : `Not resident long enough: ${row.citation} requires ${required} year${required === 1 ? "" : "s"}, and this character has lived here ${held}.`,
        source: row,
      });
      continue;
    }

    /*
     * Everything else is read and reported, and deliberately not decided.
     *
     * The world models no bar admission, no naturalisation date and no voter
     * registration, so a citizenship, elector or professional requirement has
     * nothing to test against. Saying "meets" would hand out an eligibility the
     * game never checked.
     */
    assessments.push({
      field: row.field,
      verdict: "not-evaluated",
      reason: `${row.citation} requires ${String(row.value)}. The game does not record that about a character, so it neither grants nor refuses on it.`,
      source: row,
    });
  }

  return assessments;
}
