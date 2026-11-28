/**
 * The out-of-work stock in a played year (Economy, Nov 27; spec: docs/coordination/refactor/out-of-work-2026-11-27.md).
 *   node --import tsx scripts/refactor/oow-measure.ts [--seed oo1] [--place <key>] [--days 2,182,365]
 * Builds the played world at a place drawn by the seed (all 56) or named by key, advances it, and at each named day
 * prints two reads of the same records:
 *   - the spec's share: seekers over seekers plus the employees on the town's businesses' books;
 *   - the labor-force rate: seekers over seekers plus everyone at work (the books' staff, the full people with a job,
 *     counted workers on a town wage flow and the workers their households place elsewhere);
 * with the seekers by reason and the working-age population. Read-only development tooling.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  addDays,
  daysBetweenText,
  makeIsoDate,
} from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { lookingForWork } from "../../src/core2/jobs-reads";
import { staffCount } from "../../src/core2/modules/jobs";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "oo1");
const drawn = drawPlace(seed, "oow");
const placeKey = option("place", drawn.key);
const days = option("days", "2,182,365").split(",").map(Number);
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const name = corePlaceByKey(placeKey)?.displayName ?? placeKey;
const start = makeIsoDate(world.core.date);
const api = coreAPI(world.core, "jobs");
const [young, old] = [18, 65];

function read(day: number) {
  const c = world.core;
  const seekers = lookingForWork(api);
  const byReason = new Map<string, number>();
  for (const s of seekers)
    byReason.set(s.reasonKey, (byReason.get(s.reasonKey) ?? 0) + 1);
  let booked = 0;
  for (const [id, book] of c.finance.businesses)
    if (!book.closedAt) booked += staffCount(api, id);
  const years = (born: string) => daysBetweenText(born, c.date) / 365.25;
  let fullWA = 0,
    fullJob = 0;
  for (const person of c.people.values()) {
    if (!person.alive) continue;
    const a = years(person.birthDate);
    if (a >= young && a < old) {
      fullWA += 1;
      if (person.jobId) fullJob += 1;
    }
  }
  let countedWA = 0,
    elsewhere = 0,
    countedAtWork = 0;
  const rt = residentsRuntime(c);
  if (rt) {
    const working = new Set<string>();
    for (const [jobId, flow] of rt.wageFlowByJob) {
      const job = rt.jobs.get(jobId);
      if (job && !job.endsAt && !flow.endedAt) working.add(job.personId);
    }
    for (const h of rt.store.liveHouseholds()) {
      elsewhere += h.unplacedWorkers;
      for (const m of rt.store.countedMembers(h)) {
        const a = years(rt.store.born[m]!);
        if (a >= young && a < old) {
          countedWA += 1;
          if (working.has(rt.store.ids[m]!)) countedAtWork += 1;
        }
      }
    }
  }
  const atWork = fullJob + countedAtWork + elsewhere;
  const specShare = seekers.length / Math.max(1, seekers.length + booked);
  const rate = seekers.length / Math.max(1, seekers.length + atWork);
  console.log(
    `${name} (${placeKey}, seed ${seed}) day ${day}: spec share ${(specShare * 100).toFixed(1)}% (${seekers.length} seeking, ${booked} on the books); labor-force rate ${(rate * 100).toFixed(1)}% (${atWork.toFixed(0)} at work of ${fullWA + countedWA} aged 18 to 64: ${fullJob} full, ${countedAtWork} counted on town wages, ${elsewhere.toFixed(0)} placed elsewhere); ` +
      [...byReason].map(([k, v]) => `${k} ${v}`).join(", "),
  );
}
for (const day of days) {
  advanceCore(world.core, addDays(start, day - 1));
  read(day);
}
