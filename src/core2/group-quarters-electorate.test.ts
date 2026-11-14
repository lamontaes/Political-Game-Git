/**
 * Counted residents of adult correctional rooms do not vote, are not drawn to
 * run and are not doors where the state bars people held in prison; they stay
 * voters where the law lets them vote from prison. Nursing-home rooms vote
 * but are not doors. Pinned places and seed (no draw): Avenal, California
 * (0603302, a prison town in a barring state), Newport, Vermont (5048850,
 * a state that lets people vote from prison) and Los Altos, California
 * (0643280, with a nursing home).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { prisonPartOfBarredShare } from "./law-reach/group-a-voting";
import { CAMPAIGNS_MODULE_ID, townDoorCount } from "./modules/campaigns";
import { residentsRuntime } from "./modules/residents";
import { countedVoters } from "./modules/voting";
import { coreAPI } from "./state";
import { groupQuartersProfileOf } from "./gov-rules/place-population";
import type { GroupQuartersType } from "./group-quarters-types";
import type { CoreState } from "./types";
import gq from "./data/stopgaps/gq.json" with { type: "json" };

const isInstitution = (type: GroupQuartersType | undefined) =>
  type !== undefined && groupQuartersProfileOf(type).institutional;

const SEED = "group-quarters-electorate-1";

function world(placeKey: string) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const all = countedResidents(core as CoreState);
  const weight = (rows: readonly { weight: number }[]) =>
    rows.reduce((n, v) => n + v.weight, 0);
  const rooms = [...(residentsRuntime(core)?.store.liveHouseholds() ?? [])];
  // Doors by hand: the town's named households and counted households, in
  // no group-quarters room, and the same with institutions' rooms kept.
  const town = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const named = new Set<string>();
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const person = core.people.get(id);
    if (person?.alive && core.households.has(person.householdId))
      named.add(person.householdId);
  }
  const counted = rooms.filter(
    (h) => h.placeId === town && !core.households.has(h.id),
  );
  const namedHomes = [...named].filter(
    (id) => !isInstitution(core.households.get(id)!.quarters),
  ).length;
  const doorsBefore = named.size + counted.length;
  const doorsAfter =
    namedHomes + counted.filter((h) => !isInstitution(h.quarters)).length;
  return {
    api,
    all,
    voters: countedVoters(api),
    weight,
    doorsBefore,
    doorsAfter,
  };
}

it("a prison town in a barring state leaves its correctional rooms out of the counted electorate and its doors", () => {
  const { api, all, voters, weight, doorsBefore, doorsAfter } =
    world("0603302"); /* Avenal, California */
  const cells = all.filter((v) => v.quarters === "adultCorrectional");
  expect(cells.length).toBeGreaterThan(0);
  expect(voters.some((v) => v.quarters === "adultCorrectional")).toBe(false);
  expect(voters.length).toBe(all.length - cells.length);
  expect(weight(voters)).toBeLessThan(weight(all));
  // The barred share for everyone else drops by the prison part.
  expect(prisonPartOfBarredShare(api)).toBeGreaterThan(0);
  // Doors: no institution's room is one.
  expect(doorsAfter).toBeLessThan(doorsBefore);
  expect(townDoorCount(api)).toBe(doorsAfter);
}, 300_000);

it("a state that lets people vote from prison keeps its correctional rooms as voters", () => {
  const { api, all, voters } = world("5048850"); /* Newport, Vermont */
  const cells = all.filter((v) => v.quarters === "adultCorrectional");
  expect(cells.length).toBeGreaterThan(0);
  expect(voters.length).toBe(all.length);
  expect(prisonPartOfBarredShare(api)).toBe(0);
}, 300_000);

it("a town with a nursing home counts its nursing rooms as voters but not as doors", () => {
  const { api, all, voters, doorsBefore, doorsAfter } =
    world("0643280"); /* Los Altos, California */
  const nursing = all.filter((v) => v.quarters === "nursing");
  expect(nursing.length).toBeGreaterThan(0);
  expect(voters.length).toBe(all.length);
  expect(doorsAfter).toBeLessThan(doorsBefore);
  expect(townDoorCount(api)).toBe(doorsAfter);
}, 300_000);

it("both stopgap rows are gone from the register", () => {
  const ids = gq.map((row) => row.id);
  expect(ids).not.toContain("SG-GQ-counted-prisoners-vote");
  expect(ids).not.toContain("SG-GQ-campaign-doors");
});
