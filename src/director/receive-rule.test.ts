/**
 * Every scene kind says who may receive it (pool item
 * director-casting-rule-on-every-scene-kind): each situation type and each
 * circumstance row carries a receive rule, and the director reads it. In the
 * played world of a place drawn from all 56, someone who lives with the
 * player cannot be the one who comes to the house, and a seat's scene does not
 * reach a player who holds no office. The place and seed are in every
 * message; replay with RECEIVE_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { servingTermsOf } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import circumstances from "./data/circumstances.json" with { type: "json" };
import situations from "./data/situation-types.json" with { type: "json" };
import { receives, type ReceiveRule } from "./scheduling";

setBookkeeping(false);

const seed = process.env.RECEIVE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "receive-rule");
const where = `${place.name} (${place.key}), seed ${seed}`;

const RULE_VALUES = {
  age: ["any"],
  counterpart: ["any", "apart"],
  seat: ["any", "serving"],
};

function expectRule(owner: string, rule: unknown) {
  expect(rule, `${owner} has no receive rule`).toBeDefined();
  for (const [key, values] of Object.entries(RULE_VALUES))
    expect(
      values,
      `${owner}: receive.${key} is ${String((rule as Record<string, unknown>)[key])}`,
    ).toContain((rule as Record<string, unknown>)[key]);
}

describe("every scene kind has a receive rule", () => {
  it("each situation type and each circumstance row declares who may receive it", () => {
    const types = (
      situations as { types: { key: string; receive?: unknown }[] }
    ).types;
    for (const type of types) expectRule(`type ${type.key}`, type.receive);
    const rows = (
      circumstances as { rows: { id: string; receive?: unknown }[] }
    ).rows;
    for (const row of rows) expectRule(`circumstance ${row.id}`, row.receive);
    expect(types.length).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe(`the director reads it (${where})`, () => {
  it("refuses a household member as the one who comes, and a seat scene for a player in no office", () => {
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const player = core.people.get(playerId! as PersonId)!;
    const housemate = (core.households.get(player.householdId)?.memberIds ?? [])
      .map((id) => id as PersonId)
      .find((id) => id !== player.id && core.people.get(id)?.alive);
    const outsider = [...player.knownIds].find(
      (id) =>
        core.people.get(id)?.alive &&
        core.people.get(id)?.householdId !== player.householdId,
    );
    const apart: ReceiveRule = {
      age: "any",
      counterpart: "apart",
      seat: "any",
    };
    if (housemate)
      expect(
        receives(core, player.id, apart, [housemate], "home"),
        `${where}: ${housemate} lives with ${player.id} and came to the house`,
      ).toBe(false);
    expect(
      outsider,
      `${where}: the player knows nobody outside the household`,
    ).toBeDefined();
    expect(
      receives(core, player.id, apart, [outsider!], "home"),
      `${where}: ${outsider} lives apart and may come`,
    ).toBe(true);
    const inOffice = servingTermsOf(coreAPI(core), player.id).length > 0;
    expect(
      receives(core, player.id, apart, [outsider!], "seat"),
      `${where}: a seat scene for ${player.id}, ${inOffice ? "in" : "in no"} office`,
    ).toBe(inOffice);
  }, 600_000);
});
