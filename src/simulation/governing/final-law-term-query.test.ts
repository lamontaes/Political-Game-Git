import { describe, expect, it } from "vitest";
import {
  finalTermProvisions,
  readOrEstimateFinalEnactedLawCategories,
  readFinalEnactedLawTerm,
} from "./final-law-term-query";
import type { EntityId, IsoDate, World } from "../types";
import type { LawInForce } from "./law-in-force";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import { afterEach, vi } from "vitest";
import * as lawReader from "./law-in-force";
import { stateJurisdictionForKey } from "../life-places";

const CATEGORY_QUESTION =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const categoryQuestions = startingLaw.questions as unknown as Record<
  string,
  { answers: Record<string, Record<string, unknown>> }
>;
const originalCategoryQuestion = categoryQuestions[CATEGORY_QUESTION];
const CATEGORY_DATE = "2026-10-05" as IsoDate;

function categoricalWorld(options: {
  readonly sourceTarget?: readonly string[];
  readonly donorValues: Readonly<Record<string, readonly string[]>>;
  readonly targetNumeric?: boolean;
}): {
  readonly world: World;
  readonly targetLaw: LawInForce;
  readonly targetId: EntityId;
} {
  const states = ["CA", ...Object.keys(options.donorValues)];
  const answers: Record<string, Record<string, unknown>> = {};
  for (const state of states) {
    const values =
      state === "CA" ? options.sourceTarget : options.donorValues[state];
    answers[`US-${state}`] = {
      answer: "yes",
      ...(values
        ? {
            lawCategories: [
              { questionKey: CATEGORY_QUESTION, key: "coverage", values },
            ],
          }
        : {}),
      ...(state === "CA" && options.targetNumeric
        ? {
            lawTerms: [
              {
                questionKey: CATEGORY_QUESTION,
                key: "coverage",
                value: 1,
                unit: "count",
              },
            ],
          }
        : {}),
    };
  }
  categoryQuestions[CATEGORY_QUESTION] = { answers };

  const targetId = stateJurisdictionForKey("US-CA")!.id;
  const laws = new Map<EntityId, LawInForce>();
  const governments = states.map((state, index) => {
    const jurisdictionId = stateJurisdictionForKey(`US-${state}`)!.id;
    const law: LawInForce = {
      answer: "yes",
      measureId: `starting-law:US-${state}:${CATEGORY_QUESTION}` as EntityId,
      origin: "in-force-at-start",
      level: "state-statute",
      operativeAt: "2000-01-01" as IsoDate,
      operativeBasis: "enacted-date",
    };
    laws.set(jurisdictionId, law);
    return {
      key: `US-${state}`,
      stateKey: `US-${state}`,
      jurisdictionId,
      lawJurisdictionId: jurisdictionId,
      level: "state" as const,
      population: state === "CA" ? 40_000_000 : 2_000_000 + index * 4_000_000,
      publicGovernmentIdentity: {
        kind: "jurisdiction" as const,
        jurisdictionId,
      },
    };
  });
  const propositionId = "mandatory-minimum-sentences" as EntityId;
  const world = {
    currentDate: CATEGORY_DATE,
    seed: "category-fixture",
    policyCatalog: {
      propositionOrder: [propositionId],
      propositions: {
        [propositionId]: {
          id: propositionId,
          stableKey: CATEGORY_QUESTION,
          parameters: [
            {
              key: "coverage",
              value: "covered-offense-categories",
              allowedValues: ["assault", "robbery", "burglary", "vandalism"],
            },
          ],
        },
      },
    },
    publicBudgets: { governments },
    history: { legislativeEnactments: [], legislativeProvisions: [] },
  } as unknown as World;
  vi.spyOn(lawReader, "lawInForce").mockImplementation(
    (_world, jurisdictionId) => laws.get(jurisdictionId) ?? null,
  );
  return { world, targetLaw: laws.get(targetId)!, targetId };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCategoryQuestion)
    categoryQuestions[CATEGORY_QUESTION] = originalCategoryQuestion;
  else delete categoryQuestions[CATEGORY_QUESTION];
});

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
    expect(
      finalTermProvisions(
        world,
        "bill" as EntityId,
        3,
        "2026-01-01" as World["currentDate"],
        {
          asOfDate: "2026-01-01" as World["currentDate"],
          historySequenceExclusive: 3,
        },
      ),
    ).toEqual([first]);
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

