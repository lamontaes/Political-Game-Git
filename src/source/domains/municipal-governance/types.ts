/**
 * Municipal governance: what a local government legally is, and how it is
 * structured, as opposed to what a place is called.
 *
 * The research this domain consumes (Drive 42A / 44 / 45 and the 92I
 * research-to-implementation frontier) opens with one finding: identical labels
 * such as "City Council" hide materially different institutions, and a Census
 * place is not a government. So this schema never reduces a government to a form
 * label plus a "strong/weak mayor" dial. It enumerates the actual sourced
 * powers, keeps the elected body, the elected executive and any professional
 * manager as separate actors, and models consolidation as transferred and
 * retained relationships rather than a boolean.
 *
 * Every fact is a `Sourced<T>` from the source value algebra, so a fact nobody
 * has established stays UNKNOWN — it has no value key to read a default out of —
 * and a fact that is true carries its evidence and effective date. The task's
 * own rule holds here: unknown is better than fake national uniformity.
 *
 * There is deliberately no `strongMayor`, `mayorStrength`, `mayorPower`,
 * `weakMayor`, or `localDemocracy` scalar anywhere in this file. A power is a
 * row in `enumeratedPowers`, named, assigned to an actor, and sourced.
 */

import type { Sourced } from "../../core/index";

/** An actor a power or role can belong to. Distinct members, never fused. */
export type ActorRole =
  | "MAYOR"
  | "VICE_MAYOR"
  | "COUNCIL"
  | "COMMISSION"
  | "CITY_MANAGER"
  | "COUNCIL_ADMINISTRATOR"
  | "COUNTY_OFFICE"
  | "OTHER";

/**
 * A named institutional form. Descriptive only.
 *
 * A form is a label the caller may show; it grants no power. "A government
 * title does not imply powers" (task) — powers live in `enumeratedPowers`.
 */
export type GovernmentForm =
  | "MAYOR_COUNCIL"
  | "COUNCIL_MANAGER"
  | "COMMISSION_MANAGER"
  | "COMMISSION"
  | "URBAN_COUNTY_CONSOLIDATED"
  | "METRO_CONSOLIDATED"
  | "CITY_COUNTY_CONSOLIDATED"
  | "TOWN_MEETING"
  | "OTHER";

/** How the elected body's seats are apportioned. */
export type CompositionPattern =
  | "SINGLE_MEMBER_DISTRICT"
  | "AT_LARGE"
  | "WARD"
  | "HYBRID_DISTRICT_AT_LARGE"
  | "OTHER";

/** Where the mayor/executive sits relative to the legislative body. */
export type MayorStructuralPosition =
  | "SEPARATE_CHIEF_EXECUTIVE"
  | "PRESIDING_MEMBER_OF_BODY"
  | "MEMBER_OF_BODY"
  | "CEREMONIAL"
  | "OTHER";

/** How executive and legislative authority relate under the form. */
export type SeparationKind =
  | "SEPARATE_EXECUTIVE_AND_LEGISLATIVE"
  | "EXECUTIVE_AND_LEGISLATIVE_FUSED_IN_BODY"
  | "OTHER";

/** How a consolidated geography was formed, or that it was not consolidated. */
export type ConsolidationType =
  "NONE" | "URBAN_COUNTY" | "METRO_CONSOLIDATED" | "CITY_COUNTY";

/**
 * A specific enumerated power, assigned to an actor, with its own sourced
 * capability. `capability` KNOWN(true) means the actor holds it; KNOWN(false)
 * means the source affirmatively denies it; UNKNOWN means nobody established it
 * here and it is not to be inferred from the form.
 */
export type PowerKind =
  | "VETO"
  | "LINE_ITEM_VETO"
  | "APPOINTMENT"
  | "CONFIRMATION"
  | "BUDGET_PROPOSAL"
  | "ORDINANCE_ADOPTION"
  | "ORDINANCE_AMENDMENT"
  | "EMERGENCY_POWERS"
  | "EXECUTIVE_DIRECTIVE"
  | "OVERRIDE"
  | "DEPARTMENT_SUPERVISION"
  | "CONTRACT_PROCUREMENT";

