/**
 * Pins family 29 proof: moving comes from the simulation. Twin worlds at
 * three drawn places (a seed nobody chose): world B lays off every worker of
 * the town's largest employer in month 1 through the jobs engine's own call
 * that dev mode's layoff control uses (`layOffWorker`), world A is left
 * alone; each plays one year. Per place and world: people leaving the town
 * per 1,000, the share of leavers staying in their state, people arriving
 * from abroad, and the region's unemployment against its state's at the end.
 * Also prints the national in-state share the fitted near-home strength
 * gives on the tier's own draws.
 *
 * Run: node --import tsx scripts/core2-year/pins-29-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  countedMoves,
  placeLeavingConditions,
  runtimeOf,
  stateOfCountedPlace,
} from "../../src/core2/modules/counted-moves";
import { currentJobs, layOffWorker } from "../../src/core2/modules/jobs";
import { departuresSeen, watchDepartures } from "../../src/core2/modules/moves";
import {
  countedParameter,
  residentsRuntime,
  townPlaceOf,
} from "../../src/core2/modules/residents";
import { placeStateKey } from "../../src/core2/place-map";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { drawPlace } from "./place";

const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const out = (line: string) => process.stdout.write(`${line}\n`);

/** Everyone living in the counted places and the town: counted households by weight, full people. */
function peopleOf(core: CoreState, places: ReadonlySet<string>): number {
  const store = residentsRuntime(core)!.store;
  let n = 0;
  for (const h of store.liveHouseholds())
    if (places.has(h.placeId)) n += store.weightedCount(h);
  for (const p of core.people.values())
    if (p.alive && p.tier !== "husk" && places.has(p.placeId)) n += 1;
  return n;
}

/** The town's largest employer by staff (full and counted), and its jobs. */
function largestEmployer(core: CoreState) {
  const api = coreAPI(core);
  const town = townPlaceOf(core);
  let best: { id: string; name: string; jobs: string[] } | undefined;
  for (const org of core.organizations.values()) {
    if (org.placeId !== town) continue;
    const jobs = currentJobs(api, org.id).map((job) => job.id);
    if (!best || jobs.length > best.jobs.length)
      best = { id: org.id, name: org.name, jobs };
  }
  return best;
}

function year(placeSeed: string, key: string, layoff: boolean) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const api = coreAPI(core);
  watchDepartures(core);
  const town = townPlaceOf(core)!;
  const places = new Set<string>([
    town,
    ...[...residentsRuntime(core)!.store.liveHouseholds()].map(
      (h) => h.placeId,
    ),
  ]);
  const townIds = new Set(
    [...core.people.values()]
      .filter((p) => p.alive && p.tier !== "husk")
      .map((p) => p.id),
  );
  const start = core.date;
  const people = peopleOf(core, places);
  let laidOff = "";
  if (layoff) {
    // Month 1: every worker of the largest employer, through the jobs
    // engine's own layoff (dev mode's control); one who worked today goes
    // the next day.
    advanceCore(core, addDays(makeIsoDate(start), 1));
    const employer = largestEmployer(core);
    let done = 0,
      jobs = employer?.jobs ?? [];
    for (let day = 0; day < 3 && jobs.length; day++) {
      const later: string[] = [];
      for (const jobId of jobs) {
        const result = layOffWorker(api, jobId);
        if (result === "worked-today") later.push(jobId);
        else if (result && typeof result === "object") done += result.heads;
      }
      jobs = later;
      if (jobs.length) advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    laidOff = `${employer?.name ?? "none"} (${employer?.id}), ${done} jobs ended`;
  }
  advanceCore(core, addDays(makeIsoDate(start), 365));
  const home = stateOfCountedPlace(town);
  const moves = countedMoves(api).filter((row) => row.date > start);
  const countedOut = moves.filter((row) => row.direction === "out");
  const outPeople = countedOut.reduce((n, row) => n + row.people, 0);
  const inStatePeople = countedOut
    .filter((row) => row.toPlace.endsWith(":rest-of-state"))
    .reduce((n, row) => n + row.people, 0);
  const full = departuresSeen(core).filter((row) => townIds.has(row.personId));
  const fullOut = full.reduce((n, row) => n + row.withIds.length, 0);
  const fullInState = full
    .filter((row) => placeStateKey(row.destinationId) === `US-${home}`)
    .reduce((n, row) => n + row.withIds.length, 0);
  const abroad = moves
    .filter((row) => row.direction === "in" && row.fromPlace === "abroad")
    .reduce((n, row) => n + row.people, 0);
  const conditions = placeLeavingConditions(api, town);
  const sample = countedOut.find((row) => row.reads);
  return {
    core,
    people,
    leavingPer1000: (1000 * (outPeople + fullOut)) / people,
    inStateShare: (inStatePeople + fullInState) / (outPeople + fullOut || 1),
    abroad,
    fullOut,
    countedOut: outPeople,
    gap: conditions.gap,
    laidOff,
    sample: sample
      ? `${sample.id} reasons ${JSON.stringify(sample.reasons)} reads ${JSON.stringify(sample.reads)}`
      : "none",
  };
}

/** The nation's share of county leavers staying in their state, from the tier's draws and the fitted strength, no pay or work differences. */
function nationalInState(core: CoreState): number {
  const rt = runtimeOf(coreAPI(core))!;
  const k = Math.exp(countedParameter("countedMovesNearHomePull"));
  const total = [...rt.draw.values()].reduce((n, v) => n + v, 0);
  let people = 0,
    staying = 0;
  for (const [usps, st] of rt.states) {
    const n = st.people.reduce((a, b) => a + b, 0);
    const draw = rt.draw.get(usps) ?? 0;
    const near = (draw * k) / Math.max(1e-12, total - draw);
    people += n;
    staying += (n * near) / (1 + near);
  }
  return staying / people;
}

out(`Pins family 29 proof, seed ${seed}`);
for (let i = 0; i < 3; i++) {
  const place = drawPlace(`${seed}:${i}`, "pins-29-proof");
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const a = year(place.seed, place.key, false);
  if (i === 0)
    out(
      `national in-state share on the tier's draws: ${nationalInState(a.core).toFixed(3)} (CPS 2023: 0.571)`,
    );
  const aLine = `A ${a.leavingPer1000.toFixed(1)} leaving per 1,000 (${a.countedOut} counted, ${a.fullOut} full of ${Math.round(a.people)}), in-state ${a.inStateShare.toFixed(3)}, from abroad ${a.abroad}, region less state unemployment ${a.gap.toFixed(2)} pts`;
  a.core = undefined as never;
  const b = year(place.seed, place.key, true);
  out(`${where}`);
  out(`  ${aLine}`);
  out(
    `  B ${b.leavingPer1000.toFixed(1)} leaving per 1,000 (${b.countedOut} counted, ${b.fullOut} full of ${Math.round(b.people)}), in-state ${b.inStateShare.toFixed(3)}, from abroad ${b.abroad}, region less state unemployment ${b.gap.toFixed(2)} pts; laid off ${b.laidOff}`,
  );
  out(`  trace: ${b.sample}`);
}
out("ALLDONE");
