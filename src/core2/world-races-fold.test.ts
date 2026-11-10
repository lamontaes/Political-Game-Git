/**
 * Old outside races fold (core-long-run-election-and-term-rows-part-2): a
 * race the town doesn't vote in, counted before the previous general
 * election, drops its count, places and returns and keeps its votes on its
 * row; a seat's older race rows fold into its newest seated race row and are
 * still found by id; a race whose winner is not yet seated and every
 * presidential row are kept whole. A place drawn from all 56, a seed nobody
 * chose; the older, pending and presidential rows are hand-made edge cases
 * beside the world's own counted races.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  foldOutsideRaces,
  openVoting,
  openWorldRaces,
  placesOf,
  raceById,
  raceResult,
  racesOf,
  raceVotes,
  returnsOf,
  VOTING_MODULE_ID,
  type RaceRow,
} from "./modules/voting";
import { openLegislature } from "./modules/legislature";
import { findRecord } from "../bench/dev-trace";

const START = "2026-10-20";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("outside races counted before the previous general fold into their seat's newest race", () => {
  const place = drawPlace(seed, "world-races-fold");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 120,
    }),
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openLegislature(core);
  openWorldRaces(core);
  // The 2026 general is counted and its winners seated.
  advanceCore(core, "2027-01-10");
  const api = coreAPI(core);
  const races = api.moduleState(VOTING_MODULE_ID).table("races");
  const counted = racesOf(api).filter(
    (r) => r.id.startsWith("race:") && r.seatedOn < core.date,
  );
  expect(counted.length, where).toBeGreaterThan(0);
  const newest = counted[0]!;
  const votes = raceVotes(api, newest);
  expect(raceResult(api, newest), where).not.toBeNull();
  expect(newest.votes, `${where}: ${newest.id} keeps its votes`).toEqual(votes);
  const seatYear = Number(newest.date.slice(0, 4));
  // The same seat's race two years before, seated; a race of another seat
  // whose winner is not seated yet; the presidency's row.
  const older: RaceRow = {
    ...newest,
    id: `race:${newest.seatId}:${seatYear - 2}`,
    date: `${seatYear - 2}-11-05`,
    seatedOn: `${seatYear - 1}-01-03`,
    resultId: `result:race:${newest.seatId}:${seatYear - 2}`,
    // The seat changed hands that time.
    incumbentParty: "holder's party",
    winnerParty: "challenger's party",
    votes: { republican: 10, democratic: 20 },
    cast: 31,
  };
  const pending = counted[1] ?? newest;
  const waiting: RaceRow = {
    ...pending,
    id: `race:${pending.seatId}:${seatYear - 1}-03-01:special`,
    date: `${seatYear - 1}-03-01`,
    seatedOn: "2099-01-01",
  };
  // Two of the presidency's rows, both long seated: neither may fold.
  const presidential = [4, 8].map((back) => ({
    id: `presidential:${seatYear - back}`,
    seatId: "seat:US:president",
    office: "president",
    date: `${seatYear - back}-11-05`,
    seatedOn: `${seatYear - back + 1}-01-20`,
    year: seatYear - back,
  }));
  for (const row of [older, waiting, ...presidential])
    races.put(row as unknown as { id: string });

  // The next general but one: everything counted before this year's general folds.
  foldOutsideRaces(api, `${seatYear}-12-31`);

  expect(
    raceResult(api, newest),
    `${where}: ${newest.id} count dropped`,
  ).toBeNull();
  expect(placesOf(api, newest.id).length, where).toBe(0);
  expect(returnsOf(api, newest.id), where).toBeUndefined();
  const kept = races.get(newest.id) as unknown as RaceRow;
  expect(kept, `${where}: the seat's newest race stays a row`).toBeTruthy();
  expect(raceVotes(api, kept), where).toEqual(votes);
  expect(races.get(older.id), `${where}: ${older.id} folded`).toBeUndefined();
  expect(kept.past?.races, where).toBe(1);
  expect(kept.past?.entries[0]?.id, where).toBe(older.id);
  expect(kept.past?.flips, where).toBe(1);
  expect(raceById(api, older.id), where).toMatchObject({
    id: older.id,
    winnerParty: older.winnerParty,
    republican: 10,
    democratic: 20,
  });
  expect(findRecord(core, older.id)?.record, where).toMatchObject({
    id: older.id,
  });
  // A race not yet seated, and the presidency, are kept whole.
  expect(races.get(waiting.id), `${where}: pending seating kept`).toBeTruthy();
  for (const row of presidential)
    expect(races.get(row.id), `${where}: ${row.id} kept`).toBeTruthy();
}, 900_000);
