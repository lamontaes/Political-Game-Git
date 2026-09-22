/**
 * A municipal ordinance from introduction to a recorded effective outcome.
 *
 * Everything here moves the ordinance through the shared legislative measure
 * family: `placeMeasureOnCalendar`, `takeFloorVote`, `enrollMeasure` and
 * `recordEnactment`. The pack decides the stages, the passage threshold,
 * whether anything is presented and when the result takes effect; this module
 * adds only the conditions a pack's vocabulary cannot carry, each read from
 * the government's compiled procedure:
 *
 * - the least time between introduction and passage (Charlottesville City
 *   Code § 2-97: at least three days must intervene), and
 * - a quorum stated as an absolute count (Charter § 12: three councilors).
 *
 * Nobody's vote is invented. The caller supplies every member disposition and
 * says where it came from; a member cannot vote twice, a non-member cannot
 * vote, and a meeting short of its quorum transacts nothing.
 *
 * Financial ordinances are not ordinary ordinances. `admitCouncilAction`
 * answers what an appropriation, tax or borrowing needs under Code of Virginia
 * § 15.2-1428 and City Code § 2-98, and this module's passage writer refuses
 * them: the funded-service chain belongs to its own owner.
 */

import { addDays } from "./dates";
import type { MunicipalPassageInterval } from "./municipal-government";
import {
  enrollMeasure,
  measureEnactment,
  measurePosition,
  placeMeasureOnCalendar,
  recordEnactment,
  requireMeasure,
  takeFloorVote,
  tallyDispositions,
} from "./legislation";
import { resolveRequiredVotes } from "./legislature-rules";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
  municipalRuleSourceRef,
  municipalVoteThresholdRule,
  primaryReading,
} from "./municipal-government";
import {
  municipalActionAuthority,
  municipalMeasureKey,
  municipalMeasures,
  municipalSeats,
} from "./municipal-public-work";
import type {
  EntityId,
  IsoDate,
  LegislativeVoteDisposition,
  LegislativeVoteProvenance,
  World,
} from "./types";

export const MUNICIPAL_ORDINANCE_PROCEDURE_VERSION = "municipal-ordinance/v1";
export const RULES_MUNICIPAL_AUTHORITY_VERSION = "rules-municipal-authority/v1";

export type MunicipalOrdinanceResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };

function passageInterval(interval: MunicipalPassageInterval) {
  return interval.basis === "ELAPSED_DAYS"
    ? {
        offset: interval.minimumElapsedDays,
        description: `at least ${interval.minimumElapsedDays} elapsed days`,
      }
    : {
        offset: interval.minimumInterveningDays + 1,
        description: `at least ${interval.minimumInterveningDays} whole intervening days`,
      };
}

function refuse(world: World, reason: string): MunicipalOrdinanceResult {
  return { ok: false, world, reason };
}

/** " (citation)" for one compiled fact, or nothing when none is recorded. */
function citationFor(
  reading: ReturnType<typeof primaryReading>,
  path: string,
): string {
  const citation = reading.facts.find((fact) => fact.path === path)
    ?.evidence?.[0]?.locator.citation;
  return citation ? ` (${citation})` : "";
}

function councilSeats(world: World, governmentKey: string) {
  return municipalSeats(world, governmentKey).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
}

/** The ordinance record, only if it belongs to this government's council. */
function councilMeasure(
  world: World,
  governmentKey: string,
  measureId: EntityId,
) {
  return (
    municipalMeasures(world, governmentKey).find(
      (measure) => measure.id === measureId,
    ) ?? null
  );
}

function memberAuthority(
  world: World,
  governmentKey: string,
  action: "introduce-ordinance" | "vote-on-ordinance",
) {
  if (world.control.kind !== "person") {
    return { ok: false as const, reason: "Person control is required." };
  }
  return municipalActionAuthority(world, {
    governmentKey,
    personId: world.control.personId,
    residentPlaceGeoid: null,
    action,
  });
}

// ---------------------------------------------------------------------------
// Where an ordinance stands
// ---------------------------------------------------------------------------

export interface MunicipalOrdinanceStatus {
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly phase: string;
  readonly introducedAt: IsoDate;
  /** The first date a passage vote is valid, where a source fixes one. */
  readonly earliestPassageOn: IsoDate | null;
  readonly passageRule: string | null;
  readonly timingRule: string | null;
  readonly quorumRule: string | null;
  readonly effectiveRule: string | null;
  readonly enactment: {
    readonly resolvedAt: IsoDate;
    readonly effectiveAt: IsoDate | null;
  } | null;
}

