/**
 * A household returned to the counts that then moves away takes its seekers
 * with it: the weekly matching hires none of them, so no counted job is left
 * naming a worker the counts no longer hold (pool item
 * core-press-staff-counted-job-not-resident: the press later fills in a
 * counted job's worker and stopped the game on one who had moved away). A
 * place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run, and
 * PLACE_KEY to replay a known place.
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
import { JOBS_MODULE_ID } from "./modules/jobs";
import {
  departCountedHousehold,
  residentFacts,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const pinned = process.env.PLACE_KEY;
const place = drawPlace(
  seed,
  "jobs-departed-seeker",
  pinned ? (key) => key === pinned : undefined,
);
const where = `${place.name} (${place.key}), seed ${place.seed}`;

it(`a returned household that moves away leaves no seeker to hire, ${where}`, () => {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
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
  // A counted household of the played town, out of the player's circle, with an adult.
  const record = [...rt.households.values()].find(
    (row) =>
      row.household.placeId === player?.placeId &&
      row.people.some((p) => p.birthDate < "2000-01-01") &&
      row.people.every((p) => !circle.has(p.id)),
  );
  expect(record, where).toBeDefined();
  const householdId = record!.household.id;
  const personId = record!.people.find((p) => p.birthDate < "2000-01-01")!.id;
  const placeId = record!.household.placeId;
  fillInPerson(core, personId);
  expect(demoteHousehold(api, householdId, core.date), where).toBeDefined();
  expect(isDemoted(core.people.get(personId)!), where).toBe(true);
  // The household moves away from the counts; the person's record stays on file.
  expect(departCountedHousehold(core, householdId), where).toBeDefined();
  expect(residentFacts(core, personId), where).toBeUndefined();
  expect(core.people.has(personId), where).toBe(true);
  // A search the person had open, ready for the weekly matching.
  const seekers = api.moduleState(JOBS_MODULE_ID).table("countedSeekers");
  seekers.put({
    id: personId,
    personId,
    placeId,
    employed: false,
    since: core.date,
    reasonKey: "opening-unemployed",
    referenceHourlyMinor: 1,
    regionalPull: 1,
    localTried: true,
    isSeeker: true,
  } as never);
  advanceCore(core, addDays(makeIsoDate(core.date), 14));
  expect(seekers.get(personId), `${personId}, ${where}`).toBeUndefined();
  const hired = [...rt.jobs.values()].filter(
    (job) => job.personId === personId && job.endsAt === undefined,
  );
  expect(
    hired.map((job) => job.id),
    `${personId}, ${where}`,
  ).toEqual([]);
}, 900_000);
