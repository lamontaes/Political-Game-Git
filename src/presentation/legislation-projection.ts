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
  type MeasureStepKey,
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
  readonly actionKey: MeasureStepKey;
  readonly label: string;
  readonly detail: string;
  readonly actorLabel: string;
  /**
   * Whether this is the player acting, rather than the player waiting on
   * somebody who does not answer to them.
   */
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
    "The other chamber changed the bill, so the chamber it started in has to decide whether to live with that.",
  "awaiting-enrollment":
    "Both sides have agreed on one bill, and it is being put into final form.",
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
  "committee-not-reported": "Committee would not report it",
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

/**
 * How each step reads to the player.
 *
 * A label says what *you* do — file, ask, move, wait — never what an
 * institution or another person decides. Nothing here promises an outcome: the
 * committee, the chamber and the governor answer for themselves.
 */
const STEP_COPY: Readonly<
  Record<MeasureStepKey, { readonly label: string; readonly detail: string }>
> = {
  "file-measure": {
    label: "File the bill",
    detail: "Put your bill in, and it gets a number and a chamber.",
  },
  "request-referral": {
    label: "Ask for the bill to be sent to a committee",
    detail:
      "The referral authority decides which committee takes it; you can ask.",
  },
  "request-committee-hearing": {
    label: "Ask the committee for a hearing",
    detail:
      "Press for a date to put the bill and its witnesses in front of the committee.",
  },
  "move-committee-report": {
    label: "Ask the committee to vote on reporting the bill",
    detail:
      "Call for the committee's recorded vote. The members decide what it says.",
  },
  "request-calendar-placement": {
    label: "Ask leadership for floor time",
    detail: "Push to get the bill scheduled for debate.",
  },
  "offer-amendment": {
    label: "Offer an amendment",
    detail: "Put a change to the bill and let the chamber decide it.",
  },
  "move-floor-vote": {
    label: "Move the question",
    detail: "Ask the chamber to vote on the bill at the stage it has reached.",
  },
  "await-next-legislative-day": {
    label: "Wait for the next legislative day",
    detail:
      "This chamber takes its stages on separate days, so the bill cannot be reached again today.",
  },
  "transmit-to-second-chamber": {
    label: "Send the bill to the other chamber",
    detail: "The bill has cleared this chamber and moves on.",
  },
  "move-concurrence": {
    label: "Ask your chamber to accept the changes",
    detail:
      "The other chamber changed the bill. Your chamber votes on whether to live with it.",
  },
  "request-enrollment": {
    label: "Have the bill put into final form",
    detail: "The clerk prepares the agreed text for signature.",
  },
  "present-to-executive": {
    label: "Send the bill to the governor",
    detail: "Deliver the finished bill to the desk.",
  },
  "await-executive-decision": {
    label: "Wait for the governor's decision",
    detail:
      "The bill is out of the legislature's hands. What happens next is the governor's to decide.",
  },
  "move-veto-override": {
    label: "Move to override the veto",
    detail: "Put the vetoed bill back to the legislature.",
  },
  "record-enactment": {
    label: "Have the new law entered in the record",
    detail: "Close the bill out as law.",
  },
};

/**
 * Whether the player is the one acting.
 *
 * Waiting on somebody else is still a thing a player does, but it is not a
 * choice about the outcome, and the screen has to say so.
 */
function playerActs(step: MeasureStepKey): boolean {
  return (
    step !== "await-executive-decision" && step !== "await-next-legislative-day"
  );
}

function optionFor(
  step: MeasureStepKey,
  gateActor: string,
): MeasureActionOption {
  const copy = STEP_COPY[step];
  return {
    actionKey: step,
    label: copy.label,
    detail: copy.detail,
    actorLabel: gateActor,
    playerMayAct: playerActs(step),
  };
}

function voteSentence(vote: LegislativeVoteRecord): string {
  const other =
    vote.tally.presentNotVoting + vote.tally.absent + vote.tally.excused;
  const otherPart = other > 0 ? `, ${other} not voting` : "";
  return `${vote.tally.yea} in favor, ${vote.tally.nay} against${otherPart} — ${vote.requiredVotes} of ${vote.denominatorValue} were needed.`;
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
    if (inaction.kind === "known") {
      notes.push(
        inaction.value === "becomes-law-without-signature"
          ? `If the ${pack.executive.titleLabel} lets the time run out without doing anything, the bill becomes law anyway.`
          : `If the ${pack.executive.titleLabel} lets the time run out without doing anything, the bill dies.`,
      );
    } else {
      notes.push(
        `Nobody has been able to tell you what happens if the ${pack.executive.titleLabel} simply sits on the bill, so plan on needing a signature.`,
      );
    }
    const window = pack.executive.actionWindowDaysInSession;
    if (window.kind !== "known") {
      notes.push(
        `Nobody can tell you how long the ${pack.executive.titleLabel} has to make up their mind.`,
      );
    }
  }

  if (
    position.phase === "enacted" ||
    position.phase === "awaiting-enrollment"
  ) {
    const effective = pack.enactment.defaultEffectiveRule;
    if (effective.kind === "known") {
      notes.push(effective.value);
    } else {
      notes.push(
        "Nobody can tell you when the new law would actually start to matter, so no date is being claimed.",
      );
    }
  }

  if (position.phase === "in-committee") {
    const chamber = chamberByKey(pack, position.chamberKey ?? "");
    const heard = chamber.referral.everyMeasureMustBeHeard;
    if (heard.kind === "known" && heard.value) {
      notes.push(
        "Every bill referred here gets a public hearing, so the committee cannot quietly bury it.",
      );
    } else if (heard.kind === "known" && !heard.value) {
      notes.push(
        "A committee here can simply decline to take the bill up, and it would go no further.",
      );
    } else {
      notes.push(
        "Most bills get a hearing here, but nobody will promise you that yours will.",
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

/**
 * The bar the next vote has to clear, in words.
 *
 * Where the rules set a heavier bar for money bills and this legislature's is
 * unresolved, the player is told that rather than being shown the ordinary bar
 * in its place.
 */
function requirementNoteFor(
  world: World,
  measureId: EntityId,
  thresholdLabel: string | null,
): string | null {
  if (thresholdLabel) return `To carry, this needs ${thresholdLabel}.`;
  const position = measurePosition(world, measureId);
  if (position.phase !== "awaiting-override") return null;
  const pack = rulePackForMeasure(world, measureId);
  const override = pack.executive.override;
  if (
    override.kind === "joint-session" &&
    override.appropriationsThreshold.kind !== "known"
  ) {
    return "Money bills take a heavier vote to override than ordinary ones, and nobody can tell you exactly what it is here.";
  }
  return null;
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
    whereItStands = `The bill is with the ${chamber.name}'s ${committee.name}.`;
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

  const options = availableMeasureSteps(world, measureId).map((step) =>
    optionFor(step, gate.actorLabel),
  );

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
    // `whereItStands` already reads "The bill is law." for the enacted phase,
    // so only add a note when the effective date says something it does not.
    outcomeNote = enactment?.effectiveAt
      ? `The bill is law and takes effect on ${enactment.effectiveAt}.`
      : null;
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
    requirementNote: requirementNoteFor(world, measureId, gate.thresholdLabel),
    options,
    deadlines: deadlinesFor(world, measureId),
    uncertainties: uncertaintiesFor(world, measureId),
    history,
    votes: voteSummaries,
    finished: position.terminal,
    outcomeNote,
  };
}
