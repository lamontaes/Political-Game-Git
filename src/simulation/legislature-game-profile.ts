/**
 * A playable legislature for a state whose own instruments have not been read.
 *
 * Nine legislatures are compiled from their own constitutions. Forty-two states
 * are not, and until now that meant something stronger than "we have not read
 * them": it meant those states had no legislature at all. `resolvePlayGeography`
 * returned a null rule pack, so a player living in Texas or California could not
 * be in a chamber, could not carry a bill, and could not see a floor vote. The
 * absence of research had become an absence of government.
 *
 * That is the same mistake `office-qualification-profile` fixes for standing for
 * office, and it takes the same three-state shape. A rule is either read from
 * the state's own law, or generated from the spread real states span and
 * recorded as the game's own, or genuinely unknown. Only the middle state was
 * missing.
 *
 * What a generated pack reads, and what it estimates:
 *
 * A chamber's seats are each state's own count from The Council of State
 * Governments' 2023 table (Book of the States, Table 3.3), after any size
 * settled in this file from the state's constitution. Where neither lists a
 * chamber, the state's own Census legislative districts size it, and last the
 * middle of the compiled chambers' spread, marked ESTIMATED FROM AVERAGE.
 * Veto windows are each state's own figures from the same survey's Table
 * 3.16, and the override bar is read from each state's constitution
 * (`veto-override-source-readings.ts`). Nothing is drawn.
 *
 * A senate is never estimated independently of its house. Every researched
 * state seats between a fifth and a half as many senators as representatives,
 * and a senate larger than its house is the one shape American bicameralism
 * never takes. So an estimated upper chamber is a proportion of the lower.
 *
 * And nothing here claims to be law. Every source ref but a seat count read
 * from a table or a constitution carries authority `game-profile` and
 * verification `game-profile`, `assertRulePackIntegrity`
 * refuses a pack that mixes the two kinds, and compiling the state's own
 * constitution replaces the whole pack.
 */

import {
  stateBillNumberingStyle,
  templatePrefix,
} from "./bill-numbering-styles";
import {
  knownRule,
  fractionOf,
  majorityOf,
  unknownRule,
  type ChamberRule,
  type LegislativeRulePack,
  type RuleSourceRef,
  type VoteDenominator,
  type VoteThresholdRule,
} from "./legislature-rules";
import legislatorsTable from "../../data/research/laws/legislators-2023.json" with { type: "json" };
import vetoWindowTable from "../../data/research/laws/veto-windows-2023.json" with { type: "json" };
import { districtIdentityCatalog } from "../districts/catalog";
import { listDistrictIdentities } from "../districts/query";
import { seatsByDistrict } from "../districts/members-per-district";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { withMinorityPartyProcedureRows } from "./minority-party-procedure";
import { STATES } from "./state-reference";
import {
  VETO_OVERRIDE_SOURCE_READINGS,
  vetoOverrideReadingFor,
} from "./veto-override-source-readings";

/**
 * The version of the generated ruleset.
 *
 * Changing any rule below means a new version. A save records the version its
 * legislature was created under, so an existing game is never silently
 * re-legislated underneath the player.
 */
export const LEGISLATURE_GAME_PROFILE_VERSION =
  "ocd-legislature-game-profile/v1";

