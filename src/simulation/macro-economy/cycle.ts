/**
 * The observer's word for what the national economy did (Build 19).
 *
 * "Recession" is a description, like "machine" or "company town": nothing in
 * the game decides that one starts. When output has shrunk for three months
 * running after an expansion, this records that a recession began, and what
 * drove it, read from the months' recorded drivers and the world's records:
 * how far new lending fell, how the policy rate had moved and who moved it,
 * what spending lost with lost jobs, which recorded shocks were acting, and
 * how much was unexplained chance. When output has grown for three months
 * running, it records that the recession ended.
 *
 * Every counted cause is cited: the rate decisions and shock origins by
 * their event ids (`cause-event:` tags) on the canonical onset event.
 *
 * The three-month reading is a GAME DEFINITION for the record, close to how
 * the World Baseline counts recessions; it is not the National Bureau of
 * Economic Research's dating method.
 */

import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { MACRO_CREDIT_POLICY, type MacroGrowthDrivers } from "./credit";
import { CENTRAL_BANK_RATE_EVENT } from "./central-bank";
import { monthKeyOf, previousMonthKey } from "./store";
import type { MacroMonthRecord } from "./types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "./types";

export const RECESSION_BEGAN_EVENT = "economy.recession-began";
export const RECESSION_ENDED_EVENT = "economy.recession-ended";
export const CYCLE_RECORD_VERSION = "economy-cycle-record-v1";

