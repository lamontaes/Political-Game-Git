import { describe, expect, it, vi } from "vitest";
import type { World } from "../types";
import { readFinalEnactedLawTerm } from "./automatic-legislation";
import type { LawInForce } from "./law-in-force";

// Fictional legal text exercises the reader; these are not researched wage values.
vi.mock("../../../data/research/laws/starting-law-2026.json", () => ({
  default: {
    defaultOperativeAt: "2000-01-01",
    questions: {
      "test:rate": {
        answers: {
          "US-TEST": {
            answer: "yes",
            operativeAt: "2026-07-01",
            lawTerms: [
              {
                questionKey: "test:rate",
                key: "rate",
                value: 1500,
                unit: "minor",
              },
            ],
            before: { answer: "no" },
            phases: [
              {
                answer: "yes",
                operativeAt: "2027-07-01",
                lawTerms: [
                  {
                    questionKey: "test:rate",
                    key: "rate",
                    value: 1600,
                    unit: "minor",
                  },
                ],
              },
            ],
          },
          "US-DUPLICATE": {
            answer: "yes",
            lawTerms: [
              {
                questionKey: "test:rate",
                key: "rate",
                value: 1500,
                unit: "minor",
              },
              {
                questionKey: "test:rate",
                key: "rate",
                value: 1600,
                unit: "minor",
              },
            ],
          },
        },
      },
    },
  },
}));

const law = {
  origin: "in-force-at-start",
  measureId: "starting-law:US-TEST:test:rate",
  answer: "yes",
  operativeAt: "2026-07-01",
  operativeBasis: "enacted-date",
  level: "state-statute",
} as LawInForce;
const request = {
  questionKey: "test:rate",
  termKey: "rate",
  unit: "minor" as const,
};
const world = (currentDate: string) => ({ currentDate }) as World;

describe("canonical starting law numeric text", () => {
  it("returns final terms with the real starting-row source and no fabricated provision", () => {
    expect(readFinalEnactedLawTerm(world("2026-07-01"), law, request)).toEqual({
      value: 1500,
      unit: "minor",
      measureId: law.measureId,
      provisionId: null,
      sourceRecordIds: [law.measureId],
    });
  });
  it("does not backdate later numeric text", () => {
    expect(
      readFinalEnactedLawTerm(world("2026-06-30"), law, request),
    ).toBeNull();
  });
  it("does not borrow later text for a prior answer", () => {
    expect(
      readFinalEnactedLawTerm(
        world("2026-06-30"),
        {
          ...law,
          answer: "no",
          operativeAt: "2000-01-01" as LawInForce["operativeAt"],
        },
        request,
      ),
    ).toBeNull();
  });
  it("reads a scheduled phase only from its own date and refuses stale authority", () => {
    const phased = {
      ...law,
      operativeAt: "2027-07-01" as LawInForce["operativeAt"],
    };
    expect(
      readFinalEnactedLawTerm(world("2027-06-30"), law, request)?.value,
    ).toBe(1500);
    expect(
      readFinalEnactedLawTerm(world("2027-07-01"), phased, request)?.value,
    ).toBe(1600);
    expect(
      readFinalEnactedLawTerm(world("2027-07-01"), law, request),
    ).toBeNull();
  });
  it("uses the saved activity date for catch-up work and rejects future reads", () => {
    expect(
      readFinalEnactedLawTerm(world("2027-07-02"), law, {
        ...request,
        onDate: "2026-07-01" as LawInForce["operativeAt"],
      })?.value,
    ).toBe(1500);
    expect(
      readFinalEnactedLawTerm(world("2026-07-01"), law, {
        ...request,
        onDate: "2027-07-01" as LawInForce["operativeAt"],
      }),
    ).toBeNull();
  });
  it("requires an exact question, term and unit", () => {
    for (const input of [
      { ...request, questionKey: "other" },
      { ...request, termKey: "other" },
      { ...request, unit: "years" as const },
    ]) {
      expect(
        readFinalEnactedLawTerm(world("2026-07-01"), law, input),
      ).toBeNull();
    }
  });
  it("refuses contradictory terms rather than choosing one", () => {
    expect(
      readFinalEnactedLawTerm(
        world("2026-07-01"),
        {
          ...law,
          measureId:
            "starting-law:US-DUPLICATE:test:rate" as LawInForce["measureId"],
        },
        request,
      ),
    ).toBeNull();
  });
  it("requires the actual canonical answer", () => {
    expect(
      readFinalEnactedLawTerm(
        world("2026-07-01"),
        { ...law, answer: "no" },
        request,
      ),
    ).toBeNull();
  });
});
