import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import stagedPlaces from "../../tests/fixtures/scene-staged-places.json" with { type: "json" };
import { createLifeCore } from "../core2/life";
import { peopleHere } from "./scene";

const PAINTED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
const STAGES = staging.places as unknown as Record<
  string,
  { spots: { hero?: boolean }[] }
>;
const lists = (value: unknown): string[][] =>
  Array.isArray(value)
    ? value.every((row) => typeof row === "string")
      ? [value as string[]]
      : value.flatMap(lists)
    : value && typeof value === "object"
      ? Object.values(value).flatMap(lists)
      : [];

describe("place pictures", () => {
  it("preserves the measured plates and their single hero spot", () => {
    // The full-body stage is set aside. Its existing measurements still
    // have to work, including if a stage row was accidentally deleted.
    for (const place of new Set([...stagedPlaces, ...Object.keys(STAGES)])) {
      expect(PAINTED.has(place), place).toBe(true);
      const stage = STAGES[place];
      expect(stage, place).toBeDefined();
      expect(stage!.spots.length, place).toBeGreaterThanOrEqual(3);
      expect(
        stage!.spots.filter((spot) => spot.hero),
        place,
      ).toHaveLength(1);
    }
  });

  it("every painted place can show the named adult in the current bust strip", () => {
    const source = {
      tag: "SOURCED" as const,
      citation: "Controlled bust-strip fixture",
      asOf: "2021-01-01",
    };
    const core = createLifeCore(
      {
        seed: "scene-places-bust-strip",
        startedAt: "2021-01-01",
        people: [
          {
            id: "resident",
            givenName: "Fixture",
            familyName: "Resident",
            birthDate: "1988-01-01",
            gender: "female",
            placeId: "place",
            householdId: "home",
            tier: "weekly",
            traits: {},
            liquidMinor: 0,
            livingCostDailyMinor: 0,
            source,
            familyIds: [],
            knownIds: [],
          },
        ],
        households: [
          { id: "home", placeId: "place", memberIds: ["resident"], source },
        ],
        organizations: [],
        jobs: [],
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      },
      { modules: [] },
    );
    for (const row of manifest.backdrops.filter(
      (entry) => entry.variant === "midday",
    )) {
      const strip = peopleHere(core, row.file, [
        {
          id: "resident",
          name: "Fixture Resident",
          reason: "reached",
          role: "resident",
        },
      ]);
      expect(strip.people, row.place).toHaveLength(1);
      expect(strip.people[0], row.place).toMatchObject({
        personId: "resident",
        name: "Fixture Resident",
        reason: "reached",
      });
      expect(
        strip.people[0]!.face.bust.layers.length,
        row.place,
      ).toBeGreaterThan(0);
      expect(strip.more, row.place).toBe(0);
    }
  });

  it("every manifest row's picture is in the repository", () => {
    for (const row of manifest.backdrops)
      expect(
        existsSync(new URL(`../../art/backdrops/${row.file}`, import.meta.url)),
        row.file,
      ).toBe(true);
  });

  it("every list of places the scenes read has a painted picture", () => {
    const data = scenePlaces as unknown as Record<string, unknown>;
    const named = [
      "actions",
      "placesWithoutKind",
      "filingOffices",
      "sceneSettings",
      "bodyPlaces",
      "bodyPlacesBySize",
      "speechPlaces",
      "dwellingPlaces",
      "teenBedroom",
      "officialResidences",
      "officeWorkplaces",
      "situationPlaces",
      "schoolPlacesByAge",
    ].flatMap((key) => lists(data[key]));
    for (const list of named) {
      const places = list.filter((row) => !row.startsWith("@"));
      if (!places.length) continue;
      expect(
        places.some((row) => PAINTED.has(row)),
        list.join(", "),
      ).toBe(true);
    }
  });

  it("every kind of dwelling has a painted living room in each third, a kitchen and a bedroom", () => {
    const dwellings = scenePlaces.dwellingPlaces as unknown as Record<
      string,
      {
        living: Record<string, string[]>;
        kitchen: string[];
        bedroom: string[];
      }
    >;
    for (const [kind, rooms] of Object.entries(dwellings)) {
      if (kind === "about") continue;
      for (const third of ["low", "middle", "high"])
        expect(
          rooms.living[third]!.some((row) => PAINTED.has(row)),
          `${kind} ${third}`,
        ).toBe(true);
      expect(
        rooms.kitchen.some((row) => PAINTED.has(row)),
        kind,
      ).toBe(true);
      expect(
        rooms.bedroom.some((row) => PAINTED.has(row)),
        kind,
      ).toBe(true);
    }
  });
});
