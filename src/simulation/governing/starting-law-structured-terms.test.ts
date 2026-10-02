import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { SeededRng } from "../rng";
import { afterEach, describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  readFinalEnactedLawCategories,
  readFinalEnactedLawSchedule,
  readFinalEnactedLawTerm,
  finalTermProvisions,
} from "./final-law-term-query";
import type { LawInForce } from "./law-in-force";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import type { LawScheduleTerm } from "../law-structured-terms";
import { addDays, makeIsoDate } from "../dates";

// This extends copied real starting rows with controlled schema fixtures only.
// No test value is written into production law data or offered as legal evidence.
const questionKey = "us-policy-positions:environment-energy.bottle-deposit";
const questions = startingLaw.questions as unknown as Record<
  string,
  { answers: Record<string, Record<string, unknown>> }
>;
const answers = questions[questionKey]!.answers;
const originals = structuredClone(answers);
afterEach(() => {
  for (const key of Object.keys(answers))
    answers[key] = structuredClone(originals[key]!);
});
const onDate = makeIsoDate("2026-01-10");
const beforeDate = addDays(onDate, -1);
const phaseDate = addDays(onDate, 1);
const world = {
  currentDate: phaseDate,
  policyCatalog: {
    propositionOrder: ["question"],
    propositions: {
      question: {
        stableKey: questionKey,
        parameters: [
          { key: "coverage", allowedValues: ["included", "excluded"] },
          { key: "deposit" },
        ],
      },
    },
  },
} as unknown as World;
function category(value: string) {
  return { questionKey, key: "coverage", values: [value] };
}
function table(): LawScheduleTerm {
  return {
    questionKey,
    key: "deposit",
    kind: "tiers",
    tiers: [
      {
        threshold: 0,
        unit: "fluid-ounces",
        amount: { value: 1, unit: "minor/container" },
      },
      {
        threshold: 2,
        unit: "fluid-ounces",
        amount: { value: 2, unit: "minor/container" },
      },
    ],
  };
}
function law(placeKey: string, date: IsoDate): LawInForce {
  return {
    answer: "yes",
    origin: "in-force-at-start",
    measureId: `starting-law:${placeKey}:${questionKey}` as EntityId,
    operativeAt: date,
    operativeBasis: "enacted-date",
    level: "state-statute",
  };
}
function setRow(placeKey: string) {
  answers[placeKey] = {
    ...originals[placeKey],
    answer: "yes",
    operativeAt: onDate,
    lawCategories: [category("included")],
    lawSchedules: [table()],
    before: { answer: "yes", lawCategories: [category("excluded")] },
    phases: [
      {
        answer: "yes",
        operativeAt: phaseDate,
        lawCategories: [category("excluded")],
      },
    ],
  };
}

const openingSeed = "starting-law-structured-terms:opening";
const openingPlaces = PLACE_POPULATION_ROWS.split(";").map(
  (row) => row.split(":")[0]!,
);
const openingPlaceKey =
  openingPlaces[
    new SeededRng(openingSeed).integer(0, openingPlaces.length - 1)
  ]!;