/** Read-only projection of one council ordinance. Never writes. */
export function municipalOrdinanceStatus(
  world: World,
  governmentKey: string,
  measureId: EntityId,
): MunicipalOrdinanceStatus | null {
  const measure = councilMeasure(world, governmentKey, measureId);
  const government = municipalGovernmentByKey(governmentKey);
  if (!measure || !government) return null;
  const reading = primaryReading(government);
  const pack = municipalRulePackFor(government);
  const interval = reading.procedure.introductionToPassage ?? null;
  const enactment = measureEnactment(world, measureId);
  const finalStage = pack.ok ? pack.pack.chambers[0]!.floorStages.at(-1) : null;
  return {
    measureId,
    designation: measure.designation,
    shortTitle: measure.shortTitle,
    phase: measurePosition(world, measureId).phase,
    introducedAt: measure.introducedAt,
    earliestPassageOn: interval
      ? addDays(measure.introducedAt, passageInterval(interval).offset)
      : null,
    passageRule:
      finalStage?.vote.kind === "known" ? finalStage.vote.value.label : null,
    timingRule: interval
      ? `Passage requires ${passageInterval(interval).description} between introduction and passage${citationFor(reading, "legislativeProcedure.introductionToPassage")}.`
      : null,
    quorumRule: reading.procedure.quorumText,
    effectiveRule: reading.procedure.effectivePublication,
    enactment: enactment
      ? { resolvedAt: enactment.resolvedAt, effectiveAt: enactment.effectiveAt }
      : null,
  };
}

