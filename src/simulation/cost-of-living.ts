import { addDays } from "./dates";
import { householdMembershipsAt } from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import { recordEventKnowledge } from "./records";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { resourcePositionAt, sameEndpoint } from "./resource-queries";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, ResourceFlow, World } from "./types";

/**
 * What it costs a person to live, charged a week at a time.
 *
 * Before this nothing was ever spent. Pay arrived after every shift and no
 * rent, food or bill was ever charged, so in the long playthrough Fatima
 * Erickson worked a part-time shop job in Eastport, Maine for three years and
 * had $87,984 saved. Money never forced a choice.
 *
 * The plumbing is real and the amount is not. Each week the person being
 * played pays their share of the household's living costs from their own
 * recorded money, through the same flow-and-outcome records pay and tuition
 * already use, so the balance anywhere in the game reads it with no extra
 * code. A week they cannot cover is recorded as short, not as debt, and the
 * first shortfall is written down as something the life now carries, which is
 * what `adult.household-money-shortfall` was withheld for.
 *
 * Two rules keep it honest:
 *
 * - Nobody is charged whose money the game is not tracking. A person with no
 *   recorded position has unknown finances, and unknown is not zero.
 * - Nothing is charged for time before the charge existed. An old save starts
 *   paying from the day it is next opened, not for the years behind it.
 */

/**
 * PLACEHOLDER(research: what-a-person-spends-to-live). Nobody has researched
 * this number. It is one national weekly figure for one adult's share of rent,
 * food, utilities and other necessities, the same in every state and town,
 * standing in until the question is answered with bands by category, place
 * size and state. Replace it; do not tune it.
 */
export const LIVING_COSTS_PLACEHOLDER = {
  weeklyPerAdultMinor: 35_000,
  currency: "USD",
  researchQuestionId: "what-a-person-spends-to-live",
} as const;

export const LIVING_COSTS_BASIS = "custom:living-costs" as const;
export const LIVING_COSTS_WEEK_DAYS = 7;
export const HOUSEHOLD_SHORTFALL_TAG = "life.opportunity:household-shortfall";
const SHORTFALL_ANSWER = "adult.household-money-shortfall";

/** The most weeks one transition will settle, so a corrupt date cannot spin. */
const CATCH_UP_LIMIT_WEEKS = 520;

function flowKey(personId: EntityId): string {
  return `living-costs:${personId}`;
}

export function livingCostsFlowFor(
  world: World,
  personId: EntityId,
): ResourceFlow | null {
  return (
    world.history.resourceFlows.find(
      (flow) => flow.stableKey === flowKey(personId),
    ) ?? null
  );
}

function primaryHouseholdId(world: World, personId: EntityId): EntityId | null {
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  return homes.length === 1 ? homes[0]!.household.id : null;
}

