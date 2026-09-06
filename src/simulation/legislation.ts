import { addDays, makeIsoDate } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import {
  assertOriginationPermitted,
  chamberByKey,
  committeeByKey,
  defaultOriginChamber,
  floorStageByKey,
  nextChamberKey,
  nextFloorStageKey,
  requireKnown,
  resolveRequiredVotes,
  type ChamberRule,
  type LegislativeRulePack,
  type VoteDenominator,
  type VoteThresholdRule,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import { personName } from "./people";
import type {
  CommitteeActionRecord,
  CommitteeReferralRecord,
  CommitteeDisposition,
  CommitteeRecommendation,
  EntityId,
  EventParticipant,
  ExecutiveActionKind,
  ExecutiveDispositionRecord,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeActionKind,
  LegislativeActionRecord,
  LegislativeAmendmentRecord,
  LegislativeEnactmentRecord,
  LegislativeMeasureOrigin,
  LegislativeMeasureRecord,
  LegislativeSubjectClass,
  LegislativeTerminalOutcome,
  LegislativeVoteDisposition,
  LegislativeVoteForum,
  LegislativeVotePurpose,
  LegislativeVoteProvenance,
  LegislativeVoteRecord,
  LegislativeVoteTally,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * Canonical legislative process.
 *
 * A measure's position is never stored as a bucket: it is derived by replaying
 * the measure's append-only action record against its rule pack. Every
 * consequential transition writes an ordinary historical event plus one action,
 * so the institutional story survives save, reload and replay.
 *
 * Votes here are records of named members with an explicit denominator,
 * threshold and rounding rule. They deliberately share nothing with the
 * election substrate's vote shares and floating tallies: a legislative question
 * either reaches its required number of votes or it does not.
 */

export const COMMITTEE_HEARING_TRANSITION_KEY =
  "legislation:committee-hearing" as const;

/** How a carried committee report reads in the record. */
const REPORT_PHRASES: Readonly<Record<CommitteeRecommendation, string>> = {
  favorable: "with the recommendation that it pass",
  unfavorable: "with the recommendation that it not pass",
  "without-recommendation": "without a recommendation either way",
};

// ---------------------------------------------------------------------------
// Derived position
// ---------------------------------------------------------------------------

export type MeasurePhase =
  | "drafting"
  | "awaiting-referral"
  | "in-committee"
  | "awaiting-floor"
  | "on-floor"
  | "awaiting-transmittal"
  | "awaiting-concurrence"
  | "awaiting-enrollment"
  | "awaiting-presentation"
  | "awaiting-executive"
  | "awaiting-override"
  | "awaiting-enactment"
  | "enacted"
  | "failed";

export interface MeasurePosition {
  readonly phase: MeasurePhase;
  readonly chamberKey: string | null;
  readonly committeeKey: string | null;
  readonly floorStageKey: string | null;
  readonly terminal: boolean;
  readonly outcome: LegislativeTerminalOutcome | null;
  /** Whether this committee has already taken testimony on the measure. */
  readonly hearingHeld: boolean;
  /** True once the measure has crossed to a second chamber. */
  readonly transmitted: boolean;
  /**
   * True when the second chamber changed the text, which is what makes the
   * originating chamber's agreement a required step rather than a formality.
   */
  readonly awaitingChamberAgreement: boolean;
  /**
   * The earliest date the next floor stage may be taken, where the chamber's
   * rules require its stages to fall on separate legislative days. Null when
   * no separation applies.
   */
  readonly earliestNextFloorDate: IsoDate | null;
}

const TERMINAL_PHASES: ReadonlySet<MeasurePhase> = new Set([
  "enacted",
  "failed",
]);

export function measureActions(
  world: World,
  measureId: EntityId,
): readonly LegislativeActionRecord[] {
  return (world.history.legislativeActions ?? [])
    .filter((action) => action.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

// ---------------------------------------------------------------------------
// Legal replay
// ---------------------------------------------------------------------------

/**
 * Replay is a state machine, not a reducer over the last action.
 *
 * Every action must be legal from the state immediately before it: the phase
 * must permit that kind of action, the chamber/committee/stage it names must be
 * the one the measure is actually in, the rule that authorises it must be
 * known, and nothing at all may follow a terminal action. A history that
 * violates any of that is rejected rather than quietly reduced to a plausible
 * position.
 */
interface ReplayState {
  phase: MeasurePhase;
  chamberKey: string | null;
  committeeKey: string | null;
  floorStageKey: string | null;
  outcome: LegislativeTerminalOutcome | null;
  hearingHeld: boolean;
  transmitted: boolean;
  secondChamberAmended: boolean;
  earliestNextFloorDate: IsoDate | null;
  overrideChambersRecorded: readonly string[];
}

export interface MeasureReplay {
  readonly position: MeasurePosition;
  /** Empty when the whole recorded history is legal. */
  readonly violations: readonly string[];
}

function initialState(measure: LegislativeMeasureRecord): ReplayState {
  return {
    phase: "drafting",
    chamberKey: measure.originChamberKey,
    committeeKey: null,
    floorStageKey: null,
    outcome: null,
    hearingHeld: false,
    transmitted: false,
    secondChamberAmended: false,
    earliestNextFloorDate: null,
    overrideChambersRecorded: [],
  };
}

function positionOf(state: ReplayState): MeasurePosition {
  return {
    phase: state.phase,
    chamberKey: state.chamberKey,
    committeeKey: state.committeeKey,
    floorStageKey: state.floorStageKey,
    terminal: TERMINAL_PHASES.has(state.phase),
    outcome: state.outcome,
    hearingHeld: state.hearingHeld,
    transmitted: state.transmitted,
    awaitingChamberAgreement: state.phase === "awaiting-concurrence",
    earliestNextFloorDate: state.earliestNextFloorDate,
  };
}

type StepOutcome = { ok: true } | { ok: false; reason: string };

const LEGAL: StepOutcome = { ok: true };
function illegal(reason: string): StepOutcome {
  return { ok: false, reason };
}

function requirePhase(
  state: ReplayState,
  kind: LegislativeActionKind,
  allowed: readonly MeasurePhase[],
): StepOutcome {
  return allowed.includes(state.phase)
    ? LEGAL
    : illegal(`'${kind}' cannot follow the phase '${state.phase}'`);
}

/**
 * Applies one recorded action to the replay state, or explains why it could
 * never legally have happened.
 */
function applyRecordedAction(
  state: ReplayState,
  action: LegislativeActionRecord,
  pack: LegislativeRulePack,
  measure: LegislativeMeasureRecord,
): StepOutcome {
  if (TERMINAL_PHASES.has(state.phase)) {
    return illegal(
      `'${action.kind}' was recorded after the measure had already finished as '${state.outcome}'`,
    );
  }

  const currentChamber = (): ChamberRule | null =>
    state.chamberKey ? chamberByKey(pack, state.chamberKey) : null;

  switch (action.kind) {
    case "introduced": {
      const gate = requirePhase(state, action.kind, ["drafting"]);
      if (!gate.ok) return gate;
      const chamberKey = action.chamberKey;
      if (chamberKey !== measure.originChamberKey) {
        return illegal(
          `introduction names chamber '${chamberKey ?? "none"}' while the measure's stored origin is '${measure.originChamberKey}'`,
        );
      }
      const chamber = chamberByKey(pack, chamberKey);
      if (!chamber.introductionAllowed) {
        return illegal(`measures cannot be introduced in the ${chamber.name}`);
      }
      // Replay is the permanent boundary for a loaded World. Re-run the same
      // sourced subject-specific rule as the writer so a stored measure and
      // action cannot agree on an origin the institution forbids.
      assertOriginationPermitted(pack, measure.subjectClass, chamberKey);
      state.phase = "awaiting-referral";
      state.chamberKey = chamberKey;
      return LEGAL;
    }
    case "referred": {
      const gate = requirePhase(state, action.kind, ["awaiting-referral"]);
      if (!gate.ok) return gate;
      const chamber = currentChamber();
      if (!chamber) return illegal("the measure is not in a chamber");
      if (action.chamberKey && action.chamberKey !== chamber.chamberKey) {
        return illegal(
          `referral names the ${action.chamberKey} while the measure is in the ${chamber.chamberKey}`,
        );
      }
      if (!action.committeeKey) {
        return illegal("a referral must name the committee it went to");
      }
      committeeByKey(chamber, action.committeeKey);
      state.phase = "in-committee";
      state.committeeKey = action.committeeKey;
      state.hearingHeld = false;
      return LEGAL;
    }
    case "committee-hearing-held": {
      const gate = requirePhase(state, action.kind, ["in-committee"]);
      if (!gate.ok) return gate;
      if (action.committeeKey !== state.committeeKey) {
        return illegal(
          `the hearing names committee '${action.committeeKey}' but the measure is with '${state.committeeKey}'`,
        );
      }
      state.hearingHeld = true;
      return LEGAL;
    }
    case "committee-reported":
    case "committee-not-reported": {
      const gate = requirePhase(state, action.kind, ["in-committee"]);
      if (!gate.ok) return gate;
      if (action.committeeKey !== state.committeeKey) {
        return illegal(
          `the committee action names '${action.committeeKey}' but the measure is with '${state.committeeKey}'`,
        );
      }
      if (action.kind === "committee-reported") {
        state.phase = "awaiting-floor";
        state.committeeKey = null;
      } else {
        state.phase = "failed";
        state.outcome = "failed-in-committee";
      }
      return LEGAL;
    }
    case "placed-on-calendar": {
      const gate = requirePhase(state, action.kind, ["awaiting-floor"]);
      if (!gate.ok) return gate;
      const chamber = currentChamber();
      if (!chamber) return illegal("the measure is not in a chamber");
      const first = chamber.floorStages[0];
      if (!first) return illegal(`the ${chamber.name} declares no floor stage`);
      if (action.floorStageKey && action.floorStageKey !== first.stageKey) {
        return illegal(
          `calendar placement names stage '${action.floorStageKey}' rather than the chamber's first stage`,
        );
      }
      state.phase = "on-floor";
      state.floorStageKey = first.stageKey;
      state.earliestNextFloorDate = null;
      return LEGAL;
    }
    case "amendment-adopted":
    case "amendment-rejected": {
      const gate = requirePhase(state, action.kind, ["on-floor"]);
      if (!gate.ok) return gate;
      const chamber = currentChamber();
      if (!chamber) return illegal("the measure is not in a chamber");
      if (action.floorStageKey !== state.floorStageKey) {
        return illegal(
          `the amendment names stage '${action.floorStageKey}' but the measure is at '${state.floorStageKey}'`,
        );
      }
      const stage = floorStageByKey(chamber, state.floorStageKey ?? "");
      // Unknown is not permission, and it is not the same refusal as a stage
      // the rules positively close to amendment. Both stop the amendment; only
      // one of them is a rule.
      if (stage.amendable.kind !== "known") {
        return illegal(
          `whether ${stage.label} accepts amendments is unresolved in ${pack.displayName}`,
        );
      }
      if (!stage.amendable.value) {
        return illegal(`${stage.label} does not accept amendments`);
      }
      const allowed = chamber.amendments.floorAmendmentsAllowed;
      if (allowed.kind !== "known" || !allowed.value) {
        return illegal(
          `the ${chamber.name} does not have a resolved rule permitting floor amendments`,
        );
      }
      if (
        action.kind === "amendment-adopted" &&
        state.transmitted &&
        chamber.chamberKey !== measure.originChamberKey
      ) {
        state.secondChamberAmended = true;
      }
      return LEGAL;
    }
    case "floor-stage-passed":
    case "floor-stage-failed": {
      const gate = requirePhase(state, action.kind, ["on-floor"]);
      if (!gate.ok) return gate;
      const chamber = currentChamber();
      if (!chamber) return illegal("the measure is not in a chamber");
      if (action.floorStageKey !== state.floorStageKey) {
        return illegal(
          `the floor vote names stage '${action.floorStageKey}' but the measure is at '${state.floorStageKey}'`,
        );
      }
      if (
        state.earliestNextFloorDate !== null &&
        action.occurredAt < state.earliestNextFloorDate
      ) {
        return illegal(
          `this stage may not be taken before ${state.earliestNextFloorDate}, because the chamber's stages fall on separate legislative days`,
        );
      }
      if (action.kind === "floor-stage-failed") {
        state.phase = "failed";
        state.outcome = "failed-on-floor";
        return LEGAL;
      }
      const onward = nextFloorStageKey(chamber, state.floorStageKey ?? "");
      if (onward) {
        const onwardStage = floorStageByKey(chamber, onward);
        state.floorStageKey = onward;
        state.earliestNextFloorDate = onwardStage.separateLegislativeDayRequired
          ? addDays(action.occurredAt, 1)
          : null;
        state.phase = "on-floor";
        return LEGAL;
      }
      state.floorStageKey = null;
      state.earliestNextFloorDate = null;
      const nextChamber = nextChamberKey(
        pack,
        chamber.chamberKey,
        measure.originChamberKey,
      );
      if (nextChamber && !state.transmitted) {
        state.phase = "awaiting-transmittal";
        return LEGAL;
      }
      if (state.transmitted && state.secondChamberAmended) {
        // The second chamber changed the bill. The chamber it started in has
        // to agree to that change before there is one text to enrol.
        state.phase = "awaiting-concurrence";
        state.chamberKey = measure.originChamberKey;
        return LEGAL;
      }
      state.phase = "awaiting-enrollment";
      return LEGAL;
    }
    case "transmitted": {
      const gate = requirePhase(state, action.kind, ["awaiting-transmittal"]);
      if (!gate.ok) return gate;
      if (pack.interChamber.kind !== "second-chamber") {
        return illegal(
          `${pack.displayName} has one chamber, so there is nowhere to transmit a measure`,
        );
      }
      const onward = nextChamberKey(
        pack,
        state.chamberKey ?? "",
        measure.originChamberKey,
      );
      if (!onward) return illegal("there is no further chamber to receive it");
      if (action.chamberKey !== onward) {
        return illegal(
          `transmittal names '${action.chamberKey}' rather than the receiving chamber '${onward}'`,
        );
      }
      state.chamberKey = onward;
      state.committeeKey = null;
      state.floorStageKey = null;
      state.earliestNextFloorDate = null;
      state.transmitted = true;
      state.secondChamberAmended = false;
      state.phase = "awaiting-referral";
      return LEGAL;
    }
    case "concurred":
    case "concurrence-failed": {
      const gate = requirePhase(state, action.kind, ["awaiting-concurrence"]);
      if (!gate.ok) return gate;
      if (pack.interChamber.kind !== "second-chamber") {
        return illegal(
          `${pack.displayName} has one chamber, so there is nothing to concur in`,
        );
      }
      if (action.kind === "concurred") {
        state.phase = "awaiting-enrollment";
        state.secondChamberAmended = false;
      } else {
        state.phase = "failed";
        state.outcome = "failed-concurrence";
      }
      return LEGAL;
    }
    case "enrolled": {
      const gate = requirePhase(state, action.kind, ["awaiting-enrollment"]);
      if (!gate.ok) return gate;
      state.phase = "awaiting-presentation";
      state.floorStageKey = null;
      return LEGAL;
    }
    case "presented-to-executive": {
      const gate = requirePhase(state, action.kind, ["awaiting-presentation"]);
      if (!gate.ok) return gate;
      const required = pack.executive.presentmentRequired;
      if (required.kind !== "known" || !required.value) {
        return illegal(
          `${pack.displayName} has no resolved rule requiring presentment to the ${pack.executive.titleLabel}`,
        );
      }
      state.phase = "awaiting-executive";
      state.chamberKey = null;
      return LEGAL;
    }
    case "signed": {
      const gate = requirePhase(state, action.kind, ["awaiting-executive"]);
      if (!gate.ok) return gate;
      state.phase = "awaiting-enactment";
      return LEGAL;
    }
    case "vetoed": {
      const gate = requirePhase(state, action.kind, ["awaiting-executive"]);
      if (!gate.ok) return gate;
      state.phase = "awaiting-override";
      return LEGAL;
    }
    case "override-chamber-recorded": {
      const gate = requirePhase(state, action.kind, ["awaiting-override"]);
      if (!gate.ok) return gate;
      if (pack.executive.override.kind !== "each-chamber") {
        return illegal(
          `${pack.displayName} reconsiders a veto as one body, not chamber by chamber`,
        );
      }
      if (
        !action.chamberKey ||
        !pack.chamberOrder.includes(action.chamberKey)
      ) {
        return illegal(
          `the override vote names a chamber this legislature does not have: '${action.chamberKey}'`,
        );
      }
      if (state.overrideChambersRecorded.includes(action.chamberKey)) {
        return illegal(
          `the ${action.chamberKey} already voted on this override`,
        );
      }
      state.overrideChambersRecorded = [
        ...state.overrideChambersRecorded,
        action.chamberKey,
      ];
      // The veto stays live until every chamber has voted.
      return LEGAL;
    }
    case "override-succeeded":
    case "override-failed": {
      const gate = requirePhase(state, action.kind, ["awaiting-override"]);
      if (!gate.ok) return gate;
      if (action.kind === "override-succeeded") {
        state.phase = "awaiting-enactment";
      } else {
        state.phase = "failed";
        state.outcome = "vetoed-and-sustained";
      }
      return LEGAL;
    }
    case "enacted": {
      const gate = requirePhase(state, action.kind, ["awaiting-enactment"]);
      if (!gate.ok) return gate;
      state.phase = "enacted";
      state.outcome = "enacted";
      return LEGAL;
    }
    case "died-on-adjournment": {
      const dies = pack.session.measuresDieAtAdjournment;
      if (dies.kind !== "known" || !dies.value) {
        return illegal(
          `${pack.displayName} has no resolved rule under which a measure dies at adjournment`,
        );
      }
      state.phase = "failed";
      state.outcome = "died-on-adjournment";
      return LEGAL;
    }
  }
}

/**
 * Replays a measure's whole recorded history and reports both where it now
 * sits and anything in that history that could not legally have happened.
 */
export function replayMeasure(
  world: World,
  measureId: EntityId,
): MeasureReplay {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const state = initialState(measure);
  const violations: string[] = [];

  for (const action of measureActions(world, measureId)) {
    let outcome: StepOutcome;
    try {
      outcome = applyRecordedAction(state, action, pack, measure);
    } catch (error) {
      outcome = illegal(
        error instanceof Error ? error.message : "the action could not be read",
      );
    }
    if (!outcome.ok) {
      violations.push(
        `${measure.designation}: action '${action.stableKey}' is not legal here — ${outcome.reason}.`,
      );
      break;
    }
  }

  return { position: positionOf(state), violations };
}

/**
 * Where the measure now sits. Derived by replay; no stored status is consulted.
 * An illegal history stops the replay at the offending action — integrity
 * checking is what refuses to accept such a history at all.
 */
export function measurePosition(
  world: World,
  measureId: EntityId,
): MeasurePosition {
  return replayMeasure(world, measureId).position;
}

/** The institution or actor that controls the measure's next gate. */
export interface MeasureGate {
  readonly actorLabel: string;
  readonly description: string;
  readonly thresholdLabel: string | null;
}

export function measureGate(world: World, measureId: EntityId): MeasureGate {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const position = measurePosition(world, measureId);
  const chamber = position.chamberKey
    ? chamberByKey(pack, position.chamberKey)
    : null;

  switch (position.phase) {
    case "drafting":
      return {
        actorLabel: "Sponsor",
        description: "The measure has not been filed yet.",
        thresholdLabel: null,
      };
    case "awaiting-referral":
      return {
        actorLabel: chamber?.referral.authorityLabel ?? "Referral authority",
        description: `${chamber?.referral.authorityLabel ?? "The referral authority"} decides which committee takes the measure.`,
        thresholdLabel: null,
      };
    case "in-committee": {
      const committee =
        chamber && position.committeeKey
          ? committeeByKey(chamber, position.committeeKey)
          : null;
      return {
        actorLabel: committee?.name ?? "Committee",
        description: `The committee decides whether to report the measure to the floor.`,
        thresholdLabel: committee?.reportThreshold.label ?? null,
      };
    }
    case "awaiting-floor":
      return {
        actorLabel: `${chamber?.name ?? "Chamber"} leadership`,
        description: "The measure needs to be placed on the floor calendar.",
        thresholdLabel: null,
      };
    case "on-floor": {
      const stage =
        chamber && position.floorStageKey
          ? floorStageByKey(chamber, position.floorStageKey)
          : null;
      const threshold =
        stage && stage.vote.kind === "known" ? stage.vote.value.label : null;
      return {
        actorLabel: chamber?.name ?? "Chamber",
        description: `The measure is at ${stage?.label ?? "a floor stage"}.`,
        thresholdLabel: threshold,
      };
    }
    case "awaiting-transmittal": {
      const onward = nextChamberKey(
        pack,
        position.chamberKey ?? "",
        measure.originChamberKey,
      );
      const onwardChamber = onward ? chamberByKey(pack, onward) : null;
      return {
        actorLabel: chamber?.name ?? "Chamber",
        description: `The measure passed and now goes to the ${onwardChamber?.name ?? "second chamber"}.`,
        thresholdLabel: null,
      };
    }
    case "awaiting-concurrence":
      return {
        actorLabel: chamber?.name ?? "Originating chamber",
        description:
          "The originating chamber decides whether to accept the other chamber's changes.",
        thresholdLabel:
          pack.interChamber.kind === "second-chamber"
            ? pack.interChamber.concurrenceThreshold.label
            : null,
      };
    case "awaiting-enrollment":
      return {
        actorLabel: "Enrolling clerk",
        description: "The measure is being prepared in its final form.",
        thresholdLabel: null,
      };
    case "awaiting-enactment":
      return {
        actorLabel: pack.displayName,
        description:
          "The measure has cleared every step and is being recorded as law.",
        thresholdLabel: null,
      };
    case "awaiting-presentation":
      return {
        actorLabel: "Enrolling clerk",
        description: `The measure goes to the ${pack.executive.titleLabel}.`,
        thresholdLabel: null,
      };
    case "awaiting-executive":
      return {
        actorLabel: pack.executive.titleLabel,
        description: `The ${pack.executive.titleLabel} decides whether to sign or veto.`,
        thresholdLabel: null,
      };
    case "awaiting-override": {
      const override = pack.executive.override;
      if (override.kind === "joint-session") {
        // A money bill's heavier bar is a different rule. If the pack has not
        // resolved it, the ordinary bar is not quietly shown in its place.
        const moneyBill = measure.subjectClass !== "general-policy";
        const threshold = moneyBill
          ? override.appropriationsThreshold.kind === "known"
            ? override.appropriationsThreshold.value
            : null
          : override.threshold;
        return {
          actorLabel: override.forumName,
          description: `Both houses sit together to reconsider the veto.`,
          thresholdLabel: threshold ? threshold.label : null,
        };
      }
      return {
        actorLabel: "Each chamber",
        description: "Each chamber votes separately on overriding the veto.",
        thresholdLabel: override.threshold.label,
      };
    }
    case "enacted":
      return {
        actorLabel: "None",
        description: "The measure is law.",
        thresholdLabel: null,
      };
    case "failed":
      return {
        actorLabel: "None",
        description: "The measure is finished.",
        thresholdLabel: null,
      };
  }
}

/**
 * What a player can actually do next.
 *
 * These are acts and requests, never outcomes. "Ask the committee to vote" is
 * something a sponsor does; "the committee reported favourably" is something
 * that happens as a result, and the recorded members decide which. Where the
 * next move belongs to somebody the player does not control — a governor with
 * a bill on the desk — the only step is to wait for them.
 */
export type MeasureStepKey =
  | "file-measure"
  | "request-referral"
  | "request-committee-hearing"
  | "move-committee-report"
  | "request-calendar-placement"
  | "offer-amendment"
  | "move-floor-vote"
  | "await-next-legislative-day"
  | "transmit-to-second-chamber"
  | "move-concurrence"
  | "request-enrollment"
  | "present-to-executive"
  | "await-executive-decision"
  | "move-veto-override"
  | "record-enactment";

/**
 * Steps the rules permit next. A step controlled by a rule the pack has not
 * resolved is not offered at all: an unresolved rule never authorises an act.
 */
export function availableMeasureSteps(
  world: World,
  measureId: EntityId,
): readonly MeasureStepKey[] {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  const position = measurePosition(world, measureId);

  switch (position.phase) {
    case "drafting":
      return ["file-measure"];
    case "awaiting-referral":
      return ["request-referral"];
    case "in-committee": {
      const steps: MeasureStepKey[] = [];
      if (!position.hearingHeld) steps.push("request-committee-hearing");
      steps.push("move-committee-report");
      return steps;
    }
    case "awaiting-floor":
      return ["request-calendar-placement"];
    case "on-floor": {
      const chamber = chamberByKey(pack, position.chamberKey ?? "");
      const stage = position.floorStageKey
        ? floorStageByKey(chamber, position.floorStageKey)
        : null;
      const blocked =
        position.earliestNextFloorDate !== null &&
        world.currentDate < position.earliestNextFloorDate;
      if (blocked) return ["await-next-legislative-day"];
      const steps: MeasureStepKey[] = [];
      const amendmentsAllowed = chamber.amendments.floorAmendmentsAllowed;
      if (
        stage?.amendable.kind === "known" &&
        stage.amendable.value &&
        amendmentsAllowed.kind === "known" &&
        amendmentsAllowed.value
      ) {
        steps.push("offer-amendment");
      }
      steps.push("move-floor-vote");
      return steps;
    }
    case "awaiting-transmittal":
      return ["transmit-to-second-chamber"];
    case "awaiting-concurrence":
      return ["move-concurrence"];
    case "awaiting-enrollment":
      return ["request-enrollment"];
    case "awaiting-presentation": {
      const required = pack.executive.presentmentRequired;
      return required.kind === "known" && required.value
        ? ["present-to-executive"]
        : [];
    }
    case "awaiting-executive":
      return ["await-executive-decision"];
    case "awaiting-override":
      return ["move-veto-override"];
    case "awaiting-enactment":
      return ["record-enactment"];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export function tallyDispositions(
  dispositions: readonly LegislativeVoteDisposition[],
): LegislativeVoteTally {
  const tally = {
    yea: 0,
    nay: 0,
    presentNotVoting: 0,
    absent: 0,
    excused: 0,
  };
  for (const entry of dispositions) {
    switch (entry.disposition) {
      case "yea":
        tally.yea += 1;
        break;
      case "nay":
        tally.nay += 1;
        break;
      case "present-not-voting":
        tally.presentNotVoting += 1;
        break;
      case "absent":
        tally.absent += 1;
        break;
      case "excused":
        tally.excused += 1;
        break;
    }
  }
  return tally;
}

function denominatorValueFor(
  denominator: VoteDenominator,
  context: {
    readonly eligibleMembers: number;
    readonly presentMembers: number | null;
    readonly tally: LegislativeVoteTally;
    readonly committeeMembers: number | null;
    readonly jointSeats: number | null;
    readonly label: string;
  },
): number {
  switch (denominator) {
    case "members-elected":
      return context.eligibleMembers;
    case "members-present":
      if (context.presentMembers === null) {
        throw new Error(
          `${context.label} counts against members present, but this vote does not record presence.`,
        );
      }
      return context.presentMembers;
    case "members-voting":
      return context.tally.yea + context.tally.nay;
    case "committee-members-appointed":
      if (context.committeeMembers === null) {
        throw new Error(
          `${context.label} counts against committee membership outside a committee.`,
        );
      }
      return context.committeeMembers;
    case "joint-total-membership":
      if (context.jointSeats === null) {
        throw new Error(
          `${context.label} counts against a joint sitting outside one.`,
        );
      }
      return context.jointSeats;
  }
}

export interface RecordVoteInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly forum: LegislativeVoteForum;
  readonly purpose: LegislativeVotePurpose;
  readonly floorStageKey?: string | null;
  readonly threshold: VoteThresholdRule;
  readonly eligibleMembers: number;
  /** Omit or pass null when the record does not represent presence. */
  readonly presentMembers?: number | null;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly committeeMembers?: number | null;
  readonly jointSeats?: number | null;
  readonly takenAt?: IsoDate;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Builds a legislative vote record and decides it structurally. The caller
 * supplies member dispositions; this function never invents them.
 */
function buildVote(
  world: World,
  input: RecordVoteInput,
): LegislativeVoteRecord {
  if (input.dispositions.length === 0) {
    throw new Error("A legislative vote must record member dispositions.");
  }
  const seen = new Set<string>();
  for (const entry of input.dispositions) {
    if (entry.memberKey.trim().length === 0) {
      throw new Error("Every vote disposition needs a member key.");
    }
    if (seen.has(entry.memberKey)) {
      throw new Error(`Member voted twice on one question: ${entry.memberKey}`);
    }
    seen.add(entry.memberKey);
    if (entry.personId && !world.people[entry.personId]) {
      throw new Error(
        `Vote disposition references a missing person: ${entry.personId}`,
      );
    }
  }
  if (
    !Number.isSafeInteger(input.eligibleMembers) ||
    input.eligibleMembers <= 0
  ) {
    throw new Error("A legislative vote needs a positive eligible membership.");
  }
  if (input.dispositions.length > input.eligibleMembers) {
    throw new Error(
      "A legislative vote recorded more members than are eligible to vote.",
    );
  }

  const tally = tallyDispositions(input.dispositions);
  const presentMembers = input.presentMembers ?? null;
  if (presentMembers !== null) {
    const actuallyPresent = tally.yea + tally.nay + tally.presentNotVoting;
    if (presentMembers < actuallyPresent) {
      throw new Error(
        "Recorded presence is smaller than the number of members who acted.",
      );
    }
    if (presentMembers > input.eligibleMembers) {
      throw new Error("More members were present than are eligible to vote.");
    }
  }

  const resolution = resolveRequiredVotes(
    input.threshold,
    denominatorValueFor(input.threshold.countedAgainst, {
      eligibleMembers: input.eligibleMembers,
      presentMembers,
      tally,
      committeeMembers: input.committeeMembers ?? null,
      jointSeats: input.jointSeats ?? null,
      label: `Threshold '${input.threshold.label}'`,
    }),
  );

  return {
    id: createStableId(
      "legislative-vote",
      `${input.measureId}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: input.measureId,
    forum: input.forum,
    purpose: input.purpose,
    floorStageKey: input.floorStageKey ?? null,
    takenAt: input.takenAt ?? world.currentDate,
    eligibleMembers: input.eligibleMembers,
    presentMembers,
    dispositions: input.dispositions.map((entry) => ({ ...entry })),
    tally,
    thresholdLabel: input.threshold.label,
    denominatorKind: input.threshold.countedAgainst,
    denominatorValue: resolution.denominatorValue,
    requiredVotes: resolution.requiredVotes,
    outcome: tally.yea >= resolution.requiredVotes ? "passed" : "failed",
    provenance: {
      method: input.provenance.method,
      note: input.provenance.note,
      sourceEntityIds: [...input.provenance.sourceEntityIds],
    },
  };
}

// ---------------------------------------------------------------------------
// Internal append helpers
// ---------------------------------------------------------------------------

interface AppendActionInput {
  readonly measure: LegislativeMeasureRecord;
  readonly kind: LegislativeActionKind;
  readonly stableKey: string;
  readonly chamberKey: string | null;
  readonly committeeKey: string | null;
  readonly floorStageKey: string | null;
  readonly actorLabel: string;
  readonly rationale: string;
  readonly summary: string;
  readonly eventType: string;
  readonly tags: readonly string[];
  readonly participants?: readonly EventParticipant[];
  readonly involvedEntityIds?: readonly EntityId[];
  readonly vote?: LegislativeVoteRecord | null;
  readonly amendment?: LegislativeAmendmentRecord | null;
  readonly occurredAt?: IsoDate;
}

function appendAction(world: World, input: AppendActionInput): World {
  const measure = input.measure;
  const jurisdiction = world.jurisdictions[measure.jurisdictionId];
  const occurredAt = input.occurredAt ?? world.currentDate;
  const eventStableKey = `event:${input.stableKey}`;

  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: input.eventType as `${string}.${string}`,
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        measure.id,
        measure.jurisdictionId,
        ...(input.involvedEntityIds ?? []),
        ...(input.participants ?? []).map(
          (participant) => participant.personId,
        ),
      ]),
    ],
    participants: input.participants ?? [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", ...input.tags],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: jurisdiction?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: input.rationale,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  const event = next.history.events.find(
    (candidate) => candidate.stableKey === eventStableKey,
  );
  if (!event) {
    throw new Error("Failed to record the legislative event.");
  }

  let voteRecord: LegislativeVoteRecord | null = null;
  if (input.vote) {
    voteRecord = { ...input.vote, sequence: next.history.nextSequence };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        legislativeVotes: [
          ...(next.history.legislativeVotes ?? []),
          voteRecord,
        ],
      },
    };
  }

  let amendmentRecord: LegislativeAmendmentRecord | null = null;
  if (input.amendment) {
    amendmentRecord = {
      ...input.amendment,
      sequence: next.history.nextSequence,
      voteId: voteRecord?.id ?? input.amendment.voteId,
    };
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        legislativeAmendments: [
          ...(next.history.legislativeAmendments ?? []),
          amendmentRecord,
        ],
      },
    };
  }

  const action: LegislativeActionRecord = {
    id: createStableId(
      "legislative-action",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    measureId: measure.id,
    kind: input.kind,
    occurredAt,
    chamberKey: input.chamberKey,
    committeeKey: input.committeeKey,
    floorStageKey: input.floorStageKey,
    actorLabel: input.actorLabel,
    rationale: input.rationale,
    eventId: event.id,
    voteId: voteRecord?.id ?? null,
    amendmentId: amendmentRecord?.id ?? null,
  };

  return {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      legislativeActions: [...(next.history.legislativeActions ?? []), action],
    },
  };
}

function assertPhase(
  world: World,
  measureId: EntityId,
  allowed: readonly MeasurePhase[],
  attempted: string,
): MeasurePosition {
  const position = measurePosition(world, measureId);
  if (!allowed.includes(position.phase)) {
    throw new Error(
      `Cannot ${attempted}: the measure is currently ${position.phase}.`,
    );
  }
  return position;
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[] | undefined,
  stableKey: string,
  label: string,
): void {
  if (stableKey.trim().length === 0) {
    throw new Error(`${label} stable key must not be empty.`);
  }
  if ((records ?? []).some((record) => record.stableKey === stableKey)) {
    throw new Error(`${label} stable key already exists: ${stableKey}`);
  }
}

/**
 * How many members are actually elected and entitled to vote in this chamber.
 *
 * A chamber's authorised seats and its current membership are not the same
 * number: a vacant seat still exists but nobody holds it, and "a majority of
 * members elected" counts people, not desks. Callers that model a full roster
 * may leave this out; anything modelling vacancies supplies the real count.
 */
export function electedMembersFor(
  chamber: ChamberRule,
  electedMembers?: number,
): number {
  if (electedMembers === undefined) return chamber.seats;
  if (!Number.isSafeInteger(electedMembers) || electedMembers <= 0) {
    throw new Error(
      `The ${chamber.name} needs a positive count of elected members.`,
    );
  }
  if (electedMembers > chamber.seats) {
    throw new Error(
      `The ${chamber.name} cannot have more members elected than its ${chamber.seats} seats.`,
    );
  }
  return electedMembers;
}

/**
 * The next free stable key under a semantic prefix for this measure.
 *
 * Identity is owned by the saved world, never by how many times a browser tab
 * has been through this screen. Reloading a save and carrying on produces the
 * same next key as never having reloaded at all.
 */
export function nextMeasureStableKey(
  world: World,
  measureId: EntityId,
  prefix: string,
): string {
  if (prefix.trim().length === 0) {
    throw new Error("A stable key prefix must not be empty.");
  }
  const taken = new Set<string>();
  const families: readonly (readonly {
    readonly measureId: EntityId;
    readonly stableKey: string;
  }[])[] = [
    world.history.legislativeActions ?? [],
    world.history.committeeReferrals ?? [],
    world.history.committeeActions ?? [],
    world.history.legislativeAmendments ?? [],
    world.history.legislativeVotes ?? [],
    world.history.executiveDispositions ?? [],
    world.history.legislativeEnactments ?? [],
  ];
  for (const family of families) {
    for (const record of family) {
      if (record.measureId === measureId) taken.add(record.stableKey);
    }
  }
  for (const item of world.history.futureDueItems ?? []) {
    if (item.entityIds.includes(measureId)) taken.add(item.stableKey);
  }
  for (let n = 1; n <= taken.size + 1; n += 1) {
    const candidate = `${prefix}:${n}`;
    const collides = [...taken].some(
      (key) => key === candidate || key.startsWith(`${candidate}:`),
    );
    if (!collides) return candidate;
  }
  throw new Error(`Could not derive a free stable key for '${prefix}'.`);
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

export interface IntroduceMeasureInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly origin: LegislativeMeasureOrigin;
  readonly subjectClass: LegislativeSubjectClass;
  readonly originChamberKey?: string;
  readonly sponsorPersonId?: EntityId | null;
  readonly sourceDocumentKey?: string | null;
  readonly policyAlternativeIds?: readonly EntityId[];
}

/** Files a measure and gives it institutional identity. */
export function introduceMeasure(
  world: World,
  input: IntroduceMeasureInput,
): World {
  assertUniqueStableKey(
    world.history.legislativeMeasures,
    input.stableKey,
    "Legislative measure",
  );
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      `Measure references a missing jurisdiction: ${input.jurisdictionId}`,
    );
  }
  const pack = rulePackById(input.rulePackId);
  const chamberKey =
    input.originChamberKey ?? defaultOriginChamber(pack).chamberKey;
  const chamber = chamberByKey(pack, chamberKey);
  if (!chamber.introductionAllowed) {
    throw new Error(`Measures cannot be introduced in the ${chamber.name}.`);
  }
  // Where this particular bill starts has to satisfy the jurisdiction's own
  // origination rule — the Minnesota revenue bill that must begin in the House,
  // and nothing at all where the rule is unresolved.
  assertOriginationPermitted(pack, input.subjectClass, chamberKey);
  if (input.designation.trim().length === 0) {
    throw new Error("A measure needs an institutional designation.");
  }
  if (input.sponsorPersonId && !world.people[input.sponsorPersonId]) {
    throw new Error(
      `Measure references a missing sponsor: ${input.sponsorPersonId}`,
    );
  }
  for (const alternativeId of input.policyAlternativeIds ?? []) {
    const exists = world.history.policyAlternatives.some(
      (record) => record.id === alternativeId,
    );
    if (!exists) {
      throw new Error(
        `Measure references a missing policy alternative: ${alternativeId}`,
      );
    }
  }

  const measure: LegislativeMeasureRecord = {
    id: createStableId(
      "legislative-measure",
      `${world.id}:${input.jurisdictionId}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    jurisdictionId: input.jurisdictionId,
    rulePackId: pack.packId,
    designation: input.designation,
    shortTitle: input.shortTitle,
    summary: input.summary,
    origin: input.origin,
    subjectClass: input.subjectClass,
    originChamberKey: chamberKey,
    sponsorPersonId: input.sponsorPersonId ?? null,
    introducedAt: world.currentDate,
    sourceDocumentKey: input.sourceDocumentKey ?? null,
    policyAlternativeIds: [...(input.policyAlternativeIds ?? [])],
  };

  const withMeasure: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
    },
  };

  const sponsor = measure.sponsorPersonId
    ? withMeasure.people[measure.sponsorPersonId]
    : null;

  return appendAction(withMeasure, {
    measure,
    kind: "introduced",
    stableKey: `${input.stableKey}:introduced`,
    chamberKey,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: sponsor ? personName(sponsor) : chamber.name,
    rationale: `Filed in the ${chamber.name}.`,
    summary: `${measure.designation} — ${measure.shortTitle} — was filed in the ${chamber.name}.`,
    eventType: "legislation.measure-introduced",
    tags: ["legislation.introduced", `chamber:${chamberKey}`],
    participants: measure.sponsorPersonId
      ? [
          {
            personId: measure.sponsorPersonId,
            role: "agency:sponsor" as EventParticipant["role"],
            detail: `Sponsor of ${measure.designation}`,
          },
        ]
      : [],
  });
}

export interface ReferMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly committeeKey: string;
}

export function referMeasure(world: World, input: ReferMeasureInput): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-referral"],
    "refer the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = committeeByKey(chamber, input.committeeKey);
  assertUniqueStableKey(
    world.history.committeeReferrals,
    input.stableKey,
    "Committee referral",
  );

  const priorReferrals = (world.history.committeeReferrals ?? []).filter(
    (record) => record.measureId === measure.id,
  );

  const referral: CommitteeReferralRecord = {
    id: createStableId(
      "legislative-referral",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    referredAt: world.currentDate,
    referredByLabel: chamber.referral.authorityLabel,
    order: priorReferrals.length + 1,
  };

  const withReferral: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      committeeReferrals: [
        ...(world.history.committeeReferrals ?? []),
        referral,
      ],
    },
  };

  return appendAction(withReferral, {
    measure,
    kind: "referred",
    stableKey: `${input.stableKey}:referred`,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    floorStageKey: null,
    actorLabel: chamber.referral.authorityLabel,
    rationale: `${chamber.referral.authorityLabel} sent the measure to ${committee.name}.`,
    summary: `${measure.designation} was referred to the ${committee.name}.`,
    eventType: "legislation.measure-referred",
    tags: ["legislation.referred", `committee:${committee.committeeKey}`],
    involvedEntityIds: [referral.id],
  });
}

export interface ScheduleCommitteeHearingInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly hearingDate: string;
}

/**
 * Schedules a committee hearing through the world's existing future-due
 * substrate. Legislative activity never runs on a second clock.
 */
export function scheduleCommitteeHearing(
  world: World,
  input: ScheduleCommitteeHearingInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(world, input.measureId, ["in-committee"], "schedule a hearing");
  const hearingDate = makeIsoDate(input.hearingDate);
  if (hearingDate <= world.currentDate) {
    throw new Error("A committee hearing must be scheduled for a future date.");
  }
  return scheduleFutureDueItem(world, {
    stableKey: input.stableKey,
    dueAt: hearingDate,
    transitionKey: COMMITTEE_HEARING_TRANSITION_KEY,
    entityIds: [measure.id],
    jurisdictionId: measure.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [measure.id] },
  });
}

