/**
 * People returned to the counts leave with their counted household when it
 * moves away: their records go to the household's destination as a full
 * mover's do, so no record is left marked as counted in a town whose counts no
 * longer hold it (pool item core-press-staff-counted-job-not-resident: a hire
 * then named such a person and the press's fill-in stopped the game). A place
 * is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run and PLACE_KEY
 * to replay a known place.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { isDemoted } from "./counted-groups";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { demoteHousehold } from "./modules/counted-demotion";
import { moveCountedHouseholdAway } from "./modules/counted-moves";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { residentFacts, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const pinned = process.env.PLACE_KEY;
const draw = (purpose: string) =>
  drawPlace(seed, purpose, pinned ? (key) => key === pinned : undefined);

/** Living people marked returned to the counts whom no counted household holds. */
function returnedWithoutHousehold(core: CoreState): string[] {
  return [...core.people.values()]
    .filter(
      (person) =>
        person.alive && isDemoted(person) && !residentFacts(core, person.id),
    )
    .map((person) => person.id);
}

const one = draw("counted-move-returned-members");
it(`a returned household that moves away takes its records with it, ${one.name} (${one.key}), seed ${one.seed}`, () => {
  const where = `${one.name} (${one.key}), seed ${one.seed}`;
  const { core } = buildBenchWorld(one.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: one.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const circle = new Set([
    core.playerId,
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  const record = [...rt.households.values()].find(
    (row) =>
      row.household.placeId === player?.placeId &&
      row.people.some((p) => p.birthDate < "2000-01-01") &&
      row.people.every((p) => !circle.has(p.id)),
  );
  expect(record, where).toBeDefined();
  const householdId = record!.household.id;
  const personId = record!.people.find((p) => p.birthDate < "2000-01-01")!.id;
  fillInPerson(core, personId);
  expect(demoteHousehold(api, householdId, core.date), where).toBeDefined();
  expect(isDemoted(core.people.get(personId)!), where).toBe(true);
  const seekers = api.moduleState(JOBS_MODULE_ID).table("countedSeekers");
  seekers.put({
    id: personId,
    personId,
    placeId: record!.household.placeId,
    employed: false,
    since: core.date,
    reasonKey: "opening-unemployed",
    referenceHourlyMinor: 1,
    regionalPull: 1,
    localTried: true,
    isSeeker: true,
  } as never);
  expect(
    moveCountedHouseholdAway(api, householdId, record!.household.placeId, {}),
    where,
  ).toBe(true);
  const moved = core.people.get(personId)!;
  // Their record left with the household: alive, out of the counts, in the state it went to.
  expect(moved.alive, where).toBe(true);
  expect(isDemoted(moved), `${personId} at ${moved.placeId}, ${where}`).toBe(
    false,
  );
  expect(moved.placeId, where).not.toBe(record!.household.placeId);
  expect(returnedWithoutHousehold(core), where).toEqual([]);
  // Meeting them again finds their record; nothing is filled in from the counts.
  expect(fillInPerson(core, personId), where).toBe(moved);
  // Their search for work here ended with the move.
  expect(seekers.get(personId), where).toBeUndefined();
}, 900_000);

const year = draw("counted-move-returned-members-year");
it(`after a played year nobody is marked returned without a counted household, ${year.name} (${year.key}), seed ${year.seed}`, () => {
  const { core } = buildBenchWorld(year.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: year.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  expect(
    returnedWithoutHousehold(core),
    `${year.name} (${year.key}), seed ${year.seed}`,
  ).toEqual([]);
}, 1_800_000);
