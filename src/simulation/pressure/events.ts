/**
 * What the pressure layer sets off. Runs once per quarter, right after
 * `stepPressure`, and reads only the readings and the records the world
 * already holds. Nothing here is scheduled for a date.
 *
 * Political violence (ChatGPT C09: keep the threat-or-intent prerequisite,
 * no timer, abstract and non-operational) runs on the incident engine as
 * conditions that last, with no chance of an outcome set anywhere: unrest
 * while a state's anger is over its line, a threat once that unrest lasts,
 * and an attempt when a threat's strain crosses its own line. See
 * `ladder.ts`. An attempt feeds anger and fear back (`anger.ts`).
 *
 * International crises (ChatGPT C08: a development with escalation state
 * feeds the existing declaration route; one persistent crisis per
 * development): each international development still open carries friction,
 * what its reports added plus the country's economic strain and anger since
 * it was reported. Friction over its line gives a chance of an international
 * crisis over that development, through `declareInternationalCrisis`. A
 * development starts at most one crisis. This is still a chance each quarter,
 * and it is the next step to move onto the incident engine.
 *
 * Every number in `BLANKET_INTERNATIONAL_FRICTION` is a placeholder, filed
 * with ChatGPT as `international-crisis-what-escalates-a-dispute`.
 */

import { declareInternationalCrisis } from "../crisis/international";
import { crisisRecords } from "../crisis/records";
import { macroReleasesAt } from "../macro-economy/readers";
import { SeededRng } from "../rng";
import type { HistoricalEvent, World } from "../types";
import type { PressureReading } from "./contract";
import { latestReadings } from "./flows";
import { stepPressureLadder } from "./ladder";
import { worldStates } from "./step";

export {
  BLANKET_POLITICAL_VIOLENCE,
  PRESSURE_ANGER_METRIC_STABLE_KEY,
  PRESSURE_LADDER_INCIDENT_STABLE_KEYS,
  THREAT_ATTEMPTED_PHASE,
  THREAT_INCIDENT_STABLE_KEY,
  THREAT_LAPSED_PHASE,
  UNREST_CALMED_PHASE,
  UNREST_INCIDENT_STABLE_KEY,
  UNREST_LASTING_PHASE,
  ensurePressureLadder,
  prominentPeopleIn,
  threatAttemptLine,
  threatIncidentDefinition,
  threatStrain,
  unrestIncidentDefinition,
} from "./ladder";

/** Tags the ladder's unrest and threat onset events carry. */
export const UNREST_EVENT = "pressure.unrest";
export const POLITICAL_THREAT_EVENT = "pressure.political-threat";

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

/** Steps everything the latest quarter's pressure can set off. */
export function stepPressureEvents(world: World): World {
  const store = world.pressure;
  if (!store || store.quartersStepped === 0) return world;
  let next = world;
  const readings = [...latestReadings(world).values()].sort((a, b) =>
    a.stateKey.localeCompare(b.stateKey),
  );
  next = stepPressureLadder(next, readings);
  return stepInternationalFriction(next, readings);
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
