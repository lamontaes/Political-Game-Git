import { describe, expect, it } from "vitest";
import {
  finalTermProvisions,
  readOrEstimateFinalEnactedLawCategories,
  readOrEstimateFinalEnactedLawTerm,
  readFinalEnactedLawTerm,
} from "./final-law-term-query";
import type { EntityId, IsoDate, World } from "../types";
import type { LawTermScope } from "../law-consequence-types";
import type { LawInForce } from "./law-in-force";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { afterEach, vi } from "vitest";
import * as lawReader from "./law-in-force";
import { stateJurisdictionForKey } from "../life-places";

const { startingLawTermsMock } = vi.hoisted(() => ({
  startingLawTermsMock: vi.fn(),
}));

vi.mock("./law-in-force", async (importOriginal) => {
  const actual = await importOriginal<typeof lawReader>();
  return {
    ...actual,
    startingLawTerms: (...args: Parameters<typeof actual.startingLawTerms>) =>
      startingLawTermsMock.getMockImplementation()
        ? startingLawTermsMock(...args)
        : actual.startingLawTerms(...args),
  };
});

const CLEAN_STANDARD =
  "us-policy-positions:environment-energy.clean-electricity-standard";
const TERM_DATE = "2026-10-05" as IsoDate;
const CLEAN_SCOPE = {
  kind: "statewide",
} as const satisfies LawTermScope;
const SOURCE_TERM_STATES = [
  ["AZ", 0.15],
  ["CO", 0.3],
  ["CT", 0.37],
  ["DE", 0.255],
  ["MA", 0.3],
  ["MD", 0.38],
  ["MI", 0.15],
  ["MO", 0.15],
  ["NC", 0.125],
  ["NH", 0.15],
  ["OH", 0.085],
  ["PA", 0.18],
] as const;

function numericStartingLaw(
  state: string,
  answer: "yes" | "no" = "yes",
): LawInForce {
  return {
    answer,
    measureId: `starting-law:US-${state}:${CLEAN_STANDARD}` as EntityId,
    origin: "in-force-at-start",
    level: "state-statute",
    operativeAt: (state === "PA" ? "2005-02-28" : "2000-01-01") as IsoDate,
    operativeBasis: "enacted-date",
  };
}

function lawTermWorld(target: string): {
  readonly world: World;
  readonly targetLaw: LawInForce;
  readonly targetJurisdictionId: EntityId;
} {
  const peerStates = SOURCE_TERM_STATES.map(([state]) => state);
  const stateKeys = [...new Set([target, ...peerStates])];
  const governments = stateKeys.map((state, index) => {
    const jurisdiction = stateJurisdictionForKey(`US-${state}`)!;
    return {
      key: `US-${state}`,
      stateKey: `US-${state}`,
      jurisdictionId: jurisdiction.id,
      lawJurisdictionId: jurisdiction.id,
      level: "state",
      population: state === target ? 10_000_000 : 3_000_000 + index * 2_000_000,
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: jurisdiction.id,
      },
    };
  });
  const laws = new Map<EntityId, LawInForce>();
  for (const state of stateKeys) {
    const jurisdiction = stateJurisdictionForKey(`US-${state}`)!;
    laws.set(
      jurisdiction.id,
      state === target
        ? numericStartingLaw(state)
        : numericStartingLaw(
            state,
            SOURCE_TERM_STATES.some(([donor]) => donor === state)
              ? "yes"
              : "no",
          ),
    );
  }
  const world = {
    seed: "modeled-law-term-fixture",
    currentDate: TERM_DATE,
    policyCatalog: {
      propositions: {
        proposition: {
          id: "clean-standard-proposition",
          stableKey: CLEAN_STANDARD,
        },
      },
    },
    publicBudgets: { governments },
    history: { legislativeEnactments: [], legislativeProvisions: [] },
  } as unknown as World;
  vi.spyOn(lawReader, "lawInForce").mockImplementation(
    (_world, jurisdictionId) => laws.get(jurisdictionId) ?? null,
  );
  startingLawTermsMock.mockImplementation((law: LawInForce) => {
    const state = /^starting-law:US-([A-Z]{2}):/.exec(law.measureId)?.[1];
    const source = SOURCE_TERM_STATES.find(([key]) => key === state);
    return source
      ? [
          {
            questionKey: CLEAN_STANDARD,
            key: "target",
            value: source[1],
            unit: "ratio",
          },
        ]
      : [];
  });
  return {
    world,
    targetLaw: laws.get(stateJurisdictionForKey(`US-${target}`)!.id)!,
    targetJurisdictionId: stateJurisdictionForKey(`US-${target}`)!.id,
  };
}

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
  startingLawTermsMock.mockReset();
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

