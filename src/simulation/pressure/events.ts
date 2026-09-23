/**
 * What the pressure layer sets off. Runs once per quarter, right after
 * `stepPressure`, and reads only the readings and the records the world
 * already holds. Nothing here is scheduled for a date or fired at a fixed
 * chance: with no pressure over its line nothing can happen, and the chance
 * grows with how far over the line the pressure is.
 *
 * Political violence (ChatGPT C09: keep the threat-or-intent prerequisite,
 * no timer, abstract and non-operational):
 * 1. Anger over its line in a state gives a chance of unrest there, a public
 *    event.
 * 2. Unrest recorded this quarter and in an earlier recent quarter is lasting
 *    unrest. It gives a chance of a threat against a prominent political
 *    person in that state: the governor, a member of Congress from it, or a
 *    party chapter organizer who lives there, in office or not.
 * 3. A threat from an earlier quarter, while anger there is still over its
 *    line, gives a chance of an attempt through `recordViolenceAttempt`,
 *    citing the threat and the unrest as its evidence. An attempt feeds anger
 *    and fear back (`anger.ts`).
 *
 * International crises (ChatGPT C08: a development with escalation state
 * feeds the existing declaration route; one persistent crisis per
 * development):
 * 4. Each international development still open carries friction: what its
 *    reports added, plus the country's economic strain and anger since it was
 *    reported. Friction over its line gives a chance of an international
 *    crisis over that development, through `declareInternationalCrisis`. A
 *    development starts at most one crisis.
 *
 * Every number in `BLANKET_POLITICAL_VIOLENCE` and
 * `BLANKET_INTERNATIONAL_FRICTION` is a placeholder, filed with ChatGPT as
 * `political-violence-what-builds-to-an-attack` and
 * `international-crisis-what-escalates-a-dispute`.
 */

import {
  declareInternationalCrisis,
  recordViolenceAttempt,
} from "../crisis/international";
import { currentGovernorOf } from "../crisis/offices";
import { crisisRecords } from "../crisis/records";
import { projectCongress } from "../living-world/congress";
import { homePartyChapters } from "../living-world/party-chapters";
import { macroReleasesAt } from "../macro-economy/readers";
import { personName } from "../people";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, World } from "../types";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import { homeStateKeyOf } from "./anger";
import type { PressureReading } from "./contract";
import { latestReadings } from "./flows";
import { worldStates } from "./step";

export const UNREST_EVENT = "pressure.unrest";
export const POLITICAL_THREAT_EVENT = "pressure.political-threat";

/** BLANKET placeholders; see the file comment. None is researched. */
export const BLANKET_POLITICAL_VIOLENCE = Object.freeze({
  /** Anger at or under this sets nothing off. */
  angerLine: 0.3,
  /** Chance of unrest per unit of anger over the line, each quarter. */
  unrestPerExcess: 1.5,
  /** Unrest is lasting when an earlier one came within this many quarters. */
  lastingWithinQuarters: 4,
  /** Chance of a threat per unit of anger over the line, in lasting unrest. */
  threatPerExcess: 0.75,
  /** Chance of an attempt per unit of anger over the line, on an open threat. */
  attemptPerExcess: 0.5,
  /** A threat with no attempt lapses after this many quarters. */
  threatOpenQuarters: 4,
  /** No chance here ever reaches certainty. */
  chanceCap: 0.9,
});

export const BLANKET_INTERNATIONAL_FRICTION = Object.freeze({
  /** What each report of the development adds, by its importance. */
  importance: { minor: 0.1, notable: 0.25, major: 0.5 } as Readonly<
    Record<string, number>
  >,
  /** Per point the published national unemployment rate rose since. */
  perUnemploymentPoint: 0.15,
  /** Weight of the average anger across states. */
  domesticAnger: 0.5,
  /** Friction at or under this sets nothing off. */
  line: 0.5,
  /** Chance of a crisis per unit of friction over the line, each quarter. */
  crisisPerExcess: 1,
  /** Over the line by this much or more, the crisis opens at high tension. */
  highTensionExcess: 0.25,
  chanceCap: 0.9,
});

/**
 * What each authored international development is about, by its subject
 * index in `living-world/developments.ts`. A development with no entry here
 * starts no crisis.
 */
const DEVELOPMENT_DISPUTES: Readonly<Record<string, string>> = {
  "0": "shipping on an international trade route",
  "1": "fishing rights in shared waters",
};

function chance(excess: number, slope: number, cap: number): number {
  return Math.min(cap, Math.max(0, excess * slope));
}

