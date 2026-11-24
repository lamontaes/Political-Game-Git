/**
 * The town's labor market a year before the start (src/core2/labor-past.ts):
 * on day one Metrics carries last year beside people at work, people looking
 * for work and jobs open, read from the year row the economy pass's months
 * wrote, out of the same labor force; and after a played year the state's
 * figures keep the month a year back. Pinned to Washington, Kansas (seed
 * 599e6f66e9c1d25a), a place that serves eviction notices and has a jobs row.
 * The time is the game's own played days: it plays fourteen months of that
 * place (a played year there runs about 150 seconds), because the state's
 * year-back figures are only there from the second year.
 */
import { describe, expect, it } from "vitest";
import { metricsView } from "./metrics";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { yearRowId, type OutputYearRow } from "../core2/output-numbers";
import { preStartHistory } from "../core2/pre-start";
import { coreAPI } from "../core2/state";

const SEED = "599e6f66e9c1d25a";

describe("the town's labor market a year before the start", () => {
  it("is on Metrics from day one, out of one labor force, and the state keeps its year back", () => {
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    const where = `${world.place.displayName} (seed ${SEED})`;
    const core = world.core;
    const api = coreAPI(core);
    advanceCore(core, "2025-01-21" as never);
    const row = (
      view: ReturnType<typeof metricsView>,
      section: string,
      key: string,
    ) =>
      view.sections
        .find((s) => s.key === section)
        ?.rows.find((r) => r.key === key);
    const opening = metricsView(core, world.placeId);
    const employed = row(opening, "city", "employed")!;
    const seekers = row(opening, "city", "seekers")!;
    expect(employed.before, where).toBeGreaterThan(0);
    expect(seekers.before, where).toBeGreaterThanOrEqual(0);
    // A year of the economy's movement lies between them, not a copy of today.
    expect(seekers.before, where).not.toBe(seekers.now);
    // Last year and this year are out of the same labor force.
    expect(employed.before! + seekers.before!, where).toBe(
      employed.now + seekers.now,
    );
    // The year before is the registry's closed year row, citing the economy pass's month.
    const last = api
      .moduleState("world-metrics")
      .table("years")
      .get(yearRowId(world.placeId, 2024)) as OutputYearRow | undefined;
    expect(last?.closedAt, where).toBeTruthy();
    expect(last?.residentsLooking, where).toBe(seekers.before);
    expect(last?.inputs?.["labor.residents-looking"], where).toMatchObject({
      historyRecordId: expect.stringMatching(/^economy\.conditions:/),
    });
    const cited = last?.inputs?.["labor.residents-looking"]?.historyRecordId;
    expect(
      preStartHistory(core, { kind: "economy.conditions" }).some(
        (row) => row.id === cited,
      ),
      where,
    ).toBe(true);
    // The first reading is a month row, so "of" is on screen from day one.
    expect((seekers as { of?: number }).of, where).toBe(
      employed.now + seekers.now,
    );

    advanceCore(core, "2026-03-25" as never);
    const later = metricsView(core, world.placeId);
    for (const key of ["unemployment", "pay", "jobs"])
      expect(
        row(later, "state", key)?.before,
        `${where}: state.${key}`,
      ).toBeGreaterThan(0);
    for (const key of ["employed", "seekers"])
      expect(
        row(later, "city", key)?.before,
        `${where}: city.${key}`,
      ).toBeGreaterThanOrEqual(0);
  }, 400_000);
});
