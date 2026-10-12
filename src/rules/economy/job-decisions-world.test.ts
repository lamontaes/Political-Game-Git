import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import * as native from "../../simulation/job-market";
import { recordWorldEvent } from "../../simulation/world";
import { createStableId } from "../../simulation/ids";
import * as own from "./job-decisions";
import { jobDecisionFacts } from "./test-support/job-decision-facts";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical applications/work/pay and answer/date controls, not ordinary NPC hiring.",
};
function date(world: World, value: string) {
  const currentDate = makeIsoDate(value);
  return {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
  };
}
function compare(world: World, personId: EntityId) {
  const facts = jobDecisionFacts(world);
  for (const id of world.personOrder)
    for (const opening of world.history.jobOpenings ?? [])
      expect(own.residentApplicationBlocked(facts, id, opening.id)).toEqual(
        native.residentApplicationBlocked(world, id, opening.id),
      );
  const expected = native.advanceApplications(world, personId),
    gen = own.advanceApplications(facts, personId);
  let current = world,
    step = gen.next();
  while (!step.done) {
    const request = step.value;
    if (request.kind === "recordWorldEvent")
      current = recordWorldEvent(current, request.input);
    else {
      const saved = expected.history.jobApplicationSteps!.find(
        (row) => row.stableKey === request.input.stableKey,
      )!;
      expect(saved).toEqual({
        ...request.input,
        id: createStableId(
          "job-application-step",
          `${current.id}:${request.input.stableKey}`,
        ),
        sequence: current.history.nextSequence,
      });
      const cutoff = saved.sequence + 1;
      const history = Object.fromEntries(
        Object.entries(expected.history).map(([key, value]) => [
          key,
          key === "nextSequence"
            ? cutoff
            : Array.isArray(value)
              ? value.filter(
                  (row) =>
                    typeof row?.sequence !== "number" || row.sequence < cutoff,
                )
              : value,
        ]),
      ) as unknown as World["history"];
      current = { ...current, history };
    }
    step = gen.next(jobDecisionFacts(current));
  }
  expect(current).toEqual(expected);
  return current;
}
describe("complete application admission/rival/offer/lapse/follow-up public parents across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 16,
          date: "2026-01-05",
          seed: "rules2:economy:job-decisions:" + usps,
        });
        let world = fixture.world;
        const adults = world.personOrder.filter(
          (id) =>
            ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
        );
        expect(adults.length).toBeGreaterThan(2);
        const applicant = adults.find(
          (id) =>
            world.control.kind !== "person" || id !== world.control.personId,
        )!;
        const staff = adults.find((id) => id !== applicant)!,
          rival = adults.find((id) => id !== applicant && id !== staff)!;
        compare(world, applicant);
        world = life.createOrganization(world, {
          stableKey: "rules2:job-decision:employer",
          formedAt: world.currentDate,
          provenance,
          initialProfile: {
            name: "Saved application employer",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        world = life.createWorkRelationship(world, {
          stableKey: "rules2:job-decision:staff",
          personId: staff,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Clerk",
            occupationClassification: "occupation:office-clerk",
            locationJurisdictionId: fixture.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 20, maximumHours: 40 },
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
          stableKey: "rules2:job-decision:pay",
          source: { kind: "organization", organizationId },
          recipient: { kind: "person", personId: staff },
          startsAt: world.currentDate,
          amount: resources.money(75000, "USD"),
          cadenceKind: "schedule:weekly",
          basisKind: "compensation:work",
          basisReference: { kind: "work", workRelationshipId: work.id },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        world = native.openWeeklyListings(world, applicant);
        const opening = world.history.jobOpenings!.find(
          (row) => row.organizationId === organizationId,
        )!;
        expect(opening).toBeDefined();
        const applied = native.applyForJobAsResident(
          world,
          applicant,
          opening.id,
        );
        expect(applied.ok).toBe(true);
        world = applied.world;
        compare(world, applicant);
        const offered = compare(date(world, "2026-01-12"), applicant);
        expect(offered.history.jobApplicationSteps!.at(-1)!.kind).toBe(
          "offered",
        );
        compare(offered, applicant);
        const lapsed = compare(date(world, "2026-02-01"), applicant);
        expect(lapsed.history.jobApplicationSteps!.at(-1)!.kind).toBe(
          "offer-lapsed",
        );
        const accepted = native.answerJobOfferAsResident(
          offered,
          offered.history.jobApplications!.at(-1)!.id,
          true,
        );
        expect(accepted.ok).toBe(true);
        const missed = compare(date(accepted.world, "2026-02-01"), applicant);
        expect(
          missed.history.jobApplicationSteps!.some(
            (row) => row.kind === "followed-up",
          ),
        ).toBe(true);
        expect(missed.history.jobApplicationSteps!.at(-1)!.kind).toBe(
          "withdrawn",
        );
        compare(missed, applicant);
        const second = native.applyForJobAsResident(world, rival, opening.id);
        expect(second.ok).toBe(true);
        const competition = compare(
          date(second.world, "2026-01-12"),
          applicant,
        );
        compare(date(competition, "2026-01-12"), rival);
      },
      30000,
    );
});
