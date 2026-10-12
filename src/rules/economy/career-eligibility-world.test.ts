import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  LIFE_PATHS2_CATALOG,
  lifePathDefinition,
} from "../../simulation/life-paths2-catalog";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import {
  careerEligibility as nativeEligibility,
  seekCareerOffer,
  respondCareerOffer,
} from "../../simulation/career-path7";
import { careerEligibility, type CareerProvider } from "./career-eligibility";
import { careerEligibilityFacts } from "./test-support/career-facts";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit saved work/offer overlap control; no ordinary NPC career claim.",
};
function provider(pathId: string): CareerProvider {
  return {
    id: "rules2:provider:" + pathId,
    pathId,
    occupationCode: "43-9061",
    sourceVersion: "authored-test",
    tasks: [{ id: "task", text: "Authored task control", type: "task" }],
  };
}
function compare(world: World) {
  const facts = careerEligibilityFacts(world);
  for (const path of LIFE_PATHS2_CATALOG)
    for (const tasks of [[], provider(path.id).tasks]) {
      const p = { ...provider(path.id), tasks };
      expect(careerEligibility(facts, p)).toEqual(nativeEligibility(world, p));
    }
}
describe("private overlap clock through full career eligibility public owner in all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:career-overlap:" + usps,
        });
        compare(fixture.world);
        compare({ ...fixture.world, control: { kind: "observer" } });
        let world = createOrganization(fixture.world, {
          stableKey: "rules2:career:employer",
          formedAt: fixture.world.currentDate,
          provenance,
          initialProfile: {
            name: "Saved repair role employer",
            classification: "enterprise:repair",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        const path = lifePathDefinition("repair-worker");
        world = createWorkRelationship(world, {
          stableKey: "rules2:career:held",
          personId: fixture.personId,
          organizationId,
          startedAt: world.currentDate,
          kind: `employment:life-paths2-${path.id}`,
          compensation: "unpaid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: path.title,
            occupationClassification: "occupation:repair-worker",
            locationJurisdictionId: fixture.jurisdictionId,
            timeDemand: path.timeDemand,
          },
        });
        compare(world);
        expect(
          careerEligibility(
            careerEligibilityFacts(world),
            provider("shop-assistant"),
          ),
        ).toContain("overlaps");
        const offer = seekCareerOffer(
          fixture.world,
          provider("shop-assistant"),
        );
        expect(offer.ok, offer.message).toBe(true);
        const work = offer.world.history.workRelationships.at(-1)!;
        compare(offer.world);
        const accepted = respondCareerOffer(
          offer.world,
          work.id,
          provider("shop-assistant"),
          true,
        );
        expect(accepted.ok, accepted.message).toBe(true);
        compare(accepted.world);
        expect(
          careerEligibility(
            careerEligibilityFacts(accepted.world),
            provider("repair-worker"),
          ),
        ).toContain("overlaps");
      },
      30000,
    );
});
