import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { annualTax } from "./income-tax-withholding";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
  stateIncomeTaxUnderLaw,
  stateIncomeTaxEffectStamps,
} from "./state-income-tax-law";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * A state's income tax law, enacted in play, reaching the paycheck: a repeal
 * ends the withholding, an adoption starts it at the average of states with
 * that kind of tax, and a change of shape moves a tax between flat and
 * graduated. Read over hand-written laws: the World around them is partial,
 * because the rule reads nothing but the seed, the catalog and the laws.
 * `state-tax-laws-paycheck.test.ts` carries a rule's answer through a real
 * paycheck.
 */

const ADOPT = "proposition_adopt" as EntityId;
const GRADUATED = "proposition_graduated" as EntityId;
const stateId = (key: string) => chiefExecutiveJurisdiction(key.slice(3))!.id;

let sequence = 0;
function enacted(
  jurisdictionId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_tax_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:tax:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `SB ${sequence}`,
      shortTitle: "An income tax act",
      summary: "An income tax act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2025-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer }],
    },
    enactment: {
      id: `enactment_tax_${sequence}` as EntityId,
      stableKey: `test:tax:${sequence}:enactment`,
      sequence: 5000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2025-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_tax_${sequence}` as EntityId,
    },
  };
}

function lawWorld(
  seed: string,
  laws: readonly ReturnType<typeof enacted>[],
): World {
  return {
    seed,
    currentDate: makeIsoDate("2027-06-01"),
    jurisdictions: {},
    policyCatalog: {
      propositions: {
        [ADOPT]: { id: ADOPT, stableKey: ADOPT_STATE_INCOME_TAX_QUESTION },
        [GRADUATED]: {
          id: GRADUATED,
          stableKey: GRADUATED_STATE_INCOME_TAX_QUESTION,
        },
      },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

const paid = makeIsoDate("2027-03-15");

describe("a state's income tax law, as enacted in play", () => {
  it.each(["US-WA", "US-FL", "US-TX", "US-NV", "US-SD"])(
    "attributes an adopted schedule to the operative law in %s",
    (stateKey) => {
      const adopt = enacted(stateId(stateKey), ADOPT, "yes", "2027-01-01");
      const future = enacted(stateId(stateKey), ADOPT, "no", "2027-04-01");
      const world = lawWorld("tax-stamp-five-states", [adopt, future]);
      const read = stateIncomeTaxUnderLaw(world, stateKey, "single", paid);
      expect(read.kind).toBe("estimated");
      if (read.kind !== "estimated") throw new Error("Expected adopted tax");
      const sources = ["saved-paycheck" as EntityId];
      const stamps = stateIncomeTaxEffectStamps(
        world,
        stateKey,
        paid,
        read.lawMeasureIds,
        sources,
      );
      expect(stamps).toHaveLength(1);
      expect(stamps[0]).toMatchObject({
        governingLawKey: adopt.measure.id,
        questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
        jurisdictionId: stateId(stateKey),
        operativeAt: "2027-01-01",
        appliedAt: paid,
        sourceRecordIds: sources,
      });
      expect(
        stateIncomeTaxEffectStamps(
          world,
          stateKey,
          paid,
          [future.measure.id],
          sources,
        ),
      ).toEqual([]);
    },
  );
  it("changes nothing where no law was enacted in play", () => {
    for (const key of ["US-WA", "US-OR", "US-CO"])
      expect(
        stateIncomeTaxUnderLaw(lawWorld("s", []), key, "single", paid),
      ).toEqual({ kind: "as-begun" });
  });

  it("ends the withholding when a taxing state repeals its tax", () => {
    const repeal = enacted(stateId("US-OR"), ADOPT, "no", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [repeal]), "US-OR", "single", paid),
    ).toEqual({ kind: "repealed", lawMeasureIds: [repeal.measure.id] });
    // A "no" where there was no tax changes nothing.
    const washington = enacted(stateId("US-WA"), ADOPT, "no", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(
        lawWorld("s", [washington]),
        "US-WA",
        "single",
        paid,
      ),
    ).toEqual({ kind: "as-begun" });
  });

  it("waits for the next tax year when a law takes effect during one", () => {
    const repeal = enacted(stateId("US-OR"), ADOPT, "no", "2027-03-01");
    const world = lawWorld("s", [repeal]);
    expect(stateIncomeTaxUnderLaw(world, "US-OR", "single", paid).kind).toBe(
      "as-begun",
    );
    expect(
      stateIncomeTaxUnderLaw(
        world,
        "US-OR",
        "single",
        makeIsoDate("2028-01-14"),
      ).kind,
    ).toBe("repealed");
  });

  it("starts an adopted tax graduated, at the average of graduated states, with a seeded spread", () => {
    const adopt = enacted(stateId("US-WA"), ADOPT, "yes", "2027-01-01");
    const world = lawWorld("seed-one", [adopt]);
    const read = stateIncomeTaxUnderLaw(world, "US-WA", "single", paid);
    expect(read.kind).toBe("estimated");
    if (read.kind !== "estimated") return;
    expect(read.shape).toBe("graduated");
    expect(read.lawMeasureIds).toEqual([adopt.measure.id]);
    expect(read.estimatedFromAverage).toMatch(/^ESTIMATED FROM AVERAGE: /);
    expect(read.estimatedFromAverage).toContain("27 states");
    expect(read.estimatedFromAverage).toContain("Tax Foundation");
    const schedule = read.schedule;
    // Graduated: the rate rises with income, and never falls.
    const rates = schedule.brackets.map((bracket) => bracket.rateBasisPoints);
    expect(rates.at(-1)!).toBeGreaterThan(rates[0]!);
    for (let index = 1; index < rates.length; index += 1)
      expect(rates[index]!).toBeGreaterThanOrEqual(rates[index - 1]!);
    // At $50,000 taxable the average graduated state takes a few percent.
    const share = annualTax(5_000_000, schedule.brackets) / 5_000_000;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.06);
    // The same world and state give the same schedule; another world or
    // another state is moved by its own draw.
    expect(stateIncomeTaxUnderLaw(world, "US-WA", "single", paid)).toEqual(
      read,
    );
    const otherWorld = stateIncomeTaxUnderLaw(
      lawWorld("seed-two", [adopt]),
      "US-WA",
      "single",
      paid,
    );
    expect(otherWorld).not.toEqual(read);
  });

  it("adopts a flat tax when a law on its shape says so", () => {
    const adopt = enacted(stateId("US-FL"), ADOPT, "yes", "2027-01-01");
    const flat = enacted(stateId("US-FL"), GRADUATED, "no", "2027-01-01");
    const read = stateIncomeTaxUnderLaw(
      lawWorld("s", [adopt, flat]),
      "US-FL",
      "single",
      paid,
    );
    if (read.kind !== "estimated") throw new Error(read.kind);
    expect(read.shape).toBe("flat");
    expect(read.lawMeasureIds).toEqual([adopt.measure.id, flat.measure.id]);
    expect(read.schedule.brackets).toHaveLength(1);
    // Within half a standard deviation of the 15 flat states' 3.88% average.
    const rate = read.schedule.brackets[0]!.rateBasisPoints;
    expect(rate).toBeGreaterThan(330);
    expect(rate).toBeLessThan(420);
    expect(read.estimatedFromAverage).toContain("15 states");
  });

  it("reshapes a flat state's tax and keeps its own deduction", () => {
    // Idaho: flat, with a $16,100 standard deduction, and nothing in its
    // constitution on the shape of the tax.
    const graduated = enacted(stateId("US-ID"), GRADUATED, "yes", "2027-01-01");
    const read = stateIncomeTaxUnderLaw(
      lawWorld("s", [graduated]),
      "US-ID",
      "single",
      paid,
    );
    if (read.kind !== "estimated") throw new Error(read.kind);
    expect(read.shape).toBe("graduated");
    expect(read.schedule.standardDeductionMinor).toBe(1_610_000);
    expect(read.estimatedFromAverage).toContain(
      "the state's own standard deduction of $16,100",
    );
    // Colorado's constitution taxes all income at one rate (art. X,
    // sec. 20(8)(a)): a statute cannot graduate it, so paychecks are as
    // they began.
    const barred = enacted(stateId("US-CO"), GRADUATED, "yes", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [barred]), "US-CO", "single", paid),
    ).toEqual({ kind: "as-begun" });
    // A "yes" on the shape of a state that is already graduated changes
    // nothing.
    const oregon = enacted(stateId("US-OR"), GRADUATED, "yes", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [oregon]), "US-OR", "single", paid),
    ).toEqual({ kind: "as-begun" });
  });

  it("doubles a joint return's brackets and deduction, and says so", () => {
    const adopt = enacted(stateId("US-WA"), ADOPT, "yes", "2027-01-01");
    const world = lawWorld("s", [adopt]);
    const single = stateIncomeTaxUnderLaw(world, "US-WA", "single", paid);
    const joint = stateIncomeTaxUnderLaw(
      world,
      "US-WA",
      "married-filing-jointly",
      paid,
    );
    const head = stateIncomeTaxUnderLaw(
      world,
      "US-WA",
      "head-of-household",
      paid,
    );
    if (
      single.kind !== "estimated" ||
      joint.kind !== "estimated" ||
      head.kind !== "estimated"
    )
      throw new Error("not estimated");
    expect(joint.schedule.standardDeductionMinor).toBe(
      single.schedule.standardDeductionMinor * 2,
    );
    expect(joint.schedule.brackets).toEqual(
      single.schedule.brackets.map((bracket) => ({
        ...bracket,
        overMinor: bracket.overMinor * 2,
      })),
    );
    expect(joint.estimatedFromAverage).toContain("A joint return doubles");
    expect(head.schedule).toEqual(single.schedule);
    expect(head.estimatedFromAverage).toContain("head of household");
  });
});
