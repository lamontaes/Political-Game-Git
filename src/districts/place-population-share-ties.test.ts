import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import populationData from "./place-district-population.generated.json" with { type: "json" };
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  assignSplitHomeDistricts,
  districtResidenceIntervals,
} from "../simulation/district-residence";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { factsForPerson } from "../simulation/people";
import { districtIdentityCatalog } from "./catalog";
import { districtsCrossingPlace } from "./query";
import { largestPopulationShareDistrict } from "./place-population-share";
import type { DistrictChamber } from "./types";

interface PartArea {
  squareMeters: number;
  sourcePath: string;
  sourceSha256: string;
  sourceRow: number;
  sourceUrl: string;
}
const data = populationData as unknown as {
  populations: Record<string, Record<string, number>>;
  tiePartLandAreas: Record<string, Record<string, PartArea>>;
};

describe("the surviving A144 population catalog retains recorded tie evidence", () => {
  it("matches every retained area to its locked source row and hash", () => {
    const sources = new Map<string, string[]>();
    for (const parts of Object.values(data.tiePartLandAreas))
      for (const part of Object.values(parts)) {
        if (!sources.has(part.sourcePath)) {
          const raw = readFileSync(part.sourcePath);
          expect(createHash("sha256").update(raw).digest("hex")).toBe(
            part.sourceSha256,
          );
          sources.set(
            part.sourcePath,
            raw
              .toString("utf8")
              .replace(/^\uFEFF/, "")
              .trimEnd()
              .split(/\r?\n/),
          );
        }
        const rows = sources.get(part.sourcePath)!;
        const column = rows[0]!.split("|").indexOf("AREALAND_PART");
        expect(Number(rows[part.sourceRow - 1]!.split("|")[column])).toBe(
          part.squareMeters,
        );
      }
  });

  it("saves actual tied-place placement with area evidence and the existing residence date", () => {
    const seed = "overflow8-a144-main-tie-saved";
    const place = drawRandomPlace(seed, (candidate) =>
      Object.keys(data.tiePartLandAreas).some((key) =>
        key.startsWith(`${candidate.sourceGeoid}:`),
      ),
    );
    const built = smallWorld({ seed, place: place.key });
    const residence = factsForPerson(built.world.people[built.personId]!).find(
      (fact) => fact.kind === "residence" && fact.endedAt === null,
    )!;
    const world = assignSplitHomeDistricts(built.world, built.personId);
    let checked = 0;
    for (const key of Object.keys(data.tiePartLandAreas)) {
      const [geoid, chamber] = key.split(":") as [string, DistrictChamber];
      if (geoid !== place.sourceGeoid) continue;
      const candidates = districtsCrossingPlace(
        districtIdentityCatalog(),
        geoid,
        chamber,
      );
      const selected = largestPopulationShareDistrict(
        geoid,
        chamber,
        candidates,
      )!;
      const interval = districtResidenceIntervals(world).find(
        (row) =>
          row.personId === built.personId && row.binding.chamber === chamber,
      )!;
      expect(interval.binding.geoid).toBe(selected.identity.geoid);
      expect(interval.startedOn).toBe(residence.occurredAt);
      expect(interval.provenance.note).toContain(
        "ESTIMATED FROM RECORDED PART LAND AREA",
      );
      for (const part of selected.tieBreak!.parts)
        expect(interval.provenance.note).toContain(part.sourceSha256);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
    expect(
      serializeWorld(
        assignSplitHomeDistricts(
          deserializeWorld(serializeWorld(world)),
          built.personId,
        ),
      ),
    ).toBe(serializeWorld(world));
  });

  it("opens a new game in a place drawn from all56", () => {
    const seed = "overflow8-a144-minimal-tie-opening";
    const place = drawRandomPlace(seed);
    console.log("A144 actual opening", seed, place.displayName);
    const opened = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    );
    expect(opened.game).not.toBeNull();
    expect(
      opened.game!.world.people[opened.game!.playerPersonId]!
        .homeJurisdictionId,
    ).toBe(place.context.jurisdiction.id);
  });
});
