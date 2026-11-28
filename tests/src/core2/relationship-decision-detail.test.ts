/**
 * A circle member's decision kept in a tie's latest change holds every
 * option's score for `circleDecisionDetailDays`, then only what the "why"
 * view names, as their log entry does (memory and long runs, Nov 8). The
 * player's own stay whole. A random place and seed each run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { parameter } from "../../../src/core2/parameters";

const seed = process.env.REL_DETAIL_SEED ?? randomBytes(8).toString("hex");

describe(`tie decision detail (seed ${seed})`, () => {
  it("condenses old circle decisions in ties and keeps recent ones", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core;
    const days = parameter("circleDecisionDetailDays", core.data.parameters);
    advanceCore(core, addDays(makeIsoDate(core.date), days * 3));
    const cutoff = addDays(makeIsoDate(core.date), -days - 1);
    let withScores = 0;
    let condensed = 0;
    for (const row of core.relationships.values()) {
      const decision = row.latestChange?.decision;
      if (!decision) continue;
      if (decision.scores) withScores += 1;
      else condensed += 1;
      if (decision.scores && decision.actorId !== core.playerId)
        expect(
          row.latestChange!.date >= cutoff,
          `${world.place.displayName}: ${row.id} on ${row.latestChange!.date}`,
        ).toBe(true);
    }
    console.log(
      `${world.place.displayName} (seed ${seed}): ${withScores} ties with scores, ${condensed} condensed`,
    );
  }, 600_000);
});
