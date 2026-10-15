/** The credit engine names no place in logic: island-area facts are a data table read by one rule (audit defect 22). */
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import regions from "./data/regional/regions.json" with { type: "json" };
import territories from "./data/credit/territories.json" with { type: "json" };
import { townBankFor } from "./modules/credit";
import { coreSeatOfGovernmentPlace } from "./place-lookup";
import type { CoreInput } from "./types";

describe("credit territories live in data", () => {
  it("credit.ts holds no place code or county code", () => {
    const source = readFileSync("src/core2/modules/credit.ts", "utf8");
    expect(source).not.toMatch(/["']US-[A-Z]{2}["']/);
    for (const row of territories.territories)
      expect(source).not.toContain(`"${row.stateFips}"`);
  });

  it("the table matches the territories the regional data knows, each sourced", () => {
    expect(territories.source.tag).toBe("SOURCED");
    const known = (
      regions.regions as {
        kind: string;
        stateFips: string;
        stateUsps: string;
      }[]
    )
      .filter((row) => row.kind === "territory")
      .map((row) => `US-${row.stateUsps}:${row.stateFips}`)
      .sort();
    expect(
      territories.territories
        .map((row) => `${row.stateJurisdictionKey}:${row.stateFips}`)
        .sort(),
    ).toEqual(known);
  });

  it("a random territory town still gets its credit terms", () => {
    const keys = territories.territories.map((row) => row.stateJurisdictionKey);
    const key = keys[randomInt(keys.length)]!;
    const town = coreSeatOfGovernmentPlace(key)!.place;
    const input = {
      placeMetadata: { placeKey: town.key },
      people: Array.from({ length: 50 }, (_, i) => ({ id: `p${i}` })),
      organizations: [{ id: "organization:shop", placeId: "place:test" }],
    } as unknown as CoreInput;
    const bank = townBankFor(input);
    expect(bank, `${town.key} ${key}`).toBeDefined();
    expect(bank!.depositsMinor).toBeGreaterThan(0);
  });
});
