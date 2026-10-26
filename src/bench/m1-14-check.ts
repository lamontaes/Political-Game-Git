/* global process, console */
// Roadmap M1-14, history before your start, in the place the golden-path
// runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). A new game in the
// played world (`buildBenchWorld`, which runs every module's pre-start pass,
// src/core2/pre-start.ts) must open on its start date with: the player and
// their household's recent life events dated in the years before it; the
// national economy's months before the start as the published figures; laws
// in force showing their dated changes before the start; and every
// government's prior years' budgets. The load time and the world's size are
// measured and printed. Exits nonzero naming each failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-14-check.ts
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { preStartHistory } from "../core2/pre-start";
import { publishedMonth } from "../core2/macro-model";
import { governments } from "../core2/modules/budgets";
import { addDays, makeIsoDate } from "../core2/kernel/dates";

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-14-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) failures.push(message);
};
/** "Recent": the five years before the start (engineering, not calibration). */
const RECENT_YEARS = 5;

setBookkeeping(false);
const heapBefore = process.memoryUsage().heapUsed;
const started = performance.now();
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const loadSeconds = (performance.now() - started) / 1000;
const heapMB = (process.memoryUsage().heapUsed - heapBefore) / 2 ** 20;
const core = w.core;
const api = coreAPI(core);
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;
const start = gameStartDate();
const history = preStartHistory(core);

// 1. The game opens on its start date, and nothing in the history is on or after it.
check(core.date === start, `${where}: opened on ${core.date}, not ${start}`);
check(
  history.every((row) => row.date < start),
  `${where}: a history record is dated on or after the start`,
);

// 2. People: the player and their household have life events dated in the
// years before the start.
const recentFrom = addDays(
  makeIsoDate(start),
  -Math.round(365.25 * RECENT_YEARS),
);
const me = w.playerId!;
const household = core.households.get(core.people.get(me)!.householdId)!;
const recentFor = (personId: string) =>
  preStartHistory(core, { personId }).filter(
    (row) => row.date >= recentFrom && row.kind.startsWith("person."),
  );
const people = household.memberIds.map((id) => ({
  id,
  recent: recentFor(id),
}));
for (const p of people)
  check(
    p.recent.length > 0,
    `${where}: ${p.id} has no life event dated in the ${RECENT_YEARS} years before the start`,
  );

// 3. The economy's recent path: every record of the twelve months before the
// start (the pass steps coarsely, src/core2/pre-start.ts coarseSteps) is the
// published national figures, and there are at least three.
const yearBefore = addDays(makeIsoDate(start), -365);
let months = 0;
for (const row of preStartHistory(core, { kind: "economy.conditions" })) {
  if (row.date < yearBefore) continue;
  const month = row.date.slice(0, 7);
  const published = publishedMonth(month);
  const recorded = row.facts as Record<string, number>;
  months += 1;
  check(published, `${where}: ${row.id} has no published month behind it`);
  if (published)
    for (const key of [
      "unemploymentPct",
      "priceIndex",
      "payrollJobsThousands",
    ] as const)
      check(
        published[key] === undefined || recorded[key] === published[key],
        `${where}: ${row.id} ${key} recorded ${recorded[key]}, published ${published[key]}`,
      );
}
check(
  months >= 3,
  `${where}: only ${months} economy records in the year before the start`,
);

// 4. Laws in force show their dated changes before the start.
const lawPhases = preStartHistory(core, { kind: "law.phase" });
const levels = new Set(lawPhases.map((row) => String(row.facts.level)));
check(
  lawPhases.length > 0,
  `${where}: no law shows a dated change before the start`,
);
check(
  levels.has("federal") && levels.has("state"),
  `${where}: dated law changes only at ${[...levels].join(", ") || "no level"}`,
);

// 5. Every government shows its prior years' budgets.
const adopted = preStartHistory(core, { kind: "budget.adopted" });
const yearsBy = new Map<string, Set<number>>();
for (const row of adopted) {
  const id = String(row.facts.governmentId);
  yearsBy.set(
    id,
    (yearsBy.get(id) ?? new Set()).add(Number(row.facts.fiscalYear)),
  );
}
for (const g of governments(api)) {
  const years = [...(yearsBy.get(g.id) ?? [])].sort();
  check(
    years.length >= 2,
    `${where}: ${g.name} (${g.id}) shows ${years.length ? `only fiscal ${years.join(", ")}` : "no budget"} before the start, not its prior years'`,
  );
}

console.log(
  JSON.stringify(
    {
      place: where,
      opened: core.date,
      loadSeconds: Number(loadSeconds.toFixed(1)),
      heapGrowthMB: Math.round(heapMB),
      historyRecords: history.length,
      household: people.map((p) => ({
        id: p.id,
        recent: p.recent.length,
        latest: p.recent.at(-1)?.id ?? null,
      })),
      economyMonths: months,
      lawPhases: lawPhases.length,
      lawLevels: [...levels],
      budgets: Object.fromEntries(
        [...yearsBy].map(([id, years]) => [id, [...years].sort()]),
      ),
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.error(`M1-14 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M1-14 passed: ${where}`);
