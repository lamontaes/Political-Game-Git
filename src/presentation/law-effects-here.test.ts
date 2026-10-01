import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../simulation/dates";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { placeOutcomesForMonth } from "../simulation/outcome-web/place-outcomes";
import type { EntityId, World } from "../simulation/types";
import { lawEffectsHere } from "./law-effects-here";

/*
 * The News page says what the laws in force did to a place, from the outcome
 * web's own monthly records. The world is partial, as in place-outcomes.test:
 * the federal Medicaid work requirement, in force from mid-2027, raises the
 * uninsured about 32% in an expansion state such as Ohio.
 */

const EXPANSION = "proposition_expand_medicaid" as EntityId;
const WORK = "proposition_medicaid_work" as EntityId;

function worldWithRecords(date: string): World {
  const base = {
    currentDate: makeIsoDate(date),
    policyCatalog: {
      propositions: {
        [EXPANSION]: {
          id: EXPANSION,
          stableKey:
            "us-policy-positions:health-human-services.expand-medicaid-eligibility",
          name: "Expand Medicaid eligibility",
          question: "Should Medicaid cover more adults?",
        },
        [WORK]: {
          id: WORK,
          stableKey:
            "us-policy-positions:health-human-services.medicaid-work-requirement",
          name: "Medicaid work requirement",
          question: "Should Medicaid require adults to work?",
        },
      },
    },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;
  const month = makeIsoDate(`${date.slice(0, 7)}-01`);
  return {
    ...base,
    placeOutcomes: {
      months: [{ month, records: placeOutcomesForMonth(base, month) }],
    },
  };
}

const ohio = stateJurisdictionForKey("US-OH")!.id;
const florida = stateJurisdictionForKey("US-FL")!.id;

describe("what the laws did here", () => {
  it("says nothing before a law's answer differs from where the place began", () => {
    expect(lawEffectsHere(worldWithRecords("2027-06-01"), ohio)).toEqual([]);
  });

  it("names the federal work requirement and both values once it takes effect in Ohio", () => {
    const effects = lawEffectsHere(worldWithRecords("2027-08-01"), ohio);
    const coverage = effects.find(
      (effect) => effect.measure === "health.uninsured-pct",
    )!;
    expect(coverage.questionName).toBe("Medicaid work requirement");
    expect(coverage.direction).toBe("higher");
    expect(coverage.value).toBeGreaterThan(coverage.withoutLaw);
    expect(coverage.value / coverage.withoutLaw).toBeCloseTo(1.32, 1);
    expect(coverage.sentence).toContain("Federal law now says yes to");
    expect(coverage.headline).toBe(
      "Share of people without health insurance runs higher because of a change in the law",
    );
    expect(coverage.sentence).toContain(coverage.valueText);
    expect(coverage.sentence).toContain(
      `The model estimates that without that change it would stand at ${coverage.withoutLawText}.`,
    );
  });

  it("leaves a state without the expansion alone", () => {
    const effects = lawEffectsHere(worldWithRecords("2027-08-01"), florida);
    expect(
      effects.find((effect) => effect.measure === "health.uninsured-pct"),
    ).toBeUndefined();
  });

  it("gives a place with no records nothing to say", () => {
    const world = {
      ...worldWithRecords("2027-08-01"),
      placeOutcomes: undefined,
    };
    expect(lawEffectsHere(world as unknown as World, ohio)).toEqual([]);
  });
});