describe("dated starting-law categories and tables", () => {
  it("keeps scalar reads on the same historical date frontier", () => {
    const placeKey = Object.keys(answers)[0]!;
    setRow(placeKey);
    delete answers[placeKey]!.lawSchedules;
    answers[placeKey]!.lawTerms = [
      { questionKey, key: "deposit", value: 1, unit: "minor/container" },
    ];
    const cutoff: HistoricalCutoff = {
      asOfDate: onDate,
      historySequenceExclusive: 1,
    };
    expect(
      readFinalEnactedLawTerm(world, law(placeKey, onDate), {
        questionKey,
        termKey: "deposit",
        unit: "minor/container",
        cutoff,
      })?.value,
    ).toBe(1);
    expect(
      readFinalEnactedLawTerm(world, law(placeKey, phaseDate), {
        questionKey,
        termKey: "deposit",
        unit: "minor/container",
        onDate: phaseDate,
        cutoff,
      }),
    ).toBeNull();
  });
  it("retains adopted category/table provenance and refuses conflicts or an unavailable enactment", () => {
    // A controlled reader snapshot, not a fixture bypassing the enactment writer.
    const provision = {
      id: "section",
      measureId: "bill",
      sequence: 2,
      recordedAt: beforeDate,
      supersedesProvisionId: null,
      applicationScope: { segmentKey: null },
      lawCategories: [category("included")],
      lawSchedules: [table()],
    };
    const fixture = {
      ...world,
      history: {
        nextSequence: 5,
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
            resolvedAt: beforeDate,
            sequence: 4,
          },
        ],
        legislativeProvisions: [provision],
      },
    } as unknown as World;
    const adopted = {
      ...law("unused", beforeDate),
      origin: "enacted",
      measureId: "bill",
    } as LawInForce;
    expect(
      readFinalEnactedLawCategories(fixture, adopted, {
        questionKey,
        termKey: "coverage",
        onDate,
      }),
    ).toEqual({
      values: ["included"],
      measureId: "bill",
      provisionId: "section",
      sourceRecordIds: ["bill", "enactment", "section"],
    });
    expect(
      readFinalEnactedLawSchedule(fixture, adopted, {
        questionKey,
        termKey: "deposit",
        onDate,
      })?.term,
    ).toEqual(table());
    expect(
      readFinalEnactedLawCategories(fixture, adopted, {
        questionKey,
        termKey: "coverage",
        onDate,
        cutoff: { asOfDate: onDate, historySequenceExclusive: 4 },
      }),
    ).toBeNull();
    const conflict = {
      ...fixture,
      history: {
        ...fixture.history,
        legislativeProvisions: [
          provision,
          { ...provision, id: "second-section", sequence: 3 },
        ],
      },
    } as unknown as World;
    expect(
      readFinalEnactedLawCategories(conflict, adopted, {
        questionKey,
        termKey: "coverage",
        onDate,
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawSchedule(conflict, adopted, {
        questionKey,
        termKey: "deposit",
        onDate,
      }),
    ).toBeNull();
  });
  it("selects before, initial and phase text across every existing place row with starting provenance", () => {
    const defaultDate = makeIsoDate(startingLaw.defaultOperativeAt);
    for (const placeKey of Object.keys(answers)) {
      setRow(placeKey);
      for (const [date, operativeAt, value] of [
        [beforeDate, defaultDate, "excluded"],
        [onDate, onDate, "included"],
        [phaseDate, phaseDate, "excluded"],
      ] as const) {
        const current = law(placeKey, operativeAt);
        expect(
          readFinalEnactedLawCategories(world, current, {
            questionKey,
            termKey: "coverage",
            onDate: date,
          }),
        ).toEqual({
          values: [value],
          measureId: current.measureId,
          provisionId: null,
          sourceRecordIds: [current.measureId],
        });
      }
    }
  });
  it("returns the exact tier table and denomination, with no fallback or scalar flattening", () => {
    const placeKey = Object.keys(answers)[0]!;
    setRow(placeKey);
    const result = readFinalEnactedLawSchedule(world, law(placeKey, onDate), {
      questionKey,
      termKey: "deposit",
      onDate,
    });
    expect(result?.term).toEqual(table());
    expect(result?.provisionId).toBeNull();
    expect(
      readFinalEnactedLawSchedule(world, law(placeKey, phaseDate), {
        questionKey,
        termKey: "deposit",
        onDate: phaseDate,
      }),
    ).toBeNull();
    const copy = result!.term;
    if (copy.kind === "tiers")
      (copy.tiers[0]!.amount as { value: number }).value += 1;
    expect(
      readFinalEnactedLawSchedule(world, law(placeKey, onDate), {
        questionKey,
        termKey: "deposit",
        onDate,
      })?.term,
    ).toEqual(table());
  });
  it("refuses a stale starting-law identity, unknown vocabulary and duplicate fields", () => {
    const placeKey = Object.keys(answers)[0]!;
    setRow(placeKey);
    const current = law(placeKey, onDate);
    expect(
      readFinalEnactedLawCategories(world, current, {
        questionKey,
        termKey: "coverage",
        onDate: phaseDate,
      }),
    ).toBeNull();
    answers[placeKey]!.lawCategories = [category("undeclared")];
    expect(
      readFinalEnactedLawCategories(world, current, {
        questionKey,
        termKey: "coverage",
        onDate,
      }),
    ).toBeNull();
    answers[placeKey]!.lawCategories = [
      category("included"),
      category("excluded"),
    ];
    expect(
      readFinalEnactedLawCategories(world, current, {
        questionKey,
        termKey: "coverage",
        onDate,
      }),
    ).toBeNull();
    answers[placeKey]!.lawSchedules = [table(), table()];
    expect(
      readFinalEnactedLawSchedule(world, current, {
        questionKey,
        termKey: "deposit",
        onDate,
      }),
    ).toBeNull();
  });
  it("binds queries to the actual date cutoff and rejects future requests", () => {
    const placeKey = Object.keys(answers)[0]!;
    setRow(placeKey);
    const cutoff: HistoricalCutoff = {
      asOfDate: onDate,
      historySequenceExclusive: 1,
    };
    expect(
      readFinalEnactedLawCategories(world, law(placeKey, onDate), {
        questionKey,
        termKey: "coverage",
        cutoff,
      })?.values,
    ).toEqual(["included"]);
    expect(
      readFinalEnactedLawCategories(world, law(placeKey, phaseDate), {
        questionKey,
        termKey: "coverage",
        onDate: phaseDate,
        cutoff,
      }),
    ).toBeNull();
    expect(
      readFinalEnactedLawCategories(world, law(placeKey, onDate), {
        questionKey,
        termKey: "coverage",
        onDate: addDays(phaseDate, 1),
      }),
    ).toBeNull();
  });
  it("uses date and sequence frontiers when selecting adopted provision versions", () => {
    const first = {
      id: "first",
      measureId: "bill",
      sequence: 1,
      recordedAt: beforeDate,
      supersedesProvisionId: null,
    };
    const later = {
      ...first,
      id: "later",
      sequence: 3,
      recordedAt: phaseDate,
      supersedesProvisionId: "first",
    };
    const fixture = {
      ...world,
      history: { legislativeProvisions: [first, later] },
    } as unknown as World;
    expect(
      finalTermProvisions(fixture, "bill" as EntityId, Infinity, onDate, {
        asOfDate: onDate,
        historySequenceExclusive: 3,
      }),
    ).toEqual([first]);
    expect(
      finalTermProvisions(fixture, "bill" as EntityId, Infinity, phaseDate, {
        asOfDate: phaseDate,
        historySequenceExclusive: 3,
      }),
    ).toEqual([first]);
  });
  it(`opens a new game in ${openingPlaceKey}, selected from the complete place table`, async () => {
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } =
      await import("../../presentation/new-game");
    const { assertWorldIntegrity } = await import("../world");
    const opened = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: openingPlaceKey,
      seed: openingSeed,
    });
    expect(opened.world.personOrder).toContain(opened.playerPersonId);
    expect(() => assertWorldIntegrity(opened.world)).not.toThrow();
    expect(opened.world.currentDate).toBeDefined();
  });
});