function profileSource(citation: string, note: string): RuleSourceRef {
  return {
    authority: "game-profile",
    citation,
    sourceTitle: `Our Civic Duty legislature profile (${LEGISLATURE_GAME_PROFILE_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note,
  };
}

/**
 * The middle value of an ascending list: the estimate a generated chamber
 * takes where nothing about its own state has been read.
 */
function middleOf(values: readonly number[]): number {
  return values[Math.floor((values.length - 1) / 2)]!;
}

interface ChamberSeatRow {
  readonly usps: string;
  readonly lowerSeats: number | null;
  readonly upperSeats: number | null;
  readonly unicameralSeats: number | null;
}

const CHAMBER_SEAT_ROWS: readonly ChamberSeatRow[] = (
  legislatorsTable as { readonly rows: readonly ChamberSeatRow[] }
).rows;

/** Where The Council of State Governments counts each chamber's seats. */
const CHAMBER_SEATS_SOURCE: RuleSourceRef = {
  authority: "research-reference",
  citation: "The Book of the States 2023, Table 3.3",
  sourceTitle:
    "The Legislators: Numbers, Terms and Party Affiliations: 2023 (The Council of State Governments)",
  sourceUrl: (legislatorsTable as { readonly url: string }).url,
  retrievedAt: "2026-09-29",
  verification: "verified",
  note: "Each chamber's total seats as the Council of State Governments compiled them from the legislatures in 2023. A compiled survey, not the state's own constitution or apportionment statute. The rest of this legislature is the game's own.",
};

/**
 * A state's chamber sizes from the 2023 table, keyed `US-TX`; null where the
 * table has no row. A one-house legislature has only `unicameral`.
 */
function compiledChamberSeats(jurisdictionKey: string): {
  readonly lower: number | null;
  readonly upper: number | null;
  readonly unicameral: number | null;
} | null {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  const row = CHAMBER_SEAT_ROWS.find((candidate) => candidate.usps === usps);
  if (!row) return null;
  return {
    lower: row.lowerSeats,
    upper: row.upperSeats,
    unicameral: row.unicameralSeats,
  };
}

interface VetoWindowRow {
  readonly usps: string;
  readonly inSessionDays: number | null;
  readonly afterAdjournmentDays: number | null;
  readonly table: {
    readonly duringSession: string;
    readonly afterSessionBecomesLawUnlessVetoed: string;
    readonly afterSessionDiesUnlessSigned: string;
  };
}

const VETO_WINDOW_ROWS: readonly VetoWindowRow[] = (
  vetoWindowTable as { readonly rows: readonly VetoWindowRow[] }
).rows;

/** Table 3.16 excludes Sundays except cells marked footnote (q). */
export function vetoWindowDayBasisFor(
  stateJurisdictionKey: string,
  afterAdjournment: boolean,
) {
  const cellFor = (row: VetoWindowRow) =>
    afterAdjournment
      ? row.table.afterSessionBecomesLawUnlessVetoed ||
        row.table.afterSessionDiesUnlessSigned
      : row.table.duringSession;
  const row = VETO_WINDOW_ROWS.find(
    (candidate) => candidate.usps === stateJurisdictionKey.replace(/^US-/, ""),
  );
  const cell = row ? cellFor(row) : "";
  const observations = VETO_WINDOW_ROWS.map(cellFor).filter(Boolean);
  const calendarCount = observations.filter((value) =>
    value.includes("(q)"),
  ).length;
  const basis = cell
    ? cell.includes("(q)")
      ? ("CALENDAR" as const)
      : ("SUNDAYS_EXCEPTED" as const)
    : calendarCount > observations.length / 2
      ? ("CALENDAR" as const)
      : ("SUNDAYS_EXCEPTED" as const);
  return knownRule(
    basis,
    profileSource(
      "Veto action day counting",
      `${VETO_WINDOW_SOURCE.citation} says days exclude Sundays unless footnote (q) applies. ${cell ? `This row's recorded cell is ${cell}.` : "This row has no cell; the day basis is ESTIMATED from the most common basis among the table's recorded cells."}`,
    ),
  );
}

/** Where The Council of State Governments' table gives a state's windows. */
export const VETO_WINDOW_SOURCE = {
  citation: "The Book of the States 2023, Table 3.16",
  sourceTitle:
    "Enacting Legislation: Veto, Veto Override and Effective Date (The Council of State Governments)",
  sourceUrl: (vetoWindowTable as { readonly url: string }).url,
} as const;

/** The most common value, ties to the larger. */
function mostCommon(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(
    ([a, countA], [b, countB]) => countB - countA || b - a,
  )[0]![0];
}

/**
 * How many days a state's governor has to act on a bill, during the session
 * and after adjournment, as The Council of State Governments' 2023 survey
 * gives them (`veto-windows-2023.json`). Where the table gives no figure,
 * the most common figure among the places it does, marked estimated.
 */
export function vetoWindowFor(stateJurisdictionKey: string): {
  readonly inSessionDays: number;
  readonly afterAdjournmentDays: number;
  readonly inSessionEstimated: boolean;
  readonly afterAdjournmentEstimated: boolean;
} {
  const row = VETO_WINDOW_ROWS.find(
    (candidate) => `US-${candidate.usps}` === stateJurisdictionKey,
  );
  const inSession = row?.inSessionDays ?? null;
  const after = row?.afterAdjournmentDays ?? null;
  return {
    inSessionDays:
      inSession ??
      mostCommon(VETO_WINDOW_ROWS.flatMap((r) => r.inSessionDays ?? [])),
    afterAdjournmentDays:
      after ??
      mostCommon(VETO_WINDOW_ROWS.flatMap((r) => r.afterAdjournmentDays ?? [])),
    inSessionEstimated: inSession === null,
    afterAdjournmentEstimated: after === null,
  };
}

/**
 * The ordinary override bar the most constitutions read set, as a fraction.
 * Ties go to the higher bar. Computed from the readings, so it moves when
 * they do.
 */
function mostCommonReadOverride(): readonly [number, number] {
  const counts = new Map<string, number>();
  for (const reading of VETO_OVERRIDE_SOURCE_READINGS) {
    const threshold = reading.actions[0]?.thresholds[0];
    if (!threshold) continue;
    const key = `${threshold.numerator}/${threshold.denominatorParts}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [best] = [...counts.entries()].sort(
    ([a, countA], [b, countB]) =>
      countB - countA || fractionValue(b) - fractionValue(a),
  );
  const [numerator, denominatorParts] = best![0].split("/").map(Number);
  return [numerator!, denominatorParts!];
}

function fractionValue(fraction: string): number {
  const [numerator, denominatorParts] = fraction.split("/").map(Number);
  return numerator! / denominatorParts!;
}

// ---------------------------------------------------------------------------
// What the researched packs span
// ---------------------------------------------------------------------------

function ascendingDistinct(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

/**
 * The spread of lower-chamber sizes across the researched packs, and the
 * proportion their senates bear to them, as whole percentage points.
 *
 * Measured rather than written down, so it widens on its own as states are
 * compiled and can never drift away from its own evidence. Packs whose seat
 * counts are unresolved contribute nothing: an unknown is not a zero.
 */
export function researchedChamberSpread(): {
  readonly lowerSeats: readonly number[];
  readonly senatePercentOfHouse: readonly number[];
} {
  const lowerSeats: number[] = [];
  const senatePercentOfHouse: number[] = [];
  for (const pack of LEGISLATIVE_RULE_PACKS) {
    if (pack.basis !== "researched" || pack.structure !== "bicameral") continue;
    const [lower, upper] = pack.chamberOrder;
    const lowerChamber = pack.chambers.find((c) => c.chamberKey === lower);
    const upperChamber = pack.chambers.find((c) => c.chamberKey === upper);
    if (lowerChamber?.seats.kind !== "known") continue;
    lowerSeats.push(lowerChamber.seats.value);
    if (upperChamber?.seats.kind !== "known") continue;
    senatePercentOfHouse.push(
      Math.round((upperChamber.seats.value / lowerChamber.seats.value) * 100),
    );
  }
  return {
    lowerSeats: ascendingDistinct(lowerSeats),
    senatePercentOfHouse: ascendingDistinct(senatePercentOfHouse),
  };
}

/**
 * The in-session veto windows, post-adjournment windows and override fractions
 * the researched packs carry. Unknown and not-applicable values contribute
 * nothing rather than a number.
 */
export function researchedExecutiveSpread(): {
  readonly inSessionDays: readonly number[];
  readonly afterAdjournmentDays: readonly number[];
  readonly overrideFractions: readonly (readonly [number, number])[];
} {
  const inSessionDays: number[] = [];
  const afterAdjournmentDays: number[] = [];
  const overrideFractions: (readonly [number, number])[] = [];
  const seenFractions = new Set<string>();
  for (const pack of LEGISLATIVE_RULE_PACKS) {
    if (pack.basis !== "researched") continue;
    const executive = pack.executive;
    if (executive.actionWindowDaysInSession.kind === "known") {
      inSessionDays.push(executive.actionWindowDaysInSession.value);
    }
    if (executive.actionWindowDaysAfterAdjournment.kind === "known") {
      afterAdjournmentDays.push(
        executive.actionWindowDaysAfterAdjournment.value,
      );
    }
    // Only the each-chamber form is carried forward. A joint-session override
    // has to equal the pack's combined seats exactly, and a generated pack that
    // got that arithmetic wrong would fail its own integrity check; the form is
    // recorded as a gap instead of approximated.
    if (executive.override.kind === "each-chamber") {
      const { numerator, denominatorParts } = executive.override.threshold;
      const key = `${numerator}/${denominatorParts}`;
      if (!seenFractions.has(key)) {
        seenFractions.add(key);
        overrideFractions.push([numerator, denominatorParts]);
      }
    }
  }
  return {
    inSessionDays: ascendingDistinct(inSessionDays),
    afterAdjournmentDays: ascendingDistinct(afterAdjournmentDays),
    overrideFractions: [...overrideFractions].sort(
      (left, right) => left[0] / left[1] - right[0] / right[1],
    ),
  };
}

// ---------------------------------------------------------------------------
// The generated profile
// ---------------------------------------------------------------------------

/**
 * Jurisdictions this generator declines, because a state legislature is not
 * what they have.
 *
 * The District of Columbia is legislated for by a thirteen-member Council
 * sitting as one body. Handing it a generated House and Senate would not be a
 * provisional reading of its law, it would be a shape the District has never
 * had — and the whole point of a disclosed profile is that it resembles the
 * real thing. The Council belongs to the municipal registry, and until it is
 * compiled the District has no state legislature rather than a wrong one.
 *
 * Puerto Rico is not listed: its Legislative Assembly really is bicameral, so
 * the generated shape is the right one even before its own instruments are read.
 *
 * Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana
 * Islands are declined too. Guam's and the Virgin Islands' legislatures sit as
 * one chamber, American Samoa's Fono seats its Senate by matai custom, and a
 * territorial legislature is not a state's under any of them, so a House and
 * Senate drawn from the researched states would be a shape none of them has.
 * PLACEHOLDER until each territory's own legislature is compiled from the
 * answered `inhabited-territories-government-and-statehood` research.
 */
const NO_STATE_LEGISLATURE: ReadonlySet<string> = new Set([
  "US-DC",
  "US-GU",
  "US-VI",
  "US-AS",
  "US-MP",
]);

/**
 * Chamber sizes that are settled law, applied in place of the draw. Only
 * states whose size is beyond doubt are listed; every other unread state's
 * size is still drawn, and the full table is research question
 * `state-legislature-chamber-sizes-and-quorum`.
 */
const SETTLED_CHAMBER_SEATS: Readonly<
  Record<
    string,
    {
      readonly lower: number;
      readonly upper: number;
      readonly source: RuleSourceRef;
    }
  >
> = {
  "US-NH": {
    lower: 400,
    upper: 24,
    source: {
      authority: "constitution",
      citation: "N.H. Const. Pt. II, Arts. 9 and 25",
      sourceTitle: "Constitution of the State of New Hampshire",
      sourceUrl: "https://www.nh.gov/glance/constitution.htm",
      retrievedAt: null,
      verification: "verified",
      note: "A House of not fewer than 375 nor more than 400 members, apportioned by statute at 400, and a Senate of twenty-four. Settled law: the counts are certain, though the apportionment statute's text was not retrieved for this entry. The rest of this legislature is the game's own.",
    },
  },
  "US-PR": {
    lower: 51,
    upper: 27,
    source: {
      authority: "constitution",
      citation: "P.R. Const. art. III, §§ 2-3",
      sourceTitle:
        "Constitution of the Commonwealth of Puerto Rico, Article III",
      sourceUrl: "https://poderjudicial.pr/constitucion/articulo-iii/",
      retrievedAt: null,
      verification: "verified",
      note: "Twenty-seven Senators (two from each of eight districts and eleven at large) and fifty-one Representatives (one from each of forty districts and eleven at large), per the research answer OCD-PUERTO-RICO-GOVERNMENT-AND-MUNICIPIOS (2026-09-22). This is the base composition; the additional minority-party members Article III, § 7 can add are not modeled. The rest of this legislature is the game's own.",
    },
  },
};

export type SeatBasis =
  "settled" | "compiled-table" | "census-districts" | "estimated";

/**
 * How many members the Census districts of one of a state's chambers elect,
 * by the counts in `members-per-district.json`; zero where the Census draws
 * no districts.
 */
function censusDistrictSeats(
  stateJurisdictionKey: string,
  chamber: "state-lower" | "state-upper",
): number {
  return seatsByDistrict(
    listDistrictIdentities(districtIdentityCatalog(), {
      stateUsps: stateJurisdictionKey.replace(/^US-/, ""),
      chamber,
    }),
  ).length;
}

/** The drawn shape of one state's legislature, before it becomes a rule pack. */
export interface LegislatureProfile {
  readonly stateJurisdictionKey: string;
  readonly version: string;
  readonly lowerSeats: number;
  readonly upperSeats: number;
  /**
   * Where each seat count comes from: settled law, the state's own Census
   * legislative districts and the members each elects, or a draw from the
   * researched range where neither exists.
   */
  readonly lowerSeatsBasis: SeatBasis;
  readonly upperSeatsBasis: SeatBasis;
  /** Where the seat counts come from when they are settled law, not drawn. */
  readonly seatSource: RuleSourceRef | null;
  readonly vetoWindowDaysInSession: number;
  readonly vetoWindowDaysAfterAdjournment: number;
  readonly overrideFraction: readonly [number, number];
}

/**
 * What one unread state's legislature looks like, or null if the researched
 * packs carry too little to draw from.
 *
 * Null is not an empty legislature and not a permission: it means the game
 * cannot yet say even what is usual, which happens only if no researched pack
 * resolves a seat count at all.
 */
/*
 * A state's profile and pack are drawn from static research and the state's
 * own key, so each is built once per state. The clock and every bill step
 * used to rebuild them, recounting the state's Census districts each time.
 */
const PROFILES = new Map<string, LegislatureProfile | null>();
const PROFILE_PACKS = new Map<string, LegislativeRulePack | null>();

export function legislatureProfileFor(
  stateJurisdictionKey: string,
): LegislatureProfile | null {
  if (!PROFILES.has(stateJurisdictionKey))
    PROFILES.set(
      stateJurisdictionKey,
      buildLegislatureProfile(stateJurisdictionKey),
    );
  return PROFILES.get(stateJurisdictionKey)!;
}

function buildLegislatureProfile(
  stateJurisdictionKey: string,
): LegislatureProfile | null {
  if (NO_STATE_LEGISLATURE.has(stateJurisdictionKey)) return null;
  const chambers = researchedChamberSpread();
  const executive = researchedExecutiveSpread();
  if (
    chambers.lowerSeats.length === 0 ||
    chambers.senatePercentOfHouse.length === 0 ||
    executive.inSessionDays.length === 0 ||
    executive.afterAdjournmentDays.length === 0 ||
    executive.overrideFractions.length === 0
  ) {
    return null;
  }
  // Settled law wins, then the Council of State Governments' count of each
  // chamber's seats, then the state's own Census districts (each district seating the
  // members it elects), and last the middle of the compiled
  // states' spread, marked ESTIMATED FROM AVERAGE. Nothing is drawn. The
  // seated chambers are sized the same way.
  const settled = SETTLED_CHAMBER_SEATS[stateJurisdictionKey] ?? null;
  const row = compiledChamberSeats(stateJurisdictionKey);
  const compiled =
    row && row.lower !== null && row.upper !== null
      ? { lower: row.lower, upper: row.upper }
      : null;
  const lowerDistricts = censusDistrictSeats(
    stateJurisdictionKey,
    "state-lower",
  );
  const upperDistricts = censusDistrictSeats(
    stateJurisdictionKey,
    "state-upper",
  );
  const lowerEstimate = middleOf(chambers.lowerSeats);
  const lowerSeats =
    settled?.lower ??
    compiled?.lower ??
    (lowerDistricts > 0 ? lowerDistricts : lowerEstimate);
  // At least two senators, and always fewer than the house: a senate that
  // matched or outgrew its lower chamber is the one shape no state has.
  const upperEstimate = Math.min(
    lowerSeats - 1,
    Math.max(
      2,
      Math.round((lowerSeats * middleOf(chambers.senatePercentOfHouse)) / 100),
    ),
  );
  const basis = (districts: number): SeatBasis =>
    settled
      ? "settled"
      : compiled
        ? "compiled-table"
        : districts > 0
          ? "census-districts"
          : "estimated";
  return {
    stateJurisdictionKey,
    version: LEGISLATURE_GAME_PROFILE_VERSION,
    lowerSeats,
    upperSeats:
      settled?.upper ??
      compiled?.upper ??
      (upperDistricts > 0 ? upperDistricts : upperEstimate),
    lowerSeatsBasis: basis(lowerDistricts),
    upperSeatsBasis: basis(upperDistricts),
    seatSource: settled?.source ?? (compiled ? CHAMBER_SEATS_SOURCE : null),
    vetoWindowDaysInSession: vetoWindowFor(stateJurisdictionKey).inSessionDays,
    vetoWindowDaysAfterAdjournment:
      vetoWindowFor(stateJurisdictionKey).afterAdjournmentDays,
    // Every state and Puerto Rico now has its override read from its own
    // constitution, which `overrideThresholdFor` prefers. This is only the
    // fallback for a place with no reading: the bar most constitutions set.
    overrideFraction: mostCommonReadOverride(),
  };
}

function vetoWindowSentence(
  stateJurisdictionKey: string,
  profile: LegislatureProfile,
): string {
  const window = vetoWindowFor(stateJurisdictionKey);
  const estimated = [
    window.inSessionEstimated ? "during session" : null,
    window.afterAdjournmentEstimated ? "after adjournment" : null,
  ].filter((part): part is string => part !== null);
  return `The governor has ${profile.vetoWindowDaysInSession} days to act on a measure during session and ${profile.vetoWindowDaysAfterAdjournment} after adjournment, as ${VETO_WINDOW_SOURCE.citation} gives them.${estimated.length ? ` The table gives no figure ${estimated.join(" or ")} here, so that figure is the most common one it gives for other places (ESTIMATED FROM AVERAGE).` : ""}`;
}

const QUORUM_SOURCE = profileSource(
  "Quorum",
  "A majority of the members elected to a chamber is a quorum. Every researched state says so, and the game applies it where a state's own rule has not been read.",
);
const PASSAGE_SOURCE = profileSource(
  "Passage",
  "A measure passes a chamber on a majority of the members elected to it. Every researched state says so, and the game applies it where a state's own rule has not been read.",
);
const ORIGINATION_SOURCE = profileSource(
  "Origination",
  "A measure may start in either chamber. The game applies this where a state's own origination rule has not been read; a state that confines a class of measure to one chamber will say so once its instruments are compiled.",
);
/**
 * PLACEHOLDER, not law. How often an unresearched legislature sits and whether
 * a pending measure survives adjournment are unknown: several real states meet
 * only every other year, and some carry bills over within a biennium. Filed as
 * `generated-legislature-session-frequency-and-carryover`. Until it is
 * answered the game applies one blanket rule — an annual session whose pending
 * measures die at sine die — so that bills can finish at all, and says so.
 */
const SESSION_SOURCE = profileSource(
  "Session",
  "The game's standing rule until this state's session calendar is researched: the legislature sits in a regular annual session and a measure still pending when it adjourns sine die does not carry over. This is not a reading of the state's law.",
);

/**
 * PLACEHOLDER, not law. Every researched chamber refers a measure to a
 * standing committee before the floor, and a committee reports on a majority
 * of its members. Which committees an unresearched chamber has, and their
 * sizes, come from its own rules; until they are read, each chamber has one
 * standing committee of about a sixth of its seats, between five and
 * twenty-five members, so that a bill can reach the floor at all.
 */
const COMMITTEE_SOURCE = profileSource(
  "Committees",
  "The game's standing rule until this chamber's rules are read: one standing committee hears every bill and reports it on a majority of its members. This is not a reading of the state's law.",
);

function committeeSize(seats: number): number {
  return Math.max(5, Math.min(25, Math.round(seats / 6)));
}

function profileChamber(
  chamberKey: string,
  name: string,
  billDesignationPrefix: string,
  seats: number,
  seatBasis: SeatBasis,
  settledSource: RuleSourceRef | null = null,
): ChamberRule {
  const seatSource =
    settledSource ??
    profileSource(
      "Seats",
      seatBasis === "census-districts"
        ? `The chamber seats ${seats} members, the members each of the state's Census legislative districts elects, one where no count is on file.`
        : `The chamber seats ${seats} members, the middle of the range the compiled states span (ESTIMATED FROM AVERAGE).`,
    );
  const quorum: VoteThresholdRule = majorityOf(
    "members-elected",
    "a majority of the members elected to the chamber",
    QUORUM_SOURCE,
  );
  return {
    chamberKey,
    name,
    billDesignationPrefix,
    seats: knownRule(seats, seatSource),
    quorum: knownRule(quorum, QUORUM_SOURCE),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by the chamber's own rules of proceeding",
      multipleReferralAllowed: unknownRule(
        "Whether one measure may be referred to several committees is set by this chamber's own rules, which have not been read.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred measure is guaranteed a hearing is set by this chamber's own rules, which have not been read.",
      ),
      source: profileSource(
        "Referral",
        "A measure is referred to committee before it reaches the floor. Which committee, and on what terms, comes from chamber rules that have not been read.",
      ),
    },
    committees: [
      {
        committeeKey: `${chamberKey}-standing`,
        name: "Standing committee",
        appointedMembers: committeeSize(seats),
        membershipBasis: "scenario-fixture",
        reportThreshold: majorityOf(
          "committee-members-appointed",
          "a majority of the committee's membership",
          COMMITTEE_SOURCE,
        ),
        chairMayDeclineToHear: unknownRule(
          "Whether a committee chair may decline to take a bill up is set by this chamber's own rules, which have not been read.",
        ),
        publicHearingNotice: unknownRule(
          "How much notice a committee hearing takes is set by this chamber's own rules, which have not been read.",
        ),
      },
    ],
    floorStages: [
      {
        stageKey: "final-passage",
        label: "Final passage",
        amendable: knownRule(true, PASSAGE_SOURCE),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the members elected to the chamber",
            PASSAGE_SOURCE,
          ),
          PASSAGE_SOURCE,
        ),
        source: PASSAGE_SOURCE,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, PASSAGE_SOURCE),
      germanenessStandard: unknownRule(
        "The germaneness standard applied to an amendment is set by this chamber's own rules, which have not been read.",
      ),
      source: PASSAGE_SOURCE,
    },
  };
}

