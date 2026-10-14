/**
 * The committees, hearings and polls screens in a generated world (a random
 * place and seed each run, named so a failure can be replayed): the rows come
 * from the legislature's committee records and the campaigns engine's polls.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { committeesView, pollsView } from "./committees";

const seed = process.env.COMMITTEES_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;

describe(`committees and polls screens: ${world.place.displayName} (seed ${seed})`, () => {
  it("lists the committees on the bills before the bodies over the player, and their hearings", () => {
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const rows = coreAPI(core)
      .moduleState("core2-legislature-v1")
      .table("committees")
      .rows() as unknown as { id: string; heard: boolean }[];
    const view = committeesView(core, world.playerId!);
    expect(rows.length, "a committee met within the year").toBeGreaterThan(0);
    // Every row shown is a committee row the legislature kept.
    for (const committee of view)
      expect(rows.some((row) => row.id === committee.id)).toBe(true);
    for (const committee of view.filter((row) => row.heard))
      for (const witness of committee.witnesses)
        expect(witness.name.length).toBeGreaterThan(0);
  }, 240_000);

  it("shows no polls for a player who is in no race", () => {
    expect(pollsView(core, world.playerId!)).toEqual([]);
  });
});
