// How often a law's effect reaches a person in a played year, in three drawn places: the law.effect-learned records by emitter, and how many reach the player's own household.
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const seed = process.env.SEED ?? randomBytes(8).toString("hex");
for (let n = 0; n < 3; n += 1) {
  const place = drawPlace(`${seed}:${n}`, "law-reached-count");
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
  const me = core.people.get(playerId as never) as { householdId?: string } | undefined;
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const byEmitter = new Map<string, number>();
  let household = 0, total = 0;
  const months = new Map<string, number>();
  for (const rec of core.durableLog.values() as Iterable<{ kind: string; id: string; date: string; personIds?: string[]; facts?: Record<string, string> }>) {
    if (rec.kind !== "law.effect-learned") continue;
    total += 1;
    const f = rec.facts ?? {};
    const emitter = f.movedMinor ? "price" : f.landedId ? "benefit" : f.savedMinor ? "rent" : f.amountMinor ? "estate" : "other";
    byEmitter.set(emitter, (byEmitter.get(emitter) ?? 0) + 1);
    months.set(rec.date.slice(0, 7), (months.get(rec.date.slice(0, 7)) ?? 0) + 1);
    for (const pid of rec.personIds ?? []) {
      const p = core.people.get(pid as never) as { householdId?: string } | undefined;
      if (p && me && p.householdId === me.householdId) household += 1;
    }
  }
  console.log(`${place.name} (${place.key}), seed ${seed}:${n}: ${total} learned effects in the year, ${household} in the player's household, by emitter ${JSON.stringify([...byEmitter])}, by month ${JSON.stringify([...months].sort())}`);
}