/** The pack id a generated legislature is registered and saved under. */
export function legislatureProfilePackId(stateJurisdictionKey: string): string {
  return `${stateJurisdictionKey.toLowerCase()}-legislature-profile-v1`;
}

/**
 * A complete, playable legislature for a state with no compiled pack.
 *
 * The pack declares `basis: "game-profile"`, which makes the mixing check in
 * `assertRulePackIntegrity` refuse it if any rule in it ever claims a read
 * source. It is deliberately NOT added to `LEGISLATIVE_RULE_PACKS`: that array
 * is the compiled research, and a generated legislature listed beside Ohio's
 * would read as another state that had been checked.
 */
export function legislatureProfilePack(
  stateJurisdictionKey: string,
  stateName: string,
): LegislativeRulePack | null {
  const key = `${stateJurisdictionKey}|${stateName}`;
  if (!PROFILE_PACKS.has(key))
    PROFILE_PACKS.set(
      key,
      buildLegislatureProfilePack(stateJurisdictionKey, stateName),
    );
  return PROFILE_PACKS.get(key)!;
}

function buildLegislatureProfilePack(
  stateJurisdictionKey: string,
  stateName: string,
): LegislativeRulePack | null {
  const profile = legislatureProfileFor(stateJurisdictionKey);
  if (profile === null) return null;
  // Each state's own chamber names and bill prefixes, read from the recorded
  // research where it has them (decision OCD-LEG-NUM-001).
  const numbering = stateBillNumberingStyle(stateJurisdictionKey);
  const override = overrideThresholdFor(
    stateJurisdictionKey,
    profile.overrideFraction,
  );
  const overrideSource = profileSource(
    "Veto and override",
    vetoWindowSentence(stateJurisdictionKey, profile),
  );
  // The override is the one rule here that may rest on real law. Where a
  // constitution has been read for this state, the read threshold wins and
  // carries that instrument's own citation; a generated pack is allowed to hold
  // a read rule precisely so this can happen.
  const overrideThresholdSource: RuleSourceRef =
    override.basis === "read" && readingCitation(stateJurisdictionKey) !== null
      ? readingCitation(stateJurisdictionKey)!
      : overrideSource;
  const pack: LegislativeRulePack = {
    packId: legislatureProfilePackId(stateJurisdictionKey),
    jurisdictionKey: stateJurisdictionKey,
    displayName: `${stateName} Legislature`,
    basis: "game-profile",
    structure: "bicameral",
    chambers: [
      profileChamber(
        "house",
        numbering.lower.name,
        templatePrefix(numbering.lower.template),
        profile.lowerSeats,
        profile.lowerSeatsBasis,
        profile.seatSource,
      ),
      profileChamber(
        "senate",
        numbering.upper.name,
        templatePrefix(numbering.upper.template),
        profile.upperSeats,
        profile.upperSeatsBasis,
        profile.seatSource,
      ),
    ],
    chamberOrder: ["house", "senate"],
    origination: {
      generalOrigination: knownRule(["house", "senate"], ORIGINATION_SOURCE),
      subjectRestrictions: [],
      source: ORIGINATION_SOURCE,
    },
    interChamber: {
      kind: "second-chamber",
      concurrenceThreshold: majorityOf(
        "members-elected",
        "a majority of the members elected to the second chamber",
        PASSAGE_SOURCE,
      ),
      conference: unknownRule(
        "How this legislature resolves a difference between its chambers is set by joint rules that have not been read, so conference is not modeled.",
      ),
      source: PASSAGE_SOURCE,
    },
    executive: {
      titleLabel: "Governor",
      presentmentRequired: knownRule(true, overrideSource),
      actionWindowDaysInSession: knownRule(
        profile.vetoWindowDaysInSession,
        overrideSource,
      ),
      actionWindowDayBasisInSession: vetoWindowDayBasisFor(
        stateJurisdictionKey,
        false,
      ),
      actionWindowDaysAfterAdjournment: knownRule(
        profile.vetoWindowDaysAfterAdjournment,
        overrideSource,
      ),
      actionWindowDayBasisAfterAdjournment: vetoWindowDayBasisFor(
        stateJurisdictionKey,
        true,
      ),
      inactionOutcomeInSession: knownRule(
        "becomes-law-without-signature",
        overrideSource,
      ),
      lineItemVeto: unknownRule(
        "Whether this governor may object to a single item of an appropriation has not been read, and the game claims neither the power nor its absence.",
      ),
      override: {
        kind: "each-chamber",
        threshold: fractionOf(
          override.numerator,
          override.denominatorParts,
          override.countedAgainst,
          override.readBasis === null
            ? `${override.numerator} of ${override.denominatorParts} of the members elected to each chamber`
            : `${override.numerator} of ${override.denominatorParts} of ${override.readBasis}`,
          overrideThresholdSource,
        ),
      },
      source: overrideSource,
    },
    enactment: {
      effectiveDateDistinctFromEnactment: unknownRule(
        "When an act of this legislature takes effect has not been read.",
      ),
      defaultEffectiveRule: unknownRule(
        "This state's default effective date has not been read.",
      ),
      source: SESSION_SOURCE,
    },
    session: {
      sessionLabel: "Regular session",
      adjournmentRule: knownRule(
        "The legislature sits in a regular session each year and adjourns sine die at its close.",
        SESSION_SOURCE,
      ),
      measuresDieAtAdjournment: knownRule(true, SESSION_SOURCE),
      source: SESSION_SOURCE,
    },
    sources:
      overrideThresholdSource === overrideSource
        ? [
            QUORUM_SOURCE,
            PASSAGE_SOURCE,
            ORIGINATION_SOURCE,
            SESSION_SOURCE,
            overrideSource,
          ]
        : [
            QUORUM_SOURCE,
            PASSAGE_SOURCE,
            ORIGINATION_SOURCE,
            SESSION_SOURCE,
            overrideSource,
            overrideThresholdSource,
          ],
    unresolvedGaps: [
      "This legislature has not been compiled from its state's own constitution or rules. Its structure, seat counts, veto windows and override threshold are the game's own, drawn from the range the compiled states span, and none of them is a claim about this state's law.",
      "The chamber names and bill prefixes come from this state's recorded enacted-bill samples and chamber-name research where those record them; a chamber they do not record keeps a labeled game default.",
      "Committee structure, referral among committees, hearing guarantees and report thresholds come from chamber rules that have not been read.",
      "Conference between the chambers is not modeled.",
      "How often this legislature meets and whether a pending measure carries over after adjournment have not been read; the annual session with bills dying at adjournment is the game's standing rule until they are.",
      "Whether this state overrides a veto in joint session rather than chamber by chamber has not been read; the generated pack uses the chamber-by-chamber form every compiled state but one uses.",
      ...override.unexpressed,
    ],
  };
  return withMinorityPartyProcedureRows(pack);
}

