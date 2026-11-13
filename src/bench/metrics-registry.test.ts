/**
 * The registry of output numbers in a played world (docs/design/output-numbers.md, build order
 * 1): the Metrics view is a lookup of registered figures; rent and home value are the town's
 * monthly row, not the opening's; last year is there only when a year row holds it; the count of
 * eviction notices kept on the day each is served equals a count of the cases from scratch, and
 * survives a save and a load; and the town's books are the played town's own government.
 * A drawn place and seed each run, named in every message (METRICS_SEED replays one). A place
 * where no notice is served in the months played is passed over, by name, for the next draw.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import { budgetView } from "./budget";
import { metricsView } from "./metrics";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { budgetsOf, governments } from "../core2/modules/budgets";
import { engineMeasure } from "../core2/outcome-web-model";
import {
  METRICS_SECTIONS,
  OUTPUT_NUMBERS,
  yearRowId,
  type OutputYearRow,
} from "../core2/output-numbers";
import { restoreWorld, snapshotWorld } from "../core2/snapshot";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { properName } from "../director/words";

const DRAWS = 3;
/** The game opens in January 2025; fourteen months on is the item's finish line. */
const AFTER_FOURTEEN_MONTHS = "2026-03-25";
const ONE_MORE_MONTH = "2026-04-25";

const first = process.env.METRICS_SEED ?? randomBytes(8).toString("hex");

type View = ReturnType<typeof metricsView>;
const rowOf = (view: View, section: string, key: string) =>
  view.sections.find((s) => s.key === section)?.rows.find((r) => r.key === key);

const yearRows = (core: CoreState) =>
  coreAPI(core)
    .moduleState("world-metrics")
    .table("years")
    .rows() as unknown as OutputYearRow[];

/** Notices kept on the day served, by year, summed over every place. */
function noticesKept(core: CoreState): Record<string, number> {
  const kept: Record<string, number> = {};
  for (const row of yearRows(core))
    if (typeof row.evictionNotices === "number")
      kept[row.year] = (kept[row.year] ?? 0) + row.evictionNotices;
  return kept;
}

/** The same count from scratch: every eviction case the housing engine holds, by the year of its notice. */
function noticesCounted(core: CoreState): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const row of coreAPI(core)
    .moduleState("housing")
    .table("cases")
    .rows() as unknown as { noticeAt: string }[]) {
    const year = row.noticeAt.slice(0, "YYYY".length);
    counted[year] = (counted[year] ?? 0) + 1;
  }
  return counted;
}

describe("the registry of output numbers", () => {
  it("lists every figure with its owner, unit, level, cadence, source and fold, and never a daily one", () => {
    const reserved = new Set([
      "id",
      "placeId",
      "year",
      "openedAt",
      "updatedAt",
      "closedAt",
      "monthRowId",
      "months",
      "inputs",
    ]);
    const words = controls.metrics as Record<string, string>;
    for (const row of OUTPUT_NUMBERS) {
      expect(row.owner, row.id).toBeTruthy();
      expect(row.unit, row.id).toBeTruthy();
      expect(row.denominator, row.id).toBeTruthy();
      expect(["place", "county", "state", "nation"], row.id).toContain(
        row.level,
      );
      expect(["on-change", "monthly", "yearly"], row.id).toContain(row.cadence);
      expect(["SOURCED", "ESTIMATED", "TUNABLE"], row.id).toContain(
        row.source.tag,
      );
      expect(row.source.citation, row.id).toBeTruthy();
      expect(["december", "sum", "mean"], row.id).toContain(row.fold);
      // One home for the value: world-metrics' kept row, the owner's own record, or the web's reader.
      expect(
        Boolean(row.kept) !== Boolean(row.reader) ||
          (!row.kept && !row.reader && Boolean(row.web)),
        row.id,
      ).toBe(true);
      if (row.kept) expect(reserved.has(row.kept.field), row.id).toBe(false);
      if (row.metrics) {
        expect(METRICS_SECTIONS, row.id).toContain(row.metrics.section);
        expect(words[row.metrics.section], row.id).toBeTruthy();
        expect(words[row.metrics.key], row.id).toBeTruthy();
      }
    }
    expect(new Set(OUTPUT_NUMBERS.map((row) => row.id)).size).toBe(
      OUTPUT_NUMBERS.length,
    );
  });

  it("is where the outcome web reads its engine measures", () => {
    expect(OUTPUT_NUMBERS.filter((row) => row.web).length).toBe(23);
    expect(engineMeasure("labor.unemployment-pct")).toMatchObject({
      field: "unemploymentRate",
      unitScale: 100,
    });
    expect(engineMeasure("household.poverty-pct")?.ownsOutcome).toBe(true);
    expect(engineMeasure("housing.typical-rent")).toBeUndefined();
  });
});

