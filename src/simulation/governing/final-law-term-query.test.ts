import { describe, expect, it } from "vitest";
import {
  finalTermProvisions,
  readFinalEnactedLawTerm,
} from "./final-law-term-query";
import type { EntityId, World } from "../types";
import type { LawInForce } from "./law-in-force";

describe("adopted term history boundary", () => {
  it("retains the earlier provision before replacement and excludes later dates", () => {
    const first = {
      id: "first",
      measureId: "bill",
      sequence: 1,
      recordedAt: "2026-01-01",
      supersedesProvisionId: null,
    };
    const replacement = {
      ...first,
      id: "replacement",
      sequence: 3,
      supersedesProvisionId: "first",
    };
    const future = {
      ...first,
      id: "future",
      sequence: 2,
      recordedAt: "2026-02-01",
    };
    const other = { ...first, id: "other", measureId: "other-bill" };
    const world = {
      currentDate: "2026-01-10",
      history: { legislativeProvisions: [first, replacement, future, other] },
    } as unknown as World;
    expect(finalTermProvisions(world, "bill" as EntityId, 2)).toEqual([first]);
    expect(finalTermProvisions(world, "bill" as EntityId, 3)).toEqual([
      replacement,
    ]);
  });
  it("does not infer numeric terms from an unenacted or future law", () => {
    const world = {
      currentDate: "2026-01-10",
      history: { legislativeEnactments: [] },
    } as unknown as World;
    const input = {
      questionKey: "wage",
      termKey: "rate",
      unit: "minor" as const,
    };
    for (const law of [
      { origin: "in-force-at-start", operativeAt: "2026-01-01" },
      { origin: "enacted", operativeAt: "2026-02-01" },
      { origin: "enacted", operativeAt: "2026-01-01" },
    ])
      expect(
        readFinalEnactedLawTerm(world, law as LawInForce, input),
      ).toBeNull();
  });
});