describe("source-first modeled starting-law amount adapter", () => {
  it("returns an exact source term unchanged before consulting peers", () => {
    const { world, targetJurisdictionId } = lawTermWorld("AZ");
    startingLawTermsMock.mockReturnValue([
      {
        questionKey: CLEAN_STANDARD,
        key: "target",
        value: 0.15,
        unit: "ratio",
      },
    ]);
    const result = readOrEstimateFinalEnactedLawTerm(
      world,
      numericStartingLaw("AZ"),
      {
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        unit: "ratio",
        jurisdictionId: targetJurisdictionId,
        onDate: TERM_DATE,
      },
    );
    expect(result).toMatchObject({
      kind: "source",
      term: {
        value: 0.15,
        unit: "ratio",
        measureId: numericStartingLaw("AZ").measureId,
      },
    });
  });

  it("returns a source term's declared scope without rewriting it", () => {
    const { world } = lawTermWorld("AZ");
    startingLawTermsMock.mockReturnValue([
      {
        questionKey: CLEAN_STANDARD,
        key: "target",
        value: 0.15,
        unit: "ratio",
        scope: CLEAN_SCOPE,
      },
    ]);
    const result = readOrEstimateFinalEnactedLawTerm(
      world,
      numericStartingLaw("AZ"),
      {
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        unit: "ratio",
        jurisdictionId: stateJurisdictionForKey("US-AZ")!.id,
        onDate: TERM_DATE,
        scope: CLEAN_SCOPE,
      },
    );
    expect(result).toMatchObject({
      kind: "source",
      term: { value: 0.15, unit: "ratio", scope: CLEAN_SCOPE },
    });
  });

  it("does not use legacy unscoped amounts as modeled donors", () => {
    const { world, targetLaw, targetJurisdictionId } = lawTermWorld("CA");
    startingLawTermsMock.mockImplementation((law: LawInForce) => {
      const state = /^starting-law:US-([A-Z]{2}):/.exec(law.measureId)?.[1];
      const source = SOURCE_TERM_STATES.find(([key]) => key === state);
      return source
        ? [
            {
              questionKey: CLEAN_STANDARD,
              key: "target",
              value: source[1],
              unit: "ratio",
            },
          ]
        : [];
    });
    const input = {
      questionKey: CLEAN_STANDARD,
      termKey: "target",
      unit: "ratio" as const,
      jurisdictionId: targetJurisdictionId,
      onDate: TERM_DATE,
      scope: CLEAN_SCOPE,
    };
    expect(
      readOrEstimateFinalEnactedLawTerm(world, targetLaw, input),
    ).toMatchObject({
      kind: "unsupported",
      reason:
        "No same-level, same-form state law has a sourced numeric term in this scope and unit.",
    });
  });

  it("models only from source terms carrying the exact declared scope", () => {
    const { world, targetLaw, targetJurisdictionId } = lawTermWorld("CA");
    startingLawTermsMock.mockImplementation((law: LawInForce) => {
      const state = /^starting-law:US-([A-Z]{2}):/.exec(law.measureId)?.[1];
      const source = SOURCE_TERM_STATES.find(([key]) => key === state);
      return source
        ? [
            {
              questionKey: CLEAN_STANDARD,
              key: "target",
              value: source[1],
              unit: "ratio",
              scope: CLEAN_SCOPE,
            },
          ]
        : [];
    });
    const input = {
      questionKey: CLEAN_STANDARD,
      termKey: "target",
      unit: "ratio" as const,
      jurisdictionId: targetJurisdictionId,
      onDate: TERM_DATE,
      scope: CLEAN_SCOPE,
    };
    const first = readOrEstimateFinalEnactedLawTerm(world, targetLaw, input);
    const repeated = readOrEstimateFinalEnactedLawTerm(world, targetLaw, input);
    expect(first).toMatchObject({
      kind: "modeled",
      unit: "ratio",
      evidence: {
        targetJurisdictionId,
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        scope: CLEAN_SCOPE,
        lawLevel: "state-statute",
      },
    });
    if (first.kind !== "modeled" || repeated.kind !== "modeled")
      throw new Error("Expected a modeled numeric result.");
    expect(first.value).toBe(repeated.value);
    expect(first.evidence.donors.map((row) => row.stateKey)).toEqual(
      expect.arrayContaining(
        SOURCE_TERM_STATES.map(([state]) => `US-${state}`),
      ),
    );
    expect(first.evidence.donorSourceRecordIds.length).toBeGreaterThan(0);
    expect(first.evidence.donors.map((row) => row.scope)).toEqual(
      Array.from({ length: first.evidence.donors.length }, () => CLEAN_SCOPE),
    );
    expect(first.estimate.spread).toBeGreaterThan(0);
    expect(SOURCE_TERM_STATES.some(([, value]) => value === first.value)).toBe(
      true,
    );
    expect(first.estimate.mean).toBeGreaterThan(0);
  });

  it("does not flatten a recorded schedule into an estimated scalar", () => {
    const { world, targetLaw, targetJurisdictionId } = lawTermWorld("CA");
    vi.spyOn(lawReader, "startingLawSchedules").mockReturnValue([
      {
        questionKey: CLEAN_STANDARD,
        key: "target",
      } as never,
    ]);
    expect(
      readOrEstimateFinalEnactedLawTerm(world, targetLaw, {
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        unit: "ratio",
        jurisdictionId: targetJurisdictionId,
        onDate: TERM_DATE,
      }),
    ).toMatchObject({
      kind: "unsupported",
      reason:
        "A schedule or category exists; it cannot be replaced by a scalar estimate.",
    });
  });

  it("keeps a supplied law unsupported when it does not match target authority", () => {
    const { world, targetJurisdictionId } = lawTermWorld("CA");
    expect(
      readOrEstimateFinalEnactedLawTerm(world, numericStartingLaw("CA", "no"), {
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        unit: "ratio",
        jurisdictionId: targetJurisdictionId,
        onDate: TERM_DATE,
      }),
    ).toMatchObject({ kind: "unsupported" });
  });
});