export interface EnumeratedPower {
  readonly power: PowerKind;
  readonly heldByRole: ActorRole;
  readonly capability: Sourced<boolean>;
}

/** The apportionment of the elected body, carried as one sourced value. */
export interface CompositionValue {
  readonly pattern: CompositionPattern;
  readonly districtSeats: number | null;
  readonly atLargeSeats: number | null;
  readonly wardSeats: number | null;
  readonly note: string;
}

/** The elected mayor/executive, where the form has one. */
export interface MayorValue {
  readonly title: string;
  readonly structuralPosition: MayorStructuralPosition;
}

/** A professional manager/administrator, kept distinct from the mayor. */
export interface ManagerValue {
  readonly title: string;
  readonly appointedByRole: ActorRole;
  readonly removableByRole: ActorRole;
  readonly statedRole: string;
}

/** Term facts for one class of seat, each sourced independently. */
export interface TermInfo {
  readonly seatClass: string;
  readonly termYears: Sourced<number>;
  readonly termLimit: Sourced<string>;
}

/** A government that existed before consolidation. */
export interface PredecessorUnit {
  readonly name: string;
  readonly unitKind: string;
  readonly attested: Sourced<boolean>;
}

/** A smaller government nested inside a consolidated geography. */
export interface NestedGovernment {
  readonly name: string;
  readonly governmentClass: string;
  readonly survivesConsolidation: Sourced<boolean>;
}

/** A county-equivalent office retained under a consolidated government. */
export interface RetainedOffice {
  readonly office: string;
  readonly retainedBy: Sourced<string>;
}

/** A service or tax district with its own boundary within the government. */
export interface ServiceDistrict {
  readonly name: string;
  readonly note: Sourced<string>;
}

/** A separately governed school or special-purpose district. */
export interface SpecialDistrict {
  readonly name: string;
  readonly districtKind: string;
  readonly separateFromGeneralGovernment: Sourced<boolean>;
}

/** Identity and the join key a later government-unit reconciliation will use. */
export interface SourceIdentity {
  /** This substrate's own stable key, never another branch's unit id. */
  readonly sourceGovernmentKey: string;
  readonly state: string;
  readonly jurisdictionDisplayName: string;
  /**
   * A reference to a future canonical government-unit key, left UNKNOWN until a
   * reconciliation supplies it. A Census place identity, if ever KNOWN here, is
   * an identity crosswalk and never evidence of a municipal power.
   */
  readonly censusGovernmentUnitReference: Sourced<string>;
}

/** Identity plus the legal instrument the government rests on. */
export interface LegalBasis {
  readonly form: Sourced<GovernmentForm>;
  /** "URBAN_COUNTY", "CITY_MANAGER_PLAN", "HOME_RULE_CLASS", etc. */
  readonly basisType: Sourced<string>;
  /** The controlling constitutional/statutory authority, verbatim. */
  readonly controllingAuthority: Sourced<string>;
  readonly effectiveDate: Sourced<string>;
}

export interface ElectedStructure {
  readonly bodyName: Sourced<string>;
  readonly executiveSelection: Sourced<string>;
  readonly bodySize: Sourced<number>;
  readonly composition: Sourced<CompositionValue>;
  readonly presidingOffice: Sourced<string>;
  readonly terms: readonly TermInfo[];
  readonly vacancyMechanism: Sourced<string>;
}

export interface AdministrativeStructure {
  readonly executiveLegislativeSeparation: Sourced<SeparationKind>;
  readonly mayor: Sourced<MayorValue>;
  readonly professionalManager: Sourced<ManagerValue>;
}

