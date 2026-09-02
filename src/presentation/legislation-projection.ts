import {
  availableMeasureSteps,
  measureActions,
  measureEnactment,
  measureGate,
  measurePosition,
  measureVotes,
  requireMeasure,
  rulePackForMeasure,
  type MeasurePhase,
} from "../simulation/legislation";
import {
  chamberByKey,
  committeeByKey,
  floorStageByKey,
  nextChamberKey,
} from "../simulation/legislature-rules";
import { personName } from "../simulation/people";
import type {
  EntityId,
  LegislativeActionKind,
  LegislativeVoteRecord,
  World,
} from "../simulation/types";

/**
 * Turns a measure's institutional position into something a person can read.
 *
 * Everything here is written for a player: where the bill is, what just
 * happened to it, who decides next, what they can do about it, and what is
 * genuinely not settled. No internal vocabulary reaches this surface.
 */

export interface MeasureActionOption {
  readonly actionKey: LegislativeActionKind;
  readonly label: string;
  readonly detail: string;
  readonly actorLabel: string;
  /** Whether the player can take or prompt this step right now. */
  readonly playerMayAct: boolean;
}

export interface MeasureHistoryLine {
  readonly when: string;
  readonly headline: string;
  readonly detail: string;
  readonly voteSummary: string | null;
}

export interface MeasureVoteSummary {
  readonly question: string;
  readonly where: string;
  readonly when: string;
  readonly yea: number;
  readonly nay: number;
  readonly otherwise: number;
  readonly needed: number;
  readonly outOf: number;
  readonly rule: string;
  readonly result: string;
}

export interface MeasureBriefing {
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly legislatureName: string;
  readonly sponsorName: string | null;
  /** One sentence: where the bill is right now. */
  readonly whereItStands: string;
  /** One sentence: what most recently happened and why. */
  readonly whatJustHappened: string | null;
  readonly whoDecidesNext: string;
  readonly whatHappensNext: string;
  /** The bar the next vote must clear, in words, when there is one. */
  readonly requirementNote: string | null;
  readonly options: readonly MeasureActionOption[];
  readonly deadlines: readonly string[];
  /** Things the rules genuinely do not settle, said plainly. */
  readonly uncertainties: readonly string[];
  readonly history: readonly MeasureHistoryLine[];
  readonly votes: readonly MeasureVoteSummary[];
  readonly finished: boolean;
  readonly outcomeNote: string | null;
}

const PHASE_SENTENCES: Readonly<Record<MeasurePhase, string>> = {
  drafting: "The bill has not been filed yet.",
  "awaiting-referral":
    "The bill has been filed and is waiting to be sent to a committee.",
  "in-committee": "The bill is sitting in committee.",
  "awaiting-floor":
    "The committee has reported the bill; it is waiting for floor time.",
  "on-floor": "The bill is on the floor.",
  "awaiting-transmittal":
    "The bill has passed one chamber and is heading to the other.",
  "awaiting-concurrence":
    "The other chamber changed the bill, and the first chamber has to decide whether to accept that.",
  "awaiting-enrollment":
    "The bill has cleared the legislature and is being put into final form.",
  "awaiting-presentation": "The bill is ready to go to the governor.",
  "awaiting-executive": "The bill is on the governor's desk.",
  "awaiting-override":
    "The governor vetoed the bill; the legislature can try to override.",
  "awaiting-enactment":
    "The bill has cleared everything and is being recorded as law.",
  enacted: "The bill is law.",
  failed: "The bill is dead.",
};