export function committeeHearingTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== COMMITTEE_HEARING_TRANSITION_KEY) {
    throw new Error("Committee hearing handler received another transition.");
  }
  const measureId = dueItem.entityIds[0];
  if (!measureId) {
    throw new Error("Committee hearing due item lacks a measure reference.");
  }
  const measure = requireMeasure(world, measureId);
  const position = measurePosition(world, measureId);
  if (position.phase !== "in-committee") {
    return {
      world,
      status: "cancelled",
      reasonKey: "legislation:hearing-obsolete",
      context: "The measure left committee before the hearing date.",
      outcomeEventId: null,
    };
  }
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = position.committeeKey
    ? committeeByKey(chamber, position.committeeKey)
    : null;

  const next = appendAction(world, {
    measure,
    kind: "committee-hearing-held",
    stableKey: `${dueItem.stableKey}:hearing`,
    chamberKey: chamber.chamberKey,
    committeeKey: position.committeeKey,
    floorStageKey: null,
    actorLabel: committee?.name ?? "Committee",
    rationale: "The committee took public testimony on the measure.",
    summary: `${measure.designation} received a public hearing in the ${committee?.name ?? "committee"}.`,
    eventType: "legislation.committee-hearing",
    tags: ["legislation.hearing"],
    occurredAt: dueItem.dueAt,
  });

  const event = next.history.events.find(
    (candidate) => candidate.stableKey === `event:${dueItem.stableKey}:hearing`,
  );

  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Committee hearing held for ${measure.designation}.`,
    outcomeEventId: event?.id ?? null,
  };
}

export interface CommitteeDispositionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  /**
   * What the committee recommends if the motion to report carries. Whether it
   * carries is decided by the recorded members, not by this field: a committee
   * that votes to report a bill it dislikes still sends it to the floor.
   */
  readonly recommendation: CommitteeRecommendation;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  readonly rationale: string;
  readonly provenance: LegislativeVoteProvenance;
}

/** Records a committee's recorded vote and its report. */
export function recordCommitteeDisposition(
  world: World,
  input: CommitteeDispositionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["in-committee"],
    "report the measure out of committee",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const committee = committeeByKey(chamber, position.committeeKey ?? "");
  assertUniqueStableKey(
    world.history.committeeActions,
    input.stableKey,
    "Committee action",
  );

  const referral = (world.history.committeeReferrals ?? [])
    .filter(
      (record) =>
        record.measureId === measure.id &&
        record.committeeKey === committee.committeeKey,
    )
    .slice()
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (!referral) {
    throw new Error("The measure has no referral to this committee.");
  }

  const hearingHeld = measureActions(world, measure.id).some(
    (action) => action.kind === "committee-hearing-held",
  );
  const mustBeHeard = chamber.referral.everyMeasureMustBeHeard;
  if (mustBeHeard.kind === "known" && mustBeHeard.value && !hearingHeld) {
    throw new Error(
      `${chamber.name} rules guarantee every referred measure a public hearing; hold the hearing before reporting.`,
    );
  }

  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: {
      kind: "committee",
      chamberKey: chamber.chamberKey,
      committeeKey: committee.committeeKey,
    },
    purpose: "committee-report",
    threshold: committee.reportThreshold,
    eligibleMembers: committee.appointedMembers,
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    committeeMembers: committee.appointedMembers,
    provenance: input.provenance,
  });

  // The motion to report is what controls reachability. The recommendation
  // attached to a carried report — favourable, unfavourable, or none at all —
  // is the committee's opinion and does not stop the bill.
  const reported = vote.outcome === "passed";
  const disposition: CommitteeDisposition = reported
    ? { kind: "reported", recommendation: input.recommendation }
    : { kind: "not-reported" };

  const withVoteWorld = appendAction(world, {
    measure,
    kind: reported ? "committee-reported" : "committee-not-reported",
    stableKey: `${input.stableKey}:${reported ? "reported" : "not-reported"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: committee.committeeKey,
    floorStageKey: null,
    actorLabel: committee.name,
    rationale: input.rationale,
    summary: reported
      ? `The ${committee.name} reported ${measure.designation} to the floor ${REPORT_PHRASES[input.recommendation]} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${committee.name} did not report ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`,
    eventType: reported
      ? "legislation.committee-reported"
      : "legislation.committee-not-reported",
    tags: [
      reported ? "legislation.reported" : "legislation.failed",
      `committee:${committee.committeeKey}`,
    ],
    involvedEntityIds: [referral.id],
    vote,
  });

  const storedVote = (withVoteWorld.history.legislativeVotes ?? []).find(
    (record) => record.stableKey === vote.stableKey,
  );
  if (!storedVote) {
    throw new Error("Failed to store the committee vote.");
  }

  const committeeAction: CommitteeActionRecord = {
    id: createStableId(
      "legislative-committee-action",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: withVoteWorld.history.nextSequence,
    measureId: measure.id,
    referralId: referral.id,
    actedAt: withVoteWorld.currentDate,
    disposition,
    hearingHeld,
    voteId: storedVote.id,
  };

  return {
    ...withVoteWorld,
    history: {
      ...withVoteWorld.history,
      nextSequence: withVoteWorld.history.nextSequence + 1,
      committeeActions: [
        ...(withVoteWorld.history.committeeActions ?? []),
        committeeAction,
      ],
    },
  };
}