/** Months of shrinking (or growing) output that mark a turn. */
export const CYCLE_TURN_MONTHS = 3;
/** Months of drivers read back from the turn to explain it. */
export const CYCLE_CAUSE_WINDOW_MONTHS = 6;
/** Months of rate decisions read back to cite. */
export const CYCLE_RATE_WINDOW_MONTHS = 24;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function label(monthKey: string): string {
  return `${MONTHS[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;
}

function one(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

type DriverKey = "creditPp" | "ratePp" | "demandPp" | "shocksPp" | "chancePp";

const CAUSES: readonly { key: DriverKey; tag: string }[] = [
  { key: "creditPp", tag: "credit" },
  { key: "ratePp", tag: "policy-rate" },
  { key: "demandPp", tag: "lost-jobs" },
  { key: "shocksPp", tag: "recorded-shocks" },
  { key: "chancePp", tag: "chance" },
];

function nationalMonths(world: World): readonly MacroMonthRecord[] {
  return world.macroEconomy!.months.filter((row) => row.scope === "national");
}

/** Sums each driver over the months that led into the turn. */
function drivenBy(months: readonly MacroMonthRecord[]) {
  const totals: Record<DriverKey, number> = {
    creditPp: 0,
    ratePp: 0,
    demandPp: 0,
    shocksPp: 0,
    chancePp: 0,
  };
  for (const month of months) {
    const drivers = month.drivers as MacroGrowthDrivers | undefined;
    if (!drivers) continue;
    for (const { key } of CAUSES) totals[key] += drivers[key];
  }
  return totals;
}

export function recordBusinessCycle(world: World, monthKey: string): World {
  const store = world.macroEconomy;
  if (!store) return world;
  const months = nationalMonths(world);
  const turn = months.slice(-CYCLE_TURN_MONTHS);
  if (turn.length < CYCLE_TURN_MONTHS || turn.some((row) => !row.drivers))
    return world;
  const cycle = store.cycle ?? {
    phase: "expansion" as const,
    sinceMonth: monthKeyOf(months[0]!.periodStart),
    eventId: null,
  };
  const first = monthKeyOf(turn[0]!.periodStart);
  if (cycle.phase === "expansion" && turn.every((row) => row.growthPct < 0))
    return recordOnset(world, monthKey, first, months);
  if (cycle.phase === "recession" && turn.every((row) => row.growthPct >= 0)) {
    const began = cycle.sinceMonth;
    const trough = months
      .filter((row) => monthKeyOf(row.periodStart) >= began)
      .reduce((max, row) => Math.max(max, row.unemploymentPct), 0);
    let next = recordWorldEvent(world, {
      stableKey: `${CYCLE_RECORD_VERSION}:ended:${first}`,
      type: RECESSION_ENDED_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CYCLE_RECORD_VERSION,
        MACRO_ECONOMY_CONTRACT_VERSION,
        `began:${began}`,
        `ended:${first}`,
        ...(cycle.eventId ? [`cause-event:${cycle.eventId}`] : []),
      ],
      summary: `The economy has grown for three months running: the recession that began in ${label(began)} ended in ${label(first)}. Unemployment peaked at ${one(trough)} percent.`,
      context: CONTEXT,
    });
    const eventId = next.history.events.at(-1)!.id;
    next = {
      ...next,
      macroEconomy: {
        ...next.macroEconomy!,
        cycle: { phase: "expansion", sinceMonth: first, eventId },
      },
    };
    return next;
  }
  return world;
}

function recordOnset(
  world: World,
  monthKey: string,
  first: string,
  months: readonly MacroMonthRecord[],
): World {
  const store = world.macroEconomy!;
  const window = months.slice(-CYCLE_CAUSE_WINDOW_MONTHS);
  const totals = drivenBy(window);
  const pulledDown = CAUSES.filter(({ key }) => totals[key] < 0);
  const downward = pulledDown.reduce((sum, { key }) => sum - totals[key], 0);
  // A cause counts when it did at least a sixth of the pulling down.
  const counted = pulledDown
    .filter(({ key }) => downward > 0 && -totals[key] >= downward / 6)
    .sort((a, b) => totals[a.key] - totals[b.key]);

  const at = months.at(-1)!;
  const credit = at.credit!;
  const windowStart = monthKeyOf(window[0]!.periodStart);
  const rateSince = previousMonthKey(monthKey, CYCLE_RATE_WINDOW_MONTHS);
  const rateEvents = world.history.events.filter(
    (event) =>
      event.type === CENTRAL_BANK_RATE_EVENT &&
      event.tags.some(
        (tag) => tag.startsWith("rate-change:") && Number(tag.slice(12)) > 0,
      ) &&
      (event.tags.find((tag) => tag.startsWith("month:"))?.slice(6) ?? "") >=
        rateSince,
  );
  const shockOrigins = new Set<EntityId>();
  for (const month of window)
    for (const key of month.shockKeys) {
      const shock = store.shocks.find((row) => row.key === key);
      if (shock && shock.signedMagnitude.growthPp < 0)
        shockOrigins.add(shock.originEventId);
    }
  const failures = world.history.events.filter(
    (event) =>
      event.type === "economy.bank-failed" &&
      event.occurredAt >= `${windowStart}-01`,
  );
  const cited: EntityId[] = [
    ...rateEvents.map((event) => event.id),
    ...[...shockOrigins].sort(),
    ...failures.map((event) => event.id),
  ];

  const sentences: string[] = [
    `Output has shrunk for three months running: a recession began in ${label(first)}.`,
  ];
  const line = MACRO_CREDIT_POLICY.burdenLine * 100;
  for (const { key } of counted) {
    const pp = one(-totals[key]);
    if (key === "creditPp")
      sentences.push(
        `New lending fell behind (${pp} points off growth over six months): borrowers owed interest equal to ${one(credit.burden * 100)} percent of a year's output against about ${one(line)} they can carry, lenders were writing off ${one(credit.chargeOffPct)} percent of loans a year, and banks had tightened.`,
      );
    if (key === "ratePp") {
      const mid = (at.policyRate.lowerPct + at.policyRate.upperPct) / 2;
      sentences.push(
        `The policy rate held spending back (${pp} points): the central bank's board had raised it ${rateEvents.length} time${rateEvents.length === 1 ? "" : "s"} in two years, to about ${one(mid)} percent.`,
      );
    }
    if (key === "demandPp")
      sentences.push(
        `People who lost work spent less (${pp} points), and unemployment reached ${one(at.unemploymentPct)} percent.`,
      );
    if (key === "shocksPp")
      sentences.push(
        `Recorded shocks cost ${pp} points (${shockOrigins.size} of them).`,
      );
    if (key === "chancePp")
      sentences.push(`Unexplained month-to-month surprises cost ${pp} points.`);
  }
  if (failures.length)
    sentences.push(
      `${failures.length} bank${failures.length === 1 ? "" : "s"} failed in these months.`,
    );

  const next = recordWorldEvent(world, {
    stableKey: `${CYCLE_RECORD_VERSION}:began:${first}`,
    type: RECESSION_BEGAN_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CYCLE_RECORD_VERSION,
      MACRO_ECONOMY_CONTRACT_VERSION,
      `began:${first}`,
      ...counted.map(({ tag }) => `cause:${tag}`),
      ...CAUSES.map(
        ({ key, tag }) =>
          `driver:${tag}:${Math.round(totals[key] * 1000) / 1000}`,
      ),
      ...cited.map((id) => `cause-event:${id}`),
    ],
    summary: sentences.join(" "),
    context: CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  return {
    ...next,
    macroEconomy: {
      ...next.macroEconomy!,
      cycle: { phase: "recession", sinceMonth: first, eventId },
    },
  };
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;
