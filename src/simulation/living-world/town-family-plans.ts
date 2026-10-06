/**
 * Whether a couple in town raises having a child (A136).
 *
 * A child is born only from a recorded family plan
 * (`../people-family-plan`): one partner raises it, the other answers from
 * their own temperament, and on a yes the child arrives on the plan's date
 * through the family writer. This is what lets a town couple raise it, on the
 * town's quarterly family review, without any draw.
 *
 * Each couple who share a home and could plan it (both 18 to 45, nothing
 * already raised and waiting or on its way) weighs it through the decision
 * engine, once from each partner's side. Everything on record about them
 * bears on it, each as a sliding amount and never a cutoff:
 *
 * - the ages of the one who would carry the child (or, with nobody who
 *   would, the younger of the two, and the plan is an adoption);
 * - the children they already have, and how long since the last one (or
 *   since they got together, with none yet), which argues against it at
 *   first, most for it a couple of years on, and less again long after;
 * - whether they are married;
 * - what the household earns a month, what its rent takes of that, and the
 *   cash the two of them hold;
 * - the room in a rented home, by its bedrooms on the lease;
 * - each partner's active health episodes, by how much they weigh;
 * - the deciding partner's own temperament and, where on record, their view
 *   of tradition;
 * - the outcome web's links into births in this place (the law in force on
 *   abortion, and unemployment nine months before), each bearing on the
 *   couple's decision by its own factor;
 * - the town's unemployment now;
 * - a "not now" from the partner recently, which fades with time.
 *
 * Against all that stands leaving life as it is, which every couple weighs
 * the same. The partner whose side leans further toward raising it is the
 * one who does; if neither leans toward it, nobody raises it this quarter.
 *
 * A couple acts on what changed. If a partner's side already leaned toward
 * it at the last review's day, that call was made then: they raised it, or
 * they had a child, or they let it be. So a world that has just opened does
 * not have every ready couple raise it in the same quarter, and a couple
 * comes back to it as their youngest grows, a "not now" fades, or their pay,
 * rent or the law changes.
 *
 * The weights are GAME ASSUMPTIONS until the research request
 * `when-a-couple-plans-a-child` answers them. The real birth rates by
 * mother's age never decide a couple: they check the town's total in the
 * tests. The place's own measured birth level (`births-level-to-births`) is
 * a rate, so it is not read here either.
 */

import { addDays, ageOnDate } from "../dates";
import { considerationScore, evaluateDecision } from "../decisions";
import { activeHealthEpisodes } from "../crisis/health-queries";
import { outcomeFactor } from "../outcome-web";
import {
  FAMILY_INTENTION_ANSWERED_EVENT,
  FAMILY_INTENTION_EVENT,
  familyPlanAvailability,
  proposeFamilyPlan,
  type FamilyPlanKind,
} from "../people-family-plan";
import { ensurePeopleTraits, traitConsiderations } from "../people-traits";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import type {
  DecisionConsideration,
  DecisionImportance,
  MindConfidence,
  EntityId,
  IsoDate,
  World,
} from "../types";
import { townUnemploymentPressure } from "./town-labor-market";
import { householdHousingFacts, townLeases } from "./town-rent";

export const TOWN_FAMILY_PLANS_VERSION = "town-family-plans-v1";

const USD = money(0, "USD").currency;

/** The town's family review comes round every quarter. */
const REVIEW_DAYS = 91;

/** The two choices a partner weighs. */
export const FAMILY_PLAN_OPTIONS = {
  raise: "raise-it",
  wait: "leave-it",
} as const;

/**
 * GAME ASSUMPTIONS: how strongly each circumstance argues, in the decision
 * engine's points. Each is the most it can argue; the circumstance itself
 * slides it between nothing and that.
 */
