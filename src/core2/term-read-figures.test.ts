import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { placeStateKey } from "./place-map";
import { advanceCore } from "./life";
import { countryTermRead, jurisdictionTermRead } from "./term-read";

// A state's and the country's term read from their own monthly records (owner,
// Nov 14: "it's all one simulation"): the regional module's months for a
// state, the macro module's months, real history included, for the country.
// Pinned to three named draws of one seed (`pinned-tests`).
const seed = "a7c13e";
setBookkeeping(false);

describe("a state's and the country's term read", () => {
  for (const n of [0, 1, 2])
    it(`reads jobs and prices from the records on day one, draw ${n}`, () => {
      const drawn = drawPlace(`${seed}:${n}`, "term-read-figures");
      const built = buildBenchWorld(drawn.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: drawn.key,
      });
      // The regional and macro modules write their opening months on the
      // first day's step (read at creation they are empty: pool item
      // core-regional-macro-months-open-on-first-day), so the world takes it.
      advanceCore(built.core, "2025-01-22");
      const api = coreAPI(built.core);
      const where = `${drawn.name} (${drawn.key}), seed ${seed}:${n}`;
      const state = placeStateKey(built.placeId)!;
      // A term that began two years before the game: a world in motion has
      // one behind it, and the records keep those months.
      const since = "2024-03-01";
      for (const jurisdiction of [state, "US"]) {
        const reads = jurisdictionTermRead(api, jurisdiction, since);
        const areas = reads.map((row) => row.area);
        expect(areas, `${where} ${jurisdiction}`).toContain("jobs");
        expect(areas, `${where} ${jurisdiction}`).toContain("prices");
        expect(areas, `${where} ${jurisdiction}`).toContain("pay");
        for (const row of reads.filter((read) =>
          ["jobs", "prices", "pay"].includes(read.area),
        )) {
          expect(
            row.slide,
            `${where} ${jurisdiction} ${row.area}`,
          ).toBeGreaterThanOrEqual(-1);
          expect(row.slide).toBeLessThanOrEqual(1);
          // It names the two records it compared, by id.
          expect(row.sourceRecordIds).toHaveLength(2);
          expect(row.sourceRecordIds[0]).not.toBe(row.sourceRecordIds[1]);
        }
      }
      // The country's read is its own figures where it keeps them, not the
      // mean of the towns: jobs are read from the macro months.
      const country = countryTermRead(api, since);
      const jobs = country.find((row) => row.area === "jobs")!;
      expect(
        jobs.sourceRecordIds.every((id) => id.startsWith("macro-month:")),
        where,
      ).toBe(true);
    }, 120_000);

  it("reads nothing before the records have three months to compare, and a later term moves with the world", () => {
    const drawn = drawPlace(`${seed}:0`, "term-read-figures");
    const built = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    advanceCore(built.core, "2025-01-22");
    const api = coreAPI(built.core);
    const state = placeStateKey(built.placeId)!;
    const start = String(built.core.date);
    // A term that begins today has no months to compare.
    expect(
      jurisdictionTermRead(api, state, start).find(
        (row) => row.area === "jobs",
      ),
    ).toBeUndefined();
    advanceCore(built.core, "2025-05-15");
    const later = jurisdictionTermRead(api, state, start);
    expect(later.find((row) => row.area === "jobs")).toBeDefined();
  }, 240_000);
});