/**
 * A generated legislature resolved from its pack id.
 *
 * A save in an uncompiled state records the pack id like any other, and the
 * engine that moves a bill resolves it through `rulePackById`. Without this
 * the id would resolve to nothing and the save would open into a state with a
 * seat the player holds and no chamber to sit in.
 *
 * The id is the only handle. A pack object cannot be handed to the engine, and
 * an id that does not name a real jurisdiction resolves to null rather than to
 * an invented legislature.
 */
export function legislatureProfilePackById(
  packId: string,
): LegislativeRulePack | null {
  const matched = /^us-([a-z]{2})-legislature-profile-v1$/.exec(packId);
  if (!matched) return null;
  const usps = matched[1]!.toUpperCase();
  const state = STATES[usps];
  if (!state) return null;
  return legislatureProfilePack(`US-${usps}`, state.name);
}

/**
 * The legislature a state plays with: its own if it has been compiled, and the
 * generated one otherwise.
 *
 * This is the function the rest of the game should ask. Reaching for
 * `LEGISLATIVE_RULE_PACKS` directly is what left forty-two states with no
 * legislature: that array answers "which states have been researched", and the
 * caller wanted "which legislature does this state have".
 */
export function legislatureForState(
  stateJurisdictionKey: string,
): LegislativeRulePack | null {
  const researched = LEGISLATIVE_RULE_PACKS.find(
    (pack) => pack.jurisdictionKey === stateJurisdictionKey,
  );
  if (researched) return researched;
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1];
  const state = usps ? STATES[usps] : undefined;
  if (!state) return null;
  return legislatureProfilePack(stateJurisdictionKey, state.name);
}

