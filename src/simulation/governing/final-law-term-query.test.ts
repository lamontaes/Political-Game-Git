import { describe, expect, it } from "vitest";
import {
  finalTermProvisions,
  readFinalEnactedLawTerm,
  readOrEstimateFinalEnactedLawTerm,
} from "./final-law-term-query";
import type { EntityId, IsoDate, World } from "../types";
import type { LawTermScope } from "../law-consequence-types";
import type { LawInForce } from "./law-in-force";
import * as lawReader from "./law-in-force";
import { afterEach, vi } from "vitest";
import { stateJurisdictionForKey } from "../life-places";

const { startingLawTermsMock } = vi.hoisted(() => ({
  startingLawTermsMock: vi.fn(),
}));

vi.mock("./law-in-force", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./law-in-force")>();
  return { ...actual, startingLawTerms: startingLawTermsMock };
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

function startingLaw(state: string, answer: "yes" | "no" = "yes"): LawInForce {
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
        ? startingLaw(state)
        : startingLaw(
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

afterEach(() => {
  vi.restoreAllMocks();
  startingLawTermsMock.mockReset();
  startingLawTermsMock.mockImplementation(() => []);
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
    const result = readOrEstimateFinalEnactedLawTerm(world, startingLaw("AZ"), {
      questionKey: CLEAN_STANDARD,
      termKey: "target",
      unit: "ratio",
      jurisdictionId: targetJurisdictionId,
      onDate: TERM_DATE,
    });
    expect(result).toMatchObject({
      kind: "source",
      term: {
        value: 0.15,
        unit: "ratio",
        measureId: startingLaw("AZ").measureId,
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
    const result = readOrEstimateFinalEnactedLawTerm(world, startingLaw("AZ"), {
      questionKey: CLEAN_STANDARD,
      termKey: "target",
      unit: "ratio",
      jurisdictionId: stateJurisdictionForKey("US-AZ")!.id,
      onDate: TERM_DATE,
      scope: CLEAN_SCOPE,
    });
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
      readOrEstimateFinalEnactedLawTerm(world, startingLaw("CA", "no"), {
        questionKey: CLEAN_STANDARD,
        termKey: "target",
        unit: "ratio",
        jurisdictionId: targetJurisdictionId,
        onDate: TERM_DATE,
      }),
    ).toMatchObject({ kind: "unsupported" });
  });
});
