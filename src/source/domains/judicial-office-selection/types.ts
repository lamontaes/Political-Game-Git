/**
 * How a judicial office is constituted and filled — the smallest structural
 * model that keeps five different state answers to that question distinct.
 *
 * A record establishes what a jurisdiction's law makes of one judicial office:
 * which court it sits on, how a judge first reaches it, how (if at all) they
 * keep it, how long they hold it, and what the law requires of them to hold it.
 * It establishes nothing about how that judge rules, whether they are "good",
 * whether they lean one way or another, or how a case would come out. Those are
 * not facts a source substrate can hold, and this one deliberately has no field
 * that could carry them.
 *
 * The point of the model is composition, not a universal election engine.
 * Selection is an ordered pipeline of atomic mechanisms — a nomination, a
 * confirmation, a shortlist, an appointment, an election of one kind or another
 * — so that "federal appointment", "Texas partisan election", "Missouri merit
 * selection with retention", "Virginia legislative election", and "Kentucky
 * nonpartisan election with a merit-shortlist interim" are five different
 * sequences over the same small vocabulary, never five bespoke systems and
 * never one flattened "judicial election" default.
 */

import type { Evidence, Sourced } from "../../core/index";

/** Where a court sits in its jurisdiction's hierarchy, as the law names it. */
export type CourtLevel =
  | "COURT_OF_LAST_RESORT"
  | "INTERMEDIATE_APPELLATE"
  | "GENERAL_JURISDICTION_TRIAL"
  | "LIMITED_JURISDICTION_TRIAL";

/**
 * One atomic step by which a person reaches or keeps a judicial office.
 *
 * These are the building blocks the task enumerates. A jurisdiction's real
 * procedure is an ordered sequence of them; no single one is "the" way judges
 * are chosen, and there is deliberately no catch-all "ELECTED" that would let a
 * partisan election and a retention election read as the same fact.
 */
export type SelectionMechanism =
  | "EXECUTIVE_APPOINTMENT"
  | "EXECUTIVE_NOMINATION"
  | "LEGISLATIVE_CONFIRMATION"
  | "LEGISLATIVE_ELECTION"
  | "MERIT_COMMISSION_SHORTLIST"
  | "PARTISAN_ELECTION"
  | "NONPARTISAN_ELECTION"
  | "RETENTION_ELECTION";

/** One stage of a selection or vacancy pipeline: a mechanism and who performs it. */
export interface SelectionStage {
  /** 1-based position of the stage within its pipeline, in performed order. */
  readonly order: number;
  readonly mechanism: SelectionMechanism;
  /**
   * The body or officer the law charges with this stage — "President", "United
   * States Senate", "Governor", "General Assembly", "Judicial Nominating
   * Commission" — or null where the source does not resolve it. It is a
   * structural fact about procedure, never a claim about any person.
   */
  readonly actor: string | null;
}

/** The character of the hold, once a judge is in office. */
export type TenureKind =
  | "GOOD_BEHAVIOR" // life / good-behavior tenure; no fixed term
  | "FIXED_TERM";

/**
 * How, if at all, a judge's hold is renewed.
 *
 * NONE is the good-behavior answer — the hold is not renewed because it does
 * not lapse. The election variants are kept apart because a retention election
 * (a yes/no vote on the sitting judge) is a different institution from a
 * contested reelection, and both are different again from a legislature voting a
 * judge another term.
 */
export type RetentionMethod =
  | "RETENTION_ELECTION"
  | "REELECTION_PARTISAN"
  | "REELECTION_NONPARTISAN"
  | "LEGISLATIVE_REELECTION"
  | "GUBERNATORIAL_REAPPOINTMENT"
  | "NONE";

/**
 * Whether the source's bytes were actually retrieved, and whether the fact was
 * verified against them.
 *
 * A fixture that names a real jurisdiction must still say, in the data, that
 * this repository did not go and get the constitution it cites. That is the
 * whole of the 92G source-honesty posture: the research is a secondary
 * synthesis, so nothing here is retrieved or verified, and the validator holds
 * a fixture to exactly that.
 */
export type RetrievalStatus = "RETRIEVED" | "NOT_RETRIEVED";
export type VerificationStatus = "VERIFIED" | "UNVERIFIED";

/**
 * The institutional source a record rests on.
 *
 * This travels beside the `Sourced` evidence rather than inside it: the evidence
 * says which artifact this substrate read (here, the fixture); the authority
 * says which provision that source reports, and how far the report has actually
 * been stood behind. `unresolvedFields` names the record fields the source left
 * open, so an absence is a stated fact rather than a silent gap.
 */
export interface JudicialCitedAuthority {
  /** "Federal Constitution", "State Constitution", "Enacted Statute", verbatim. */
  readonly authorityType: string;
  /** The human-readable source title, e.g. "Constitution of Kentucky". */
  readonly exactSource: string;
  /** The article, section or statute number, verbatim. */
  readonly legalLocator: string;
  /** The publisher's URL for the authority, as the source recorded it. */
  readonly authorityUrl: string;
  /** The date the source is stated as-of / referenced to. Not an effective-date claim. */
  readonly referenceDate: string;
  readonly retrieval: RetrievalStatus;
  readonly verification: VerificationStatus;
  /** Names of record fields the source explicitly left unresolved. */
  readonly unresolvedFields: readonly string[];
}

/**
 * One judicial office in one jurisdiction, and how it is constituted and filled.
 *
 * The structural fields — level, selection, retention, tenure kind, interim
 * vacancy filling — are the discriminating facts and are always present. The
 * qualification fields are `Sourced`, so a requirement nobody resolved stays
 * UNKNOWN with no value to read, and a constitution read and found silent is
 * NO_REQUIREMENT_FOUND rather than a fabricated zero.
 */
export interface JudicialOfficeRecord {
  /** `<jurisdictionId>:<courtSlug>`, stable and sortable. */
  readonly recordId: string;
  /** "us-federal", or "us-ky"/"us-tx"/"us-mo"/"us-va" for the states. */
  readonly jurisdictionId: string;
  readonly courtLevel: CourtLevel;
  /** The office title / family, as the jurisdiction names it. */
  readonly officeTitleFamily: string;
  /**
   * A key by which this office's court could join another corpus (for example
   * the federal-courts substrate's `courtId`), or null where no such 1:1 join
   * is supported. Never inferred from a name — supplied only where it holds.
   */
  readonly courtSourceJoinKey: string | null;

  /** How a judge first reaches the office, as an ordered pipeline. */
  readonly initialSelection: readonly SelectionStage[];
  /** How an interim / vacancy seat is filled, as an ordered pipeline. */
  readonly interimVacancyFilling: readonly SelectionStage[];

  readonly tenureKind: TenureKind;
  readonly retentionMethod: RetentionMethod;
  /** Term length in years for a fixed term; NOT_APPLICABLE under good-behavior tenure. */
  readonly termLengthYears: Sourced<number>;
  /** Only where the source states one; UNKNOWN / NO_REQUIREMENT_FOUND otherwise. */
  readonly mandatoryRetirementAge: Sourced<number>;

  readonly professionalQualification: Sourced<string>;
  readonly minimumAge: Sourced<number>;
  readonly residencyRequirement: Sourced<string>;
  readonly barMembershipRequirement: Sourced<string>;

  readonly citedAuthority: JudicialCitedAuthority;
  readonly evidence: Evidence;
}

/** The concepts this domain refuses to model. Named so the refusal is testable. */
export const FORBIDDEN_CONCEPTS: readonly string[] = [
  "ideology",
  "predicted-ruling-behavior",
  "quality",
  "political-suitability",
  "liberal-conservative",
];
