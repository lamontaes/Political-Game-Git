import type {
  EntityId,
  IsoDate,
  LegislativeActionRecord,
  LegislativeActionKind,
  LegislativeMeasureRecord,
  LegislativeTerminalOutcome,
} from "../../simulation/types";
import type {
  MeasurePosition,
  MeasurePhase,
  MeasureReplay,
  MeasureStepKey,
} from "../../simulation/legislation";
import type {
  LegislativeRulePack,
  ChamberRule,
} from "../../simulation/legislature-rules";
import {
  chamberByKey,
  committeeByKey,
  floorStageByKey,
  assertOriginationPermitted,
} from "./pack-queries";
import { nextChamberKey, nextFloorStageKey } from "./procedure-steps";
import { regularSessionRefusalText } from "./session-rules";
import { addDays } from "../elections/calendar";
export interface MeasureReplayFacts {
  readonly measure: LegislativeMeasureRecord;
  readonly pack: LegislativeRulePack;
  readonly actions: readonly LegislativeActionRecord[];
  readonly onDate: IsoDate;
  readonly hasStartingProcedure: boolean;
}
function spokenDate(date: IsoDate): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
const TERMINAL_PHASES: ReadonlySet<MeasurePhase> = new Set([
  "enacted",
  "failed",
]);

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

