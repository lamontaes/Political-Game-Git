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
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { seatingProblems, type Holder } from "./m2-10-seating";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  VOTING_MODULE_ID,
  placesOf,
  presidentialOf,
  raceResult,
  raceShare,
  raceVotes,
  racesOf,
  type RaceRow,
} from "../core2/modules/voting";
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
// The seats up in November 2026, read before the election moves their cycle on.
const offices = midterm.api.moduleState(OFFICES_MODULE_ID);
const legislativeOffices = new Set(
  (
    offices.table("offices").rows() as unknown as {
      id: string;
      kind: string;
      elected: boolean;
    }[]
  )
    .filter((o) => o.elected && o.kind.startsWith("legislature-"))
    .map((o) => o.id),
);
const seats2026 = (
  offices.table("seats").rows() as unknown as {
    id: string;
    officeId: string;
    coversTown: boolean;
    electionYear?: number;
  }[]
).filter((s) => legislativeOffices.has(s.officeId) && s.electionYear === 2026);
advanceCore(midterm.w.core, "2027-01-21");
const races = racesOf(midterm.api).filter((r) => r.date === "2026-11-03");
// Play on to the last real seating day, so no race is left unchecked.
const lastSeating = races.reduce(
  (last, r) => (r.seatedOn > last ? r.seatedOn : last),
  midterm.w.core.date,
);
check(
  lastSeating <= "2027-12-31",
  `${where}: a race elected in November 2026 seats on ${lastSeating}`,
);
if (lastSeating >= midterm.w.core.date && lastSeating <= "2027-12-31")
  advanceCore(midterm.w.core, addDays(makeIsoDate(lastSeating), 1));
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
// The town's state legislature: a seat that covers the town is elected on the
// town's own ballot, not here, so the world runs a race only for the seats
// that do not (Guam's fifteen senators are all at-large and all cover the
// town). Every legislative seat up in 2026 is accounted for one way or the
// other: a world race, or a winner serving from after election day.
const outsideTown = seats2026.filter((s) => !s.coversTown);
const onTownBallot = seats2026.filter((s) => s.coversTown);
check(
  legislative.length === outsideTown.length,
  `${where}: ${legislative.length} legislative races for ${outsideTown.length} seats up in 2026 outside the town`,
);
check(
  seats2026.length > 0,
  `${where}: no state legislative seat is up in 2026`,
);
// A seat on the town's ballot ends in a winner serving from after election
// day, or, when nobody filed, a vacancy the contest's own result recorded
// (the special election then fills it).
const vacancies = midterm.api
  .moduleState(OFFICES_MODULE_ID)
  .table("vacancies")
  .rows() as unknown as {
  seatId: string;
  cause: string;
}[];
for (const seat of onTownBallot)
  check(
    serving(midterm.api, seat.id).some((t) => t.startDate > "2026-11-03") ||
      vacancies.some(
        (v) =>
          v.seatId === seat.id &&
          v.cause === `result:contest:${seat.id}:2026-11-03`,
      ),
    `${where}: ${seat.id} is on the town's ballot in 2026 and has neither a winner serving after election day nor a vacancy from its contest`,
  );
report.legislativeSeats = {
  worldRaces: legislative.length,
  townBallot: onTownBallot.length,
};
// 36 states elect a governor in 2026; the town's own is on its ballot.
check(
  governors.length >= 30,
  `${where}: ${governors.length} governor races in 2026 outside the town's state (36 states elect one); the voting engine's world races run none`,
);
const counted = (r: RaceRow) => {
  const { republican, democratic } = raceVotes(midterm.api, r);
  return republican + democratic > 0;
};
for (const r of races.filter(counted)) {
  check(
    placesOf(midterm.api, r.id).length > 0,
    `${where}: ${r.seatId} was counted in no place`,
  );
  check(
    raceResult(midterm.api, r)?.electorateReasons?.length === 2,
    `${where}: ${r.seatId} keeps no reasons for both parties`,
  );
  const share = raceShare(midterm.api, r);
  if (share !== 0.5)
    check(
      sideOf(r.winnerParty) === (share > 0.5 ? 1 : -1),
      `${where}: ${r.seatId} went to ${r.winnerParty} at a Republican share of ${share}`,
    );
}
// Seated on the real dates: Congress on January 3, each legislature on its
// own. A seat the offices engine holds gets the winner's term there; any
// other seat is kept in the world races' own seats, from the day it is filled.
for (const r of [...house, ...senate, ...legislative]) {
  const kept = midterm.api
    .moduleState(VOTING_MODULE_ID)
    .table("seats")
    .get(r.seatId) as unknown as { party: string; since: string } | undefined;
  const holders: Holder[] = [
    ...serving(midterm.api, r.seatId).map((t) => ({
      party: t.party,
      from: t.startDate,
    })),
    ...(kept ? [{ party: kept.party, from: kept.since }] : []),
  ];
  for (const problem of seatingProblems(r, holders, sideOf))
    check(false, `${where}: ${problem}`);
}
report.seated = [...house, ...senate, ...legislative].length;
// A governor race's winner is recorded in the world races' seats from the
// state's inauguration day. No engine seats them as governor yet: the
// officials roster keeps the opening governor (SG-GOV-world-governor-executive,
// pool item gov-world-races-run-no-governors), so this is a record, not a term.
for (const r of governors) {
  const kept = midterm.api
    .moduleState(VOTING_MODULE_ID)
    .table("seats")
    .get(r.seatId) as unknown as { party: string; since: string } | undefined;
  const recorded: Holder[] = kept
    ? [{ party: kept.party, from: kept.since }]
    : [];
  for (const problem of seatingProblems(r, recorded, sideOf))
    check(false, `${where}: ${problem} (governor winner record)`);
}
report.governorsRecorded = governors.length;
report.governorSample = governors
  .slice(0, 5)
  .map(
    (r) =>
      `${r.id}: ${r.winnerParty} ${raceShare(midterm.api, r).toFixed(3)} over ${placesOf(midterm.api, r.id).length} places, recorded from ${r.seatedOn}`,
  );
report.sample = races
  .slice(0, 3)
  .map(
    (r) =>
      `${r.id}: ${r.winnerParty} ${raceShare(midterm.api, r).toFixed(3)}, ${governors.includes(r) ? "recorded from" : "seated"} ${r.seatedOn}`,
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