export const FAMILY_PLAN_WEIGHTS = {
  /** Leaving life as it is: every couple weighs this the same. */
  asItIs: 3,
  /** At the age readiest for it; it falls away smoothly on either side. */
  age: 4,
  /** The age readiest for it, and how fast readiness falls away from it. */
  readiestAge: 30,
  ageSpread: 7,
  /**
   * The children they already have: for none, 1.2 times this; it falls by
   * 0.8 times this with each child, so a second still argues for it and a
   * third against.
   */
  children: 2,
  /**
   * Timing: the years since their last child, or since they got together
   * when they have none. It argues against it at first (a newborn, a new
   * couple), most for it near `timingPeakYears`, and against it again long
   * after, the way births bunch after a wedding and space after a child.
   */
  timing: 4,
  /**
   * RECORDED GAME VALUE: 2.5 years, the lower bound of the 2.5-to-3-year U.S.
   * birth-spacing range already recorded from NCHS interval reports.
   */
  timingPeakYears: 2.5,
  /** Being married. */
  married: 2,
  /** Earning twice the national median household pay (or half). */
  pay: 2,
  /** National median household income, cents a month (Census 2023, $80,610). */
  medianMonthlyPayMinor: 671_750,
  /** Rent taking half of what the household earns. */
  rentBurden: 3,
  /** Cash on hand worth six months of pay. */
  savings: 2,
  /** Each more person than a bedroom and a half holds, after the child. */
  crowding: 2,
  /** A health episode that doubles a partner's risk. */
  health: 3,
  /** A strongly held view of tradition. */
  tradition: 2,
  /** The outcome web's factor on births, per unit of its logarithm. */
  outcomeLink: 25,
  /** Unemployment in town at twice its reference. */
  unemployment: 2,
  /** A "not now" this quarter; it fades by half in about half a year. */
  declined: 4,
  declinedHalfLifeYears: 0.5,
} as const;

/** The engine's points, rounded to the nearest importance and confidence. */
const STEPS: readonly (readonly [
  number,
  DecisionImportance,
  MindConfidence,
])[] = [
  [1, "slight", "low"],
  [2, "slight", "medium"],
  [3, "slight", "high"],
  [4, "strong", "low"],
  [6, "moderate", "high"],
  [8, "strong", "medium"],
  [12, "strong", "high"],
  [18, "decisive", "high"],
];

function step(points: number) {
  const size = Math.abs(points);
  if (size < 0.5) return null;
  let best = STEPS[0]!;
  for (const candidate of STEPS)
    if (
      Math.abs(Math.log(candidate[0] / size)) <
      Math.abs(Math.log(best[0] / size))
    )
      best = candidate;
  return best;
}

function yearsSince(from: IsoDate, to: IsoDate): number {
  return (Date.parse(to) - Date.parse(from)) / (365.25 * 86_400_000);
}

/** A couple the town review hands over, with what it already read. */
export interface TownCouple {
  readonly personIds: readonly [EntityId, EntityId];
  readonly married: boolean;
  readonly startedAt: IsoDate;
  readonly householdId: EntityId;
  /** Children either of them has, with their birth dates. */
  readonly children: readonly EntityId[];
}

interface PlanHistory {
  /** Couples with a plan waiting for an answer or for its day. */
  readonly open: Set<string>;
  /** The latest "not now" each couple heard. */
  readonly declinedOn: Map<string, IsoDate>;
}

const coupleKey = (a: EntityId, b: EntityId) =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

/** One pass over the family-plan records, once a review. */
function planHistory(world: World, today: IsoDate): PlanHistory {
  const intentions = new Map<EntityId, string>();
  const answered = new Map<
    EntityId,
    { agreed: boolean; on: IsoDate; due: IsoDate | null }
  >();
  const resolved = new Set<EntityId>();
  for (const event of world.history.events) {
    if (event.type === FAMILY_INTENTION_EVENT) {
      const [a, b] = event.involvedEntityIds;
      if (a && b) intentions.set(event.id, coupleKey(a, b));
      continue;
    }
    const tag = event.tags.find((entry) => entry.startsWith("family-plan:"));
    if (!tag) continue;
    const intentionId = tag.slice("family-plan:".length) as EntityId;
    if (event.type === FAMILY_INTENTION_ANSWERED_EVENT)
      answered.set(intentionId, {
        agreed: event.tags.includes("family-plan.agreed"),
        on: event.occurredAt,
        due:
          (event.tags
            .find((entry) => entry.startsWith("family-plan.on:"))
            ?.slice("family-plan.on:".length) as IsoDate | undefined) ?? null,
      });
    else if (event.type === "life.family-member-added")
      resolved.add(intentionId);
  }
  const open = new Set<string>();
  const declinedOn = new Map<string, IsoDate>();
  for (const [intentionId, key] of intentions) {
    const answer = answered.get(intentionId);
    // An agreed plan is open until its day; one whose day passed with no
    // child (an adoption with nobody to place) lapsed and closes.
    if (
      !answer ||
      (answer.agreed &&
        !resolved.has(intentionId) &&
        (answer.due === null || answer.due >= today))
    )
      open.add(key);
    else if (!answer.agreed && (declinedOn.get(key) ?? "") < answer.on)
      declinedOn.set(key, answer.on);
  }
  return { open, declinedOn };
}

