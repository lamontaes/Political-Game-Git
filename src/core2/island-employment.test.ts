/**
 * An island area's opening employment is placed by its own 2020 Census
 * employment-by-age table (PCT47), not by the national proxy (pool item
 * research-residents-employment-island-areas, row SG-P8-resident-employment-proxy).
 * A place is drawn from the island areas on a seed nobody chose; set
 * ISLAND_EMPLOYMENT_SEED to reproduce a run.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import territories from "./data/places/territory-places.json" with { type: "json" };
import table from "./data/resident-employment-counties.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  residentEmploymentRate,
  type OpeningEmploymentAllocation,
} from "./opening-employment";

const seed =
  process.env.ISLAND_EMPLOYMENT_SEED ?? randomBytes(8).toString("hex");
const ISLAND_AREAS = ["60", "66", "69", "78"];
const AGES = [16, 20, 22, 25, 30, 35, 45, 55, 60, 62, 65, 70, 75];

describe(`island-area employment by age (run seed ${seed})`, () => {
  it("reads every island area's own rate at every working age, from its table", () => {
    const rows = table.counties as Record<string, Record<string, number[]>>;
    for (const area of ISLAND_AREAS)
      for (const age of AGES) {
        const read = residentEmploymentRate(age, area);
        const where = `island area ${area} age ${age}`;
        const [population, employed] = rows[area]![`acs-age-${age}`]!;
        expect(read, where).toBeDefined();
        expect(read!.basis, where).toMatch(/^county-ACS/);
        expect(read!.rate, where).toBeCloseTo(employed! / population!, 10);
        expect(read!.source, where).toContain("Island Areas Censuses");
      }
  });

  it("places a drawn island-area town by its own table and plays the year", () => {
    const places = territories.rows
      .filter((row) => ISLAND_AREAS.includes(String(row[4]).slice(0, 2)))
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const pick =
      places[
        parseInt(
          createHash("sha256")
            .update(`${seed}:island`)
            .digest("hex")
            .slice(0, 8),
          16,
        ) % places.length
      ]!;
    const where = `${pick[1]} (${pick[0]}), seed ${seed}`;
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: String(pick[0]),
    });
    const receipt: OpeningEmploymentAllocation["receipt"] = JSON.parse(
      core.placeMetadata.openingEmploymentReceipt!,
    );
    expect(receipt.ageTargets.length, where).toBeGreaterThan(0);
    const area = String(pick[4]).slice(0, 2);
    const rows = table.counties as Record<string, Record<string, number[]>>;
    for (const band of receipt.ageTargets) {
      // The band is placed by the island's own table: its rate is the table's employed share.
      const [population, employed] = rows[area]![band.key.split(":")[1]!]!;
      expect(band.basis, `${where} ${band.key}`).toMatch(/^county-ACS/);
      expect(band.rate, `${where} ${band.key}`).toBeCloseTo(
        employed! / population!,
        10,
      );
      expect(
        band.remaining,
        `${where} ${band.key} remaining`,
      ).toBeGreaterThanOrEqual(0);
      console.log(
        `${where}: ${band.key} rate ${band.rate.toFixed(3)} residents ${band.residents} target ${band.target} recorded ${band.recorded} added ${band.added} remaining ${band.remaining}`,
      );
    }
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 365));
    expect(core.date, where).toBe(addDays(makeIsoDate(start), 365));
  }, 1_800_000);
});
