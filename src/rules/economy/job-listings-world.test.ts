import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import * as native from "../../simulation/job-market";
import { ensureHomeLocalGovernments } from "../../simulation/nationwide-world/local-governments";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import * as own from "./job-listings";
import { jobListingFacts } from "./test-support/job-listing-facts";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical roles/pay/turnover/listing controls, not ordinary NPC recruitment.",
};
/** Bounded append-draft proof against public-parent saved prefixes, not a parallel writer or core2 integration. */
function compare(world: World, personId: EntityId) {
  const facts = jobListingFacts(world);
  expect(own.townEmployerRoles(facts, personId)).toEqual(
    native.townEmployerRoles(world, personId),
  );
  const expected = native.openWeeklyListings(world, personId);
  const generator = own.openWeeklyListings(facts, personId);
  let current = world,
    step = generator.next();
  while (!step.done) {
    const input = step.value.input;
    const saved = expected.history.jobOpenings!.find(
      (row) => row.stableKey === input.stableKey,
    );
    expect(saved).toEqual({
      ...input,
      id: createStableId("job-opening", `${current.id}:${input.stableKey}`),
      sequence: current.history.nextSequence,
    });
    const cutoff = saved!.sequence + 1;
    const projected = Object.fromEntries(
      Object.entries(expected.history).map(([key, value]) => [
        key,
        key === "nextSequence"
          ? cutoff
          : Array.isArray(value)
            ? value.filter(
                (row) =>
                  typeof row?.sequence !== "number" ||
                  row.sequence < cutoff ||
                  (
                    (Object.entries(world.history).find(
                      ([field]) => field === key,
                    )?.[1] ?? []) as readonly { id?: EntityId }[]
                  ).some((original) => original.id === row.id),
              )
            : value,
      ]),
    ) as unknown as World["history"];
    current = { ...current, history: projected };
    step = generator.next(jobListingFacts(current));
  }
  expect(current).toEqual(expected);
  for (const opening of expected.history.jobOpenings ?? [])
    expect(
      own.openingTakesApplications(jobListingFacts(expected), opening),
    ).toEqual(native.openingTakesApplications(expected, opening));
  return expected;
}
describe("complete employer roles and weekly listing Native public parents across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-05",
          seed: "rules2:economy:job-listings:" + usps,
        });
        const personId = fixture.world.personOrder[0]!;
        let world = fixture.world;
        compare(world, personId);
        world = ensureHomeLocalGovernments(world, personId);
        compare(world, personId);
        world = life.createOrganization(world, {
          stableKey: "rules2:listings:employer",
          formedAt: world.currentDate,
          provenance,
          initialProfile: {
            name: "Saved local role employer",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        for (let i = 1; i < 4; i++) {
          const worker = world.personOrder[i]!;
          world = life.createWorkRelationship(world, {
            stableKey: "rules2:listings:staff:" + i,
            personId: worker,
            organizationId,
            startedAt: world.currentDate,
            kind: "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: i === 3 ? "Engineer" : "Clerk",
              occupationClassification:
                i === 3 ? "profession:engineer" : "occupation:office-clerk",
              locationJurisdictionId: fixture.jurisdictionId,
              timeDemand: {
                expectedWeekly: { minimumHours: 37, maximumHours: 40 },
                attention: "high",
                concurrency: "mostly-exclusive",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: fixture.jurisdictionId,
              },
            },
          });
          const work = world.history.workRelationships.at(-1)!;
          world = resources.createResourceFlow(world, {
            stableKey: "rules2:listings:pay:" + i,
            source: { kind: "organization", organizationId },
            recipient: { kind: "person", personId: worker },
            startsAt: world.currentDate,
            amount: resources.money(50000 + i * 10000, "USD"),
            cadenceKind: "schedule:weekly",
            basisKind: "compensation:work",
            basisReference: { kind: "work", workRelationshipId: work.id },
            restrictionKind: null,
            jurisdictionId: fixture.jurisdictionId,
            provenance,
          });
        }
        world = compare(world, personId);
        expect(
          world.history.jobOpenings!.filter(
            (row) => row.organizationId === organizationId,
          ),
        ).toHaveLength(2);
        compare(world, personId);
        const later = {
          ...world,
          currentDate: makeIsoDate("2029-06-01"),
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            makeIsoDate("2029-06-01"),
          ),
        };
        const relisted = compare(later, personId);
        expect(relisted.history.jobOpenings!.length).toBeGreaterThan(
          world.history.jobOpenings!.length,
        );
        const newOffers = relisted.history.jobOpenings!.filter(
          (row) =>
            row.opensAt === later.currentDate &&
            row.organizationId === organizationId,
        );
        expect(newOffers).toHaveLength(2);
        expect(
          newOffers.some(
            (row) =>
              row.pay.amount.minorUnits >
              world.history.jobOpenings!.find(
                (old) =>
                  old.organizationId === organizationId &&
                  old.title === row.title,
              )!.pay.amount.minorUnits,
          ),
        ).toBe(true);
        const rawFrontier = {
          ...later,
          history: {
            ...later.history,
            workRoles: later.history.workRoles.map((row) =>
              row.title === "Clerk"
                ? {
                    ...row,
                    title: "Future-role control",
                    effectiveAt: makeIsoDate("2029-12-31"),
                    sequence: later.history.nextSequence + 10,
                  }
                : row,
            ),
          },
        };
        compare(rawFrontier, personId);
      },
      30000,
    );
});
