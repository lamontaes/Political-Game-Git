import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import {
  organizationClosingAt,
  organizationProfileAt,
} from "../../simulation/life-queries";
import {
  townBusinesses as nativeTown,
  townBusinessEntryGaps as nativeGaps,
} from "../../simulation/living-world/town-businesses";
import { localBusinessesIn as nativeLocal } from "../../simulation/local-economy";
import {
  townBusinesses,
  townBusinessEntryGaps,
  localBusinessesIn,
} from "./business-readings";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Labeled saved business/peer controls, not spontaneous NPC entry.",
};
function compare(world: World, town: EntityId) {
  const facts = {
    currentDate: world.currentDate,
    people: world.people,
    records: world.history,
    closings: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationClosingAt(world, row.id),
      ]),
    ),
    profiles: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationProfileAt(world, row.id),
      ]),
    ),
  };
  const actualTown = townBusinesses(facts, town);
  const expectedTown = nativeTown(world, town);
  const realized = (rows: typeof actualTown) =>
    rows.map((row) => ({
      ...row,
      workplace: {
        ...row.workplace,
        name: row.workplace.name({
          family: "Saved",
          town: "Saved town",
          state: "Saved state",
          county: "Saved county",
        }),
      },
    }));
  expect(realized(actualTown)).toEqual(realized(expectedTown));
  expect(townBusinessEntryGaps(facts, town)).toEqual(nativeGaps(world, town));
  const expected = nativeLocal(world, town),
    actual = localBusinessesIn(facts, town);
  expect(
    actual.map(({ organization, kind }) => ({
      organization,
      kind: { ...kind, name: undefined },
    })),
  ).toEqual(
    expected.map(({ organization, kind }) => ({
      organization,
      kind: { ...kind, name: undefined },
    })),
  );
  for (const [index, row] of actual.entries())
    expect(row.kind.name("Saved")).toBe(expected[index]!.kind.name("Saved"));
}
describe("full town business/peer-gap and local catalog selectors across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-05",
          seed: "rules2:economy:business-readings:" + usps,
        });
        let world = fixture.world;
        compare(world, fixture.jurisdictionId);
        for (const town of [
          fixture.jurisdictionId,
          fixture.stateJurisdictionId,
        ]) {
          for (const [index, key] of [
            "retail",
            "restaurant",
            "bank",
            "unknown",
          ].entries()) {
            world = createOrganization(world, {
              stableKey: `town-employment-v1:${town}:employer:${key}:${index}`,
              formedAt: world.currentDate,
              provenance,
              initialProfile: {
                name: "Saved " + key,
                classification: "enterprise:retail",
                locationJurisdictionId: town,
              },
            });
            const organizationId = world.history.organizations.at(-1)!.id;
            world = createWorkRelationship(world, {
              stableKey: `rules2:business-readings:${town}:${index}`,
              personId: world.personOrder[index]!,
              organizationId,
              startedAt: world.currentDate,
              kind: "employment:staff",
              compensation: "paid",
              authority: index % 2 ? "directed" : "directs-others",
              dependency: "dependent",
              economicRisk: "organization-borne",
              provenance,
              initialRole: {
                title: "Saved clerk",
                occupationClassification: "occupation:office-clerk",
                locationJurisdictionId: town,
                timeDemand: {
                  expectedWeekly: { minimumHours: 20, maximumHours: 20 },
                  attention: "high",
                  concurrency: "mostly-exclusive",
                  scheduleRigidity: "mixed",
                  interruptibility: "limited",
                  locationJurisdictionId: town,
                },
              },
            });
          }
          for (const key of [
            "grocery:2",
            "grocery:1",
            "grocery",
            "hardware:1",
            "unknown:1",
            "grocery:3:extra",
            "grocery:NaN",
          ])
            world = createOrganization(world, {
              stableKey: `local-business:${town}:${key}`,
              formedAt: world.currentDate,
              provenance,
              initialProfile: {
                name: "Saved " + key,
                classification: "enterprise:retail",
                locationJurisdictionId: town,
              },
            });
          compare(world, town);
        }
        // Read-only peer home-place controls over canonical generated people and saved businesses.
        const people = { ...world.people };
        for (const id of world.personOrder.slice(0, 4))
          people[id] = {
            ...people[id]!,
            homeJurisdictionId: fixture.stateJurisdictionId,
          };
        const peerWorld = { ...world, people };
        compare(peerWorld, fixture.jurisdictionId);
        expect(
          townBusinessEntryGaps(
            {
              currentDate: peerWorld.currentDate,
              people,
              records: peerWorld.history,
              closings: new Map(
                world.history.organizations.map((row) => [
                  row.id,
                  organizationClosingAt(peerWorld, row.id),
                ]),
              ),
              profiles: new Map(
                world.history.organizations.map((row) => [
                  row.id,
                  organizationProfileAt(peerWorld, row.id),
                ]),
              ),
            },
            fixture.jurisdictionId,
          ).size,
        ).toBeGreaterThan(0);
      },
      30000,
    );
});