// ---------------------------------------------------------------------------
// Seats, for anything that has to actually fill them
// ---------------------------------------------------------------------------

/** A chamber's size, and whether it was read or drawn. */
export interface ChamberSeatCount {
  readonly seats: number;
  readonly basis: "researched" | "game-profile";
}

/**
 * How many seats a chamber has, for a caller that must seat them.
 *
 * Three compiled packs carry an unresolved seat count — Kentucky, Nebraska and
 * Nevada all delegate the number to statute or to filed district shapefiles,
 * and none of those was read. That absence is true of the research and the pack
 * keeps it: `chamber.seats` still says `unknown`, and nothing is written into
 * the record.
 *
 * But an absence in the record is not a reason for a chamber to sit empty. A
 * legislature with no members is the same failure as a state with no
 * legislature, one level down, and it is the failure that leaves the whole
 * country unseated except Congress. So the correction happens here, when the
 * number is READ, exactly as the district-residence clock does: a compiled
 * count is returned as it stands, and an unresolved one draws from the spread
 * the compiled chambers span, stable for that chamber forever.
 *
 * A caller that needs to know which it got reads `basis`. A caller deciding
 * whether the LAW is known still reads `chamber.seats`, which is unchanged and
 * still says `unknown` — this function answers "how many people sit here",
 * which is a different question.
 */
