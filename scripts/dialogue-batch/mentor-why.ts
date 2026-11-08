/**
 * Proves the mentorship record and its advice scene in a played world (Lives,
 * Nov 8, 2026): pass 1 counts `work.mentorship-formed` and names the people;
 * pass 2 replays the same world watching the new hires and prints what the
 * director staged for them. Development tooling.
 *   node --import tsx scripts/dialogue-batch/mentor-why.ts --seed <s> [--years 2]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { PersonId } from "../../src/core2/types";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const seed = arg("seed", "mentor");
const years = Number(arg("years", "2"));
const place = drawPlace(seed, "mentor");
setBookkeeping(false);
const opts = { twoLevel: true, placeKey: place.key };
const first = buildBenchWorld(place.seed, OPENING_DATE, opts);
const pairs: { id: string; date: string; a: PersonId; b: PersonId }[] = [];
registerModule(first.core, {
  id: "mentor:watch",
  eventKinds: ["work.mentorship-formed"],
  onEvent: (_a, e) =>
    void pairs.push({
      id: e.id,
      date: e.date,
      a: e.personIds[0]!,
      b: e.personIds[1]!,
    }),
});
advanceCore(first.core, addDays(makeIsoDate(first.core.date), years * 365));
console.log(
  `${place.name} (${place.key}), seed ${place.seed}: ${pairs.length} mentorships`,
);
const { core, director } = buildBenchWorld(place.seed, OPENING_DATE, opts);
const hires = [...new Set(pairs.map((p) => p.a))].filter((id) =>
  core.people.has(id),
);
for (const id of hires) {
  core.focusPersonIds.add(id);
  director.watch(core, id);
}
const tally = new Map<string, number>();
const seen = new Map<PersonId, number>();
for (let d = 0; d < years * 365; d += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const id of hires) {
    const book = director.ledger.people.get(id);
    if (!book) continue;
    for (const e of book.schedule.slice(seen.get(id) ?? 0)) {
      const m = book.momentsById.get(e.momentId)!;
      if (m.label.includes("mentorship"))
        tally.set(
          `${e.outcome} ${e.bindings.map((b) => b.typeKey)} ${e.coverage?.reason ?? ""}`,
          (tally.get(
            `${e.outcome} ${e.bindings.map((b) => b.typeKey)} ${e.coverage?.reason ?? ""}`,
          ) ?? 0) + 1,
        );
    }
    seen.set(id, book.schedule.length);
  }
}
for (const p of pairs.slice(0, 3)) console.log(p.id);
console.log([...tally].map(([k, v]) => `${v} x ${k}`).join("\n"));
