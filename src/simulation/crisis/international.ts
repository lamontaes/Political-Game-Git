import { addDays, daysBetween, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { SeededRng } from "../rng";
import type {
  EntityId,
  EventVisibility,
  FutureDueItem,
  FutureTransitionHandler,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt, recordPersonDeath } from "../vitality";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { recordOfficialContinuity } from "./continuity";
import { beginHealthEpisode } from "./health";
import { closeHealthEpisodesForDeath } from "./health-queries";
import { currentPresidentOf } from "./offices";
import { appendCrisisRecord, crisisRecordId, crisisRecords } from "./records";
import {
  CRISIS_PROVISIONAL_POLICY,
  type CounterpartyResponseRecord,
  type CrisisDecisionRecord,
  type CrisisOptionKey,
  type CrisisOptionsRecord,
  type IntelligenceAssessmentRecord,
  type IntelligenceConfidence,
  type InternationalCrisisRecord,
  type TensionLevel,
  type WarPowersRecord,
  type WarPowersStage,
} from "./types";

/**
 * K5 international crisis, first depth: strategic decisions under
 * uncertainty, not a war simulator.
 *
 * incident → imperfect intelligence → competing options → the President's
 * decision → the counterparty's and allies' own responses → another cycle or
 * an end. Only the force-capable option starts a War Powers clock
 * (50 U.S.C. §1543(a) report within 48 hours; §1544(b) 60-day termination
 * absent authorization; §1544(b) 30-day extension on certification).
 */

export const INTERNATIONAL_DECISION_KEY =
  "crisis:international-decision" as const;
export const INTERNATIONAL_RESPONSE_KEY =
  "crisis:international-response" as const;
export const WAR_POWERS_KEY = "crisis:war-powers" as const;

const MICRO = 1_000_000;
const TENSIONS: readonly TensionLevel[] = ["low", "elevated", "high", "severe"];

/** crunch46-provisional-v1 authored balancing, not empirical frequencies. */
export const PROVISIONAL_INTERNATIONAL_POLICY = Object.freeze({
  version: CRISIS_PROVISIONAL_POLICY,
  optionsAfterDays: 2,
  responseAfterDays: 5,
  nextCycleAfterDays: 14,
  /**
   * A computational checkpoint, not a narrative ending (CRUNCH47 C2). After
   * this many cycles the crisis keeps running at the slower review interval
   * below; only an actual settlement, withdrawal, lapse or escalation record
   * ends it.
   */
  maxCycles: 3,
  /** Review interval once a crisis has passed its cycle checkpoint. */
  checkpointReviewAfterDays: 30,
  /**
   * With no recorded movement for this long, the dispute lapses. That lapse
   * is itself a record, not an expiry of the crisis's existence.
   */
  lapseAfterQuietDays: 180,
  /** Counterparty response shares in millionths: de-escalate, hold (rest escalates). */
  counterparty: {
    diplomatic: { deEscalate: 350_000, hold: 450_000 },
    economic: { deEscalate: 300_000, hold: 400_000 },
    "force-posture": { deEscalate: 400_000, hold: 300_000 },
  } satisfies Record<CrisisOptionKey, { deEscalate: number; hold: number }>,
  /** Severe tension moves this much from de-escalation to escalation. */
  severeShift: 100_000,
  allySupport: {
    diplomatic: 700_000,
    economic: 500_000,
    "force-posture": 400_000,
  } satisfies Record<CrisisOptionKey, number>,
  /** Chance a represented attempt leaves the target injured / killed. */
  violence: { injured: 300_000, killed: 100_000 },
  warPowers: { reportWithinDays: 2, terminationDays: 60, extensionDays: 30 },
});

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function roll(world: World, key: readonly unknown[]): number {
  return new SeededRng("crisis-international-v1")
    .fork(JSON.stringify(["crisis-international-v1", world.seed, ...key]))
    .integer(0, MICRO);
}

function nationalJurisdiction(world: World): EntityId {
  return world.jurisdictionOrder[0]!;
}

function event(
  world: World,
  input: {
    readonly stableKey: string;
    readonly type: `${string}.${string}`;
    readonly involvedEntityIds: readonly EntityId[];
    readonly actorPersonId?: EntityId | null;
    readonly visibility: EventVisibility;
    readonly tags: readonly string[];
    readonly summary: string;
  },
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: nationalJurisdiction(world),
    involvedEntityIds: [...new Set(input.involvedEntityIds)].sort(),
    participants: input.actorPersonId
      ? [
          {
            personId: input.actorPersonId,
            role: "agency:decision-maker",
            detail: "us-president",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: ["crisis", "crisis.international", ...input.tags],
    summary: input.summary,
    context: EMPTY_CONTEXT,
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

function crisisOf(world: World, crisisId: EntityId): InternationalCrisisRecord {
  const record = crisisRecords(world).find((r) => r.id === crisisId);
  if (!record || record.kind !== "international-crisis")
    throw new Error(`Unknown international crisis: ${crisisId}`);
  return record;
}

function recordsOf<K extends string, R extends { kind: K; crisisId: EntityId }>(
  world: World,
  kind: K,
  crisisId: EntityId,
): R[] {
  return crisisRecords(world).filter(
    (record) =>
      record.kind === kind &&
      (record as unknown as { crisisId: EntityId }).crisisId === crisisId,
  ) as unknown as R[];
}

export function internationalCrisisState(world: World, crisisId: EntityId) {
  const crisis = crisisOf(world, crisisId);
  const responses = recordsOf<
    "counterparty-response",
    CounterpartyResponseRecord
  >(world, "counterparty-response", crisisId);
  const decisions = recordsOf<"crisis-decision", CrisisDecisionRecord>(
    world,
    "crisis-decision",
    crisisId,
  );
  const options = recordsOf<"crisis-options", CrisisOptionsRecord>(
    world,
    "crisis-options",
    crisisId,
  );
  const warPowers = recordsOf<"war-powers", WarPowersRecord>(
    world,
    "war-powers",
    crisisId,
  );
  const cycle = options.at(-1)?.cycle ?? 0;
  const forcesIn =
    warPowers.some((r) => r.stage === "forces-introduced") &&
    !warPowers.some((r) => r.stage === "forces-withdrawn");
  return {
    crisis,
    tension: responses.at(-1)?.tensionAfter ?? crisis.tension,
    ended: responses.some((r) => r.ended),
    cycle,
    assessments: recordsOf<
      "intelligence-assessment",
      IntelligenceAssessmentRecord
    >(world, "intelligence-assessment", crisisId),
    options,
    decisions,
    responses,
    warPowers,
    forcesIn,
    awaitingDecision:
      options.length > 0 && !decisions.some((d) => d.cycle === cycle),
  };
}

export interface DeclareInternationalCrisisInput {
  readonly stableKey: string;
  readonly counterpartyLabel: string;
  readonly allyLabels: readonly string[];
  readonly subject: string;
  readonly tension: TensionLevel;
  readonly basis: string;
}

/** An international incident the World declares; the player is not its cause. */
export function declareInternationalCrisis(
  world: World,
  input: DeclareInternationalCrisisInput,
): World {
  for (const text of [input.counterpartyLabel, input.subject, input.basis])
    if (!text.trim()) throw new Error("An international crisis needs text.");
  const key = `crisis:international:${input.stableKey}`;
  const occurred = event(world, {
    stableKey: `${key}:event`,
    type: "crisis.international-incident",
    involvedEntityIds: [world.id],
    visibility: "public",
    tags: [`tension:${input.tension}`],
    summary: `Tension rose with ${input.counterpartyLabel} over ${input.subject}.`,
  });
  let next = appendCrisisRecord(occurred.world, {
    kind: "international-crisis",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [],
    visibility: "public",
    eventId: occurred.eventId,
    counterpartyLabel: input.counterpartyLabel,
    allyLabels: [...input.allyLabels],
    subject: input.subject,
    tension: input.tension,
    basis: input.basis,
  });
  const crisisId = crisisRecordId(next, key);
  next = assessAndAdvise(next, crisisId, 0);
  assertWorldIntegrity(next);
  return next;
}

function assessAndAdvise(
  world: World,
  crisisId: EntityId,
  cycle: number,
): World {
  const crisis = crisisOf(world, crisisId);
  const state = internationalCrisisState(world, crisisId);
  const confidenceRoll = roll(world, [crisisId, cycle, "confidence"]);
  const confidence: IntelligenceConfidence =
    confidenceRoll < 300_000
      ? "low"
      : confidenceRoll < 750_000
        ? "moderate"
        : "high";
  const tensionRank = TENSIONS.indexOf(state.tension);
  const intentRoll =
    roll(world, [crisisId, cycle, "intent"]) + tensionRank * 150_000;
  const assessedIntent =
    intentRoll < 500_000
      ? "probing"
      : intentRoll < 850_000
        ? "coercive"
        : "preparing-force";
  let next = appendCrisisRecord(world, {
    kind: "intelligence-assessment",
    stableKey: `${crisis.stableKey}:assessment:${cycle}`,
    effectiveAt: world.currentDate,
    causalParentIds: [crisisId],
    visibility: "limited",
    eventId: null,
    crisisId,
    confidence,
    assessedIntent,
    cycle,
  });
  const recommended: CrisisOptionKey =
    assessedIntent === "preparing-force" &&
    confidence === "high" &&
    tensionRank >= 2
      ? "force-posture"
      : tensionRank >= 2 || assessedIntent === "coercive"
        ? "economic"
        : "diplomatic";
  next = appendCrisisRecord(next, {
    kind: "crisis-options",
    stableKey: `${crisis.stableKey}:options:${cycle}`,
    effectiveAt: world.currentDate,
    causalParentIds: [
      crisisRecordId(next, `${crisis.stableKey}:assessment:${cycle}`),
    ],
    visibility: "limited",
    eventId: null,
    crisisId,
    cycle,
    options: [
      {
        key: "diplomatic",
        forceCapable: false,
        advisers:
          "The Secretary of State favors direct talks and allied statements.",
        risk: assessedIntent === "preparing-force" ? "higher" : "lower",
        legal: "Within ordinary executive foreign-affairs authority.",
      },
      {
        key: "economic",
        forceCapable: false,
        advisers: "Treasury proposes targeted economic measures with allies.",
        risk: "moderate",
        legal: "Requires an applicable statutory sanctions authority.",
      },
      {
        key: "force-posture",
        forceCapable: true,
        advisers:
          "The Secretary of Defense proposes moving forces into the region.",
        risk: assessedIntent === "probing" ? "higher" : "moderate",
        legal:
          "Introducing forces where hostilities are imminent requires a War Powers report within 48 hours.",
      },
    ],
    recommended,
  });
  return scheduleFutureDueItem(next, {
    stableKey: `${crisis.stableKey}:decision:${cycle}:0:due`,
    dueAt: addDays(
      world.currentDate,
      PROVISIONAL_INTERNATIONAL_POLICY.optionsAfterDays,
    ),
    transitionKey: INTERNATIONAL_DECISION_KEY,
    entityIds: [crisisId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [crisisId] },
  });
}

function controlledBy(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

/** The President's choice, when the player holds the office. */
export function decideInternationalCrisis(
  world: World,
  crisisId: EntityId,
  option: CrisisOptionKey,
): World {
  const president = currentPresidentOf(world);
  if (!president || !controlledBy(world, president.personId))
    throw new Error("Only the President may decide this crisis.");
  const state = internationalCrisisState(world, crisisId);
  if (state.ended || !state.awaitingDecision)
    throw new Error("No decision is pending for this crisis.");
  const next = applyDecision(
    world,
    crisisId,
    option,
    president.personId,
    "player",
  );
  assertWorldIntegrity(next);
  return next;
}

function applyDecision(
  world: World,
  crisisId: EntityId,
  option: CrisisOptionKey,
  deciderPersonId: EntityId | null,
  decidedBy: CrisisDecisionRecord["decidedBy"],
): World {
  const state = internationalCrisisState(world, crisisId);
  const crisis = state.crisis;
  const key = `${crisis.stableKey}:decision:${state.cycle}`;
  const decided = event(world, {
    stableKey: `${key}:event`,
    type: "crisis.international-decision",
    involvedEntityIds: [
      crisisId,
      ...(deciderPersonId ? [deciderPersonId] : []),
    ],
    actorPersonId: deciderPersonId,
    visibility: "public",
    tags: [`option:${option}`],
    summary:
      option === "diplomatic"
        ? `The administration pursued talks with ${crisis.counterpartyLabel}.`
        : option === "economic"
          ? `The administration imposed economic measures on ${crisis.counterpartyLabel}.`
          : `The administration moved U.S. forces toward the ${crisis.subject} dispute.`,
  });
  let next = appendCrisisRecord(decided.world, {
    kind: "crisis-decision",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [state.options.at(-1)!.id],
    visibility: "public",
    eventId: decided.eventId,
    crisisId,
    cycle: state.cycle,
    option,
    deciderPersonId,
    decidedBy,
  });
  const decisionId = crisisRecordId(next, key);
  if (option === "force-posture" && !state.forcesIn)
    next = warPowersStage(next, crisisId, "forces-introduced", decisionId);
  return scheduleFutureDueItem(next, {
    stableKey: `${crisis.stableKey}:response:${state.cycle}:due`,
    dueAt: addDays(
      world.currentDate,
      PROVISIONAL_INTERNATIONAL_POLICY.responseAfterDays,
    ),
    transitionKey: INTERNATIONAL_RESPONSE_KEY,
    entityIds: [crisisId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [decisionId] },
  });
}

const WAR_POWERS_TEXT: Record<WarPowersStage, string> = {
  "forces-introduced":
    "U.S. forces were introduced into an area of imminent hostilities.",
  "report-submitted":
    "The President submitted the required War Powers report to Congress.",
  "authorization-absent":
    "Sixty days passed without a declaration of war or specific authorization from Congress.",
  "withdrawal-extension-certified":
    "The President certified that up to thirty more days are needed to withdraw forces safely.",
  "forces-withdrawn": "U.S. forces were withdrawn from the area.",
};

function warPowersStage(
  world: World,
  crisisId: EntityId,
  stage: WarPowersStage,
  parentId: EntityId,
): World {
  const crisis = crisisOf(world, crisisId);
  const prior = recordsOf<"war-powers", WarPowersRecord>(
    world,
    "war-powers",
    crisisId,
  );
  const policy = PROVISIONAL_INTERNATIONAL_POLICY.warPowers;
  const introduced = prior.find((r) => r.stage === "forces-introduced");
  const reportDueAt =
    introduced?.reportDueAt ??
    addDays(world.currentDate, policy.reportWithinDays);
  const reported = prior.find((r) => r.stage === "report-submitted");
  const terminationAt =
    stage === "report-submitted"
      ? addDays(world.currentDate, policy.terminationDays)
      : stage === "withdrawal-extension-certified"
        ? addDays(world.currentDate, policy.extensionDays)
        : stage === "forces-withdrawn"
          ? null
          : (prior.at(-1)?.terminationAt ?? reported?.terminationAt ?? null);
  const key = `${crisis.stableKey}:war-powers:${stage}`;
  const recorded = event(world, {
    stableKey: `${key}:event`,
    type: "crisis.war-powers",
    involvedEntityIds: [crisisId],
    visibility: "public",
    tags: [`war-powers:${stage}`],
    summary: WAR_POWERS_TEXT[stage],
  });
  let next = appendCrisisRecord(recorded.world, {
    kind: "war-powers",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [parentId],
    visibility: "public",
    eventId: recorded.eventId,
    crisisId,
    stage,
    reportDueAt,
    terminationAt,
    note:
      stage === "forces-introduced"
        ? "50 U.S.C. §1543(a)(1): written report due within 48 hours."
        : stage === "report-submitted"
          ? "50 U.S.C. §1544(b): 60-day period runs from the report."
          : stage === "withdrawal-extension-certified"
            ? "50 U.S.C. §1544(b): up to 30 more days on written certification."
            : stage === "authorization-absent"
              ? "No declaration or specific authorization is recorded in this World."
              : "Forces are no longer introduced.",
  });
  const recordId = crisisRecordId(next, key);
  const followUp: Partial<
    Record<WarPowersStage, readonly [WarPowersStage, number]>
  > = {
    "forces-introduced": ["report-submitted", 1],
    "report-submitted": ["authorization-absent", policy.terminationDays],
    "withdrawal-extension-certified": [
      "forces-withdrawn",
      policy.extensionDays,
    ],
  };
  const due = followUp[stage];
  if (due)
    next = scheduleFutureDueItem(next, {
      stableKey: `${crisis.stableKey}:war-powers:${due[0]}:due`,
      dueAt: addDays(world.currentDate, due[1]),
      transitionKey: WAR_POWERS_KEY,
      entityIds: [crisisId],
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [recordId] },
    });
  return next;
}

function settled(
  world: World,
  status: "resolved" | "cancelled",
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status,
    reasonKey:
      status === "resolved"
        ? "crisis:international"
        : "crisis:international-stale",
    context,
    outcomeEventId: null,
  };
}

function dueIndex(item: FutureDueItem): number {
  return Number(/:(\d+):due$/.exec(item.stableKey)?.[1] ?? 0);
}

export const internationalDecisionHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const crisisId = item.entityIds[0]!;
  const state = internationalCrisisState(world, crisisId);
  if (state.ended || !state.awaitingDecision)
    return settled(world, "cancelled", "No decision pending.");
  const president = currentPresidentOf(world);
  if (president && controlledBy(world, president.personId)) {
    // A demand nobody answers is the quiet case: after the authored period
    // the dispute lapses on a record rather than waiting forever.
    const since = lastMovementAt(world, crisisId);
    if (
      daysBetween(makeIsoDate(since), makeIsoDate(world.currentDate)) >=
      PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays
    ) {
      return lapse(world, crisisId, state.cycle);
    }
    return settled(
      scheduleFutureDueItem(world, {
        stableKey: `${state.crisis.stableKey}:decision:${state.cycle}:${dueIndex(item) + 1}:due`,
        dueAt: addDays(world.currentDate, 1),
        transitionKey: INTERNATIONAL_DECISION_KEY,
        entityIds: [crisisId],
        jurisdictionId: null,
        provenance: { kind: "simulated", sourceEntityIds: [crisisId] },
      }),
      "resolved",
      "awaiting-player",
    );
  }
  const option = state.options.at(-1)!.recommended;
  return settled(
    applyDecision(
      world,
      crisisId,
      president ? option : "diplomatic",
      president?.personId ?? null,
      president ? "npc-rule" : "institution",
    ),
    "resolved",
    option,
  );
};

export const internationalResponseHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const crisisId = item.entityIds[0]!;
  const state = internationalCrisisState(world, crisisId);
  const decision = state.decisions.find((d) => d.cycle === state.cycle);
  if (state.ended || !decision)
    return settled(world, "cancelled", "Nothing to answer.");
  const policy = PROVISIONAL_INTERNATIONAL_POLICY;
  const shares = policy.counterparty[decision.option];
  const shift = state.tension === "severe" ? policy.severeShift : 0;
  const counterRoll = roll(world, [crisisId, state.cycle, "counterparty"]);
  const counterparty =
    counterRoll < shares.deEscalate - shift
      ? "de-escalated"
      : counterRoll < shares.deEscalate - shift + shares.hold
        ? "held"
        : "escalated";
  const allies =
    roll(world, [crisisId, state.cycle, "allies"]) <
    policy.allySupport[decision.option]
      ? "supported"
      : "stood-aside";
  const rank = TENSIONS.indexOf(state.tension);
  const tensionAfter =
    TENSIONS[
      counterparty === "escalated"
        ? Math.min(rank + 1, 3)
        : counterparty === "de-escalated"
          ? Math.max(rank - 1, 0)
          : rank
    ]!;
  // The cycle cap is a checkpoint: past it the crisis is reviewed less often
  // rather than declared over. Only the counterparty stepping back ends it
  // here; a lapse is recorded separately when nothing moves for a long time.
  const pastCheckpoint = state.cycle + 1 >= policy.maxCycles;
  const ended = counterparty === "de-escalated";
  const key = `${state.crisis.stableKey}:response:${state.cycle}`;
  const responded = event(world, {
    stableKey: `${key}:event`,
    type: "crisis.international-response",
    involvedEntityIds: [crisisId],
    visibility: "public",
    tags: [
      `counterparty:${counterparty}`,
      `allies:${allies}`,
      `tension:${tensionAfter}`,
    ],
    summary:
      (counterparty === "de-escalated"
        ? `${state.crisis.counterpartyLabel} stepped back.`
        : counterparty === "held"
          ? `${state.crisis.counterpartyLabel} held its position.`
          : `${state.crisis.counterpartyLabel} escalated.`) +
      (allies === "supported"
        ? " Allies backed the U.S. response."
        : " Allies stood aside.") +
      (pastCheckpoint && !ended
        ? " The dispute settled into a standoff, still unresolved."
        : ""),
  });
  let next = appendCrisisRecord(responded.world, {
    kind: "counterparty-response",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [decision.id],
    visibility: "public",
    eventId: responded.eventId,
    crisisId,
    cycle: state.cycle,
    counterparty,
    allies,
    tensionAfter,
    ended,
  });
  const responseId = crisisRecordId(next, key);
  if (ended && state.forcesIn)
    next = warPowersStage(next, crisisId, "forces-withdrawn", responseId);
  if (!ended) {
    const cycle = state.cycle + 1;
    next = scheduleFutureDueItem(next, {
      stableKey: `${state.crisis.stableKey}:cycle:${cycle}:due`,
      dueAt: addDays(
        world.currentDate,
        pastCheckpoint
          ? policy.checkpointReviewAfterDays
          : policy.nextCycleAfterDays,
      ),
      transitionKey: INTERNATIONAL_DECISION_KEY,
      entityIds: [crisisId],
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [responseId] },
    });
  }
  return settled(next, "resolved", counterparty);
};

