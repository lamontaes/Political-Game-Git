/**
 * State-office qualifications.
 *
 * What the law requires of a person before they may hold a particular state
 * office: an age, a period of residence, citizenship, elector status, a bar
 * admission, a term length, a term limit. These are the facts PR #72 fabricated
 * — 1,819 citations to one non-existent URL, a five-year residency invented for
 * every governor in the country — and they are the facts the 31A–31E research
 * wave rebuilt from first-party state authorities.
 *
 * Two shapes are needed, and keeping them apart is the point.
 *
 * A `QualificationClaim` is a fact about a *field* of an office that exists.
 * An `OfficeExistence` record is a fact about whether the *entity* exists at
 * all — Alaska and Hawaii have no Secretary of State, Maine and Oregon have no
 * Lieutenant Governor, Arizona's Lieutenant Governor exists on paper and is not
 * operative until January 2027. Nonexistence is not a value a field can hold;
 * modelling it as one would let a record claim an office's minimum age while
 * its neighbour claims the office does not exist.
 */

import type { Evidence, Sourced } from "../../core/index";

/** The office families the research wave covered in every state. */
export type OfficeFamily =
  | "GOVERNOR"
  | "LIEUTENANT_GOVERNOR"
  | "ATTORNEY_GENERAL"
  | "SECRETARY_OF_STATE"
  | "UPPER_CHAMBER"
  | "LOWER_CHAMBER"
  | "UNICAMERAL_CHAMBER";

/** The qualification fields a claim can be about. */
export type QualificationField =
  | "MINIMUM_AGE"
  | "US_CITIZENSHIP"
  | "STATE_RESIDENCE"
  | "DISTRICT_RESIDENCE"
  | "ELECTOR_REQUIREMENT"
  | "TERM_LENGTH"
  | "TERM_LIMIT"
  | "PROFESSIONAL_QUALIFICATION"
  | "SELECTION_MECHANISM";

/**
 * How an office is filled.
 *
 * Carried as the research recorded it, because "elected" is not a safe default:
 * several attorneys general and secretaries of state are appointed, and Maine
 * elects two of its officers by joint ballot of the legislature.
 */
export type SelectionMechanism =
  | "ELECTED_GENERAL"
  | "ELECTED_JOINT_TICKET"
  | "ELECTED_LEGISLATURE"
  | "APPOINTED_GOVERNOR"
  | "APPOINTED_GOVERNOR_CONFIRMED_SENATE"
  | "APPOINTED_GOVERNOR_CONFIRMED_LEGISLATURE";

/**
 * The legal authority a claim rests on, as the research recorded it.
 *
 * This travels beside the `Sourced` evidence rather than inside it. The
 * evidence says which artifact this substrate read; the citation says which
 * provision that artifact reports. Collapsing the two would let a corpus claim
 * to have read a state constitution it never retrieved.
 */
export interface CitedAuthority {
  /** "State Constitution", "Enacted Statute", "Court Ruling", verbatim. */
  readonly authorityType: string;
  /** The article, section or statute number, verbatim. */
  readonly legalLocator: string;
  /** The publisher's URL for the authority, as the research recorded it. */
  readonly authorityUrl: string;
  /** When the provision took effect, as the research recorded it. */
  readonly effectiveDate: string;
  /** `DIRECT` where the text states it; `DERIVED` where a chain was walked. */
  readonly derivation: "DIRECT" | "DERIVED";
  /** The derivation chain, where one was walked. */
  readonly derivationChain: string | null;
  /** The batch's own paraphrase of the provision. */
  readonly paraphrase: string;
}

export interface QualificationClaim {
  readonly recordId: string;
  readonly stateUsps: string;
  readonly officeFamily: OfficeFamily;
  readonly field: QualificationField;
  /** The requirement, in whichever state the research left it. */
  readonly requirement: Sourced<string | number>;
  readonly citedAuthority: CitedAuthority;
  /** True where the research flagged the claim for normalization review. */
  readonly normalizationReviewRequired: boolean;
  readonly evidence: Evidence;
}

/**
 * Whether an office exists in a state, and since or until when.
 *
 * `exists` is `Sourced` so that Arizona's Lieutenant Governor can be
 * NOT_YET_OPERATIVE with an operative-from date, and an abolished office can be
 * HISTORICAL over a closed interval, without either being confused for an
 * office that simply is.
 */
export interface OfficeExistence {
  readonly recordId: string;
  readonly stateUsps: string;
  readonly officeFamily: OfficeFamily;
  readonly exists: Sourced<boolean>;
  /** Where an office's duties are performed by another officer, which one. */
  readonly dutiesPerformedBy: OfficeFamily | null;
  readonly citedAuthority: CitedAuthority;
  readonly evidence: Evidence;
}

export type QualificationRecord = QualificationClaim | OfficeExistence;

/** True for an existence record rather than a field claim. */
export function isOfficeExistence(
  record: QualificationRecord,
): record is OfficeExistence {
  return "exists" in record;
}
