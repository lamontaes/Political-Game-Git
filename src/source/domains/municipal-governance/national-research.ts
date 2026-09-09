/**
 * The national municipal institutional research, as declarations.
 *
 * ## What this is
 *
 * Packets 44 (`NEXT_PHASE_MUNICIPAL_GOVERNANCE_AND_ENVIRONMENT_MATRIX`), 45
 * Part 2 (`MUNICIPAL_AND_ENVIRONMENT_EXPANSION`) and 46 Part 2
 * (`50_STATE_MUNICIPAL_COMPLETENESS_MATRIX`) carry a city-by-city institutional
 * pass: who the legal body is, how many members it has, how those seats are
 * apportioned, whether a mayor is a separate executive or a presiding member,
 * whether a professional manager exists and who appoints them, where the body
 * actually sits, and which distinct recurring sittings it holds. Each entry
 * names the official municipal pages the pass read.
 *
 * That work was sitting unused. The three Kentucky packs #120 landed exercised
 * the schema; they were never the corpus. This module is the rest of it,
 * declared once, in a shape a compiler can check.
 *
 * ## What it is not
 *
 * It is not law. The packets are a secondary synthesis of official municipal
 * pages, and this repository did not read those pages: it read a document
 * reporting them. So every government declared here compiles into the same
 * fixture-class corpus the Kentucky pilots do, behind the production gate, and
 * the consumers downstream carry that class with them. A government whose
 * procedure has to be true for a player to act on it gets that procedure from
 * `acquisition.ts` — retrieved, hashed, first-party enacted text — or does not
 * get the action at all.
 *
 * ## Attestation, not commencement
 *
 * A `Cell`'s `effectiveDate` becomes the `asOf` of a KNOWN value, which is the
 * date as of which somebody says the value holds. That is exactly what these
 * packets establish: the pass verified, on its own date, that a council has
 * nine members today. It did not establish when the ninth seat was created. So
 * `attestedAsOf` fills `effectiveDate` on the structural cells, and the
 * separate `legalBasis.effectiveDate` — when the government's legal basis took
 * effect — stays UNKNOWN unless a packet actually gave a commencement date.
 *
 * ## Declaring only what was read
 *
 * There is no default anywhere below. A government that declares no manager has
 * `professionalManager` UNKNOWN, not "none"; a government that declares no
 * partisanship asserts nothing about its ballot. The expander in
 * `national-packs.ts` fills every undeclared field with an UNKNOWN carrying the
 * reason, so the width of the corpus never grows by inventing the middle.
 */

import type {
  ActorRole,
  CompositionPattern,
  ConsolidationType,
  ElectionPartisanship,
  GovernmentForm,
  MayorStructuralPosition,
  MeetingCadenceRule,
  MeetingPlaceKind,
  MeetingSeriesKind,
  PowerKind,
  PublicAttendanceRule,
  SeparationKind,
  VoteThreshold,
} from "./types";

/** One official page a packet entry cited, carried through to the record. */
export interface ResearchSource {
  readonly key: string;
  /** The `CitedSource.authorityType` vocabulary; never a place/statistical one. */
  readonly authorityType: string;
  readonly title: string;
  readonly issuingAuthority: string;
  readonly url: string;
  readonly claimSupported: string;
}

export interface ResearchComposition {
  readonly pattern: CompositionPattern;
  readonly districtSeats: number | null;
  readonly atLargeSeats: number | null;
  readonly wardSeats: number | null;
  readonly note: string;
}

export interface ResearchMayor {
  readonly title: string;
  readonly structuralPosition: MayorStructuralPosition;
}

export interface ResearchManager {
  readonly title: string;
  readonly appointedByRole: ActorRole;
  readonly removableByRole: ActorRole;
  readonly confirmationRequired: boolean;
  readonly removalConditions: readonly string[];
  readonly statedRole: string;
}

/** A power a packet entry actually stated, with its rule where one was given. */
export interface ResearchPower {
  readonly power: PowerKind;
  readonly heldByRole: ActorRole;
  readonly held: boolean;
  readonly target: string;
  readonly conditions: readonly string[];
  readonly exceptions: readonly string[];
  readonly threshold: VoteThreshold | null;
  readonly sourceKey: string;
}

