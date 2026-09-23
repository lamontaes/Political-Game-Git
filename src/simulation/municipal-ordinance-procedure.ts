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
import { scheduleFutureDueItem } from "./future-transitions";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import type { MunicipalPassageInterval } from "./municipal-government";
import {
  attemptVetoOverride,
  enrollMeasure,
  measureActions,
  measureEnactment,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordEnactment,
  recordExecutiveAction,
  recordExecutiveInaction,
  recordOverridePeriodExpired,
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
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeMeasureRecord,
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
  /** "Reading 1", "Reading 2 and final passage", while it is on the floor. */
  readonly stageLabel: string | null;
  /** The last day the executive may act, while it is on their desk. */
  readonly executiveActsBy: IsoDate | null;
  /** Whether the controlled person holds the executive office. */
  readonly playerIsExecutive: boolean;
  /** The last day the council may reenact it, after a return. */
  readonly overrideBy: IsoDate | null;
  /** What the executive did, once they did it. */
  readonly executiveAction: "signed" | "returned" | "unsigned" | null;
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
  const position = measurePosition(world, measureId);
  const stage =
    pack.ok && position.floorStageKey
      ? pack.pack.chambers[0]!.floorStages.find(
          (candidate) => candidate.stageKey === position.floorStageKey,
        )
      : null;
  const fromIntroduction =
    interval && stage?.stageKey === finalStage?.stageKey
      ? addDays(measure.introducedAt, passageInterval(interval).offset)
      : null;
  const fromLastReading =
    position.phase === "on-floor"
      ? (earliestNextReading(world, reading, measureId)?.date ?? null)
      : null;
  const earliest =
    [fromIntroduction, fromLastReading]
      .filter((date): date is IsoDate => date !== null)
      .sort()
      .at(-1) ?? null;
  const actions = measureActions(world, measureId);
  const presented = actions
    .filter((action) => action.kind === "presented-to-executive")
    .at(-1);
  const window = reading.procedure.mayoralActionWindow;
  const last = [...actions]
    .reverse()
    .find((action) =>
      ["signed", "vetoed", "became-law-without-signature"].includes(
        action.kind,
      ),
    );
  return {
    measureId,
    designation: measure.designation,
    shortTitle: measure.shortTitle,
    phase: measurePosition(world, measureId).phase,
    introducedAt: measure.introducedAt,
    earliestPassageOn: earliest,
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
    stageLabel: position.phase === "on-floor" ? (stage?.label ?? null) : null,
    executiveActsBy:
      position.phase === "awaiting-executive" && presented && window
        ? window.dayBasis === "BUSINESS"
          ? addWeekdays(presented.occurredAt, window.daysToAct)
          : addDays(presented.occurredAt, window.daysToAct)
        : null,
    playerIsExecutive:
      world.control.kind === "person" &&
      executiveHolder(world, governmentKey) === world.control.personId,
    overrideBy:
      position.phase === "awaiting-override"
        ? overrideDeadline(world, governmentKey, measureId)
        : null,
    executiveAction:
      last?.kind === "signed"
        ? "signed"
        : last?.kind === "vetoed"
          ? "returned"
          : last?.kind === "became-law-without-signature"
            ? "unsigned"
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
  return recordCouncilReadingVote(world, input);
}

/**
 * The council's vote on the reading an ordinance is at, with every rule the
 * compiled procedure fixes, whoever is asking. The player's route checks their
 * standing first; a council sitting in the background calls this directly.
 */
export function recordCouncilReadingVote(
  world: World,
  input: PassMunicipalOrdinanceInput,
): MunicipalOrdinanceResult {
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

  const stages = pack.pack.chambers[0]!.floorStages;
  const stageKey = measurePosition(world, measure.id).floorStageKey;
  const finalStage = stageKey === stages.at(-1)?.stageKey;
  const interval = reading.procedure.introductionToPassage ?? null;
  if (interval && finalStage) {
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
  const earliestReading = earliestNextReading(world, reading, measure.id);
  if (earliestReading && world.currentDate < earliestReading.date) {
    return refuse(
      world,
      `Each reading needs ${earliestReading.description} after the one before it; the earliest date for the next reading is ${earliestReading.date}.`,
    );
  }

  const checked = checkCouncilVote(
    world,
    input.governmentKey,
    input.dispositions,
  );
  if (!checked.ok) return refuse(world, checked.reason);

  let next: World;
  try {
    next = takeFloorVote(world, {
      stableKey: `${measure.stableKey}:${stageKey ?? "passage"}:${world.currentDate}`,
      measureId: measure.id,
      dispositions: input.dispositions,
      presentMembers: checked.present,
      electedMembers: checked.seats,
      provenance: input.provenance,
    });
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
  const phase = measurePosition(next, measure.id).phase;
  // Failed, or passed a reading with another still to come.
  if (phase === "failed" || phase === "on-floor") {
    return { ok: true, world: next };
  }
  return {
    ok: true,
    world: afterFinalPassage(next, input.governmentKey, measure),
  };
}

/**
 * Whether a vote is a lawful vote of this council: every ballot a distinct
 * seated member's, and enough members present for a quorum.
 */
function checkCouncilVote(
  world: World,
  governmentKey: string,
  dispositions: readonly LegislativeVoteDisposition[],
):
  | { readonly ok: true; readonly present: number; readonly seats: number }
  | { readonly ok: false; readonly reason: string } {
  const government = municipalGovernmentByKey(governmentKey)!;
  const reading = primaryReading(government);
  const seats = councilSeats(world, governmentKey);
  const seated = new Set(seats.map((seat) => seat.personId));
  const people = new Set<EntityId>();
  for (const entry of dispositions) {
    if (!entry.personId || !seated.has(entry.personId)) {
      return {
        ok: false,
        reason: `This recorded decision is not a vote of ${reading.bodyName ?? reading.displayName}.`,
      };
    }
    if (people.has(entry.personId)) {
      return {
        ok: false,
        reason: "A councilor cannot vote twice on one question.",
      };
    }
    people.add(entry.personId);
  }
  if (seats.length === 0) {
    return { ok: false, reason: "No councilors are seated to vote." };
  }
  const tally = tallyDispositions(dispositions);
  const present = tally.yea + tally.nay + tally.presentNotVoting;
  const quorum = reading.procedure.quorumRule;
  if (!quorum) {
    return {
      ok: false,
      reason: `${reading.displayName} cannot prove a lawful vote: no instrument read states the quorum.`,
    };
  }
  const quorumRule = municipalVoteThresholdRule(
    quorum,
    reading.procedure.quorumText ?? "Quorum.",
    municipalRuleSourceRef(reading, reading.procedure.quorumText ?? "quorum"),
  );
  // A quorum stated against the whole body counts the seats the instrument
  // fixes, not only the seats filled today.
  const membership = Math.max(seats.length, reading.bodySize ?? 0);
  const required = resolveRequiredVotes(
    quorumRule,
    quorumRule.countedAgainst === "members-present"
      ? present
      : quorumRule.countedAgainst === "members-voting"
        ? tally.yea + tally.nay
        : membership,
  );
  if (present < required.requiredVotes) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} cannot transact business: ${reading.procedure.quorumText ?? "the instrument names a quorum"} (${present} present, ${required.requiredVotes} required).`,
    };
  }
  return { ok: true, present, seats: seats.length };
}

/** The earliest date the measure's next reading may be taken, if a rule fixes one. */
function earliestNextReading(
  world: World,
  reading: ReturnType<typeof primaryReading>,
  measureId: EntityId,
): { readonly date: IsoDate; readonly description: string } | null {
  const between = reading.procedure.betweenReadings ?? null;
  if (!between) return null;
  const last = measureActions(world, measureId)
    .filter((action) => action.kind === "floor-stage-passed")
    .at(-1);
  if (!last) return null;
  const rule = passageInterval(between);
  return {
    date: addDays(last.occurredAt, rule.offset),
    description: rule.description,
  };
}

// ---------------------------------------------------------------------------
// After final passage: the executive, an override, and when it takes effect
// ---------------------------------------------------------------------------

export const MUNICIPAL_EXECUTIVE_PLACEHOLDER_ID =
  "ocd-municipal-executive-placeholder/v1";

export const COUNCIL_ACT_EXECUTIVE_DEADLINE =
  "civic:council-act-executive-deadline" as const;
export const COUNCIL_ACT_OVERRIDE_DEADLINE =
  "civic:council-act-override-deadline" as const;

/**
 * Congressional review of the District's acts, D.C. Code § 1-206.02(c)(1):
 * the Chairman transmits the act to the Speaker and the President of the
 * Senate, and it takes effect when a 30-day period (excluding Saturdays,
 * Sundays, holidays and days neither House sits) expires, unless a joint
 * resolution disapproving it is enacted first.
 *
 * PLACEHOLDER, pending `dc-congressional-review-day-count`: the days counted
 * here skip Saturdays and Sundays only. Holidays are not excluded, because no
 * holiday calendar is read, and both Houses are taken to be sitting, because
 * no congressional sitting calendar is read. No joint resolution of
 * disapproval is ever enacted in play.
 */
const CONGRESSIONAL_REVIEW: Readonly<
  Record<string, { readonly days: number; readonly citation: string }>
> = {
  "us-dc-washington": { days: 30, citation: "D.C. Code § 1-206.02(c)(1)" },
};

/** Calendar days allowed to reenact a returned act (D.C. Code § 1-204.04(e)). */
const OVERRIDE_WINDOW_DAYS: Readonly<Record<string, number>> = {
  "us-dc-washington": 30,
};

function isWeekend(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** The date `count` weekdays after `from`, not counting `from` itself. */
export function addWeekdays(from: IsoDate, count: number): IsoDate {
  let date = from;
  let counted = 0;
  while (counted < count) {
    date = addDays(date, 1);
    if (!isWeekend(date)) counted += 1;
  }
  return date;
}

/**
 * The date an act transmitted on `transmittedOn` takes effect: the day after
 * the last day of the review period, counting the day of transmittal when it
 * is a weekday (the period begins on that day).
 */
export function congressionalReviewEffectiveOn(
  transmittedOn: IsoDate,
  days: number,
): IsoDate {
  const firstCounted = isWeekend(transmittedOn) ? 0 : 1;
  const lastDay =
    firstCounted === 1 && days === 1
      ? transmittedOn
      : addWeekdays(transmittedOn, days - firstCounted);
  return addDays(lastDay, 1);
}

/** Whoever holds this government's executive office today, if anyone does. */
function executiveHolder(world: World, governmentKey: string): EntityId | null {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) return null;
  if (government.state === "DC") {
    return (
      currentStateExecutiveHolders(world).find(
        (holder) => holder.stateUsps === "DC",
      )?.personId ?? null
    );
  }
  return (
    municipalSeats(world, governmentKey).find((seat) => seat.role === "mayor")
      ?.personId ?? null
  );
}

function executiveWindow(governmentKey: string) {
  const government = municipalGovernmentByKey(governmentKey)!;
  return primaryReading(government).procedure.mayoralActionWindow;
}

/** Enroll, present, or record as law, whichever the pack says comes next. */
function afterFinalPassage(
  world: World,
  governmentKey: string,
  measure: LegislativeMeasureRecord,
): World {
  const government = municipalGovernmentByKey(governmentKey)!;
  const reading = primaryReading(government);
  let next = enrollMeasure(world, {
    stableKey: `${measure.stableKey}:enrolled`,
    measureId: measure.id,
  });
  if (measurePosition(next, measure.id).phase === "awaiting-enactment") {
    const effectiveFromPassage =
      reading.procedure.effectivePublication?.includes(
        "from the date of its passage",
      ) === true;
    return recordEnactment(next, {
      stableKey: `${measure.stableKey}:enactment`,
      measureId: measure.id,
      actDesignation: measure.designation,
      effectiveAt: effectiveFromPassage ? next.currentDate : null,
    });
  }
  next = presentMeasureToExecutive(next, {
    stableKey: `${measure.stableKey}:presented`,
    measureId: measure.id,
  });
  const window = executiveWindow(governmentKey);
  if (!window) return next;
  const dueAt =
    window.dayBasis === "BUSINESS"
      ? addWeekdays(next.currentDate, window.daysToAct)
      : addDays(next.currentDate, window.daysToAct);
  // The executive's desk is looked at on the last day to act. An executive the
  // player does not control signs then (a placeholder, below); a player who
  // holds the office decides for themselves, and the pack's rule for silence
  // applies the day after.
  return scheduleFutureDueItem(next, {
    stableKey: `${measure.stableKey}:executive-deadline`,
    dueAt,
    transitionKey: COUNCIL_ACT_EXECUTIVE_DEADLINE,
    entityIds: [measure.id],
    jurisdictionId: measure.jurisdictionId,
    provenance: {
      kind: "authored",
      note: `The ${window.daysToAct}-${window.dayBasis === "BUSINESS" ? "weekday" : "day"} period to act on ${measure.designation} closes on ${dueAt}${
        window.dayBasis === "BUSINESS"
          ? "; holidays are not excluded (placeholder pending dc-congressional-review-day-count)"
          : ""
      }.`,
    },
  });
}

/** Record a measure the executive approved, or the council reenacted, as law. */
function enactCouncilMeasure(
  world: World,
  governmentKey: string,
  measure: LegislativeMeasureRecord,
): World {
  const review = CONGRESSIONAL_REVIEW[governmentKey];
  const government = municipalGovernmentByKey(governmentKey)!;
  const reading = primaryReading(government);
  const effectiveAt = review
    ? congressionalReviewEffectiveOn(world.currentDate, review.days)
    : reading.procedure.effectivePublication?.includes(
          "from the date of its passage",
        )
      ? world.currentDate
      : null;
  return recordEnactment(world, {
    stableKey: `${measure.stableKey}:enactment`,
    measureId: measure.id,
    actDesignation: measure.designation,
    effectiveAt,
  });
}

function measureOfThisCouncil(
  world: World,
  governmentKey: string,
  measureId: EntityId,
) {
  return councilMeasure(world, governmentKey, measureId);
}

/**
 * The executive's own decision on an act presented to them: sign it, or
 * return it with reasons. Only the person who holds the office decides.
 */
export function actOnCouncilMeasure(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly measureId: EntityId;
    readonly decision: "sign" | "return";
    readonly reasons?: string;
  },
): MunicipalOrdinanceResult {
  if (world.control.kind !== "person") {
    return refuse(world, "Person control is required.");
  }
  const measure = measureOfThisCouncil(
    world,
    input.governmentKey,
    input.measureId,
  );
  if (!measure)
    return refuse(world, "That measure is not before this council.");
  if (measurePosition(world, measure.id).phase !== "awaiting-executive") {
    return refuse(
      world,
      "Nothing is waiting on the executive for this measure.",
    );
  }
  if (executiveHolder(world, input.governmentKey) !== world.control.personId) {
    return refuse(
      world,
      "Only the person who holds the executive office acts on it.",
    );
  }
  if (input.decision === "sign") {
    const signed = recordExecutiveAction(world, {
      stableKey: `${measure.stableKey}:executive`,
      measureId: measure.id,
      action: "signed",
      rationale: "Approved and signed.",
    });
    return {
      ok: true,
      world: enactCouncilMeasure(signed, input.governmentKey, measure),
    };
  }
  let next = recordExecutiveAction(world, {
    stableKey: `${measure.stableKey}:executive`,
    measureId: measure.id,
    action: "vetoed",
    rationale:
      input.reasons?.trim() ||
      "Returned to the council with written reasons for disapproval.",
  });
  const days = OVERRIDE_WINDOW_DAYS[input.governmentKey];
  if (days) {
    next = scheduleFutureDueItem(next, {
      stableKey: `${measure.stableKey}:override-deadline`,
      dueAt: addDays(next.currentDate, days + 1),
      transitionKey: COUNCIL_ACT_OVERRIDE_DEADLINE,
      entityIds: [measure.id],
      jurisdictionId: measure.jurisdictionId,
      provenance: {
        kind: "authored",
        note: `The council may reenact ${measure.designation} within ${days} calendar days of its return.`,
      },
    });
  }
  return { ok: true, world: next };
}

/** The last day the council may reenact a returned measure, if a rule fixes one. */
export function overrideDeadline(
  world: World,
  governmentKey: string,
  measureId: EntityId,
): IsoDate | null {
  const days = OVERRIDE_WINDOW_DAYS[governmentKey];
  const vetoed = measureActions(world, measureId)
    .filter((action) => action.kind === "vetoed")
    .at(-1);
  return days && vetoed ? addDays(vetoed.occurredAt, days) : null;
}

/** The council votes to reenact a measure the executive returned. */
export function overrideCouncilVeto(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly measureId: EntityId;
    readonly dispositions: readonly LegislativeVoteDisposition[];
    readonly provenance: LegislativeVoteProvenance;
  },
): MunicipalOrdinanceResult {
  const authority = memberAuthority(
    world,
    input.governmentKey,
    "vote-on-ordinance",
  );
  if (!authority.ok) return refuse(world, authority.reason);
  const measure = measureOfThisCouncil(
    world,
    input.governmentKey,
    input.measureId,
  );
  if (!measure)
    return refuse(world, "That measure is not before this council.");
  if (measurePosition(world, measure.id).phase !== "awaiting-override") {
    return refuse(world, "There is no returned measure here to reconsider.");
  }
  const deadline = overrideDeadline(world, input.governmentKey, measure.id);
  if (deadline && world.currentDate > deadline) {
    return refuse(
      world,
      `The time to reenact ${measure.designation} ended on ${deadline}.`,
    );
  }
  const checked = checkCouncilVote(
    world,
    input.governmentKey,
    input.dispositions,
  );
  if (!checked.ok) return refuse(world, checked.reason);
  let next: World;
  try {
    next = attemptVetoOverride(world, {
      stableKey: `${measure.stableKey}:override:${world.currentDate}`,
      measureId: measure.id,
      forums: [
        {
          forumKey: "council",
          dispositions: input.dispositions,
          presentMembers: checked.present,
          electedMembers: checked.seats,
        },
      ],
      rationale:
        "The council voted on reenacting the measure over the executive's return.",
      provenance: input.provenance,
    });
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
  if (measurePosition(next, measure.id).phase === "awaiting-enactment") {
    next = enactCouncilMeasure(next, input.governmentKey, measure);
  }
  return { ok: true, world: next };
}

function resolved(
  world: World,
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function councilOfMeasure(measure: LegislativeMeasureRecord): string | null {
  const match = /^municipal-measure:(.+?):/.exec(measure.stableKey);
  return match ? match[1]! : null;
}

/** The executive's time ran out: silence decides, as the pack says it does. */
export function councilActExecutiveDeadlineHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const measure = world.history.legislativeMeasures?.find((m) =>
    due.entityIds.includes(m.id),
  );
  if (!measure) return resolved(world, "No measure matches.");
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    return resolved(world, "The executive already acted.");
  const governmentKey = councilOfMeasure(measure);
  if (!governmentKey) return resolved(world, "No council matches.");
  const window = executiveWindow(governmentKey);
  if (window?.inactionOutcome !== "BECOMES_LAW_WITHOUT_SIGNATURE")
    return resolved(
      world,
      "No rule says what the executive's silence does here.",
    );
  const holder = executiveHolder(world, governmentKey);
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  if (holder && holder !== player) {
    // PLACEHOLDER, pending `dc-mayor-action-on-council-acts`: an executive the
    // player does not control signs every act on the last day to act. How
    // often a mayor signs, lets an act pass unsigned or returns one is not
    // read, and how an executive decides is not modeled.
    const signed = recordExecutiveAction(world, {
      stableKey: `${measure.stableKey}:executive`,
      measureId: measure.id,
      action: "signed",
      rationale: `${MUNICIPAL_EXECUTIVE_PLACEHOLDER_ID}: signed on the last day to act; how this executive decides is not modeled.`,
    });
    return resolved(
      enactCouncilMeasure(signed, governmentKey, measure),
      "Signed.",
    );
  }
  const presented = measureActions(world, measure.id)
    .filter((action) => action.kind === "presented-to-executive")
    .at(-1);
  const lastDay = presented
    ? window.dayBasis === "BUSINESS"
      ? addWeekdays(presented.occurredAt, window.daysToAct)
      : addDays(presented.occurredAt, window.daysToAct)
    : world.currentDate;
  if (world.currentDate <= lastDay) {
    return resolved(
      scheduleFutureDueItem(world, {
        stableKey: `${measure.stableKey}:executive-silence-due`,
        dueAt: addDays(lastDay, 1),
        transitionKey: COUNCIL_ACT_EXECUTIVE_DEADLINE,
        entityIds: [measure.id],
        jurisdictionId: measure.jurisdictionId,
        provenance: {
          kind: "authored",
          note: `The time to act on ${measure.designation} ends on ${lastDay}.`,
        },
      }),
      "The executive still has today to act.",
    );
  }
  const next = recordExecutiveInaction(world, {
    stableKey: `${measure.stableKey}:executive-silence`,
    measureId: measure.id,
    rationale: `Not returned within ${window.daysToAct} days of presentment, so deemed approved.`,
  });
  return resolved(
    enactCouncilMeasure(next, governmentKey, measure),
    "Deemed approved.",
  );
}

/** The time to reenact a returned measure ran out. */
export function councilActOverrideDeadlineHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const measure = world.history.legislativeMeasures?.find((m) =>
    due.entityIds.includes(m.id),
  );
  if (!measure) return resolved(world, "No measure matches.");
  if (measurePosition(world, measure.id).phase !== "awaiting-override")
    return resolved(world, "The council already decided.");
  return resolved(
    recordOverridePeriodExpired(world, {
      stableKey: `${measure.stableKey}:override-expired`,
      measureId: measure.id,
      rationale: "The council did not reenact the measure in the time allowed.",
    }),
    "The return stands.",
  );
}

export const COUNCIL_ACT_HANDLERS = [
  [COUNCIL_ACT_EXECUTIVE_DEADLINE, councilActExecutiveDeadlineHandler],
  [COUNCIL_ACT_OVERRIDE_DEADLINE, councilActOverrideDeadlineHandler],
] as const;

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
