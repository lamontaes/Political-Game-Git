import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "../core2/state";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import {
  ballotOf,
  holdElection,
  pollingPlaceOf,
} from "../core2/modules/voting";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { SITUATION_LIBRARY } from "./scheduling";
import {
  leavePollingPlace,
  markBallot,
  pollingVisitDue,
} from "./polling-place";

// Election day is a scene (owner, Oct 14, 2026), in the world the player
// gets: `buildBenchWorld`, two-level, a place drawn from all 56
// (GOLDEN_PATH_SEED pins one). The visit lists the contests the town votes
// in that day as the elections engine holds them; the scene filter turns it
// off; and what the voter marks is what the voting engine counts.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "polling-place");
console.log(`polling place: seed ${seed}, ${place.name} (${place.key})`);

describe("election day at the polls", () => {
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const contests = [
    ...(api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]),
  ].sort((a, b) => a.electionDate.localeCompare(b.electionDate));
  const date = makeIsoDate(contests[0]!.electionDate);
  const player = core.people.get(world.playerId!)!;
  const adult = (id: string) =>
    ageOnDate(makeIsoDate(core.people.get(id)!.birthDate), date) >= 18;
  // The player, or a household member old enough to vote that day. The count
  // below runs today (outside its calendar day), so the voter is one who may
  // vote today as well.
  const voterId = [
    player.id,
    ...core.households.get(player.householdId)!.memberIds,
  ].find(
    (id) =>
      adult(id) &&
      ageOnDate(makeIsoDate(core.people.get(id)!.birthDate), core.date) >= 18,
  )!;

  it("lists the contests the town votes in that day, with the household voters", () => {
    expect(voterId, "no one in the household may vote").toBeTruthy();
    const visit = pollingVisitDue(core, director.ledger, voterId, date)!;
    expect(visit).toBeTruthy();
    expect(visit.contests.map((row) => row.id)).toEqual(
      contests
        .filter((row) => row.electionDate === date)
        .map((row) => row.id)
        .sort((a, b) => a.localeCompare(b)),
    );
    for (const id of visit.withIds) expect(adult(id)).toBe(true);
    expect(visit.withIds).not.toContain(voterId);
    // No polls the day before, and none for someone too young to vote.
    expect(
      pollingVisitDue(
        core,
        director.ledger,
        voterId,
        makeIsoDate(contests[0]!.filingDeadline),
      ),
    ).toBeNull();
    const young = core.households
      .get(player.householdId)!
      .memberIds.find((id) => !adult(id));
    if (young)
      expect(pollingVisitDue(core, director.ledger, young, date)).toBeNull();
    // The situation type the visit plays is in the director's library.
    expect(
      SITUATION_LIBRARY.types.some((row) => row.key === visit.situationKey),
    ).toBe(true);
  });

  it("stands the precinct's poll workers in the scene, from the elections engine's polling-place record", () => {
    const visit = pollingVisitDue(core, director.ledger, voterId, date)!;
    const row = pollingPlaceOf(api, voterId, date)!;
    expect(visit.pollingPlaceId).toBe(row.id);
    // Each worker is a living adult resident the engine ranked for this precinct.
    expect(visit.pollWorkerIds).toEqual(
      row.pollWorkers!.ids.filter((id) => id !== voterId),
    );
    for (const id of visit.pollWorkerIds) {
      expect(core.people.get(id)?.alive).toBe(true);
      expect(adult(id)).toBe(true);
    }
  });

  it("doesn't stop a voter who left the polling place out of their scenes", () => {
    director.setSceneFilter(
      voterId,
      SITUATION_LIBRARY.types
        .map((row) => row.key)
        .filter((key) => key !== "polling-place"),
      core.date,
    );
    expect(pollingVisitDue(core, director.ledger, voterId, date)).toBeNull();
    director.setSceneFilter(voterId, null, core.date);
    expect(pollingVisitDue(core, director.ledger, voterId, date)).toBeTruthy();
  });

  it("counts what the voter marked", () => {
    let visit = pollingVisitDue(core, director.ledger, voterId, date)!;
    const [first, ...rest] = visit.contests;
    // The first race left blank by hand; the voter then leaves.
    const record = markBallot(core, director.ledger, visit, first!.id, null);
    expect(record.status).toBe(rest.length ? "open" : "voted");
    visit = { ...visit, record };
    if (rest.length) {
      expect(leavePollingPlace(director.ledger, visit).status).toBe("left");
    }
    expect(pollingVisitDue(core, director.ledger, voterId, date)).toBeNull();
    // The count reads the mark: the voter voted, and left the race blank,
    // whatever their own reasons would have said.
    holdElection(api, first!.id);
    const ballot = ballotOf(api, first!.id, voterId)!;
    expect(ballot.voted).toBe(true);
    expect(ballot.choice).toBeNull();
  });
});