/**
 * A dispute nobody has moved for a long time lapses. The lapse is a recorded
 * outcome — the crisis ends because something is written, never because a
 * counter ran out (CRUNCH47 C2).
 */
function lapse(
  world: World,
  crisisId: EntityId,
  cycle: number,
): FutureTransitionHandlerResult {
  const state = internationalCrisisState(world, crisisId);
  const key = `${state.crisis.stableKey}:lapsed:${cycle}`;
  const recorded = event(world, {
    stableKey: `${key}:event`,
    type: "crisis.international-response",
    involvedEntityIds: [crisisId],
    visibility: "public",
    tags: [
      `counterparty:held`,
      `tension:${state.tension}`,
      "resolution:lapsed",
    ],
    summary: `The dispute with ${state.crisis.counterpartyLabel} lapsed without a settlement; neither side has moved on it.`,
  });
  let next = appendCrisisRecord(recorded.world, {
    kind: "counterparty-response",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [state.crisis.id],
    visibility: "public",
    eventId: recorded.eventId,
    crisisId,
    cycle,
    counterparty: "held",
    allies: "stood-aside",
    tensionAfter: state.tension,
    ended: true,
  });
  if (state.forcesIn)
    next = warPowersStage(
      next,
      crisisId,
      "forces-withdrawn",
      crisisRecordId(next, key),
    );
  return settled(next, "resolved", "lapsed");
}

