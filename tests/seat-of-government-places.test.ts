import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  lifePlaceStateIdentities,
  seatOfGovernmentPlace,
} from "../src/simulation/life-places";

interface CorpusPlace {
  readonly geoid: string;
  readonly interiorPoint: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

interface SeatRow {
  readonly jurisdictionKey: string;
  readonly capitalName: string;
  readonly placeGeoid: string;
  readonly matchStatus: "known" | "estimated-nearest-gazetteer-row";
  readonly capitalInteriorPoint?: {
    readonly latitude: number;
    readonly longitude: number;
  };
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
const corpusByGeoid = new Map(corpus.map((place) => [place.geoid, place]));

function distanceRadians(
  left: { readonly latitude: number; readonly longitude: number },
  right: { readonly latitude: number; readonly longitude: number },
): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = (right.longitude - left.longitude) * radians;
  const leftLatitude = left.latitude * radians;
  const rightLatitude = right.latitude * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(haversine));
}

describe("seats of government are ordinary Census places", () => {
  it("covers every state, D.C., territory, and Congress with a corpus GEOID", () => {
    const expected = new Set([
      ...lifePlaceStateIdentities().map(({ usps }) => `US-${usps}`),
      "US-FEDERAL",
    ]);
    expect(expected.size).toBe(57);
    expect(new Set(table.rows.map((row) => row.jurisdictionKey))).toEqual(
      expected,
    );

    for (const row of table.rows) {
      expect(row.capitalName).not.toBe("");
      expect(row.capitalEvidenceUrl).toMatch(/^https:\/\//);
      expect(row.placeEvidenceUrl).toMatch(/^https:\/\//);
      expect(corpusByGeoid.has(row.placeGeoid)).toBe(true);

      const loaded = seatOfGovernmentPlace(row.jurisdictionKey);
      expect(loaded?.place.sourceGeoid).toBe(row.placeGeoid);
      expect(loaded?.matchStatus).toBe(row.matchStatus);
    }
  });

  it("marks every substitute and chooses the nearest Gazetteer row", () => {
    const estimated = table.rows.filter(
      (row) => row.matchStatus === "estimated-nearest-gazetteer-row",
    );
    expect(estimated.map((row) => row.jurisdictionKey).sort()).toEqual([
      "US-AS",
      "US-GU",
      "US-MP",
      "US-VI",
    ]);

    for (const row of estimated) {
      expect(row.estimateReason).toContain("geographically nearest");
      expect(row.capitalInteriorPoint).toBeDefined();
      const chosen = corpusByGeoid.get(row.placeGeoid)!;
      const chosenDistance = distanceRadians(
        row.capitalInteriorPoint!,
        chosen.interiorPoint,
      );
      const minimum = Math.min(
        ...corpus.map((place) =>
          distanceRadians(row.capitalInteriorPoint!, place.interiorPoint),
        ),
      );
      expect(chosenDistance).toBeCloseTo(minimum, 12);
    }
  });
});
