import { describe, expect, it } from "vitest";
import { readFinalEnactedLawCategories } from "./final-law-term-query";
import type { World } from "../types";
import type { LawInForce } from "./law-in-force";

function fixture() {
  const world = {
    currentDate: "2026-01-10",
    policyCatalog: {
      propositionOrder: ["question"],
      propositions: {
        question: {
          id: "question",
          stableKey: "tax",
          parameters: [{ key: "base", allowedValues: ["income", "sales"] }],
        },
      },
    },
    history: {
      nextSequence: 10,
      legislativeMeasures: [
        {
          id: "bill",
          propositionIds: ["question"],
          propositionAnswers: [{ propositionId: "question", answer: "yes" }],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment",
          measureId: "bill",
          outcome: "enacted",
          resolvedAt: "2026-01-05",
          sequence: 5,
        },
      ],
      legislativeProvisions: [
        {
          id: "text",
          measureId: "bill",
          sequence: 3,
          recordedAt: "2026-01-03",
          supersedesProvisionId: null,
          applicationScope: { segmentKey: null },
          lawCategories: [
            { questionKey: "tax", key: "base", values: ["income"] },
          ],
        },
      ],
    },
  } as unknown as World;
  const law = {
    origin: "enacted",
    operativeAt: "2026-01-05",
    measureId: "bill",
    answer: "yes",
  } as LawInForce;
  return { world, law };
}
const input = { questionKey: "tax", termKey: "base" };
describe("adopted categories respect the actual legal frontier", () => {
  it("returns only adopted categories with their saved source identities", () => {
    const { world, law } = fixture();
    expect(readFinalEnactedLawCategories(world, law, input)).toEqual({
      values: ["income"],
      measureId: "bill",
      provisionId: "text",
      sourceRecordIds: ["bill", "enactment", "text"],
    });
  });
  it("refuses a law not yet enacted at the requested date or sequence", () => {
    const { world, law } = fixture();
    expect(
      readFinalEnactedLawCategories(world, law, {
        ...input,
        onDate: "2026-01-04" as World["currentDate"],
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawCategories(world, law, {
        ...input,
        cutoff: { asOfDate: world.currentDate, historySequenceExclusive: 5 },
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawCategories(world, law, {
        ...input,
        cutoff: { asOfDate: world.currentDate, historySequenceExclusive: 6 },
      })?.values,
    ).toEqual(["income"]);
  });
  it("does not invent categories for starting law without adopted category text", () => {
    const { world, law } = fixture();
    expect(
      readFinalEnactedLawCategories(
        world,
        { ...law, origin: "in-force-at-start" },
        input,
      ),
    ).toBeNull();
  });
});