function initialState(measure: LegislativeMeasureRecord): ReplayState {
  return {
    phase: "drafting",
    chamberKey: isExecutiveInstrumentMeasure(measure)
      ? null
      : measure.originChamberKey,
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

function isExecutiveInstrumentMeasure(
  measure: LegislativeMeasureRecord,
): boolean {
  return (
    measure.governmentInstrument === "regulation" ||
    measure.governmentInstrument === "executive-order"
  );
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

type StepOutcome =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const LEGAL: StepOutcome = { ok: true };

function floorWithoutReferral(chamber: ChamberRule | null): boolean {
  const rule = chamber?.referral.floorWithoutReferral;
  return rule?.kind === "known" && rule.value === true;
}

function noPresentment(pack: LegislativeRulePack): boolean {
  const rule = pack.executive.presentmentRequired;
  return rule.kind === "known" && rule.value === false;
}

function illegal(reason: string): StepOutcome {
  return { ok: false, reason };
}

const REGULAR_SESSION_ACTIONS: ReadonlySet<LegislativeActionKind> = new Set([
  "introduced",
  "referred",
  "committee-hearing-held",
  "committee-reported",
  "committee-not-reported",
  "placed-on-calendar",
  "amendment-adopted",
  "amendment-rejected",
  "floor-stage-passed",
  "floor-stage-failed",
  "procedural-motion-failed",
  "tabled",
  "postponed",
  "recommitted",
  "recorded-vote-demanded",
  "full-reading-demanded",
  "rules-suspended",
  "sine-die-vote-carried",
  "quorum-not-present",
  "debate-extended",
  "transmitted",
  "concurred",
  "concurrence-failed",
]);

function requirePhase(
  state: ReplayState,
  kind: LegislativeActionKind,
  allowed: readonly MeasurePhase[],
): StepOutcome {
  return allowed.includes(state.phase)
    ? LEGAL
    : illegal(`'${kind}' cannot follow the phase '${state.phase}'`);
}

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
  if (isExecutiveInstrumentMeasure(measure)) {
    if (action.kind === "introduced") {
      if (state.phase !== "drafting" || action.chamberKey !== null)
        return illegal(
          "an executive instrument must be filed directly by its issuing office",
        );
      state.phase = "awaiting-enactment";
      state.chamberKey = null;
      return LEGAL;
    }
    if (action.kind === "enacted") {
      if (state.phase !== "awaiting-enactment")
        return illegal(
          "an executive instrument can be issued only after filing",
        );
      state.phase = "enacted";
      state.outcome = "enacted";
      return LEGAL;
    }
    return illegal("an executive instrument cannot take a legislative action");
  }
  if (
    pack.session.regularSessionYears &&
    REGULAR_SESSION_ACTIONS.has(action.kind)
  ) {
    const refusal = regularSessionRefusalText(pack, action.occurredAt);
    if (refusal) return illegal(refusal);
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
      const gate =
        state.phase === "awaiting-referral" &&
        floorWithoutReferral(currentChamber())
          ? LEGAL
          : requirePhase(state, action.kind, ["awaiting-floor"]);
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
    case "procedural-motion-failed":
    case "tabled":
    case "postponed":
    case "recommitted":
    case "recorded-vote-demanded":
    case "full-reading-demanded":
    case "rules-suspended":
    case "sine-die-vote-carried":
    case "quorum-not-present":
    case "debate-extended": {
      const gate = requirePhase(state, action.kind, ["on-floor"]);
      if (!gate.ok) return gate;
      const chamber = currentChamber();
      if (!chamber) return illegal("the measure is not in a chamber");
      if (action.chamberKey !== chamber.chamberKey)
        return illegal("the procedural action names a different chamber");
      if (action.kind === "postponed" || action.kind === "tabled") {
        if (!action.resumeAt || action.resumeAt <= action.occurredAt)
          return illegal(
            "a postponed or tabled measure needs a later resume date",
          );
        state.earliestNextFloorDate = action.resumeAt;
      }
      if (action.kind === "recommitted") {
        if (!action.committeeKey)
          return illegal("a recommitted measure must name its committee");
        committeeByKey(chamber, action.committeeKey);
        state.phase = "in-committee";
        state.committeeKey = action.committeeKey;
        state.floorStageKey = null;
      }
      if (action.kind === "debate-extended" && action.resumeAt) {
        if (action.resumeAt <= action.occurredAt)
          return illegal("extended debate must resume after the motion date");
        state.earliestNextFloorDate = action.resumeAt;
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
          `this stage may not be taken before ${spokenDate(state.earliestNextFloorDate)}, because the chamber's stages fall on separate legislative days`,
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
        const readingDays =
          onwardStage.readingIntervalDays?.kind === "known"
            ? onwardStage.readingIntervalDays.value
            : 0;
        const offset = Math.max(
          readingDays,
          onwardStage.separateLegislativeDayRequired ? 1 : 0,
        );
        const fromReading =
          offset > 0 ? addDays(action.occurredAt, offset) : null;
        const fromIntroduction =
          onwardStage.minimumDaysFromIntroduction?.kind === "known"
            ? addDays(
                measure.introducedAt,
                onwardStage.minimumDaysFromIntroduction.value,
              )
            : null;
        state.earliestNextFloorDate =
          [fromReading, fromIntroduction]
            .filter((date): date is IsoDate => date !== null)
            .sort()
            .at(-1) ?? null;
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
      state.phase = noPresentment(pack)
        ? "awaiting-enactment"
        : "awaiting-presentation";
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
    case "became-law-without-signature": {
      const gate = requirePhase(state, action.kind, ["awaiting-executive"]);
      if (!gate.ok) return gate;
      const outcome = pack.executive.inactionOutcomeInSession;
      if (
        outcome.kind !== "known" ||
        outcome.value !== "becomes-law-without-signature"
      ) {
        return illegal(
          `${pack.displayName} has no resolved rule under which the ${pack.executive.titleLabel}'s silence approves a measure`,
        );
      }
      state.phase = "awaiting-enactment";
      return LEGAL;
    }
    case "override-period-expired": {
      const gate = requirePhase(state, action.kind, ["awaiting-override"]);
      if (!gate.ok) return gate;
      state.phase = "failed";
      state.outcome = "vetoed-and-sustained";
      return LEGAL;
    }
    case "override-chamber-recorded": {
      const gate = requirePhase(state, action.kind, ["awaiting-override"]);
      if (!gate.ok) return gate;
      if (pack.executive.override.kind === "not-applicable") {
        return illegal(
          `${pack.displayName} has no override forum: ${pack.executive.override.note}`,
        );
      }
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

export function replayMeasure(
  facts: MeasureReplayFacts,
  measureId: EntityId,
): MeasureReplay {
  const measure = facts.measure;
  const pack = facts.pack;
  const state = initialState(measure);
  const violations: string[] = [];
  for (const action of facts.actions
    .filter((action) => action.measureId === measureId)
    .sort((a, b) => a.sequence - b.sequence)) {
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

export function measurePosition(
  facts: MeasureReplayFacts,
  measureId: EntityId,
): MeasurePosition {
  return replayMeasure(facts, measureId).position;
}

export function availableMeasureSteps(
  facts: MeasureReplayFacts,
  measureId: EntityId,
): readonly MeasureStepKey[] {
  const pack = facts.pack;
  const position = measurePosition(facts, measureId);
  if (
    facts.hasStartingProcedure &&
    regularSessionRefusalText(pack, facts.onDate)
  ) {
    switch (position.phase) {
      case "drafting":
      case "awaiting-referral":
      case "in-committee":
      case "awaiting-floor":
      case "on-floor":
      case "awaiting-transmittal":
      case "awaiting-concurrence":
        return [];
    }
  }
  switch (position.phase) {
    case "drafting":
      return ["file-measure"];
    case "awaiting-referral": {
      const chamber = position.chamberKey
        ? chamberByKey(pack, position.chamberKey)
        : null;
      if (!floorWithoutReferral(chamber)) return ["request-referral"];
      return chamber && chamber.committees.length > 0
        ? ["request-calendar-placement", "request-referral"]
        : ["request-calendar-placement"];
    }
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
        facts.onDate < position.earliestNextFloorDate;
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