export interface PlaceOnCalendarInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly rationale?: string;
}

export function placeMeasureOnCalendar(
  world: World,
  input: PlaceOnCalendarInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-floor"],
    "place the measure on the calendar",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const firstStage = chamber.floorStages[0];
  if (!firstStage) {
    throw new Error(`The ${chamber.name} declares no floor stage.`);
  }
  return appendAction(world, {
    measure,
    kind: "placed-on-calendar",
    stableKey: input.stableKey,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: firstStage.stageKey,
    actorLabel: `${chamber.name} leadership`,
    rationale:
      input.rationale ?? `Scheduled for ${firstStage.label} on the floor.`,
    summary: `${measure.designation} was placed on the ${chamber.name} calendar for ${firstStage.label}.`,
    eventType: "legislation.placed-on-calendar",
    tags: ["legislation.calendar", `chamber:${chamber.chamberKey}`],
  });
}

export interface OfferAmendmentInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly description: string;
  readonly offeredByPersonId?: EntityId | null;
  readonly offeredByLabel: string;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  /** Members currently elected, when the chamber is not at full strength. */
  readonly electedMembers?: number;
  readonly provenance: LegislativeVoteProvenance;
}

/** Offers a floor amendment and decides it by recorded vote. */
export function offerFloorAmendment(
  world: World,
  input: OfferAmendmentInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["on-floor"],
    "amend the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  if (stage.amendable.kind !== "known") {
    throw new Error(
      `Whether ${stage.label} accepts amendments is unresolved in ${pack.displayName}: ${stage.amendable.note}`,
    );
  }
  if (!stage.amendable.value) {
    throw new Error(`${stage.label} does not accept amendments.`);
  }
  // An unresolved or inapplicable rule is not permission. Only a rule that is
  // known and says yes lets the chamber amend.
  if (
    !requireKnown(
      chamber.amendments.floorAmendmentsAllowed,
      `Whether the ${chamber.name} permits floor amendments`,
    )
  ) {
    throw new Error(`The ${chamber.name} does not permit floor amendments.`);
  }
  assertUniqueStableKey(
    world.history.legislativeAmendments,
    input.stableKey,
    "Amendment",
  );

  const threshold = requireKnown(stage.vote, `${stage.label} vote threshold`);
  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "amendment",
    floorStageKey: stage.stageKey,
    threshold,
    eligibleMembers: electedMembersFor(chamber, input.electedMembers),
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });

  const adopted = vote.outcome === "passed";
  const amendment: LegislativeAmendmentRecord = {
    id: createStableId(
      "legislative-amendment",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: 0,
    measureId: measure.id,
    chamberKey: chamber.chamberKey,
    floorStageKey: stage.stageKey,
    offeredAt: world.currentDate,
    offeredByPersonId: input.offeredByPersonId ?? null,
    offeredByLabel: input.offeredByLabel,
    description: input.description,
    status: adopted ? "adopted" : "rejected",
    voteId: vote.id,
  };

  return appendAction(world, {
    measure,
    kind: adopted ? "amendment-adopted" : "amendment-rejected",
    stableKey: `${input.stableKey}:${adopted ? "adopted" : "rejected"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: stage.stageKey,
    actorLabel: input.offeredByLabel,
    rationale: input.description,
    summary: adopted
      ? `The ${chamber.name} adopted an amendment to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} rejected an amendment to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`,
    eventType: adopted
      ? "legislation.amendment-adopted"
      : "legislation.amendment-rejected",
    tags: ["legislation.amendment", `chamber:${chamber.chamberKey}`],
    vote,
    amendment,
  });
}

export interface FloorVoteInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  /** Members currently elected, when the chamber is not at full strength. */
  readonly electedMembers?: number;
  readonly rationale?: string;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Takes the recorded vote at the measure's current floor stage. Where a
 * constitution requires several separate floor stages, each one is its own
 * recorded vote and the measure advances one stage at a time.
 */
export function takeFloorVote(world: World, input: FloorVoteInput): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["on-floor"],
    "take a floor vote",
  );
  const pack = rulePackById(measure.rulePackId);
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  const threshold = requireKnown(stage.vote, `${stage.label} vote threshold`);
  // Where a chamber's stages must fall on separate legislative days, that is a
  // rule about time, and it is enforced on the world's own clock.
  if (
    position.earliestNextFloorDate !== null &&
    world.currentDate < position.earliestNextFloorDate
  ) {
    throw new Error(
      `${stage.label} cannot be taken until ${position.earliestNextFloorDate}: the ${chamber.name} takes its stages on separate legislative days.`,
    );
  }

  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "floor-stage",
    floorStageKey: stage.stageKey,
    threshold,
    eligibleMembers: electedMembersFor(chamber, input.electedMembers),
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });

  const passed = vote.outcome === "passed";
  const onward = nextFloorStageKey(chamber, stage.stageKey);
  const summary = passed
    ? onward
      ? `${measure.designation} advanced past ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} passed ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
    : `${measure.designation} failed at ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`;

  return appendAction(world, {
    measure,
    kind: passed ? "floor-stage-passed" : "floor-stage-failed",
    stableKey: `${input.stableKey}:${passed ? "passed" : "failed"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: stage.stageKey,
    actorLabel: chamber.name,
    rationale:
      input.rationale ??
      `${stage.label} required ${vote.requiredVotes} of ${vote.denominatorValue} (${threshold.label}).`,
    summary,
    eventType: passed
      ? "legislation.floor-stage-passed"
      : "legislation.floor-stage-failed",
    tags: [
      passed ? "legislation.passed-stage" : "legislation.failed",
      `chamber:${chamber.chamberKey}`,
      `stage:${stage.stageKey}`,
    ],
    vote,
  });
}

export interface TransmitMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

/** Sends a measure that cleared one chamber to the next one. */
export function transmitMeasure(
  world: World,
  input: TransmitMeasureInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-transmittal"],
    "transmit the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  if (pack.interChamber.kind !== "second-chamber") {
    throw new Error(
      `${pack.displayName} has one chamber, so there is nowhere to transmit a measure.`,
    );
  }
  const fromKey = position.chamberKey ?? measure.originChamberKey;
  const onward = nextChamberKey(pack, fromKey, measure.originChamberKey);
  if (!onward) {
    throw new Error("The measure has already cleared every chamber.");
  }
  const target = chamberByKey(pack, onward);
  return appendAction(world, {
    measure,
    kind: "transmitted",
    stableKey: input.stableKey,
    chamberKey: target.chamberKey,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: chamberByKey(pack, fromKey).name,
    rationale: `Sent to the ${target.name} for its own consideration.`,
    summary: `${measure.designation} was transmitted to the ${target.name}.`,
    eventType: "legislation.measure-transmitted",
    tags: ["legislation.transmitted", `chamber:${target.chamberKey}`],
  });
}

export interface ConcurrenceVoteInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly presentMembers?: number | null;
  readonly electedMembers?: number;
  readonly rationale?: string;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Records the originating chamber's vote on the changes the second chamber
 * made.
 *
 * Two chambers cannot send different texts to a governor. Where the second
 * chamber amends a bill, the chamber it started in has to agree to that
 * amendment before there is one bill to enrol — in Kentucky the amended bill
 * goes back to the Rules Committee and then to the floor for concurrence
 * (House Rule 54; Senate Rule 54; House Rule 59). Refusing to concur ends the
 * bill here; a conference between the two chambers is not modelled.
 */
export function recordConcurrenceVote(
  world: World,
  input: ConcurrenceVoteInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = assertPhase(
    world,
    input.measureId,
    ["awaiting-concurrence"],
    "vote on the other chamber's changes",
  );
  const pack = rulePackById(measure.rulePackId);
  if (pack.interChamber.kind !== "second-chamber") {
    throw new Error(
      `${pack.displayName} has one chamber, so there is nothing to concur in.`,
    );
  }
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const threshold = pack.interChamber.concurrenceThreshold;
  const eligibleMembers = electedMembersFor(chamber, input.electedMembers);

  const vote = buildVote(world, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "concurrence",
    threshold,
    eligibleMembers,
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });

  const concurred = vote.outcome === "passed";
  return appendAction(world, {
    measure,
    kind: concurred ? "concurred" : "concurrence-failed",
    stableKey: `${input.stableKey}:${concurred ? "concurred" : "not-concurred"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: chamber.name,
    rationale:
      input.rationale ??
      `Concurrence required ${vote.requiredVotes} of ${vote.denominatorValue} (${threshold.label}).`,
    summary: concurred
      ? `The ${chamber.name} agreed to the other chamber's changes to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} refused to accept the other chamber's changes to ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`,
    eventType: concurred
      ? "legislation.measure-concurred"
      : "legislation.measure-concurrence-failed",
    tags: [
      concurred ? "legislation.concurred" : "legislation.failed",
      `chamber:${chamber.chamberKey}`,
    ],
    vote,
  });
}

export interface EnrollMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

export function enrollMeasure(world: World, input: EnrollMeasureInput): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-enrollment"],
    "enroll the measure",
  );
  return appendAction(world, {
    measure,
    kind: "enrolled",
    stableKey: input.stableKey,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: "Enrolling clerk",
    rationale: "The measure was prepared in its final form.",
    summary: `${measure.designation} was enrolled.`,
    eventType: "legislation.measure-enrolled",
    tags: ["legislation.enrolled"],
  });
}

