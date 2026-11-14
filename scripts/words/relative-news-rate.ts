/**
 * How often a relative's death, serious illness or prison term reaches the
 * player's house in a played world, and what became of each (development
 * tooling): `node --import tsx scripts/words/relative-news-rate.ts --seed <seed> --draws 3 --days 730`.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import type { PersonId } from "../../src/core2/types";
import { subjectsBetween } from "../../src/director/conversation";
import { familyFactsOf } from "../../src/core2/modules/people";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";

const option = (n: string, f: string) => {
  const at = process.argv.indexOf(`--${n}`);
  return at >= 0 ? (process.argv[at + 1] ?? f) : f;
};
const seed = option("seed", "rate");
const days = Number(option("days", "730"));
const draws = Number(option("draws", "3"));
const LABELS = new Set([
  "feeling:event:life.death",
  "feeling:event:health.serious-illness",
  "feeling:event:justice.imprisoned",
]);
setBookkeeping(false);
for (let d = 0; d < draws; d += 1) {
  const place = drawPlace(`${seed}:${d}`, "relative-news");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  director.watch(core, playerId);
  const home = core.households.get(
    core.people.get(playerId)!.householdId as never,
  )!;
  for (const id of home.memberIds) director.watch(core, id);
  const kinOf = (id: PersonId) => [
    ...familyFactsOf(core.people.get(id)!).keys(),
  ];
  const kin = new Set<PersonId>();
  for (const id of home.memberIds) for (const k of kinOf(id)) kin.add(k);
  const outside = [...kin].filter((k) => !home.memberIds.includes(k));
  const alive0 = new Map(outside.map((k) => [k, core.people.get(k)?.alive]));
  const stats = {
    deaths: 0,
    moments: new Map<string, number>(),
    raised: new Set<string>(),
    momentsHeld: 0,
  };
  const seen = new Set<string>();
  for (let day = 0; day < days; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const k of outside)
      if (alive0.get(k) && !core.people.get(k)?.alive) {
        alive0.set(k, false);
        stats.deaths += 1;
      }
    const book = director.ledger.people.get(playerId);
    for (const m of book?.moments ?? [])
      if (LABELS.has(m.label) && !seen.has(m.id)) {
        seen.add(m.id);
        stats.moments.set(m.label, (stats.moments.get(m.label) ?? 0) + 1);
      }
    for (const id of home.memberIds) {
      const p = core.people.get(id);
      if (!p?.alive || id === playerId) continue;
      for (const s of subjectsBetween(core, id, playerId, director))
        if (/^(death|illness|prison)-news$/.test(s.kind))
          stats.raised.add(s.id);
    }
  }
  const KINDS = ["life.death", "health.serious-illness", "justice.imprisoned"];
  const tally = (ids: ReadonlySet<PersonId> | null) => {
    const out: Record<string, number> = {};
    for (const rec of core.durableLog.values())
      if (
        KINDS.includes(rec.kind) &&
        (!ids || rec.personIds.some((id) => ids.has(id)))
      )
        out[rec.kind] = (out[rec.kind] ?? 0) + 1;
    return out;
  };
  const year = (id: PersonId) =>
    ageOnDate(
      makeIsoDate(core.people.get(id)!.birthDate),
      makeIsoDate(core.date),
    );
  console.log(
    `${place.name} (${seed}:${d}, ${place.seed.slice(0, 8)}), ${days} days: house ${home.memberIds.length} people; relatives of the house elsewhere ${outside.length}, ages ${outside
      .map(year)
      .sort((a, b) => a - b)
      .join(
        ",",
      )}; events among those relatives ${JSON.stringify(tally(new Set(outside)))}; events whole world ${JSON.stringify(tally(null))}, people in world ${core.people.size}; moments in the player's book ${JSON.stringify([...stats.moments])}; news subjects the house could tell ${stats.raised.size}`,
  );
}
