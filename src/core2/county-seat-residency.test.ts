/**
 * A county seat's residency is the county, read once (`livesWhereSeatServes`),
 * and the people who staff the filing counter never weigh standing in a race.
 * Pinned at Cross Anchor, South Carolina (4517845), whose county board seat
 * went to a special election in the played year with a county resident and a
 * counter officer among its runners.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyPlaceOfWorld } from "./electorate-places";
import { gameStartDate } from "./game-start";
import { decideToRun } from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  livesWhereSeatServes,
  localResidencePlaces,
  type ContestRow,
} from "./modules/elections";
import { filingOfficerIds } from "./modules/filing-clerk";
import { coreAPI } from "./state";

const SEED = "7b05f67c869988e833b65d76bdc2297c9bb2e1f985498d7af2bbcc45f853b968";

it("a county seat's clerk accepts a county resident and a town seat's does not", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: "4517845",
  });
  const api = coreAPI(core);
  const county = countyPlaceOfWorld(core);
  expect(county, "Cross Anchor records a county").toBeTruthy();
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  const countySeat = contests.find((c) => c.family === "countyOffice");
  const townSeat = contests.find((c) => c.family === "municipalOffice");
  expect(countySeat, "a county seat is on the ballot").toBeTruthy();
  const outsider = { id: "person:probe", placeId: county! };
  expect(localResidencePlaces(api, countySeat!)).toContain(county);
  expect(livesWhereSeatServes(api, countySeat!, outsider)).toBe(true);
  if (townSeat) {
    expect(localResidencePlaces(api, townSeat)).not.toContain(county);
    expect(livesWhereSeatServes(api, townSeat, outsider)).toBe(false);
  }
});

it("a person seated at the filing counter never weighs running", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: "4517845",
  });
  const api = coreAPI(core);
  const officers = [...filingOfficerIds(api)];
  expect(officers.length, "the world seats a counter officer").toBeGreaterThan(
    0,
  );
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )[0]!;
  for (const id of officers) {
    expect(
      decideToRun(api, id, {
        contestId: contest.id,
        officeName: contest.title,
        filingDeadline: contest.filingDeadline,
        sourceIds: [contest.id],
      }),
    ).toBeNull();
  }
});