export interface PresentMeasureInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
}

export function presentMeasureToExecutive(
  world: World,
  input: PresentMeasureInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-presentation"],
    "present the measure",
  );
  const pack = rulePackById(measure.rulePackId);
  if (
    !requireKnown(
      pack.executive.presentmentRequired,
      `Whether ${pack.displayName} presents measures to the ${pack.executive.titleLabel}`,
    )
  ) {
    throw new Error(
      `${pack.displayName} does not present measures to the ${pack.executive.titleLabel}.`,
    );
  }
  return appendAction(world, {
    measure,
    kind: "presented-to-executive",
    stableKey: input.stableKey,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: "Enrolling clerk",
    rationale: `Delivered to the ${pack.executive.titleLabel}.`,
    summary: `${measure.designation} was presented to the ${pack.executive.titleLabel}.`,
    eventType: "legislation.measure-presented",
    tags: ["legislation.presented"],
  });
}

export interface ExecutiveActionInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly action: Extract<ExecutiveActionKind, "signed" | "vetoed">;
  readonly rationale: string;
}

export function recordExecutiveAction(
  world: World,
  input: ExecutiveActionInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-executive"],
    "record executive action",
  );
  assertUniqueStableKey(
    world.history.executiveDispositions,
    input.stableKey,
    "Executive disposition",
  );
  const pack = rulePackById(measure.rulePackId);
  const signed = input.action === "signed";

  const disposition: ExecutiveDispositionRecord = {
    id: createStableId(
      "executive-disposition",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    measureId: measure.id,
    // One executive act, one date. The disposition, the action and the event
    // all carry the world's current date, so the record cannot say the
    // Governor acted years before the bill existed.
    actedAt: world.currentDate,
    action: input.action,
    actorLabel: pack.executive.titleLabel,
    rationale: input.rationale,
  };

  const withDisposition: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      executiveDispositions: [
        ...(world.history.executiveDispositions ?? []),
        disposition,
      ],
    },
  };

  return appendAction(withDisposition, {
    measure,
    kind: signed ? "signed" : "vetoed",
    stableKey: `${input.stableKey}:${signed ? "signed" : "vetoed"}`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.executive.titleLabel,
    rationale: input.rationale,
    summary: signed
      ? `The ${pack.executive.titleLabel} signed ${measure.designation}.`
      : `The ${pack.executive.titleLabel} vetoed ${measure.designation}.`,
    eventType: signed
      ? "legislation.measure-signed"
      : "legislation.measure-vetoed",
    tags: [signed ? "legislation.signed" : "legislation.vetoed"],
    involvedEntityIds: [disposition.id],
  });
}

