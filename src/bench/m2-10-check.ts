/* global process, console */
// Roadmap M2-10, state and federal races in the world, in the place the
// golden-path runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). The
// played world (`buildBenchWorld`, two-level, every module) opens three weeks
// before a general election and plays past the day its winners take office:
// November 2026 (Congress, state legislatures, governors) and November 2028
// (the presidency). Fails, naming the clause, when a kind of race is not run,
// a race counted on the engine has no places or reasons, a winner is not the
// side the count gave, or a winner is not serving from the real date.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m2-10-check.ts
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  WORLD_RACES_MODULE_ID,
  presidentialOf,
  racesOf,
  type RaceRow,
} from "../core2/modules/world-races";
import { partySide } from "../core2/appointments";
import { corePlaceStateIdentities } from "../core2/place-lookup";

const seed = process.env.GOLDEN_PATH_SEED ?? "m2-10-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) failures.push(message);
};
// Independents in Congress caucus with the Democrats.
const sideOf = (party: string | null) =>
  partySide(party) || (/independent/i.test(party ?? "") ? -1 : 0);
/** States, D.C. and the territories, as the place records key them. */
const states = new Set(
  [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey),
);

function world(date: string) {
  setBookkeeping(false);
  const w = buildBenchWorld(seed, date, {
    twoLevel: true,
    ...(placeKey ? { placeKey } : {}),
  });
  return { w, api: coreAPI(w.core) };
}
/** Who serves a seat, read on a day. */
function serving(api: ReturnType<typeof coreAPI>, seatId: string) {
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [seatId, "serving"]) as unknown as {
    party: string | null;
    startDate: string;
  }[];
}

// 1. November 2026: every kind of race runs on the engine, and is seated.
const midterm = world("2026-10-13");
const where = `${midterm.w.place.displayName} (${midterm.w.place.key}), seed ${seed}`;
advanceCore(midterm.w.core, "2027-01-21");
const races = racesOf(midterm.api).filter((r) => r.date === "2026-11-03");
const byOffice = (test: (office: string) => boolean) =>
  races.filter((r) => test(r.office));
const house = byOffice((o) => o === "us-house");
const senate = byOffice((o) => o === "us-senate");
const legislative = byOffice((o) => o.startsWith("legislature-"));
const governors = byOffice((o) => o.includes("governor"));
const report: Record<string, unknown> = {
  place: where,
  races: races.length,
  house: house.length,
  senate: senate.length,
  legislative: legislative.length,
  governors: governors.length,
};
// The town's own district and its own state's statewide races run on the
// town's named ballot, not here: the rest of the House, at least.
check(house.length >= 430, `${where}: ${house.length} House races in 2026`);
check(senate.length >= 30, `${where}: ${senate.length} Senate races in 2026`);
check(legislative.length > 0, `${where}: no state legislative races in 2026`);
// 36 states elect a governor in 2026; the town's own is on its ballot.
check(
  governors.length >= 30,
  `${where}: ${governors.length} governor races in 2026 outside the town's state (36 states elect one); src/core2/modules/world-races.ts runs none`,
);
const counted = (r: RaceRow) =>
  Boolean(r.votes?.republican || r.votes?.democratic);
for (const r of races.filter(counted)) {
  check((r.places ?? 0) > 0, `${where}: ${r.seatId} was counted in no place`);
  check(
    r.reasons?.length === 2,
    `${where}: ${r.seatId} keeps no reasons for both parties`,
  );
  if (r.republicanShare !== 0.5)
    check(
      sideOf(r.winnerParty) === (r.republicanShare > 0.5 ? 1 : -1),
      `${where}: ${r.seatId} went to ${r.winnerParty} at a Republican share of ${r.republicanShare}`,
    );
}
// Seated on the real dates: Congress on January 3, each legislature on its
// own. A seat the offices engine holds gets the winner's term there; any
// other seat is kept in the world races' own seats, from the day it is filled.
for (const r of [...house, ...senate, ...legislative]) {
  if (r.seatedOn > midterm.w.core.date) continue;
  const kept = midterm.api
    .moduleState(WORLD_RACES_MODULE_ID)
    .table("seats")
    .get(r.seatId) as unknown as { party: string; since: string } | undefined;
  const holders = [
    ...serving(midterm.api, r.seatId)
      .filter((t) => t.startDate >= r.seatedOn)
      .map((t) => t.party),
    ...(kept && kept.since >= r.seatedOn ? [kept.party] : []),
  ];
  check(
    holders.some((party) => sideOf(party) === sideOf(r.winnerParty)),
    `${where}: ${r.seatId} is not held by the ${r.winnerParty} winner after ${r.seatedOn} (${JSON.stringify(holders)})`,
  );
  if (r.office.startsWith("us-"))
    check(
      r.seatedOn === "2027-01-03",
      `${where}: ${r.seatId} seats on ${r.seatedOn}, not January 3, 2027`,
    );
}
report.seated = [...house, ...senate, ...legislative].filter(
  (r) => r.seatedOn <= midterm.w.core.date,
).length;
report.sample = races
  .slice(0, 3)
  .map(
    (r) =>
      `${r.id}: ${r.winnerParty} ${r.republicanShare.toFixed(3)}, seated ${r.seatedOn}`,
  );

// 2. November 2028: the presidency, in the electoral college, from January 20.
const general = world("2028-10-13");
advanceCore(general.w.core, "2029-01-21");
const pres = presidentialOf(general.api, 2028);
if (!pres) failures.push(`${where}: no presidential race in 2028`);
else {
  const electors = pres.states.reduce((a, s) => a + s.electors, 0);
  check(electors === 538, `${where}: ${electors} electors, not 538`);
  check(
    pres.states.every((s) => states.has(s.stateKey)),
    `${where}: an elector state is not a place on record`,
  );
  const won =
    sideOf(pres.winnerParty) > 0
      ? pres.electoral.republican
      : pres.electoral.democratic;
  if (pres.electoral.republican !== pres.electoral.democratic)
    check(won >= 270, `${where}: the president won ${won} electors`);
  for (const seatId of ["seat:US:president", "seat:US:vice-president"]) {
    const now = serving(general.api, seatId);
    check(
      now.length === 1 &&
        now[0]!.party === pres.winnerParty &&
        now[0]!.startDate === "2029-01-20",
      `${where}: ${seatId} is not held by the ${pres.winnerParty} winner from January 20, 2029 (${JSON.stringify(now)})`,
    );
  }
  report.presidency = {
    winner: pres.winnerParty,
    electoral: pres.electoral,
  };
}

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`M2-10 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M2-10 passed: ${where}`);