/**
 * The couple's circumstances, as considerations on raising it: every one of
 * them a sliding amount, positive for raising it and negative against.
 */
function circumstances(
  world: World,
  couple: TownCouple,
  context: {
    readonly today: IsoDate;
    readonly carrierAge: number;
    readonly payMinor: number | null;
    readonly rentMinor: number | null;
    readonly members: number;
    readonly bedrooms: number | null;
    readonly cashMinor: number | null;
    readonly links: readonly { key: string; factor: number }[];
    readonly unemploymentPressure: number;
    readonly declinedOn: IsoDate | null;
  },
): readonly [string, number, string][] {
  const w = FAMILY_PLAN_WEIGHTS;
  const out: [string, number, string][] = [];
  const add = (key: string, points: number, why: string) => {
    if (Number.isFinite(points)) out.push([key, points, why]);
  };
  const { today } = context;
  const distance = (context.carrierAge - w.readiestAge) / w.ageSpread;
  add(
    "age",
    w.age * (2 * Math.exp(-distance * distance) - 1),
    "Where they are in life for it.",
  );
  const births = couple.children
    .map((id) => world.people[id]?.birthDate)
    .filter((date): date is IsoDate => !!date && date <= today)
    .sort();
  const count = births.length;
  add(
    "children",
    w.children * (1.2 - 0.8 * count),
    count === 0 ? "They have no child yet." : "The children they already have.",
  );
  const since = Math.max(
    0,
    yearsSince(births.at(-1) ?? couple.startedAt, today) / w.timingPeakYears,
  );
  add(
    "timing",
    w.timing * (2 * since * Math.exp(1 - since) - 1),
    births.length > 0
      ? "How long since their last child."
      : "How long they have been together.",
  );
  if (couple.married) add("married", w.married, "They are married.");
  if (context.payMinor !== null && context.payMinor > 0) {
    add(
      "pay",
      w.pay * Math.log2(context.payMinor / w.medianMonthlyPayMinor),
      "What the household earns.",
    );
    if (context.rentMinor !== null)
      add(
        "rent",
        -w.rentBurden * 2 * (context.rentMinor / context.payMinor - 0.3),
        "What the rent takes of it.",
      );
    if (context.cashMinor !== null)
      add(
        "savings",
        w.savings *
          Math.log1p(Math.max(0, context.cashMinor) / context.payMinor / 6) -
          w.savings / 2,
        "The money they have put by.",
      );
  } else if (context.payMinor !== null) {
    add("pay", -2 * w.pay, "Nobody in the household is paid.");
  }
  if (context.bedrooms !== null) {
    const holds = Math.max(1, context.bedrooms * 1.5);
    add(
      "room",
      -w.crowding * Math.max(0, (context.members + 1 - holds) / holds) * 2,
      "The room the home has for one more.",
    );
  }
  for (const id of couple.personIds) {
    let weight = 0;
    for (const episode of activeHealthEpisodes(world, id))
      weight += Math.log(Math.max(1, episode.hazardMultiplierMicros / 1e6));
    if (weight > 0)
      add(
        `health:${id}`,
        -w.health * (weight / Math.LN2),
        "One of them is not well.",
      );
  }
  for (const link of context.links)
    add(
      `link:${link.key}`,
      w.outcomeLink * Math.log(link.factor),
      link.key.includes("abortion")
        ? "The law where they live."
        : "How hard times have been.",
    );
  add(
    "unemployment",
    -w.unemployment * Math.log2(context.unemploymentPressure),
    "How many people in town are out of work.",
  );
  if (context.declinedOn && context.declinedOn <= today)
    add(
      "declined",
      -w.declined *
        0.5 **
          (yearsSince(context.declinedOn, today) / w.declinedHalfLifeYears),
      "One of them said not now, not long ago.",
    );
  return out;
}