describe("source-first categorical mode", () => {
  const input = (jurisdictionId: EntityId, onDate?: IsoDate) => ({
    questionKey: CATEGORY_QUESTION,
    termKey: "coverage",
    jurisdictionId,
    ...(onDate ? { onDate } : {}),
  });

  it("returns exact target source categories ahead of peer mode", () => {
    const fixture = categoricalWorld({
      sourceTarget: ["robbery"],
      donorValues: { AZ: ["assault"], OR: ["assault"] },
    });
    expect(
      readOrEstimateFinalEnactedLawCategories(
        fixture.world,
        fixture.targetLaw,
        input(fixture.targetId),
      ),
    ).toMatchObject({
      kind: "source",
      categories: {
        values: ["robbery"],
        sourceRecordIds: [fixture.targetLaw.measureId],
      },
    });
  });

  it("uses the exact set mode of nearest sourced same-answer regional peers with donor evidence", () => {
    const fixture = categoricalWorld({
      donorValues: {
        AZ: ["assault", "robbery"],
        OR: ["robbery", "assault"],
        NV: ["vandalism"],
        WA: ["assault"],
      },
    });
    const result = readOrEstimateFinalEnactedLawCategories(
      fixture.world,
      fixture.targetLaw,
      input(fixture.targetId),
    );
    expect(result).toMatchObject({
      kind: "modeled",
      values: ["assault", "robbery"],
      evidence: {
        questionKey: CATEGORY_QUESTION,
        termKey: "coverage",
        answer: "yes",
        level: "state-statute",
        censusRegion: "west",
        donorRuleCount: 4,
        selectedRuleCount: 2,
      },
    });
    if (result.kind !== "modeled")
      throw new Error("Expected modeled category mode.");
    expect(
      result.evidence.donors.every((row) => row.sourceRecordIds.length > 0),
    ).toBe(true);
    expect(
      result.evidence.donors.every((row) => row.placeKey !== "US-CA"),
    ).toBe(true);
  });

  it("leaves ties, absent donors, open vocabularies, invalid dates and target conflicts unsupported", () => {
    const tied = categoricalWorld({
      donorValues: { AZ: ["assault"], OR: ["robbery"] },
    });
    expect(
      readOrEstimateFinalEnactedLawCategories(
        tied.world,
        tied.targetLaw,
        input(tied.targetId),
      ),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("unique mode"),
    });

    const empty = categoricalWorld({ donorValues: {} });
    expect(
      readOrEstimateFinalEnactedLawCategories(
        empty.world,
        empty.targetLaw,
        input(empty.targetId),
      ),
    ).toMatchObject({ kind: "unsupported" });
    expect(
      readOrEstimateFinalEnactedLawCategories(
        empty.world,
        empty.targetLaw,
        input(empty.targetId, "2027-01-01" as IsoDate),
      ),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("date"),
    });

    const open = {
      ...empty.world,
      policyCatalog: {
        ...empty.world.policyCatalog,
        propositions: {
          proposition: {
            stableKey: CATEGORY_QUESTION,
            parameters: [{ key: "coverage", value: "category" }],
          },
        },
      },
    } as unknown as World;
    expect(
      readOrEstimateFinalEnactedLawCategories(
        open,
        empty.targetLaw,
        input(empty.targetId),
      ),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("closed"),
    });

    const conflict = categoricalWorld({
      sourceTarget: ["assault"],
      donorValues: { AZ: ["assault"] },
    });
    categoryQuestions[CATEGORY_QUESTION]!.answers["US-CA"]!.lawCategories = [
      { questionKey: CATEGORY_QUESTION, key: "coverage", values: ["assault"] },
      { questionKey: CATEGORY_QUESTION, key: "coverage", values: ["robbery"] },
    ];
    expect(
      readOrEstimateFinalEnactedLawCategories(
        conflict.world,
        conflict.targetLaw,
        input(conflict.targetId),
      ),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("malformed or conflicting"),
    });

    const numeric = categoricalWorld({
      targetNumeric: true,
      donorValues: { AZ: ["assault"] },
    });
    expect(
      readOrEstimateFinalEnactedLawCategories(
        numeric.world,
        numeric.targetLaw,
        input(numeric.targetId),
      ),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("numeric amount"),
    });
  });
});
