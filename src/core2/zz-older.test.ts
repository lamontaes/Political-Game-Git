import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { reachOf } from "./counted-reach";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

it("older workers by tier", { timeout: 3_000_000 }, () => {
  const { core } = buildBenchWorld("6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248", gameStartDate(), { twoLevel: true, placeKey: "3513450" });
  const town = lawChain(coreAPI(core)).townPlaceId;
  console.log("OLDER town", town, core.peopleByPlace.get(town as never)?.size);
  const report = (label: string) => {
    for (const [from, below] of [[62, 65], [65, 70], [62, 67]] as const) {
      const all = reachOf(core, town as never, { ageFrom: from, ageBelow: below });
      const wk = reachOf(core, town as never, { ageFrom: from, ageBelow: below, employed: true });
      console.log(`OLDER ${label} ${from}-${below}: full ${wk.full.people}/${all.full.people}, counted ${wk.counted.people}/${all.counted.people}`);
    }
  };
  report("opening");
  const openingFull = new Set(core.people.keys());
  const ageOf = (b: string) => { const d = core.date; return Number(d.slice(0,4)) - Number(b.slice(0,4)) - (d.slice(5) < b.slice(5) ? 1 : 0); };
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  report("one year");
  let newcomers = 0, newWorking = 0, oldTimers = 0, oldWorking = 0;
  for (const person of core.people.values()) {
    if (!person.alive || person.placeId !== town && false) continue;
    const a = ageOf(person.birthDate);
    if (a < 62 || a >= 67) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    const working = !!job && job.endsAt === undefined;
    if (openingFull.has(person.id)) { oldTimers++; if (working) oldWorking++; }
    else { newcomers++; if (working) newWorking++; }
  }
  console.log(`OLDER newcomers ${newWorking}/${newcomers}; there at opening ${oldWorking}/${oldTimers}`);
});
