/**
 * The registry of output numbers in a played world (docs/design/output-numbers.md, build order
 * 1): the Metrics view is a lookup of registered figures; rent and home value are the town's
 * monthly row, not the opening's; last year is there only when a year row holds it; the count of
 * eviction notices kept on the day each is served equals a count of the cases from scratch, and
 * survives a save and a load; and the town's books are the played town's own government.
 * A drawn place and seed each run, named in every message (METRICS_SEED replays one). A place
 * where no notice is served in the months played is passed over, by name, for the next draw.
 */
import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import { budgetView } from "./budget";
import { metricsView } from "./metrics";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { governmentProperName } from "../core2/government-proper-name";
import { advanceCore } from "../core2/life";
import { budgetsOf, governments } from "../core2/modules/budgets";
import { townGovernment } from "../core2/output-number-readers";
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

/**
 * Time in these tests is the game's own played days, which is the one reason
 * a test here runs longer than a minute: a played year of a town takes 75 to
 * 200 seconds on this machine (Everett, Georgia the least), and the finish
 * line needs fourteen months of one place. Each limit is about twice the time
 * measured on Nov 14, 2026 for that test.
 */
/** The game opens in January 2025; fourteen months on is the item's finish line. */
const AFTER_FOURTEEN_MONTHS = "2026-03-25";
/** The small-town check plays only three months. */
const THREE_MONTHS = "2025-04-25";
const ONE_MORE_MONTH = "2026-04-25";

/**
 * The second place, pinned: Everett, Georgia, the smallest town measured. It
 * serves eviction notices in the months played (111 in 2025); if it stops
 * serving them the test fails and says so, it does not look at another place.
 */
const first = process.env.METRICS_SEED ?? "7a5e19c2b3d84f60";
/**
 * Fananganan, Northern Mariana Islands: a territory, and a territory's places
 * have no town government in the game. This follows the owner's ruling (Nov 14)
 * that territories get local government after early access, with a notice, so
 * Metrics has no budget section there. Plays three months (45 seconds).
 */
const TERRITORY_SEED = "9ca49eb7074e5581";
/**
 * A named replay beside the draw: Washington, Kansas serves notices in the
 * start year, where a pre-start pass's mark on the start year's row once read
 * them as unknown (Train, Nov 14, 2026).
 */