export interface LegislativeProcedure {
  readonly measureTypes: Sourced<readonly string[]>;
  readonly introductionSponsorship: Sourced<string>;
  readonly readings: Sourced<number>;
  readonly committeeReferral: Sourced<boolean>;
  readonly publicHearing: Sourced<string>;
  readonly quorum: Sourced<string>;
  readonly passageThreshold: Sourced<string>;
  readonly amendment: Sourced<string>;
  readonly mayoralAction: Sourced<string>;
  readonly override: Sourced<string>;
  readonly effectivePublication: Sourced<string>;
}

export interface Consolidation {
  readonly consolidationType: Sourced<ConsolidationType>;
  readonly enablingAuthority: Sourced<string>;
  readonly consolidationEffectiveDate: Sourced<string>;
  readonly predecessorUnits: readonly PredecessorUnit[];
  readonly retainedNestedGovernments: readonly NestedGovernment[];
  readonly retainedCountyEquivalentOffices: readonly RetainedOffice[];
  readonly serviceDistricts: readonly ServiceDistrict[];
  readonly separateSchoolOrSpecialDistricts: readonly SpecialDistrict[];
}

/** One cited authority behind this government's facts. */
export interface CitedSource {
  /** The key evidence points at, unique within a pack. */
  readonly sourceKey: string;
  /** "Municipal Official Website", "Kentucky Revised Statutes", etc. */
  readonly authorityType: string;
  readonly title: string;
  readonly issuingAuthority: string;
  readonly url: string;
  /** Effective date of the institutional fact where the source states one. */
  readonly effectiveDate: string | null;
  /** When the research/verification retrieved this source. */
  readonly retrievedDate: string;
  /**
   * Whether the source subsystem could retrieve and hash-lock these bytes as a
   * first-party artifact. A pack whose sources are all still `false` cannot
   * clear the production gate — it stays a fixture.
   */
  readonly retrievable: boolean;
  readonly claimSupported: string;
}

export interface RecordProvenance {
  readonly asOf: string;
  readonly citedSources: readonly CitedSource[];
  /** Facts left unknown here and reported rather than guessed. */
  readonly unresolved: readonly string[];
}

/**
 * One government's institutional description.
 *
 * A composite record per government, because a government's identity, elected
 * structure, executive/administrative arrangement, powers, procedure and
 * consolidation relationships are one coherent institution. Splitting them into
 * separate record families is a later refinement, not a first truthful schema.
 */
export interface MunicipalGovernanceRecord {
  readonly recordId: string;
  readonly sourceIdentity: SourceIdentity;
  readonly legalBasis: LegalBasis;
  readonly electedStructure: ElectedStructure;
  readonly administrativeStructure: AdministrativeStructure;
  readonly enumeratedPowers: readonly EnumeratedPower[];
  readonly legislativeProcedure: LegislativeProcedure;
  readonly consolidation: Consolidation;
  readonly provenance: RecordProvenance;
}

/**
 * Keys a municipal record must never carry. The research is emphatic that
 * "strong/weak mayor" is not a scalar; if one of these appears in a serialized
 * record, a power has been collapsed into a dial and the validator fails.
 */
export const FORBIDDEN_STRENGTH_KEYS: readonly string[] = [
  "mayorStrength",
  "mayor_strength",
  "strongMayor",
  "strong_mayor",
  "weakMayor",
  "weak_mayor",
  "mayorPower",
  "mayor_power",
  "strengthScore",
  "strength_score",
  "localDemocracy",
  "local_democracy",
  "consolidated",
];

/**
 * Authority types that identify a place or statistical unit rather than a
 * government's powers. A KNOWN power or legal basis may never cite one of
 * these: a Census place is not proof of municipal power (task).
 */
export const NON_GOVERNMENTAL_IDENTITY_AUTHORITY_TYPES: readonly string[] = [
  "Census Government Units",
  "Census Place",
  "Census Gazetteer",
];
