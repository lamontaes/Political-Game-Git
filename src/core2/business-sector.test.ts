import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { DEFAULT_BUSINESS_BOOKS_DATA, sectorOfKind } from "./business-books";
import { COUNTRY_SECTORS } from "./country-model";
import { gameStartDate } from "./game-start";

// Every kind of business belongs to one of the country tier's sectors, and every business in a
// drawn place's town resolves to one through its kind. Place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.BUSINESS_SECTOR_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a business kind has a country sector (seed ${seed})`, () => {
  it("gives every kind a sector from the tier's own list, with its reason", () => {
    const sectors: readonly string[] = COUNTRY_SECTORS;
    for (const kind of DEFAULT_BUSINESS_BOOKS_DATA.kinds) {
      if (kind.id === "*") {
        expect(sectorOfKind(kind.id), "fallback row").toBeNull();
        continue;
      }
      expect(kind.sector, `kind ${kind.id}`).not.toBeNull();
      expect(sectors, `kind ${kind.id} sector ${kind.sector}`).toContain(
        kind.sector,
      );
      expect(
        kind.sectorSource.length,
        `kind ${kind.id} source`,
      ).toBeGreaterThan(40);
      expect(sectorOfKind(kind.id)).toBe(kind.sector);
    }
  });

  it("counts a drawn town's businesses by sector, none left without one", () => {
    const draw = drawPlace(seed, "business-sector");
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const books = [...world.core.finance.businesses.values()];
    expect(books.length, `${where}: the town holds businesses`).toBeGreaterThan(
      0,
    );
    const counts = new Map<string, number>();
    for (const book of books) {
      const sector = sectorOfKind(book.kindId);
      expect(
        sector,
        `${where}: business of kind ${book.kindId}`,
      ).not.toBeNull();
      counts.set(sector!, (counts.get(sector!) ?? 0) + 1);
    }
    const line = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([s, n]) => `${s} ${n}`)
      .join(", ");
    process.stdout.write(
      `business-sector ${where}: ${books.length} businesses, all with a sector: ${line}\n`,
    );
    expect(
      [...counts.values()].reduce((a, b) => a + b, 0),
      where,
    ).toBe(books.length);
  });
});
