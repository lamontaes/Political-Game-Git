import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  condenseCircleDecisions,
  queueDecisionDetail,
} from "./decision-detail";
import { advanceCore, createLifeCore } from "./life";
import { parameter } from "./parameters";
import { generatedOpening } from "./tooling/generated-world";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-condense-decisions");

describe(`old reasons condense in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("keeps every option's score for recent acts, a year of the player's own, and only the chosen reasons for the circle's older ones", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    advanceCore(core, daysAfterStart(50));
    const window = parameter("circleDecisionDetailDays");
    const cutoff = new Date(`${core.date}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - window);
    const before = cutoff.toISOString().slice(0, 10);
    const acts = [...core.durableLog.values()].filter(
      (row) => row.kind === "person.acted" && row.decision,
    );
    const old = acts.filter(
      (row) => row.date < before && row.actorId !== core.playerId,
    );
    const recent = acts.filter((row) => row.date >= before);
    expect(old.length).toBeGreaterThan(0);
    for (const row of old) {
      expect(row.decision!.scores).toBeUndefined();
      // Still enough to name the choice and why.
      expect(row.decision!.actorId).toBe(row.actorId);
      expect(row.decision!.reasonKey).toBeDefined();
    }
    // The player's own routine act keeps every score for a year, then only
    // its summary and reasons (owner, Oct 20).
    const template = old[0]!;
    const own = {
      ...template,
      id: `${template.id}:player-copy`,
      actorId: core.playerId!,
      publicRecord: false,
      news: false,
      decision: {
        ...template.decision!,
        actorId: core.playerId!,
        scores: [],
      },
    };
    core.durableLog.set(own.id, own);
    queueDecisionDetail(core, template.date, own.id);
    const later = (days: number) => {
      const day = new Date(`${core.date}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() + days);
      core.date = day.toISOString().slice(0, 10);
    };
    later(60);
    condenseCircleDecisions(core);
    expect(core.durableLog.get(own.id)!.decision!.scores).toEqual([]);
    later(parameter("playerDecisionDetailDays") + 30);
    condenseCircleDecisions(core);
    const kept = core.durableLog.get(own.id)!.decision!;
    expect(kept.scores).toBeUndefined();
    expect(kept.reasonKey).toBeDefined();
    expect(kept.actorId).toBe(core.playerId);
    expect(recent.some((row) => row.decision!.scores !== undefined)).toBe(true);
  }, 300_000);
});