export interface OverrideAttemptInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  /**
   * Dispositions per forum. For per-chamber override this is keyed by chamber;
   * for a joint sitting there is exactly one entry keyed by the forum name.
   */
  readonly forums: readonly {
    readonly forumKey: string;
    readonly dispositions: readonly LegislativeVoteDisposition[];
    readonly presentMembers?: number | null;
    readonly electedMembers?: number;
  }[];
  readonly rationale: string;
  readonly provenance: LegislativeVoteProvenance;
}

/**
 * Reconsiders a vetoed measure. Where the override happens is a structural
 * rule: some legislatures vote separately in each chamber, and others sit
 * jointly as a single larger body with a single threshold.
 */
export function attemptVetoOverride(
  world: World,
  input: OverrideAttemptInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  assertPhase(
    world,
    input.measureId,
    ["awaiting-override"],
    "attempt an override",
  );
  const pack = rulePackById(measure.rulePackId);
  const override = pack.executive.override;

  let next = world;
  let allSucceeded = true;
  const summaries: string[] = [];

  if (override.kind === "joint-session") {
    if (input.forums.length !== 1) {
      throw new Error(
        `${override.forumName} reconsiders a veto as one body; supply exactly one forum.`,
      );
    }
    const entry = input.forums[0]!;
    const threshold =
      measure.subjectClass === "general-policy"
        ? override.threshold
        : requireKnown(
            override.appropriationsThreshold,
            "appropriations override threshold",
          );
    const vote = buildVote(next, {
      stableKey: `${input.stableKey}:${entry.forumKey}:vote`,
      measureId: measure.id,
      forum: { kind: "joint-session", forumName: override.forumName },
      purpose: "veto-override",
      threshold,
      eligibleMembers: override.combinedSeats,
      presentMembers: entry.presentMembers ?? null,
      dispositions: entry.dispositions,
      jointSeats: override.combinedSeats,
      provenance: input.provenance,
    });
    allSucceeded = vote.outcome === "passed";
    summaries.push(
      `${override.forumName}: ${vote.tally.yea}-${vote.tally.nay} (needed ${vote.requiredVotes} of ${vote.denominatorValue})`,
    );
    next = appendAction(next, {
      measure,
      kind: allSucceeded ? "override-succeeded" : "override-failed",
      stableKey: `${input.stableKey}:${allSucceeded ? "override-succeeded" : "override-failed"}`,
      chamberKey: null,
      committeeKey: null,
      floorStageKey: null,
      actorLabel: override.forumName,
      rationale: input.rationale,
      summary: allSucceeded
        ? `${override.forumName} overrode the veto of ${measure.designation}. ${summaries.join("; ")}.`
        : `${override.forumName} failed to override the veto of ${measure.designation}. ${summaries.join("; ")}.`,
      eventType: allSucceeded
        ? "legislation.override-succeeded"
        : "legislation.override-failed",
      tags: [allSucceeded ? "legislation.override" : "legislation.failed"],
      vote,
    });
    return next;
  }

  const expected = pack.chamberOrder;
  const provided = input.forums.map((entry) => entry.forumKey);
  for (const chamberKey of expected) {
    if (!provided.includes(chamberKey)) {
      throw new Error(
        `Each chamber must vote on the override; missing '${chamberKey}'.`,
      );
    }
  }

  const votes: LegislativeVoteRecord[] = [];
  for (const chamberKey of expected) {
    const entry = input.forums.find((item) => item.forumKey === chamberKey)!;
    const chamber = chamberByKey(pack, chamberKey);
    const vote = buildVote(next, {
      stableKey: `${input.stableKey}:${chamberKey}:vote`,
      measureId: measure.id,
      forum: { kind: "chamber", chamberKey },
      purpose: "veto-override",
      threshold: override.threshold,
      eligibleMembers: electedMembersFor(chamber, entry.electedMembers),
      presentMembers: entry.presentMembers ?? null,
      dispositions: entry.dispositions,
      provenance: input.provenance,
    });
    votes.push(vote);
    if (vote.outcome !== "passed") allSucceeded = false;
    summaries.push(
      `${chamber.name}: ${vote.tally.yea}-${vote.tally.nay} (needed ${vote.requiredVotes} of ${vote.denominatorValue})`,
    );
  }

  votes.forEach((vote, index) => {
    const chamberKey = expected[index]!;
    const chamber = chamberByKey(pack, chamberKey);
    next = appendAction(next, {
      measure,
      kind: "override-chamber-recorded",
      stableKey: `${input.stableKey}:${chamberKey}:result`,
      chamberKey,
      committeeKey: null,
      floorStageKey: null,
      actorLabel: chamber.name,
      rationale: input.rationale,
      summary: `${chamber.name} voted ${vote.tally.yea}-${vote.tally.nay} on overriding the veto of ${measure.designation}; ${vote.requiredVotes} of ${vote.denominatorValue} were required.`,
      eventType:
        vote.outcome === "passed"
          ? "legislation.override-chamber-passed"
          : "legislation.override-chamber-failed",
      tags: ["legislation.override", `chamber:${chamberKey}`],
      vote,
    });
  });

  const failedChamber = expected.find(
    (chamberKey, index) => votes[index]!.outcome !== "passed",
  );
  next = appendAction(next, {
    measure,
    kind: allSucceeded ? "override-succeeded" : "override-failed",
    stableKey: `${input.stableKey}:${allSucceeded ? "override-succeeded" : "override-failed"}`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.displayName,
    rationale: allSucceeded
      ? "Every chamber reached the threshold required to override."
      : `The ${chamberByKey(pack, failedChamber ?? expected[0]!).name} did not reach the threshold required to override.`,
    summary: allSucceeded
      ? `The veto of ${measure.designation} was overridden. ${summaries.join("; ")}.`
      : `The veto of ${measure.designation} stood. ${summaries.join("; ")}.`,
    eventType: allSucceeded
      ? "legislation.override-succeeded"
      : "legislation.override-failed",
    tags: [allSucceeded ? "legislation.override" : "legislation.failed"],
  });

  return next;
}