export function seatsForChamber(
  pack: LegislativeRulePack,
  chamberKey: string,
): ChamberSeatCount | null {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber) return null;
  if (chamber.seats.kind === "known") {
    // A generated pack's own seat count is known WITHIN that pack, but the pack
    // itself is the game's, so the basis follows the pack and not the field.
    // Reporting a generated legislature's seats as researched would be the one
    // claim this whole module exists to avoid.
    return {
      seats: chamber.seats.value,
      // A settled size inside a generated pack carries its own citation.
      basis:
        pack.basis === "game-profile" &&
        chamber.seats.source.authority === "game-profile"
          ? "game-profile"
          : "researched",
    };
  }
  // The Council of State Governments' count of the state's seats, where the
  // pack is a state's and the table lists this chamber.
  const compiled = compiledChamberSeats(pack.jurisdictionKey);
  const isUpper =
    pack.structure === "bicameral" && pack.chamberOrder[1] === chamberKey;
  if (compiled) {
    const seats =
      pack.structure === "bicameral"
        ? isUpper
          ? compiled.upper
          : compiled.lower
        : compiled.unicameral;
    if (seats !== null) return { seats, basis: "researched" };
  }
  const spread = researchedChamberSpread();
  if (spread.lowerSeats.length === 0) return null;

  // ESTIMATED FROM AVERAGE: the middle of the compiled chambers' spread. An
  // upper chamber is estimated from its own lower chamber where there is one,
  // so a senate is never as large as the house it sits beside. A unicameral
  // legislature has no such pair and takes the lower-chamber middle, the only
  // measurement of "a chamber that does the whole job".
  if (isUpper && spread.senatePercentOfHouse.length > 0) {
    const lower = seatsForChamber(pack, pack.chamberOrder[0]!);
    if (lower !== null) {
      return {
        seats: Math.min(
          lower.seats - 1,
          Math.max(
            2,
            Math.round(
              (lower.seats * middleOf(spread.senatePercentOfHouse)) / 100,
            ),
          ),
        ),
        basis: "game-profile",
      };
    }
  }
  return { seats: middleOf(spread.lowerSeats), basis: "game-profile" };
}

