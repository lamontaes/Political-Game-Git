import { describe, expect, it } from "vitest";
import {
  adultSituationBank,
  availableAdultSituations,
  buildAdultLifeContext,
} from "../simulation/adult-situations";
import {
  advanceWorldMinutes,
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
    ["adult.work-offer-elsewhere", fixture],
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
  it("does not borrow another person’s private errands as the player’s premise", () => {
    const { world, personId } = fixture();
    const other = world.personOrder[0]!;
    expect(other).not.toBe(personId);
    expect(buildAdultLifeContext(world, other).hasHouseholdWorkItem).toBe(
      false,
    );
  });
  it("does not offer unfinished-errands scenes after the task is ready for review", () => {
    const { world, personId } = fixture();
    const completed = advanceWorldMinutes(world, 151);
    assertWorldIntegrity(completed);
    expect(completed.history.workItems).toEqual(world.history.workItems);
    expect(
      buildAdultLifeContext(completed, personId).hasHouseholdWorkItem,
    ).toBe(false);
    const offered = availableAdultSituations(
      buildAdultLifeContext(completed, personId),
    );
    expect(offered.map((s) => s.key)).not.toContain("adult.household-standing");
    expect(offered.map((s) => s.key)).not.toContain("adult.ordinary-good-day");
  });
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
  it("household-standing: one unfinished errands item establishes no repeated burden", () => {
    const { world, personId } = fixture();
    assertWorldIntegrity(world);
    const context = buildAdultLifeContext(world, personId);
    expect(context.householdCompanionIds.length).toBeGreaterThan(0);
    expect(context.hasHouseholdWorkItem).toBe(true);
    const scene = availableAdultSituations(context).find(
      (s) => s.key === "adult.household-standing",
    )!;
    expect(scene).toBeDefined();
    expect(scene.prose).not.toMatch(/three weeks|nobody.*mention/);
    for (const option of scene.options)
      expect(option.memory).not.toMatch(
        /three weeks|again yourself|turned it into an arrangement/,
      );
  });
});
