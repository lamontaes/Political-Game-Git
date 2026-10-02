import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays } from "../simulation/dates";
import {
  createOrganization,
  recordOrganizationProfile,
} from "../simulation/life";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type {
  EntityId,
  OrganizationClassification,
  World,
} from "../simulation/types";
import { projectWorld39News } from "./world39-news";

const PROVENANCE = {
  kind: "authored" as const,
  note: "Controlled saved institution profiles for the standing-news reader.",
};
const seen = new Set<string>();
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `news-institution-purpose:${index}`;
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      candidate.stateJurisdictionKey !== null &&
      !seen.has(candidate.stateJurisdictionKey),
  );
  seen.add(place.stateJurisdictionKey!);
  return { seed, place };
});
const PURPOSES = [
  ["service:school", /educat|teach/i],
  ["service:private-school", /private school|educat|teach/i],
  ["service:college", /higher education|college education/i],
  ["service:library", /books.*information|information.*books/i],
  ["service:training", /learn.*skills|skills.*learn/i],
] as const;

function institution(
  world: World,
  classification: OrganizationClassification,
  locationJurisdictionId: EntityId | null,
  key: string,
) {
  const next = createOrganization(world, {
    stableKey: `fixture:${key}`,
    formedAt: addDays(world.currentDate, -2),
    provenance: PROVENANCE,
    initialProfile: {
      name: `Fixture ${key}`,
      classification,
      locationJurisdictionId,
    },
  });
  return { world: next, organization: next.history.organizations.at(-1)! };
}

function standing(world: World, personId: EntityId) {
  return projectWorld39News(world, personId).standing.filter(
    (row) => row.kind === "institution",
  );
}

describe.each(samples)(
  "standing institution purpose in $place.displayName (seed $seed)",
  ({ seed, place }) => {
    it("explains each known service's purpose from its actual saved classification and preserves it on reload", () => {
      const fixture = smallWorld({ place: place.key, seed });
      let world = fixture.world;
      const ids = new Map<OrganizationClassification, EntityId>();
      for (const [classification] of PURPOSES) {
        const created = institution(
          world,
          classification,
          fixture.jurisdictionId,
          classification,
        );
        world = created.world;
        ids.set(classification, created.organization.id);
      }
      const before = serializeWorld(world);
      const projected = standing(world, fixture.personId);
      for (const [classification, purpose] of PURPOSES) {
        const row = projected.find(
          (candidate) => candidate.recordId === ids.get(classification),
        );
        expect(row).toBeDefined();
        expect(row!.sentence).toMatch(purpose);
        expect(row!.sentence).toContain(place.displayName);
        expect(row!.sentence).not.toContain("is a public institution");
      }
      expect(serializeWorld(world)).toBe(before);
      expect(standing(deserializeWorld(before), fixture.personId)).toEqual(
        projected,
      );
    });

    it("omits generic sectors and unrecognized services instead of asserting a public-purpose fallback", () => {
      const fixture = smallWorld({ place: place.key, seed });
      let world = fixture.world;
      const excluded: EntityId[] = [];
      for (const classification of [
        "sector:government",
        "sector:public",
        "community:civic",
        "service:unrecognized-fixture",
      ] as const) {
        const created = institution(
          world,
          classification,
          fixture.jurisdictionId,
          classification,
        );
        world = created.world;
        excluded.push(created.organization.id);
      }
      const projected = standing(world, fixture.personId);
      expect(
        projected.filter((row) => excluded.includes(row.recordId)),
      ).toEqual([]);
      expect(
        projected.some((row) =>
          row.sentence.includes("is a public institution"),
        ),
      ).toBe(false);
    });

    it("uses the profile active at the current cutoff and only claims a location actually saved on that profile", () => {
      const fixture = smallWorld({ place: place.key, seed });
      const created = institution(
        fixture.world,
        "service:school",
        fixture.stateJurisdictionId,
        "changed-profile",
      );
      const initial = created.world.history.organizationProfiles.at(-1)!;
      expect(
        standing(created.world, fixture.personId).some(
          (row) => row.recordId === created.organization.id,
        ),
      ).toBe(false);
      const world = recordOrganizationProfile(created.world, {
        stableKey: "fixture:changed-profile:current",
        organizationId: created.organization.id,
        effectiveAt: fixture.world.currentDate,
        name: "Current fixture center",
        classification: "service:library",
        locationJurisdictionId: null,
        provenance: PROVENANCE,
        supersedesProfileId: initial.id,
      });
      const projected = standing(world, fixture.personId).filter(
        (row) => row.recordId === created.organization.id,
      );
      expect(projected).toHaveLength(1);
      expect(projected[0]!.headline).toBe("Current fixture center");
      expect(projected[0]!.sentence).toMatch(
        /books.*information|information.*books/i,
      );
      expect(projected[0]!.sentence).not.toContain(place.displayName);
      expect(projected[0]!.sentence).not.toMatch(/educat|teach/i);
      expect(
        standing(
          deserializeWorld(serializeWorld(world)),
          fixture.personId,
        ).filter((row) => row.recordId === created.organization.id),
      ).toEqual(projected);
    });
  },
);