// ---------------------------------------------------------------------------
// Real law overrides the draw
// ---------------------------------------------------------------------------

/** What a generated pack ended up using for its override, and where from. */
export interface OverrideThresholdChoice {
  readonly numerator: number;
  readonly denominatorParts: number;
  readonly countedAgainst: VoteDenominator;
  readonly basis: "read" | "game-profile";
  /** The instrument's own words, where a reading supplied them. */
  readonly readBasis: string | null;
  /** Everything the schema could not carry, in the instrument's own terms. */
  readonly unexpressed: readonly string[];
}

/**
 * The override threshold for a state, preferring what was actually read.
 *
 * A drawn threshold that contradicts a constitution we hold is worse than no
 * generator at all, and four states proved it: Tennessee's constitution sets a
 * simple majority where the draw gave two thirds, turning one of the easiest
 * override bars in the country into one of the hardest; North Carolina's is
 * three fifths of those present and voting, which is the whole reason an
 * override there is politically live; Virginia's is two conditions at once;
 * West Virginia's differs between an ordinary bill and an appropriation. So
 * the readings are consulted first and the draw only fills a silence.
 *
 * Two things this deliberately does NOT do.
 *
 * It does not invent a denominator. Where the reading says the instrument
 * counts against "members present and voting" or "the membership entitled
 * under the constitution", it records that those are not the same set as
 * anything `VoteDenominator` names and declines to map. This function keeps the
 * read FRACTION, which is what a player feels — a half and two thirds are the
 * difference between a live override and a dead one — carries the instrument's
 * own words forward in `readBasis`, and says in `unexpressed` that the
 * denominator is the game's nearest rather than the instrument's.
 *
 * And it does not flatten a rule the schema cannot hold. `OverrideForum` in the
 * each-chamber form carries ONE fraction against ONE denominator, so Virginia's
 * second condition and West Virginia's separate appropriations bar have nowhere
 * to live. They are recorded in `unexpressed` and surface in the pack's
 * `unresolvedGaps` rather than being quietly dropped or averaged. Flattening
 * them would be the same failure as promoting a summary into law.
 */
