import { addDays } from "../dates";
import { measureActions } from "../legislation";
import { legislativeRulePackForWorld } from "../legislative-procedure-world";
import { measureSessionClosedOn } from "./legislative-clock";
import { evaluateDecision } from "../decisions";
import { rulePackById } from "../legislature-rule-packs";
import { chamberByKey, resolveRequiredVotes } from "../legislature-rules";
import { currentHistoricalCutoff } from "../queries";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  World,
} from "../types";
import { measureAnswersAt } from "../vote-bundle";
import {
  decideChamberVote,
  publicPartyOf,
  seatedChamberForPack,
} from "./chamber-votes";
import { measureCosponsors } from "./congress-chambers";
import { principleVoteConsideration } from "./officeholder-principles";
import { relationshipConsiderations } from "./standing-considerations";

/**
 * A GOVERNOR SIGNS OR VETOES A BILL for reasons (CTO ruling, September 29,
 * 2026, 1:24 a.m.: "a governor's veto is a decision, not a roll").
 *
 * The governor weighs, through the shared decision evaluator:
 *
 * - their own principles on the questions the bill answers, as it was passed;
 * - whose bill it is: a bill with a member of their own party behind it is a
 *   reason to sign, one carried only by the other party a reason to return;
 * - how their own party's members voted on it in the legislature;
 * - their recorded relationship with the sponsor;
 * - the override count: a veto the legislature would override anyway, counted
 *   from what the governor can know of each member, is a reason to sign;
 * - the chief of staff's advice.
 *
 * A bill nothing weighs against is signed: the legislature passed it.
 *
 * WEIGHTS (hand-set on the game's shared decision scale; no research is read
 * for them yet, filed as `why-a-governor-signs-or-vetoes`): principles at the
 * vote-importance cut points of `officeholder-principles.ts`; own-party bill
 * "moderate", other-party bill "slight"; own party's floor vote "moderate";
 * relationship at its band; a certain override "moderate"; staff advice
 * "slight"; a passed bill "slight".
 *
 * NOT MODELED: re-election. No reading of how the governor's voters see the
 * bill exists yet, so a governor facing re-election weighs a bill the same
 * as one who is not.
 */

export const GOVERNOR_BILL_DECISION = "governing.governor-bill-decision";
export const BILL_SIGN = "bill:sign";
export const BILL_RETURN = "bill:return";

/** How the governor's own party voted on the bill's final passage. */
export function ownPartyPassageVote(
  world: World,
  measureId: EntityId,
  party: string | null,
): { readonly yea: number; readonly nay: number } {
  if (!party) return { yea: 0, nay: 0 };
  const latest = new Map<string, readonly LegislativeVoteDisposition[]>();
  for (const vote of world.history.legislativeVotes ?? []) {
    if (vote.measureId !== measureId || vote.purpose !== "floor-stage")
      continue;
    const forum =
      vote.forum.kind === "chamber"
        ? vote.forum.chamberKey
        : vote.forum.kind === "joint-session"
          ? vote.forum.forumName
          : null;
    if (forum) latest.set(forum, vote.dispositions);
  }
  let yea = 0;
  let nay = 0;
  for (const dispositions of latest.values())
    for (const row of dispositions) {
      if (!row.personId || publicPartyOf(world, row.personId) !== party)
        continue;
      if (row.disposition === "yea") yea += 1;
      else if (row.disposition === "nay") nay += 1;
    }
  return { yea, nay };
}

/**
 * Whether a veto would be overridden, as the governor can count it: each
 * seated member's override vote predicted from what the governor can know
 * of them, against the state's own override rule. Null where no seated
 * legislature or no override rule lets it be counted.
 */
