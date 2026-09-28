/**
 * LAW MONEY — whether the laws a watched world enacts move money.
 *
 *   npm run law:money -- --seed round-1 --place 3918000 [--days 200] \
 *     [--out test-results/law-money/<file>.json] [--keep <world file>]
 *   npm run law:money -- --seed congress-hermann --place "Hermann, Missouri"
 *
 * The world is opened the way the title screen's "Watch the world" opens one
 * and moved only by the observer clock's Day button (`openWatchedWorld` and
 * `createObserverDayButton` from world-aging). At the end, every enacted law
 * is read through `enactedLawsWithEffects`, the same record the law's page
 * reads, and counted per level of government: laws enacted, laws whose money
 * was committed, dollars paid, tax collected and tax payments. Each law that
 * paid or collected anything is listed by its designation and title.
 *
 * This is a development measurement. It is never part of play.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { lifePlaceSearch } from "../../src/simulation";
import {
  enactedLawsWithEffects,
  type EnactedLawEffects,
} from "../../src/simulation/enacted-law-effects";
import { serializeWorld } from "../../src/simulation/serialization";
import type { World } from "../../src/simulation/types";
import { createObserverDayButton, openWatchedWorld } from "./world-aging";

interface LevelCounts {
  lawsEnacted: number;
  lawsWithMoneyCommitted: number;
  dollarsAuthorized: number;
  dollarsPaid: number;
  taxCollected: number;
  taxPayments: number;
}

interface NamedLaw {
  level: string;
  jurisdiction: string;
  designation: string;
  title: string;
  enactedOn: string;
  dollarsPaid: number;
  taxCollected: number;
  taxPayments: number;
}

function option(name: string, fallback?: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : fallback;
}

function resolvePlaceKey(value: string): string {
  if (/^\d+$/.test(value)) return value;
  const found = lifePlaceSearch(value.split(",")[0]!.trim(), 20).find(
    (place) => place.displayName === value,
  );
  if (!found) throw new Error(`No place named '${value}'.`);
  return found.key;
}

/**
 * Money is read from the public program records the law created, not from the
 * law page's lines: a transit law shows its own clause there, and its
 * appropriation's payments would otherwise go uncounted.
 */
function lawTotals(world: World, law: EnactedLawEffects) {
  const records = world.history.publicProgramRecords ?? [];
  const appropriationIds = new Set<string>();
  let authorized = 0;
  for (const row of records)
    if (row.kind === "appropriation" && row.sourceMeasureId === law.measureId) {
      appropriationIds.add(row.id);
      authorized += row.amount.minorUnits;
    }
  let committed = 0;
  let paid = 0;
  const commitments = new Map<
    string,
    readonly { amount: { minorUnits: number } }[]
  >();
  for (const row of records)
    if (
      row.kind === "commitment" &&
      appropriationIds.has(row.appropriationId)
    ) {
      commitments.set(row.id, row.installments);
      for (const installment of row.installments)
        committed += installment.amount.minorUnits;
    }
  for (const row of records)
    if (row.kind === "installment" && row.status !== "failed")
      paid +=
        commitments.get(row.commitmentId)?.[row.installmentIndex]?.amount
          .minorUnits ?? 0;
  let collected = 0;
  let payments = 0;
  for (const line of law.lines)
    if (line.kind === "tax") {
      collected += line.collectedMinorUnits;
      payments += line.collections;
    }
  return { authorized, committed, paid, collected, payments };
}

const seed = option("seed", "round-1")!;
const placeKey = resolvePlaceKey(option("place", "3918000")!);
const days = Number(option("days", "200"));
const out = option("out");
const keep = option("keep");

const watched = openWatchedWorld(seed, placeKey);
const button = createObserverDayButton(watched.world);
const startedOn = watched.world.currentDate;
const startedAt = Date.now();
let pressed = 0;
while (pressed < days) {
  const press = button.press();
  if (press.status === "stopped") {
    console.error(`Stopped on ${button.world.currentDate}: ${press.problem}`);
    break;
  }
  pressed += 1;
  if (pressed % 25 === 0)
    console.error(
      `day ${pressed} ${button.world.currentDate} ${Math.round((Date.now() - startedAt) / 1000)}s`,
    );
}

const world = button.world;
const perLevel: Record<string, LevelCounts> = {};
const named: NamedLaw[] = [];
// Money a law authorized that paid nothing yet, with when it becomes
// available, so a report can say why rather than guess.
const unpaid: {
  level: string;
  jurisdiction: string;
  designation: string;
  enactedOn: string;
  dollarsAuthorized: number;
  availableFrom: string | null;
  committed: boolean;
}[] = [];
for (const law of enactedLawsWithEffects(world)) {
  const totals = lawTotals(world, law);
  const level = (perLevel[law.level] ??= {
    lawsEnacted: 0,
    lawsWithMoneyCommitted: 0,
    dollarsAuthorized: 0,
    dollarsPaid: 0,
    taxCollected: 0,
    taxPayments: 0,
  });
  level.lawsEnacted += 1;
  if (totals.committed > 0) level.lawsWithMoneyCommitted += 1;
  level.dollarsAuthorized += totals.authorized / 100;
  level.dollarsPaid += totals.paid / 100;
  level.taxCollected += totals.collected / 100;
  level.taxPayments += totals.payments;
  if (totals.authorized > 0 && totals.paid === 0)
    unpaid.push({
      level: law.level,
      jurisdiction:
        world.jurisdictions[
          world.history.legislativeMeasures?.find(
            (measure) => measure.id === law.measureId,
          )?.jurisdictionId ?? ""
        ]?.name ?? "unknown",
      designation: law.designation,
      enactedOn: law.enactedOn,
      dollarsAuthorized: totals.authorized / 100,
      availableFrom:
        (world.history.publicProgramRecords ?? [])
          .filter(
            (record) =>
              record.kind === "appropriation" &&
              record.sourceMeasureId === law.measureId,
          )
          .map((record) =>
            record.kind === "appropriation" ? record.availableFrom : "",
          )
          .sort()[0] ?? null,
      committed: totals.committed > 0,
    });
  if (totals.paid > 0 || totals.collected > 0)
    named.push({
      level: law.level,
      jurisdiction:
        world.jurisdictions[
          world.history.legislativeMeasures?.find(
            (measure) => measure.id === law.measureId,
          )?.jurisdictionId ?? ""
        ]?.name ?? "unknown",
      designation: law.designation,
      title: law.shortTitle,
      enactedOn: law.enactedOn,
      dollarsPaid: totals.paid / 100,
      taxCollected: totals.collected / 100,
      taxPayments: totals.payments,
    });
}

const flowsByBasis: Record<string, number> = {};
for (const flow of world.history.resourceFlows ?? [])
  flowsByBasis[flow.basisReference.kind] =
    (flowsByBasis[flow.basisReference.kind] ?? 0) + 1;

const report = {
  command: `npm run law:money -- --seed ${seed} --place ${placeKey} --days ${days}`,
  place: watched.placeName,
  from: startedOn,
  to: world.currentDate,
  daysPressed: pressed,
  seconds: Math.round((Date.now() - startedAt) / 1000),
  resourceFlowsByBasis: flowsByBasis,
  perLevel,
  lawsThatPaidOrCollected: named,
  lawsWithMoneyNotYetPaid: unpaid,
};
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
}
if (keep) {
  mkdirSync(dirname(keep), { recursive: true });
  writeFileSync(keep, serializeWorld(world));
}
console.log(JSON.stringify(report, null, 2));
