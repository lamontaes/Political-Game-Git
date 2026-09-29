import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import {
  ensurePeopleTraitCatalog,
  ensurePeopleTraits,
  traitConsiderations,
} from "../people-traits";
import type { EntityId, IsoDate, World } from "../types";
import type { NominationPlan } from "./nomination-rules";

/**
 * Who files for a nomination beyond the person a party recruits, shared by
 * every office that runs the nomination stage.
 */
export const NOMINATION_FIELD_PROFILE = {
  id: "ocd-nomination-field-game-profile/v2",
  // PLACEHOLDER(build-24-step-1): a party is favored in a district, so its
  // open nomination draws a candidate nobody recruited, when it starts with
  // at least this share of the district's two-party vote. Set by hand. It
  // decides where such a person considers running, never whether they do.
  favoredShare: 0.55,
} as const;

/**
 * The day a seat's field files: the office's own intake day, but never later
 * than the state's filing deadline for the primary (the plan's
 * `filingDeadline`: the FEC's 2026 date, or the place's own 2026 gap before
 * its primary).
 *
 * PLACEHOLDER(build-24-step-1): a field never files before `earliest`, the
 * first intake day of the election year (January 6). Several states' real
 * deadlines fall in the year before (Texas: December 8, 2025; Illinois:
 * November 3, 2025); their fields file on January 6 instead, the first day
 * the game gathers any field for that year.
 */
export function fieldIntakeDay(
  base: IsoDate,
  plan: NominationPlan,
  earliest: IsoDate,
): IsoDate {
  if (!plan.known) return base;
  const closes = plan.filingDeadline;
  const day = closes < base ? closes : base;
  return day < earliest ? earliest : day;
}

/**
 * Whether an open nomination draws someone nobody recruited: the stage is
 * known and still ahead, no sitting member of the party is running, and the
 * party is favored in the district.
 */
export function drawsSelfStarter(input: {
  readonly plan: NominationPlan;
  readonly intakeDate: IsoDate;
  readonly party: string;
  readonly incumbentParty: string | null;
  readonly incumbentSeeking: boolean;
  readonly partyShare: number | null;
}): boolean {
  return (
    input.plan.known &&
    input.plan.primaryDate > input.intakeDate &&
    !(input.incumbentSeeking && input.incumbentParty === input.party) &&
    (input.partyShare ?? 0) >= NOMINATION_FIELD_PROFILE.favoredShare
  );
}

/**
 * Someone nobody recruited weighs entering a nomination their party is
 * favored to win. An open seat the party should hold is the prize a career
 * waits for, so it argues strongly for running; the cost of a campaign argues
 * against it; and their appetite for risk and for a fight tips the balance.
 * Only someone averse to both stays out. No share of such people is set to
 * run: each decides from their own recorded temperament.
 */
export function decideSelfStarterRun(
  world: World,
  input: {
    readonly stableKey: string;
    readonly decisionType: string;
    readonly personId: EntityId;
    readonly seatKey: string;
    readonly intakeDate: IsoDate;
  },
): { world: World; runs: boolean; decisionTraceId: EntityId } {
  const { stableKey: key, personId } = input;
  let next = ensurePeopleTraits(ensurePeopleTraitCatalog(world), [personId]);
  const evaluation = evaluateDecision(next, {
    stableKey: key,
    decisionType: input.decisionType,
    actorPersonId: personId,
    cutoff: {
      asOfDate: input.intakeDate,
      historySequenceExclusive: next.history.nextSequence,
    },
    subject: { kind: "context:life", key: input.seatKey, entityId: null },
    options: [
      { key: "run", label: "Run", description: "Enter the primary." },
      { key: "decline", label: "Decline", description: "Do not enter." },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${key}:open-seat`,
        optionKey: "run",
        sourceType: "context:district-view",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "The seat is open and their party is favored, so its primary is the real race.",
        sourceRefs: [],
      },
      {
        stableKey: `${key}:cost`,
        optionKey: "decline",
        sourceType: "context:campaign-cost",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation: "A campaign takes a year of their life and money.",
        sourceRefs: [],
      },
      ...traitConsiderations(next, personId, key, [
        {
          optionKey: "run",
          trait: "risk",
          pole: "high",
          explanation: "They are willing to gamble on a long shot.",
        },
        {
          optionKey: "decline",
          trait: "risk",
          pole: "low",
          explanation: "They would rather not stake so much on one race.",
        },
        {
          optionKey: "run",
          trait: "conflict",
          pole: "high",
          explanation: "A contested primary does not put them off.",
        },
        {
          optionKey: "decline",
          trait: "conflict",
          pole: "low",
          explanation: "They would rather not fight their own party's people.",
        },
      ]),
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  return {
    world: next,
    runs: evaluation.selectedOptionKey === "run",
    decisionTraceId: next.history.decisionTraces.at(-1)!.id,
  };
}
