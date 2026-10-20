/**
 * Where a town's bereaved land against the sourced band (developer proof, no
 * effect on play). Reads data/research/health/bereavement-trajectories-bonanno-2002.json
 * for SG-P10-event-severity: after a household member dies, what share of the
 * survivors' moods are back within one town mood spread of their own baseline
 * 18 months on, against the share of bereaved older adults who never showed
 * a lasting rise (resilient plus common grief plus depressed-improved).
 *
 *   node --import tsx scripts/health/bereavement-band.ts [--seed <s>] [--days 600]
 *
 * The place is drawn from all 56 by the seed, which is printed.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const days = Number(option("days", "600"));
const FOLLOW_UP_DAYS = 545;

const band = JSON.parse(
  readFileSync(
    "data/research/health/bereavement-trajectories-bonanno-2002.json",
    "utf8",
  ),
) as { patterns: { key: string; share: number }[] };
const recovered = band.patterns
  .filter((row) =>
    ["resilient", "common-grief", "depressed-improved"].includes(row.key),
  )
  .reduce((sum, row) => sum + row.share, 0);

setBookkeeping(false);
const draw = drawPlace(seed, "bereavement-band");
const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: draw.key,
});

const adults = [...core.people.values()].filter((p) => p.alive);
const mean = adults.reduce((n, p) => n + p.affect.mood, 0) / adults.length;
const spread = Math.sqrt(
  adults.reduce((n, p) => n + (p.affect.mood - mean) ** 2, 0) / adults.length,
);

interface Bereaved {
  readonly id: string;
  readonly day: number;
  readonly moodAtLoss: number;
}
const watching: Bereaved[] = [];
const seen = new Set<string>();
const alive = new Set(adults.map((p) => p.id));
const start = core.date;
let deaths = 0;
const results: { id: string; afterDays: number; gap: number }[] = [];

for (let day = 1; day <= days; day++) {
  advanceCore(core, addDays(makeIsoDate(start), day));
  for (const id of [...alive]) {
    const person = core.people.get(id);
    if (person?.alive) continue;
    alive.delete(id);
    deaths++;
    const home = person ? core.households.get(person.householdId) : undefined;
    for (const memberId of new Set([
      ...(home?.memberIds ?? []),
      ...(person?.familyIds ?? []),
    ])) {
      const member = core.people.get(memberId);
      if (!member?.alive || seen.has(memberId)) continue;
      seen.add(memberId);
      watching.push({ id: memberId, day, moodAtLoss: member.affect.mood });
    }
  }
  for (const row of watching) {
    if (day - row.day !== FOLLOW_UP_DAYS) continue;
    const member = core.people.get(row.id);
    if (member?.alive)
      results.push({
        id: row.id,
        afterDays: FOLLOW_UP_DAYS,
        gap: Math.abs(member.affect.mood - member.affect.moodBaseline),
      });
  }
}

const back = results.filter((row) => row.gap <= spread).length;
console.log(
  `${draw.name} (key ${draw.key}, seed ${seed}): ${days} days, ${deaths} deaths, ${watching.length} survivors watched, ${results.length} reached ${FOLLOW_UP_DAYS} days; town mood spread ${spread.toFixed(3)}`,
);
console.log(
  `back within one spread of baseline: ${back} of ${results.length}${results.length ? ` (${((100 * back) / results.length).toFixed(1)} percent)` : ""}; sourced share who showed no lasting rise: ${(100 * recovered).toFixed(1)} percent (Bonanno 2002, n 205 widowed older adults)`,
);
if (!watching.length)
  console.log(
    "no bereaved full person in this run: the dead's kin are counted people, who carry no mood (see pool item people-bereaved-counted-affect)",
  );