export interface RecordEnactmentInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly actDesignation?: string | null;
  readonly effectiveAt?: string | null;
}

/** Closes out a measure that became law. */
export function recordEnactment(
  world: World,
  input: RecordEnactmentInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  // Being signed once is not standing authority to be enacted later. The
  // measure must be sitting at exactly the point where enactment is the next
  // legal step, and it can only reach that point once.
  assertPhase(
    world,
    input.measureId,
    ["awaiting-enactment"],
    "record the measure as law",
  );
  const alreadyResolved = (world.history.legislativeEnactments ?? []).some(
    (record) => record.measureId === measure.id,
  );
  if (alreadyResolved) {
    throw new Error("This measure has already been recorded as resolved.");
  }
  assertUniqueStableKey(
    world.history.legislativeEnactments,
    input.stableKey,
    "Enactment",
  );
  const pack = rulePackById(measure.rulePackId);
  const effectiveRule = pack.enactment.defaultEffectiveRule;
  if (input.effectiveAt === undefined && effectiveRule.kind !== "known") {
    // The rule pack does not resolve when acts take effect; the enactment is
    // recorded without inventing an effective date.
  }

  const next = appendAction(world, {
    measure,
    kind: "enacted",
    stableKey: `${input.stableKey}:enacted`,
    chamberKey: null,
    committeeKey: null,
    floorStageKey: null,
    actorLabel: pack.displayName,
    rationale: "The measure completed every required step and became law.",
    summary: `${measure.designation} — ${measure.shortTitle} — became law.`,
    eventType: "legislation.measure-enacted",
    tags: ["legislation.enacted"],
  });

  const event = next.history.events.find(
    (candidate) => candidate.stableKey === `event:${input.stableKey}:enacted`,
  );
  if (!event) {
    throw new Error("Failed to record the enactment event.");
  }

  const enactment: LegislativeEnactmentRecord = {
    id: createStableId(
      "legislative-enactment",
      `${measure.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    measureId: measure.id,
    resolvedAt: next.currentDate,
    outcome: "enacted",
    actDesignation: input.actDesignation ?? null,
    effectiveAt: input.effectiveAt ? makeIsoDate(input.effectiveAt) : null,
    outcomeEventId: event.id,
  };

  return {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      legislativeEnactments: [
        ...(next.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

export interface RecordAdjournmentDeathInput {
  readonly stableKey: string;
  readonly measureId: EntityId;
  readonly rationale?: string;
}

/** Ends a measure that ran out of session. */
export function recordAdjournmentDeath(
  world: World,
  input: RecordAdjournmentDeathInput,
): World {
  const measure = requireMeasure(world, input.measureId);
  const position = measurePosition(world, measure.id);
  if (position.terminal) {
    throw new Error("The measure is already finished.");
  }
  const pack = rulePackById(measure.rulePackId);
  // "We do not know" and "there is no such thing here" are both refusals.
  if (
    !requireKnown(
      pack.session.measuresDieAtAdjournment,
      `Whether ${pack.displayName} measures die at adjournment`,
    )
  ) {
    throw new Error(
      `${pack.displayName} measures do not die at adjournment under its rules.`,
    );
  }
  return appendAction(world, {
    measure,
    kind: "died-on-adjournment",
    stableKey: input.stableKey,
    chamberKey: position.chamberKey,
    committeeKey: position.committeeKey,
    floorStageKey: position.floorStageKey,
    actorLabel: pack.displayName,
    rationale:
      input.rationale ?? "The session ended before the measure completed.",
    summary: `${measure.designation} died when the session adjourned.`,
    eventType: "legislation.measure-died",
    tags: ["legislation.failed"],
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function measureById(
  world: World,
  measureId: EntityId,
): LegislativeMeasureRecord | null {
  return (
    (world.history.legislativeMeasures ?? []).find(
      (record) => record.id === measureId,
    ) ?? null
  );
}

export function requireMeasure(
  world: World,
  measureId: EntityId,
): LegislativeMeasureRecord {
  const measure = measureById(world, measureId);
  if (!measure) {
    throw new Error(`Legislative measure not found: ${measureId}`);
  }
  return measure;
}

export function measuresForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): readonly LegislativeMeasureRecord[] {
  return (world.history.legislativeMeasures ?? []).filter(
    (record) => record.jurisdictionId === jurisdictionId,
  );
}

export function measureVotes(
  world: World,
  measureId: EntityId,
): readonly LegislativeVoteRecord[] {
  return (world.history.legislativeVotes ?? [])
    .filter((record) => record.measureId === measureId)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
}

export function measureAmendments(
  world: World,
  measureId: EntityId,
): readonly LegislativeAmendmentRecord[] {
  return (world.history.legislativeAmendments ?? []).filter(
    (record) => record.measureId === measureId,
  );
}

export function measureEnactment(
  world: World,
  measureId: EntityId,
): LegislativeEnactmentRecord | null {
  return (
    (world.history.legislativeEnactments ?? []).find(
      (record) => record.measureId === measureId,
    ) ?? null
  );
}

export function rulePackForMeasure(
  world: World,
  measureId: EntityId,
): LegislativeRulePack {
  return rulePackById(requireMeasure(world, measureId).rulePackId);
}

export function chamberForPosition(
  pack: LegislativeRulePack,
  position: MeasurePosition,
): ChamberRule | null {
  return position.chamberKey ? chamberByKey(pack, position.chamberKey) : null;
}

/** Every legislative history record, for world-level identity checks. */
export function legislationHistoryRecords(
  world: World,
): readonly { readonly id: EntityId; readonly sequence: number }[] {
  return [
    ...(world.history.legislativeMeasures ?? []),
    ...(world.history.legislativeActions ?? []),
    ...(world.history.committeeReferrals ?? []),
    ...(world.history.committeeActions ?? []),
    ...(world.history.legislativeAmendments ?? []),
    ...(world.history.legislativeVotes ?? []),
    ...(world.history.executiveDispositions ?? []),
    ...(world.history.legislativeEnactments ?? []),
  ];
}

export function legislationEntityExists(world: World, id: EntityId): boolean {
  return legislationHistoryRecords(world).some((record) => record.id === id);
}

export function legislationEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = legislationHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  const dated = record as unknown as {
    readonly introducedAt?: IsoDate;
    readonly occurredAt?: IsoDate;
    readonly referredAt?: IsoDate;
    readonly actedAt?: IsoDate;
    readonly offeredAt?: IsoDate;
    readonly takenAt?: IsoDate;
    readonly resolvedAt?: IsoDate;
  };
  const date =
    dated.introducedAt ??
    dated.occurredAt ??
    dated.referredAt ??
    dated.actedAt ??
    dated.offeredAt ??
    dated.takenAt ??
    dated.resolvedAt;
  return date === undefined ? false : date <= asOfDate;
}