describe("Metrics reads the registry in a played world", () => {
  it("shows the town's own kept figures with last year, counts notices on the day, and survives a save", () => {
    const passedOver: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const seed = draw === 0 ? first : randomBytes(8).toString("hex");
      const build = () =>
        buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
      const world = build();
      const core = world.core;
      const api = coreAPI(core);
      const placeId = world.placeId;
      const where = `${world.place.displayName} (seed ${seed})`;

      // The first day: nothing has kept a year before, so no town row carries a last year.
      advanceCore(core, "2025-01-21" as never);
      const opening = metricsView(core, placeId);
      expect(
        opening.sections.map((s) => s.key),
        where,
      ).toContain("nation");
      for (const section of ["city", "housing", "evictions", "benefits"])
        for (const row of opening.sections.find((s) => s.key === section)
          ?.rows ?? [])
          expect(row.before, `${where}: ${section}.${row.key}`).toBeNull();

      advanceCore(core, AFTER_FOURTEEN_MONTHS as never);
      const counted = noticesCounted(core);
      if (!counted["2025"]) {
        passedOver.push(
          `${where}: no eviction notice served by ${AFTER_FOURTEEN_MONTHS}`,
        );
        continue;
      }
      // The count kept on the day equals the cases counted from scratch, year by year.
      expect(noticesKept(core), where).toEqual(counted);

      const view = metricsView(core, placeId);
      const months = api.moduleState("world-metrics").table("months");
      const december = months.get(`metrics:${placeId}:2025-12-02`) as
        Record<string, number> | undefined;
      const march = months.get(`metrics:${placeId}:2026-03-02`) as
        Record<string, number> | undefined;
      expect(december, where).toBeTruthy();
      expect(march, where).toBeTruthy();
      // Rent and home value are the town's monthly row, with December's beside them.
      for (const [key, field] of [
        ["rent", "medianRentMinor"],
        ["homeValue", "medianHomeValueMinor"],
      ] as const) {
        const row = rowOf(view, "housing", key);
        if (!(march![field]! > 0)) {
          expect(row, `${where}: ${key} with no figure`).toBeUndefined();
          continue;
        }
        expect(row?.now, `${where}: ${key}`).toBe(march![field]);
        expect(row?.before, `${where}: ${key} last year`).toBe(
          december![field],
        );
      }
      // The town's notices: this year so far beside last year's whole count.
      const last = api
        .moduleState("world-metrics")
        .table("years")
        .get(yearRowId(placeId, 2025)) as OutputYearRow | undefined;
      expect(last?.closedAt, where).toBe("2026-01-02");
      const evictions = rowOf(view, "evictions", "evictionNotices");
      expect(evictions?.before, where).toBe(last?.evictionNotices ?? 0);
      expect(rowOf(view, "benefits", "claims")?.now, where).toBe(
        march!.unemploymentClaimsOpen,
      );
      // The people behind the count of seekers.
      const seekers = rowOf(view, "city", "seekers") as
        { now: number; of?: number } | undefined;
      const employed = rowOf(view, "city", "employed");
      expect(seekers?.of, where).toBe(employed!.now + seekers!.now);
      // No row shows a last year that no record holds.
      for (const section of view.sections)
        for (const row of section.rows)
          expect(
            row.before === null || Number.isFinite(row.before),
            `${where}: ${section.key}.${row.key}`,
          ).toBe(true);

      // The town's books are the played town's own government, on Metrics and on the Budgets tab.
      const town = governments(api).find(
        (gov) =>
          gov.id === budgetView(core, world.playerId ?? "").townGovernmentId,
      );
      if (world.playerId) expect(town?.jurisdictionId, where).toBe(placeId);
      const own = governments(api).filter(
        (gov) => gov.jurisdictionId === placeId,
      );
      const books = [...budgetsOf(api, (own[0] ?? { id: "" }).id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0];
      // The books are headed by the name of the government they were read from.
      if (books)
        expect(
          (view.sections.find((s) => s.key === "budget") as { name?: string })
            .name,
          where,
        ).toBe(properName(own[0]!.name));
      if (books)
        expect(rowOf(view, "budget", "revenue")?.now, where).toBe(
          Object.values(books.revenueMinor).reduce((n, minor) => n + minor, 0),
        );

      // A save and a load keep the year rows, and the count goes on from them.
      const saved = snapshotWorld(core);
      const keptRows = JSON.stringify(yearRows(core));
      const loaded = build().core;
      restoreWorld(loaded, saved);
      expect(JSON.stringify(yearRows(loaded)), where).toBe(keptRows);
      advanceCore(loaded, ONE_MORE_MONTH as never);
      expect(noticesKept(loaded), where).toEqual(noticesCounted(loaded));

      process.stdout.write(
        `metrics registry: ${where}, notices ${JSON.stringify(counted)}; passed over: ${passedOver.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place served an eviction notice: ${passedOver.join("; ")}`,
    );
  }, 900_000);
});