function dollars(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Settles every whole week of living costs that has come due, and stops.
 *
 * Idempotent: each week is keyed by the day it began, so calling this twice,
 * or after a reload, writes nothing new. Called from the same transitions that
 * write the household's next week of errands, and from nothing that only reads.
 */
export function settleLivingCosts(world: World, personId: EntityId): World {
  const person = world.people[personId];
  if (!person) return world;
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return world;
  const currency = money(0, LIVING_COSTS_PLACEHOLDER.currency).currency;
  const owner = { kind: "person" as const, personId };
  const tracked = world.history.resourcePositions.some(
    (position) =>
      sameEndpoint(position.owner, owner) &&
      position.openingBalance.currency === currency,
  );
  if (!tracked) return world;
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return world;

  const weekly = money(LIVING_COSTS_PLACEHOLDER.weeklyPerAdultMinor, currency);
  let next = world;
  let flow = livingCostsFlowFor(next, personId);
  if (!flow) {
    const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
    next = createResourceFlow(next, {
      stableKey: flowKey(personId),
      source: owner,
      // Paid to the household, which is what consumes it. No household keeps
      // a balance today; if one ever does, this money is spent, not saved,
      // and must be routed on rather than shown as the household's.
      recipient: { kind: "household", householdId },
      startsAt: next.currentDate,
      amount: weekly,
      cadenceKind: "schedule:weekly",
      basisKind: LIVING_COSTS_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: place?.context.jurisdiction.id ?? null,
      provenance: {
        kind: "authored",
        note: `Placeholder living costs pending research question ${LIVING_COSTS_PLACEHOLDER.researchQuestionId}.`,
      },
    });
    return next;
  }

  const settled = new Set(
    next.history.resourceTransferOutcomes
      .filter((outcome) => outcome.resourceFlowId === flow!.id)
      .map((outcome) => outcome.periodStartsAt),
  );
  for (let week = 1; week <= CATCH_UP_LIMIT_WEEKS; week += 1) {
    const periodStartsAt = addDays(
      flow.startsAt,
      (week - 1) * LIVING_COSTS_WEEK_DAYS,
    );
    const dueOn = addDays(flow.startsAt, week * LIVING_COSTS_WEEK_DAYS);
    if (dueOn > next.currentDate) break;
    if (settled.has(periodStartsAt)) continue;
    next = settleWeek(next, personId, flow, periodStartsAt, dueOn);
    flow = livingCostsFlowFor(next, personId)!;
  }
  return next;
}

function settleWeek(
  world: World,
  personId: EntityId,
  flow: ResourceFlow,
  periodStartsAt: IsoDate,
  dueOn: IsoDate,
): World {
  const weekly = money(
    LIVING_COSTS_PLACEHOLDER.weeklyPerAdultMinor,
    LIVING_COSTS_PLACEHOLDER.currency,
  );
  // The balance on the day the week fell due, not today's, so a long quiet
  // stretch settled in one go still pays each week from what was there then.
  const available = Math.max(
    0,
    resourcePositionAt(world, { kind: "person", personId }, weekly.currency, {
      asOfDate: dueOn,
      historySequenceExclusive: world.history.nextSequence,
    })?.liquidBalance.minorUnits ?? 0,
  );
  const paid = Math.min(available, weekly.minorUnits);
  const status =
    paid === weekly.minorUnits ? "completed" : paid > 0 ? "partial" : "missed";
  const next = recordResourceTransferOutcome(world, {
    stableKey: `${flow.stableKey}:${periodStartsAt}`,
    resourceFlowId: flow.id,
    periodStartsAt,
    periodEndsAt: addDays(dueOn, -1),
    occurredAt: dueOn,
    status,
    attemptedAmount: weekly,
    transferredAmount: money(paid, weekly.currency),
    reasonKind: status === "completed" ? null : "capacity:insufficient-funds",
    note: "Rent, food and bills for the week.",
    provenance: flow.provenance,
  });
  return status === "completed"
    ? next
    : recordFirstShortfall(next, personId, weekly.minorUnits, paid, dueOn);
}

/**
 * The first week this life could not cover, as something it now carries.
 *
 * Written once while the moment it opens is unanswered and never after it has
 * been played: the scene happens once in a life, and a second notice nobody
 * could ever answer would sit in the life for good. Later short weeks are still
 * on the record as short transfers.
 */
function recordFirstShortfall(
  world: World,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
): World {
  const already = world.history.events.some(
    (event) =>
      event.involvedEntityIds.includes(personId) &&
      (event.tags.includes(HOUSEHOLD_SHORTFALL_TAG) ||
        event.tags.includes(SHORTFALL_ANSWER)),
  );
  if (already) return world;
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const summary =
    paidMinor > 0
      ? `This week's rent, food and bills came to ${dollars(owedMinor)}, and you had ${dollars(paidMinor)} to put toward them. You are ${dollars(owedMinor - paidMinor)} short.`
      : `This week's rent, food and bills came to ${dollars(owedMinor)}, and you had nothing left to put toward them.`;
  const stableKey = `living-costs-shortfall:${personId}:${dueOn}`;
  const next = recordWorldEvent(world, {
    stableKey,
    type: "life.living-costs-short",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Could not cover the week" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [HOUSEHOLD_SHORTFALL_TAG],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: next.history.events.at(-1)!.id,
    learnedAt: world.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