const ACTION_HEADLINES: Readonly<Record<LegislativeActionKind, string>> = {
  introduced: "Filed",
  referred: "Sent to committee",
  "committee-hearing-held": "Committee hearing held",
  "committee-reported": "Reported out of committee",
  "committee-rejected": "Killed in committee",
  "placed-on-calendar": "Scheduled for the floor",
  "amendment-adopted": "Amendment adopted",
  "amendment-rejected": "Amendment rejected",
  "floor-stage-passed": "Cleared a floor vote",
  "floor-stage-failed": "Failed on the floor",
  transmitted: "Sent to the other chamber",
  concurred: "Changes accepted",
  "concurrence-failed": "Changes rejected",
  enrolled: "Put into final form",
  "presented-to-executive": "Sent to the governor",
  signed: "Signed",
  vetoed: "Vetoed",
  "override-chamber-recorded": "Chamber voted on the override",
  "override-succeeded": "Veto overridden",
  "override-failed": "Override failed",
  enacted: "Became law",
  "died-on-adjournment": "Died when the session ended",
};

function optionFor(
  kind: LegislativeActionKind,
  gateActor: string,
): MeasureActionOption | null {
  switch (kind) {
    case "referred":
      return {
        actionKey: kind,
        label: "Send the bill to a committee",
        detail:
          "Ask the referral authority to assign your bill to a committee.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "committee-hearing-held":
      return {
        actionKey: kind,
        label: "Hold a public hearing",
        detail: "Take testimony on the bill before the committee votes.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "committee-reported":
      return {
        actionKey: kind,
        label: "Ask the committee to vote",
        detail: "Call for the committee's recorded vote on reporting the bill.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "placed-on-calendar":
      return {
        actionKey: kind,
        label: "Get the bill on the floor calendar",
        detail: "Ask leadership to schedule the bill for debate.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "amendment-adopted":
      return {
        actionKey: kind,
        label: "Offer an amendment",
        detail: "Put a change to the bill to the chamber.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "floor-stage-passed":
      return {
        actionKey: kind,
        label: "Call the vote",
        detail: "Put the bill to the chamber at its current stage.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "transmitted":
      return {
        actionKey: kind,
        label: "Send it to the other chamber",
        detail: "Move the bill on to the second chamber.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "enrolled":
      return {
        actionKey: kind,
        label: "Put the bill into final form",
        detail: "Have the bill enrolled so it can go to the governor.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "presented-to-executive":
      return {
        actionKey: kind,
        label: "Send the bill to the governor",
        detail: "Deliver the finished bill for signature or veto.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "signed":
      return {
        actionKey: kind,
        label: "The governor signs",
        detail: "The governor approves the bill and it becomes law.",
        actorLabel: gateActor,
        playerMayAct: false,
      };
    case "vetoed":
      return {
        actionKey: kind,
        label: "The governor vetoes",
        detail: "The governor rejects the bill and returns it.",
        actorLabel: gateActor,
        playerMayAct: false,
      };
    case "enacted":
      return {
        actionKey: kind,
        label: "Record the bill as law",
        detail: "Enter the new law in the record.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    case "override-succeeded":
      return {
        actionKey: kind,
        label: "Try to override the veto",
        detail: "Put the veto to the legislature again.",
        actorLabel: gateActor,
        playerMayAct: true,
      };
    default:
      return null;
  }
}

function voteSentence(vote: LegislativeVoteRecord): string {
  const other =
    vote.tally.presentNotVoting + vote.tally.absent + vote.tally.excused;
  const otherPart = other > 0 ? `, ${other} not voting` : "";
  return `${vote.tally.yea} in favour, ${vote.tally.nay} against${otherPart} — ${vote.requiredVotes} of ${vote.denominatorValue} were needed.`;
}

function forumLabel(world: World, vote: LegislativeVoteRecord): string {
  const measure = requireMeasure(world, vote.measureId);
  const pack = rulePackForMeasure(world, measure.id);
  if (vote.forum.kind === "joint-session") return vote.forum.forumName;
  const chamber = chamberByKey(pack, vote.forum.chamberKey);
  if (vote.forum.kind === "committee") {
    return committeeByKey(chamber, vote.forum.committeeKey).name;
  }
  return chamber.name;
}

function questionLabel(vote: LegislativeVoteRecord): string {
  switch (vote.purpose) {
    case "committee-report":
      return "Report the bill to the floor";
    case "amendment":
      return "Adopt an amendment";
    case "concurrence":
      return "Accept the other chamber's changes";
    case "veto-override":
      return "Override the governor's veto";
    case "floor-stage":
      return "Pass the bill";
  }
}

/** Rule gaps worth telling the player about at this point in the process. */
function uncertaintiesFor(
  world: World,
  measureId: EntityId,
): readonly string[] {
  const pack = rulePackForMeasure(world, measureId);
  const position = measurePosition(world, measureId);
  const notes: string[] = [];

  if (position.phase === "awaiting-executive") {
    const inaction = pack.executive.inactionOutcomeInSession;
    if (inaction.kind === "unknown") {
      notes.push(
        `What happens if the ${pack.executive.titleLabel} simply does not act is not settled in our sources, so the bill needs an actual signature or veto.`,
      );
    }
    const window = pack.executive.actionWindowDaysInSession;
    if (window.kind === "unknown") {
      notes.push(
        `How long the ${pack.executive.titleLabel} has to act is not settled in our sources.`,
      );
    }
  }

  if (
    position.phase === "enacted" ||
    position.phase === "awaiting-enrollment"
  ) {
    const effective = pack.enactment.defaultEffectiveRule;
    if (effective.kind === "unknown") {
      notes.push(
        "When the new law actually takes effect is not settled in our sources, so no effective date is claimed.",
      );
    }
  }

  if (position.phase === "in-committee") {
    const chamber = chamberByKey(pack, position.chamberKey ?? "");
    const heard = chamber.referral.everyMeasureMustBeHeard;
    if (heard.kind === "known" && heard.value) {
      notes.push(
        `Every bill referred here is guaranteed a public hearing, so the committee cannot quietly bury it.`,
      );
    } else if (heard.kind === "known" && !heard.value) {
      notes.push(
        "A committee here can simply decline to take the bill up, and it would go no further.",
      );
    } else {
      notes.push(
        "Whether the committee must give the bill a hearing is not settled in our sources.",
      );
    }
  }

  if (position.phase === "awaiting-override") {
    const override = pack.executive.override;
    if (override.kind === "joint-session") {
      notes.push(
        `Both chambers reconsider the veto together as one body of ${override.combinedSeats}, not separately.`,
      );
    }
  }

  return notes;
}

function deadlinesFor(world: World, measureId: EntityId): readonly string[] {
  const pack = rulePackForMeasure(world, measureId);
  const position = measurePosition(world, measureId);
  const lines: string[] = [];

  const adjournment = pack.session.adjournmentRule;
  if (adjournment.kind === "known") {
    lines.push(adjournment.value);
  }
  const dies = pack.session.measuresDieAtAdjournment;
  if (dies.kind === "known" && dies.value && !position.terminal) {
    lines.push("If the session ends before the bill finishes, the bill dies.");
  }
  if (position.phase === "awaiting-executive") {
    const window = pack.executive.actionWindowDaysInSession;
    if (window.kind === "known") {
      lines.push(
        `The ${pack.executive.titleLabel} has ${window.value} days to act while the legislature is sitting.`,
      );
    }
  }
  return lines;
}

export function projectMeasureBriefing(
  world: World,
  measureId: EntityId,
): MeasureBriefing {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackForMeasure(world, measureId);
  const position = measurePosition(world, measureId);
  const gate = measureGate(world, measureId);
  const actions = measureActions(world, measureId);
  const votes = measureVotes(world, measureId);
  const votesById = new Map(votes.map((vote) => [vote.id, vote]));
  const enactment = measureEnactment(world, measureId);

  const chamber = position.chamberKey
    ? chamberByKey(pack, position.chamberKey)
    : null;
  const committee =
    chamber && position.committeeKey
      ? committeeByKey(chamber, position.committeeKey)
      : null;
  const stage =
    chamber && position.floorStageKey
      ? floorStageByKey(chamber, position.floorStageKey)
      : null;

  let whereItStands = PHASE_SENTENCES[position.phase];
  if (position.phase === "in-committee" && committee && chamber) {
    whereItStands = `The bill is in the ${committee.name} of the ${chamber.name}.`;
  } else if (position.phase === "on-floor" && stage && chamber) {
    whereItStands = `The bill is on the floor of the ${chamber.name} at ${stage.label}.`;
  } else if (position.phase === "awaiting-referral" && chamber) {
    whereItStands = `The bill has been filed in the ${chamber.name} and is waiting to be sent to a committee.`;
  } else if (position.phase === "awaiting-transmittal" && chamber) {
    const onward = nextChamberKey(pack, chamber.chamberKey);
    const target = onward ? chamberByKey(pack, onward) : null;
    whereItStands = `The ${chamber.name} passed the bill; it now goes to the ${target?.name ?? "other chamber"}.`;
  }

  const latest = actions.at(-1) ?? null;
  const whatJustHappened = latest
    ? `${ACTION_HEADLINES[latest.kind]} on ${latest.occurredAt}. ${latest.rationale}`
    : null;

  const steps = availableMeasureSteps(world, measureId);
  const options = steps
    .map((step) => optionFor(step, gate.actorLabel))
    .filter((option): option is MeasureActionOption => option !== null);

  const history: MeasureHistoryLine[] = actions.map((action) => {
    const vote = action.voteId ? votesById.get(action.voteId) : undefined;
    return {
      when: action.occurredAt,
      headline: ACTION_HEADLINES[action.kind],
      detail: action.rationale,
      voteSummary: vote ? voteSentence(vote) : null,
    };
  });

  const voteSummaries: MeasureVoteSummary[] = votes.map((vote) => ({
    question: questionLabel(vote),
    where: forumLabel(world, vote),
    when: vote.takenAt,
    yea: vote.tally.yea,
    nay: vote.tally.nay,
    otherwise:
      vote.tally.presentNotVoting + vote.tally.absent + vote.tally.excused,
    needed: vote.requiredVotes,
    outOf: vote.denominatorValue,
    rule: vote.thresholdLabel,
    result: vote.outcome === "passed" ? "Carried" : "Failed",
  }));

  let outcomeNote: string | null = null;
  if (position.outcome === "enacted") {
    outcomeNote = enactment?.effectiveAt
      ? `The bill is law and takes effect on ${enactment.effectiveAt}.`
      : "The bill is law.";
  } else if (position.outcome === "failed-in-committee") {
    outcomeNote =
      "The committee refused to report the bill, and it went no further.";
  } else if (position.outcome === "failed-on-floor") {
    outcomeNote = "The bill did not get the votes it needed on the floor.";
  } else if (position.outcome === "failed-concurrence") {
    outcomeNote = "The two chambers could not agree on a single version.";
  } else if (position.outcome === "vetoed-and-sustained") {
    outcomeNote = "The veto stood, so the bill did not become law.";
  } else if (position.outcome === "died-on-adjournment") {
    outcomeNote = "The session ended before the bill finished.";
  }

  const sponsor = measure.sponsorPersonId
    ? world.people[measure.sponsorPersonId]
    : null;

  return {
    measureId,
    designation: measure.designation,
    shortTitle: measure.shortTitle,
    summary: measure.summary,
    legislatureName: pack.displayName,
    sponsorName: sponsor ? personName(sponsor) : null,
    whereItStands,
    whatJustHappened,
    whoDecidesNext: gate.actorLabel,
    whatHappensNext: gate.description,
    requirementNote: gate.thresholdLabel
      ? `To carry, this needs ${gate.thresholdLabel}.`
      : null,
    options,
    deadlines: deadlinesFor(world, measureId),
    uncertainties: uncertaintiesFor(world, measureId),
    history,
    votes: voteSummaries,
    finished: position.terminal,
    outcomeNote,
  };
}