/** The last time anybody actually moved on this crisis. */
function lastMovementAt(world: World, crisisId: EntityId): IsoDate {
  const moved = crisisRecords(world).filter(
    (record) =>
      (record.kind === "counterparty-response" ||
        record.kind === "crisis-decision") &&
      (record as unknown as { crisisId: EntityId }).crisisId === crisisId,
  );
  return (
    moved.at(-1)?.effectiveAt ??
    crisisRecords(world).find((record) => record.id === crisisId)!.effectiveAt
  );
}

/** Starts a new intelligence and options cycle when its due item arrives. */
function beginCycle(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  const crisisId = item.entityIds[0]!;
  const state = internationalCrisisState(world, crisisId);
  const cycle = Number(/:cycle:(\d+):due$/.exec(item.stableKey)![1]);
  if (state.ended || state.options.some((o) => o.cycle === cycle))
    return settled(world, "cancelled", "Cycle no longer needed.");
  // Past the checkpoint, a dispute with no recorded movement lapses.
  if (
    cycle >= PROVISIONAL_INTERNATIONAL_POLICY.maxCycles &&
    daysBetween(
      makeIsoDate(lastMovementAt(world, crisisId)),
      makeIsoDate(world.currentDate),
    ) >= PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays
  ) {
    return lapse(world, crisisId, cycle);
  }
  return settled(
    assessAndAdvise(world, crisisId, cycle),
    "resolved",
    `cycle-${cycle}`,
  );
}