function considerations(
  rows: readonly [string, number, string][],
  prefix: string,
): DecisionConsideration[] {
  const list: DecisionConsideration[] = [
    {
      stableKey: `${prefix}:as-it-is`,
      optionKey: FAMILY_PLAN_OPTIONS.wait,
      sourceType: "context:life-as-it-is",
      direction: "supports",
      importance: step(FAMILY_PLAN_WEIGHTS.asItIs)![1],
      confidence: step(FAMILY_PLAN_WEIGHTS.asItIs)![2],
      explanation: "A child changes everything; life as it is goes on.",
      sourceRefs: [],
    },
  ];
  for (const [key, points, why] of rows) {
    const size = step(points);
    if (!size) continue;
    list.push({
      stableKey: `${prefix}:${key}`,
      optionKey: FAMILY_PLAN_OPTIONS.raise,
      sourceType: "context:circumstance",
      direction: points > 0 ? "supports" : "opposes",
      importance: size[1],
      confidence: size[2],
      explanation: why,
      sourceRefs: [],
    });
  }
  return list;
}

function margin(list: readonly DecisionConsideration[]): number {
  let total = 0;
  for (const row of list)
    total +=
      (row.optionKey === FAMILY_PLAN_OPTIONS.raise ? 1 : -1) *
      considerationScore(row);
  return total;
}

/**
 * Every eligible couple weighs raising a family plan; the ones who do raise
 * it through `proposeFamilyPlan`. Couples with the player in them are left
 * to the player.
 */