export function overrideThresholdFor(
  stateJurisdictionKey: string,
  drawn: readonly [number, number],
): OverrideThresholdChoice {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1] ?? "";
  const reading = vetoOverrideReadingFor(usps);
  const fallback: OverrideThresholdChoice = {
    numerator: drawn[0],
    denominatorParts: drawn[1],
    countedAgainst: "members-elected",
    basis: "game-profile",
    readBasis: null,
    unexpressed: [],
  };
  if (reading === null || reading.actions.length === 0) return fallback;

  // The ordinary-bill override, where the reading distinguishes one.
  //
  // Picking this by excluding any operation whose name mentions money was the
  // obvious approach and it was wrong twice over. Virginia states one rule for
  // "override-whole-or-item-veto" — the word "item" there is half of a combined
  // operation, not a money-only bar — and excluding it selected Virginia's
  // rule for ACCEPTING a governor's recommendation, which is not an override at
  // all. West Virginia states its ordinary rule as
  // "override-ordinary-nonappropriation-bill", and a match on "appropriation"
  // excludes the very action it names.
  //
  // So the choice is made in two steps: only actions that are overrides at all,
  // then, among those, prefer one the reading does not confine to money.
  const overrides = reading.actions.filter((action) =>
    /override|restore/i.test(action.operation),
  );
  const candidates = overrides.length > 0 ? overrides : reading.actions;
  const ordinary =
    candidates.find(
      (action) =>
        !/^(?!.*non)(?=.*(appropriation|budget|revenue)).*$/i.test(
          action.operation,
        ),
    ) ?? candidates[0]!;
  const chosen = ordinary.thresholds.find(
    (threshold) => threshold.countedAgainst !== null,
  );
  const primary = chosen ?? ordinary.thresholds[0];
  if (!primary) return fallback;

  const unexpressed: string[] = [];
  if (primary.countedAgainst === null) {
    unexpressed.push(
      `${reading.name} counts its override against "${primary.readBasis}" (${reading.locator}), which is not the same set as anything this schema names. The fraction is the instrument's; the denominator is the game's nearest.`,
    );
  }
  for (const other of ordinary.thresholds) {
    if (other === primary) continue;
    unexpressed.push(
      `${reading.name} also requires ${other.numerator} of ${other.denominatorParts} of "${other.readBasis}" for the same override (${reading.locator}). This schema carries one threshold per forum, so that condition is recorded here rather than enforced, and the override is easier in play than the instrument allows.`,
    );
  }
  for (const action of reading.actions) {
    if (action === ordinary) continue;
    const stated = action.thresholds
      .map(
        (threshold) =>
          `${threshold.numerator} of ${threshold.denominatorParts} of "${threshold.readBasis}"`,
      )
      .join(" and ");
    unexpressed.push(
      `${reading.name} sets a separate bar for ${action.operation}: ${stated} (${reading.locator}). An each-chamber forum in this schema carries no per-measure-class threshold, so that is recorded rather than applied.`,
    );
  }

  return {
    numerator: primary.numerator,
    denominatorParts: primary.denominatorParts,
    countedAgainst: primary.countedAgainst ?? "members-elected",
    basis: "read",
    readBasis: primary.readBasis,
    unexpressed,
  };
}

/**
 * The instrument's own citation for a state whose override was read.
 *
 * This is the one place a generated pack points at a real source, and it points
 * at the reading's own locator and URL rather than restating them. Verification
 * is `partial` on purpose: the threshold was read from the instrument, and the
 * rest of the pack around it was not.
 */
function readingCitation(stateJurisdictionKey: string): RuleSourceRef | null {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1] ?? "";
  const reading = vetoOverrideReadingFor(usps);
  if (reading === null) return null;
  return {
    authority: "constitution",
    citation: reading.locator,
    sourceTitle: `${reading.name} — veto override, read from the instrument`,
    sourceUrl: reading.url,
    retrievedAt: null,
    verification: "partial",
    note: `Read for the override threshold only (${reading.researchStatus}). The rest of this legislature is the game's own.`,
  };
}
