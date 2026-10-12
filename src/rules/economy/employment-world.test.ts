import * as lifeWriters from "../../simulation/life";
import { describe, it, expect, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ageOnDate } from "../../simulation/dates";
import * as native from "../../simulation/living-world/town-employment";
import * as own from "./employment";
import { employmentFacts } from "./test-support/employment-facts";
import {
  createOrganization,
  createWorkRelationships,
} from "../../simulation/life";
import { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import type { World, EntityId } from "../../simulation/types";
export function executeEmployment(
  world: World,
  town: EntityId,
  expected: World,
  generator: Generator<
    own.EmploymentRequest,
    own.EmploymentFacts,
    own.EmploymentFacts
  >,
) {
  let current = world,
    step = generator.next();
  while (!step.done) {
    const request = step.value;
    switch (request.kind) {
      case "createOrganization":
        current = createOrganization(current, request.input);
        break;
      case "createWorkRelationships":
        current = createWorkRelationships(current, request.input);
        break;
      case "ensureLocalGovernmentOrganization":
        current = ensureLocalGovernmentOrganization(current, request.input);
        break;
    }
    step = generator.next(employmentFacts(current, town));
  }
  expect(current).toEqual(expected);
  expect(step.value).toEqual(employmentFacts(current, town));
  return current;
}
describe("full public civic/workplace/role/tenure/capacity hiring closure across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
            place: "US-" + usps,
            people: 12,
            date: "2026-01-05",
            seed: "rules2:economy:employment:" + usps,
          }),
          town = fixture.jurisdictionId;
        const open = fixture.world.personOrder.map((personId) => ({
          personId,
          age: ageOnDate(
            fixture.world.people[personId]!.birthDate,
            fixture.world.currentDate,
          ),
          enrolled: false,
          parentOfYoungChild: false,
        }));
        let world = fixture.world;
        for (const round of [null, "dated-control"]) {
          const options = { round };
          world = executeEmployment(
            world,
            town,
            native.fillTownJobs(world, town, open, options),
            own.fillTownJobs(employmentFacts(world, town), town, open, options),
          );
        }
        // Native repeats can reject a duplicate stable work key. Preserve the public error and compare the failing common writer's entire input/prefix.
        const realCreate = lifeWriters.createWorkRelationships;
        let phase: "native" | "own" = "native";
        let captured: Parameters<typeof realCreate> | undefined;
        const spy = vi
          .spyOn(lifeWriters, "createWorkRelationships")
          .mockImplementation((incoming, jobs) => {
            if (phase === "native") captured = [incoming, jobs];
            else expect([incoming, jobs]).toEqual(captured);
            return realCreate(incoming, jobs);
          });
        try {
          let message = "";
          try {
            native.fillTownJobs(world, town, open, { round: "dated-control" });
          } catch (error) {
            message = (error as Error).message;
          }
          expect(message).toContain(
            "work relationship stable key already exists",
          );
          phase = "own";
          expect(() =>
            executeEmployment(
              world,
              town,
              world,
              own.fillTownJobs(employmentFacts(world, town), town, open, {
                round: "dated-control",
              }),
            ),
          ).toThrow(message);
        } finally {
          spy.mockRestore();
        }
        const facts = employmentFacts(world, town);
        expect(own.townWorkplaceWeights(facts, town)).toEqual(
          native.townWorkplaceWeights(town),
        );
        expect(own.townEmploymentMix(facts, town)).toEqual(
          native.townEmploymentMix(town),
        );
        executeEmployment(
          world,
          town,
          native.fillTownJobs(world, town, [], { round: "empty-control" }),
          own.fillTownJobs(facts, town, [], { round: "empty-control" }),
        );
        const organization =
          world.history.organizations.find((row) =>
            row.stableKey.includes(":employer:retail:"),
          ) ?? world.history.organizations[0]!;
        for (const flags of [
          { enrolled: true, parentOfYoungChild: false },
          { enrolled: false, parentOfYoungChild: true },
        ]) {
          const controls = open.map((row) => ({ ...row, ...flags })),
            options = {
              round: "life-hours-control:" + JSON.stringify(flags),
              into: { workplace: "retail", organizationId: organization.id },
            };
          executeEmployment(
            world,
            town,
            native.fillTownJobs(world, town, controls, options),
            own.fillTownJobs(facts, town, controls, options),
          );
        }
        const civicOptions = {
          round: "named-funded-control",
          into: {
            workplace: "public-school",
            organizationId: organization.id,
            role: "Teacher",
          },
        };
        executeEmployment(
          world,
          town,
          native.fillTownJobs(world, town, open, civicOptions),
          own.fillTownJobs(facts, town, open, civicOptions),
        );
      },
      60000,
    );
});