function draw(world: World, key: readonly unknown[]): number {
  return new SeededRng("pressure-events-v1")
    .fork(JSON.stringify(["pressure-events-v1", world.seed, ...key]))
    .next();
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function alive(world: World, personId: EntityId): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

/** Steps everything the latest quarter's pressure can set off. */
export function stepPressureEvents(world: World): World {
  const store = world.pressure;
  if (!store || store.quartersStepped === 0) return world;
  let next = world;
  const readings = [...latestReadings(world).values()].sort((a, b) =>
    a.stateKey.localeCompare(b.stateKey),
  );
  for (const reading of readings) next = stepStateViolence(next, reading);
  return stepInternationalFriction(next, readings);
}

function stateEvents(world: World, type: string, stateKey: string) {
  return world.history.events.filter(
    (event) => event.type === type && event.tags.includes(`state:${stateKey}`),
  );
}

function quarterOf(event: HistoricalEvent): number {
  return Number(tagValue(event, "quarter:") ?? -1);
}

function stepStateViolence(world: World, reading: PressureReading): World {
  const policy = BLANKET_POLITICAL_VIOLENCE;
  const excess = reading.levels.anger - policy.angerLine;
  if (excess <= 0) return world;
  const { stateKey, ordinal } = reading;
  const state = world.jurisdictions[reading.jurisdictionId];
  if (!state) return world;
  let next = world;

  // 1. Unrest.
  if (
    draw(next, ["unrest", stateKey, ordinal]) <
    chance(excess, policy.unrestPerExcess, policy.chanceCap)
  )
    next = recordWorldEvent(next, {
      stableKey: `pressure:unrest:${stateKey}:${ordinal}`,
      type: UNREST_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: state.id,
      involvedEntityIds: [state.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "pressure",
        UNREST_EVENT,
        `state:${stateKey}`,
        `quarter:${ordinal}`,
      ],
      summary: `Unrest broke out in ${state.name} as public anger ran high.`,
      context: EMPTY_CONTEXT,
    });

  const unrest = stateEvents(next, UNREST_EVENT, stateKey);
  const threats = stateEvents(next, POLITICAL_THREAT_EVENT, stateKey);
  const attempted = new Set(
    crisisRecords(next).flatMap((record) =>
      record.kind === "violence-attempt" ? record.threatEvidenceIds : [],
    ),
  );

  // 3. An attempt on a threat from an earlier quarter, before any new threat,
  // so a threat never turns into an attempt in the quarter it was made.
  for (const threat of threats) {
    const made = quarterOf(threat);
    const targetId = threat.involvedEntityIds.find((id) => next.people[id]);
    if (
      made >= ordinal ||
      ordinal - made > policy.threatOpenQuarters ||
      attempted.has(threat.id) ||
      !targetId ||
      !alive(next, targetId)
    )
      continue;
    if (
      draw(next, ["attempt", threat.id, ordinal]) >=
      chance(excess, policy.attemptPerExcess, policy.chanceCap)
    )
      continue;
    const evidence = [
      threat.id,
      ...unrest
        .filter((event) => quarterOf(event) <= made)
        .map((event) => event.id),
    ];
    next = recordViolenceAttempt(next, {
      stableKey: `pressure:${stateKey}:${ordinal}:${targetId}`,
      targetPersonId: targetId,
      threatEvidenceIds: evidence,
      basis: `Lasting unrest in ${state.name} and an earlier threat against the target.`,
    });
  }

  // 2. A threat, in lasting unrest, when no threat there is still open.
  const now = unrest.some((event) => quarterOf(event) === ordinal);
  const earlier = unrest.some((event) => {
    const quarter = quarterOf(event);
    return (
      quarter < ordinal && ordinal - quarter <= policy.lastingWithinQuarters
    );
  });
  const open = threats.some(
    (threat) =>
      ordinal - quarterOf(threat) <= policy.threatOpenQuarters &&
      !attempted.has(threat.id),
  );
  if (!now || !earlier || open) return next;
  if (
    draw(next, ["threat", stateKey, ordinal]) >=
    chance(excess, policy.threatPerExcess, policy.chanceCap)
  )
    return next;
  const candidates = prominentPeopleIn(next, stateKey);
  if (candidates.length === 0) return next;
  const targetId =
    candidates[
      new SeededRng("pressure-events-v1")
        .fork(JSON.stringify(["target", next.seed, stateKey, ordinal]))
        .integer(0, candidates.length)
    ]!;
  const target = next.people[targetId]!;
  return recordWorldEvent(next, {
    stableKey: `pressure:threat:${stateKey}:${ordinal}`,
    type: POLITICAL_THREAT_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: state.id,
    involvedEntityIds: [targetId],
    participants: [
      { personId: targetId, role: "impact:threatened", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "pressure",
      POLITICAL_THREAT_EVENT,
      `state:${stateKey}`,
      `quarter:${ordinal}`,
    ],
    summary: `${personName(target)} was threatened as unrest continued in ${state.name}.`,
    context: EMPTY_CONTEXT,
  });
}

/**
 * Prominent political people in a state, in office or not: its governor, its
 * members of Congress, and party chapter organizers who live there. Living
 * people only, in id order.
 */
export function prominentPeopleIn(
  world: World,
  stateKey: string,
): readonly EntityId[] {
  const usps = stateKey.slice(3);
  const ids = new Set<EntityId>();
  const governor = currentGovernorOf(world, usps);
  if (governor) ids.add(governor.personId);
  const congress = projectCongress(world);
  for (const chamber of congress ? [congress.house, congress.senate] : [])
    for (const seat of chamber.seats)
      if (seat.stateUsps === usps && seat.occupant.kind === "member")
        ids.add(seat.occupant.member.personId);
  for (const chapter of homePartyChapters(world))
    if (
      chapter.organizerPersonId &&
      homeStateKeyOf(world, chapter.organizerPersonId) === stateKey
    )
      ids.add(chapter.organizerPersonId);
  return [...ids].filter((id) => world.people[id] && alive(world, id)).sort();
}

/** Friction on each international development still open, by matter id. */
export function internationalFriction(
  world: World,
  readings: readonly PressureReading[],
): ReadonlyMap<
  string,
  { friction: number; subject: string; reported: HistoricalEvent }
> {
  const policy = BLANKET_INTERNATIONAL_FRICTION;
  const byMatter = new Map<string, HistoricalEvent[]>();
  for (const event of world.history.events) {
    if (
      !event.type.startsWith("international.development-") ||
      event.occurredAt > world.currentDate
    )
      continue;
    const matter = tagValue(event, "matter:");
    if (!matter) continue;
    const list = byMatter.get(matter) ?? [];
    list.push(event);
    byMatter.set(matter, list);
  }
  // A state with no reading carries no anger, so the average is over every
  // state the world holds.
  const stateCount = Math.max(worldStates(world).length, 1);
  const angerSum = readings.reduce((sum, row) => sum + row.levels.anger, 0);
  const releases = macroReleasesAt(
    world,
    world.currentDate,
    "unemployment-rate",
  ).filter((release) => release.scope === "national" && release.value !== null);
  const latestRate = releases.at(-1)?.value ?? null;

  const result = new Map<
    string,
    { friction: number; subject: string; reported: HistoricalEvent }
  >();
  for (const [matter, events] of byMatter) {
    const reported = events.find(
      (event) => event.type === "international.development-reported",
    );
    if (!reported) continue;
    if (
      events.some((event) => event.type === "international.development-eased")
    )
      continue;
    const subject = DEVELOPMENT_DISPUTES[tagValue(reported, "subject:") ?? ""];
    if (!subject) continue;
    const reports = events.reduce(
      (sum, event) =>
        sum + (policy.importance[tagValue(event, "importance:") ?? ""] ?? 0),
      0,
    );
    const rateThen =
      releases
        .filter((release) => release.releasedAt <= reported.occurredAt)
        .at(-1)?.value ?? null;
    const strain =
      latestRate !== null && rateThen !== null
        ? Math.max(0, latestRate - rateThen) * policy.perUnemploymentPoint
        : 0;
    const anger = (angerSum / stateCount) * policy.domesticAnger;
    result.set(matter, {
      friction: Math.round((reports + strain + anger) * 10000) / 10000,
      subject,
      reported,
    });
  }
  return result;
}

/** Declares a crisis over each open development whose friction runs high. */
export function stepInternationalFriction(
  world: World,
  readings: readonly PressureReading[] = [...latestReadings(world).values()],
): World {
  const policy = BLANKET_INTERNATIONAL_FRICTION;
  const ordinal = world.pressure!.quartersStepped;
  const declared = new Set(
    crisisRecords(world).flatMap((record) =>
      record.kind === "international-crisis" ? [record.stableKey] : [],
    ),
  );
  let next = world;
  const frictions = [...internationalFriction(world, readings)].sort(
    ([a], [b]) => a.localeCompare(b),
  );
  for (const [matter, { friction, subject }] of frictions) {
    const stableKey = `pressure:${matter}`;
    if (declared.has(`crisis:international:${stableKey}`)) continue;
    const excess = friction - policy.line;
    if (excess <= 0) continue;
    if (
      draw(next, ["international", matter, ordinal]) >=
      chance(excess, policy.crisisPerExcess, policy.chanceCap)
    )
      continue;
    next = declareInternationalCrisis(next, {
      stableKey,
      counterpartyLabel: "a foreign government",
      allyLabels: [],
      subject,
      tension: excess >= policy.highTensionExcess ? "high" : "elevated",
      basis: `A reported dispute over ${subject} stayed open while strain at home built.`,
    });
  }
  return next;
}

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;
