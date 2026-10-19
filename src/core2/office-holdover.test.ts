/**
 * The holdover table covers every one of the 56 places and every elected
 * office family, each row cited (SOURCED) or estimated with its source and
 * spread. Draws a random place; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { holdoverRule } from "./office-holdover";
import { corePlaceStateIdentities } from "./place-lookup";
import type { OfficeFamily } from "./elections-calendar";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const families: readonly OfficeFamily[] = [
  "statewideExecutive",
  "stateLegislative",
  "usHouse",
  "countyOffice",
  "municipalOffice",
];

function check(placeKey: string): void {
  for (const family of families) {
    const where = `${placeKey} ${family}, seed ${seed}`;
    const row = holdoverRule(placeKey, family);
    expect(["holds-over", "vacant"], where).toContain(row.rule);
    if (row.tag === "SOURCED") {
      expect(row.citation?.length ?? 0, where).toBeGreaterThan(10);
    } else {
      expect(row.estimatedFrom?.length ?? 0, where).toBeGreaterThan(20);
      const [low, high] = row.spread?.share ?? [];
      expect(low, where).toBeLessThan(high ?? -1);
    }
  }
}

it("gives a random place a cited or estimated rule for every office family", () => {
  const places = corePlaceStateIdentities().map((p) => p.jurisdictionKey);
  expect(places).toHaveLength(56);
  const pick = createHash("sha256").update(`${seed}|holdover`).digest()[0]!;
  check(places[pick % places.length]!);
});

it("covers all 56 places and reads a place's own row ahead of the default", () => {
  for (const { jurisdictionKey } of corePlaceStateIdentities())
    check(jurisdictionKey);
  expect(holdoverRule("US-TX", "countyOffice").basis).toBe("place");
  expect(holdoverRule("US-TX", "countyOffice").tag).toBe("SOURCED");
  expect(holdoverRule("US-OH", "countyOffice").basis).toBe("default");
  expect(holdoverRule("US-OH", "countyOffice").tag).toBe("ESTIMATED");
});
