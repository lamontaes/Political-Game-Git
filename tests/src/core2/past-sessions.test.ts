/**
 * The played state's last sitting before day one runs through the real bill engine (row 14 of the
 * Nov 26 refactoring map; owner, Nov 26: "Last few sessions"). The place and seed are drawn and
 * named. The century holds no law session of its own for that sitting or any later one; the
 * sitting's members are the ones the century says sat; and a law the engine enacted is in the day-one
 * world as a dated row that names the bill that carried it.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import {
  centuryLaw,
  pastSessionPlan,
} from "../../../src/core2/electorate-century";
import { gameStartDate } from "../../../src/core2/game-start";
import { LAWS_MODULE_ID, answerIn } from "../../../src/core2/modules/laws";
import { coreAPI } from "../../../src/core2/state";
import type { LawRowInput } from "../../../src/core2/laws-starting";
import { sessionQuestions } from "../../../src/core2/electorate-century-laws";

const seed = process.env.PAST_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-sessions");
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(world.core);
const plan = pastSessionPlan(seed);

describe(`the played state's last sitting runs through the bill engine (${place.name}, ${place.key}, seed ${seed})`, () => {
  it("has the century keep who sat and drop its own sessions from that sitting on", () => {
    // A state whose legislature does not meet in the years before day one has no sitting to run.
    if (!plan) return;
    expect(plan.stateKey).toBe(place.state);
    expect(plan.roster.size).toBeGreaterThan(0);
    expect(plan.rosterYear).toBeLessThan(plan.sittingYear);
    expect(plan.adjournAt < gameStartDate()).toBe(true);
    for (const question of sessionQuestions(false)) {
      const law = centuryLaw(seed, plan.stateKey, question);
      if (law) expect(law.year, question).toBeLessThan(plan.sittingYear);
    }
  });

  it("puts a law the engine enacted in the day-one world, dated, naming its bill", () => {
    if (!plan) return;
    const rows = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    ).filter(
      (row) =>
        row.jurisdiction === plan.stateKey &&
        row.terms?.enactedByBill !== undefined &&
        row.effectiveDate >= plan.conveneAt,
    );
    process.stdout.write(
      `past-sessions: ${plan.stateKey} sitting ${plan.conveneAt} to ${plan.adjournAt}, ${plan.roster.size} seats, ${rows.length} enacted rows\n`,
    );
    for (const row of rows) {
      expect(String(row.terms?.enactedByBill), row.id).toMatch(/^bill:/);
      // In force on day one when its date has come.
      if (row.effectiveDate <= gameStartDate() && row.endDate === null)
        expect(
          answerIn(api, plan.stateKey, row.series) === 1,
          `${row.series} on day one`,
        ).toBe(row.value === 1);
    }
  });
});