export function weighTownFamilyPlans(
  world: World,
  town: EntityId,
  couples: readonly TownCouple[],
  isPlayer: (id: EntityId) => boolean,
): World {
  const today = world.currentDate;
  const eligible = couples.filter(
    (couple) =>
      !couple.personIds.some(isPlayer) &&
      couple.personIds.every((id) => {
        const person = world.people[id];
        if (!person) return false;
        const age = ageOnDate(person.birthDate, today);
        return age >= 18 && age <= 45;
      }),
  );
  if (eligible.length === 0) return world;
  const history = planHistory(world, today);
  const waiting = eligible.filter(
    (couple) => !history.open.has(coupleKey(...couple.personIds)),
  );
  if (waiting.length === 0) return world;

  // What the town records on a date: today, and the last review's day, so a
  // couple acts on what changed since they last weighed it.
  const townAt = (date: IsoDate) => {
    const bedrooms = new Map<EntityId, number>();
    for (const lease of townLeases(world, date))
      if (!lease.ended && lease.flow.startsAt <= date)
        bedrooms.set(lease.householdId, lease.bedrooms);
    return {
      date,
      facts: householdHousingFacts(world, date),
      bedrooms,
      links: outcomeFactor(world, town, "births.rate", date)
        .causes.filter((cause) => cause.key !== "births-level-to-births")
        .map((cause) => ({ key: cause.key, factor: cause.factor })),
    };
  };
  const now = townAt(today);
  const before = townAt(addDays(today, -REVIEW_DAYS));
  const pressure = townUnemploymentPressure(world, town);
  const traditionId =
    Object.values(world.policyCatalog?.principles ?? {}).find(
      (principle) => principle.stableKey === "us-policy-positions:tradition",
    )?.id ?? null;
  const tradition = new Map<EntityId, { id: EntityId; lean: number }>();
  if (traditionId)
    for (const record of world.history.principles)
      if (record.principleId === traditionId && record.formedAt <= today)
        tradition.set(record.personId, {
          id: record.id,
          lean:
            record.stance === "endorses"
              ? record.strength
              : record.stance === "rejects"
                ? -record.strength
                : 0,
        });

  let next = ensurePeopleTraits(
    world,
    waiting.flatMap((couple) => [...couple.personIds]),
  );
  for (const couple of waiting) {
    const [a, b] = couple.personIds;
    const people = [next.people[a]!, next.people[b]!];
    const carriers = people.filter(
      (person) => person.identity?.gender === "female",
    );
    const kind: FamilyPlanKind = carriers.length > 0 ? "birth" : "adoption";
    const carrierAgeOn = (date: IsoDate) =>
      Math.min(
        ...(carriers.length > 0 ? carriers : people).map((person) =>
          ageOnDate(person.birthDate, date),
        ),
      );
    let cash: number | null = null;
    for (const id of couple.personIds) {
      const position = resourcePositionAt(
        next,
        { kind: "person", personId: id },
        USD,
      );
      if (position) cash = (cash ?? 0) + position.liquidBalance.minorUnits;
    }
    const rowsAt = (town: ReturnType<typeof townAt>) => {
      const household = town.facts.get(couple.householdId);
      return circumstances(next, couple, {
        today: town.date,
        carrierAge: carrierAgeOn(town.date),
        payMinor: household?.payMinor ?? null,
        rentMinor: household?.rentMinor ?? null,
        members: household?.members ?? 2,
        bedrooms: town.bedrooms.get(couple.householdId) ?? null,
        cashMinor: cash,
        links: town.links,
        unemploymentPressure: pressure,
        declinedOn: history.declinedOn.get(coupleKey(a, b)) ?? null,
      });
    };
    const rows = rowsAt(now);
    // At the last review's day: a couple already together then, whose own
    // side already leaned toward it, made that call then. Only a change
    // since (a child growing, a "not now" fading, pay, rent, the law) turns
    // a couple toward it now.
    const together = couple.startedAt < before.date;
    const rowsBefore = together ? rowsAt(before) : null;
    // Each partner weighs it from their own side: the shared circumstances,
    // their own temperament and their own view of tradition.
    let best: { actor: EntityId; margin: number } | null = null;
    for (const actor of couple.personIds) {
      const prefix = `${TOWN_FAMILY_PLANS_VERSION}:${actor}:${today}`;
      const list = [
        ...considerations(rows, prefix),
        ...traitConsiderations(next, actor, prefix, [
          {
            optionKey: FAMILY_PLAN_OPTIONS.raise,
            trait: "risk",
            pole: "high",
            explanation: "They are ready to take something on.",
          },
          {
            optionKey: FAMILY_PLAN_OPTIONS.wait,
            trait: "deliberation",
            pole: "low",
            explanation: "They would rather think it through for longer.",
          },
          {
            optionKey: FAMILY_PLAN_OPTIONS.raise,
            trait: "reliability",
            pole: "high",
            explanation: "They mean to see things through.",
          },
        ]),
      ];
      const held = tradition.get(actor);
      const size = held
        ? step(FAMILY_PLAN_WEIGHTS.tradition * held.lean)
        : null;
      if (held && size)
        list.push({
          stableKey: `${prefix}:tradition`,
          optionKey: FAMILY_PLAN_OPTIONS.raise,
          sourceType: "belief:principle",
          direction: held.lean > 0 ? "supports" : "opposes",
          importance: size[1],
          confidence: size[2],
          explanation: "What they believe about family and tradition.",
          sourceRefs: [
            { kind: "political-principle", principleRecordId: held.id },
          ],
        });
      const evaluation = evaluateDecision(next, {
        stableKey: prefix,
        decisionType: "people.raise-family-plan",
        actorPersonId: actor,
        cutoff: {
          asOfDate: today,
          historySequenceExclusive: next.history.nextSequence,
        },
        subject: { kind: "context:life", key: "family-plan", entityId: null },
        options: [
          {
            key: FAMILY_PLAN_OPTIONS.raise,
            label: "Raise it",
            description: "Say they would like a child.",
          },
          {
            key: FAMILY_PLAN_OPTIONS.wait,
            label: "Leave it",
            description: "Say nothing about it for now.",
          },
        ],
        constraints: [],
        considerations: list,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      if (evaluation.selectedOptionKey !== FAMILY_PLAN_OPTIONS.raise) continue;
      const lean = margin(list);
      if (rowsBefore) {
        const earlier = [
          ...considerations(rowsBefore, `${prefix}:before`),
          ...list.filter((row) => !row.sourceType.startsWith("context:")),
        ];
        if (margin(earlier) > 0) continue;
      }
      if (
        !best ||
        lean > best.margin ||
        (lean === best.margin && actor < best.actor)
      )
        best = { actor, margin: lean };
    }
    if (!best) continue;
    // The plan's own rule decides whether these two can raise it at all.
    const availability = familyPlanAvailability(next, best.actor);
    const partner = best.actor === a ? b : a;
    if (!availability.available || availability.partnerPersonId !== partner)
      continue;
    next = proposeFamilyPlan(next, { personId: best.actor, kind });
  }
  return next;
}