/** Every ordinance before this council, oldest first. */
export function municipalOrdinanceStatuses(
  world: World,
  governmentKey: string,
): readonly MunicipalOrdinanceStatus[] {
  return municipalMeasures(world, governmentKey)
    .map((measure) =>
      municipalOrdinanceStatus(world, governmentKey, measure.id),
    )
    .filter((status): status is MunicipalOrdinanceStatus => status !== null);
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

/**
 * A councilor puts an introduced ordinance on the council's floor calendar.
 *
 * Only where the pack establishes that no committee stage stands between
 * introduction and the floor; otherwise the shared engine refuses.
 */
export function placeMunicipalOrdinanceOnAgenda(
  world: World,
  input: { readonly governmentKey: string; readonly measureId: EntityId },
): MunicipalOrdinanceResult {
  const authority = memberAuthority(
    world,
    input.governmentKey,
    "introduce-ordinance",
  );
  if (!authority.ok) return refuse(world, authority.reason);
  const measure = councilMeasure(world, input.governmentKey, input.measureId);
  if (!measure) {
    return refuse(world, "That ordinance is not before this council.");
  }
  const phase = measurePosition(world, measure.id).phase;
  if (phase === "on-floor") {
    return refuse(world, "This ordinance is already on the council's agenda.");
  }
  try {
    return {
      ok: true,
      world: placeMeasureOnCalendar(world, {
        stableKey: `${measure.stableKey}:agenda`,
        measureId: measure.id,
        rationale:
          "Placed on the council agenda; the council's procedure puts no committee stage between introduction and passage.",
      }),
    };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

export interface PassMunicipalOrdinanceInput {
  readonly governmentKey: string;
  readonly measureId: EntityId;
  /** Every seated member's disposition on passage. Never invented here. */
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Take the council's recorded passage vote and, if it carries, record the
 * ordinance as enacted with its effective date.
 *
 * The effective date is the passage date where the compiled procedure says an
 * ordinance takes effect from passage; nothing later is invented.
 */
export function passMunicipalOrdinance(
  world: World,
  input: PassMunicipalOrdinanceInput,
): MunicipalOrdinanceResult {
  const authority = memberAuthority(
    world,
    input.governmentKey,
    "vote-on-ordinance",
  );
  if (!authority.ok) return refuse(world, authority.reason);
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) return refuse(world, "No municipal government is compiled.");
  const reading = primaryReading(government);
  const pack = municipalRulePackFor(government);
  if (!pack.ok) {
    return refuse(
      world,
      pack.missing.map((entry) => `${entry.field} — ${entry.reason}`).join(" "),
    );
  }
  const measure = councilMeasure(world, input.governmentKey, input.measureId);
  if (!measure)
    return refuse(world, "That ordinance is not before this council.");
  if (measure.subjectClass !== "general-policy") {
    return refuse(
      world,
      "Appropriations, taxes and borrowing follow their own recorded-majority rule; this is not the general-ordinance route.",
    );
  }
  if (measurePosition(world, measure.id).phase !== "on-floor") {
    return refuse(
      world,
      "The ordinance has to be on the council's agenda before the council can vote on it.",
    );
  }

  const interval = reading.procedure.introductionToPassage ?? null;
  if (interval) {
    const earliest = addDays(
      measure.introducedAt,
      passageInterval(interval).offset,
    );
    if (world.currentDate < earliest) {
      return refuse(
        world,
        `A general ordinance requires ${passageInterval(interval).description} between its introduction on ${measure.introducedAt} and passage; the earliest valid passage date is ${earliest}. ${interval.sameDayException ? `The stated exception (${interval.sameDayException}) is not supported by this route.` : "No earlier-passage exception is established for this route."}`,
      );
    }
  }

  // Every disposition must be a distinct seated member of this council.
  const seats = councilSeats(world, input.governmentKey);
  const seated = new Set(seats.map((seat) => seat.personId));
  const people = new Set<EntityId>();
  for (const entry of input.dispositions) {
    if (!entry.personId || !seated.has(entry.personId)) {
      return refuse(
        world,
        `This recorded decision is not a vote of ${reading.bodyName ?? reading.displayName}.`,
      );
    }
    if (people.has(entry.personId)) {
      return refuse(world, "A councilor cannot vote twice on one question.");
    }
    people.add(entry.personId);
  }
  if (seats.length === 0) {
    return refuse(world, "No councilors are seated to vote.");
  }

  const tally = tallyDispositions(input.dispositions);
  const present = tally.yea + tally.nay + tally.presentNotVoting;
  const quorum = reading.procedure.quorumRule;
  if (!quorum) {
    return refuse(
      world,
      `${reading.displayName} cannot prove a lawful vote: no instrument read states the quorum.`,
    );
  }
  const quorumRule = municipalVoteThresholdRule(
    quorum,
    reading.procedure.quorumText ?? "Quorum.",
    municipalRuleSourceRef(reading, reading.procedure.quorumText ?? "quorum"),
  );
  const required = resolveRequiredVotes(
    quorumRule,
    quorumRule.countedAgainst === "members-present"
      ? present
      : quorumRule.countedAgainst === "members-voting"
        ? tally.yea + tally.nay
        : seats.length,
  );
  if (present < required.requiredVotes) {
    return refuse(
      world,
      `${reading.bodyName ?? reading.displayName} cannot transact business: ${reading.procedure.quorumText ?? "the instrument names a quorum"} (${present} present, ${required.requiredVotes} required).`,
    );
  }

  let next: World;
  try {
    next = takeFloorVote(world, {
      stableKey: `${measure.stableKey}:passage:${world.currentDate}`,
      measureId: measure.id,
      dispositions: input.dispositions,
      presentMembers: present,
      electedMembers: seats.length,
      provenance: input.provenance,
    });
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
  if (measurePosition(next, measure.id).phase === "failed") {
    return { ok: true, world: next };
  }
  const effectiveFromPassage =
    reading.procedure.effectivePublication?.includes(
      "from the date of its passage",
    ) === true;
  next = enrollMeasure(next, {
    stableKey: `${measure.stableKey}:enrolled`,
    measureId: measure.id,
  });
  next = recordEnactment(next, {
    stableKey: `${measure.stableKey}:enactment`,
    measureId: measure.id,
    actDesignation: measure.designation,
    effectiveAt: effectiveFromPassage ? next.currentDate : null,
  });
  return { ok: true, world: next };
}

// ---------------------------------------------------------------------------
// rules-municipal-authority/v1 — what a council action needs
// ---------------------------------------------------------------------------

export type CouncilActionKind =
  "ORDINANCE" | "APPROPRIATION" | "TAX_LEVY" | "BORROWING";

export type CouncilVoteBasis =
  "MAJORITY_PRESENT_AND_VOTING" | "MAJORITY_OF_ALL_ELECTED_MEMBERS";

export type CouncilActionAdmission =
  | {
      readonly ruleVersion: typeof RULES_MUNICIPAL_AUTHORITY_VERSION;
      readonly admitted: true;
      readonly requiredVote: {
        readonly basis: CouncilVoteBasis;
        readonly recordedYeaNay: boolean;
        readonly citations: readonly string[];
      };
      readonly minimumInterveningDays: number | null;
      readonly vetoApplies: false;
      readonly unresolved: readonly string[];
    }
  | {
      readonly ruleVersion: typeof RULES_MUNICIPAL_AUTHORITY_VERSION;
      readonly admitted: false;
      readonly reason:
        "NOT_A_MEMBER" | "UNSUPPORTED_JURISDICTION" | "FIELD_UNKNOWN";
      readonly unknownField: string | null;
      readonly detail: string;
      readonly citations: readonly string[];
    };

/** The date Ord. No. O-26-017 last amended City Code § 2-98. */
const CVILLE_2_98_AMENDED_ON = "2026-02-02";

/**
 * What one council action needs, for one member, on one date.
 *
 * Only Charlottesville is admitted, and only on what was read: § 15.2-1428
 * (appropriations over $500, taxes, borrowing: a recorded affirmative majority
 * of all elected members), City Code § 2-98 in the text current from
 * 2026-02-02 (over $100, a majority of all members elected, ayes and noes
 * entered; over $5,000, taxes or borrowing, three intervening days), and City
 * Code § 2-97 for ordinary ordinances. There is no mayoral veto to apply.
 */
export function admitCouncilAction(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly actorPersonId: EntityId;
    readonly kind: CouncilActionKind;
    readonly amountUsd?: number;
    readonly onDate: IsoDate;
  },
): CouncilActionAdmission {
  const version = RULES_MUNICIPAL_AUTHORITY_VERSION;
  if (input.governmentKey !== "us-va-charlottesville") {
    return {
      ruleVersion: version,
      admitted: false,
      reason: "UNSUPPORTED_JURISDICTION",
      unknownField: null,
      detail:
        "No council-action rule has been compiled for this government yet.",
      citations: [],
    };
  }
  const standing = municipalActionAuthority(world, {
    governmentKey: input.governmentKey,
    personId: input.actorPersonId,
    residentPlaceGeoid: null,
    action: "vote-on-ordinance",
  });
  if (!standing.ok && standing.kind === "standing") {
    return {
      ruleVersion: version,
      admitted: false,
      reason: "NOT_A_MEMBER",
      unknownField: null,
      detail: standing.reason,
      citations: [],
    };
  }
  if (!standing.ok) {
    return {
      ruleVersion: version,
      admitted: false,
      reason: "FIELD_UNKNOWN",
      unknownField: "ordinance procedure",
      detail: standing.reason,
      citations: [],
    };
  }
  if (input.kind === "ORDINANCE") {
    return {
      ruleVersion: version,
      admitted: true,
      requiredVote: {
        basis: "MAJORITY_PRESENT_AND_VOTING",
        recordedYeaNay: true,
        citations: [
          "Code of Virginia § 15.2-1427(A)",
          "City Code § 2-78",
          "Charter § 12",
        ],
      },
      minimumInterveningDays: 3,
      vetoApplies: false,
      unresolved: [
        "City Code § 2-97's four-fifths same-day exception does not say what the fraction counts.",
      ],
    };
  }
  if (input.kind === "APPROPRIATION" && input.amountUsd === undefined) {
    return {
      ruleVersion: version,
      admitted: false,
      reason: "FIELD_UNKNOWN",
      unknownField: "amountUsd",
      detail:
        "Whether § 15.2-1428 and City Code § 2-98 apply turns on the amount appropriated.",
      citations: ["Code of Virginia § 15.2-1428", "City Code § 2-98"],
    };
  }
  const current2_98 = input.onDate >= CVILLE_2_98_AMENDED_ON;
  const amount = input.amountUsd ?? 0;
  const stateRuleApplies = input.kind !== "APPROPRIATION" || amount > 500;
  const cityRuleApplies =
    current2_98 && (input.kind !== "APPROPRIATION" || amount > 100);
  if (!stateRuleApplies && !current2_98) {
    return {
      ruleVersion: version,
      admitted: false,
      reason: "FIELD_UNKNOWN",
      unknownField: "City Code § 2-98 before 2026-02-02",
      detail:
        "The acquired City Code shows § 2-98 as amended on 2026-02-02; the text in force before then was not retrieved, and a small appropriation's vote rule then turns on it.",
      citations: ["City Code § 2-98"],
    };
  }
  const intervening =
    current2_98 && (input.kind !== "APPROPRIATION" || amount > 5000)
      ? 3
      : current2_98
        ? null
        : null;
  return {
    ruleVersion: version,
    admitted: true,
    requiredVote: {
      basis:
        stateRuleApplies || cityRuleApplies
          ? "MAJORITY_OF_ALL_ELECTED_MEMBERS"
          : "MAJORITY_PRESENT_AND_VOTING",
      recordedYeaNay: true,
      citations: [
        ...(stateRuleApplies ? ["Code of Virginia § 15.2-1428"] : []),
        ...(cityRuleApplies ? ["City Code § 2-98(a)"] : []),
        "Charter § 12",
      ],
    },
    minimumInterveningDays: intervening,
    vetoApplies: false,
    unresolved: current2_98
      ? []
      : [
          "City Code § 2-98 before its 2026-02-02 amendment was not retrieved; only Code of Virginia § 15.2-1428 is applied on this date.",
        ],
  };
}

/** The measure stable key an ordinance of this designation is filed under. */
export function municipalOrdinanceMeasureKey(
  governmentKey: string,
  designation: string,
): string {
  return municipalMeasureKey(governmentKey, designation);
}

/** Convenience for callers holding only a measure id. */
export function municipalOrdinanceMeasure(world: World, measureId: EntityId) {
  return requireMeasure(world, measureId);
}
