import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { personCard } from "../bench/card";
import { homeOf, roomCondition } from "../bench/scene";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { HOUSING_MODULE_ID, openHousing } from "./modules/housing";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
for (const seed of ["6e32d4b3c4eb3d6e", replay]) {
  it(`opens real homes before any advance, replay ${seed}`, () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const { core } = world;
    const api = coreAPI(core);
    const homes = api.moduleState(HOUSING_MODULE_ID).table("dwellings");
    const player = core.people.get(world.playerId!)!;
    process.stdout.write(`OPENING-HOMES ${JSON.stringify({
      replay: seed, town: world.place.displayName,
      playerId: player.id, date: core.date,
      fullHouseholds: core.households.size, homes: homes.rows().length,
    })}\n`);
    expect(core.date).toBe(gameStartDate());
    expect([...core.households.keys()].filter(
      (id) => !homes.get(`dwelling:${id}`),
    )).toEqual([]);
    const home = homes.get(`dwelling:${player.householdId}`)!;
    expect(home).toBeDefined();
    expect(personCard(core, player.id).dwelling).toEqual(home);
    expect(home.since).toBe(gameStartDate());
    const room = homeOf(core, player.id);
    expect(room).not.toBe("");
    const conditions = roomCondition(core, player.id);
    const beforeHomes = JSON.stringify(homes.rows());
    const beforeContracts = JSON.stringify([...core.finance.contracts]);
    const beforeCash = [...core.people.values()].map((p) => [p.id, p.liquidMinor]);
    openHousing(api);
    openHousing(api);
    expect(JSON.stringify(homes.rows())).toBe(beforeHomes);
    expect(JSON.stringify([...core.finance.contracts])).toBe(beforeContracts);
    expect([...core.people.values()].map((p) => [p.id, p.liquidMinor])).toEqual(beforeCash);
    expect(core.date).toBe(gameStartDate());
    expect(personCard(core, player.id).dwelling).toEqual(home);
    expect(homeOf(core, player.id)).toBe(room);
    process.stdout.write(`OPENING-HOME-PERSON ${JSON.stringify({
      replay: seed, town: world.place.displayName, date: core.date,
      person: { id: player.id, name: `${player.givenName} ${player.familyName}` },
      home, room, conditions,
      contract: core.finance.contracts.get(`lease:${player.householdId}`),
    })}\n`);
  }, 240_000);
}