export interface ResearchSeries {
  readonly seriesKey: string;
  readonly kind: MeetingSeriesKind;
  readonly bodyName: string;
  readonly cadence: MeetingCadenceRule | null;
  readonly venue: string | null;
  readonly publicAttendance: PublicAttendanceRule | null;
  readonly sourceKey: string;
}

export interface ResearchMeetingPlace {
  readonly kind: MeetingPlaceKind;
  readonly location: string;
  readonly sourceKey: string;
}

export interface ResearchTerm {
  readonly seatClass: string;
  readonly years: number | null;
  readonly sourceKey: string;
}

export interface ResearchPredecessor {
  readonly name: string;
  readonly unitKind: string;
}

export interface ResearchNestedGovernment {
  readonly name: string;
  readonly governmentClass: string;
}

export interface ResearchConsolidation {
  readonly type: ConsolidationType;
  readonly enablingAuthority: string | null;
  readonly effectiveDate: string | null;
  readonly predecessors: readonly ResearchPredecessor[];
  readonly nested: readonly ResearchNestedGovernment[];
  readonly parallelGeneralGovernment: string | null;
  readonly sourceKey: string;
}

/**
 * A crosswalk to a Census place, declared and labelled as identity only.
 *
 * The research names cities; the game's place corpus names Census places. The
 * two are different registers and the join between them is an assertion this
 * repository makes, not a fact a source states, so it is declared here with the
 * words that made it and never backs a claim about power. `basis` says how the
 * assertion was made, and a government whose place identity is genuinely
 * ambiguous carries none.
 */
export interface ResearchPlaceCrosswalk {
  /**
   * The Census place's own name, exactly as the accepted place corpus spells
   * it, in this government's state.
   *
   * A name and not an identifier, deliberately. Typing a GEOID from memory is
   * how a government ends up joined to a different city, which happened twice
   * while this corpus was being written: Provincetown to Quincy and Lexington
   * to Leominster, both silently, because a hand-typed code looked plausible.
   * The export resolves this name against the corpus, requires exactly one
   * match in this state, and refuses the crosswalk otherwise.
   */
  readonly placeName: string;
  readonly basis: string;
}

export interface ResearchGovernment {
  /** This substrate's stable key, `us-<state>-<slug>`. */
  readonly key: string;
  readonly state: string;
  /** The government's own legal name. */
  readonly displayName: string;
  /** What somebody who lives there calls the place. */
  readonly residentName: string;
  /** The date the packet pass verified these facts were current. */
  readonly attestedAsOf: string;
  readonly packetId: string;
  readonly observations?: readonly {
    readonly text: string;
    readonly sourceKey: string;
    readonly locator: string;
  }[];
  readonly sources: readonly ResearchSource[];
  readonly form: {
    readonly value: GovernmentForm;
    readonly basisType: string;
    readonly controllingAuthority: string | null;
    readonly commencementDate: string | null;
    readonly sourceKey: string;
  } | null;
  readonly body: {
    readonly name: string | null;
    readonly size: number | null;
    readonly composition: ResearchComposition | null;
    readonly presidingOffice: string | null;
    readonly executiveSelection: string | null;
    readonly sourceKey: string;
  };
  readonly separation: SeparationKind | null;
  readonly mayor: ResearchMayor | null;
  readonly manager: ResearchManager | null;
  readonly partisanship: ElectionPartisanship | null;
  readonly terms: readonly ResearchTerm[];
  readonly powers: readonly ResearchPower[];
  readonly consolidation: ResearchConsolidation | null;
  readonly meetingPlaces: readonly ResearchMeetingPlace[];
  readonly meetingSeries: readonly ResearchSeries[];
  readonly placeCrosswalk: ResearchPlaceCrosswalk | null;
  /** What the packet left open for this government, in its own words. */
  readonly unresolved: readonly string[];
}

export interface NationalResearchCorpus {
  readonly packets: readonly string[];
  /** When the packets state their own pass was current. */
  readonly attestedAsOf: string;
  /** When this repository read them. */
  readonly readOn: string;
  readonly evidenceClass: "secondary-synthesis";
  readonly governments: readonly ResearchGovernment[];
}