export const internationalCycleOrDecisionHandler: FutureTransitionHandler = (
  world,
  item,
) =>
  item.stableKey.includes(":cycle:")
    ? beginCycle(world, item)
    : internationalDecisionHandler(world, item);

/** The President certifies a safe-withdrawal extension before the deadline. */
export function certifyWarPowersExtension(
  world: World,
  crisisId: EntityId,
): World {
  const president = currentPresidentOf(world);
  if (!president || !controlledBy(world, president.personId))
    throw new Error("Only the President may certify an extension.");
  const state = internationalCrisisState(world, crisisId);
  const stages = state.warPowers.map((r) => r.stage);
  if (!state.forcesIn || !stages.includes("report-submitted"))
    throw new Error("No War Powers period is running.");
  if (stages.includes("withdrawal-extension-certified"))
    throw new Error("An extension has already been certified.");
  const next = warPowersStage(
    world,
    crisisId,
    "withdrawal-extension-certified",
    state.warPowers.at(-1)!.id,
  );
  assertWorldIntegrity(next);
  return next;
}

export const warPowersHandler: FutureTransitionHandler = (world, item) => {
  const crisisId = item.entityIds[0]!;
  const state = internationalCrisisState(world, crisisId);
  const target = /:war-powers:([a-z-]+):due$/.exec(
    item.stableKey,
  )![1] as WarPowersStage;
  const stages = state.warPowers.map((r) => r.stage);
  if (!state.forcesIn || stages.includes(target))
    return settled(world, "cancelled", "The clock no longer applies.");
  const parent = state.warPowers.at(-1)!.id;
  let next = warPowersStage(world, crisisId, target, parent);
  if (target === "authorization-absent") {
    const president = currentPresidentOf(next);
    const absentId = crisisRecordId(
      next,
      `${state.crisis.stableKey}:war-powers:authorization-absent`,
    );
    if (stages.includes("withdrawal-extension-certified")) {
      // Already certified by the player earlier; its own due item withdraws.
    } else if (president && !controlledBy(next, president.personId))
      next = warPowersStage(
        next,
        crisisId,
        "withdrawal-extension-certified",
        absentId,
      );
    else next = warPowersStage(next, crisisId, "forces-withdrawn", absentId);
  }
  return settled(next, "resolved", target);
};

