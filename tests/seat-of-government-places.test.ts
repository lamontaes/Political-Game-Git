import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  lifePlaceStateIdentities,
  seatOfGovernmentPlace,
} from "../src/simulation/life-places";

interface CorpusPlace {
  readonly geoid: string;
}
interface SeatRow {
  readonly jurisdictionKey: string;
  readonly capitalName: string;
  readonly placeGeoid?: string;
  readonly placeKey?: string;
  readonly seatLocalityName?: string;
  readonly matchStatus: "known" | "estimated-territory-place";
  readonly estimateReason?: string;
  readonly capitalEvidenceUrl: string;
  readonly placeEvidenceUrl: string;
}
const ROOT = path.resolve(__dirname, "..");
const corpus = JSON.parse(
  readFileSync(path.join(ROOT, "data/source/places/corpus.json"), "utf8"),
) as readonly CorpusPlace[];
const table = JSON.parse(
  readFileSync(
    path.join(ROOT, "data/research/places/seats-of-government.json"),
    "utf8",
  ),
) as { readonly rows: readonly SeatRow[] };
const corpusGeoids = new Set(corpus.map((place) => place.geoid));

describe("seats of government stay inside their own jurisdiction", () => {
  it("covers all 56 places and Congress through the ordinary place loader", () => {
    const expected = new Set([
      ...lifePlaceStateIdentities().map(({ usps }) => `US-${usps}`),
      "US-FEDERAL",
    ]);
    expect(expected.size).toBe(57);
    expect(table.rows).toHaveLength(expected.size);
    expect(new Set(table.rows.map((row) => row.jurisdictionKey))).toEqual(
      expected,
    );
    for (const row of table.rows) {
      expect(row.capitalName).not.toBe("");
      expect(row.capitalEvidenceUrl).toMatch(/^https:\/\//);
      expect(row.placeEvidenceUrl).toMatch(/^https:\/\//);
      const loaded = seatOfGovernmentPlace(row.jurisdictionKey);
      expect(loaded, row.jurisdictionKey).not.toBeNull();
      expect(loaded!.matchStatus).toBe(row.matchStatus);
      if (row.jurisdictionKey !== "US-FEDERAL")
        expect(loaded!.place.stateJurisdictionKey).toBe(row.jurisdictionKey);
      if (row.matchStatus === "known") {
        expect(row.placeGeoid).toBeDefined();
        expect(corpusGeoids.has(row.placeGeoid!)).toBe(true);
        expect(loaded!.place.sourceGeoid).toBe(row.placeGeoid);
      } else {
        expect(loaded!.place.key).toBe(row.placeKey);
        expect(loaded!.place.sourceGeoid).toBeUndefined();
      }
    }
    expect(seatOfGovernmentPlace("unrecorded-government")).toBeNull();
  });

  it("preserves local island identities and their placeholder provenance", () => {
    const estimated = table.rows.filter(
      (row) => row.matchStatus === "estimated-territory-place",
    );
    expect(estimated.map((row) => row.jurisdictionKey).sort()).toEqual([
      "US-AS",
      "US-GU",
      "US-MP",
      "US-VI",
    ]);
    for (const row of estimated) {
      const loaded = seatOfGovernmentPlace(row.jurisdictionKey)!;
      expect(row.placeKey).toMatch(/^territory:/);
      expect(row.placeGeoid).toBeUndefined();
      expect(row.estimateReason).toContain("placeholder provenance");
      expect(loaded.place.context.jurisdiction.provenance.status).toBe(
        "placeholder",
      );
      expect(loaded.place.capabilities).toEqual({
        legislativeScenarioKey: null,
        candidacyPackId: null,
      });
      expect(loaded.place.displayName).toContain(row.seatLocalityName!);
    }
  });
});
