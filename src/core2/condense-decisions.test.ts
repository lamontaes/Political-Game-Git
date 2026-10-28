import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  condenseCircleDecisions,
  queueDecisionDetail,
} from "./decision-detail";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
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
    // its summary and reasons.
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

  it("drops a circle member's weighed choices after the detail window and their other entries after circleActRetentionMonths, keeping the player's own", () => {
    // Every module installed, so drives, campaigns and the news write the
    // circle's weighed choices and entries as in play.
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
      settings: { population: 1500 },
    });
    advanceCore(core, daysAfterStart(120));
    const player = core.playerId!;
    const routine = [...core.durableLog.values()].filter(
      (row) =>
        row.visibility === "circle" &&
        !row.publicRecord &&
        !row.news &&
        row.actorId !== player &&
        !row.personIds.includes(player),
    );
    const weighed = routine.filter((row) => row.kind === "person.weighed");
    const entries = routine.filter((row) => !row.decision);
    const own = [...core.durableLog.values()].filter(
      (row) => row.actorId === player || row.personIds.includes(player),
    );
    expect(weighed.length, "weighed choices by the circle").toBeGreaterThan(0);
    expect(entries.length, "circle entries without a decision").toBeGreaterThan(
      0,
    );
    expect(own.length, "the player's own entries").toBeGreaterThan(0);
    const later = (move: (day: Date) => void) => {
      const day = new Date(`${core.date}T00:00:00Z`);
      move(day);
      core.date = day.toISOString().slice(0, 10);
      condenseCircleDecisions(core);
    };
    const gone = (rows: typeof routine) => {
      for (const row of rows) {
        expect(core.durableLog.has(row.id), row.id).toBe(false);
        expect(core.logByKind.get(row.kind)?.has(row.id) ?? false, row.id).toBe(
          false,
        );
      }
    };
    // Past the detail window the weighed choices are gone, the entries stay.
    later((day) =>
      day.setUTCDate(
        day.getUTCDate() + parameter("circleDecisionDetailDays") + 1,
      ),
    );
    gone(weighed);
    for (const row of entries)
      expect(core.durableLog.has(row.id), row.id).toBe(true);
    // Past the retention months the entries are gone too.
    later((day) =>
      day.setUTCMonth(
        day.getUTCMonth() + parameter("circleActRetentionMonths") + 1,
      ),
    );
    gone(entries);
    for (const row of own)
      expect(core.durableLog.has(row.id), row.id).toBe(true);
  }, 300_000);
});