/** International decisions waiting on the controlled person. */
export function pendingInternationalDecisions(world: World) {
  if (world.control.kind !== "person") return [];
  const president = currentPresidentOf(world);
  if (!president || president.personId !== world.control.personId) return [];
  return crisisRecords(world).flatMap((record) => {
    if (record.kind !== "international-crisis") return [];
    const state = internationalCrisisState(world, record.id);
    return !state.ended && state.awaitingDecision
      ? [
          {
            crisisId: record.id,
            sequence: state.options.at(-1)!.sequence,
            options: state.options.at(-1)!.options,
            recommended: state.options.at(-1)!.recommended,
          },
        ]
      : [];
  });
}

export interface RecordViolenceAttemptInput {
  readonly stableKey: string;
  readonly targetPersonId: EntityId;
  readonly threatEvidenceIds: readonly EntityId[];
  readonly basis: string;
}

/**
 * An abstract attempt on a person's life. It requires earlier canonical
 * evidence of threat or intent, carries no method, and has survival, injury
 * and death outcomes with the same consequences as any other cause.
 */
export function recordViolenceAttempt(
  world: World,
  input: RecordViolenceAttemptInput,
): World {
  const target = world.people[input.targetPersonId];
  if (!target) throw new Error("Unknown attempt target.");
  if (
    !isPersonAliveAt(world, target.id, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    throw new Error("The target is not alive.");
  if (input.threatEvidenceIds.length === 0 || !input.basis.trim())
    throw new Error("An attempt needs threat evidence and a stated basis.");
  for (const id of input.threatEvidenceIds)
    if (
      !world.history.events.some(
        (e) => e.id === id && e.occurredAt <= world.currentDate,
      )
    )
      throw new Error(`Threat evidence must be an earlier event: ${id}`);
  const key = `crisis:violence:${input.stableKey}`;
  const outcomeRoll = roll(world, ["violence", key, target.id]);
  const policy = PROVISIONAL_INTERNATIONAL_POLICY.violence;
  const outcome =
    outcomeRoll < policy.killed
      ? "killed"
      : outcomeRoll < policy.killed + policy.injured
        ? "injured"
        : "unharmed";
  const attempted = recordWorldEvent(world, {
    stableKey: `${key}:event`,
    type: "crisis.violence-attempt",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: target.homeJurisdictionId,
    involvedEntityIds: [target.id],
    participants: [
      { personId: target.id, role: "impact:target", detail: outcome },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["crisis", "crisis.violence", `outcome:${outcome}`],
    summary:
      outcome === "killed"
        ? "An attack took a life."
        : outcome === "injured"
          ? "An attack left its target injured."
          : "An attack was attempted; its target was unharmed.",
    context: EMPTY_CONTEXT,
  });
  let next = appendCrisisRecord(attempted, {
    kind: "violence-attempt",
    stableKey: key,
    effectiveAt: world.currentDate,
    causalParentIds: [...input.threatEvidenceIds],
    visibility: "public",
    eventId: attempted.history.events.at(-1)!.id,
    targetPersonId: target.id,
    threatEvidenceIds: [...input.threatEvidenceIds],
    outcome,
    basis: input.basis,
  });
  const attemptId = crisisRecordId(next, key);
  if (outcome === "killed") {
    const before = next;
    next = recordPersonDeath(next, {
      stableKey: `${key}:death`,
      personId: target.id,
      diedAt: next.currentDate,
      causeKey: "crisis-violence:attempt",
      sourceEntityIds: [attemptId],
      summary: "Killed in an attack.",
      provenance: { kind: "simulated", sourceEntityIds: [attemptId] },
    });
    next = closeHealthEpisodesForDeath(
      next,
      target.id,
      next.history.personDeaths.at(-1)!.id,
    );
    next = recordOfficialContinuity(before, next, target.id, "death");
  } else if (outcome === "injured") {
    next = beginHealthEpisode(next, {
      stableKey: `${input.stableKey}:violence-injury`,
      personId: target.id,
      severity: "serious",
      initialLimitation: "incapacitated",
      origin: { kind: "injury", sourceRecordId: attemptId },
      causalParentIds: [attemptId],
      initialAccess: "public",
    });
  }
  assertWorldIntegrity(next);
  return next;
}
