/**
 * The bereavement band: of the people a death moved (the witnesses of a
 * `life.death` event, counted kin who were filled in later included), the
 * share who stand within one spread of their own mood baseline 18 months
 * after it. The sourced band is about two thirds (66.8 percent, Bonanno 2002,
 * resilient trajectory). The share is reported and never forced: no engine
 * reads it.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/health/bereavement-band.ts [--seed s] [--place key] [--months 28]
 *
 * One played world (buildBenchWorld, every module); the place is drawn from
 * all 56 by the seed unless --place names a key. Prints the place, the seed,
 * how many bereaved people were old enough to read, and the share inside the
 * spread, with each person's record id.
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { affectAt } from "../../src/core2/emotion";
import { gameStartDate } from "../../src/core2/game-start";
import {
  addDays,
  daysBetween,
  makeIsoDate,
} from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const months = Number(option("months", "28"));
const drawn = drawPlace(seed, "bereavement-band");
const placeKey = option("place", drawn.key);
const BAND = 0.668;
const RESILIENCE_DAYS = 548;

setBookkeeping(false);
const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const seen = new Map<string, { date: string; eventId: string }>();
for (let m = 0; m < months; m += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  for (const row of core.durableLog.values())
    if (row.kind.startsWith("life.death"))
      for (const id of row.witnessIds ?? [])
        if (core.people.has(id) && !seen.has(`${id}|${row.id}`))
          seen.set(`${id}|${row.id}`, { date: row.date, eventId: row.id });
}
const people = [...core.people.values()].filter((p) => p.alive);
// Every baseline is the same in this model, so the spread is the spread of
// people's mood today across the town's living full people.
const today = makeIsoDate(core.date);
const moods = people.map((p) => affectAt(p.affect, today).mood);
const mean = moods.reduce((a, b) => a + b, 0) / Math.max(1, moods.length);
const spread = Math.sqrt(
  moods.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, moods.length),
);
let readable = 0,
  inside = 0;
const lines: string[] = [];
for (const [key, row] of seen) {
  const id = key.split("|")[0]!;
  const person = core.people.get(id);
  if (!person?.alive) continue;
  const age = daysBetween(makeIsoDate(row.date), makeIsoDate(core.date));
  if (age < RESILIENCE_DAYS) continue;
  readable += 1;
  const mood = affectAt(person.affect, today).mood;
  const near = Math.abs(mood - person.affect.moodBaseline) <= spread;
  if (near) inside += 1;
  lines.push(`${id} ${row.eventId} ${near ? "inside" : "outside"}`);
}
console.log(
  `${drawn.name} (key ${placeKey}, seed ${seed}): ${seen.size} bereaved witnesses, ${readable} read at 18 months, spread ${spread.toFixed(3)}`,
);
console.log(
  readable
    ? `inside the spread: ${inside}/${readable} = ${((inside / readable) * 100).toFixed(1)}% against ${(BAND * 100).toFixed(1)}% sourced`
    : "nobody was old enough to read in this world",
);
for (const line of lines.slice(0, 20)) console.log(line);
