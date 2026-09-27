import { describe, expect, it } from "vitest";
import {
  adultSituationBank,
  availableAdultSituations,
  buildAdultLifeContext,
} from "../simulation/adult-situations";
import {
  assertWorldIntegrity,
  serializeWorld,
  deserializeWorld,
} from "../simulation";
import {
  fixture,
  housingFixture,
  incidentFixture,
} from "../../tests/support/p2r1-worlds";
import { chooseAdultOption } from "./adult-life";

describe("P2R1 canonical pre-offer counterexamples", () => {
  for (const [key, build] of [
    ["adult.housing-cost-change", housingFixture],
    ["adult.work-extra-hours", fixture],
    ["adult.care-request", fixture],
    ["adult.volunteer-ask", fixture],
    ["adult.incident-aftermath", incidentFixture],
    ["adult.weekend-invitation", fixture],
  ] as const) {
    it(`${key}: the old predicate is true without the claimed occurrence`, () => {
      const { world, personId } = build();
      assertWorldIntegrity(world);
      const before = serializeWorld(world);
      const context = buildAdultLifeContext(world, personId);
      if (key === "adult.care-request") {
        expect(
          world.history.careResponsibilities.some((record) =>
            context.kinIds.includes(record.recipientPersonId),
          ),
        ).toBe(false);
      }
      const scene = adultSituationBank().find((s) => s.key === key)!;
      // These legacy predicates remain readable as evidence; withholding is
      // applied by the established availability seam, before any option writes.
      expect(scene.available(context)).toBe(true);
      expect(availableAdultSituations(context).map((s) => s.key)).not.toContain(
        key,
      );
      for (const option of scene.options) {
        expect(() =>
          chooseAdultOption(world, {
            personId,
            situationKey: scene.key,
            optionKey: option.key,
          }),
        ).toThrow();
        expect(serializeWorld(world)).toBe(before);
      }
      expect(deserializeWorld(before)).toEqual(world);
    });
  }
  it("every withheld option rejects direct invocation without changing history", () => {
    const { world, personId } = fixture();
    const before = serializeWorld(world);
    for (const scene of adultSituationBank().filter((s) => s.withheld)) {
      for (const option of scene.options) {
        expect(() =>
          chooseAdultOption(world, {
            personId,
            situationKey: scene.key,
            optionKey: option.key,
          }),
        ).toThrow(/not available/);
        expect(serializeWorld(world)).toBe(before);
      }
    }
  });
});
