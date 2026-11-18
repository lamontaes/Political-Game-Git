/** Shared by the counted-moves balance checks: the hosted file and the Washington, D.C. heavy file. */
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime, townPlaceOf } from "./modules/residents";
import type { CoreState } from "./types";

/** Everyone in the town: the counted households times their weight, and the full people. */
export function townPeople(core: CoreState): number {
  const store = residentsRuntime(core)!.store;
  let n = 0;
  for (const h of store.liveHouseholds()) n += store.weightedCount(h);
  const town = townPlaceOf(core);
  for (const p of core.people.values())
    if (p.alive && p.placeId === town) n += 1;
  return n;
}

export function yearsOf(worldSeed: string, key: string, years: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const changes: { pct: number; line: string }[] = [];
  let before = townPeople(core);
  for (let year = 1; year <= years; year++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const after = townPeople(core);
    changes.push({
      pct: (100 * (after - before)) / before,
      line: `year ${year}: ${Math.round(before)} to ${Math.round(after)}`,
    });
    before = after;
  }
  return { core, changes };
}
