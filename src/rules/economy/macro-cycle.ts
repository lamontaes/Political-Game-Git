/** Complete retained business-cycle classification, driver/cause selection and event DTO closure. Canonical event transport supplies only its resulting ID. */
import type { World, EntityId } from "../../simulation/types";
import type { recordWorldEvent } from "../../simulation/world";
import type { MacroMonthRecord } from "../../simulation/macro-economy/types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "../../simulation/macro-economy/types";
import { MACRO_CREDIT_POLICY, type MacroGrowthDrivers } from "./macro-credit";
import { CENTRAL_BANK_RATE_EVENT } from "./central-bank";
import { monthKeyOf, previousMonthKey } from "./macro-calendar";
export interface CycleFacts {
  readonly id: EntityId;
  readonly currentDate: World["currentDate"];
  readonly macroEconomy: World["macroEconomy"];
  readonly history: Pick<World["history"], "events">;
}
export type CycleEventRequest = Parameters<typeof recordWorldEvent>[1];
export type CycleState = NonNullable<
  NonNullable<World["macroEconomy"]>["cycle"]
>;
// STOPGAP: economy.macro-cycle-native-window
export const RECESSION_BEGAN_EVENT = "economy.recession-began";
export const RECESSION_ENDED_EVENT = "economy.recession-ended";
export const CYCLE_RECORD_VERSION = "economy-cycle-record-v1";
export const CYCLE_TURN_MONTHS = 3;
export const CYCLE_CAUSE_WINDOW_MONTHS = 6;
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
const CAUSES: readonly {
  key: DriverKey;
  tag: string;
}[] = [
  { key: "creditPp", tag: "credit" },
  { key: "ratePp", tag: "policy-rate" },
  { key: "demandPp", tag: "lost-jobs" },
  { key: "shocksPp", tag: "recorded-shocks" },
  { key: "chancePp", tag: "chance" },
];
function nationalMonths(facts: CycleFacts): readonly MacroMonthRecord[] {
  return facts.macroEconomy!.months.filter((row) => row.scope === "national");
}
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
export function* recordBusinessCycle(
  facts: CycleFacts,
  monthKey: string,
): Generator<CycleEventRequest, CycleState | null, EntityId> {
  const store = facts.macroEconomy;
  if (!store) return null;
  const months = nationalMonths(facts);
  const turn = months.slice(-CYCLE_TURN_MONTHS);
  if (turn.length < CYCLE_TURN_MONTHS || turn.some((row) => !row.drivers))
    return null;
  const cycle = store.cycle ?? {
    phase: "expansion" as const,
    sinceMonth: monthKeyOf(months[0]!.periodStart),
    eventId: null,
  };
  const first = monthKeyOf(turn[0]!.periodStart);
  if (cycle.phase === "expansion" && turn.every((row) => row.growthPct < 0))
    return yield* recordOnset(facts, monthKey, first, months);
  if (cycle.phase === "recession" && turn.every((row) => row.growthPct >= 0)) {
    const began = cycle.sinceMonth;
    const trough = months
      .filter((row) => monthKeyOf(row.periodStart) >= began)
      .reduce((max, row) => Math.max(max, row.unemploymentPct), 0);
    const eventId = yield {
      stableKey: `${CYCLE_RECORD_VERSION}:ended:${first}`,
      type: RECESSION_ENDED_EVENT,
      occurredAt: facts.currentDate,
      recordedAt: facts.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [facts.id],
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
    };
    return { phase: "expansion", sinceMonth: first, eventId };
  }
  return null;
}
function* recordOnset(
  facts: CycleFacts,
  monthKey: string,
  first: string,
  months: readonly MacroMonthRecord[],
): Generator<CycleEventRequest, CycleState, EntityId> {
  const store = facts.macroEconomy!;
  const window = months.slice(-CYCLE_CAUSE_WINDOW_MONTHS);
  const totals = drivenBy(window);
  const pulledDown = CAUSES.filter(({ key }) => totals[key] < 0);
  const downward = pulledDown.reduce((sum, { key }) => sum - totals[key], 0);
  const counted = pulledDown
    .filter(({ key }) => downward > 0 && -totals[key] >= downward / 6)
    .sort((a, b) => totals[a.key] - totals[b.key]);
  const at = months.at(-1)!;
  const credit = at.credit!;
  const windowStart = monthKeyOf(window[0]!.periodStart);
  const rateSince = previousMonthKey(monthKey, CYCLE_RATE_WINDOW_MONTHS);
  const rateEvents = facts.history.events.filter(
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
  const failures = facts.history.events.filter(
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
  const eventId = yield {
    stableKey: `${CYCLE_RECORD_VERSION}:began:${first}`,
    type: RECESSION_BEGAN_EVENT,
    occurredAt: facts.currentDate,
    recordedAt: facts.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [facts.id],
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
  };
  return { phase: "recession", sinceMonth: first, eventId };
}
const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;