export function overrideCount(
  world: World,
  measure: LegislativeMeasureRecord,
  governorId: EntityId,
): {
  readonly overridden: boolean;
  readonly forums: readonly {
    readonly forumKey: string;
    readonly yea: number;
    readonly required: number;
  }[];
} | null {
  const pack = rulePackById(measure.rulePackId);
  const override = pack.executive.override;
  if (override.kind === "not-applicable") return null;
  const chambers = pack.chamberOrder.map((chamberKey) =>
    seatedChamberForPack(
      world,
      measure.rulePackId,
      chamberKey,
      chamberByKey(pack, chamberKey).name,
    ),
  );
  if (chambers.some((chamber) => !chamber)) return null;
  const count = (
    forumKey: string,
    members: Parameters<typeof decideChamberVote>[1]["members"],
    seats: number,
  ) => {
    const rows = decideChamberVote(world, {
      stableKey: `${measure.id}:governor-count:${forumKey}`,
      question: {
        question: {
          measureId: measure.id,
          purpose: "veto-override",
          forumKey,
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: `override:${forumKey}`,
        knownTo: governorId,
      },
      members,
      playerPersonId:
        world.control.kind === "person" ? world.control.personId : null,
    });
    const yea = rows.filter((row) => row.disposition === "yea").length;
    const nay = rows.filter((row) => row.disposition === "nay").length;
    const present = rows.filter(
      (row) => row.disposition !== "absent" && row.disposition !== "excused",
    ).length;
    const threshold =
      override.kind === "joint-session" &&
      measure.subjectClass !== "general-policy" &&
      override.appropriationsThreshold.kind === "known"
        ? override.appropriationsThreshold.value
        : override.threshold;
    const denominator =
      threshold.countedAgainst === "members-present"
        ? present
        : threshold.countedAgainst === "members-voting"
          ? yea + nay
          : seats;
    return {
      forumKey,
      yea,
      required: resolveRequiredVotes(threshold, denominator).requiredVotes,
    };
  };
  const seated = chambers.map((chamber) => chamber!);
  const forums =
    override.kind === "joint-session"
      ? [
          count(
            "joint",
            seated.flatMap((chamber) => chamber.body.members),
            override.combinedSeats,
          ),
        ]
      : seated.map((chamber) =>
          count(chamber.body.chamberKey, chamber.body.members, chamber.seats),
        );
  return {
    overridden: forums.every((forum) => forum.yea >= forum.required),
    forums,
  };
}

function governorConsiderations(
  world: World,
  governorId: EntityId,
  measure: LegislativeMeasureRecord,
  staff: { readonly optionKey: string; readonly reason: string } | null,
): DecisionConsideration[] {
  const reasons: DecisionConsideration[] = [
    {
      stableKey: "governor:passed-bill",
      optionKey: BILL_SIGN,
      sourceType: "context:passed-bill",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The legislature passed the bill.",
      sourceRefs: [],
    },
  ];
  const principles = principleVoteConsideration(
    world,
    governorId,
    measure,
    measureAnswersAt(world, measure.id, undefined, "all"),
  );
  if (principles)
    reasons.push({
      ...principles,
      stableKey:
        principles.optionKey === "vote-yea"
          ? "governor:principle:for"
          : "governor:principle:against",
      optionKey: principles.optionKey === "vote-yea" ? BILL_SIGN : BILL_RETURN,
      explanation:
        principles.optionKey === "vote-yea"
          ? "The bill does what the governor's principles call for."
          : "The bill cuts against the governor's principles.",
    });
  const party = publicPartyOf(world, governorId);
  const backers = [
    ...(measure.sponsorPersonId ? [measure.sponsorPersonId] : []),
    ...measureCosponsors(world, measure.id),
  ];
  const backerParties = new Set(
    backers.flatMap((personId) => {
      const backerParty = publicPartyOf(world, personId);
      return backerParty ? [backerParty] : [];
    }),
  );
  if (party && backerParties.has(party))
    reasons.push({
      stableKey: "governor:own-party-bill",
      optionKey: BILL_SIGN,
      sourceType: "context:sponsor-party",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "A member of the governor's own party carried the bill.",
      sourceRefs: [],
    });
  else if (party && backerParties.size > 0)
    reasons.push({
      stableKey: "governor:other-party-bill",
      optionKey: BILL_RETURN,
      sourceType: "context:sponsor-party",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "Only the other party's members carried the bill.",
      sourceRefs: [],
    });
  const own = ownPartyPassageVote(world, measure.id, party);
  if (own.yea !== own.nay)
    reasons.push({
      stableKey:
        own.yea > own.nay
          ? "governor:party-voted-for"
          : "governor:party-voted-against",
      optionKey: own.yea > own.nay ? BILL_SIGN : BILL_RETURN,
      sourceType: "context:party-floor-vote",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        own.yea > own.nay
          ? `The governor's party voted for it in the legislature, ${own.yea} to ${own.nay}.`
          : `The governor's party voted against it in the legislature, ${own.nay} to ${own.yea}.`,
      sourceRefs: [],
    });
  if (measure.sponsorPersonId)
    reasons.push(
      ...relationshipConsiderations(
        world,
        governorId,
        measure.sponsorPersonId,
        {
          optionKey: BILL_SIGN,
          fond: {
            stableKey: "governor:sponsor-relationship",
            explanation: "The governor thinks well of the bill's sponsor.",
          },
          strain: {
            stableKey: "governor:sponsor-strain",
            explanation:
              "The governor has a strained history with the sponsor.",
          },
        },
      ).map((reason) =>
        // A strained history is a reason to return, not a reason against
        // signing, so both read as support for one of the two options.
        reason.direction === "opposes"
          ? {
              ...reason,
              optionKey: BILL_RETURN,
              direction: "supports" as const,
            }
          : reason,
      ),
    );
  const count = overrideCount(world, measure, governorId);
  if (count?.overridden)
    reasons.push({
      stableKey: "governor:override-certain",
      optionKey: BILL_SIGN,
      sourceType: "context:override-count",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: `A veto would be overridden: ${count.forums
        .map((forum) => `${forum.yea} of ${forum.required} needed`)
        .join("; ")}.`,
      sourceRefs: [],
    });
  if (staff)
    reasons.push({
      stableKey: "governor:staff-advice",
      optionKey: staff.optionKey,
      sourceType: "context:staff-advice",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: `The chief of staff advised it: ${staff.reason}`,
      sourceRefs: [],
    });
  return reasons;
}

/** The pack's executable presentment window; missing basis stays unsupported. */
export function executiveBillActionWindow(
  world: World,
  measure: LegislativeMeasureRecord,
): {
  readonly lastActionDate: IsoDate;
  readonly inactionAt: IsoDate;
  readonly inactionOutcome:
    "becomes-law-without-signature" | "pocket-veto" | null;
} | null {
  const presented = measureActions(world, measure.id)
    .filter((a) => a.kind === "presented-to-executive")
    .at(-1);
  if (!presented) return null;
  const pack = legislativeRulePackForWorld(world, measure.rulePackId);
  const closed = measureSessionClosedOn(world, measure, pack);
  const afterAdjournment = closed !== null && world.currentDate > closed;
  const days = afterAdjournment
    ? pack.executive.actionWindowDaysAfterAdjournment
    : pack.executive.actionWindowDaysInSession;
  const basis = afterAdjournment
    ? pack.executive.actionWindowDayBasisAfterAdjournment
    : pack.executive.actionWindowDayBasisInSession;
  if (
    days.kind !== "known" ||
    basis?.kind !== "known" ||
    !["CALENDAR", "BUSINESS", "SUNDAYS_EXCEPTED"].includes(basis.value) ||
    !Number.isInteger(days.value) ||
    days.value < 0
  )
    return null;
  let lastActionDate = presented.occurredAt;
  for (let remaining = days.value; remaining > 0;) {
    lastActionDate = addDays(lastActionDate, 1);
    const weekday = new Date(`${lastActionDate}T00:00:00Z`).getUTCDay();
    if (
      basis.value === "CALENDAR" ||
      (basis.value === "SUNDAYS_EXCEPTED" && weekday !== 0) ||
      (basis.value === "BUSINESS" && weekday !== 0 && weekday !== 6)
    )
      remaining -= 1;
  }
  const outcome = afterAdjournment
    ? null
    : pack.executive.inactionOutcomeInSession;
  return {
    lastActionDate,
    inactionAt: addDays(lastActionDate, 1),
    inactionOutcome: outcome?.kind === "known" ? outcome.value : null,
  };
}

/** The governor's decision on a bill on the desk. Pure: the caller records it. */
export function evaluateGovernorBill(
  world: World,
  input: {
    readonly stableKey: string;
    readonly governorId: EntityId;
    readonly executiveTitle?: string;
    /** A validated controlled officeholder instruction, sourced to the actual desk matter. */
    readonly playerChoice?: {
      readonly optionKey: typeof BILL_SIGN | typeof BILL_RETURN;
      readonly matterEventId: EntityId;
    };
    readonly measure: LegislativeMeasureRecord;
    readonly staff: {
      readonly optionKey: string;
      readonly reason: string;
    } | null;
  },
): DecisionEvaluation {
  return evaluateDecision(world, {
    stableKey: `${input.stableKey}:governor`,
    decisionType: GOVERNOR_BILL_DECISION,
    actorPersonId: input.governorId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:bill-on-desk",
      key: input.measure.stableKey,
      entityId: null,
    },
    options: [
      {
        key: BILL_SIGN,
        label: "Sign it",
        description: "The bill becomes law.",
      },
      {
        key: BILL_RETURN,
        label: "Send it back unsigned",
        description: "Veto the bill and return it to the legislature.",
      },
    ],
    constraints: input.playerChoice
      ? [
          {
            stableKey: "executive:player-instruction",
            optionKey:
              input.playerChoice.optionKey === BILL_SIGN
                ? BILL_RETURN
                : BILL_SIGN,
            kind: "player:recorded-choice",
            explanation:
              "The controlled officeholder explicitly chose the other action.",
            sourceRefs: [
              {
                kind: "historical-event",
                eventId: input.playerChoice.matterEventId,
              },
            ],
          },
        ]
      : [],
    considerations: governorConsiderations(
      world,
      input.governorId,
      input.measure,
      input.staff,
    ).map((reason) =>
      input.executiveTitle
        ? {
            ...reason,
            explanation: reason.explanation.replace(
              /\bgovernor\b/g,
              input.executiveTitle.toLowerCase(),
            ),
          }
        : reason,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}
