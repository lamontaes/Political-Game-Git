import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import mixData from "../../src/core2/data/household-mix.json" with { type: "json" };

/**
 * What kinds of households a town has is a data file, and this is its lock:
 * the two locked Census extracts in `data/source/acs-household-mix/raw/` (U.S.
 * Census Bureau, 2020-2024 American Community Survey 5-year, tables B11001 and
 * B11003) are hashed against their lock, and every row is derived from them
 * again and must match the file. A geography with no households, or whose
 * cells were withheld, is left out.
 *
 * How the tables map to the five shapes (every household lands in exactly one):
 *   alone                 B11001 living alone
 *   couple                B11003 married-couple family, no own children under 18
 *   couple-with-children  B11003 married-couple family, own children under 18
 *   parent-with-children  B11003 one householder, no spouse, own children under 18
 *   housemates            B11001 nonfamily, not living alone, plus B11003 other
 *                         family with no own children under 18 (siblings,
 *                         a grown child with a parent)
 */

const RAW = "data/source/acs-household-mix/raw";
const LOCK = "data/source/acs-household-mix/regional-artifact-lock.json";

function table(name: string): Map<string, Map<string, number | null>> {
  const lines = readFileSync(`${RAW}/acsdt5y2024-${name}.dat`, "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
  const header = lines[0]!.split("|");
  const rows = new Map<string, Map<string, number | null>>();
  for (const line of lines.slice(1)) {
    const cells = line.split("|");
    const cell = new Map<string, number | null>();
    header.forEach((column, index) => {
      if (!column.includes("_E")) return;
      const raw = cells[index] ?? "";
      cell.set(column, /^\d+$/.test(raw) ? Number(raw) : null);
    });
    rows.set(cells[0]!, cell);
  }
  return rows;
}

const key = (geoId: string): string | null => {
  if (geoId === "0100000US") return "US";
  const state = /^0400000US(\d{2})$/.exec(geoId);
  if (state) return state[1]!;
  const place = /^1600000US(\d{7})$/.exec(geoId);
  return place ? place[1]! : null;
};

function derivedRows(): { rows: (string | number)[][]; withheld: number } {
  const b11001 = table("b11001");
  const b11003 = table("b11003");
  const entries: (string | number)[][] = [];
  let withheld = 0;
  for (const geoId of [...b11001.keys()].sort()) {
    const name = key(geoId);
    if (!name) continue;
    const a = b11001.get(geoId)!;
    const f = b11003.get(geoId);
    const cells = f
      ? [
          a.get("B11001_E008"),
          a.get("B11001_E009"),
          f.get("B11003_E003"),
          f.get("B11003_E007"),
          f.get("B11003_E010"),
          f.get("B11003_E016"),
          f.get("B11003_E014"),
          f.get("B11003_E020"),
        ]
      : [];
    if (cells.length === 0 || cells.some((cell) => cell == null)) {
      withheld += 1;
      continue;
    }
    const [
      alone,
      notAlone,
      coupleKids,
      couple,
      maleKids,
      femaleKids,
      ...other
    ] = cells as number[];
    const shapes = [
      alone!,
      couple!,
      coupleKids!,
      maleKids! + femaleKids!,
      notAlone! + other.reduce((sum, n) => sum + n, 0),
    ];
    if (shapes.reduce((sum, n) => sum + n, 0) <= 0) {
      withheld += 1;
      continue;
    }
    entries.push([name, ...shapes]);
  }
  return { rows: entries, withheld };
}

describe("the household mix data file", () => {
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as {
    asOf: string;
    artifacts: { sha256: string; localPath: string }[];
  };

  it("is locked to the Census extracts it was derived from", () => {
    for (const artifact of lock.artifacts)
      expect(
        createHash("sha256")
          .update(readFileSync(artifact.localPath))
          .digest("hex"),
        artifact.localPath,
      ).toBe(artifact.sha256);
    expect(mixData.meta.lockedSha256).toEqual(
      lock.artifacts.map((artifact) => artifact.sha256),
    );
    expect(mixData.meta.asOf).toBe(lock.asOf);
  });

  it("holds exactly the rows the extracts derive", () => {
    const { rows, withheld } = derivedRows();
    // Proves the comparison has something to compare.
    expect(rows.length).toBeGreaterThan(30000);
    expect(mixData.rows).toEqual(rows);
    expect(mixData.meta.geographies).toBe(rows.length);
    expect(mixData.meta.withheld).toBe(withheld);
  });
});