const NOTICES_IN_START_YEAR = "599e6f66e9c1d25a";

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
  // Each plays fifteen months of one place: fourteen to the finish line, one more after a save and a load.
  // Measured Nov 14, 2026: Washington 241 s, Everett 126 s; the limits are about twice those.
  for (const start of [NOTICES_IN_START_YEAR, first])
    it(
      `shows the town's own kept figures with last year, counts notices on the day, and survives a save, from seed ${start}`,
      () => {
        {
          const seed = start;
          const build = () =>
            buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
          const world = build();
          const core = world.core;
          const api = coreAPI(core);
          const placeId = world.placeId;
          const where = `${world.place.displayName} (seed ${seed})`;

          // The first day: housing's past ran before the start (src/core2/housing-past.ts),
          // so rent and home value carry last year; no other town row has kept a year.
          advanceCore(core, "2025-01-21" as never);
          const opening = metricsView(core, placeId);
          expect(
            opening.sections.map((s) => s.key),
            where,
          ).toContain("nation");
          for (const section of ["city", "housing", "evictions", "benefits"])
            for (const row of opening.sections.find((s) => s.key === section)
              ?.rows ?? [])
              if (
                (section === "housing" &&
                  (row.key === "rent" || row.key === "homeValue")) ||
                (section === "city" &&
                  (row.key === "employed" || row.key === "seekers"))
              )
                expect(
                  row.before,
                  `${where}: ${section}.${row.key}`,
                ).toBeGreaterThanOrEqual(0);
              else if (section === "city" && row.key === "openPositions")
                // The jobs open a year before follow the seekers; with no one looking there are none to read.
                expect(
                  row.before === null || row.before >= 0,
                  `${where}: openPositions`,
                ).toBe(true);
              else
                expect(
                  row.before,
                  `${where}: ${section}.${row.key}`,
                ).toBeNull();

          advanceCore(core, AFTER_FOURTEEN_MONTHS as never);
          const counted = noticesCounted(core);
          expect(
            counted["2025"],
            `${where}: no eviction notice served by ${AFTER_FOURTEEN_MONTHS}`,
          ).toBeGreaterThan(0);
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
          // People and homes (build order metrics-people-and-homes-by-year): each is the town's monthly
          // row with December's beside it, the named and counted people behind the count add up to it,
          // and the housing engine's own stock and the homeless count's record are what the row holds.
          const homes = api
            .moduleState("housing")
            .table("stock")
            .get(`stock:${placeId}`) as
            { rentalUnits: number; vacantRental: number } | undefined;
          for (const [section, key, field] of [
            ["city", "people", "people"],
            ["city", "households", "households"],
            ["city", "employed", "residentsAtWork"],
            ["city", "seekers", "residentsLooking"],
            ["city", "openPositions", "openPositions"],
            ["housing", "rentals", "rentalUnits"],
            ["housing", "vacant", "vacantRentals"],
            ["housing", "homeless", "peopleWithoutHome"],
          ] as const) {
            const row = rowOf(view, section, key);
            if (typeof march![field] !== "number") {
              expect(row, `${where}: ${key} with no record`).toBeUndefined();
              continue;
            }
            expect(row?.now, `${where}: ${key}`).toBe(march![field]);
            if (typeof december![field] === "number")
              expect(row?.before, `${where}: ${key} last year`).toBe(
                december![field],
              );
          }
          expect(march!.people, where).toBe(
            march!.peopleNamed! + march!.peopleCounted!,
          );
          expect(march!.rentalUnits, where).toBe(homes?.rentalUnits);
          expect(
            api
              .moduleState("core2-homeless-count-v1")
              .table("counts")
              .get(placeId),
            where,
          ).toMatchObject({ homeless: march!.peopleWithoutHome });
          // The state's figures keep the month a year back, so each has last year from the second year on.
          for (const key of ["unemployment", "pay", "jobs"])
            expect(
              rowOf(view, "state", key)?.before,
              `${where}: state.${key} last year`,
            ).toBeGreaterThan(0);
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
              gov.id ===
              budgetView(core, world.playerId ?? "").townGovernmentId,
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
              (
                view.sections.find((s) => s.key === "budget") as {
                  name?: string;
                }
              ).name,
              where,
            ).toBe(governmentProperName(own[0]!.name, own[0]!.id));
          if (books)
            expect(rowOf(view, "budget", "revenue")?.now, where).toBe(
              Object.values(books.revenueMinor).reduce(
                (n, minor) => n + minor,
                0,
              ),
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
            `metrics registry: ${where}, people and homes now/last year ${JSON.stringify(
              ["people", "households", "rentals", "vacant", "homeless"].map(
                (key) => [
                  key,
                  (rowOf(view, "city", key) ?? rowOf(view, "housing", key))
                    ?.now,
                  (rowOf(view, "city", key) ?? rowOf(view, "housing", key))
                    ?.before,
                ],
              ),
            )}, notices ${JSON.stringify(counted)}\n`,
          );
          return;
        }
      },
      start === NOTICES_IN_START_YEAR ? 500_000 : 260_000,
    );

  it("a territory's town has no government of its own, so Metrics has no budget section", () => {
    const world = buildBenchWorld(TERRITORY_SEED, gameStartDate(), {
      twoLevel: true,
    });
    const where = `${world.place.displayName} (seed ${TERRITORY_SEED})`;
    // Three months are enough: the budget section reads the town's own books.
    advanceCore(world.core, THREE_MONTHS as never);
    const api = coreAPI(world.core);
    expect(townGovernment(api, world.placeId), where).toBeUndefined();
    const view = metricsView(world.core, world.placeId);
    expect(
      view.sections.find((section) => section.key === "budget"),
      where,
    ).toBeUndefined();
  }, 90_000);

  /** A drawn small town (seed fixed so the town stays a few hundred people at most). */
  it("shows a small town's own count, and an empty figure as a zero from the engine's record", () => {
    const seed = process.env.METRICS_SMALL_SEED ?? "7a5e19c2b3d84f60";
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const where = `${world.place.displayName} (seed ${seed})`;
    // Three months are enough for the equalities; last year is covered above.
    advanceCore(world.core, THREE_MONTHS as never);
    const api = coreAPI(world.core);
    const view = metricsView(world.core, world.placeId);
    const march = api
      .moduleState("world-metrics")
      .table("months")
      .get(`metrics:${world.placeId}:2025-04-02`) as
      Record<string, number> | undefined;
    const people = rowOf(view, "city", "people");
    // The town's own count: named people plus the counted ones, never a county or blended figure.
    expect(people?.now, where).toBe(
      march!.peopleNamed! + march!.peopleCounted!,
    );
    expect(people!.now, `${where}: a small town`).toBeLessThan(1000);
    const stock = api
      .moduleState("housing")
      .table("stock")
      .get(`stock:${world.placeId}`) as
      { rentalUnits: number; vacantRental: number } | undefined;
    const count = api
      .moduleState("core2-homeless-count-v1")
      .table("counts")
      .get(world.placeId) as { homeless: number } | undefined;
    // A figure the engine holds as zero is a zero row, never a missing one.
    if (stock) {
      expect(rowOf(view, "housing", "rentals")?.now, where).toBe(
        stock.rentalUnits,
      );
      expect(rowOf(view, "housing", "vacant")?.now, where).toBe(
        stock.vacantRental,
      );
    }
    if (count)
      expect(rowOf(view, "housing", "homeless")?.now, where).toBe(
        count.homeless,
      );
    process.stdout.write(
      `metrics small town: ${where}, people ${people!.now}, rentals ${stock?.rentalUnits}, homeless ${count?.homeless}\n`,
    );
  }, 70_000);
});
