import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { scanPlaceholders } from "../scripts/research/placeholder-scan";

/**
 * Spec 3 (every part of a bill does something) and spec 12 (what each level
 * of government can change) of 04 SYSTEM SPECS. The lever table must cover
 * every kind of part the enacted sample uses, the catalog every level and
 * subject area, and the placeholder ledger every PLACEHOLDER on a money or
 * law path in the code.
 */
const root = path.resolve(__dirname, "..");
const read = (file: string) =>
  JSON.parse(readFileSync(path.join(root, file), "utf8"));

const LEVERS = [
  "money",
  "rate",
  "who-qualifies",
  "rule",
  "structure",
  "process",
];

interface SamplePart {
  readonly kind: string;
}
interface SampleMeasure {
  readonly id: string;
  readonly level: string;
  readonly parts: readonly SamplePart[];
}

function samples(): SampleMeasure[] {
  const dir = path.join(root, "data/research/bill-samples");
  return readdirSync(dir).flatMap((level) =>
    readdirSync(path.join(dir, level))
      .filter((name) => name.endsWith(".json"))
      .flatMap(
        (name) =>
          JSON.parse(
            readFileSync(path.join(dir, level, name), "utf8"),
          ) as SampleMeasure[],
      ),
  );
}

describe("the lever table", () => {
  const table = read("data/research/levers/lever-table.json");
  const measures = samples();

  it("maps every kind of part in the enacted sample, and only those, to one lever", () => {
    const kinds = new Set(
      measures.flatMap((measure) => measure.parts.map((part) => part.kind)),
    );
    const mapped = table.parts.map((row: { part: string }) => row.part);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...mapped].sort()).toEqual([...kinds].sort());
    expect(kinds.size).toBe(61);
    for (const row of table.parts) {
      expect(LEVERS).toContain(row.lever);
      expect(row.recordItChanges.length).toBeGreaterThan(0);
      expect(row.fiscalNote.length).toBeGreaterThan(0);
      expect(["partial", "none"]).toContain(row.effectWriter);
    }
    expect(Object.keys(table.levers).sort()).toEqual([...LEVERS].sort());
  });

  it("carries the sample's own counts", () => {
    for (const row of table.parts) {
      const using = measures.filter((measure) =>
        measure.parts.some((part) => part.kind === row.part),
      );
      const parts = measures.reduce(
        (sum, measure) =>
          sum + measure.parts.filter((part) => part.kind === row.part).length,
        0,
      );
      expect(row.sample.measures, row.part).toBe(using.length);
      expect(row.sample.parts, row.part).toBe(parts);
      expect(row.sample.levels).toEqual(
        [...new Set(using.map((measure) => measure.level))].sort(),
      );
    }
  });
});

describe("the powers catalog", () => {
  const catalog = read("data/research/powers-catalog/catalog.json");

  it("gives every dial a cell at all eight levels", () => {
    expect(catalog.levels).toEqual([
      "federal",
      "state",
      "dc",
      "territory",
      "county",
      "city",
      "school-district",
      "special-district",
    ]);
    const ids = catalog.dials.map((dial: { id: string }) => dial.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const dial of catalog.dials) {
      expect(Object.keys(dial.levels), dial.id).toEqual(catalog.levels);
      expect(LEVERS).toContain(dial.lever);
    }
  });

  it("covers all 18 subject areas", () => {
    expect(Object.keys(catalog.areas)).toHaveLength(18);
    const covered = new Set(
      catalog.dials.map((dial: { area: string }) => dial.area),
    );
    expect([...covered].sort()).toEqual(Object.keys(catalog.areas).sort());
  });

  it("never treats an unknown as permission, and cites what it calls sourced", () => {
    for (const dial of catalog.dials)
      for (const [level, cell] of Object.entries(dial.levels) as [
        string,
        {
          may: string;
          status: string;
          source?: string;
          question?: string;
        },
      ][]) {
        const where = `${dial.id} at ${level}`;
        expect(["sourced", "game-profile", "UNKNOWN"], where).toContain(
          cell.status,
        );
        expect(
          ["yes", "no", "limited", "varies by state", "UNKNOWN"],
          where,
        ).toContain(cell.may);
        if (cell.status === "sourced") {
          expect(cell.source, where).toBeTruthy();
          expect(
            existsSync(path.join(root, cell.source!.split("#")[0]!)),
            where,
          ).toBe(true);
        } else expect(cell.question, where).toBeTruthy();
        if (cell.status === "UNKNOWN") expect(cell.may, where).not.toBe("yes");
      }
  });
});

describe("the placeholder ledger", () => {
  const ledger = read("data/research/powers-catalog/placeholder-ledger.json");

  it("lists every PLACEHOLDER on a money or law path in the code", () => {
    const held = new Set(
      ledger.markers.map(
        (marker: { file: string; text: string }) =>
          `${marker.file}\n${marker.text}`,
      ),
    );
    const missing = scanPlaceholders(root)
      .filter((marker) => marker.path === "money" || marker.path === "law")
      .filter((marker) => !held.has(`${marker.file}\n${marker.text}`))
      .map((marker) => `${marker.file}:${marker.line}`);
    expect(
      missing,
      "run node --import tsx scripts/research/placeholder-ledger.ts",
    ).toEqual([]);
  });
});
